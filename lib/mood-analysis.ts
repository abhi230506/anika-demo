/**
 * Mood Analysis Utilities
 * 
 * Functions to analyze mood patterns, trends, and cycles
 */

import type { MoodEntry, MoodPattern } from '@/lib/memory'

/**
 * Analyze mood entries to detect trends
 * Returns pattern if significant trend detected
 */
export function analyzeMoodTrend(
  entries: MoodEntry[],
  recentDays: number = 7
): MoodPattern | null {
  if (entries.length < 5) return null
  
  // Filter to recent entries
  const cutoff = new Date(Date.now() - recentDays * 24 * 60 * 60 * 1000)
  const recentEntries = entries.filter(e => new Date(e.timestamp) >= cutoff)
  
  if (recentEntries.length < 5) return null
  
  // Group emotions by positive/negative/neutral
  const emotionValues: Record<string, number> = {
    'upbeat': 2,
    'calm': 1,
    'neutral': 0,
    'tired': -1,
    'stressed': -1.5,
    'down': -2,
    'frustrated': -1.5,
  }
  
  // Calculate average mood for first half vs second half
  const midPoint = Math.floor(recentEntries.length / 2)
  const firstHalf = recentEntries.slice(0, midPoint)
  const secondHalf = recentEntries.slice(midPoint)
  
  const avgFirst = firstHalf.reduce((sum, e) => 
    sum + (emotionValues[e.emotion_label] || 0) * e.confidence, 0
  ) / firstHalf.length
  
  const avgSecond = secondHalf.reduce((sum, e) => 
    sum + (emotionValues[e.emotion_label] || 0) * e.confidence, 0
  ) / secondHalf.length
  
  const difference = avgSecond - avgFirst
  const strength = Math.abs(difference) / 4 // Normalize to 0-1
  
  if (strength < 0.3) return null // Not significant enough
  
  if (difference > 0.5) {
    // Positive trend
    const dominantEmotion = getDominantEmotion(secondHalf)
    return {
      type: 'trend',
      description: `You've been more ${dominantEmotion} lately`,
      emotion_labels: [dominantEmotion],
      time_range: {
        start: firstHalf[0].timestamp,
        end: secondHalf[secondHalf.length - 1].timestamp,
      },
      strength,
    }
  } else if (difference < -0.5) {
    // Negative trend
    const dominantEmotion = getDominantEmotion(secondHalf)
    return {
      type: 'trend',
      description: `You've seemed more ${dominantEmotion} recently`,
      emotion_labels: [dominantEmotion],
      time_range: {
        start: firstHalf[0].timestamp,
        end: secondHalf[secondHalf.length - 1].timestamp,
      },
      strength,
    }
  }
  
  return null
}

/**
 * Detect mood cycles (e.g., weekly patterns, time-of-day patterns)
 */
export function analyzeMoodCycles(
  entries: MoodEntry[]
): MoodPattern[] {
  if (entries.length < 14) return [] // Need at least 2 weeks
  
  const patterns: MoodPattern[] = []
  
  // Analyze day-of-week patterns
  const dayGroups: Record<number, MoodEntry[]> = {}
  entries.forEach(entry => {
    if (!dayGroups[entry.day_of_week]) {
      dayGroups[entry.day_of_week] = []
    }
    dayGroups[entry.day_of_week].push(entry)
  })
  
  // Find days with consistently different moods
  const emotionValues: Record<string, number> = {
    'upbeat': 2, 'calm': 1, 'neutral': 0,
    'tired': -1, 'stressed': -1.5, 'down': -2, 'frustrated': -1.5,
  }
  
  const dayAverages: Record<number, number> = {}
  Object.keys(dayGroups).forEach(day => {
    const dayNum = parseInt(day)
    const dayEntries = dayGroups[dayNum]
    if (dayEntries.length >= 3) {
      dayAverages[dayNum] = dayEntries.reduce((sum, e) => 
        sum + (emotionValues[e.emotion_label] || 0) * e.confidence, 0
      ) / dayEntries.length
    }
  })
  
  // Check for significant differences
  const days = Object.keys(dayAverages).map(d => parseInt(d))
  if (days.length >= 2) {
    const overallAvg = days.reduce((sum, d) => sum + dayAverages[d], 0) / days.length
    
    days.forEach(day => {
      const diff = dayAverages[day] - overallAvg
      if (Math.abs(diff) > 0.5 && Math.abs(diff) < 1.5) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        const moodLabel = diff > 0 ? 'more energetic' : 'more drained'
        
        patterns.push({
          type: 'cycle',
          description: `You tend to feel ${moodLabel} on ${dayNames[day]}s`,
          emotion_labels: Object.keys(emotionValues),
          time_range: {
            start: entries[0].timestamp,
            end: entries[entries.length - 1].timestamp,
          },
          strength: Math.abs(diff) / 2,
        })
      }
    })
  }
  
  // Analyze time-of-day patterns
  const timeGroups: Record<string, MoodEntry[]> = {
    'morning': [],
    'afternoon': [],
    'evening': [],
    'night': [],
  }
  
  entries.forEach(entry => {
    if (entry.time_of_day >= 6 && entry.time_of_day < 12) {
      timeGroups.morning.push(entry)
    } else if (entry.time_of_day >= 12 && entry.time_of_day < 17) {
      timeGroups.afternoon.push(entry)
    } else if (entry.time_of_day >= 17 && entry.time_of_day < 22) {
      timeGroups.evening.push(entry)
    } else {
      timeGroups.night.push(entry)
    }
  })
  
  const timeAverages: Record<string, number> = {}
  Object.keys(timeGroups).forEach(period => {
    const periodEntries = timeGroups[period]
    if (periodEntries.length >= 3) {
      timeAverages[period] = periodEntries.reduce((sum, e) => 
        sum + (emotionValues[e.emotion_label] || 0) * e.confidence, 0
      ) / periodEntries.length
    }
  })
  
  const periods = Object.keys(timeAverages)
  if (periods.length >= 2) {
    const overallAvg = periods.reduce((sum, p) => sum + timeAverages[p], 0) / periods.length
    
    periods.forEach(period => {
      const diff = timeAverages[period] - overallAvg
      if (Math.abs(diff) > 0.6) {
        const moodLabel = diff > 0 ? 'more energetic' : 'more tired'
        
        patterns.push({
          type: 'cycle',
          description: `You're usually ${moodLabel} in the ${period}`,
          emotion_labels: Object.keys(emotionValues),
          time_range: {
            start: entries[0].timestamp,
            end: entries[entries.length - 1].timestamp,
          },
          strength: Math.abs(diff) / 2,
        })
      }
    })
  }
  
  return patterns
}

/**
 * Detect significant mood changes (e.g., sudden shift)
 */
export function detectMoodChange(
  entries: MoodEntry[],
  lookbackDays: number = 3
): MoodPattern | null {
  if (entries.length < 6) return null
  
  const cutoff = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000)
  const recentEntries = entries.filter(e => new Date(e.timestamp) >= cutoff)
  
  if (recentEntries.length < 3) return null
  
  // Compare most recent entries with previous ones
  const last3 = recentEntries.slice(-3)
  const previous3 = recentEntries.slice(-6, -3)
  
  if (previous3.length < 3) return null
  
  const emotionValues: Record<string, number> = {
    'upbeat': 2, 'calm': 1, 'neutral': 0,
    'tired': -1, 'stressed': -1.5, 'down': -2, 'frustrated': -1.5,
  }
  
  const avgPrevious = previous3.reduce((sum, e) => 
    sum + (emotionValues[e.emotion_label] || 0) * e.confidence, 0
  ) / previous3.length
  
  const avgRecent = last3.reduce((sum, e) => 
    sum + (emotionValues[e.emotion_label] || 0) * e.confidence, 0
  ) / last3.length
  
  const change = avgRecent - avgPrevious
  const strength = Math.abs(change) / 4
  
  if (strength < 0.4) return null // Not significant
  
  const dominantEmotion = getDominantEmotion(last3)
  
  if (change > 0.5) {
    return {
      type: 'change',
      description: `You seem more ${dominantEmotion} than usual lately`,
      emotion_labels: [dominantEmotion],
      time_range: {
        start: previous3[0].timestamp,
        end: last3[last3.length - 1].timestamp,
      },
      strength,
    }
  } else if (change < -0.5) {
    return {
      type: 'change',
      description: `You've been feeling more ${dominantEmotion} than usual`,
      emotion_labels: [dominantEmotion],
      time_range: {
        start: previous3[0].timestamp,
        end: last3[last3.length - 1].timestamp,
      },
      strength,
    }
  }
  
  return null
}

/**
 * Get dominant emotion from entries
 */
function getDominantEmotion(entries: MoodEntry[]): string {
  if (entries.length === 0) return 'neutral'
  
  const emotionCounts: Record<string, number> = {}
  entries.forEach(entry => {
    emotionCounts[entry.emotion_label] = (emotionCounts[entry.emotion_label] || 0) + entry.confidence
  })
  
  return Object.keys(emotionCounts).reduce((a, b) => 
    emotionCounts[a] > emotionCounts[b] ? a : b
  )
}

/**
 * Check if it's a good time to comment on mood
 */
export function shouldCommentOnMood(
  lastObservation?: string,
  minDaysSinceObservation: number = 2
): boolean {
  if (!lastObservation) return true
  
  const daysSince = (Date.now() - new Date(lastObservation).getTime()) / (1000 * 60 * 60 * 24)
  return daysSince >= minDaysSinceObservation
}












