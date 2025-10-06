// lib/realtime-events/server/intelligence-stream-writer.ts
/**
 * Intelligence-Enhanced Stream Writer
 * Extends the base StreamWriter with enum validation for intelligence events
 * Ensures all enum values are lowercase before transmission
 */

import { StreamWriter } from './stream-writer'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { RealtimeEvent, EventType, EventSource } from '../core/event-types'
import { IntelligenceEventFactory } from '../factories/intelligence-event-factory'
import type {
  IntelligenceCategory,
  IntelligenceDepth,
  ScraperType,
  SessionPhase,
  ExtractionStatus
} from '@/lib/company-intelligence/types'

/**
 * Intelligence-aware StreamWriter
 * Validates and corrects enum values before sending
 */
export class IntelligenceStreamWriter extends StreamWriter {
  private enumValidationEnabled = true
  private enumWarnings = new Map<string, number>()
  
  constructor(
    sessionId: string,
    correlationId: string,
    signal?: AbortSignal
  ) {
    super(sessionId, correlationId, signal)
    
    permanentLogger.info('INTELLIGENCE_STREAM', 'Intelligence stream writer initialized', {
      sessionId,
      correlationId
    })
  }
  
  /**
   * Override sendEvent to add enum validation
   */
  async sendEvent(event: RealtimeEvent): Promise<void> {
    // Validate and fix enum values if it's an intelligence event
    if (this.isIntelligenceEvent(event)) {
      event = this.validateAndFixEnums(event)
    }
    
    // Call parent implementation
    return super.sendEvent(event)
  }
  
  /**
   * Send an intelligence-specific event with validation
   */
  async sendIntelligenceEvent(
    type: string,
    data: any,
    options?: {
      source?: EventSource
      metadata?: any
    }
  ): Promise<void> {
    // Use IntelligenceEventFactory for proper enum handling
    const event = IntelligenceEventFactory.intelligence(
      type,
      data,
      {
        source: options?.source || EventSource.SYSTEM,
        correlationId: this.correlationId,
        sessionId: this.sessionId,
        metadata: options?.metadata
      }
    )
    
    return this.sendEvent(event)
  }
  
  /**
   * Send session created event
   */
  async sendSessionCreated(data: {
    sessionId: string
    companyId: string
    domain: string
    depth: IntelligenceDepth
    scraperType: ScraperType
    categories: IntelligenceCategory[]
    estimatedCredits: number
    maxPages: number
    userId: string
  }): Promise<void> {
    const event = IntelligenceEventFactory.sessionCreated(data, {
      correlationId: this.correlationId
    })
    return this.sendEvent(event)
  }
  
  /**
   * Send phase changed event
   */
  async sendPhaseChanged(
    phase: SessionPhase,
    options?: {
      previousPhase?: SessionPhase
      message?: string
      progress?: number
    }
  ): Promise<void> {
    const event = IntelligenceEventFactory.phaseChanged(
      this.sessionId,
      phase,
      {
        ...options,
        correlationId: this.correlationId
      }
    )
    return this.sendEvent(event)
  }
  
  /**
   * Send category extracted event
   */
  async sendCategoryExtracted(data: {
    category: IntelligenceCategory
    url: string
    itemsCount: number
    confidenceScore: number
    extractionTime: number
    extractionStatus: ExtractionStatus
  }): Promise<void> {
    const event = IntelligenceEventFactory.categoryExtracted(
      {
        sessionId: this.sessionId,
        ...data
      },
      {
        correlationId: this.correlationId
      }
    )
    return this.sendEvent(event)
  }
  
  /**
   * Send page scraped event
   */
  async sendPageScraped(data: {
    url: string
    pageNumber: number
    totalPages?: number
    categories: IntelligenceCategory[]
    itemsExtracted: number
    processingTime: number
    bytesProcessed?: number
  }): Promise<void> {
    const event = IntelligenceEventFactory.pageScraped(
      {
        sessionId: this.sessionId,
        ...data
      },
      {
        correlationId: this.correlationId
      }
    )
    return this.sendEvent(event)
  }
  
  /**
   * Send session completed event
   */
  async sendSessionCompleted(data: {
    totalPages: number
    totalItems: number
    creditsUsed: number
    duration: number
    categories: IntelligenceCategory[]
    depth: IntelligenceDepth
    scraperType: ScraperType
  }): Promise<void> {
    const event = IntelligenceEventFactory.sessionCompleted(
      {
        sessionId: this.sessionId,
        ...data
      },
      {
        correlationId: this.correlationId
      }
    )
    return this.sendEvent(event)
  }
  
  /**
   * Send session failed event
   */
  async sendSessionFailed(
    error: Error | string,
    phase?: SessionPhase
  ): Promise<void> {
    const event = IntelligenceEventFactory.sessionFailed(
      this.sessionId,
      error,
      {
        phase,
        correlationId: this.correlationId
      }
    )
    return this.sendEvent(event)
  }
  
  /**
   * Check if event is intelligence-related
   */
  private isIntelligenceEvent(event: RealtimeEvent): boolean {
    return typeof event.type === 'string' && (
      event.type.startsWith('intelligence.') ||
      event.type.startsWith('scraping.') ||
      event.type.startsWith('phase.')
    )
  }
  
  /**
   * Validate and fix enum values in event data
   */
  private validateAndFixEnums(event: RealtimeEvent): RealtimeEvent {
    if (!this.enumValidationEnabled) return event
    
    const data = event.data as any
    if (!data || typeof data !== 'object') return event
    
    // Create a deep copy to avoid mutating original
    const fixedData = JSON.parse(JSON.stringify(data))
    
    // Check and fix enum fields
    this.fixEnumField(fixedData, 'category', event.type)
    this.fixEnumField(fixedData, 'categories', event.type)
    this.fixEnumField(fixedData, 'depth', event.type)
    this.fixEnumField(fixedData, 'scraperType', event.type)
    this.fixEnumField(fixedData, 'scraper_type', event.type)
    this.fixEnumField(fixedData, 'phase', event.type)
    this.fixEnumField(fixedData, 'currentPhase', event.type)
    this.fixEnumField(fixedData, 'previousPhase', event.type)
    this.fixEnumField(fixedData, 'status', event.type)
    this.fixEnumField(fixedData, 'extractionStatus', event.type)
    this.fixEnumField(fixedData, 'extraction_status', event.type)
    this.fixEnumField(fixedData, 'intelligence_categories', event.type)
    
    // Return event with fixed data
    return {
      ...event,
      data: fixedData
    }
  }
  
  /**
   * Fix a specific enum field to lowercase
   */
  private fixEnumField(data: any, fieldName: string, eventType: string): void {
    if (!(fieldName in data)) return
    
    const value = data[fieldName]
    
    if (typeof value === 'string') {
      const lowercase = value.toLowerCase()
      if (value !== lowercase) {
        this.logEnumWarning(fieldName, value, lowercase, eventType)
        data[fieldName] = lowercase
      }
    } else if (Array.isArray(value)) {
      // Fix array of enum values
      data[fieldName] = value.map((v: any) => {
        if (typeof v === 'string') {
          const lowercase = v.toLowerCase()
          if (v !== lowercase) {
            this.logEnumWarning(`${fieldName}[]`, v, lowercase, eventType)
          }
          return lowercase
        }
        return v
      })
    }
  }
  
  /**
   * Log enum validation warning
   */
  private logEnumWarning(
    field: string,
    incorrect: string,
    correct: string,
    eventType: string
  ): void {
    const warningKey = `${field}:${incorrect}`
    const warningCount = (this.enumWarnings.get(warningKey) || 0) + 1
    this.enumWarnings.set(warningKey, warningCount)
    
    // Only log first 5 occurrences to avoid spam
    if (warningCount <= 5) {
      permanentLogger.warn('INTELLIGENCE_STREAM', 'Non-lowercase enum value detected and fixed', {
        field,
        incorrect,
        correct,
        eventType,
        sessionId: this.sessionId,
        occurrences: warningCount
      })
    } else if (warningCount === 6) {
      permanentLogger.warn('INTELLIGENCE_STREAM', 'Suppressing further warnings for this enum value', {
        field,
        incorrect,
        totalOccurrences: warningCount
      })
    }
  }
  
  /**
   * Get enum validation statistics
   */
  getEnumValidationStats(): {
    warnings: Array<{ field: string; value: string; count: number }>
    totalWarnings: number
  } {
    const warnings = Array.from(this.enumWarnings.entries()).map(([key, count]) => {
      const [field, value] = key.split(':')
      return { field, value, count }
    })
    
    const totalWarnings = warnings.reduce((sum, w) => sum + w.count, 0)
    
    return { warnings, totalWarnings }
  }
  
  /**
   * Override getStats to include enum validation stats
   */
  override getStats() {
    const baseStats = super.getStats()
    const enumStats = this.getEnumValidationStats()
    
    return {
      ...baseStats,
      enumValidation: enumStats
    }
  }
  
  /**
   * Enable or disable enum validation
   */
  setEnumValidation(enabled: boolean): void {
    this.enumValidationEnabled = enabled
    permanentLogger.info('INTELLIGENCE_STREAM', 'Enum validation setting changed', {
      enabled,
      sessionId: this.sessionId
    })
  }
}

// Export as default
export default IntelligenceStreamWriter
