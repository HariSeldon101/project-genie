/**
 * Logs Service - Business Logic and Orchestration Layer
 *
 * ARCHITECTURE PATTERN: Service Layer in Clean Architecture
 *
 * RESPONSIBILITIES:
 * 1. Receive DTOs from API layer
 * 2. Transform DTOs to repository params
 * 3. Orchestrate repository calls
 * 4. Apply business logic
 * 5. Transform results back to API responses
 *
 * WHY TRANSFORMATION HERE?
 * - Service layer is the boundary between external API and internal domain
 * - Isolates API changes from database changes
 * - Single place for transformation logic
 * - Follows clean architecture principles
 *
 * DATA FLOW:
 * API Route -> LogsApiDto -> [TRANSFORM HERE] -> LogsQueryParams -> Repository
 *
 * @module logs-service
 */

import { LogsRepository } from '@/lib/repositories/logs-repository'
import type { LogsQueryParams } from '@/lib/repositories/logs-repository'
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
import type { LogsApiDto } from '../types/api-dto.types'

/**
 * Main service class for logs operations
 * Follows Service Layer pattern
 */
export class LogsService {
  /**
   * Transform API DTO to Repository Query Parameters
   *
   * PURPOSE: Convert flat API structure to nested repository structure
   *
   * WHY: API uses flat structure for REST simplicity (level, category as direct params)
   *      Repository uses nested structure for query organization (filters.level, filters.category)
   *
   * THIS IS NOT A HACK - it's proper clean architecture:
   * - Each layer has its own optimal structure
   * - Service layer is responsible for translation
   * - Maintains loose coupling between layers
   * - Industry standard practice for DTO pattern
   *
   * @param apiDto - Flat structure from HTTP request
   * @returns Repository params with nested filter structure
   */
  private static transformApiToRepository(apiDto: LogsApiDto): LogsQueryParams {
    return {
      cursor: apiDto.cursor,
      pageSize: apiDto.pageSize,
      // Transform flat filters to nested structure
      // This is where the critical transformation happens!
      filters: {
        level: apiDto.level,
        category: apiDto.category,
        search: apiDto.search
        // Note: Repository supports additional filters (action, dates)
        // that aren't currently exposed in API
      }
    }
  }

  /**
   * Get paginated logs with all transformations
   *
   * FLOW:
   * 1. Receive flat API DTO from route
   * 2. Transform to nested repository params
   * 3. Call repository with correct structure
   * 4. Transform and enrich results for API response
   *
   * @param apiDto - API DTO with flat filter structure
   * @returns Complete API response with logs, stats, and pagination
   */
  static async getPaginatedLogs(apiDto: LogsApiDto): Promise<LogsApiResponse> {
    const startTime = performance.now()
    
    try {
      // Add breadcrumb for request tracking
      permanentLogger.breadcrumb('logs-service', 'get-logs-start', {
        apiDto,
        timestamp: new Date().toISOString()
      })

      // CRITICAL TRANSFORMATION: Convert API DTO to Repository format
      // API sends flat structure, Repository expects nested
      // This was the bug causing filters to not work!
      const repoParams = this.transformApiToRepository(apiDto)

      // 1. Fetch from repository with correctly formatted params
      const { logs: dbLogs, totalCount, hasMore, nextCursor } =
        await LogsRepository.getInstance().getPaginatedLogs(repoParams)

      // 2. Transform to UI format
      const transformedLogs = LogsTransformer.transformLogs(dbLogs)

      // 3. Apply client-side filters if needed (for search)
      let filteredLogs = transformedLogs
      if (apiDto.search) {
        filteredLogs = searchLogs(filteredLogs, apiDto.search)
      }

      // 4. Sort logs
      const sortedLogs = sortLogs(filteredLogs, apiDto.sortBy || 'time-desc')

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
          pageSize: apiDto.pageSize || 50,
          returnedCount: enrichedLogs.length,
          totalCount,
          hasMore,
          nextCursor,
          cursor: apiDto.cursor,
          filters: {
            level: apiDto.level,
            category: apiDto.category,
            search: apiDto.search
          }
        },
        totalCount, // Also include at top level for backward compatibility
        source: 'database'
      }
    } catch (error) {
      permanentLogger.captureError('logs-service', error as Error, {
        operation: 'getPaginatedLogs',
        apiDto
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
   * Clear all logs from database
   *
   * RESTORED FUNCTIONALITY: This was missing after repository migration
   * Now properly delegates to repository method
   *
   * SECURITY: Only called in development environment
   * API route verifies NODE_ENV before calling this
   *
   * @returns Object with deleted count for API response
   * @throws Error if deletion fails (propagated to API for error handling)
   */
  static async clearLogs(): Promise<{ deletedCount: number }> {
    try {
      // Call the restored repository method
      // This was the missing piece after migration!
      const deletedCount = await LogsRepository.getInstance().deleteAllLogs()

      // Also clear in-memory logs if available
      if ('clearLogs' in permanentLogger) {
        (permanentLogger as any).clearLogs()
      }

      permanentLogger.info('LOGS_SERVICE', 'All logs cleared', {
        deletedCount,
        timestamp: new Date().toISOString()
      })

      return { deletedCount }
    } catch (error) {
      // Let API route handle error response
      // Don't double-log since repository already logged
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