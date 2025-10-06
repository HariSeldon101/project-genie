/**
 * Unified Event Factory
 * Creates events with consistent structure and validation
 *
 * CRITICAL: This replaces BOTH:
 * - SSEEventFactory from company-intelligence/utils
 * - EventFactory from notifications/utils
 *
 * Following DRY principle - one factory to create all events
 *
 * @module realtime-events/factories
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import {
  RealtimeEvent,
  EventType,
  EventSource,
  EventPriority,
  ProgressInfo,
  ErrorData,
  NotificationData,
  PhaseData,
  ScrapingData,
  EventMetadata
} from '../core/event-types'

/**
 * Unified Event Factory
 * Single source of truth for creating all events in the system
 */
export class EventFactory {
  // Track sequence numbers per session for ordering
  private static sequenceCounters = new Map<string, number>()

  // Track correlation IDs for session grouping
  private static correlationMap = new Map<string, string>()

  // Track last event time for rate limiting (if needed)
  private static lastEventTime = new Map<string, number>()

  /**
   * Core factory method - ALL other methods delegate to this
   * This ensures consistency across all event types
   */
  static create<T>(
    type: EventType,
    data: T,
    options?: {
      source?: EventSource
      correlationId?: string
      sessionId?: string
      metadata?: EventMetadata
      sequenceNumber?: number
    }
  ): RealtimeEvent<T> {
    // Get or create correlation ID
    const correlationId = options?.correlationId ||
                         this.getCorrelationId(options?.sessionId)

    // Get next sequence number if not provided
    const sequenceNumber = options?.sequenceNumber !== undefined
      ? options?.sequenceNumber
      : this.getNextSequence(correlationId)

    // Create the event with all required fields
    const event: RealtimeEvent<T> = {
      id: crypto.randomUUID(),
      type,
      timestamp: Date.now(),
      correlationId,
      sequenceNumber,
      source: options?.source || EventSource.SYSTEM,
      data,
      metadata: options?.metadata
    }

    // Log event creation with breadcrumb for debugging
    permanentLogger.breadcrumb('EVENT_CREATED', 'Event created', {
      id: event.id,
      type: event.type,
      source: event.source,
      correlationId: event.correlationId,
      sequence: event.sequenceNumber,
      hasData: !!data
    })

    // Track timing for rate limiting
    this.lastEventTime.set(correlationId, event.timestamp)

    return event
  }

  /**
   * Create a progress event
   * Used for tracking operation progress (scraping, processing, etc.)
   */
  static progress(
    current: number,
    total: number,
    message?: string,
    options?: {
      phase?: string
      estimatedTime?: number
      source?: EventSource
      correlationId?: string
      sessionId?: string
      metadata?: EventMetadata
    }
  ): RealtimeEvent<ProgressInfo> {
    // Calculate percentage safely
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0

    const progressData: ProgressInfo = {
      current,
      total,
      percentage,
      message,
      phase: options?.phase,
      estimatedTimeRemaining: options?.estimatedTime
    }

    return this.create<ProgressInfo>(
      EventType.PROGRESS,
      progressData,
      {
        source: options?.source || EventSource.SYSTEM,
        correlationId: options?.correlationId,
        sessionId: options?.sessionId,
        metadata: {
          ...options?.metadata,
          phase: options?.phase,
          progress: progressData
        }
      }
    )
  }

  /**
   * Create an error event
   * Handles both Error objects and string messages
   */
  static error(
    error: Error | string,
    options?: {
      code?: string
      retriable?: boolean
      retryAfter?: number
      context?: Record<string, any>
      source?: EventSource
      correlationId?: string
      sessionId?: string
      metadata?: EventMetadata
    }
  ): RealtimeEvent<ErrorData> {
    // Build error data from Error object or string
    const errorData: ErrorData = typeof error === 'string'
      ? {
          code: options?.code || 'UNKNOWN',
          message: error,
          retriable: options?.retriable,
          retryAfter: options?.retryAfter,
          context: options?.context
        }
      : {
          code: options?.code || (error as any).code || 'UNKNOWN',
          message: error.message,
          stack: error.stack,
          retriable: options?.retriable,
          retryAfter: options?.retryAfter,
          context: options?.context
        }

    // Log the error with permanentLogger
    permanentLogger.captureError('EVENT_FACTORY', error as Error, {
      code: errorData.code,
      retriable: errorData.retriable,
      context: errorData.context
    })

    return this.create<ErrorData>(
      EventType.ERROR,
      errorData,
      {
        source: options?.source || EventSource.SYSTEM,
        correlationId: options?.correlationId,
        sessionId: options?.sessionId,
        metadata: {
          ...options?.metadata,
          priority: EventPriority.HIGH
        }
      }
    )
  }

  /**
   * Create a notification event
   * For user-facing messages (toasts, alerts, etc.)
   */
  static notification(
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
    options?: {
      title?: string
      duration?: number
      persistent?: boolean
      priority?: EventPriority
      source?: EventSource
      correlationId?: string
      sessionId?: string
      metadata?: EventMetadata
    }
  ): RealtimeEvent<NotificationData> {
    const notificationData: NotificationData = {
      message,
      type,
      title: options?.title,
      duration: options?.duration,
      persistent: options?.persistent || (type === 'error'),
      priority: options?.priority || this.getDefaultPriority(type)
    }

    // Map notification type to event type
    const eventType = type === 'success' ? EventType.NOTIFICATION_SUCCESS
      : type === 'warning' ? EventType.NOTIFICATION_WARNING
      : type === 'error' ? EventType.NOTIFICATION_ERROR
      : type === 'info' ? EventType.NOTIFICATION_INFO
      : EventType.NOTIFICATION

    return this.create<NotificationData>(
      eventType,
      notificationData,
      {
        source: options?.source || EventSource.SYSTEM,
        correlationId: options?.correlationId,
        sessionId: options?.sessionId,
        metadata: {
          ...options?.metadata,
          priority: notificationData.priority
        }
      }
    )
  }

  /**
   * Create a phase event
   * For multi-phase operations (scraping phases, processing stages, etc.)
   */
  static phase(
    phase: string,
    status: 'started' | 'in_progress' | 'completed' | 'failed',
    options?: {
      progress?: number
      message?: string
      data?: any
      source?: EventSource
      correlationId?: string
      sessionId?: string
      metadata?: EventMetadata
    }
  ): RealtimeEvent<PhaseData> {
    const phaseData: PhaseData = {
      phase,
      status,
      progress: options?.progress,
      message: options?.message,
      data: options?.data
    }

    // Map status to event type
    const eventType = status === 'started' ? EventType.PHASE_START
      : status === 'completed' ? EventType.PHASE_COMPLETE
      : status === 'failed' ? EventType.PHASE_ERROR
      : EventType.PHASE_START

    return this.create<PhaseData>(
      eventType,
      phaseData,
      {
        source: options?.source || EventSource.SYSTEM,
        correlationId: options?.correlationId,
        sessionId: options?.sessionId,
        metadata: {
          ...options?.metadata,
          phase,
          priority: status === 'failed' ? EventPriority.HIGH : EventPriority.NORMAL
        }
      }
    )
  }

  /**
   * Create a data event
   * For transmitting scraped or processed data
   */
  static data<T>(
    data: T,
    options?: {
      source?: EventSource
      correlationId?: string
      sessionId?: string
      metadata?: EventMetadata
    }
  ): RealtimeEvent<T> {
    return this.create<T>(
      EventType.DATA,
      data,
      options
    )
  }

  /**
   * Create a status event
   * For system status updates
   */
  static status(
    status: string,
    details?: any,
    options?: {
      source?: EventSource
      correlationId?: string
      sessionId?: string
      metadata?: EventMetadata
    }
  ): RealtimeEvent<{ status: string; details?: any }> {
    return this.create(
      EventType.STATUS,
      { status, details },
      options
    )
  }

  /**
   * Create a warning event
   * For non-critical issues
   */
  static warning(
    message: string,
    details?: any,
    options?: {
      source?: EventSource
      correlationId?: string
      sessionId?: string
      metadata?: EventMetadata
    }
  ): RealtimeEvent<{ message: string; details?: any }> {
    permanentLogger.warn('EVENT_FACTORY', message, { details })

    return this.create(
      EventType.WARNING,
      { message, details },
      {
        ...options,
        metadata: {
          ...options?.metadata,
          priority: EventPriority.HIGH
        }
      }
    )
  }

  /**
   * Create a connection event
   * For SSE connection lifecycle management
   */
  static connection(
    options?: {
      correlationId?: string
      sessionId?: string
      source?: EventSource
      metadata?: EventMetadata
    }
  ): RealtimeEvent<{ status: string; timestamp: number }> {
    return this.create(
      EventType.CONNECTION_OPEN,
      {
        status: 'connected',
        timestamp: Date.now()
      },
      options
    )
  }

  /**
   * Create a connection close event
   */
  static connectionClose(
    reason?: string,
    options?: {
      correlationId?: string
      sessionId?: string
      source?: EventSource
      metadata?: EventMetadata
    }
  ): RealtimeEvent<{ status: string; reason?: string }> {
    return this.create(
      EventType.CONNECTION_CLOSE,
      {
        status: 'disconnected',
        reason
      },
      options
    )
  }

  /**
   * Create a connection error event
   */
  static connectionError(
    error: Error | string,
    options?: {
      correlationId?: string
      sessionId?: string
      source?: EventSource
      metadata?: EventMetadata
    }
  ): RealtimeEvent<ErrorInfo> {
    const errorMessage = typeof error === 'string' ? error : error.message
    const errorStack = typeof error === 'object' ? error.stack : undefined

    return this.create(
      EventType.CONNECTION_ERROR,
      {
        message: errorMessage,
        stack: errorStack,
        timestamp: Date.now()
      },
      {
        ...options,
        metadata: {
          ...options?.metadata,
          priority: EventPriority.HIGH
        }
      }
    )
  }

  /**
   * Create a heartbeat event
   * For keeping SSE connections alive
   */
  static heartbeat(
    options?: {
      correlationId?: string
      sessionId?: string
      source?: EventSource
      metadata?: EventMetadata
    }
  ): RealtimeEvent<{ timestamp: number }> {
    return this.create(
      EventType.STREAM_HEARTBEAT,
      { timestamp: Date.now() },
      options
    )
  }

  /**
   * Create a complete event
   * For backwards compatibility with old SSEEventFactory
   */
  static complete<T>(
    result?: T,
    options?: {
      source?: EventSource
      correlationId?: string
      sessionId?: string
      metadata?: EventMetadata
    }
  ): RealtimeEvent<T | { message: string }> {
    const data = result || { message: 'Process completed successfully' } as any

    return this.create(
      EventType.COMPLETE,
      data,
      options
    )
  }

  /**
   * Create a scraping event
   * For scraping-specific operations
   */
  static scraping(
    type: 'start' | 'progress' | 'complete' | 'error',
    data: Partial<ScrapingData>,
    options?: {
      source?: EventSource
      correlationId?: string
      sessionId?: string
      metadata?: EventMetadata
    }
  ): RealtimeEvent<ScrapingData> {
    const eventType = type === 'start' ? EventType.SCRAPING_START
      : type === 'progress' ? EventType.SCRAPING_PROGRESS
      : type === 'complete' ? EventType.SCRAPING_COMPLETE
      : EventType.SCRAPING_ERROR

    return this.create<ScrapingData>(
      eventType,
      data as ScrapingData,
      {
        source: options?.source || EventSource.SCRAPER,
        correlationId: options?.correlationId,
        sessionId: options?.sessionId,
        metadata: options?.metadata
      }
    )
  }

  /**
   * Format event for SSE transmission
   * Converts event to SSE format: "data: {json}\n\n"
   */
  static formatForSSE(event: RealtimeEvent): string {
    return `data: ${JSON.stringify(event)}\n\n`
  }

  /**
   * Parse SSE message back to event
   * Extracts event from SSE format
   */
  static parseFromSSE(message: string): RealtimeEvent | null {
    try {
      // Handle various SSE formats
      const dataMatch = message.match(/^data:\s*(.+)$/m)
      if (!dataMatch) {
        // Try direct JSON parse if not in SSE format
        return JSON.parse(message)
      }

      const jsonStr = dataMatch[1]

      // Handle special SSE messages
      if (jsonStr === '[DONE]') {
        return null
      }

      return JSON.parse(jsonStr)
    } catch (error) {
      permanentLogger.captureError('EVENT_FACTORY', error, {
        message: 'Failed to parse SSE message',
        sseMessage: message.substring(0, 100),
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
      return null
    }
  }

  /**
   * Get or create correlation ID for a session
   * Ensures all events in a session are linked
   */
  static getCorrelationId(sessionId?: string): string {
    if (sessionId && this.correlationMap.has(sessionId)) {
      return this.correlationMap.get(sessionId)!
    }

    const correlationId = crypto.randomUUID()

    if (sessionId) {
      this.correlationMap.set(sessionId, correlationId)
    }

    return correlationId
  }

  /**
   * Get next sequence number for a correlation ID
   * Ensures events are properly ordered
   */
  private static getNextSequence(correlationId: string): number {
    const current = this.sequenceCounters.get(correlationId) || 0
    const next = current + 1
    this.sequenceCounters.set(correlationId, next)
    return next
  }

  /**
   * Reset sequence counter for a new stream
   * Call this when starting a new SSE stream
   */
  static resetSequence(correlationId?: string): void {
    if (correlationId) {
      this.sequenceCounters.delete(correlationId)
    } else {
      // Reset all sequences
      this.sequenceCounters.clear()
    }
  }

  /**
   * Clean up correlation data (prevent memory leaks)
   * Call this when a session ends
   */
  static cleanupCorrelation(sessionId: string): void {
    const correlationId = this.correlationMap.get(sessionId)

    if (correlationId) {
      this.correlationMap.delete(sessionId)
      this.sequenceCounters.delete(correlationId)
      this.lastEventTime.delete(correlationId)
    }
  }

  /**
   * Get default priority for notification type
   */
  private static getDefaultPriority(type: string): EventPriority {
    switch (type) {
      case 'error':
        return EventPriority.CRITICAL
      case 'warning':
        return EventPriority.HIGH
      case 'success':
        return EventPriority.NORMAL
      case 'info':
      default:
        return EventPriority.LOW
    }
  }

  /**
   * Create event from legacy format
   * For migration from old event systems
   */
  static fromLegacy(legacyData: any, type?: EventType): RealtimeEvent {
    // Handle various legacy formats
    const actualData = legacyData.payload?.details ||
                      legacyData.payload ||
                      legacyData.data ||
                      legacyData

    return {
      id: legacyData.id || crypto.randomUUID(),
      type: legacyData.type || type || EventType.DATA,
      timestamp: legacyData.timestamp || Date.now(),
      correlationId: legacyData.correlationId || this.getCorrelationId(),
      sequenceNumber: legacyData.sequence || legacyData.sequenceNumber,
      source: legacyData.source || EventSource.SYSTEM,
      data: actualData,
      metadata: {
        ...legacyData.metadata,
        migrated: true,
        originalFormat: 'legacy',
        phase: legacyData.phase,
        priority: legacyData.priority
      }
    }
  }

  /**
   * Convert to legacy SSE format
   * For backwards compatibility
   */
  static toLegacySSE(event: RealtimeEvent): any {
    return {
      id: event.id,
      type: event.type,
      timestamp: event.timestamp,
      correlationId: event.correlationId,
      sequence: event.sequenceNumber,
      data: event.data,
      metadata: event.metadata,
      source: event.source
    }
  }

  /**
   * Convert to legacy notification format
   * For backwards compatibility
   */
  static toLegacyNotification(event: RealtimeEvent): any {
    return {
      id: event.id,
      type: 'notification',
      source: event.source,
      priority: event.metadata?.priority || EventPriority.NORMAL,
      timestamp: event.timestamp,
      correlationId: event.correlationId,
      payload: event.data
    }
  }
}