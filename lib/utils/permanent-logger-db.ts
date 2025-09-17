/**
 * PermanentLogger Database Operations
 *
 * Technical PM Note: This module handles ONLY the database operations
 * for PermanentLogger to avoid circular dependencies.
 * PermanentLogger -> uses -> LogsRepository -> uses -> permanentLogger (for breadcrumbs)
 * would create a circular dependency.
 *
 * Solution: Direct database access is ALLOWED here as an exception because:
 * 1. This is the LOWEST level of the logging system
 * 2. LogsRepository itself uses permanentLogger for breadcrumbs
 * 3. We can't have the logger depend on itself
 *
 * This is the ONLY place where direct database access is acceptable.
 */

import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

type LogInsert = Database['public']['Tables']['permanent_logs']['Insert']

export class PermanentLoggerDB {
  private supabase: SupabaseClient | null = null

  /**
   * Get or create Supabase client
   * Technical PM: Lazy initialization to avoid startup issues
   */
  private getClient(): SupabaseClient {
    if (!this.supabase) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!url || !key) {
        throw new Error('Missing Supabase environment variables for logging')
      }

      this.supabase = createClient(url, key, {
        auth: {
          persistSession: false // Don't persist auth for logger
        }
      })
    }

    return this.supabase
  }

  /**
   * Flush logs to database
   * CRITICAL: This MUST use direct database access to avoid circular dependency
   */
  async flushLogs(logs: LogInsert[]): Promise<{
    success: boolean
    flushedCount: number
    error?: Error
  }> {
    try {
      const client = this.getClient()

      // Direct database call is REQUIRED here
      const { data, error } = await client
        .from('permanent_logs')
        .insert(logs)
        .select()

      if (error) {
        return {
          success: false,
          flushedCount: 0,
          error: new Error(error.message)
        }
      }

      return {
        success: true,
        flushedCount: logs.length
      }
    } catch (err) {
      return {
        success: false,
        flushedCount: 0,
        error: err as Error
      }
    }
  }

  /**
   * Clean old logs from database
   * Technical PM: Maintenance operation for log rotation
   */
  async cleanOldLogs(daysToKeep: number): Promise<{
    success: boolean
    deletedCount: number
    error?: Error
  }> {
    try {
      const client = this.getClient()

      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

      // Direct database call is REQUIRED here
      const { data, error } = await client
        .from('permanent_logs')
        .delete()
        .lt('log_timestamp', cutoffDate.toISOString())
        .select('id')

      if (error) {
        return {
          success: false,
          deletedCount: 0,
          error: new Error(error.message)
        }
      }

      return {
        success: true,
        deletedCount: data?.length || 0
      }
    } catch (err) {
      return {
        success: false,
        deletedCount: 0,
        error: err as Error
      }
    }
  }

  /**
   * Query logs from database
   * Technical PM: For retrieving historical logs
   */
  async queryLogs(params: {
    levels?: string[]
    categories?: string[]
    startDate?: Date
    endDate?: Date
    limit?: number
  }): Promise<any[]> {
    try {
      const client = this.getClient()

      // Build query - Direct database call is REQUIRED here
      let query = client.from('permanent_logs').select('*')

      if (params.levels?.length) {
        query = query.in('log_level', params.levels)
      }
      if (params.categories?.length) {
        query = query.in('category', params.categories)
      }
      if (params.startDate) {
        query = query.gte('log_timestamp', params.startDate.toISOString())
      }
      if (params.endDate) {
        query = query.lte('log_timestamp', params.endDate.toISOString())
      }

      query = query.order('log_timestamp', { ascending: false })

      if (params.limit) {
        query = query.limit(params.limit)
      }

      const { data, error } = await query

      if (error) {
        console.error('[PermanentLoggerDB] Query failed:', error.message)
        return []
      }

      return data || []
    } catch (err) {
      console.error('[PermanentLoggerDB] Query error:', err)
      return []
    }
  }
}

// Export singleton instance
export const permanentLoggerDB = new PermanentLoggerDB()