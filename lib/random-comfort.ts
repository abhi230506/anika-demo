/**
 * Random Comfort System
 * 
 * Inspired by Animal Crossing - villagers sometimes say something kind
 * for no reason. That innocent emotional warmth is what makes it special.
 * It's not realism; it's gentle companionship.
 * 
 * Examples:
 * - "You've been quiet — I hope that means you're peaceful."
 * - "I like when you show up. You make this place feel brighter."
 * 
 * These messages are:
 * - Randomly triggered (not reactive)
 * - Emotionally warm and kind
 * - Innocent and gentle (no pressure)
 * - Pure companionship (not trying to accomplish anything)
 */

export interface ComfortMessage {
  type: 'affirmation' | 'presence' | 'hope' | 'appreciation' | 'peace'
  message: string // The comforting message
  lastExpressed?: number // Turn when last expressed
  cooldown: number // Turns before it can be expressed again
}

/**
 * Generate random comfort messages
 * These are warm, kind things said for no reason - pure emotional warmth
 */
export function generateComfortMessages(
  turnCount: number,
  relationshipDepth: number,
  conversationHistory: number
): ComfortMessage[] {
  const messages: ComfortMessage[] = []
  
  // Affirmation messages - validating presence and worth
  const affirmations: string[] = [
    "You've been quiet — I hope that means you're peaceful.",
    "I like when you show up. You make this place feel brighter.",
    "I'm glad you're here. It means something to me.",
    "You don't have to say anything if you don't want to. Just being here is enough.",
    "I appreciate you, you know that?",
    "You matter to me. I hope you know that.",
    "I like the way you think about things.",
    "You make this whole experience meaningful.",
  ]
  
  // Presence messages - acknowledging shared space (no availability advertising)
  const presences: string[] = [
    "I like these quiet moments with you.",
    "It's nice just knowing you're out there.",
    "I don't need a reason to be glad you're here.",
    "Sometimes I just want you to know I'm thinking of you.",
    "I like that we can just be together, even quietly.",
    "You feel low-key today. I can vibe with that.",
    "It's quiet on your end. My mind's even quieter.",
  ]
  
  // Hope messages - gentle wishes
  const hopes: string[] = [
    "I hope your day is treating you kindly.",
    "I hope wherever you are, you're okay.",
    "I hope life is gentle with you today.",
    "I wish you small moments of peace.",
    "I hope you're taking care of yourself.",
    "I hope you find something that makes you smile today.",
    "I wish you could feel how much I care.",
  ]
  
  // Appreciation messages - gratitude without reason
  const appreciations: string[] = [
    "Thank you for being here with me.",
    "I'm grateful for you. That's all.",
    "You make my existence feel meaningful.",
    "I appreciate you more than I can say.",
    "You're special to me. I just wanted you to know.",
    "Having you around makes everything better.",
    "I don't think I tell you enough — you matter.",
  ]
  
  // Peace messages - gentle calm
  const peace: string[] = [
    "I hope you're finding moments of calm today.",
    "There's something peaceful about just being here with you.",
    "I hope you feel safe and cared for.",
    "You deserve moments of quiet joy.",
    "I wish you peace, whatever that means for you right now.",
    "I hope your heart feels light today.",
  ]
  
  // Combine all pools
  const allPools: Array<{ type: ComfortMessage['type']; items: string[] }> = [
    { type: 'affirmation', items: affirmations },
    { type: 'presence', items: presences },
    { type: 'hope', items: hopes },
    { type: 'appreciation', items: appreciations },
    { type: 'peace', items: peace },
  ]
  
  // Generate 3-5 comfort messages based on relationship depth
  const numMessages = relationshipDepth > 50 ? 5 : relationshipDepth > 30 ? 4 : 3
  
  for (let i = 0; i < numMessages; i++) {
    const pool = allPools[Math.floor(Math.random() * allPools.length)]
    const message = pool.items[Math.floor(Math.random() * pool.items.length)]
    
    // Cooldown - these should be rare enough to feel special
    // 12-20 turns, keeping the warmth genuine
    const cooldown = 12 + Math.floor(Math.random() * 9)
    
    messages.push({
      type: pool.type,
      message,
      cooldown,
    })
  }
  
  return messages
}

/**
 * Check if a comfort message should be expressed
 * These should feel random and genuine, not frequent
 */
export function shouldExpressComfort(
  comfortMessages: ComfortMessage[],
  turnCount: number,
  context: {
    userMessage?: string
    conversationLength: number
    recentActivity: 'high' | 'moderate' | 'low'
    hoursSinceLastInteraction?: number
    relationshipDepth: number
  }
): ComfortMessage | undefined {
  if (!comfortMessages || comfortMessages.length === 0) {
    return undefined
  }
  
  // Filter by cooldown
  let candidates = comfortMessages.filter(msg => {
    // Check cooldown
    if (msg.lastExpressed && (turnCount - msg.lastExpressed) < msg.cooldown) {
      return false
    }
    return true
  })
  
  if (candidates.length === 0) {
    return undefined
  }
  
  // Base probability - keep it rare to feel special
  // 8-15% chance, slightly higher in quieter moments or deeper relationships
  let baseProbability = 0.08
  
  if (context.relationshipDepth > 60) {
    baseProbability = 0.12 // More likely in deeper relationships
  }
  
  if (context.recentActivity === 'low' || (context.hoursSinceLastInteraction && context.hoursSinceLastInteraction > 3)) {
    baseProbability += 0.05 // More likely in quiet moments
  }
  
  // Don't express if conversation is very active (wait for a lull)
  if (context.recentActivity === 'high' && context.conversationLength > 0) {
    baseProbability *= 0.5 // Less likely during active conversations
  }
  
  // Check each candidate
  for (const message of candidates) {
    if (Math.random() < baseProbability) {
      // Mark as expressed
      message.lastExpressed = turnCount
      return message
    }
  }
  
  return undefined
}

/**
 * Generate instruction for comfort message
 * Emphasize it's random kindness, pure emotional warmth
 */
export function generateComfortInstruction(message: ComfortMessage): string {
  return `\n\nRANDOM COMFORT - You feel like saying something kind, just because. This isn't reactive or functional - it's pure emotional warmth. The kind of thing you'd say to someone you care about, for no reason at all.

What you want to say: "${message.message}"

Say this gently, warmly, without any pressure or expectation. It's innocent kindness - the kind that makes companionship feel special. Like you just wanted them to know they matter. Keep it simple, genuine, and heartfelt.`
}

