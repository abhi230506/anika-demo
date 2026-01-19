import { NextRequest, NextResponse } from 'next/server'
import { getMemoryService } from '@/lib/memory'

/**
 * GET /api/memory/upcoming-event
 * Get an upcoming event within the next 3 days
 */
export async function GET(request: NextRequest) {
  try {
    const memoryService = getMemoryService()
    const memory = await memoryService.getUpcomingEvent(3)
    
    if (!memory) {
      return NextResponse.json({
        success: false,
        message: 'No upcoming events found',
      })
    }

    return NextResponse.json({
      success: true,
      memory,
    })
  } catch (error) {
    console.error('[Memory API] Upcoming event error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get upcoming event' },
      { status: 500 }
    )
  }
}

