import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getMemoryService } from '@/lib/memory'
import { extractGoals, detectGoalCompletion, detectGoalProgress } from '@/lib/goal-tracking'

// Initialize OpenAI client
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('[Goals API] OPENAI_API_KEY is not set')
    throw new Error('OpenAI API key not configured')
  }
  return new OpenAI({
    apiKey: apiKey,
  })
}

const openai = getOpenAIClient()

/**
 * Generate goal check-in message
 */
async function generateGoalCheckIn(goal: { description: string; progress?: string; target_date?: string }): Promise<string> {
  const systemPrompt = `Your name is Anika. You are a friendly AI companion checking in on someone's goal. Be warm, encouraging, and non-judgmental. Keep it brief (1-2 sentences, max 80 words).`

  const userPrompt = `Generate a gentle check-in message about their goal: "${goal.description}". ${goal.progress ? `Recent progress: ${goal.progress}` : ''} ${goal.target_date ? `Target date: ${goal.target_date}` : ''}. Be supportive and ask how it's going, but don't be pushy.`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 100,
      temperature: 0.8,
    })

    return completion.choices[0]?.message?.content?.trim() || `How's that goal of ${goal.description} going?`
  } catch (error) {
    console.error('[Goals API] Error generating check-in:', error)
    return `How's that goal of ${goal.description} going?`
  }
}

/**
 * Generate goal celebration message
 */
async function generateGoalCelebration(goal: { description: string }): Promise<string> {
  const systemPrompt = `Your name is Anika. You are a friendly AI companion celebrating someone achieving their goal. Be genuinely happy and encouraging. Keep it brief (1-2 sentences, max 80 words). Make it feel like a real friend celebrating with them.`

  const userPrompt = `Generate a celebration message for completing the goal: "${goal.description}". Be warm and genuine.`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 100,
      temperature: 0.8,
    })

    return completion.choices[0]?.message?.content?.trim() || `That's amazing! You completed ${goal.description}! Well done!`
  } catch (error) {
    console.error('[Goals API] Error generating celebration:', error)
    return `That's amazing! You completed ${goal.description}! Well done!`
  }
}

/**
 * Generate gentle goal reminder
 */
async function generateGoalReminder(goal: { description: string; target_date?: string }): Promise<string> {
  const systemPrompt = `Your name is Anika. You are a friendly AI companion giving a gentle reminder about a goal. Be subtle and non-pushy. Keep it brief (1 sentence, max 60 words). Make it feel like you're just remembering together, not nagging.`

  const userPrompt = `Generate a gentle reminder about the goal: "${goal.description}". ${goal.target_date ? `Target date: ${goal.target_date}` : ''}. Be subtle and friendly.`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 80,
      temperature: 0.8,
    })

    return completion.choices[0]?.message?.content?.trim() || `Just remembered you wanted to ${goal.description}.`
  } catch (error) {
    console.error('[Goals API] Error generating reminder:', error)
    return `Just remembered you wanted to ${goal.description}.`
  }
}

/**
 * GET /api/goals - Get all goals
 */
export async function GET() {
  try {
    const memoryService = getMemoryService()
    const goals = await memoryService.getAllGoals()
    
    return NextResponse.json({
      success: true,
      goals,
    })
  } catch (error) {
    console.error('[Goals API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get goals' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/goals - Create goal, check in, update, or generate messages
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, goalId, description, targetDate, progress, status, conversationHistory } = body

    if (!action || !['create', 'check_in', 'update', 'celebrate', 'remind', 'extract'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }

    const memoryService = getMemoryService()

    switch (action) {
      case 'create':
        if (!description) {
          return NextResponse.json(
            { error: 'Description required' },
            { status: 400 }
          )
        }
        const newGoal = await memoryService.addGoal(description, targetDate)
        return NextResponse.json({
          success: true,
          goal: newGoal,
        })

      case 'check_in': {
        if (!goalId) {
          return NextResponse.json(
            { error: 'Goal ID required' },
            { status: 400 }
          )
        }
        const goal = await memoryService.checkInGoal(goalId)
        if (!goal) {
          return NextResponse.json(
            { error: 'Goal not found' },
            { status: 404 }
          )
        }
        const checkInMessage = await generateGoalCheckIn(goal)
        return NextResponse.json({
          success: true,
          goal,
          message: checkInMessage,
        })
      }

      case 'update':
        if (!goalId) {
          return NextResponse.json(
            { error: 'Goal ID required' },
            { status: 400 }
          )
        }
        const updatedGoal = await memoryService.updateGoal(goalId, {
          progress,
          status: status as 'active' | 'completed' | 'paused',
        })
        if (!updatedGoal) {
          return NextResponse.json(
            { error: 'Goal not found' },
            { status: 404 }
          )
        }
        return NextResponse.json({
          success: true,
          goal: updatedGoal,
        })

      case 'celebrate': {
        if (!goalId) {
          return NextResponse.json(
            { error: 'Goal ID required' },
            { status: 400 }
          )
        }
        const goal = await memoryService.getAllGoals().then(goals => goals.find(g => g.id === goalId))
        if (!goal) {
          return NextResponse.json(
            { error: 'Goal not found' },
            { status: 404 }
          )
        }
        const celebrationMessage = await generateGoalCelebration(goal)
        return NextResponse.json({
          success: true,
          message: celebrationMessage,
        })
      }

      case 'remind': {
        if (!goalId) {
          return NextResponse.json(
            { error: 'Goal ID required' },
            { status: 400 }
          )
        }
        const goal = await memoryService.getAllGoals().then(goals => goals.find(g => g.id === goalId))
        if (!goal) {
          return NextResponse.json(
            { error: 'Goal not found' },
            { status: 404 }
          )
        }
        const reminderMessage = await generateGoalReminder(goal)
        return NextResponse.json({
          success: true,
          message: reminderMessage,
        })
      }

      case 'extract': {
        if (!conversationHistory || !Array.isArray(conversationHistory)) {
          return NextResponse.json(
            { error: 'Conversation history required' },
            { status: 400 }
          )
        }
        
        // Extract goals from recent messages
        const recentMessages = conversationHistory.slice(-5)
        const extractedGoals: Array<{ description: string; targetDate?: string }> = []
        
        for (const msg of recentMessages) {
          if (msg.role === 'user') {
            const goals = extractGoals(msg.content)
            extractedGoals.push(...goals.map(g => ({
              description: g.description,
              targetDate: g.targetDate,
            })))
          }
        }
        
        // Also check for goal completion or progress
        const lastUserMessage = recentMessages.find((m: any) => m.role === 'user')?.content || ''
        const completion = detectGoalCompletion(lastUserMessage)
        const progress = detectGoalProgress(lastUserMessage)
        
        return NextResponse.json({
          success: true,
          extractedGoals,
          completion,
          progress,
        })
      }

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('[Goals API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to process goal request' },
      { status: 500 }
    )
  }
}












