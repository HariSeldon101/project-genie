/**
 * Project Full Details API - Gets project with stakeholders
 *
 * Technical PM: Provides complete project data for generation page
 * UI components MUST use this endpoint, not direct database access
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { ProjectsRepository } from '@/lib/repositories/projects-repository'
import { StakeholdersRepository } from '@/lib/repositories/stakeholders-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const timer = permanentLogger.timing('api.projects.full.get')

  try {
    const params = await context.params
    const projectId = params.id

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      timer.stop()
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    permanentLogger.breadcrumb('api', 'Fetching full project details', {
      projectId,
      userId: user.id,
      timestamp: Date.now()
    })

    // Use repositories instead of direct database access
    const projectsRepo = ProjectsRepository.getInstance()
    const stakeholdersRepo = StakeholdersRepository.getInstance()

    // Get project details
    const project = await projectsRepo.getProject(projectId)

    if (!project) {
      timer.stop()
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Verify user has access to this project
    if (project.owner_id !== user.id) {
      // Check if user is a team member
      const teamRepo = (await import('@/lib/repositories/team-repository')).TeamRepository.getInstance()
      const isMember = await teamRepo.isProjectMember(user.id, projectId)

      if (!isMember) {
        timer.stop()
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }
    }

    // Get stakeholders for the project
    const stakeholders = await stakeholdersRepo.getProjectStakeholders(projectId)

    permanentLogger.info('API_PROJECTS', 'Full project details fetched', {
      projectId,
      userId: user.id,
      stakeholderCount: stakeholders.length
    })

    timer.stop()
    return NextResponse.json({
      project,
      stakeholders
    })

  } catch (error) {
    timer.stop()
    permanentLogger.captureError('API_PROJECTS', error as Error, {
      endpoint: 'GET /api/projects/[id]/full'
    })

    return NextResponse.json(
      { error: 'Failed to fetch project details' },
      { status: 500 }
    )
  }
}