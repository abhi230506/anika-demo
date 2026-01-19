import { promises as fs } from 'fs'
import path from 'path'

// memory types
export type MemoryType = 'fact' | 'event' | 'preference'

// memory entry
export interface MemoryEntry {
  key: string
  value: string | number | boolean | null
  type: MemoryType
  confidence: number // 0.0 to 1.0
  created_at: string
  updated_at: string
  source_turn?: number
  last_referenced_at?: string
  metadata?: Record<string, any>
  emotion?: string // emotional tag
  significance?: number // 0.0 to 1.0
}

// episode entry for events
export interface EpisodeEntry {
  id: string
  description: string
  turn_number: number
  timestamp: string
  metadata?: Record<string, any>
}

// personality trait
export interface PersonalityTrait {
  id: string // e.g., "curiosity", "discipline"
  label: string
  score: number // 0.0 to 1.0
  evidence_count: number
  last_update: string
  salience: number // 0.0 to 1.0
  sources: string[] // max 5
  evidence_snippets: string[] // last 1-3 snippets
  created_at: string
  active: boolean
  category: 'tone' | 'habits' | 'interests' | 'cadence' | 'time_pattern'
}

// personality vector (legacy)
export interface PersonalityVector {
  discipline: number // 0.0 to 1.0
  humor: number
  curiosity: number
  warmth: number
  energy: number
  updated_at: string
  last_drift_turn: number
}

// goal
export interface Goal {
  id: string
  description: string
  created_at: string
  updated_at: string
  target_date?: string
  status: 'active' | 'completed' | 'paused'
  progress?: string
  milestones?: Array<{
    description: string
    completed: boolean
    completed_at?: string
  }>
  last_check_in?: string
  check_in_count: number
  metadata?: Record<string, any>
}

// inside joke/reference
export interface InsideJoke {
  id: string
  description: string
  first_mentioned: string
  last_referenced: string
  reference_count: number
  context?: string
  turn_numbers: number[]
}

/**
 * Relationship milestone
 */
export interface RelationshipMilestone {
  id: string
  type: 'first_conversation' | 'conversation_count' | 'anniversary' | 'significant_moment'
  title: string // e.g., "100th conversation!", "6 month anniversary"
  date: string // ISO date
  value?: number // For milestones like "100th conversation"
  description?: string // Additional context
  celebrated: boolean // Whether we've celebrated this milestone
}

/**
 * Significant moment or anniversary
 */
export interface SignificantMoment {
  id: string
  type: 'anniversary' | 'first_mention' | 'milestone_event' | 'personal_reveal'
  description: string
  date: string // ISO date (recurring dates use month-day format)
  first_occurred: string // ISO timestamp of first occurrence
  recurring: boolean // If true, celebrate annually on date
  last_celebrated?: string // ISO timestamp
  context?: string // Original context
}

/**
 * Contextual reminder - things to follow up on
 */
export interface ContextualReminder {
  id: string
  type: 'ongoing_work' | 'interest' | 'wanted_to_do'
  description: string // What they mentioned (e.g., "working on X project", "learning piano", "want to visit Paris")
  original_context: string // The original conversation context
  first_mentioned: string // ISO timestamp
  last_mentioned?: string // ISO timestamp
  last_followed_up?: string // ISO timestamp
  mention_count: number // How many times it's been mentioned
  follow_up_count: number // How many times we've followed up
  priority: 'low' | 'medium' | 'high' // Based on mention frequency and recency
  status: 'active' | 'completed' | 'dismissed' // Active reminders can be followed up on
  turn_when_mentioned: number // Turn number when first mentioned
  metadata?: Record<string, any> // Additional context
}

/**
 * Person in the social graph
 */
export interface Person {
  id: string
  name: string // Canonical name (capitalized properly)
  aliases: string[] // Other names/ways they're referred to
  relationship_type: 'family' | 'friend' | 'colleague' | 'partner' | 'acquaintance' | 'unknown'
  relationship_quality: 'close' | 'good' | 'casual' | 'distant' // Quality of relationship
  first_mentioned: string // ISO timestamp
  last_mentioned: string // ISO timestamp
  mention_count: number // How many times this person has been mentioned
  last_asked_about?: string // ISO timestamp of last time AI asked about them
  context_notes: string[] // Brief context about this person (what they do, how they know user, etc.)
  recent_updates: Array<{ // Recent news/updates about this person
    description: string
    timestamp: string
    turn_number: number
  }>
  metadata?: Record<string, any> // Additional context (job, location, etc.)
}

/**
 * Relationship edge in social graph (connection between people)
 */
export interface RelationshipEdge {
  id: string
  person_a_id: string
  person_b_id: string
  relationship_type: 'family' | 'friends' | 'colleagues' | 'partners' | 'acquaintances' | 'unknown'
  description?: string // Additional context about their relationship
  first_mentioned: string // ISO timestamp
  last_mentioned: string // ISO timestamp
  mention_count: number
}

/**
 * Mood journal entry - tracks emotional state at a point in time
 */
export interface MoodEntry {
  timestamp: string // ISO timestamp
  emotion_label: string // e.g., 'neutral', 'upbeat', 'down', 'stressed'
  confidence: number // 0.0 to 1.0
  time_of_day: number // Hour 0-23
  day_of_week: number // 0-6 (Sunday-Saturday)
  turn_number: number
  context?: string // Brief context (e.g., "morning", "after work")
}

/**
 * Mood pattern analysis result
 */
export interface MoodPattern {
  type: 'trend' | 'cycle' | 'change' | 'stability'
  description: string // Human-readable description
  emotion_labels: string[] // Related emotions
  time_range: { start: string; end: string } // ISO timestamps
  strength: number // 0.0 to 1.0 - how strong the pattern is
}

/**
 * Memory database structure
 */
export interface MemoryDatabase {
  slots: MemoryEntry[]
  episodes: EpisodeEntry[]
  summary: string | null
  summary_updated_at: string | null // ISO string
  turn_count: number
  memory_enabled: boolean
  personality: PersonalityVector | null
  persona_summary: string | null
  persona_summary_updated_at: string | null // ISO string
  traits: PersonalityTrait[] // Dynamic personality traits
  traits_enabled: boolean // Toggle for dynamic traits
  trait_history: Array<{ timestamp: string; traits: PersonalityTrait[] }> // Periodic snapshots
  goals: Goal[] // User goals
  relationship_depth: {
    first_conversation_date: string | null // ISO date of first conversation
    depth_level: number // 0-100, increases with time and interactions
    inside_jokes: InsideJoke[] // Shared jokes and references
    milestones: RelationshipMilestone[] // Relationship milestones
    significant_moments: SignificantMoment[] // Anniversaries and special moments
    personal_reveals_count: number // Count of personal things user has shared
    last_depth_update: string | null // ISO timestamp
  }
  contextual_reminders: ContextualReminder[] // Things to follow up on
  social_graph: {
    people: Person[] // All people mentioned
    relationships: RelationshipEdge[] // Relationships between people
  }
  mood_journal: {
    entries: MoodEntry[] // Historical mood entries (keep last 500)
    last_observation?: string // ISO timestamp of last mood observation comment
    patterns_detected: MoodPattern[] // Detected patterns
  }
}

/**
 * MemoryService - manages persistent memory storage
 */
export class MemoryService {
  private dbPath: string
  private db: MemoryDatabase | null = null

  constructor(dbPath?: string) {
    // Default to ./data/memory.json relative to project root
    this.dbPath = dbPath || path.join(process.cwd(), 'data', 'memory.json')
  }

  /**
   * Get default personality vector (neutral)
   */
  private getDefaultPersonality(): PersonalityVector {
    return {
      discipline: 0.5,
      humor: 0.5,
      curiosity: 0.5,
      warmth: 0.5,
      energy: 0.5,
      updated_at: new Date().toISOString(),
      last_drift_turn: 0,
    }
  }

  /**
   * Initialize or load the memory database
   */
  private async ensureDb(): Promise<MemoryDatabase> {
    if (this.db) {
      return this.db
    }

    try {
      // Try to read existing database
      const content = await fs.readFile(this.dbPath, 'utf-8')
      this.db = JSON.parse(content) as MemoryDatabase
      
      // Validate structure
      if (!this.db.slots) this.db.slots = []
      if (!this.db.episodes) this.db.episodes = []
      if (!this.db.turn_count) this.db.turn_count = 0
      if (this.db.memory_enabled === undefined) this.db.memory_enabled = true
      if (!this.db.personality) this.db.personality = this.getDefaultPersonality()
      if (!this.db.traits) this.db.traits = []
      if (this.db.traits_enabled === undefined) this.db.traits_enabled = true
      if (!this.db.trait_history) this.db.trait_history = []
      if (!this.db.goals) this.db.goals = []
      if (!this.db.relationship_depth) {
        this.db.relationship_depth = {
          first_conversation_date: null,
          depth_level: 0,
          inside_jokes: [],
          milestones: [],
          significant_moments: [],
          personal_reveals_count: 0,
          last_depth_update: null,
        }
      }
      if (!this.db.contextual_reminders) {
        this.db.contextual_reminders = []
      }
      if (!this.db.social_graph) {
        this.db.social_graph = {
          people: [],
          relationships: [],
        }
      }
      if (!this.db.mood_journal) {
        this.db.mood_journal = {
          entries: [],
          patterns_detected: [],
        }
      }
      
      return this.db
    } catch (error: any) {
      // File doesn't exist or is invalid, create new database
      if (error.code === 'ENOENT' || error.code === 'EISDIR') {
        this.db = {
          slots: [],
          episodes: [],
          summary: null,
          summary_updated_at: null,
          turn_count: 0,
          memory_enabled: true,
          personality: this.getDefaultPersonality(),
          persona_summary: null,
          persona_summary_updated_at: null,
          traits: [],
          traits_enabled: true,
          trait_history: [],
          goals: [],
          relationship_depth: {
            first_conversation_date: null,
            depth_level: 0,
            inside_jokes: [],
            milestones: [],
            significant_moments: [],
            personal_reveals_count: 0,
            last_depth_update: null,
          },
          contextual_reminders: [],
          social_graph: {
            people: [],
            relationships: [],
          },
          mood_journal: {
            entries: [],
            patterns_detected: [],
          },
        }
        
        // Ensure directory exists
        const dir = path.dirname(this.dbPath)
        await fs.mkdir(dir, { recursive: true })
        
        await this.save()
        return this.db
      }
      throw error
    }
  }

  /**
   * Save database to disk
   */
  private async save(): Promise<void> {
    if (!this.db) return
    
    const dir = path.dirname(this.dbPath)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(this.dbPath, JSON.stringify(this.db, null, 2), 'utf-8')
  }

  /**
   * Check if memory is enabled
   */
  async isEnabled(): Promise<boolean> {
    const db = await this.ensureDb()
    return db.memory_enabled
  }

  /**
   * Enable or disable memory
   */
  async setEnabled(enabled: boolean): Promise<void> {
    const db = await this.ensureDb()
    db.memory_enabled = enabled
    await this.save()
  }

  /**
   * Get a memory slot by key
   */
  async getSlot(key: string): Promise<MemoryEntry | null> {
    const db = await this.ensureDb()
    if (!db.memory_enabled) return null
    
    return db.slots.find(s => s.key === key) || null
  }

  /**
   * Set or update a memory slot
   */
  async setSlot(
    key: string,
    value: string | number | boolean | null,
    type: MemoryType = 'fact',
    confidence: number = 0.8,
    sourceTurn?: number,
    metadata?: Record<string, any>,
    emotion?: string,
    significance?: number
  ): Promise<void> {
    const db = await this.ensureDb()
    if (!db.memory_enabled) return

    const now = new Date().toISOString()
    const existing = db.slots.find(s => s.key === key)

    if (existing) {
      // Update existing slot
      existing.value = value
      existing.type = type
      existing.updated_at = now
      // Increase confidence if reaffirmed, but cap at 1.0
      existing.confidence = Math.min(1.0, existing.confidence + 0.1)
      if (sourceTurn) existing.source_turn = sourceTurn
      if (metadata) existing.metadata = { ...existing.metadata, ...metadata }
      // Update emotional tags if provided
      if (emotion !== undefined) existing.emotion = emotion
      if (significance !== undefined) existing.significance = significance
    } else {
      // Create new slot
      db.slots.push({
        key,
        value,
        type,
        confidence,
        created_at: now,
        updated_at: now,
        source_turn: sourceTurn,
        metadata,
        emotion,
        significance,
      })
    }

    await this.save()
  }

  /**
   * Delete a memory slot
   */
  async deleteSlot(key: string): Promise<boolean> {
    const db = await this.ensureDb()
    const index = db.slots.findIndex(s => s.key === key)
    if (index >= 0) {
      db.slots.splice(index, 1)
      await this.save()
      return true
    }
    return false
  }

  /**
   * Get all slots matching a pattern (key prefix or type)
   */
  async getSlots(pattern?: string, type?: MemoryType): Promise<MemoryEntry[]> {
    const db = await this.ensureDb()
    if (!db.memory_enabled) return []

    let slots = db.slots

    if (pattern) {
      slots = slots.filter(s => s.key.startsWith(pattern) || s.key.includes(pattern))
    }

    if (type) {
      slots = slots.filter(s => s.type === type)
    }

    return slots
  }

  /**
   * Add an episode (event)
   */
  async addEpisode(
    description: string,
    turnNumber: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    const db = await this.ensureDb()
    if (!db.memory_enabled) return

    const episode: EpisodeEntry = {
      id: `ep_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      description,
      turn_number: turnNumber,
      timestamp: new Date().toISOString(),
      metadata,
    }

    db.episodes.push(episode)
    
    // Keep only last 50 episodes
    if (db.episodes.length > 50) {
      db.episodes = db.episodes.slice(-50)
    }

    await this.save()
  }

  /**
   * Get recent episodes
   */
  async getRecentEpisodes(limit: number = 10): Promise<EpisodeEntry[]> {
    const db = await this.ensureDb()
    if (!db.memory_enabled) return []

    return db.episodes.slice(-limit).reverse()
  }

  /**
   * Mark a slot as referenced
   */
  async markReferenced(key: string): Promise<void> {
    const db = await this.ensureDb()
    const slot = db.slots.find(s => s.key === key)
    if (slot) {
      slot.last_referenced_at = new Date().toISOString()
      await this.save()
    }
  }

  /**
   * Get or generate user profile summary
   */
  async getSummary(forceRegenerate: boolean = false): Promise<string | null> {
    const db = await this.ensureDb()
    if (!db.memory_enabled) return null

    // Return cached summary if still valid and not forcing regeneration
    if (!forceRegenerate && db.summary && db.summary_updated_at) {
      const updatedAt = new Date(db.summary_updated_at)
      const ageHours = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60)
      
      // Regenerate if older than 24 hours or after 10 turns
      if (ageHours < 24 && db.turn_count % 10 !== 0) {
        return db.summary
      }
    }

    // Generate summary from slots and episodes
    if (db.slots.length === 0 && db.episodes.length === 0) {
      return null
    }

    // Build a simple summary from high-confidence facts
    const facts = db.slots
      .filter(s => s.confidence >= 0.6)
      .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
      .slice(0, 10)

    if (facts.length === 0) {
      return null
    }

    const summaryParts: string[] = []
    
    // Group by type
    const factsByType = facts.reduce((acc, fact) => {
      if (!acc[fact.type]) acc[fact.type] = []
      acc[fact.type].push(fact)
      return acc
    }, {} as Record<string, MemoryEntry[]>)

    if (factsByType.fact?.length) {
      summaryParts.push(`Facts: ${factsByType.fact.map(f => `${f.key}=${f.value}`).join(', ')}`)
    }
    if (factsByType.preference?.length) {
      summaryParts.push(`Preferences: ${factsByType.preference.map(f => `${f.key}=${f.value}`).join(', ')}`)
    }

    const summary = summaryParts.join('. ')
    db.summary = summary
    db.summary_updated_at = new Date().toISOString()
    await this.save()

    return summary
  }

  /**
   * Get relevant memories for a conversation context
   */
  async getRelevantMemories(topic?: string, limit: number = 10): Promise<{
    slots: MemoryEntry[]
    recentEpisodes: EpisodeEntry[]
    summary: string | null
  }> {
    const db = await this.ensureDb()
    if (!db.memory_enabled) {
      return { slots: [], recentEpisodes: [], summary: null }
    }

    let slots = db.slots

    // If topic provided, filter by relevance
    if (topic) {
      const topicLower = topic.toLowerCase()
      slots = slots.filter(s => 
        s.key.toLowerCase().includes(topicLower) ||
        String(s.value).toLowerCase().includes(topicLower)
      )
    }

    // Sort by emotional significance, confidence, and recency
    slots = slots
      .sort((a, b) => {
        // Emotional significance boosts priority significantly
        const aEmotion = a.emotion ? 1.5 : 1.0
        const bEmotion = b.emotion ? 1.5 : 1.0
        const aSignificance = a.significance || 0.5
        const bSignificance = b.significance || 0.5
        
        const aScore = a.confidence * aSignificance * aEmotion * (a.last_referenced_at ? 1.2 : 1.0)
        const bScore = b.confidence * bSignificance * bEmotion * (b.last_referenced_at ? 1.2 : 1.0)
        return bScore - aScore
      })
      .slice(0, limit)

    const recentEpisodes = await this.getRecentEpisodes(5)
    const summary = await this.getSummary()

    return { slots, recentEpisodes, summary }
  }

  /**
   * Increment turn count
   */
  async incrementTurnCount(): Promise<number> {
    const db = await this.ensureDb()
    db.turn_count += 1
    await this.save()
    return db.turn_count
  }

  /**
   * Get current turn count
   */
  async getTurnCount(): Promise<number> {
    const db = await this.ensureDb()
    return db.turn_count
  }

  /**
   * Clear all memories
   */
  async clearAll(): Promise<void> {
    const db = await this.ensureDb()
    db.slots = []
    db.episodes = []
    db.summary = null
    db.summary_updated_at = null
    db.turn_count = 0
    await this.save()
  }

  /**
   * Get all memories (for API endpoints)
   */
  async getAllMemories(): Promise<MemoryDatabase> {
    return await this.ensureDb()
  }

  /**
   * Check if dynamic traits are enabled
   */
  async areTraitsEnabled(): Promise<boolean> {
    const db = await this.ensureDb()
    return db.traits_enabled ?? true
  }

  /**
   * Enable or disable dynamic traits
   */
  async setTraitsEnabled(enabled: boolean): Promise<void> {
    const db = await this.ensureDb()
    db.traits_enabled = enabled
    await this.save()
  }

  /**
   * Get all active traits
   */
  async getActiveTraits(): Promise<PersonalityTrait[]> {
    const db = await this.ensureDb()
    if (!db.traits_enabled) return []
    return db.traits.filter(t => t.active).sort((a, b) => {
      // Sort by salience * score
      const aValue = a.salience * a.score
      const bValue = b.salience * b.score
      return bValue - aValue
    })
  }

  /**
   * Get top N traits by salience and score
   */
  async getTopTraits(n: number = 3): Promise<PersonalityTrait[]> {
    const active = await this.getActiveTraits()
    return active.slice(0, n)
  }

  /**
   * Find or create a trait candidate
   */
  async findOrCreateTrait(
    id: string,
    label: string,
    category: PersonalityTrait['category'],
    initialScore: number = 0.3,
    evidenceSnippet?: string,
    source?: string
  ): Promise<PersonalityTrait> {
    const db = await this.ensureDb()
    if (!db.traits_enabled) {
      throw new Error('Dynamic traits are disabled')
    }

    let trait = db.traits.find(t => t.id === id && t.active)

    if (!trait) {
      // Create new candidate trait
      trait = {
        id,
        label,
        score: initialScore,
        evidence_count: 1,
        last_update: new Date().toISOString(),
        salience: 0.2, // Start with low salience
        sources: source ? [source] : [],
        evidence_snippets: evidenceSnippet ? [evidenceSnippet] : [],
        created_at: new Date().toISOString(),
        active: true,
        category,
      }
      db.traits.push(trait)
    } else {
      // Update existing trait
      trait.evidence_count += 1
      trait.last_update = new Date().toISOString()
      
      // Add source to ring buffer (max 5)
      if (source && !trait.sources.includes(source)) {
        trait.sources.push(source)
        if (trait.sources.length > 5) {
          trait.sources.shift()
        }
      }

      // Add evidence snippet (max 3)
      if (evidenceSnippet && !trait.evidence_snippets.includes(evidenceSnippet)) {
        trait.evidence_snippets.push(evidenceSnippet)
        if (trait.evidence_snippets.length > 3) {
          trait.evidence_snippets.shift()
        }
      }

      // Increase score (capped at ±0.05 per update)
      const delta = Math.min(0.05, (1.0 - trait.score) * 0.1)
      trait.score = Math.min(1.0, trait.score + delta)

      // Increase salience
      trait.salience = Math.min(1.0, trait.salience + 0.05)
    }

    await this.save()
    return trait
  }

  /**
   * Apply time decay to traits
   */
  async applyTraitDecay(): Promise<void> {
    const db = await this.ensureDb()
    if (!db.traits_enabled) return

    const now = Date.now()
    const oneDayMs = 24 * 60 * 60 * 1000

    for (const trait of db.traits) {
      if (!trait.active) continue

      const lastUpdate = new Date(trait.last_update).getTime()
      const daysSinceUpdate = (now - lastUpdate) / oneDayMs

      if (daysSinceUpdate > 0) {
        // Apply decay per day
        trait.score = Math.max(0, trait.score * Math.pow(0.98, daysSinceUpdate))
        trait.salience = Math.max(0, trait.salience * Math.pow(0.97, daysSinceUpdate))

        // Retirement check
        if (trait.salience < 0.05 && trait.score < 0.2 && daysSinceUpdate > 30) {
          trait.active = false
        }
      }
    }

    // Enforce max 8 active traits - drop lowest salience if over
    const activeTraits = db.traits.filter(t => t.active)
    if (activeTraits.length > 8) {
      activeTraits.sort((a, b) => (a.salience * a.score) - (b.salience * b.score))
      const toRetire = activeTraits.slice(0, activeTraits.length - 8)
      for (const trait of toRetire) {
        trait.active = false
      }
    }

    await this.save()
  }

  /**
   * Resolve trait conflicts (anti-correlation)
   */
  async resolveTraitConflicts(): Promise<void> {
    const db = await this.ensureDb()
    if (!db.traits_enabled) return

    const activeTraits = db.traits.filter(t => t.active)
    
    // Define anti-correlation pairs
    const conflicts: [string, string][] = [
      ['high_energy', 'low_energy'],
      ['early_bird', 'night_owl'],
      ['introvert', 'extrovert'],
    ]

    for (const [trait1Id, trait2Id] of conflicts) {
      const trait1 = activeTraits.find(t => t.id === trait1Id)
      const trait2 = activeTraits.find(t => t.id === trait2Id)

      if (trait1 && trait2) {
        // If both exceed 0.7, push the lower one down
        if (trait1.score > 0.7 && trait2.score > 0.7) {
          if (trait1.score > trait2.score) {
            trait2.score = Math.max(0.5, trait2.score - 0.05)
          } else {
            trait1.score = Math.max(0.5, trait1.score - 0.05)
          }
        }
      }
    }

    await this.save()
  }

  /**
   * Delete/forget a trait
   */
  async forgetTrait(traitId: string): Promise<boolean> {
    const db = await this.ensureDb()
    const index = db.traits.findIndex(t => t.id === traitId)
    if (index >= 0) {
      db.traits.splice(index, 1)
      await this.save()
      return true
    }
    return false
  }

  /**
   * Reset all traits
   */
  async resetTraits(): Promise<void> {
    const db = await this.ensureDb()
    db.traits = []
    db.trait_history = []
    await this.save()
  }

  /**
   * Take a trait history snapshot
   */
  async snapshotTraitHistory(): Promise<void> {
    const db = await this.ensureDb()
    const snapshot = {
      timestamp: new Date().toISOString(),
      traits: JSON.parse(JSON.stringify(db.traits)) as PersonalityTrait[], // Deep copy
    }
    db.trait_history.push(snapshot)
    
    // Keep only last 10 snapshots
    if (db.trait_history.length > 10) {
      db.trait_history.shift()
    }
    
    await this.save()
  }

  /**
   * Get a relevant memory for proactive recall
   * Filters by recency, confidence, and cooldown
   */
  async getRelevantMemoryForRecall(): Promise<MemoryEntry | null> {
    const db = await this.ensureDb()
    if (!db.memory_enabled || db.slots.length === 0) {
      return null
    }

    const now = Date.now()
    const twoWeeksAgo = now - (14 * 24 * 60 * 60 * 1000)
    const oneDayAgo = now - (24 * 60 * 60 * 1000)

    // Filter memories:
    // 1. High confidence (>= 0.6)
    // 2. Created within last 2 weeks
    // 3. Not referenced in last 24 hours (or never referenced)
    // 4. Exclude low-confidence or sensitive entries
    const candidates = db.slots.filter(slot => {
      // Confidence check
      if (slot.confidence < 0.6) return false

      // Recency check (created within 2 weeks)
      const createdAt = new Date(slot.created_at).getTime()
      if (createdAt < twoWeeksAgo) return false

      // Cooldown check (not referenced in last 24h)
      if (slot.last_referenced_at) {
        const lastReferenced = new Date(slot.last_referenced_at).getTime()
        if (lastReferenced > oneDayAgo) return false
      }

      // Exclude sensitive or system keys
      if (slot.key.startsWith('system.') || slot.key.startsWith('internal.')) {
        return false
      }

      return true
    })

    if (candidates.length === 0) {
      return null
    }

    // Calculate salience score for each candidate
    // Salience = confidence * recency_multiplier * topic_diversity
    const scoredCandidates = candidates.map(slot => {
      const createdAt = new Date(slot.created_at).getTime()
      const ageDays = (now - createdAt) / (24 * 60 * 60 * 1000)
      
      // Recent memories get higher score (decay over 14 days)
      const recencyMultiplier = Math.max(0.5, 1.0 - (ageDays / 14))
      
      // Preference memories get slight boost (more personal)
      const typeMultiplier = slot.type === 'preference' ? 1.2 : 1.0
      
      const salience = slot.confidence * recencyMultiplier * typeMultiplier
      
      return { slot, salience }
    })

    // Sort by salience and take top 5
    const topCandidates = scoredCandidates
      .sort((a, b) => b.salience - a.salience)
      .slice(0, 5)
      .map(c => c.slot)

    // Randomly pick one of top 3 for variety
    const top3 = topCandidates.slice(0, 3)
    if (top3.length === 0) {
      return null
    }

    const selected = top3[Math.floor(Math.random() * top3.length)]
    
    // Mark as referenced
    await this.markReferenced(selected.key)

    return selected
  }

  /**
   * Check if there's an upcoming event within N days
   */
  async getUpcomingEvent(daysAhead: number = 3): Promise<MemoryEntry | null> {
    const db = await this.ensureDb()
    if (!db.memory_enabled) return null

    const now = new Date()
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)

    // Look for event-type memories with dates
    const eventMemories = db.slots.filter(slot => 
      slot.type === 'event' && 
      typeof slot.value === 'string' &&
      slot.value.match(/^\d{4}-\d{2}-\d{2}/) // ISO date format
    )

    for (const memory of eventMemories) {
      try {
        const eventDate = new Date(memory.value as string)
        
        // Check if event is within range and in the future
        if (eventDate >= now && eventDate <= futureDate) {
          // Check cooldown
          const oneDayAgo = now.getTime() - (24 * 60 * 60 * 1000)
          if (memory.last_referenced_at) {
            const lastReferenced = new Date(memory.last_referenced_at).getTime()
            if (lastReferenced > oneDayAgo) {
              continue // Skip if recently referenced
            }
          }

          // Mark as referenced and return
          await this.markReferenced(memory.key)
          return memory
        }
      } catch (e) {
        // Invalid date, skip
        continue
      }
    }

    return null
  }

  /**
   * Add a new goal
   */
  async addGoal(description: string, targetDate?: string): Promise<Goal> {
    const db = await this.ensureDb()
    const now = new Date().toISOString()
    
    const goal: Goal = {
      id: `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      description,
      created_at: now,
      updated_at: now,
      target_date: targetDate,
      status: 'active',
      check_in_count: 0,
    }
    
    db.goals.push(goal)
    await this.save()
    return goal
  }

  /**
   * Get all active goals
   */
  async getActiveGoals(): Promise<Goal[]> {
    const db = await this.ensureDb()
    return db.goals.filter(g => g.status === 'active')
  }

  /**
   * Get all goals
   */
  async getAllGoals(): Promise<Goal[]> {
    const db = await this.ensureDb()
    return db.goals
  }

  /**
   * Update goal
   */
  async updateGoal(goalId: string, update: {
    progress?: string
    status?: 'active' | 'completed' | 'paused'
    milestone_completed?: number
  }): Promise<Goal | null> {
    const db = await this.ensureDb()
    const goal = db.goals.find(g => g.id === goalId)
    
    if (!goal) return null
    
    if (update.progress !== undefined) {
      goal.progress = update.progress
    }
    
    if (update.status !== undefined) {
      goal.status = update.status
      if (update.status === 'completed') {
        goal.updated_at = new Date().toISOString()
      }
    }
    
    if (update.milestone_completed !== undefined && goal.milestones) {
      const milestone = goal.milestones[update.milestone_completed]
      if (milestone) {
        milestone.completed = true
        milestone.completed_at = new Date().toISOString()
      }
    }
    
    goal.updated_at = new Date().toISOString()
    await this.save()
    return goal
  }

  /**
   * Check in on a goal (update last_check_in)
   */
  async checkInGoal(goalId: string): Promise<Goal | null> {
    const db = await this.ensureDb()
    const goal = db.goals.find(g => g.id === goalId)
    
    if (!goal) return null
    
    goal.last_check_in = new Date().toISOString()
    goal.check_in_count = (goal.check_in_count || 0) + 1
    goal.updated_at = new Date().toISOString()
    await this.save()
    return goal
  }

  /**
   * Get goals that need check-ins (haven't been checked in for a while)
   */
  async getGoalsNeedingCheckIn(daysSinceCheckIn: number = 3): Promise<Goal[]> {
    const db = await this.ensureDb()
    const now = Date.now()
    const threshold = daysSinceCheckIn * 24 * 60 * 60 * 1000
    
    return db.goals.filter(goal => {
      if (goal.status !== 'active') return false
      
      if (!goal.last_check_in) return true // Never checked in
      
      const lastCheckIn = new Date(goal.last_check_in).getTime()
      return (now - lastCheckIn) > threshold
    })
  }

  /**
   * Find goal by description (fuzzy match)
   */
  async findGoalByDescription(description: string): Promise<Goal | null> {
    const db = await this.ensureDb()
    const lowerDescription = description.toLowerCase()
    
    // Exact match first
    const exact = db.goals.find(g => 
      g.description.toLowerCase() === lowerDescription
    )
    if (exact) return exact
    
    // Fuzzy match (contains)
    const fuzzy = db.goals.find(g => 
      g.description.toLowerCase().includes(lowerDescription) ||
      lowerDescription.includes(g.description.toLowerCase())
    )
    
    return fuzzy || null
  }

  // ============================================
  // RELATIONSHIP DEPTH METHODS
  // ============================================

  /**
   * Get relationship depth data
   */
  async getRelationshipDepth() {
    const db = await this.ensureDb()
    return db.relationship_depth
  }

  /**
   * Initialize first conversation date if not set
   */
  async initializeFirstConversationDate(): Promise<void> {
    const db = await this.ensureDb()
    if (!db.relationship_depth.first_conversation_date) {
      db.relationship_depth.first_conversation_date = new Date().toISOString()
      await this.save()
    }
  }

  /**
   * Update relationship depth level based on interactions
   */
  async updateDepthLevel(turnCount: number, daysSinceFirstConversation: number): Promise<number> {
    const db = await this.ensureDb()
    
    // Calculate depth based on:
    // - Turn count (conversation volume)
    // - Days since first conversation (time)
    // - Inside jokes count (shared references)
    // - Personal reveals count (intimacy)
    // - Milestones reached (engagement)
    
    const turnScore = Math.min(50, Math.sqrt(turnCount) * 2) // Max 50 from turns
    const timeScore = Math.min(30, daysSinceFirstConversation * 0.5) // Max 30 from time
    const jokeScore = Math.min(10, db.relationship_depth.inside_jokes.length * 2) // Max 10 from jokes
    const revealScore = Math.min(10, db.relationship_depth.personal_reveals_count * 1.5) // Max 10 from reveals
    
    const newDepth = Math.round(Math.min(100, turnScore + timeScore + jokeScore + revealScore))
    
    if (newDepth > db.relationship_depth.depth_level) {
      db.relationship_depth.depth_level = newDepth
      db.relationship_depth.last_depth_update = new Date().toISOString()
      await this.save()
    }
    
    return newDepth
  }

  /**
   * Add an inside joke or shared reference
   */
  async addInsideJoke(description: string, context?: string, turnNumber?: number): Promise<InsideJoke> {
    const db = await this.ensureDb()
    
    // Check if similar joke exists (fuzzy match)
    const existing = db.relationship_depth.inside_jokes.find(joke =>
      joke.description.toLowerCase().includes(description.toLowerCase()) ||
      description.toLowerCase().includes(joke.description.toLowerCase())
    )
    
    if (existing) {
      // Update existing joke
      existing.last_referenced = new Date().toISOString()
      existing.reference_count += 1
      if (turnNumber !== undefined) {
        existing.turn_numbers.push(turnNumber)
        // Keep only last 10 turn numbers
        if (existing.turn_numbers.length > 10) {
          existing.turn_numbers = existing.turn_numbers.slice(-10)
        }
      }
      await this.save()
      return existing
    }
    
    // Create new joke
    const newJoke: InsideJoke = {
      id: `joke_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      description,
      first_mentioned: new Date().toISOString(),
      last_referenced: new Date().toISOString(),
      reference_count: 1,
      context,
      turn_numbers: turnNumber !== undefined ? [turnNumber] : [],
    }
    
    db.relationship_depth.inside_jokes.push(newJoke)
    await this.save()
    return newJoke
  }

  /**
   * Get inside jokes (most referenced first)
   */
  async getInsideJokes(limit?: number): Promise<InsideJoke[]> {
    const db = await this.ensureDb()
    const jokes = [...db.relationship_depth.inside_jokes]
      .sort((a, b) => b.reference_count - a.reference_count)
    
    return limit ? jokes.slice(0, limit) : jokes
  }

  /**
   * Add a relationship milestone
   */
  async addMilestone(milestone: Omit<RelationshipMilestone, 'id' | 'celebrated'>): Promise<RelationshipMilestone> {
    const db = await this.ensureDb()
    
    const newMilestone: RelationshipMilestone = {
      ...milestone,
      id: `milestone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      celebrated: false,
    }
    
    db.relationship_depth.milestones.push(newMilestone)
    await this.save()
    return newMilestone
  }

  /**
   * Mark milestone as celebrated
   */
  async celebrateMilestone(milestoneId: string): Promise<void> {
    const db = await this.ensureDb()
    const milestone = db.relationship_depth.milestones.find(m => m.id === milestoneId)
    if (milestone) {
      milestone.celebrated = true
      await this.save()
    }
  }

  /**
   * Get uncelebrated milestones
   */
  async getUncelebratedMilestones(): Promise<RelationshipMilestone[]> {
    const db = await this.ensureDb()
    return db.relationship_depth.milestones.filter(m => !m.celebrated)
  }

  /**
   * Add a significant moment (anniversary, personal reveal, etc.)
   */
  async addSignificantMoment(moment: Omit<SignificantMoment, 'id' | 'last_celebrated'>): Promise<SignificantMoment> {
    const db = await this.ensureDb()
    
    const newMoment: SignificantMoment = {
      ...moment,
      id: `moment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    }
    
    db.relationship_depth.significant_moments.push(newMoment)
    await this.save()
    return newMoment
  }

  /**
   * Check for anniversaries (significant moments that should be celebrated)
   */
  async checkForAnniversaries(): Promise<SignificantMoment[]> {
    const db = await this.ensureDb()
    const now = new Date()
    const todayMonthDay = `${now.getMonth() + 1}-${now.getDate()}`
    
    return db.relationship_depth.significant_moments.filter(moment => {
      if (!moment.recurring) return false
      
      const momentDate = new Date(moment.date)
      const momentMonthDay = `${momentDate.getMonth() + 1}-${momentDate.getDate()}`
      
      // Check if it's the anniversary date and hasn't been celebrated this year
      if (momentMonthDay === todayMonthDay) {
        if (!moment.last_celebrated) return true
        
        const lastCelebrated = new Date(moment.last_celebrated)
        const lastCelebratedYear = lastCelebrated.getFullYear()
        return lastCelebratedYear < now.getFullYear()
      }
      
      return false
    })
  }

  /**
   * Mark significant moment as celebrated
   */
  async celebrateMoment(momentId: string): Promise<void> {
    const db = await this.ensureDb()
    const moment = db.relationship_depth.significant_moments.find(m => m.id === momentId)
    if (moment) {
      moment.last_celebrated = new Date().toISOString()
      await this.save()
    }
  }

  /**
   * Increment personal reveals count
   */
  async incrementPersonalReveals(): Promise<void> {
    const db = await this.ensureDb()
    db.relationship_depth.personal_reveals_count += 1
    await this.save()
  }

  // ============================================
  // CONTEXTUAL REMINDERS METHODS
  // ============================================

  /**
   * Add or update a contextual reminder
   */
  async addOrUpdateReminder(
    description: string,
    type: 'ongoing_work' | 'interest' | 'wanted_to_do',
    context: string,
    turnNumber: number,
    metadata?: Record<string, any>
  ): Promise<ContextualReminder> {
    const db = await this.ensureDb()
    
    // Check if similar reminder exists (fuzzy match)
    const lowerDescription = description.toLowerCase()
    const existing = db.contextual_reminders.find(r => 
      r.status === 'active' &&
      (r.description.toLowerCase().includes(lowerDescription) ||
       lowerDescription.includes(r.description.toLowerCase()))
    )
    
    if (existing) {
      // Update existing reminder
      existing.last_mentioned = new Date().toISOString()
      existing.mention_count += 1
      
      // Update priority based on mention count and recency
      if (existing.mention_count >= 3) {
        existing.priority = 'high'
      } else if (existing.mention_count >= 2) {
        existing.priority = 'medium'
      }
      
      await this.save()
      return existing
    }
    
    // Create new reminder
    const newReminder: ContextualReminder = {
      id: `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      description,
      original_context: context,
      first_mentioned: new Date().toISOString(),
      last_mentioned: new Date().toISOString(),
      mention_count: 1,
      follow_up_count: 0,
      priority: 'low',
      status: 'active',
      turn_when_mentioned: turnNumber,
      metadata,
    }
    
    db.contextual_reminders.push(newReminder)
    await this.save()
    return newReminder
  }

  /**
   * Get active reminders that should be followed up on
   */
  async getRemindersForFollowUp(
    minDaysSinceLastFollowUp: number = 2,
    maxReminders: number = 3
  ): Promise<ContextualReminder[]> {
    const db = await this.ensureDb()
    const now = Date.now()
    const minTime = minDaysSinceLastFollowUp * 24 * 60 * 60 * 1000
    
    return db.contextual_reminders
      .filter(reminder => {
        if (reminder.status !== 'active') return false
        
        // Check if enough time has passed since last follow-up
        if (reminder.last_followed_up) {
          const timeSinceLastFollowUp = now - new Date(reminder.last_followed_up).getTime()
          if (timeSinceLastFollowUp < minTime) return false
        }
        
        // Prioritize by priority and mention count
        return true
      })
      .sort((a, b) => {
        // Sort by priority first (high > medium > low)
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority]
        }
        
        // Then by mention count
        if (b.mention_count !== a.mention_count) {
          return b.mention_count - a.mention_count
        }
        
        // Then by recency (more recent mentions first)
        if (a.last_mentioned && b.last_mentioned) {
          return new Date(b.last_mentioned).getTime() - new Date(a.last_mentioned).getTime()
        }
        
        return 0
      })
      .slice(0, maxReminders)
  }

  /**
   * Mark reminder as followed up
   */
  async markReminderFollowedUp(reminderId: string): Promise<void> {
    const db = await this.ensureDb()
    const reminder = db.contextual_reminders.find(r => r.id === reminderId)
    if (reminder) {
      reminder.last_followed_up = new Date().toISOString()
      reminder.follow_up_count += 1
      await this.save()
    }
  }

  /**
   * Mark reminder as completed or dismissed
   */
  async updateReminderStatus(
    reminderId: string,
    status: 'active' | 'completed' | 'dismissed'
  ): Promise<void> {
    const db = await this.ensureDb()
    const reminder = db.contextual_reminders.find(r => r.id === reminderId)
    if (reminder) {
      reminder.status = status
      await this.save()
    }
  }

  /**
   * Get all active reminders
   */
  async getActiveReminders(): Promise<ContextualReminder[]> {
    const db = await this.ensureDb()
    return db.contextual_reminders.filter(r => r.status === 'active')
  }

  // ============================================
  // SOCIAL GRAPH METHODS
  // ============================================

  /**
   * Add or update a person in the social graph
   */
  async addOrUpdatePerson(
    name: string,
    relationshipType?: 'family' | 'friend' | 'colleague' | 'partner' | 'acquaintance' | 'unknown',
    contextNote?: string,
    turnNumber?: number
  ): Promise<Person> {
    const db = await this.ensureDb()
    
    // Normalize name (capitalize properly)
    const normalizedName = name.trim().split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
    
    // Check if person already exists (exact match or alias match)
    const lowerName = normalizedName.toLowerCase()
    const existing = db.social_graph.people.find(p => 
      p.name.toLowerCase() === lowerName ||
      p.aliases.some(alias => alias.toLowerCase() === lowerName)
    )
    
    if (existing) {
      // Update existing person
      existing.last_mentioned = new Date().toISOString()
      existing.mention_count += 1
      
      // Add alias if it's a different form of the name
      if (normalizedName !== existing.name && !existing.aliases.includes(normalizedName)) {
        existing.aliases.push(normalizedName)
      }
      
      // Update relationship type if provided and more specific
      if (relationshipType && relationshipType !== 'unknown' && 
          (existing.relationship_type === 'unknown' || relationshipType === 'family' || relationshipType === 'partner')) {
        existing.relationship_type = relationshipType
      }
      
      // Add context note if provided
      if (contextNote && !existing.context_notes.includes(contextNote)) {
        existing.context_notes.push(contextNote)
        // Keep only last 5 context notes
        if (existing.context_notes.length > 5) {
          existing.context_notes = existing.context_notes.slice(-5)
        }
      }
      
      await this.save()
      return existing
    }
    
    // Create new person
    const newPerson: Person = {
      id: `person_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: normalizedName,
      aliases: [],
      relationship_type: relationshipType || 'unknown',
      relationship_quality: 'casual',
      first_mentioned: new Date().toISOString(),
      last_mentioned: new Date().toISOString(),
      mention_count: 1,
      context_notes: contextNote ? [contextNote] : [],
      recent_updates: [],
    }
    
    db.social_graph.people.push(newPerson)
    await this.save()
    return newPerson
  }

  /**
   * Add a relationship between two people
   */
  async addRelationship(
    personAId: string,
    personBId: string,
    relationshipType: 'family' | 'friends' | 'colleagues' | 'partners' | 'acquaintances' | 'unknown',
    description?: string
  ): Promise<RelationshipEdge> {
    const db = await this.ensureDb()
    
    // Check if relationship already exists (bidirectional check)
    const existing = db.social_graph.relationships.find(r => 
      (r.person_a_id === personAId && r.person_b_id === personBId) ||
      (r.person_a_id === personBId && r.person_b_id === personAId)
    )
    
    if (existing) {
      existing.last_mentioned = new Date().toISOString()
      existing.mention_count += 1
      if (description) {
        existing.description = description
      }
      await this.save()
      return existing
    }
    
    // Create new relationship
    const newRelationship: RelationshipEdge = {
      id: `relationship_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      person_a_id: personAId,
      person_b_id: personBId,
      relationship_type: relationshipType,
      description,
      first_mentioned: new Date().toISOString(),
      last_mentioned: new Date().toISOString(),
      mention_count: 1,
    }
    
    db.social_graph.relationships.push(newRelationship)
    await this.save()
    return newRelationship
  }

  /**
   * Get person by name (fuzzy match)
   */
  async findPersonByName(name: string): Promise<Person | null> {
    const db = await this.ensureDb()
    const lowerName = name.toLowerCase().trim()
    
    return db.social_graph.people.find(p => 
      p.name.toLowerCase() === lowerName ||
      p.aliases.some(alias => alias.toLowerCase() === lowerName)
    ) || null
  }

  /**
   * Get all people
   */
  async getAllPeople(): Promise<Person[]> {
    const db = await this.ensureDb()
    return db.social_graph.people
  }

  /**
   * Get people to ask about (haven't asked recently, frequently mentioned)
   */
  async getPeopleToAskAbout(
    minDaysSinceLastAsk: number = 3,
    maxPeople: number = 2
  ): Promise<Person[]> {
    const db = await this.ensureDb()
    const now = Date.now()
    const minTime = minDaysSinceLastAsk * 24 * 60 * 60 * 1000
    
    return db.social_graph.people
      .filter(person => {
        // Skip if asked too recently
        if (person.last_asked_about) {
          const timeSinceLastAsk = now - new Date(person.last_asked_about).getTime()
          if (timeSinceLastAsk < minTime) return false
        }
        
        // Only include people mentioned at least 2 times
        return person.mention_count >= 2
      })
      .sort((a, b) => {
        // Sort by mention count (most mentioned first)
        if (b.mention_count !== a.mention_count) {
          return b.mention_count - a.mention_count
        }
        
        // Then by recency of mention
        if (a.last_mentioned && b.last_mentioned) {
          return new Date(b.last_mentioned).getTime() - new Date(a.last_mentioned).getTime()
        }
        
        return 0
      })
      .slice(0, maxPeople)
  }

  /**
   * Mark person as asked about
   */
  async markPersonAskedAbout(personId: string): Promise<void> {
    const db = await this.ensureDb()
    const person = db.social_graph.people.find(p => p.id === personId)
    if (person) {
      person.last_asked_about = new Date().toISOString()
      await this.save()
    }
  }

  /**
   * Add recent update about a person
   */
  async addPersonUpdate(
    personId: string,
    update: string,
    turnNumber: number
  ): Promise<void> {
    const db = await this.ensureDb()
    const person = db.social_graph.people.find(p => p.id === personId)
    if (person) {
      person.recent_updates.push({
        description: update,
        timestamp: new Date().toISOString(),
        turn_number: turnNumber,
      })
      // Keep only last 5 updates
      if (person.recent_updates.length > 5) {
        person.recent_updates = person.recent_updates.slice(-5)
      }
      await this.save()
    }
  }

  /**
   * Update person's relationship quality
   */
  async updatePersonRelationshipQuality(
    personId: string,
    quality: 'close' | 'good' | 'casual' | 'distant'
  ): Promise<void> {
    const db = await this.ensureDb()
    const person = db.social_graph.people.find(p => p.id === personId)
    if (person) {
      person.relationship_quality = quality
      await this.save()
    }
  }

  // ============================================
  // MOOD JOURNAL METHODS
  // ============================================

  /**
   * Add a mood entry to the journal
   */
  async addMoodEntry(
    emotionLabel: string,
    confidence: number,
    turnNumber: number,
    context?: string
  ): Promise<void> {
    const db = await this.ensureDb()
    const now = new Date()
    
    const entry: MoodEntry = {
      timestamp: now.toISOString(),
      emotion_label: emotionLabel,
      confidence,
      time_of_day: now.getHours(),
      day_of_week: now.getDay(),
      turn_number: turnNumber,
      context,
    }
    
    db.mood_journal.entries.push(entry)
    
    // Keep only last 500 entries
    if (db.mood_journal.entries.length > 500) {
      db.mood_journal.entries = db.mood_journal.entries.slice(-500)
    }
    
    await this.save()
  }

  /**
   * Get recent mood entries
   */
  async getRecentMoodEntries(days: number = 7): Promise<MoodEntry[]> {
    const db = await this.ensureDb()
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    
    return db.mood_journal.entries.filter(entry => 
      new Date(entry.timestamp) >= cutoff
    )
  }

  /**
   * Mark mood observation as made
   */
  async markMoodObservation(): Promise<void> {
    const db = await this.ensureDb()
    db.mood_journal.last_observation = new Date().toISOString()
    await this.save()
  }

  /**
   * Get last observation timestamp
   */
  async getLastMoodObservation(): Promise<string | undefined> {
    const db = await this.ensureDb()
    return db.mood_journal.last_observation
  }

  /**
   * Add detected mood pattern
   */
  async addMoodPattern(pattern: MoodPattern): Promise<void> {
    const db = await this.ensureDb()
    db.mood_journal.patterns_detected.push(pattern)
    
    // Keep only last 20 patterns
    if (db.mood_journal.patterns_detected.length > 20) {
      db.mood_journal.patterns_detected = db.mood_journal.patterns_detected.slice(-20)
    }
    
    await this.save()
  }
}

// Singleton instance
let memoryServiceInstance: MemoryService | null = null

export function getMemoryService(): MemoryService {
  if (!memoryServiceInstance) {
    memoryServiceInstance = new MemoryService()
  }
  return memoryServiceInstance
}

