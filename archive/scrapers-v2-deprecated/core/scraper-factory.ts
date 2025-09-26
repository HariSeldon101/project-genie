/**
 * Factory for creating and managing scraper instances
 *
 * @module scrapers-v2/core/scraper-factory
 * @description Handles creation and caching of scraper instances.
 * Implements the factory pattern with singleton for global instance
 * management and caching for performance optimization.
 *
 * DESIGN PATTERNS:
 * - Factory: Creates scraper instances based on type
 * - Singleton: Single global factory instance
 * - Cache: Reuses scraper instances for performance
 *
 * COMPLIANCE:
 * - No mock scrapers or fallbacks
 * - Throws errors for unimplemented scrapers
 * - Single source of scraper instantiation
 * - Full TypeScript type safety with enums
 */

import { ScraperType } from '@/lib/company-intelligence/types/scraping-enums'
import type { IScraper } from './scraper.interface'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { assertNever } from './types'
import type { FirecrawlConfig } from '../types/firecrawl.types'

// Import scraper implementations
// These will be created in subsequent steps
// import { StaticScraper } from '../implementations/static-scraper'
// import { DynamicScraper } from '../implementations/dynamic-scraper'
// import { FirecrawlScraper } from '../implementations/firecrawl-scraper'

/**
 * Factory for creating scraper instances
 * Manages scraper lifecycle and caching
 *
 * RESPONSIBILITIES:
 * - Create scraper instances based on type
 * - Cache instances for reuse
 * - Validate scraper availability
 * - Manage scraper configuration
 */
export class ScraperFactory {
  /**
   * Singleton instance
   */
  private static instance: ScraperFactory

  /**
   * Cache for scraper instances
   * Reuses instances to avoid recreation overhead
   */
  private scraperCache = new Map<ScraperType, IScraper>()

  /**
   * Firecrawl configuration
   * Set by orchestrator based on user preferences
   */
  private firecrawlConfig?: Partial<FirecrawlConfig>

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    permanentLogger.info('SCRAPER_FACTORY', 'Factory initialized', {
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Get singleton factory instance
   *
   * @returns Factory instance
   */
  static getInstance(): ScraperFactory {
    if (!this.instance) {
      this.instance = new ScraperFactory()
    }
    return this.instance
  }

  /**
   * Get scraper instance (cached for reuse)
   * Creates new instance if not in cache
   *
   * @param type - Type of scraper to create
   * @returns Scraper instance
   * @throws Error if scraper type is not implemented
   *
   * CONTRACT:
   * - Returns same instance for same type (cached)
   * - Throws error for unimplemented types (no mock)
   * - Logs creation and cache hits
   */
  getScraper(type: ScraperType): IScraper {
    // Check cache first
    if (this.scraperCache.has(type)) {
      permanentLogger.debug('SCRAPER_FACTORY', 'Returning cached scraper', {
        type,
        cached: true
      })
      return this.scraperCache.get(type)!
    }

    // Create new scraper instance
    let scraper: IScraper

    try {
      switch (type) {
        case ScraperType.STATIC:
          // TODO: Uncomment when StaticScraper is implemented
          // scraper = new StaticScraper()
          throw new Error('Static scraper implementation pending')
          break

        case ScraperType.DYNAMIC:
          // TODO: Uncomment when DynamicScraper is implemented
          // scraper = new DynamicScraper()
          throw new Error('Dynamic scraper implementation pending')
          break

        case ScraperType.FIRECRAWL:
          // TODO: Uncomment when FirecrawlScraper is implemented
          // scraper = new FirecrawlScraper(this.firecrawlConfig)
          throw new Error('Firecrawl scraper implementation pending')
          break

        case ScraperType.SPA:
          // Phase 2 implementation
          throw new Error('SPA scraper not yet implemented (Phase 2)')

        case ScraperType.API:
          // Phase 2 implementation
          throw new Error('API scraper not yet implemented (Phase 2)')

        default:
          // This ensures all enum values are handled
          // TypeScript will error if a case is missing
          return assertNever(type)
      }
    } catch (error) {
      permanentLogger.captureError('SCRAPER_FACTORY', error as Error, {
        operation: 'getScraper',
        type
      })
      throw error
    }

    // Cache for reuse
    this.scraperCache.set(type, scraper!)

    permanentLogger.info('SCRAPER_FACTORY', 'Scraper instance created', {
      type,
      cached: false,
      cacheSize: this.scraperCache.size
    })

    return scraper!
  }

  /**
   * Check if scraper type is available
   * Used by orchestrator to determine routing options
   *
   * @param type - Scraper type to check
   * @returns True if scraper is implemented and available
   */
  isAvailable(type: ScraperType): boolean {
    try {
      // Try to create scraper to check availability
      // This is temporary until all scrapers are implemented
      const scraper = this.getScraper(type)
      return scraper !== null
    } catch {
      // Scraper not available
      return false
    }
  }

  /**
   * Get list of available scrapers
   * Used for UI and orchestrator decisions
   *
   * @returns Array of available scraper types
   */
  getAvailableScrapers(): ScraperType[] {
    const available: ScraperType[] = []

    // Check each scraper type
    for (const type of Object.values(ScraperType)) {
      if (this.isAvailable(type as ScraperType)) {
        available.push(type as ScraperType)
      }
    }

    permanentLogger.debug('SCRAPER_FACTORY', 'Available scrapers queried', {
      count: available.length,
      types: available
    })

    return available
  }

  /**
   * Set Firecrawl configuration
   * Used by orchestrator to configure Firecrawl features
   *
   * @param config - Firecrawl configuration
   */
  setFirecrawlConfig(config: Partial<FirecrawlConfig>): void {
    this.firecrawlConfig = config

    // Clear cached Firecrawl scraper to use new config
    if (this.scraperCache.has(ScraperType.FIRECRAWL)) {
      permanentLogger.info('SCRAPER_FACTORY', 'Clearing Firecrawl cache for new config')
      this.scraperCache.delete(ScraperType.FIRECRAWL)
    }
  }

  /**
   * Get scraper capabilities
   * Returns metadata about what a scraper can do
   *
   * @param type - Scraper type
   * @returns Capabilities object or null if not available
   */
  getCapabilities(type: ScraperType): ScraperCapabilities | null {
    try {
      const scraper = this.getScraper(type)

      // Return capabilities based on scraper type
      switch (type) {
        case ScraperType.STATIC:
          return {
            handlesJavaScript: false,
            canScreenshot: false,
            canInteract: false,
            canExtractSchema: false,
            supportsParallel: true,
            maxParallel: 10
          }

        case ScraperType.DYNAMIC:
          return {
            handlesJavaScript: true,
            canScreenshot: true,
            canInteract: true,
            canExtractSchema: false,
            supportsParallel: true,
            maxParallel: 3
          }

        case ScraperType.FIRECRAWL:
          return {
            handlesJavaScript: true,
            canScreenshot: true,
            canInteract: true,
            canExtractSchema: true,
            supportsParallel: true,
            maxParallel: 5
          }

        default:
          return null
      }
    } catch {
      return null
    }
  }

  /**
   * Clear scraper cache
   * Used for testing or when scrapers need to be recreated
   */
  clearCache(): void {
    const cacheSize = this.scraperCache.size

    // Cleanup any resources held by scrapers
    for (const [type, scraper] of this.scraperCache.entries()) {
      // If scrapers have cleanup methods, call them here
      permanentLogger.debug('SCRAPER_FACTORY', 'Removing scraper from cache', { type })
    }

    this.scraperCache.clear()

    permanentLogger.info('SCRAPER_FACTORY', 'Cache cleared', {
      previousSize: cacheSize,
      currentSize: 0
    })
  }

  /**
   * Get cache statistics
   * Used for monitoring and debugging
   *
   * @returns Cache statistics
   */
  getCacheStats(): {
    size: number
    types: ScraperType[]
    memoryEstimate: number
  } {
    return {
      size: this.scraperCache.size,
      types: Array.from(this.scraperCache.keys()),
      memoryEstimate: this.scraperCache.size * 1024 * 50 // Rough estimate: 50KB per scraper
    }
  }

  /**
   * Reset factory to initial state
   * Clears cache and configuration
   */
  reset(): void {
    this.clearCache()
    this.firecrawlConfig = undefined

    permanentLogger.info('SCRAPER_FACTORY', 'Factory reset to initial state')
  }
}

/**
 * Type definition for scraper capabilities
 * Imported from scraper.interface but re-exported here for convenience
 */
interface ScraperCapabilities {
  readonly handlesJavaScript: boolean
  readonly canScreenshot: boolean
  readonly canInteract: boolean
  readonly canExtractSchema: boolean
  readonly supportsParallel: boolean
  readonly maxParallel: number
}

/**
 * Export singleton instance for convenience
 * Most code will use this rather than calling getInstance()
 */
export const scraperFactory = ScraperFactory.getInstance()