/**
 * Logs API Route - Refactored to use Service Layer
 * Now a thin controller that delegates to services
 * Following SOLID principles - under 100 lines!
 * @module logs-api-refactored
 */

import { NextRequest, NextResponse } from 'next/server'
import { LogsService } from '@/lib/logs/services/logs-service'
import { permanentLogger } from '@/lib/utils/permanent-logger'

/**
 * GET /api/logs - Fetch paginated logs
 * Uses service layer for all business logic
 */
export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const startTime = performance.now()

  try {
    // Extract parameters from query string
    const searchParams = request.nextUrl.searchParams

    // Parse multi-select filters (comma-separated to arrays)
    const levelParam = searchParams.get('level')
    const categoryParam = searchParams.get('category')

    const params = {
      cursor: searchParams.get('cursor') || undefined,
      pageSize: parseInt(searchParams.get('pageSize') || '50'),
      // Parse comma-separated values into arrays for multi-select
      level: levelParam ? levelParam.split(',').filter(Boolean) : undefined,
      category: categoryParam ? categoryParam.split(',').filter(Boolean) : undefined,
      search: searchParams.get('search') || undefined,
      sortBy: searchParams.get('sortBy') as any || 'time-desc'
    }

    // Log request
    permanentLogger.breadcrumb('logs-api', 'request', {
      params,
      timestamp: new Date().toISOString()
    })

    // Delegate to service layer
    const response = await LogsService.getPaginatedLogs(params)

    // Check for errors
    if (response.error) {
      return NextResponse.json(
        { error: response.error, details: response.details },
        { status: 500 }
      )
    }

    // Log performance
    permanentLogger.timing('logs-api-total', performance.now() - startTime, {
      logsCount: response.logs.length,
      totalCount: response.stats?.total || 0
    })

    return NextResponse.json(response)
  } catch (error: any) {
    // Properly log error with category
    permanentLogger.captureError('logs-api-get', error as Error, {
      endpoint: 'GET /api/logs',
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
 * DELETE /api/logs - Clear all logs
 * Development only operation
 */
export async function DELETE(request: NextRequest) {
  // Debug environment detection
  console.log('🔴 DELETE /api/logs called')
  console.log('🔴 NODE_ENV:', process.env.NODE_ENV)
  console.log('🔴 NEXT_PUBLIC_APP_ENV:', process.env.NEXT_PUBLIC_APP_ENV)

  // More permissive check - allow in development or when explicitly enabled
  const isDevelopment = process.env.NODE_ENV === 'development' ||
                        process.env.NEXT_PUBLIC_APP_ENV === 'development'

  if (!isDevelopment && process.env.ALLOW_LOG_DELETE !== 'true') {
    console.log('🔴 DELETE blocked - not in development mode')
    return NextResponse.json({
      error: 'Not available in production',
      details: {
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
        isDevelopment
      }
    }, { status: 403 })
  }

  try {
    permanentLogger.breadcrumb('logs-api', 'clear-request', {
      timestamp: new Date().toISOString()
    })

    console.log('🔴 Calling LogsService.clearLogs()')
    // Delegate to service
    const result = await LogsService.clearLogs()
    console.log('✅ LogsService.clearLogs() completed:', result)

    return NextResponse.json({
      success: true,
      message: 'Logs cleared successfully',
      ...result
    })
  } catch (error: any) {
    console.error('❌ DELETE logs failed:', error)
    // Log the error properly before returning
    permanentLogger.captureError('logs-api-delete', error as Error, {
      endpoint: 'DELETE /api/logs',
      errorMessage: error.message,
      errorStack: error.stack
    })

    return NextResponse.json(
      { error: 'Failed to clear logs', details: error.message },
      { status: 500 }
    )
  }
}