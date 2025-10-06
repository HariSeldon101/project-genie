/**
 * Individual Project API - Operations on specific projects
 *
 * Technical PM Note: Handles GET, PUT, DELETE for individual projects.
 * All operations verify ownership through the repository.
 *
 * Endpoints:
 * GET /api/projects/[id] - Get single project
 * PUT /api/projects/[id] - Update project
 * DELETE /api/projects/[id] - Delete project
 */

import { NextRequest, NextResponse } from 'next/server'
import { ProjectsRepository } from '@/lib/repositories/projects-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'

const projectsRepo = ProjectsRepository.getInstance()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const timer = permanentLogger.timing('api.project.get')

  try {
    const { id: projectId } = await params

    permanentLogger.breadcrumb('api', 'GET /api/projects/[id] request', {
      projectId,
      timestamp: Date.now()
    })

    const { searchParams } = new URL(request.url)
    const withCounts = searchParams.get('withCounts') === 'true'

    const project = withCounts
      ? await projectsRepo.getProjectWithCounts(projectId)
      : await projectsRepo.getProject(projectId)

    const duration = timer.stop()
    permanentLogger.breadcrumb('api', 'Project fetched successfully', {
      projectId,
      duration
    })

    return NextResponse.json(project)
  } catch (error) {
    const { id: projectId } = await params
    timer.stop()
    permanentLogger.captureError('API_PROJECT', error as Error, {
      method: 'GET',
      projectId
    })

    if (error instanceof Error) {
      if (error.message.includes('not authenticated')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      if (error.message.includes('not found')) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch project',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const timer = permanentLogger.timing('api.project.put')

  try {
    const { id: projectId } = await params

    permanentLogger.breadcrumb('api', 'PUT /api/projects/[id] request', {
      projectId,
      timestamp: Date.now()
    })

    const body = await request.json()

    // Update project through repository
    const project = await projectsRepo.updateProject(projectId, body)

    const duration = timer.stop()
    permanentLogger.breadcrumb('api', 'Project updated successfully', {
      projectId,
      duration
    })

    return NextResponse.json(project)
  } catch (error) {
    const { id: projectId } = await params
    timer.stop()
    permanentLogger.captureError('API_PROJECT', error as Error, {
      method: 'PUT',
      projectId
    })

    if (error instanceof Error) {
      if (error.message.includes('not authenticated')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      if (error.message.includes('not found')) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }
    }

    return NextResponse.json(
      {
        error: 'Failed to update project',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const timer = permanentLogger.timing('api.project.delete')

  try {
    const { id: projectId } = await params

    permanentLogger.breadcrumb('api', 'DELETE /api/projects/[id] request', {
      projectId,
      timestamp: Date.now()
    })

    // Delete project through repository
    await projectsRepo.deleteProject(projectId)

    const duration = timer.stop()
    permanentLogger.breadcrumb('api', 'Project deleted successfully', {
      projectId,
      duration
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const { id: projectId } = await params
    timer.stop()
    permanentLogger.captureError('API_PROJECT', error as Error, {
      method: 'DELETE',
      projectId
    })

    if (error instanceof Error) {
      if (error.message.includes('not authenticated')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      if (error.message.includes('not found')) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }
    }

    return NextResponse.json(
      {
        error: 'Failed to delete project',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}