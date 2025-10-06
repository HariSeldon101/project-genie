/**
 * Logs Transformer - Data Transformation Layer
 * Transforms database logs to UI-friendly format
 * Uses ALL existing utility functions from log-ui-helpers
 * @module logs-transformer
 */

import type { DatabaseLogEntry, LogEntry, LogStats } from '../types/logs.types'
import { formatLevelForDisplay, normalizeLogLevel } from '@/lib/utils/log-level-utils'
import {
  getLevelIconName,
  getLevelColorClass,
  getLevelBadgeVariant,
  getLogBackgroundClass,
  isErrorLog,
  getErrorName,
  formatDuration,
  checkLogLimit,
  getLogLimitBadgeVariant,
  getLogLimitMessage
} from '@/lib/utils/log-ui-helpers'
import { permanentLogger } from '@/lib/utils/permanent-logger'

/**
 * Transformer class for log data
 * Single Responsibility: Data transformation only
 */
export class LogsTransformer {
  /**
   * Safely serialize error objects to prevent [object Object] display
   * Handles all error types: strings, Error instances, and plain objects
   * @param errorData - Raw error data from database
   * @returns Properly serialized error details or null
   */
  static safeSerializeError(errorData: any): ErrorDetails | null {
    // Early return for null/undefined
    if (!errorData) return null
    
    // Handle string errors
    if (typeof errorData === 'string') {
      try {
        // Try to parse if it's JSON string
        const parsed = JSON.parse(errorData)
        return this.safeSerializeError(parsed) // Recursive call for parsed object
      } catch {
        // If not JSON, treat as plain error message
        return { message: errorData }
      }
    }
    
    // Handle Error instances and objects
    if (typeof errorData === 'object') {
      // Create base serializable object
      const serializable: ErrorDetails = {
        message: errorData.message || errorData.toString?.() || 'Unknown error',
        code: errorData.code || undefined,
        stack: errorData.stack || undefined
      }
      
      // Add other properties safely
      Object.keys(errorData).forEach(key => {
        // Skip already handled properties
        if (!['message', 'code', 'stack'].includes(key)) {
          const value = errorData[key]
          // Only include serializable values
          if (value !== undefined && value !== null) {
            // For nested objects, stringify them properly
            if (typeof value === 'object') {
              try {
                // Attempt to stringify complex objects
                serializable[key] = JSON.stringify(value, null, 2)
              } catch {
                // If circular reference or other issue, use toString
                serializable[key] = String(value)
              }
            } else {
              // Primitive values can be used directly
              serializable[key] = value
            }
          }
        }
      })
      
      return serializable
    }
    
    // Fallback for any other type
    return { message: String(errorData) }
  }

  /**
   * Transform database log to UI format
   * Properly serializes all fields to avoid [object Object]
   * @param dbLog - Raw database log entry
   * @returns Transformed log entry for UI
   */
  static transformLog(dbLog: DatabaseLogEntry): LogEntry {
    try {
      // Use safe serialization for error details
      const errorDetails = this.safeSerializeError(dbLog.error_details)

      return {
        id: dbLog.id,
        timestamp: dbLog.log_timestamp,
        level: normalizeLogLevel(dbLog.log_level),
        category: dbLog.category,
        message: dbLog.message,
        data: dbLog.data,
        stack: dbLog.stack,
        requestId: dbLog.request_id,
        sessionId: dbLog.session_id,
        breadcrumbs: Array.isArray(dbLog.breadcrumbs) ? dbLog.breadcrumbs : [],
        timing: Array.isArray(dbLog.timing) ? dbLog.timing : [],
        error: errorDetails,
        environment: dbLog.environment,
        userId: dbLog.user_id
      }
    } catch (error) {
      permanentLogger.captureError('logs-transformer', error as Error, {
        operation: 'transformLog',
        logId: dbLog.id
      })
      // Return a safe fallback that still shows the log
      return {
        id: dbLog.id,
        timestamp: dbLog.log_timestamp,
        level: normalizeLogLevel(dbLog.log_level || 'info'),
        category: dbLog.category || 'Unknown',
        message: dbLog.message || 'Error transforming log',
        data: null,
        stack: null,
        requestId: null,
        sessionId: null,
        breadcrumbs: [],
        timing: [],
        error: null,
        environment: dbLog.environment,
        userId: dbLog.user_id
      }
    }
  }

  /**
   * Transform multiple logs
   * @param dbLogs - Array of database logs
   * @returns Array of transformed logs
   */
  static transformLogs(dbLogs: DatabaseLogEntry[]): LogEntry[] {
    return dbLogs.map(log => this.transformLog(log))
  }

  /**
   * Enrich log with UI-specific properties
   * Uses ALL the UI helper functions we have
   * @param log - Transformed log entry
   * @returns Log with UI properties
   */
  static enrichLogForUI(log: LogEntry) {
    return {
      ...log,
      ui: {
        iconName: getLevelIconName(log.level),
        colorClass: getLevelColorClass(log.level),
        badgeVariant: getLevelBadgeVariant(log.level),
        backgroundClass: getLogBackgroundClass(log.level),
        isError: isErrorLog(log),
        errorName: log.error ? getErrorName(log) : null,
        formattedDuration: log.timing?.[0]?.duration 
          ? formatDuration(log.timing[0].duration)
          : null
      }
    }
  }

  /**
   * Calculate storage statistics
   * Uses checkLogLimit and related functions
   * @param currentCount - Current number of logs
   * @param maxCount - Maximum allowed logs
   * @returns Storage statistics with UI properties
   */
  static calculateStorageStats(
    currentCount: number, 
    maxCount: number = 10000
  ): LogStats['storage'] {
    const percentage = (currentCount / maxCount) * 100
    const limitStatus = checkLogLimit(currentCount, maxCount)
    
    return {
      current: currentCount,
      max: maxCount,
      percentage,
      status: limitStatus === 'fatal' ? 'fatal' : 
              limitStatus === 'warning' ? 'warning' : 'healthy',
      color: limitStatus === 'fatal' ? 'red' : 
             limitStatus === 'warning' ? 'yellow' : 'green',
      warningThreshold: maxCount * 0.7,
      criticalThreshold: maxCount * 0.9
    }
  }

  /**
   * Get storage UI properties
   * Uses getLogLimitBadgeVariant and getLogLimitMessage
   * @param storage - Storage statistics
   * @returns UI properties for storage display
   */
  static getStorageUIProps(storage: LogStats['storage']) {
    return {
      badgeVariant: getLogLimitBadgeVariant(storage.current, storage.max),
      message: getLogLimitMessage(storage.current, storage.max),
      showWarning: storage.status !== 'healthy',
      progressColor: storage.color === 'red' ? 'bg-red-500' :
                     storage.color === 'yellow' ? 'bg-yellow-500' :
                     'bg-green-500'
    }
  }

  /**
   * Extract breadcrumbs from logs
   * Combines and deduplicates breadcrumbs
   * @param logs - Array of log entries
   * @returns Deduplicated breadcrumbs
   */
  static extractBreadcrumbs(logs: LogEntry[]) {
    const seenKeys = new Set<string>()
    const breadcrumbs: any[] = []
    
    logs.forEach(log => {
      if (log.breadcrumbs && Array.isArray(log.breadcrumbs)) {
        log.breadcrumbs.forEach(b => {
          const key = `${b.timestamp}-${b.action}`
          if (!seenKeys.has(key)) {
            seenKeys.add(key)
            breadcrumbs.push(b)
          }
        })
      }
    })
    
    return breadcrumbs
  }

  /**
   * Extract timings from logs
   * Combines timing data for performance analysis
   * @param logs - Array of log entries
   * @returns Combined timing entries
   */
  static extractTimings(logs: LogEntry[]) {
    const timings: any[] = []
    
    logs.forEach(log => {
      if (log.timing && Array.isArray(log.timing)) {
        timings.push(...log.timing)
      }
    })
    
    return timings
  }
}