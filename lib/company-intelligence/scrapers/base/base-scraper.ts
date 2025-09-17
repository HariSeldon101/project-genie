/**
 * Base Scraper Abstract Class
 *
 * Provides common functionality for all scraper plugins to extend.
 * Handles lifecycle management, error handling, and shared utilities.
 *
 * Features:
 * - Automatic context management
 * - Built-in performance tracking
 * - Standardized error handling
 * - Shared utility integration
 *
 * @module base/base-scraper
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { httpFetcher } from '@/lib/utils/http-fetcher'
import { validateUrls } from '@/lib/utils/url-validator'
import type {
  ScraperPlugin,
  ScraperConfig,
  ScraperContext,
  ScraperOptions,
  ScraperResult,
  PageResult,
  PluginStatus,
  ScrapingStats
} from '../core/types'

/**
 * Abstract base class for all scraper plugins
 * Provides common functionality and enforces plugin contract
 */
export abstract class BaseScraper implements ScraperPlugin {
  /**
   * Plugin configuration - must be defined by subclasses
   */
  abstract readonly config: ScraperConfig

  /**
   * Shared context provided during initialization
   */
  protected context?: ScraperContext

  /**
   * Track plugin initialization state
   */
  private initialized = false

  /**
   * Track busy state for concurrent execution prevention
   */
  private busy = false

  /**
   * Initialize the scraper with context
   * Subclasses can override for custom initialization
   */
  async initialize(context: ScraperContext): Promise<void> {
    if (this.initialized) {
      permanentLogger.breadcrumb('scraper_already_init', 'Scraper already initialized', {
        scraperId: this.config.id
      })
      return
    }

    this.context = context
    this.initialized = true

    permanentLogger.info('BASE_SCRAPER', 'Scraper initialized', {
      scraperId: this.config.id,
      scraperName: this.config.name,
      strategy: this.config.strategy,
      sessionId: context.sessionId
    })

    // Allow subclasses to perform custom initialization
    await this.onInitialize()
  }

  /**
   * Execute scraping for given URLs
   * Implements common flow with hooks for customization
   */
  async execute(
    urls: string[],
    options?: ScraperOptions
  ): Promise<ScraperResult> {
    if (!this.initialized || !this.context) {
      throw new Error(`Scraper ${this.config.id} not initialized`)
    }

    if (this.busy) {
      throw new Error(`Scraper ${this.config.id} is already executing`)
    }

    const timer = this.context.performanceTracker.startTimer('scraper_execution')
    this.busy = true

    permanentLogger.info('BASE_SCRAPER', 'Starting execution', {
      scraperId: this.config.id,
      urlCount: urls.length,
      sessionId: this.context.sessionId
    })

    try {
      // Validate URLs using shared utility
      const validUrls = await validateUrls(urls)

      if (validUrls.length === 0) {
        throw new Error('No valid URLs to scrape')
      }

      permanentLogger.breadcrumb('urls_validated', 'URLs validated', {
        originalCount: urls.length,
        validCount: validUrls.length,
        invalidCount: urls.length - validUrls.length
      })

      // Report initial progress
      await this.context.progressReporter.report({
        current: 0,
        total: validUrls.length,
        message: 'Starting scraping',
        scraperId: this.config.id
      })

      // Execute actual scraping (implemented by subclasses)
      const pages = await this.scrapePages(validUrls, options)

      // Calculate statistics
      const stats = this.calculateStats(pages, timer.stop())

      // Extract discovered links from all pages
      const discoveredLinks = this.extractDiscoveredLinks(pages)

      // Report completion
      await this.context.progressReporter.report({
        current: validUrls.length,
        total: validUrls.length,
        message: 'Scraping complete',
        scraperId: this.config.id
      })

      permanentLogger.info('BASE_SCRAPER', 'Execution complete', {
        scraperId: this.config.id,
        pagesScraped: pages.length,
        successCount: pages.filter(p => p.success).length,
        failedCount: pages.filter(p => !p.success).length,
        duration: stats.duration
      })

      return {
        success: pages.some(p => p.success),
        scraperId: this.config.id,
        scraperName: this.config.name,
        strategy: this.config.strategy,
        timestamp: Date.now(),
        pages,
        errors: pages
          .filter(p => !p.success)
          .map(p => ({
            url: p.url,
            error: p.error || 'Unknown error',
            code: p.errorCode,
            timestamp: p.timestamp
          })),
        stats,
        discoveredLinks,
        metadata: await this.getMetadata()
      }
    } catch (error) {
      permanentLogger.captureError('BASE_SCRAPER', error as Error, {
        scraperId: this.config.id,
        phase: 'execution'
      })
      throw error
    } finally {
      this.busy = false
      timer.stop()
    }
  }

  /**
   * Clean up resources
   * Subclasses should override for custom cleanup
   */
  async cleanup(): Promise<void> {
    permanentLogger.breadcrumb('scraper_cleanup', 'Cleaning up scraper', {
      scraperId: this.config.id
    })

    await this.onCleanup()

    this.context = undefined
    this.initialized = false
    this.busy = false
  }

  /**
   * Check if scraper can handle a URL
   * Uses configured patterns by default
   */
  canHandle(url: string): boolean {
    // Check excluded patterns first
    if (this.config.excludedPatterns?.length) {
      for (const pattern of this.config.excludedPatterns) {
        if (new RegExp(pattern).test(url)) {
          return false
        }
      }
    }

    // Check supported patterns
    if (this.config.supportedPatterns?.length) {
      for (const pattern of this.config.supportedPatterns) {
        if (new RegExp(pattern).test(url)) {
          return true
        }
      }
      return false // If patterns specified, must match one
    }

    // Default to true if no patterns specified
    return true
  }

  /**
   * Estimate execution time
   * Can be overridden for more accurate estimates
   */
  estimateTime(urlCount: number): number {
    const timePerUrl = this.config.speed === 'fast' ? 1000 :
                       this.config.speed === 'slow' ? 5000 : 2500
    return urlCount * timePerUrl
  }

  /**
   * Get plugin status
   */
  getStatus(): PluginStatus {
    return {
      ready: this.initialized && !this.busy,
      busy: this.busy,
      initialized: this.initialized
    }
  }

  /**
   * Protected helper to use httpFetch with proper config
   */
  protected async fetchUrl(url: string): Promise<{
    text: string
    status: number
    headers: Record<string, string>
  }> {
    return await httpFetcher(url, {
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries
    })
  }

  /**
   * Calculate scraping statistics
   */
  protected calculateStats(pages: PageResult[], duration: number): ScrapingStats {
    const succeeded = pages.filter(p => p.success).length
    const failed = pages.filter(p => !p.success).length
    const totalBytes = pages.reduce((sum, p) => sum + (p.bytesDownloaded || 0), 0)
    const totalDataPoints = pages.reduce((sum, p) => {
      if (!p.data || typeof p.data !== 'object') return sum
      return sum + Object.keys(p.data).length
    }, 0)

    return {
      duration,
      pagesAttempted: pages.length,
      pagesSucceeded: succeeded,
      pagesFailed: failed,
      bytesDownloaded: totalBytes,
      dataPointsExtracted: totalDataPoints,
      linksDiscovered: 0, // Will be updated after link extraction
      averageTimePerPage: pages.length > 0 ? duration / pages.length : 0,
      successRate: pages.length > 0 ? (succeeded / pages.length) * 100 : 0
    }
  }

  /**
   * Extract discovered links from scraped pages
   */
  protected extractDiscoveredLinks(pages: PageResult[]): string[] {
    const links = new Set<string>()

    for (const page of pages) {
      if (page.success && page.data) {
        // Extract links from data if available
        const pageData = page.data as any
        if (pageData.links && Array.isArray(pageData.links)) {
          pageData.links.forEach((link: string) => links.add(link))
        }
        if (pageData.discoveredLinks && Array.isArray(pageData.discoveredLinks)) {
          pageData.discoveredLinks.forEach((link: string) => links.add(link))
        }
      }
    }

    return Array.from(links)
  }

  /**
   * Abstract method - must be implemented by subclasses
   * Performs the actual scraping logic
   */
  protected abstract scrapePages(
    urls: string[],
    options?: ScraperOptions
  ): Promise<PageResult[]>

  /**
   * Hook for custom initialization logic
   * Override in subclasses if needed
   */
  protected async onInitialize(): Promise<void> {
    // Default: no-op
  }

  /**
   * Hook for custom cleanup logic
   * Override in subclasses if needed
   */
  protected async onCleanup(): Promise<void> {
    // Default: no-op
  }

  /**
   * Hook for custom metadata
   * Override in subclasses to provide additional metadata
   */
  protected async getMetadata(): Promise<Record<string, any>> {
    return {}
  }
}