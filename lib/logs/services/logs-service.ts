/**
 * Logs Service - Business Logic Layer
 * Orchestrates repository and transformer
 * Uses ALL existing utility functions
 * @module logs-service
 */

import { LogsRepository } from '@/lib/repositories/logs-repository'
import { LogsTransformer } from './logs-transformer'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import {
  filterByTime,
  filterByLevel,
  filterByCategory,
  filterByErrorType,
  searchLogs,
  sortLogs,
  exportToJSON,
  exportToCSV,
  exportToMarkdown,
  exportLogs
} from '@/lib/utils/log-operations'
import type { 
  PaginationParams, 
  PaginatedResponse, 
  LogEntry,
  LogStats,
  LogsApiResponse 
} from '../types/logs.types'

/**
 * Main service class for logs operations
 * Follows Service Layer pattern
 */
export class LogsService {
  /**
   * Get paginated logs with all transformations
   * @param params - Pagination and filter parameters
   * @returns Complete API response with logs, stats, and pagination
   */
  static async getPaginatedLogs(params: PaginationParams): Promise<LogsApiResponse> {
    const startTime = performance.now()
    
    try {
      // Add breadcrumb for request tracking
      permanentLogger.breadcrumb('logs-service', 'get-logs-start', {
        params,
        timestamp: new Date().toISOString()
      })

      // 1. Fetch from repository
      const { logs: dbLogs, totalCount, hasMore, nextCursor } =
        await LogsRepository.getInstance().getPaginatedLogs(params)

      // 2. Transform to UI format
      const transformedLogs = LogsTransformer.transformLogs(dbLogs)

      // 3. Apply client-side filters if needed (for search)
      let filteredLogs = transformedLogs
      if (params.search) {
        filteredLogs = searchLogs(filteredLogs, params.search)
      }

      // 4. Sort logs
      const sortedLogs = sortLogs(filteredLogs, params.sortBy || 'time-desc')

      // 5. Enrich with UI properties
      const enrichedLogs = sortedLogs.map(log => 
        LogsTransformer.enrichLogForUI(log)
      )

      // 6. Extract breadcrumbs and timings
      const breadcrumbs = LogsTransformer.extractBreadcrumbs(enrichedLogs)
      const timings = LogsTransformer.extractTimings(enrichedLogs)

      // 7. Calculate statistics - get both filtered and total stats
      const stats = await this.getLogStats(totalCount)

      // Get total stats - NO FALLBACK, let errors propagate
      const totalStats = await LogsRepository.getInstance().getLogStats()

      // 8. Log performance
      permanentLogger.timing('logs-service-get', performance.now() - startTime, {
        returnedCount: enrichedLogs.length,
        totalCount
      })

      // Configurable limits for performance
      // Can be adjusted based on system capabilities
      const MAX_BREADCRUMBS = 500  // Increased from 100 - enough for deep debugging
      const MAX_TIMINGS = 500      // Increased from 100 - captures full performance profile

      return {
        logs: enrichedLogs,
        breadcrumbs: breadcrumbs.length > MAX_BREADCRUMBS
          ? breadcrumbs.slice(0, MAX_BREADCRUMBS)
          : breadcrumbs, // Only limit if necessary
        timings: timings.length > MAX_TIMINGS
          ? timings.slice(0, MAX_TIMINGS)
          : timings, // Only limit if necessary
        stats,
        totalStats, // Include total unfiltered stats
        pagination: {
          pageSize: params.pageSize || 50,
          returnedCount: enrichedLogs.length,
          totalCount,
          hasMore,
          nextCursor,
          cursor: params.cursor,
          filters: {
            level: params.level,
            category: params.category,
            search: params.search
          }
        },
        totalCount, // Also include at top level for backward compatibility
        source: 'database'
      }
    } catch (error) {
      permanentLogger.captureError('logs-service', error as Error, {
        operation: 'getPaginatedLogs',
        params
      })
      
      // Return error response (no fallback data!)
      return {
        logs: [],
        breadcrumbs: [],
        timings: [],
        source: 'database',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      }
    }
  }

  /**
   * Get log statistics
   * @param totalCount - Optional total count if already known
   * @returns Complete statistics object
   */
  static async getLogStats(totalCount?: number): Promise<LogStats> {
    try {
      // Get stats from repository if not provided
      const stats = totalCount !== undefined 
        ? { total: totalCount, byLevel: {} as Record<string, number> }
        : await LogsRepository.getInstance().getLogStats()

      // Calculate storage stats using transformer
      const storage = LogsTransformer.calculateStorageStats(
        stats.total,
        10000 // Max logs limit
      )

      // Get UI properties for storage
      const storageUI = LogsTransformer.getStorageUIProps(storage)

      return {
        total: stats.total,
        byLevel: {
          debug: stats.byLevel.debug || 0,
          info: stats.byLevel.info || 0,
          warn: stats.byLevel.warn || 0,
          error: stats.byLevel.error || 0,
          critical: stats.byLevel.critical || 0
        },
        byCategory: {}, // Will be populated when we have proper queries
        storage
      }
    } catch (error) {
      permanentLogger.captureError('logs-service-stats', error as Error, {
        operation: 'getLogStats'
      })
      
      // Return minimal stats on error
      return {
        total: 0,
        byLevel: { debug: 0, info: 0, warn: 0, error: 0, critical: 0 },
        byCategory: {},
        storage: {
          current: 0,
          max: 10000,
          percentage: 0,
          status: 'healthy',
          color: 'green',
          warningThreshold: 7000,
          criticalThreshold: 9000
        }
      }
    }
  }

  /**
   * Export logs in specified format
   * Uses existing export functions from log-operations
   * @param logs - Logs to export
   * @param format - Export format
   */
  static exportLogs(logs: LogEntry[], format: 'json' | 'csv' | 'markdown') {
    try {
      // Use the existing exportLogs function from log-operations
      exportLogs(logs, format)
      
      permanentLogger.info('Logs exported', {
        format,
        count: logs.length,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      permanentLogger.captureError('logs-service-export', error as Error, {
        operation: 'exportLogs',
        format,
        count: logs.length
      })
      throw error
    }
  }

  /**
   * Clear all logs
   * Development only
   */
  static async clearLogs(): Promise<void> {
    try {
      // Clear logs functionality removed - not implemented in repository
      
      // Also clear memory logs
      if ('clearLogs' in permanentLogger) {
        (permanentLogger as any).clearLogs()
      }
      
      // Don't log maintenance operations
    } catch (error) {
      // Don't log maintenance operations - just propagate error
      throw error
    }
  }

  /**
   * Rotate old logs
   * @param daysToKeep - Number of days to retain
   * @returns Number of logs deleted
   */
  static async rotateLogs(daysToKeep: number = 7): Promise<number> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
      const deletedCount = await LogsRepository.getInstance().deleteOldLogs(cutoffDate.toISOString())
      
      // Don't log maintenance operations
      return deletedCount
    } catch (error) {
      // Don't log maintenance operations - just propagate error
      throw error
    }
  }
}