/**
 * ID Generator Utility
 * Ensures unique IDs for all notifications and events
 * Following DRY principle - single source of ID generation
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'

export class NotificationIdGenerator {
  private static counter = 0
  private static lastTimestamp = 0
  
  /**
   * Generate a unique ID with prefix
   * Ensures uniqueness even with rapid successive calls
   */
  static generate(prefix: string): string {
    const now = Date.now()
    
    // Ensure uniqueness even with rapid calls
    if (now === this.lastTimestamp) {
      this.counter++
    } else {
      this.counter = 0
      this.lastTimestamp = now
    }
    
    const id = `${prefix}_${now}_${this.counter}`
    
    permanentLogger.info('ID_GENERATOR', 'Generated unique ID', {
      id,
      prefix,
      counter: this.counter
    })
    
    return id
  }
  
  /**
   * Generate a correlation ID for request tracking
   */
  static correlationId(): string {
    const correlationId = `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    permanentLogger.info('ID_GENERATOR', 'Generated correlation ID', { correlationId })
    
    return correlationId
  }
  
  /**
   * Generate a session ID for multi-step operations
   */
  static sessionId(): string {
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    permanentLogger.info('ID_GENERATOR', 'Generated session ID', { sessionId })
    
    return sessionId
  }
  
  /**
   * Reset counter (useful for testing)
   */
  static reset(): void {
    this.counter = 0
    this.lastTimestamp = 0
    
    permanentLogger.info('ID_GENERATOR', 'Counter reset')
  }
}