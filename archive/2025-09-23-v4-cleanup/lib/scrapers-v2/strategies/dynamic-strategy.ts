/**
 * Dynamic Website Strategy Module
 * 
 * Strategy for JavaScript-heavy websites that require client-side rendering.
 * Handles dynamic content loading, AJAX requests, and interactive elements.
 * 
 * Features:
 * - Full JavaScript execution
 * - Dynamic content waiting
 * - AJAX request handling
 * - Interactive element support
 * - Lazy loading detection
 * 
 * @module dynamic-strategy
 */

import { Page, BrowserContext } from 'playwright'
import { BaseStrategy, StrategyConfig, ScrapingResult } from './base-strategy'
import { ScrollHandler } from '../handlers/scroll-handler'
import { permanentLogger } from '../../../utils/permanent-logger'
import { socialMediaExtractor } from '../extractors/social-media-extractor'

/**
 * Dynamic website scraping strategy
 * 
 * Best for:
 * - JavaScript-heavy sites
 * - Sites with lazy loading
 * - Interactive web applications
 * - AJAX-based content
 * - Sites requiring user interaction
 */
export class DynamicStrategy extends BaseStrategy {
  private scrollHandler: ScrollHandler

  constructor(config?: StrategyConfig) {
    super({
      ...config,
      // Enable full features for dynamic content
      loadImages: true,
      loadStylesheets: true,
      executeJavaScript: true,
      timeout: 30000 // Longer timeout for dynamic content
    })
    this.strategyName = 'dynamic'
    this.scrollHandler = new ScrollHandler({ debug: config?.debug })
  }

  /**
   * Detect if site is dynamic
   * 
   * Indicators:
   * - Heavy JavaScript usage
   * - AJAX/fetch requests
   * - Lazy loading patterns
   * - Interactive elements
   * - Client-side routing
   * 
   * @param url - URL to check
   * @param page - Optional page for deeper inspection
   * @returns Confidence score (0-1)
   */
  async detect(url: string, page?: Page): Promise<number> {
    if (!page) {
      // URL-based heuristics are less reliable for dynamic sites
      return 0.5 // Neutral score without page inspection
    }

    try {
      const indicators = await page.evaluate(() => {
        const checks = {
          // JavaScript framework detection
          hasFramework: false,
          frameworkType: '',
          // AJAX/Fetch usage
          hasAjaxRequests: false,
          // Lazy loading indicators
          hasLazyLoading: false,
          // Interactive elements
          hasInteractiveElements: false,
          // Client-side routing
          hasClientRouting: false,
          // Dynamic content markers
          hasDynamicContent: false,
          // Script to content ratio
          scriptRatio: 0
        }

        // Framework detection
        const frameworks = {
          'React': window.hasOwnProperty('React') || !!document.querySelector('[data-reactroot]'),
          'Vue': window.hasOwnProperty('Vue') || !!document.querySelector('#app[data-v-]'),
          'Angular': window.hasOwnProperty('ng') || !!document.querySelector('[ng-app]'),
          'jQuery': window.hasOwnProperty('jQuery') || window.hasOwnProperty('$'),
          'Ember': window.hasOwnProperty('Ember'),
          'Backbone': window.hasOwnProperty('Backbone')
        }

        for (const [name, detected] of Object.entries(frameworks)) {
          if (detected) {
            checks.hasFramework = true
            checks.frameworkType = name
            break
          }
        }

        // Check for AJAX indicators
        checks.hasAjaxRequests = !!(
          window.XMLHttpRequest || 
          window.fetch ||
          document.querySelector('[data-ajax]')
        )

        // Lazy loading detection
        checks.hasLazyLoading = !!(
          document.querySelector('[loading="lazy"]') ||
          document.querySelector('[data-src]') ||
          document.querySelector('.lazy') ||
          window.hasOwnProperty('IntersectionObserver')
        )

        // Interactive elements
        const interactiveSelectors = [
          'button[onclick]',
          '[data-toggle]',
          '[data-action]',
          '.dropdown',
          '.modal',
          '.tab-content',
          '[role="button"]'
        ]
        checks.hasInteractiveElements = interactiveSelectors.some(
          sel => document.querySelector(sel) !== null
        )

        // Client-side routing
        checks.hasClientRouting = !!(
          window.history?.pushState ||
          document.querySelector('[data-router]') ||
          document.querySelector('[ui-sref]')
        )

        // Dynamic content markers
        checks.hasDynamicContent = !!(
          document.querySelector('[data-dynamic]') ||
          document.querySelector('[v-for]') ||
          document.querySelector('[*ngFor]') ||
          document.querySelector('[data-bind]')
        )

        // Calculate script to content ratio
        const scripts = document.querySelectorAll('script').length
        const totalElements = document.querySelectorAll('*').length
        checks.scriptRatio = scripts / Math.max(1, totalElements)

        return checks
      })

      // Calculate confidence score
      let score = 0.3 // Base score

      if (indicators.hasFramework) score += 0.25
      if (indicators.hasAjaxRequests) score += 0.15
      if (indicators.hasLazyLoading) score += 0.15
      if (indicators.hasInteractiveElements) score += 0.1
      if (indicators.hasClientRouting) score += 0.15
      if (indicators.hasDynamicContent) score += 0.1
      if (indicators.scriptRatio > 0.05) score += 0.1

      // Normalize score
      score = Math.min(1, Math.max(0, score))

      this.log('Dynamic site detection', { url, indicators, score })
      return score
    } catch (error) {
      this.log('Error detecting dynamic site', error)
      return 0.5 // Default medium confidence
    }
  }

  /**
   * Execute dynamic scraping strategy
   * 
   * @param url - URL to scrape
   * @param context - Browser context
   * @returns Scraping result
   */
  async execute(url: string, context: BrowserContext): Promise<ScrapingResult> {
    const startTime = Date.now()
    const errors: string[] = []

    this.log('Executing dynamic strategy', { url })

    const page = await context.newPage()
    
    try {
      // Configure for dynamic scraping
      await this.configurePage(page)
      
      // Track network requests
      const requests: string[] = []
      page.on('request', request => {
        if (request.resourceType() === 'xhr' || request.resourceType() === 'fetch') {
          requests.push(request.url())
        }
      })

      // Navigate and wait for network to settle
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: this.config.timeout
      })

      // Wait for dynamic content to load
      await this.waitForDynamicContent(page)

      // Handle infinite scroll if present
      const scrollResult = await this.scrollHandler.autoScroll(page)
      if (scrollResult.newContentDetected) {
        this.log('New content loaded via scrolling', scrollResult)
      }

      // Extract content after all dynamic loading
      const content = await this.extractDynamicContent(page)
      const metadata = await this.extractMetadata(page)
      
      // Extract social media accounts with full page context after dynamic loading
      const socialAccounts = await socialMediaExtractor.extract(page)
      if (socialAccounts.length > 0) {
        // Convert array to object format expected by UI
        const socialAccountsMap: Record<string, string> = {}
        socialAccounts.forEach(account => {
          // Use platform as key, URL as value (avoid duplicates)
          if (!socialAccountsMap[account.platform]) {
            socialAccountsMap[account.platform] = account.url
          }
        })
        metadata.socialMediaAccounts = socialAccountsMap
      }
      
      const metrics = await this.measureMetrics(startTime, page)

      // Extract dynamic site specific info
      const dynamicInfo = await this.extractDynamicInfo(page, requests)
      
      return {
        content,
        title: metadata.title,
        description: metadata.description || metadata['og:description'],
        metadata: {
          ...metadata,
          ...dynamicInfo,
          scrollData: scrollResult
        },
        metrics,
        errors: errors.length > 0 ? errors : undefined,
        strategy: this.strategyName
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      errors.push(`Dynamic scraping failed: ${errorMessage}`)
      permanentLogger.captureError('DYNAMIC_STRATEGY', new Error('Scraping failed'), { url, error: errorMessage })
      
      return {
        content: '',
        errors,
        strategy: this.strategyName
      }
    } finally {
      await page.close()
    }
  }

  /**
   * Wait for dynamic content to load
   * 
   * @param page - Page instance
   */
  private async waitForDynamicContent(page: Page): Promise<void> {
    try {
      // Wait for common loading indicators to disappear
      const loadingSelectors = [
        '.loading',
        '.spinner',
        '[data-loading]',
        '.skeleton',
        '.placeholder',
        '#loading',
        '.loader'
      ]

      for (const selector of loadingSelectors) {
        const element = await page.$(selector)
        if (element) {
          await page.waitForSelector(selector, { 
            state: 'hidden', 
            timeout: 5000 
          }).catch(() => {
            // Ignore timeout, loading indicator might persist
          })
        }
      }

      // Wait for common content containers
      const contentSelectors = [
        '[data-content]',
        '.content-loaded',
        'main[data-loaded="true"]',
        '#app[data-ready]'
      ]

      for (const selector of contentSelectors) {
        try {
          await page.waitForSelector(selector, { 
            state: 'visible', 
            timeout: 3000 
          })
          break // Found content, stop waiting
        } catch {
          // Continue to next selector
        }
      }

      // Additional wait for JavaScript execution
      await page.waitForTimeout(1000)

    } catch (error) {
      this.log('Error waiting for dynamic content', error)
    }
  }

  /**
   * Extract content from dynamic sites
   * 
   * @param page - Page to extract from
   * @returns Extracted content
   */
  private async extractDynamicContent(page: Page): Promise<string> {
    return await page.evaluate(() => {
      // Wait for any pending animations
      const computedStyle = window.getComputedStyle(document.body)
      const animationDuration = parseFloat(computedStyle.animationDuration) || 0
      const transitionDuration = parseFloat(computedStyle.transitionDuration) || 0
      const maxDuration = Math.max(animationDuration, transitionDuration) * 1000

      return new Promise<string>((resolve) => {
        setTimeout(() => {
          // Remove unwanted elements
          const unwantedSelectors = [
            'script',
            'style',
            'noscript',
            'iframe[src*="ads"]',
            '.advertisement',
            '.modal',
            '.popup',
            '.cookie-banner',
            '.newsletter-popup'
          ]

          unwantedSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => el.remove())
          })

          // Find main content areas
          const contentSelectors = [
            '[role="main"]',
            'main',
            '#content',
            '.main-content',
            'article',
            '[data-content]',
            '.app-content'
          ]

          let contentElement: Element | null = null
          for (const selector of contentSelectors) {
            contentElement = document.querySelector(selector)
            if (contentElement && contentElement.textContent?.trim()) {
              break
            }
          }

          // Fallback to body
          if (!contentElement) {
            contentElement = document.body
          }

          // Get all visible text
          const walker = document.createTreeWalker(
            contentElement,
            NodeFilter.SHOW_TEXT,
            {
              acceptNode: (node) => {
                const parent = node.parentElement
                if (!parent) return NodeFilter.FILTER_REJECT

                // Skip hidden elements
                const style = window.getComputedStyle(parent)
                if (style.display === 'none' || style.visibility === 'hidden') {
                  return NodeFilter.FILTER_REJECT
                }

                // Skip script/style content
                if (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE') {
                  return NodeFilter.FILTER_REJECT
                }

                return NodeFilter.FILTER_ACCEPT
              }
            }
          )

          const textParts: string[] = []
          let node
          while (node = walker.nextNode()) {
            const text = node.textContent?.trim()
            if (text && text.length > 0) {
              textParts.push(text)
            }
          }

          resolve(textParts.join(' '))
        }, Math.min(maxDuration, 500))
      })
    })
  }

  /**
   * Extract dynamic site specific information
   * 
   * @param page - Page to extract from
   * @param requests - Captured network requests
   * @returns Dynamic site information
   */
  private async extractDynamicInfo(page: Page, requests: string[]): Promise<Record<string, any>> {
    const pageInfo = await page.evaluate(() => {
      const info: Record<string, any> = {}

      // Detect framework
      if (window.hasOwnProperty('React')) info.framework = 'React'
      else if (window.hasOwnProperty('Vue')) info.framework = 'Vue'
      else if (window.hasOwnProperty('Angular')) info.framework = 'Angular'
      else if (window.hasOwnProperty('jQuery')) info.framework = 'jQuery'

      // Get page state if available
      if (window.hasOwnProperty('__INITIAL_STATE__')) {
        info.hasInitialState = true
      }

      // Check for API endpoints
      const scripts = Array.from(document.querySelectorAll('script'))
      const apiPatterns = /api\.[\w.]+\.com|\/api\/|graphql/gi
      scripts.forEach(script => {
        const matches = script.textContent?.match(apiPatterns)
        if (matches) {
          info.apiEndpoints = [...new Set(matches)]
        }
      })

      // Get data attributes
      const dataElements = document.querySelectorAll('[data-id], [data-product], [data-item]')
      if (dataElements.length > 0) {
        info.dataElementCount = dataElements.length
      }

      return info
    })

    // Analyze network requests
    const apiCalls = requests.filter(req => 
      req.includes('/api/') || 
      req.includes('graphql') ||
      req.includes('.json')
    )

    return {
      ...pageInfo,
      networkRequests: {
        total: requests.length,
        apiCalls: apiCalls.length,
        endpoints: [...new Set(apiCalls.map(url => new URL(url).pathname))].slice(0, 10)
      }
    }
  }
}