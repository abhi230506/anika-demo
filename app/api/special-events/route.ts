import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getMemoryService } from '@/lib/memory'
import {
  getTodayHoliday,
  getUpcomingHoliday,
  getSeasonalContext,
  getBirthdayInfo,
} from '@/lib/holiday-awareness'

// Initialize OpenAI client
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('[Special Events API] OPENAI_API_KEY is not set')
    throw new Error('OpenAI API key not configured')
  }
  return new OpenAI({
    apiKey: apiKey,
  })
}

const openai = getOpenAIClient()

/**
 * Get user's birthday from memory
 */
async function getUserBirthday(memoryService: ReturnType<typeof getMemoryService>): Promise<string | null> {
  try {
    const memory = await memoryService.getMemory()
    const birthdaySlot = memory.slots.find(s => 
      s.key === 'birthday' || 
      s.key === 'user_birthday' || 
      (s.type === 'preference' && s.key.toLowerCase().includes('birthday'))
    )
    return birthdaySlot ? String(birthdaySlot.value) : null
  } catch (e) {
    return null
  }
}

/**
 * Generate holiday message
 */
async function generateHolidayMessage(holidayName: string, isToday: boolean): Promise<string> {
  const systemPrompt = `You are a friendly AI companion acknowledging a holiday. Keep responses warm, brief (1-2 sentences, max 60 words), and appropriate for the occasion. ${isToday ? 'Acknowledge that it\'s happening today.' : 'Mention it\'s coming up soon.'}`

  const userPrompt = `Generate a brief, friendly message about ${holidayName}. ${isToday ? 'It\'s today!' : 'It\'s coming up soon.'} Keep it warm and conversational.`

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

    return completion.choices[0]?.message?.content?.trim() || `Happy ${holidayName}!`
  } catch (error) {
    console.error('[Special Events API] Error generating holiday message:', error)
    return isToday ? `Happy ${holidayName}!` : `${holidayName} is coming up!`
  }
}

/**
 * Generate birthday message
 */
async function generateBirthdayMessage(age?: number): Promise<string> {
  const systemPrompt = `You are a friendly AI companion celebrating someone's birthday. Keep responses warm, brief (1-2 sentences, max 60 words), and celebratory. ${age ? `They're turning ${age}.` : ''} Make it personal and joyful.`

  const userPrompt = `Generate a warm birthday message. ${age ? `They're turning ${age} today.` : 'It\'s their birthday today.'} Be celebratory and show you care.`

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

    return completion.choices[0]?.message?.content?.trim() || (age ? `Happy ${age}th birthday!` : 'Happy birthday!')
  } catch (error) {
    console.error('[Special Events API] Error generating birthday message:', error)
    return age ? `Happy ${age}th birthday!` : 'Happy birthday!'
  }
}

/**
 * Generate seasonal comment
 */
async function generateSeasonalComment(
  season: string,
  month: number,
  weekday: string,
  isWeekend: boolean,
  isMonday: boolean,
  isFriday: boolean
): Promise<string> {
  const systemPrompt = `You are a friendly AI companion making a casual observation about the season or day of the week. Keep responses very brief (1 sentence, max 40 words), natural, and conversational. Don't be overly dramatic.`

  let context = `It's ${season}, and it's ${weekday}.`
  if (isWeekend) {
    context += ' It\'s the weekend.'
  } else if (isMonday) {
    context += ' It\'s Monday - start of the week.'
  } else if (isFriday) {
    context += ' It\'s Friday - almost weekend!'
  }

  const userPrompt = `Generate a brief, casual comment about ${context}. Keep it natural and conversational, like you're just noticing the weather or day.`

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

    return completion.choices[0]?.message?.content?.trim() || (season === 'winter' ? 'Getting chilly out.' : 'Nice day today.')
  } catch (error) {
    console.error('[Special Events API] Error generating seasonal comment:', error)
    return season === 'winter' ? 'Getting chilly out.' : 'Nice day today.'
  }
}

/**
 * POST /api/special-events
 * Generate messages for holidays, birthdays, seasonal events, and weekday awareness
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type } = body

    if (!type || !['holiday', 'birthday', 'seasonal', 'weekday'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid event type' },
        { status: 400 }
      )
    }

    const memoryService = getMemoryService()
    let text = ''

    switch (type) {
      case 'holiday': {
        const todayHoliday = getTodayHoliday()
        const upcomingHoliday = getUpcomingHoliday(3) // Check 3 days ahead
        
        if (todayHoliday) {
          text = await generateHolidayMessage(todayHoliday.name, true)
        } else if (upcomingHoliday) {
          text = await generateHolidayMessage(upcomingHoliday.name, false)
        } else {
          return NextResponse.json(
            { success: false, text: null },
            { status: 200 }
          )
        }
        break
      }
      
      case 'birthday': {
        const birthday = await getUserBirthday(memoryService)
        const birthdayInfo = getBirthdayInfo(birthday)
        
        if (birthdayInfo?.isToday) {
          text = await generateBirthdayMessage(birthdayInfo.age)
        } else {
          return NextResponse.json(
            { success: false, text: null },
            { status: 200 }
          )
        }
        break
      }
      
      case 'seasonal':
      case 'weekday': {
        const seasonal = getSeasonalContext()
        text = await generateSeasonalComment(
          seasonal.season,
          seasonal.month,
          seasonal.weekday,
          seasonal.isWeekend,
          seasonal.isMonday,
          seasonal.isFriday
        )
        break
      }
      
      default:
        return NextResponse.json(
          { error: 'Unknown event type' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      text,
      type,
    })
  } catch (error) {
    console.error('[Special Events API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate special event message' },
      { status: 500 }
    )
  }
}












