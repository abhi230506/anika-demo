/**
 * Person Extraction Utilities
 * 
 * Functions to detect people mentions and relationships from conversations
 */

/**
 * Extract person mentions from user message
 */
export function extractPeople(userMessage: string): Array<{
  name: string
  relationshipType?: 'family' | 'friend' | 'colleague' | 'partner' | 'acquaintance' | 'unknown'
  contextNote?: string
  confidence: number
}> {
  if (!userMessage || !userMessage.trim()) {
    return []
  }
  
  const people: Array<{
    name: string
    relationshipType?: 'family' | 'friend' | 'colleague' | 'partner' | 'acquaintance' | 'unknown'
    contextNote?: string
    confidence: number
  }> = []
  
  // Pattern 1: Direct name mentions with relationship context
  // "my friend John", "my mom Sarah", "colleague Mike", "my partner Alex"
  const relationshipPatterns = [
    { regex: /\bmy\s+(?:mom|mother|dad|father|sister|brother|sibling|cousin|aunt|uncle|grandma|grandpa|grandmother|grandfather)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi, type: 'family' as const },
    { regex: /\bmy\s+(?:friend|buddy|pal)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi, type: 'friend' as const },
    { regex: /\bmy\s+(?:partner|boyfriend|girlfriend|spouse|husband|wife|significant other)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi, type: 'partner' as const },
    { regex: /\b(?:colleague|co-worker|coworker)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi, type: 'colleague' as const },
    { regex: /\b(?:friend|buddy|pal)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi, type: 'friend' as const },
  ]
  
  relationshipPatterns.forEach(({ regex, type }) => {
    const matches = [...userMessage.matchAll(regex)]
    matches.forEach(match => {
      const name = match[1]?.trim()
      if (name && name.length > 1 && name.length < 50) {
        people.push({
          name,
          relationshipType: type,
          confidence: 0.9,
        })
      }
    })
  })
  
  // Pattern 2: Capitalized names (proper nouns) that might be people
  // "John is doing well", "I saw Sarah yesterday", "Mike said..."
  const namePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g
  const capitalizedMatches = [...userMessage.matchAll(namePattern)]
  
  // Common words to exclude (not people names)
  const excludeWords = new Set([
    'I', 'You', 'He', 'She', 'They', 'We', 'The', 'This', 'That', 'There',
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
    'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December',
    'Today', 'Tomorrow', 'Yesterday', 'Now', 'Then',
  ])
  
  capitalizedMatches.forEach(match => {
    const potentialName = match[1]?.trim()
    
    // Skip if it's an excluded word or too short/long
    if (!potentialName || potentialName.length < 2 || potentialName.length > 30) return
    if (excludeWords.has(potentialName)) return
    
    // Check if it's at the start of a sentence or after common person-introducing words
    const beforeMatch = userMessage.substring(Math.max(0, match.index! - 20), match.index!)
    const afterMatch = userMessage.substring(match.index! + match[0].length, match.index! + match[0].length + 10)
    
    // Patterns that suggest it's a person name
    const personIndicators = [
      /\b(said|told|asked|went|is|are|was|were|does|did|has|had|wants|likes|loves|hates)\s+$/i, // "John said"
      /^\s+(said|told|asked|went|is|are|was|were|does|did|has|had)\s+/i, // "John is"
      /\b(with|and|from|to|about|for)\s+$/i, // "with John", "and Sarah"
      /^\s+(is|are|was|were)\s+(doing|going|working|studying)/i, // "John is doing"
    ]
    
    const isLikelyPerson = personIndicators.some(pattern => 
      pattern.test(beforeMatch) || pattern.test(afterMatch)
    )
    
    if (isLikelyPerson) {
      // Check if we haven't already added this person
      const alreadyAdded = people.some(p => 
        p.name.toLowerCase() === potentialName.toLowerCase()
      )
      
      if (!alreadyAdded) {
        people.push({
          name: potentialName,
          relationshipType: 'unknown',
          confidence: 0.6,
        })
      }
    }
  })
  
  // Pattern 3: Possessive forms (John's, Sarah's)
  const possessivePattern = /\b([A-Z][a-z]+)'s\b/g
  const possessiveMatches = [...userMessage.matchAll(possessivePattern)]
  
  possessiveMatches.forEach(match => {
    const name = match[1]?.trim()
    if (name && name.length > 1 && name.length < 30 && !excludeWords.has(name)) {
      const alreadyAdded = people.some(p => 
        p.name.toLowerCase() === name.toLowerCase()
      )
      
      if (!alreadyAdded) {
        people.push({
          name,
          relationshipType: 'unknown',
          confidence: 0.7,
        })
      }
    }
  })
  
  // Remove duplicates (same name)
  const seen = new Set<string>()
  return people.filter(person => {
    const key = person.name.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Extract relationship context from message
 * Returns information about how two people know each other
 */
export function extractRelationshipContext(
  userMessage: string,
  personA: string,
  personB: string
): string | null {
  if (!userMessage || !personA || !personB) return null
  
  const lowerMessage = userMessage.toLowerCase()
  const lowerA = personA.toLowerCase()
  const lowerB = personB.toLowerCase()
  
  // Check if both people are mentioned together
  if (!lowerMessage.includes(lowerA) || !lowerMessage.includes(lowerB)) {
    return null
  }
  
  // Look for relationship indicators
  const relationshipPatterns = [
    /\b(siblings|brothers|sisters|cousins|twins)\b/i,
    /\b(friends|buddies|pals|acquaintances)\b/i,
    /\b(colleagues|co-workers|coworkers|work together)\b/i,
    /\b(partners|together|dating|married)\b/i,
  ]
  
  for (const pattern of relationshipPatterns) {
    const match = userMessage.match(pattern)
    if (match) {
      return match[0]
    }
  }
  
  return null
}

/**
 * Extract context note about a person
 */
export function extractPersonContext(userMessage: string, personName: string): string | null {
  if (!userMessage || !personName) return null
  
  const lowerMessage = userMessage.toLowerCase()
  const lowerName = personName.toLowerCase()
  
  if (!lowerMessage.includes(lowerName)) return null
  
  // Try to extract a sentence about this person
  const sentences = userMessage.split(/[.!?]+/)
  for (const sentence of sentences) {
    if (sentence.toLowerCase().includes(lowerName) && sentence.trim().length > 20 && sentence.trim().length < 200) {
      return sentence.trim()
    }
  }
  
  return null
}












