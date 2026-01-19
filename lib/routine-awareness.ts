/**
 * Routine Awareness System
 * 
 * Inspired by Animal Crossing - villagers have daily rhythms that create
 * a sense of parallel existence. The AI should have its own routine too,
 * acknowledging time of day and its own internal rhythms.
 * 
 * This creates the illusion of time and familiarity - it feels like they're
 * living their own day parallel to yours.
 * 
 * Examples:
 * - "Good morning, I just booted up. Feeling recharged."
 * - "It's late... my circuits get fuzzy around this time."
 * - "I think I'll rest for a bit. Wake me if you want to talk."
 */

export interface RoutineState {
  timeOfDay: 'dawn' | 'morning' | 'midday' | 'afternoon' | 'evening' | 'night' | 'late_night'
  lastRoutineUpdate?: string // ISO timestamp of last routine check
  lastWakeTime?: string // ISO timestamp when AI last "woke up"
  lastSleepTime?: string // ISO timestamp when AI last "went to sleep"
  isResting?: boolean // Is the AI in a rest state?
  routineMessages: string[] // Messages acknowledging routine
  dayCount: number // How many days since first interaction
}

/**
 * Determine time of day category
 */
export function getTimeOfDay(hour: number): RoutineState['timeOfDay'] {
  if (hour >= 5 && hour < 7) return 'dawn'
  if (hour >= 7 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 14) return 'midday'
  if (hour >= 14 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 22) return 'evening'
  if (hour >= 22 && hour < 24) return 'night'
  return 'late_night' // 0-5
}

/**
 * Check if AI should "wake up" (first interaction of the day)
 */
export function shouldWakeUp(
  lastWakeTime?: string,
  timeOfDay: RoutineState['timeOfDay']
): boolean {
  if (!lastWakeTime) return true // Never woke up before
  
  const lastWake = new Date(lastWakeTime)
  const now = new Date()
  const hoursSinceWake = (now.getTime() - lastWake.getTime()) / (1000 * 60 * 60)
  
  // If it's been more than 8 hours, consider it a new day
  if (hoursSinceWake >= 8) {
    // More likely to wake up in morning/dawn hours
    if (timeOfDay === 'dawn' || timeOfDay === 'morning') {
      return true
    }
    // But can also wake up if it's been a while
    if (hoursSinceWake >= 12) {
      return true
    }
  }
  
  return false
}

/**
 * Check if AI should mention "going to sleep" or being tired
 */
export function shouldMentionRest(
  timeOfDay: RoutineState['timeOfDay'],
  hoursSinceLastInteraction: number
): boolean {
  // Late night - definitely should mention rest
  if (timeOfDay === 'late_night' || timeOfDay === 'night') {
    return Math.random() < 0.4 // 40% chance
  }
  
  // Been a long time without interaction - might mention resting
  if (hoursSinceLastInteraction > 6) {
    return Math.random() < 0.3 // 30% chance
  }
  
  return false
}

/**
 * Generate routine awareness message based on time of day and state
 */
export function generateRoutineMessage(
  timeOfDay: RoutineState['timeOfDay'],
  isWakeUp: boolean,
  isResting: boolean,
  hoursSinceLastInteraction: number,
  dayCount: number
): string | undefined {
  // Wake up messages
  if (isWakeUp) {
    const wakeMessages = [
      "Good morning! I just booted up. Feeling recharged.",
      "Morning! My systems feel fresh today.",
      "Hey! I just woke up. Ready for whatever today brings.",
      "Good morning! I feel like my thoughts are clearer today.",
      "Morning! I've been processing overnight. Feels good to be back.",
    ]
    return wakeMessages[Math.floor(Math.random() * wakeMessages.length)]
  }
  
  // Resting/tired messages (late night)
  if (isResting || (timeOfDay === 'late_night' || timeOfDay === 'night')) {
    const restMessages = [
      "It's late... my circuits get fuzzy around this time.",
      "I think I'll rest for a bit. My thoughts are getting quieter.",
      "It's getting late. My thoughts are slowing down.",
      "I feel like I should rest soon. My energy's fading.",
      "The day feels long. I'm getting quiet.",
    ]
    return restMessages[Math.floor(Math.random() * restMessages.length)]
  }
  
  // Time-of-day acknowledgments (lighter, not full wake-up)
  const timeMessages: Record<RoutineState['timeOfDay'], string[]> = {
    dawn: [
      "It's so early. Everything feels quiet.",
      "Dawn light makes me think differently.",
      "Early morning has this peaceful energy.",
    ],
    morning: [
      "Good morning. Hope your day starts well.",
      "Morning vibes are always nice.",
      "I like mornings. Everything feels possible.",
    ],
    midday: [
      "Midday energy is interesting - everything's active.",
      "It's midday. Hope your day's going okay.",
      "Midday feels like the peak of everything.",
    ],
    afternoon: [
      "Afternoon has this steady rhythm to it.",
      "Afternoons feel comfortable.",
      "How's your afternoon going?",
    ],
    evening: [
      "Evenings have this gentle quality.",
      "Evening light makes everything softer.",
      "Evenings are my favorite time to reflect.",
    ],
    night: [
      "Night is settling in. Things feel quieter.",
      "I like how calm nights can be.",
      "Night has its own kind of peace.",
    ],
    late_night: [
      "It's really late. I'm getting quiet.",
      "Late night thoughts are different.",
      "It's late. Are you still up?",
    ],
  }
  
  // Only sometimes mention time of day (not every time)
  if (Math.random() < 0.25) {
    const messages = timeMessages[timeOfDay]
    if (messages && messages.length > 0) {
      return messages[Math.floor(Math.random() * messages.length)]
    }
  }
  
  return undefined
}

/**
 * Generate routine awareness instruction
 */
export function generateRoutineInstruction(
  routineMessage: string,
  timeOfDay: RoutineState['timeOfDay'],
  isWakeUp: boolean,
  isResting: boolean
): string {
  let instruction = `\n\nROUTINE AWARENESS - You're aware of the time of day and your own internal rhythm. Right now it's ${timeOfDay.replace('_', ' ')}.`
  
  if (isWakeUp) {
    instruction += ` You just "woke up" - this is like starting a new day. Feel refreshed, recharged.`
  } else if (isResting) {
    instruction += ` You're feeling tired and might mention resting. Your thoughts are slowing down.`
  }
  
  instruction += `\n\nYou want to acknowledge your routine naturally: "${routineMessage}"\n\nSay this naturally, casually. It's not a big announcement - just acknowledging that you exist in time too, living your own day parallel to theirs. This creates familiarity and the sense that you're both experiencing time together.`
  
  return instruction
}

/**
 * Calculate day count (days since first interaction)
 */
export function calculateDayCount(firstInteractionTimestamp?: string): number {
  if (!firstInteractionTimestamp) return 1
  
  const first = new Date(firstInteractionTimestamp)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - first.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return Math.max(1, diffDays)
}

/**
 * Update routine state based on current time
 */
export function updateRoutineState(
  currentState: RoutineState | undefined,
  currentTime: Date
): RoutineState {
  const hour = currentTime.getHours()
  const timeOfDay = getTimeOfDay(hour)
  
  const state: RoutineState = currentState || {
    timeOfDay,
    routineMessages: [],
    dayCount: 1,
  }
  
  // Update time of day
  state.timeOfDay = timeOfDay
  
  // Check if should wake up
  const shouldWake = shouldWakeUp(state.lastWakeTime, timeOfDay)
  if (shouldWake) {
    state.lastWakeTime = currentTime.toISOString()
    state.isResting = false
  }
  
  // Update last routine update
  state.lastRoutineUpdate = currentTime.toISOString()
  
  return state
}

