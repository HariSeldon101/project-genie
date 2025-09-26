import { NextRequest, NextResponse } from 'next/server'
import { CompanyIntelligenceRepository } from '@/lib/repositories/company-intelligence-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

interface RecoverRequest {
  sessionId: string
  resumeFromPhase?: number
}

/**
 * POST /api/company-intelligence/sessions/recover
 * Recover a failed or aborted session
 * Uses repository pattern for centralized data access
 */
export async function POST(request: NextRequest) {
  let sessionId = ''

  try {
    permanentLogger.breadcrumb('api', 'Starting session recovery', {
      endpoint: '/api/company-intelligence/sessions/recover'
    })

    const body: RecoverRequest = await request.json()
    sessionId = body.sessionId

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // Use repository for all database operations
    const repository = CompanyIntelligenceRepository.getInstance()

    // Recover the session using repository method
    const recoveredSession = await repository.recoverSession(sessionId)

    // If phase specified, update it
    if (body.resumeFromPhase !== undefined) {
      await repository.updateSessionPhase(sessionId, body.resumeFromPhase)
      recoveredSession.phase = body.resumeFromPhase
    }

    permanentLogger.info('SESSION_RECOVER_API', 'Session recovered successfully', {
      sessionId,
      status: recoveredSession.status,
      phase: recoveredSession.phase
    })

    return NextResponse.json({
      sessionId,
      status: 'recovered',
      session: recoveredSession,
      message: `Session recovered. Status: ${recoveredSession.status}, Phase: ${recoveredSession.phase}`
    })

  } catch (error) {
    permanentLogger.captureError('SESSION_RECOVER_API', error as Error, {
      sessionId,
      context: 'Failed to recover session'
    })

    // Check if it's a not found error
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Check if session is already completed
    if (error instanceof Error && error.message.includes('already completed')) {
      return NextResponse.json({
        sessionId,
        status: 'already_completed',
        message: 'Session has already completed successfully'
      })
    }

    return NextResponse.json(
      {
        error: 'Failed to recover session',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/company-intelligence/sessions/recover
 * Check if a session is recoverable
 * Uses repository pattern for centralized data access
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    permanentLogger.breadcrumb('api', 'Checking session recoverability', {
      sessionId
    })

    const repository = CompanyIntelligenceRepository.getInstance()

    try {
      // Get session from repository
      const session = await repository.getSession(sessionId)

      const recoverable = session.status !== 'completed' && session.status !== 'active'

      permanentLogger.info('SESSION_RECOVER_API', 'Session recoverability checked', {
        sessionId,
        recoverable,
        currentStatus: session.status
      })

      return NextResponse.json({
        sessionId,
        recoverable,
        currentStatus: session.status,
        currentPhase: session.phase,
        session
      })

    } catch (error) {
      // Session not found
      if (error instanceof Error && error.message.includes('not found')) {
        return NextResponse.json({
          sessionId,
          recoverable: false,
          error: 'Session not found'
        }, { status: 404 })
      }

      throw error
    }

  } catch (error) {
    permanentLogger.captureError('SESSION_RECOVER_API', error as Error, {
      context: 'Failed to check session recoverability'
    })

    return NextResponse.json(
      {
        error: 'Failed to check session',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}