import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Initialize OpenAI client
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('[Achievements API] OPENAI_API_KEY is not set')
    throw new Error('OpenAI API key not configured')
  }
  return new OpenAI({
    apiKey: apiKey,
  })
}

const openai = getOpenAIClient()

/**
 * Generate milestone celebration message
 */
async function generateMilestoneMessage(milestone: number): Promise<string> {
  const systemPrompt = `You are a friendly, encouraging AI companion celebrating a conversation milestone with your user. Keep responses warm, brief (1-2 sentences, max 60 words), and celebratory but not overly dramatic. Make it feel personal and meaningful.`

  const userPrompt = `Generate a gentle celebration message for reaching ${milestone} conversations together. Be warm, encouraging, and show that you appreciate the continued connection.`

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

    return completion.choices[0]?.message?.content?.trim() || `Wow, ${milestone} conversations! That's amazing.`
  } catch (error) {
    console.error('[Achievements API] Error generating milestone message:', error)
    return `Wow, ${milestone} conversations! That's amazing.`
  }
}

/**
 * Generate streak celebration message
 */
async function generateStreakMessage(streak: number): Promise<string> {
  const systemPrompt = `You are a friendly AI companion celebrating a conversation streak with your user. Keep responses warm, brief (1-2 sentences, max 60 words), and encouraging. Show you notice and appreciate the consistency.`

  const userPrompt = `Generate a gentle celebration message for a ${streak}-day conversation streak. Be encouraging and show appreciation for the daily connection.`

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

    return completion.choices[0]?.message?.content?.trim() || `We've talked ${streak} days in a row! That's really nice.`
  } catch (error) {
    console.error('[Achievements API] Error generating streak message:', error)
    return `We've talked ${streak} days in a row! That's really nice.`
  }
}

/**
 * POST /api/achievements
 * Generate achievement celebration messages
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, milestone, streak } = body

    if (!type || !['milestone', 'streak', 'daily_check_in'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid achievement type' },
        { status: 400 }
      )
    }

    let text = ''

    switch (type) {
      case 'milestone':
        if (!milestone || typeof milestone !== 'number') {
          return NextResponse.json(
            { error: 'Milestone number required' },
            { status: 400 }
          )
        }
        text = await generateMilestoneMessage(milestone)
        break
      case 'streak':
        if (!streak || typeof streak !== 'number') {
          return NextResponse.json(
            { error: 'Streak number required' },
            { status: 400 }
          )
        }
        text = await generateStreakMessage(streak)
        break
      case 'daily_check_in':
        // This could be used for daily check-in achievements in the future
        text = "Thanks for checking in today!"
        break
      default:
        return NextResponse.json(
          { error: 'Unknown achievement type' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      text,
      type,
      milestone,
      streak,
    })
  } catch (error) {
    console.error('[Achievements API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate achievement message' },
      { status: 500 }
    )
  }
}












