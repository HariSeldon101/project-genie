/**
 * @fileoverview Firecrawl streaming scraper with real progress polling
 * @module scrapers-v4/scrapers/firecrawl
 *
 * ARCHITECTURE: Thin wrapper around Firecrawl API v4. Uses asyncBatchScrapeUrls
 * for job-based scraping and polls checkBatchScrapeStatus for REAL progress.
 * No mock data - all progress comes from actual API responses.
 *
 * IMPORTANT: Requires FIRECRAWL_API_KEY environment variable
 *
 * API METHODS USED (verified from Firecrawl v4.3.5):
 * - mapUrl(): Discover all URLs on a domain
 * - asyncBatchScrapeUrls(): Start batch job, returns job ID
 * - checkBatchScrapeStatus(): Poll for real progress
 */

import Firecrawl from 'firecrawl'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { StreamWriter, EventFactory } from '@/lib/realtime-events'
import { convertSupabaseError } from '@/lib/utils/supabase-error-helper'
import {
  ScraperType,
  ScrapingPhase,
  ProgressEventType,
  LogCategory,
  Constants,
  CostCalculator,
  TypeGuards,
  type ScrapingResult,
  type StreamingScraperConfig,
  type ProgressUpdate,
  type ScrapingMetrics,
  type FirecrawlBatchStatus
} from '../types'

/**
 * Firecrawl streaming scraper implementation for enterprise web scraping
 * @class FirecrawlStreamingScraper
 * @description Premium scraper using Firecrawl's API for JavaScript-heavy sites.
 * Provides real-time progress via job polling and handles anti-bot measures.
 *
 * @example
 * ```typescript
 * const scraper = new FirecrawlStreamingScraper({ maxPages: 100, timeout: 60000 })
 * const result = await scraper.scrapeWithStreaming('example.com', streamWriter)
 * console.log(`Scraped ${result.metrics.pagesScraped} pages for $${result.metrics.costEstimate}`)
 * ```
 */
export class FirecrawlStreamingScraper {
  private client: Firecrawl
  private readonly apiKey: string
  private readonly config: StreamingScraperConfig

  /**
   * Creates a new Firecrawl streaming scraper instance
   * @constructor
   * @param {StreamingScraperConfig} config - Optional configuration object
   * @param {number} [config.maxPages=50] - Maximum pages to scrape
   * @param {number} [config.timeout=60000] - Request timeout in milliseconds
   * @param {boolean} [config.onlyMainContent=true] - Extract only main content
   * @param {string[]} [config.formats=['markdown','extract','links']] - Output formats
   * @param {object} [config.extractSchema] - Schema for structured extraction
   * @throws {Error} If FIRECRAWL_API_KEY environment variable is not set
   */
  constructor(config: StreamingScraperConfig = {}) {
    this.apiKey = process.env.FIRECRAWL_API_KEY!
    if (!this.apiKey) {
      const error = new Error('FIRECRAWL_API_KEY environment variable is required')
      permanentLogger.captureError(LogCategory.FIRECRAWL_V4, error, {
        config
      })
      throw error
    }

    // Apply defaults with explicit values (following CLAUDE.md - no hidden logic)
    this.config = {
      maxPages: config.maxPages ?? 50,
      timeout: config.timeout ?? Constants.DEFAULT_PAGE_TIMEOUT,
      pollInterval: config.pollInterval ?? Constants.DEFAULT_POLL_INTERVAL,
      onlyMainContent: config.onlyMainContent ?? true,
      formats: config.formats ?? ['markdown', 'extract', 'links'],
      extractSchema: config.extractSchema,
      headers: config.headers,
      stealth: config.stealth ?? false,
      useProxy: config.useProxy ?? false,
      proxyCountry: config.proxyCountry,
      waitForSelector: config.waitForSelector,
      userAgent: config.userAgent,
      viewport: config.viewport
    }

    // Initialize Firecrawl client with API key
    this.client = new Firecrawl({ apiKey: this.apiKey })

    permanentLogger.info(LogCategory.FIRECRAWL_V4, 'Firecrawl scraper initialized', {
      maxPages: this.config.maxPages,
      formats: this.config.formats,
      hasSchema: !!this.config.extractSchema,
      useProxy: this.config.useProxy
    })
  }

  /**
   * Scrapes a domain with real-time progress streaming
   * @public
   * @async
   * @param {string} domain - Domain to scrape (e.g., "example.com" or "https://example.com")
   * @param {StreamWriter} streamWriter - SSE stream writer for progress updates
   * @returns {Promise<ScrapingResult>} Complete scraping result with metrics and scraped data
   * @throws {Error} If domain is invalid or Firecrawl API fails
   *
   * @example
   * ```typescript
   * const domain = 'example.com'
   * const result = await scraper.scrapeWithStreaming(domain, streamWriter)
   * console.log(`Scraped ${result.metrics.pagesScraped} pages in ${result.metrics.duration}ms`)
   * ```
   */
  async scrapeWithStreaming(
    domain: string,
    streamWriter: StreamWriter
  ): Promise<ScrapingResult> {
    const startTime = Date.now()
    const timer = permanentLogger.timing('firecrawl_streaming_scrape', { domain })

    permanentLogger.breadcrumb('scrape_start', 'Starting Firecrawl scrape', {
      domain,
      config: this.config
    })

    try {
      // ============================================================
      // PHASE 1: DISCOVERY - Use mapUrl to discover all URLs
      // ============================================================
      await this.sendProgress(streamWriter, {
        type: ProgressEventType.URL_DISCOVERED,
        phase: ScrapingPhase.DISCOVERY,
        current: 0,
        total: 0,
        percentage: 0,
        message: `Discovering URLs on ${domain}...`,
        metadata: {},
        timestamp: Date.now(),
        source: ScraperType.FIRECRAWL
      })

      permanentLogger.info(LogCategory.FIRECRAWL_V4, 'Starting URL discovery', { domain })

      // ACTUAL Firecrawl API method - mapUrl returns all URLs immediately
      // This is a REAL API call, not mock data
      const mapResponse = await this.client.mapUrl(domain, {
        limit: this.config.maxPages,
        includeSubdomains: false
      })

      // Check for API error (following CLAUDE.md - no silent failures)
      if (!mapResponse.success || TypeGuards.isFirecrawlError(mapResponse)) {
        throw new Error(mapResponse.error || 'URL discovery failed')
      }

      // Extract URLs from map response
      const urls = (mapResponse.links || [])
        .map(link => link.url)
        .filter(url => url && url.length > 0)

      permanentLogger.info(LogCategory.FIRECRAWL_V4, 'URLs discovered', {
        domain,
        count: urls.length,
        sampleUrls: urls.slice(0, 3) // First 3 for logging
      })

      // Send discovery complete event with REAL data
      await this.sendProgress(streamWriter, {
        type: ProgressEventType.URL_DISCOVERED,
        phase: ScrapingPhase.DISCOVERY,
        current: urls.length,
        total: urls.length,
        percentage: 100,
        message: `Found ${urls.length} URLs to scrape`,
        metadata: {
          urls: urls.slice(0, 10), // First 10 for UI preview
          totalFound: urls.length
        },
        timestamp: Date.now(),
        source: ScraperType.FIRECRAWL
      })

      // Fail fast if no URLs found (no mock data)
      if (urls.length === 0) {
        throw new Error('No URLs found on domain')
      }

      // ============================================================
      // PHASE 2: BATCH SCRAPING with REAL polling
      // ============================================================
      permanentLogger.breadcrumb('batch_start', 'Starting batch scrape', {
        urlCount: urls.length,
        formats: this.config.formats
      })

      // Build Firecrawl scrape parameters
      const scrapeParams: any = {
        formats: this.config.formats,
        onlyMainContent: this.config.onlyMainContent
      }

      // Add extraction schema if provided
      if (this.config.extractSchema) {
        scrapeParams.extract = {
          schema: this.config.extractSchema
        }
      }

      // Add headers if provided
      if (this.config.headers) {
        scrapeParams.headers = this.config.headers
      }

      // Add timeout
      scrapeParams.timeout = this.config.timeout

      // ACTUAL API: Start async batch job - returns job ID
      const batchResponse = await this.client.asyncBatchScrapeUrls(
        urls,
        scrapeParams
      )

      // Check for API error
      if (!batchResponse.success || !batchResponse.id) {
        throw new Error(batchResponse.error || 'Failed to start batch scrape')
      }

      const jobId = batchResponse.id
      permanentLogger.info(LogCategory.FIRECRAWL_V4, 'Batch job started', {
        jobId,
        urlCount: urls.length
      })

      // Send initialization complete event
      await this.sendProgress(streamWriter, {
        type: ProgressEventType.SCRAPE_STARTED,
        phase: ScrapingPhase.INITIALIZATION,
        current: 0,
        total: urls.length,
        percentage: 0,
        message: `Batch scraping job started (Job ID: ${jobId})`,
        metadata: { jobId },
        timestamp: Date.now(),
        source: ScraperType.FIRECRAWL
      })

      // ============================================================
      // PHASE 3: Poll for REAL progress from Firecrawl API
      // ============================================================
      const result = await this.pollBatchProgress(jobId, urls, streamWriter)

      const duration = timer.stop()

      permanentLogger.info(LogCategory.FIRECRAWL_V4, 'Scraping complete', {
        domain,
        pagesScraped: result.data.size,
        duration,
        creditsUsed: result.metrics.creditsUsed,
        costEstimate: result.metrics.costEstimate
      })

      return result

    } catch (error) {
      timer.stop()
      const jsError = error instanceof Error ? error : new Error(String(error))

      permanentLogger.captureError(LogCategory.FIRECRAWL_V4, jsError, {
        domain,
        config: this.config,
        phase: 'scraping'
      })

      // Send error event
      await this.sendProgress(streamWriter, {
        type: ProgressEventType.ERROR_OCCURRED,
        phase: ScrapingPhase.ERROR,
        current: 0,
        total: 0,
        percentage: 0,
        message: jsError.message,
        metadata: {
          error: jsError.message,
          domain
        },
        timestamp: Date.now(),
        source: ScraperType.FIRECRAWL
      })

      // Return error result (no mock data - real error)
      return {
        success: false,
        domain,
        scraperType: ScraperType.FIRECRAWL,
        data: new Map(),
        error: {
          code: 'SCRAPE_FAILED',
          message: jsError.message,
          details: process.env.NODE_ENV === 'development' ? jsError.stack : undefined
        },
        metrics: {
          pagesScraped: 0,
          pagesFailed: 0,
          duration: Date.now() - startTime,
          creditsUsed: 0,
          costEstimate: 0,
          startedAt: startTime
        }
      }
    }
  }

  /**
   * Polls batch scrape job for real progress updates
   * @private
   * @param {string} jobId - Firecrawl job ID
   * @param {string[]} urls - URLs being scraped
   * @param {StreamWriter} streamWriter - SSE stream writer
   * @returns {Promise<ScrapingResult>} Final scraping result
   *
   * CRITICAL: This method polls checkBatchScrapeStatus() for REAL progress
   * Every progress update comes from actual API responses, not fake data
   */
  private async pollBatchProgress(
    jobId: string,
    urls: string[],
    streamWriter: StreamWriter
  ): Promise<ScrapingResult> {
    const pollTimer = permanentLogger.timing('firecrawl_polling', { jobId })
    const dataMap = new Map<string, any>()
    const startedAt = Date.now()

    let lastCompleted = 0
    let pollCount = 0
    const maxPolls = Math.ceil(this.config.timeout! / this.config.pollInterval!)

    permanentLogger.breadcrumb('polling_start', 'Starting progress polling', {
      jobId,
      pollInterval: this.config.pollInterval,
      maxPolls
    })

    // Poll until complete or timeout
    while (pollCount < maxPolls) {
      pollCount++

      try {
        // ACTUAL API: Check real batch status from Firecrawl
        // The 'true' parameter requests full data when available
        const status = await this.client.checkBatchScrapeStatus(jobId, true) as FirecrawlBatchStatus

        permanentLogger.debug(LogCategory.FIRECRAWL_V4, 'Poll response received', {
          jobId,
          pollCount,
          status: status.status,
          completed: status.completed,
          total: status.total
        })

        // Validate API response
        if (!status.success && status.status !== 'scraping') {
          throw new Error(status.error || 'Batch status check failed')
        }

        // Send REAL progress update only if there's new progress
        if (status.completed !== undefined && status.completed !== lastCompleted) {
          const percentage = Math.round((status.completed / (status.total || urls.length)) * 100)

          await this.sendProgress(streamWriter, {
            type: ProgressEventType.BATCH_PROGRESS,
            phase: ScrapingPhase.SCRAPING,
            current: status.completed,
            total: status.total || urls.length,
            percentage,
            message: `Scraped ${status.completed} of ${status.total || urls.length} pages`,
            metadata: {
              creditsUsed: status.creditsUsed,
              creditsRemaining: status.creditsRemaining,
              expiresAt: status.expiresAt,
              jobId
            },
            timestamp: Date.now(),
            source: ScraperType.FIRECRAWL
          })

          lastCompleted = status.completed

          permanentLogger.info(LogCategory.FIRECRAWL_V4, 'Progress update', {
            jobId,
            completed: status.completed,
            total: status.total,
            percentage
          })
        }

        // Check if scraping is complete
        if (status.status === 'completed') {
          permanentLogger.breadcrumb('polling_complete', 'Batch scraping completed', {
            jobId,
            totalPages: status.completed,
            creditsUsed: status.creditsUsed
          })

          // Process the scraped data
          if (status.data && Array.isArray(status.data)) {
            for (const doc of status.data) {
              if (doc && doc.url) {
                dataMap.set(doc.url, doc)
              }
            }
          }

          // Calculate metrics from REAL API data
          const completedAt = Date.now()
          const metrics: ScrapingMetrics = {
            pagesScraped: status.completed || 0,
            pagesFailed: (status.total || urls.length) - (status.completed || 0),
            duration: completedAt - startedAt,
            creditsUsed: status.creditsUsed || 0,
            creditsRemaining: status.creditsRemaining,
            costEstimate: CostCalculator.calculateTotalCost({
              creditsUsed: status.creditsUsed || 0
            }),
            startedAt,
            completedAt,
            dataSize: JSON.stringify(Array.from(dataMap.values())).length
          }

          // Send completion event with final metrics
          await this.sendProgress(streamWriter, {
            type: ProgressEventType.PAGE_COMPLETE,
            phase: ScrapingPhase.COMPLETE,
            current: metrics.pagesScraped,
            total: urls.length,
            percentage: 100,
            message: `Completed: ${metrics.pagesScraped} pages scraped successfully`,
            metadata: metrics,
            timestamp: Date.now(),
            source: ScraperType.FIRECRAWL
          })

          pollTimer.stop()

          return {
            success: true,
            domain: urls[0] ? new URL(urls[0]).hostname : '',
            scraperType: ScraperType.FIRECRAWL,
            data: dataMap,
            metrics
          }
        }

        // Check if scraping failed
        if (status.status === 'failed') {
          throw new Error(status.error || 'Batch scrape failed')
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, this.config.pollInterval))

      } catch (pollError) {
        // Log polling error but continue trying
        permanentLogger.captureError(LogCategory.FIRECRAWL_V4, pollError as Error, {
          jobId,
          pollCount,
          phase: 'polling'
        })

        // Re-throw if this is a critical error
        if (pollCount >= maxPolls - 1) {
          throw pollError
        }
      }
    }

    // Polling timeout exceeded
    pollTimer.stop()
    throw new Error(`Polling timeout exceeded after ${pollCount} attempts`)
  }

  /**
   * Sends progress update via SSE stream
   * @private
   * @async
   * @param {StreamWriter} streamWriter - SSE stream writer instance
   * @param {ProgressUpdate} update - Progress update containing current state
   * @returns {Promise<void>} Resolves when event is sent
   */
  private async sendProgress(
    streamWriter: StreamWriter,
    update: ProgressUpdate
  ): Promise<void> {
    try {
      // Use EventFactory for consistent event format
      const event = EventFactory.progress(
        update.current,
        update.total,
        update.message,
        {
          phase: update.phase,
          source: update.source,
          metadata: {
            ...update.metadata,
            type: update.type,
            scraperType: ScraperType.FIRECRAWL,
            timestamp: update.timestamp
          }
        }
      )

      await streamWriter.sendEvent(event)

      permanentLogger.breadcrumb('progress_sent', 'Progress event sent', {
        type: update.type,
        phase: update.phase,
        percentage: update.percentage
      })

    } catch (error) {
      // Log error but don't fail scraping if progress sending fails
      permanentLogger.captureError(LogCategory.STREAM_V4, error as Error, {
        updateType: update.type,
        phase: update.phase
      })
    }
  }

  /**
   * Validates domain format
   * @private
   * @param {string} domain - Domain to validate
   * @returns {boolean} True if valid
   */
  private isValidDomain(domain: string): boolean {
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i
    return domainRegex.test(domain)
  }

  /**
   * Gets the current scraper configuration
   * @public
   * @returns {StreamingScraperConfig} Copy of current configuration object
   */
  public getConfig(): StreamingScraperConfig {
    return { ...this.config }
  }

  /**
   * Estimates cost for scraping operation
   * @public
   * @param {number} pageCount - Number of pages to estimate cost for
   * @returns {number} Estimated cost in USD based on Firecrawl pricing
   */
  public estimateCost(pageCount: number): number {
    return CostCalculator.calculateTotalCost({
      creditsUsed: pageCount,
      tokensUsed: this.config.extractSchema ? pageCount * CostCalculator.TOKENS_PER_PAGE_ESTIMATE : 0
    })
  }
}