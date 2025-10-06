/**
 * @fileoverview Playwright streaming scraper with real browser events
 * @module scrapers-v4/scrapers/playwright
 *
 * ARCHITECTURE: Uses Playwright's browser automation with real event listeners.
 * Progress tracking comes from actual browser events like page.on('request'),
 * page.on('response'), page.on('load'), etc. No fake progress - all real.
 *
 * COST: Free (self-hosted browser automation)
 * SPEED: Medium (browser overhead)
 * CAPABILITIES: Full JavaScript support, screenshots, PDFs
 *
 * API METHODS USED (verified from Playwright v1.55.0):
 * - page.on('request'): Network request events
 * - page.on('response'): Network response events
 * - page.on('load'): Page load complete
 * - page.on('domcontentloaded'): DOM ready
 * - page.on('console'): Console messages
 * - page.on('pageerror'): JavaScript errors
 */

import { chromium, Browser, BrowserContext, Page, Request, Response } from 'playwright'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { StreamWriter, EventFactory } from '@/lib/realtime-events'
import { normalizeUrl, extractDomain } from '@/lib/utils/url-validator'
import {
  ScraperType,
  ScrapingPhase,
  ProgressEventType,
  LogCategory,
  Constants,
  CostCalculator,
  type ScrapingResult,
  type StreamingScraperConfig,
  type ProgressUpdate,
  type ScrapingMetrics,
  type PlaywrightPageEvent
} from '../types'

/**
 * URL discovery result from crawling
 * @interface CrawlResult
 */
interface CrawlResult {
  url: string
  title?: string
  content?: string
  links: string[]
  error?: string
}

/**
 * Playwright streaming scraper implementation for browser automation
 * @class PlaywrightStreamingScraper
 * @description Free scraper using headless Chrome for JavaScript rendering.
 * Tracks real browser events for authentic progress updates and supports screenshots.
 *
 * @example
 * ```typescript
 * const scraper = new PlaywrightStreamingScraper({ stealth: true, maxPages: 50 })
 * const result = await scraper.scrapeWithStreaming('example.com', streamWriter)
 * console.log(`Scraped ${result.metrics.pagesScraped} pages with browser automation`)
 * ```
 */
export class PlaywrightStreamingScraper {
  private browser: Browser | null = null
  private context: BrowserContext | null = null
  private readonly config: StreamingScraperConfig

  /**
   * Creates a new Playwright streaming scraper instance
   * @constructor
   * @param {StreamingScraperConfig} config - Optional configuration object
   * @param {number} [config.maxPages=50] - Maximum pages to scrape
   * @param {number} [config.timeout=30000] - Page timeout in milliseconds
   * @param {boolean} [config.stealth=true] - Enable stealth mode to avoid detection
   * @param {string} [config.waitForSelector] - CSS selector to wait for
   * @param {string} [config.userAgent] - Custom user agent string
   * @param {object} [config.viewport={width:1920,height:1080}] - Browser viewport size
   */
  constructor(config: StreamingScraperConfig = {}) {
    // Apply defaults (following CLAUDE.md - explicit values)
    this.config = {
      maxPages: config.maxPages ?? 50,
      timeout: config.timeout ?? Constants.DEFAULT_PAGE_TIMEOUT,
      onlyMainContent: config.onlyMainContent ?? true,
      formats: config.formats ?? ['markdown', 'links'],
      headers: config.headers,
      stealth: config.stealth ?? true, // Enable stealth by default
      waitForSelector: config.waitForSelector,
      userAgent: config.userAgent ?? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      viewport: config.viewport ?? { width: 1920, height: 1080 }
    }

    permanentLogger.info(LogCategory.PLAYWRIGHT_V4, 'Playwright scraper initialized', {
      maxPages: this.config.maxPages,
      stealth: this.config.stealth,
      viewport: this.config.viewport
    })
  }

  /**
   * Scrapes a domain with real-time browser event streaming
   * @public
   * @async
   * @param {string} domain - Domain to scrape (e.g., "example.com" or "https://example.com")
   * @param {StreamWriter} streamWriter - SSE stream writer for progress updates
   * @returns {Promise<ScrapingResult>} Complete scraping result with metrics and scraped data
   * @throws {Error} If browser fails to launch or domain is invalid
   *
   * @example
   * ```typescript
   * const domain = 'example.com'
   * const result = await scraper.scrapeWithStreaming(domain, streamWriter)
   * console.log(`Browser scraped ${result.metrics.pagesScraped} pages`)
   * ```
   */
  async scrapeWithStreaming(
    domain: string,
    streamWriter: StreamWriter
  ): Promise<ScrapingResult> {
    const startTime = Date.now()
    const timer = permanentLogger.timing('playwright_streaming_scrape', { domain })

    permanentLogger.breadcrumb('scrape_start', 'Starting Playwright scrape', {
      domain,
      config: this.config
    })

    try {
      // Initialize browser if not already done
      await this.initBrowser()

      // ============================================================
      // PHASE 1: DISCOVERY - Crawl domain to discover URLs
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
        source: ScraperType.PLAYWRIGHT
      })

      permanentLogger.info(LogCategory.PLAYWRIGHT_V4, 'Starting URL discovery', { domain })

      // Discover URLs by crawling the domain
      const urls = await this.discoverUrls(domain, streamWriter)

      permanentLogger.info(LogCategory.PLAYWRIGHT_V4, 'URLs discovered', {
        domain,
        count: urls.length,
        sampleUrls: urls.slice(0, 3)
      })

      // Send discovery complete event
      await this.sendProgress(streamWriter, {
        type: ProgressEventType.URL_DISCOVERED,
        phase: ScrapingPhase.DISCOVERY,
        current: urls.length,
        total: urls.length,
        percentage: 100,
        message: `Found ${urls.length} URLs to scrape`,
        metadata: {
          urls: urls.slice(0, 10),
          totalFound: urls.length
        },
        timestamp: Date.now(),
        source: ScraperType.PLAYWRIGHT
      })

      // Fail fast if no URLs found
      if (urls.length === 0) {
        throw new Error('No URLs found on domain')
      }

      // ============================================================
      // PHASE 2: SCRAPING with real browser events
      // ============================================================
      permanentLogger.breadcrumb('scraping_start', 'Starting page scraping', {
        urlCount: urls.length
      })

      const dataMap = new Map<string, any>()
      let pagesScraped = 0
      let pagesFailed = 0
      let totalNetworkRequests = 0

      // Scrape each URL with real browser event tracking
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i]

        try {
          // Update progress before scraping each page
          await this.sendProgress(streamWriter, {
            type: ProgressEventType.SCRAPE_STARTED,
            phase: ScrapingPhase.SCRAPING,
            current: i,
            total: urls.length,
            percentage: Math.round((i / urls.length) * 100),
            message: `Scraping page ${i + 1} of ${urls.length}: ${url}`,
            metadata: { url, index: i },
            timestamp: Date.now(),
            source: ScraperType.PLAYWRIGHT
          })

          // Scrape the page with event tracking
          const result = await this.scrapePage(url, streamWriter)

          if (result.content) {
            dataMap.set(url, result)
            pagesScraped++
          } else {
            pagesFailed++
          }

          totalNetworkRequests += result.networkRequests || 0

          // Send page complete event
          await this.sendProgress(streamWriter, {
            type: ProgressEventType.PAGE_COMPLETE,
            phase: ScrapingPhase.SCRAPING,
            current: i + 1,
            total: urls.length,
            percentage: Math.round(((i + 1) / urls.length) * 100),
            message: `Completed page ${i + 1} of ${urls.length}`,
            metadata: {
              url,
              success: !!result.content,
              dataSize: result.content?.length || 0
            },
            timestamp: Date.now(),
            source: ScraperType.PLAYWRIGHT
          })

        } catch (pageError) {
          pagesFailed++
          permanentLogger.captureError(LogCategory.PLAYWRIGHT_V4, pageError as Error, {
            url,
            index: i
          })

          // Send error event for this page
          await this.sendProgress(streamWriter, {
            type: ProgressEventType.ERROR_OCCURRED,
            phase: ScrapingPhase.SCRAPING,
            current: i + 1,
            total: urls.length,
            percentage: Math.round(((i + 1) / urls.length) * 100),
            message: `Failed to scrape ${url}`,
            metadata: {
              url,
              error: (pageError as Error).message
            },
            timestamp: Date.now(),
            source: ScraperType.PLAYWRIGHT
          })
        }

        // Add delay between pages to avoid rate limiting
        if (i < urls.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      // Calculate final metrics
      const completedAt = Date.now()
      const metrics: ScrapingMetrics = {
        pagesScraped,
        pagesFailed,
        duration: completedAt - startTime,
        creditsUsed: 0, // Playwright is free
        costEstimate: 0, // No cost
        networkRequests: totalNetworkRequests,
        dataSize: Array.from(dataMap.values())
          .reduce((size, data) => size + JSON.stringify(data).length, 0),
        startedAt: startTime,
        completedAt
      }

      // Send completion event
      await this.sendProgress(streamWriter, {
        type: ProgressEventType.PAGE_COMPLETE,
        phase: ScrapingPhase.COMPLETE,
        current: pagesScraped,
        total: urls.length,
        percentage: 100,
        message: `Completed: ${pagesScraped} pages scraped successfully`,
        metadata: metrics,
        timestamp: Date.now(),
        source: ScraperType.PLAYWRIGHT
      })

      timer.stop()

      permanentLogger.info(LogCategory.PLAYWRIGHT_V4, 'Scraping complete', {
        domain,
        pagesScraped,
        pagesFailed,
        duration: metrics.duration,
        networkRequests: totalNetworkRequests
      })

      return {
        success: true,
        domain,
        scraperType: ScraperType.PLAYWRIGHT,
        data: dataMap,
        metrics
      }

    } catch (error) {
      timer.stop()
      const jsError = error instanceof Error ? error : new Error(String(error))

      permanentLogger.captureError(LogCategory.PLAYWRIGHT_V4, jsError, {
        domain,
        config: this.config
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
        source: ScraperType.PLAYWRIGHT
      })

      return {
        success: false,
        domain,
        scraperType: ScraperType.PLAYWRIGHT,
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
    } finally {
      // Clean up browser resources
      await this.cleanup()
    }
  }

  /**
   * Initializes browser instance with stealth settings
   * @private
   */
  private async initBrowser(): Promise<void> {
    if (this.browser) return

    const timer = permanentLogger.timing('playwright_init')

    try {
      // Launch browser with stealth settings
      this.browser = await chromium.launch({
        headless: true, // Always headless in production
        args: this.config.stealth ? [
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process',
          '--disable-site-isolation-trials',
          '--disable-web-security',
          '--disable-features=BlockInsecurePrivateNetworkRequests'
        ] : []
      })

      // Create context with stealth options
      this.context = await this.browser.newContext({
        viewport: this.config.viewport,
        userAgent: this.config.userAgent,
        ignoreHTTPSErrors: true,
        extraHTTPHeaders: this.config.headers
      })

      // Add stealth scripts if enabled
      if (this.config.stealth) {
        await this.context.addInitScript(() => {
          // Hide webdriver property
          Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined
          })

          // Hide automation indicators
          Object.defineProperty(navigator, 'plugins', {
            get: () => [1, 2, 3, 4, 5]
          })
        })
      }

      timer.stop()

      permanentLogger.info(LogCategory.PLAYWRIGHT_V4, 'Browser initialized', {
        stealth: this.config.stealth,
        viewport: this.config.viewport
      })

    } catch (error) {
      timer.stop()
      permanentLogger.captureError(LogCategory.PLAYWRIGHT_V4, error as Error, {
        phase: 'browser_init'
      })
      throw error
    }
  }

  /**
   * Discovers URLs on a domain by crawling
   * @private
   * @param {string} domain - Domain to crawl
   * @param {StreamWriter} streamWriter - Stream for progress updates
   * @returns {Promise<string[]>} Discovered URLs
   */
  private async discoverUrls(
    domain: string,
    streamWriter: StreamWriter
  ): Promise<string[]> {
    if (!this.context) throw new Error('Browser not initialized')

    const page = await this.context.newPage()
    const discoveredUrls = new Set<string>()
    const visitedUrls = new Set<string>()
    const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`

    try {
      // Set up request interception to track discovery
      let requestCount = 0
      page.on('request', (request: Request) => {
        requestCount++
        if (requestCount % 10 === 0) {
          permanentLogger.breadcrumb('discovery_progress', 'Discovery in progress', {
            requestCount,
            discoveredCount: discoveredUrls.size
          })
        }
      })

      // Navigate to the main page
      // IMPORTANT: Use 'networkidle' to wait for JavaScript/React to finish rendering links
      await page.goto(baseUrl, {
        waitUntil: 'networkidle',
        timeout: this.config.timeout
      })

      // ALWAYS include the homepage first (critical fix)
      discoveredUrls.add(normalizeUrl(baseUrl))

      // Extract all links from the page
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]'))
          .map(a => (a as HTMLAnchorElement).href)
          .filter(href => href && href.startsWith('http'))
      })

      // Get base domain for comparison using shared utility
      const baseDomain = extractDomain(baseUrl)

      // Filter links to same domain using shared utilities
      const sameDomainLinks = links.filter(link => {
        try {
          const linkDomain = extractDomain(link)
          return linkDomain === baseDomain
        } catch (error) {
          // Log invalid URL but continue processing
          permanentLogger.debug('PLAYWRIGHT_V4', 'Invalid URL found during discovery', {
            link,
            baseUrl,
            error: error instanceof Error ? error.message : String(error)
          })
          return false
        }
      })

      // Add discovered URLs with normalization for deduplication
      sameDomainLinks.forEach(url => discoveredUrls.add(normalizeUrl(url)))

      // Limit to maxPages
      const urls = Array.from(discoveredUrls).slice(0, this.config.maxPages)

      permanentLogger.info(LogCategory.PLAYWRIGHT_V4, 'URL discovery complete', {
        domain,
        baseDomain,
        totalFound: discoveredUrls.size,
        totalExtracted: links.length,
        sameDomainFiltered: sameDomainLinks.length,
        limited: urls.length,
        sampleUrls: urls.slice(0, 3)
      })

      return urls

    } finally {
      await page.close()
    }
  }

  /**
   * Scrapes a single page with real browser event tracking
   * @private
   * @param {string} url - URL to scrape
   * @param {StreamWriter} streamWriter - Stream for progress updates
   * @returns {Promise<any>} Scraped page data
   */
  private async scrapePage(
    url: string,
    streamWriter: StreamWriter
  ): Promise<any> {
    if (!this.context) throw new Error('Browser not initialized')

    const page = await this.context.newPage()
    const pageTimer = permanentLogger.timing('playwright_page_scrape', { url })

    let networkRequests = 0
    let networkResponses = 0

    try {
      // Set up REAL browser event listeners
      page.on('request', (request: Request) => {
        networkRequests++
        // Send network activity event
        this.sendPageEvent(streamWriter, {
          type: 'request',
          url: request.url(),
          method: request.method(),
          timestamp: Date.now()
        })
      })

      page.on('response', (response: Response) => {
        networkResponses++
        // Send network response event
        this.sendPageEvent(streamWriter, {
          type: 'response',
          url: response.url(),
          status: response.status(),
          timestamp: Date.now()
        })
      })

      page.on('domcontentloaded', () => {
        // Send DOM ready event
        this.sendPageEvent(streamWriter, {
          type: 'domcontentloaded',
          url,
          timestamp: Date.now()
        })
      })

      page.on('load', () => {
        // Send page loaded event
        this.sendPageEvent(streamWriter, {
          type: 'load',
          url,
          timestamp: Date.now()
        })
      })

      page.on('pageerror', (error: Error) => {
        permanentLogger.captureError(LogCategory.PLAYWRIGHT_V4, error, {
          url,
          phase: 'page_error'
        })
      })

      // Navigate to the page
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: this.config.timeout
      })

      // Wait for specific selector if configured
      if (this.config.waitForSelector) {
        await page.waitForSelector(this.config.waitForSelector, {
          timeout: 5000
        }).catch(() => {
          permanentLogger.warn(LogCategory.PLAYWRIGHT_V4, 'Selector not found', {
            url,
            selector: this.config.waitForSelector
          })
        })
      }

      // Extract page content
      const title = await page.title()
      const content = await page.evaluate(() => {
        // Remove script and style elements
        const scripts = document.querySelectorAll('script, style')
        scripts.forEach(el => el.remove())
        return document.body?.innerText || ''
      })

      // Extract links if requested
      let links: string[] = []
      if (this.config.formats?.includes('links')) {
        links = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('a[href]'))
            .map(a => (a as HTMLAnchorElement).href)
            .filter(href => href && href.startsWith('http'))
        })
      }

      // Take screenshot if requested
      let screenshot: string | undefined
      if (this.config.formats?.includes('screenshot')) {
        const screenshotBuffer = await page.screenshot({
          fullPage: true
        })
        screenshot = screenshotBuffer.toString('base64')
      }

      pageTimer.stop()

      permanentLogger.info(LogCategory.PLAYWRIGHT_V4, 'Page scraped', {
        url,
        contentLength: content.length,
        linkCount: links.length,
        networkRequests,
        networkResponses
      })

      return {
        url,
        title,
        content,
        links,
        screenshot,
        networkRequests,
        metadata: {
          scrapedAt: new Date().toISOString(),
          contentLength: content.length
        }
      }

    } catch (error) {
      pageTimer.stop()
      permanentLogger.captureError(LogCategory.PLAYWRIGHT_V4, error as Error, {
        url,
        phase: 'page_scrape'
      })
      throw error
    } finally {
      await page.close()
    }
  }

  /**
   * Sends page event via SSE stream (non-blocking)
   * @private
   */
  private sendPageEvent(
    streamWriter: StreamWriter,
    event: PlaywrightPageEvent
  ): void {
    // Send event asynchronously to avoid blocking browser
    setImmediate(() => {
      streamWriter.sendEvent(EventFactory.data(event, {
        source: 'playwright',
        type: 'page_event'
      })).catch(error => {
        permanentLogger.debug(LogCategory.STREAM_V4, 'Failed to send page event', {
          eventType: event.type
        })
      })
    })
  }

  /**
   * Sends progress update via SSE stream
   * @private
   */
  private async sendProgress(
    streamWriter: StreamWriter,
    update: ProgressUpdate
  ): Promise<void> {
    try {
      const event = EventFactory.progress(
        update.current,
        update.total,
        update.message,
        {
          ...update.metadata,
          phase: update.phase,
          type: update.type,
          scraperType: ScraperType.PLAYWRIGHT,
          timestamp: update.timestamp
        }
      )

      await streamWriter.sendEvent(event)

    } catch (error) {
      permanentLogger.captureError(LogCategory.STREAM_V4, error as Error, {
        updateType: update.type,
        phase: update.phase
      })
    }
  }

  /**
   * Cleans up browser resources
   * @private
   */
  private async cleanup(): Promise<void> {
    try {
      if (this.context) {
        await this.context.close()
        this.context = null
      }

      if (this.browser) {
        await this.browser.close()
        this.browser = null
      }

      permanentLogger.info(LogCategory.PLAYWRIGHT_V4, 'Browser cleaned up')

    } catch (error) {
      permanentLogger.captureError(LogCategory.PLAYWRIGHT_V4, error as Error, {
        phase: 'cleanup'
      })
    }
  }

  /**
   * Gets current configuration
   * @returns {StreamingScraperConfig} Current configuration
   */
  public getConfig(): StreamingScraperConfig {
    return { ...this.config }
  }

  /**
   * Estimates cost for scraping (always 0 for Playwright)
   * @returns {number} 0 (Playwright is free)
   */
  public estimateCost(pageCount: number): number {
    return 0 // Playwright is free
  }
}