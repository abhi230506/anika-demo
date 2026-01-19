/**
 * Memory extraction utilities
 * Analyzes user messages to extract facts, events, and preferences
 */

export interface ExtractedMemory {
  key: string
  value: string | number | boolean | null
  type: 'fact' | 'event' | 'preference'
  confidence: number
  metadata?: Record<string, any>
}

/**
 * Extract date from text (ISO format)
 */
function extractDate(text: string): string | null {
  // Patterns for common date mentions
  const patterns = [
    // "November 5", "Nov 5", "11/5"
    /(?:november|nov|december|dec|january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|october|oct)\s+(\d{1,2})(?:st|nd|rd|th)?/i,
    // "on the 5th", "on 5th"
    /(?:on\s+)?(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)/i,
    // "11/5", "11-5", "11.5"
    /(\d{1,2})[\/\-\.](\d{1,2})/,
  ]

  const lowerText = text.toLowerCase()
  const now = new Date()
  const currentYear = now.getFullYear()

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      // Try to parse and format as ISO date
      // This is a simplified parser - could be enhanced
      try {
        // For month name patterns
        const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
          'july', 'august', 'september', 'october', 'november', 'december']
        const monthAbbr = ['jan', 'feb', 'mar', 'apr', 'may', 'jun',
          'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

        let month: number | null = null
        let day: number | null = null

        if (match[0].match(/nov|november/i)) {
          month = 10
          day = parseInt(match[1])
        } else if (match[0].match(/\d{1,2}[\/\-\.]\d{1,2}/)) {
          const parts = match[0].split(/[\/\-\.]/)
          month = parseInt(parts[0]) - 1
          day = parseInt(parts[1])
        } else {
          day = parseInt(match[1])
          // Try to infer month from context (default to current or next month)
          month = now.getMonth()
        }

        if (month !== null && day !== null && day >= 1 && day <= 31) {
          const date = new Date(currentYear, month, day)
          // If date is in the past, assume next year
          if (date < now) {
            date.setFullYear(currentYear + 1)
          }
          return date.toISOString().split('T')[0]
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }
  }

  return null
}

/**
 * Extract course codes (e.g., "ECE 260", "CS 101")
 */
function extractCourseCode(text: string): string | null {
  const pattern = /\b([A-Z]{2,4})\s*(\d{3,4})\b/i
  const match = text.match(pattern)
  if (match) {
    return `${match[1].toUpperCase()} ${match[2]}`
  }
  return null
}

/**
 * Extract names (simple heuristic: capitalized words after "I'm", "my name is", etc.)
 */
function extractName(text: string): string | null {
  const patterns = [
    /(?:i'?m|im|i am)\s+([A-Z][a-z]+)/,
    /(?:my name is|call me|name is)\s+([A-Z][a-z]+)/,
    /(?:this is|it's)\s+([A-Z][a-z]+)/,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      // Filter out common false positives
      const name = match[1].trim()
      const falsePositives = ['The', 'A', 'An', 'This', 'That', 'Here', 'There', 'Today', 'Tomorrow']
      if (!falsePositives.includes(name) && name.length > 2) {
        return name
      }
    }
  }

  return null
}

/**
 * Extract city names (simple heuristic: "in [City]", "from [City]")
 */
function extractCity(text: string): string | null {
  const patterns = [
    /(?:in|from|live in|based in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }

  return null
}

/**
 * Extract preferences (e.g., "don't use emojis", "call me X")
 */
function extractPreference(text: string): { key: string; value: string | boolean } | null {
  const lowerText = text.toLowerCase()

  // Emoji preference
  if (lowerText.match(/(?:don'?t|never|avoid|no)\s+(?:use|send|put).*?emoji/i)) {
    return { key: 'preference.no_emojis', value: true }
  }

  // Name preference
  const nameMatch = lowerText.match(/(?:call me|prefer to be called|name is)\s+([a-z]+)/i)
  if (nameMatch && nameMatch[1]) {
    return { key: 'preference.name', value: nameMatch[1] }
  }

  return null
}

/**
 * Extract exam/test dates
 */
function extractExamInfo(text: string): { course?: string; date?: string } | null {
  const courseCode = extractCourseCode(text)
  const date = extractDate(text)
  
  if (courseCode || date) {
    return { course: courseCode || undefined, date: date || undefined }
  }
  
  return null
}

/**
 * Extract travel/event information
 */
function extractTravelInfo(text: string): { type: string; date?: string; destination?: string } | null {
  const lowerText = text.toLowerCase()
  const hasTravel = /(?:flying|leaving|going|traveling|trip|vacation|break)/i.test(text)
  
  if (hasTravel) {
    const date = extractDate(text)
    
    // Try to extract destination
    const destMatch = text.match(/(?:to|going to|traveling to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/)
    const destination = destMatch ? destMatch[1] : undefined
    
    return {
      type: lowerText.includes('reading break') ? 'reading_break' : 'travel',
      date,
      destination,
    }
  }
  
  return null
}

/**
 * Main extraction function - analyzes user message and extracts memories
 */
export function extractMemories(
  userMessage: string,
  replyType: 'open' | 'closed' | 'silence',
  turnNumber: number
): ExtractedMemory[] {
  const memories: ExtractedMemory[] = []

  // Skip extraction for very short or closed replies
  if (replyType === 'closed' || replyType === 'silence' || userMessage.length < 10) {
    return memories
  }

  const lowerMessage = userMessage.toLowerCase()

  // Extract name
  const name = extractName(userMessage)
  if (name) {
    memories.push({
      key: 'user.name',
      value: name,
      type: 'fact',
      confidence: 0.9,
    })
  }

  // Extract course codes
  const courseCode = extractCourseCode(userMessage)
  if (courseCode) {
    memories.push({
      key: `course.${courseCode.toLowerCase().replace(/\s+/g, '_')}`,
      value: courseCode,
      type: 'fact',
      confidence: 0.8,
    })

    // Check for exam/test mentions
    if (/(?:exam|test|quiz|midterm|final)/i.test(userMessage)) {
      const examDate = extractDate(userMessage)
      if (examDate) {
        memories.push({
          key: `exam.${courseCode.toLowerCase().replace(/\s+/g, '_')}.date`,
          value: examDate,
          type: 'event',
          confidence: 0.7,
          metadata: { course: courseCode },
        })
      }
    }
  }

  // Extract dates for travel/events
  const travelInfo = extractTravelInfo(userMessage)
  if (travelInfo) {
    if (travelInfo.date) {
      memories.push({
        key: `${travelInfo.type}.leave_date`,
        value: travelInfo.date,
        type: 'event',
        confidence: 0.8,
        metadata: { destination: travelInfo.destination },
      })
    }
    if (travelInfo.destination) {
      memories.push({
        key: `${travelInfo.type}.destination`,
        value: travelInfo.destination,
        type: 'fact',
        confidence: 0.7,
      })
    }
  }

  // Extract standalone dates
  const date = extractDate(userMessage)
  if (date && !travelInfo) {
    // Only store if it seems like a meaningful date (not just a random mention)
    if (/(?:exam|test|deadline|due|event|meeting|appointment|leaving|flying)/i.test(userMessage)) {
      memories.push({
        key: 'event.upcoming_date',
        value: date,
        type: 'event',
        confidence: 0.6,
      })
    }
  }

  // Extract city
  const city = extractCity(userMessage)
  if (city) {
    memories.push({
      key: 'user.city',
      value: city,
      type: 'fact',
      confidence: 0.7,
    })
  }

  // Extract preferences
  const preference = extractPreference(userMessage)
  if (preference) {
    memories.push({
      key: preference.key,
      value: preference.value,
      type: 'preference',
      confidence: 0.8,
    })
  }

  // Extract achievements/outcomes (grades, results)
  const gradeMatch = userMessage.match(/\b(got|received|scored)\s+(\d{1,3})[%\s]*(?:on|in|for)?\s*(?:quiz|test|exam|assignment)?\s*(\d+|#\d+)?/i)
  if (gradeMatch) {
    const score = parseInt(gradeMatch[2])
    const item = gradeMatch[4] || 'unknown'
    memories.push({
      key: `achievement.${item}`,
      value: score,
      type: 'event',
      confidence: 0.7,
      metadata: { item },
    })
  }

  // Extract favorite artists/entertainment
  const artistMatch = userMessage.match(/(?:favorite|favourite|love|like)\s+(?:artist|musician|band|song).*?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i)
  if (artistMatch) {
    memories.push({
      key: 'preference.favorite_artist',
      value: artistMatch[1],
      type: 'preference',
      confidence: 0.6,
    })
  }

  return memories
}

/**
 * Extract goals from user message (separate from regular memory extraction)
 * This will be called separately in the chat API to add goals to the database
 */
export function extractGoalsFromMessage(userMessage: string): Array<{
  description: string
  targetDate?: string
  confidence: number
}> {
  // Use goal tracking utilities directly
  const goalTracking = require('./goal-tracking')
  return goalTracking.extractGoals(userMessage)
}

/**
 * Generate episode description from user message and context
 */
export function generateEpisode(userMessage: string, aiReply?: string): string | null {
  // Only create episodes for meaningful open responses
  if (userMessage.length < 20) {
    return null
  }

  // Create a concise description
  const lowerMessage = userMessage.toLowerCase()
  
  // Skip if it's just a greeting or acknowledgment
  if (/^(hi|hello|hey|yeah|yes|no|ok|okay|sure|thanks|thank you)$/i.test(userMessage.trim())) {
    return null
  }

  // Summarize the conversation topic
  let topic = 'conversation'
  
  if (lowerMessage.includes('studying') || lowerMessage.includes('exam') || lowerMessage.includes('quiz')) {
    topic = 'study'
  } else if (lowerMessage.includes('travel') || lowerMessage.includes('flying') || lowerMessage.includes('leaving')) {
    topic = 'travel'
  } else if (lowerMessage.includes('course') || lowerMessage.includes('class')) {
    topic = 'academic'
  } else if (lowerMessage.includes('buy') || lowerMessage.includes('purchase')) {
    topic = 'purchase'
  }

  // Create a brief summary (first 50 chars)
  const summary = userMessage.substring(0, 50).trim()
  
  return `${topic}: ${summary}${summary.length < userMessage.length ? '...' : ''}`
}

/**
 * Extract memories using LLM for comprehensive fact extraction
 * This catches things that pattern matching might miss: personal facts, hobbies, interests, work details, family info, etc.
 */
export async function extractMemoriesWithLLM(
  userMessage: string,
  replyType: 'open' | 'closed' | 'silence',
  openaiClient: any // OpenAI client instance
): Promise<ExtractedMemory[]> {
  // Skip extraction for very short or closed replies
  if (replyType === 'closed' || replyType === 'silence' || userMessage.length < 15) {
    return []
  }

  // Skip if it's just a greeting or acknowledgment
  if (/^(hi|hello|hey|yeah|yes|no|ok|okay|sure|thanks|thank you|yep|nope)$/i.test(userMessage.trim())) {
    return []
  }

  try {
    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini', // Use mini for faster, cheaper extraction
      messages: [
        {
          role: 'system',
          content: `You are a memory extraction assistant. Extract any meaningful facts, preferences, or personal information from the user's message. 

Extract:
- Personal facts (name, age, location, job, school, major, etc.)
- Hobbies and interests (sports, music, games, activities they enjoy)
- Family and relationships (family members, friends, pets mentioned)
- Preferences (likes, dislikes, favorite things)
- Ongoing situations (current projects, plans, goals)
- Any other personal details that would be worth remembering

For each extracted memory, provide:
- key: A concise, hierarchical key (e.g., "user.occupation", "preference.favorite_food", "family.pet_name")
- value: The actual value (string, number, or boolean)
- type: "fact", "preference", or "event"
- confidence: 0.0-1.0 based on how clear/explicit the information is

Return a JSON object with a "memories" key containing an array of memory objects. If nothing meaningful is found, return {"memories": []}.

Examples:
- "I work at Google" -> {"memories": [{"key": "user.occupation", "value": "Google", "type": "fact", "confidence": 0.9}]}
- "I have a dog named Max" -> {"memories": [{"key": "family.pet_name", "value": "Max", "type": "fact", "confidence": 0.9}, {"key": "family.has_pet", "value": "dog", "type": "fact", "confidence": 0.9}]}
- "I love pizza" -> {"memories": [{"key": "preference.favorite_food", "value": "pizza", "type": "preference", "confidence": 0.8}]}
- "I'm studying computer science" -> {"memories": [{"key": "user.major", "value": "computer science", "type": "fact", "confidence": 0.9}]}

Be comprehensive but accurate. Don't extract things that are vague or uncertain.`
        },
        {
          role: 'user',
          content: userMessage
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent extraction
      max_tokens: 500,
      response_format: { type: 'json_object' }
    })

    const responseText = completion.choices[0]?.message?.content
    if (!responseText) {
      return []
    }

    // Parse JSON response
    const parsed = JSON.parse(responseText)
    
    // Extract memories array from the response
    const memoriesArray = parsed.memories || parsed.data || (Array.isArray(parsed) ? parsed : [])
    
    if (!Array.isArray(memoriesArray)) {
      return []
    }

    // Convert to ExtractedMemory format
    return memoriesArray
      .filter((m: any) => m.key && m.value !== undefined && m.type && m.confidence !== undefined)
      .map((m: any) => ({
        key: m.key,
        value: m.value,
        type: m.type as 'fact' | 'event' | 'preference',
        confidence: Math.min(1.0, Math.max(0.0, m.confidence)),
        metadata: m.metadata || {}
      }))
      .filter((m: ExtractedMemory) => m.confidence >= 0.5) // Only keep reasonably confident extractions

  } catch (error) {
    console.warn('[Memory Extract] LLM extraction failed:', error)
    return [] // Fail gracefully - pattern-based extraction will still work
  }
}

