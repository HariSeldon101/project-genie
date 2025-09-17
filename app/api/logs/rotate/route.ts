import { NextRequest, NextResponse } from 'next/server'
import { permanentLogger } from '@/lib/utils/permanent-logger'

// POST /api/logs/rotate - Rotate old logs
export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  try {
    // Get days to keep from query params or default to 7
    const searchParams = request.nextUrl.searchParams
    const daysToKeep = parseInt(searchParams.get('days') || '7')
    
    permanentLogger.info('LOG_ROTATION', `Starting log rotation (keeping last ${daysToKeep} days)`)

    // Rotate logs
    await permanentLogger.rotateLogs(daysToKeep)

    permanentLogger.info('LOG_ROTATION', 'Log rotation completed successfully')
    
    return NextResponse.json({ 
      success: true,
      message: `Logs rotated successfully (kept last ${daysToKeep} days)`
    })
  } catch (error: any) {
    permanentLogger.captureError('LOG_ROTATION', error, {
      endpoint: 'POST /api/logs/rotate'
    })
    
    return NextResponse.json(
      { error: 'Failed to rotate logs', details: error.message },
      { status: 500 }
    )
  }
}