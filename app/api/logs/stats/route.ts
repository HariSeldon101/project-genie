/**
 * Logs Statistics API Route
 * Provides comprehensive log statistics and count information
 * Uses Supabase RPC functions to bypass row limits
 * @module logs-stats-api
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { permanentLogger } from '@/lib/utils/permanent-logger'

/**
 * GET /api/logs/stats - Get comprehensive log statistics
 * Returns counts, categories, and performance metrics
 */
export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const startTime = performance.now()

  try {
    const searchParams = request.nextUrl.searchParams
    const since = searchParams.get('since')
    
    permanentLogger.breadcrumb('log-api', 'fetch-stats', { since })

    const supabase = await createClient()
    
    // Get comprehensive statistics using RPC function
    const { data: stats, error: statsError } = await supabase.rpc('get_permanent_log_stats', {
      p_since: since ? new Date(since) : new Date(Date.now() - 24 * 60 * 60 * 1000) // Default 24 hours
    })

    if (statsError) {
      permanentLogger.captureError('log-stats-error', statsError as Error, {
        context: 'get_permanent_log_stats',
        details: statsError.message
      })
      throw statsError
    }

    // Get total count without time filter for storage calculation
    const { count: totalCount, error: countError } = await supabase
      .from('permanent_logs')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      permanentLogger.captureError('log-count-error', countError as Error, {
        context: 'total_count',
        details: countError.message
      })
    }

    const actualTotalCount = totalCount || 0
    const maxLogs = 10000
    const warningThreshold = 7000
    const criticalThreshold = 9000

    // Determine storage status and color
    let storageStatus = 'healthy'
    let storageColor = 'green'
    let storagePercentage = (actualTotalCount / maxLogs) * 100

    if (actualTotalCount >= criticalThreshold) {
      storageStatus = 'fatal'
      storageColor = 'red'
    } else if (actualTotalCount >= warningThreshold) {
      storageStatus = 'warning'
      storageColor = 'yellow'
    }

    // Extract stats data
    const statsData = stats?.[0] || {
      total_logs: 0,
      error_count: 0,
      warn_count: 0,
      categories: {},
      hourly_distribution: {}
    }

    // Log performance
    permanentLogger.timing('log-api-stats', performance.now() - startTime, {
      totalCount: actualTotalCount,
      statsCount: statsData.total_logs
    })

    return NextResponse.json({
      stats: {
        total: statsData.total_logs,
        errors: statsData.error_count,
        warnings: statsData.warn_count,
        categories: statsData.categories || {},
        hourlyDistribution: statsData.hourly_distribution || {}
      },
      storage: {
        current: actualTotalCount,
        max: maxLogs,
        percentage: Math.round(storagePercentage),
        status: storageStatus,
        color: storageColor,
        warningThreshold,
        criticalThreshold
      },
      metadata: {
        since: since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        fetchTime: performance.now() - startTime
      }
    })
  } catch (error: any) {
    permanentLogger.captureError('log-api-stats', error, {
      context: 'GET /api/logs/stats',
      endpoint: 'stats'
    })
    
    return NextResponse.json(
      { error: 'Failed to fetch log statistics', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/logs/stats/count - Get just the log count
 * Quick endpoint for real-time count updates
 */
export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  try {
    const supabase = await createClient()
    
    // Get total count
    const { count, error } = await supabase
      .from('permanent_logs')
      .select('*', { count: 'exact', head: true })

    if (error) {
      throw error
    }

    return NextResponse.json({ count: count || 0 })
  } catch (error: any) {
    permanentLogger.captureError('log-count', error, {
      context: 'POST /api/logs/stats/count'
    })
    
    return NextResponse.json(
      { error: 'Failed to fetch log count', details: error.message },
      { status: 500 }
    )
  }
}