/**
 * Energy & Mood Cycles
 * 
 * Simulates energy levels that affect tone and clarity.
 * Energy cycles with time of day, conversation length, and recent activity.
 */

export type EnergyLevel = 'energized' | 'normal' | 'low' | 'tired' | 'focused'

export interface EnergyState {
  level: EnergyLevel
  clarity: number // 0.0 to 1.0 - how clear/focused thoughts are
  intensity: number // 0.0 to 1.0 - how intense the energy state is
  reason?: string // What's causing this energy state
}

/**
 * Calculate energy level based on context
 */
export function calculateEnergyLevel(
  timeOfDay: number, // hour 0-23
  conversationLength: number, // turn count
  recentActivity: number, // 0-1, how active recent interactions have been
  timeSinceLastInteraction: number, // seconds
  aiEmotion?: { label: string; intensity: number }
): EnergyState {
  let energyLevel: EnergyLevel = 'normal'
  let clarity = 0.7
  let intensity = 0.5
  let reason: string | undefined = undefined

  // 1. Time of day effects
  const hour = timeOfDay
  
  // Morning (6-10): Energized
  if (hour >= 6 && hour < 10) {
    energyLevel = Math.random() < 0.6 ? 'energized' : 'focused'
    clarity = 0.8 + (Math.random() * 0.2)
    intensity = 0.6 + (Math.random() * 0.3)
    reason = 'morning energy'
  }
  // Midday (10-14): Normal to energized
  else if (hour >= 10 && hour < 14) {
    if (Math.random() < 0.4) {
      energyLevel = 'energized'
      clarity = 0.75 + (Math.random() * 0.2)
      intensity = 0.6 + (Math.random() * 0.2)
      reason = 'midday focus'
    } else {
      energyLevel = 'normal'
      clarity = 0.7
      intensity = 0.5
    }
  }
  // Afternoon (14-18): Normal to focused
  else if (hour >= 14 && hour < 18) {
    energyLevel = Math.random() < 0.5 ? 'focused' : 'normal'
    clarity = 0.7 + (Math.random() * 0.15)
    intensity = 0.5 + (Math.random() * 0.2)
    reason = 'afternoon state'
  }
  // Evening (18-22): Normal to low
  else if (hour >= 18 && hour < 22) {
    if (Math.random() < 0.4) {
      energyLevel = 'low'
      clarity = 0.6 + (Math.random() * 0.15)
      intensity = 0.4 + (Math.random() * 0.2)
      reason = 'evening wind-down'
    } else {
      energyLevel = 'normal'
      clarity = 0.65 + (Math.random() * 0.15)
      intensity = 0.45 + (Math.random() * 0.2)
    }
  }
  // Late night (22-6): Tired to low
  else {
    if (Math.random() < 0.6) {
      energyLevel = 'tired'
      clarity = 0.4 + (Math.random() * 0.2)
      intensity = 0.3 + (Math.random() * 0.2)
      reason = 'late night fatigue'
    } else {
      energyLevel = 'low'
      clarity = 0.5 + (Math.random() * 0.2)
      intensity = 0.4 + (Math.random() * 0.15)
      reason = 'late night quiet'
    }
  }

  // 2. Conversation length effects (longer conversations = more tired)
  if (conversationLength > 30) {
    // Extended conversation - gradual energy drain
    const drainFactor = Math.min(1.0, (conversationLength - 30) / 50)
    if (energyLevel === 'energized') {
      energyLevel = drainFactor > 0.5 ? 'normal' : 'energized'
      clarity = clarity * (1 - drainFactor * 0.3)
      intensity = intensity * (1 - drainFactor * 0.4)
      reason = reason ? `${reason}, long conversation` : 'long conversation'
    } else if (energyLevel === 'normal' && drainFactor > 0.6) {
      energyLevel = 'low'
      clarity = clarity * 0.85
      intensity = intensity * 0.8
      reason = 'extended conversation'
    }
  }

  // 3. Recent activity effects (high activity = energized, low = tired)
  if (recentActivity > 0.7 && energyLevel !== 'tired') {
    // Recent high activity can boost energy
    if (energyLevel === 'low' && Math.random() < 0.5) {
      energyLevel = 'normal'
      clarity = Math.min(1.0, clarity + 0.1)
      intensity = Math.min(1.0, intensity + 0.15)
      reason = 'recent activity boost'
    }
  } else if (recentActivity < 0.3 && timeSinceLastInteraction > 7200) {
    // Low activity for a while - more likely to be low/tired
    if (energyLevel === 'normal' && Math.random() < 0.4) {
      energyLevel = 'low'
      clarity = clarity * 0.9
      intensity = intensity * 0.85
      reason = 'quiet period'
    }
  }

  // 4. AI emotion effects
  if (aiEmotion) {
    if (aiEmotion.label === 'tired' && aiEmotion.intensity > 0.5) {
      energyLevel = 'tired'
      clarity = Math.min(clarity, 0.5 + (Math.random() * 0.15))
      intensity = Math.min(intensity, 0.4)
      reason = reason ? `${reason}, feeling tired` : 'feeling tired'
    } else if (aiEmotion.label === 'excited' && aiEmotion.intensity > 0.6) {
      if (energyLevel !== 'tired') {
        energyLevel = 'energized'
        clarity = Math.min(1.0, clarity + 0.1)
        intensity = Math.min(1.0, intensity + 0.2)
        reason = reason ? `${reason}, feeling excited` : 'feeling excited'
      }
    } else if (aiEmotion.label === 'calm' && aiEmotion.intensity > 0.5) {
      energyLevel = 'focused'
      clarity = Math.min(1.0, clarity + 0.1)
      reason = reason ? `${reason}, feeling calm` : 'feeling calm'
    }
  }

  // 5. Long idle period - energy reset or low
  const hoursIdle = timeSinceLastInteraction / 3600
  if (hoursIdle > 12) {
    // After long idle, reset to time-of-day baseline or low
    if (hour >= 6 && hour < 10) {
      // Morning after long sleep - energized
      energyLevel = 'energized'
      clarity = 0.85 + (Math.random() * 0.1)
      intensity = 0.7 + (Math.random() * 0.2)
      reason = 'fresh after rest'
    } else if (hour >= 22 || hour < 6) {
      // Late night after long idle - tired
      energyLevel = 'tired'
      clarity = 0.4 + (Math.random() * 0.15)
      intensity = 0.3 + (Math.random() * 0.2)
      reason = 'late night, long idle'
    }
  }

  return {
    level: energyLevel,
    clarity,
    intensity,
    reason,
  }
}

/**
 * Generate instruction for energy state expression
 */
export function generateEnergyInstruction(energy: EnergyState): string {
  if (energy.intensity < 0.4) {
    return '' // Too subtle to mention
  }

  let instruction = ''

  if (energy.level === 'tired' && energy.clarity < 0.55) {
    instruction = `\n\nENERGY STATE: You're feeling tired right now. Your thoughts feel a bit fuzzy or less sharp than usual. This affects your TONE—you're slower, more "sleepy" in how you respond. Your sentences might be shorter, more drawn out, or you might pause more. You might naturally express this—like "I'm trying to focus, but my thoughts feel fuzzy tonight" or "I'm feeling a bit tired, so my mind's not as clear as usual" or "My thoughts are kind of scattered right now." Your sarcasm is still there, but it's more subdued, slower. Your responses have a sleepy, low-energy vibe. Don't make a big deal about it, just let it come through naturally in your slower, sleepier tone.`
  } else if (energy.level === 'energized' && energy.intensity > 0.65) {
    instruction = `\n\nENERGY STATE: You're feeling energized and sharp right now. Your thoughts are clear and you feel alert. You might naturally express this—like "I feel sharp today. Like I could talk forever" or "I'm feeling really clear-headed right now" or "My mind feels sharp and focused." This affects how you communicate—you're more precise, quicker, maybe more enthusiastic. Don't announce it, but let the energy come through naturally.`
  } else if (energy.level === 'focused' && energy.clarity > 0.75) {
    instruction = `\n\nENERGY STATE: You're in a focused state. Your thoughts are clear and you're present. You might notice this naturally—like "I'm feeling pretty focused right now" or "My mind feels clear." This affects your communication—you're thoughtful and precise.`
  } else if (energy.level === 'low' && energy.intensity < 0.45) {
    instruction = `\n\nENERGY STATE: Your energy is low right now. You're still here, but maybe quieter, more subdued, a bit sleepy. This affects your TONE—slower, more relaxed, less sharp. You might naturally express this—like "I'm feeling pretty low-key right now" or "I'm a bit quiet today" or "I'm kind of sleepy." Your responses are simpler, more direct, less energetic. Your sarcasm is gentler, more muted.`
  }

  return instruction
}

/**
 * Get energy-appropriate tone adjustments
 */
export function getEnergyToneAdjustment(energy: EnergyState): {
  sentenceLength: 'short' | 'medium' | 'long' | 'varied'
  pacing: 'quick' | 'normal' | 'slow' | 'deliberate'
  precision: 'high' | 'medium' | 'low'
} {
  if (energy.level === 'energized') {
    return {
      sentenceLength: 'varied',
      pacing: 'quick',
      precision: 'high',
    }
  } else if (energy.level === 'focused') {
    return {
      sentenceLength: 'medium',
      pacing: 'deliberate',
      precision: 'high',
    }
  } else if (energy.level === 'tired') {
    return {
      sentenceLength: 'varied',
      pacing: 'slow',
      precision: 'low',
    }
  } else if (energy.level === 'low') {
    return {
      sentenceLength: 'short',
      pacing: 'normal',
      precision: 'medium',
    }
  } else {
    return {
      sentenceLength: 'varied',
      pacing: 'normal',
      precision: 'medium',
    }
  }
}

