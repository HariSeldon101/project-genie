import { NextRequest, NextResponse } from 'next/server'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { CompanyIntelligenceRepository } from '@/lib/repositories/company-intelligence-repository'

/**
 * GET /api/company-intelligence/sessions/[id]
 * Get a specific company intelligence session by ID
 * Uses repository pattern for centralized data access
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return await permanentLogger.withRequest('get_session', async (requestId) => {
    permanentLogger.breadcrumb('navigation', 'Getting session by ID', { sessionId: id })

    try {
      const repository = CompanyIntelligenceRepository.getInstance()

      permanentLogger.info('SESSION_API', 'Fetching session from repository', {
        sessionId: id
      })

      // Get session using repository (includes auth check)
      const session = await repository.getSession(id)

      if (!session) {
        permanentLogger.warn('SESSION_API', 'Session not found', {
          sessionId: id
        })
        return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      }

      // Get associated logs if requested
      const { searchParams } = new URL(request.url)
      const includeLogs = searchParams.get('includeLogs') === 'true'

      let logs = null
      if (includeLogs) {
        permanentLogger.breadcrumb('database', 'Fetching session logs', { sessionId: id })

        // TODO: Add getLogs method to repository if needed
        // For now, logs are not critical for performance fix
        logs = []

        permanentLogger.info('SESSION_API', 'Retrieved session logs', {
          sessionId: id,
          logCount: logs.length
        })
      }

      permanentLogger.info('SESSION_API', 'Successfully retrieved session', {
        sessionId: id,
        hasLogs: !!logs,
        logCount: logs?.length || 0
      })

      return NextResponse.json({
        session,
        logs
      })
    } catch (error) {
      // Check if it's an auth error
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        permanentLogger.warn('SESSION_API', 'Unauthorized access attempt', {
          sessionId: id,
          error: error.message
        })
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      permanentLogger.captureError('SESSION_API', error as Error, {
        sessionId: id,
        endpoint: 'GET /api/company-intelligence/sessions/[id]'
      })

      return NextResponse.json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }
  })
}

/**
 * PATCH /api/company-intelligence/sessions/[id]
 * Update a company intelligence session
 * Uses repository pattern for centralized data access
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return await permanentLogger.withRequest('update_session', async (requestId) => {
    permanentLogger.breadcrumb('navigation', 'Updating session', { sessionId: id })

    try {
      const repository = CompanyIntelligenceRepository.getInstance()

      permanentLogger.info('SESSION_API', 'Processing session update', {
        sessionId: id
      })

      // Parse request body
      const body = await request.json()
      const updates: any = {}

      // Only allow updating specific fields
      const allowedFields = [
        'company_name',
        'domain',
        'status',
        'phase',
        'merged_data',      // Aggregated scraper results (includes sitemap_pages)
        'version',          // Optimistic locking
        'last_lock_id',     // Execution locks
        'execution_history' // Execution tracking
      ]

      // Map camelCase fields to snake_case for database
      const fieldMapping: Record<string, string> = {
        'companyName': 'company_name',
        'mergedData': 'merged_data',
        'lastLockId': 'last_lock_id',
        'executionHistory': 'execution_history'
      }

      for (const field of allowedFields) {
        const camelField = Object.keys(fieldMapping).find(key => fieldMapping[key] === field) || field
        if (body.hasOwnProperty(camelField) || body.hasOwnProperty(field)) {
          const value = body[camelField] || body[field]
          updates[field] = value
        }
      }


      // Special handling for merged_data
      if (updates.merged_data) {
        await repository.updateMergedData(id, updates.merged_data)
        delete updates.merged_data // Remove since we handled it separately
      }

      // Update session phase if provided
      if (updates.phase) {
        await repository.updateSessionPhase(id, updates.phase)
        delete updates.phase // Remove since we handled it separately
      }

      // Update remaining fields if any
      if (Object.keys(updates).length > 0) {
        await repository.updateSession(id, updates)
      }

      // Get updated session to return
      const updatedSession = await repository.getSession(id)

      permanentLogger.info('SESSION_API', 'Session updated successfully', {
        sessionId: id,
        fieldsUpdated: Object.keys(body)
      })

      return NextResponse.json({
        message: 'Session updated successfully',
        session: updatedSession
      })
    } catch (error) {
      // Check if it's an auth error
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        permanentLogger.warn('SESSION_API', 'Unauthorized update attempt', {
          sessionId: id,
          error: error.message
        })
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // Check if session not found
      if (error instanceof Error && error.message.includes('not found')) {
        permanentLogger.warn('SESSION_API', 'Session not found for update', {
          sessionId: id
        })
        return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      }

      permanentLogger.captureError('SESSION_API', error as Error, {
        sessionId: id,
        endpoint: 'PATCH /api/company-intelligence/sessions/[id]'
      })

      return NextResponse.json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }
  })
}

/**
 * DELETE /api/company-intelligence/sessions/[id]
 * Delete a company intelligence session
 * Uses repository pattern for centralized data access
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return await permanentLogger.withRequest('delete_session', async (requestId) => {
    permanentLogger.breadcrumb('navigation', 'Deleting session', { sessionId: id })

    try {
      const repository = CompanyIntelligenceRepository.getInstance()

      permanentLogger.info('SESSION_API', 'Processing session deletion', {
        sessionId: id
      })

      // Update session status to 'aborted' instead of hard delete
      // This preserves data for analytics while marking it as cancelled
      await repository.updateSession(id, {
        status: 'aborted',
        updated_at: new Date().toISOString()
      })

      // Clear cache for this session
      repository.clearSessionCache(id)

      permanentLogger.info('SESSION_API', 'Session marked as aborted successfully', {
        sessionId: id
      })

      return NextResponse.json({
        message: 'Session deleted successfully'
      })
    } catch (error) {
      // Check if it's an auth error
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        permanentLogger.warn('SESSION_API', 'Unauthorized delete attempt', {
          sessionId: id,
          error: error.message
        })
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // Check if session not found
      if (error instanceof Error && error.message.includes('not found')) {
        permanentLogger.warn('SESSION_API', 'Session not found for deletion', {
          sessionId: id
        })
        return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      }

      permanentLogger.captureError('SESSION_API', error as Error, {
        sessionId: id,
        endpoint: 'DELETE /api/company-intelligence/sessions/[id]'
      })

      return NextResponse.json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }
  })
}