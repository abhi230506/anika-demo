/**
 * Reminder Extraction Utilities
 * 
 * Functions to detect things the user is working on, cares about, or wants to do
 */

/**
 * Extract contextual reminders from user message
 */
export function extractReminders(userMessage: string): Array<{
  description: string
  type: 'ongoing_work' | 'interest' | 'wanted_to_do'
  confidence: number
}> {
  if (!userMessage || !userMessage.trim()) {
    return []
  }
  
  const text = userMessage.toLowerCase()
  const reminders: Array<{
    description: string
    type: 'ongoing_work' | 'interest' | 'wanted_to_do'
    confidence: number
  }> = []
  
  // Pattern 1: Ongoing work/projects
  // "working on X", "currently doing Y", "in the middle of Z"
  const ongoingPatterns = [
    /\b(?:working on|currently (?:working on|doing|building|creating|developing|making|writing|learning|studying)|in the (?:middle of|process of)|busy with|focused on)\s+([^.!?]+?)(?:\.|$|!|\?)/gi,
    /\b(?:I'm|I am)\s+(?:working on|doing|building|creating|developing|making|writing|learning|studying)\s+([^.!?]+?)(?:\.|$|!|\?)/gi,
    /\b(?:still|also)\s+(?:working on|doing|building|creating|developing|making|writing|learning|studying)\s+([^.!?]+?)(?:\.|$|!|\?)/gi,
  ]
  
  ongoingPatterns.forEach(pattern => {
    const matches = [...userMessage.matchAll(pattern)]
    matches.forEach(match => {
      const description = match[1]?.trim()
      if (description && description.length > 5 && description.length < 200) {
        reminders.push({
          description,
          type: 'ongoing_work',
          confidence: 0.8,
        })
      }
    })
  })
  
  // Pattern 2: Interests / things they care about
  // "I love X", "really into Y", "passionate about Z", "interested in"
  const interestPatterns = [
    /\b(?:I (?:love|like|enjoy|adore|am passionate about|am really into|am interested in|care about)|really (?:into|love|enjoy|interested in))\s+([^.!?]+?)(?:\.|$|!|\?)/gi,
    /\b(?:one of my (?:interests|hobbies|passions)|big fan of|favorite (?:thing|hobby|activity))\s+([^.!?]+?)(?:\.|$|!|\?)/gi,
  ]
  
  interestPatterns.forEach(pattern => {
    const matches = [...userMessage.matchAll(pattern)]
    matches.forEach(match => {
      const description = match[1]?.trim()
      if (description && description.length > 5 && description.length < 200) {
        reminders.push({
          description,
          type: 'interest',
          confidence: 0.7,
        })
      }
    })
  })
  
  // Pattern 3: Things they want to do
  // "want to X", "planning to Y", "hoping to Z", "thinking about"
  const wantedPatterns = [
    /\b(?:I (?:want to|wanna|would like to|plan to|planning to|hope to|hoping to|thinking about|considering|been meaning to)|thinking about|considering)\s+([^.!?]+?)(?:\.|$|!|\?)/gi,
    /\b(?:someday (?:I|I'd like to|I want to)|one day (?:I|I'd like to|I want to))\s+([^.!?]+?)(?:\.|$|!|\?)/gi,
  ]
  
  wantedPatterns.forEach(pattern => {
    const matches = [...userMessage.matchAll(pattern)]
    matches.forEach(match => {
      const description = match[1]?.trim()
      if (description && description.length > 5 && description.length < 200) {
        reminders.push({
          description,
          type: 'wanted_to_do',
          confidence: 0.75,
        })
      }
    })
  })
  
  // Remove duplicates (same description)
  const seen = new Set<string>()
  return reminders.filter(reminder => {
    const key = `${reminder.type}:${reminder.description.toLowerCase()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Check if user message indicates completion or dismissal of a reminder
 */
export function detectReminderCompletion(userMessage: string): {
  detected: boolean
  description?: string
} {
  if (!userMessage) return { detected: false }
  
  const text = userMessage.toLowerCase()
  
  // Patterns for completion
  const completionPatterns = [
    /\b(finished|completed|done with|wrapped up|finished working on|done working on)\s+([^.!?]+?)(?:\.|$|!|\?)/i,
    /\b(I'm|I am)\s+(?:all done|finished|done)\s+(?:with|working on)\s+([^.!?]+?)(?:\.|$|!|\?)/i,
    /\b(no longer|stopped|not (?:working on|doing|interested in))\s+([^.!?]+?)(?:\.|$|!|\?)/i,
  ]
  
  for (const pattern of completionPatterns) {
    const match = userMessage.match(pattern)
    if (match && match[2]) {
      return {
        detected: true,
        description: match[2].trim(),
      }
    }
  }
  
  return { detected: false }
}












