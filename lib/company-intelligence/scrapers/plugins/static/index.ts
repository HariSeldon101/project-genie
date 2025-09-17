/**
 * Static Scraper Plugin
 *
 * Handles basic HTML scraping using Cheerio.
 * Best for static websites without JavaScript rendering.
 *
 * Features:
 * - Fast HTML parsing with Cheerio
 * - Shared extractor pipeline
 * - Automatic retry logic
 * - Response caching
 *
 * @module plugins/static
 */

import { BaseScraper } from '../../base/base-scraper'
import { ExtractorPipeline } from '../../extractors/extractor-pipeline'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { httpFetcher } from '@/lib/utils/http-fetcher'
import type {
  ScraperConfig,
  ScraperOptions,
  PageResult
} from '../../core/types'

/**
 * Static HTML scraper plugin
 * Uses httpFetch and Cheerio for fast static content extraction
 */
export default class StaticScraperPlugin extends BaseScraper {
  /**
   * Plugin configuration
   */
  readonly config: ScraperConfig = {
    id: 'static-scraper',
    name: 'Static HTML Scraper',
    strategy: 'static',
    priority: 50, // Medium priority - good default choice
    timeout: 30000,
    maxRetries: 3,
    speed: 'fast',
    requiresBrowser: false,
    supportedPatterns: ['.*'], // Supports all URLs
    excludedPatterns: [
      '\\.pdf$',
      '\\.doc',
      '\\.xls',
      '\\.ppt',
      '\\.zip',
      '\\.tar',
      '\\.gz',
      '\\.(jpg|jpeg|png|gif|svg|webp)$'
    ]
  }

  private extractorPipeline: ExtractorPipeline

  constructor() {
    super()
    this.extractorPipeline = new ExtractorPipeline({
      extractContent: true,
      extractContact: true,
      extractSocial: true,
      extractMetadata: true,
      parallel: true
    })
  }

  /**
   * Scrape pages using static HTML parsing
   */
  protected async scrapePages(
    urls: string[],
    options?: ScraperOptions
  ): Promise<PageResult[]> {
    const results: PageResult[] = []

    permanentLogger.info('STATIC_SCRAPER', 'Starting static scraping', {
      urlCount: urls.length,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries
    })

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i]

      // Report progress
      await this.context!.progressReporter.report({
        current: i,
        total: urls.length,
        message: `Scraping ${url} (static)`,
        scraperId: this.config.id
      })

      const result = await this.scrapePage(url, options)
      results.push(result)

      // Add small delay between requests to be polite
      if (i < urls.length - 1) {
        await this.delay(this.getDelayMs())
      }
    }

    return results
  }

  /**
   * Scrape a single page
   */
  private async scrapePage(
    url: string,
    options?: ScraperOptions
  ): Promise<PageResult> {
    const timer = this.context!.performanceTracker.startTimer('static_page_scrape')

    permanentLogger.breadcrumb('scrape_page', 'Scraping page', {
      url,
      scraperId: this.config.id
    })

    try {
      // Fetch the page using httpFetch (with built-in retries)
      const response = await httpFetcher(url, {
        timeout: this.config.timeout,
        maxRetries: this.config.maxRetries,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ProjectGenie/1.0; +https://project-genie.com/bot)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-GB,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache'
        }
      })

      if (!response.text) {
        throw new Error('Empty response body')
      }

      // Extract data using the shared pipeline
      const extractedData = await this.extractorPipeline.extract(
        response.text,
        url,
        {
          extractContent: options?.extractContent ?? true,
          extractContact: options?.extractContact ?? true,
          extractSocial: options?.extractSocial ?? true,
          extractMetadata: options?.extractMetadata ?? true
        }
      )

      const duration = timer.stop()

      permanentLogger.info('STATIC_SCRAPER', 'Page scraped successfully', {
        url,
        status: response.status,
        contentLength: response.text.length,
        dataPoints: extractedData.summary?.totalDataPoints || 0,
        duration
      })

      return {
        url,
        success: true,
        statusCode: response.status,
        data: extractedData,
        duration,
        bytesDownloaded: response.text.length,
        timestamp: Date.now(),
        scraperId: this.config.id
      }
    } catch (error) {
      const duration = timer.stop()
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      permanentLogger.captureError('STATIC_SCRAPER', error as Error, {
        url,
        phase: 'page_scrape'
      })

      return {
        url,
        success: false,
        statusCode: 0,
        error: errorMessage,
        errorCode: this.getErrorCode(error as Error),
        duration,
        bytesDownloaded: 0,
        timestamp: Date.now(),
        scraperId: this.config.id
      }
    }
  }

  /**
   * Get delay between requests based on speed setting
   */
  private getDelayMs(): number {
    switch (this.config.speed) {
      case 'fast':
        return 100 // 100ms between requests
      case 'medium':
        return 500 // 500ms between requests
      case 'slow':
        return 1000 // 1 second between requests
      default:
        return 500
    }
  }

  /**
   * Delay helper
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Map error to error code
   */
  private getErrorCode(error: Error): string {
    const message = error.message.toLowerCase()

    if (message.includes('timeout')) return 'TIMEOUT'
    if (message.includes('enotfound')) return 'DNS_ERROR'
    if (message.includes('econnrefused')) return 'CONNECTION_REFUSED'
    if (message.includes('econnreset')) return 'CONNECTION_RESET'
    if (message.includes('unauthorized')) return 'UNAUTHORIZED'
    if (message.includes('forbidden')) return 'FORBIDDEN'
    if (message.includes('not found')) return 'NOT_FOUND'
    if (message.includes('too many')) return 'RATE_LIMITED'

    return 'UNKNOWN_ERROR'
  }

  /**
   * Override canHandle to check for static-friendly URLs
   */
  canHandle(url: string): boolean {
    // First check base implementation
    if (!super.canHandle(url)) {
      return false
    }

    // Additional checks for static scraper
    const lower = url.toLowerCase()

    // Avoid known SPA/dynamic sites
    const dynamicPatterns = [
      'app.',
      'dashboard.',
      '/app/',
      '/dashboard/',
      '#!',
      '#!/'
    ]

    for (const pattern of dynamicPatterns) {
      if (lower.includes(pattern)) {
        permanentLogger.breadcrumb('static_skip', 'Skipping dynamic URL', {
          url,
          pattern
        })
        return false
      }
    }

    return true
  }

  /**
   * Custom metadata for static scraper
   */
  protected async getMetadata(): Promise<Record<string, any>> {
    return {
      extractorVersion: '1.0.0',
      userAgent: 'ProjectGenie/1.0',
      respectsRobotsTxt: true,
      supportsJavaScript: false
    }
  }
}