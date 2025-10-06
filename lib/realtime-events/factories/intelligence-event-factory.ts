// lib/realtime-events/factories/intelligence-event-factory.ts
/**
 * Intelligence Event Factory
 * Extends the base EventFactory with intelligence-specific event creation
 * Ensures all enum values are lowercase for database compatibility
 */

import { EventFactory } from './event-factory'
import { EventSource, EventPriority, type RealtimeEvent } from '../core/event-types'
import {
  IntelligenceEventType,
  type SessionCreatedData,
  type PhaseChangeData,
  type CategoryExtractedData,
  type PageProcessedData,
  type IntelligenceItemData,
  type CreditEventData,
  type ScraperEventData,
  type SessionCompleteData
} from '../core/intelligence-event-types'
import type {
  IntelligenceCategory,
  IntelligenceDepth,
  ScraperType,
  SessionPhase,
  ExtractionStatus
} from '@/lib/company-intelligence/types'
import { permanentLogger } from '@/lib/utils/permanent-logger'

/**
 * Factory for creating intelligence-specific events
 * All enum values will be lowercase strings
 */
export class IntelligenceEventFactory extends EventFactory {
  /**
   * Create session created event
   */
  static sessionCreated(
    data: {
      sessionId: string
      companyId: string
      domain: string
      depth: IntelligenceDepth
      scraperType: ScraperType
      categories: IntelligenceCategory[]
      estimatedCredits: number
      maxPages: number
      userId: string
    },
    options?: {
      correlationId?: string
      metadata?: any
    }
  ): RealtimeEvent<SessionCreatedData> {
    // Validate that enum values are lowercase
    if (data.depth !== data.depth.toLowerCase()) {
      permanentLogger.warn('INTELLIGENCE_EVENTS', 'Depth value not lowercase', {
        provided: data.depth,
        expected: data.depth.toLowerCase()
      })
    }
    
    const eventData: SessionCreatedData = {
      ...data,
      createdAt: new Date().toISOString()
    }
    
    return this.create<SessionCreatedData>(
      IntelligenceEventType.SESSION_CREATED as any,
      eventData,
      {
        source: EventSource.SYSTEM,
        correlationId: options?.correlationId || data.sessionId,
        sessionId: data.sessionId,
        metadata: {
          ...options?.metadata,
          userId: data.userId,
          domain: data.domain,
          categories: data.categories,
          depth: data.depth
        }
      }
    )
  }
  
  /**
   * Create phase change event
   * Phase values must be lowercase
   */
  static phaseChanged(
    sessionId: string,
    phase: SessionPhase,
    options?: {
      previousPhase?: SessionPhase
      message?: string
      progress?: number
      correlationId?: string
      metadata?: any
    }
  ): RealtimeEvent<PhaseChangeData> {
    const eventData: PhaseChangeData = {
      sessionId,
      currentPhase: phase,
      previousPhase: options?.previousPhase,
      message: options?.message,
      progress: options?.progress,
      metadata: options?.metadata
    }
    
    // Map phase to specific event type
    let eventType: IntelligenceEventType
    switch (phase) {
      case 'discovery':
        eventType = IntelligenceEventType.PHASE_DISCOVERY
        break
      case 'initialization':
        eventType = IntelligenceEventType.PHASE_INITIALIZATION
        break
      case 'scraping':
        eventType = IntelligenceEventType.PHASE_SCRAPING
        break
      case 'processing':
        eventType = IntelligenceEventType.PHASE_PROCESSING
        break
      case 'complete':
        eventType = IntelligenceEventType.PHASE_COMPLETE
        break
      case 'error':
        eventType = IntelligenceEventType.PHASE_ERROR
        break
      default:
        permanentLogger.warn('INTELLIGENCE_EVENTS', 'Unknown phase', { phase })
        eventType = IntelligenceEventType.PHASE_DISCOVERY
    }
    
    permanentLogger.info('INTELLIGENCE_EVENTS', 'Phase changed', {
      sessionId,
      from: options?.previousPhase,
      to: phase
    })
    
    return this.create<PhaseChangeData>(
      eventType as any,
      eventData,
      {
        source: EventSource.SYSTEM,
        correlationId: options?.correlationId || sessionId,
        sessionId,
        metadata: {
          ...options?.metadata,
          phase,
          progress: options?.progress
        }
      }
    )
  }
  
  /**
   * Create category extracted event
   * Category must be lowercase
   */
  static categoryExtracted(
    data: {
      sessionId: string
      category: IntelligenceCategory
      url: string
      itemsCount: number
      confidenceScore: number
      extractionTime: number
      extractionStatus: ExtractionStatus
    },
    options?: {
      correlationId?: string
      metadata?: any
    }
  ): RealtimeEvent<CategoryExtractedData> {
    // Validate category is lowercase
    if (data.category !== data.category.toLowerCase()) {
      permanentLogger.captureError(
        'INTELLIGENCE_EVENTS',
        new Error('Category must be lowercase'),
        {
          provided: data.category,
          expected: data.category.toLowerCase()
        }
      )
    }
    
    return this.create<CategoryExtractedData>(
      IntelligenceEventType.CATEGORY_EXTRACTED as any,
      data,
      {
        source: EventSource.EXTRACTOR,
        correlationId: options?.correlationId || data.sessionId,
        sessionId: data.sessionId,
        metadata: {
          ...options?.metadata,
          category: data.category,
          itemsCount: data.itemsCount,
          confidence: data.confidenceScore
        }
      }
    )
  }
  
  /**
   * Create page scraped event
   */
  static pageScraped(
    data: {
      sessionId: string
      url: string
      pageNumber: number
      totalPages?: number
      categories: IntelligenceCategory[]
      itemsExtracted: number
      processingTime: number
      bytesProcessed?: number
    },
    options?: {
      correlationId?: string
      metadata?: any
    }
  ): RealtimeEvent<PageProcessedData> {
    // Validate all categories are lowercase
    const invalidCategories = data.categories.filter(c => c !== c.toLowerCase())
    if (invalidCategories.length > 0) {
      permanentLogger.warn('INTELLIGENCE_EVENTS', 'Non-lowercase categories detected', {
        invalid: invalidCategories
      })
    }
    
    return this.create<PageProcessedData>(
      IntelligenceEventType.PAGE_SCRAPED as any,
      data,
      {
        source: EventSource.SCRAPER,
        correlationId: options?.correlationId || data.sessionId,
        sessionId: data.sessionId,
        metadata: {
          ...options?.metadata,
          url: data.url,
          pageNumber: data.pageNumber,
          itemsExtracted: data.itemsExtracted
        }
      }
    )
  }
  
  /**
   * Create intelligence item extracted event
   */
  static itemExtracted(
    data: {
      sessionId: string
      itemId: string
      category: IntelligenceCategory
      url: string
      title: string
      description?: string
      confidenceScore: number
      extractedData: Record<string, any>
      extractionStatus: ExtractionStatus
    },
    options?: {
      correlationId?: string
      metadata?: any
    }
  ): RealtimeEvent<IntelligenceItemData> {
    return this.create<IntelligenceItemData>(
      IntelligenceEventType.ITEM_EXTRACTED as any,
      data,
      {
        source: EventSource.EXTRACTOR,
        correlationId: options?.correlationId || data.sessionId,
        sessionId: data.sessionId,
        metadata: {
          ...options?.metadata,
          category: data.category,
          itemId: data.itemId,
          confidence: data.confidenceScore
        }
      }
    )
  }
  
  /**
   * Create credits event
   */
  static credits(
    action: 'estimated' | 'deducted' | 'refunded',
    data: {
      sessionId: string
      userId: string
      credits: number
      balance?: number
      depth: IntelligenceDepth
      categories: IntelligenceCategory[]
    },
    options?: {
      correlationId?: string
      metadata?: any
    }
  ): RealtimeEvent<CreditEventData> {
    const eventData: CreditEventData = {
      ...data,
      action
    }
    
    let eventType: IntelligenceEventType
    switch (action) {
      case 'estimated':
        eventType = IntelligenceEventType.CREDITS_ESTIMATED
        break
      case 'deducted':
        eventType = IntelligenceEventType.CREDITS_DEDUCTED
        break
      default:
        eventType = IntelligenceEventType.CREDITS_ESTIMATED
    }
    
    return this.create<CreditEventData>(
      eventType as any,
      eventData,
      {
        source: EventSource.SYSTEM,
        correlationId: options?.correlationId || data.sessionId,
        sessionId: data.sessionId,
        metadata: {
          ...options?.metadata,
          userId: data.userId,
          credits: data.credits,
          action
        }
      }
    )
  }
  
  /**
   * Create insufficient credits event
   */
  static insufficientCredits(
    data: {
      sessionId: string
      userId: string
      required: number
      available: number
      depth: IntelligenceDepth
      categories: IntelligenceCategory[]
    },
    options?: {
      correlationId?: string
      metadata?: any
    }
  ): RealtimeEvent<CreditEventData> {
    return this.create<CreditEventData>(
      IntelligenceEventType.CREDITS_INSUFFICIENT as any,
      {
        sessionId: data.sessionId,
        userId: data.userId,
        credits: data.required,
        balance: data.available,
        action: 'estimated',
        depth: data.depth,
        categories: data.categories
      },
      {
        source: EventSource.SYSTEM,
        correlationId: options?.correlationId || data.sessionId,
        sessionId: data.sessionId,
        metadata: {
          ...options?.metadata,
          userId: data.userId,
          required: data.required,
          available: data.available,
          priority: EventPriority.HIGH
        }
      }
    )
  }
  
  /**
   * Create scraper event
   */
  static scraper(
    type: 'initialized' | 'rate_limited' | 'retrying',
    data: {
      sessionId: string
      scraperType: ScraperType
      status: string
      message?: string
      retryCount?: number
      retryAfter?: number
      error?: string
    },
    options?: {
      correlationId?: string
      metadata?: any
    }
  ): RealtimeEvent<ScraperEventData> {
    let eventType: IntelligenceEventType
    switch (type) {
      case 'initialized':
        eventType = IntelligenceEventType.SCRAPER_INITIALIZED
        break
      case 'rate_limited':
        eventType = IntelligenceEventType.SCRAPER_RATE_LIMITED
        break
      case 'retrying':
        eventType = IntelligenceEventType.SCRAPER_RETRYING
        break
      default:
        eventType = IntelligenceEventType.SCRAPER_INITIALIZED
    }
    
    return this.create<ScraperEventData>(
      eventType as any,
      data,
      {
        source: EventSource.SCRAPER,
        correlationId: options?.correlationId || data.sessionId,
        sessionId: data.sessionId,
        metadata: {
          ...options?.metadata,
          scraperType: data.scraperType,
          status: data.status,
          priority: type === 'rate_limited' ? EventPriority.HIGH : EventPriority.NORMAL
        }
      }
    )
  }
  
  /**
   * Create session completed event
   */
  static sessionCompleted(
    data: {
      sessionId: string
      totalPages: number
      totalItems: number
      creditsUsed: number
      duration: number
      categories: IntelligenceCategory[]
      depth: IntelligenceDepth
      scraperType: ScraperType
    },
    options?: {
      correlationId?: string
      metadata?: any
    }
  ): RealtimeEvent<SessionCompleteData> {
    const eventData: SessionCompleteData = {
      ...data,
      phase: 'complete' as SessionPhase // Ensure lowercase
    }
    
    permanentLogger.info('INTELLIGENCE_EVENTS', 'Session completed', {
      sessionId: data.sessionId,
      totalPages: data.totalPages,
      totalItems: data.totalItems,
      creditsUsed: data.creditsUsed,
      duration: data.duration
    })
    
    return this.create<SessionCompleteData>(
      IntelligenceEventType.SESSION_COMPLETED as any,
      eventData,
      {
        source: EventSource.SYSTEM,
        correlationId: options?.correlationId || data.sessionId,
        sessionId: data.sessionId,
        metadata: {
          ...options?.metadata,
          totalPages: data.totalPages,
          totalItems: data.totalItems,
          creditsUsed: data.creditsUsed,
          priority: EventPriority.NORMAL
        }
      }
    )
  }
  
  /**
   * Create session failed event
   */
  static sessionFailed(
    sessionId: string,
    error: Error | string,
    options?: {
      phase?: SessionPhase
      correlationId?: string
      metadata?: any
    }
  ): RealtimeEvent<any> {
    const errorMessage = typeof error === 'string' ? error : error.message
    const errorStack = typeof error === 'object' ? error.stack : undefined
    
    permanentLogger.captureError('INTELLIGENCE_EVENTS', error as Error, {
      sessionId,
      phase: options?.phase
    })
    
    return this.create(
      IntelligenceEventType.SESSION_FAILED as any,
      {
        sessionId,
        error: errorMessage,
        stack: errorStack,
        phase: options?.phase || 'error'
      },
      {
        source: EventSource.SYSTEM,
        correlationId: options?.correlationId || sessionId,
        sessionId,
        metadata: {
          ...options?.metadata,
          phase: options?.phase,
          priority: EventPriority.HIGH
        }
      }
    )
  }
  
  /**
   * Create generic intelligence event
   * Ensures lowercase enum values
   */
  static intelligence(
    type: string,
    data: any,
    options?: {
      source?: EventSource
      correlationId?: string
      sessionId?: string
      metadata?: any
    }
  ): RealtimeEvent<any> {
    // Validate any enum values in data
    if (data.category && typeof data.category === 'string') {
      if (data.category !== data.category.toLowerCase()) {
        permanentLogger.warn('INTELLIGENCE_EVENTS', 'Category not lowercase', {
          category: data.category
        })
        data.category = data.category.toLowerCase()
      }
    }
    
    if (data.depth && typeof data.depth === 'string') {
      if (data.depth !== data.depth.toLowerCase()) {
        permanentLogger.warn('INTELLIGENCE_EVENTS', 'Depth not lowercase', {
          depth: data.depth
        })
        data.depth = data.depth.toLowerCase()
      }
    }
    
    if (data.scraperType && typeof data.scraperType === 'string') {
      if (data.scraperType !== data.scraperType.toLowerCase()) {
        permanentLogger.warn('INTELLIGENCE_EVENTS', 'ScraperType not lowercase', {
          scraperType: data.scraperType
        })
        data.scraperType = data.scraperType.toLowerCase()
      }
    }
    
    if (data.phase && typeof data.phase === 'string') {
      if (data.phase !== data.phase.toLowerCase()) {
        permanentLogger.warn('INTELLIGENCE_EVENTS', 'Phase not lowercase', {
          phase: data.phase
        })
        data.phase = data.phase.toLowerCase()
      }
    }
    
    const fullType = type.startsWith('intelligence.') ? type : `intelligence.${type}`
    
    return this.create(
      fullType as any,
      data,
      options
    )
  }
}

// Re-export base EventFactory methods for convenience
export default IntelligenceEventFactory
