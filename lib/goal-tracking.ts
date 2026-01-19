/**
 * Goal tracking utilities
 * Extracts, stores, and manages user goals from conversations
 */

export interface Goal {
  id: string
  description: string
  created_at: string // ISO timestamp
  updated_at: string // ISO timestamp
  target_date?: string // ISO date (optional deadline)
  status: 'active' | 'completed' | 'paused'
  progress?: string // Free-form progress description
  milestones?: Array<{
    description: string
    completed: boolean
    completed_at?: string
  }>
  last_check_in?: string // ISO timestamp
  check_in_count: number
  metadata?: Record<string, any>
}

export interface GoalUpdate {
  progress?: string
  status?: 'active' | 'completed' | 'paused'
  milestone_completed?: number // Index of milestone
}

/**
 * Extract goals from user message
 */
export function extractGoals(userMessage: string): Array<{
  description: string
  targetDate?: string
  confidence: number
}> {
  const goals: Array<{ description: string; targetDate?: string; confidence: number }> = []
  const lowerMessage = userMessage.toLowerCase()

  // Pattern 1: "I want to..." / "I'm going to..." / "I plan to..."
  const intentPatterns = [
    /\b(i want to|i'm going to|i'll|i will|i plan to|i'm planning to|i'm trying to|i need to|i should|i'd like to)\s+(.+?)(?:\.|,|$|by|before)/gi,
    /\b(goal is|my goal|goal of|aiming to|working on)\s+(.+?)(?:\.|,|$|by|before)/gi,
  ]

  for (const pattern of intentPatterns) {
    const matches = userMessage.matchAll(pattern)
    for (const match of matches) {
      let goalText = match[2]?.trim()
      if (goalText && goalText.length > 5 && goalText.length < 200) {
        // Try to extract target date from the goal text
        const dateMatch = goalText.match(/\b(by|before|on|due)\s+(.+?)(?:\s|$|,|\.)/i)
        let targetDate: string | undefined
        if (dateMatch && dateMatch[2]) {
          // Try to parse date
          const dateText = dateMatch[2].trim()
          const parsed = parseDate(dateText)
          if (parsed) {
            targetDate = parsed
            goalText = goalText.replace(/\b(by|before|on|due)\s+.+?(?:\s|$|,|\.)/i, '').trim()
          }
        }
        
        goals.push({
          description: goalText,
          targetDate,
          confidence: 0.7,
        })
      }
    }
  }

  // Pattern 2: Direct goal statements
  const directPatterns = [
    /\b(goal:|objective:|target:|aim:)\s*(.+?)(?:\.|$|,)/gi,
  ]

  for (const pattern of directPatterns) {
    const matches = userMessage.matchAll(pattern)
    for (const match of matches) {
      const goalText = match[2]?.trim()
      if (goalText && goalText.length > 5 && goalText.length < 200) {
        goals.push({
          description: goalText,
          confidence: 0.8,
        })
      }
    }
  }

  return goals
}

/**
 * Parse date from text (simplified)
 */
function parseDate(text: string): string | undefined {
  const now = new Date()
  const currentYear = now.getFullYear()

  // Try parsing relative dates
  if (text.match(/tomorrow/i)) {
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  if (text.match(/next (week|month)/i)) {
    if (text.match(/next week/i)) {
      const nextWeek = new Date(now)
      nextWeek.setDate(nextWeek.getDate() + 7)
      return nextWeek.toISOString().split('T')[0]
    }
    if (text.match(/next month/i)) {
      const nextMonth = new Date(now)
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      return nextMonth.toISOString().split('T')[0]
    }
  }

  // Try parsing month day patterns
  const monthDayPattern = /(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?/i
  const match = text.match(monthDayPattern)
  if (match) {
    const months: Record<string, number> = {
      january: 0, jan: 0,
      february: 1, feb: 1,
      march: 2, mar: 2,
      april: 3, apr: 3,
      may: 4,
      june: 5, jun: 5,
      july: 6, jul: 6,
      august: 7, aug: 7,
      september: 8, sep: 8,
      october: 9, oct: 9,
      november: 10, nov: 10,
      december: 11, dec: 11,
    }
    const month = months[match[1].toLowerCase()]
    const day = parseInt(match[2])
    if (month !== undefined && day >= 1 && day <= 31) {
      const date = new Date(currentYear, month, day)
      if (date < now) {
        date.setFullYear(currentYear + 1)
      }
      return date.toISOString().split('T')[0]
    }
  }

  return undefined
}

/**
 * Check if message indicates goal completion
 */
export function detectGoalCompletion(userMessage: string): {
  detected: boolean
  goalDescription?: string
} {
  const lowerMessage = userMessage.toLowerCase()
  
  const completionPatterns = [
    /\b(i finished|i completed|i did it|i achieved|done with|accomplished|finished)\s+(.+?)(?:\.|$|,|!)/i,
    /\b(just finished|just completed|finally done|got it done)\s+(.+?)(?:\.|$|,|!)/i,
  ]

  for (const pattern of completionPatterns) {
    const match = lowerMessage.match(pattern)
    if (match && match[2]) {
      return {
        detected: true,
        goalDescription: match[2].trim(),
      }
    }
  }

  return { detected: false }
}

/**
 * Check if message indicates goal progress
 */
export function detectGoalProgress(userMessage: string): {
  detected: boolean
  progress?: string
} {
  const lowerMessage = userMessage.toLowerCase()
  
  const progressPatterns = [
    /\b(made progress|progress on|working on|halfway|almost done|getting close)\s+(.+?)(?:\.|$|,)/i,
    /\b(progress update|update on)\s+(.+?)(?:\.|$|,)/i,
  ]

  for (const pattern of progressPatterns) {
    const match = lowerMessage.match(pattern)
    if (match && match[2]) {
      return {
        detected: true,
        progress: match[2].trim(),
      }
    }
  }

  // Check for percentage or milestone mentions
  if (/\b(\d{1,2})%\s+(done|complete|finished)/i.test(lowerMessage)) {
    return {
      detected: true,
      progress: lowerMessage.match(/\b(\d{1,2})%\s+(done|complete|finished)/i)?.[0],
    }
  }

  return { detected: false }
}












