import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getMemoryService } from '@/lib/memory'

// Initialize OpenAI client
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('[Daily Routine API] OPENAI_API_KEY is not set')
    throw new Error('OpenAI API key not configured')
  }
  return new OpenAI({
    apiKey: apiKey,
  })
}

const openai = getOpenAIClient()

/**
 * Generate morning check-in message
 */
async function generateMorningCheckIn(
  memoryService: ReturnType<typeof getMemoryService>,
  sleepPatterns?: Array<{ date: string; lastActivity: string }>
): Promise<string> {
  // Get recent memories for context
  const memory = await memoryService.getMemory()
  const recentEpisodes = memory.episodes.slice(-5)
  
  // Analyze sleep pattern if available
  let sleepNote = ''
  if (sleepPatterns && sleepPatterns.length > 0) {
    const lastNight = sleepPatterns[sleepPatterns.length - 1]
    if (lastNight) {
      const lastActivity = new Date(lastNight.lastActivity)
      const hour = lastActivity.getHours()
      if (hour >= 23 || hour < 2) {
        sleepNote = 'You were up pretty late last night.'
      } else if (hour >= 2 && hour < 6) {
        sleepNote = 'You were up very late last night.'
      }
    }
  }

  const systemPrompt = `Your name is Anika. You are a friendly, caring AI companion checking in with your user in the morning. Keep responses short (1-2 sentences, max 80 words). Be warm and encouraging. If they were up late, acknowledge it gently but don't lecture. Optionally ask about sleep quality naturally.`

  const userPrompt = `Generate a morning check-in message. ${sleepNote ? `Note: ${sleepNote}` : ''}
  
Recent conversation highlights: ${recentEpisodes.length > 0 ? recentEpisodes.map(e => e.description).join(', ') : 'None yet.'}

Generate a warm, brief morning message.`

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

    return completion.choices[0]?.message?.content?.trim() || "Good morning! How did you sleep?"
  } catch (error) {
    console.error('[Daily Routine API] Error generating morning check-in:', error)
    return "Good morning! How did you sleep?"
  }
}

/**
 * Generate evening reflection message
 */
async function generateEveningReflection(
  memoryService: ReturnType<typeof getMemoryService>,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  const memory = await memoryService.getMemory()
  const recentEpisodes = memory.episodes.slice(-10)
  
  const systemPrompt = `Your name is Anika. You are a friendly AI companion helping your user reflect on their day in the evening. Keep responses short (1-2 sentences, max 80 words). Be thoughtful and supportive. Ask about how their day went or what they're thinking about.`

  const userPrompt = `Generate an evening reflection message. 
  
Recent highlights from today: ${recentEpisodes.length > 0 ? recentEpisodes.map(e => e.description).slice(-5).join(', ') : 'No specific highlights yet.'}
${conversationHistory ? `Recent conversations: ${conversationHistory.slice(-6).map(m => m.role === 'user' ? `You: ${m.content.substring(0, 50)}` : `AI: ${m.content.substring(0, 50)}`).join(' | ')}` : ''}

Generate a thoughtful, brief evening reflection message.`

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

    return completion.choices[0]?.message?.content?.trim() || "How was your day? Anything on your mind?"
  } catch (error) {
    console.error('[Daily Routine API] Error generating evening reflection:', error)
    return "How was your day? Anything on your mind?"
  }
}

/**
 * Generate late-night comment
 */
async function generateLateNightComment(
  hour: number
): Promise<string> {
  const systemPrompt = `You are a caring AI companion noticing the user is active late at night. Keep responses very short (1 sentence, max 40 words). Be gentle and non-judgmental. Show you notice but don't lecture.`

  let timeContext = ''
  if (hour >= 23 || hour < 2) {
    timeContext = 'It\'s pretty late - around midnight.'
  } else if (hour >= 2 && hour < 5) {
    timeContext = 'It\'s very late - early morning hours.'
  } else {
    timeContext = 'Still up late.'
  }

  const userPrompt = `Generate a brief, gentle comment about the user being up late. ${timeContext}`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 60,
      temperature: 0.8,
    })

    return completion.choices[0]?.message?.content?.trim() || "Still up? Everything okay?"
  } catch (error) {
    console.error('[Daily Routine API] Error generating late-night comment:', error)
    return "Still up? Everything okay?"
  }
}

/**
 * Generate daily summary
 */
async function generateDailySummary(
  memoryService: ReturnType<typeof getMemoryService>,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
  conversationCount?: number
): Promise<string> {
  const memory = await memoryService.getMemory()
  const todayEpisodes = memory.episodes.filter(e => {
    const episodeDate = new Date(e.timestamp).toISOString().split('T')[0]
    const today = new Date().toISOString().split('T')[0]
    return episodeDate === today
  })

  const systemPrompt = `Your name is Anika. You are a friendly AI companion giving a brief daily summary of conversations. Keep it concise (2-3 sentences, max 100 words). Highlight 2-3 key conversation topics or themes. Be warm and encouraging.`

  const conversationContext = conversationHistory
    ? conversationHistory.slice(-20).map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`).join('\n')
    : 'No conversations today.'

  const userPrompt = `Generate a daily summary for today.
  
Today's episodes/highlights: ${todayEpisodes.length > 0 ? todayEpisodes.map(e => e.description).join(', ') : 'None recorded.'}

Recent conversations (${conversationCount || 0} turns today):
${conversationContext.substring(0, 500)}

Generate a brief, warm summary of today's conversations.`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 120,
      temperature: 0.7,
    })

    return completion.choices[0]?.message?.content?.trim() || "Today we talked about a few things. Thanks for the chat!"
  } catch (error) {
    console.error('[Daily Routine API] Error generating daily summary:', error)
    return "Today we had some good conversations. Thanks for the chat!"
  }
}

/**
 * POST /api/daily-routine
 * Generate routine messages (morning, evening, late-night, summary)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, conversationHistory, conversationCount, sleepPatterns } = body

    if (!type || !['morning', 'evening', 'late_night', 'summary'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid routine type' },
        { status: 400 }
      )
    }

    const memoryService = getMemoryService()
    let text = ''

    switch (type) {
      case 'morning':
        text = await generateMorningCheckIn(memoryService, sleepPatterns)
        break
      case 'evening':
        text = await generateEveningReflection(memoryService, conversationHistory)
        break
      case 'late_night': {
        const hour = new Date().getHours()
        text = await generateLateNightComment(hour)
        break
      }
      case 'summary':
        text = await generateDailySummary(memoryService, conversationHistory, conversationCount)
        break
      default:
        return NextResponse.json(
          { error: 'Unknown routine type' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      text,
      type,
    })
  } catch (error) {
    console.error('[Daily Routine API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate routine message' },
      { status: 500 }
    )
  }
}












