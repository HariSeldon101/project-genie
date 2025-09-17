/**
 * Legacy Notification Adapter
 * Maintains backward compatibility with old notification EventFactory
 *
 * CRITICAL: This is a temporary adapter for gradual migration
 * All methods delegate to the new unified EventFactory
 * Shows deprecation warnings to encourage migration
 *
 * @module realtime-events/adapters
 * @deprecated Use EventFactory from lib/realtime-events instead
 */

import { EventFactory as NewEventFactory } from '../factories/event-factory'
import { EventType, EventSource, EventPriority } from '../core/event-types'

// Re-export types for compatibility
export { EventSource, EventPriority }
export type {
  RealtimeEvent as Event,
  NotificationData,
  PhaseData
} from '../core/event-types'

// Type aliases for backward compatibility
export type NotificationEvent = any
export type PhaseEvent = any
export type NotificationType = 'info' | 'success' | 'warning' | 'error'

/**
 * @deprecated Use EventFactory from lib/realtime-events/factories instead
 * This is a compatibility layer that will be removed in future versions
 */
export class EventFactory {
  private static warnOnce = new Set<string>()

  private static warn(method: string): void {
    if (!this.warnOnce.has(method)) {
      console.warn(
        `⚠️ EventFactory.${method} from notifications is deprecated. ` +
        `Please migrate to EventFactory from lib/realtime-events/factories`
      )
      this.warnOnce.add(method)
    }
  }

  /**
   * Create a notification event
   */
  static notification(
    message: string,
    type: NotificationType,
    options?: any
  ) {
    this.warn('notification')
    return NewEventFactory.notification(message, type, {
      ...options,
      source: options?.source || EventSource.CLIENT,
      correlationId: options?.correlationId,
      sessionId: options?.sessionId,
      persistent: options?.persistent
    })
  }

  /**
   * Create a phase event
   */
  static phase(
    phase: string,
    status: 'started' | 'completed' | 'failed',
    message?: string,
    options?: any
  ) {
    this.warn('phase')
    return NewEventFactory.phase(phase, status as any, {
      ...options,
      message,
      source: options?.source || EventSource.CLIENT,
      correlationId: options?.correlationId,
      sessionId: options?.sessionId
    })
  }

  /**
   * Create an error event
   */
  static error(
    message: string,
    error?: Error,
    options?: any
  ) {
    this.warn('error')
    const fullMessage = error ? `${message}: ${error.message}` : message
    return NewEventFactory.notification(fullMessage, 'error', {
      ...options,
      persistent: true,
      priority: options?.priority || EventPriority.HIGH,
      source: options?.source || EventSource.CLIENT,
      correlationId: options?.correlationId,
      sessionId: options?.sessionId
    })
  }

  /**
   * Create a success event
   */
  static success(message: string, options?: any) {
    this.warn('success')
    return NewEventFactory.notification(message, 'success', {
      ...options,
      source: options?.source || EventSource.CLIENT,
      correlationId: options?.correlationId,
      sessionId: options?.sessionId
    })
  }

  /**
   * Create a warning event
   */
  static warning(message: string, options?: any) {
    this.warn('warning')
    return NewEventFactory.notification(message, 'warning', {
      ...options,
      priority: options?.priority || EventPriority.HIGH,
      source: options?.source || EventSource.CLIENT,
      correlationId: options?.correlationId,
      sessionId: options?.sessionId
    })
  }

  /**
   * Create an info event
   */
  static info(message: string, options?: any) {
    this.warn('info')
    return NewEventFactory.notification(message, 'info', {
      ...options,
      source: options?.source || EventSource.CLIENT,
      correlationId: options?.correlationId,
      sessionId: options?.sessionId
    })
  }

  /**
   * Map string priority to EventPriority enum
   */
  static mapPriority(priority: string): EventPriority {
    this.warn('mapPriority')
    switch (priority?.toLowerCase()) {
      case 'fatal':
      case 'error':
        return EventPriority.CRITICAL
      case 'high':
      case 'warning':
        return EventPriority.HIGH
      case 'low':
      case 'debug':
        return EventPriority.LOW
      case 'normal':
      case 'info':
      default:
        return EventPriority.NORMAL
    }
  }
}

/**
 * @deprecated Use StreamReader from lib/realtime-events/client instead
 */
export class StreamHandler {
  private streamReader: any // Avoid circular dependency

  constructor(private options: any) {
    console.warn(
      '⚠️ StreamHandler is deprecated. ' +
      'Please migrate to StreamReader from lib/realtime-events/client'
    )
  }

  async processStream(response: Response): Promise<void> {
    // For backward compatibility, parse the stream manually
    if (!response.body) {
      throw new Error('Response body is null')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk

        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          this.processLine(line)
        }
      }

      if (buffer.trim()) {
        this.processLine(buffer)
      }

      this.options.onComplete?.()
    } catch (error) {
      this.options.onError?.(error instanceof Error ? error : new Error('Stream processing failed'))
      throw error
    } finally {
      reader.releaseLock()
    }
  }

  private processLine(line: string): void {
    const trimmedLine = line.trim()
    if (!trimmedLine) return

    if (trimmedLine.startsWith('data: ')) {
      const dataStr = trimmedLine.slice(6)
      if (dataStr === '[DONE]') return

      try {
        const data = JSON.parse(dataStr)
        if (!data.correlationId && this.options.correlationId) {
          data.correlationId = this.options.correlationId
        }
        this.options.onData(data)
      } catch (e) {
        // Ignore parse errors
      }
    } else if (trimmedLine.startsWith('{')) {
      try {
        const data = JSON.parse(trimmedLine)
        if (!data.correlationId && this.options.correlationId) {
          data.correlationId = this.options.correlationId
        }
        this.options.onData(data)
      } catch (e) {
        // Ignore parse errors
      }
    }
  }

  getCorrelationId(): string {
    return this.options.correlationId || ''
  }

  getStats() {
    return {
      correlationId: this.options.correlationId || '',
      processedChunks: 0,
      duration: 0
    }
  }
}

/**
 * Helper for ID generation (backward compatibility)
 */
export class NotificationIdGenerator {
  static generate(prefix?: string): string {
    console.warn('⚠️ NotificationIdGenerator is deprecated. IDs are auto-generated.')
    return `${prefix || 'notif'}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  static correlationId(): string {
    console.warn('⚠️ NotificationIdGenerator.correlationId is deprecated. Use EventFactory.getCorrelationId()')
    return NewEventFactory.getCorrelationId()
  }
}