/**
 * Client-Side Stream Reader
 * Reads SSE streams and dispatches events with auto-reconnection
 *
 * CRITICAL: Replaces StreamHandler with better reconnection and type safety
 * Includes automatic reconnection with exponential backoff
 *
 * @module realtime-events/client
 */

'use client'

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { RealtimeEvent, EventType, isConnectionEvent } from '../core/event-types'
import { EventFactory } from '../factories/event-factory'

export interface StreamReaderOptions {
  url: string
  sessionId?: string
  correlationId?: string
  onEvent: (event: RealtimeEvent) => void
  onError?: (error: Error) => void
  onConnect?: () => void
  onDisconnect?: () => void
  reconnect?: boolean
  reconnectOptions?: {
    maxAttempts?: number
    initialDelay?: number
    maxDelay?: number
    backoffMultiplier?: number
  }
}

export class StreamReader {
  private eventSource: EventSource | null = null
  private lastSequenceNumber = 0
  private eventBuffer = new Map<number, RealtimeEvent>()
  private reconnectAttempts = 0
  private reconnectDelay: number
  private reconnectTimeout: NodeJS.Timeout | null = null
  private stopped = false
  private correlationId: string

  constructor(private options: StreamReaderOptions) {
    this.reconnectDelay = options.reconnectOptions?.initialDelay || 1000
    this.correlationId = options.correlationId || EventFactory.getCorrelationId(options.sessionId)
  }

  /**
   * Connect to SSE stream
   */
  async connect(): Promise<void> {
    if (this.eventSource) {
      this.disconnect()
    }

    try {
      const url = new URL(this.options.url, window.location.origin)
      if (this.options.sessionId) {
        url.searchParams.set('sessionId', this.options.sessionId)
      }
      if (this.lastSequenceNumber > 0) {
        url.searchParams.set('lastEventId', String(this.lastSequenceNumber))
      }

      this.eventSource = new EventSource(url.toString())

      this.eventSource.onopen = () => {
        permanentLogger.info('Connected to stream', { category: 'STREAM_READER', url: this.options.url,
          sessionId: this.options.sessionId,
          correlationId: this.correlationId })

        this.reconnectAttempts = 0
        this.reconnectDelay = this.options.reconnectOptions?.initialDelay || 1000
        this.options.onConnect?.()
      }

      this.eventSource.onmessage = (event) => {
        this.handleMessage(event)
      }

      this.eventSource.onerror = (error) => {
        permanentLogger.captureError('STREAM_READER', new Error('Stream error'), {
          url: this.options.url,
          sessionId: this.options.sessionId,
          error
        })

        this.options.onError?.(new Error('Stream connection error'))
        this.disconnect()

        if (this.options.reconnect && !this.stopped) {
          this.scheduleReconnect()
        }
      }
    } catch (error) {
      permanentLogger.captureError('STREAM_READER', new Error('Failed to connect'), {
        url: this.options.url,
        error
      })

      this.options.onError?.(error as Error)

      if (this.options.reconnect && !this.stopped) {
        this.scheduleReconnect()
      }
    }
  }

  /**
   * Handle incoming message
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const eventData = EventFactory.parseFromSSE(`data: ${event.data}\n\n`)

      if (!eventData) {
        return
      }

      // Handle sequence gaps
      if (eventData.sequenceNumber) {
        if (eventData.sequenceNumber > this.lastSequenceNumber + 1) {
          permanentLogger.warn('STREAM_READER', 'Sequence gap detected', {
            expected: this.lastSequenceNumber + 1,
            received: eventData.sequenceNumber
          })
          this.bufferEvent(eventData)
          return
        }
        this.lastSequenceNumber = eventData.sequenceNumber
      }

      this.dispatchEvent(eventData)
      this.processBufferedEvents()
    } catch (error) {
      permanentLogger.captureError('STREAM_READER', error, {
        message: 'Error handling message',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        data: event.data
      })
    }
  }

  /**
   * Buffer out-of-order events
   */
  private bufferEvent(event: RealtimeEvent): void {
    if (event.sequenceNumber) {
      this.eventBuffer.set(event.sequenceNumber, event)
    }
  }

  /**
   * Process buffered events in sequence
   */
  private processBufferedEvents(): void {
    while (this.eventBuffer.has(this.lastSequenceNumber + 1)) {
      const nextSequence = this.lastSequenceNumber + 1
      const event = this.eventBuffer.get(nextSequence)

      if (event) {
        this.dispatchEvent(event)
        this.lastSequenceNumber = nextSequence
        this.eventBuffer.delete(nextSequence)
      } else {
        break
      }
    }
  }

  /**
   * Dispatch event to handler
   */
  private dispatchEvent(event: RealtimeEvent): void {
    permanentLogger.breadcrumb('STREAM_READER', 'Dispatching event', {
      eventId: event.id,
      eventType: event.type,
      sequence: event.sequenceNumber
    })

    this.options.onEvent(event)
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    const maxAttempts = this.options.reconnectOptions?.maxAttempts || 10

    if (this.reconnectAttempts >= maxAttempts) {
      permanentLogger.captureError('STREAM_READER', new Error('Max reconnection attempts reached'), {
        attempts: this.reconnectAttempts
      })
      return
    }

    this.reconnectAttempts++

    permanentLogger.info('Scheduling reconnect', { category: 'STREAM_READER', attempt: this.reconnectAttempts,
      delay: this.reconnectDelay })

    this.reconnectTimeout = setTimeout(async () => {
      await this.connect()
    }, this.reconnectDelay)

    // Exponential backoff
    const multiplier = this.options.reconnectOptions?.backoffMultiplier || 2
    const maxDelay = this.options.reconnectOptions?.maxDelay || 30000
    this.reconnectDelay = Math.min(this.reconnectDelay * multiplier, maxDelay)
  }

  /**
   * Disconnect from stream
   */
  disconnect(): void {
    this.stopped = true

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null

      permanentLogger.info('Disconnected from stream', { category: 'STREAM_READER', url: this.options.url,
        sessionId: this.options.sessionId })

      this.options.onDisconnect?.()
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN
  }

  /**
   * Get connection state
   */
  getState(): number {
    return this.eventSource?.readyState ?? EventSource.CLOSED
  }
}