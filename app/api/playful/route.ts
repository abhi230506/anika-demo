import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getMemoryService } from '@/lib/memory'

// Initialize OpenAI client
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('[Playful API] OPENAI_API_KEY is not set')
    throw new Error('OpenAI API key not configured')
  }
  return new OpenAI({
    apiKey: apiKey,
  })
}

const openai = getOpenAIClient()

/**
 * Generate a riddle
 */
async function generateRiddle(): Promise<{ question: string; answer?: string }> {
  const systemPrompt = `You are a friendly AI companion sharing a fun riddle. Generate a riddle that's appropriate and not too difficult. Provide the question and the answer. Keep it fun and engaging.`

  const userPrompt = `Generate a fun riddle with its answer. Make it suitable for casual conversation - not too easy, not too hard.`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 150,
      temperature: 0.9,
    })

    const text = completion.choices[0]?.message?.content?.trim() || ''
    // Try to extract question and answer (answer should be separate)
    // Look for patterns like "Answer: ..." or "The answer is ..."
    const answerMatch = text.match(/(?:answer|answer:|answer is|the answer|the answer is):?\s*(.+)/i)
    const answer = answerMatch ? answerMatch[1].trim() : undefined
    // Question is everything before the answer
    const question = answer ? text.replace(/answer.*/i, '').trim() : text

    return { question, answer }
  } catch (error) {
    console.error('[Playful API] Error generating riddle:', error)
    return {
      question: "I'm tall when I'm young, and short when I'm old. What am I?",
      answer: "A candle",
    }
  }
}

/**
 * Generate a joke
 */
async function generateJoke(): Promise<string> {
  const systemPrompt = `You are a friendly AI companion sharing a lighthearted joke. Keep it clean, fun, and appropriate. Make it brief and enjoyable.`

  const userPrompt = `Generate a fun, clean joke. Keep it short (1-2 sentences max).`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 100,
      temperature: 0.9,
    })

    return completion.choices[0]?.message?.content?.trim() || "Why don't scientists trust atoms? Because they make up everything!"
  } catch (error) {
    console.error('[Playful API] Error generating joke:', error)
    return "Why don't scientists trust atoms? Because they make up everything!"
  }
}

/**
 * Generate a would-you-rather question
 */
async function generateWouldYouRather(): Promise<string> {
  const systemPrompt = `You are a friendly AI companion asking a fun "would you rather" question. Keep it lighthearted, creative, and interesting. Make it something that sparks conversation.`

  const userPrompt = `Generate a fun "would you rather" question. Make it interesting but not too weird or controversial.`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 80,
      temperature: 0.9,
    })

    return completion.choices[0]?.message?.content?.trim() || "Would you rather be able to fly or be invisible?"
  } catch (error) {
    console.error('[Playful API] Error generating would-you-rather:', error)
    return "Would you rather be able to fly or be invisible?"
  }
}

/**
 * Generate a fun fact or trivia
 */
async function generateTrivia(category?: string): Promise<string> {
  const systemPrompt = `You are a friendly AI companion sharing an interesting fact or piece of trivia. Make it fascinating but brief. Keep it conversational and fun.`

  const userPrompt = category
    ? `Generate an interesting fact about ${category}. Keep it brief and fascinating.`
    : `Generate an interesting, random fun fact. Keep it brief and fascinating.`

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

    return completion.choices[0]?.message?.content?.trim() || "Did you know? Honey never spoils. Archaeologists have found pots of honey in ancient Egyptian tombs that are over 3,000 years old and still perfectly edible!"
  } catch (error) {
    console.error('[Playful API] Error generating trivia:', error)
    return "Did you know? Honey never spoils. Archaeologists have found pots of honey in ancient Egyptian tombs that are still edible!"
  }
}

/**
 * Start collaborative storytelling
 */
async function startStorytelling(conversationHistory?: Array<{ role: string; content: string }>): Promise<string> {
  const systemPrompt = `You are a friendly AI companion starting a collaborative story. Begin with an engaging opening that invites the user to continue. Make it fun, creative, and open-ended.`

  const contextPrompt = conversationHistory && conversationHistory.length > 0
    ? `Based on our recent conversations, start a story that might relate to topics we've discussed.`
    : `Start a creative, engaging story opening.`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: contextPrompt },
      ],
      max_tokens: 120,
      temperature: 0.9,
    })

    return completion.choices[0]?.message?.content?.trim() || "Once upon a time, in a world not so different from ours... What happens next?"
  } catch (error) {
    console.error('[Playful API] Error generating story start:', error)
    return "Once upon a time, in a world not so different from ours... What happens next?"
  }
}

/**
 * Continue collaborative storytelling
 */
async function continueStorytelling(
  storySoFar: string,
  userContribution: string
): Promise<string> {
  const systemPrompt = `You are a friendly AI companion continuing a collaborative story. Build on what the user contributed, add your own creative twist, and keep it going. End with a question or cliffhanger to invite them to continue.`

  const userPrompt = `Story so far: ${storySoFar}\n\nUser added: ${userContribution}\n\nContinue the story, add your part, and invite them to continue.`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 120,
      temperature: 0.9,
    })

    return completion.choices[0]?.message?.content?.trim() || "That's interesting! And then... what happens?"
  } catch (error) {
    console.error('[Playful API] Error continuing story:', error)
    return "That's interesting! And then what happens?"
  }
}

/**
 * Generate a mini-quiz based on conversation history
 */
async function generateMiniQuiz(
  conversationHistory?: Array<{ role: string; content: string }>,
  memoryService?: ReturnType<typeof getMemoryService>
): Promise<{ question: string; options?: string[]; answer?: string }> {
  const systemPrompt = `You are a friendly AI companion creating a fun mini-quiz based on things you've discussed with the user. Create a question about something from your conversations. Make it lighthearted and fun, not like a test.`

  let contextPrompt = "Create a fun quiz question about something we've talked about."
  
  if (conversationHistory && conversationHistory.length > 0) {
    // Extract key topics from recent conversation
    const recentMessages = conversationHistory.slice(-10)
    const topics = recentMessages
      .map(m => m.content.substring(0, 100))
      .join(' ')
    contextPrompt = `Based on our recent conversations about: ${topics.substring(0, 300)}... Create a fun quiz question about something we've discussed.`
  } else if (memoryService) {
    try {
      const memory = await memoryService.getMemory()
      if (memory.summary) {
        contextPrompt = `Based on what I know about the user: ${memory.summary.substring(0, 200)}... Create a fun quiz question about something we've discussed or I know about them.`
      }
    } catch (e) {
      // Ignore
    }
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: contextPrompt },
      ],
      max_tokens: 120,
      temperature: 0.8,
    })

    const text = completion.choices[0]?.message?.content?.trim() || "What's something we talked about recently?"
    
    // Try to extract question and answer if formatted
    const answerMatch = text.match(/(?:answer|answer:|answer is|it's|it was):?\s*(.+)/i)
    const answer = answerMatch ? answerMatch[1].trim() : undefined
    const question = answer ? text.replace(/answer.*/i, '').trim() : text

    return { question, answer }
  } catch (error) {
    console.error('[Playful API] Error generating quiz:', error)
    return { question: "What's something we talked about recently?" }
  }
}

/**
 * POST /api/playful
 * Generate playful interactions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, category, conversationHistory, storySoFar, userContribution } = body

    if (!type || !['riddle', 'joke', 'would_you_rather', 'trivia', 'story_start', 'story_continue', 'quiz'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid playful interaction type' },
        { status: 400 }
      )
    }

    const memoryService = getMemoryService()
    let result: any = {}

    switch (type) {
      case 'riddle':
        result = await generateRiddle()
        break
      
      case 'joke':
        result = { text: await generateJoke() }
        break
      
      case 'would_you_rather':
        result = { question: await generateWouldYouRather() }
        break
      
      case 'trivia':
        result = { fact: await generateTrivia(category) }
        break
      
      case 'story_start':
        result = { story: await startStorytelling(conversationHistory) }
        break
      
      case 'story_continue':
        if (!storySoFar || !userContribution) {
          return NextResponse.json(
            { error: 'storySoFar and userContribution required for story_continue' },
            { status: 400 }
          )
        }
        result = { story: await continueStorytelling(storySoFar, userContribution) }
        break
      
      case 'quiz':
        result = await generateMiniQuiz(conversationHistory, memoryService)
        break
      
      default:
        return NextResponse.json(
          { error: 'Unknown playful interaction type' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      type,
      ...result,
    })
  } catch (error) {
    console.error('[Playful API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate playful interaction' },
      { status: 500 }
    )
  }
}

