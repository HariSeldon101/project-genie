import { NextRequest, NextResponse } from 'next/server'
import { StakeholdersRepository } from '@/lib/repositories/stakeholders-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'

/**
 * GET /api/stakeholders
 * Get stakeholders for a project
 */
export async function GET(request: NextRequest) {
  const timer = permanentLogger.timing('api.stakeholders.get')

  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      timer.stop()
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    permanentLogger.breadcrumb('api', 'Fetching stakeholders', { projectId })

    const stakeholdersRepo = StakeholdersRepository.getInstance()
    const stakeholders = await stakeholdersRepo.getProjectStakeholders(projectId)

    timer.stop()
    permanentLogger.info('API_STAKEHOLDERS', 'Stakeholders retrieved', {
      projectId,
      count: stakeholders.length
    })

    return NextResponse.json(stakeholders)
  } catch (error) {
    permanentLogger.captureError('API_STAKEHOLDERS', error as Error, {
      operation: 'GET'
    })
    timer.stop()
    return NextResponse.json(
      { error: 'Failed to fetch stakeholders' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/stakeholders
 * Create stakeholders for a project
 * Accepts array of stakeholders to create in bulk
 */
export async function POST(request: NextRequest) {
  const timer = permanentLogger.timing('api.stakeholders.post')

  try {
    const body = await request.json()

    // Support both single and bulk creation
    const stakeholders = Array.isArray(body) ? body : [body]

    if (stakeholders.length === 0) {
      timer.stop()
      return NextResponse.json(
        { error: 'No stakeholders provided' },
        { status: 400 }
      )
    }

    // Validate required fields
    for (const stakeholder of stakeholders) {
      if (!stakeholder.project_id || !stakeholder.name) {
        timer.stop()
        return NextResponse.json(
          { error: 'Each stakeholder must have project_id and name' },
          { status: 400 }
        )
      }
    }

    permanentLogger.breadcrumb('api', 'Creating stakeholders', {
      count: stakeholders.length,
      projectId: stakeholders[0].project_id
    })

    const stakeholdersRepo = StakeholdersRepository.getInstance()
    const created = await stakeholdersRepo.createMultipleStakeholders(stakeholders)

    timer.stop()
    permanentLogger.info('API_STAKEHOLDERS', 'Stakeholders created', {
      count: created.length
    })

    return NextResponse.json(created)
  } catch (error) {
    permanentLogger.captureError('API_STAKEHOLDERS', error as Error, {
      operation: 'POST'
    })
    timer.stop()
    return NextResponse.json(
      { error: 'Failed to create stakeholders' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/stakeholders
 * Update a stakeholder
 */
export async function PUT(request: NextRequest) {
  const timer = permanentLogger.timing('api.stakeholders.put')

  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      timer.stop()
      return NextResponse.json(
        { error: 'Stakeholder ID is required' },
        { status: 400 }
      )
    }

    permanentLogger.breadcrumb('api', 'Updating stakeholder', { id })

    const stakeholdersRepo = StakeholdersRepository.getInstance()
    const updated = await stakeholdersRepo.updateStakeholder(id, updates)

    timer.stop()
    permanentLogger.info('API_STAKEHOLDERS', 'Stakeholder updated', { id })

    return NextResponse.json(updated)
  } catch (error) {
    permanentLogger.captureError('API_STAKEHOLDERS', error as Error, {
      operation: 'PUT'
    })
    timer.stop()
    return NextResponse.json(
      { error: 'Failed to update stakeholder' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/stakeholders
 * Delete a stakeholder
 */
export async function DELETE(request: NextRequest) {
  const timer = permanentLogger.timing('api.stakeholders.delete')

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      timer.stop()
      return NextResponse.json(
        { error: 'Stakeholder ID is required' },
        { status: 400 }
      )
    }

    permanentLogger.breadcrumb('api', 'Deleting stakeholder', { id })

    const stakeholdersRepo = StakeholdersRepository.getInstance()
    await stakeholdersRepo.deleteStakeholder(id)

    timer.stop()
    permanentLogger.info('API_STAKEHOLDERS', 'Stakeholder deleted', { id })

    return NextResponse.json({ success: true })
  } catch (error) {
    permanentLogger.captureError('API_STAKEHOLDERS', error as Error, {
      operation: 'DELETE'
    })
    timer.stop()
    return NextResponse.json(
      { error: 'Failed to delete stakeholder' },
      { status: 500 }
    )
  }
}