/**
 * Activity Suggestions Utilities
 * 
 * Functions to suggest activities based on emotion, weather, mood, and music preferences
 */

import type { EmotionLabel } from './emotion-detection'

/**
 * Get activity suggestions based on emotion
 */
export function getEmotionBasedActivities(
  emotion: EmotionLabel,
  confidence: number
): string[] {
  if (confidence < 0.6) return []
  
  const activities: Record<EmotionLabel, string[]> = {
    'stressed': [
      'take a walk',
      'do some deep breathing',
      'listen to calming music',
      'stretch',
      'write in a journal',
      'step outside for fresh air',
    ],
    'down': [
      'go for a walk',
      'listen to uplifting music',
      'call a friend',
      'do something creative',
      'watch something funny',
      'get some sunshine',
    ],
    'frustrated': [
      'go for a run',
      'do some exercise',
      'listen to energetic music',
      'take a break',
      'try a different approach',
    ],
    'tired': [
      'take a short nap',
      'go for a gentle walk',
      'listen to soft music',
      'read something light',
      'rest',
    ],
    'upbeat': [
      'go for a run',
      'try something new',
      'meet up with friends',
      'explore outdoors',
      'start a creative project',
    ],
    'calm': [
      'read a book',
      'meditate',
      'go for a peaceful walk',
      'practice a hobby',
      'enjoy nature',
    ],
    'focused': [
      'tackle a challenging task',
      'learn something new',
      'work on a project',
      'practice a skill',
      'read something deep',
    ],
    'neutral': [
      'take a walk',
      'try something new',
      'explore interests',
      'connect with someone',
      'do something creative',
    ],
  }
  
  return activities[emotion] || []
}

/**
 * Get weather-based activity suggestions
 */
export function getWeatherBasedActivities(
  weather?: {
    tempC?: number
    condition?: string
    humidity?: number
  }
): string[] {
  if (!weather || !weather.condition) return []
  
  const condition = weather.condition.toLowerCase()
  const temp = weather.tempC || 20
  
  const activities: string[] = []
  
  // Temperature-based
  if (temp > 25) {
    activities.push('go swimming', 'find shade', 'stay hydrated', 'enjoy cold drinks', 'visit indoor places')
  } else if (temp < 10) {
    activities.push('cozy up inside', 'make hot tea', 'read by the fireplace', 'wear warm layers', 'try indoor activities')
  } else {
    activities.push('go for a walk', 'enjoy the comfortable temperature', 'spend time outdoors')
  }
  
  // Condition-based
  if (condition.includes('sunny') || condition.includes('clear')) {
    activities.push('go for a walk', 'have a picnic', 'enjoy the sunshine', 'sit outside', 'do outdoor activities')
  } else if (condition.includes('rain') || condition.includes('drizzle')) {
    activities.push('cozy up indoors', 'read a book', 'watch a movie', 'do indoor activities', 'make tea')
  } else if (condition.includes('cloud') || condition.includes('overcast')) {
    activities.push('go for a walk', 'perfect for outdoor activities', 'enjoy the cooler weather', 'take photos')
  } else if (condition.includes('snow')) {
    activities.push('build a snowman', 'go sledding', 'cozy up inside', 'make hot chocolate', 'enjoy winter activities')
  } else if (condition.includes('wind')) {
    activities.push('fly a kite', 'go for a brisk walk', 'be careful outdoors', 'find sheltered areas')
  }
  
  return [...new Set(activities)] // Remove duplicates
}

/**
 * Get mood-based activity recommendations
 */
export function getMoodBasedActivities(
  emotion: EmotionLabel,
  isLateNight: boolean = false,
  isWeekend: boolean = false
): string[] {
  const activities: string[] = []
  
  // Time-based
  if (isLateNight) {
    activities.push('wind down', 'listen to calming music', 'read', 'meditate', 'prepare for sleep')
    return activities
  }
  
  // Emotion-based
  if (emotion === 'stressed' || emotion === 'down' || emotion === 'frustrated') {
    activities.push('take a break', 'do something you enjoy', 'connect with someone', 'practice self-care')
  } else if (emotion === 'upbeat' || emotion === 'calm') {
    activities.push('make the most of your energy', 'tackle something fun', 'try something new')
  } else if (emotion === 'tired') {
    activities.push('rest', 'take it easy', 'recharge', 'do low-energy activities')
  }
  
  // Weekend-specific
  if (isWeekend) {
    activities.push('enjoy your weekend', 'take time for yourself', 'explore new places', 'relax')
  }
  
  return activities
}

/**
 * Get music suggestions based on current vibe
 */
export function getMusicSuggestions(
  emotion: EmotionLabel,
  timeOfDay: number,
  isLateNight: boolean = false
): string[] {
  if (isLateNight || timeOfDay >= 22 || timeOfDay < 6) {
    return [
      'ambient',
      'lo-fi',
      'calming instrumental',
      'soft jazz',
      'acoustic',
      'meditation music',
    ]
  }
  
  const musicByEmotion: Record<EmotionLabel, string[]> = {
    'stressed': [
      'calming classical',
      'nature sounds',
      'ambient',
      'meditation music',
      'lo-fi',
      'acoustic',
    ],
    'down': [
      'uplifting pop',
      'motivational',
      'upbeat indie',
      'energetic rock',
      'feel-good songs',
      'indie pop',
    ],
    'frustrated': [
      'energetic rock',
      'metal',
      'punk',
      'aggressive beats',
      'powerful music',
      'high-energy',
    ],
    'tired': [
      'soft jazz',
      'ambient',
      'lo-fi',
      'acoustic',
      'chill',
      'relaxing',
    ],
    'upbeat': [
      'dance music',
      'upbeat pop',
      'energetic',
      'feel-good',
      'party music',
      'indie pop',
    ],
    'calm': [
      'ambient',
      'acoustic',
      'folk',
      'soft jazz',
      'instrumental',
      'peaceful',
    ],
    'focused': [
      'instrumental',
      'lo-fi',
      'classical',
      'ambient',
      'focus music',
      'study music',
    ],
    'neutral': [
      'your favorite genre',
      'something new',
      'discover new artists',
      'explore different styles',
    ],
  }
  
  return musicByEmotion[emotion] || musicByEmotion['neutral']
}

/**
 * Check if it's appropriate to offer to chat about emotions
 */
export function shouldOfferEmotionalChat(
  emotion: EmotionLabel,
  confidence: number,
  lastEmotionalChatOffer?: string,
  minHoursSinceOffer: number = 2
): boolean {
  if (confidence < 0.7) return false
  
  // Only offer for negative emotions
  const negativeEmotions: EmotionLabel[] = ['stressed', 'down', 'frustrated']
  if (!negativeEmotions.includes(emotion)) return false
  
  // Check cooldown
  if (lastEmotionalChatOffer) {
    const hoursSince = (Date.now() - new Date(lastEmotionalChatOffer).getTime()) / (1000 * 60 * 60)
    if (hoursSince < minHoursSinceOffer) return false
  }
  
  return true
}

/**
 * Generate emotional chat offer message suggestion
 */
export function generateEmotionalChatOffer(emotion: EmotionLabel): string {
  const offers: Record<EmotionLabel, string> = {
    'stressed': "You seem stressed. What's going on?",
    'down': "You seem down. What's up?",
    'frustrated': "You sound frustrated. What happened?",
  }
  
  return offers[emotion] || "You seem like you want to talk about something."
}

