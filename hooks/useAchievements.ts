"use client"

import { useState, useEffect, useRef, useCallback } from 'react'

export type AchievementType = 'milestone' | 'streak' | 'daily_check_in'

export interface Achievement {
  type: AchievementType
  text: string
  timestamp: string
  milestone?: number // Conversation milestone number
  streak?: number // Streak length
}

interface AchievementState {
  totalConversations: number // Total conversation count across all time
  conversationDays: string[] // Array of dates (YYYY-MM-DD) when conversations happened
  currentStreak: number // Current consecutive days streak
  longestStreak: number // Longest streak achieved
  lastConversationDate: string | null // Last date a conversation happened
  milestones: number[] // Already celebrated milestones
  lastMilestoneChecked: number // Last conversation count we checked for milestones
}

const STORAGE_KEY = 'tamagotchi_achievements'

// Milestone thresholds
const MILESTONE_THRESHOLDS = [10, 25, 50, 100, 200, 500, 1000]

/**
 * Get current date in YYYY-MM-DD format
 */
function getToday(): string {
  const now = new Date()
  return now.toISOString().split('T')[0]
}

/**
 * Get current date/time in ISO format
 */
function getNowISO(): string {
  return new Date().toISOString()
}

/**
 * Calculate streak from conversation days array
 */
function calculateStreak(conversationDays: string[]): { current: number; longest: number } {
  if (conversationDays.length === 0) {
    return { current: 0, longest: 0 }
  }

  // Sort dates (newest first)
  const sorted = [...conversationDays].sort((a, b) => b.localeCompare(a))
  const uniqueDays = Array.from(new Set(sorted))
  
  // Calculate current streak (from today backwards)
  let currentStreak = 0
  const today = getToday()
  let checkDate = new Date(today)
  
  for (let i = 0; i < 365; i++) { // Check up to a year back
    const dateStr = checkDate.toISOString().split('T')[0]
    if (uniqueDays.includes(dateStr)) {
      currentStreak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }
  
  // Calculate longest streak
  let longestStreak = 0
  let tempStreak = 0
  let lastDate: Date | null = null
  
  for (const dayStr of uniqueDays) {
    const dayDate = new Date(dayStr + 'T00:00:00')
    if (lastDate) {
      const daysDiff = Math.floor((lastDate.getTime() - dayDate.getTime()) / (1000 * 60 * 60 * 24))
      if (daysDiff === 1) {
        // Consecutive day
        tempStreak++
      } else {
        // Streak broken
        longestStreak = Math.max(longestStreak, tempStreak)
        tempStreak = 1
      }
    } else {
      tempStreak = 1
    }
    lastDate = dayDate
  }
  longestStreak = Math.max(longestStreak, tempStreak)
  
  return { current: currentStreak, longest: longestStreak }
}

/**
 * Load achievement state from localStorage
 */
function loadAchievementState(): AchievementState {
  if (typeof window === 'undefined') {
    return {
      totalConversations: 0,
      conversationDays: [],
      currentStreak: 0,
      longestStreak: 0,
      lastConversationDate: null,
      milestones: [],
      lastMilestoneChecked: 0,
    }
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as AchievementState
      // Calculate current streak from conversation days
      const streakData = calculateStreak(parsed.conversationDays)
      parsed.currentStreak = streakData.current
      parsed.longestStreak = Math.max(parsed.longestStreak, streakData.longest)
      return parsed
    }
  } catch (e) {
    console.warn('[Achievements] Failed to load state:', e)
  }

  return {
    totalConversations: 0,
    conversationDays: [],
    currentStreak: 0,
    longestStreak: 0,
    lastConversationDate: null,
    milestones: [],
    lastMilestoneChecked: 0,
  }
}

/**
 * Save achievement state to localStorage
 */
function saveAchievementState(state: AchievementState): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.warn('[Achievements] Failed to save state:', e)
  }
}

export interface UseAchievementsProps {
  turnCount?: number // Current conversation turn count
  onAchievement: (achievement: Achievement) => void
}

export function useAchievements({
  turnCount,
  onAchievement,
}: UseAchievementsProps) {
  const [state, setState] = useState<AchievementState>(loadAchievementState)
  const prevTurnCountRef = useRef<number>(0)
  const lastCheckedStreakRef = useRef<string | null>(null)

  // Save state whenever it changes
  useEffect(() => {
    saveAchievementState(state)
  }, [state])

  // Track conversation when turn count increases
  useEffect(() => {
    if (!turnCount || turnCount <= prevTurnCountRef.current) {
      return
    }

    const today = getToday()
    const newTotal = turnCount
    
    setState(prev => {
      // Track conversation day (only once per day)
      const conversationDays = prev.conversationDays.includes(today)
        ? prev.conversationDays
        : [...prev.conversationDays, today]
      
      // Update streaks
      const streakData = calculateStreak(conversationDays)
      
      const updated = {
        ...prev,
        totalConversations: newTotal,
        conversationDays,
        currentStreak: streakData.current,
        longestStreak: Math.max(prev.longestStreak, streakData.longest),
        lastConversationDate: today,
      }

      // Check for milestones
      const newMilestones: number[] = []
      for (const threshold of MILESTONE_THRESHOLDS) {
        if (
          newTotal >= threshold &&
          !prev.milestones.includes(threshold) &&
          prev.lastMilestoneChecked < threshold
        ) {
          newMilestones.push(threshold)
        }
      }

      // Trigger milestone celebrations
      if (newMilestones.length > 0) {
        const latestMilestone = Math.max(...newMilestones)
        setTimeout(() => {
          onAchievement({
            type: 'milestone',
            text: '', // Will be generated by API
            timestamp: getNowISO(),
            milestone: latestMilestone,
          })
        }, 500) // Small delay to avoid immediate overlap
      }

      return {
        ...updated,
        milestones: [...prev.milestones, ...newMilestones],
        lastMilestoneChecked: newTotal,
      }
    })

    prevTurnCountRef.current = turnCount
  }, [turnCount, onAchievement])

  // Check for streak achievements (when streak reaches milestone levels)
  const prevStreakRef = useRef<number>(state.currentStreak || 0)
  const lastCelebratedStreakRef = useRef<number>(0)
  
  useEffect(() => {
    // Only celebrate if streak increased and reached a milestone level
    if (state.currentStreak > prevStreakRef.current && state.currentStreak > 0) {
      const streakLevels = [3, 5, 7, 10, 14, 30, 60, 90, 100]
      
      // Check if we just reached one of the milestone levels (and haven't celebrated it yet)
      if (streakLevels.includes(state.currentStreak) && state.currentStreak > lastCelebratedStreakRef.current) {
        lastCelebratedStreakRef.current = state.currentStreak
        setTimeout(() => {
          onAchievement({
            type: 'streak',
            text: '', // Will be generated by API
            timestamp: getNowISO(),
            streak: state.currentStreak,
          })
        }, 1500) // Delay to avoid immediate overlap with milestone
      }
    }
    
    prevStreakRef.current = state.currentStreak
  }, [state.currentStreak, onAchievement])

  return {
    state,
    setState,
  }
}

