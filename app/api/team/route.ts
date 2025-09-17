/**
 * Team API - RESTful endpoints for team management
 *
 * Technical PM: ALL team operations go through here
 * UI components MUST NOT access database directly
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { TeamRepository } from '@/lib/repositories/team-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'

export async function GET(request: NextRequest) {
  const timer = permanentLogger.timing('api.team.get')

  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      timer.stop()
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    permanentLogger.breadcrumb('api', 'Fetching team members', {
      userId: user.id,
      timestamp: Date.now()
    })

    const teamRepo = TeamRepository.getInstance()
    const members = await teamRepo.getUserProjectTeams(user.id)

    permanentLogger.info('API_TEAM', 'Team members fetched', {
      userId: user.id,
      memberCount: members.length
    })

    timer.stop()
    return NextResponse.json(members)
  } catch (error) {
    timer.stop()
    permanentLogger.captureError('API_TEAM', error as Error, {
      endpoint: 'GET /api/team'
    })

    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const timer = permanentLogger.timing('api.team.post')

  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      timer.stop()
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { project_id, user_id, role } = body

    permanentLogger.breadcrumb('api', 'Adding team member', {
      projectId: project_id,
      userId: user_id,
      role,
      addedBy: user.id,
      timestamp: Date.now()
    })

    // Validate that the user owns the project
    const projectsRepo = (await import('@/lib/repositories/projects-repository')).ProjectsRepository.getInstance()
    const project = await projectsRepo.getProject(project_id)

    if (!project || project.owner_id !== user.id) {
      timer.stop()
      return NextResponse.json(
        { error: 'Not authorized to add members to this project' },
        { status: 403 }
      )
    }

    const teamRepo = TeamRepository.getInstance()
    const member = await teamRepo.addMember({
      project_id,
      user_id,
      role
    })

    permanentLogger.info('API_TEAM', 'Team member added', {
      memberId: member.id,
      projectId: project_id,
      userId: user_id,
      role
    })

    timer.stop()
    return NextResponse.json(member, { status: 201 })
  } catch (error) {
    timer.stop()
    permanentLogger.captureError('API_TEAM', error as Error, {
      endpoint: 'POST /api/team'
    })

    return NextResponse.json(
      { error: 'Failed to add team member' },
      { status: 500 }
    )
  }
}