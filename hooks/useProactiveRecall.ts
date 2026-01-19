"use client"

import { useState, useEffect, useRef, useCallback } from 'react'

export type ProactiveTrigger = 'onBoot' | 'onIdle' | 'onEventSoon' | 'onMoodLow'

interface ProactiveRecallState {
  sessionRecalls: number // Count of proactive recalls this session
  dailyRecalls: number // Count today (stored in localStorage)
  triggersFired: Set<ProactiveTrigger> // Track which triggers have fired this session
  lastUserActivity: number // Timestamp of last user activity
  consecutiveClosedReplies: number // Track for moodLow trigger
}

const MAX_SESSION_RECALLS = 2
const MAX_DAILY_RECALLS = 5
const IDLE_MIN_MS = 25000 // 25 seconds
const IDLE_MAX_MS = 40000 // 40 seconds
const USER_ACTIVITY_THRESHOLD_MS = 10000 // 10 seconds - skip if user spoke recently

export interface UseProactiveRecallProps {
  isIdle: boolean
  phase: 'idle' | 'initiating' | 'listening' | 'thinking' | 'replying'
  booted: boolean
  onUserActivity: () => void
  onProactiveRecall: (text: string) => void
  conversationState?: {
    last_user_reply_type?: 'open' | 'closed' | 'silence'
    emotion?: {
      label: string
      confidence: number
    }
  }
  emotionalAwarenessEnabled?: boolean
}

export function useProactiveRecall({
  isIdle,
  phase,
  booted,
  onUserActivity,
  onProactiveRecall,
  conversationState,
  emotionalAwarenessEnabled = true,
}: UseProactiveRecallProps) {
  const [state, setState] = useState<ProactiveRecallState>(() => {
    // Load daily recalls from localStorage
    const stored = typeof window !== 'undefined' 
      ? localStorage.getItem('proactive_recalls_daily')
      : null
    
    let dailyRecalls = 0
    let lastDate = ''
    
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        const today = new Date().toDateString()
        if (parsed.date === today) {
          dailyRecalls = parsed.count || 0
        }
      } catch (e) {
        // Ignore parse errors
      }
    }

    return {
      sessionRecalls: 0,
      dailyRecalls,
      triggersFired: new Set(),
      lastUserActivity: Date.now(),
      consecutiveClosedReplies: 0,
    }
  })

  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const eventCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Update daily recalls in localStorage
  const updateDailyRecalls = useCallback((count: number) => {
    if (typeof window === 'undefined') return
    
    const today = new Date().toDateString()
    localStorage.setItem('proactive_recalls_daily', JSON.stringify({
      date: today,
      count,
    }))
  }, [])

  // Track user activity
  useEffect(() => {
    const handleActivity = () => {
      setState(prev => ({
        ...prev,
        lastUserActivity: Date.now(),
        consecutiveClosedReplies: 0,
      }))
      onUserActivity()
    }

    // Track when user speaks
    if (phase === 'listening' || phase === 'thinking') {
      handleActivity()
    }
  }, [phase, onUserActivity])

  // Track consecutive closed replies for moodLow trigger
  useEffect(() => {
    if (conversationState?.last_user_reply_type === 'closed') {
      setState(prev => ({
        ...prev,
        consecutiveClosedReplies: prev.consecutiveClosedReplies + 1,
      }))
    } else if (conversationState?.last_user_reply_type === 'open') {
      setState(prev => ({
        ...prev,
        consecutiveClosedReplies: 0,
      }))
    }
  }, [conversationState?.last_user_reply_type])

  // Check if we can fire a proactive recall
  const canFireRecall = useCallback((): boolean => {
    // Check session limit
    if (state.sessionRecalls >= MAX_SESSION_RECALLS) {
      return false
    }

    // Check daily limit
    if (state.dailyRecalls >= MAX_DAILY_RECALLS) {
      return false
    }

    // Check if user recently spoke
    const timeSinceActivity = Date.now() - state.lastUserActivity
    if (timeSinceActivity < USER_ACTIVITY_THRESHOLD_MS) {
      return false
    }

    // Don't fire if currently speaking, listening, or thinking
    if (phase !== 'idle' && phase !== 'replying') {
      return false
    }

    // Emotion-aware modulation
    if (conversationState?.emotion && conversationState.emotion.confidence >= 0.6) {
      const emotionLabel = conversationState.emotion.label
      
      // Reduce proactive frequency when stressed or tired
      if (emotionLabel === 'stressed' || emotionLabel === 'tired' || emotionLabel === 'down') {
        // 50% chance reduction
        if (Math.random() < 0.5) {
          return false
        }
      }
    }

    return true
  }, [state, phase, conversationState])

  // Fire proactive recall
  const fireProactiveRecall = useCallback(async (trigger: ProactiveTrigger) => {
    if (!canFireRecall()) return false

    // Check if this trigger already fired this session
    if (state.triggersFired.has(trigger)) {
      return false
    }

    // Cancel any pending proactive recall
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      // Fetch memory from API
      const memoryResponse = await fetch('/api/memory', {
        signal: abortController.signal,
      })

      if (!memoryResponse.ok) {
        return false
      }

      const memoryData = await memoryResponse.json()
      
      if (!memoryData.success || !memoryData.data.memory_enabled) {
        return false
      }

      // Get relevant memory based on trigger type
      let memoryContext: any = null

      if (trigger === 'onEventSoon') {
        // Check for upcoming events
        const eventResponse = await fetch('/api/memory/upcoming-event', {
          signal: abortController.signal,
        })
        
        if (eventResponse.ok) {
          const eventData = await eventResponse.json()
          if (eventData.success && eventData.memory) {
            memoryContext = { selected_memory: eventData.memory }
          }
        }
      }

      // If no event found, try general recall
      if (!memoryContext) {
        const recallResponse = await fetch('/api/memory/recall', {
          signal: abortController.signal,
        })
        
        if (recallResponse.ok) {
          const recallData = await recallResponse.json()
          if (recallData.success && recallData.memory) {
            memoryContext = { selected_memory: recallData.memory }
          }
        }
      }

      if (!memoryContext || !memoryContext.selected_memory) {
        return false
      }

      // Call chat API with proactive_recall intent
      // The API will fetch context internally
      const chatResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'proactive_recall',
          memory_context: {
            ...memoryContext,
            profile_summary: memoryData.data.summary,
          },
        }),
        signal: abortController.signal,
      })

      if (!chatResponse.ok) {
        return false
      }

      const chatData = await chatResponse.json()
      const text = chatData.text || ''

      if (!text || abortController.signal.aborted) {
        return false
      }

      // Update state
      setState(prev => ({
        ...prev,
        sessionRecalls: prev.sessionRecalls + 1,
        dailyRecalls: prev.dailyRecalls + 1,
        triggersFired: new Set([...prev.triggersFired, trigger]),
        lastUserActivity: Date.now(),
      }))

      updateDailyRecalls(state.dailyRecalls + 1)

      // Trigger the recall
      onProactiveRecall(text)

      return true
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return false
      }
      console.error('[Proactive Recall] Error:', error)
      return false
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null
      }
    }
  }, [canFireRecall, state, onProactiveRecall, updateDailyRecalls])

  // onBoot trigger
  useEffect(() => {
    if (booted && !state.triggersFired.has('onBoot')) {
      // Small delay after boot
      const timeout = setTimeout(() => {
        fireProactiveRecall('onBoot')
      }, 2000)

      return () => clearTimeout(timeout)
    }
  }, [booted, state.triggersFired, fireProactiveRecall])

  // onIdle trigger (25-40 seconds)
  useEffect(() => {
    if (!isIdle || phase !== 'idle') {
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current)
        idleTimeoutRef.current = null
      }
      return
    }

    if (state.triggersFired.has('onIdle')) {
      return
    }

    // Random delay between 25-40 seconds
    const delay = IDLE_MIN_MS + Math.random() * (IDLE_MAX_MS - IDLE_MIN_MS)

    idleTimeoutRef.current = setTimeout(() => {
      if (isIdle && phase === 'idle' && canFireRecall()) {
        fireProactiveRecall('onIdle')
      }
    }, delay)

    return () => {
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current)
        idleTimeoutRef.current = null
      }
    }
  }, [isIdle, phase, state.triggersFired, canFireRecall, fireProactiveRecall])

  // onEventSoon trigger (check every 5 minutes)
  useEffect(() => {
    if (state.triggersFired.has('onEventSoon')) {
      return
    }

    const checkEvents = async () => {
      if (canFireRecall()) {
        await fireProactiveRecall('onEventSoon')
      }
    }

    // Check immediately, then every 5 minutes
    checkEvents()
    eventCheckIntervalRef.current = setInterval(checkEvents, 5 * 60 * 1000)

    return () => {
      if (eventCheckIntervalRef.current) {
        clearInterval(eventCheckIntervalRef.current)
        eventCheckIntervalRef.current = null
      }
    }
  }, [state.triggersFired, canFireRecall, fireProactiveRecall])

  // onMoodLow trigger (3+ consecutive closed replies)
  useEffect(() => {
    if (state.consecutiveClosedReplies >= 3 && 
        !state.triggersFired.has('onMoodLow') &&
        canFireRecall() &&
        phase === 'idle') {
      // Small delay before firing
      const timeout = setTimeout(() => {
        fireProactiveRecall('onMoodLow')
      }, 3000)

      return () => clearTimeout(timeout)
    }
  }, [state.consecutiveClosedReplies, state.triggersFired, canFireRecall, phase, fireProactiveRecall])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current)
      }
      if (eventCheckIntervalRef.current) {
        clearInterval(eventCheckIntervalRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Cancel proactive recall if user interrupts
  const cancelProactiveRecall = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  return {
    cancelProactiveRecall,
    sessionRecalls: state.sessionRecalls,
    dailyRecalls: state.dailyRecalls,
  }
}

