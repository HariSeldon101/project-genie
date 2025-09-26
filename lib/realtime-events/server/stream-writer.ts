/**
 * Server-Side Stream Writer
 * Handles SSE stream creation and management for Next.js 15
 *
 * CRITICAL: Replaces SSEStreamManager with proper cleanup and memory management
 * Following Next.js 15 best practices for streaming responses
 *
 * Key improvements over old system:
 * - Proper AbortSignal handling for client disconnects
 * - Memory leak prevention with cleanup
 * - Heartbeat to keep connections alive
 * - Type-safe event handling
 *
 * @module realtime-events/server
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { RealtimeEvent, EventType, EventSource } from '../core/event-types'
import { EventFactory } from '../factories/event-factory'

/**
 * StreamWriter class for server-side SSE streaming
 * Creates and manages a ReadableStream for SSE responses
 */
export class StreamWriter {
  // Text encoder for converting strings to Uint8Array
  private encoder = new TextEncoder()

  // Stream controller for sending data
  private controller: ReadableStreamDefaultController | null = null

  // Track if stream is closed
  private closed = false

  // Heartbeat interval to keep connection alive
  private heartbeatInterval: NodeJS.Timeout | null = null

  // Event queue for buffering if controller not ready
  private eventQueue: RealtimeEvent[] = []

  // Track statistics
  private eventsSent = 0
  private bytesSent = 0
  private startTime = Date.now()

  /**
   * Constructor
   * @param sessionId - Unique session identifier
   * @param correlationId - Correlation ID for linking events
   * @param signal - AbortSignal for handling client disconnect
   */
  constructor(
    private sessionId: string,
    private correlationId: string,
    private signal?: AbortSignal
  ) {
    // Handle client disconnect - CRITICAL for cleanup
    if (signal) {
      signal.addEventListener('abort', () => {
        permanentLogger.info('STREAM_WRITER', 'Client disconnected (abort signal)', { sessionId,
          correlationId,
          eventsSent: this.eventsSent })
        this.close()
      })
    }

    permanentLogger.breadcrumb('stream_writer_init', 'StreamWriter initialized', {
      sessionId,
      correlationId,
      hasSignal: !!signal
    })
  }

  /**
   * Create a ReadableStream for SSE (Next.js 15 pattern)
   * This is the main method that creates the stream
   */
  createStream(): ReadableStream {
    return new ReadableStream({
      start: (controller) => {
        this.controller = controller

        // Start heartbeat to keep connection alive
        this.startHeartbeat()

        permanentLogger.info('STREAM_WRITER', 'Stream started', {
          sessionId: this.sessionId,
          correlationId: this.correlationId
        })

        // Send initial connection event to confirm stream is open
        this.sendEvent(EventFactory.create(
          EventType.CONNECTION_OPEN,
          {
            sessionId: this.sessionId,
            correlationId: this.correlationId,
            timestamp: Date.now()
          },
          {
            source: EventSource.SERVER,
            correlationId: this.correlationId,
            sessionId: this.sessionId
          }))

        // Process any queued events
        this.flushQueue()
      },

      cancel: (reason) => {
        permanentLogger.info('STREAM_WRITER', 'Stream cancelled', {
          sessionId: this.sessionId,
          correlationId: this.correlationId,
          reason,
          eventsSent: this.eventsSent
        })
        this.close()
      }
    })
  }

  /**
   * Send an event to the client
   * Main method for sending events through the stream
   */
  async sendEvent(event: RealtimeEvent): Promise<void> {
    if (this.closed) {
      permanentLogger.warn('STREAM_WRITER', 'Cannot send to closed stream', {
        sessionId: this.sessionId,
        eventType: event.type,
        eventId: event.id
      })
      return
    }

    try {
      // Format event for SSE transmission
      const sseMessage = EventFactory.formatForSSE(event)
      const encoded = this.encoder.encode(sseMessage)

      // Update statistics
      this.eventsSent++
      this.bytesSent += encoded.length

      if (this.controller) {
        // Send directly if controller is ready
        this.controller.enqueue(encoded)

        permanentLogger.breadcrumb('stream_event_sent', 'Event sent', {
          sessionId: this.sessionId,
          eventId: event.id,
          eventType: event.type,
          sequence: event.sequenceNumber,
          bytes: encoded.length
        })
      } else {
        // Queue if controller not ready yet
        this.eventQueue.push(event)

        permanentLogger.breadcrumb('stream_event_queued', 'Event queued', {
          sessionId: this.sessionId,
          eventId: event.id,
          eventType: event.type,
          queueSize: this.eventQueue.length
        })
      }
    } catch (error) {
      permanentLogger.captureError('STREAM_WRITER', error as Error, {
        sessionId: this.sessionId,
        eventType: event.type,
        eventId: event.id
      })

      // Close stream on error to prevent hanging
      this.close()
      throw error
    }
  }

  /**
   * Send multiple events in batch
   * Useful for sending initial state or bulk updates
   */
  async sendBatch(events: RealtimeEvent[]): Promise<void> {
    permanentLogger.info('STREAM_WRITER', 'Sending batch of events', {
      sessionId: this.sessionId,
      count: events.length
    })

    for (const event of events) {
      await this.sendEvent(event)
    }
  }

  /**
   * Send a progress event
   * Convenience method for progress updates
   */
  async sendProgress(
    current: number,
    total: number,
    message?: string,
    phase?: string
  ): Promise<void> {
    const event = EventFactory.progress(current, total, message, {
      phase,
      source: EventSource.SERVER,
      correlationId: this.correlationId,
      sessionId: this.sessionId
    })

    await this.sendEvent(event)
  }

  /**
   * Send an error event
   * Convenience method for error reporting
   */
  async sendError(error: Error | string, retriable?: boolean): Promise<void> {
    const event = EventFactory.error(error, {
      retriable,
      source: EventSource.SERVER,
      correlationId: this.correlationId,
      sessionId: this.sessionId
    })

    await this.sendEvent(event)
  }

  /**
   * Send a notification event
   * Convenience method for user notifications
   */
  async sendNotification(
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info'
  ): Promise<void> {
    const event = EventFactory.notification(message, type, {
      source: EventSource.SERVER,
      correlationId: this.correlationId,
      sessionId: this.sessionId
    })

    await this.sendEvent(event)
  }

  /**
   * Start heartbeat to keep connection alive
   * Sends a heartbeat event every 30 seconds
   */
  private startHeartbeat(): void {
    // Clear any existing heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }

    // Send heartbeat every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      if (!this.closed) {
        const heartbeat = EventFactory.create(
          EventType.STREAM_HEARTBEAT,
          {
            timestamp: Date.now(),
            eventsSent: this.eventsSent,
            uptime: Date.now() - this.startTime
          },
          {
            source: EventSource.SERVER,
            correlationId: this.correlationId,
            sessionId: this.sessionId
          }
        )

        this.sendEvent(heartbeat).catch(error => {
          permanentLogger.captureError('STREAM_WRITER', error, {
            message: 'Failed to send heartbeat',
            sessionId: this.sessionId,
            errorMessage: error instanceof Error ? error.message : 'Unknown'
          })
        })
      }
    }, 30000) // 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  /**
   * Flush any queued events
   * Sends all events that were queued before controller was ready
   */
  private flushQueue(): void {
    if (this.eventQueue.length === 0) return

    permanentLogger.info('STREAM_WRITER', 'Flushing event queue', {
      sessionId: this.sessionId,
      queueSize: this.eventQueue.length
    })

    while (this.eventQueue.length > 0 && this.controller) {
      const event = this.eventQueue.shift()
      if (event) {
        this.sendEvent(event).catch(error => {
          permanentLogger.captureError('STREAM_WRITER', error, {
            message: 'Failed to flush queued event',
            sessionId: this.sessionId,
            eventType: event.type,
            errorMessage: error instanceof Error ? error.message : 'Unknown'
          })
        })
      }
    }
  }

  /**
   * Close the stream and cleanup resources
   * CRITICAL: Must be called to prevent memory leaks
   */
  close(): void {
    if (this.closed) return

    this.closed = true

    // Stop heartbeat
    this.stopHeartbeat()

    // Send close event if controller is available
    if (this.controller) {
      try {
        // Send connection close event
        const closeEvent = EventFactory.create(
          EventType.CONNECTION_CLOSE,
          {
            sessionId: this.sessionId,
            correlationId: this.correlationId,
            timestamp: Date.now(),
            eventsSent: this.eventsSent,
            bytesSent: this.bytesSent,
            duration: Date.now() - this.startTime
          },
          {
            source: EventSource.SERVER,
            correlationId: this.correlationId,
            sessionId: this.sessionId
          }
        )

        const sseMessage = EventFactory.formatForSSE(closeEvent)
        this.controller.enqueue(this.encoder.encode(sseMessage))

        // Close the controller
        this.controller.close()
      } catch (error) {
        // Controller might already be closed
        permanentLogger.info('STREAM_WRITER', 'Controller already closed', {
          sessionId: this.sessionId,
          error: error instanceof Error ? error.message : 'Already closed'
        })
      }
    }

    // Clear controller reference
    this.controller = null

    // Clear event queue
    this.eventQueue = []

    // Clean up correlation data in factory
    EventFactory.cleanupCorrelation(this.sessionId)

    permanentLogger.info('STREAM_WRITER', 'Stream closed', {
      sessionId: this.sessionId,
      correlationId: this.correlationId,
      eventsSent: this.eventsSent,
      bytesSent: this.bytesSent,
      duration: Date.now() - this.startTime
    })
  }

  /**
   * Check if stream is closed
   */
  isClosed(): boolean {
    return this.closed
  }

  /**
   * Get stream statistics
   */
  getStats(): {
    sessionId: string
    correlationId: string
    eventsSent: number
    bytesSent: number
    queueSize: number
    uptime: number
    isClosed: boolean
  } {
    return {
      sessionId: this.sessionId,
      correlationId: this.correlationId,
      eventsSent: this.eventsSent,
      bytesSent: this.bytesSent,
      queueSize: this.eventQueue.length,
      uptime: Date.now() - this.startTime,
      isClosed: this.closed
    }
  }
}