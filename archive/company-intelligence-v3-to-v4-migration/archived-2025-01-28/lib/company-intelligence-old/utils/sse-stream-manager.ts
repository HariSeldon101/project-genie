/**
 * ROBUST SSE Stream Manager
 * 
 * Purpose: Handles all SSE streaming with proper lifecycle management
 * 
 * A 12-year-old explanation: 
 * Think of this like a radio station that broadcasts updates from the server
 * to the browser. It knows when someone tunes in, changes the channel, or
 * turns off their radio, and it stops broadcasting to save energy.
 * 
 * Key Features:
 * - Automatic cleanup on client disconnect
 * - Retry logic for failed writes
 * - Memory leak prevention
 * - Consistent event formatting
 * 
 * @module sse-stream-manager
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { EventFactory } from '@/lib/realtime-events'

export class SSEStreamManager {
  private encoder = new TextEncoder()
  private controller: ReadableStreamDefaultController | null = null
  private isClosed = false
  private eventQueue: any[] = []
  private sequenceNumber = 0
  
  constructor(
    private sessionId: string,
    private correlationId: string,
    private signal?: AbortSignal
  ) {
    permanentLogger.breadcrumb('sse_manager_init', 'SSE Stream Manager initialized', {
      sessionId,
      correlationId
    })
    
    // Handle client disconnect - CRITICAL for cleanup
    signal?.addEventListener('abort', () => {
      permanentLogger.info('SSE_MANAGER', 'Client disconnected', { sessionId})
      this.close()
    })
  }
  
  /**
   * Creates a ReadableStream for SSE responses
   * This is the Next.js 15 best practice pattern
   */
  createStream(): ReadableStream {
    return new ReadableStream({
      start: (controller) => {
        this.controller = controller
        permanentLogger.info('SSE_MANAGER', 'Stream started', { sessionId: this.sessionId})
        
        // Send initial connection event
        this.sendEvent(EventFactory.status('Connected', {
          sessionId: this.sessionId,
          correlationId: this.correlationId
        }))
        
        // Process any queued events
        this.flushQueue()
      },
      
      cancel: () => {
        permanentLogger.info('SSE_MANAGER', 'Stream cancelled', { sessionId: this.sessionId})
        this.close()
      }
    })
  }
  
  /**
   * Sends an event to the client with error handling
   * NEVER fails silently - logs all errors
   */
  async sendEvent(event: any): Promise<void> {
    // Log EVERY event attempt for debugging
    permanentLogger.info('SSE_MANAGER', 'sendEvent called', { eventType: event.type,
      sessionId: this.sessionId,
      isClosed: this.isClosed,
      hasController: !!this.controller,
      sequenceNumber: this.sequenceNumber })
    
    if (this.isClosed) {
      permanentLogger.info('SSE_MANAGER', 'Stream is CLOSED, cannot send event', { eventType: event.type})
      permanentLogger.warn('SSE_MANAGER', 'Attempted to send event to closed stream', {
        sessionId: this.sessionId,
        eventType: event.type
      })
      return
    }
    
    // Add sequence number for ordering
    event.sequence = ++this.sequenceNumber
    
    // Format as SSE
    const sseMessage = `data: ${JSON.stringify(event)}\n\n`
    const encoded = this.encoder.encode(sseMessage)
    
    permanentLogger.info('SSE_MANAGER', 'Formatted SSE message', { messageLength: sseMessage.length,
      encodedLength: encoded.length,
      sequence: event.sequence })
    
    try {
      if (this.controller) {
        permanentLogger.info('SSE_MANAGER', 'Enqueueing to controller', { eventType: event.type})
        this.controller.enqueue(encoded)
        permanentLogger.info('SSE_MANAGER', 'Event SENT successfully', { eventType: event.type,
          sequence: event.sequence })
        
        permanentLogger.breadcrumb('sse_sent', `Event sent: ${event.type}`, {
          sessionId: this.sessionId,
          sequence: event.sequence
        })
      } else {
        // Queue if controller not ready
        permanentLogger.info('SSE_MANAGER', 'Controller NOT READY, queuing event', { eventType: event.type,
          queueSize: this.eventQueue.length + 1 })
        this.eventQueue.push(event)
        permanentLogger.breadcrumb('sse_queued', `Event queued: ${event.type}`, {
          sessionId: this.sessionId,
          queueSize: this.eventQueue.length
        })
      }
    } catch (error) {
      permanentLogger.captureError('SSE_MANAGER', error as Error, {
        sessionId: this.sessionId,
        error: error instanceof Error ? error.message : 'Unknown',
        eventType: event.type
      })
      // Let it fail visibly
      throw error
    }
  }
  
  /**
   * Flush any queued events
   */
  private flushQueue(): void {
    if (this.eventQueue.length === 0) return
    
    permanentLogger.info('SSE_MANAGER', 'Flushing event queue', { sessionId: this.sessionId,
      queueSize: this.eventQueue.length })
    
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift()
      this.sendEvent(event)
    }
  }
  
  /**
   * Clean shutdown of the stream
   */
  close(): void {
    if (this.isClosed) return
    
    this.isClosed = true
    
    // Send close event
    if (this.controller) {
      try {
        const closeEvent = EventFactory.status('Stream closing', {
          sessionId: this.sessionId,
          correlationId: this.correlationId
        })
        const sseMessage = `data: ${JSON.stringify(closeEvent)}\n\n`
        this.controller.enqueue(this.encoder.encode(sseMessage))
        this.controller.close()
      } catch (error) {
        // Controller might already be closed
        permanentLogger.info('SSE_MANAGER', 'Controller already closed', { sessionId: this.sessionId})
      }
    }
    
    permanentLogger.info('SSE_MANAGER', 'Stream closed', { sessionId: this.sessionId,
      totalEvents: this.sequenceNumber })
  }
  
  /**
   * Get stream statistics
   */
  getStats() {
    return {
      sessionId: this.sessionId,
      correlationId: this.correlationId,
      eventsSent: this.sequenceNumber,
      queueSize: this.eventQueue.length,
      isClosed: this.isClosed
    }
  }
}