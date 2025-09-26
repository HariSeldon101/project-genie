/**
 * Playwright Scraper - Browser automation with native anti-detection
 *
 * Uses Playwright's built-in anti-detection features through standard API options.
 * No external plugins required - all functionality is native to Playwright.
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright'
import type { PlaywrightConfig } from '../config/playwright.config'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { StreamWriter, EventFactory, EventSource } from '@/lib/realtime-events'

export interface PlaywrightResult {
  url: string
  content?: string
  screenshot?: Buffer
  pdf?: Buffer
  cookies?: any[]
  localStorage?: Record<string, string>
  error?: string
  creditsUsed: number  // Always 0 for Playwright (free open-source)
}

export class PlaywrightScraper {
  private browser: Browser | null = null
  private context: BrowserContext | null = null

  constructor(private config: PlaywrightConfig) {
    permanentLogger.info('PLAYWRIGHT_SCRAPER', 'Initialized', {
      headless: config.browser.headless,
      stealthEnabled: config.stealth?.enabled ?? false
    })
  }

  async scrape(urls: string[], streamWriter: StreamWriter | null = null): Promise<PlaywrightResult[]> {
    const timer = permanentLogger.timing('playwright_batch_scrape', { urlCount: urls.length })
    await this.initBrowser()

    permanentLogger.info('PLAYWRIGHT_SCRAPER', 'Starting scrape', { urlCount: urls.length })

    const results: PlaywrightResult[] = []

    for (const url of urls) {
      // Use proper SSE event pattern
      if (streamWriter) {
        await streamWriter.sendEvent(EventFactory.status('scraping', `Scraping ${url}`, {
          source: EventSource.SCRAPER,
          metadata: {
            scraper: 'playwright',
            url,
            phase: 'scraping'
          }
        }))
      }

      results.push(await this.scrapePage(url))

      // Human-like delay between pages if configured
      if (this.config.stealth?.behavior?.randomizeDelays) {
        const [min, max] = this.config.stealth.behavior.delayRange || [0, 0]
        await new Promise(r => setTimeout(r, min + Math.random() * (max - min)))
      }
    }

    const duration = timer.stop()
    permanentLogger.info('PLAYWRIGHT_SCRAPER', 'Scrape complete', {
      urlCount: urls.length,
      duration,
      errorCount: results.filter(r => r.error).length
    })

    return results
  }

  private async initBrowser(): Promise<void> {
    if (this.browser) return

    try {
      // Launch browser with native anti-detection options
      this.browser = await chromium.launch({
        headless: this.config.browser.headless,
        args: this.getBrowserArgs()
      })

      // Create context with native anti-detection settings
      this.context = await this.browser.newContext(this.getContextOptions())

      // Optional: Hide webdriver property using native addInitScript
      if (this.config.stealth?.enabled && this.config.stealth?.fingerprint?.hideWebdriver) {
        await this.context.addInitScript(() => {
          // Simple webdriver property removal
          delete (navigator as any).__proto__.webdriver

          // Optional: Define it as undefined for extra stealth
          Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined
          })
        })
      }

      permanentLogger.info('PLAYWRIGHT_SCRAPER', 'Browser initialized', {
        mode: 'native',
        stealthEnabled: this.config.stealth?.enabled ?? false,
        features: {
          viewport: this.config.stealth?.fingerprint?.randomizeViewport ?? false,
          userAgent: this.config.stealth?.fingerprint?.randomizeUserAgent ?? false,
          webdriverHidden: this.config.stealth?.fingerprint?.hideWebdriver ?? false
        }
      })
    } catch (error) {
      permanentLogger.captureError('PLAYWRIGHT_SCRAPER', error as Error, {
        stage: 'browser_init'
      })
      throw error
    }
  }

  private getBrowserArgs(): string[] {
    const baseArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]

    // Add anti-detection args if stealth is enabled
    if (this.config.stealth?.enabled) {
      return [
        ...baseArgs,
        '--disable-blink-features=AutomationControlled',
        '--exclude-switches=enable-automation',
        '--disable-infobars',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-web-security',
        '--disable-gpu',
        '--disable-accelerated-2d-canvas',
        '--window-size=1920,1080',
        '--start-maximized'
      ]
    }

    return this.config.browser.args || baseArgs
  }

  private getContextOptions(): any {
    const options: any = {}

    if (!this.config.stealth?.enabled) {
      return options
    }

    // Viewport randomization using native viewport option
    if (this.config.stealth.fingerprint?.randomizeViewport) {
      options.viewport = this.getRandomViewport()
    }

    // User agent randomization using native userAgent option
    if (this.config.stealth.fingerprint?.randomizeUserAgent) {
      options.userAgent = this.getRandomUserAgent()
    }

    // Timezone and locale using native options
    if (this.config.stealth.session?.timezone) {
      options.timezoneId = this.config.stealth.session.timezone
    }
    if (this.config.stealth.session?.locale) {
      options.locale = this.config.stealth.session.locale
    }

    // Geolocation using native option
    if (this.config.stealth.session?.geolocation) {
      options.geolocation = this.config.stealth.session.geolocation
      options.permissions = ['geolocation']
    }

    return options
  }

  private getRandomViewport(): { width: number; height: number } {
    const range = this.config.stealth?.fingerprint?.viewportRange || {
      width: [1280, 1920],
      height: [720, 1080]
    }
    return {
      width: Math.floor(range.width[0] + Math.random() * (range.width[1] - range.width[0])),
      height: Math.floor(range.height[0] + Math.random() * (range.height[1] - range.height[0]))
    }
  }

  private getRandomUserAgent(): string {
    const agents = this.config.stealth?.fingerprint?.userAgentList || [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
    ]
    return agents[Math.floor(Math.random() * agents.length)]
  }

  private async scrapePage(url: string): Promise<PlaywrightResult> {
    const page = await this.context!.newPage()

    try {
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: this.config.limits?.navigationTimeout || 30000
      })

      // Simple human behavior if configured
      if (this.config.stealth?.behavior?.humanizeMouseMovement) {
        await page.mouse.move(
          100 + Math.random() * 700,
          100 + Math.random() * 500,
          { steps: 10 }
        )
      }

      // Get content and optional features
      const content = await page.content()
      const screenshot = this.config.features?.screenshots ?
        await page.screenshot({ fullPage: true }) : undefined
      const pdf = this.config.features?.pdf ?
        await page.pdf({ format: 'A4' }) : undefined
      const cookies = this.config.stealth?.session?.persistCookies ?
        await this.context!.cookies() : undefined

      return { url, content, screenshot, pdf, cookies, creditsUsed: 0 }

    } catch (error) {
      permanentLogger.captureError('PLAYWRIGHT_SCRAPER', error as Error, { url })
      return {
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
        creditsUsed: 0
      }
    } finally {
      await page.close()
    }
  }

  async close(): Promise<void> {
    if (this.context) await this.context.close()
    if (this.browser) await this.browser.close()
    permanentLogger.info('PLAYWRIGHT_SCRAPER', 'Browser closed')
  }
}