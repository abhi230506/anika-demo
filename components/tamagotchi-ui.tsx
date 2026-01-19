"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Splash from "./splash"
import { useVoice } from "./voice-state"
import { useTTS } from "@/hooks/useTTS"
import { MemorySettings } from "./memory-settings"
import { useProactiveRecall } from "@/hooks/useProactiveRecall"
import { useIdleBehaviors } from "@/hooks/useIdleBehaviors"
import { useDailyRoutines } from "@/hooks/useDailyRoutines"
import { useAchievements } from "@/hooks/useAchievements"

type Mood = "happy" | "hungry" | "tired" | "curious" | "sad" | "angry" | "lonely" | "neutral"
type Mode = "idle" | "listening" | "thinking" | "speaking"

// truncate text to fit in the display area
// cuts from the beginning if it's too long so you see the newest stuff
function truncateTranscript(text: string | undefined, maxChars: number = 60): string {
  if (!text || text.length <= maxChars) {
    return text || ""
  }
  
  // grab the last part
  const lastPortion = text.slice(-maxChars)
  
  // try to cut at word boundaries so it doesn't look weird
  const firstSpaceIndex = lastPortion.indexOf(' ')
  
  if (firstSpaceIndex > 0 && firstSpaceIndex < lastPortion.length - 5) {
    if (text.length > maxChars) {
      return '...' + lastPortion.slice(firstSpaceIndex + 1)
    }
  }
  
  // fallback if no spaces found
  return text.length > maxChars ? '...' + lastPortion : lastPortion
}

// keep track of what we showed before to avoid jumping around
let previousDisplayedText = ''
let previousFullText = ''

// shows text as it's being spoken, scrolling forward
// if it gets too long it cuts from the start
function getProgressiveTranscript(
  fullText: string | null | undefined,
  playbackProgress: number,
  maxChars: number = 60,
  previousProgressRef?: { current: number }
): string {
  if (!fullText) {
    if (previousProgressRef) previousProgressRef.current = 0
    previousDisplayedText = ''
    previousFullText = ''
    return ''
  }
  
  // new text? reset everything
  if (fullText !== previousFullText) {
    previousFullText = fullText
    previousProgressRef && (previousProgressRef.current = 0)
    previousDisplayedText = ''
  }
  
  // smooth out the progress a bit so it doesn't jump around
  let smoothedProgress = playbackProgress
  if (previousProgressRef && previousProgressRef.current > 0) {
    smoothedProgress = playbackProgress * 0.9 + previousProgressRef.current * 0.1
  }
  if (previousProgressRef) previousProgressRef.current = smoothedProgress
  
  // figure out how much text to show based on progress
  const targetLength = Math.max(1, Math.floor(fullText.length * smoothedProgress))
  
  // try to end at word boundaries
  let endIndex = targetLength
  if (targetLength > 3) {
    const nextSpaceIndex = fullText.indexOf(' ', endIndex)
    if (nextSpaceIndex > 0 && nextSpaceIndex <= endIndex + 15) {
      endIndex = nextSpaceIndex + 1
    } else {
      const lastSpaceBefore = fullText.lastIndexOf(' ', endIndex)
      if (lastSpaceBefore > 0) {
        endIndex = lastSpaceBefore + 1
      }
    }
  }
  
  let textToShow = fullText.slice(0, Math.min(endIndex, fullText.length))
  
  // if it fits, show it
  if (textToShow.length <= maxChars) {
    if (textToShow !== previousDisplayedText) {
      previousDisplayedText = textToShow
      return textToShow
    }
    return previousDisplayedText
  }
  
  // too long? cut from the start
  const overflow = textToShow.length - maxChars
  let startIndex = Math.max(0, overflow)
  
  // try to cut at word boundaries
  const lastSpaceBeforeStart = textToShow.lastIndexOf(' ', startIndex + 10)
  if (lastSpaceBeforeStart > 0 && lastSpaceBeforeStart <= startIndex + 10) {
    startIndex = lastSpaceBeforeStart + 1
  }
  
  const truncated = textToShow.slice(startIndex)
  const result = startIndex > 0 ? '...' + truncated : truncated
  
  if (result !== previousDisplayedText) {
    previousDisplayedText = result
    return result
  }
  
  return previousDisplayedText
}

interface TamagotchiUIProps {
  timeText: string
  dateText: string
  hungerPercent: number
  mood: Mood
  mode: Mode
  userTranscript?: string
  aiSubtitle?: string
  statusText?: string
  onTalkDown: () => void
  onTalkUp: () => void
  onFeed: () => void
  onEndChat: () => void
  greetingText?: string
  presenceEnabled?: boolean
  errorStatus?: string
  isMuted?: boolean
  onToggleMute?: () => void
  idleObservation?: string | null
  recentInteraction?: 'talk' | 'feed' | null
}

// greeting based on time of day
function getDefaultGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 11) return "Good morning"
  if (hour >= 11 && hour < 17) return "Good afternoon"
  if (hour >= 17 && hour < 22) return "Good evening"
  return "Still up late?" // late night
}

// little status light that changes color based on what's happening
function PresenceLight({ mode, mood }: { mode: Mode; mood: Mood }) {
  const prefersReducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

  // pick color based on state
  let color = "#6AF0FF" // cyan default
  let animation = "presenceIdle"
  let tooltipText = "Idle"

  if (mode === "idle") {
    // In idle, use mood-based colors
    if (mood === "hungry") {
      color = "#FFA500" // amber
      tooltipText = "Hungry"
    } else if (mood === "sad" || mood === "angry") {
      color = "#FF6B6B" // soft red
      tooltipText = mood === "sad" ? "Feeling down" : "Feeling upset"
    } else if (mood === "lonely") {
      color = "#A78BFA" // purple
      tooltipText = "Feeling lonely"
    } else if (mood === "tired") {
      tooltipText = "Tired"
    } else if (mood === "curious") {
      tooltipText = "Curious"
    } else {
      tooltipText = "Idle"
    }
    animation = "presenceIdle"
  } else if (mode === "listening") {
    animation = "presenceListening"
    tooltipText = "Listening"
  } else if (mode === "speaking") {
    animation = "presenceSpeaking"
    tooltipText = "Speaking"
  } else if (mode === "thinking") {
    tooltipText = "Thinking"
  }

  if (prefersReducedMotion) {
    animation = "none"
  }

  return (
    <>
      <div
        className="inline-block w-[9px] h-[9px] rounded-full ml-2 cursor-help"
        style={{
          backgroundColor: color,
          boxShadow: `0 0 6px ${color}`,
          animation:
            animation !== "none"
              ? `${animation} ${animation === "presenceIdle" ? "3s" : animation === "presenceListening" ? "1.5s" : "1s"} ease-in-out infinite`
              : "none",
          opacity: prefersReducedMotion ? 0.6 : 1,
        }}
        title={tooltipText}
      />
      <style jsx>{`
        @keyframes presenceIdle {
          0%,
          100% {
            opacity: 0.4;
            box-shadow: 0 0 4px ${color};
          }
          50% {
            opacity: 1;
            box-shadow: 0 0 8px ${color};
          }
        }

        @keyframes presenceListening {
          0%,
          100% {
            opacity: 0.6;
            box-shadow: 0 0 6px ${color};
          }
          50% {
            opacity: 1;
            box-shadow: 0 0 10px ${color};
          }
        }

        @keyframes presenceSpeaking {
          0%,
          90% {
            opacity: 0.8;
            box-shadow: 0 0 6px ${color};
          }
          95% {
            opacity: 1;
            box-shadow: 0 0 12px ${color};
          }
          100% {
            opacity: 0.8;
            box-shadow: 0 0 6px ${color};
          }
        }
      `}</style>
    </>
  )
}

export default function TamagotchiUI({
  timeText,
  dateText,
  hungerPercent,
  mode,
  mood,
  userTranscript,
  aiSubtitle,
  statusText,
  onTalkDown,
  onTalkUp,
  onFeed,
  onEndChat,
  greetingText,
  presenceEnabled = true,
  errorStatus,
  isMuted = false,
  onToggleMute,
  idleObservation,
  recentInteraction,
}: TamagotchiUIProps) {
  const [showingSplash, setShowingSplash] = useState(true)
  const [talkPressed, setTalkPressed] = useState(false)
  const [feedPressed, setFeedPressed] = useState(false)
  const [endPressed, setEndPressed] = useState(false)
  const [talkReleasing, setTalkReleasing] = useState(false)
  const [feedReleasing, setFeedReleasing] = useState(false)
  const [endReleasing, setEndReleasing] = useState(false)

  const isIdle = mode === "idle"
  const isListening = mode === "listening"
  const isThinking = mode === "thinking"
  const isSpeaking = mode === "speaking"
  const showEndChat = isListening || isThinking || isSpeaking

  const caption = statusText || ""
  const displayGreeting = greetingText !== undefined ? greetingText : getDefaultGreeting()

  // circle animation styles based on what's happening
  const getCircleStyle = () => {
    if (isListening || talkPressed) {
      return {
        border: '4px solid #6AF0FF',
        backgroundColor: 'transparent',
        boxShadow: '0 0 20px rgba(106, 240, 255, 0.8)',
        animation: 'pulse 1.5s ease-in-out infinite',
      }
    } else if (isSpeaking) {
      return {
        border: '4px solid #6AF0FF',
        backgroundColor: 'transparent',
        boxShadow: '0 0 30px rgba(106, 240, 255, 1)',
        animation: 'speakingPulse 1s ease-in-out infinite',
      }
    } else if (isThinking) {
      return {
        border: '4px solid #6AF0FF',
        backgroundColor: 'transparent',
        boxShadow: '0 0 15px rgba(106, 240, 255, 0.6)',
        animation: 'thinkingPulse 2s ease-in-out infinite',
      }
    } else {
      // Idle
      return {
        border: '4px solid #6AF0FF',
        backgroundColor: 'transparent',
        boxShadow: '0 0 12px rgba(106, 240, 255, 0.5)',
        animation: 'idleGlow 3s ease-in-out infinite',
      }
    }
  }

  const prefersReducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

  const handleTalkDown = () => {
    setTalkPressed(true)
    setTalkReleasing(false)
    // haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(10)
    }
    onTalkDown()
  }

  const handleTalkUp = () => {
    setTalkPressed(false)
    if (!prefersReducedMotion) {
      setTalkReleasing(true)
      setTimeout(() => setTalkReleasing(false), 200)
    }
    onTalkUp()
  }

  const handleFeedDown = () => {
    setFeedPressed(true)
    setFeedReleasing(false)
    if (navigator.vibrate) {
      navigator.vibrate(10)
    }
  }

  const handleFeedUp = () => {
    setFeedPressed(false)
    if (!prefersReducedMotion) {
      setFeedReleasing(true)
      setTimeout(() => setFeedReleasing(false), 200)
    }
    onFeed()
  }

  const handleEndDown = () => {
    setEndPressed(true)
    setEndReleasing(false)
    if (navigator.vibrate) {
      navigator.vibrate(10)
    }
  }

  const handleEndUp = () => {
    setEndPressed(false)
    if (!prefersReducedMotion) {
      setEndReleasing(true)
      setTimeout(() => setEndReleasing(false), 200)
    }
    onEndChat()
  }


  return (
    <div className="w-[480px] h-[320px] mx-auto bg-black text-[#E6E6E6] font-sans overflow-hidden select-none relative">
      {showingSplash && (
        <Splash
          logoSrc="/tamagotchi-logo.jpg"
          bootSoundSrc="/brand/boot.mp3"
          onFinished={() => setShowingSplash(false)}
        />
      )}

      {/* demo version text */}
      <div className="absolute bottom-2 right-2 text-[9px] text-neutral-500/70 font-light">
        Early Demo Version
      </div>

      <div
        className={`transition-all duration-250 ease-out ${
          showingSplash ? "opacity-0 translate-y-[6px]" : "opacity-100 translate-y-0"
        }`}
      >
        {/* top bar with time and hunger */}
        <div
          className="h-9 px-4 pt-3 grid grid-cols-2 grid-rows-[auto_auto] items-center gap-x-4 transition-opacity duration-300"
          style={{ opacity: isListening ? 0.3 : 1 }}
        >
          {/* time */}
          <div className="text-[13px] whitespace-nowrap">{timeText}</div>

          {/* hunger bar */}
          <div className="inline-flex items-center gap-2 whitespace-nowrap justify-self-end">
            <span className="text-[13px] text-[#9AA0A6] inline-flex items-center">
              Hunger
              {presenceEnabled && <PresenceLight mode={mode} mood={mood} />}
            </span>
            <div className="w-[70px] h-[10px] border border-[#E6E6E6] rounded-sm">
              <div
                className="h-full bg-[#E6E6E6] transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, hungerPercent))}%` }}
              />
            </div>
            {onToggleMute && (
              <button
                onClick={onToggleMute}
                className="ml-1 w-5 h-5 flex items-center justify-center text-[#9AA0A6] hover:text-[#E6E6E6] transition-colors"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M6 1L2 4H1v4h1l4 3V1z" />
                    <path d="M9 4l2 2m0-2l-2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M6 1L2 4H1v4h1l4 3V1z" />
                    <path d="M9 6c0 1.1-.9 2-2 2L6 9l2-6c1.1 0 2 .9 2 2z" />
                  </svg>
                )}
              </button>
            )}
          </div>

          {/* date and greeting */}
          <div className="min-w-0 flex flex-col leading-tight">
            <div className="text-[13px] text-[#9AA0A6] truncate">{dateText}</div>
            {displayGreeting && <div className="text-[11px] text-[#9AA0A6] truncate">{displayGreeting}</div>}
          </div>

          {/* empty space */}
          <div />
        </div>

        <div className="px-4 pb-4 h-[calc(320px-36px)] flex gap-3 items-center">
          {/* left side - mascot circle */}
          <div className="flex-1 flex flex-col items-center">
            <div className="pt-20">
              <div
                className={`w-32 h-32 rounded-full transition-all duration-200 ${
                  isListening ? "scale-110" : ""
                }`}
                style={{
                  ...getCircleStyle(),
                  boxSizing: 'border-box',
                  transition: 'transform 0.2s ease-out, box-shadow 0.3s ease-out',
                }}
              />
            </div>
            {/* status and transcript area */}
            <div className="mt-[54px] flex flex-col items-center" style={{ minWidth: "200px", maxWidth: "200px" }}>
              {caption && (
                <div
                  className="text-[15px] leading-[20px] tracking-wide text-neutral-400 text-center truncate w-full px-2"
                  style={{
                    opacity: 0.7,
                    animation: !prefersReducedMotion ? "statusPulse 2s ease-in-out infinite" : "none",
                  }}
                >
                  {caption}
                </div>
              )}

              {/* transcript display area - fixed size so it doesn't jump around */}
              <div 
                className="relative text-[15px] leading-[20px] tracking-wide text-center px-2"
                style={{ 
                  width: "200px",
                  height: "60px",
                  lineHeight: "20px",
                  overflow: 'visible',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  position: 'relative'
                }}
              >
                {/* user text (white) - shows while listening */}
                <div
                  className={`absolute inset-0 ${
                    isListening && userTranscript ? "opacity-100" : "opacity-0"
                  }`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                    width: '100%',
                    top: '-40px',
                    pointerEvents: 'none',
                    transition: 'opacity 0.3s ease-out'
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: '60px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      textAlign: 'center',
                      position: 'relative'
                    }}
                  >
                    <span 
                      className="text-white/90" 
                      style={{ 
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        display: 'block',
                        lineHeight: '20px',
                        maxHeight: '60px',
                        width: '100%',
                        transform: 'translateZ(0)',
                        backfaceVisibility: 'hidden',
                        WebkitFontSmoothing: 'antialiased',
                        textAlign: 'center',
                        boxSizing: 'border-box',
                        padding: '0 8px',
                        overflow: 'hidden',
                        textOverflow: 'clip',
                        transition: 'opacity 0.2s ease-in-out'
                      }}
                    >
                      {truncateTranscript(userTranscript, 60)}
                    </span>
                  </div>
                </div>
                
                {/* AI text (cyan) - shows while speaking */}
                <div
                  className={`absolute inset-0 transition-opacity duration-200 ${
                    isSpeaking && aiSubtitle ? "opacity-100" : "opacity-0"
                  }`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                    width: '100%',
                    top: '-40px',
                    pointerEvents: 'none'
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: '60px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      textAlign: 'center',
                      position: 'relative'
                    }}
                  >
                    <span 
                      className="text-cyan-300" 
                      style={{ 
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        display: 'block',
                        lineHeight: '20px',
                        maxHeight: '60px',
                        width: '100%',
                        transform: 'translateZ(0)',
                        backfaceVisibility: 'hidden',
                        WebkitFontSmoothing: 'antialiased',
                        textAlign: 'center',
                        boxSizing: 'border-box',
                        padding: '0 8px',
                        overflow: 'hidden',
                        textOverflow: 'clip'
                      }}
                    >
                      {aiSubtitle || ''}
                    </span>
                  </div>
                </div>
                
                {/* idle thoughts - subtle text when nothing's happening */}
                {(isIdle && idleObservation) && (
                  <div
                    className="absolute inset-0 transition-opacity duration-500"
                    style={{ opacity: 0.5 }}
                  >
                    <span 
                      className="text-neutral-500 italic" 
                      style={{ 
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        fontSize: '13px',
                      }}
                    >
                      {idleObservation}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="w-[220px] flex flex-col justify-center">
            <div className="flex flex-col gap-3" style={{ height: "196px" }}>
              <button
                onPointerDown={handleTalkDown}
                onPointerUp={handleTalkUp}
                disabled={isThinking}
                className={`w-full h-[60px] rounded-full text-[20px] font-medium touch-none transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6AF0FF] focus-visible:outline-offset-2 ${
                  talkPressed
                    ? "bg-[#6AF0FF] text-black border border-transparent shadow-[0_0_16px_rgba(106,240,255,0.9)]"
                    : talkReleasing
                      ? "border border-[#6AF0FF] bg-black text-[#E6E6E6] shadow-[0_0_16px_rgba(106,240,255,0.5)]"
                      : isThinking
                        ? "border border-[#6AF0FF]/30 bg-black/50 text-[#E6E6E6]/30 shadow-[0_0_12px_rgba(106,240,255,0.2)] cursor-not-allowed"
                        : "border border-[#6AF0FF] bg-black text-[#E6E6E6] shadow-[0_0_12px_rgba(106,240,255,0.4)]"
                }`}
                style={{
                  transform: talkPressed
                    ? "scale(0.97) translateY(1px)"
                    : talkReleasing && !prefersReducedMotion
                      ? "scale(1.03)"
                      : "scale(1)",
                  animation: isIdle && !prefersReducedMotion ? "breathe 3s ease-in-out infinite" : "none",
                  pointerEvents: isThinking ? "none" : "auto",
                }}
              >
                Talk (Hold)
              </button>

              <button
                onPointerDown={handleFeedDown}
                onPointerUp={handleFeedUp}
                className={`w-full h-[56px] rounded-full border border-[#E6E6E6] bg-black text-[#E6E6E6] text-[18px] font-medium transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E6E6E6] focus-visible:outline-offset-2 ${
                  feedPressed ? "shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]" : "shadow-[0_0_4px_rgba(230,230,230,0.2)]"
                }`}
                style={{
                  transform: feedPressed
                    ? "scale(0.97) translateY(1px)"
                    : feedReleasing && !prefersReducedMotion
                      ? "scale(1.03)"
                      : "scale(1)",
                }}
              >
                Feed
              </button>

              <button
                onPointerDown={handleEndDown}
                onPointerUp={handleEndUp}
                className={`w-full h-[56px] rounded-full border border-[#FF5A5A] bg-black text-[#FF5A5A] text-[18px] font-medium transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FF5A5A] focus-visible:outline-offset-2 ${
                  endPressed
                    ? "shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]"
                    : endReleasing
                      ? "shadow-[0_0_12px_rgba(255,90,90,0.5)]"
                      : "shadow-[0_0_8px_rgba(255,90,90,0.3)]"
                } ${showEndChat ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
                style={{
                  transform: endPressed
                    ? "scale(0.97) translateY(1px)"
                    : endReleasing && !prefersReducedMotion
                      ? "scale(1.03)"
                      : "scale(1)",
                }}
              >
                End chat
              </button>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes idleGlow {
            0%,
            100% {
              opacity: 0.8;
              box-shadow: 0 0 12px rgba(106, 240, 255, 0.5);
            }
            50% {
              opacity: 1;
              box-shadow: 0 0 20px rgba(106, 240, 255, 0.8);
            }
          }

          @keyframes pulse {
            0%,
            100% {
              opacity: 0.7;
              box-shadow: 0 0 15px rgba(106, 240, 255, 0.6);
            }
            50% {
              opacity: 1;
              box-shadow: 0 0 25px rgba(106, 240, 255, 1);
            }
          }

          @keyframes speakingPulse {
            0%,
            100% {
              opacity: 0.9;
              box-shadow: 0 0 25px rgba(106, 240, 255, 0.9);
            }
            50% {
              opacity: 1;
              box-shadow: 0 0 35px rgba(106, 240, 255, 1);
            }
          }

          @keyframes thinkingPulse {
            0%,
            100% {
              opacity: 0.8;
              box-shadow: 0 0 12px rgba(106, 240, 255, 0.5);
            }
            50% {
              opacity: 1;
              box-shadow: 0 0 18px rgba(106, 240, 255, 0.7);
            }
          }

          @keyframes breathe {
            0%,
            100% {
              box-shadow: 0 0 12px rgba(106, 240, 255, 0.4);
            }
            50% {
              box-shadow: 0 0 20px rgba(106, 240, 255, 0.6);
            }
          }

          @keyframes statusPulse {
            0%,
            100% {
              opacity: 0.8;
            }
            50% {
              opacity: 1;
            }
          }

          @keyframes transcriptPulse {
            0%,
            100% {
              opacity: 0.8;
            }
            50% {
              opacity: 1;
            }
          }

          @keyframes wordEnter {
            0% {
              opacity: 0;
              transform: translateY(4px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes wordExit {
            0% {
              opacity: 1;
              transform: translateY(0);
            }
            100% {
              opacity: 0;
              transform: translateY(-4px);
            }
          }

          @media (prefers-reduced-motion: reduce) {
            * {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
            }
          }
        `}</style>
      </div>
    </div>
  )
}

// main demo component - ties everything together
export function Demo() {
  const [hunger, setHunger] = useState(35)
  const [mood, setMood] = useState<Mood>("happy")
  const [replaySplash, setReplaySplash] = useState(0)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [booted, setBooted] = useState(false)
  
  const voice = useVoice()
  const tts = useTTS()
  const mode = voice.state.phase === 'listening' ? "listening" : voice.state.phase === 'thinking' || voice.state.phase === 'initiating' ? "thinking" : voice.state.phase === 'replying' ? "speaking" : "idle"
  
  // track progress for smooth text scrolling
  const previousProgressRef = useRef(0)
  
  // get conversation state from localStorage
  const [conversationState, setConversationState] = useState<any>(null)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('tamagotchi_conversation_state')
      if (stored) {
        const parsed = JSON.parse(stored)
        setConversationState(parsed)
      }
    } catch (e) {
      // Ignore
    }
  }, [voice.state.turnId]) // Update when turn changes

  const [proactiveText, setProactiveText] = useState<string | null>(null)
  const [idleObservation, setIdleObservation] = useState<string | null>(null)
  const proactiveRecallCancelRef = useRef<(() => void) | null>(null)

  // handle when AI wants to say something proactively
  const handleProactiveRecall = useCallback((text: string) => {
    if (voice.state.phase === 'idle' || voice.state.phase === 'replying') {
      tts.speak(text)
      setProactiveText(text)
    }
  }, [voice.state.phase, tts])

  // cancel proactive stuff if user starts doing something
  const handleUserActivity = useCallback(() => {
    if (proactiveRecallCancelRef.current) {
      proactiveRecallCancelRef.current()
    }
    setProactiveText(null)
  }, [])

  // check if emotional awareness is enabled
  const [emotionalAwarenessEnabled, setEmotionalAwarenessEnabled] = useState(true)
  useEffect(() => {
    const stored = localStorage.getItem('emotional_awareness_enabled')
    if (stored !== null) {
      setEmotionalAwarenessEnabled(stored === 'true')
    }
  }, [])

  // hook for proactive recall stuff
  const proactiveRecall = useProactiveRecall({
    isIdle: mode === 'idle',
    phase: voice.state.phase,
    booted,
    onUserActivity: handleUserActivity,
    onProactiveRecall: handleProactiveRecall,
    conversationState: conversationState,
    emotionalAwarenessEnabled,
  })

  // handle idle behaviors - random thoughts and stuff
  const handleIdleBehavior = useCallback((behavior: { type: string; text: string; subtle?: boolean; duration: number }) => {
    if (behavior.subtle) {
      // subtle observation - just show text, no sound
      setIdleObservation(behavior.text)
      setTimeout(() => {
        setIdleObservation(null)
      }, behavior.duration)
    } else {
      // full proactive recall - speak it
      if (!tts.isSpeaking && voice.state.phase === 'idle') {
        tts.speak(behavior.text)
        setProactiveText(behavior.text)
        setTimeout(() => {
          setProactiveText(null)
        }, behavior.duration)
      }
    }
  }, [tts, voice.state.phase])

  // get personality traits for behaviors
  const [traits, setTraits] = useState<Array<{ id: string; score: number }>>([])
  useEffect(() => {
    // fetch traits from API
    fetch('/api/memory')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data.traits_enabled && data.data.traits) {
          const topTraits = data.data.traits
            .sort((a: any, b: any) => b.score - a.score)
            .slice(0, 3)
            .map((t: any) => ({ id: t.id, score: t.score }))
          setTraits(topTraits)
        }
      })
      .catch(() => {
        // whatever, ignore errors
      })
  }, [voice.state.turnId])

  useIdleBehaviors({
    isIdle: mode === 'idle',
    phase: voice.state.phase,
    mood,
    emotion: conversationState?.emotion,
    aiEmotion: conversationState?.ai_emotion, // Pass AI emotion to idle behaviors
    traits,
    onBehavior: handleIdleBehavior,
  })

  // daily routines - morning/evening check-ins, etc
  const handleDailyRoutine = useCallback(async (routine: { type: string; text: string; timestamp: string }) => {
    // only do this if idle
    if (mode !== 'idle' || voice.state.phase !== 'idle' || tts.isSpeaking) {
      return
    }

    // fetch text from API if not provided
    let routineText = routine.text
    if (!routineText) {
      try {
        // get routine state from localStorage
        const stored = typeof window !== 'undefined' ? localStorage.getItem('tamagotchi_daily_routines') : null
        const routineState = stored ? JSON.parse(stored) : null
        
        const today = new Date().toISOString().split('T')[0]
        const response = await fetch('/api/daily-routine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: routine.type,
            conversationHistory: conversationState?.conversation_history,
            conversationCount: routineState?.conversationCounts?.[today] || 0,
            sleepPatterns: routineState?.sleepPatterns || [],
          }),
        })
        const data = await response.json()
        if (data.success && data.text) {
          routineText = data.text
        }
      } catch (error) {
        console.error('[Daily Routines] Failed to fetch routine message:', error)
        // fallback messages if API fails
        switch (routine.type) {
          case 'morning':
            routineText = "Good morning! How did you sleep?"
            break
          case 'evening':
            routineText = "How was your day? Anything on your mind?"
            break
          case 'late_night':
            routineText = "Still up? Everything okay?"
            break
          case 'summary':
            routineText = "Thanks for chatting today!"
            break
          case 'special_event':
            // Special events are handled separately, skip fallback
            return
          default:
            return
        }
      }
    }

    // special events - holidays, birthdays, etc
    if (routine.type === 'special_event') {
      // check holidays first
      try {
        const holidayResponse = await fetch('/api/special-events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'holiday' }),
        })
        const holidayData = await holidayResponse.json()
        if (holidayData.success && holidayData.text) {
          tts.speak(holidayData.text)
          setProactiveText(holidayData.text)
          setTimeout(() => {
            setProactiveText(null)
          }, 8000)
          return
        }
      } catch (error) {
        // keep checking
      }

      // check birthdays
      try {
        const birthdayResponse = await fetch('/api/special-events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'birthday' }),
        })
        const birthdayData = await birthdayResponse.json()
        if (birthdayData.success && birthdayData.text) {
          tts.speak(birthdayData.text)
          setProactiveText(birthdayData.text)
          setTimeout(() => {
            setProactiveText(null)
          }, 8000)
          return
        }
      } catch (error) {
        // keep checking
      }

      // seasonal/weekday stuff (lower priority)
      try {
        const seasonalResponse = await fetch('/api/special-events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'seasonal' }),
        })
        const seasonalData = await seasonalResponse.json()
        if (seasonalData.success && seasonalData.text) {
          // seasonal stuff is more subtle
          setIdleObservation(seasonalData.text)
          setTimeout(() => {
            setIdleObservation(null)
          }, 5000)
          return
        }
      } catch (error) {
        // ignore
      }

      return
    }

    // goal check-ins
    if (routine.type === 'goal_check_in') {
      try {
        const response = await fetch('/api/goals', {
          method: 'GET',
        })
        const data = await response.json()
        if (data.success && data.goals && data.goals.length > 0) {
          const activeGoals = data.goals.filter((g: any) => g.status === 'active')
          if (activeGoals.length > 0) {
            // just pick the first active goal
            const goal = activeGoals[0]
            const checkInResponse = await fetch('/api/goals', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'check_in',
                goalId: goal.id,
              }),
            })
            const checkInData = await checkInResponse.json()
            if (checkInData.success && checkInData.message) {
              tts.speak(checkInData.message)
              setProactiveText(checkInData.message)
              setTimeout(() => {
                setProactiveText(null)
              }, 8000)
              return
            }
          }
        }
      } catch (error) {
        // ignore
      }
      return
    }

    // goal reminders
    if (routine.type === 'goal_reminder') {
      try {
        const response = await fetch('/api/goals', {
          method: 'GET',
        })
        const data = await response.json()
        if (data.success && data.goals && data.goals.length > 0) {
          const activeGoals = data.goals.filter((g: any) => g.status === 'active')
          if (activeGoals.length > 0) {
            // pick first goal
            const goal = activeGoals[0]
            const reminderResponse = await fetch('/api/goals', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'remind',
                goalId: goal.id,
              }),
            })
            const reminderData = await reminderResponse.json()
            if (reminderData.success && reminderData.message) {
              // reminders are subtle
              setIdleObservation(reminderData.message)
              setTimeout(() => {
                setIdleObservation(null)
              }, 5000)
              return
            }
          }
        }
      } catch (error) {
        // ignore
      }
      return
    }

    // show routine message
    if (routine.type === 'summary') {
      // summaries are subtle
      setIdleObservation(routineText)
      setTimeout(() => {
        setIdleObservation(null)
      }, 6000)
    } else {
      // morning/evening messages get full TTS
      tts.speak(routineText)
      setProactiveText(routineText)
      setTimeout(() => {
        setProactiveText(null)
      }, 8000)
    }
  }, [mode, voice.state.phase, tts, conversationState, setIdleObservation])

  const dailyRoutines = useDailyRoutines({
    isIdle: mode === 'idle',
    phase: voice.state.phase,
    booted,
    onRoutine: handleDailyRoutine,
    conversationState: conversationState,
  })

  // achievement system - milestones and streaks
  const handleAchievement = useCallback(async (achievement: { type: string; text: string; timestamp: string; milestone?: number; streak?: number }) => {
    // only show if idle
    if (mode !== 'idle' || voice.state.phase !== 'idle' || tts.isSpeaking) {
      return
    }

    // fetch text from API if needed
    let achievementText = achievement.text
    if (!achievementText) {
      try {
        const response = await fetch('/api/achievements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: achievement.type,
            milestone: achievement.milestone,
            streak: achievement.streak,
          }),
        })
        const data = await response.json()
        if (data.success && data.text) {
          achievementText = data.text
        }
      } catch (error) {
        console.error('[Achievements] Failed to fetch achievement message:', error)
        // Fallback messages
        if (achievement.type === 'milestone' && achievement.milestone) {
          achievementText = `Wow, ${achievement.milestone} conversations! That's amazing.`
        } else if (achievement.type === 'streak' && achievement.streak) {
          achievementText = `We've talked ${achievement.streak} days in a row! That's really nice.`
        } else {
          return
        }
      }
    }

    // celebrate achievement
    tts.speak(achievementText)
    setProactiveText(achievementText)
    
    setTimeout(() => {
      setProactiveText(null)
    }, 10000)
    
    // briefly change mood to happy
    setMood('happy')
    setTimeout(() => {
      // revert to normal mood
      if (conversationState?.ai_emotion && conversationState.ai_emotion.intensity >= 0.6) {
        const aiEmotion = conversationState.ai_emotion
        const emotionToMood: Record<string, Mood> = {
          'happy': 'happy',
          'excited': 'happy',
          'playful': 'happy',
          'curious': 'curious',
          'content': 'neutral',
          'calm': 'neutral',
          'thoughtful': 'neutral',
          'tired': 'tired',
          'lonely': 'lonely',
          'neutral': 'neutral',
        }
        const aiMood = emotionToMood[aiEmotion.label] || null
        if (aiMood) {
          setMood(aiMood)
          return
        }
      }
      // fall back to hunger-based mood
      if (hunger > 80) setMood("hungry")
      else if (hunger > 50) setMood("curious")
      else setMood("happy")
    }, 3000)
  }, [mode, voice.state.phase, tts, conversationState, hunger])

  const achievements = useAchievements({
    turnCount: conversationState?.turn_count,
    onAchievement: handleAchievement,
  })

  // store cancel function
  useEffect(() => {
    proactiveRecallCancelRef.current = proactiveRecall.cancelProactiveRecall
  }, [proactiveRecall])

  // mark as booted after splash
  useEffect(() => {
    const timer = setTimeout(() => {
      setBooted(true)
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  // cancel proactive stuff when user starts talking
  useEffect(() => {
    if (voice.state.phase === 'listening' || voice.state.phase === 'thinking') {
      if (proactiveRecallCancelRef.current) {
        proactiveRecallCancelRef.current()
      }
      setProactiveText(null)
      tts.stop()
    }
  }, [voice.state.phase, tts])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "R") {
        e.preventDefault()
        sessionStorage.removeItem("seenSplash")
        setReplaySplash((prev) => prev + 1)
        window.location.reload()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // hunger increases over time
  useEffect(() => {
    const interval = setInterval(() => {
      setHunger((prev) => Math.min(100, prev + 5))
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // convert AI emotion to visual mood
  const getMoodFromAIEmotion = (aiEmotion?: { label: string; intensity: number }): Mood | null => {
    if (!aiEmotion || aiEmotion.intensity < 0.4) return null
    
    const emotionToMood: Record<string, Mood> = {
      'happy': 'happy',
      'excited': 'happy',
      'playful': 'happy',
      'curious': 'curious',
      'content': 'neutral',
      'calm': 'neutral',
      'thoughtful': 'neutral',
      'tired': 'tired',
      'lonely': 'lonely',
      'neutral': 'neutral',
    }
    
    return emotionToMood[aiEmotion.label] || null
  }

  // update mood based on hunger or AI emotion
  useEffect(() => {
    const aiMood = getMoodFromAIEmotion(conversationState?.ai_emotion)
    
    if (aiMood && conversationState?.ai_emotion && conversationState.ai_emotion.intensity >= 0.6) {
      // strong AI emotion overrides hunger
      setMood(aiMood)
    } else {
      // fall back to hunger
      if (hunger > 80) setMood("hungry")
      else if (hunger > 50) setMood("curious")
      else setMood("happy")
    }
  }, [hunger, conversationState?.ai_emotion])

  const handleFeed = () => {
    setHunger(Math.max(0, hunger - 20))
    setMood("happy")
    setRecentInteraction('feed')
    // haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate([50, 30, 50])
    }
  }
  
  // track recent interactions
  const [recentInteraction, setRecentInteraction] = useState<'talk' | 'feed' | null>(null)
  useEffect(() => {
    if (recentInteraction) {
      const timer = setTimeout(() => setRecentInteraction(null), 2000)
      return () => clearTimeout(timer)
    }
  }, [recentInteraction])

  // speak AI replies when they arrive
  const previousReplyRef = useRef<string>('')
  useEffect(() => {
    if ((voice.state.phase === 'replying' || voice.state.phase === 'initiating') && voice.state.aiReply) {
      // only speak if it's a new reply
      if (voice.state.aiReply !== previousReplyRef.current) {
        previousReplyRef.current = voice.state.aiReply
        tts.speak(voice.state.aiReply)
        setProactiveText(null)
      }
    } else if (voice.state.phase === 'listening' || voice.state.phase === 'thinking') {
      // stop TTS when listening/thinking
      tts.stop()
      setProactiveText(null)
    }
  }, [voice.state.phase, voice.state.aiReply, tts])

  // handle proactive text TTS
  useEffect(() => {
    if (proactiveText && mode === 'idle' && !tts.isSpeaking && voice.state.phase === 'idle') {
      tts.speak(proactiveText)
      const timer = setTimeout(() => {
        setProactiveText(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [proactiveText, mode, tts, voice.state.phase])

  // stop TTS when talk button pressed
  const handleTalkDown = () => {
    tts.stop()
    voice.handleTalkDown()
    setRecentInteraction('talk')
  }

  // stop TTS when end chat pressed
  const handleEndChat = () => {
    tts.stop()
    voice.handleEndChat()
  }

  const now = new Date()
  const timeText = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })
  const dateText = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })

  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-8">
      <TamagotchiUI
        timeText={timeText}
        dateText={dateText}
        hungerPercent={hunger}
        mood={mood}
        mode={mode}
        onTalkDown={handleTalkDown}
        onTalkUp={voice.handleTalkUp}
        onFeed={handleFeed}
        onEndChat={handleEndChat}
        userTranscript={voice.state.userTranscript}
        aiSubtitle={
          // show progressive text if TTS is playing
          tts.isSpeaking && tts.currentText
            ? getProgressiveTranscript(tts.currentText, tts.playbackProgress, 60, previousProgressRef)
            : (() => {
                previousProgressRef.current = 0
                return proactiveText || voice.state.aiReply
              })()
        }
        statusText={voice.state.statusText}
        isMuted={tts.isMuted}
        onToggleMute={() => tts.setMuted(!tts.isMuted)}
        idleObservation={idleObservation}
        recentInteraction={recentInteraction}
      />
      {/* debug panel - only show in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-3 left-3 text-[10px] text-white/50 space-y-1">
          <div>phase={voice.state.phase} | turn={voice.state.turnId} | interim={voice.state.interimBuffer.length} | user={voice.state.userTranscript.length} | ai={voice.state.aiReply.length}</div>
          <div>TTS: {tts.isSpeaking ? 'speaking' : 'idle'} | muted={tts.isMuted ? 'yes' : 'no'}</div>
          <div className="flex gap-2">
            <button 
              onClick={() => tts.speak("Quick audio test.")}
              className="px-2 py-1 bg-cyan-600 text-white rounded text-xs hover:bg-cyan-700"
            >
              Test TTS
            </button>
            <button 
              onClick={() => tts.setMuted(!tts.isMuted)}
              className="px-2 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700"
            >
              {tts.isMuted ? 'Unmute' : 'Mute'}
            </button>
            <button 
              onClick={() => setSettingsOpen(true)}
              className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
            >
              Memory Settings
            </button>
          </div>
        </div>
      )}
      <MemorySettings open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  )
}
