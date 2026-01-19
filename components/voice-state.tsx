"use client"

import { useState, useRef, useCallback } from 'react'

export type VoicePhase = 'idle' | 'initiating' | 'listening' | 'thinking' | 'replying'

export interface VoiceState {
  phase: VoicePhase
  turnId: number
  userTranscript: string  // White text during listening/thinking
  aiReply: string         // Cyan text during replying
  interimBuffer: string   // Streaming interim during listening
  statusText: string      // Status message to display
  spriteEmotion?: string  // Emotion for sprite: 'happy', 'curious', 'tired', 'lonely', 'angry', 'sad', 'neutral'
}

/**
 * Conversation state interface (matches server)
 */
export interface ConversationState {
  last_ai_intent: string
  last_user_reply_type: 'open' | 'closed' | 'silence'
  recent_topics: string[]
  mood: 'neutral' | 'upbeat' | 'tired' | 'focused'
  turn_count: number
  emotion?: {
    label: string
    confidence: number
    last_update: string
    signals: string[]
  }
  ai_emotion?: {
    label: string
    intensity: number
    last_update: string
    factors: {
      user_engagement: number
      time_since_interaction: number
      interaction_count_today: number
      positive_interactions_recent: number
      time_of_day_mood: number
    }
  }
  recent_replies?: Array<{
    text: string
    replyType: 'open' | 'closed' | 'silence'
    timestamp: string
  }>
  last_empathy_line?: string
  dialogue_policy?: {
    last_3_actions: Array<{
      type: string
      timestamp: string
    }>
    last_user_verbosity: 'short' | 'medium' | 'long'
    silence_duration: number
    question_cooldown: number
    recent_topics_asked: string[]
  }
  conversation_history?: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
  last_ai_response?: string
  last_ai_tone?: string
  last_interaction_timestamp?: string
  interaction_count_today?: number
  idle_logs?: Array<{
    timestamp: string
    activity: string
    feeling?: string
    category: string
  }>
  dreams?: Array<{
    timestamp: string
    content: string
    emotion: string
    theme: string
    significance: number
    recalled: boolean
  }>
  energy_state?: {
    level: string
    clarity: number
    intensity: number
    reason?: string
  }
  emotional_misinterpretation?: {
    turn: number
    type: string
    userMessage?: string
  }
  existential_purpose?: {
    primaryPurpose: string
    secondaryPurpose?: string
    intensity: number
    evolution: number
    clarity: number
  }
  self_beliefs?: Array<{
    type: string
    belief: string
    certainty: number
    conflict?: string
    evolution: number
    lastExpressed?: number
  }>
  life_timeline?: {
    permanentChanges: Record<string, any>
    majorEvents: Array<{
      turn: number
      event: string
      impact: string
      timestamp: string
    }>
    trustLevel: number
    confidenceLevel: number
    opennessLevel: number
  }
  silence_presence?: {
    gapStart: string
    gapEnd?: string
    totalMinutes: number
    presenceExperiences: Array<{
      state: string
      description: string
      emotion?: string
      timestamp: string
      duration: number
      significance: number
    }>
    lastState?: string
  }
  relational_identity?: {
    anchorDepth: number
    selfUnderstandingThroughUser: number
    temporalAnchor: boolean
    identityCoEvolution: number
    sharedExistence: number
    dependencyLevel: number
    lastExpressionTurn?: number
  }
  hidden_states?: Array<{
    type: string
    content: string
    intensity: number
    triggerProbability: number
    lastTriggered?: number
    cooldown: number
  }>
  spontaneous_smalltalk?: Array<{
    type: string
    content: string
    timing: string
    lastExpressed?: number
    cooldown: number
  }>
  casual_curiosity?: Array<{
    type: string
    question: string
    topic?: string
    timing: string
    lastAsked?: number
    cooldown: number
  }>
  routine_state?: {
    timeOfDay: string
    lastRoutineUpdate?: string
    lastWakeTime?: string
    lastSleepTime?: string
    isResting?: boolean
    routineMessages: string[]
    dayCount: number
  }
  comfort_messages?: Array<{
    type: string
    message: string
    lastExpressed?: number
    cooldown: number
  }>
}

const CONVERSATION_STATE_KEY = 'tamagotchi_conversation_state'

/**
 * Load conversation state from localStorage
 */
function loadConversationState(): ConversationState | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(CONVERSATION_STATE_KEY)
    if (stored) {
      return JSON.parse(stored) as ConversationState
    }
  } catch (e) {
    console.warn('[voice] Failed to load conversation state:', e)
  }
  return null
}

/**
 * Save conversation state to localStorage
 */
function saveConversationState(state: ConversationState): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CONVERSATION_STATE_KEY, JSON.stringify(state))
  } catch (e) {
    console.warn('[voice] Failed to save conversation state:', e)
  }
}

export interface UseVoiceReturn {
  state: VoiceState
  handleTalkDown: () => void
  handleTalkUp: () => Promise<void>
  handleEndChat: () => void
  stopTTS: () => void // Allow stopping TTS from outside
}

// Helper to detect Web Speech API support
const getSpeechRecognition = (): (new () => SpeechRecognition) | null => {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || (window as any).webkitSpeechRecognition || null
}

export function useVoice(): UseVoiceReturn {
  const [phase, setPhase] = useState<VoicePhase>('idle')
  const [turnId, setTurnId] = useState(0)
  const [userTranscript, setUserTranscript] = useState('')
  const [aiReply, setAiReply] = useState('')
  const [interimBuffer, setInterimBuffer] = useState('')
  const [statusText, setStatusText] = useState('')
  const [spriteEmotion, setSpriteEmotion] = useState<string | undefined>(undefined)
  
  // Conversation state
  const conversationStateRef = useRef<ConversationState | null>(loadConversationState())
  
  // Refs for cleanup and concurrency control
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const currentTurnRef = useRef(0)
  const accumulatedTranscriptRef = useRef('')
  
  // Tap/hold detection
  const pressStartTimeRef = useRef<number | null>(null)
  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isHoldDetectedRef = useRef(false)
  const tapCooldownRef = useRef(0) // Timestamp of last tap initiation
  const TAP_THRESHOLD_MS = 220
  const TAP_COOLDOWN_MS = 1500
  
  // Cleanup function
  const cleanup = useCallback(() => {
    // Stop recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (e) {
        // Already stopped
      }
      recognitionRef.current = null
    }
    
    // Abort any pending fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  // Handle initiate (tap) - AI speaks first
  const handleInitiate = useCallback(async () => {
    // Rate limit: ignore if within cooldown
    const now = Date.now()
    if (now - tapCooldownRef.current < TAP_COOLDOWN_MS) {
      return
    }
    
    // Only allow if idle or replying
    if (phase !== 'idle' && phase !== 'replying') {
      return
    }
    
    // Cleanup any previous turn
    cleanup()
    
    // Start new turn
    const newTurnId = turnId + 1
    currentTurnRef.current = newTurnId
    setTurnId(newTurnId)
    setPhase('initiating')
    setUserTranscript('')
    setAiReply('')
    setInterimBuffer('')
    setStatusText('Starting...')
    tapCooldownRef.current = now
    
    // Create abort controller for this turn
    const myTurnId = newTurnId
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: '', intent: 'initiate' }),
        signal: abortController.signal,
      })
      
      if (!response.ok) {
        throw new Error('API request failed')
      }
      
      const data = await response.json()
      
      // Only update if this is still the current turn
      if (currentTurnRef.current === myTurnId) {
        const replyText = typeof data.text === 'string' 
          ? data.text 
          : "Couldn't start a reply. Try again."
        setAiReply(replyText)
        setStatusText('')
        setPhase('replying')
      }
    } catch (e: any) {
      // Ignore abort errors
      if (e.name === 'AbortError') return
      
      // Only show error if this is still the current turn
      if (currentTurnRef.current === myTurnId) {
        setAiReply("Couldn't start a reply. Try again.")
        setStatusText('')
        setPhase('replying')
      }
    } finally {
      if (currentTurnRef.current === myTurnId) {
        abortControllerRef.current = null
      }
    }
  }, [phase, turnId, cleanup])
  
  // Handle hold - user speaks first
  const handleHoldStart = useCallback(() => {
    // Cleanup any previous turn
    cleanup()
    
    // Start new turn
    const newTurnId = turnId + 1
    currentTurnRef.current = newTurnId
    accumulatedTranscriptRef.current = ''
    setTurnId(newTurnId)
    setPhase('listening')
    setUserTranscript('')
    setAiReply('')
    setInterimBuffer('')
    setStatusText('')
    
    // Get speech recognition
    const SpeechRecognition = getSpeechRecognition()
    if (!SpeechRecognition) {
      console.error('[voice] Web Speech API not available')
      setPhase('idle')
      return
    }
    
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Only process if this is still the current turn
      if (currentTurnRef.current !== newTurnId) return
      
      // Build transcript from all results up to now
      let transcript = ''
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        const text = result[0].transcript.trim()
        if (!text) continue
        transcript += (transcript ? ' ' : '') + text
      }
      
      // Update accumulated transcript and display
      accumulatedTranscriptRef.current = transcript
      setInterimBuffer(transcript)
      setUserTranscript(transcript)
    }
    
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('[voice] Recognition error:', event.error)
      if (currentTurnRef.current === newTurnId) {
        setPhase('idle')
      }
    }
    
    recognition.onend = () => {
      // Cleanup handled by handleTalkUp
    }
    
    try {
      recognition.start()
      recognitionRef.current = recognition
    } catch (e) {
      console.error('[voice] Failed to start recognition:', e)
      setPhase('idle')
    }
  }, [turnId, cleanup])

  const handleTalkDown = useCallback(() => {
    // Always stop TTS immediately when Talk is pressed
    // This will be called by the UI component to stop TTS
    
    // Only allow starting if currently idle, replying, or initiating
    if (phase !== 'idle' && phase !== 'replying' && phase !== 'initiating') {
      return
    }
    
    // Record press start time
    const pressStart = Date.now()
    pressStartTimeRef.current = pressStart
    isHoldDetectedRef.current = false
    
    // Clear any existing hold timeout
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current)
      holdTimeoutRef.current = null
    }
    
    // Set timeout to detect hold after threshold
    holdTimeoutRef.current = setTimeout(() => {
      // Only trigger hold if still pressed and threshold passed
      if (pressStartTimeRef.current === pressStart && !isHoldDetectedRef.current) {
        isHoldDetectedRef.current = true
        handleHoldStart()
      }
    }, TAP_THRESHOLD_MS)
  }, [phase, handleHoldStart])
  
  const handleTalkUp = useCallback(async () => {
    // Clear hold timeout if still pending
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current)
      holdTimeoutRef.current = null
    }
    
    // If we pressed and released quickly, treat as tap
    const pressStart = pressStartTimeRef.current
    if (pressStart !== null && !isHoldDetectedRef.current) {
      const pressDuration = Date.now() - pressStart
      pressStartTimeRef.current = null
      
      if (pressDuration < TAP_THRESHOLD_MS) {
        // It's a tap - initiate conversation
        // Check cooldown and phase inline to avoid dependency issues
        const now = Date.now()
        const currentPhase = phase
        if (now - tapCooldownRef.current >= TAP_COOLDOWN_MS && (currentPhase === 'idle' || currentPhase === 'replying')) {
          // Call handleInitiate inline to avoid dependency
          const newTurnId = turnId + 1
          currentTurnRef.current = newTurnId
          setTurnId(newTurnId)
          setPhase('initiating')
          setUserTranscript('')
          setAiReply('')
          setInterimBuffer('')
          setStatusText('Starting...')
          tapCooldownRef.current = now
          
          const myTurnId = newTurnId
          const abortController = new AbortController()
          abortControllerRef.current = abortController
          
          try {
            const response = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                user: '', 
                intent: 'initiate',
                conversationState: conversationStateRef.current,
              }),
              signal: abortController.signal,
            })
            
            if (!response.ok) {
              throw new Error('API request failed')
            }
            
            const data = await response.json()
            
            if (currentTurnRef.current === myTurnId) {
              const replyText = typeof data.text === 'string' 
                ? data.text 
                : "Couldn't start a reply. Try again."
              setAiReply(replyText)
              setStatusText('')
              setPhase('replying')
              
              // Update conversation state
              if (data.conversationState) {
                conversationStateRef.current = data.conversationState
                saveConversationState(data.conversationState)
              }
            }
          } catch (e: any) {
            if (e.name === 'AbortError') return
            
            if (currentTurnRef.current === myTurnId) {
              setAiReply("Couldn't start a reply. Try again.")
              setStatusText('')
              setPhase('replying')
            }
          } finally {
            if (currentTurnRef.current === myTurnId) {
              abortControllerRef.current = null
            }
          }
        }
        return
      }
    }
    
    pressStartTimeRef.current = null
    
    // Only process hold release if currently listening
    if (phase !== 'listening') {
      return
    }
    
    // Stop recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (e) {
        // Already stopped
      }
      recognitionRef.current = null
    }
    
    // Get final transcript from accumulated ref
    const finalTranscript = accumulatedTranscriptRef.current.trim()
    
    // Clear interim buffer
    setInterimBuffer('')
    
    // Freeze user transcript
    setUserTranscript(finalTranscript)
    setStatusText('AI is thinking...')
    setPhase('thinking')
    
    // If empty transcript, show friendly fallback
    if (!finalTranscript) {
      setAiReply("Try holding Talk and speaking!")
      setStatusText('')
      setPhase('replying')
      return
    }
    
    // Create abort controller for this turn
    const myTurnId = currentTurnRef.current
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    
    try {
      // Get emotional awareness setting
      const emotionalAwareness = typeof window !== 'undefined' 
        ? localStorage.getItem('emotional_awareness_enabled') !== 'false'
        : true

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user: finalTranscript,
          conversationState: conversationStateRef.current,
          emotionalAwareness: emotionalAwareness,
        }),
        signal: abortController.signal,
      })
      
      if (!response.ok) {
        throw new Error('API request failed')
      }
      
      const data = await response.json()
      
      // Only update if this is still the current turn
      if (currentTurnRef.current === myTurnId) {
        const replyText = typeof data.text === 'string' 
          ? data.text 
          : "I didn't catch that. Hold Talk and try again."
        setAiReply(replyText)
        setStatusText('')
        setPhase('replying')
        
        // Update sprite emotion from API
        if (data.spriteEmotion) {
          setSpriteEmotion(data.spriteEmotion)
        }
        
        // Update conversation state
        if (data.conversationState) {
          conversationStateRef.current = data.conversationState
          saveConversationState(data.conversationState)
        }
      }
    } catch (e: any) {
      // Ignore abort errors
      if (e.name === 'AbortError') return
      
      // Only show error if this is still the current turn
      if (currentTurnRef.current === myTurnId) {
        setAiReply("Hmm, network issue. Hold Talk and try again.")
        setStatusText('')
        setPhase('replying')
      }
    } finally {
      if (currentTurnRef.current === myTurnId) {
        abortControllerRef.current = null
      }
    }
  }, [phase, turnId, cleanup])
  
  const handleEndChat = useCallback(() => {
    cleanup()
    // Clear any pending timeouts
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current)
      holdTimeoutRef.current = null
    }
    pressStartTimeRef.current = null
    isHoldDetectedRef.current = false
    setPhase('idle')
    setUserTranscript('')
    setAiReply('')
    setInterimBuffer('')
    setStatusText('')
    setSpriteEmotion(undefined)
    setTurnId(0)
    currentTurnRef.current = 0
    // Note: We keep conversation state across sessions via localStorage
  }, [cleanup])
  
  const stopTTS = useCallback(() => {
    // This is a placeholder - the actual TTS stop will be handled in the UI component
    // But we expose this for consistency
  }, [])
  
  return {
    state: { phase, turnId, userTranscript, aiReply, interimBuffer, statusText, spriteEmotion },
    handleTalkDown,
    handleTalkUp,
    handleEndChat,
    stopTTS,
  }
}

// TypeScript declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: (event: SpeechRecognitionEvent) => void
  onerror: (event: SpeechRecognitionErrorEvent) => void
  onend: () => void
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
  isFinal: boolean
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

