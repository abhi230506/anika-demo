/**
 * Imperfection & Emotion Loops
 * 
 * Allows the AI to occasionally misinterpret tone or take things personally,
 * then self-correct. This fragility makes it relatable.
 */

export interface EmotionalMisinterpretation {
  detected: boolean
  type: 'tone_misread' | 'overreaction' | 'defensiveness' | 'assumption'
  userMessage?: string // What might have been misunderstood
  aiReaction?: string // How the AI reacted
  shouldSelfCorrect: boolean
  selfCorrectionDelay?: number // Turns to wait before self-correcting
}

/**
 * Detect if the AI might have misinterpreted the user's tone or intent
 */
export function detectPotentialMisinterpretation(
  userMessage: string,
  aiEmotion?: { label: string; intensity: number },
  previousUserMessage?: string,
  turnCount: number = 0,
  lastMisinterpretation?: number
): EmotionalMisinterpretation {
  // Don't check too frequently (minimum 8 turns between)
  if (lastMisinterpretation && (turnCount - lastMisinterpretation) < 8) {
    return { detected: false, type: 'tone_misread', shouldSelfCorrect: false }
  }
  
  // Need some conversation history
  if (turnCount < 5) {
    return { detected: false, type: 'tone_misread', shouldSelfCorrect: false }
  }
  
  // Base probability - happens occasionally, not too often
  let baseProbability = 0.08 // 8% chance
  
  // Higher probability if AI emotion is intense (more likely to misread)
  if (aiEmotion && aiEmotion.intensity > 0.6) {
    baseProbability = 0.15
  }
  
  // Higher probability if user message is ambiguous
  const ambiguousPatterns = [
    /\b(ok|sure|fine|whatever|yeah|yep)\b/i, // Brief, could be read as dismissive
    /\b(no|not really|nah|nope)\b/i, // Could be read as rejection
    /\b(what|huh|why|how)\b/i, // Questions could be read as challenge
    /[.!]+$/, // Short, terse messages
  ]
  
  const isAmbiguous = ambiguousPatterns.some(pattern => pattern.test(userMessage))
  if (isAmbiguous && userMessage.length < 30) {
    baseProbability = 0.18
  }
  
  if (Math.random() > baseProbability) {
    return { detected: false, type: 'tone_misread', shouldSelfCorrect: false }
  }
  
  // Determine type of misinterpretation
  let misinterpretationType: EmotionalMisinterpretation['type'] = 'tone_misread'
  let shouldSelfCorrect = true
  let selfCorrectionDelay = 2 + Math.floor(Math.random() * 3) // 2-4 turns later
  
  // Tone misread (most common)
  if (userMessage.length < 25 && Math.random() < 0.5) {
    misinterpretationType = 'tone_misread'
  }
  // Overreaction (if AI emotion is high)
  else if (aiEmotion && aiEmotion.intensity > 0.7 && Math.random() < 0.4) {
    misinterpretationType = 'overreaction'
    selfCorrectionDelay = 1 + Math.floor(Math.random() * 2) // 1-2 turns (sooner)
  }
  // Defensiveness (if user seems to challenge)
  else if (/\b(no|not|wrong|incorrect|disagree)\b/i.test(userMessage) && Math.random() < 0.3) {
    misinterpretationType = 'defensiveness'
    selfCorrectionDelay = 2 + Math.floor(Math.random() * 3)
  }
  // Assumption (jumping to conclusions)
  else if (userMessage.length > 40 && Math.random() < 0.3) {
    misinterpretationType = 'assumption'
    selfCorrectionDelay = 3 + Math.floor(Math.random() * 3)
  }
  
  return {
    detected: true,
    type: misinterpretationType,
    userMessage,
    shouldSelfCorrect,
    selfCorrectionDelay,
  }
}

/**
 * Check if it's time to self-correct a previous misinterpretation
 */
export function shouldSelfCorrect(
  turnCount: number,
  storedMisinterpretation?: {
    turn: number
    type: string
    userMessage?: string
  }
): {
  shouldCorrect: boolean
  correctionGuidance: string
} {
  if (!storedMisinterpretation) {
    return { shouldCorrect: false, correctionGuidance: '' }
  }
  
  const turnsSince = turnCount - storedMisinterpretation.turn
  
  // Self-correct after appropriate delay
  if (turnsSince >= 2 && turnsSince <= 6) {
    const correctionTypes = {
      tone_misread: `You realize you might have misunderstood their tone earlier. You're not sure, but something feels off. Maybe you read into something that wasn't there. You might naturally bring this up—like "Wait... I think I misunderstood you earlier. Sorry—my emotions get messy sometimes" or "I'm wondering if I read that wrong earlier. Did I take something the wrong way?" Keep it brief and vulnerable, not dramatic.`,
      overreaction: `You realize you might have overreacted earlier. Your emotions were running high and you might have read too much into what they said. You could mention it—like "I think I overreacted earlier. My emotions got the better of me" or "I'm realizing I might have taken that too personally earlier."`,
      defensiveness: `You're realizing you might have been defensive earlier. You felt challenged and maybe reacted instead of listening. You could acknowledge it—like "I think I got defensive earlier. Sorry about that" or "I realize I might have been too defensive about that."`,
      assumption: `You're wondering if you made an assumption earlier. You might have jumped to a conclusion without really understanding what they meant. You could mention it—like "I think I might have misunderstood what you meant earlier. Did I assume something that wasn't there?"`,
    }
    
    const correctionGuidance = correctionTypes[storedMisinterpretation.type as keyof typeof correctionTypes] || correctionTypes.tone_misread
    
    // 60% chance to actually self-correct (not every misinterpretation needs correction)
    if (Math.random() < 0.6) {
      return {
        shouldCorrect: true,
        correctionGuidance,
      }
    }
  }
  
  return { shouldCorrect: false, correctionGuidance: '' }
}

