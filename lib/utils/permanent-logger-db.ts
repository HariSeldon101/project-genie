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
 *
 * ============================================================================
 * 🚨 CRITICAL AUTHENTICATION ISSUE (2025-01-17) - MUST READ!
 * ============================================================================
 *
 * PROBLEM: This file currently has an authentication storage mismatch that causes
 * RLS policy violations and prevents logs from being saved to the database!
 *
 * THE ISSUE:
 * - Main app uses @supabase/ssr → stores auth in COOKIES
 * - This file uses @supabase/supabase-js → looks for auth in LOCAL STORAGE
 * - Result: Authenticated users appear as anonymous, triggering RLS violations
 *
 * SYMPTOMS YOU'LL SEE:
 * - Browser console: "Failed to load resource: status 401"
 * - Error: "new row violates row-level security policy for table permanent_logs"
 * - Logs not persisting to database despite successful authentication
 *
 * THE FIX (see CLAUDE.md for full implementation):
 * Replace the getClient() method with environment-aware initialization:
 * - Client-side: Use createBrowserClient from @supabase/ssr
 * - Server-side: Use createClient from @supabase/supabase-js
 *
 * IMPORTANT SECURITY NOTES:
 * - NEVER use service role key client-side (critical security violation!)
 * - The anon key is safe for public use
 * - RLS policies already allow inserts with "Allow all inserts" policy
 *
 * For complete fix instructions, see:
 * /CLAUDE.md → "CRITICAL: PermanentLogger Authentication Issue (2025-01-17)"
 * ============================================================================
 */

import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

type LogInsert = Database['public']['Tables']['permanent_logs']['Insert']

export class PermanentLoggerDB {
  private supabase: SupabaseClient | null = null

  // Singleton pattern for shared client across all logger instances
  private static sharedClient: SupabaseClient | null = null
  private static clientCreationTime: number = 0
  private static readonly CLIENT_MAX_AGE = 3600000 // 1 hour

  /**
   * Get or create Supabase client
   * Technical PM: Lazy initialization to avoid startup issues
   */
  private getClient(): SupabaseClient {
    const now = Date.now()

    // Use existing shared client if it's not too old
    if (PermanentLoggerDB.sharedClient &&
        (now - PermanentLoggerDB.clientCreationTime) < PermanentLoggerDB.CLIENT_MAX_AGE) {
      return PermanentLoggerDB.sharedClient
    }

    // Reset old client
    if (PermanentLoggerDB.sharedClient) {
      console.info('[PermanentLoggerDB.getClient] Recreating Supabase client (age limit reached)')
      PermanentLoggerDB.sharedClient = null
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const isServer = typeof window === 'undefined'

    if (!url || !anonKey) {
      throw new Error('Missing Supabase environment variables for logging')
    }

    if (isServer) {
      // Server-side: Use service role key to bypass RLS
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      const key = serviceRoleKey || anonKey

      this.supabase = createClient(url, key, {
        auth: {
          persistSession: false
        }
      })
      PermanentLoggerDB.sharedClient = this.supabase
    } else {
      // Client-side: Use createBrowserClient to read auth from cookies
      // This is what the rest of the app uses for auth
      this.supabase = createBrowserClient(url, anonKey)
      PermanentLoggerDB.sharedClient = this.supabase
    }

    PermanentLoggerDB.clientCreationTime = now
    console.log('[PermanentLoggerDB.getClient] Created new shared Supabase client')

    return PermanentLoggerDB.sharedClient
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

      // Create timeout promise (CLAUDE.md: No hanging operations)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Database flush timeout after 10 seconds'))
        }, 10000)
      })

      // Clean logs to ensure no 'id' field is included
      // CLAUDE.md: Never generate UUIDs in code - let PostgreSQL handle it
      const cleanedLogs = logs.map(log => {
        const { id, ...cleanLog } = log as any
        return cleanLog
      })

      // Create operation promise
      const operationPromise = client
        .from('permanent_logs')
        .insert(cleanedLogs)
        .select()

      // Race between operation and timeout
      const { data, error } = await Promise.race([
        operationPromise,
        timeoutPromise.catch(timeoutError => ({
          data: null,
          error: { message: timeoutError.message }
        }))
      ])

      if (error) {
        // CLAUDE.md: Convert Supabase error properly
        // Note: convertSupabaseError is not available here (circular dep)
        // So we create a proper Error object
        const errorMessage = error.message || 'Unknown database error'
        const jsError = new Error(errorMessage)
        jsError.name = 'SupabaseError'

        // Log the actual error for debugging - ensure we have valid data to log
        const errorDetails = {
          message: errorMessage,
          code: (error as any)?.code || 'UNKNOWN',
          details: (error as any)?.details || null,
          hint: (error as any)?.hint || null
        }

        // Only log if we have meaningful error information
        if (errorMessage !== 'Unknown database error' || errorDetails.code !== 'UNKNOWN') {
          console.error('[PermanentLoggerDB.flushLogs] Database error:', errorDetails)
        }

        // Reset client on timeout to prevent connection issues
        if (error.message.includes('timeout')) {
          console.warn('[PermanentLoggerDB.flushLogs] Resetting Supabase client after timeout')
          PermanentLoggerDB.sharedClient = null
        }

        return {
          success: false,
          flushedCount: 0,
          error: jsError
        }
      }

      return {
        success: true,
        flushedCount: logs.length
      }
    } catch (err) {
      // Handle any unexpected errors
      console.error('[PermanentLoggerDB.flushLogs] Unexpected error:', err)

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
          error: new Error(error.message || 'Failed to delete old logs')
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
        console.error('[PermanentLoggerDB] Query failed:', error?.message || 'Unknown query error')
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