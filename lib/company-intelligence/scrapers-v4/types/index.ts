/**
 * @fileoverview Core type definitions for V4 streaming scrapers
 * @module scrapers-v4/types
 *
 * ARCHITECTURE: Provides strongly-typed interfaces for all scraper operations.
 * Uses enums for compile-time safety and better IntelliSense support.
 * No mock types - every interface represents real API data structures.
 *
 * IMPORTANT: These types enforce the NO MOCK DATA principle from CLAUDE.md
 * All progress events must come from actual API responses or browser events.
 */

import { z } from 'zod'
import type { Document as FirecrawlDocument } from 'firecrawl'

/**
 * Scraper types available in the system
 * @enum {string}
 * @description Each scraper has different capabilities and costs
 */
export enum ScraperType {
  /** Firecrawl API - Premium quality, ~$0.015/page, best anti-detection */
  FIRECRAWL = 'firecrawl',
  /** Playwright browser - Free, full JS support, slower */
  PLAYWRIGHT = 'playwright',
  /** Cheerio parser - Free, fast, no JS support */
  CHEERIO = 'cheerio'
}

/**
 * Scraping phase for progress tracking
 * @enum {string}
 * @description Represents the current stage of the scraping operation
 */
export enum ScrapingPhase {
  /** Discovering URLs on the domain */
  DISCOVERY = 'discovery',
  /** Setting up scraper resources */
  INITIALIZATION = 'initialization',
  /** Actively scraping pages */
  SCRAPING = 'scraping',
  /** Processing and structuring results */
  PROCESSING = 'processing',
  /** Successfully completed all operations */
  COMPLETE = 'complete',
  /** Failed with error */
  ERROR = 'error'
}

/**
 * Progress event types emitted during scraping
 * @enum {string}
 * @description Each type represents a REAL event from APIs or browsers
 */
export enum ProgressEventType {
  /** Found new URL during discovery phase */
  URL_DISCOVERED = 'url_discovered',
  /** Starting to scrape a specific URL */
  SCRAPE_STARTED = 'scrape_started',
  /** Completed scraping one page */
  PAGE_COMPLETE = 'page_complete',
  /** Browser network activity detected */
  NETWORK_ACTIVITY = 'network_activity',
  /** Error occurred during operation */
  ERROR_OCCURRED = 'error_occurred',
  /** Batch job progress update from API */
  BATCH_PROGRESS = 'batch_progress'
}

/**
 * Permanent logger categories for V4 scrapers
 * @enum {string}
 * @description Used for consistent logging across all v4 components
 * Following CLAUDE.md permanent logger guidelines
 */
export enum LogCategory {
  /** General v4 scraper operations */
  SCRAPER_V4 = 'SCRAPER_V4',
  /** Firecrawl-specific operations */
  FIRECRAWL_V4 = 'FIRECRAWL_V4',
  /** Playwright-specific operations */
  PLAYWRIGHT_V4 = 'PLAYWRIGHT_V4',
  /** Cheerio-specific operations */
  CHEERIO_V4 = 'CHEERIO_V4',
  /** SSE streaming operations */
  STREAM_V4 = 'STREAM_V4',
  /** API route operations */
  API_V4 = 'API_V4'
}

/**
 * Complete metrics for a scraping operation
 * @interface ScrapingMetrics
 * @description All metrics represent REAL data from actual scraping
 */
export interface ScrapingMetrics {
  /** Number of pages successfully scraped */
  pagesScraped: number
  /** Number of pages that failed to scrape */
  pagesFailed: number
  /** Total execution time in milliseconds */
  duration: number
  /** API credits consumed (Firecrawl) - REAL from API */
  creditsUsed: number
  /** Remaining credits in account - REAL from API headers */
  creditsRemaining?: number
  /** Token count for LLM operations - REAL from OpenAI */
  tokensUsed?: number
  /** Estimated cost in USD based on actual usage */
  costEstimate: number
  /** Network requests made (Playwright) - REAL from browser */
  networkRequests?: number
  /** Total data size in bytes */
  dataSize?: number
  /** Timestamp when scraping started */
  startedAt: number
  /** Timestamp when scraping completed */
  completedAt?: number
}

/**
 * Real-time progress update from scraper
 * @interface ProgressUpdate
 * @description MUST contain real data from actual API or browser events
 */
export interface ProgressUpdate {
  /** Type of progress event */
  type: ProgressEventType
  /** Current phase of operation */
  phase: ScrapingPhase
  /** Current item being processed (e.g., page 5) */
  current: number
  /** Total items to process (e.g., 20 pages) */
  total: number
  /** Progress percentage 0-100 */
  percentage: number
  /** Human-readable status message */
  message: string
  /** Additional context data from API/browser */
  metadata?: Record<string, any>
  /** Unix timestamp of the update */
  timestamp: number
  /** Source of the progress (which scraper) */
  source: ScraperType
}

/**
 * Complete result from a scraping operation
 * @interface ScrapingResult
 * @description Final output containing all scraped data and metrics
 */
export interface ScrapingResult {
  /** Whether scraping completed successfully */
  success: boolean
  /** Domain that was scraped */
  domain: string
  /** Which scraper was used */
  scraperType: ScraperType
  /** Extracted data keyed by URL */
  data: Map<string, FirecrawlDocument | any>
  /** Error information if failed */
  error?: {
    /** Error code for categorization */
    code: string
    /** Human-readable error message */
    message: string
    /** Additional error context */
    details?: any
    /** Stack trace (development only) */
    stack?: string
  }
  /** Complete metrics for the operation */
  metrics: ScrapingMetrics
  /** Non-fatal warnings encountered */
  warnings?: string[]
  /** Session ID if applicable */
  sessionId?: string
}

/**
 * Configuration for streaming scraper
 * @interface StreamingScraperConfig
 * @description Controls scraper behavior and limits
 */
export interface StreamingScraperConfig {
  /** Maximum number of pages to scrape */
  maxPages?: number
  /** Timeout per page in milliseconds */
  timeout?: number
  /** Poll interval for async operations (Firecrawl) */
  pollInterval?: number
  /** Zod schema for structured data extraction */
  extractSchema?: z.ZodSchema
  /** Only extract main content, skip navigation/ads */
  onlyMainContent?: boolean
  /** Custom HTTP headers for requests */
  headers?: Record<string, string>
  /** Output formats to generate */
  formats?: ('markdown' | 'html' | 'links' | 'screenshot' | 'extract')[]
  /** Enable stealth mode (Playwright) */
  stealth?: boolean
  /** Use proxy for requests (Firecrawl) */
  useProxy?: boolean
  /** Proxy country code (Firecrawl) */
  proxyCountry?: string
  /** Wait for specific selector (Playwright) */
  waitForSelector?: string
  /** Custom user agent string */
  userAgent?: string
  /** Viewport dimensions (Playwright) */
  viewport?: {
    width: number
    height: number
  }
}

/**
 * Firecrawl batch job status from checkBatchScrapeStatus
 * @interface FirecrawlBatchStatus
 * @description REAL structure from Firecrawl API v4.3.5
 */
export interface FirecrawlBatchStatus {
  /** Job completion status */
  status: 'scraping' | 'completed' | 'failed'
  /** Number of pages completed */
  completed?: number
  /** Total number of pages */
  total?: number
  /** Credits used so far */
  creditsUsed?: number
  /** Credits remaining in account */
  creditsRemaining?: number
  /** When the job expires */
  expiresAt?: string
  /** Scraped data (when complete) */
  data?: FirecrawlDocument[]
  /** Error message if failed */
  error?: string
  /** API success flag */
  success: boolean
}

/**
 * Playwright page event data
 * @interface PlaywrightPageEvent
 * @description REAL events from Playwright page.on() listeners
 */
export interface PlaywrightPageEvent {
  /** Event type from browser */
  type: 'request' | 'response' | 'load' | 'domcontentloaded' | 'error' | 'console'
  /** URL associated with event */
  url?: string
  /** HTTP method for requests */
  method?: string
  /** HTTP status for responses */
  status?: number
  /** Response size in bytes */
  size?: number
  /** Error message if applicable */
  error?: string
  /** Console message text */
  message?: string
  /** Timestamp of event */
  timestamp: number
}

/**
 * SSE event structure for streaming
 * @interface SSEEvent
 * @description Server-Sent Event format for real-time updates
 */
export interface SSEEvent {
  /** Unique event ID */
  id: string
  /** Event type */
  type: 'progress' | 'data' | 'error' | 'complete'
  /** Unix timestamp */
  timestamp: number
  /** Event payload */
  payload: any
  /** Event metadata */
  metadata?: Record<string, any>
}

/**
 * Database record for results storage
 * @interface ScrapingResultRecord
 * @description Schema for company_intelligence_results table
 */
export interface ScrapingResultRecord {
  /** UUID primary key */
  id: string
  /** User who initiated scraping */
  user_id: string
  /** Domain that was scraped */
  domain: string
  /** Type of scraper used */
  scraper_type: ScraperType
  /** Scraped data as JSONB */
  data: Record<string, any>
  /** Metrics as JSONB */
  metrics: Partial<ScrapingMetrics>
  /** Error information if failed */
  error?: {
    code: string
    message: string
    details?: any
  }
  /** Timestamp of creation */
  created_at: string
  /** Timestamp of last update */
  updated_at?: string
}

/**
 * Cost calculation utilities
 * @namespace CostCalculator
 */
export namespace CostCalculator {
  /** Firecrawl cost per credit in USD */
  export const FIRECRAWL_COST_PER_CREDIT = 0.015
  /** OpenAI GPT-4 cost per 1K tokens */
  export const GPT4_COST_PER_1K_TOKENS = 0.03
  /** Estimated tokens per page for extraction */
  export const TOKENS_PER_PAGE_ESTIMATE = 500

  /**
   * Calculate total cost for scraping operation
   * @param metrics - Scraping metrics
   * @returns Total cost in USD
   */
  export function calculateTotalCost(metrics: Partial<ScrapingMetrics>): number {
    let cost = 0

    // Firecrawl credits
    if (metrics.creditsUsed) {
      cost += metrics.creditsUsed * FIRECRAWL_COST_PER_CREDIT
    }

    // OpenAI tokens
    if (metrics.tokensUsed) {
      cost += (metrics.tokensUsed / 1000) * GPT4_COST_PER_1K_TOKENS
    }

    return Math.round(cost * 100) / 100 // Round to cents
  }
}

/**
 * Type guards for runtime type checking
 * @namespace TypeGuards
 */
export namespace TypeGuards {
  /**
   * Check if an object is a valid ProgressUpdate
   */
  export function isProgressUpdate(obj: any): obj is ProgressUpdate {
    return (
      obj &&
      typeof obj === 'object' &&
      Object.values(ProgressEventType).includes(obj.type) &&
      Object.values(ScrapingPhase).includes(obj.phase) &&
      typeof obj.current === 'number' &&
      typeof obj.total === 'number'
    )
  }

  /**
   * Check if an object is a valid ScrapingResult
   */
  export function isScrapingResult(obj: any): obj is ScrapingResult {
    return (
      obj &&
      typeof obj === 'object' &&
      typeof obj.success === 'boolean' &&
      typeof obj.domain === 'string' &&
      Object.values(ScraperType).includes(obj.scraperType) &&
      obj.data instanceof Map &&
      obj.metrics &&
      typeof obj.metrics === 'object'
    )
  }

  /**
   * Check if an object is a Firecrawl error response
   */
  export function isFirecrawlError(obj: any): boolean {
    return (
      obj &&
      typeof obj === 'object' &&
      obj.success === false &&
      typeof obj.error === 'string'
    )
  }
}

/**
 * Constants for V4 architecture
 * @namespace Constants
 */
export namespace Constants {
  /** Maximum pages to scrape in one operation */
  export const MAX_PAGES_LIMIT = 500
  /** Default timeout per page in ms */
  export const DEFAULT_PAGE_TIMEOUT = 30000
  /** Default polling interval for Firecrawl in ms */
  export const DEFAULT_POLL_INTERVAL = 2000
  /** Maximum retries for failed pages */
  export const MAX_RETRIES = 3
  /** SSE heartbeat interval in ms */
  export const SSE_HEARTBEAT_INTERVAL = 15000
}

// Re-export Firecrawl types that we use
export type { FirecrawlDocument } from 'firecrawl'