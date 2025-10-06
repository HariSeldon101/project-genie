/**
 * Generation Analytics Repository - Handles all generation_analytics table database operations
 *
 * Technical PM Note: This centralizes AI generation metrics and analytics.
 * No other file should directly query the generation_analytics table.
 */

import { BaseRepository } from './base-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import type { Database } from '@/lib/database.types'

type GenerationAnalytics = Database['public']['Tables']['generation_analytics']['Row']
type GenerationAnalyticsInsert = Database['public']['Tables']['generation_analytics']['Insert']
type GenerationAnalyticsUpdate = Database['public']['Tables']['generation_analytics']['Update']

export class GenerationAnalyticsRepository extends BaseRepository {
  private static instance: GenerationAnalyticsRepository

  static getInstance(): GenerationAnalyticsRepository {
    if (!this.instance) {
      this.instance = new GenerationAnalyticsRepository()
    }
    return this.instance
  }

  /**
   * Store generation analytics
   */
  async storeAnalytics(analytics: Omit<GenerationAnalyticsInsert, 'id' | 'created_at'>): Promise<GenerationAnalytics> {
    const timer = permanentLogger.timing('repository.storeAnalytics')

    return this.execute('storeAnalytics', async (client) => {
      permanentLogger.breadcrumb('repository', 'Storing generation analytics', {
        projectId: analytics.project_id,
        artifactId: analytics.artifact_id,
        model: analytics.model,
        provider: analytics.provider,
        totalTokens: analytics.total_tokens,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('generation_analytics')
        .insert(analytics)
        .select()
        .single()

      if (error) {
        permanentLogger.captureError('GENERATION_ANALYTICS_REPOSITORY', error as Error, {
          operation: 'storeAnalytics',
          analytics
        })
        throw error
      }

      if (!data) {
        throw new Error('Failed to store analytics - no data returned')
      }

      timer.stop()
      return data
    })
  }

  /**
   * Get analytics for a project
   */
  async getProjectAnalytics(projectId: string): Promise<GenerationAnalytics[]> {
    const timer = permanentLogger.timing('repository.getProjectAnalytics')

    return this.execute('getProjectAnalytics', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching project analytics', {
        projectId,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('generation_analytics')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) {
        permanentLogger.captureError('GENERATION_ANALYTICS_REPOSITORY', error as Error, {
          operation: 'getProjectAnalytics',
          projectId
        })
        throw error
      }

      timer.stop()
      return data || []
    })
  }

  /**
   * Get analytics for an artifact
   */
  async getArtifactAnalytics(artifactId: string): Promise<GenerationAnalytics | null> {
    const timer = permanentLogger.timing('repository.getArtifactAnalytics')

    return this.execute('getArtifactAnalytics', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching artifact analytics', {
        artifactId,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('generation_analytics')
        .select('*')
        .eq('artifact_id', artifactId)
        .maybeSingle()

      if (error) {
        permanentLogger.captureError('GENERATION_ANALYTICS_REPOSITORY', error as Error, {
          operation: 'getArtifactAnalytics',
          artifactId
        })
        throw error
      }

      timer.stop()
      return data
    })
  }

  /**
   * Get total cost for a project
   */
  async getProjectTotalCost(projectId: string): Promise<number> {
    const timer = permanentLogger.timing('repository.getProjectTotalCost')

    return this.execute('getProjectTotalCost', async (client) => {
      permanentLogger.breadcrumb('repository', 'Calculating project total cost', {
        projectId,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('generation_analytics')
        .select('total_cost')
        .eq('project_id', projectId)

      if (error) {
        permanentLogger.captureError('GENERATION_ANALYTICS_REPOSITORY', error as Error, {
          operation: 'getProjectTotalCost',
          projectId
        })
        throw error
      }

      const totalCost = (data || []).reduce((sum, item) => sum + (item.total_cost || 0), 0)

      timer.stop()
      return totalCost
    })
  }

  /**
   * Get analytics summary for a user
   */
  async getUserAnalyticsSummary(userId: string): Promise<{
    totalGenerations: number
    totalTokens: number
    totalCost: number
    modelUsage: Record<string, number>
  }> {
    const timer = permanentLogger.timing('repository.getUserAnalyticsSummary')

    return this.execute('getUserAnalyticsSummary', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching user analytics summary', {
        userId,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('generation_analytics')
        .select('total_tokens, total_cost, model')
        .eq('user_id', userId)

      if (error) {
        permanentLogger.captureError('GENERATION_ANALYTICS_REPOSITORY', error as Error, {
          operation: 'getUserAnalyticsSummary',
          userId
        })
        throw error
      }

      const analytics = data || []
      const modelUsage: Record<string, number> = {}

      let totalTokens = 0
      let totalCost = 0

      for (const item of analytics) {
        totalTokens += item.total_tokens || 0
        totalCost += item.total_cost || 0

        if (item.model) {
          modelUsage[item.model] = (modelUsage[item.model] || 0) + 1
        }
      }

      timer.stop()
      return {
        totalGenerations: analytics.length,
        totalTokens,
        totalCost,
        modelUsage
      }
    })
  }
}