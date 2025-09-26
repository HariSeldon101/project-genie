import { NextRequest, NextResponse } from 'next/server'
import { CompanyIntelligenceRepository } from '@/lib/repositories/company-intelligence-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'

/**
 * GET /api/company-intelligence/sessions/[id]/logs
 * Get logs for a specific session
 * Uses repository pattern for centralized data access
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params

  try {
    permanentLogger.breadcrumb('api', 'Fetching session logs', {
      endpoint: `/api/company-intelligence/sessions/${sessionId}/logs`,
      sessionId
    })

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')

    // Use repository for all database operations
    const repository = CompanyIntelligenceRepository.getInstance()

    // First verify session exists (this also checks ownership via RLS)
    const session = await repository.getSession(sessionId)

    // Get logs using repository method
    const logs = await repository.getSessionLogs(sessionId, limit)

    permanentLogger.info('SESSION_LOGS_API', 'Logs retrieved successfully', {
      sessionId,
      logCount: logs.length
    })

    return NextResponse.json({
      logs: logs || [],
      total: logs?.length || 0,
      sessionId
    })

  } catch (error) {
    permanentLogger.captureError('SESSION_LOGS_API', error as Error, {
      sessionId,
      context: 'Failed to fetch logs'
    })

    // Check if it's a not found error
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch logs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/company-intelligence/sessions/[id]/logs
 * Add a log entry for a session
 * Note: This typically happens through permanentLogger, not direct API calls
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params

  try {
    permanentLogger.breadcrumb('api', 'Adding session log', {
      endpoint: `/api/company-intelligence/sessions/${sessionId}/logs`,
      sessionId
    })

    // Parse request body
    const body = await request.json()
    const { level, category, message, metadata } = body

    // Validate required fields
    if (!level || !message) {
      return NextResponse.json(
        { error: 'Level and message are required' },
        { status: 400 }
      )
    }

    // Validate level
    const validLevels = ['debug', 'info', 'warn', 'error']
    if (!validLevels.includes(level)) {
      return NextResponse.json(
        { error: 'Invalid log level. Must be: debug, info, warn, or error' },
        { status: 400 }
      )
    }

    // Use repository to verify session exists
    const repository = CompanyIntelligenceRepository.getInstance()
    await repository.getSession(sessionId) // This will throw if not found

    // Use permanentLogger to create the log entry
    // This ensures consistency with the rest of the application
    permanentLogger[level as 'info' | 'warn' | 'debug'](
      category || 'SESSION_LOG',
      message,
      {
        ...metadata,
        sessionId,
        source: 'api'
      }
    )

    return NextResponse.json({
      message: 'Log created successfully',
      sessionId,
      level,
      category
    }, { status: 201 })

  } catch (error) {
    permanentLogger.captureError('SESSION_LOGS_API', error as Error, {
      sessionId,
      context: 'Failed to add log'
    })

    // Check if it's a not found error
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to create log',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}