/**
 * Scraper Orchestrator - Main Entry Point with Repository Integration
 *
 * Coordinates scraping operations using the plugin system while
 * integrating with CompanyIntelligenceRepository for database access.
 *
 * Key Features:
 * - Database-first architecture (URLs from DB, not UI)
 * - Integrates with CompanyIntelligenceRepository
 * - Maintains backward compatibility with old API
 * - Auto-selects best scraper plugin for URLs
 *
 * @module core/scraper-orchestrator
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { CompanyIntelligenceRepository } from '@/lib/repositories/company-intelligence-repository'
import { ScraperRegistry } from './scraper-registry'
import { createScraperContext, cleanupScraperContext } from './scraper-context'
import type {
  ScraperOptions,
  ScraperResult,
  ScraperPlugin,
  PageResult,
  ScrapingError
} from './types'

/**
 * Main orchestrator for scraping operations
 * Integrates plugins with repository pattern using dependency injection
 */
export class ScraperOrchestrator {
  private registry: ScraperRegistry
  private repository: CompanyIntelligenceRepository
  private initialized = false

  /**
   * Constructor with dependency injection for repository
   * @param repository - Optional repository instance (will create default if not provided)
   */
  constructor(repository?: CompanyIntelligenceRepository) {
    // Initialize registry (singleton)
    this.registry = ScraperRegistry.getInstance()

    // Use provided repository or create default one
    // This allows for testing and different configurations
    if (repository) {
      this.repository = repository
    } else {
      // Fallback for backward compatibility - should be deprecated
      // Ideally, repository should always be injected
      permanentLogger.warn('SCRAPER_ORCHESTRATOR', 'Creating repository without injection - consider passing repository to constructor', {
        recommendation: 'Pass CompanyIntelligenceRepository instance to constructor'
      })
      // Import only when needed for backward compatibility
      const { createClient } = require('@/lib/supabase/client')
      const supabase = createClient()
      this.repository = new CompanyIntelligenceRepository(supabase)
    }

    permanentLogger.info('SCRAPER_ORCHESTRATOR', 'Orchestrator created', {
      hasRepository: true,
      hasRegistry: true,
      injected: !!repository
    })
  }

  /**
   * Initialize the orchestrator
   * Discovers and loads all plugins
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      permanentLogger.breadcrumb('orchestrator_skip', 'Already initialized')
      return
    }

    const timer = permanentLogger.timing('orchestrator_init')

    try {
      // Initialize plugin registry
      await this.registry.initialize()

      this.initialized = true

      permanentLogger.info('SCRAPER_ORCHESTRATOR', 'Orchestrator initialized', {
        pluginCount: this.registry.getAllScrapers().length,
        duration: timer.stop()
      })
    } catch (error) {
      permanentLogger.captureError('SCRAPER_ORCHESTRATOR', error as Error, {
        phase: 'initialization'
      })
      throw error
    }
  }

  /**
   * Execute scraping for a session
   * URLs are fetched from database, not passed directly!
   */
  async executeForSession(
    sessionId: string,
    options?: ScraperOptions
  ): Promise<ScraperResult> {
    permanentLogger.info('SCRAPER_ORCHESTRATOR', 'Executing for session', {
      sessionId,
      options
    })

    try {
      // Ensure initialized
      if (!this.initialized) {
        await this.initialize()
      }

      // Fetch session data from repository
      const session = await this.repository.getSession(sessionId)

      if (!session) {
        throw new Error(`Session not found: ${sessionId}`)
      }

      // Get URLs from session (database-first!)
      const urls = session.discovered_urls || []

      if (urls.length === 0) {
        throw new Error('No URLs found in session')
      }

      permanentLogger.breadcrumb('urls_from_db', 'URLs fetched from database', {
        sessionId,
        urlCount: urls.length,
        domain: session.domain
      })

      // Execute scraping with URLs from database
      return await this.execute(urls, {
        ...options,
        sessionId,
        companyId: session.id // Use session ID as company ID
      })
    } catch (error) {
      permanentLogger.captureError('SCRAPER_ORCHESTRATOR', error as Error, {
        sessionId,
        phase: 'session_execution'
      })
      throw error
    }
  }

  /**
   * Execute scraping with given URLs
   * Maintains backward compatibility
   */
  async execute(
    urls: string[],
    options?: ScraperOptions
  ): Promise<ScraperResult> {
    const timer = permanentLogger.timing('orchestrator_execute')
    const sessionId = options?.sessionId || `temp_${Date.now()}`
    const companyId = options?.companyId || sessionId

    permanentLogger.info('SCRAPER_ORCHESTRATOR', 'Starting execution', {
      urlCount: urls.length,
      sessionId,
      companyId
    })

    // Create scraper context
    const context = createScraperContext(sessionId, companyId, options)

    let selectedPlugin: ScraperPlugin | null = null
    let result: ScraperResult | null = null

    try {
      // Select best scraper for first URL
      selectedPlugin = this.registry.getBestScraper(urls[0])

      if (!selectedPlugin) {
        throw new Error(`No suitable scraper found for URLs`)
      }

      permanentLogger.breadcrumb('plugin_selected', 'Plugin selected for execution', {
        pluginId: selectedPlugin.config.id,
        pluginName: selectedPlugin.config.name,
        strategy: selectedPlugin.config.strategy
      })

      // Initialize plugin with context
      await selectedPlugin.initialize(context)

      // Execute scraping
      result = await selectedPlugin.execute(urls, options)

      // Save results to database if we have a real session
      if (options?.sessionId && !options.sessionId.startsWith('temp_')) {
        await this.saveResults(options.sessionId, result)
      }

      const duration = timer.stop()

      permanentLogger.info('SCRAPER_ORCHESTRATOR', 'Execution complete', {
        sessionId,
        scraperId: result.scraperId,
        pagesScraped: result.pages.length,
        success: result.success,
        duration
      })

      return result
    } catch (error) {
      permanentLogger.captureError('SCRAPER_ORCHESTRATOR', error as Error, {
        sessionId,
        pluginId: selectedPlugin?.config.id,
        phase: 'execution'
      })

      // Return error result
      return this.createErrorResult(error as Error, urls, selectedPlugin)
    } finally {
      // Clean up
      if (selectedPlugin) {
        try {
          await selectedPlugin.cleanup()
        } catch (cleanupError) {
          permanentLogger.captureError('SCRAPER_ORCHESTRATOR', cleanupError as Error, {
            phase: 'cleanup',
            pluginId: selectedPlugin.config.id
          })
        }
      }

      cleanupScraperContext(context)
      timer.stop()
    }
  }

  /**
   * Save scraping results to database
   */
  private async saveResults(
    sessionId: string,
    result: ScraperResult
  ): Promise<void> {
    try {
      permanentLogger.breadcrumb('save_results', 'Saving results to database', {
        sessionId,
        pageCount: result.pages.length
      })

      // Update session with results
      await this.repository.updateSessionData(sessionId, {
        scraped_data: result.pages,
        scraping_stats: result.stats,
        last_scraper_used: result.scraperId
      })

      // Save individual page results
      for (const page of result.pages) {
        if (page.success && page.data) {
          await this.repository.savePageIntelligence({
            session_id: sessionId,
            url: page.url,
            content: page.data,
            metadata: {
              scraperId: result.scraperId,
              duration: page.duration,
              bytesDownloaded: page.bytesDownloaded
            }
          })
        }
      }

      permanentLogger.info('SCRAPER_ORCHESTRATOR', 'Results saved to database', {
        sessionId,
        savedPages: result.pages.filter(p => p.success).length
      })
    } catch (error) {
      permanentLogger.captureError('SCRAPER_ORCHESTRATOR', error as Error, {
        sessionId,
        phase: 'save_results'
      })
      // Don't throw - saving is non-critical
    }
  }

  /**
   * Create error result structure
   */
  private createErrorResult(
    error: Error,
    urls: string[],
    plugin: ScraperPlugin | null
  ): ScraperResult {
    const errors: ScrapingError[] = urls.map(url => ({
      url,
      error: error.message,
      code: 'ORCHESTRATOR_ERROR',
      timestamp: Date.now()
    }))

    return {
      success: false,
      scraperId: plugin?.config.id || 'unknown',
      scraperName: plugin?.config.name || 'Unknown',
      strategy: plugin?.config.strategy || 'unknown',
      timestamp: Date.now(),
      pages: [],
      errors,
      stats: {
        duration: 0,
        pagesAttempted: urls.length,
        pagesSucceeded: 0,
        pagesFailed: urls.length,
        bytesDownloaded: 0,
        dataPointsExtracted: 0,
        linksDiscovered: 0,
        averageTimePerPage: 0,
        successRate: 0
      },
      discoveredLinks: [],
      metadata: {
        error: error.message,
        stack: error.stack
      }
    }
  }

  /**
   * Get available scrapers
   */
  getAvailableScrapers(): Array<{
    id: string
    name: string
    strategy: string
    priority: number
  }> {
    return this.registry.getAllScrapers().map(plugin => ({
      id: plugin.config.id,
      name: plugin.config.name,
      strategy: plugin.config.strategy,
      priority: plugin.config.priority
    }))
  }

  /**
   * Check if orchestrator is ready
   */
  isReady(): boolean {
    return this.initialized && this.registry.isInitialized()
  }
}