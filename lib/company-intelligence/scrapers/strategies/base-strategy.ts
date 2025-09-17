/**
 * Base Strategy Module
 * 
 * Abstract base class for all scraping strategies.
 * Defines the common interface and shared functionality.
 * 
 * @module base-strategy
 */

import { Page, BrowserContext } from 'playwright'
import { permanentLogger } from '../../../utils/permanent-logger'

/**
 * Configuration for scraping strategies
 */
export interface StrategyConfig {
  /** Maximum wait time for page load */
  timeout?: number
  /** User agent string */
  userAgent?: string
  /** Whether to load images */
  loadImages?: boolean
  /** Whether to load stylesheets */
  loadStylesheets?: boolean
  /** Whether to execute JavaScript */
  executeJavaScript?: boolean
  /** Enable debug logging */
  debug?: boolean
  /** Custom headers */
  headers?: Record<string, string>
  /** Viewport dimensions */
  viewport?: { width: number; height: number }
}

/**
 * Result from a scraping operation
 */
export interface ScrapingResult {
  /** The scraped content */
  content: string
  /** Page title */
  title?: string
  /** Meta description */
  description?: string
  /** Extracted metadata */
  metadata?: Record<string, any>
  /** Performance metrics */
  metrics?: {
    loadTime: number
    contentSize: number
    requestCount: number
  }
  /** Any errors encountered */
  errors?: string[]
  /** Strategy used */
  strategy: string
}

/**
 * Default strategy configuration
 */
export const DEFAULT_STRATEGY_CONFIG: Required<Omit<StrategyConfig, 'headers'>> = {
  timeout: 30000,
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  loadImages: false,
  loadStylesheets: true,
  executeJavaScript: true,
  debug: false,
  viewport: { width: 1920, height: 1080 }
}

/**
 * Abstract base class for scraping strategies
 */
export abstract class BaseStrategy {
  protected config: Required<Omit<StrategyConfig, 'headers'>>
  protected headers: Record<string, string>
  protected strategyName: string = 'base'

  constructor(config?: StrategyConfig) {
    this.config = { ...DEFAULT_STRATEGY_CONFIG, ...config }
    this.headers = config?.headers || {}
  }

  /**
   * Get the strategy name
   */
  getName(): string {
    return this.strategyName
  }

  /**
   * Detect if this strategy is suitable for the given URL
   * 
   * @param url - URL to check
   * @param page - Optional page instance for deeper inspection
   * @returns Confidence score (0-1) that this strategy is suitable
   */
  abstract async detect(url: string, page?: Page): Promise<number>

  /**
   * Execute the scraping strategy
   * 
   * @param url - URL to scrape
   * @param context - Browser context
   * @returns Scraping result
   */
  abstract async execute(url: string, context: BrowserContext): Promise<ScrapingResult>

  /**
   * Configure page before navigation
   * 
   * @param page - Page to configure
   */
  protected async configurePage(page: Page): Promise<void> {
    // Set viewport
    await page.setViewportSize(this.config.viewport)

    // Set user agent
    if (this.config.userAgent) {
      await page.setExtraHTTPHeaders({
        'User-Agent': this.config.userAgent,
        ...this.headers
      })
    }

    // Block resources if configured
    if (!this.config.loadImages || !this.config.loadStylesheets) {
      await page.route('**/*', (route) => {
        const resourceType = route.request().resourceType()
        
        if (!this.config.loadImages && resourceType === 'image') {
          return route.abort()
        }
        
        if (!this.config.loadStylesheets && resourceType === 'stylesheet') {
          return route.abort()
        }
        
        return route.continue()
      })
    }

    // Disable JavaScript if configured
    if (!this.config.executeJavaScript) {
      await page.addInitScript(() => {
        // Disable common JavaScript features
        Object.defineProperty(window, 'eval', { value: () => {} })
      })
    }
  }

  /**
   * Extract basic metadata from the page
   * 
   * @param page - Page to extract from
   * @returns Metadata object
   */
  protected async extractMetadata(page: Page): Promise<Record<string, any>> {
    return await page.evaluate(() => {
      const metadata: Record<string, any> = {}

      // Title
      metadata.title = document.title

      // Meta tags
      const metaTags = document.querySelectorAll('meta')
      metaTags.forEach(tag => {
        const name = tag.getAttribute('name') || tag.getAttribute('property')
        const content = tag.getAttribute('content')
        
        if (name && content) {
          metadata[name] = content
        }
      })

      // Open Graph - Comprehensive extraction
      const ogTags: Record<string, string> = {}
      document.querySelectorAll('meta[property^="og:"]').forEach(tag => {
        const property = tag.getAttribute('property')?.replace('og:', '')
        const content = tag.getAttribute('content')
        if (property && content) {
          ogTags[property] = content
        }
      })
      if (Object.keys(ogTags).length > 0) {
        metadata.openGraph = ogTags
        // Extract key OG data for easier access
        metadata.ogTitle = ogTags.title
        metadata.ogDescription = ogTags.description
        metadata.ogImage = ogTags.image
        metadata.ogUrl = ogTags.url
        metadata.ogType = ogTags.type
        metadata.ogSiteName = ogTags.site_name
      }

      // Twitter Card - Comprehensive extraction
      const twitterTags: Record<string, string> = {}
      document.querySelectorAll('meta[name^="twitter:"], meta[property^="twitter:"]').forEach(tag => {
        const name = tag.getAttribute('name') || tag.getAttribute('property')
        const content = tag.getAttribute('content')
        if (name && content) {
          const key = name.replace('twitter:', '')
          twitterTags[key] = content
        }
      })
      if (Object.keys(twitterTags).length > 0) {
        metadata.twitterCard = twitterTags
        // Extract key Twitter data for easier access
        metadata.twitterTitle = twitterTags.title
        metadata.twitterDescription = twitterTags.description
        metadata.twitterImage = twitterTags.image
        metadata.twitterSite = twitterTags.site
        metadata.twitterCreator = twitterTags.creator
        metadata.twitterCardType = twitterTags.card
      }

      // JSON-LD
      const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]')
      if (jsonLdScripts.length > 0) {
        metadata.jsonLd = Array.from(jsonLdScripts).map(script => {
          try {
            return JSON.parse(script.textContent || '{}')
          } catch {
            return null
          }
        }).filter(Boolean)
      }

      // Canonical URL
      const canonical = document.querySelector('link[rel="canonical"]')
      if (canonical) {
        metadata.canonical = canonical.getAttribute('href')
      }

      // Language
      metadata.language = document.documentElement.lang || 'en'

      // Note: Social media account extraction moved to dedicated SocialMediaExtractor
      // for more reliable extraction during scraping phase

      return metadata
    })
  }

  /**
   * Extract text content from the page
   * 
   * @param page - Page to extract from
   * @returns Text content
   */
  protected async extractContent(page: Page): Promise<string> {
    return await page.evaluate(() => {
      // Remove script and style elements
      const scripts = document.querySelectorAll('script, style, noscript')
      scripts.forEach(el => el.remove())

      // Get text content
      const body = document.body
      if (!body) return ''

      // Clean up whitespace
      return body.innerText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n')
    })
  }

  /**
   * Log debug information
   * 
   * @param message - Message to log
   * @param data - Additional data
   */
  protected log(message: string, data?: any): void {
    if (this.config.debug) {
      permanentLogger.info(`STRATEGY_${this.strategyName.toUpperCase()}`, message, data)
    }
  }

  /**
   * Measure performance metrics
   * 
   * @param startTime - Start time
   * @param page - Page instance
   * @returns Performance metrics
   */
  protected async measureMetrics(
    startTime: number,
    page: Page
  ): Promise<ScrapingResult['metrics']> {
    const endTime = Date.now()
    const loadTime = endTime - startTime

    const metrics = await page.evaluate(() => {
      return {
        contentSize: document.documentElement.outerHTML.length,
        requestCount: performance.getEntriesByType('resource').length
      }
    })

    return {
      loadTime,
      ...metrics
    }
  }
}