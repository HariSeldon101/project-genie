/**
 * Puppeteer Browser Pool
 * Manages browser instances efficiently for PDF generation
 *
 * CRITICAL PERFORMANCE FIX:
 * Before: Launching new browser for EVERY PDF (200MB+ per instance)
 * After: Reusing 1-2 browser instances for ALL PDFs
 *
 * This dramatically reduces CPU and memory usage
 */

import puppeteer, { Browser } from 'puppeteer'
import { permanentLogger } from '@/lib/utils/permanent-logger'

/**
 * Browser pool configuration
 */
interface BrowserPoolConfig {
  maxBrowsers?: number
  idleTimeoutMs?: number
  launchOptions?: puppeteer.PuppeteerLaunchOptions
}

/**
 * Browser pool statistics for monitoring
 */
interface PoolStats {
  activeBrowsers: number
  totalPDFsGenerated: number
  browserLaunches: number
  lastActivityTime: number
  memoryEstimateMB: number
}

/**
 * Singleton browser pool for Puppeteer
 * Manages browser lifecycle efficiently
 */
class PuppeteerBrowserPool {
  private static instance: PuppeteerBrowserPool
  private browser: Browser | null = null
  private lastActivityTime: number = 0
  private cleanupTimer: NodeJS.Timeout | null = null
  private isClosing: boolean = false
  private totalPDFsGenerated: number = 0
  private browserLaunches: number = 0

  // Configuration
  private readonly maxBrowsers = 1 // Usually 1 is enough for PDF generation
  private readonly idleTimeoutMs = 60000 // 1 minute idle timeout
  private readonly launchOptions: puppeteer.PuppeteerLaunchOptions = {
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--deterministic-fetch',
      '--disable-blink-features=AutomationControlled',
      '--memory-pressure-off',
      '--max_old_space_size=4096'
    ]
  }

  /**
   * Private constructor for singleton pattern
   */
  private constructor(config?: BrowserPoolConfig) {
    if (config?.maxBrowsers) this.maxBrowsers = config.maxBrowsers
    if (config?.idleTimeoutMs) this.idleTimeoutMs = config.idleTimeoutMs
    if (config?.launchOptions) {
      this.launchOptions = { ...this.launchOptions, ...config.launchOptions }
    }

    permanentLogger.info('BROWSER_POOL', 'Browser pool initialized', {
      maxBrowsers: this.maxBrowsers,
      idleTimeoutMs: this.idleTimeoutMs
    })

    // Register cleanup on process exit
    this.registerCleanupHandlers()
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: BrowserPoolConfig): PuppeteerBrowserPool {
    if (!PuppeteerBrowserPool.instance) {
      PuppeteerBrowserPool.instance = new PuppeteerBrowserPool(config)
    }
    return PuppeteerBrowserPool.instance
  }

  /**
   * Get or create a browser instance
   * Reuses existing browser if available
   */
  async getBrowser(): Promise<Browser> {
    const startTime = performance.now()
    this.lastActivityTime = Date.now()

    // Clear any existing cleanup timer
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer)
      this.cleanupTimer = null
    }

    try {
      // Return existing browser if connected
      if (this.browser && this.browser.isConnected() && !this.isClosing) {
        permanentLogger.breadcrumb('BROWSER_POOL', 'Reusing existing browser', {
          pdfCount: this.totalPDFsGenerated,
          uptime: Date.now() - this.lastActivityTime
        })

        // Schedule cleanup after idle timeout
        this.scheduleCleanup()

        return this.browser
      }

      // Launch new browser
      permanentLogger.info('BROWSER_POOL', 'Launching new browser instance', {
        reason: this.browser ? 'disconnected' : 'first-launch',
        browserLaunches: this.browserLaunches + 1
      })

      this.browserLaunches++
      this.browser = await puppeteer.launch(this.launchOptions)

      // Monitor browser events
      this.browser.on('disconnected', () => {
        permanentLogger.warn('BROWSER_POOL', 'Browser disconnected', {
          pdfCount: this.totalPDFsGenerated
        })
        this.browser = null
      })

      const duration = performance.now() - startTime
      permanentLogger.timing('browser_pool_launch', {
        duration,
        browserLaunches: this.browserLaunches
      })

      // Schedule cleanup after idle timeout
      this.scheduleCleanup()

      return this.browser
    } catch (error) {
      permanentLogger.captureError('BROWSER_POOL', error as Error, {
        operation: 'getBrowser',
        duration: performance.now() - startTime
      })

      this.browser = null
      throw error
    }
  }

  /**
   * Create a new page for PDF generation
   * Pages are isolated and should be closed after use
   */
  async createPage() {
    const browser = await this.getBrowser()
    const page = await browser.newPage()

    this.totalPDFsGenerated++

    permanentLogger.breadcrumb('BROWSER_POOL', 'Page created for PDF', {
      totalPDFs: this.totalPDFsGenerated,
      activeBrowsers: this.browser ? 1 : 0
    })

    return page
  }

  /**
   * Schedule browser cleanup after idle timeout
   */
  private scheduleCleanup() {
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer)
    }

    this.cleanupTimer = setTimeout(async () => {
      await this.cleanup()
    }, this.idleTimeoutMs)
  }

  /**
   * Clean up idle browser
   */
  private async cleanup() {
    if (!this.browser || this.isClosing) return

    const idleTime = Date.now() - this.lastActivityTime

    if (idleTime >= this.idleTimeoutMs) {
      permanentLogger.info('BROWSER_POOL', 'Cleaning up idle browser', {
        idleTimeMs: idleTime,
        totalPDFs: this.totalPDFsGenerated
      })

      await this.closeBrowser()
    }
  }

  /**
   * Close browser instance
   */
  private async closeBrowser() {
    if (!this.browser || this.isClosing) return

    this.isClosing = true

    try {
      await this.browser.close()

      permanentLogger.info('BROWSER_POOL', 'Browser closed successfully', {
        totalPDFs: this.totalPDFsGenerated,
        uptime: Date.now() - this.lastActivityTime
      })
    } catch (error) {
      permanentLogger.captureError('BROWSER_POOL', error as Error, {
        operation: 'closeBrowser'
      })
    } finally {
      this.browser = null
      this.isClosing = false
    }
  }

  /**
   * Register cleanup handlers for process exit
   */
  private registerCleanupHandlers() {
    const cleanup = async () => {
      if (this.browser) {
        permanentLogger.info('BROWSER_POOL', 'Process exit cleanup', {
          totalPDFs: this.totalPDFsGenerated
        })
        await this.closeBrowser()
      }
    }

    process.on('exit', cleanup)
    process.on('SIGINT', cleanup)
    process.on('SIGTERM', cleanup)
    process.on('uncaughtException', cleanup)
  }

  /**
   * Force close all browsers (for testing or emergency)
   */
  async forceCleanup() {
    permanentLogger.info('BROWSER_POOL', 'Force cleanup requested', {
      activeBrowsers: this.browser ? 1 : 0
    })

    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer)
      this.cleanupTimer = null
    }

    await this.closeBrowser()
  }

  /**
   * Get pool statistics for monitoring
   */
  getStats(): PoolStats {
    return {
      activeBrowsers: this.browser && this.browser.isConnected() ? 1 : 0,
      totalPDFsGenerated: this.totalPDFsGenerated,
      browserLaunches: this.browserLaunches,
      lastActivityTime: this.lastActivityTime,
      memoryEstimateMB: this.browser ? 200 : 0 // Rough estimate
    }
  }
}

// Export singleton instance
export const puppeteerPool = PuppeteerBrowserPool.getInstance()

// Export type for testing
export type { PuppeteerBrowserPool }