/**
 * Activity Log Repository - Handles all activity_log table database operations
 *
 * Technical PM Note: This centralizes activity tracking operations.
 * No other file should directly query the activity_log table.
 */

import { BaseRepository } from './base-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { convertSupabaseError } from '@/lib/utils/supabase-error-helper'
import type { Database } from '@/lib/database.types'

type ActivityLog = Database['public']['Tables']['activity_log']['Row']
type ActivityLogInsert = Database['public']['Tables']['activity_log']['Insert']
type ActivityLogUpdate = Database['public']['Tables']['activity_log']['Update']

export class ActivityLogRepository extends BaseRepository {
  private static instance: ActivityLogRepository

  static getInstance(): ActivityLogRepository {
    if (!this.instance) {
      this.instance = new ActivityLogRepository()
    }
    return this.instance
  }

  /**
   * Log an activity
   */
  async logActivity(activity: Omit<ActivityLogInsert, 'id' | 'created_at'>): Promise<ActivityLog> {
    const timer = permanentLogger.timing('repository.logActivity')

    return this.execute('logActivity', async (client) => {
      permanentLogger.breadcrumb('repository', 'Logging activity', {
        action: activity.action,
        entityType: activity.entity_type,
        entityId: activity.entity_id,
        userId: activity.user_id,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('activity_log')
        .insert(activity)
        .select()
        .single()

      if (error) {
        const jsError = convertSupabaseError(error)
        permanentLogger.captureError('ACTIVITY_LOG_REPOSITORY', jsError, {
          operation: 'logActivity',
          activity
        })
        throw jsError
      }

      if (!data) {
        throw new Error('Failed to log activity - no data returned')
      }

      timer.stop()
      return data
    })
  }

  /**
   * Get activities for a project
   */
  async getProjectActivities(projectId: string, limit: number = 50): Promise<ActivityLog[]> {
    const timer = permanentLogger.timing('repository.getProjectActivities')

    return this.execute('getProjectActivities', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching project activities', {
        projectId,
        limit,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('activity_log')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        permanentLogger.captureError('ACTIVITY_LOG_REPOSITORY', error as Error, {
          operation: 'getProjectActivities',
          projectId,
          limit
        })
        throw error
      }

      timer.stop()
      return data || []
    })
  }

  /**
   * Get activities by user
   */
  async getUserActivities(userId: string, limit: number = 50): Promise<ActivityLog[]> {
    const timer = permanentLogger.timing('repository.getUserActivities')

    return this.execute('getUserActivities', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching user activities', {
        userId,
        limit,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('activity_log')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        permanentLogger.captureError('ACTIVITY_LOG_REPOSITORY', error as Error, {
          operation: 'getUserActivities',
          userId,
          limit
        })
        throw error
      }

      timer.stop()
      return data || []
    })
  }

  /**
   * Get activities by entity
   */
  async getEntityActivities(entityType: string, entityId: string, limit: number = 50): Promise<ActivityLog[]> {
    const timer = permanentLogger.timing('repository.getEntityActivities')

    return this.execute('getEntityActivities', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching entity activities', {
        entityType,
        entityId,
        limit,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('activity_log')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        permanentLogger.captureError('ACTIVITY_LOG_REPOSITORY', error as Error, {
          operation: 'getEntityActivities',
          entityType,
          entityId,
          limit
        })
        throw error
      }

      timer.stop()
      return data || []
    })
  }

  /**
   * Clean old activity logs
   */
  async cleanOldActivities(daysToKeep: number = 90): Promise<number> {
    const timer = permanentLogger.timing('repository.cleanOldActivities')

    return this.execute('cleanOldActivities', async (client) => {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

      permanentLogger.breadcrumb('repository', 'Cleaning old activities', {
        daysToKeep,
        cutoffDate: cutoffDate.toISOString(),
        timestamp: Date.now()
      })

      // First get count
      const { count, error: countError } = await client
        .from('activity_log')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', cutoffDate.toISOString())

      if (countError) {
        permanentLogger.captureError('ACTIVITY_LOG_REPOSITORY', countError as Error, {
          operation: 'cleanOldActivities.count',
          daysToKeep
        })
        throw countError
      }

      // Delete old activities
      const { error: deleteError } = await client
        .from('activity_log')
        .delete()
        .lt('created_at', cutoffDate.toISOString())

      if (deleteError) {
        permanentLogger.captureError('ACTIVITY_LOG_REPOSITORY', deleteError as Error, {
          operation: 'cleanOldActivities.delete',
          daysToKeep
        })
        throw deleteError
      }

      const deletedCount = count || 0
      timer.stop()

      permanentLogger.info('ACTIVITY_LOG_REPOSITORY', 'Old activities cleaned', {
        deletedCount,
        daysToKeep,
        cutoffDate: cutoffDate.toISOString()
      })

      return deletedCount
    })
  }
}