import { NextRequest, NextResponse } from 'next/server'
import { getMemoryService } from '@/lib/memory'

/**
 * GET /api/memory/recall
 * Get a relevant memory for proactive recall
 */
export async function GET(request: NextRequest) {
  try {
    const memoryService = getMemoryService()
    const memory = await memoryService.getRelevantMemoryForRecall()
    
    if (!memory) {
      return NextResponse.json({
        success: false,
        message: 'No suitable memory found for recall',
      })
    }

    return NextResponse.json({
      success: true,
      memory,
    })
  } catch (error) {
    console.error('[Memory API] Recall error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get recall memory' },
      { status: 500 }
    )
  }
}

