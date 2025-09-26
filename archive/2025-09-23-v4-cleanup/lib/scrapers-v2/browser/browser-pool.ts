/**
 * Browser Pool Manager
 * 
 * Manages a pool of Playwright browser instances for efficient resource usage
 * in serverless and long-running environments. Provides automatic cleanup,
 * health checks, and connection pooling.
 * 
 * Features:
 * - Singleton pattern for global browser instance
 * - Automatic idle cleanup after timeout
 * - Health checks for browser connectivity
 * - Context limit monitoring
 * - Graceful shutdown handling
 * 
 * @module browser-pool
 */

import { chromium, Browser } from 'playwright'
import { permanentLogger } from '../../../utils/permanent-logger'

// Module-level singleton instance
let globalBrowserPool: BrowserPool | null = null

/**
 * Configuration for browser pool
 */
interface BrowserPoolConfig {
  /** Idle timeout in milliseconds before auto-cleanup */
  idleTimeout?: number
  /** Maximum number of contexts before forcing cleanup */
  maxContexts?: number
  /** Browser launch timeout in milliseconds */
  launchTimeout?: number
  /** Enable debug logging */
  debug?: boolean
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<BrowserPoolConfig> = {
  idleTimeout: 60000,      // 1 minute
  maxContexts: 10,          // Max contexts before cleanup
  launchTimeout: 15000,     // 15 seconds
  debug: false
}

/**
 * Browser launch arguments optimized for serverless environments
 */
const BROWSER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--no-first-run',
  '--no-zygote',
  '--disable-gpu',
  '--disable-features=IsolateOrigins,site-per-process',
  '--deterministic-fetch',
  '--disable-blink-features=AutomationControlled',
  '--memory-pressure-off',
  '--max_old_space_size=4096'
]

/**
 * Browser Pool for managing Playwright browser instances
 * 
 * Provides efficient browser instance reuse with automatic cleanup
 * and health monitoring. Uses singleton pattern to ensure only one
 * browser instance exists globally.
 */
export class BrowserPool {
  private browser: Browser | null = null
  private lastUsed: number = 0
  private cleanupTimer: NodeJS.Timeout | null = null
  private isClosing: boolean = false
  private cleanupHandlersRegistered: boolean = false
  private config: Required<BrowserPoolConfig>

  /**
   * Private constructor - use getInstance() instead
   */
  private constructor(config?: BrowserPoolConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Get singleton instance of BrowserPool
   * 
   * @param config - Optional configuration (only used on first call)
   * @returns BrowserPool singleton instance
   */
  static getInstance(config?: BrowserPoolConfig): BrowserPool {
    if (!globalBrowserPool) {
      globalBrowserPool = new BrowserPool(config)
    }
    return globalBrowserPool
  }

  /**
   * Reset the global instance (mainly for testing)
   */
  static async reset(): Promise<void> {
    if (globalBrowserPool) {
      await globalBrowserPool.cleanup()
      globalBrowserPool = null
    }
  }

  /**
   * Register process cleanup handlers
   * Only registers once when browser is actually created
   */
  private registerCleanupHandlers(): void {
    if (this.cleanupHandlersRegistered) return
    
    this.cleanupHandlersRegistered = true
    
    // Cleanup on process exit
    process.once('exit', () => {
      globalBrowserPool?.cleanup().catch(() => {})
    })
    
    // Cleanup on SIGINT (Ctrl+C)
    process.once('SIGINT', () => {
      globalBrowserPool?.cleanup().then(() => process.exit(0))
    })
    
    // Cleanup on SIGTERM
    process.once('SIGTERM', () => {
      globalBrowserPool?.cleanup().then(() => process.exit(0))
    })
  }

  /**
   * Check browser health and connectivity
   * 
   * @returns true if browser is healthy, false otherwise
   */
  private async checkBrowserHealth(): Promise<boolean> {
    if (!this.browser) return false
    
    try {
      // Test browser connectivity
      const contexts = this.browser.contexts()
      
      // Check for context overload
      if (contexts.length > this.config.maxContexts) {
        permanentLogger.warn('BROWSER_POOL', 'Browser has too many contexts', { 
          contextCount: contexts.length,
          maxContexts: this.config.maxContexts
        })
        return false
      }
      
      // Check connection status
      if (!this.browser.isConnected()) {
        permanentLogger.warn('BROWSER_POOL', 'Browser is disconnected')
        return false
      }
      
      if (this.config.debug) {
        permanentLogger.info('BROWSER_POOL', '✅ Browser health check passed', {
          contextCount: contexts.length
        })
      }
      
      return true
    } catch (error) {
      permanentLogger.warn('BROWSER_POOL', 'Browser health check failed', error)
      return false
    }
  }

  /**
   * Get or create a browser instance
   * 
   * @returns Browser instance ready for use
   * @throws Error if browser cannot be launched or pool is closing
   */
  async getBrowser(): Promise<Browser> {
    this.lastUsed = Date.now()
    
    // Check if pool is closing
    if (this.isClosing) {
      throw new Error('Browser pool is closing')
    }
    
    // Check existing browser health
    if (this.browser && await this.checkBrowserHealth()) {
      this.resetCleanupTimer()
      return this.browser
    }
    
    // Clean up unhealthy browser
    if (this.browser) {
      await this.cleanup()
      this.browser = null
    }
    
    // Launch new browser instance
    permanentLogger.info('BROWSER_POOL', 'Launching new browser instance')
    
    // Register cleanup handlers
    this.registerCleanupHandlers()
    
    try {
      this.browser = await chromium.launch({
        headless: true,
        args: BROWSER_ARGS,
        timeout: this.config.launchTimeout
      })
      
      permanentLogger.info('BROWSER_POOL', '✅ Browser instance launched successfully')
    } catch (error) {
      permanentLogger.captureError('BROWSER_POOL', new Error('Failed to launch browser'), error)
      throw new Error(`Failed to launch browser: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    
    this.resetCleanupTimer()
    return this.browser
  }

  /**
   * Reset the idle cleanup timer
   * Automatically cleans up browser after idle timeout
   */
  private resetCleanupTimer(): void {
    // Clear existing timer
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer)
    }
    
    // Set new cleanup timer
    this.cleanupTimer = setTimeout(() => {
      permanentLogger.info('BROWSER_POOL', '⏱️ Auto-cleanup triggered after idle timeout', {
        idleTimeout: this.config.idleTimeout
      })
      this.cleanup().catch(error => {
        permanentLogger.captureError('BROWSER_POOL', new Error('Auto-cleanup failed'), error)
      })
    }, this.config.idleTimeout)
  }

  /**
   * Clean up browser instance and resources
   * 
   * Closes all pages, contexts, and the browser instance.
   * Safe to call multiple times.
   */
  async cleanup(): Promise<void> {
    this.isClosing = true
    
    // Clear cleanup timer
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer)
      this.cleanupTimer = null
    }
    
    // Clean up browser
    if (this.browser) {
      permanentLogger.info('BROWSER_POOL', 'Closing browser instance')
      
      try {
        // Close all pages and contexts
        const contexts = this.browser.contexts()
        for (const context of contexts) {
          const pages = context.pages()
          for (const page of pages) {
            await page.close().catch(() => {})
          }
          await context.close().catch(() => {})
        }
        
        // Close browser
        await this.browser.close()
        permanentLogger.info('BROWSER_POOL', '✅ Browser instance closed successfully')
      } catch (error) {
        permanentLogger.captureError('BROWSER_POOL', new Error('Error closing browser'), error)
      }
      
      this.browser = null
    }
    
    this.isClosing = false
  }

  /**
   * Get current pool statistics
   * 
   * @returns Object with pool statistics
   */
  getStats(): {
    isActive: boolean
    contextCount: number
    lastUsed: number
    idleTime: number
  } {
    const now = Date.now()
    const contextCount = this.browser?.contexts()?.length ?? 0
    
    return {
      isActive: this.browser !== null && this.browser.isConnected(),
      contextCount,
      lastUsed: this.lastUsed,
      idleTime: this.lastUsed ? now - this.lastUsed : 0
    }
  }
}