/**
 * ScrapingStreamService - Handles SSE streaming and event deduplication
 * 
 * SOLID Principles Applied:
 * - Single Responsibility: Only handles streaming and deduplication
 * - Interface Segregation: Clean interfaces for stream handlers
 * - Dependency Inversion: Uses SSEEventFactory abstraction
 * 
 * DRY Principle: Centralizes all streaming logic
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { EventFactory, StreamWriter } from '@/lib/realtime-events'
import { eventBus } from '@/lib/notifications/event-bus'
import { EventPriority } from '@/lib/notifications/types'

export interface StreamHandlers {
  onProgress?: (data: any) => void
  onData?: (data: any) => void
  onStatus?: (data: any) => void
  onComplete?: (data: any) => void
  onError?: (error: any) => void
}

export interface StreamEvent {
  type: string
  scraperId?: string
  timestamp?: number
  data?: any
  error?: any
  message?: string
  current?: number
  total?: number
  percentage?: number
}

export class ScrapingStreamService {
  private processedEvents = new Map<string, number>()
  private cleanupInterval: NodeJS.Timer | null = null
  private readonly TTL_MS = 10000 // 10 seconds TTL for processed events
  private readonly CLEANUP_INTERVAL_MS = 60000 // Clean up every minute
  
  constructor() {
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanupOldEvents(), this.CLEANUP_INTERVAL_MS)
    
    permanentLogger.info('Service initialized', { category: 'SCRAPING_STREAM_SERVICE', ttlMs: this.TTL_MS,
      cleanupIntervalMs: this.CLEANUP_INTERVAL_MS })
  }
  
  /**
   * Process a streaming response with event deduplication
   * Uses SSEStreamManager for robust streaming
   */
  async processStream(
    response: Response, 
    handlers: StreamHandlers,
    sessionId: string,
    activeScraperId?: string
  ): Promise<void> {
    permanentLogger.breadcrumb('PROCESS_STREAM', 'Starting stream processing', {
      sessionId,
      activeScraperId,
      hasHandlers: Object.keys(handlers).length
    })
    
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No readable stream available')
    }
    
    const decoder = new TextDecoder()
    let buffer = ''
    
    try {
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          permanentLogger.info('SCRAPING_STREAM_SERVICE', 'Stream completed', { sessionId})
          break
        }
        
        buffer += decoder.decode(value, { stream: true })
        
        // Process complete SSE events
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              await this.handleStreamEvent(data, handlers, activeScraperId)
            } catch (error) {
              permanentLogger.captureError('SCRAPING_STREAM_SERVICE', error, {
                context: 'Failed to parse SSE event',
                line
              })
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }
  
  /**
   * Handle individual stream event with deduplication
   */
  private async handleStreamEvent(
    event: StreamEvent,
    handlers: StreamHandlers,
    activeScraperId?: string
  ): Promise<void> {
    // Generate event ID for deduplication
    const eventId = this.generateEventId(event, activeScraperId)
    
    // Check for duplicate
    if (this.isDuplicateEvent(eventId)) {
      permanentLogger.breadcrumb('DUPLICATE_EVENT', 'Duplicate event blocked', {
        eventId,
        type: event.type
      })
      return
    }
    
    // Mark as processed
    this.markEventProcessed(eventId)
    
    permanentLogger.breadcrumb('HANDLE_STREAM_EVENT', 'Processing stream event', {
      type: event.type,
      eventId,
      hasData: !!event.data
    })
    
    // Route to appropriate handler
    switch (event.type) {
      case 'progress':
        if (handlers.onProgress) {
          handlers.onProgress(event)
        }
        break
        
      case 'data':
        if (handlers.onData) {
          handlers.onData(event)
        }
        break
        
      case 'status':
        if (handlers.onStatus) {
          handlers.onStatus(event)
        }
        break
        
      case 'scraper_complete':
      case 'complete':
        // Only process scraper_complete to avoid duplicates
        if (event.type === 'scraper_complete' && handlers.onComplete) {
          // Add activeScraperId if missing
          if (!event.scraperId && activeScraperId) {
            event.scraperId = activeScraperId
          }
          handlers.onComplete(event)
        }
        break
        
      case 'error':
        if (handlers.onError) {
          handlers.onError(event)
        }
        break
        
      default:
        permanentLogger.breadcrumb('UNKNOWN_EVENT_TYPE', 'Unknown event type received', {
          type: event.type
        })
    }
  }
  
  /**
   * Generate unique event ID for deduplication
   */
  private generateEventId(event: StreamEvent, activeScraperId?: string): string {
    const scraperId = event.scraperId || activeScraperId || 'unknown'
    const timestamp = event.timestamp || Date.now()
    return `${event.type}-${scraperId}-${timestamp}`
  }
  
  /**
   * Check if event has been processed (duplicate detection)
   */
  private isDuplicateEvent(eventId: string): boolean {
    return this.processedEvents.has(eventId)
  }
  
  /**
   * Mark event as processed
   */
  private markEventProcessed(eventId: string): void {
    this.processedEvents.set(eventId, Date.now())
  }
  
  /**
   * Clean up old processed events to prevent memory leaks
   */
  private cleanupOldEvents(): void {
    const now = Date.now()
    let cleaned = 0
    
    for (const [eventId, timestamp] of this.processedEvents.entries()) {
      if (now - timestamp > this.TTL_MS) {
        this.processedEvents.delete(eventId)
        cleaned++
      }
    }
    
    if (cleaned > 0) {
      permanentLogger.breadcrumb('EVENT_CLEANUP', 'Cleaned old events', {
        cleaned,
        remaining: this.processedEvents.size
      })
    }
  }
  
  /**
   * Send notification with deduplication
   */
  sendNotification(
    message: string, 
    type: 'success' | 'error' | 'info' = 'info',
    priority?: EventPriority
  ): void {
    // Create deduplication key
    const deduplicationKey = `${message}-${type}-${Date.now()}`
    
    // Check if recently sent (within 2 seconds)
    const recentlySent = Array.from(this.processedEvents.entries()).some(
      ([key, timestamp]) => 
        key.startsWith(`notification-${message}`) && 
        Date.now() - timestamp < 2000
    )
    
    if (recentlySent) {
      return
    }
    
    // Mark as sent
    this.markEventProcessed(`notification-${deduplicationKey}`)
    
    // Create and emit event
    const event = EventFactory.notification(
      message,
      type,
      {
        priority: priority || (
          type === 'error' ? EventPriority.HIGH :
          type === 'success' ? EventPriority.NORMAL :
          EventPriority.LOW
        ),
        persistent: true
      }
    )
    
    eventBus.emit(event)
  }
  
  /**
   * Cleanup service
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.processedEvents.clear()
    
    permanentLogger.info('SCRAPING_STREAM_SERVICE', 'Service destroyed')
  }
}