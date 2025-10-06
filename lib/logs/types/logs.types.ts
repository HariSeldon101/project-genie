/**
 * Logs System Type Definitions
 * Central location for all log-related interfaces
 * Following Interface Segregation Principle (ISP) from SOLID
 * @module logs-types
 */

import { LogLevel } from '@/lib/utils/log-level-utils'

/**
 * Core log entry structure from database
 * Matches permanent_logs table schema
 */
export interface DatabaseLogEntry {
  id: string
  log_timestamp: string
  log_level: string
  category: string
  message: string
  data?: any
  stack?: string
  request_id?: string
  session_id?: string
  breadcrumbs?: any
  timing?: any
  error_details?: any
  environment?: string
  user_id?: string
}

/**
 * Transformed log entry for UI consumption
 * Uses camelCase and cleaned up structure
 */
export interface LogEntry {
  id: string
  timestamp: string
  level: LogLevel
  category: string
  message: string
  data?: any
  stack?: string
  requestId?: string
  sessionId?: string
  breadcrumbs?: BreadcrumbEntry[]
  timing?: TimingEntry[]
  error?: ErrorDetails
  environment?: string
  userId?: string
}

/**
 * Breadcrumb entry for debugging trail
 */
export interface BreadcrumbEntry {
  timestamp: string
  type: string
  action: string
  data?: any
}

/**
 * Performance timing entry
 */
export interface TimingEntry {
  checkpoint: string
  timestamp: string
  duration?: number
  metadata?: any
}

/**
 * Error details structure
 */
export interface ErrorDetails {
  message: string
  code?: string
  stack?: string
  [key: string]: any
}

/**
 * Pagination request parameters
 * Updated to support multi-select filters with arrays
 */
export interface PaginationParams {
  cursor?: string        // Timestamp cursor for pagination
  pageSize?: number      // Number of items per page (default 50, max 100)
  level?: string | string[]    // Filter by log level(s) - supports multi-select
  category?: string | string[]  // Filter by category(ies) - supports multi-select
  search?: string        // Search in message
  sortBy?: 'time-desc' | 'time-asc' | 'level' | 'category'
}

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T> {
  data: T[]
  nextCursor?: string
  hasMore: boolean
  totalCount: number
  pageInfo: {
    pageSize: number
    returnedCount: number
    cursor?: string
    filters: {
      level?: string | string[]
      category?: string | string[]
      search?: string
    }
  }
}

/**
 * Log statistics structure
 */
export interface LogStats {
  total: number
  byLevel: {
    debug: number
    info: number
    warn: number
    error: number
    critical: number
  }
  byCategory: Record<string, number>
  storage: {
    current: number
    max: number
    percentage: number
    status: 'healthy' | 'warning' | 'fatal'
    color: 'green' | 'yellow' | 'red'
    warningThreshold: number
    criticalThreshold: number
  }
}

/**
 * API response structure
 */
export interface LogsApiResponse {
  logs: LogEntry[]
  breadcrumbs: BreadcrumbEntry[]
  timings: TimingEntry[]
  stats?: LogStats
  pagination?: PaginatedResponse<LogEntry>['pageInfo']
  source: 'database' | 'memory'
  error?: string
  details?: string
}