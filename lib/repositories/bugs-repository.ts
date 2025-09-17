/**
 * Bugs Repository - Handles all bugs table database operations
 *
 * Technical PM Note: This centralizes bug tracking operations.
 * No other file should directly query the bugs table.
 */

import { BaseRepository } from './base-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import type { Database } from '@/lib/database.types'

type Bug = Database['public']['Tables']['bug_reports']['Row']
type BugInsert = Database['public']['Tables']['bug_reports']['Insert']
type BugUpdate = Database['public']['Tables']['bug_reports']['Update']

export type BugStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type BugPriority = 'low' | 'medium' | 'high' | 'critical'

export class BugsRepository extends BaseRepository {
  private static instance: BugsRepository

  static getInstance(): BugsRepository {
    if (!this.instance) {
      this.instance = new BugsRepository()
    }
    return this.instance
  }

  /**
   * Get all bugs for a project
   */
  async getProjectBugs(projectId: string): Promise<Bug[]> {
    const timer = permanentLogger.timing('repository.getProjectBugs')

    return this.execute('getProjectBugs', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching project bugs', {
        projectId,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('bug_reports')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) {
        permanentLogger.captureError('BUGS_REPOSITORY', error as Error, {
          operation: 'getProjectBugs',
          projectId
        })
        throw error
      }

      timer.stop()
      return data || []
    })
  }

  /**
   * Get ALL bugs globally (Beta feature - all users see all bugs)
   *
   * BETA TESTING NOTE: This is intentionally global for collaborative debugging.
   * All users can see all bugs across all projects during beta testing.
   */
  async getAllBugs(filters?: {
    status?: BugStatus
    priority?: BugPriority
    projectId?: string
  }): Promise<Bug[]> {
    const timer = permanentLogger.timing('repository.getAllBugs')

    return this.execute('getAllBugs', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching all bugs globally', {
        filters,
        timestamp: Date.now()
      })

      let query = client
        .from('bug_reports')
        .select('*')

      // Apply optional filters
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.priority) {
        query = query.eq('priority', filters.priority)
      }
      if (filters?.projectId) {
        query = query.eq('project_id', filters.projectId)
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })

      if (error) {
        permanentLogger.captureError('BUGS_REPOSITORY', error as Error, {
          operation: 'getAllBugs',
          filters
        })
        throw error
      }

      timer.stop()
      return data || []
    })
  }

  /**
   * Get all bugs for a user's projects
   *
   * BETA TESTING NOTE: Currently accepts any userId to allow viewing all bugs
   * during beta testing for collaborative debugging.
   * TODO: Before production, change to getCurrentUserBugs() for security
   */
  async getUserBugs(userId: string): Promise<Bug[]> {
    const timer = permanentLogger.timing('repository.getUserBugs')

    return this.execute('getUserBugs', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching user bugs', {
        userId,
        timestamp: Date.now()
      })

      // First get user's projects
      const { data: projects, error: projectsError } = await client
        .from('projects')
        .select('id')
        .eq('owner_id', userId)

      if (projectsError) {
        permanentLogger.captureError('BUGS_REPOSITORY', projectsError as Error, {
          operation: 'getUserProjects',
          userId
        })
        throw projectsError
      }

      if (!projects || projects.length === 0) {
        timer.stop()
        return []
      }

      const projectIds = projects.map(p => p.id)

      // Get bugs for those projects
      const { data, error } = await client
        .from('bug_reports')
        .select('*')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })

      if (error) {
        permanentLogger.captureError('BUGS_REPOSITORY', error as Error, {
          operation: 'getUserBugs',
          projectIds
        })
        throw error
      }

      timer.stop()
      return data || []
    })
  }

  /**
   * Get bugs by status
   */
  async getBugsByStatus(projectId: string, status: BugStatus): Promise<Bug[]> {
    const timer = permanentLogger.timing('repository.getBugsByStatus')

    return this.execute('getBugsByStatus', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching bugs by status', {
        projectId,
        status,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('bug_reports')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', status)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) {
        permanentLogger.captureError('BUGS_REPOSITORY', error as Error, {
          operation: 'getBugsByStatus',
          projectId,
          status
        })
        throw error
      }

      timer.stop()
      return data || []
    })
  }

  /**
   * Get a single bug
   */
  async getBug(bugId: string): Promise<Bug | null> {
    const timer = permanentLogger.timing('repository.getBug')

    return this.execute('getBug', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching bug', {
        bugId,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('bug_reports')
        .select('*')
        .eq('id', bugId)
        .maybeSingle()

      if (error) {
        permanentLogger.captureError('BUGS_REPOSITORY', error as Error, {
          operation: 'getBug',
          bugId
        })
        throw error
      }

      timer.stop()
      return data
    })
  }

  /**
   * Create a new bug
   */
  async createBug(bug: Omit<BugInsert, 'id' | 'created_at' | 'updated_at'>): Promise<Bug> {
    const timer = permanentLogger.timing('repository.createBug')

    return this.execute('createBug', async (client) => {
      permanentLogger.breadcrumb('repository', 'Creating bug', {
        projectId: bug.project_id,
        title: bug.title,
        status: bug.status,
        priority: bug.priority,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('bug_reports')
        .insert(bug)
        .select()
        .single()

      if (error) {
        permanentLogger.captureError('BUGS_REPOSITORY', error as Error, {
          operation: 'createBug',
          bug
        })
        throw error
      }

      if (!data) {
        throw new Error('Failed to create bug - no data returned')
      }

      timer.stop()
      return data
    })
  }

  /**
   * Update a bug
   */
  async updateBug(bugId: string, updates: BugUpdate): Promise<Bug> {
    const timer = permanentLogger.timing('repository.updateBug')

    return this.execute('updateBug', async (client) => {
      permanentLogger.breadcrumb('repository', 'Updating bug', {
        bugId,
        updates,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('bug_reports')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', bugId)
        .select()
        .single()

      if (error) {
        permanentLogger.captureError('BUGS_REPOSITORY', error as Error, {
          operation: 'updateBug',
          bugId,
          updates
        })
        throw error
      }

      if (!data) {
        throw new Error('Failed to update bug - no data returned')
      }

      timer.stop()
      return data
    })
  }

  /**
   * Delete a bug
   */
  async deleteBug(bugId: string): Promise<void> {
    const timer = permanentLogger.timing('repository.deleteBug')

    return this.execute('deleteBug', async (client) => {
      permanentLogger.breadcrumb('repository', 'Deleting bug', {
        bugId,
        timestamp: Date.now()
      })

      const { error } = await client
        .from('bug_reports')
        .delete()
        .eq('id', bugId)

      if (error) {
        permanentLogger.captureError('BUGS_REPOSITORY', error as Error, {
          operation: 'deleteBug',
          bugId
        })
        throw error
      }

      timer.stop()
    })
  }

  /**
   * Get bug statistics
   */
  async getBugStats(projectId: string): Promise<{
    total: number
    byStatus: Record<BugStatus, number>
    byPriority: Record<BugPriority, number>
  }> {
    const timer = permanentLogger.timing('repository.getBugStats')

    return this.execute('getBugStats', async (client) => {
      permanentLogger.breadcrumb('repository', 'Getting bug statistics', {
        projectId,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('bug_reports')
        .select('status, priority')
        .eq('project_id', projectId)

      if (error) {
        permanentLogger.captureError('BUGS_REPOSITORY', error as Error, {
          operation: 'getBugStats',
          projectId
        })
        throw error
      }

      const bugs = data || []

      const byStatus: Record<BugStatus, number> = {
        open: 0,
        in_progress: 0,
        resolved: 0,
        closed: 0
      }

      const byPriority: Record<BugPriority, number> = {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      }

      for (const bug of bugs) {
        if (bug.status in byStatus) {
          byStatus[bug.status as BugStatus]++
        }
        if (bug.priority && bug.priority in byPriority) {
          byPriority[bug.priority as BugPriority]++
        }
      }

      timer.stop()
      return {
        total: bugs.length,
        byStatus,
        byPriority
      }
    })
  }
}