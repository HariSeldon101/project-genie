/**
 * Team Repository - Handles all project_members database operations
 *
 * Technical PM Note: This centralizes team member management.
 * No other file should directly query the project_members table.
 */

import { BaseRepository } from './base-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import type { Database } from '@/lib/database.types'

type TeamMember = Database['public']['Tables']['project_members']['Row']
type TeamMemberInsert = Database['public']['Tables']['project_members']['Insert']
type TeamMemberUpdate = Database['public']['Tables']['project_members']['Update']

export interface EnrichedTeamMember extends TeamMember {
  user?: {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
  }
  project?: {
    id: string
    name: string
  }
}

export class TeamRepository extends BaseRepository {
  private static instance: TeamRepository

  static getInstance(): TeamRepository {
    if (!this.instance) {
      this.instance = new TeamRepository()
    }
    return this.instance
  }

  /**
   * Get team members for a user's projects
   */
  async getUserProjectTeams(userId: string): Promise<EnrichedTeamMember[]> {
    const timer = permanentLogger.timing('repository.getUserProjectTeams')

    return this.execute('getUserProjectTeams', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching user project teams', {
        userId,
        timestamp: Date.now()
      })

      // First get user's projects
      const { data: projects, error: projectsError } = await client
        .from('projects')
        .select('id, name')
        .eq('owner_id', userId)

      if (projectsError) {
        permanentLogger.captureError('TEAM_REPOSITORY', projectsError as Error, {
          operation: 'getUserProjectTeams',
          userId
        })
        throw projectsError
      }

      if (!projects || projects.length === 0) {
        timer.stop()
        return []
      }

      const projectIds = projects.map(p => p.id)

      // Get team members for those projects
      const { data: members, error: membersError } = await client
        .from('project_members')
        .select('*')
        .in('project_id', projectIds)
        .order('added_at', { ascending: false })

      if (membersError) {
        permanentLogger.captureError('TEAM_REPOSITORY', membersError as Error, {
          operation: 'getProjectMembers',
          projectIds
        })
        throw membersError
      }

      if (!members || members.length === 0) {
        timer.stop()
        return []
      }

      // Get unique user IDs to fetch profiles
      const userIds = [...new Set(members.map(m => m.user_id))]

      // Fetch user profiles
      const { data: profiles, error: profilesError } = await client
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .in('id', userIds)

      if (profilesError) {
        permanentLogger.captureError('TEAM_REPOSITORY', profilesError as Error, {
          operation: 'getUserProfiles',
          userIds
        })
        throw profilesError
      }

      // Create lookup maps
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))
      const projectMap = Object.fromEntries(projects.map(p => [p.id, p]))

      // Enrich members with user and project data
      const enrichedMembers: EnrichedTeamMember[] = members.map(member => ({
        ...member,
        user: profileMap[member.user_id] || undefined,
        project: projectMap[member.project_id] || undefined
      }))

      timer.stop()
      return enrichedMembers
    })
  }

  /**
   * Get team members for specific projects
   */
  async getProjectMembers(projectIds: string[]): Promise<EnrichedTeamMember[]> {
    const timer = permanentLogger.timing('repository.getProjectMembers')

    return this.execute('getProjectMembers', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching project members', {
        projectCount: projectIds.length,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('project_members')
        .select(`
          *,
          profiles:user_id (
            id,
            email,
            full_name,
            avatar_url
          ),
          projects:project_id (
            id,
            name
          )
        `)
        .in('project_id', projectIds)
        .order('added_at', { ascending: false })

      if (error) {
        permanentLogger.captureError('TEAM_REPOSITORY', error as Error, {
          operation: 'getProjectMembers',
          projectIds
        })
        throw error
      }

      timer.stop()
      return data || []
    })
  }

  /**
   * Add a new team member
   */
  async addMember(member: Omit<TeamMemberInsert, 'id' | 'added_at'>): Promise<TeamMember> {
    const timer = permanentLogger.timing('repository.addMember')

    return this.execute('addMember', async (client) => {
      permanentLogger.breadcrumb('repository', 'Adding team member', {
        projectId: member.project_id,
        userId: member.user_id,
        role: member.role,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('project_members')
        .insert(member)
        .select()
        .single()

      if (error) {
        permanentLogger.captureError('TEAM_REPOSITORY', error as Error, {
          operation: 'addMember',
          member
        })
        throw error
      }

      if (!data) {
        throw new Error('Failed to add team member - no data returned')
      }

      timer.stop()
      return data
    })
  }

  /**
   * Update team member role
   */
  async updateMemberRole(memberId: string, role: string): Promise<TeamMember> {
    const timer = permanentLogger.timing('repository.updateMemberRole')

    return this.execute('updateMemberRole', async (client) => {
      permanentLogger.breadcrumb('repository', 'Updating member role', {
        memberId,
        newRole: role,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('project_members')
        .update({ role })
        .eq('id', memberId)
        .select()
        .single()

      if (error) {
        permanentLogger.captureError('TEAM_REPOSITORY', error as Error, {
          operation: 'updateMemberRole',
          memberId,
          role
        })
        throw error
      }

      if (!data) {
        throw new Error('Failed to update member role - no data returned')
      }

      timer.stop()
      return data
    })
  }

  /**
   * Remove a team member
   */
  async removeMember(memberId: string): Promise<void> {
    const timer = permanentLogger.timing('repository.removeMember')

    return this.execute('removeMember', async (client) => {
      permanentLogger.breadcrumb('repository', 'Removing team member', {
        memberId,
        timestamp: Date.now()
      })

      const { error } = await client
        .from('project_members')
        .delete()
        .eq('id', memberId)

      if (error) {
        permanentLogger.captureError('TEAM_REPOSITORY', error as Error, {
          operation: 'removeMember',
          memberId
        })
        throw error
      }

      timer.stop()
    })
  }

  /**
   * Check if user is member of project
   */
  async isProjectMember(userId: string, projectId: string): Promise<boolean> {
    const timer = permanentLogger.timing('repository.isProjectMember')

    return this.execute('isProjectMember', async (client) => {
      permanentLogger.breadcrumb('repository', 'Checking project membership', {
        userId,
        projectId,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('project_members')
        .select('id')
        .eq('user_id', userId)
        .eq('project_id', projectId)
        .maybeSingle()

      if (error) {
        permanentLogger.captureError('TEAM_REPOSITORY', error as Error, {
          operation: 'isProjectMember',
          userId,
          projectId
        })
        throw error
      }

      timer.stop()
      return !!data
    })
  }
}