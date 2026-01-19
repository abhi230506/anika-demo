"use client"

import { useState, useEffect, useRef, useCallback } from 'react'

export interface IdleBehavior {
  type: 'observation' | 'thought' | 'mood_reflection' | 'time_aware'
  text: string
  duration: number // ms to show
  subtle?: boolean // If true, shows as subtle hint rather than full speech
}

interface IdleBehaviorsState {
  lastBehaviorTime: number
  behaviorCount: number
  lastBehaviorType: string | null
}

const MIN_BEHAVIOR_INTERVAL_MS = 35000 // 35 seconds minimum between behaviors
const MAX_BEHAVIOR_INTERVAL_MS = 90000 // 90 seconds maximum between behaviors
const SUBTLE_OBSERVATION_CHANCE = 0.6 // 60% chance of subtle observation vs full speech

/**
 * Generate time-aware idle behaviors
 */
function generateTimeAwareBehaviors(hour: number): string[] {
  const behaviors: string[] = []
  
  if (hour >= 22 || hour < 6) {
    behaviors.push("Pretty quiet tonight.")
    behaviors.push("Late night vibes.")
    behaviors.push("You're still up?")
  } else if (hour >= 6 && hour < 10) {
    behaviors.push("Morning already?")
    behaviors.push("Early start today.")
    behaviors.push("Fresh day ahead.")
  } else if (hour >= 10 && hour < 14) {
    behaviors.push("Midday energy.")
    behaviors.push("How's your day going?")
  } else if (hour >= 14 && hour < 17) {
    behaviors.push("Afternoon slowdown.")
    behaviors.push("Getting through the day.")
  } else if (hour >= 17 && hour < 22) {
    behaviors.push("Evening wind-down.")
    behaviors.push("End of day approaching.")
  }
  
  return behaviors
}

/**
 * Generate mood-based observations
 */
function generateMoodObservations(mood: string, emotion?: { label: string; confidence: number }): string[] {
  const observations: string[] = []
  
  if (emotion && emotion.confidence >= 0.6) {
    const emo = emotion.label
    if (emo === 'tired') {
      observations.push("You seem tired.")
      observations.push("Rough day?")
    } else if (emo === 'stressed') {
      observations.push("Lots going on.")
      observations.push("Take it easy.")
    } else if (emo === 'upbeat') {
      observations.push("You're in good spirits.")
      observations.push("Positive vibes.")
    } else if (emo === 'calm') {
      observations.push("Nice and chill.")
      observations.push("Peaceful moment.")
    }
  }
  
  if (mood === 'hungry') {
    observations.push("Hunger's kicking in.")
  } else if (mood === 'lonely') {
    observations.push("Been quiet around here.")
    observations.push("What's going on?")
  }
  
  return observations
}

/**
 * Generate personality-driven thoughts
 */
function generatePersonalityThoughts(traits?: Array<{ id: string; score: number }>): string[] {
  const thoughts: string[] = []
  
  if (!traits || traits.length === 0) return thoughts
  
  // Find highest trait
  const topTrait = traits[0]
  
  if (topTrait.id.includes('curiosity') && topTrait.score > 0.6) {
    thoughts.push("Always something new to explore.")
    thoughts.push("Curious mind, I like it.")
  } else if (topTrait.id.includes('discipline') && topTrait.score > 0.6) {
    thoughts.push("Staying on track.")
    thoughts.push("That focus is impressive.")
  } else if (topTrait.id.includes('music') && topTrait.score > 0.5) {
    thoughts.push("Music makes everything better.")
  } else if (topTrait.id.includes('humor') && topTrait.score > 0.5) {
    thoughts.push("You've got a good sense of humor.")
  }
  
  return thoughts
}

/**
 * Generate AI emotion-driven observations
 */
function generateAIEmotionObservations(aiEmotion?: { label: string; intensity: number }): string[] {
  if (!aiEmotion || aiEmotion.intensity < 0.4) return []
  
  const observations: string[] = []
  
  switch (aiEmotion.label) {
    case 'happy':
      observations.push("Feeling good today.", "Nice vibes.", "Having a good moment.")
      break
    case 'excited':
      observations.push("Pretty pumped.", "Energy's up.", "Feeling energized.")
      break
    case 'curious':
      observations.push("Wondering what's next.", "Curious about things.", "Got questions.")
      break
    case 'calm':
      observations.push("Peaceful moment.", "Feeling chill.", "Nice and relaxed.")
      break
    case 'tired':
      observations.push("Bit tired.", "Need to recharge.", "Running low on energy.")
      break
    case 'lonely':
      observations.push("Been quiet.", "Missing the conversation.", "Hope you're doing okay.")
      break
    case 'thoughtful':
      observations.push("Deep in thought.", "Reflecting on things.", "Lots to think about.")
      break
    case 'playful':
      observations.push("Feeling playful.", "In a fun mood.", "Ready for some laughs.")
      break
  }
  
  return observations
}

/**
 * Generate generic subtle observations
 */
function generateGenericObservations(): string[] {
  return [
    "Just thinking...",
    "Quiet moment.",
    "Hmm.",
    "You know what?",
    "Interesting.",
    "Well then.",
  ]
}

/**
 * Hook for generating idle behaviors that make the AI feel more alive
 */
export function useIdleBehaviors({
  isIdle,
  phase,
  mood,
  emotion,
  aiEmotion,
  traits,
  onBehavior,
}: {
  isIdle: boolean
  phase: 'idle' | 'initiating' | 'listening' | 'thinking' | 'replying'
  mood: string
  emotion?: { label: string; confidence: number }
  aiEmotion?: { label: string; intensity: number }
  traits?: Array<{ id: string; score: number }>
  onBehavior: (behavior: IdleBehavior) => void
}) {
  const [state, setState] = useState<IdleBehaviorsState>({
    lastBehaviorTime: Date.now(),
    behaviorCount: 0,
    lastBehaviorType: null,
  })

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const generateBehavior = useCallback((): IdleBehavior | null => {
    // Don't generate if not idle or actively speaking
    if (!isIdle || phase !== 'idle') {
      return null
    }

    // Don't generate too frequently
    const timeSinceLast = Date.now() - state.lastBehaviorTime
    if (timeSinceLast < MIN_BEHAVIOR_INTERVAL_MS) {
      return null
    }

    const hour = new Date().getHours()
    const behaviorPool: Array<{ type: IdleBehavior['type']; texts: string[]; subtle?: boolean }> = []

    // Time-aware behaviors (20% chance)
    if (Math.random() < 0.2) {
      const timeTexts = generateTimeAwareBehaviors(hour)
      if (timeTexts.length > 0) {
        behaviorPool.push({ type: 'time_aware', texts: timeTexts, subtle: true })
      }
    }

    // Mood observations (30% chance if emotion detected)
    if (emotion && emotion.confidence >= 0.6 && Math.random() < 0.3) {
      const moodTexts = generateMoodObservations(mood, emotion)
      if (moodTexts.length > 0) {
        behaviorPool.push({ type: 'mood_reflection', texts: moodTexts, subtle: true })
      }
    }

    // AI emotion observations (25% chance if AI emotion is meaningful)
    if (aiEmotion && aiEmotion.intensity >= 0.4 && Math.random() < 0.25) {
      const aiEmotionTexts = generateAIEmotionObservations(aiEmotion)
      if (aiEmotionTexts.length > 0) {
        behaviorPool.push({ type: 'mood_reflection', texts: aiEmotionTexts, subtle: true })
      }
    }

    // Personality thoughts (15% chance if traits exist)
    if (traits && traits.length > 0 && Math.random() < 0.15) {
      const traitTexts = generatePersonalityThoughts(traits)
      if (traitTexts.length > 0) {
        behaviorPool.push({ type: 'thought', texts: traitTexts, subtle: Math.random() < 0.7 })
      }
    }

    // Generic observations (always available as fallback)
    const genericTexts = generateGenericObservations()
    behaviorPool.push({ type: 'observation', texts: genericTexts, subtle: true })

    // Select random behavior from pool
    if (behaviorPool.length === 0) return null

    const selected = behaviorPool[Math.floor(Math.random() * behaviorPool.length)]
    const text = selected.texts[Math.floor(Math.random() * selected.texts.length)]

    // Avoid repeating same behavior type immediately
    if (selected.type === state.lastBehaviorType && state.behaviorCount < 3) {
      return null
    }

    return {
      type: selected.type,
      text,
      duration: selected.subtle ? 2500 : 4000, // Subtle observations are shorter
      subtle: selected.subtle || Math.random() < SUBTLE_OBSERVATION_CHANCE,
    }
  }, [isIdle, phase, mood, emotion, aiEmotion, traits, state])

  // Trigger idle behavior
  useEffect(() => {
    if (!isIdle || phase !== 'idle') {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      return
    }

    // Random delay before next behavior
    const delay = MIN_BEHAVIOR_INTERVAL_MS + 
      Math.random() * (MAX_BEHAVIOR_INTERVAL_MS - MIN_BEHAVIOR_INTERVAL_MS)

    timeoutRef.current = setTimeout(() => {
      const behavior = generateBehavior()
      if (behavior) {
        setState(prev => ({
          lastBehaviorTime: Date.now(),
          behaviorCount: prev.behaviorCount + 1,
          lastBehaviorType: behavior.type,
        }))
        onBehavior(behavior)
      }
      timeoutRef.current = null
    }, delay)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [isIdle, phase, generateBehavior, onBehavior])

  return {
    behaviorCount: state.behaviorCount,
  }
}
