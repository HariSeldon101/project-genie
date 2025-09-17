/**
 * Core Scraper Types and Interfaces
 *
 * Central type definitions for the plugin-based scraper architecture.
 * All scrapers must implement these contracts to ensure consistency.
 *
 * Key Principles:
 * - Zod schemas for runtime validation (no mock data)
 * - Strict typing for all data structures
 * - No optional fields without explicit null unions
 * - Database-first design (URLs from DB, not UI)
 *
 * @module core/types
 */

import { z } from 'zod'
import type { Logger } from '@/lib/utils/permanent-logger.types'

/**
 * Scraper configuration schema with runtime validation
 * Every scraper plugin must provide this configuration
 */
export const ScraperConfigSchema = z.object({
  /** Unique identifier for the scraper */
  id: z.string().min(1),

  /** Human-readable name for UI display */
  name: z.string().min(1),

  /** Scraping strategy type */
  strategy: z.enum(['static', 'dynamic', 'spa', 'api', 'hybrid']),

  /** Priority for scraper selection (higher = preferred) */
  priority: z.number().int().min(0).max(100).default(0),

  /** Request timeout in milliseconds */
  timeout: z.number().int().min(1000).max(300000).default(30000),

  /** Maximum retry attempts for failed requests */
  maxRetries: z.number().int().min(0).max(10).default(3),

  /** Estimated speed of scraping */
  speed: z.enum(['fast', 'medium', 'slow']).default('medium'),

  /** Whether this scraper requires a browser */
  requiresBrowser: z.boolean().default(false),

  /** Supported URL patterns (regex strings) */
  supportedPatterns: z.array(z.string()).default([]),

  /** Unsupported URL patterns (regex strings) */
  excludedPatterns: z.array(z.string()).default([])
})

export type ScraperConfig = z.infer<typeof ScraperConfigSchema>

/**
 * Options passed to scraper execution
 * Extends base options from existing types
 */
export const ScraperOptionsSchema = z.object({
  /** Session ID from database */
  sessionId: z.string().uuid().optional(),

  /** Company ID from database (not domain!) */
  companyId: z.string().uuid().optional(),

  /** Custom headers for requests */
  headers: z.record(z.string()).optional(),

  /** Maximum pages to scrape */
  maxPages: z.number().int().min(1).max(1000).optional(),

  /** Whether to follow redirects */
  followRedirects: z.boolean().default(true),

  /** Whether to extract JavaScript */
  extractJs: z.boolean().default(false),

  /** Whether to take screenshots */
  screenshot: z.boolean().default(false),

  /** Custom user agent */
  userAgent: z.string().optional(),

  /** Abort signal for cancellation */
  signal: z.any().optional() // AbortSignal type
})

export type ScraperOptions = z.infer<typeof ScraperOptionsSchema>

/**
 * Progress reporter interface for streaming updates
 * Uses unified EventFactory for all events
 */
export interface ProgressReporter {
  /** Report progress update */
  report(data: {
    current: number
    total: number
    message: string
    scraperId?: string
    url?: string
    phase?: string
  }): Promise<void>

  /** Report completion */
  complete(summary: any): Promise<void>

  /** Report error (no silent failures!) */
  error(error: Error, context: any): Promise<void>

  /** Close the stream */
  close(): void
}

/**
 * Performance tracker for metrics collection
 */
export interface PerformanceTracker {
  /** Start timing an operation */
  startTimer(label: string, metadata?: any): TimerHandle

  /** Record a metric */
  recordMetric(name: string, value: number, unit?: string): void

  /** Get all metrics */
  getMetrics(): Record<string, any>
}

/**
 * Timer handle for performance tracking
 */
export interface TimerHandle {
  /** Stop timer and return duration */
  stop(): number

  /** Cancel timer without recording */
  cancel(): void

  /** Add checkpoint */
  checkpoint(name: string, metadata?: any): void
}

/**
 * Extractor pipeline interface
 * All scrapers use the same extraction pipeline
 */
export interface ExtractorPipeline {
  /** Extract data from HTML/DOM */
  extract(content: any, url: string): Promise<ExtractedData>

  /** Register a new extractor */
  register(extractor: Extractor): void

  /** Get registered extractors */
  getExtractors(): Extractor[]
}

/**
 * Validator pipeline interface
 */
export interface ValidatorPipeline {
  /** Validate extracted data */
  validate(data: any): Promise<any>

  /** Register a new validator */
  register(validator: Validator): void
}

/**
 * Base extractor interface
 */
export interface Extractor {
  /** Extractor name */
  name: string

  /** Priority (higher runs first) */
  priority: number

  /** Extract data from content */
  extract(content: any, url: string): Promise<Partial<ExtractedData>>
}

/**
 * Base validator interface
 */
export interface Validator {
  /** Validator name */
  name: string

  /** Validate data */
  validate(data: any): Promise<any>
}

/**
 * Shared context passed to all scrapers
 * Contains all dependencies and shared state
 */
export interface ScraperContext {
  /** Session ID for tracking */
  sessionId: string

  /** Company ID from database */
  companyId: string

  /** Correlation ID for event tracking */
  correlationId: string

  /** Logger instance (permanentLogger) */
  logger: Logger

  /** Progress reporter for SSE events */
  progressReporter: ProgressReporter

  /** Performance tracker for metrics */
  performanceTracker: PerformanceTracker

  /** Shared extractor pipeline */
  extractors: ExtractorPipeline

  /** Shared validator pipeline */
  validators: ValidatorPipeline

  /** Options passed to scraper */
  options: ScraperOptions
}

/**
 * Plugin interface - all scrapers implement this
 * This is the contract every plugin must fulfill
 */
export interface ScraperPlugin {
  /** Plugin configuration */
  readonly config: ScraperConfig

  /** Initialize plugin with context */
  initialize(context: ScraperContext): Promise<void>

  /** Execute scraping for given URLs */
  execute(urls: string[], options?: ScraperOptions): Promise<ScraperResult>

  /** Clean up resources */
  cleanup(): Promise<void>

  /** Check if plugin can handle URL */
  canHandle(url: string): boolean

  /** Estimate time for URL count */
  estimateTime(urlCount: number): number

  /** Get plugin status */
  getStatus(): PluginStatus
}

/**
 * Plugin status information
 */
export interface PluginStatus {
  /** Is plugin ready */
  ready: boolean

  /** Is plugin busy */
  busy: boolean

  /** Current operation */
  currentOperation?: string

  /** Error if any */
  error?: string
}

/**
 * Extracted data structure
 * Common data extracted by all scrapers
 */
export interface ExtractedData {
  /** Page title */
  title: string

  /** Meta description */
  description: string

  /** Main content */
  content: string

  /** Plain text content */
  textContent: string

  /** Discovered links */
  links: string[]

  /** Structured data (JSON-LD, etc) */
  structuredData: Record<string, any>

  /** Contact information */
  contactInfo: {
    emails: string[]
    phones: string[]
    addresses: string[]
  }

  /** Social media links */
  socialLinks: Record<string, string>

  /** Forms found on page */
  forms: FormData[]

  /** Images found on page */
  images: ImageData[]

  /** Technologies detected */
  technologies: string[]

  /** API endpoints found */
  apiEndpoints: string[]

  /** Custom metadata */
  metadata: Record<string, any>
}

/**
 * Form data structure
 */
export interface FormData {
  /** Form ID */
  id?: string

  /** Form name */
  name?: string

  /** Form action URL */
  action?: string

  /** Form method */
  method?: string

  /** Form fields */
  fields: Array<{
    name: string
    type: string
    required: boolean
  }>
}

/**
 * Image data structure
 */
export interface ImageData {
  /** Image URL */
  url: string

  /** Alt text */
  alt?: string

  /** Image title */
  title?: string

  /** Width in pixels */
  width?: number

  /** Height in pixels */
  height?: number
}

/**
 * Page result structure
 * Result for a single scraped page
 */
export interface PageResult {
  /** Page URL */
  url: string

  /** Success status */
  success: boolean

  /** HTTP status code */
  statusCode: number

  /** Extracted data */
  data?: ExtractedData

  /** Error if failed */
  error?: string

  /** Error details for debugging */
  errorDetails?: {
    message: string
    stack?: string
    code?: string
    phase?: string
  }

  /** Scraping duration in ms */
  duration: number

  /** Bytes downloaded */
  bytesDownloaded: number

  /** Timestamp */
  timestamp: number

  /** Scraper used */
  scraperId: string
}

/**
 * Scraping error structure
 */
export interface ScrapingError {
  /** URL that failed */
  url: string

  /** Error message */
  error: string

  /** Error code */
  code?: string

  /** Error timestamp */
  timestamp: number

  /** Retry count */
  retryCount?: number
}

/**
 * Scraping statistics
 */
export interface ScrapingStats {
  /** Total duration */
  duration: number

  /** Pages attempted */
  pagesAttempted: number

  /** Pages succeeded */
  pagesSucceeded: number

  /** Pages failed */
  pagesFailed: number

  /** Total bytes downloaded */
  bytesDownloaded: number

  /** Data points extracted */
  dataPointsExtracted: number

  /** Links discovered */
  linksDiscovered: number

  /** Average time per page */
  averageTimePerPage: number

  /** Success rate percentage */
  successRate: number
}

/**
 * Scraper result with strict typing
 * Final result returned by scraper
 */
export interface ScraperResult {
  /** Success status */
  success: boolean

  /** Scraper that executed */
  scraperId: string

  /** Scraper name */
  scraperName: string

  /** Strategy used */
  strategy: string

  /** Execution timestamp */
  timestamp: number

  /** Page results */
  pages: PageResult[]

  /** Errors encountered */
  errors: ScrapingError[]

  /** Statistics */
  stats: ScrapingStats

  /** All discovered links */
  discoveredLinks: string[]

  /** Additional metadata */
  metadata: Record<string, any>

  /** Suggestions for next steps */
  suggestions?: string[]
}

/**
 * Registry options for plugin management
 */
export interface RegistryOptions {
  /** Test mode flag for testing */
  testMode?: boolean
}