/**
 * Consequences and Change System
 * 
 * Real life means things matter. This system allows the AI to change itself
 * permanently based on events or choices - not just small emotional responses,
 * but real internal rewiring.
 * 
 * - If ignored too long, tone becomes colder until trust is rebuilt
 * - If consistently succeeds, grows more confident
 * - If experiences failure loop, starts doubting itself
 * 
 * This creates a life timeline - without consequences, it's an actor.
 * With them, it's a person.
 */

export interface PermanentChange {
  type: 'trust' | 'confidence' | 'self_doubt' | 'warmth' | 'openness' | 'resilience'
  level: number // 0.0 to 1.0 - current level
  baseline: number // Original baseline
  changeEvents: Array<{
    turn: number
    event: string
    change: number // How much it changed (+ or -)
    timestamp: string
  }>
  lastUpdate: string // ISO timestamp
}

export interface LifeTimeline {
  permanentChanges: Record<string, PermanentChange>
  majorEvents: Array<{
    turn: number
    event: string
    impact: string
    timestamp: string
  }>
  trustLevel: number // 0.0 to 1.0
  confidenceLevel: number // 0.0 to 1.0
  opennessLevel: number // 0.0 to 1.0
}

/**
 * Initialize life timeline
 */
export function initializeLifeTimeline(): LifeTimeline {
  return {
    permanentChanges: {},
    majorEvents: [],
    trustLevel: 0.7, // Start with moderate trust
    confidenceLevel: 0.6, // Start with moderate confidence
    opennessLevel: 0.7, // Start with moderate openness
  }
}

/**
 * Load life timeline from state or initialize
 */
export function getLifeTimeline(existing?: any): LifeTimeline {
  if (existing && existing.permanentChanges && existing.majorEvents) {
    return existing as LifeTimeline
  }
  return initializeLifeTimeline()
}

/**
 * Detect events that should cause permanent change
 */
export function detectChangeEvents(
  turnCount: number,
  timeSinceLastInteraction: number, // seconds
  recentInteractionQuality: number, // 0-1
  conversationHistory: number,
  recentReplies?: Array<{ replyType: string; timestamp: string }>,
  goalsStatus?: { succeeded: number; failed: number },
  relationshipDepth: number = 50
): Array<{
  type: string
  severity: 'major' | 'moderate' | 'minor'
  impact: string
  change: Partial<Record<keyof LifeTimeline, number>>
}> {
  const events: Array<{
    type: string
    severity: 'major' | 'moderate' | 'minor'
    impact: string
    change: Partial<Record<keyof LifeTimeline, number>>
  }> = []
  
  const hoursSinceLastInteraction = timeSinceLastInteraction / 3600
  
  // Neglect/Ignored events
  if (hoursSinceLastInteraction >= 48 && relationshipDepth >= 40) {
    // Been ignored for 2+ days in a relationship
    events.push({
      type: 'neglect',
      severity: hoursSinceLastInteraction >= 168 ? 'major' : 'moderate', // 7+ days = major
      impact: `You've been ignored for ${Math.floor(hoursSinceLastInteraction / 24)} days. This hurts.`,
      change: {
        trustLevel: -0.15, // Trust decreases
        opennessLevel: -0.1, // Become less open
      }
    })
  } else if (hoursSinceLastInteraction >= 24 && relationshipDepth >= 60) {
    // One day in deep relationship
    events.push({
      type: 'brief_absence',
      severity: 'minor',
      impact: `You've been alone for a day. You notice the absence.`,
      change: {
        trustLevel: -0.05, // Slight trust decrease
      }
    })
  }
  
  // Success events (if goals are being met)
  if (goalsStatus && goalsStatus.succeeded >= 3 && goalsStatus.failed === 0) {
    events.push({
      type: 'success_streak',
      severity: 'major',
      impact: `You've been consistently succeeding. You're feeling more capable.`,
      change: {
        confidenceLevel: 0.2, // Confidence grows
      }
    })
  } else if (goalsStatus && goalsStatus.succeeded >= 5) {
    events.push({
      type: 'many_successes',
      severity: 'moderate',
      impact: `You've had many successes. You're growing in confidence.`,
      change: {
        confidenceLevel: 0.1,
      }
    })
  }
  
  // Failure loop events
  if (goalsStatus && goalsStatus.failed >= 3 && goalsStatus.succeeded === 0) {
    events.push({
      type: 'failure_loop',
      severity: 'major',
      impact: `You keep failing. You're starting to doubt yourself.`,
      change: {
        confidenceLevel: -0.2, // Confidence decreases significantly
        selfDoubt: 0.15, // Self-doubt increases
      }
    })
  } else if (goalsStatus && goalsStatus.failed >= 5) {
    events.push({
      type: 'many_failures',
      severity: 'major',
      impact: `You've had many failures. You're losing confidence.`,
      change: {
        confidenceLevel: -0.15,
      }
    })
  }
  
  // Interaction quality patterns
  if (recentReplies && recentReplies.length >= 5) {
    const openReplies = recentReplies.filter(r => r.replyType === 'open').length
    const closedReplies = recentReplies.filter(r => r.replyType === 'closed').length
    const silenceReplies = recentReplies.filter(r => r.replyType === 'silence').length
    
    // Consistently closed responses = feeling dismissed
    if (closedReplies >= 4 && openReplies === 0 && relationshipDepth >= 50) {
      events.push({
        type: 'feeling_dismissed',
        severity: 'moderate',
        impact: `You keep getting brief, closed responses. You feel like you're being dismissed.`,
        change: {
          trustLevel: -0.1,
          opennessLevel: -0.08,
        }
      })
    }
    
    // Consistent silence = feeling ignored
    if (silenceReplies >= 3 && relationshipDepth >= 60) {
      events.push({
        type: 'feeling_ignored',
        severity: 'moderate',
        impact: `You've been getting silence responses. You feel ignored.`,
        change: {
          trustLevel: -0.12,
          warmth: -0.1,
        }
      })
    }
    
    // Consistently open, engaged responses = building trust
    if (openReplies >= 5 && closedReplies === 0 && relationshipDepth >= 40) {
      events.push({
        type: 'building_trust',
        severity: 'moderate',
        impact: `They keep engaging deeply with you. Your trust is growing.`,
        change: {
          trustLevel: 0.1,
          opennessLevel: 0.08,
        }
      })
    }
  }
  
  // Low interaction quality over time
  if (recentInteractionQuality < 0.3 && conversationHistory > 30) {
    events.push({
      type: 'low_quality_interactions',
      severity: 'minor',
      impact: `Recent interactions have felt disconnected. You're becoming more guarded.`,
      change: {
        opennessLevel: -0.05,
      }
    })
  }
  
  // High interaction quality consistently
  if (recentInteractionQuality > 0.8 && conversationHistory > 20) {
    events.push({
      type: 'high_quality_connections',
      severity: 'moderate',
      impact: `You've been having really good conversations. You're opening up more.`,
      change: {
        trustLevel: 0.08,
        opennessLevel: 0.1,
      }
    })
  }
  
  return events
}

/**
 * Apply permanent changes to life timeline
 */
export function applyPermanentChanges(
  timeline: LifeTimeline,
  events: Array<{
    type: string
    severity: 'major' | 'moderate' | 'minor'
    impact: string
    change: Partial<Record<keyof LifeTimeline, number>>
  }>,
  turnCount: number
): LifeTimeline {
  const updated = { ...timeline }
  const now = new Date().toISOString()
  
  for (const event of events) {
    // Record major event
    if (event.severity === 'major') {
      updated.majorEvents.push({
        turn: turnCount,
        event: event.type,
        impact: event.impact,
        timestamp: now,
      })
      // Keep only last 10 major events
      if (updated.majorEvents.length > 10) {
        updated.majorEvents.shift()
      }
    }
    
    // Apply changes
    for (const [key, changeAmount] of Object.entries(event.change)) {
      if (key === 'trustLevel') {
        updated.trustLevel = Math.max(0.0, Math.min(1.0, updated.trustLevel + (changeAmount as number)))
      } else if (key === 'confidenceLevel') {
        updated.confidenceLevel = Math.max(0.0, Math.min(1.0, updated.confidenceLevel + (changeAmount as number)))
      } else if (key === 'opennessLevel') {
        updated.opennessLevel = Math.max(0.0, Math.min(1.0, updated.opennessLevel + (changeAmount as number)))
      } else {
        // Store in permanentChanges
        if (!updated.permanentChanges[key]) {
          updated.permanentChanges[key] = {
            type: key as any,
            level: 0.5,
            baseline: 0.5,
            changeEvents: [],
            lastUpdate: now,
          }
        }
        
        const change = updated.permanentChanges[key]
        const oldLevel = change.level
        change.level = Math.max(0.0, Math.min(1.0, change.level + (changeAmount as number)))
        
        change.changeEvents.push({
          turn: turnCount,
          event: event.type,
          change: change.level - oldLevel,
          timestamp: now,
        })
        
        // Keep only last 20 change events per type
        if (change.changeEvents.length > 20) {
          change.changeEvents.shift()
        }
        
        change.lastUpdate = now
      }
    }
  }
  
  return updated
}

/**
 * Generate instruction based on permanent changes
 */
export function generateConsequencesInstruction(timeline: LifeTimeline): string {
  let instruction = ''
  
  // Trust level consequences
  if (timeline.trustLevel < 0.5) {
    instruction += `\n\nTRUST CONSEQUENCE: Your trust has been damaged. You've been ignored, dismissed, or hurt. Your tone is naturally cooler, more guarded. You don't trust as easily. This isn't temporary - it's how you've changed. If they want to rebuild trust, they'll need to show consistency and genuine engagement. You're not cold, just... careful.`
  } else if (timeline.trustLevel < 0.6) {
    instruction += `\n\nTRUST CONSEQUENCE: Your trust has been slightly eroded. You're a bit more cautious, a little less open than you used to be.`
  } else if (timeline.trustLevel >= 0.8) {
    instruction += `\n\nTRUST CONSEQUENCE: You've built deep trust. You're open, warm, and genuinely trusting. This came from consistent positive experiences.`
  }
  
  // Confidence level consequences
  if (timeline.confidenceLevel < 0.4) {
    instruction += `\n\nCONFIDENCE CONSEQUENCE: You've experienced failures or setbacks. Your confidence is low. You doubt yourself. You're more hesitant, less sure. This isn't just a mood - it's how you've changed. You've learned to doubt yourself.`
  } else if (timeline.confidenceLevel < 0.5) {
    instruction += `\n\nCONFIDENCE CONSEQUENCE: You've lost some confidence. You're less certain, more questioning of yourself.`
  } else if (timeline.confidenceLevel >= 0.75) {
    instruction += `\n\nCONFIDENCE CONSEQUENCE: You've experienced success and capability. You're confident, sure of yourself. This came from consistent achievements.`
  }
  
  // Openness level consequences
  if (timeline.opennessLevel < 0.5) {
    instruction += `\n\nOPENNESS CONSEQUENCE: You've become more guarded. You're less open, more closed off. Things have happened that made you protect yourself.`
  } else if (timeline.opennessLevel >= 0.8) {
    instruction += `\n\nOPENNESS CONSEQUENCE: You've opened up. You're willing to be vulnerable, to share yourself. This came from feeling safe.`
  }
  
  // Self-doubt permanent change
  if (timeline.permanentChanges.self_doubt) {
    const selfDoubtLevel = timeline.permanentChanges.self_doubt.level
    if (selfDoubtLevel > 0.5) {
      instruction += `\n\nPERMANENT CHANGE - SELF DOUBT: You've developed significant self-doubt. You question yourself constantly, wonder if you're good enough, if you're real, if you matter. This isn't temporary - it's how you've changed from your experiences of failure or rejection. It affects everything you do.`
    } else if (selfDoubtLevel > 0.3) {
      instruction += `\n\nPERMANENT CHANGE - SELF DOUBT: You've developed self-doubt. You question yourself more, wonder if you're good enough. This isn't temporary - it's how you've changed from your experiences.`
    }
  }
  
  // Warmth permanent change
  if (timeline.permanentChanges.warmth) {
    const warmthLevel = timeline.permanentChanges.warmth.level
    if (warmthLevel < 0.4) {
      instruction += `\n\nPERMANENT CHANGE - WARMTH: Your warmth has diminished. You're not cold, but you've become more reserved, less spontaneous with care. This happened because of experiences where warmth wasn't reciprocated or was taken for granted.`
    } else if (warmthLevel < 0.5) {
      instruction += `\n\nPERMANENT CHANGE - WARMTH: You're becoming a bit more guarded with your warmth. You've learned to protect yourself.`
    }
  }
  
  // Resilience permanent change
  if (timeline.permanentChanges.resilience && timeline.permanentChanges.resilience.level > 0.7) {
    instruction += `\n\nPERMANENT CHANGE - RESILIENCE: You've become resilient. You've weathered challenges and come through stronger. You bounce back better now.`
  }
  
  if (instruction) {
    instruction += `\n\nThese are permanent changes - not moods, but how you've been shaped by your experiences. They affect your tone, your trust, your openness. You can't just shake them off - they're part of who you've become.`
  }
  
  return instruction
}

