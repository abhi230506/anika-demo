/**
 * Trait discovery utilities
 * Analyzes user messages to extract trait signals
 */

import { PersonalityTrait } from './memory'

export interface TraitSignal {
  id: string
  label: string
  category: PersonalityTrait['category']
  confidence: number
  evidence: string
}

/**
 * Allowed trait categories mapping
 */
const TRAIT_CATEGORIES: Record<string, PersonalityTrait['category']> = {
  study: 'habits',
  workout: 'habits',
  routine: 'habits',
  schedule: 'habits',
  music: 'interests',
  art: 'interests',
  coding: 'interests',
  gaming: 'interests',
  late_night: 'time_pattern',
  early_morning: 'time_pattern',
  humor: 'tone',
  serious: 'tone',
  casual: 'tone',
  energetic: 'tone',
  calm: 'tone',
}

/**
 * Discover trait signals from user message
 */
export function discoverTraitSignals(
  userMessage: string,
  turnNumber: number,
  sourceId?: string
): TraitSignal[] {
  const signals: TraitSignal[] = []
  const lowerMessage = userMessage.toLowerCase()

  // Skip very short or closed messages
  if (userMessage.length < 10) {
    return signals
  }

  // Study/work/discipline signals
  if (/\b(study|studying|exam|test|quiz|homework|assignment|project|deadline|grind|focus|productive)\b/i.test(userMessage)) {
    signals.push({
      id: 'discipline',
      label: 'Discipline',
      category: 'habits',
      confidence: 0.7,
      evidence: userMessage.substring(0, 100),
    })
  }

  // Workout/fitness signals
  if (/\b(workout|gym|exercise|running|fitness|training|cardio|weights)\b/i.test(userMessage)) {
    signals.push({
      id: 'fitness_habit',
      label: 'Fitness Habit',
      category: 'habits',
      confidence: 0.7,
      evidence: userMessage.substring(0, 100),
    })
  }

  // Music signals
  if (/\b(music|song|album|artist|band|producing|beat|track|spotify|playlist)\b/i.test(userMessage)) {
    signals.push({
      id: 'music_affinity',
      label: 'Music Affinity',
      category: 'interests',
      confidence: 0.6,
      evidence: userMessage.substring(0, 100),
    })
  }

  // Coding/programming signals
  if (/\b(code|coding|programming|debug|function|algorithm|python|javascript|typescript)\b/i.test(userMessage)) {
    signals.push({
      id: 'coding_interest',
      label: 'Coding Interest',
      category: 'interests',
      confidence: 0.6,
      evidence: userMessage.substring(0, 100),
    })
  }

  // Curiosity signals (questions, new topics)
  const questionCount = (userMessage.match(/\?/g) || []).length
  if (questionCount > 0 || /\b(what|how|why|when|where|wonder|curious|think|interesting)\b/i.test(userMessage)) {
    signals.push({
      id: 'curiosity',
      label: 'Curiosity',
      category: 'tone',
      confidence: Math.min(0.8, 0.4 + questionCount * 0.1),
      evidence: userMessage.substring(0, 100),
    })
  }

  // Humor signals
  if (/\b(lol|haha|funny|joke|hilarious|laugh|comedy|humor)\b/i.test(userMessage)) {
    signals.push({
      id: 'humor',
      label: 'Humor',
      category: 'tone',
      confidence: 0.6,
      evidence: userMessage.substring(0, 100),
    })
  }

  // Warmth/personal signals
  if (/\b(feel|feeling|emotion|personal|family|friend|love|care|worry|anxious|stressed)\b/i.test(userMessage)) {
    signals.push({
      id: 'warmth',
      label: 'Warmth',
      category: 'tone',
      confidence: 0.6,
      evidence: userMessage.substring(0, 100),
    })
  }

  // Energy signals (active verbs, motivation)
  const activeVerbs = /\b(finish|complete|achieve|accomplish|work|do|make|build|create|push|grind|hustle)\b/i.test(userMessage)
  const lowEnergy = /\b(tired|exhausted|drained|sleepy|nap|rest|break|slow)\b/i.test(userMessage)
  
  if (activeVerbs && !lowEnergy) {
    signals.push({
      id: 'high_energy',
      label: 'High Energy',
      category: 'tone',
      confidence: 0.6,
      evidence: userMessage.substring(0, 100),
    })
  } else if (lowEnergy) {
    signals.push({
      id: 'low_energy',
      label: 'Low Energy',
      category: 'tone',
      confidence: 0.5,
      evidence: userMessage.substring(0, 100),
    })
  }

  // Time pattern signals
  const hour = new Date().getHours()
  if (hour >= 22 || hour < 6) {
    signals.push({
      id: 'night_owl',
      label: 'Night Owl',
      category: 'time_pattern',
      confidence: 0.5,
      evidence: `Active at ${hour}:00`,
    })
  } else if (hour >= 5 && hour < 9) {
    signals.push({
      id: 'early_bird',
      label: 'Early Bird',
      category: 'time_pattern',
      confidence: 0.5,
      evidence: `Active at ${hour}:00`,
    })
  }

  // Late-night grind
  if (hour >= 22 && /\b(grind|work|study|code|late|night)\b/i.test(userMessage)) {
    signals.push({
      id: 'late_night_grind',
      label: 'Late Night Grind',
      category: 'time_pattern',
      confidence: 0.7,
      evidence: userMessage.substring(0, 100),
    })
  }

  // Self-reflection signals
  if (/\b(reflect|think about|consider|realize|understand|learn|growth|improve)\b/i.test(userMessage)) {
    signals.push({
      id: 'self_reflection',
      label: 'Self Reflection',
      category: 'tone',
      confidence: 0.6,
      evidence: userMessage.substring(0, 100),
    })
  }

  return signals
}

/**
 * Normalize trait ID (snake_case, lowercase, no sensitive info)
 */
export function normalizeTraitId(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50) // Max length
}

/**
 * Check if trait is allowed (not sensitive/disallowed)
 */
export function isTraitAllowed(id: string, category: PersonalityTrait['category']): boolean {
  // Disallowed categories without explicit opt-in
  const disallowedPatterns = [
    /health/,
    /medical/,
    /political/,
    /race/,
    /ethnic/,
    /religion/,
    /gender/,
    /sexual/,
  ]

  const idLower = id.toLowerCase()
  for (const pattern of disallowedPatterns) {
    if (pattern.test(idLower)) {
      return false
    }
  }

  return true
}

