/**
 * Relationship Depth Utilities
 * 
 * Functions for detecting inside jokes, personal reveals, and relationship milestones
 */

/**
 * Detect if a conversation contains an inside joke or shared reference
 * Returns null if no joke detected, or the joke description if found
 */
export function detectInsideJoke(
  userMessage: string,
  aiReply: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): string | null {
  if (!userMessage || !aiReply) return null
  
  const userLower = userMessage.toLowerCase()
  const aiLower = aiReply.toLowerCase()
  
  // Look for patterns that suggest inside jokes:
  // 1. References to previous conversations ("remember when...", "that thing we talked about")
  // 2. Shared humor (both messages contain similar playful language)
  // 3. Repeated phrases or references
  
  const jokeIndicators = [
    /\b(remember when|that time|like we said|our thing|inside joke|our joke)\b/i,
    /\b(haha|hehe|lol|that's so us|classic)\b/i,
    /\b(reference to|like that|same vibe|our bit)\b/i,
  ]
  
  const hasJokeIndicator = jokeIndicators.some(pattern => 
    pattern.test(userMessage) || pattern.test(aiReply)
  )
  
  if (!hasJokeIndicator) return null
  
  // Extract the joke description (simplified)
  // Look for quoted phrases or key phrases
  const quotedMatch = userMessage.match(/"([^"]+)"/) || aiReply.match(/"([^"]+)"/)
  if (quotedMatch) {
    return quotedMatch[1]
  }
  
  // Look for phrases after "remember when" or "that time"
  const rememberMatch = userMessage.match(/(?:remember when|that time)\s+(.+?)(?:\.|$)/i) ||
                       aiReply.match(/(?:remember when|that time)\s+(.+?)(?:\.|$)/i)
  if (rememberMatch && rememberMatch[1].length < 100) {
    return rememberMatch[1].trim()
  }
  
  // If we have conversation history, check for repeated phrases
  if (conversationHistory && conversationHistory.length >= 2) {
    const recentMessages = conversationHistory.slice(-4).map(m => m.content.toLowerCase())
    const commonPhrases = findCommonPhrases(recentMessages)
    if (commonPhrases.length > 0) {
      return commonPhrases[0] // Most common phrase
    }
  }
  
  return null
}

/**
 * Find common phrases across recent messages (simple implementation)
 */
function findCommonPhrases(messages: string[]): string[] {
  const phraseCount: Record<string, number> = {}
  
  // Extract 2-4 word phrases from messages
  messages.forEach(msg => {
    const words = msg.split(/\s+/).filter(w => w.length > 3)
    for (let i = 0; i < words.length - 1; i++) {
      const phrase = `${words[i]} ${words[i + 1]}`
      if (phrase.length > 10 && phrase.length < 50) {
        phraseCount[phrase] = (phraseCount[phrase] || 0) + 1
      }
    }
  })
  
  // Return phrases mentioned at least twice
  return Object.entries(phraseCount)
    .filter(([_, count]) => count >= 2)
    .sort(([_, a], [__, b]) => b - a)
    .slice(0, 3)
    .map(([phrase]) => phrase)
}

/**
 * Detect if user is sharing something personal (increment reveals count)
 * Returns true if it seems like a personal reveal
 */
export function detectPersonalReveal(userMessage: string): boolean {
  if (!userMessage) return false
  
  const lower = userMessage.toLowerCase()
  
  // Patterns that suggest personal sharing
  const personalIndicators = [
    /\b(i (feel|think|believe|hope|worry|fear|love|hate|am|was|used to be))\b/i,
    /\b(my (family|mom|dad|parents|sibling|friend|ex|past|secret|dream|goal))\b/i,
    /\b(i (never|always|sometimes) (tell|share|mention|talk about))\b/i,
    /\b(this is (personal|private|between us|just for you))\b/i,
    /\b(i (trust|know) you (enough|with this|to tell you))\b/i,
    /\b(i (haven't|have never) (told|shared|mentioned))\b/i,
  ]
  
  return personalIndicators.some(pattern => pattern.test(userMessage))
}

/**
 * Check if we should create a milestone based on conversation count
 */
export function shouldCreateMilestone(turnCount: number): { milestone: number; type: 'conversation_count' } | null {
  const milestones = [1, 10, 25, 50, 100, 250, 500, 1000]
  
  for (const milestone of milestones) {
    if (turnCount === milestone) {
      return { milestone, type: 'conversation_count' }
    }
  }
  
  return null
}

/**
 * Check if we should create an anniversary milestone
 */
export function shouldCreateAnniversary(daysSinceFirstConversation: number): { months: number } | null {
  const monthMilestones = [1, 3, 6, 12, 18, 24, 36] // 1 month, 3 months, 6 months, etc.
  
  for (const months of monthMilestones) {
    const daysThreshold = months * 30
    const tolerance = 3 // Within 3 days
    if (Math.abs(daysSinceFirstConversation - daysThreshold) <= tolerance) {
      return { months }
    }
  }
  
  return null
}

/**
 * Calculate days since a date
 */
export function daysSince(date: string | null): number {
  if (!date) return 0
  
  const now = new Date()
  const then = new Date(date)
  const diff = now.getTime() - then.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}












