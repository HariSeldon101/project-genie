/**
 * Scraper Module Entry Point
 * Uses the new strategy-based scraping system with automatic strategy selection
 * 
 * LEGACY CODE ARCHIVED: Old PlaywrightScraper and CheerioScraper moved to /archive/legacy-scrapers
 * Date: January 8, 2025
 */

import { StrategyManager } from './strategies/strategy-manager'
import { permanentLogger } from '@/lib/utils/permanent-logger'

// Track if the manager has been initialized
let strategyManager: StrategyManager | null = null

/**
 * Initialize the strategy-based scraping system
 * Uses automatic strategy detection for optimal scraping
 */
export function initializeScrapers() {
  if (strategyManager) {
    permanentLogger.info('SCRAPER_INIT', 'Strategy manager already initialized')
    return strategyManager
  }
  
  // Create strategy manager with default config
  strategyManager = new StrategyManager({
    enableFallback: true,
    debug: process.env.NODE_ENV === 'development'
  })
  
  permanentLogger.info('SCRAPER_INIT', 'Strategy-based scraper system initialized', {
    strategies: ['static', 'dynamic', 'spa'],
    features: ['social-media-extraction', 'metadata-extraction', 'auto-strategy-detection']
  })
  
  return strategyManager
}

/**
 * Get the current strategy manager instance
 */
export function getStrategyManager(): StrategyManager {
  if (!strategyManager) {
    return initializeScrapers()
  }
  return strategyManager
}

/**
 * Reset the scraping system
 */
export function resetScraperFactory() {
  if (strategyManager) {
    strategyManager.cleanup()
    strategyManager = null
  }
  permanentLogger.info('SCRAPER_INIT', 'Scraper system reset')
}

// Export for backward compatibility (will be removed in future)
export function getScraperFactory() {
  permanentLogger.warn('SCRAPER_INIT', 'getScraperFactory is deprecated, use getStrategyManager instead')
  return {
    getScraper: () => getStrategyManager(),
    getScrapers: () => ['strategy-manager'],
    registerLazy: () => {
      permanentLogger.warn('SCRAPER_INIT', 'registerLazy is deprecated in strategy-based system')
    }
  }
}

// Export main components
export { StrategyManager } from './strategies/strategy-manager'
export { BaseStrategy } from './strategies/base-strategy'
export { StaticStrategy } from './strategies/static-strategy'
export { DynamicStrategy } from './strategies/dynamic-strategy'
export { SPAStrategy } from './strategies/spa-strategy'

// Export extractors
export { socialMediaExtractor } from './extractors/social-media-extractor'

// Export handlers
export { BrowserPool } from './browser/browser-pool'
export { ScrollHandler } from './handlers/scroll-handler'
export { PaginationHandler } from './handlers/pagination-handler'

// Export types
export type { 
  ScrapingResult, 
  StrategyConfig 
} from './strategies/base-strategy'
export type { 
  ManagerConfig, 
  BulkScrapingResult 
} from './strategies/strategy-manager'
export type { 
  SocialMediaAccount 
} from './extractors/social-media-extractor'

// Legacy types for compatibility (deprecated)
export type { IScraper, ScrapedData, ScrapeOptions } from './types'
export { WebsiteDetector } from './detection/website-detector'
export type { WebsiteAnalysis, WebsiteSignature } from './detection/website-detector'