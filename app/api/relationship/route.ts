import { NextRequest, NextResponse } from 'next/server'
import { getMemoryService } from '@/lib/memory'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/**
 * GET /api/relationship - Get relationship depth data
 * POST /api/relationship - Handle relationship milestones and celebrations
 */
export async function GET() {
  try {
    const memoryService = getMemoryService()
    const relationshipDepth = await memoryService.getRelationshipDepth()
    
    return NextResponse.json(relationshipDepth)
  } catch (error: any) {
    console.error('[Relationship API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get relationship data' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/relationship
 * 
 * Actions:
 * - celebrate_milestone: Generate celebration message for a milestone
 * - celebrate_anniversary: Generate celebration message for an anniversary
 * - reference_joke: Generate message referencing an inside joke
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, milestoneId, momentId, jokeId, turnCount, daysSinceFirst, conversationHistory } = body
    
    const memoryService = getMemoryService()
    
    if (action === 'celebrate_milestone' && milestoneId) {
      const relationshipDepth = await memoryService.getRelationshipDepth()
      const milestone = relationshipDepth.milestones.find(m => m.id === milestoneId)
      
      if (!milestone || milestone.celebrated) {
        return NextResponse.json({ error: 'Milestone not found or already celebrated' }, { status: 404 })
      }
      
      // Generate celebration message
      const systemPrompt = `You are celebrating a relationship milestone with someone you've been talking to. Be genuine, warm, and personal. Don't overdo it - keep it natural and heartfelt.`
      
      const userPrompt = `The milestone is: ${milestone.title}. ${milestone.description || ''}. This is our ${milestone.value || 'N/A'} conversation together. Generate a brief, warm celebration message (2-3 sentences).`
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 150,
      })
      
      const message = completion.choices[0]?.message?.content || "That's a nice milestone we've reached together!"
      
      // Mark as celebrated
      await memoryService.celebrateMilestone(milestoneId)
      
      return NextResponse.json({ message, milestone })
    }
    
    if (action === 'celebrate_anniversary' && momentId) {
      const relationshipDepth = await memoryService.getRelationshipDepth()
      const moment = relationshipDepth.significant_moments.find(m => m.id === momentId)
      
      if (!moment) {
        return NextResponse.json({ error: 'Moment not found' }, { status: 404 })
      }
      
      const systemPrompt = `You are celebrating an anniversary or special moment with someone you've been talking to. Be warm, personal, and thoughtful. Reference the significance of this moment naturally.`
      
      const userPrompt = `This is an anniversary: ${moment.description}. Context: ${moment.context || 'This is a special moment we shared'}. Generate a brief, warm anniversary message (2-3 sentences).`
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 150,
      })
      
      const message = completion.choices[0]?.message?.content || "It's been a special time together!"
      
      // Mark as celebrated
      await memoryService.celebrateMoment(momentId)
      
      return NextResponse.json({ message, moment })
    }
    
    if (action === 'reference_joke' && jokeId) {
      const relationshipDepth = await memoryService.getRelationshipDepth()
      const joke = relationshipDepth.inside_jokes.find(j => j.id === jokeId)
      
      if (!joke) {
        return NextResponse.json({ error: 'Joke not found' }, { status: 404 })
      }
      
      const systemPrompt = `You're naturally referencing an inside joke or shared reference. Be subtle and playful - don't overexplain it, just let the reference land naturally.`
      
      const userPrompt = `Reference this inside joke naturally: "${joke.description}". Context: ${joke.context || 'A shared reference we have'}. Make it feel natural and not forced.`
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.9,
        max_tokens: 100,
      })
      
      const message = completion.choices[0]?.message?.content || "You know what I mean!"
      
      return NextResponse.json({ message, joke })
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('[Relationship API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to process relationship action' },
      { status: 500 }
    )
  }
}












