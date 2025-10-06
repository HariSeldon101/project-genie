/**
 * Stakeholders Repository - Handles all stakeholders table database operations
 *
 * Technical PM Note: This centralizes stakeholder management operations.
 * No other file should directly query the stakeholders table.
 */

import { BaseRepository } from './base-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import type { Database } from '@/lib/database.types'

type Stakeholder = Database['public']['Tables']['stakeholders']['Row']
type StakeholderInsert = Database['public']['Tables']['stakeholders']['Insert']
type StakeholderUpdate = Database['public']['Tables']['stakeholders']['Update']

export class StakeholdersRepository extends BaseRepository {
  private static instance: StakeholdersRepository

  static getInstance(): StakeholdersRepository {
    if (!this.instance) {
      this.instance = new StakeholdersRepository()
    }
    return this.instance
  }

  /**
   * Get all stakeholders for a project
   */
  async getProjectStakeholders(projectId: string): Promise<Stakeholder[]> {
    const timer = permanentLogger.timing('repository.getProjectStakeholders')

    return this.execute('getProjectStakeholders', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching project stakeholders', {
        projectId,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('stakeholders')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) {
        permanentLogger.captureError('STAKEHOLDERS_REPOSITORY', error as Error, {
          operation: 'getProjectStakeholders',
          projectId
        })
        throw error
      }

      timer.stop()
      return data || []
    })
  }

  /**
   * Get a single stakeholder by ID
   */
  async getStakeholder(stakeholderId: string): Promise<Stakeholder | null> {
    const timer = permanentLogger.timing('repository.getStakeholder')

    return this.execute('getStakeholder', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching stakeholder', {
        stakeholderId,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('stakeholders')
        .select('*')
        .eq('id', stakeholderId)
        .maybeSingle()

      if (error) {
        permanentLogger.captureError('STAKEHOLDERS_REPOSITORY', error as Error, {
          operation: 'getStakeholder',
          stakeholderId
        })
        throw error
      }

      timer.stop()
      return data
    })
  }

  /**
   * Create a new stakeholder
   */
  async createStakeholder(stakeholder: Omit<StakeholderInsert, 'id' | 'created_at'>): Promise<Stakeholder> {
    const timer = permanentLogger.timing('repository.createStakeholder')

    return this.execute('createStakeholder', async (client) => {
      permanentLogger.breadcrumb('repository', 'Creating stakeholder', {
        projectId: stakeholder.project_id,
        name: stakeholder.name,
        role: stakeholder.role,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('stakeholders')
        .insert(stakeholder)
        .select()
        .single()

      if (error) {
        permanentLogger.captureError('STAKEHOLDERS_REPOSITORY', error as Error, {
          operation: 'createStakeholder',
          stakeholder
        })
        throw error
      }

      if (!data) {
        throw new Error('Failed to create stakeholder - no data returned')
      }

      permanentLogger.info('STAKEHOLDERS_REPOSITORY', 'Stakeholder created', {
        stakeholderId: data.id,
        projectId: stakeholder.project_id
      })

      timer.stop()
      return data
    })
  }

  /**
   * Update a stakeholder
   */
  async updateStakeholder(stakeholderId: string, updates: StakeholderUpdate): Promise<Stakeholder> {
    const timer = permanentLogger.timing('repository.updateStakeholder')

    return this.execute('updateStakeholder', async (client) => {
      permanentLogger.breadcrumb('repository', 'Updating stakeholder', {
        stakeholderId,
        fields: Object.keys(updates),
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('stakeholders')
        .update(updates)
        .eq('id', stakeholderId)
        .select()
        .single()

      if (error) {
        permanentLogger.captureError('STAKEHOLDERS_REPOSITORY', error as Error, {
          operation: 'updateStakeholder',
          stakeholderId
        })
        throw error
      }

      if (!data) {
        throw new Error('Stakeholder not found')
      }

      timer.stop()
      return data
    })
  }

  /**
   * Delete a stakeholder
   */
  async deleteStakeholder(stakeholderId: string): Promise<void> {
    const timer = permanentLogger.timing('repository.deleteStakeholder')

    return this.execute('deleteStakeholder', async (client) => {
      permanentLogger.breadcrumb('repository', 'Deleting stakeholder', {
        stakeholderId,
        timestamp: Date.now()
      })

      const { error } = await client
        .from('stakeholders')
        .delete()
        .eq('id', stakeholderId)

      if (error) {
        permanentLogger.captureError('STAKEHOLDERS_REPOSITORY', error as Error, {
          operation: 'deleteStakeholder',
          stakeholderId
        })
        throw error
      }

      permanentLogger.info('STAKEHOLDERS_REPOSITORY', 'Stakeholder deleted', {
        stakeholderId
      })

      timer.stop()
    })
  }

  /**
   * Delete all stakeholders for a project
   */
  async deleteProjectStakeholders(projectId: string): Promise<number> {
    const timer = permanentLogger.timing('repository.deleteProjectStakeholders')

    return this.execute('deleteProjectStakeholders', async (client) => {
      permanentLogger.breadcrumb('repository', 'Deleting project stakeholders', {
        projectId,
        timestamp: Date.now()
      })

      // First get count
      const { count } = await client
        .from('stakeholders')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)

      // Delete all
      const { error } = await client
        .from('stakeholders')
        .delete()
        .eq('project_id', projectId)

      if (error) {
        permanentLogger.captureError('STAKEHOLDERS_REPOSITORY', error as Error, {
          operation: 'deleteProjectStakeholders',
          projectId
        })
        throw error
      }

      permanentLogger.info('STAKEHOLDERS_REPOSITORY', 'Project stakeholders deleted', {
        projectId,
        count
      })

      timer.stop()
      return count || 0
    })
  }

  /**
   * Create multiple stakeholders at once
   */
  async createMultipleStakeholders(stakeholders: Omit<StakeholderInsert, 'id' | 'created_at'>[]): Promise<Stakeholder[]> {
    const timer = permanentLogger.timing('repository.createMultipleStakeholders')

    return this.execute('createMultipleStakeholders', async (client) => {
      permanentLogger.breadcrumb('repository', 'Creating multiple stakeholders', {
        count: stakeholders.length,
        projectId: stakeholders[0]?.project_id,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('stakeholders')
        .insert(stakeholders)
        .select()

      if (error) {
        permanentLogger.captureError('STAKEHOLDERS_REPOSITORY', error as Error, {
          operation: 'createMultipleStakeholders',
          count: stakeholders.length
        })
        throw error
      }

      permanentLogger.info('STAKEHOLDERS_REPOSITORY', 'Multiple stakeholders created', {
        count: data?.length || 0
      })

      timer.stop()
      return data || []
    })
  }

  /**
   * Get stakeholders by influence level
   */
  async getStakeholdersByInfluence(projectId: string, influenceLevel: 'high' | 'medium' | 'low'): Promise<Stakeholder[]> {
    const timer = permanentLogger.timing('repository.getStakeholdersByInfluence')

    return this.execute('getStakeholdersByInfluence', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching stakeholders by influence', {
        projectId,
        influenceLevel,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('stakeholders')
        .select('*')
        .eq('project_id', projectId)
        .eq('influence', influenceLevel)
        .order('interest', { ascending: false })

      if (error) {
        permanentLogger.captureError('STAKEHOLDERS_REPOSITORY', error as Error, {
          operation: 'getStakeholdersByInfluence',
          projectId,
          influenceLevel
        })
        throw error
      }

      timer.stop()
      return data || []
    })
  }
}