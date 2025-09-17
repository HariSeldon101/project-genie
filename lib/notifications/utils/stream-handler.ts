/**
 * Stream Handler
 * Extracts streaming logic from components (SRP)
 * Handles SSE-like streaming responses consistently
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { NotificationIdGenerator } from './id-generator'

export interface StreamHandlerOptions {
  correlationId?: string
  onData: (data: any) => void
  onError?: (error: Error) => void
  onComplete?: () => void
  logger?: typeof permanentLogger
}

export class StreamHandler {
  private correlationId: string
  private onData: (data: any) => void
  private onError?: (error: Error) => void
  private onComplete?: () => void
  private logger: typeof permanentLogger
  private processedChunks = 0
  private startTime: number
  private eventBuffer: Map<number, any> = new Map() // Buffer for sequenced events
  private lastProcessedSequence = 0 // Track last processed sequence
  
  constructor(options: StreamHandlerOptions) {
    this.correlationId = options.correlationId || NotificationIdGenerator.correlationId()
    this.onData = options.onData
    this.onError = options.onError
    this.onComplete = options.onComplete
    this.logger = options.logger || permanentLogger
    this.startTime = Date.now()
    
    this.logger.info('STREAM_HANDLER', 'Handler initialized', {
      correlationId: this.correlationId
    })
  }
  
  /**
   * Process a streaming response
   */
  async processStream(response: Response): Promise<void> {
    if (!response.body) {
      const error = new Error('Response body is null')
      this.logger.captureError('STREAM_HANDLER', new Error('No response body'), {
        correlationId: this.correlationId
      })
      this.onError?.(error)
      throw error
    }
    
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    
    try {
      this.logger.info('STREAM_HANDLER', 'Starting stream processing', {
        correlationId: this.correlationId
      })
      
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          console.log('🔴 STREAM_HANDLER: Stream DONE')
          this.logger.info('STREAM_HANDLER', 'Stream complete', {
            correlationId: this.correlationId,
            processedChunks: this.processedChunks,
            duration: Date.now() - this.startTime
          })
          break
        }
        
        // Decode the chunk
        const chunk = decoder.decode(value, { stream: true })
        console.log('🔴 STREAM_HANDLER: Received chunk:', {
          chunkLength: chunk.length,
          chunkPreview: chunk.substring(0, 100)
        })
        buffer += chunk
        
        // Process complete lines
        const lines = buffer.split('\n')
        
        // Keep the last incomplete line in buffer
        buffer = lines.pop() || ''
        
        for (const line of lines) {
          this.processLine(line)
        }
      }
      
      // Process any remaining buffer
      if (buffer.trim()) {
        this.processLine(buffer)
      }
      
      this.onComplete?.()
      
    } catch (error) {
      this.logger.captureError('STREAM_HANDLER', new Error('Stream processing error'), {
        correlationId: this.correlationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        processedChunks: this.processedChunks
      })
      
      this.onError?.(error instanceof Error ? error : new Error('Stream processing failed'))
      throw error
      
    } finally {
      reader.releaseLock()
      
      this.logger.info('STREAM_HANDLER', 'Stream handler cleanup', {
        correlationId: this.correlationId,
        totalChunks: this.processedChunks,
        totalDuration: Date.now() - this.startTime
      })
    }
  }
  
  /**
   * Process a single line from the stream
   */
  private processLine(line: string): void {
    const trimmedLine = line.trim()
    
    // Skip empty lines
    if (!trimmedLine) {
      return
    }
    
    console.log('🔴 STREAM_HANDLER: Processing line:', trimmedLine.substring(0, 100))
    
    // Handle SSE format (data: {...})
    if (trimmedLine.startsWith('data: ')) {
      const dataStr = trimmedLine.slice(6)
      console.log('🔴 STREAM_HANDLER: SSE data detected')
      
      // Handle special SSE messages
      if (dataStr === '[DONE]') {
        this.logger.info('STREAM_HANDLER', 'Received DONE signal', {
          correlationId: this.correlationId
        })
        return
      }
      
      try {
        const data = JSON.parse(dataStr)
        
        // Ensure correlation ID is present
        if (!data.correlationId) {
          data.correlationId = this.correlationId
        }
        
        this.processedChunks++
        
        this.logger.info('STREAM_HANDLER', 'Data chunk processed', {
          correlationId: this.correlationId,
          chunkNumber: this.processedChunks,
          type: data.type,
          phase: data.phase,
          sequence: data.sequence
        })
        
        // Handle sequenced events
        if (data.sequence !== undefined) {
          this.processSequencedEvent(data)
        } else {
          // Non-sequenced events are processed immediately
          this.onData(data)
        }
        
      } catch (e) {
        this.logger.captureError('STREAM_HANDLER', new Error('Failed to parse data'), {
          correlationId: this.correlationId,
          line: trimmedLine,
          error: e instanceof Error ? e.message : 'Parse error'
        })
      }
    }
    // Handle other formats (raw JSON)
    else if (trimmedLine.startsWith('{')) {
      try {
        const data = JSON.parse(trimmedLine)
        
        // Ensure correlation ID is present
        if (!data.correlationId) {
          data.correlationId = this.correlationId
        }
        
        this.processedChunks++
        
        // Handle sequenced events
        if (data.sequence !== undefined) {
          this.processSequencedEvent(data)
        } else {
          // Non-sequenced events are processed immediately
          this.onData(data)
        }
        
      } catch (e) {
        this.logger.captureError('STREAM_HANDLER', new Error('Failed to parse JSON line'), {
          correlationId: this.correlationId,
          line: trimmedLine,
          error: e instanceof Error ? e.message : 'Parse error'
        })
      }
    }
  }
  
  /**
   * Process an event with a sequence number
   * Ensures events are processed in order
   */
  private processSequencedEvent(data: any): void {
    const sequence = data.sequence
    
    // If this is the next expected sequence, process immediately
    if (sequence === this.lastProcessedSequence + 1) {
      this.onData(data)
      this.lastProcessedSequence = sequence
      
      // Process any buffered events that are now in sequence
      this.processBufferedEvents()
    } else if (sequence > this.lastProcessedSequence + 1) {
      // Buffer out-of-order events
      this.eventBuffer.set(sequence, data)
      
      this.logger.info('STREAM_HANDLER', 'Buffering out-of-order event', {
        correlationId: this.correlationId,
        sequence,
        expectedSequence: this.lastProcessedSequence + 1,
        bufferSize: this.eventBuffer.size
      })
    } else {
      // Skip duplicate or old sequences
      this.logger.warn('STREAM_HANDLER', 'Skipping old/duplicate sequence', {
        correlationId: this.correlationId,
        sequence,
        lastProcessed: this.lastProcessedSequence
      })
    }
  }
  
  /**
   * Process any buffered events that are now in sequence
   */
  private processBufferedEvents(): void {
    let processed = 0
    
    while (this.eventBuffer.has(this.lastProcessedSequence + 1)) {
      const nextSequence = this.lastProcessedSequence + 1
      const event = this.eventBuffer.get(nextSequence)
      
      if (event) {
        this.onData(event)
        this.lastProcessedSequence = nextSequence
        this.eventBuffer.delete(nextSequence)
        processed++
      } else {
        break
      }
    }
    
    if (processed > 0) {
      this.logger.info('STREAM_HANDLER', 'Processed buffered events', {
        correlationId: this.correlationId,
        processed,
        lastSequence: this.lastProcessedSequence,
        remainingBuffer: this.eventBuffer.size
      })
    }
  }
  
  /**
   * Get the correlation ID for this stream
   */
  getCorrelationId(): string {
    return this.correlationId
  }
  
  /**
   * Get statistics about the stream processing
   */
  getStats(): {
    correlationId: string
    processedChunks: number
    duration: number
  } {
    return {
      correlationId: this.correlationId,
      processedChunks: this.processedChunks,
      duration: Date.now() - this.startTime
    }
  }
}