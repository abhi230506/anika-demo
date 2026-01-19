"use client"

import { useState, useEffect, useRef } from "react"

// Splash screen component - shows on first load
interface SplashProps {
  logoSrc: string
  bootSoundSrc?: string
  showOnce?: boolean
  durations?: {
    spinnerMs?: number
    blackMs?: number
    fadeMs?: number
    holdMs?: number
  }
  onFinished?: () => void
}

export default function Splash({ logoSrc, bootSoundSrc, showOnce = true, durations = {}, onFinished }: SplashProps) {
  const [phase, setPhase] = useState<"spinner" | "black" | "logo-in" | "logo-hold" | "logo-out" | "done">("spinner")
  const [shouldShow, setShouldShow] = useState(true)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const startTimeRef = useRef(Date.now())

  const SPINNER_MS = durations.spinnerMs ?? 2000
  const BLACK_MS = durations.blackMs ?? 1000
  const FADE_MS = durations.fadeMs ?? 1000
  const HOLD_MS = durations.holdMs ?? 5000

  const prefersReducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

  useEffect(() => {
    if (showOnce && typeof window !== "undefined") {
      const seenSplash = sessionStorage.getItem("seenSplash")
      if (seenSplash === "true") {
        setShouldShow(false)
        onFinished?.()
        return
      }
    }

    if (prefersReducedMotion) {
      const timer = setTimeout(() => {
        setPhase("done")
        if (showOnce && typeof window !== "undefined") {
          sessionStorage.setItem("seenSplash", "true")
        }
        onFinished?.()
      }, 200)
      return () => clearTimeout(timer)
    }

    const runSequence = async () => {
      await new Promise((resolve) => setTimeout(resolve, SPINNER_MS))

      setPhase("black")
      await new Promise((resolve) => setTimeout(resolve, BLACK_MS))

      setPhase("logo-in")
      await new Promise((resolve) => setTimeout(resolve, FADE_MS))

      setPhase("logo-hold")

      if (bootSoundSrc && typeof window !== "undefined") {
        try {
          audioRef.current = new Audio(bootSoundSrc)
          audioRef.current.volume = 0.5
          await audioRef.current.play()
        } catch (err) {
          // autoplay blocked, whatever
          console.log("Boot sound autoplay blocked")
        }
      }

      await new Promise((resolve) => setTimeout(resolve, HOLD_MS))

      setPhase("logo-out")
      await new Promise((resolve) => setTimeout(resolve, 300))

      setPhase("done")
      if (showOnce && typeof window !== "undefined") {
        sessionStorage.setItem("seenSplash", "true")
      }
      onFinished?.()
    }

    runSequence()
  }, [SPINNER_MS, BLACK_MS, FADE_MS, HOLD_MS, bootSoundSrc, showOnce, onFinished, prefersReducedMotion])

  const handleSkip = () => {
    const elapsed = Date.now() - startTimeRef.current
    if (elapsed >= 1200) {
      setPhase("done")
      if (showOnce && typeof window !== "undefined") {
        sessionStorage.setItem("seenSplash", "true")
      }
      onFinished?.()
    }
  }

  if (!shouldShow || phase === "done") {
    return null
  }

  const showRing = phase === "spinner" || phase === "logo-in" || phase === "logo-hold" || phase === "logo-out"

  const ringOpacity =
    phase === "spinner" || phase === "logo-in" || phase === "logo-hold"
      ? 1
      : phase === "logo-out"
        ? 0
        : 1

  return (
    <div
      className="absolute inset-0 bg-black flex items-center justify-center z-50"
      aria-hidden="true"
      onClick={handleSkip}
    >
      {showRing && !prefersReducedMotion && (
        <div className="relative w-[80px] h-[80px] flex items-center justify-center">
          {/* glowing ring thing - looks cool */}
          <svg 
            width="80" 
            height="80" 
            viewBox="0 0 80 80"
            className="absolute"
            style={{
              animation: 'pulse-glow-div 2s ease-in-out infinite',
              opacity: ringOpacity,
              transition: `opacity ${FADE_MS}ms ${phase === "logo-out" ? "ease-in" : "none"}`,
            }}
          >
            <defs>
              <mask id="ring-mask">
                <rect width="80" height="80" fill="white" />
                <circle cx="40" cy="40" r="32" fill="black" />
              </mask>
            </defs>
            <circle 
              cx="40" 
              cy="40" 
              r="38" 
              fill="#6AF0FF" 
              mask="url(#ring-mask)"
            />
          </svg>
        </div>
      )}
      {/* demo version text */}
      <div className="absolute bottom-4 text-[10px] text-neutral-500/70 font-light">
        Early Demo Version
      </div>
    </div>
  )
}
