/**
 * Core scraper interface defining the contract all scrapers must implement
 *
 * @module scrapers-v2/core/scraper.interface
 * @description Enforces type-safe scraping operations with compile-time guarantees.
 * All scrapers in the progressive system must implement this interface to ensure
 * consistency and compatibility with the orchestration layer.
 *
 * KEY PRINCIPLES:
 * - Immutability: All properties are readonly
 * - Type Safety: Uses enums and branded types
 * - No Optional Properties: Everything is explicit
 * - Single Responsibility: Each method has one clear purpose
 *
 * COMPLIANCE:
 * - Repository pattern: Scrapers don't access database
 * - Unified events: Uses EventFactory for streaming
 * - No mock data: Real operations only
 */

import { ScraperType, DataLayer } from '@/lib/company-intelligence/types/scraping-enums'
import type { ScraperResult } from '@/lib/company-intelligence/types/scraping-interfaces'
import type { StreamWriter } from '@/lib/realtime-events'
import type { SessionId, Url } from './types'

/**
 * Core scraper interface
 * All scrapers MUST implement this contract
 * Uses readonly and const to prevent mutation
 */
export interface IScraper {
  /**
   * Scraper type from enum - compile-time enforced
   * Determines which scraping strategy is used
   */
  readonly scraperType: ScraperType

  /**
   * Data layer this scraper contributes to
   * Used for progressive data enhancement
   */
  readonly dataLayer: DataLayer

  /**
   * Cost per page in USD - immutable
   * Used for cost optimization and budget tracking
   */
  readonly costPerPage: number

  /**
   * Quality contribution range - deeply immutable
   * Defines minimum and maximum quality points this scraper can contribute
   */
  readonly qualityContribution: Readonly<{
    readonly min: number
    readonly max: number
  }>

  /**
   * Main scraping method
   * Executes scraping operation on provided URLs
   *
   * @param urls - Array of URLs to scrape (immutable)
   * @param sessionId - Branded session ID for type safety
   * @param streamWriter - Optional stream for real-time updates
   * @returns Promise of ScraperResult with full type safety
   *
   * @throws Error if scraping fails (no silent failures)
   *
   * CONTRACT:
   * - Must return ScraperResult format
   * - Must use streamWriter for progress updates if provided
   * - Must handle errors and include in result
   * - Must calculate quality contribution
   * - Must track discovered URLs
   */
  scrape(
    urls: readonly Url[],
    sessionId: SessionId,
    streamWriter?: StreamWriter
  ): Promise<ScraperResult>

  /**
   * Check if scraper can handle a URL
   * Used by orchestrator to select appropriate scraper
   *
   * @param url - URL to check
   * @returns Boolean indicating capability
   *
   * CONTRACT:
   * - Must return true only if scraper can successfully process URL
   * - Should check protocol, domain patterns, content type if known
   * - Must not make network requests (pure function)
   */
  canHandle(url: Url): boolean

  /**
   * Estimate scraping duration in milliseconds
   * Used for progress tracking and timeout configuration
   *
   * @param urlCount - Number of URLs to scrape
   * @returns Estimated duration in milliseconds
   *
   * CONTRACT:
   * - Should return realistic estimate based on scraper speed
   * - Must account for network latency and processing time
   * - Should be pessimistic (overestimate rather than underestimate)
   */
  estimateDuration(urlCount: number): number

  /**
   * Estimate scraping cost in USD
   * Used for budget checking and cost optimization
   *
   * @param urlCount - Number of URLs to scrape
   * @returns Estimated cost in USD
   *
   * CONTRACT:
   * - Must return accurate cost based on pricing model
   * - Should include all charges (API calls, processing, etc.)
   * - Must match actual charges when scraping completes
   */
  estimateCost(urlCount: number): number
}

/**
 * Type guard to check if an object implements IScraper
 * Used for runtime validation of scraper instances
 *
 * @param obj - Object to check
 * @returns True if object implements IScraper interface
 */
export const isScraper = (obj: unknown): obj is IScraper => {
  if (typeof obj !== 'object' || obj === null) {
    return false
  }

  const scraper = obj as any

  return (
    typeof scraper.scraperType === 'string' &&
    typeof scraper.dataLayer === 'string' &&
    typeof scraper.costPerPage === 'number' &&
    typeof scraper.qualityContribution === 'object' &&
    typeof scraper.qualityContribution.min === 'number' &&
    typeof scraper.qualityContribution.max === 'number' &&
    typeof scraper.scrape === 'function' &&
    typeof scraper.canHandle === 'function' &&
    typeof scraper.estimateDuration === 'function' &&
    typeof scraper.estimateCost === 'function'
  )
}

/**
 * Configuration options for scrapers
 * Can be extended by specific scraper implementations
 */
export interface ScraperConfig {
  /**
   * Maximum number of retries for failed requests
   */
  readonly maxRetries: number

  /**
   * Timeout in milliseconds for each request
   */
  readonly timeout: number

  /**
   * Delay between requests in milliseconds (rate limiting)
   */
  readonly requestDelay: number

  /**
   * User agent string for HTTP requests
   */
  readonly userAgent: string

  /**
   * Custom headers for HTTP requests
   */
  readonly headers?: Readonly<Record<string, string>>

  /**
   * Whether to follow redirects
   */
  readonly followRedirects: boolean

  /**
   * Maximum number of redirects to follow
   */
  readonly maxRedirects: number
}

/**
 * Default configuration for scrapers
 * Can be overridden by specific implementations
 */
export const DEFAULT_SCRAPER_CONFIG: Readonly<ScraperConfig> = {
  maxRetries: 3,
  timeout: 30000, // 30 seconds
  requestDelay: 1000, // 1 second between requests
  userAgent: 'Mozilla/5.0 (compatible; ProjectGenie/2.0; +https://project-genie.com)',
  followRedirects: true,
  maxRedirects: 5
} as const

/**
 * Scraper capability descriptor
 * Used to describe what a scraper can do
 */
export interface ScraperCapabilities {
  /**
   * Whether scraper can handle JavaScript-rendered content
   */
  readonly handlesJavaScript: boolean

  /**
   * Whether scraper can take screenshots
   */
  readonly canScreenshot: boolean

  /**
   * Whether scraper can interact with page (click, type, etc.)
   */
  readonly canInteract: boolean

  /**
   * Whether scraper can extract structured data
   */
  readonly canExtractSchema: boolean

  /**
   * Whether scraper supports parallel processing
   */
  readonly supportsParallel: boolean

  /**
   * Maximum URLs that can be processed in parallel
   */
  readonly maxParallel: number
}

/**
 * Scraper health status
 * Used for monitoring and circuit breaking
 */
export interface ScraperHealth {
  /**
   * Whether scraper is currently healthy
   */
  readonly isHealthy: boolean

  /**
   * Number of consecutive failures
   */
  readonly failureCount: number

  /**
   * Last successful scrape timestamp
   */
  readonly lastSuccess?: Date

  /**
   * Last failure timestamp
   */
  readonly lastFailure?: Date

  /**
   * Current error rate (0-1)
   */
  readonly errorRate: number

  /**
   * Average response time in ms
   */
  readonly avgResponseTime: number
}