/**
 * Strategy Manager Module
 * 
 * Orchestrates different scraping strategies based on site detection.
 * Automatically selects the best strategy for each website.
 * 
 * Features:
 * - Automatic strategy selection based on site analysis
 * - Technology-aware routing
 * - Fallback mechanism
 * - Performance tracking
 * - Strategy caching
 * - Bulk scraping support
 * 
 * @module strategy-manager
 */

import { BrowserContext, Page } from 'playwright'
import { BaseStrategy, ScrapingResult, StrategyConfig } from './base-strategy'
import { StaticStrategy } from './static-strategy'
import { DynamicStrategy } from './dynamic-strategy'
import { SPAStrategy } from './spa-strategy'
import { HybridStrategy } from './hybrid-strategy'
import { permanentLogger } from '../../../utils/permanent-logger'
import { getStrategyForTechnology, ScrapingStrategy } from './technology-strategy-map'

/**
 * Strategy selection result
 */
interface StrategySelection {
  /** Selected strategy */
  strategy: BaseStrategy
  /** Strategy name */
  name: string
  /** Confidence score */
  confidence: number
  /** Alternative strategies */
  alternatives: Array<{
    name: string
    confidence: number
  }>
}

/**
 * Manager configuration
 */
export interface ManagerConfig extends StrategyConfig {
  /** Enable automatic strategy selection */
  autoSelect?: boolean
  /** Minimum confidence threshold for strategy selection */
  confidenceThreshold?: number
  /** DEPRECATED: No fallbacks allowed per bulletproof spec - errors must be thrown */
  enableFallback?: boolean
  /** Cache strategy selections */
  cacheSelections?: boolean
  /** Force specific strategy */
  forceStrategy?: 'static' | 'dynamic' | 'spa'
}

/**
 * Bulk scraping result
 */
export interface BulkScrapingResult {
  /** Successfully scraped URLs */
  successful: Array<{
    url: string
    result: ScrapingResult
  }>
  /** Failed URLs */
  failed: Array<{
    url: string
    error: string
  }>
  /** Performance metrics */
  metrics: {
    totalTime: number
    averageTime: number
    strategyUsage: Record<string, number>
  }
}

/**
 * Strategy Manager for intelligent scraping
 */
export class StrategyManager {
  private strategies: Map<string, BaseStrategy>
  private config: ManagerConfig
  private selectionCache: Map<string, string>
  private performanceMetrics: Map<string, number[]>

  constructor(config?: ManagerConfig) {
    this.config = {
      autoSelect: true,
      confidenceThreshold: 0.6,
      enableFallback: true,
      cacheSelections: true,
      ...config
    }

    // Initialize strategies
    this.strategies = new Map([
      ['static', new StaticStrategy(config)],
      ['dynamic', new DynamicStrategy(config)],
      ['spa', new SPAStrategy(config)],
      ['hybrid', new HybridStrategy(config)]
    ])

    this.selectionCache = new Map()
    this.performanceMetrics = new Map()
  }

  /**
   * Select the best strategy for a URL
   * 
   * @param url - URL to analyze
   * @param context - Browser context for deeper inspection
   * @param siteAnalysisData - Site analysis data from Phase 1
   * @returns Strategy selection result
   */
  async selectStrategy(
    url: string,
    context?: BrowserContext,
    siteAnalysisData?: any
  ): Promise<StrategySelection> {
    const startTime = Date.now()
    
    permanentLogger.info('STRATEGY_MANAGER', 'Starting strategy selection', {
      url,
      hasSiteAnalysis: !!siteAnalysisData,
      detectedTechnology: siteAnalysisData?.siteType,
      technologies: siteAnalysisData?.technologies
    })
    
    // Check if strategy is forced
    if (this.config.forceStrategy) {
      const strategy = this.strategies.get(this.config.forceStrategy)!
      permanentLogger.info('STRATEGY_MANAGER', 'Using forced strategy', {
        url,
        forcedStrategy: this.config.forceStrategy
      })
      return {
        strategy,
        name: this.config.forceStrategy,
        confidence: 1,
        alternatives: []
      }
    }

    // Use site analysis data if available (FAST PATH)
    if (siteAnalysisData?.siteType) {
      const technologyMapping = getStrategyForTechnology(siteAnalysisData.siteType)
      const recommendedStrategy = technologyMapping.strategy
      
      permanentLogger.info('STRATEGY_MANAGER', 'Using technology-based strategy selection', {
        url,
        technology: siteAnalysisData.siteType,
        recommendedStrategy,
        reason: technologyMapping.reason,
        requiresBrowser: technologyMapping.requiresBrowser,
        estimatedSpeed: technologyMapping.estimatedSpeed
      })
      
      // Get the strategy instance
      const strategy = this.strategies.get(recommendedStrategy)
      
      if (strategy) {
        // Cache the selection
        if (this.config.cacheSelections) {
          this.selectionCache.set(url, recommendedStrategy)
        }
        
        const duration = Date.now() - startTime
        
        permanentLogger.info('STRATEGY_MANAGER', 'Technology-based strategy selected', {
          url,
          strategy: recommendedStrategy,
          technology: siteAnalysisData.siteType,
          confidence: 0.95, // High confidence when using site analysis
          selectionDuration: duration,
          performanceGain: recommendedStrategy === 'static' ? '10x faster' : 'normal'
        })
        
        return {
          strategy,
          name: recommendedStrategy,
          confidence: 0.95,
          alternatives: []
        }
      }
    }

    // Check cache
    if (this.config.cacheSelections && this.selectionCache.has(url)) {
      const cachedStrategy = this.selectionCache.get(url)!
      const strategy = this.strategies.get(cachedStrategy)!
      permanentLogger.info('STRATEGY_MANAGER', 'Using cached strategy', {
        url,
        cachedStrategy
      })
      return {
        strategy,
        name: cachedStrategy,
        confidence: 1,
        alternatives: []
      }
    }

    // Fallback to detection-based selection
    permanentLogger.info('STRATEGY_MANAGER', 'Falling back to URL-based detection', {
      url,
      reason: 'No site analysis data available'
    })
    
    const detectionResults: Array<{
      name: string
      strategy: BaseStrategy
      confidence: number
    }> = []

    // Quick URL-based detection first
    for (const [name, strategy] of this.strategies) {
      const confidence = await strategy.detect(url)
      detectionResults.push({ name, strategy, confidence })
    }

    // Sort by confidence
    detectionResults.sort((a, b) => b.confidence - a.confidence)

    // If top confidence is below threshold and we have context, do deeper inspection
    if (detectionResults[0].confidence < this.config.confidenceThreshold && context) {
      const page = await context.newPage()
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 })
        
        // Re-run detection with page context
        for (const result of detectionResults) {
          result.confidence = await result.strategy.detect(url, page)
        }
        
        // Re-sort
        detectionResults.sort((a, b) => b.confidence - a.confidence)
      } catch (error) {
        permanentLogger.warn('STRATEGY_MANAGER', 'Deep inspection failed', { url, error })
      } finally {
        await page.close()
      }
    }

    const selected = detectionResults[0]
    const alternatives = detectionResults.slice(1).map(r => ({
      name: r.name,
      confidence: r.confidence
    }))

    // Cache selection
    if (this.config.cacheSelections) {
      this.selectionCache.set(url, selected.name)
    }

    const duration = Date.now() - startTime
    
    permanentLogger.info('STRATEGY_MANAGER', 'Detection-based strategy selected', {
      url,
      strategy: selected.name,
      confidence: selected.confidence,
      alternatives,
      selectionDuration: duration
    })

    return {
      strategy: selected.strategy,
      name: selected.name,
      confidence: selected.confidence,
      alternatives
    }
  }

  /**
   * Scrape a URL with automatic strategy selection
   * 
   * @param url - URL to scrape
   * @param context - Browser context (only used for browser-based strategies)
   * @param siteAnalysisData - Site analysis data from Phase 1
   * @returns Scraping result
   */
  async scrape(
    url: string,
    context?: BrowserContext,
    siteAnalysisData?: any
  ): Promise<ScrapingResult> {
    const startTime = Date.now()
    
    permanentLogger.info('STRATEGY_MANAGER', 'Starting scrape', { 
      url,
      hasSiteAnalysis: !!siteAnalysisData,
      technology: siteAnalysisData?.siteType
    })
    
    // Select strategy using site analysis data for optimal performance
    const selection = await this.selectStrategy(url, context, siteAnalysisData)
    
    // Execute scraping
    let result: ScrapingResult
    
    try {
      permanentLogger.info('STRATEGY_MANAGER', 'Executing strategy', { 
        url, 
        strategy: selection.name,
        confidence: selection.confidence,
        usesCheerio: selection.name === 'static',
        usesPlaywright: selection.name !== 'static',
        technology: siteAnalysisData?.siteType || 'unknown'
      })
      
      // For static strategy, we don't need browser context
      if (selection.name === 'static') {
        permanentLogger.info('STRATEGY_MANAGER', '⚡ Using Cheerio for fast static scraping', {
          url,
          expectedSpeed: '10x faster',
          reason: siteAnalysisData?.siteType ? 
            `${siteAnalysisData.siteType} detected as static site` : 
            'URL pattern suggests static content'
        })
        
        const staticStrategy = selection.strategy as any // Type assertion for now
        result = await staticStrategy.execute(url)
      } else {
        permanentLogger.info('STRATEGY_MANAGER', '🌐 Using Playwright for dynamic scraping', {
          url,
          strategy: selection.name,
          reason: siteAnalysisData?.siteType ?
            `${siteAnalysisData.siteType} requires JavaScript execution` :
            'URL pattern suggests dynamic content'
        })
        
        // Browser-based strategies need context - create one if not provided
        if (!context) {
          // Create a temporary browser context for this operation
          const { BrowserPool } = await import('../browser/browser-pool')
          const browserPool = BrowserPool.getInstance()
          const browser = await browserPool.getBrowser()
          context = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          })
          
          try {
            result = await selection.strategy.execute(url, context)
          } finally {
            // Clean up the temporary context
            await context.close()
          }
        } else {
          result = await selection.strategy.execute(url, context)
        }
      }
      
      const duration = Date.now() - startTime
      
      permanentLogger.info('STRATEGY_MANAGER', 'Strategy execution completed', {
        url,
        strategy: selection.name,
        technology: siteAnalysisData?.siteType || 'unknown',
        duration,
        performanceCategory: duration < 1000 ? 'excellent' : duration < 5000 ? 'good' : 'slow',
        hasContent: !!result.content,
        contentLength: result.content?.length || 0,
        hasErrors: !!(result.errors && result.errors.length > 0),
        errorCount: result.errors?.length || 0
      })
      
      // If failed, throw error - no fallbacks allowed per bulletproof spec
      if (result.errors && result.errors.length > 0) {
        permanentLogger.captureError('STRATEGY_MANAGER', 'Strategy execution failed', {
          url,
          strategy: selection.name,
          errors: result.errors
        })
        throw new Error(`Strategy ${selection.name} failed for ${url}: ${result.errors.join(', ')}`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const errorStack = error instanceof Error ? error.stack : undefined
      
      permanentLogger.captureError('STRATEGY_MANAGER', 'Strategy execution failed', {
        url,
        strategy: selection.name,
        error: errorMessage,
        stack: errorStack
      })
      
      result = {
        content: '',
        errors: [`Strategy execution failed: ${errorMessage}`],
        strategy: selection.name
      }
    }

    // Track performance
    const duration = Date.now() - startTime
    this.trackPerformance(selection.name, duration)
    
    // Add manager metadata
    result.metadata = {
      ...result.metadata,
      strategyConfidence: selection.confidence,
      alternatives: selection.alternatives,
      scrapingDuration: duration
    }

    return result
  }

  /**
   * Scrape multiple URLs in parallel
   * 
   * @param urls - URLs to scrape
   * @param context - Browser context
   * @param concurrency - Number of parallel scrapers
   * @returns Bulk scraping results
   */
  async scrapeBulk(
    urls: string[],
    context: BrowserContext,
    concurrency: number = 3
  ): Promise<BulkScrapingResult> {
    const startTime = Date.now()
    const successful: BulkScrapingResult['successful'] = []
    const failed: BulkScrapingResult['failed'] = []
    const strategyUsage: Record<string, number> = {}

    // Process URLs in batches
    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency)
      const promises = batch.map(async (url) => {
        try {
          const result = await this.scrape(url, context)
          
          if (result.errors && result.errors.length > 0) {
            failed.push({
              url,
              error: result.errors.join('; ')
            })
          } else {
            successful.push({ url, result })
            
            // Track strategy usage
            strategyUsage[result.strategy] = (strategyUsage[result.strategy] || 0) + 1
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          failed.push({
            url,
            error: errorMessage
          })
        }
      })

      await Promise.all(promises)
    }

    const totalTime = Date.now() - startTime
    const averageTime = totalTime / urls.length

    return {
      successful,
      failed,
      metrics: {
        totalTime,
        averageTime,
        strategyUsage
      }
    }
  }

  /**
   * Track performance metrics
   * 
   * @param strategy - Strategy name
   * @param duration - Execution duration
   */
  private trackPerformance(strategy: string, duration: number): void {
    if (!this.performanceMetrics.has(strategy)) {
      this.performanceMetrics.set(strategy, [])
    }
    
    const metrics = this.performanceMetrics.get(strategy)!
    metrics.push(duration)
    
    // Keep only last 100 metrics
    if (metrics.length > 100) {
      metrics.shift()
    }
  }

  /**
   * Get performance statistics
   * 
   * @returns Performance stats for each strategy
   */
  getPerformanceStats(): Record<string, {
    averageTime: number
    minTime: number
    maxTime: number
    sampleSize: number
  }> {
    const stats: Record<string, any> = {}
    
    for (const [strategy, metrics] of this.performanceMetrics) {
      if (metrics.length === 0) continue
      
      const sum = metrics.reduce((a, b) => a + b, 0)
      const average = sum / metrics.length
      const min = Math.min(...metrics)
      const max = Math.max(...metrics)
      
      stats[strategy] = {
        averageTime: Math.round(average),
        minTime: min,
        maxTime: max,
        sampleSize: metrics.length
      }
    }
    
    return stats
  }

  /**
   * Clear caches and reset metrics
   */
  reset(): void {
    this.selectionCache.clear()
    this.performanceMetrics.clear()
    permanentLogger.info('STRATEGY_MANAGER', 'Caches and metrics reset')
  }

  /**
   * Get available strategies
   * 
   * @returns List of strategy names
   */
  getAvailableStrategies(): string[] {
    return Array.from(this.strategies.keys())
  }

  /**
   * Add custom strategy
   * 
   * @param name - Strategy name
   * @param strategy - Strategy instance
   */
  addStrategy(name: string, strategy: BaseStrategy): void {
    this.strategies.set(name, strategy)
    permanentLogger.info('STRATEGY_MANAGER', 'Custom strategy added', { name })
  }
}