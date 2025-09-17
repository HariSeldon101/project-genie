import { NextRequest, NextResponse } from 'next/server'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { CompanyIntelligenceRepository } from '@/lib/repositories/company-intelligence-repository'

/**
 * GET /api/company-intelligence/sessions/[id]/phase-data
 * Get phase data for a session (all or specific stage)
 * Uses repository pattern with caching for performance
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  return await permanentLogger.withRequest('get_phase_data', async (requestId) => {
    permanentLogger.breadcrumb('navigation', 'Getting phase data', { sessionId: id })

    try {
      const repository = CompanyIntelligenceRepository.getInstance()

      // Get query parameters
      const { searchParams } = new URL(request.url)
      const stage = searchParams.get('stage')

      permanentLogger.info('PHASE_DATA_API', 'Fetching phase data', {
        sessionId: id,
        stage: stage || 'all'
      })

      let data: any

      if (stage) {
        // Get specific stage data
        data = await repository.getPhaseData(id, stage)

        if (!data) {
          permanentLogger.info('PHASE_DATA_API', 'No data found for stage', {
            sessionId: id,
            stage
          })
          return NextResponse.json({ [stage]: null })
        }

        return NextResponse.json({ [stage]: data })
      } else {
        // Get all phase data
        data = await repository.getAllPhaseData(id)

        permanentLogger.info('PHASE_DATA_API', 'Retrieved all phase data', {
          sessionId: id,
          stages: Object.keys(data)
        })

        return NextResponse.json(data)
      }
    } catch (error) {
      // Check if it's an auth error
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        permanentLogger.warn('PHASE_DATA_API', 'Unauthorized access attempt', {
          sessionId: id,
          error: error.message
        })
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      permanentLogger.captureError('PHASE_DATA_API', error as Error, {
        sessionId: id,
        endpoint: 'GET /api/company-intelligence/sessions/[id]/phase-data'
      })

      return NextResponse.json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }
  })
}

/**
 * PATCH /api/company-intelligence/sessions/[id]/phase-data
 * Save or update phase data for a specific stage
 * Implements sliding window cleanup automatically
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  return await permanentLogger.withRequest('save_phase_data', async (requestId) => {
    permanentLogger.breadcrumb('navigation', 'Saving phase data', { sessionId: id })

    try {
      const repository = CompanyIntelligenceRepository.getInstance()

      // Parse request body
      const body = await request.json()
      const { stage, data } = body

      if (!stage) {
        permanentLogger.warn('PHASE_DATA_API', 'Missing stage parameter')
        return NextResponse.json(
          { error: 'Stage parameter is required' },
          { status: 400 }
        )
      }

      permanentLogger.info('PHASE_DATA_API', 'Saving phase data', {
        sessionId: id,
        stage,
        dataSize: JSON.stringify(data).length
      })

      // Save phase data
      await repository.savePhaseData(id, stage, data)

      // Cleanup old phase data (sliding window)
      // This keeps only the 2 most recent stages in the database
      await repository.cleanupOldPhaseData(id, 2)

      permanentLogger.info('PHASE_DATA_API', 'Phase data saved successfully', {
        sessionId: id,
        stage
      })

      return NextResponse.json({
        message: 'Phase data saved successfully',
        stage
      })
    } catch (error) {
      // Check if it's an auth error
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        permanentLogger.warn('PHASE_DATA_API', 'Unauthorized update attempt', {
          sessionId: id,
          error: error.message
        })
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      permanentLogger.captureError('PHASE_DATA_API', error as Error, {
        sessionId: id,
        endpoint: 'PATCH /api/company-intelligence/sessions/[id]/phase-data'
      })

      return NextResponse.json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }
  })
}

/**
 * DELETE /api/company-intelligence/sessions/[id]/phase-data
 * Delete phase data for a specific stage or all stages
 * Used for cleanup and starting fresh
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  return await permanentLogger.withRequest('delete_phase_data', async (requestId) => {
    permanentLogger.breadcrumb('navigation', 'Deleting phase data', { sessionId: id })

    try {
      const repository = CompanyIntelligenceRepository.getInstance()

      // Get query parameters
      const { searchParams } = new URL(request.url)
      const stage = searchParams.get('stage')

      if (stage) {
        // Delete specific stage
        permanentLogger.info('PHASE_DATA_API', 'Deleting stage data', {
          sessionId: id,
          stage
        })

        await repository.deletePhaseData(id, stage)

        return NextResponse.json({
          message: `Phase data for ${stage} deleted successfully`
        })
      } else {
        // Clear all phase data
        permanentLogger.info('PHASE_DATA_API', 'Clearing all phase data', {
          sessionId: id
        })

        // Get all stages and delete them
        const allData = await repository.getAllPhaseData(id)
        const stages = Object.keys(allData)

        for (const stageToDelete of stages) {
          await repository.deletePhaseData(id, stageToDelete)
        }

        // Clear session cache
        repository.clearSessionCache(id)

        permanentLogger.info('PHASE_DATA_API', 'All phase data cleared', {
          sessionId: id,
          stagesDeleted: stages.length
        })

        return NextResponse.json({
          message: 'All phase data cleared successfully',
          stagesDeleted: stages.length
        })
      }
    } catch (error) {
      // Check if it's an auth error
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        permanentLogger.warn('PHASE_DATA_API', 'Unauthorized delete attempt', {
          sessionId: id,
          error: error.message
        })
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      permanentLogger.captureError('PHASE_DATA_API', error as Error, {
        sessionId: id,
        endpoint: 'DELETE /api/company-intelligence/sessions/[id]/phase-data'
      })

      return NextResponse.json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }
  })
}