/**
 * Bugs API - RESTful endpoints for bug tracking
 *
 * Technical PM: ALL bug operations go through here
 * UI components MUST NOT access database directly
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { BugsRepository } from '@/lib/repositories/bugs-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'

export async function GET(request: NextRequest) {
  const timer = permanentLogger.timing('api.bugs.get')

  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      timer.stop()
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status')

    permanentLogger.breadcrumb('api', 'Fetching bugs', {
      userId: user.id,
      projectId,
      status,
      timestamp: Date.now()
    })

    const bugsRepo = BugsRepository.getInstance()

    // BETA FEATURE: Global bug visibility for collaborative debugging
    // All users see all bugs across all projects
    const filters: any = {}
    if (projectId) filters.projectId = projectId
    if (status) filters.status = status

    const bugs = await bugsRepo.getAllBugs(filters)

    permanentLogger.info('API_BUGS', 'Bugs fetched', {
      userId: user.id,
      projectId,
      status,
      bugCount: bugs.length
    })

    timer.stop()
    return NextResponse.json(bugs)
  } catch (error) {
    timer.stop()
    permanentLogger.captureError('API_BUGS', error as Error, {
      endpoint: 'GET /api/bugs'
    })

    return NextResponse.json(
      { error: 'Failed to fetch bugs' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const timer = permanentLogger.timing('api.bugs.post')

  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      timer.stop()
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { project_id, title, description, priority, status } = body

    permanentLogger.breadcrumb('api', 'Creating bug', {
      projectId: project_id,
      title,
      priority,
      status,
      reportedBy: user.id,
      timestamp: Date.now()
    })

    // Validate that the user has access to the project
    const projectsRepo = (await import('@/lib/repositories/projects-repository')).ProjectsRepository.getInstance()
    const project = await projectsRepo.getProject(project_id)

    if (!project || project.owner_id !== user.id) {
      // Check if user is a team member
      const teamRepo = (await import('@/lib/repositories/team-repository')).TeamRepository.getInstance()
      const isMember = await teamRepo.isProjectMember(user.id, project_id)

      if (!isMember) {
        timer.stop()
        return NextResponse.json(
          { error: 'Not authorized to create bugs for this project' },
          { status: 403 }
        )
      }
    }

    const bugsRepo = BugsRepository.getInstance()
    const bug = await bugsRepo.createBug({
      project_id,
      title,
      description,
      priority: priority || 'medium',
      status: status || 'open',
      reported_by: user.id
    })

    permanentLogger.info('API_BUGS', 'Bug created', {
      bugId: bug.id,
      projectId: project_id,
      title,
      reportedBy: user.id
    })

    timer.stop()
    return NextResponse.json(bug, { status: 201 })
  } catch (error) {
    timer.stop()
    permanentLogger.captureError('API_BUGS', error as Error, {
      endpoint: 'POST /api/bugs'
    })

    return NextResponse.json(
      { error: 'Failed to create bug' },
      { status: 500 }
    )
  }
}