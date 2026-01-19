import { NextRequest, NextResponse } from 'next/server'
import { getMemoryService } from '@/lib/memory'

/**
 * POST /api/memory/clear
 * Clear all memories
 */
export async function POST(request: NextRequest) {
  try {
    const memoryService = getMemoryService()
    await memoryService.clearAll()
    
    return NextResponse.json({
      success: true,
      message: 'All memories have been cleared',
    })
  } catch (error) {
    console.error('[Memory API] Clear error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to clear memories' },
      { status: 500 }
    )
  }
}

