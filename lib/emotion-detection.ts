/**
 * Emotion detection utilities
 * Detects user's emotional state from text cues and context
 */

export type EmotionLabel = 'neutral' | 'tired' | 'stressed' | 'down' | 'frustrated' | 'calm' | 'focused' | 'upbeat'

export interface EmotionState {
  label: EmotionLabel
  confidence: number // 0.0 to 1.0
  last_update: string // ISO timestamp
  signals: string[] // Last few signal reasons for debug
}

export interface EmotionContext {
  timeOfDay: number // Hour 0-23
  turnCount: number
  recentReplies: Array<{
    text: string
    replyType: 'open' | 'closed' | 'silence'
    timestamp: string
  }>
  recentFailures?: string[] // Recent mentions of failures/struggles
  recentWins?: string[] // Recent mentions of successes
}

/**
 * Detect emotion from user message and context
 */
export function detectEmotion(
  userMessage: string,
  replyType: 'open' | 'closed' | 'silence',
  context: EmotionContext
): { label: EmotionLabel; confidence: number; signals: string[] } {
  const signals: string[] = []
  let confidence = 0.0
  let label: EmotionLabel = 'neutral'

  const lowerMessage = userMessage.toLowerCase()
  const messageLength = userMessage.length

  // Skip silence/empty
  if (replyType === 'silence' || !userMessage.trim()) {
    return { label: 'neutral', confidence: 0.3, signals: ['empty_input'] }
  }

  // Exclamation frequency
  const exclamationCount = (userMessage.match(/!/g) || []).length
  const exclamationDensity = exclamationCount / Math.max(1, messageLength / 10)

  // Question marks
  const questionCount = (userMessage.match(/\?/g) || []).length

  // Negative words
  const negativeWords = /\b(no|not|don't|can't|won't|isn't|doesn't|didn't|nope|nah|nothing|none|idk|dunno|tired|exhausted|drained|stressed|anxious|worried|frustrated|upset|sad|down|bad|hard|difficult|struggle|problem|issue|fail|failed|sucks|terrible|awful)\b/i.test(userMessage)
  const positiveWords = /\b(yes|yeah|yep|sure|great|good|nice|awesome|amazing|happy|excited|love|enjoy|fun|wonderful|excellent|perfect)\b/i.test(userMessage)

  // Hedging words (uncertainty)
  const hedgeWords = /\b(maybe|perhaps|probably|kinda|sorta|ish|i guess|i think|i suppose|might|could)\b/i.test(userMessage)

  // Swearing (intensity signal)
  const swearing = /\b(damn|hell|shit|fuck|damn|ugh|argh)\b/i.test(userMessage)

  // First-person negatives
  const firstPersonNegative = /\b(i'm|i am|i feel|i've|i have)\s+(not|don't|can't|won't|tired|stressed|anxious|upset|sad|down|frustrated|exhausted)\b/i.test(userMessage)

  // Long day / workload signals
  const longDay = /\b(long day|long night|all day|all night|since morning|since (this|early) morning|grind|working|busy)\b/i.test(userMessage)
  const workloadSignals = /\b(deadline|due|overwhelmed|too much|so much|swamped|backlog|behind)\b/i.test(userMessage)

  // Positive interjections
  const positiveInterjections = /\b(woo|yay|haha|nice|awesome|great|yeah|yes)\b/i.test(userMessage)

  // Short/closed reply
  const isShortClosed = replyType === 'closed' || messageLength < 20

  // Time of day context
  const isLateNight = context.timeOfDay >= 22 || context.timeOfDay < 6
  const isMorning = context.timeOfDay >= 6 && context.timeOfDay < 10
  const isEvening = context.timeOfDay >= 17 && context.timeOfDay < 22

  // Repeated short answers (from context)
  const recentShortAnswers = context.recentReplies.filter(r => 
    r.replyType === 'closed' || r.text.length < 20
  ).length

  // Calculate emotion scores
  const scores: Record<EmotionLabel, number> = {
    neutral: 0.5, // Default
    tired: 0.0,
    stressed: 0.0,
    down: 0.0,
    frustrated: 0.0,
    calm: 0.0,
    focused: 0.0,
    upbeat: 0.0,
  }

  // TIRED signals
  if (isShortClosed && isLateNight && recentShortAnswers >= 2) {
    scores.tired += 0.6
    signals.push('short_reply_late_night')
  }
  if (/\b(tired|exhausted|drained|sleepy|nap|rest)\b/i.test(userMessage)) {
    scores.tired += 0.7
    signals.push('tired_mentioned')
  }
  if (longDay && (negativeWords || firstPersonNegative)) {
    scores.tired += 0.5
    signals.push('long_day_negative')
  }

  // STRESSED signals
  if (workloadSignals && (negativeWords || swearing)) {
    scores.stressed += 0.7
    signals.push('workload_negative')
  }
  if (/\b(deadline|due|overwhelmed|swamped|behind|rushed)\b/i.test(userMessage)) {
    scores.stressed += 0.6
    signals.push('stress_keywords')
  }
  if (exclamationDensity > 0.3 && negativeWords) {
    scores.stressed += 0.4
    signals.push('high_exclamation_negative')
  }

  // DOWN signals
  if (firstPersonNegative && /\b(down|sad|upset|low|feeling bad)\b/i.test(userMessage)) {
    scores.down += 0.7
    signals.push('explicit_down_feeling')
  }
  if (negativeWords && hedgeWords && !positiveWords) {
    scores.down += 0.5
    signals.push('negative_hedged')
  }
  if (isShortClosed && recentShortAnswers >= 3 && negativeWords) {
    scores.down += 0.4
    signals.push('multiple_short_negatives')
  }

  // FRUSTRATED signals
  if (swearing && negativeWords) {
    scores.frustrated += 0.6
    signals.push('swearing_negative')
  }
  if (/\b(frustrated|annoyed|irritated|pissed|mad)\b/i.test(userMessage)) {
    scores.frustrated += 0.7
    signals.push('frustrated_mentioned')
  }

  // CALM signals
  if (positiveWords && !exclamationDensity && messageLength > 30 && !swearing) {
    scores.calm += 0.5
    signals.push('positive_casual')
  }
  if (/\b(calm|relaxed|chill|peaceful|content)\b/i.test(userMessage)) {
    scores.calm += 0.6
    signals.push('calm_mentioned')
  }

  // FOCUSED signals
  if (questionCount > 0 && !hedgeWords && messageLength > 40) {
    scores.focused += 0.5
    signals.push('questions_focused')
  }
  if (/\b(focus|concentrate|work on|studying|grinding)\b/i.test(userMessage) && !negativeWords) {
    scores.focused += 0.6
    signals.push('focus_keywords')
  }

  // UPBEAT signals
  if (positiveInterjections && exclamationDensity > 0.2) {
    scores.upbeat += 0.6
    signals.push('positive_exclamation')
  }
  if (positiveWords && !negativeWords && !hedgeWords && messageLength > 20) {
    scores.upbeat += 0.5
    signals.push('positive_confident')
  }
  if (/\b(excited|happy|great|awesome|amazing|love|enjoy)\b/i.test(userMessage)) {
    scores.upbeat += 0.6
    signals.push('upbeat_keywords')
  }

  // Find highest scoring emotion
  let maxScore = 0
  let selectedLabel: EmotionLabel = 'neutral'

  for (const [emotion, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score
      selectedLabel = emotion as EmotionLabel
    }
  }

  // Calculate confidence
  // Higher if score is strong and signals are clear
  confidence = Math.min(1.0, maxScore * (1.0 + signals.length * 0.1))
  
  // Lower confidence if signals conflict or are weak
  if (maxScore < 0.4) {
    confidence = Math.max(0.3, confidence * 0.7)
    selectedLabel = 'neutral'
    signals.push('weak_signals')
  }

  // If multiple emotions are close, reduce confidence
  const sortedScores = Object.values(scores).sort((a, b) => b - a)
  if (sortedScores.length > 1 && sortedScores[0] - sortedScores[1] < 0.2) {
    confidence *= 0.8
    signals.push('conflicting_signals')
  }

  return {
    label: selectedLabel,
    confidence: Math.max(0.0, Math.min(1.0, confidence)),
    signals: signals.length > 0 ? signals : ['default_neutral'],
  }
}

/**
 * Smooth emotion changes with exponential moving average
 */
export function smoothEmotion(
  current: EmotionState,
  newDetection: { label: EmotionLabel; confidence: number; signals: string[] },
  alpha: number = 0.3 // Smoothing factor (0-1, lower = more smoothing)
): EmotionState {
  // If same label, increase confidence smoothly
  if (current.label === newDetection.label) {
    const smoothedConfidence = current.confidence * (1 - alpha) + newDetection.confidence * alpha
    return {
      label: current.label,
      confidence: smoothedConfidence,
      last_update: new Date().toISOString(),
      signals: newDetection.signals.slice(0, 3), // Keep last 3
    }
  }

  // If different label but low confidence, stay with current
  if (newDetection.confidence < 0.6) {
    return {
      ...current,
      confidence: current.confidence * 0.95, // Slight decay
    }
  }

  // Switch to new emotion if confidence is high enough
  if (newDetection.confidence >= 0.6) {
    return {
      label: newDetection.label,
      confidence: newDetection.confidence,
      last_update: new Date().toISOString(),
      signals: newDetection.signals.slice(0, 3),
    }
  }

  return current
}

/**
 * Get emotion-aware response instruction
 */
export function getEmotionInstruction(emotion: EmotionState, enabled: boolean): string {
  if (!enabled || emotion.confidence < 0.6) {
    return ''
  }

  const instructions: Record<EmotionLabel, string> = {
    neutral: '',
    tired: 'They sound tired. Maybe keep it light.',
    stressed: 'They seem stressed. Just respond to what they need. Consider offering something light or playful to help shift the mood - a quick joke, interesting fact, or "would you rather" question could help.',
    down: 'They seem down. Be supportive but not overbearing. Maybe offer something playful to help lighten the mood - a joke, riddle, or fun fact. Keep it natural and not forced.',
    frustrated: 'They seem frustrated. Keep it brief and helpful. You might try a light distraction like a quick joke or "would you rather" question if the moment feels right.',
    calm: 'They seem calm. Match their vibe.',
    focused: 'They seem focused. Keep it concise.',
    upbeat: 'They seem upbeat. Match their energy.',
  }

  return instructions[emotion.label] || ''
}

