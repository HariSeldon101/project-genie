/**
 * Dynamic Scraper Plugin
 *
 * Handles JavaScript-heavy websites using Playwright.
 * Best for SPAs, React apps, and dynamic content.
 *
 * Features:
 * - Full browser rendering with Playwright
 * - JavaScript execution support
 * - Wait for dynamic content
 * - Screenshot capability
 *
 * @module plugins/dynamic
 */

import { chromium, type Browser, type Page } from 'playwright'
import { BaseScraper } from '../../base/base-scraper'
import { ExtractorPipeline } from '../../extractors/extractor-pipeline'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import type {
  ScraperConfig,
  ScraperOptions,
  PageResult
} from '../../core/types'

/**
 * Dynamic scraper plugin
 * Uses Playwright for JavaScript rendering and dynamic content
 */
export default class DynamicScraperPlugin extends BaseScraper {
  /**
   * Plugin configuration
   */
  readonly config: ScraperConfig = {
    id: 'dynamic-scraper',
    name: 'Dynamic JavaScript Scraper',
    strategy: 'dynamic',
    priority: 70, // Higher priority for known SPAs
    timeout: 60000, // Longer timeout for browser operations
    maxRetries: 2, // Fewer retries due to resource intensity
    speed: 'medium',
    requiresBrowser: true,
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

  private browser?: Browser
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
   * Initialize browser on plugin initialization
   */
  protected async onInitialize(): Promise<void> {
    try {
      permanentLogger.info('DYNAMIC_SCRAPER', 'Launching browser', {
        headless: true,
        timeout: this.config.timeout
      })

      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      })

      permanentLogger.breadcrumb('browser_launched', 'Browser launched successfully')
    } catch (error) {
      permanentLogger.captureError('DYNAMIC_SCRAPER', error as Error, {
        phase: 'browser_launch'
      })
      throw error
    }
  }

  /**
   * Close browser on cleanup
   */
  protected async onCleanup(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close()
        this.browser = undefined
        permanentLogger.breadcrumb('browser_closed', 'Browser closed successfully')
      } catch (error) {
        permanentLogger.captureError('DYNAMIC_SCRAPER', error as Error, {
          phase: 'browser_cleanup'
        })
      }
    }
  }

  /**
   * Scrape pages using Playwright
   */
  protected async scrapePages(
    urls: string[],
    options?: ScraperOptions
  ): Promise<PageResult[]> {
    if (!this.browser) {
      throw new Error('Browser not initialized')
    }

    const results: PageResult[] = []

    permanentLogger.info('DYNAMIC_SCRAPER', 'Starting dynamic scraping', {
      urlCount: urls.length,
      timeout: this.config.timeout
    })

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i]

      // Report progress
      await this.context!.progressReporter.report({
        current: i,
        total: urls.length,
        message: `Rendering ${url} (dynamic)`,
        scraperId: this.config.id
      })

      const result = await this.scrapePage(url, options)
      results.push(result)

      // Add delay between pages
      if (i < urls.length - 1) {
        await this.delay(this.getDelayMs())
      }
    }

    return results
  }

  /**
   * Scrape a single page with Playwright
   */
  private async scrapePage(
    url: string,
    options?: ScraperOptions
  ): Promise<PageResult> {
    const timer = this.context!.performanceTracker.startTimer('dynamic_page_scrape')
    let page: Page | undefined

    permanentLogger.breadcrumb('render_page', 'Rendering page with browser', {
      url,
      scraperId: this.config.id
    })

    try {
      // Create new page
      page = await this.browser!.newPage()

      // Set viewport
      await page.setViewportSize({
        width: 1920,
        height: 1080
      })

      // Set user agent
      await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      })

      // Navigate to page
      const response = await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: this.config.timeout
      })

      if (!response) {
        throw new Error('No response received')
      }

      const statusCode = response.status()

      // Wait for content to load
      await this.waitForContent(page, options)

      // Get the rendered HTML
      const html = await page.content()

      // Take screenshot if requested
      if (options?.screenshot) {
        await this.takeScreenshot(page, url)
      }

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

      const duration = timer.stop()

      permanentLogger.info('DYNAMIC_SCRAPER', 'Page rendered successfully', {
        url,
        statusCode,
        contentLength: html.length,
        dataPoints: extractedData.summary?.totalDataPoints || 0,
        duration
      })

      return {
        url,
        success: true,
        statusCode,
        data: extractedData,
        duration,
        bytesDownloaded: html.length,
        timestamp: Date.now(),
        scraperId: this.config.id
      }
    } catch (error) {
      const duration = timer.stop()
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      permanentLogger.captureError('DYNAMIC_SCRAPER', error as Error, {
        url,
        phase: 'page_render'
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
    } finally {
      // Close the page
      if (page) {
        try {
          await page.close()
        } catch (error) {
          permanentLogger.captureError('DYNAMIC_SCRAPER', error as Error, {
            phase: 'page_close'
          })
        }
      }
    }
  }

  /**
   * Wait for dynamic content to load
   */
  private async waitForContent(page: Page, options?: ScraperOptions): Promise<void> {
    // Wait for common indicators of content loading
    const waitStrategies = [
      // Wait for main content areas
      async () => {
        try {
          await page.waitForSelector('main, article, [role="main"], #content, .content', {
            timeout: 5000
          })
        } catch {
          // Ignore if not found
        }
      },
      // Wait for body to have content
      async () => {
        await page.waitForFunction(
          () => document.body.innerText.length > 100,
          { timeout: 5000 }
        )
      },
      // Additional wait if specified
      async () => {
        if (options?.waitTime) {
          await page.waitForTimeout(options.waitTime)
        }
      }
    ]

    // Execute wait strategies
    await Promise.all(waitStrategies.map(strategy => strategy().catch(() => {})))

    permanentLogger.breadcrumb('content_loaded', 'Dynamic content loaded')
  }

  /**
   * Take a screenshot of the page
   */
  private async takeScreenshot(page: Page, url: string): Promise<void> {
    try {
      const timestamp = Date.now()
      const filename = `screenshot_${timestamp}.png`

      await page.screenshot({
        path: filename,
        fullPage: true
      })

      permanentLogger.breadcrumb('screenshot_taken', 'Screenshot captured', {
        url,
        filename
      })
    } catch (error) {
      permanentLogger.captureError('DYNAMIC_SCRAPER', error as Error, {
        phase: 'screenshot'
      })
    }
  }

  /**
   * Get delay between requests
   */
  private getDelayMs(): number {
    switch (this.config.speed) {
      case 'fast':
        return 500 // 500ms between pages
      case 'medium':
        return 1000 // 1 second between pages
      case 'slow':
        return 2000 // 2 seconds between pages
      default:
        return 1000
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
    if (message.includes('navigation')) return 'NAVIGATION_ERROR'
    if (message.includes('crash')) return 'BROWSER_CRASH'
    if (message.includes('memory')) return 'OUT_OF_MEMORY'
    if (message.includes('blocked')) return 'BLOCKED'

    return 'BROWSER_ERROR'
  }

  /**
   * Override canHandle to prefer dynamic scraper for SPAs
   */
  canHandle(url: string): boolean {
    // First check base implementation
    if (!super.canHandle(url)) {
      return false
    }

    // Prefer dynamic scraper for known SPA patterns
    const lower = url.toLowerCase()
    const spaPatterns = [
      'app.',
      'dashboard.',
      '/app/',
      '/dashboard/',
      'react',
      'angular',
      'vue',
      '#!',
      '#!/'
    ]

    for (const pattern of spaPatterns) {
      if (lower.includes(pattern)) {
        permanentLogger.breadcrumb('dynamic_preferred', 'SPA pattern detected', {
          url,
          pattern
        })
        return true
      }
    }

    return true
  }

  /**
   * Override estimate time for browser operations
   */
  estimateTime(urlCount: number): number {
    // Browser operations are slower
    const timePerUrl = 5000 // 5 seconds per URL
    return urlCount * timePerUrl
  }

  /**
   * Custom metadata for dynamic scraper
   */
  protected async getMetadata(): Promise<Record<string, any>> {
    return {
      browserEngine: 'chromium',
      extractorVersion: '1.0.0',
      supportsJavaScript: true,
      supportsScreenshots: true,
      headless: true
    }
  }
}