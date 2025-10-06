// lib/realtime-events/stream-writer.ts
/**
 * StreamWriter for Server-Sent Events (SSE)
 * Handles real-time event streaming to clients with proper error handling
 * Ensures all enum values are lowercase for consistency
 */

import { EventFactory } from './factories/event-factory'
import { IntelligenceEventFactory } from './factories/intelligence-event-factory'
import type { RealtimeEvent } from './core/event-types'
import { permanentLogger } from '@/lib/utils/permanent-logger'

/**
 * StreamWriter class for managing SSE streams
 * Creates a ReadableStream that can be returned as an HTTP response
 */
export class StreamWriter {
  private controller: ReadableStreamDefaultController<Uint8Array> | null = null
  private encoder = new TextEncoder()
  private closed = false
  private heartbeatInterval: NodeJS.Timeout | null = null
  public readonly startTime = Date.now()
  
  // The actual stream to be returned in the response
  public readonly stream: ReadableStream<Uint8Array>
  
  constructor(
    private sessionId: string,
    private correlationId: string,
    private abortSignal?: AbortSignal
  ) {
    // Create the readable stream
    this.stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        this.controller = controller
        this.initialize()
      },
      cancel: () => {
        this.cleanup()
      }
    })
    
    // Listen for abort signal
    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        this.close('Client disconnected')
      })
    }
  }
  
  /**
   * Initialize the stream with connection event and heartbeat
   */
  private initialize(): void {
    try {
      // Send initial connection event
      const connectionEvent = EventFactory.connection({
        correlationId: this.correlationId,
        sessionId: this.sessionId
      })
      
      this.writeRaw(EventFactory.formatForSSE(connectionEvent))
      
      // Start heartbeat to keep connection alive
      this.startHeartbeat()
      
      permanentLogger.info('STREAM_WRITER', 'Stream initialized', {
        sessionId: this.sessionId,
        correlationId: this.correlationId
      })
    } catch (error) {
      permanentLogger.captureError('STREAM_WRITER', error as Error, {
        context: 'initialization',
        sessionId: this.sessionId,
        correlationId: this.correlationId
      })
    }
  }
  
  /**
   * Start heartbeat to keep SSE connection alive
   * Sends a heartbeat every 30 seconds
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (!this.closed) {
        try {
          const heartbeat = EventFactory.heartbeat({
            correlationId: this.correlationId,
            sessionId: this.sessionId
          })
          
          this.writeRaw(EventFactory.formatForSSE(heartbeat))
        } catch (error) {
          permanentLogger.captureError('STREAM_WRITER', error as Error, {
            context: 'heartbeat',
            sessionId: this.sessionId
          })
          this.cleanup()
        }
      }
    }, 30000) // 30 seconds
  }
  
  /**
   * Write an event to the stream
   * Validates and formats the event before sending
   */
  public async writeEvent(event: any): Promise<void> {
    if (this.closed) {
      permanentLogger.warn('STREAM_WRITER', 'Attempted to write to closed stream', {
        sessionId: this.sessionId,
        eventType: event.type
      })
      return
    }
    
    try {
      // Ensure we have a proper RealtimeEvent structure
      let realtimeEvent: RealtimeEvent
      
      if (this.isRealtimeEvent(event)) {
        realtimeEvent = event
      } else if (event.type && event.data) {
        // Convert to RealtimeEvent
        realtimeEvent = EventFactory.create(
          event.type,
          event.data,
          {
            correlationId: this.correlationId,
            sessionId: this.sessionId,
            source: event.source,
            metadata: event.metadata
          }
        )
      } else {
        // Wrap in data event
        realtimeEvent = EventFactory.data(event, {
          correlationId: this.correlationId,
          sessionId: this.sessionId
        })
      }
      
      // Validate enum values are lowercase
      this.validateEnumValues(realtimeEvent)
      
      // Format and write
      const formatted = EventFactory.formatForSSE(realtimeEvent)
      this.writeRaw(formatted)
      
      permanentLogger.breadcrumb('STREAM_WRITER', 'Event written', {
        sessionId: this.sessionId,
        eventType: realtimeEvent.type,
        eventId: realtimeEvent.id
      })
      
    } catch (error) {
      permanentLogger.captureError('STREAM_WRITER', error as Error, {
        context: 'write_event',
        sessionId: this.sessionId,
        eventType: event?.type
      })
      
      // Send error event to client
      this.writeError(error as Error)
    }
  }
  
  /**
   * Write raw string data to the stream
   */
  private writeRaw(data: string): void {
    if (this.closed || !this.controller) {
      return
    }
    
    try {
      const encoded = this.encoder.encode(data)
      this.controller.enqueue(encoded)
    } catch (error) {
      permanentLogger.captureError('STREAM_WRITER', error as Error, {
        context: 'write_raw',
        sessionId: this.sessionId
      })
      this.cleanup()
    }
  }
  
  /**
   * Write an error event to the stream
   */
  public writeError(error: Error | string): void {
    if (this.closed) return
    
    try {
      const errorEvent = EventFactory.error(error, {
        correlationId: this.correlationId,
        sessionId: this.sessionId
      })
      
      this.writeRaw(EventFactory.formatForSSE(errorEvent))
    } catch (writeError) {
      permanentLogger.captureError('STREAM_WRITER', writeError as Error, {
        context: 'write_error',
        sessionId: this.sessionId,
        originalError: error
      })
    }
  }
  
  /**
   * Write a progress event
   */
  public writeProgress(
    current: number,
    total: number,
    message?: string,
    phase?: string
  ): void {
    if (this.closed) return
    
    const progressEvent = EventFactory.progress(
      current,
      total,
      message,
      {
        phase,
        correlationId: this.correlationId,
        sessionId: this.sessionId
      }
    )
    
    this.writeRaw(EventFactory.formatForSSE(progressEvent))
  }
  
  /**
   * Write an intelligence-specific event
   * Uses IntelligenceEventFactory for proper enum handling
   */
  public writeIntelligenceEvent(
    type: string,
    data: any
  ): void {
    if (this.closed) return
    
    const event = IntelligenceEventFactory.intelligence(
      type,
      data,
      {
        correlationId: this.correlationId,
        sessionId: this.sessionId
      }
    )
    
    this.writeRaw(EventFactory.formatForSSE(event))
  }
  
  /**
   * Close the stream
   */
  public async close(reason?: string): Promise<void> {
    if (this.closed) return
    
    try {
      // Send connection close event
      const closeEvent = EventFactory.connectionClose(reason, {
        correlationId: this.correlationId,
        sessionId: this.sessionId
      })
      
      this.writeRaw(EventFactory.formatForSSE(closeEvent))
      
      // Mark as closed
      this.closed = true
      
      // Close the controller
      if (this.controller) {
        this.controller.close()
      }
      
      permanentLogger.info('STREAM_WRITER', 'Stream closed', {
        sessionId: this.sessionId,
        correlationId: this.correlationId,
        reason
      })
      
    } catch (error) {
      permanentLogger.captureError('STREAM_WRITER', error as Error, {
        context: 'close',
        sessionId: this.sessionId,
        reason
      })
    } finally {
      this.cleanup()
    }
  }
  
  /**
   * Clean up resources
   */
  private cleanup(): void {
    this.closed = true
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
    
    if (this.controller) {
      try {
        this.controller.close()
      } catch {
        // Already closed
      }
      this.controller = null
    }
    
    // Clean up correlation data
    EventFactory.cleanupCorrelation(this.sessionId)
  }
  
  /**
   * Type guard to check if object is a RealtimeEvent
   */
  private isRealtimeEvent(obj: any): obj is RealtimeEvent {
    return obj &&
           typeof obj.id === 'string' &&
           typeof obj.type === 'string' &&
           typeof obj.timestamp === 'number' &&
           typeof obj.correlationId === 'string' &&
           obj.data !== undefined
  }
  
  /**
   * Validate that enum values in event data are lowercase
   */
  private validateEnumValues(event: RealtimeEvent): void {
    const data = event.data as any
    
    if (!data || typeof data !== 'object') return
    
    // Check known enum fields
    const enumFields = [
      'category', 'categories',
      'depth', 
      'scraperType', 'scraper_type',
      'phase', 
      'status', 'extractionStatus', 'extraction_status'
    ]
    
    for (const field of enumFields) {
      if (field in data) {
        const value = data[field]
        
        if (typeof value === 'string' && value !== value.toLowerCase()) {
          permanentLogger.warn('STREAM_WRITER', `Non-lowercase enum value detected: ${field}`, {
            field,
            value,
            expected: value.toLowerCase(),
            sessionId: this.sessionId,
            eventType: event.type
          })
          
          // Auto-fix to lowercase
          data[field] = value.toLowerCase()
        } else if (Array.isArray(value)) {
          // Handle arrays of enum values
          data[field] = value.map((v: any) => 
            typeof v === 'string' ? v.toLowerCase() : v
          )
        }
      }
    }
  }
  
  /**
   * Check if the stream is closed
   */
  public get isClosed(): boolean {
    return this.closed
  }
  
  /**
   * Get the duration since stream started
   */
  public get duration(): number {
    return Date.now() - this.startTime
  }
}

// Export for convenience
export default StreamWriter
