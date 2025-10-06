// lib/realtime-events/core/intelligence-event-types.ts
/**
 * Intelligence-specific event types and data structures
 * Extends the base event system with intelligence scraping events
 * Uses lowercase enum values for database compatibility
 */

import type { RealtimeEvent, EventMetadata } from './event-types'
import type { 
  IntelligenceCategory,
  IntelligenceDepth,
  ScraperType,
  SessionPhase,
  ExtractionStatus
} from '@/lib/company-intelligence/types'

/**
 * Intelligence-specific event types
 * Following the hierarchical naming convention
 */
export enum IntelligenceEventType {
  // Session lifecycle events
  SESSION_CREATED = 'intelligence.session.created',
  SESSION_STARTED = 'intelligence.session.started',
  SESSION_COMPLETED = 'intelligence.session.completed',
  SESSION_FAILED = 'intelligence.session.failed',
  SESSION_CANCELLED = 'intelligence.session.cancelled',
  
  // Phase transition events (using lowercase phases)
  PHASE_DISCOVERY = 'intelligence.phase.discovery',
  PHASE_INITIALIZATION = 'intelligence.phase.initialization',
  PHASE_SCRAPING = 'intelligence.phase.scraping',
  PHASE_PROCESSING = 'intelligence.phase.processing',
  PHASE_COMPLETE = 'intelligence.phase.complete',
  PHASE_ERROR = 'intelligence.phase.error',
  
  // Category extraction events (using lowercase categories)
  CATEGORY_EXTRACTED = 'intelligence.category.extracted',
  CATEGORY_PROCESSING = 'intelligence.category.processing',
  CATEGORY_FAILED = 'intelligence.category.failed',
  
  // Page processing events
  PAGE_DISCOVERED = 'intelligence.page.discovered',
  PAGE_SCRAPED = 'intelligence.page.scraped',
  PAGE_PROCESSED = 'intelligence.page.processed',
  PAGE_FAILED = 'intelligence.page.failed',
  
  // Intelligence item events
  ITEM_EXTRACTED = 'intelligence.item.extracted',
  ITEM_VALIDATED = 'intelligence.item.validated',
  ITEM_STORED = 'intelligence.item.stored',
  
  // Credit events
  CREDITS_ESTIMATED = 'intelligence.credits.estimated',
  CREDITS_DEDUCTED = 'intelligence.credits.deducted',
  CREDITS_INSUFFICIENT = 'intelligence.credits.insufficient',
  
  // Scraper-specific events
  SCRAPER_INITIALIZED = 'intelligence.scraper.initialized',
  SCRAPER_RATE_LIMITED = 'intelligence.scraper.rate_limited',
  SCRAPER_RETRYING = 'intelligence.scraper.retrying'
}

/**
 * Session creation event data
 * All enum values will be lowercase strings
 */
export interface SessionCreatedData {
  sessionId: string
  companyId: string
  domain: string
  depth: IntelligenceDepth // Will be 'quick', 'standard', 'deep', 'competitive'
  scraperType: ScraperType // Will be 'firecrawl', 'playwright'
  categories: IntelligenceCategory[] // Array of lowercase category strings
  estimatedCredits: number
  maxPages: number
  userId: string
  createdAt: string
}

/**
 * Phase change event data
 * Phase values are lowercase
 */
export interface PhaseChangeData {
  sessionId: string
  previousPhase?: SessionPhase
  currentPhase: SessionPhase // Will be 'discovery', 'initialization', etc.
  message?: string
  progress?: number
  metadata?: Record<string, any>
}

/**
 * Category extraction event data
 * Categories are lowercase
 */
export interface CategoryExtractedData {
  sessionId: string
  category: IntelligenceCategory // Will be 'corporate', 'products', etc.
  url: string
  itemsCount: number
  confidenceScore: number
  extractionTime: number
  extractionStatus: ExtractionStatus // Will be 'pending', 'completed', etc.
}

/**
 * Page processing event data
 */
export interface PageProcessedData {
  sessionId: string
  url: string
  pageNumber: number
  totalPages?: number
  categories: IntelligenceCategory[] // Detected categories (lowercase)
  itemsExtracted: number
  processingTime: number
  bytesProcessed?: number
}

/**
 * Intelligence item event data
 */
export interface IntelligenceItemData {
  sessionId: string
  itemId: string
  category: IntelligenceCategory // Lowercase category
  url: string
  title: string
  description?: string
  confidenceScore: number
  extractedData: Record<string, any>
  extractionStatus: ExtractionStatus // Lowercase status
}

/**
 * Credit event data
 */
export interface CreditEventData {
  sessionId: string
  userId: string
  credits: number
  action: 'estimated' | 'deducted' | 'refunded'
  balance?: number
  depth: IntelligenceDepth // Lowercase depth value
  categories: IntelligenceCategory[] // Lowercase categories
}

/**
 * Scraper event data
 */
export interface ScraperEventData {
  sessionId: string
  scraperType: ScraperType // 'firecrawl' or 'playwright'
  status: string
  message?: string
  retryCount?: number
  retryAfter?: number
  error?: string
}

/**
 * Complete intelligence session event data
 */
export interface SessionCompleteData {
  sessionId: string
  totalPages: number
  totalItems: number
  creditsUsed: number
  duration: number
  categories: IntelligenceCategory[] // Categories found (lowercase)
  depth: IntelligenceDepth // Depth used (lowercase)
  scraperType: ScraperType // Scraper used (lowercase)
  phase: SessionPhase // Final phase (should be 'complete')
}

/**
 * Type guards for intelligence events
 */
export const isIntelligenceEvent = (event: RealtimeEvent): boolean => {
  return typeof event.type === 'string' && event.type.startsWith('intelligence.')
}

export const isSessionEvent = (event: RealtimeEvent): event is RealtimeEvent<SessionCreatedData | SessionCompleteData> => {
  return typeof event.type === 'string' && event.type.startsWith('intelligence.session.')
}

export const isPhaseChangeEvent = (event: RealtimeEvent): event is RealtimeEvent<PhaseChangeData> => {
  return typeof event.type === 'string' && event.type.startsWith('intelligence.phase.')
}

export const isCategoryEvent = (event: RealtimeEvent): event is RealtimeEvent<CategoryExtractedData> => {
  return typeof event.type === 'string' && event.type.startsWith('intelligence.category.')
}

export const isPageEvent = (event: RealtimeEvent): event is RealtimeEvent<PageProcessedData> => {
  return typeof event.type === 'string' && event.type.startsWith('intelligence.page.')
}

export const isCreditEvent = (event: RealtimeEvent): event is RealtimeEvent<CreditEventData> => {
  return typeof event.type === 'string' && event.type.startsWith('intelligence.credits.')
}

/**
 * Helper to determine if an event should show in the UI
 */
export const shouldShowIntelligenceToast = (event: RealtimeEvent): boolean => {
  const type = event.type as IntelligenceEventType
  
  return type === IntelligenceEventType.SESSION_COMPLETED ||
         type === IntelligenceEventType.SESSION_FAILED ||
         type === IntelligenceEventType.CREDITS_INSUFFICIENT ||
         type === IntelligenceEventType.PHASE_ERROR
}

/**
 * Get display message for intelligence events
 */
export const getIntelligenceEventMessage = (event: RealtimeEvent): string => {
  const type = event.type as IntelligenceEventType
  
  switch (type) {
    case IntelligenceEventType.SESSION_CREATED:
      return 'Intelligence scraping session created'
    
    case IntelligenceEventType.SESSION_COMPLETED:
      const completeData = event.data as SessionCompleteData
      return `Scraping completed: ${completeData.totalItems} items found across ${completeData.totalPages} pages`
    
    case IntelligenceEventType.SESSION_FAILED:
      return 'Scraping session failed'
    
    case IntelligenceEventType.PHASE_DISCOVERY:
      return 'Discovering pages to scrape...'
    
    case IntelligenceEventType.PHASE_SCRAPING:
      return 'Scraping content from pages...'
    
    case IntelligenceEventType.PHASE_PROCESSING:
      return 'Processing extracted intelligence...'
    
    case IntelligenceEventType.CATEGORY_EXTRACTED:
      const catData = event.data as CategoryExtractedData
      return `Extracted ${catData.itemsCount} items for ${catData.category}`
    
    case IntelligenceEventType.PAGE_SCRAPED:
      const pageData = event.data as PageProcessedData
      return `Scraped page ${pageData.pageNumber}${pageData.totalPages ? ` of ${pageData.totalPages}` : ''}`
    
    case IntelligenceEventType.CREDITS_INSUFFICIENT:
      const creditData = event.data as CreditEventData
      return `Insufficient credits. Need ${creditData.credits} credits.`
    
    case IntelligenceEventType.SCRAPER_RATE_LIMITED:
      const scraperData = event.data as ScraperEventData
      return `Rate limited. Retrying in ${scraperData.retryAfter}ms...`
    
    default:
      return 'Processing intelligence data...'
  }
}

/**
 * Export all intelligence event types and helpers
 */
export default {
  IntelligenceEventType,
  isIntelligenceEvent,
  isSessionEvent,
  isPhaseChangeEvent,
  isCategoryEvent,
  isPageEvent,
  isCreditEvent,
  shouldShowIntelligenceToast,
  getIntelligenceEventMessage
}
