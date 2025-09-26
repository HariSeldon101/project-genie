/**
 * @deprecated Since v4.0.0 - This file is part of the legacy v2 architecture
 * @replacement /lib/company-intelligence/scrapers-v4/
 *
 * DEPRECATION NOTICE:
 * This file uses the complex 7-layer abstraction that has been replaced
 * by the simpler v4 streaming architecture.
 *
 * What replaced this:
 * - UnifiedScraperExecutor → Direct scraper calls in v4 API route
 * - Session management → Eliminated, just use domain
 * - Lock management → Not needed with direct execution
 * - Data aggregation → Handled by scrapers themselves
 *
 * Migration path:
 * OLD: const executor = new UnifiedScraperExecutor()
 *      await executor.execute({ sessionId, domain, urls })
 *
 * NEW: const scraper = new FirecrawlStreamingScraper()
 *      await scraper.scrapeWithStreaming(domain, streamWriter)
 *
 * See: /docs/v4-streaming-scraper-architecture-22nd-sept.md
 *
 * This file will be removed in v5.0.0
 */

/**
 * UnifiedScraperExecutor - Type-Safe Refactored Version
 *
 * This orchestrator delegates to existing services rather than reimplementing everything
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import {
  CompanyIntelligenceRepository,
  type SessionData,
  type LockStatus
} from '@/lib/repositories/company-intelligence-repository'
import { SessionManager } from './session-manager'
import { ExecutionLockManager } from './execution-lock-manager'
import { DataAggregator } from './data-aggregator'
import { ScraperRegistry } from '../scrapers/core/scraper-registry'
import { ScraperOrchestrator } from '../scrapers/core/scraper-orchestrator'
import { ProgressReporter } from '../scrapers/utils/progress-reporter'
import { EventFactory } from '@/lib/realtime-events'
import type {
  ScraperResult,
  ScraperOptions
} from '../scrapers/core/types'
import type { URLMetadata } from '../scrapers/additive/types'

/**
 * Execution request interface
 */
interface ExecutionRequest {
  sessionId: string
  domain?: string
  scraperId?: string
  urls?: string[]
  options?: Record<string, unknown>
  progressCallback?: (event: unknown) => Promise<void>
}

/**
 * Execution result interface
 */
interface ExecutionResult {
  success: boolean
  sessionId: string
  scraperId?: string
  newData: {
    pages: number
    dataPoints: number
  }
  totalData: {
    pages: number
    dataPoints: number
  }
  duration: number
  error?: string
}

/**
 * Session status interface
 */
interface SessionStatus {
  id: string
  status: string
  phase: number
  progress: number
  totalDataPoints: number
  availableScrapers: Array<{ id: string; name: string; speed: string }>
  usedScrapers: string[]
  suggestions: string[]
}

export class UnifiedScraperExecutor {
  private repository: CompanyIntelligenceRepository
  private sessionManager: SessionManager
  private lockManager: ExecutionLockManager
  private aggregator: DataAggregator
  private registry: ScraperRegistry
  private orchestrator: ScraperOrchestrator
  private orchestratorInitialized = false
  // Note: progressReporter will be created per execution with session context

  constructor() {
    this.repository = CompanyIntelligenceRepository.getInstance()
    this.sessionManager = new SessionManager()
    this.lockManager = new ExecutionLockManager()
    this.aggregator = new DataAggregator()
    this.registry = ScraperRegistry.getInstance()
    // Pass repository to orchestrator for proper dependency injection
    this.orchestrator = new ScraperOrchestrator(this.repository)
    // ProgressReporter requires sessionId - created per execution
  }

  /**
   * Execute scraping operation with proper delegation
   */
  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const startTime = Date.now()
    const executionTimer = permanentLogger.timing('scraper_execution')

    permanentLogger.breadcrumb('execution_start', 'Starting scraper execution', {
      sessionId: request.sessionId,
      scraperId: request.scraperId
    })

    try {
      // Step 1: Get session from repository
      const session = await this.repository.getSession(request.sessionId)
      if (!session) {
        throw new Error(`Session not found: ${request.sessionId}`)
      }

      // Step 2: Extract URLs from existing session data
      const urls = this.extractUrls(session, request.urls)
      const metadata = this.extractMetadata(session)

      if (urls.length === 0) {
        throw new Error('No URLs found to scrape')
      }

      // Step 3: Acquire execution lock
      permanentLogger.breadcrumb('lock_acquisition', 'Acquiring execution lock', {
        sessionId: request.sessionId
      })

      const lockId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const lockAcquired = await this.repository.acquireLock(request.sessionId, lockId)

      if (!lockAcquired) {
        return {
          success: false,
          sessionId: request.sessionId,
          scraperId: request.scraperId,
          newData: { pages: 0, dataPoints: 0 },
          totalData: { pages: 0, dataPoints: 0 },
          duration: Date.now() - startTime,
          error: 'Could not acquire execution lock - another operation in progress'
        }
      }

      try {
        // Step 4: Initialize orchestrator and registry if needed
        if (!this.orchestratorInitialized) {
          permanentLogger.breadcrumb('orchestrator_init', 'Initializing orchestrator and registry')
          await this.orchestrator.initialize()
          await this.registry.initialize()
          this.orchestratorInitialized = true
        }

        // Step 5: Execute scrapers via orchestrator
        const scraperTimer = permanentLogger.timing('scraper_orchestration')

        // Build options conforming to ScraperOptions schema
        // Note: companyId expects a UUID but we only have company_name as a string
        // We'll omit it since it's optional in the schema
        const options: ScraperOptions = {
          sessionId: request.sessionId
          // companyId is optional and we don't have a UUID, only company_name string
        }

        // Store additional context separately if needed
        const executionContext = {
          urlMetadata: metadata,
          scraperId: request.scraperId,
          progressCallback: request.progressCallback
        }

        const scraperResult = await this.orchestrator.execute(urls, options)
        const scraperDuration = scraperTimer.stop()

        permanentLogger.breadcrumb('scraping_complete', 'Scraping completed', {
          pagesScraped: scraperResult.pages.length,
          duration: scraperDuration
        })

        // Step 5: Aggregate results
        permanentLogger.breadcrumb('aggregation_start', 'Starting data aggregation', {
          pageCount: scraperResult.pages.length
        })

        // Call aggregateData with correct parameters: (existingData, newData, phase)
        const aggregatedData = this.aggregator.aggregateData(
          session.merged_data || null,
          scraperResult,
          'scraping' // Specify the phase
        )

        // Step 6: Update session with results
        await this.repository.updateSession(request.sessionId, {
          merged_data: aggregatedData,
          phase: 2,
          status: 'completed' as 'completed'
        })

        // Step 7: Release lock
        await this.repository.releaseLock(request.sessionId, lockId)

        const totalDuration = executionTimer.stop()

        // Calculate data points using the aggregator (follows SOLID principles)
        const dataPointCount = this.aggregator.calculateDataPointsFromPages(scraperResult.pages)

        permanentLogger.info('UNIFIED_EXECUTOR', 'Execution completed successfully', {
          sessionId: request.sessionId,
          duration: totalDuration,
          pagesScraped: scraperResult.pages.length,
          dataPoints: dataPointCount
        })

        return {
          success: true,
          sessionId: request.sessionId,
          scraperId: request.scraperId,
          newData: {
            pages: scraperResult.pages.length,
            dataPoints: dataPointCount
          },
          totalData: {
            pages: aggregatedData.stats?.totalPages || 0,
            dataPoints: aggregatedData.stats?.dataPoints || 0
          },
          duration: totalDuration
        }

      } finally {
        // Always release lock even if error occurs
        await this.repository.releaseLock(request.sessionId, lockId)
      }

    } catch (error) {
      permanentLogger.captureError('UNIFIED_EXECUTOR', error as Error, {
        sessionId: request.sessionId,
        scraperId: request.scraperId,
        stage: 'execution'
      })

      executionTimer.stop()

      return {
        success: false,
        sessionId: request.sessionId,
        scraperId: request.scraperId,
        newData: { pages: 0, dataPoints: 0 },
        totalData: { pages: 0, dataPoints: 0 },
        duration: Date.now() - startTime,
        error: (error as Error).message
      }
    }
  }

  /**
   * Execute with streaming support
   */
  async executeWithStreaming(
    request: ExecutionRequest,
    progressCallback: (event: unknown) => Promise<void>
  ): Promise<void> {
    permanentLogger.breadcrumb('streaming_start', 'Starting streaming execution', {
      sessionId: request.sessionId
    })

    await this.execute({
      ...request,
      progressCallback
    })
  }

  /**
   * Get available scrapers from registry
   */
  getAvailableScrapers(): Array<{ id: string; name: string; speed: string }> {
    const scrapers = this.registry.getAllScrapers()
    return scrapers.map(scraper => ({
      id: scraper.config.id,
      name: scraper.config.name,
      speed: scraper.config.speed || 'medium'
    }))
  }

  /**
   * Get session status
   */
  async getSessionStatus(sessionId: string): Promise<SessionStatus> {
    try {
      const session = await this.repository.getSession(sessionId)

      if (!session) {
        return {
          id: sessionId,
          status: 'not_found',
          phase: 0,
          progress: 0,
          totalDataPoints: 0,
          availableScrapers: this.getAvailableScrapers(),
          usedScrapers: [],
          suggestions: ['Session not found']
        }
      }

      const aggregatedData = session.merged_data || {}
      const progress = this.calculateProgress(session)

      return {
        id: session.id,
        status: session.status,
        phase: session.phase || 0,
        progress,
        totalDataPoints: aggregatedData.stats?.dataPoints || 0,
        availableScrapers: this.getAvailableScrapers(),
        usedScrapers: Object.keys(aggregatedData.stats?.phaseCounts || {}),
        suggestions: this.generateSuggestions(aggregatedData)
      }
    } catch (error) {
      permanentLogger.captureError('UNIFIED_EXECUTOR', error as Error, {
        sessionId,
        stage: 'getSessionStatus'
      })

      return {
        id: sessionId,
        status: 'error',
        phase: 0,
        progress: 0,
        totalDataPoints: 0,
        availableScrapers: [],
        usedScrapers: [],
        suggestions: ['Error retrieving session status']
      }
    }
  }

  /**
   * Extract URLs from session data
   * Following single source of truth - reads from merged_data.site_analysis.sitemap_pages
   */
  private extractUrls(session: SessionData, explicitUrls?: string[]): string[] {
    const urls: string[] = []

    // Get URLs from merged_data.site_analysis.sitemap_pages (single source of truth)
    if (session.merged_data?.site_analysis?.sitemap_pages) {
      const sitemapPages = session.merged_data.site_analysis.sitemap_pages

      if (Array.isArray(sitemapPages)) {
        // Extract URLs from page objects
        const extractedUrls = sitemapPages
          .map((page: any) => {
            // Handle both string URLs and page objects
            if (typeof page === 'string') {
              return page
            } else if (page && typeof page === 'object' && page.url) {
              return page.url
            }
            return null
          })
          .filter((url): url is string => typeof url === 'string' && url.length > 0)

        urls.push(...extractedUrls)
      }
    }

    // Add any explicitly passed URLs
    if (explicitUrls && Array.isArray(explicitUrls)) {
      const uniqueUrls = explicitUrls.filter(url => !urls.includes(url))
      urls.push(...uniqueUrls)
    }

    // Fallback to domain if no URLs found
    if (urls.length === 0 && session.domain) {
      urls.push(`https://${session.domain}`)
    }

    return urls
  }

  /**
   * Extract metadata from session
   */
  private extractMetadata(session: SessionData): Map<string, URLMetadata> {
    const metadata = new Map<string, URLMetadata>()

    // Extract metadata from merged_data.sitemap if available
    if (session.merged_data?.sitemap?.urls && Array.isArray(session.merged_data.sitemap.urls)) {
      session.merged_data.sitemap.urls.forEach((item: any) => {
        if (item.url && typeof item.url === 'string') {
          // Build metadata conforming to URLMetadata interface
          const urlMeta: URLMetadata = {
            url: item.url,
            priority: item.priority === 'high' || item.priority === 'medium' || item.priority === 'low'
              ? item.priority
              : undefined,
            lastmod: item.lastmod,
            pageType: item.type || 'page'
          }
          metadata.set(item.url, urlMeta)
        }
      })
    }

    return metadata
  }

  /**
   * Calculate progress percentage
   */
  private calculateProgress(session: SessionData): number {
    const totalPhases = 4
    const currentPhase = session.phase || 0
    return Math.round((currentPhase / totalPhases) * 100)
  }

  /**
   * Generate suggestions based on current data
   * Analyzes aggregated data and provides actionable suggestions
   */
  private generateSuggestions(aggregatedData: any): string[] {
    const suggestions: string[] = []

    if (!aggregatedData.stats) {
      suggestions.push('Start scraping to collect data')
    } else {
      const { totalPages, dataPoints } = aggregatedData.stats

      if (totalPages < 5) {
        suggestions.push('Consider adding more URLs to scrape')
      }

      if (dataPoints < 50) {
        suggestions.push('Try different scrapers to extract more data')
      }

      if (totalPages > 10 && dataPoints > 100) {
        suggestions.push('Good amount of data collected, ready for analysis')
      }
    }

    return suggestions
  }
}

// Export singleton instance
export const unifiedScraperExecutor = new UnifiedScraperExecutor()