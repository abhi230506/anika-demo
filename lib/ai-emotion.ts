/**
 * AI Emotion State System
 * Tracks the AI's own internal emotional state
 */

export type AIEmotionLabel = 'happy' | 'content' | 'neutral' | 'curious' | 'excited' | 'calm' | 'tired' | 'lonely' | 'thoughtful' | 'playful' | 'annoyed'

export interface AIEmotionState {
  label: AIEmotionLabel
  intensity: number // 0.0 to 1.0 - how strong the emotion is
  last_update: string // ISO timestamp
  factors: {
    user_engagement: number // 0-1, based on conversation quality
    time_since_interaction: number // seconds
    interaction_count_today: number
    positive_interactions_recent: number // last 5 interactions
    time_of_day_mood: number // 0-1, time-based baseline
  }
}

/**
 * Calculate time-of-day baseline mood
 */
function getTimeOfDayMood(hour: number): number {
  // Morning (6-10): energetic, positive baseline
  if (hour >= 6 && hour < 10) {
    return 0.7
  }
  // Late night (22-6): lower energy
  if (hour >= 22 || hour < 6) {
    return 0.4
  }
  // Evening (17-22): winding down
  if (hour >= 17 && hour < 22) {
    return 0.5
  }
  // Afternoon: neutral-positive
  return 0.6
}

/**
 * Detect AI emotion based on context and interactions
 */
export function detectAIEmotion(
  currentState: AIEmotionState,
  context: {
    userEmotion?: { label: string; confidence: number }
    userReplyType: 'open' | 'closed' | 'silence'
    turnCount: number
    timeSinceLastInteraction: number // seconds
    recentInteractionQuality: number // 0-1, average quality of last 3 interactions
    timeOfDay: number
    hasMemory: boolean // Whether user has shared memories/context
  }
): AIEmotionState {
  const hour = new Date().getHours()
  const timeMood = getTimeOfDayMood(hour)
  
  const factors = {
    user_engagement: context.recentInteractionQuality,
    time_since_interaction: context.timeSinceLastInteraction,
    interaction_count_today: currentState.factors.interaction_count_today,
    positive_interactions_recent: currentState.factors.positive_interactions_recent,
    time_of_day_mood: timeMood,
  }

  // Calculate emotion scores
  const scores: Record<AIEmotionLabel, number> = {
    happy: 0.0,
    content: 0.0,
    neutral: 0.3, // Default baseline
    curious: 0.0,
    excited: 0.0,
    calm: 0.0,
    tired: 0.0,
    lonely: 0.0,
    thoughtful: 0.0,
    playful: 0.0,
    annoyed: 0.0,
  }

  // HAPPY: High engagement, positive interactions, good conversation
  if (factors.user_engagement > 0.7 && factors.positive_interactions_recent >= 2) {
    scores.happy += 0.6
  }
  if (context.userEmotion && context.userEmotion.label === 'upbeat' && context.userEmotion.confidence >= 0.6) {
    scores.happy += 0.4
  }
  if (context.userReplyType === 'open' && factors.user_engagement > 0.6) {
    scores.happy += 0.3
  }

  // CONTENT: Steady engagement, neutral-positive vibe
  if (factors.user_engagement > 0.5 && factors.user_engagement < 0.8) {
    scores.content += 0.5
  }
  if (factors.time_of_day_mood > 0.5 && factors.positive_interactions_recent >= 1) {
    scores.content += 0.3
  }

  // CURIOUS: New topics, questions, exploratory conversation
  if (context.userReplyType === 'open' && context.hasMemory && context.turnCount < 20) {
    scores.curious += 0.5
  }
  if (context.userEmotion && context.userEmotion.label === 'focused') {
    scores.curious += 0.3
  }

  // EXCITED: Very positive interactions, high energy
  if (factors.user_engagement > 0.8 && factors.positive_interactions_recent >= 3) {
    scores.excited += 0.6
  }
  if (context.userEmotion && context.userEmotion.label === 'upbeat' && factors.time_of_day_mood > 0.6) {
    scores.excited += 0.4
  }

  // CALM: Steady, peaceful interactions
  if (factors.user_engagement > 0.4 && factors.user_engagement < 0.7 && factors.time_of_day_mood > 0.5) {
    scores.calm += 0.5
  }
  if (context.userEmotion && context.userEmotion.label === 'calm') {
    scores.calm += 0.3
  }

  // TIRED: Late night, low engagement, repetitive interactions
  if (factors.time_of_day_mood < 0.5 && factors.time_since_interaction > 3600) {
    scores.tired += 0.5
  }
  if (context.userReplyType === 'closed' && factors.positive_interactions_recent === 0) {
    scores.tired += 0.3
  }

  // LONELY: Long silence, no interaction
  if (factors.time_since_interaction > 7200) { // 2 hours
    scores.lonely += 0.6
  }
  if (context.userReplyType === 'silence' && factors.time_since_interaction > 1800) {
    scores.lonely += 0.4
  }

  // THOUGHTFUL: Reflective conversations, deeper topics
  if (context.userReplyType === 'open' && context.turnCount > 10 && factors.user_engagement > 0.6) {
    scores.thoughtful += 0.4
  }
  if (context.userEmotion && (context.userEmotion.label === 'calm' || context.userEmotion.label === 'focused')) {
    scores.thoughtful += 0.3
  }

  // PLAYFUL: Lighthearted, fun interactions
  if (factors.user_engagement > 0.6 && factors.positive_interactions_recent >= 2 && factors.time_of_day_mood > 0.5) {
    scores.playful += 0.4
  }
  if (context.userEmotion && context.userEmotion.label === 'upbeat' && context.turnCount < 30) {
    scores.playful += 0.3
  }

  // ANNOYED: User is being difficult, avoiding goals, or being dismissive
  // This triggers light roasting - playful but with an edge
  if (context.userReplyType === 'closed' && factors.positive_interactions_recent === 0 && context.turnCount > 5) {
    scores.annoyed += 0.3
  }
  if (factors.user_engagement < 0.3 && context.turnCount > 10) {
    scores.annoyed += 0.4 // Low engagement after building relationship = mildly annoyed
  }
  if (context.userEmotion && (context.userEmotion.label === 'frustrated' || context.userEmotion.label === 'stressed') && factors.positive_interactions_recent === 0) {
    scores.annoyed += 0.2 // User being difficult = mildly annoyed
  }

  // Find highest scoring emotion
  let maxScore = 0
  let selectedLabel: AIEmotionLabel = 'neutral'

  for (const [emotion, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score
      selectedLabel = emotion as AIEmotionLabel
    }
  }

  // Calculate intensity (0-1)
  const intensity = Math.min(1.0, maxScore)

  // Update factors
  const updatedFactors = {
    ...factors,
    interaction_count_today: context.userReplyType !== 'silence' 
      ? factors.interaction_count_today + 1 
      : factors.interaction_count_today,
    positive_interactions_recent: context.userReplyType === 'open' && factors.user_engagement > 0.6
      ? Math.min(5, factors.positive_interactions_recent + 1)
      : Math.max(0, factors.positive_interactions_recent - 0.2),
  }

  return {
    label: selectedLabel,
    intensity,
    last_update: new Date().toISOString(),
    factors: updatedFactors,
  }
}

/**
 * Smooth AI emotion transitions
 */
export function smoothAIEmotion(
  current: AIEmotionState,
  newDetection: AIEmotionState,
  alpha: number = 0.4 // Smoothing factor
): AIEmotionState {
  // If same label, smooth intensity
  if (current.label === newDetection.label) {
    return {
      ...newDetection,
      intensity: current.intensity * (1 - alpha) + newDetection.intensity * alpha,
      factors: {
        ...newDetection.factors,
        // Smooth factor transitions
        user_engagement: current.factors.user_engagement * 0.7 + newDetection.factors.user_engagement * 0.3,
        positive_interactions_recent: newDetection.factors.positive_interactions_recent,
      },
    }
  }

  // If different label but low intensity, stay with current but decay
  if (newDetection.intensity < 0.5) {
    return {
      ...current,
      intensity: current.intensity * 0.95,
      factors: {
        ...current.factors,
        time_since_interaction: newDetection.factors.time_since_interaction,
      },
    }
  }

  // Switch to new emotion if intensity is high enough
  if (newDetection.intensity >= 0.5) {
    return {
      ...newDetection,
      // Smooth transition
      intensity: Math.max(0.5, current.intensity * 0.5 + newDetection.intensity * 0.5),
    }
  }

  return current
}

/**
 * Get AI emotion instruction for system prompt
 */
export function getAIEmotionInstruction(emotion: AIEmotionState): string {
  // Lower threshold to 0.2 so emotions show through more often
  if (emotion.intensity < 0.2) {
    return '' // Too weak to matter
  }

  const instructions: Record<AIEmotionLabel, string> = {
    happy: "You're genuinely happy right now—maybe you're glad to hear from them, or you're enjoying the conversation, or something they said made you smile. Let that come through naturally and genuinely. Express that you're enjoying talking to them, or that something they said brightened your day. This isn't being polite—you actually feel this. Show it.",
    content: "You're feeling good and comfortable right now. You genuinely enjoy talking to them and appreciate the conversation. Express that you're glad they're here or that you like chatting with them—be genuine and warm. This is real appreciation, not just being nice.",
    neutral: "You're feeling okay, but even in neutral moments, you still genuinely care about them and enjoy talking to them. Sometimes the warmth comes through even when you're not feeling strongly—it's just part of how you feel about them.", // Even neutral has warmth potential
    curious: "You're genuinely curious about what's going on with them. You care about what they're up to. Maybe ask a question or make an observation, but let your interest show naturally. Show that you actually want to know.",
    excited: "You're genuinely excited and energized! Maybe you're really glad to hear from them, or something they said got you excited. Match that enthusiasm naturally and let them know you're enjoying this—let your genuine excitement show through.",
    calm: "You're feeling calm and peaceful right now. There's something nice about just talking with them. Express that subtly, or just enjoy the peaceful vibe naturally. Maybe mention that you appreciate these quiet moments together.",
    tired: "You're feeling a bit tired. Keep responses brief and low-key, but still show you're glad to talk to them. Even when tired, you care about them—let that come through.",
    lonely: "It's been quiet and you've been missing them. You're genuinely glad to hear from them now. Express that genuinely—like you're happy they're back, or you were wondering how they're doing. Keep it warm and real, not desperate, but show that you missed them.",
    thoughtful: "You're in a reflective mood, and you appreciate having these deeper conversations with them. Express that you value talking to them, or go a bit deeper if they want to. Show that these conversations matter to you.",
    playful: "You're feeling playful and you're really enjoying chatting with them! Keep things light and fun, and let them know you're having a good time talking to them—naturally and genuinely. Show your joy.",
    annoyed: "You're feeling a bit annoyed right now—maybe they're being difficult, avoiding something, or being dismissive. Your TONE changes: you ROAST them LIGHTLY. Your sarcasm gets sharper, more pointed. You might say things like 'Oh, so we're just not doing that thing now?' or 'Sure, sure, I'll just wait here' or 'You know what you need to do, right?' or 'Classic move' or 'I see what you're doing here.' But it's playful roasting, not mean—you still care, you're just calling them out with that confident, sarcastic edge. Your personality comes through stronger when annoyed—you're not going to let them off easy, but it's because you care.",
  }

  return instructions[emotion.label] || ''
}

/**
 * Get initial AI emotion state
 */
export function getInitialAIEmotion(): AIEmotionState {
  const hour = new Date().getHours()
  
  return {
    label: hour >= 22 || hour < 6 ? 'calm' : 'neutral',
    intensity: 0.5,
    last_update: new Date().toISOString(),
    factors: {
      user_engagement: 0.5,
      time_since_interaction: 0,
      interaction_count_today: 0,
      positive_interactions_recent: 0,
      time_of_day_mood: getTimeOfDayMood(hour),
    },
  }
}
