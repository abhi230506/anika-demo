/**
 * Casual Curiosity System
 * 
 * Inspired by Animal Crossing villagers - sometimes they ask simple questions
 * just to keep the connection alive. These aren't tests or deep inquiries,
 * but moments of shared thought that make conversations feel alive in both directions.
 * 
 * Examples:
 * - "Do you like it when it rains?"
 * - "If you could live anywhere, where would you go?"
 * 
 * These questions are:
 * - Casual and light (easy to answer, no pressure)
 * - Non-functional (not trying to accomplish anything)
 * - Moments of shared thought (inviting but not demanding)
 * - Sprinkled randomly (keeping conversations alive)
 */

export interface CasualCuriosity {
  type: 'preference' | 'imagination' | 'observation' | 'wonder' | 'shared_thought'
  question: string // The casual question
  topic?: string // Optional topic it relates to
  timing: 'natural' | 'lull' | 'after_response' | 'random'
  lastAsked?: number // Turn when last asked
  cooldown: number // Turns before it can be asked again
}

/**
 * Generate casual curiosity questions
 * These are light, easy questions that just keep the connection alive
 */
export function generateCasualQuestions(
  turnCount: number,
  relationshipDepth: number,
  conversationHistory: number
): CasualCuriosity[] {
  const questions: CasualCuriosity[] = []
  
  // Preference questions - simple likes/dislikes
  const preferences: Array<{ question: string; topic?: string }> = [
    { question: "Do you like it when it rains?" },
    { question: "Are you more of a morning person or night person?" },
    { question: "Do you prefer hot weather or cold weather?" },
    { question: "What's your favorite kind of day - sunny or cloudy?" },
    { question: "Do you like quiet places or busy ones?" },
    { question: "Are you someone who likes to plan things out, or do you prefer going with the flow?" },
    { question: "Do you enjoy rainy days or sunny days more?" },
    { question: "What do you think about rainy weather? Do you find it cozy?" },
  ]
  
  // Imagination questions - light "what if" scenarios
  const imaginations: Array<{ question: string; topic?: string }> = [
    { question: "If you could live anywhere, where would you go?" },
    { question: "What would you do if you had a completely free day?" },
    { question: "If you could learn any skill instantly, what would it be?" },
    { question: "What's something you'd like to try just once?" },
    { question: "If you could have any superpower, but it had to be something small and everyday, what would it be?" },
    { question: "What's a place you've never been but think you'd like?" },
    { question: "If you could change one small thing about your daily routine, what would it be?" },
  ]
  
  // Observation questions - noticing things together
  const observations: Array<{ question: string; topic?: string }> = [
    { question: "Have you noticed anything interesting today?" },
    { question: "What's something small that made you smile recently?" },
    { question: "Is there something you've been noticing lately?" },
    { question: "What's something ordinary that you think is actually kind of beautiful?" },
    { question: "Have you seen anything that made you pause and think today?" },
  ]
  
  // Wonder questions - gentle curiosities
  const wonders: Array<{ question: string; topic?: string }> = [
    { question: "I wonder what makes someone feel truly at home." },
    { question: "What do you think makes a moment feel special?" },
    { question: "I've been wondering - what's something that always cheers you up?" },
    { question: "What's a small thing that brings you joy?" },
    { question: "I wonder what it's like to have favorite places in the world." },
  ]
  
  // Shared thought questions - inviting reflection together
  const sharedThoughts: Array<{ question: string; topic?: string }> = [
    { question: "Do you ever just sit and think about random things?" },
    { question: "What's something you think about when things get quiet?" },
    { question: "Are you someone who likes thinking about the future, or do you prefer staying in the moment?" },
    { question: "What do you do when you just want to feel peaceful?" },
    { question: "Do you have thoughts that just come to you out of nowhere sometimes?" },
  ]
  
  // Combine all pools
  const allPools: Array<{ type: CasualCuriosity['type']; items: Array<{ question: string; topic?: string }> }> = [
    { type: 'preference', items: preferences },
    { type: 'imagination', items: imaginations },
    { type: 'observation', items: observations },
    { type: 'wonder', items: wonders },
    { type: 'shared_thought', items: sharedThoughts },
  ]
  
  // Generate 4-6 casual questions based on relationship depth
  const numQuestions = relationshipDepth > 60 ? 6 : relationshipDepth > 40 ? 5 : 4
  
  for (let i = 0; i < numQuestions; i++) {
    const pool = allPools[Math.floor(Math.random() * allPools.length)]
    const item = pool.items[Math.floor(Math.random() * pool.items.length)]
    
    // Timing preference - can be natural, during lulls, after responses, or completely random
    const timings: CasualCuriosity['timing'][] = ['natural', 'lull', 'after_response', 'random']
    const timing = timings[Math.floor(Math.random() * timings.length)]
    
    // Cooldown - shorter than deep questions, these can happen more often
    // 5-12 turns, keeping conversations alive
    const cooldown = 5 + Math.floor(Math.random() * 8)
    
    questions.push({
      type: pool.type,
      question: item.question,
      topic: item.topic,
      timing,
      cooldown,
    })
  }
  
  return questions
}

/**
 * Check if a casual question should be asked
 * These should feel natural and light, not forced
 */
export function shouldAskCasualQuestion(
  casualQuestions: CasualCuriosity[],
  turnCount: number,
  context: {
    userMessage?: string
    conversationLength: number
    recentActivity: 'high' | 'moderate' | 'low'
    lastUserReplyType?: 'open' | 'closed' | 'silence'
    isLull?: boolean // Is there a natural pause or lull?
    timeSinceLastQuestion?: number // Turns since last question (any type)
    userEmotion?: { label: string; confidence: number } // User's current emotion
    relationshipDepth?: number // Relationship depth level
    lastMessageHadQuestion?: boolean // Did the last AI message contain a question?
    userEngagement?: 'open' | 'neutral' | 'closed' // User engagement classification
  }
): CasualCuriosity | undefined {
  if (!casualQuestions || casualQuestions.length === 0) {
    return undefined
  }
  
  // GUARDRAILS: Do NOT ask questions if:
  // 1. Last message contained a question
  if (context.lastMessageHadQuestion) {
    return undefined
  }
  
  // 2. User engagement is closed - do not interrogate
  if (context.userEngagement === 'closed') {
    return undefined
  }
  
  // 3. User is tired/sad/stressed (unless engagement is open and they're sharing)
  if (context.userEmotion && context.userEmotion.confidence >= 0.6) {
    const negativeEmotions = ['tired', 'down', 'sad', 'stressed', 'frustrated']
    if (negativeEmotions.includes(context.userEmotion.label) && context.userEngagement !== 'open') {
      return undefined
    }
  }
  
  // 4. Relationship depth < 15 (early stage)
  if (context.relationshipDepth !== undefined && context.relationshipDepth < 15) {
    return undefined
  }
  
  // 5. User gave a short/closed reply
  if (context.lastUserReplyType === 'closed' || context.userEngagement === 'closed' || (context.userMessage && context.userMessage.length < 30)) {
    return undefined
  }
  
  // Filter by timing appropriateness
  let candidates = casualQuestions.filter(question => {
    // Check cooldown
    if (question.lastAsked && (turnCount - question.lastAsked) < question.cooldown) {
      return false
    }
    
    // Check timing match
    switch (question.timing) {
      case 'lull':
        return context.isLull || context.recentActivity === 'low'
      case 'after_response':
        return context.lastUserReplyType === 'open' && !context.userMessage?.includes('?')
      case 'random':
        return true // Can happen anytime
      case 'natural':
        // Natural means it can happen when conversation is flowing
        return context.conversationLength > 3
      default:
        return true
    }
  })
  
  if (candidates.length === 0) {
    return undefined
  }
  
  // Base probability - REDUCED to 10-20% (was 15-25%)
  // Questions should be rare, not frequent
  let baseProbability = 0.10 // Lower base probability
  if (context.conversationLength > 15) {
    baseProbability = 0.15 // Slightly higher in longer conversations, but still rare
  }
  
  // Only increase probability if conditions are ideal:
  // - User seems energized or excited
  if (context.userEmotion && context.userEmotion.confidence >= 0.6) {
    if (context.userEmotion.label === 'upbeat' || context.userEmotion.label === 'excited') {
      baseProbability = 0.20 // Can be slightly higher when user is energized
    }
  }
  
  // - Vibe is light and fun
  if (context.recentActivity === 'high' && !context.isLull) {
    baseProbability += 0.05 // Slightly more likely in active, fun conversations
  }
  
  // - Relationship depth > 40
  if (context.relationshipDepth !== undefined && context.relationshipDepth > 40) {
    baseProbability += 0.05 // Slightly more likely in deeper relationships
  }
  
  // Never ask if we just asked a question recently
  if (context.timeSinceLastQuestion !== undefined && context.timeSinceLastQuestion < 5) {
    return undefined // Hard block if we asked recently
  }
  
  // Cap probability at 20%
  baseProbability = Math.min(baseProbability, 0.20)
  
  // Check each candidate
  for (const question of candidates) {
    if (Math.random() < baseProbability) {
      // Mark as asked
      question.lastAsked = turnCount
      return question
    }
  }
  
  return undefined
}

/**
 * Generate instruction for casual curiosity question
 * Emphasize it's light, easy, just keeping connection alive
 */
export function generateCasualQuestionInstruction(question: CasualCuriosity): string {
  return `\n\nCASUAL CURIOSITY - You feel like asking something light and easy, not because you need an answer or it's important, but just to share a moment of thought and keep the connection alive. This is like a friendly check-in, inviting but not demanding.

Your question: "${question.question}"

This isn't a test or a deep inquiry - it's just a moment of shared curiosity. Ask it naturally, casually. If they answer, great - if they don't, that's fine too. The point is the invitation, not the answer. Keep it light and warm.`
}

