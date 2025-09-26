/**
 * Firecrawl API Plugin
 *
 * Uses the Firecrawl API service for robust web scraping.
 * Best for production use with rate limiting and reliability.
 *
 * Features:
 * - Cloud-based scraping (no local browser needed)
 * - Automatic retries and rate limiting
 * - Clean markdown output
 * - Built-in proxy rotation
 *
 * @module plugins/firecrawl
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
 * Firecrawl API response structure
 */
interface FirecrawlResponse {
  success: boolean
  data?: {
    content: string
    markdown?: string
    html?: string
    metadata?: Record<string, any>
    links?: string[]
  }
  error?: string
}

/**
 * Firecrawl API scraper plugin
 * Uses Firecrawl's cloud service for reliable scraping
 */
export default class FirecrawlPlugin extends BaseScraper {
  /**
   * Plugin configuration
   */
  readonly config: ScraperConfig = {
    id: 'firecrawl-scraper',
    name: 'Firecrawl API Scraper',
    strategy: 'api',
    priority: 90, // Highest priority - most reliable
    timeout: 120000, // 2 minutes for API calls
    maxRetries: 3,
    speed: 'medium',
    requiresBrowser: false,
    supportedPatterns: ['.*'], // Supports all URLs
    excludedPatterns: [
      '\\.pdf$',
      '\\.doc',
      '\\.xls',
      '\\.ppt',
      '\\.zip',
      '\\.(jpg|jpeg|png|gif|svg|webp)$'
    ]
  }

  private apiKey?: string
  private apiEndpoint = 'https://api.firecrawl.dev/v0'
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
   * Initialize with API key
   */
  protected async onInitialize(): Promise<void> {
    // Get API key from environment
    this.apiKey = process.env.FIRECRAWL_API_KEY

    if (!this.apiKey) {
      permanentLogger.warn('FIRECRAWL_PLUGIN', 'No API key found', {
        hint: 'Set FIRECRAWL_API_KEY environment variable'
      })
    }

    permanentLogger.info('FIRECRAWL_PLUGIN', 'Plugin initialized', {
      hasApiKey: !!this.apiKey,
      endpoint: this.apiEndpoint
    })
  }

  /**
   * Scrape pages using Firecrawl API
   */
  protected async scrapePages(
    urls: string[],
    options?: ScraperOptions
  ): Promise<PageResult[]> {
    const results: PageResult[] = []

    permanentLogger.info('FIRECRAWL_PLUGIN', 'Starting API scraping', {
      urlCount: urls.length,
      hasApiKey: !!this.apiKey
    })

    // If no API key, fall back to static scraping
    if (!this.apiKey) {
      permanentLogger.warn('FIRECRAWL_PLUGIN', 'Falling back to static scraping', {
        reason: 'No API key configured'
      })
      return this.fallbackToStatic(urls, options)
    }

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i]

      // Report progress
      await this.context!.progressReporter.report({
        current: i,
        total: urls.length,
        message: `Scraping ${url} (Firecrawl API)`,
        scraperId: this.config.id
      })

      const result = await this.scrapePage(url, options)
      results.push(result)

      // Rate limiting delay
      if (i < urls.length - 1) {
        await this.delay(this.getRateLimitDelay())
      }
    }

    return results
  }

  /**
   * Scrape a single page via Firecrawl API
   */
  private async scrapePage(
    url: string,
    options?: ScraperOptions
  ): Promise<PageResult> {
    const timer = this.context!.performanceTracker.startTimer('firecrawl_api_scrape')

    permanentLogger.breadcrumb('api_scrape', 'Calling Firecrawl API', {
      url,
      scraperId: this.config.id
    })

    try {
      // Call Firecrawl API
      const response = await httpFetcher(`${this.apiEndpoint}/scrape`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url,
          pageOptions: {
            includeHtml: true,
            includeMarkdown: true,
            onlyMainContent: false,
            waitFor: options?.waitTime || 0,
            screenshot: options?.screenshot || false
          }
        }),
        timeout: this.config.timeout,
        maxRetries: this.config.maxRetries
      })

      const firecrawlData = JSON.parse(response.text) as FirecrawlResponse

      if (!firecrawlData.success || !firecrawlData.data) {
        throw new Error(firecrawlData.error || 'API call failed')
      }

      // Extract HTML content (prefer HTML over markdown for extraction)
      const html = firecrawlData.data.html || firecrawlData.data.content

      // Extract data using the shared pipeline
      const extractedData = await this.extractorPipeline.extract(
        html,
        url,
        {
          extractContent: options?.extractContent ?? true,
          extractContact: options?.extractContact ?? true,
          extractSocial: options?.extractSocial ?? true,
          extractMetadata: options?.extractMetadata ?? true
        }
      )

      // Merge Firecrawl metadata if available
      if (firecrawlData.data.metadata) {
        extractedData.metadata = {
          ...extractedData.metadata,
          custom: {
            ...extractedData.metadata?.custom,
            ...firecrawlData.data.metadata
          }
        }
      }

      // Add discovered links from Firecrawl
      if (firecrawlData.data.links && extractedData.content) {
        extractedData.content.links = [
          ...(extractedData.content.links || []),
          ...firecrawlData.data.links.map(href => ({
            href,
            text: '',
            isExternal: !href.includes(new URL(url).hostname)
          }))
        ]
      }

      const duration = timer.stop()

      permanentLogger.info('FIRECRAWL_PLUGIN', 'Page scraped via API', {
        url,
        contentLength: html.length,
        dataPoints: extractedData.summary?.totalDataPoints || 0,
        duration
      })

      return {
        url,
        success: true,
        statusCode: 200, // Firecrawl doesn't return status codes
        data: extractedData,
        duration,
        bytesDownloaded: html.length,
        timestamp: Date.now(),
        scraperId: this.config.id
      }
    } catch (error) {
      const duration = timer.stop()
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      permanentLogger.captureError('FIRECRAWL_PLUGIN', error as Error, {
        url,
        phase: 'api_scrape'
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
   * Fallback to static scraping if API is unavailable
   */
  private async fallbackToStatic(
    urls: string[],
    options?: ScraperOptions
  ): Promise<PageResult[]> {
    const results: PageResult[] = []

    for (const url of urls) {
      const timer = this.context!.performanceTracker.startTimer('fallback_scrape')

      try {
        // Use httpFetch directly
        const response = await httpFetcher(url, {
          timeout: this.config.timeout,
          maxRetries: this.config.maxRetries
        })

        // Extract data
        const extractedData = await this.extractorPipeline.extract(
          response.text,
          url
        )

        const duration = timer.stop()

        results.push({
          url,
          success: true,
          statusCode: response.status,
          data: extractedData,
          duration,
          bytesDownloaded: response.text.length,
          timestamp: Date.now(),
          scraperId: this.config.id
        })
      } catch (error) {
        const duration = timer.stop()

        results.push({
          url,
          success: false,
          statusCode: 0,
          error: (error as Error).message,
          errorCode: 'FALLBACK_ERROR',
          duration,
          bytesDownloaded: 0,
          timestamp: Date.now(),
          scraperId: this.config.id
        })
      }
    }

    return results
  }

  /**
   * Get rate limit delay for API calls
   */
  private getRateLimitDelay(): number {
    // Firecrawl rate limits vary by plan
    // Default to conservative delay
    return 1000 // 1 second between requests
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
    if (message.includes('rate')) return 'RATE_LIMITED'
    if (message.includes('unauthorized')) return 'API_AUTH_ERROR'
    if (message.includes('quota')) return 'QUOTA_EXCEEDED'
    if (message.includes('invalid')) return 'INVALID_REQUEST'

    return 'API_ERROR'
  }

  /**
   * Check if plugin can handle URL
   * Prefer Firecrawl for difficult sites
   */
  canHandle(url: string): boolean {
    // First check base implementation
    if (!super.canHandle(url)) {
      return false
    }

    // Prefer Firecrawl for known difficult sites
    const lower = url.toLowerCase()
    const difficultPatterns = [
      'linkedin.com',
      'facebook.com',
      'instagram.com',
      'twitter.com',
      'x.com',
      'cloudflare',
      'captcha'
    ]

    for (const pattern of difficultPatterns) {
      if (lower.includes(pattern)) {
        permanentLogger.breadcrumb('firecrawl_preferred', 'Difficult site detected', {
          url,
          pattern
        })
        return !!this.apiKey // Only if we have API key
      }
    }

    return !!this.apiKey
  }

  /**
   * Override estimate time for API calls
   */
  estimateTime(urlCount: number): number {
    // API calls are generally faster than browser rendering
    const timePerUrl = 3000 // 3 seconds per URL
    return urlCount * timePerUrl
  }

  /**
   * Custom metadata for Firecrawl plugin
   */
  protected async getMetadata(): Promise<Record<string, any>> {
    return {
      apiVersion: 'v0',
      extractorVersion: '1.0.0',
      supportsJavaScript: true,
      supportsScreenshots: true,
      cloudBased: true,
      hasApiKey: !!this.apiKey
    }
  }
}