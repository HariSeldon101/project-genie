/**
 * DiscoveryPhaseExecutor - Shared logic for discovery phases
 *
 * CRITICAL: This class eliminates ~400 lines of duplicate code between
 * execute() and executeWithStream() methods in DiscoveryOrchestrator
 *
 * Following DRY/SOLID principles:
 * - Single Responsibility: Execute discovery phases only
 * - DRY: No duplicate logic between streaming/non-streaming
 * - Open/Closed: Easy to add new phases without modifying existing code
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
// TODO: These services were removed - need to migrate to v3 scrapers
// import { SitemapDiscoveryService } from '../services/sitemap-discovery'
// import { PageCrawlerService } from '../services/page-crawler'
// import { URLNormalizationService } from '../services/url-normalization'
import type { DiscoveryResult, DiscoveryProgress } from '../types/discovery'

export interface PhaseResult {
  phase: string
  success: boolean
  data: any
  error?: Error
  duration?: number
}

export type ProgressCallback = (progress: DiscoveryProgress) => void | Promise<void>

// Service instance cache - prevents duplicate services for same domain
// TODO: Temporarily disabled until migrated to v3 scrapers
const serviceCache = new Map<string, {
  sitemapService: any // SitemapDiscoveryService
  crawlerService: any // PageCrawlerService
  createdAt: number
}>()

// Cache expiry time - 10 minutes
const SERVICE_CACHE_TTL = 10 * 60 * 1000

/**
 * Executes discovery phases with optional progress reporting
 * Shared by both streaming and non-streaming execution paths
 */
export class DiscoveryPhaseExecutor {
  // TODO: Temporarily using 'any' until migrated to v3 scrapers
  private sitemapService: any | null = null // SitemapDiscoveryService
  private crawlerService: any | null = null // PageCrawlerService
  private normalizationService: any // URLNormalizationService
  private currentDomain: string | null = null

  constructor() {
    permanentLogger.debug('PHASE_EXECUTOR', 'Constructor called')
    // Only initialize truly stateless services
    // Stateful services will be created lazily with domain
    // TODO: Temporarily disabled until migrated to v3 scrapers
    // this.normalizationService = new URLNormalizationService()
    permanentLogger.debug('PHASE_EXECUTOR', 'Services temporarily disabled - migration to v3 needed')
  }

  /**
   * Clear expired services from cache
   */
  private clearExpiredServices() {
    const now = Date.now()
    for (const [domain, services] of serviceCache.entries()) {
      if (now - services.createdAt > SERVICE_CACHE_TTL) {
        permanentLogger.info('PHASE_EXECUTOR', 'Clearing expired services from cache', {
          domain,
          ageMs: now - services.createdAt
        })
        serviceCache.delete(domain)
      }
    }
  }

  /**
   * Get or create services for a domain
   */
  private getOrCreateServices(domain: string): {
    sitemapService: SitemapDiscoveryService
    crawlerService: PageCrawlerService
  } {
    // Clear expired entries first
    this.clearExpiredServices()

    // Check cache
    const cached = serviceCache.get(domain)
    if (cached) {
      permanentLogger.debug('PHASE_EXECUTOR', 'Using cached services', {
        domain,
        ageMs: Date.now() - cached.createdAt
      })
      return {
        sitemapService: cached.sitemapService,
        crawlerService: cached.crawlerService
      }
    }

    // Create new services
    permanentLogger.info('PHASE_EXECUTOR', 'Creating new services for domain', { domain })
    const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`
    const services = {
      sitemapService: new SitemapDiscoveryService(domain),
      crawlerService: new PageCrawlerService(baseUrl),
      createdAt: Date.now()
    }

    // Cache the services
    serviceCache.set(domain, services)

    return {
      sitemapService: services.sitemapService,
      crawlerService: services.crawlerService
    }
  }

  /**
   * Clean up services for a specific domain
   */
  public cleanup(domain?: string) {
    if (domain) {
      serviceCache.delete(domain)
      permanentLogger.info('PHASE_EXECUTOR', 'Cleaned up services for domain', { domain })
    } else {
      // Clear all if no domain specified
      const count = serviceCache.size
      serviceCache.clear()
      permanentLogger.info('PHASE_EXECUTOR', 'Cleared all cached services', { count })
    }

    // Reset instance variables
    this.sitemapService = null
    this.crawlerService = null
    this.currentDomain = null
  }

  /**
   * Get cache statistics
   */
  public getCacheStats() {
    const now = Date.now()
    const stats = {
      cachedDomains: serviceCache.size,
      domains: Array.from(serviceCache.keys()),
      ages: Array.from(serviceCache.values()).map(s => Math.round((now - s.createdAt) / 1000))
    }
    return stats
  }

  /**
   * Execute all discovery phases
   * @param domain - The domain to discover
   * @param onProgress - Optional callback for progress updates
   * @returns Combined discovery result
   */
  async executeAllPhases(
    domain: string,
    onProgress?: ProgressCallback
  ): Promise<DiscoveryResult> {
    permanentLogger.debug('PHASE_EXECUTOR', 'executeAllPhases called', { domain })
    const startTime = Date.now()
    const results: PhaseResult[] = []

    permanentLogger.info('DISCOVERY_PHASE_EXECUTOR', 'Starting discovery phases', {
      domain,
      hasProgressCallback: !!onProgress
    })

    try {
      // Get or create services for this domain
      if (domain !== this.currentDomain) {
        const services = this.getOrCreateServices(domain)
        this.sitemapService = services.sitemapService
        this.crawlerService = services.crawlerService
        this.currentDomain = domain

        permanentLogger.info('PHASE_EXECUTOR', 'Services initialized for new domain', {
          domain,
          previousDomain: this.currentDomain
        })
      }

      // Phase 1: Sitemap Discovery
      permanentLogger.debug('PHASE_EXECUTOR', 'Starting Phase 1: Sitemap Discovery')
      const sitemapResult = await this.executePhase(
        'sitemap',
        async () => {
          permanentLogger.debug('PHASE_EXECUTOR', 'Calling sitemapService.discover', { domain })
          const discoveryResult = await this.sitemapService!.discover(domain)
          permanentLogger.debug('PHASE_EXECUTOR', 'sitemapService.discover completed', {
            hasData: !!discoveryResult,
            urlCount: discoveryResult?.urls?.length || 0
          })
          return discoveryResult
        },
        onProgress
      )
      permanentLogger.debug('PHASE_EXECUTOR', 'Sitemap phase result', {
        success: sitemapResult.success,
        hasData: !!sitemapResult.data
      })
      results.push(sitemapResult)

      // Check if we should continue after sitemap
      permanentLogger.debug('PHASE_EXECUTOR', 'Continuing to Phase 2...')

      // Phase 2: Homepage Crawl
      permanentLogger.debug('PHASE_EXECUTOR', 'Starting Phase 2: Homepage Crawl')
      const crawlResult = await this.executePhase(
        'homepage-crawl',
        async () => {
          permanentLogger.debug('PHASE_EXECUTOR', 'Calling crawlerService.crawlHomepage')
          const result = await this.crawlerService!.crawlHomepage()
          permanentLogger.debug('PHASE_EXECUTOR', 'Homepage crawl completed', {
            pagesFound: result?.pages?.length || 0
          })
          return result
        },
        onProgress
      )
      permanentLogger.debug('PHASE_EXECUTOR', 'Homepage crawl result', {
        success: crawlResult.success,
        hasData: !!crawlResult.data
      })
      results.push(crawlResult)

      // Phase 3: Blog Discovery - using PageCrawlerService.crawlBlogSection
      // Find blog URLs from discovered pages first
      const blogUrls = this.findBlogUrls(results)
      const blogPages: any[] = []

      for (const blogUrl of blogUrls) {
        const blogResult = await this.executePhase(
          'blog-discovery',
          async () => this.crawlerService!.crawlBlogSection(blogUrl),
          onProgress
        )
        if (blogResult.success && blogResult.data?.pages) {
          blogPages.push(...blogResult.data.pages)
        }
      }

      results.push({
        phase: 'blog-discovery',
        success: true,
        data: { pages: blogPages },
        duration: Date.now() - startTime
      })

      // Phase 4: Normalization
      const allUrls = this.combineUrls(results)
      const normalizedResult = await this.executePhase(
        'normalization',
        async () => this.normalizationService.normalize(allUrls, domain),
        onProgress
      )
      results.push(normalizedResult)

      // Phase 5: URL Validation - using URLNormalizationService.validateUrls
      const validationResult = await this.executePhase(
        'validation',
        async () => this.normalizationService.validateUrls(normalizedResult.data || []),
        onProgress
      )
      results.push(validationResult)

      // Combine all results
      const discoveryResult = this.combineResults(results, domain)

      permanentLogger.info('DISCOVERY_PHASE_EXECUTOR', 'All phases completed', {
        domain,
        duration: Date.now() - startTime,
        totalUrls: discoveryResult.urls?.length || 0,
        phasesCompleted: results.filter(r => r.success).length
      })

      return discoveryResult

    } catch (error) {
      console.log('⚡ [PHASE_EXECUTOR] ERROR in executeAllPhases:', error)  // DEBUG
      permanentLogger.captureError('DISCOVERY_PHASE_EXECUTOR', error as Error, {
        domain,
        phase: 'execution'
      })
      throw error
    }
  }

  /**
   * Execute a single discovery phase with progress reporting
   * @param phaseName - Name of the phase
   * @param executor - Function to execute the phase
   * @param onProgress - Optional progress callback
   * @returns Phase result
   */
  private async executePhase(
    phaseName: string,
    executor: () => Promise<any>,
    onProgress?: ProgressCallback
  ): Promise<PhaseResult> {
    const phaseStart = Date.now()

    permanentLogger.breadcrumb('phase_start', `Starting ${phaseName}`, {
      phase: phaseName,
      timestamp: new Date().toISOString()
    })

    // Report phase start
    if (onProgress) {
      await onProgress({
        phase: phaseName,
        status: 'in_progress',
        message: `Executing ${phaseName}...`,
        timestamp: Date.now()
      })
    }

    try {
      const data = await executor()

      const duration = Date.now() - phaseStart

      permanentLogger.info('DISCOVERY_PHASE_EXECUTOR', `Phase completed: ${phaseName}`, {
        phase: phaseName,
        duration,
        dataSize: JSON.stringify(data).length
      })

      // Report phase completion
      if (onProgress) {
        await onProgress({
          phase: phaseName,
          status: 'completed',
          message: `${phaseName} completed successfully`,
          data,
          duration,
          timestamp: Date.now()
        })
      }

      return {
        phase: phaseName,
        success: true,
        data,
        duration
      }

    } catch (error) {
      const duration = Date.now() - phaseStart

      permanentLogger.captureError('DISCOVERY_PHASE_EXECUTOR', error as Error, {
        phase: phaseName,
        duration
      })

      // Report phase error
      if (onProgress) {
        await onProgress({
          phase: phaseName,
          status: 'error',
          message: `Error in ${phaseName}: ${(error as Error).message}`,
          error: error as Error,
          duration,
          timestamp: Date.now()
        })
      }

      return {
        phase: phaseName,
        success: false,
        data: null,
        error: error as Error,
        duration
      }
    }
  }

  /**
   * Combine URLs from multiple phase results
   * @param results - Array of phase results
   * @returns Combined URL array
   */
  private combineUrls(results: PhaseResult[]): string[] {
    const urls: string[] = []

    for (const result of results) {
      if (result.success && result.data) {
        if (Array.isArray(result.data)) {
          urls.push(...result.data)
        } else if (result.data.urls && Array.isArray(result.data.urls)) {
          urls.push(...result.data.urls)
        } else if (result.data.pages && Array.isArray(result.data.pages)) {
          urls.push(...result.data.pages.map((p: any) => p.url || p))
        }
      }
    }

    // Deduplicate
    return [...new Set(urls)]
  }

  /**
   * Combine all phase results into final discovery result
   * @param results - Array of phase results
   * @param domain - The domain discovered
   * @returns Combined discovery result
   */
  private combineResults(results: PhaseResult[], domain: string): DiscoveryResult {
    const validationResult = results.find(r => r.phase === 'validation')
    const normalizedResult = results.find(r => r.phase === 'normalization')

    // Use validated URLs if available, otherwise normalized, otherwise empty
    const finalUrls = validationResult?.data?.validUrls ||
                     normalizedResult?.data ||
                     []

    // Build merged_data structure for storage
    const sitemapData = results.find(r => r.phase === 'sitemap')?.data || {}
    const crawlData = results.find(r => r.phase === 'homepage-crawl')?.data || {}
    const blogData = results.find(r => r.phase === 'blog-discovery')?.data || {}

    return {
      success: results.some(r => r.success),
      domain,
      urls: finalUrls,
      merged_data: {
        sitemap: {
          pages: finalUrls.map((url: string) => ({
            url,
            source: this.determineSource(url, sitemapData, crawlData, blogData),
            discovered_at: new Date().toISOString()
          })),
          totalCount: finalUrls.length,
          timestamp: new Date().toISOString()
        },
        site_analysis: {
          sitemap_found: !!sitemapData.urls?.length,
          homepage_crawled: !!crawlData.urls?.length,
          blog_discovered: !!blogData.urls?.length,
          phases_completed: results.filter(r => r.success).map(r => r.phase),
          timestamp: new Date().toISOString()
        }
      },
      metadata: {
        phases: results.map(r => ({
          name: r.phase,
          success: r.success,
          duration: r.duration,
          error: r.error?.message
        })),
        totalDuration: results.reduce((sum, r) => sum + (r.duration || 0), 0),
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Find blog URLs from discovered pages
   * @param results - Phase results containing discovered pages
   * @returns Array of blog URLs to crawl
   */
  private findBlogUrls(results: PhaseResult[]): string[] {
    const blogPatterns = ['/blog', '/news', '/articles', '/posts']
    const blogUrls = new Set<string>()

    // Look through all discovered pages for blog sections
    for (const result of results) {
      if (result.success && result.data) {
        const pages = Array.isArray(result.data) ? result.data :
                      (result.data.pages || result.data.urls || [])

        for (const page of pages) {
          const url = typeof page === 'string' ? page : page.url
          if (url) {
            for (const pattern of blogPatterns) {
              // Check if this is a blog section root (not a blog post)
              if (url.includes(pattern) && !url.includes(`${pattern}/`)) {
                blogUrls.add(url)
              }
            }
          }
        }
      }
    }

    return Array.from(blogUrls).slice(0, 3) // Limit to 3 blog sections
  }

  /**
   * Determine the source of a URL based on which phase discovered it
   * @param url - The URL to check
   * @param sitemapData - Data from sitemap phase
   * @param crawlData - Data from crawl phase
   * @param blogData - Data from blog phase
   * @returns Source identifier
   */
  private determineSource(
    url: string,
    sitemapData: any,
    crawlData: any,
    blogData: any
  ): string {
    if (sitemapData.urls?.includes(url)) return 'sitemap'
    if (crawlData.urls?.includes(url)) return 'homepage'
    if (blogData.urls?.includes(url)) return 'blog'
    return 'discovery'
  }
}