/**
 * Permanent Logger Implementation
 * Centralized logging system with database persistence and rich debugging features
 *
 * Key Features:
 * - Database persistence to permanent_logs table
 * - Breadcrumb tracking for debugging trails
 * - Error capture with full context
 * - Performance timing with waterfall visualization
 * - Client/server compatibility
 * - Batch writing for performance
 * - DRY principle through utility usage
 */

import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

// Import ALL utility functions - DRY principle
import {
  formatLevelForDatabase,
  formatLevelForDisplay,
  isValidLogLevel,
  getLevelEmoji,
  getLevelColor,
  getLevelPriority,
  normalizeLogLevel,
  type LogLevel
} from './log-level-utils'

// Import types from the logs module
import type {
  LogEntry,
  BreadcrumbEntry,
  TimingEntry
} from '@/lib/logs/types/logs.types'

// Check if we're on the server
const isServer = typeof window === 'undefined'
const isProduction = process.env.NODE_ENV === 'production'

// Batch configuration
const BATCH_SIZE = 10
const BATCH_INTERVAL = 5000 // 5 seconds

// Memory limits
const MAX_BREADCRUMBS = 50
const MAX_TIMINGS = 20

interface LogContext {
  category?: string
  requestId?: string
  userId?: string
  data?: any
  timingMs?: number
}

interface ErrorContext extends LogContext {
  context?: string
  stack?: string
}

class PermanentLogger {
  private supabase: SupabaseClient<Database> | null = null
  private breadcrumbs: BreadcrumbEntry[] = []
  private timings: Map<string, TimingEntry[]> = new Map()
  private logBuffer: LogEntry[] = []
  private batchTimer: NodeJS.Timeout | null = null
  private sessionId: string
  private correlationId: string | null = null

  constructor() {
    // Generate session ID
    this.sessionId = this.generateId()

    // Initialize Supabase client
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      this.supabase = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
    }

    // Set up batch processing
    this.setupBatchProcessing()

    // Handle process termination
    if (isServer) {
      process.on('beforeExit', () => this.flush())
      process.on('SIGINT', () => this.flush())
      process.on('SIGTERM', () => this.flush())
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Set up batch processing timer
   */
  private setupBatchProcessing() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer)
    }

    this.batchTimer = setInterval(() => {
      if (this.logBuffer.length > 0) {
        this.flush()
      }
    }, BATCH_INTERVAL) as unknown as NodeJS.Timeout
  }

  /**
   * Create log entry with all required fields
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): LogEntry {
    return {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      level: formatLevelForDatabase(level), // Always lowercase for database
      category: context?.category || 'general',
      message,
      requestId: context?.requestId || this.correlationId || this.sessionId,
      userId: context?.userId || null,
      data: context?.data || null,
      breadcrumbs: [...this.breadcrumbs], // Clone current breadcrumbs
      timing: this.getCurrentTimings(),
      timingMs: context?.timingMs || null,
      environment: isServer ? 'server' : 'client',
      stack: null,
      error: null
    }
  }

  /**
   * Get current timings for request
   */
  private getCurrentTimings(): TimingEntry[] | null {
    const requestTimings = this.timings.get(this.correlationId || this.sessionId)
    return requestTimings && requestTimings.length > 0 ? requestTimings : null
  }

  /**
   * Write log entry
   */
  private async writeLog(
    level: LogLevel,
    message: string,
    context?: LogContext
  ) {
    const entry = this.createLogEntry(level, message, context)

    // Console output with proper formatting
    this.consoleOutput(entry)

    // Add to buffer for batch writing
    this.logBuffer.push(entry)

    // Flush if buffer is full
    if (this.logBuffer.length >= BATCH_SIZE) {
      await this.flush()
    }
  }

  /**
   * Console output with formatting
   */
  private consoleOutput(entry: LogEntry) {
    // Skip debug logs in production
    if (isProduction && entry.level === 'debug') return

    const emoji = getLevelEmoji(normalizeLogLevel(entry.level))
    const color = getLevelColor(normalizeLogLevel(entry.level))
    const reset = '\x1b[0m'
    const displayLevel = formatLevelForDisplay(entry.level) // Uppercase for display

    const timestamp = new Date(entry.timestamp).toLocaleTimeString()
    const prefix = `${color}[${timestamp}] ${emoji} [${displayLevel}]${reset}`
    const message = `${prefix} ${entry.message}`

    // Log to appropriate console method
    switch (entry.level) {
      case 'debug':
        console.debug(message, entry.data || '')
        break
      case 'info':
        console.info(message, entry.data || '')
        break
      case 'warn':
        console.warn(message, entry.data || '')
        break
      case 'error':
      case 'critical':
        console.error(message, entry.data || '')
        if (entry.stack) {
          console.error(entry.stack)
        }
        break
      default:
        console.log(message, entry.data || '')
    }
  }

  /**
   * Flush log buffer to database
   */
  async flush() {
    if (this.logBuffer.length === 0) return
    if (!this.supabase) return

    const logsToWrite = [...this.logBuffer]
    this.logBuffer = []

    try {
      // Transform logs for database
      const dbLogs = logsToWrite.map(log => ({
        log_timestamp: log.timestamp,
        log_level: formatLevelForDatabase(log.level), // Ensure lowercase
        category: log.category,
        message: log.message,
        request_id: log.requestId,
        user_id: log.userId,
        data: log.data,
        breadcrumbs: log.breadcrumbs,
        timing: log.timing || (log.timingMs ? { duration_ms: log.timingMs } : null),
        environment: log.environment,
        stack: log.stack,
        error_details: log.error
      }))

      // Batch insert to database
      const { error } = await this.supabase
        .from('permanent_logs')
        .insert(dbLogs)

      if (error) {
        // Don't use captureError here to avoid infinite loop since we're in the logger itself
        // Just silently re-add to buffer for retry
        this.logBuffer = [...logsToWrite, ...this.logBuffer]
      }
    } catch (error) {
      // Don't use captureError here to avoid infinite loop since we're in the logger itself
      // Just silently re-add to buffer for retry
      this.logBuffer = [...logsToWrite, ...this.logBuffer]
    }
  }

  /**
   * Set correlation ID for request tracking
   */
  setCorrelationId(id: string | null) {
    this.correlationId = id
  }

  /**
   * Add breadcrumb for debugging trail
   */
  breadcrumb(type: string, action: string, data?: any) {
    const breadcrumb: BreadcrumbEntry = {
      timestamp: new Date().toISOString(),
      type,
      action,
      data
    }

    this.breadcrumbs.push(breadcrumb)

    // Limit breadcrumbs to prevent memory issues
    if (this.breadcrumbs.length > MAX_BREADCRUMBS) {
      this.breadcrumbs.shift()
    }
  }

  /**
   * Capture error with full context
   */
  captureError(error: Error | unknown, context?: ErrorContext) {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    const stack = errorObj.stack || new Error().stack || ''

    const logContext: LogContext = {
      ...context,
      data: {
        ...context?.data,
        errorName: errorObj.name,
        errorMessage: errorObj.message,
        context: context?.context
      }
    }

    const entry = this.createLogEntry('error', errorObj.message, logContext)
    entry.stack = stack
    entry.error = {
      name: errorObj.name,
      message: errorObj.message,
      stack
    }

    // Console output
    this.consoleOutput(entry)

    // Add to buffer
    this.logBuffer.push(entry)

    // Flush immediately for errors
    this.flush()
  }

  /**
   * Start timing checkpoint
   */
  timing(checkpoint: string, metadata?: any): () => void {
    const startTime = Date.now()
    const requestId = this.correlationId || this.sessionId

    return () => {
      const duration = Date.now() - startTime
      const timing: TimingEntry = {
        checkpoint,
        timestamp: new Date().toISOString(),
        duration,
        metadata
      }

      // Get or create timings array for this request
      if (!this.timings.has(requestId)) {
        this.timings.set(requestId, [])
      }

      const requestTimings = this.timings.get(requestId)!
      requestTimings.push(timing)

      // Limit timings per request
      if (requestTimings.length > MAX_TIMINGS) {
        requestTimings.shift()
      }

      // Log timing info
      this.debug(`Timing: ${checkpoint}`, { duration, metadata })
    }
  }

  /**
   * Log at debug level
   */
  debug(message: string, data?: any) {
    this.writeLog('debug', message, { data })
  }

  /**
   * Log at info level
   */
  info(message: string, data?: any) {
    this.writeLog('info', message, { data })
  }

  /**
   * Log at warn level
   */
  warn(message: string, data?: any) {
    this.writeLog('warn', message, { data })
  }

  /**
   * Log at error level
   */
  error(message: string, data?: any) {
    this.writeLog('error', message, { data })
  }

  /**
   * Log at critical level
   */
  critical(message: string, data?: any) {
    this.writeLog('critical', message, { data })
  }

  /**
   * Clear breadcrumbs
   */
  clearBreadcrumbs() {
    this.breadcrumbs = []
  }

  /**
   * Clear timings for a request
   */
  clearTimings(requestId?: string) {
    const id = requestId || this.correlationId || this.sessionId
    this.timings.delete(id)
  }

  /**
   * Get current breadcrumbs
   */
  getBreadcrumbs(): BreadcrumbEntry[] {
    return [...this.breadcrumbs]
  }

  /**
   * Get timings for current request
   */
  getTimings(): TimingEntry[] {
    const requestId = this.correlationId || this.sessionId
    return this.timings.get(requestId) || []
  }
}

// Export singleton instance
export const permanentLogger = new PermanentLogger()

// Export alias for compatibility
export const logger = permanentLogger