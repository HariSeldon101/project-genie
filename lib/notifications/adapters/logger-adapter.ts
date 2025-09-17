/**
 * Permanent Logger Adapter v2.0
 * Integrates permanent logger with the event bus for unified logging
 *
 * Architecture Notes:
 * - No method interception (not supported in new logger)
 * - Clean event-driven architecture
 * - Direct integration with new captureError method
 * - Prevents circular dependencies
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { eventBus } from '../event-bus'
// Use unified EventFactory from realtime-events
import { EventFactory } from '@/lib/realtime-events'
import {
  EventAdapter,
  EventHandler,
  EventSource,
  EventPriority,
  Event
} from '../types'

export class LoggerAdapter implements EventAdapter {
  name = 'Logger Adapter'
  source = EventSource.SYSTEM
  private handler: EventHandler | null = null
  private subscriptionId: string | null = null
  private isProcessingEvent = false // Prevent circular logging

  async connect(): Promise<void> {
    // Add breadcrumb for adapter initialization
    permanentLogger.breadcrumb('adapter', 'Logger adapter connecting to event bus', {
      adapterName: this.name,
      source: this.source
    })

    // Subscribe to all events and log them
    this.subscriptionId = eventBus.subscribe((event: Event) => {
      this.logEvent(event)
    })

    permanentLogger.info('LOGGER_ADAPTER', 'Logger adapter connected successfully', {
      subscriptionId: this.subscriptionId
    })
  }

  private logEvent(event: Event): void {
    // CRITICAL: Prevent circular logging
    if (this.isProcessingEvent) return

    this.isProcessingEvent = true

    try {
      // Add breadcrumb at interface boundary
      const eventPriority = event.metadata?.priority || EventPriority.NORMAL
      permanentLogger.breadcrumb('event', `Processing ${event.type} event`, {
        eventId: event.id,
        source: event.source,
        priority: this.getPriorityName(eventPriority)
      })

      // Prepare structured log data
      // Use permanentLogger's timestamp handling instead of manual conversion
      const logData = {
        eventId: event.id,
        type: event.type,
        source: event.source,
        priority: this.getPriorityName(eventPriority),
        correlationId: event.correlationId,
        timestamp: event.timestamp || Date.now(), // Provide fallback if timestamp is missing
        metadata: event.metadata
      }

      // Start timing for performance tracking
      const timing = permanentLogger.timing(`event_${event.type}`, {
        eventId: event.id,
        source: event.source
      })

      // Handle different event types appropriately
      // Use startsWith for hierarchical event types (e.g., notification.success)
      if (event.type.startsWith('notification')) {
        this.handleNotificationEvent(event, logData)
      } else if (event.type.startsWith('phase')) {
        this.handlePhaseEvent(event, logData)
      } else if (event.type === 'error' || event.type.startsWith('error.')) {
        this.handleErrorEvent(event, logData)
      } else if (event.type === 'progress' || event.type.startsWith('progress.')) {
        this.handleProgressEvent(event, logData)
      } else {
        // Generic event logging
        permanentLogger.info('EVENT_BUS', `Event received: ${event.type}`, logData)
      }

      // Stop timing
      timing.stop()

    } catch (error) {
      // Last resort error handling - log to console only
      // We cannot use permanentLogger here as it would cause infinite loop
      console.error('[LoggerAdapter] Failed to process event:', error)
    } finally {
      // ALWAYS reset flag to prevent blocking
      this.isProcessingEvent = false
    }
  }

  private handleNotificationEvent(event: Event, logData: any): void {
    const data = event.data as any

    // Log malformed events to identify source (but less aggressively)
    if (!data) {
      permanentLogger.warn('LOGGER_ADAPTER', 'Skipping notification event without data', {
        eventId: event.id,
        eventType: event.type,
        eventSource: event.source
      })
      return
    }

    const notificationType = data.notificationType || 'info'
    const message = data.message || 'Notification'

    switch (notificationType) {
      case 'error':
        // Use the new captureError method properly
        permanentLogger.captureError(
          'EVENT_NOTIFICATION',
          new Error(message),
          {
            ...logData,
            notificationType,
            persistent: data.persistent
          }
        )
        break

      case 'warning':
        permanentLogger.warn('EVENT_NOTIFICATION', message, {
          ...logData,
          notificationType,
          persistent: payload.persistent
        })
        break

      case 'success':
        permanentLogger.info('EVENT_NOTIFICATION', `✅ ${message}`, {
          ...logData,
          notificationType
        })
        break

      default:
        permanentLogger.info('EVENT_NOTIFICATION', message, {
          ...logData,
          notificationType
        })
    }
  }

  private handlePhaseEvent(event: Event, logData: any): void {
    const data = event.data as any

    // Log malformed events to identify source (but less aggressively)
    if (!data) {
      permanentLogger.warn('LOGGER_ADAPTER', 'Skipping phase event without data', {
        eventId: event.id,
        eventType: event.type,
        eventSource: event.source
      })
      return
    }

    const phase = data.phase || 'unknown'
    const status = data.status || 'unknown'

    if (status === 'failed' || status === 'error') {
      // Phase failure - use captureError
      permanentLogger.captureError(
        'EVENT_PHASE',
        new Error(`Phase '${phase}' failed`),
        {
          ...logData,
          phase,
          status,
          error: data.error
        }
      )
    } else if (status === 'completed') {
      permanentLogger.info('EVENT_PHASE', `Phase '${phase}' completed successfully`, {
        ...logData,
        phase,
        status,
        duration: data.duration
      })
    } else {
      permanentLogger.info('EVENT_PHASE', `Phase '${phase}' status: ${status}`, {
        ...logData,
        phase,
        status
      })
    }
  }

  private handleErrorEvent(event: Event, logData: any): void {
    const data = event.data as any

    // Log malformed events to identify source
    if (!data) {
      console.error('MALFORMED EVENT: Error event has no data', {
        eventId: event.id,
        eventType: event.type,
        eventSource: event.source,
        event: JSON.stringify(event)
      })
      return
    }

    const errorMessage = data.message || data.error || 'Unknown error'
    const errorStack = data.stack

    // Always use captureError for error events
    const error = new Error(errorMessage)
    if (errorStack) {
      error.stack = errorStack
    }

    permanentLogger.captureError('EVENT_ERROR', error, {
      ...logData,
      originalError: data.error,
      code: data.code,
      statusCode: data.statusCode
    })
  }

  private handleProgressEvent(event: Event, logData: any): void {
    const data = event.data as any

    // Log malformed events to identify source
    if (!data) {
      console.error('MALFORMED EVENT: Progress event has no data', {
        eventId: event.id,
        eventType: event.type,
        eventSource: event.source,
        event: JSON.stringify(event)
      })
      return
    }

    const progress = data.progress || 0
    const total = data.total || 100
    const percentage = Math.round((progress / total) * 100)

    // Only log significant progress updates to avoid spam
    if (percentage % 25 === 0 || percentage === 100) {
      permanentLogger.info('EVENT_PROGRESS', `Progress: ${percentage}%`, {
        ...logData,
        progress,
        total,
        percentage,
        message: data.message
      })
    }

    // Add breadcrumb for all progress updates
    permanentLogger.breadcrumb('progress', `${percentage}% complete`, {
      progress,
      total,
      message: payload.message
    })
  }

  private getPriorityName(priority: EventPriority): string {
    switch (priority) {
      case EventPriority.CRITICAL:
        return 'CRITICAL'
      case EventPriority.HIGH:
        return 'HIGH'
      case EventPriority.NORMAL:
        return 'NORMAL'
      case EventPriority.LOW:
        return 'LOW'
      default:
        return 'UNKNOWN'
    }
  }

  async disconnect(): Promise<void> {
    if (this.subscriptionId) {
      eventBus.unsubscribe(this.subscriptionId)
      this.subscriptionId = null
    }

    permanentLogger.info('LOGGER_ADAPTER', 'Logger adapter disconnected', {
      adapterName: this.name
    })
  }

  subscribe(handler: EventHandler): void {
    this.handler = handler
  }

  unsubscribe(): void {
    this.handler = null
  }

  /**
   * Emit a log event to the event bus
   * This allows the logger to trigger notifications for critical logs
   */
  emitLogEvent(level: string, category: string, message: string, data?: any): void {
    // Don't emit if we're already processing to prevent loops
    if (this.isProcessingEvent) return

    // Only emit for critical log levels
    if (level === 'error' || level === 'fatal') {
      // Use EventFactory to create properly structured notification event
      eventBus.emit(EventFactory.notification(
        `[${category}] ${message}`,
        'error',
        {
          source: EventSource.SYSTEM,
          metadata: {
            priority: level === 'fatal' ? EventPriority.CRITICAL : EventPriority.HIGH,
            category,
            originalData: data,
            persistent: true
          }
        }))
    }
  }
}

/**
 * Singleton instance of logger adapter
 */
let loggerAdapterInstance: LoggerAdapter | null = null

/**
 * Initialize the logger adapter (call once at app startup)
 */
export async function initializeLoggerAdapter(): Promise<LoggerAdapter> {
  if (!loggerAdapterInstance) {
    loggerAdapterInstance = new LoggerAdapter()
    await loggerAdapterInstance.connect()

    // Add hook to emit events for critical logs
    // Note: This is a clean integration point, not method interception
    permanentLogger.breadcrumb('adapter', 'Logger adapter initialized', {
      note: 'Event emission enabled for critical logs'
    })
  }
  return loggerAdapterInstance
}

/**
 * Get the logger adapter instance
 */
export function getLoggerAdapter(): LoggerAdapter | null {
  return loggerAdapterInstance
}

/**
 * Clean up the logger adapter
 */
export async function cleanupLoggerAdapter(): Promise<void> {
  if (loggerAdapterInstance) {
    await loggerAdapterInstance.disconnect()
    loggerAdapterInstance = null
  }
}