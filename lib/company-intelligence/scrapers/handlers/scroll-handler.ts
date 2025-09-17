/**
 * Scroll Handler Module
 * 
 * Handles automatic scrolling for dynamic content loading.
 * Supports infinite scroll, lazy loading, and progressive content reveal.
 * 
 * Features:
 * - Auto-scroll with configurable speed
 * - Infinite scroll detection
 * - Content stabilization checks
 * - Viewport-based loading
 * - Scroll position restoration
 * 
 * @module scroll-handler
 */

import { Page } from 'playwright'
import { permanentLogger } from '../../../utils/permanent-logger'

/**
 * Configuration for scroll behavior
 */
export interface ScrollConfig {
  /** Distance to scroll in pixels per step */
  distance?: number
  /** Delay between scroll steps in milliseconds */
  delay?: number
  /** Maximum number of scroll attempts */
  maxScrolls?: number
  /** Wait time for content to load after scroll */
  waitAfterScroll?: number
  /** Whether to return to top after scrolling */
  returnToTop?: boolean
  /** Enable debug logging */
  debug?: boolean
}

/**
 * Default scroll configuration
 */
const DEFAULT_CONFIG: Required<ScrollConfig> = {
  distance: 500,
  delay: 200,
  maxScrolls: 10,
  waitAfterScroll: 500,
  returnToTop: true,
  debug: false
}

/**
 * Result of scroll operation
 */
export interface ScrollResult {
  /** Total pixels scrolled */
  totalScrolled: number
  /** Number of scroll iterations performed */
  scrollCount: number
  /** Whether reached bottom of page */
  reachedBottom: boolean
  /** New content detected during scroll */
  newContentDetected: boolean
}

/**
 * Scroll Handler for managing page scrolling
 */
export class ScrollHandler {
  private config: Required<ScrollConfig>

  constructor(config?: ScrollConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Perform automatic scrolling on a page
   * 
   * @param page - Playwright page instance
   * @returns Scroll operation results
   */
  async autoScroll(page: Page): Promise<ScrollResult> {
    if (this.config.debug) {
      permanentLogger.info('SCROLL_HANDLER', 'Starting auto-scroll', this.config)
    }

    const result = await page.evaluate(
      ({ distance, delay, maxScrolls, returnToTop }) => {
        return new Promise<ScrollResult>((resolve) => {
          let totalScrolled = 0
          let scrollCount = 0
          let lastHeight = document.body.scrollHeight
          let newContentDetected = false
          let reachedBottom = false

          const timer = setInterval(() => {
            const currentHeight = document.body.scrollHeight
            const viewportHeight = window.innerHeight
            const currentScroll = window.pageYOffset

            // Check if new content was loaded
            if (currentHeight > lastHeight) {
              newContentDetected = true
              lastHeight = currentHeight
            }

            // Perform scroll
            window.scrollBy(0, distance)
            totalScrolled += distance
            scrollCount++

            // Check if reached bottom
            if (currentScroll + viewportHeight >= currentHeight - 10) {
              reachedBottom = true
            }

            // Stop conditions
            if (reachedBottom || scrollCount >= maxScrolls) {
              clearInterval(timer)
              
              // Return to top if configured
              if (returnToTop) {
                window.scrollTo(0, 0)
              }

              resolve({
                totalScrolled,
                scrollCount,
                reachedBottom,
                newContentDetected
              })
            }
          }, delay)
        })
      },
      {
        distance: this.config.distance,
        delay: this.config.delay,
        maxScrolls: this.config.maxScrolls,
        returnToTop: this.config.returnToTop
      }
    )

    if (this.config.debug) {
      permanentLogger.info('SCROLL_HANDLER', 'Scroll completed', result)
    }

    // Wait for any final content to load
    if (this.config.waitAfterScroll > 0) {
      await page.waitForTimeout(this.config.waitAfterScroll)
    }

    return result
  }

  /**
   * Handle infinite scroll loading
   * Continuously scrolls until no new content is detected
   * 
   * @param page - Playwright page instance
   * @param maxAttempts - Maximum scroll attempts
   * @returns Total content loaded
   */
  async handleInfiniteScroll(
    page: Page,
    maxAttempts: number = 20
  ): Promise<{ itemsLoaded: number; scrollDepth: number }> {
    permanentLogger.info('SCROLL_HANDLER', 'Handling infinite scroll')

    let previousHeight = 0
    let attempts = 0
    let totalItemsLoaded = 0

    while (attempts < maxAttempts) {
      // Get current page height
      const currentHeight = await page.evaluate(() => document.body.scrollHeight)

      // Check if new content was loaded
      if (currentHeight === previousHeight) {
        // No new content, try one more scroll
        await this.scrollToBottom(page)
        await page.waitForTimeout(1000)

        const finalHeight = await page.evaluate(() => document.body.scrollHeight)
        if (finalHeight === currentHeight) {
          // Still no new content, we're done
          break
        }
      }

      // Count visible items (customize selector as needed)
      const itemCount = await page.evaluate(() => {
        // Try common item selectors
        const selectors = [
          'article',
          '.item',
          '.product',
          '.card',
          '[data-testid*="item"]',
          '.list-item'
        ]

        for (const selector of selectors) {
          const items = document.querySelectorAll(selector)
          if (items.length > 0) {
            return items.length
          }
        }
        return 0
      })

      totalItemsLoaded = Math.max(totalItemsLoaded, itemCount)

      // Scroll to load more
      await this.scrollToBottom(page)
      
      // Wait for content to load
      await page.waitForTimeout(this.config.waitAfterScroll)

      previousHeight = currentHeight
      attempts++

      if (this.config.debug) {
        permanentLogger.info('SCROLL_HANDLER', 'Infinite scroll progress', {
          attempt: attempts,
          height: currentHeight,
          items: itemCount
        })
      }
    }

    return {
      itemsLoaded: totalItemsLoaded,
      scrollDepth: previousHeight
    }
  }

  /**
   * Scroll to bottom of page
   * 
   * @param page - Playwright page instance
   */
  async scrollToBottom(page: Page): Promise<void> {
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight)
    })
  }

  /**
   * Scroll to top of page
   * 
   * @param page - Playwright page instance
   */
  async scrollToTop(page: Page): Promise<void> {
    await page.evaluate(() => {
      window.scrollTo(0, 0)
    })
  }

  /**
   * Scroll to specific element
   * 
   * @param page - Playwright page instance
   * @param selector - Element selector
   * @param options - Scroll behavior options
   */
  async scrollToElement(
    page: Page,
    selector: string,
    options?: { behavior?: 'auto' | 'smooth'; block?: 'start' | 'center' | 'end' }
  ): Promise<boolean> {
    return await page.evaluate(
      ({ selector, options }) => {
        const element = document.querySelector(selector)
        if (element) {
          element.scrollIntoView(options)
          return true
        }
        return false
      },
      { selector, options: options || { behavior: 'smooth', block: 'center' } }
    )
  }

  /**
   * Wait for scroll position to stabilize
   * Useful for detecting when async content has finished loading
   * 
   * @param page - Playwright page instance
   * @param timeout - Maximum wait time in milliseconds
   */
  async waitForScrollStable(page: Page, timeout: number = 3000): Promise<void> {
    const startTime = Date.now()
    let lastPosition = await page.evaluate(() => window.pageYOffset)

    while (Date.now() - startTime < timeout) {
      await page.waitForTimeout(100)
      const currentPosition = await page.evaluate(() => window.pageYOffset)
      
      if (currentPosition === lastPosition) {
        // Position stable for 100ms
        return
      }
      
      lastPosition = currentPosition
    }

    permanentLogger.warn('SCROLL_HANDLER', 'Scroll position did not stabilize within timeout')
  }
}