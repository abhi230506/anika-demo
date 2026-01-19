import { NextRequest, NextResponse } from 'next/server'
import { getMemoryService } from '@/lib/memory'

/**
 * POST /api/memory/forget
 * Delete a specific memory entry by key
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { key } = body
    
    if (!key || typeof key !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Memory key is required' },
        { status: 400 }
      )
    }
    
    const memoryService = getMemoryService()
    const deleted = await memoryService.deleteSlot(key)
    
    if (deleted) {
      return NextResponse.json({
        success: true,
        message: `Memory "${key}" has been forgotten`,
      })
    } else {
      return NextResponse.json(
        { success: false, error: `Memory "${key}" not found` },
        { status: 404 }
      )
    }
  } catch (error) {
    console.error('[Memory API] Forget error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to forget memory' },
      { status: 500 }
    )
  }
}

