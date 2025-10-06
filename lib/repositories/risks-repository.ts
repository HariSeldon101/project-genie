/**
 * Risks Repository - Handles all risks table database operations
 *
 * Technical PM Note: This centralizes risk management operations.
 * No other file should directly query the risks table.
 */

import { BaseRepository } from './base-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import type { Database } from '@/lib/database.types'

type Risk = Database['public']['Tables']['risks']['Row']
type RiskInsert = Database['public']['Tables']['risks']['Insert']
type RiskUpdate = Database['public']['Tables']['risks']['Update']

export class RisksRepository extends BaseRepository {
  private static instance: RisksRepository

  static getInstance(): RisksRepository {
    if (!this.instance) {
      this.instance = new RisksRepository()
    }
    return this.instance
  }

  /**
   * Get all risks for a project
   */
  async getProjectRisks(projectId: string): Promise<Risk[]> {
    const timer = permanentLogger.timing('repository.getProjectRisks')

    return this.execute('getProjectRisks', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching project risks', {
        projectId,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('risks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) {
        permanentLogger.captureError('RISKS_REPOSITORY', error as Error, {
          operation: 'getProjectRisks',
          projectId
        })
        throw error
      }

      timer.stop()
      return data || []
    })
  }

  /**
   * Get a single risk
   */
  async getRisk(riskId: string): Promise<Risk | null> {
    const timer = permanentLogger.timing('repository.getRisk')

    return this.execute('getRisk', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching risk', {
        riskId,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('risks')
        .select('*')
        .eq('id', riskId)
        .maybeSingle()

      if (error) {
        permanentLogger.captureError('RISKS_REPOSITORY', error as Error, {
          operation: 'getRisk',
          riskId
        })
        throw error
      }

      timer.stop()
      return data
    })
  }

  /**
   * Create a new risk
   */
  async createRisk(risk: Omit<RiskInsert, 'id' | 'created_at' | 'updated_at'>): Promise<Risk> {
    const timer = permanentLogger.timing('repository.createRisk')

    return this.execute('createRisk', async (client) => {
      permanentLogger.breadcrumb('repository', 'Creating risk', {
        projectId: risk.project_id,
        title: risk.title,
        impact: risk.impact,
        likelihood: risk.likelihood,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('risks')
        .insert(risk)
        .select()
        .single()

      if (error) {
        permanentLogger.captureError('RISKS_REPOSITORY', error as Error, {
          operation: 'createRisk',
          risk
        })
        throw error
      }

      if (!data) {
        throw new Error('Failed to create risk - no data returned')
      }

      timer.stop()
      return data
    })
  }

  /**
   * Update a risk
   */
  async updateRisk(riskId: string, updates: RiskUpdate): Promise<Risk> {
    const timer = permanentLogger.timing('repository.updateRisk')

    return this.execute('updateRisk', async (client) => {
      permanentLogger.breadcrumb('repository', 'Updating risk', {
        riskId,
        updates,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('risks')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', riskId)
        .select()
        .single()

      if (error) {
        permanentLogger.captureError('RISKS_REPOSITORY', error as Error, {
          operation: 'updateRisk',
          riskId,
          updates
        })
        throw error
      }

      if (!data) {
        throw new Error('Failed to update risk - no data returned')
      }

      timer.stop()
      return data
    })
  }

  /**
   * Delete a risk
   */
  async deleteRisk(riskId: string): Promise<void> {
    const timer = permanentLogger.timing('repository.deleteRisk')

    return this.execute('deleteRisk', async (client) => {
      permanentLogger.breadcrumb('repository', 'Deleting risk', {
        riskId,
        timestamp: Date.now()
      })

      const { error } = await client
        .from('risks')
        .delete()
        .eq('id', riskId)

      if (error) {
        permanentLogger.captureError('RISKS_REPOSITORY', error as Error, {
          operation: 'deleteRisk',
          riskId
        })
        throw error
      }

      timer.stop()
    })
  }
}