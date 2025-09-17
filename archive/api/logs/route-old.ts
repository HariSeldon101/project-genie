/**
 * Logs API Route
 * Uses Supabase RPC function for database logs
 * Implements automatic log rotation (keeps 7 days)
 * @module logs-api
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { permanentLogger } from '@/lib/utils/permanent-logger'

/**
 * Supabase RPC response type
 * Matches the get_all_permanent_logs function return structure
 */
interface SupabaseLogEntry {
  id: string
  log_timestamp: string
  log_level: string  // Changed from 'level' to match RPC
  category: string
  message: string
  data: any
  stack?: string
  request_id?: string
  breadcrumbs?: any  // plural in permanent_logs
  timing?: any       // renamed from 'performance'
  error_details?: any
  environment?: string
  user_id?: string
  session_id?: string  // TEXT type in permanent_logs
}

/**
 * Transform Supabase log to API format
 * Normalizes field names for frontend consumption
 */
function transformSupabaseLog(log: SupabaseLogEntry) {
  return {
    timestamp: log.log_timestamp,
    level: log.log_level,  // Changed to use log_level
    category: log.category,
    message: log.message,
    data: log.data,
    requestId: log.request_id,
    breadcrumbId: log.session_id,
    error: log.error_details,
    timingMs: log.timing?.duration,
    stack: log.stack,
    environment: log.environment
  }
}

/**
 * GET /api/logs - Fetch logs using Supabase RPC
 * Uses get_all_logs RPC function to bypass 1000 row limit
 */
export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const startTime = performance.now()

  try {
    const searchParams = request.nextUrl.searchParams
    const level = searchParams.get('level')
    const category = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '10000') // Higher default to show more logs
    const offset = parseInt(searchParams.get('offset') || '0') // Add offset for pagination
    const since = searchParams.get('since')
    const source = searchParams.get('source') || 'database'

    permanentLogger.breadcrumb('log-api', 'fetch-logs', {
      level,
      category,
      limit,
      since,
      source
    })

    let logs = []
    let breadcrumbs = []
    let timings = []
    let actualSource = source
    let totalDatabaseCount = 0

    if (source === 'database') {
      try {
        // Use Supabase RPC function for database logs
        const supabase = await createClient()
        
        // Call JSONB RPC function to bypass 1000 row limit
        // Balance between getting data and avoiding timeouts
        // 2000 seems to be the sweet spot before timeouts
        const actualLimit = Math.min(limit, 2000) // Cap at 2000 to prevent timeouts
        console.log('Calling JSONB RPC with limit:', actualLimit)
        
        // Log if we're limiting
        if (limit > 2000) {
          console.log('Note: Requested', limit, 'logs but limiting to 2000 to prevent timeout')
          permanentLogger.info('Log limit capped for performance', { requested: limit, actual: actualLimit })
        }
        
        permanentLogger.breadcrumb('log-api', 'rpc-call-start', {
          limit: actualLimit,
          offset,
          level,
          category
        })
        
        const { data: jsonbData, error } = await supabase.rpc('get_all_permanent_logs_jsonb', {
          p_limit: actualLimit,
          p_level: level === 'ALL' ? null : level?.toLowerCase(),
          p_category: category === 'ALL' ? null : category,
          p_since: since || null,
          p_user_id: null,  // Optional user filtering
          p_offset: offset  // Add offset parameter
        })

        if (error) {
          console.error('RPC function error:', error)
          permanentLogger.captureError('rpc-error', error as Error, {
            context: 'get_all_logs_rpc',
            details: error.message,
            hint: error.hint,
            code: error.code
          })
          // Don't throw - let error handling continue
          // This allows us to see the actual error in logs
          throw new Error(`Database query failed: ${error.message || 'Unknown error'}`)
        }
        
        // The JSONB function returns data directly as an object with logs and count
        console.log('JSONB response structure:', {
          hasJsonbData: !!jsonbData,
          jsonbDataType: typeof jsonbData,
          jsonbDataKeys: jsonbData ? Object.keys(jsonbData) : []
        })
        
        // Extract logs from JSONB response after error check
        // Handle both direct response and nested response formats
        const responseData = jsonbData?.get_all_permanent_logs_jsonb || jsonbData
        const data = responseData?.logs || []
        totalDatabaseCount = responseData?.count || 0
        
        permanentLogger.breadcrumb('log-api', 'rpc-response', {
          hasData: !!data,
          logCount: data?.length || 0,
          totalCount: totalDatabaseCount
        })

        console.log('JSONB RPC function returned:', {
          dataLength: data?.length || 0,
          totalCount: totalDatabaseCount,
          firstRow: data?.[0],
          hasData: !!data
        })

        // Transform logs to expected format
        logs = (data || []).map(transformSupabaseLog)
        
        // Extract breadcrumbs and timings from logs
        logs.forEach((log: any) => {
          if (log.data?.breadcrumbs && Array.isArray(log.data.breadcrumbs)) {
            breadcrumbs.push(...log.data.breadcrumbs)
          }
          if (log.data?.timing && Array.isArray(log.data.timing)) {
            timings.push(...log.data.timing)
          }
        })

        permanentLogger.info('Retrieved logs from Supabase', {
          count: logs.length,
          duration: performance.now() - startTime
        })

      } catch (dbError) {
        // Log error but DON'T fallback to memory - we need to see real errors
        console.error('Database error:', dbError)
        permanentLogger.captureError('database-fetch-error', dbError as Error, {
          context: 'log-api-database',
          level,
          category,
          error: String(dbError),
          message: (dbError as Error).message
        })

        // NO FALLBACK - throw the error so we can fix it
        // Following the CRITICAL guideline: NO MOCK DATA OR FALLBACKS
        throw dbError
      }
    } else {
      // Use memory logs if explicitly requested
      logs = permanentLogger.getRecentLogs({
        level: level === 'ALL' ? undefined : level as any,
        category: category === 'ALL' ? undefined : category,
        limit,
        since: since ? new Date(since) : undefined
      })
    }

    // Get current in-memory breadcrumbs and timings
    const memoryBreadcrumbs = permanentLogger.getBreadcrumbs()
    const memoryTimings = permanentLogger.getTimings()

    // Combine and deduplicate breadcrumbs
    const seenKeys = new Set<string>()
    const combinedBreadcrumbs: any[] = []
    
    // Add memory breadcrumbs first (most recent)
    memoryBreadcrumbs.forEach(b => {
      const key = `${b.timestamp}-${b.action}`
      if (!seenKeys.has(key)) {
        seenKeys.add(key)
        combinedBreadcrumbs.push(b)
      }
    })
    
    // Add database breadcrumbs
    breadcrumbs.forEach((b: any) => {
      const key = `${b.timestamp}-${b.action}`
      if (!seenKeys.has(key)) {
        seenKeys.add(key)
        combinedBreadcrumbs.push(b)
      }
    })

    // Combine timings
    const combinedTimings = [...memoryTimings, ...timings]

    // Log performance
    permanentLogger.timing('log-api-fetch', performance.now() - startTime, {
      source: actualSource,
      logCount: logs.length,
      breadcrumbCount: combinedBreadcrumbs.length,
      timingCount: combinedTimings.length
    })

    // Total count is already retrieved from JSONB response above
    // No need for separate count query

    return NextResponse.json({
      logs,
      breadcrumbs: combinedBreadcrumbs.slice(0, 100),
      timings: combinedTimings.slice(0, 100),
      count: logs.length,
      totalCount: totalDatabaseCount,
      source: actualSource,
      metadata: {
        maxLogs: 10000,
        currentCount: totalDatabaseCount,
        warningThreshold: 7000,
        criticalThreshold: 9000
      }
    })
  } catch (error: any) {
    // FIXED: Added category as first parameter for proper error logging
    permanentLogger.captureError('log-api-get', error as Error, {
      context: 'log-api-get',
      endpoint: 'GET /api/logs',
      // Properly serialize error to avoid [object Object]
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined
    })
    
    return NextResponse.json(
      { error: 'Failed to fetch logs', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/logs - Clear logs from database
 * Clears both memory and database logs
 */
export async function DELETE(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  try {
    permanentLogger.breadcrumb('log-api', 'clear-logs', {})

    // Clear memory logs
    if ('clearLogs' in permanentLogger) {
      (permanentLogger as any).clearLogs()
    }
    
    // Clear database logs using Supabase
    try {
      const supabase = await createClient()
      
      // Delete all logs from permanent_logs table
      const { error } = await supabase
        .from('permanent_logs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all (dummy condition)
      
      if (error) {
        throw error
      }
      
      permanentLogger.info('API', 'Database logs cleared successfully')
    } catch (dbError) {
      // FIXED: Added category as first parameter
      permanentLogger.captureError('log-api-clear-database', dbError as Error, {
        context: 'log-api-clear-database',
        operation: 'delete-all-logs'
      })
      // Continue even if database clear fails
    }
    
    permanentLogger.info('API', 'Logs cleared by user')
    
    return NextResponse.json({ 
      success: true,
      message: 'Logs cleared successfully'
    })
  } catch (error: any) {
    // FIXED: Added category as first parameter for proper error logging
    permanentLogger.captureError('log-api-delete', error as Error, {
      context: 'log-api-delete',
      endpoint: 'DELETE /api/logs',
      // Properly serialize error to avoid [object Object]
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined
    })
    
    return NextResponse.json(
      { error: 'Failed to clear logs', details: error.message },
      { status: 500 }
    )
  }
}