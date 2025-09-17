/**
 * Server-Sent Events (SSE) Adapter
 * Bridges SSE events to the enterprise event bus
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { eventBus } from '../event-bus'
import {
  EventAdapter,
  EventHandler,
  EventSource,
  EventPriority,
  NotificationEvent
} from '../types'

export class SSEAdapter implements EventAdapter {
  name = 'SSE Adapter'
  source = EventSource.SSE
  private eventSource: EventSource | null = null
  private url: string
  private handler: EventHandler | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  constructor(url: string) {
    this.url = url
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        permanentLogger.info('SSE_ADAPTER', 'Connecting to SSE', { url: this.url})
        
        this.eventSource = new (window as any).EventSource(this.url)
        
        this.eventSource.onopen = () => {
          permanentLogger.info('SSE_ADAPTER', 'SSE connection established')
          this.reconnectAttempts = 0
          resolve()
        }

        this.eventSource.onerror = (error: any) => {
          permanentLogger.error('SSE_ADAPTER', 'SSE connection error', { error })
          
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++
            permanentLogger.info('Attempting reconnect', { category: 'SSE_ADAPTER', attempt: this.reconnectAttempts,
              maxAttempts: this.maxReconnectAttempts })
            
            setTimeout(() => {
              this.disconnect().then(() => this.connect())
            }, this.reconnectDelay * this.reconnectAttempts)
          } else {
            reject(new Error('Max reconnection attempts reached'))
          }
        }

        // Handle specific event types
        this.setupEventHandlers()
        
      } catch (error) {
        permanentLogger.error('SSE_ADAPTER', 'Failed to create EventSource', { error })
        reject(error)
      }
    })
  }

  private setupEventHandlers(): void {
    if (!this.eventSource) return

    // Handle phase events
    this.eventSource.addEventListener('phase-start', (event: MessageEvent) => {
      this.handlePhaseEvent(event, 'started')
    })

    this.eventSource.addEventListener('phase-complete', (event: MessageEvent) => {
      this.handlePhaseEvent(event, 'completed')
    })

    this.eventSource.addEventListener('phase-error', (event: MessageEvent) => {
      this.handlePhaseEvent(event, 'failed')
    })

    // Handle notification events
    this.eventSource.addEventListener('notification', (event: MessageEvent) => {
      this.handleNotificationEvent(event)
    })

    // Handle data events
    this.eventSource.addEventListener('data-update', (event: MessageEvent) => {
      this.handleDataEvent(event)
    })

    // Handle generic messages
    this.eventSource.onmessage = (event: MessageEvent) => {
      this.handleGenericMessage(event)
    }
  }

  private handlePhaseEvent(event: MessageEvent, status: 'started' | 'completed' | 'failed'): void {
    try {
      const data = JSON.parse(event.data)
      const phase = data.phase || 'unknown'
      const phaseLabel = `[${phase.toUpperCase().replace('-', '_')}]`
      
      eventBus.emit({
        id: `sse_phase_${Date.now()}`,
        type: 'phase',
        source: this.source,
        priority: status === 'failed' ? EventPriority.CRITICAL : EventPriority.HIGH,
        timestamp: Date.now(),
        correlationId: data.correlationId,
        payload: {
          phase,
          status,
          message: `${phaseLabel} ${data.message || ''}`,
          progress: data.progress
        }
      })
    } catch (error) {
      permanentLogger.error('SSE_ADAPTER', 'Failed to handle phase event', { error, event })
    }
  }

  private handleNotificationEvent(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data)
      
      // Add phase label if phase is specified
      let message = data.message
      if (data.phase) {
        const phaseLabel = `[${data.phase.toUpperCase().replace('-', '_')}]`
        message = `${phaseLabel} ${message}`
      }
      
      eventBus.emit({
        id: `sse_notif_${Date.now()}`,
        type: 'notification',
        source: this.source,
        priority: this.mapPriority(data.priority),
        timestamp: Date.now(),
        correlationId: data.correlationId,
        payload: {
          message,
          notificationType: data.type || 'info',
          persistent: data.persistent !== false
        }
      } as NotificationEvent)
    } catch (error) {
      permanentLogger.error('SSE_ADAPTER', 'Failed to handle notification event', { error, event })
    }
  }

  private handleDataEvent(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data)
      
      // Convert data events to notifications with phase labels
      let message = data.message || `Data updated: ${data.entity}`
      if (data.phase) {
        const phaseLabel = `[${data.phase.toUpperCase().replace('-', '_')}]`
        message = `${phaseLabel} ${message}`
      }
      
      eventBus.emit({
        id: `sse_data_${Date.now()}`,
        type: 'notification',
        source: this.source,
        priority: EventPriority.NORMAL,
        timestamp: Date.now(),
        correlationId: data.correlationId,
        payload: {
          message,
          notificationType: 'info',
          persistent: true
        }
      } as NotificationEvent)
      
      // Also emit the actual data event
      eventBus.emit({
        id: `sse_data_raw_${Date.now()}`,
        type: 'data',
        source: this.source,
        priority: EventPriority.LOW,
        timestamp: Date.now(),
        correlationId: data.correlationId,
        payload: {
          entity: data.entity,
          action: data.action || 'updated',
          data: data.data,
          count: data.count
        }
      })
    } catch (error) {
      permanentLogger.error('SSE_ADAPTER', 'Failed to handle data event', { error, event })
    }
  }

  private handleGenericMessage(event: MessageEvent): void {
    try {
      // Try to parse as JSON
      let data: any
      try {
        data = JSON.parse(event.data)
      } catch {
        // If not JSON, treat as string message
        data = { message: event.data }
      }

      // Extract phase from various possible fields
      const phase = data.phase || data.currentPhase || data.stage
      let message = data.message || data.data || event.data
      
      if (phase) {
        const phaseLabel = `[${phase.toUpperCase().replace('-', '_')}]`
        message = `${phaseLabel} ${message}`
      }

      eventBus.emit({
        id: `sse_generic_${Date.now()}`,
        type: 'notification',
        source: this.source,
        priority: EventPriority.NORMAL,
        timestamp: Date.now(),
        payload: {
          message,
          notificationType: 'info',
          persistent: true
        }
      } as NotificationEvent)
    } catch (error) {
      permanentLogger.error('SSE_ADAPTER', 'Failed to handle generic message', { error, event })
    }
  }

  private mapPriority(priority?: string | number): EventPriority {
    if (typeof priority === 'number') {
      return priority as EventPriority
    }
    
    switch (priority?.toLowerCase()) {
      case 'critical':
      case 'error':
        return EventPriority.CRITICAL
      case 'high':
      case 'warning':
        return EventPriority.HIGH
      case 'normal':
      case 'info':
        return EventPriority.NORMAL
      case 'low':
      case 'debug':
        return EventPriority.LOW
      default:
        return EventPriority.NORMAL
    }
  }

  async disconnect(): Promise<void> {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
      permanentLogger.info('SSE_ADAPTER', 'SSE connection closed')
    }
  }

  subscribe(handler: EventHandler): void {
    this.handler = handler
  }

  unsubscribe(): void {
    this.handler = null
  }
}

/**
 * Factory function to create and connect SSE adapter
 */
export async function createSSEAdapter(url: string): Promise<SSEAdapter> {
  const adapter = new SSEAdapter(url)
  await adapter.connect()
  return adapter
}