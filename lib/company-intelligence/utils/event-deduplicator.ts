/**
 * EventDeduplicator - Prevents duplicate event processing
 * 
 * SOLID Principles:
 * - Single Responsibility: Only handles event deduplication
 * - Open/Closed: Can be extended for different TTL strategies
 * 
 * DRY: Centralizes deduplication logic used across components
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'

export interface DeduplicationOptions {
  ttlMs?: number // Time to live in milliseconds
  cleanupIntervalMs?: number // Cleanup interval in milliseconds
  maxSize?: number // Maximum number of events to track
}

export class EventDeduplicator {
  private processedEvents = new Map<string, number>()
  private cleanupInterval: NodeJS.Timer | null = null
  private readonly ttlMs: number
  private readonly maxSize: number
  
  constructor(options: DeduplicationOptions = {}) {
    this.ttlMs = options.ttlMs || 10000 // Default 10 seconds
    this.maxSize = options.maxSize || 1000 // Default max 1000 events
    const cleanupIntervalMs = options.cleanupIntervalMs || 60000 // Default 1 minute
    
    // Start auto-cleanup
    this.cleanupInterval = setInterval(() => this.cleanup(), cleanupIntervalMs)
    
    permanentLogger.info('EVENT_DEDUPLICATOR', 'Deduplicator initialized', { ttlMs: this.ttlMs,
      cleanupIntervalMs,
      maxSize: this.maxSize })
  }
  
  /**
   * Check if event is duplicate
   * Returns true if event has been seen within TTL window
   */
  isDuplicate(eventId: string): boolean {
    const existingTimestamp = this.processedEvents.get(eventId)
    
    if (existingTimestamp) {
      const age = Date.now() - existingTimestamp
      
      if (age < this.ttlMs) {
        permanentLogger.breadcrumb('DUPLICATE_BLOCKED', 'Duplicate event blocked', {
          eventId,
          age,
          ttlMs: this.ttlMs
        })
        return true
      }
      
      // Event expired, remove and allow reprocessing
      this.processedEvents.delete(eventId)
    }
    
    // Mark as processed
    this.markProcessed(eventId)
    return false
  }
  
  /**
   * Mark event as processed
   */
  markProcessed(eventId: string): void {
    // Enforce max size to prevent memory leaks
    if (this.processedEvents.size >= this.maxSize) {
      // Remove oldest entry
      const oldestKey = this.processedEvents.keys().next().value
      this.processedEvents.delete(oldestKey)
      
      permanentLogger.breadcrumb('SIZE_LIMIT_REACHED', 'Removed oldest event due to size limit', {
        removedEventId: oldestKey,
        maxSize: this.maxSize
      })
    }
    
    this.processedEvents.set(eventId, Date.now())
  }
  
  /**
   * Generate event ID from event data
   * Creates consistent IDs for deduplication
   */
  generateEventId(data: {
    type?: string
    scraperId?: string
    timestamp?: number
    [key: string]: any
  }): string {
    const type = data.type || 'unknown'
    const scraperId = data.scraperId || 'unknown'
    const timestamp = data.timestamp || Date.now()
    
    return `${type}-${scraperId}-${timestamp}`
  }
  
  /**
   * Clean up expired events
   * Runs periodically to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now()
    let cleaned = 0
    
    for (const [eventId, timestamp] of this.processedEvents.entries()) {
      if (now - timestamp > this.ttlMs) {
        this.processedEvents.delete(eventId)
        cleaned++
      }
    }
    
    if (cleaned > 0) {
      permanentLogger.breadcrumb('EVENT_CLEANUP', 'Cleaned expired events', {
        cleaned,
        remaining: this.processedEvents.size
      })
    }
  }
  
  /**
   * Force cleanup of all events
   */
  clear(): void {
    const size = this.processedEvents.size
    this.processedEvents.clear()
    
    permanentLogger.breadcrumb('EVENTS_CLEARED', 'All events cleared', {
      clearedCount: size
    })
  }
  
  /**
   * Get statistics about processed events
   */
  getStats(): {
    totalProcessed: number
    oldestEventAge: number | null
    newestEventAge: number | null
  } {
    const now = Date.now()
    const timestamps = Array.from(this.processedEvents.values())
    
    if (timestamps.length === 0) {
      return {
        totalProcessed: 0,
        oldestEventAge: null,
        newestEventAge: null
      }
    }
    
    const oldest = Math.min(...timestamps)
    const newest = Math.max(...timestamps)
    
    return {
      totalProcessed: this.processedEvents.size,
      oldestEventAge: now - oldest,
      newestEventAge: now - newest
    }
  }
  
  /**
   * Destroy deduplicator and clean up resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    
    this.processedEvents.clear()
    
    permanentLogger.info('EVENT_DEDUPLICATOR', 'Deduplicator destroyed')
  }
}