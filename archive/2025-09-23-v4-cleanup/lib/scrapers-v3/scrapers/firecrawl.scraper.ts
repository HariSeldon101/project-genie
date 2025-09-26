/**
 * Firecrawl Scraper - Thin wrapper around Firecrawl API
 *
 * Delegates all heavy lifting to Firecrawl's native capabilities:
 * - URL discovery via Map API
 * - Schema-based extraction
 * - Markdown conversion
 * - Anti-detection and proxies
 * - Rate limiting and retries
 */

import Firecrawl from 'firecrawl'  // Use the v4 default export
import type { FirecrawlConfig } from '../config/firecrawl.config'
import { getSchema } from '../config/extraction-schemas'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import type { StreamWriter } from '@/lib/realtime-events'

export interface FirecrawlResult {
  success: boolean
  data?: any
  error?: string
  creditsUsed?: number  // From Firecrawl API response
  creditsRemaining?: number  // If available from headers/response
  duration?: number
}

export class FirecrawlScraper {
  private client: Firecrawl

  constructor(private config: FirecrawlConfig) {
    this.client = new Firecrawl({
      apiKey: process.env.FIRECRAWL_API_KEY!
    })

    permanentLogger.info('FIRECRAWL_SCRAPER', 'Initialized', {
      features: Object.keys(config.features).filter(k => config.features[k as keyof typeof config.features])
    })
  }

  /**
   * Scrape URLs using Firecrawl's native features
   */
  async scrape(urls: string | string[], streamWriter?: StreamWriter): Promise<FirecrawlResult> {
    const timer = permanentLogger.timing('firecrawl_scrape')
    const url = Array.isArray(urls) ? urls[0] : urls

    permanentLogger.info('FIRECRAWL_SCRAPER', 'Starting scrape', { url })

    try {
      // Build formats array
      const formats = []
      if (this.config.features.extract) formats.push('extract')
      if (this.config.features.markdown) formats.push('markdown')
      if (this.config.features.screenshots) formats.push('screenshot')
      if (this.config.features.links) formats.push('links')

      streamWriter?.write({
        type: 'scraper_status',
        data: { scraper: 'firecrawl', status: 'scraping', url }
      })

      // Single API call with all configuration
      const result = await this.client.scrapeUrl(url, {
        formats,
        extract: this.config.extraction.useSchema ? {
          schema: getSchema(this.config.extraction.schemaType),
          systemPrompt: this.config.extraction.extractionPrompt
        } : undefined,
        actions: this.config.features.actions ? [
          { type: 'wait', milliseconds: 2000 },
          { type: 'scroll', direction: 'down', amount: 500 }
        ] : undefined,
        onlyMainContent: this.config.extraction.onlyMainContent,
        headers: this.config.advanced?.headers,
        waitFor: this.config.advanced?.waitForSelector,
        timeout: this.config.limits.timeout,
        ...(this.config.stealth.useProxy && {
          proxy: { country: this.config.stealth.proxyCountry }
        })
      })

      const duration = timer.stop()

      permanentLogger.info('FIRECRAWL_SCRAPER', 'Scrape complete', {
        success: result.success,
        duration,
        hasData: !!result.data,
        creditsUsed: result.creditsUsed || 0
      })

      return {
        success: result.success,
        data: result.data,
        error: result.error,
        creditsUsed: result.creditsUsed || (result.success ? 1 : 0),  // Firecrawl returns this
        duration
      }

    } catch (error) {
      timer.stop()
      // Firecrawl errors include API details, rate limits, etc
      permanentLogger.captureError('FIRECRAWL_SCRAPER', error as Error, { url })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        creditsUsed: 0  // No credits charged for failures
      }
    }
  }

  /**
   * Discover all URLs on a domain using Map API
   */
  async discoverUrls(domain: string, streamWriter?: StreamWriter): Promise<string[]> {
    permanentLogger.info('FIRECRAWL_SCRAPER', 'Discovering URLs', { domain })

    streamWriter?.write({
      type: 'discovery_start',
      data: { domain }
    })

    try {
      // One API call replaces entire sitemap discovery
      const result = await this.client.map(domain, {
        limit: this.config.limits.maxPages,
        search: this.config.advanced?.searchPattern
      })

      const urls = result.links?.map(link => link.url) || []

      permanentLogger.info('FIRECRAWL_SCRAPER', 'Discovery complete', {
        domain,
        urlsFound: urls.length
      })

      return urls

    } catch (error) {
      permanentLogger.captureError('FIRECRAWL_SCRAPER', error as Error, { domain })
      return []
    }
  }
}