"use client"

import { useState, useCallback, useRef, useEffect } from 'react'

export interface UseTTSReturn {
  speak: (text: string) => Promise<void>
  stop: () => void
  isSpeaking: boolean
  isMuted: boolean
  setMuted: (muted: boolean) => void
  currentText: string | null // text being spoken
  playbackProgress: number // 0.0 to 1.0
}

// TTS hook using ElevenLabs API
// handles queue, cancellation, mute
export function useTTS(): UseTTSReturn {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentText, setCurrentText] = useState<string | null>(null)
  const [playbackProgress, setPlaybackProgress] = useState(0)
  
  const queueRef = useRef<string[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  const isProcessingRef = useRef(false)
  const playbackStartTimeRef = useRef<number | null>(null)
  const totalTextLengthRef = useRef(0)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const fullOriginalTextRef = useRef<string | null>(null) // full text before chunking
  const spokenCharsRef = useRef(0) // track characters spoken
  const chunksRef = useRef<string[]>([]) // chunks for this session

  // init audio context
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current && typeof window !== 'undefined') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return audioContextRef.current
  }, [])

  // process the speech queue
  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || queueRef.current.length === 0) {
      return
    }

    isProcessingRef.current = true
    
    // reset tracking for new session
    spokenCharsRef.current = 0
    const allChunks = [...queueRef.current]
    chunksRef.current = allChunks
    
    let cumulativeChars = 0
    let chunkIndex = 0
    
    while (queueRef.current.length > 0) {
      const text = queueRef.current.shift()!
      const chunkStartCharIndex = cumulativeChars
      // Add space between chunks (except for first chunk)
      if (chunkIndex > 0) {
        cumulativeChars += 1 // Space character
      }
      cumulativeChars += text.length
      chunkIndex++
      
      // skip if muted
      if (isMuted) {
        continue
      }

      try {
        setIsSpeaking(true)
        // use full text for display
        setCurrentText(fullOriginalTextRef.current || text)
        setPlaybackProgress(0)
        
        // track chunk timing
        const chunkStartTime = Date.now()
        playbackStartTimeRef.current = chunkStartTime
        const chunkLength = text.length
        totalTextLengthRef.current = fullOriginalTextRef.current?.length || chunkLength

        // fetch audio from API
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        })

        if (!response.ok) {
          console.error('[TTS] API error:', response.status)
          continue
        }

        // get audio blob
        const audioBlob = await response.blob()
        const audioUrl = URL.createObjectURL(audioBlob)

        // play audio
        const audio = new Audio(audioUrl)
        currentAudioRef.current = audio

        // track playback progress
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current)
        }
        
        // update progress - throttle to avoid jumpiness
        let lastProgressUpdate = 0
        progressIntervalRef.current = setInterval(() => {
          const now = Date.now()
          // throttle to 100ms updates
          if (now - lastProgressUpdate < 100) {
            return
          }
          lastProgressUpdate = now
          
          if (audio.currentTime >= 0 && audio.duration > 0) {
            // use actual audio time
            const chunkProgress = Math.min(1.0, audio.currentTime / audio.duration)
            const charsInThisChunk = Math.floor(chunkLength * chunkProgress)
            const cumulativeChars = chunkStartCharIndex + charsInThisChunk
            const totalLength = fullOriginalTextRef.current?.length || totalTextLengthRef.current
            
            if (totalLength > 0) {
              const overallProgress = Math.min(1.0, cumulativeChars / totalLength)
              setPlaybackProgress(overallProgress)
            }
          } else {
            // fallback: estimate from time (TTS is ~20 chars/sec)
            const fastEstimateCharsPerSecond = 20
            const estimatedChunkDuration = chunkLength / fastEstimateCharsPerSecond
            const elapsed = (Date.now() - chunkStartTime) / 1000
            const chunkProgress = Math.min(1.0, elapsed / estimatedChunkDuration)
            const charsInThisChunk = Math.floor(chunkLength * chunkProgress)
            const cumulativeChars = chunkStartCharIndex + charsInThisChunk
            const totalLength = fullOriginalTextRef.current?.length || totalTextLengthRef.current
            
            if (totalLength > 0) {
              const overallProgress = Math.min(1.0, cumulativeChars / totalLength)
              setPlaybackProgress(overallProgress)
            }
          }
        }, 50)

        await new Promise<void>((resolve, reject) => {
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl)
            currentAudioRef.current = null
            
            // mark chunk as complete
            spokenCharsRef.current = chunkStartCharIndex + chunkLength
            
            // if last chunk, set progress to 1.0
            if (queueRef.current.length === 0 && isProcessingRef.current) {
              setPlaybackProgress(1.0)
              spokenCharsRef.current = totalTextLengthRef.current
            } else {
              // update progress based on completed chunks
              const totalLength = fullOriginalTextRef.current?.length || totalTextLengthRef.current
              if (totalLength > 0) {
                setPlaybackProgress(Math.min(1.0, spokenCharsRef.current / totalLength))
              }
            }
            
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current)
              progressIntervalRef.current = null
            }
            playbackStartTimeRef.current = null
            resolve()
          }
          audio.onerror = () => {
            URL.revokeObjectURL(audioUrl)
            currentAudioRef.current = null
            setPlaybackProgress(0)
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current)
              progressIntervalRef.current = null
            }
            playbackStartTimeRef.current = null
            reject(new Error('Audio playback failed'))
          }
          audio.play().catch(reject)
        })
      } catch (error) {
        console.error('[TTS] Playback error:', error)
        setPlaybackProgress(0)
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current)
          progressIntervalRef.current = null
        }
        playbackStartTimeRef.current = null
      }
    }

    setIsSpeaking(false)
    setCurrentText(null)
    setPlaybackProgress(0)
    isProcessingRef.current = false
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
    playbackStartTimeRef.current = null
    fullOriginalTextRef.current = null
    spokenCharsRef.current = 0
    chunksRef.current = []
  }, [isMuted])

  const speak = useCallback(async (text: string) => {
    if (!text || !text.trim()) {
      return
    }

    // strip emojis before speaking
    const cleanText = text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{27FF}]|[\u{FE00}-\u{FE0F}]/gu, '').trim()

    if (!cleanText) {
      return
    }

    // store full text for display
    fullOriginalTextRef.current = cleanText
    spokenCharsRef.current = 0
    
    // split long text into chunks to avoid stuttering
    if (cleanText.length > 400) {
      // try splitting by sentences first
      let chunks = cleanText.match(/[^.!?]+[.!?]+/g)
      
      // if no sentences, split by commas
      if (!chunks || chunks.length === 0) {
        chunks = cleanText.split(/[,;]\s+/).filter(chunk => chunk.trim().length > 0)
      }
      
      // if still no good splits, split into ~200 char chunks
      if (!chunks || chunks.length === 0 || chunks.some(chunk => chunk.length < 20)) {
        const words = cleanText.split(/\s+/)
        chunks = []
        let currentChunk = ''
        for (const word of words) {
          if (currentChunk.length + word.length + 1 > 200 && currentChunk.length > 0) {
            chunks.push(currentChunk.trim())
            currentChunk = word
          } else {
            currentChunk += (currentChunk ? ' ' : '') + word
          }
        }
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim())
        }
      }
      
      queueRef.current.push(...chunks.filter(chunk => chunk.trim().length > 0))
    } else {
      // short text - speak as-is
      queueRef.current.push(cleanText)
    }

    processQueue()
  }, [processQueue])

  const stop = useCallback(() => {
    // clear queue
    queueRef.current = []

    // stop audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current = null
    }
    
    // clear progress tracking
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
    playbackStartTimeRef.current = null
    fullOriginalTextRef.current = null
    spokenCharsRef.current = 0
    chunksRef.current = []
    setCurrentText(null)
    setPlaybackProgress(0)

    setIsSpeaking(false)
    isProcessingRef.current = false
  }, [])

  // cleanup on unmount
  useEffect(() => {
    return () => {
      stop()
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [stop])

  return {
    speak,
    stop,
    isSpeaking,
    isMuted,
    setMuted: setIsMuted,
    currentText,
    playbackProgress,
  }
}

