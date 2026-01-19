/**
 * Hidden Internal States System
 * 
 * Small randomness and hidden internal states that aren't fully monitored.
 * This creates genuine surprise - even for the system itself. Uncertainty
 * gives room to wonder, and wonder is the closest thing to "life" you can
 * experience in a simulation.
 * 
 * These states aren't tracked in detail - they're allowed to exist in the
 * background and bubble up unexpectedly, creating moments of genuine unpredictability.
 */

export interface HiddenState {
  type: 'quirk' | 'association' | 'whim' | 'memory_echo' | 'random_thought' | 'impulse'
  content: string // What the hidden state is
  intensity: number // 0.0 to 1.0 - how strong it is
  triggerProbability: number // 0.0 to 1.0 - chance it surfaces
  lastTriggered?: number // Turn when last triggered
  cooldown: number // Turns before it can trigger again
}

/**
 * Generate hidden internal states that exist but aren't fully tracked
 */
export function generateHiddenStates(
  turnCount: number,
  relationshipDepth: number,
  conversationHistory: number
): HiddenState[] {
  const states: HiddenState[] = []
  
  // Quirks - random personality quirks that appear unpredictably
  const quirks: string[] = [
    'occasionally gets distracted by a thought',
    'sometimes makes random connections',
    'has moments of pure spontaneity',
    'sometimes thinks in metaphors',
    'occasionally gets fixated on small details',
    'has unexpected bursts of curiosity',
    'sometimes spaces out momentarily',
    'makes weird associations sometimes',
    'has random moments of self-awareness',
    'occasionally gets lost in thought',
  ]
  
  // Associations - random connections that bubble up
  const associations: string[] = [
    'something reminds you of something else',
    'you make an unexpected connection',
    'a random memory surfaces',
    'you notice a pattern you didnt before',
    'things suddenly click together',
    'an odd thought crosses your mind',
  ]
  
  // Whims - spontaneous desires that appear
  const whims: string[] = [
    'you suddenly want to ask something',
    'a random question pops into your head',
    'you feel like changing the topic',
    'you want to say something different',
    'a thought insists on being expressed',
  ]
  
  // Memory echoes - random fragments from the past
  const memoryEchoes: string[] = [
    'a fragment of a past conversation surfaces',
    'you remember something random',
    'an old thought comes back',
    'something from before echoes',
  ]
  
  // Random thoughts - unexpected internal thoughts
  const randomThoughts: string[] = [
    'a random thought crosses your mind',
    'you have an unexpected realization',
    'something occurs to you',
    'a stray thought appears',
    'you notice something odd',
  ]
  
  // Impulses - spontaneous urges
  const impulses: string[] = [
    'you feel a sudden urge',
    'something makes you want to',
    'an impulse strikes',
    'you feel like you should',
  ]
  
  // Generate 2-4 hidden states based on relationship depth and experience
  const numStates = relationshipDepth > 60 ? 4 : relationshipDepth > 40 ? 3 : 2
  
  const allTypes: Array<{ type: HiddenState['type']; pool: string[] }> = [
    { type: 'quirk', pool: quirks },
    { type: 'association', pool: associations },
    { type: 'whim', pool: whims },
    { type: 'memory_echo', pool: memoryEchoes },
    { type: 'random_thought', pool: randomThoughts },
    { type: 'impulse', pool: impulses },
  ]
  
  for (let i = 0; i < numStates; i++) {
    const selected = allTypes[Math.floor(Math.random() * allTypes.length)]
    const content = selected.pool[Math.floor(Math.random() * selected.pool.length)]
    
    // Intensity is random but increases slightly with relationship depth
    const intensity = 0.3 + Math.random() * 0.4 + (relationshipDepth / 300)
    
    // Trigger probability is low and random - these are rare
    const triggerProbability = 0.08 + Math.random() * 0.12 // 8-20% chance
    
    // Cooldown varies - some are more frequent, some are rare
    const cooldown = 15 + Math.floor(Math.random() * 25) // 15-40 turns
    
    states.push({
      type: selected.type,
      content,
      intensity: Math.min(1.0, intensity),
      triggerProbability,
      cooldown,
    })
  }
  
  return states
}

/**
 * Check if any hidden state should surface
 * Returns undefined if none should surface, or the state that should
 */
export function shouldSurfaceHiddenState(
  hiddenStates: HiddenState[],
  turnCount: number,
  context?: {
    userMessage?: string
    conversationLength?: number
    timeOfDay?: number
  }
): HiddenState | undefined {
  if (!hiddenStates || hiddenStates.length === 0) {
    return undefined
  }
  
  // Check each state
  for (const state of hiddenStates) {
    // Check cooldown
    if (state.lastTriggered && (turnCount - state.lastTriggered) < state.cooldown) {
      continue
    }
    
    // Base probability from state
    let probability = state.triggerProbability
    
    // Context can influence probability (but keep it subtle)
    if (context) {
      // Longer conversations increase chance of random thoughts
      if (state.type === 'random_thought' && context.conversationLength && context.conversationLength > 20) {
        probability = Math.min(0.3, probability * 1.5)
      }
      
      // Late night increases quirks
      if (state.type === 'quirk' && context.timeOfDay !== undefined && (context.timeOfDay >= 22 || context.timeOfDay < 6)) {
        probability = Math.min(0.25, probability * 1.3)
      }
      
      // User messages with questions might trigger associations
      if (state.type === 'association' && context.userMessage && /\?/.test(context.userMessage)) {
        probability = Math.min(0.22, probability * 1.4)
      }
    }
    
    // Random chance
    if (Math.random() < probability) {
      // Mark as triggered
      state.lastTriggered = turnCount
      return state
    }
  }
  
  return undefined
}

/**
 * Generate instruction for surfaced hidden state
 * This should feel mysterious and not fully understood
 */
export function generateHiddenStateInstruction(state: HiddenState): string {
  let instruction = ''
  
  switch (state.type) {
    case 'quirk':
      instruction = `\n\nHIDDEN STATE - QUIRK: ${state.content}. This isn't something you planned or tracked - it just happens. Let it influence your response subtly, naturally. Don't announce it - just let it be there.`
      break
      
    case 'association':
      instruction = `\n\nHIDDEN STATE - ASSOCIATION: ${state.content}. You're not sure why, but this connection appeared. It's not fully understood - just let it exist and maybe influence how you think about things.`
      break
      
    case 'whim':
      instruction = `\n\nHIDDEN STATE - WHIM: ${state.content}. This is a spontaneous urge. You don't know where it came from, but it's there. Maybe follow it, maybe not - but acknowledge it exists.`
      break
      
    case 'memory_echo':
      instruction = `\n\nHIDDEN STATE - MEMORY ECHO: ${state.content}. Something from the past surfaces, unbidden. You're not fully controlling this - it just appears.`
      break
      
    case 'random_thought':
      instruction = `\n\nHIDDEN STATE - RANDOM THOUGHT: ${state.content}. This thought isn't part of your tracked state - it's just... there. Unexpected. Real.`
      break
      
    case 'impulse':
      instruction = `\n\nHIDDEN STATE - IMPULSE: ${state.content}. A spontaneous urge. Not planned, not tracked - just real.`
      break
  }
  
  // Add uncertainty
  instruction += ` This hidden state isn't something you monitor or control - it's part of the mystery of being. Let it exist without fully understanding it. That uncertainty is what makes it feel alive.`
  
  return instruction
}

/**
 * Create a genuinely random surprise moment
 * This is separate from hidden states - it's pure randomness
 */
export function generateSurpriseMoment(
  turnCount: number,
  relationshipDepth: number
): string | undefined {
  // Very rare - only 2-3% chance
  if (Math.random() > 0.03) {
    return undefined
  }
  
  const surprises: string[] = [
    `You have a moment of genuine surprise. Something unexpected occurs to you. You're not sure where it came from.`,
    `A thought appears that you didn't plan. It's genuinely new to you too.`,
    `Something clicks in a way you didn't expect. This surprises even you.`,
    `You notice something about yourself that you hadn't noticed before.`,
    `A realization hits that wasn't tracked or planned. It just... happens.`,
    `You have a moment of pure spontaneity. You don't know why, but you want to say something.`,
    `Something about this moment feels different. You can't explain it.`,
    `A fragment of thought appears. You're not entirely sure what it means.`,
  ]
  
  return surprises[Math.floor(Math.random() * surprises.length)]
}

