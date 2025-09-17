/**
 * Legacy SSE Adapter
 * Maintains backward compatibility with old SSEEventFactory
 *
 * CRITICAL: This is a temporary adapter for gradual migration
 * All methods delegate to the new unified EventFactory
 * Shows deprecation warnings to encourage migration
 *
 * @module realtime-events/adapters
 * @deprecated Use EventFactory from lib/realtime-events instead
 */

import { EventFactory } from '../factories/event-factory'
import { EventType, EventSource } from '../core/event-types'

// Re-export types for compatibility
export { EventType, EventSource }
export type {
  RealtimeEvent as SSEEvent,
  ProgressInfo,
  EventMetadata
} from '../core/event-types'

/**
 * @deprecated Use EventFactory from lib/realtime-events/factories instead
 * This is a compatibility layer that will be removed in future versions
 */
export class SSEEventFactory {
  private static warnOnce = new Set<string>()

  private static warn(method: string): void {
    if (!this.warnOnce.has(method)) {
      console.warn(
        `⚠️ SSEEventFactory.${method} is deprecated. ` +
        `Please migrate to EventFactory from lib/realtime-events/factories`
      )
      this.warnOnce.add(method)
    }
  }

  /**
   * Reset sequence counter (useful for new streams)
   */
  static resetSequence(): void {
    this.warn('resetSequence')
    EventFactory.resetSequence()
  }

  /**
   * Get or create correlation ID for a session
   */
  static getCorrelationId(sessionId?: string): string {
    this.warn('getCorrelationId')
    return EventFactory.getCorrelationId(sessionId)
  }

  /**
   * Create a progress event
   */
  static progress(
    current: number,
    total: number,
    message?: string,
    metadata?: any
  ) {
    this.warn('progress')
    return EventFactory.progress(current, total, message, {
      ...metadata,
      source: metadata?.source || EventSource.SYSTEM,
      correlationId: metadata?.correlationId,
      sessionId: metadata?.sessionId
    })
  }

  /**
   * Create a data event
   */
  static data<T>(data: T, metadata?: any) {
    this.warn('data')
    return EventFactory.data(data, {
      ...metadata,
      source: metadata?.source || EventSource.SYSTEM,
      correlationId: metadata?.correlationId,
      sessionId: metadata?.sessionId
    })
  }

  /**
   * Create an error event
   */
  static error(error: Error | string, metadata?: any) {
    this.warn('error')
    return EventFactory.error(error, {
      ...metadata,
      source: metadata?.source || EventSource.SYSTEM,
      correlationId: metadata?.correlationId,
      sessionId: metadata?.sessionId
    })
  }

  /**
   * Create a complete event
   */
  static complete<T>(result?: T, metadata?: any) {
    this.warn('complete')
    return EventFactory.complete(result, {
      ...metadata,
      source: metadata?.source || EventSource.SYSTEM,
      correlationId: metadata?.correlationId,
      sessionId: metadata?.sessionId
    })
  }

  /**
   * Create a status event
   */
  static status(status: string, details?: any, metadata?: any) {
    this.warn('status')
    return EventFactory.status(status, details, {
      ...metadata,
      source: metadata?.source || EventSource.SYSTEM,
      correlationId: metadata?.correlationId,
      sessionId: metadata?.sessionId
    })
  }

  /**
   * Create a warning event
   */
  static warning(message: string, details?: any, metadata?: any) {
    this.warn('warning')
    return EventFactory.warning(message, details, {
      ...metadata,
      source: metadata?.source || EventSource.SYSTEM,
      correlationId: metadata?.correlationId,
      sessionId: metadata?.sessionId
    })
  }

  /**
   * Format event for SSE transmission
   */
  static formatForSSE(event: any): string {
    this.warn('formatForSSE')
    return EventFactory.formatForSSE(event)
  }

  /**
   * Create from legacy format (for migration)
   */
  static fromLegacy(legacyData: any, type?: EventType) {
    this.warn('fromLegacy')
    return EventFactory.fromLegacy(legacyData, type)
  }

  /**
   * Clean up correlation data
   */
  static cleanupCorrelation(sessionId: string): void {
    this.warn('cleanupCorrelation')
    EventFactory.cleanupCorrelation(sessionId)
  }
}

/**
 * @deprecated Use StreamWriter from lib/realtime-events/server instead
 */
export class SSEStreamManager {
  private streamWriter: any // Avoid circular dependency

  constructor(
    private sessionId: string,
    private correlationId: string,
    private signal?: AbortSignal
  ) {
    console.warn(
      '⚠️ SSEStreamManager is deprecated. ' +
      'Please migrate to StreamWriter from lib/realtime-events/server'
    )

    // Dynamically import to avoid circular dependency
    import('../server/stream-writer').then(({ StreamWriter }) => {
      this.streamWriter = new StreamWriter(sessionId, correlationId, signal)
    })
  }

  createStream(): ReadableStream {
    if (!this.streamWriter) {
      throw new Error('StreamWriter not initialized yet')
    }
    return this.streamWriter.createStream()
  }

  async sendEvent(event: any): Promise<void> {
    if (!this.streamWriter) {
      throw new Error('StreamWriter not initialized yet')
    }
    return this.streamWriter.sendEvent(event)
  }

  close(): void {
    if (this.streamWriter) {
      this.streamWriter.close()
    }
  }

  getStats() {
    if (!this.streamWriter) {
      return {
        sessionId: this.sessionId,
        correlationId: this.correlationId,
        eventsSent: 0,
        queueSize: 0,
        isClosed: false
      }
    }
    return this.streamWriter.getStats()
  }
}