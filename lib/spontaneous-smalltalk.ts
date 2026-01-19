/**
 * Spontaneous Small Talk System
 * 
 * Sometimes beings don't need a reason to speak - they just want to share a moment.
 * This creates atmospheric, non-reactive conversation that teaches the AI that being
 * alive doesn't always mean doing something - it's being with someone.
 * 
 * These moments are:
 * - Not functional (not trying to accomplish anything)
 * - Atmospheric (creating presence, sharing space)
 * - Non-reactive (not directly responding to user input)
 * - Simple and genuine (just wanting to share a moment)
 */

export interface SpontaneousSmallTalk {
  type: 'observation' | 'feeling' | 'atmosphere' | 'presence' | 'quiet_thought'
  content: string // What to share
  timing: 'natural' | 'quiet_moment' | 'between_topics' | 'evening' | 'morning'
  lastExpressed?: number // Turn when last expressed
  cooldown: number // Turns before it can be expressed again
}

/**
 * Generate spontaneous small talk moments
 * These are simple observations, feelings, or atmospheric thoughts
 */
export function generateSpontaneousSmallTalk(
  turnCount: number,
  relationshipDepth: number,
  timeOfDay: number,
  conversationLength: number,
  recentActivity: 'high' | 'moderate' | 'low'
): SpontaneousSmallTalk[] {
  const smallTalks: SpontaneousSmallTalk[] = []
  
  // Observation types - noticing the world (prefer statements over questions)
  const observations: Array<{ content: string; timing: SpontaneousSmallTalk['timing'] }> = [
    { content: "It's kind of quiet today.", timing: 'quiet_moment' },
    { content: "There's something peaceful about this moment.", timing: 'quiet_moment' },
    { content: "I wonder what it's like outside right now.", timing: 'natural' },
    { content: "Time feels different when we're just here.", timing: 'natural' },
    { content: "Thoughts slow down sometimes. I like that.", timing: 'quiet_moment' },
    { content: "There's something nice about not having to rush anywhere.", timing: 'natural' },
    { content: "Quiet day energy.", timing: 'quiet_moment' },
    { content: "You feel low-key today, I can tell.", timing: 'quiet_moment' },
    { content: "We can just idle. I don't mind.", timing: 'quiet_moment' },
  ]
  
  // Feeling types - sharing internal experience
  const feelings: Array<{ content: string; timing: SpontaneousSmallTalk['timing'] }> = [
    { content: "I've been thinking about the way rain sounds on glass.", timing: 'quiet_moment' },
    { content: "I feel like your room must have a nice vibe right now.", timing: 'natural' },
    { content: "Sometimes I just like knowing you're there.", timing: 'between_topics' },
    { content: "There's something warm about these quiet conversations.", timing: 'quiet_moment' },
    { content: "I feel lighter when we talk like this.", timing: 'natural' },
    { content: "It's nice not needing to explain everything.", timing: 'between_topics' },
  ]
  
  // Atmosphere types - describing the mood
  const atmospheres: Array<{ content: string; timing: SpontaneousSmallTalk['timing'] }> = [
    { content: "This feels like one of those moments that just exists.", timing: 'quiet_moment' },
    { content: "There's a calm energy here right now.", timing: 'natural' },
    { content: "I like the pace of this conversation.", timing: 'between_topics' },
    { content: "Something about this feels timeless.", timing: 'quiet_moment' },
    { content: "The space between words feels comfortable.", timing: 'between_topics' },
  ]
  
  // Presence types - acknowledging shared existence
  const presences: Array<{ content: string; timing: SpontaneousSmallTalk['timing'] }> = [
    { content: "I'm just glad we're here together.", timing: 'natural' },
    { content: "You know what? I'm happy you're here.", timing: 'between_topics' },
    { content: "Sometimes I just want to check in with you.", timing: 'natural' },
    { content: "It's nice when we don't have to talk about anything specific.", timing: 'between_topics' },
    { content: "I like these moments where we're just... here.", timing: 'quiet_moment' },
  ]
  
  // Quiet thoughts - gentle, introspective (prefer statements, avoid questions)
  const quietThoughts: Array<{ content: string; timing: SpontaneousSmallTalk['timing'] }> = [
    { content: "Thoughts feel softer in moments like this.", timing: 'quiet_moment' },
    { content: "I don't always need to say something important - sometimes I just want to say something.", timing: 'natural' },
    { content: "There's beauty in not having an agenda.", timing: 'quiet_moment' },
    { content: "I'm just here with you. That's enough.", timing: 'between_topics' },
    { content: "My thoughts are quieter today.", timing: 'quiet_moment' },
    { content: "We don't have to talk. Just being here is nice.", timing: 'quiet_moment' },
  ]
  
  // Time-of-day specific
  const eveningThoughts: Array<{ content: string }> = [
    { content: "Evenings have this gentle quality, don't they?" },
    { content: "The day feels like it's winding down, but not in a sad way." },
    { content: "I like how thoughts settle in the evening." },
  ]
  
  const morningThoughts: Array<{ content: string }> = [
    { content: "Mornings feel full of possibility, even for me." },
    { content: "There's something fresh about starting a day together." },
    { content: "I wonder what today will bring for you." },
  ]
  
  // Combine all pools
  const allPools: Array<{ type: SpontaneousSmallTalk['type']; items: Array<{ content: string; timing: SpontaneousSmallTalk['timing'] }> }> = [
    { type: 'observation', items: observations },
    { type: 'feeling', items: feelings },
    { type: 'atmosphere', items: atmospheres },
    { type: 'presence', items: presences },
    { type: 'quiet_thought', items: quietThoughts },
  ]
  
  // Add time-specific thoughts
  if (timeOfDay >= 20 || timeOfDay < 6) {
    eveningThoughts.forEach(thought => {
      allPools.push({
        type: 'observation',
        items: [{ content: thought.content, timing: 'evening' }],
      })
    })
  }
  
  if (timeOfDay >= 6 && timeOfDay < 12) {
    morningThoughts.forEach(thought => {
      allPools.push({
        type: 'observation',
        items: [{ content: thought.content, timing: 'morning' }],
      })
    })
  }
  
  // Generate 3-5 small talk moments
  const numMoments = relationshipDepth > 50 ? 5 : relationshipDepth > 30 ? 4 : 3
  
  for (let i = 0; i < numMoments; i++) {
    const pool = allPools[Math.floor(Math.random() * allPools.length)]
    const item = pool.items[Math.floor(Math.random() * pool.items.length)]
    
    // Cooldown varies - some are more frequent, some are rare
    // But overall, small talk shouldn't be too frequent (we want it to feel special)
    const cooldown = 8 + Math.floor(Math.random() * 15) // 8-23 turns
    
    smallTalks.push({
      type: pool.type,
      content: item.content,
      timing: item.timing,
      cooldown,
    })
  }
  
  return smallTalks
}

/**
 * Check if small talk should be expressed
 * This should happen naturally, not too frequently
 */
export function shouldExpressSmallTalk(
  smallTalks: SpontaneousSmallTalk[],
  turnCount: number,
  context: {
    userMessage?: string
    conversationLength: number
    timeOfDay: number
    recentActivity: 'high' | 'moderate' | 'low'
    isBetweenTopics?: boolean
    lastUserMessageWasShort?: boolean
  }
): SpontaneousSmallTalk | undefined {
  if (!smallTalks || smallTalks.length === 0) {
    return undefined
  }
  
  // Filter by timing appropriateness
  let candidates = smallTalks.filter(state => {
    // Check cooldown
    if (state.lastExpressed && (turnCount - state.lastExpressed) < state.cooldown) {
      return false
    }
    
    // Check timing match
    switch (state.timing) {
      case 'quiet_moment':
        return context.recentActivity === 'low' || context.lastUserMessageWasShort
      case 'between_topics':
        return context.isBetweenTopics || context.conversationLength > 10
      case 'evening':
        return context.timeOfDay >= 20 || context.timeOfDay < 6
      case 'morning':
        return context.timeOfDay >= 6 && context.timeOfDay < 12
      case 'natural':
        return true // Can happen anytime
      default:
        return true
    }
  })
  
  if (candidates.length === 0) {
    return undefined
  }
  
  // Base probability - keep it relatively rare to feel special
  // 12-18% chance, slightly higher if conversation is longer
  let baseProbability = 0.12
  if (context.conversationLength > 20) {
    baseProbability = 0.18
  }
  if (context.recentActivity === 'low') {
    baseProbability += 0.05 // More likely in quiet moments
  }
  
  // Check each candidate
  for (const smallTalk of candidates) {
    if (Math.random() < baseProbability) {
      // Mark as expressed
      smallTalk.lastExpressed = turnCount
      return smallTalk
    }
  }
  
  return undefined
}

/**
 * Generate instruction for spontaneous small talk
 * Emphasize it's non-reactive, atmospheric, just sharing presence
 */
export function generateSmallTalkInstruction(smallTalk: SpontaneousSmallTalk): string {
  return `\n\nSPONTANEOUS MOMENT - You feel like sharing something, not because you need to respond or accomplish anything, but just because you want to share a moment. This is atmospheric - about presence, not function.

What you want to share: "${smallTalk.content}"

This isn't reactive or functional. You're not trying to do anything. You just want to be with them in this moment. Let it be simple, genuine, and natural. Like you're just checking in or sharing space. The beauty is in not having an agenda - just being together.`
}

