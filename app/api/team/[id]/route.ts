/**
 * Team Member API - Individual member operations
 *
 * Technical PM: Handles role updates and member removal
 * UI components MUST NOT access database directly
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { TeamRepository } from '@/lib/repositories/team-repository'
import { ProjectsRepository } from '@/lib/repositories/projects-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const timer = permanentLogger.timing('api.team.member.put')

  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      timer.stop()
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const memberId = params.id
    const body = await request.json()
    const { role } = body

    permanentLogger.breadcrumb('api', 'Updating team member role', {
      memberId,
      newRole: role,
      userId: user.id,
      timestamp: Date.now()
    })

    const teamRepo = TeamRepository.getInstance()
    const projectsRepo = ProjectsRepository.getInstance()

    // Get the team member to find which project they belong to
    const members = await teamRepo.getUserProjectTeams(user.id)
    const member = members.find(m => m.id === memberId)

    if (!member) {
      timer.stop()
      return NextResponse.json(
        { error: 'Team member not found' },
        { status: 404 }
      )
    }

    // Verify user has permission to update this member (must be project owner)
    const project = await projectsRepo.getProject(member.project_id)
    if (!project || project.owner_id !== user.id) {
      timer.stop()
      return NextResponse.json(
        { error: 'Not authorized to update this team member' },
        { status: 403 }
      )
    }
    const updatedMember = await teamRepo.updateMemberRole(memberId, role)

    permanentLogger.info('API_TEAM', 'Team member role updated', {
      memberId,
      newRole: role,
      updatedBy: user.id
    })

    timer.stop()
    return NextResponse.json(updatedMember)
  } catch (error) {
    timer.stop()
    permanentLogger.captureError('API_TEAM', error as Error, {
      endpoint: 'PUT /api/team/[id]',
      memberId: params.id
    })

    return NextResponse.json(
      { error: 'Failed to update team member' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const timer = permanentLogger.timing('api.team.member.delete')

  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      timer.stop()
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const memberId = params.id

    permanentLogger.breadcrumb('api', 'Removing team member', {
      memberId,
      userId: user.id,
      timestamp: Date.now()
    })

    const teamRepo = TeamRepository.getInstance()
    const projectsRepo = ProjectsRepository.getInstance()

    // Get the team member to find which project they belong to
    const members = await teamRepo.getUserProjectTeams(user.id)
    const member = members.find(m => m.id === memberId)

    if (!member) {
      timer.stop()
      return NextResponse.json(
        { error: 'Team member not found' },
        { status: 404 }
      )
    }

    // Verify user has permission to remove this member (must be project owner)
    const project = await projectsRepo.getProject(member.project_id)
    if (!project || project.owner_id !== user.id) {
      timer.stop()
      return NextResponse.json(
        { error: 'Not authorized to remove this team member' },
        { status: 403 }
      )
    }
    await teamRepo.removeMember(memberId)

    permanentLogger.info('API_TEAM', 'Team member removed', {
      memberId,
      removedBy: user.id
    })

    timer.stop()
    return NextResponse.json({ success: true })
  } catch (error) {
    timer.stop()
    permanentLogger.captureError('API_TEAM', error as Error, {
      endpoint: 'DELETE /api/team/[id]',
      memberId: params.id
    })

    return NextResponse.json(
      { error: 'Failed to remove team member' },
      { status: 500 }
    )
  }
}