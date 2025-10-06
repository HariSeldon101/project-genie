// lib/company-intelligence/scrapers/types.ts
/**
 * Scraper Type Definitions
 * CLAUDE.md Compliant - All types for scraper implementations
 */

import {
  IntelligenceCategory,
  IntelligenceDepth,
  ScraperType
} from '../types/intelligence-enums'

/**
 * Base configuration for all scrapers
 */
export interface StreamingScraperConfig {
  /** Target domain to scrape */
  domain: string
  
  /** Maximum number of pages to scrape */
  maxPages: number
  
  /** Scraping depth level */
  depth: IntelligenceDepth
  
  /** Categories to extract */
  categories: IntelligenceCategory[]
  
  /** Request timeout in milliseconds */
  timeout?: number
  
  /** Rate limiting configuration */
  rateLimit?: {
    requests: number
    period: number
  }
  
  /** Custom headers for requests */
  headers?: Record<string, string>
  
  /** Cookies for authentication */
  cookies?: Record<string, string>
  
  /** Custom extraction schema */
  extractSchema?: Record<string, any>
  
  /** Progress callback function */
  onProgress?: (progress: ScrapingProgress) => void
}

/**
 * Firecrawl-specific configuration
 */
export interface FirecrawlConfig extends StreamingScraperConfig {
  /** Firecrawl API key */
  apiKey: string
  
  /** Output formats to request */
  formats?: ('markdown' | 'html' | 'extract' | 'links')[]
  
  /** Extract only main content */
  onlyMainContent?: boolean
  
  /** Use proxy for requests */
  useProxy?: boolean
  
  /** Wait for specific elements */
  waitFor?: number
  
  /** Custom extraction rules */
  extractionRules?: {
    selector?: string
    attribute?: string
    transform?: string
  }[]
}

/**
 * Playwright-specific configuration
 */
export interface PlaywrightConfig extends StreamingScraperConfig {
  /** Run browser in headless mode */
  headless: boolean
  
  /** Browser viewport dimensions */
  viewport: {
    width: number
    height: number
  }
  
  /** Custom user agent string */
  userAgent?: string
  
  /** Wait for specific selector before scraping */
  waitForSelector?: string
  
  /** Scroll to bottom of page */
  scrollToBottom?: boolean
  
  /** Take screenshot of pages */
  screenshot?: boolean
  
  /** Browser launch arguments */
  browserArgs?: string[]
  
  /** Proxy configuration */
  proxy?: {
    server: string
    username?: string
    password?: string
  }
}

/**
 * Cheerio-specific configuration
 */
export interface CheerioConfig extends StreamingScraperConfig {
  /** Follow redirects */
  followRedirects?: boolean
  
  /** Maximum redirect count */
  maxRedirects?: number
  
  /** Decompress response */
  decompress?: boolean
}

/**
 * Scraping progress information
 */
export interface ScrapingProgress {
  /** Current page number */
  current: number
  
  /** Total pages to scrape */
  total: number
  
  /** Progress percentage */
  percentage: number
  
  /** Current status message */
  message: string
  
  /** Current URL being processed */
  currentUrl?: string
  
  /** Pages successfully scraped */
  succeeded: number
  
  /** Pages that failed */
  failed: number
  
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining?: number
}

/**
 * Scraping result for a single page
 */
export interface ScrapingResult {
  /** Page URL */
  url: string
  
  /** Page title */
  title?: string
  
  /** Raw HTML content */
  html?: string
  
  /** Markdown formatted content */
  markdown?: string
  
  /** Plain text content */
  text?: string
  
  /** Structured data extraction */
  structured?: Record<string, any>
  
  /** Page metadata */
  metadata?: {
    description?: string
    keywords?: string
    author?: string
    publishedDate?: string
    modifiedDate?: string
    openGraph?: Record<string, string>
    twitter?: Record<string, string>
  }
  
  /** Links found on page */
  links?: {
    internal: string[]
    external: string[]
    images: string[]
    scripts: string[]
    stylesheets: string[]
  }
  
  /** Page metrics */
  metrics?: {
    loadTime?: number
    htmlSize?: number
    textLength?: number
    wordCount?: number
    imageCount?: number
    linkCount?: number
  }
  
  /** Scraping timestamp */
  scrapedAt: Date
  
  /** Any errors encountered */
  error?: string
}

/**
 * Batch scraping job status
 */
export interface BatchJobStatus {
  /** Job ID */
  id: string
  
  /** Current status */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  
  /** Pages completed */
  completed: number
  
  /** Total pages */
  total: number
  
  /** Credits used */
  creditsUsed?: number
  
  /** Error message if failed */
  error?: string
  
  /** Job creation time */
  createdAt: Date
  
  /** Job completion time */
  completedAt?: Date
}

/**
 * Scraper factory type
 */
export type ScraperFactory = (
  config: StreamingScraperConfig,
  sessionId: string,
  correlationId: string
) => Scraper

/**
 * Base scraper interface
 */
export interface Scraper {
  /** Execute scraping operation */
  execute(): Promise<Map<string, ScrapingResult>>
  
  /** Abort scraping operation */
  abort(): void
  
  /** Get current status */
  getStatus?(): BatchJobStatus
}

/**
 * Intelligence extraction result
 */
export interface ExtractionResult {
  /** Detected category */
  category: IntelligenceCategory
  
  /** Extracted content */
  content: any
  
  /** Confidence score (0-1) */
  confidence: number
  
  /** Source URL */
  sourceUrl: string
  
  /** Extraction method used */
  method: 'pattern' | 'ml' | 'rules' | 'manual'
  
  /** Extraction timestamp */
  extractedAt: Date
}

/**
 * Page classification result
 */
export interface PageClassification {
  /** Page type */
  pageType: 
    | 'homepage'
    | 'about'
    | 'product'
    | 'pricing'
    | 'blog'
    | 'contact'
    | 'careers'
    | 'support'
    | 'legal'
    | 'other'
  
  /** Confidence score */
  confidence: number
  
  /** Detected topics */
  topics: string[]
  
  /** Relevant categories for extraction */
  categories: IntelligenceCategory[]
}

/**
 * URL discovery options
 */
export interface DiscoveryOptions {
  /** Starting URLs */
  seedUrls: string[]
  
  /** Maximum depth to crawl */
  maxDepth: number
  
  /** URL patterns to include */
  includePatterns?: RegExp[]
  
  /** URL patterns to exclude */
  excludePatterns?: RegExp[]
  
  /** Follow external links */
  followExternal?: boolean
  
  /** Respect robots.txt */
  respectRobotsTxt?: boolean
  
  /** Sitemap URLs to check */
  sitemapUrls?: string[]
}

/**
 * Rate limiting state
 */
export interface RateLimiter {
  /** Check if request can be made */
  canMakeRequest(): boolean
  
  /** Wait for next available slot */
  waitForSlot(): Promise<void>
  
  /** Record a request */
  recordRequest(): void
  
  /** Get current rate */
  getCurrentRate(): number
  
  /** Reset rate limiter */
  reset(): void
}

/**
 * Scraper error types
 */
export enum ScraperErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',
  INVALID_CONFIG = 'INVALID_CONFIG',
  BROWSER_ERROR = 'BROWSER_ERROR',
  API_ERROR = 'API_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Scraper error with additional context
 */
export class ScraperError extends Error {
  constructor(
    public type: ScraperErrorType,
    message: string,
    public context?: Record<string, any>
  ) {
    super(message)
    this.name = 'ScraperError'
  }
}
