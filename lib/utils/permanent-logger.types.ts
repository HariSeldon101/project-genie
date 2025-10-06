/**
 * Permanent Logger Type Definitions
 * Clean, type-safe interfaces without backwards compatibility
 *
 * Key Principles:
 * - Direct database schema mapping (log_timestamp, log_level)
 * - No data transformations
 * - Single error method (captureError only)
 * - Full type safety (no 'any' types)
 */

// Strict log levels matching database CHECK constraint
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'metric'

// Environment types matching database
export type Environment = 'development' | 'production' | 'test'

// JSON value types for data fields
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[]

// Structured log data with type safety
export interface LogData {
  [key: string]: JsonValue
}

// Breadcrumb data structure
export interface BreadcrumbData {
  [key: string]: JsonValue
}

// Breadcrumb entry for debugging trail
export interface BreadcrumbEntry {
  timestamp: string
  action: string
  message: string
  data?: BreadcrumbData
}

// Timing metadata
export interface TimingMetadata {
  operation?: string
  component?: string
  [key: string]: JsonValue | undefined
}

// Timing entry for performance tracking
export interface TimingEntry {
  checkpoint: string
  timestamp: string
  duration?: number
  metadata?: TimingMetadata
}

// Error details structure (supports both JS Error and Supabase PostgrestError)
export interface ErrorDetails {
  name: string
  message: string
  stack?: string
  code?: string           // PostgreSQL error code (e.g., '23505' for unique violation)
  statusCode?: number
  details?: string        // Supabase PostgrestError details
  hint?: string           // Supabase PostgrestError hint for fixing
}

// Error context for captureError
export interface ErrorContext {
  category?: string
  operation?: string
  component?: string
  sessionId?: string
  correlationId?: string
  userId?: string
  metadata?: LogData
}

// Direct database schema mapping (NO TRANSFORMATION)
export interface DatabaseLogEntry {
  id: string
  log_timestamp: string           // Direct from database, NOT 'timestamp'
  log_level: LogLevel              // Direct from database, NOT 'level'
  category: string
  message: string
  data?: JsonValue
  breadcrumbs?: BreadcrumbEntry[]
  timing?: TimingEntry[]           // Note: 'timing', not 'timings'
  error_details?: ErrorDetails
  stack?: string
  session_id?: string
  user_id?: string
  request_id?: string
  environment: Environment
  created_at: string
}

// Query parameters for database operations
export interface LogQueryParams {
  cursor?: string                  // For pagination
  pageSize?: number                // Default 50, max 100
  levels?: LogLevel[]              // Multi-select array
  categories?: string[]            // Multi-select array
  search?: string                  // Text search
  since?: Date                     // Time filtering
  until?: Date                     // Time filtering
  userId?: string                  // User filtering
  sessionId?: string               // Session filtering
  sortBy?: 'time-desc' | 'time-asc' | 'level' | 'category'
}

// Type-safe timing handle
export interface TimingHandle<T = void> {
  stop(): T extends void ? number : T
  cancel(): void
  checkpoint(name: string, metadata?: TimingMetadata): void
}

// Flush result
export interface FlushResult {
  success: boolean
  flushedCount: number
  failedCount: number
  retryCount: number
  errors?: Error[]
}

// Rotate result
export interface RotateResult {
  success: boolean
  deletedCount: number
  retainedCount: number
  oldestRetained?: Date
  errors?: Error[]
}

// Logger configuration
export interface LoggerConfig {
  batchSize?: number               // Default 10
  batchInterval?: number           // Default 5000ms
  maxBreadcrumbs?: number          // Default 50
  maxTimings?: number              // Default 20
  retryAttempts?: number           // Default 3
  retryBackoff?: number            // Default 1000ms
  environment?: Environment        // Default from NODE_ENV
}

// Main logger interface - Clean and consistent
export interface PermanentLogger {
  // Consistent method signatures - ALL include category
  log(category: string, message: string, data?: LogData): void
  info(category: string, message: string, data?: LogData): void
  warn(category: string, message: string, data?: LogData): void
  debug(category: string, message: string, data?: LogData): void
  fatal(category: string, message: string, data?: LogData): void
  metric(category: string, message: string, data?: LogData): void

  // ONLY error method - enforces best practice
  captureError(category: string, error: Error | unknown, context?: ErrorContext): void

  // NO error() method - this does not exist!
  // error(): never - Compilation will fail if used

  // Breadcrumb with proper typing
  breadcrumb(action: string, message: string, data?: BreadcrumbData): void

  // Timing with type-safe handle
  timing<T = void>(label: string, metadata?: TimingMetadata): TimingHandle<T>

  // Session management
  setSessionId(id: string | null): void
  setCorrelationId(id: string | null): void
  setUserId(id: string | null): void

  // Request correlation - Safe async pattern with automatic cleanup
  withRequest<T>(operation: string, callback: (requestId: string) => Promise<T>): Promise<T>

  // Breadcrumb management
  clearBreadcrumbs(): void
  getBreadcrumbs(): BreadcrumbEntry[]

  // Timing management
  clearTimings(requestId?: string): void
  getTimings(): TimingEntry[]

  // Async database operations
  flush(): Promise<FlushResult>
  rotateLogs(daysToKeep: number): Promise<RotateResult>
  getLogsFromDatabase(params: LogQueryParams): Promise<DatabaseLogEntry[]>

  // Lifecycle
  destroy(): void
}

// Export type guards
export function isLogLevel(value: string): value is LogLevel {
  return ['debug', 'info', 'warn', 'error', 'fatal', 'metric'].includes(value)
}

export function isEnvironment(value: string): value is Environment {
  return ['development', 'production', 'test'].includes(value)
}

// Export utility type for creating mock/test loggers
export type MockLogger = {
  [K in keyof PermanentLogger]: jest.Mock
}