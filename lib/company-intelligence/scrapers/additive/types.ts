/**
 * Additive Scraping Architecture Types
 * 
 * Core type definitions for the flexible, user-controlled scraping system.
 * Each scraper execution adds to the dataset, never replaces.
 * 
 * @module additive-scraping-types
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'

/**
 * Scraper executor interface - each scraper must implement this
 */
export interface ScraperExecutor {
  /** Unique identifier for this scraper */
  id: string
  
  /** Human-readable name */
  name: string
  
  /** Scraping strategy type */
  strategy: 'static' | 'dynamic' | 'spa' | 'api'
  
  /** Description of what this scraper does */
  description: string
  
  /** Estimated speed (fast/medium/slow) */
  speed: 'fast' | 'medium' | 'slow'
  
  /** Execute scraping on given URLs */
  scrape(urls: string[], options?: ScraperOptions): Promise<ScraperResult>
  
  /** Validate the scraper's own results */
  validate(result: ScraperResult): Promise<ValidationResult>
  
  /** Check if this scraper is suitable for given content */
  canHandle(url: string, existingData?: MergedPageData): boolean
  
  /** Estimate value this scraper would add */
  estimateValue(urls: string[], existingData?: Map<string, MergedPageData>): ValueEstimate
}

/**
 * URL metadata from database
 */
export interface URLMetadata {
  /** URL */
  url: string
  
  /** Priority level */
  priority?: 'high' | 'medium' | 'low'
  
  /** Last modified date */
  lastmod?: string
  
  /** Page type */
  pageType?: string
  
  /** Last time this URL was scraped */
  lastScraped?: number
  
  /** Any additional metadata */
  metadata?: Record<string, any>
}

/**
 * Options for scraper execution
 */
export interface ScraperOptions {
  /** Maximum pages to scrape */
  maxPages?: number
  
  /** Timeout per page in ms */
  timeout?: number
  
  /** Headers to include */
  headers?: Record<string, string>
  
  /** User agent string */
  userAgent?: string
  
  /** Wait for specific selectors (dynamic scrapers) */
  waitForSelectors?: string[]
  
  /** Extract specific data types */
  extractTypes?: DataExtractionType[]
  
  /** Session ID for tracking */
  sessionId?: string
  
  /** URL metadata from database for intelligent scraping */
  urlMetadata?: Map<string, URLMetadata>
}

/**
 * Types of data to extract
 */
export type DataExtractionType = 
  | 'text'
  | 'links'
  | 'images'
  | 'metadata'
  | 'structured_data'
  | 'forms'
  | 'api_hints'
  | 'technologies'
  | 'contact_info'
  | 'social_links'

/**
 * Result from a single scraper execution
 */
export interface ScraperResult {
  /** Which scraper produced this */
  scraperId: string
  
  /** Scraper name for display */
  scraperName: string
  
  /** Strategy used */
  strategy: string
  
  /** When this scrape happened */
  timestamp: number
  
  /** Pages scraped */
  pages: PageResult[]
  
  /** All discovered links */
  discoveredLinks: DiscoveredLink[]
  
  /** Execution statistics */
  stats: ScrapingStats
  
  /** Validation results */
  validation?: ValidationResult
  
  /** Any errors encountered */
  errors: ScrapingError[]
  
  /** Suggestions for next steps */
  suggestions?: ScrapingSuggestion[]
}

/**
 * Result for a single page
 */
export interface PageResult {
  /** Page URL */
  url: string
  
  /** Success status */
  success: boolean
  
  /** HTTP status code */
  statusCode?: number
  
  /** Page title */
  title?: string
  
  /** Page description */
  description?: string
  
  /** Raw HTML content */
  content?: string
  
  /** Extracted text content */
  textContent?: string
  
  /** Discovered links on this page */
  discoveredLinks?: string[]
  
  /** Structured data found */
  structuredData?: Record<string, any>
  
  /** Technologies detected */
  technologies?: string[]
  
  /** API endpoints found */
  apiEndpoints?: string[]
  
  /** Contact information found */
  contactInfo?: ContactInfo
  
  /** Social media links */
  socialLinks?: SocialLinks
  
  /** Forms found on page */
  forms?: FormData[]
  
  /** Images found */
  images?: ImageData[]
  
  /** Error if failed */
  error?: string
  
  /** Time taken to scrape in ms */
  duration?: number
  
  /** Bytes downloaded */
  bytesDownloaded?: number
}

/**
 * Discovered link with metadata
 */
export interface DiscoveredLink {
  /** The URL */
  url: string
  
  /** Where it was found */
  foundOn: string
  
  /** Link text if available */
  text?: string
  
  /** Type of link */
  type: 'internal' | 'external' | 'asset' | 'api' | 'social'
  
  /** Priority for scraping */
  priority?: 'high' | 'medium' | 'low'
  
  /** Already scraped? */
  scraped?: boolean
}

/**
 * Contact information extracted
 */
export interface ContactInfo {
  emails?: string[]
  phones?: string[]
  addresses?: string[]
  contactForms?: string[]
}

/**
 * Social media links
 */
export interface SocialLinks {
  twitter?: string
  linkedin?: string
  facebook?: string
  instagram?: string
  youtube?: string
  github?: string
  [key: string]: string | undefined
}

/**
 * Form data found on page
 */
export interface FormData {
  action?: string
  method?: string
  fields: Array<{
    name?: string
    type?: string
    required?: boolean
  }>
}

/**
 * Image data
 */
export interface ImageData {
  src: string
  alt?: string
  width?: number
  height?: number
}

/**
 * Scraping statistics
 */
export interface ScrapingStats {
  /** Total duration in ms */
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
 * Validation result
 */
export interface ValidationResult {
  /** Overall validation status */
  isValid: boolean
  
  /** Completeness score 0-100 */
  completeness: number
  
  /** Quality score 0-100 */
  quality: number
  
  /** Specific issues found */
  issues: ValidationIssue[]
  
  /** Suggestions for improvement */
  suggestions: string[]
}

/**
 * Validation issue
 */
export interface ValidationIssue {
  /** Issue severity */
  severity: 'error' | 'warning' | 'info'
  
  /** What field/aspect has issue */
  field: string
  
  /** Issue description */
  message: string
  
  /** Affected URLs */
  affectedUrls?: string[]
}

/**
 * Scraping error
 */
export interface ScrapingError {
  /** Error code */
  code: string
  
  /** Error message */
  message: string
  
  /** Which URL caused error */
  url?: string
  
  /** Stack trace if available */
  stack?: string
  
  /** When error occurred */
  timestamp: number
}

/**
 * Suggestion for next scraping step
 */
export interface ScrapingSuggestion {
  /** Suggested action */
  action: 'use_scraper' | 'explore_links' | 'extract_data' | 'complete'
  
  /** Which scraper to use (if applicable) */
  scraperId?: string
  
  /** Human-readable label */
  label: string
  
  /** Why this is suggested */
  reason: string
  
  /** Estimated time */
  estimatedTime?: string
  
  /** Estimated value */
  estimatedValue?: 'high' | 'medium' | 'low'
  
  /** Confidence in suggestion 0-100 */
  confidence: number
  
  /** URLs to target (if applicable) */
  targetUrls?: string[]
}

/**
 * Value estimate for a scraper
 */
export interface ValueEstimate {
  /** Expected new data points */
  expectedDataPoints: number
  
  /** Confidence 0-100 */
  confidence: number
  
  /** Specific value adds */
  valueAdds: string[]
  
  /** Estimated time */
  estimatedTime: string
}

/**
 * Merged page data from multiple scrapers
 */
export interface MergedPageData {
  /** Page URL */
  url: string
  
  /** Which scrapers have touched this page */
  scrapedBy: string[]
  
  /** When first scraped */
  firstScraped: number
  
  /** When last updated */
  lastUpdated: number
  
  /** Merged title (best available) */
  title?: string
  
  /** Merged description */
  description?: string
  
  /** Combined text content */
  textContent?: string
  
  /** All discovered links (deduplicated) */
  discoveredLinks: string[]
  
  /** Merged structured data */
  structuredData: Record<string, any>
  
  /** All detected technologies */
  technologies: string[]
  
  /** All found API endpoints */
  apiEndpoints: string[]
  
  /** Merged contact info */
  contactInfo: ContactInfo
  
  /** Merged social links */
  socialLinks: SocialLinks
  
  /** All forms found */
  forms: FormData[]
  
  /** All images found */
  images: ImageData[]
  
  /** Data quality score 0-100 */
  qualityScore: number
  
  /** Completeness score 0-100 */
  completenessScore: number
}

/**
 * Additive scraping session
 */
export interface AdditiveSession {
  /** Session ID */
  id: string
  
  /** When session started */
  startedAt: number
  
  /** Last activity */
  lastActivity: number
  
  /** Domain being scraped */
  domain: string
  
  /** Scraping history */
  history: ScraperResult[]
  
  /** Merged data */
  mergedData: Map<string, MergedPageData>
  
  /** Available scrapers */
  availableScrapers: ScraperExecutor[]
  
  /** Session status */
  status: 'active' | 'paused' | 'completed'
  
  /** Total stats across all scrapers */
  totalStats: ScrapingStats
  
  /** URLs discovered in previous phases (e.g., sitemap) */
  previouslyDiscoveredUrls?: Set<string>
}

/**
 * Logger utility for debugging
 */
export function logScraperExecution(
  scraperId: string,
  action: string,
  data?: any
): void {
  permanentLogger.info('ADDITIVE_SCRAPER', `[${scraperId}] ${action}`, {
    scraperId,
    action,
    timestamp: Date.now(),
    ...data
  })
}

/**
 * Logger for session events
 */
export function logSessionEvent(
  sessionId: string,
  event: string,
  data?: any
): void {
  permanentLogger.info('SCRAPING_SESSION', `[Session ${sessionId}] ${event}`, {
    sessionId,
    event,
    timestamp: Date.now(),
    ...data
  })
}