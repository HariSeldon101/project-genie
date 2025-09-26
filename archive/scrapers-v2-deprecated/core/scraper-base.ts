/**
 * Abstract base scraper implementing template method pattern
 *
 * @module scrapers-v2/core/scraper-base
 * @description Provides common scraping logic with hooks for specialization.
 * Implements the template method pattern to define the scraping algorithm
 * structure while allowing subclasses to override specific steps.
 *
 * DESIGN PATTERNS:
 * - Template Method: Main scraping flow with extension points
 * - Strategy: Pluggable extractors via dependency injection
 * - Factory Method: Result creation methods
 *
 * COMPLIANCE:
 * - Uses permanentLogger for all logging
 * - EventFactory for streaming updates
 * - No mock data or fallbacks
 * - Full error capture and reporting
 * - Repository pattern (no DB access)
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { EventFactory } from '@/lib/realtime-events'
import type { StreamWriter } from '@/lib/realtime-events'
import {
  ScraperType,
  ScraperStatus,
  DataLayer
} from '@/lib/company-intelligence/types/scraping-enums'
import type {
  ScraperResult,
  ExtractedData,
  ScraperError,
  ScraperMetadata
} from '@/lib/company-intelligence/types/scraping-interfaces'
import type { SessionId, Url, ScraperId } from './types'
import { ScraperId as createScraperId, SCRAPER_METRICS } from './types'
import type { IScraper } from './scraper.interface'
import { v4 as uuidv4 } from 'uuid'

/**
 * Abstract base class for all scrapers
 * Implements IScraper with common functionality
 *
 * RESPONSIBILITIES:
 * - Common scraping flow (template method)
 * - Error handling and recovery
 * - Progress reporting via streams
 * - Quality calculation
 * - Cost tracking
 * - URL discovery and validation
 */
export abstract class ScraperBase implements IScraper {
  // Abstract properties that MUST be defined by subclasses
  abstract readonly scraperType: ScraperType
  abstract readonly dataLayer: DataLayer
  abstract readonly costPerPage: number
  abstract readonly qualityContribution: Readonly<{
    readonly min: number
    readonly max: number
  }>

  // Protected state for subclasses
  protected readonly scraperId: ScraperId
  protected discoveredUrls: Set<string> = new Set()
  protected errors: ScraperError[] = []

  constructor() {
    // Generate unique scraper ID for tracking
    this.scraperId = createScraperId(uuidv4())
  }

  /**
   * Template method for scraping
   * Defines the algorithm structure with extension points
   *
   * ALGORITHM:
   * 1. Pre-scraping setup (hook)
   * 2. URL validation
   * 3. Stream start event
   * 4. Process each URL
   * 5. Post-scraping cleanup (hook)
   * 6. Calculate metrics
   * 7. Create result
   */
  async scrape(
    urls: readonly Url[],
    sessionId: SessionId,
    streamWriter?: StreamWriter
  ): Promise<ScraperResult> {
    // Start performance timing
    const timer = permanentLogger.timing(`scraper_${this.scraperType}`, {
      sessionId,
      scraperId: this.scraperId,
      urlCount: urls.length
    })

    permanentLogger.info('SCRAPER_V2', `Starting ${this.scraperType} scraper`, {
      sessionId,
      scraperId: this.scraperId,
      urlCount: urls.length,
      dataLayer: this.dataLayer,
      estimatedCost: this.estimateCost(urls.length),
      estimatedDuration: this.estimateDuration(urls.length)
    })

    // Initialize state
    let pagesScraped = 0
    let dataPoints = 0
    const extractedData: ExtractedData = this.initializeExtractedData()

    try {
      // Step 1: Pre-scraping hook (can be overridden)
      await this.beforeScraping(urls, sessionId)

      // Step 2: Validate URLs
      const validUrls = await this.validateUrls(urls)

      if (validUrls.length === 0) {
        throw new Error('No valid URLs to scrape after validation')
      }

      permanentLogger.info('SCRAPER_V2', 'URLs validated', {
        original: urls.length,
        valid: validUrls.length,
        invalid: urls.length - validUrls.length
      })

      // Step 3: Stream start event
      this.streamEvent(streamWriter, {
        type: 'scraper-start',
        scraper: this.scraperType,
        totalUrls: validUrls.length,
        sessionId,
        dataLayer: this.dataLayer
      })

      // Step 4: Process each URL
      for (let i = 0; i < validUrls.length; i++) {
        const url = validUrls[i]

        try {
          // Add breadcrumb for debugging
          permanentLogger.breadcrumb('scrape_page', `Processing ${url}`, {
            scraper: this.scraperType,
            sessionId,
            progress: `${i + 1}/${validUrls.length}`,
            url
          })

          // Stream progress
          this.streamProgress(streamWriter, i + 1, validUrls.length, url)

          // Scrape page (abstract method - must be implemented by subclass)
          const pageData = await this.scrapePage(url)

          // Merge data additively (not replacement)
          this.mergeData(extractedData, pageData)

          // Update metrics
          pagesScraped++
          dataPoints += this.countDataPoints(pageData)

          permanentLogger.debug('SCRAPER_V2', 'Page scraped successfully', {
            url,
            dataPoints: this.countDataPoints(pageData),
            discoveredUrls: this.discoveredUrls.size
          })

        } catch (error) {
          // Capture page-level errors without stopping
          this.handlePageError(url, error as Error)

          // Stream error event
          this.streamEvent(streamWriter, {
            type: 'scraper-error',
            scraper: this.scraperType,
            url,
            error: (error as Error).message,
            recoverable: true
          })
        }
      }

      // Step 5: Post-scraping hook (can be overridden)
      await this.afterScraping(extractedData, sessionId)

      // Step 6: Calculate final metrics
      const duration = timer.stop()
      const qualityScore = this.calculateQualityContribution(extractedData)
      const finalCost = this.calculateCost(pagesScraped)

      permanentLogger.info('SCRAPER_V2', 'Scraping completed', {
        scraperType: this.scraperType,
        pagesScraped,
        dataPoints,
        qualityScore,
        cost: finalCost,
        duration,
        errors: this.errors.length
      })

      // Step 7: Stream completion
      this.streamEvent(streamWriter, {
        type: 'scraper-complete',
        scraper: this.scraperType,
        pagesScraped,
        dataPoints,
        qualityScore,
        cost: finalCost
      })

      // Step 8: Create success result
      return this.createSuccessResult(
        extractedData,
        pagesScraped,
        dataPoints,
        duration,
        qualityScore,
        finalCost
      )

    } catch (error) {
      // Capture orchestration-level errors
      permanentLogger.captureError('SCRAPER_V2', error as Error, {
        scraper: this.scraperType,
        sessionId,
        scraperId: this.scraperId
      })

      // Stream error event
      this.streamEvent(streamWriter, {
        type: 'scraper-failed',
        scraper: this.scraperType,
        error: (error as Error).message
      })

      // Create failure result
      return this.createFailureResult(
        extractedData,
        pagesScraped,
        timer.stop(),
        error as Error
      )
    }
  }

  /**
   * Abstract method for page scraping
   * MUST be implemented by concrete scrapers
   *
   * @param url - URL to scrape
   * @returns Partial extracted data from the page
   */
  protected abstract scrapePage(url: Url): Promise<Partial<ExtractedData>>

  /**
   * Hook method called before scraping starts
   * Can be overridden for setup logic (e.g., browser initialization)
   *
   * @param urls - URLs to be scraped
   * @param sessionId - Current session ID
   */
  protected async beforeScraping(urls: readonly Url[], sessionId: SessionId): Promise<void> {
    // Default: no-op
    // Subclasses can override for setup
  }

  /**
   * Hook method called after scraping completes
   * Can be overridden for cleanup logic (e.g., browser shutdown)
   *
   * @param data - Extracted data
   * @param sessionId - Current session ID
   */
  protected async afterScraping(data: ExtractedData, sessionId: SessionId): Promise<void> {
    // Default: no-op
    // Subclasses can override for cleanup
  }

  /**
   * Validate URLs before scraping
   * Filters out invalid URLs and those the scraper cannot handle
   *
   * @param urls - URLs to validate
   * @returns Valid URLs that can be scraped
   */
  protected async validateUrls(urls: readonly Url[]): Promise<Url[]> {
    const valid: Url[] = []

    for (const url of urls) {
      if (this.canHandle(url)) {
        valid.push(url)
      } else {
        permanentLogger.warn('SCRAPER_V2', 'URL cannot be handled by scraper', {
          url,
          scraper: this.scraperType
        })
      }
    }

    return valid
  }

  /**
   * Initialize empty extracted data structure
   * Ensures all fields are present even if undefined
   *
   * @returns Empty ExtractedData structure
   */
  protected initializeExtractedData(): ExtractedData {
    return {
      companyInfo: undefined,
      contactData: undefined,
      technologies: undefined,
      socialMedia: undefined,
      content: undefined,
      customFields: {}
    }
  }

  /**
   * Merge extracted data additively
   * Combines new data with existing without overwriting
   *
   * @param target - Target data structure
   * @param source - Source data to merge
   */
  protected mergeData(target: ExtractedData, source: Partial<ExtractedData>): void {
    // Merge company info
    if (source.companyInfo) {
      target.companyInfo = target.companyInfo || {} as any
      Object.assign(target.companyInfo, source.companyInfo)
    }

    // Merge contact data
    if (source.contactData) {
      target.contactData = target.contactData || { emails: [], phones: [], addresses: [] }
      if (source.contactData.emails) {
        target.contactData.emails = [...new Set([
          ...target.contactData.emails,
          ...source.contactData.emails
        ])]
      }
      if (source.contactData.phones) {
        target.contactData.phones = [...new Set([
          ...target.contactData.phones,
          ...source.contactData.phones
        ])]
      }
      if (source.contactData.addresses) {
        target.contactData.addresses.push(...source.contactData.addresses)
      }
    }

    // Merge technologies
    if (source.technologies) {
      target.technologies = target.technologies || {}
      Object.assign(target.technologies, source.technologies)
    }

    // Merge social media
    if (source.socialMedia) {
      target.socialMedia = target.socialMedia || {}
      Object.assign(target.socialMedia, source.socialMedia)
    }

    // Merge content
    if (source.content) {
      target.content = target.content || {
        titles: [],
        descriptions: [],
        headings: {},
        paragraphs: [],
        images: []
      }
      if (source.content.titles) {
        target.content.titles = [...new Set([
          ...target.content.titles,
          ...source.content.titles
        ])]
      }
      if (source.content.paragraphs) {
        target.content.paragraphs.push(...source.content.paragraphs)
      }
      if (source.content.images) {
        target.content.images.push(...source.content.images)
      }
    }

    // Merge custom fields
    if (source.customFields) {
      Object.assign(target.customFields || {}, source.customFields)
    }
  }

  /**
   * Count data points in extracted data
   * Used for metrics and progress tracking
   *
   * @param data - Data to count
   * @returns Number of data points
   */
  protected countDataPoints(data: Partial<ExtractedData>): number {
    let count = 0

    if (data.companyInfo) {
      count += Object.keys(data.companyInfo).filter(k =>
        (data.companyInfo as any)[k] !== undefined
      ).length
    }

    if (data.contactData) {
      count += (data.contactData.emails?.length || 0)
      count += (data.contactData.phones?.length || 0)
      count += (data.contactData.addresses?.length || 0)
    }

    if (data.technologies) {
      const tech = data.technologies
      count += (tech.frontend?.length || 0)
      count += (tech.backend?.length || 0)
      count += (tech.analytics?.length || 0)
      count += (tech.hosting?.length || 0)
    }

    if (data.socialMedia) {
      count += Object.keys(data.socialMedia).filter(k =>
        (data.socialMedia as any)[k] !== undefined
      ).length
    }

    if (data.content) {
      count += (data.content.titles?.length || 0)
      count += (data.content.images?.length || 0)
    }

    return count
  }

  /**
   * Calculate quality contribution for extracted data
   * Based on scraper type and data completeness
   *
   * @param data - Extracted data
   * @returns Quality score between min and max
   */
  protected calculateQualityContribution(data: ExtractedData): number {
    const metrics = SCRAPER_METRICS[this.scraperType]
    let score = metrics.quality.min

    // Add points for data completeness
    if (data.companyInfo?.name) score += 2
    if (data.companyInfo?.description) score += 1
    if (data.contactData?.emails?.length) score += 3
    if (data.contactData?.phones?.length) score += 2
    if (data.technologies?.frontend?.length) score += 3
    if (data.technologies?.backend?.length) score += 3
    if (data.socialMedia && Object.keys(data.socialMedia).length > 0) score += 2
    if (data.content?.images?.length) score += 1

    // Cap at maximum for scraper type
    return Math.min(score, metrics.quality.max)
  }

  /**
   * Calculate cost for scraping
   *
   * @param pagesScraped - Number of pages scraped
   * @returns Cost in USD
   */
  protected calculateCost(pagesScraped: number): number {
    return pagesScraped * this.costPerPage
  }

  /**
   * Handle page-level errors
   * Captures error without stopping scraping
   *
   * @param url - URL that failed
   * @param error - Error that occurred
   */
  protected handlePageError(url: string, error: Error): void {
    permanentLogger.captureError('SCRAPER_V2', error, {
      scraper: this.scraperType,
      url,
      phase: 'page-scraping'
    })

    this.errors.push({
      code: error.name || 'SCRAPE_ERROR',
      message: error.message,
      url,
      timestamp: new Date(),
      recoverable: true
    })
  }

  /**
   * Stream event via EventFactory
   *
   * @param streamWriter - Stream writer instance
   * @param data - Event data
   */
  protected streamEvent(streamWriter: StreamWriter | undefined, data: any): void {
    if (streamWriter) {
      streamWriter.write(EventFactory.data(data))
    }
  }

  /**
   * Stream progress update
   *
   * @param streamWriter - Stream writer instance
   * @param current - Current progress
   * @param total - Total items
   * @param url - Current URL
   */
  protected streamProgress(
    streamWriter: StreamWriter | undefined,
    current: number,
    total: number,
    url: string
  ): void {
    this.streamEvent(streamWriter, {
      type: 'scraper-progress',
      scraper: this.scraperType,
      current,
      total,
      percentage: Math.round((current / total) * 100),
      url
    })
  }

  /**
   * Create success result
   *
   * @param extractedData - Data extracted
   * @param pagesScraped - Number of pages scraped
   * @param dataPoints - Number of data points
   * @param duration - Duration in ms
   * @param qualityScore - Quality contribution
   * @param cost - Cost in USD
   * @returns ScraperResult
   */
  protected createSuccessResult(
    extractedData: ExtractedData,
    pagesScraped: number,
    dataPoints: number,
    duration: number,
    qualityScore: number,
    cost: number
  ): ScraperResult {
    return {
      scraperId: this.scraperType,
      status: ScraperStatus.COMPLETE,
      pagesScraped,
      dataPoints,
      discoveredUrls: Array.from(this.discoveredUrls),
      extractedData,
      duration,
      cost,
      errors: this.errors,
      metadata: {
        scraperId: this.scraperId,
        dataLayer: this.dataLayer,
        qualityContribution: qualityScore,
        technology: this.scraperType,
        strategyReason: this.getStrategyReason()
      }
    }
  }

  /**
   * Create failure result
   *
   * @param extractedData - Partial data extracted
   * @param pagesScraped - Number of pages scraped
   * @param duration - Duration in ms
   * @param error - Error that occurred
   * @returns ScraperResult
   */
  protected createFailureResult(
    extractedData: ExtractedData,
    pagesScraped: number,
    duration: number,
    error: Error
  ): ScraperResult {
    return {
      scraperId: this.scraperType,
      status: ScraperStatus.FAILED,
      pagesScraped,
      dataPoints: 0,
      discoveredUrls: Array.from(this.discoveredUrls),
      extractedData,
      duration,
      cost: this.calculateCost(pagesScraped),
      errors: [
        ...this.errors,
        {
          code: 'SCRAPER_FAILED',
          message: error.message,
          timestamp: new Date(),
          recoverable: false
        }
      ],
      metadata: {
        scraperId: this.scraperId,
        dataLayer: this.dataLayer,
        failureReason: error.message
      }
    }
  }

  /**
   * Get strategy reason for metadata
   * Can be overridden by subclasses
   *
   * @returns Strategy reason string
   */
  protected getStrategyReason(): string {
    switch (this.scraperType) {
      case ScraperType.STATIC:
        return 'Fast HTML extraction without JavaScript'
      case ScraperType.DYNAMIC:
        return 'JavaScript-rendered content extraction'
      case ScraperType.FIRECRAWL:
        return 'AI-powered extraction with advanced features'
      default:
        return `${this.scraperType} scraping strategy`
    }
  }

  /**
   * Estimate duration implementation
   * Uses metrics from configuration
   *
   * @param urlCount - Number of URLs
   * @returns Duration in ms
   */
  estimateDuration(urlCount: number): number {
    const metrics = SCRAPER_METRICS[this.scraperType]
    return urlCount * metrics.speed
  }

  /**
   * Estimate cost implementation
   *
   * @param urlCount - Number of URLs
   * @returns Cost in USD
   */
  estimateCost(urlCount: number): number {
    return urlCount * this.costPerPage
  }
}