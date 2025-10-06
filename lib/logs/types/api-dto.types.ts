/**
 * API Data Transfer Objects (DTOs) for Logs
 *
 * ARCHITECTURE PATTERN: Clean Architecture with DTO Pattern
 *
 * This file contains DTOs used by the API layer for HTTP requests/responses.
 * These types are optimized for REST API communication and may differ from
 * internal domain models used by repositories.
 *
 * WHY DTOs?
 * - Decouple API contract from internal database structure
 * - Allow API evolution without database changes
 * - Provide clear, documented API interface
 * - Enable validation at API boundary
 *
 * TRANSFORMATION FLOW:
 * HTTP Request -> API Route -> LogsApiDto -> Service Layer -> LogsQueryParams -> Repository
 *
 * IMPORTANT: These types use FLAT structure for REST simplicity
 * Repository types use NESTED structure for query organization
 * Service layer transforms between them (this is intentional, not a bug!)
 *
 * @module logs-api-dto
 */

/**
 * Parameters received from API requests for log queries
 * These come directly from HTTP query parameters
 *
 * FLAT STRUCTURE: All filters are top-level properties
 * This makes REST URLs simple: /api/logs?level=info&category=API
 *
 * Compare with LogsQueryParams in repository which uses nested filters
 */
export interface LogsApiDto {
  /** Pagination cursor for efficient page navigation */
  cursor?: string

  /** Items per page (default: 50, max: 200) */
  pageSize?: number

  /**
   * Log levels to filter - FLAT structure for REST
   * Can be single string or array for multi-select
   * Example: 'info' or ['info', 'warn', 'error']
   */
  level?: string | string[]

  /**
   * Categories to filter - FLAT structure for REST
   * Can be single string or array for multi-select
   * Example: 'API' or ['API', 'GENERAL', 'AUTH']
   */
  category?: string | string[]

  /** Search term for message content */
  search?: string

  /** Sort order (time-desc, time-asc, level, category) */
  sortBy?: string
}

/**
 * Response structure for paginated logs API
 * This is what the API returns to the client
 */
export interface LogsApiResponse {
  /** Array of log entries transformed for UI display */
  logs: any[] // Would ideally be LogEntry[] from shared types

  /** Breadcrumb entries for debugging context */
  breadcrumbs?: any[]

  /** Performance timing entries */
  timings?: any[]

  /** Statistics about the logs */
  stats?: any

  /** Total statistics (unfiltered) */
  totalStats?: any

  /** Pagination metadata */
  pagination?: {
    pageSize: number
    returnedCount: number
    totalCount: number
    hasMore: boolean
    nextCursor?: string
    cursor?: string
    filters?: {
      level?: string | string[]
      category?: string | string[]
      search?: string
    }
  }

  /** Total count of logs (backward compatibility) */
  totalCount?: number

  /** Data source indicator */
  source: 'database' | 'memory'

  /** Error information if request failed */
  error?: string

  /** Detailed error information for debugging */
  details?: string
}