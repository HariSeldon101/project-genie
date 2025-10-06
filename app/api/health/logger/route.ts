/**
 * Logger Health Check Endpoint
 *
 * CLAUDE.md compliance:
 * - Provides visibility into logger state
 * - No graceful degradation - shows real issues
 * - Helps diagnose lockup problems
 */

import { NextResponse } from 'next/server'
import { permanentLogger } from '@/lib/utils/permanent-logger'

export async function GET() {
  try {
    const metrics = permanentLogger.getHealthMetrics()

    // Determine health status
    const isHealthy =
      !metrics.circuitBreakerOpen &&
      metrics.bufferSize < metrics.maxBufferSize * 0.9 &&
      metrics.successRate > 50

    // Add server metrics
    const memoryUsage = process.memoryUsage()
    const serverMetrics = {
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
      },
      uptime: Math.round(process.uptime()),
      nodeVersion: process.version
    }

    // Warnings for various conditions
    const warnings = []
    if (metrics.circuitBreakerOpen) {
      warnings.push(`Circuit breaker OPEN - ${Math.round(metrics.circuitBreakerRemainingMs / 1000)}s remaining`)
    }
    if (metrics.bufferSize > metrics.maxBufferSize * 0.7) {
      warnings.push(`Buffer filling up: ${metrics.bufferSize}/${metrics.maxBufferSize}`)
    }
    if (metrics.droppedLogsCount > 0) {
      warnings.push(`${metrics.droppedLogsCount} logs dropped`)
    }
    if (metrics.successRate < 80) {
      warnings.push(`Low flush success rate: ${metrics.successRate}%`)
    }

    return NextResponse.json({
      status: isHealthy ? 'healthy' : 'degraded',
      logger: metrics,
      server: serverMetrics,
      warnings,
      timestamp: new Date().toISOString()
    }, {
      status: isHealthy ? 200 : 503 // 503 Service Unavailable if unhealthy
    })

  } catch (error) {
    // Log but don't use permanentLogger here (avoid recursion)
    console.error('[Health Check] Failed:', error)

    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Health check failed',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}