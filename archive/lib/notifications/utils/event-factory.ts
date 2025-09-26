/**
 * Event Factory
 *
 * ⚠️ DEPRECATED as of 2025-01-13 ⚠️
 *
 * This file is deprecated and will be removed in a future version.
 * Please migrate to the unified event system:
 *
 * OLD (this file):
 * import { EventFactory } from '@/lib/notifications/utils/event-factory'
 *
 * NEW (unified system):
 * import { EventFactory } from '@/lib/realtime-events'
 *
 * The new EventFactory unifies ALL event creation:
 * - SSE events for server streaming
 * - Notification events for UI toasts
 * - Progress, error, and data events
 * - Type-safe across client/server boundary
 *
 * Migration is currently handled via adapters, but direct usage is recommended.
 * See /lib/realtime-events/README.md for migration guide.
 *
 * @deprecated Use EventFactory from @/lib/realtime-events instead
 */

import { NotificationIdGenerator } from './id-generator'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import {
  Event,
  NotificationEvent,
  PhaseEvent,
  NotificationType,
  EventPriority,
  EventSource
} from '../types'

export interface EventOptions {
  source?: EventSource
  priority?: EventPriority
  correlationId?: string
  persistent?: boolean
  deduplicationKey?: string
}

export class EventFactory {
  /**
   * Create a notification event
   */
  static notification(
    message: string,
    type: NotificationType,
    options?: EventOptions
  ): NotificationEvent {
    const event: NotificationEvent = {
      id: NotificationIdGenerator.generate('notif'),
      type: 'notification',
      source: options?.source || EventSource.CLIENT,
      priority: options?.priority || EventPriority.NORMAL,
      timestamp: Date.now(),
      correlationId: options?.correlationId || NotificationIdGenerator.correlationId(),
      payload: {
        message,
        notificationType: type,
        persistent: options?.persistent ?? true
      }
    }
    
    permanentLogger.info('Notification event created', {
      category: 'EVENT_FACTORY',
      id: event.id,
      type: event.type,
      correlationId: event.correlationId,
      message: message.substring(0, 50) // Log first 50 chars
    })
    
    return event
  }
  
  /**
   * Create a phase event
   */
  static phase(
    phase: string,
    status: 'started' | 'completed' | 'failed',
    message?: string,
    options?: EventOptions
  ): PhaseEvent {
    const event: PhaseEvent = {
      id: NotificationIdGenerator.generate('phase'),
      type: 'phase',
      source: options?.source || EventSource.CLIENT,
      priority: status === 'failed' ? EventPriority.CRITICAL :
               status === 'completed' ? EventPriority.HIGH :
               EventPriority.NORMAL,
      timestamp: Date.now(),
      correlationId: options?.correlationId || NotificationIdGenerator.correlationId(),
      payload: {
        phase,
        status,
        message,
        progress: status === 'completed' ? 100 : status === 'started' ? 0 : undefined
      }
    }
    
    permanentLogger.info('EVENT_FACTORY', 'Phase event created', {
      id: event.id,
      phase,
      status,
      correlationId: event.correlationId
    })
    
    return event
  }
  
  /**
   * Create an error event
   */
  static error(
    message: string,
    error?: Error,
    options?: EventOptions
  ): NotificationEvent {
    const fullMessage = error ? `${message}: ${error.message}` : message
    
    const event = this.notification(fullMessage, 'error', {
      ...options,
      priority: options?.priority || EventPriority.HIGH,
      persistent: true
    })
    
    permanentLogger.captureError('EVENT_FACTORY', new Error('Error event created'), {
      id: event.id,
      message: fullMessage,
      stack: error?.stack,
      correlationId: event.correlationId
    })
    
    return event
  }
  
  /**
   * Create a success event
   */
  static success(
    message: string,
    options?: EventOptions
  ): NotificationEvent {
    return this.notification(message, 'success', {
      ...options,
      priority: options?.priority || EventPriority.NORMAL
    })
  }
  
  /**
   * Create a warning event
   */
  static warning(
    message: string,
    options?: EventOptions
  ): NotificationEvent {
    return this.notification(message, 'warning', {
      ...options,
      priority: options?.priority || EventPriority.HIGH
    })
  }
  
  /**
   * Create an info event
   */
  static info(
    message: string,
    options?: EventOptions
  ): NotificationEvent {
    return this.notification(message, 'info', {
      ...options,
      priority: options?.priority || EventPriority.NORMAL
    })
  }
  
  /**
   * Map string priority to EventPriority enum
   */
  static mapPriority(priority: string): EventPriority {
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