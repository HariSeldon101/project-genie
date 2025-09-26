/**
 * Hybrid Strategy for Mixed Static/Dynamic Sites
 * 
 * Intelligently chooses between static (Cheerio) and dynamic (Playwright) scraping
 * based on page analysis. Used for frameworks like Next.js, Nuxt.js that can
 * serve both static (SSG) and dynamic (SSR) content.
 * 
 * Features:
 * - Attempts fast static scraping first
 * - Falls back to dynamic if content is insufficient
 * - Caches page-level strategy decisions
 * - Supports incremental enhancement
 * 
 * @module hybrid-strategy
 */

import { BrowserContext, Page } from 'playwright'
import { BaseStrategy, ScrapingResult, StrategyConfig } from './base-strategy'
import { StaticStrategy } from './static-strategy'
import { DynamicStrategy } from './dynamic-strategy'
import { permanentLogger } from '../../../utils/permanent-logger'
import * as cheerio from 'cheerio'

/**
 * Hybrid scraping configuration
 */
export interface HybridConfig extends StrategyConfig {
  /** Minimum content length to consider static scraping successful */
  minContentLength?: number
  /** Keywords that indicate dynamic content */
  dynamicIndicators?: string[]
  /** Keywords that indicate static content */
  staticIndicators?: string[]
  /** Cache strategy decisions per URL */
  cacheDecisions?: boolean
}

/**
 * Strategy decision result
 */
interface StrategyDecision {
  strategy: 'static' | 'dynamic'
  reason: string
  confidence: number
}

/**
 * Hybrid Strategy for intelligently choosing between static and dynamic scraping
 */
export class HybridStrategy extends BaseStrategy {
  private staticStrategy: StaticStrategy
  private dynamicStrategy: DynamicStrategy
  private config: HybridConfig
  private decisionCache: Map<string, StrategyDecision>

  constructor(config?: HybridConfig) {
    super(config)
    
    this.config = {
      minContentLength: 500,
      dynamicIndicators: [
        '__NEXT_DATA__',
        '_app.js',
        'window.__NUXT__',
        'React.createElement',
        'Vue.component',
        'angular.module'
      ],
      staticIndicators: [
        'static-generation',
        'ssg-',
        'prerendered',
        'data-page="/404"'
      ],
      cacheDecisions: true,
      ...config
    }

    // Initialize sub-strategies
    this.staticStrategy = new StaticStrategy(config)
    this.dynamicStrategy = new DynamicStrategy(config)
    this.decisionCache = new Map()
  }

  /**
   * Detect if this strategy is suitable for the URL
   * Hybrid strategy is suitable for frameworks that support both SSG and SSR
   */
  async detect(url: string, page?: Page): Promise<number> {
    permanentLogger.info('HYBRID_STRATEGY', 'Detecting suitability', { url })
    
    // Check URL patterns
    const urlPatterns = [
      /nextjs/i,
      /nuxtjs/i,
      /gatsby/i,
      /remix/i,
      /sveltekit/i
    ]
    
    if (urlPatterns.some(pattern => pattern.test(url))) {
      permanentLogger.info('HYBRID_STRATEGY', 'URL pattern match for hybrid framework', { url })
      return 0.9
    }
    
    // If we have a page, do deeper inspection
    if (page) {
      try {
        const content = await page.content()
        
        // Check for hybrid framework indicators
        const hybridIndicators = [
          '__NEXT_DATA__',
          '__NUXT__',
          'gatsby-',
          'remix-',
          'svelte-'
        ]
        
        const hasHybridFramework = hybridIndicators.some(indicator => 
          content.includes(indicator)
        )
        
        if (hasHybridFramework) {
          permanentLogger.info('HYBRID_STRATEGY', 'Hybrid framework detected in page content', { url })
          return 0.95
        }
      } catch (error) {
        permanentLogger.warn('HYBRID_STRATEGY', 'Page inspection failed', { url, error })
      }
    }
    
    // Medium confidence for general use
    return 0.5
  }

  /**
   * Execute hybrid scraping strategy
   */
  async execute(url: string, context?: BrowserContext): Promise<ScrapingResult> {
    const startTime = Date.now()
    
    permanentLogger.info('HYBRID_STRATEGY', 'Starting hybrid scraping', { 
      url,
      hasContext: !!context
    })

    // Check cache for previous decision
    if (this.config.cacheDecisions && this.decisionCache.has(url)) {
      const cachedDecision = this.decisionCache.get(url)!
      permanentLogger.info('HYBRID_STRATEGY', 'Using cached strategy decision', {
        url,
        strategy: cachedDecision.strategy,
        reason: cachedDecision.reason
      })
      
      if (cachedDecision.strategy === 'static') {
        return await this.executeStatic(url)
      } else {
        return await this.executeDynamic(url, context)
      }
    }

    // Make strategy decision
    const decision = await this.decideStrategy(url)
    
    // Cache decision
    if (this.config.cacheDecisions) {
      this.decisionCache.set(url, decision)
    }

    permanentLogger.info('HYBRID_STRATEGY', 'Strategy decision made', {
      url,
      strategy: decision.strategy,
      reason: decision.reason,
      confidence: decision.confidence
    })

    // Execute based on decision
    let result: ScrapingResult
    
    if (decision.strategy === 'static') {
      // Try static first
      result = await this.executeStatic(url)
      
      // Check if we need dynamic enhancement
      if (this.needsDynamicEnhancement(result)) {
        permanentLogger.info('HYBRID_STRATEGY', 'Static result insufficient, enhancing with dynamic', {
          url,
          staticContentLength: result.content?.length || 0
        })
        
        // Update cache
        if (this.config.cacheDecisions) {
          this.decisionCache.set(url, {
            strategy: 'dynamic',
            reason: 'Static content insufficient, switching to dynamic',
            confidence: 0.9
          })
        }
        
        // Execute dynamic
        result = await this.executeDynamic(url, context)
      }
    } else {
      // Execute dynamic directly
      result = await this.executeDynamic(url, context)
    }

    const duration = Date.now() - startTime
    
    // Add hybrid-specific metadata
    result.metadata = {
      ...result.metadata,
      strategy: 'hybrid',
      decidedStrategy: decision.strategy,
      decisionReason: decision.reason,
      decisionConfidence: decision.confidence,
      duration,
      enhancementApplied: decision.strategy === 'static' && this.needsDynamicEnhancement(result)
    }

    permanentLogger.info('HYBRID_STRATEGY', 'Hybrid scraping completed', {
      url,
      finalStrategy: result.metadata.decidedStrategy,
      duration,
      contentLength: result.content?.length || 0,
      hasErrors: !!(result.errors && result.errors.length > 0)
    })

    return result
  }

  /**
   * Decide which strategy to use for a URL
   */
  private async decideStrategy(url: string): Promise<StrategyDecision> {
    permanentLogger.info('HYBRID_STRATEGY', 'Analyzing URL for strategy decision', { url })
    
    // Quick URL-based heuristics
    const staticPatterns = [
      /\/about/i,
      /\/contact/i,
      /\/privacy/i,
      /\/terms/i,
      /\/blog\//i,
      /\.html$/i,
      /\/docs\//i,
      /\/documentation\//i
    ]
    
    const dynamicPatterns = [
      /\/api\//i,
      /\/search/i,
      /\/dashboard/i,
      /\/account/i,
      /\/cart/i,
      /\/checkout/i,
      /\/app\//i,
      /\?.*=/i,
      /\/admin/i,
      /\/profile/i
    ]
    
    // Check for dynamic patterns first (higher priority)
    if (dynamicPatterns.some(pattern => pattern.test(url))) {
      return {
        strategy: 'dynamic',
        reason: 'URL pattern indicates dynamic content',
        confidence: 0.8
      }
    }
    
    // Check for static patterns
    if (staticPatterns.some(pattern => pattern.test(url))) {
      return {
        strategy: 'static',
        reason: 'URL pattern indicates static content',
        confidence: 0.8
      }
    }
    
    // Do a quick fetch to analyze content
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })
      
      const html = await response.text()
      const $ = cheerio.load(html)
      
      // Check for dynamic content indicators
      const hasDynamicIndicators = this.config.dynamicIndicators?.some(indicator => 
        html.includes(indicator)
      ) || false
      
      if (hasDynamicIndicators) {
        return {
          strategy: 'dynamic',
          reason: 'Dynamic framework indicators found in HTML',
          confidence: 0.9
        }
      }
      
      // Check for static content indicators
      const hasStaticIndicators = this.config.staticIndicators?.some(indicator => 
        html.includes(indicator)
      ) || false
      
      if (hasStaticIndicators) {
        return {
          strategy: 'static',
          reason: 'Static generation indicators found in HTML',
          confidence: 0.9
        }
      }
      
      // Check content richness
      const textContent = $('body').text().trim()
      const hasRichContent = textContent.length > this.config.minContentLength!
      
      if (hasRichContent) {
        return {
          strategy: 'static',
          reason: 'Sufficient static content available',
          confidence: 0.7
        }
      }
      
    } catch (error) {
      permanentLogger.warn('HYBRID_STRATEGY', 'Content analysis failed, defaulting to dynamic', {
        url,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
    
    // Default to dynamic for safety
    return {
      strategy: 'dynamic',
      reason: 'Default strategy for uncertain content',
      confidence: 0.5
    }
  }

  /**
   * Execute static scraping
   */
  private async executeStatic(url: string): Promise<ScrapingResult> {
    permanentLogger.info('HYBRID_STRATEGY', 'Executing static strategy', { url })
    
    const staticStrategy = this.staticStrategy as any
    return await staticStrategy.execute(url)
  }

  /**
   * Execute dynamic scraping
   */
  private async executeDynamic(url: string, context?: BrowserContext): Promise<ScrapingResult> {
    permanentLogger.info('HYBRID_STRATEGY', 'Executing dynamic strategy', { url })
    
    if (!context) {
      // Create temporary context if not provided
      const { BrowserPool } = await import('../browser/browser-pool')
      const browserPool = BrowserPool.getInstance()
      const browser = await browserPool.getBrowser()
      context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      })
      
      try {
        return await this.dynamicStrategy.execute(url, context)
      } finally {
        await context.close()
      }
    }
    
    return await this.dynamicStrategy.execute(url, context)
  }

  /**
   * Check if static result needs dynamic enhancement
   */
  private needsDynamicEnhancement(result: ScrapingResult): boolean {
    // Check for errors
    if (result.errors && result.errors.length > 0) {
      return true
    }
    
    // Check content length
    if (!result.content || result.content.length < this.config.minContentLength!) {
      permanentLogger.info('HYBRID_STRATEGY', 'Content below minimum threshold', {
        actual: result.content?.length || 0,
        minimum: this.config.minContentLength
      })
      return true
    }
    
    // Check for loading indicators
    const loadingIndicators = [
      'Loading...',
      'Please wait',
      'Initializing',
      'spinner',
      'skeleton'
    ]
    
    if (result.content && loadingIndicators.some(indicator => 
      result.content!.toLowerCase().includes(indicator.toLowerCase())
    )) {
      permanentLogger.info('HYBRID_STRATEGY', 'Loading indicators found in static content')
      return true
    }
    
    return false
  }

  /**
   * Clear decision cache
   */
  clearCache(): void {
    this.decisionCache.clear()
    permanentLogger.info('HYBRID_STRATEGY', 'Decision cache cleared')
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number
    decisions: Array<{ url: string; strategy: string }>
  } {
    return {
      size: this.decisionCache.size,
      decisions: Array.from(this.decisionCache.entries()).map(([url, decision]) => ({
        url,
        strategy: decision.strategy
      }))
    }
  }
}