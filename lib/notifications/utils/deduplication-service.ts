/**
 * Deduplication Service
 * Prevents duplicate events within a time window
 * Following Single Responsibility Principle
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'

export class DeduplicationService {
  private cache = new Map<string, number>()
  private cleanupInterval: NodeJS.Timeout | null = null
  
  constructor(
    private windowMs = 100,
    private cleanupIntervalMs = 5000
  ) {
    // Start cleanup interval
    this.startCleanup()
    
    permanentLogger.info('DEDUP_SERVICE', 'Service initialized', { windowMs,
      cleanupIntervalMs })
  }
  
  /**
   * Check if a key is a duplicate within the window
   */
  isDuplicate(key: string): boolean {
    const last = this.cache.get(key)
    const now = Date.now()
    
    if (last && now - last < this.windowMs) {
      permanentLogger.info('DEDUP_SERVICE', 'Duplicate detected', { key,
        timeSinceLast: now - last,
        windowMs: this.windowMs })
      return true
    }
    
    // Not a duplicate, update cache
    this.cache.set(key, now)
    return false
  }
  
  /**
   * Create a deduplication key from message content
   */
  createKey(message: string, type?: string): string {
    // Create a simple hash-like key from message
    const baseKey = `${type || 'default'}_${message.substring(0, 50)}`
    return baseKey.replace(/\s+/g, '_').toLowerCase()
  }
  
  /**
   * Manually clear a key from cache
   */
  clearKey(key: string): void {
    if (this.cache.delete(key)) {
      permanentLogger.info('DEDUP_SERVICE', 'Key cleared', { key })
    }
  }
  
  /**
   * Start the cleanup interval
   */
  private startCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, this.cleanupIntervalMs)
  }
  
  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const cutoff = Date.now() - this.windowMs
    let removed = 0
    
    for (const [key, time] of this.cache.entries()) {
      if (time < cutoff) {
        this.cache.delete(key)
        removed++
      }
    }
    
    if (removed > 0) {
      permanentLogger.info('DEDUP_SERVICE', 'Cleanup completed', { removed,
        remaining: this.cache.size })
    }
  }
  
  /**
   * Get current cache size
   */
  getSize(): number {
    return this.cache.size
  }
  
  /**
   * Clear all cached entries
   */
  clear(): void {
    const size = this.cache.size
    this.cache.clear()
    
    permanentLogger.info('DEDUP_SERVICE', 'Cache cleared', { entriesCleared: size })
  }
  
  /**
   * Destroy the service and clean up
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    
    this.clear()
    
    permanentLogger.info('DEDUP_SERVICE', 'Service destroyed')
  }
  
  /**
   * Get statistics about the service
   */
  getStats(): {
    cacheSize: number
    windowMs: number
    cleanupIntervalMs: number
  } {
    return {
      cacheSize: this.cache.size,
      windowMs: this.windowMs,
      cleanupIntervalMs: this.cleanupIntervalMs
    }
  }
}

// Singleton instance for global use - TRUE SINGLETON
// Uses 2-second window consistently across all components (DRY principle)
const STANDARD_DEDUP_WINDOW = 2000 // 2 seconds - standardized across app

// Create singleton immediately to ensure it persists
const globalDeduplicationService = new DeduplicationService(
  STANDARD_DEDUP_WINDOW,
  5000 // cleanup every 5 seconds
)

/**
 * Get the global deduplication service singleton
 * @param windowMs - IGNORED for consistency. Always uses 2000ms
 */
export function getDeduplicationService(windowMs?: number): DeduplicationService {
  // Log if someone tries to use a different window
  if (windowMs && windowMs !== STANDARD_DEDUP_WINDOW) {
    permanentLogger.info('DEDUP_SERVICE', 'Non-standard window requested but ignored for consistency', { requested: windowMs,
      actual: STANDARD_DEDUP_WINDOW })
  }
  return globalDeduplicationService
}