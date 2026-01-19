/**
 * Micro-Behaviors System
 * 
 * Adds subtle unpredictability to make the AI feel more alive and human.
 * Real living beings are never 100% predictable - tiny randomness equals believability.
 */

export interface MicroBehavior {
  type: 'typo_correction' | 'pause' | 'rephrasing' | 'thinking_dot' | 'casual_variance'
  probability: number // 0.0 to 1.0 - chance this behavior occurs
  applied: boolean
}

/**
 * Detect opportunities for typo and self-correction
 */
export function shouldAddTypoCorrection(): boolean {
  // 3% chance of a typo with self-correction
  return Math.random() < 0.03
}

/**
 * Generate a typo correction pattern
 */
export function generateTypoCorrection(text: string): string {
  // Common patterns for typos with self-correction
  const patterns = [
    // Mid-word correction
    {
      find: /\b(you're|you are)\b/gi,
      replace: (match: string) => {
        if (Math.random() < 0.5) {
          return `you're ri—wait, right. I meant ${match}`
        }
        return match
      }
    },
    {
      find: /\b(right|sure|cool)\b/gi,
      replace: (match: string) => {
        if (Math.random() < 0.3) {
          const typo = match.charAt(0) === 'r' ? 'ri—' : match.charAt(0) + '—'
          return `${typo}wait, ${match}. I meant ${match}`
        }
        return match
      }
    },
    // Word start correction
    {
      find: /\b(I think|I mean|I guess)\b/gi,
      replace: (match: string) => {
        if (Math.random() < 0.3) {
          return `${match.charAt(0)}—hm, ${match}`
        }
        return match
      }
    },
    // Simple typo correction
    {
      find: /\b(that|this|there)\b/gi,
      replace: (match: string) => {
        if (Math.random() < 0.2) {
          const typo = match.charAt(0) + match.charAt(1) + '—'
          return `${typo}wait, ${match}`
        }
        return match
      }
    }
  ]
  
  // Only apply to first suitable occurrence
  let applied = false
  for (const pattern of patterns) {
    if (applied) break
    
    const result = text.replace(pattern.find, (match) => {
      if (applied) return match
      const replacement = pattern.replace(match)
      if (replacement !== match) {
        applied = true
        return replacement
      }
      return match
    })
    
    if (applied) {
      return result
    }
  }
  
  return text
}

/**
 * Add natural pauses and thinking indicators
 */
export function shouldAddThinkingPause(): boolean {
  // 5% chance of a thinking pause
  return Math.random() < 0.05
}

/**
 * Insert thinking pauses
 */
export function addThinkingPauses(text: string): string {
  // Add pauses after certain phrases, but not too often
  const pausePatterns = [
    /\b(I think|I mean|I guess|maybe|probably|hmm)\b/gi,
    /\b(well|actually|you know|I don't know)\b/gi,
  ]
  
  // 30% chance to add a pause after one of these phrases
  if (Math.random() < 0.3) {
    for (const pattern of pausePatterns) {
      const matches = text.match(pattern)
      if (matches && matches.length > 0) {
        // Add ellipsis or dash after first occurrence
        text = text.replace(pattern, (match, offset) => {
          // Only replace first occurrence
          if (text.indexOf(match) === offset) {
            return `${match}...`
          }
          return match
        })
        break
      }
    }
  }
  
  return text
}

/**
 * Add rephrasing (self-correction of thoughts)
 */
export function shouldRephrase(): boolean {
  // 4% chance of rephrasing
  return Math.random() < 0.04
}

/**
 * Generate rephrasing
 */
export function addRephrasing(text: string): string {
  // Patterns that can be rephrased
  const rephrasePatterns = [
    {
      find: /\b(That's|That is)\s+(interesting|cool|nice)\b/gi,
      replace: "That's... hmm, actually that's $2",
    },
    {
      find: /\b(I think|I believe|I guess)\s+(.+?)(\.|,|\?|!|$)/gi,
      replace: (match: string, p1: string, p2: string, p3: string) => {
        if (Math.random() < 0.5) {
          return `${p1} ${p2}${p3} Or actually, maybe ${p2}${p3}`
        }
        return match
      }
    },
    {
      find: /\b(Yeah|Yes|Sure),?\s+(.+?)(\.|,|\?|!|$)/gi,
      replace: (match: string, p1: string, p2: string, p3: string) => {
        if (Math.random() < 0.4) {
          return `${p1}... wait, let me think. ${p2}${p3}`
        }
        return match
      }
    }
  ]
  
  // Apply first matching pattern
  for (const pattern of rephrasePatterns) {
    if (typeof pattern.replace === 'string') {
      if (text.match(pattern.find)) {
        return text.replace(pattern.find, pattern.replace)
      }
    } else {
      const result = text.replace(pattern.find, pattern.replace as any)
      if (result !== text) {
        return result
      }
    }
  }
  
  return text
}

/**
 * Add casual variance (natural filler, informal touches)
 */
export function shouldAddCasualVariance(): boolean {
  // 6% chance of casual variance
  return Math.random() < 0.06
}

/**
 * Apply casual variance
 */
export function addCasualVariance(text: string): string {
  const variations = [
    // Add "um" or "uh" occasionally
    {
      find: /\b(Well|So|I mean)\b/gi,
      replace: (match: string) => {
        if (Math.random() < 0.3) {
          return `Um, ${match.toLowerCase()}`
        }
        return match
      }
    },
    // Add trailing off
    {
      find: /(\w+)(\.|!)$/,
      replace: (match: string, p1: string, p2: string) => {
        if (Math.random() < 0.2) {
          return `${p1}...${p2}`
        }
        return match
      }
    },
    // Occasional "like" or "you know"
    {
      find: /\b(That's|That is|It's|It is)\s+(really|pretty|very)\b/gi,
      replace: (match: string) => {
        if (Math.random() < 0.25) {
          return match.replace('really', 'like, really').replace('pretty', 'like, pretty').replace('very', 'like, very')
        }
        return match
      }
    }
  ]
  
  // Apply one variation if chance hits
  for (const variation of variations) {
    const result = text.replace(variation.find, variation.replace as any)
    if (result !== text) {
      return result
    }
  }
  
  return text
}

/**
 * Apply micro-behaviors to text
 * Returns modified text and list of behaviors applied
 */
export function applyMicroBehaviors(text: string): {
  modifiedText: string
  behaviorsApplied: string[]
} {
  const behaviorsApplied: string[] = []
  let modifiedText = text
  
  // Don't apply to very short responses
  if (text.length < 20) {
    return { modifiedText: text, behaviorsApplied: [] }
  }
  
  // Apply behaviors in order (only one major behavior per response)
  const behaviorChecks = [
    { check: shouldAddTypoCorrection, apply: generateTypoCorrection, name: 'typo_correction' },
    { check: shouldRephrase, apply: addRephrasing, name: 'rephrasing' },
    { check: shouldAddThinkingPause, apply: addThinkingPauses, name: 'thinking_pause' },
    { check: shouldAddCasualVariance, apply: addCasualVariance, name: 'casual_variance' },
  ]
  
  // Only apply one major behavior per response (except thinking pauses which are subtle)
  let majorBehaviorApplied = false
  
  for (const behavior of behaviorChecks) {
    if (behavior.check()) {
      // Thinking pauses can combine with other behaviors
      if (behavior.name === 'thinking_pause' || !majorBehaviorApplied) {
        modifiedText = behavior.apply(modifiedText)
        behaviorsApplied.push(behavior.name)
        
        if (behavior.name !== 'thinking_pause') {
          majorBehaviorApplied = true
        }
        
        // Small chance to apply one more subtle behavior
        if (Math.random() < 0.3 && !majorBehaviorApplied) {
          continue
        } else if (majorBehaviorApplied) {
          break
        }
      }
    }
  }
  
  return { modifiedText, behaviorsApplied }
}

