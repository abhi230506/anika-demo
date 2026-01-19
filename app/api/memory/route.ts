import { NextRequest, NextResponse } from 'next/server'
import { getMemoryService } from '@/lib/memory'

/**
 * GET /api/memory
 * Returns all stored memories
 */
export async function GET(request: NextRequest) {
  try {
    const memoryService = getMemoryService()
    const memories = await memoryService.getAllMemories()
    
    return NextResponse.json({
      success: true,
      data: memories,
    })
  } catch (error) {
    console.error('[Memory API] GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve memories' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/memory
 * Update memory settings (e.g., enable/disable)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const memoryService = getMemoryService()
    
    if (typeof body.enabled === 'boolean') {
      await memoryService.setEnabled(body.enabled)
      return NextResponse.json({
        success: true,
        message: `Memory ${body.enabled ? 'enabled' : 'disabled'}`,
      })
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[Memory API] POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update memory settings' },
      { status: 500 }
    )
  }
}

