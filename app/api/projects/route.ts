/**
 * Projects API - RESTful endpoints for project operations
 *
 * Technical PM Note: This is the ONLY way UI components access project data.
 * UI → API → Repository → Database (never direct database access from UI)
 *
 * Endpoints:
 * GET /api/projects - List user's projects (optionally with counts)
 * POST /api/projects - Create new project
 *
 * For specific project operations, see [id]/route.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { ProjectsRepository } from '@/lib/repositories/projects-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { EventFactory, StreamWriter } from '@/lib/realtime-events' // Unified event system

const projectsRepo = ProjectsRepository.getInstance()

export async function GET(request: NextRequest) {
  const timer = permanentLogger.timing('api.projects.get')

  try {
    permanentLogger.breadcrumb('api', 'GET /api/projects request', {
      timestamp: Date.now()
    })

    const { searchParams } = new URL(request.url)
    const withCounts = searchParams.get('withCounts') === 'true'
    const stream = searchParams.get('stream') === 'true'

    // SSE streaming support for real-time updates
    if (stream) {
      const correlationId = `projects_${Date.now()}`
      const streamWriter = new StreamWriter(
        'projects_stream',
        correlationId,
        request.signal // Handle client disconnects
      )

      // Start streaming response
      const response = new Response(streamWriter.createStream(), {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no' // Disable nginx buffering
        }
      })

      // Fetch data async and stream progress
      projectsRepo
        .getUserProjectsWithCounts()
        .then(async (projects) => {
          // Send progress events for each project
          for (let i = 0; i < projects.length; i++) {
            await streamWriter.sendEvent(
              EventFactory.progress(
                i + 1,
                projects.length,
                `Loading project ${projects[i].name}`,
                { projectId: projects[i].id }
              )
            )
          }

          // Send complete event with all data
          await streamWriter.sendEvent(
            EventFactory.complete(projects, { correlationId })
          )
        })
        .catch(async (error) => {
          permanentLogger.captureError('API_PROJECTS_STREAM', error, {
            correlationId
          })
          await streamWriter.sendEvent(
            EventFactory.error(error, { correlationId })
          )
        })
        .finally(() => {
          streamWriter.close()
        })

      return response
    }

    // Regular JSON response
    const projects = withCounts
      ? await projectsRepo.getUserProjectsWithCounts()
      : await projectsRepo.getUserProjects()

    const duration = timer.stop()
    permanentLogger.breadcrumb('api', 'Projects fetched successfully', {
      count: projects.length,
      withCounts,
      duration
    })

    return NextResponse.json(projects)
  } catch (error) {
    timer.stop()
    permanentLogger.captureError('API_PROJECTS', error as Error, {
      method: 'GET',
      url: request.url
    })

    // Check specific error types - NO FALLBACK DATA
    if (error instanceof Error) {
      if (error.message.includes('not authenticated')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      if (error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
    }

    // Generic error - but never hide it with fallback
    return NextResponse.json(
      {
        error: 'Failed to fetch projects',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const timer = permanentLogger.timing('api.projects.post')

  try {
    permanentLogger.breadcrumb('api', 'POST /api/projects request', {
      timestamp: Date.now()
    })

    const body = await request.json()

    // Validate required fields
    if (!body.name || !body.methodology_type) {
      const validationError = new Error('Missing required fields: name and methodology_type')
      permanentLogger.captureError('API_PROJECTS', validationError, {
        method: 'POST',
        body
      })
      return NextResponse.json({ error: validationError.message }, { status: 400 })
    }

    // Create project through repository
    const project = await projectsRepo.createProject(body)

    const duration = timer.stop()
    permanentLogger.breadcrumb('api', 'Project created successfully', {
      projectId: project.id,
      duration
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    timer.stop()
    permanentLogger.captureError('API_PROJECTS', error as Error, {
      method: 'POST'
    })

    // Never return success with fallback data
    return NextResponse.json(
      {
        error: 'Failed to create project',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}