/**
 * DiscoveryOrchestrator
 *
 * Orchestrates the entire discovery process by coordinating multiple services.
 * Handles both streaming and non-streaming discovery modes.
 * Manages database updates and error recovery.
 *
 * @module company-intelligence/orchestrators
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { CompanyIntelligenceRepository } from '@/lib/repositories/company-intelligence-repository'
import { CompanyIntelligenceRepository } from '@/lib/repositories/company-intelligence-repository'
import { EnvironmentConfig } from '@/lib/config/environment'
import { categorizeUrl } from '../utils/url-categorizer'
import { SitemapDiscoveryService } from '../services/sitemap-discovery'
import { PageCrawlerService, type DiscoveredPage } from '../services/page-crawler'
import { URLNormalizationService } from '../services/url-normalization'
import {
  StreamingDiscoveryService,
  StreamWriter,
  createStreamingDiscovery
} from '../services/streaming-discovery'
import type { Database } from '@/lib/database.types'

/**
 * Discovery request parameters
 */
export interface DiscoveryRequest {
  domain: string
  sessionId?: string
  enableIntelligence?: boolean
  maxUrls?: number
  timeout?: number
  validateUrls?: boolean
}

/**
 * Discovery result
 */
export interface DiscoveryResult {
  domain: string
  pages: Array<{
    url: string
    title: string
    priority: number
    source: string
    lastmod?: string
    changefreq?: string
  }>
  sitemapFound: boolean
  discoveredFrom: {
    sitemap: number
    homepage: number
    patterns: number
    blog: number
    total: number
  }
  intelligenceEnabled: boolean
  sessionId?: string
  summary: {
    totalPages: number
    validPages?: number
    invalidPages?: number
    timeMs: number
  }
  errors: string[]
}

/**
 * Orchestrator for the discovery process
 * Coordinates all discovery services and manages the workflow
 */
export class DiscoveryOrchestrator {
  private domain: string
  private baseUrl: string
  private options: Required<DiscoveryRequest>
  private errors: string[] = []
  private repository = CompanyIntelligenceRepository.getInstance()
  private useRepository = EnvironmentConfig.isFeatureEnabled('USE_INTELLIGENCE_REPOSITORY')

  constructor(request: DiscoveryRequest) {
    // Normalize domain
    this.domain = request.domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
    this.baseUrl = `https://${this.domain}`

    // Set default options
    this.options = {
      domain: this.domain,
      sessionId: request.sessionId,
      enableIntelligence: request.enableIntelligence ?? true,
      maxUrls: request.maxUrls ?? 200,
      timeout: request.timeout ?? 60000,
      validateUrls: request.validateUrls ?? false
    }
  }

  /**
   * Execute discovery without streaming
   */
  async execute(): Promise<DiscoveryResult> {
    const startTime = Date.now()

    permanentLogger.info('DISCOVERY_ORCHESTRATOR', 'Starting discovery', {
      domain: this.domain,
      sessionId: this.options.sessionId,
      maxUrls: this.options.maxUrls
    })

    const result: DiscoveryResult = {
      domain: this.domain,
      pages: [],
      sitemapFound: false,
      discoveredFrom: {
        sitemap: 0,
        homepage: 0,
        patterns: 0,
        blog: 0,
        total: 0
      },
      intelligenceEnabled: this.options.enableIntelligence,
      sessionId: this.options.sessionId,
      summary: {
        totalPages: 0,
        timeMs: 0
      },
      errors: []
    }

    try {
      // Initialize services
      const sitemapService = new SitemapDiscoveryService(this.domain, {
        maxUrls: this.options.maxUrls,
        timeout: this.options.timeout
      })

      const crawlerService = new PageCrawlerService(this.baseUrl, {
        timeout: this.options.timeout,
        maxLinksPerPage: 200
      })

      const normalizationService = new URLNormalizationService(this.domain)

      // Phase 1: Sitemap Discovery
      permanentLogger.info('DISCOVERY_ORCHESTRATOR', 'Phase 1: Sitemap discovery')
      const sitemapResult = await sitemapService.execute()

      if (sitemapResult.sitemapFound) {
        result.sitemapFound = true
        result.discoveredFrom.sitemap = sitemapResult.entries.length

        // Convert sitemap entries to pages
        for (const entry of sitemapResult.entries) {
          result.pages.push({
            url: entry.url,
            title: this.generateTitle(entry.url),
            category: categorizeUrl(entry.url),
            priority: entry.priority || 0.5,
            source: entry.source,
            lastmod: entry.lastmod,
            changefreq: entry.changefreq
          })
        }
      }

      // Phase 2: Homepage Crawl
      permanentLogger.info('DISCOVERY_ORCHESTRATOR', 'Phase 2: Homepage crawl')
      const homepageResult = await crawlerService.crawlHomepage()

      // Merge homepage discoveries
      const homepagePages = this.mergeDiscoveries(
        result.pages,
        homepageResult.pages,
        normalizationService
      )
      result.discoveredFrom.homepage = homepagePages.newCount
      result.pages = homepagePages.merged

      // Phase 3: Blog Discovery
      permanentLogger.info('DISCOVERY_ORCHESTRATOR', 'Phase 3: Blog discovery')
      const blogUrls = this.findBlogUrls(result.pages)

      for (const blogUrl of blogUrls) {
        const blogResult = await crawlerService.crawlBlogSection(blogUrl)
        const blogPages = this.mergeDiscoveries(
          result.pages,
          blogResult.pages,
          normalizationService
        )
        result.discoveredFrom.blog += blogPages.newCount
        result.pages = blogPages.merged
      }

      // Phase 4: URL Normalization and Deduplication
      permanentLogger.info('DISCOVERY_ORCHESTRATOR', 'Phase 4: Normalization and deduplication')
      result.pages = normalizationService.deduplicateUrls(result.pages)
      result.pages = normalizationService.prioritizeUrls(result.pages)

      // Phase 5: URL Validation (optional)
      if (this.options.validateUrls) {
        permanentLogger.info('DISCOVERY_ORCHESTRATOR', 'Phase 5: URL validation')
        const urls = result.pages.map(p => p.url)
        const validationResult = await normalizationService.validateUrls(urls)

        // Filter to only valid URLs
        result.pages = result.pages.filter(p =>
          validationResult.validUrls.includes(p.url)
        )

        result.summary.validPages = validationResult.validUrls.length
        result.summary.invalidPages = validationResult.invalidUrls.length
      }

      // Apply max URL limit
      if (result.pages.length > this.options.maxUrls) {
        result.pages = result.pages.slice(0, this.options.maxUrls)
      }

      // Update totals
      result.discoveredFrom.total = result.pages.length
      result.summary.totalPages = result.pages.length
      result.summary.timeMs = Date.now() - startTime

      // Update database if session ID provided
      if (this.options.sessionId) {
        await this.updateDatabase(result)
      }

      permanentLogger.info('DISCOVERY_ORCHESTRATOR', 'Discovery complete', {
        totalPages: result.pages.length,
        sitemapFound: result.sitemapFound,
        timeMs: result.summary.timeMs
      })

    } catch (error) {
      permanentLogger.captureError('DISCOVERY_ORCHESTRATOR', error as Error, {
        domain: this.domain,
        phase: 'execution'
      })
      result.errors.push(error instanceof Error ? error.message : 'Unknown error')
    }

    return result
  }

  /**
   * Execute discovery with streaming
   */
  executeWithStream(signal?: AbortSignal): ReadableStream {
    const { service, createStream } = createStreamingDiscovery({
      sessionId: this.options.sessionId,
      signal
    })

    return createStream(async (writer: StreamWriter) => {
      const startTime = Date.now()

      // Add breadcrumb for streaming discovery start
      permanentLogger.info('DISCOVERY_ORCHESTRATOR', 'Starting streaming discovery', {
        domain: this.domain,
        sessionId: this.options.sessionId,
        maxUrls: this.options.maxUrls,
        timestamp: new Date().toISOString()
      })

      try {
        // Initialize services
        const sitemapService = new SitemapDiscoveryService(this.domain, {
          maxUrls: this.options.maxUrls,
          timeout: this.options.timeout
        })

        const crawlerService = new PageCrawlerService(this.baseUrl, {
          timeout: this.options.timeout
        })

        const normalizationService = new URLNormalizationService(this.domain)

        let allPages: any[] = []
        const discoveryStats = {
          sitemap: 0,
          homepage: 0,
          patterns: 0,
          blog: 0,
          total: 0
        }

        // Phase 1: Sitemap Discovery
        permanentLogger.info('DISCOVERY_ORCHESTRATOR', 'Starting Phase 1: Sitemap Discovery', {
          domain: this.domain,
          phaseNumber: 1
        })
        writer.phaseStart('sitemap')

        try {
          const sitemapResult = await sitemapService.execute()

          if (sitemapResult.sitemapFound) {
            discoveryStats.sitemap = sitemapResult.entries.length

            for (const entry of sitemapResult.entries) {
              allPages.push({
                url: entry.url,
                title: this.generateTitle(entry.url),
                category: categorizeUrl(entry.url),
                priority: entry.priority || 0.5,
                source: entry.source,
                lastmod: entry.lastmod,
                changefreq: entry.changefreq
              })
            }
          }

          writer.phaseComplete('sitemap', {
            found: sitemapResult.sitemapFound,
            count: sitemapResult.entries.length
          })

          permanentLogger.info('DISCOVERY_ORCHESTRATOR', 'Phase 1 complete: Sitemap Discovery', {
            found: sitemapResult.sitemapFound,
            entriesCount: sitemapResult.entries.length,
            duration: Date.now() - startTime
          })

          // CRITICAL FIX: Clone array to prevent reference issues
          // Deep clone each page object to ensure proper serialisation
          const pagesClone = JSON.parse(JSON.stringify(allPages))

          // Log pages data to verify it exists before sending
          permanentLogger.info('DISCOVERY_ORCHESTRATOR', 'Sending pages update', {
            phase: 'current',
            pageCount: pagesClone.length,
            isArray: Array.isArray(pagesClone),
            firstPageUrl: pagesClone[0]?.url || null,
            hasPages: pagesClone.length > 0,
            sampleUrls: pagesClone.slice(0, 3).map(p => p.url),
            validStructure: pagesClone.length > 0 && pagesClone.every(p => p.url && typeof p.url === 'string')
          })

          // Send incremental update with cloned array
          writer.dataUpdate({
            type: 'pages-update',
            pages: pagesClone,
            totalCount: pagesClone.length
          })

        } catch (error) {
          permanentLogger.captureError('DISCOVERY_ORCHESTRATOR', error as Error, {
            phase: 'sitemap',
            domain: this.domain
          })
          writer.phaseError('sitemap', error as Error)
        }

        // Phase 2: Homepage Crawl
        permanentLogger.info('DISCOVERY_ORCHESTRATOR', 'Starting Phase 2: Homepage Crawl', {
          domain: this.domain,
          phaseNumber: 2
        })
        writer.phaseStart('homepage')

        try {
          const homepageResult = await crawlerService.crawlHomepage()
          const merged = this.mergeDiscoveries(allPages, homepageResult.pages, normalizationService)

          discoveryStats.homepage = merged.newCount
          allPages = merged.merged

          writer.phaseComplete('homepage', {
            found: homepageResult.pages.length,
            new: merged.newCount
          })

          permanentLogger.info('DISCOVERY_ORCHESTRATOR', 'Phase 2 complete: Homepage Crawl', {
            pagesFound: homepageResult.pages.length,
            newPages: merged.newCount,
            totalPages: allPages.length
          })

          // CRITICAL FIX: Clone array to prevent reference issues
          // Deep clone each page object to ensure proper serialisation
          const pagesClone = JSON.parse(JSON.stringify(allPages))

          // Log pages data to verify it exists before sending
          permanentLogger.info('DISCOVERY_ORCHESTRATOR', 'Sending pages update', {
            phase: 'current',
            pageCount: pagesClone.length,
            isArray: Array.isArray(pagesClone),
            firstPageUrl: pagesClone[0]?.url || null,
            hasPages: pagesClone.length > 0,
            sampleUrls: pagesClone.slice(0, 3).map(p => p.url),
            validStructure: pagesClone.length > 0 && pagesClone.every(p => p.url && typeof p.url === 'string')
          })

          // Send incremental update with cloned array
          writer.dataUpdate({
            type: 'pages-update',
            pages: pagesClone,
            totalCount: pagesClone.length
          })

        } catch (error) {
          permanentLogger.captureError('DISCOVERY_ORCHESTRATOR', error as Error, {
            phase: 'homepage',
            domain: this.domain
          })
          writer.phaseError('homepage', error as Error)
        }

        // Phase 3: Pattern Discovery REMOVED - We only discover real pages, not guessed URLs

        // Phase 3: Blog Discovery (renumbered after removing pattern discovery)
        permanentLogger.info('DISCOVERY_ORCHESTRATOR', 'Starting Phase 3: Blog Discovery', {
          domain: this.domain,
          phaseNumber: 3
        })
        writer.phaseStart('blog')

        try {
          const blogUrls = this.findBlogUrls(allPages)
          let blogCount = 0

          for (const blogUrl of blogUrls) {
            const blogResult = await crawlerService.crawlBlogSection(blogUrl)
            const merged = this.mergeDiscoveries(allPages, blogResult.pages, normalizationService)

            blogCount += merged.newCount
            allPages = merged.merged
          }

          discoveryStats.blog = blogCount

          writer.phaseComplete('blog', {
            found: blogCount
          })

          permanentLogger.info('DISCOVERY_ORCHESTRATOR', 'Phase 3 complete: Blog Discovery', {
            blogPagesFound: blogCount,
            totalPages: allPages.length
          })

          // CRITICAL FIX: Clone array to prevent reference issues
          // Deep clone each page object to ensure proper serialisation
          const pagesClone = JSON.parse(JSON.stringify(allPages))

          // Log pages data to verify it exists before sending
          permanentLogger.info('DISCOVERY_ORCHESTRATOR', 'Sending pages update', {
            phase: 'current',
            pageCount: pagesClone.length,
            isArray: Array.isArray(pagesClone),
            firstPageUrl: pagesClone[0]?.url || null,
            hasPages: pagesClone.length > 0,
            sampleUrls: pagesClone.slice(0, 3).map(p => p.url),
            validStructure: pagesClone.length > 0 && pagesClone.every(p => p.url && typeof p.url === 'string')
          })

          // Send incremental update with cloned array
          writer.dataUpdate({
            type: 'pages-update',
            pages: pagesClone,
            totalCount: pagesClone.length
          })

        } catch (error) {
          permanentLogger.captureError('DISCOVERY_ORCHESTRATOR', error as Error, {
            phase: 'blog',
            domain: this.domain
          })
          writer.phaseError('blog', error as Error)
        }

        // Phase 4: Validation (renumbered after removing pattern discovery)
        permanentLogger.info('DISCOVERY_ORCHESTRATOR', 'Starting Phase 4: Validation', {
          domain: this.domain,
          phaseNumber: 4,
          pagesBeforeValidation: allPages.length
        })
        writer.phaseStart('validation')

        try {
          // Log initial state
          permanentLogger.info('DISCOVERY_ORCHESTRATOR', 'Validation phase - initial state', {
            pagesBeforeValidation: allPages.length,
            sampleUrls: allPages.slice(0, 3).map(p => p.url)
          })

          // Normalize and deduplicate
          allPages = normalizationService.deduplicateUrls(allPages)
          permanentLogger.info('DISCOVERY_ORCHESTRATOR', 'After deduplication', {
            pageCount: allPages.length
          })

          allPages = normalizationService.prioritizeUrls(allPages)
          permanentLogger.info('DISCOVERY_ORCHESTRATOR', 'After prioritization', {
            pageCount: allPages.length
          })

          // Optional URL validation - Skip for sitemap URLs (trust the sitemap)
          if (this.options.validateUrls) {
            permanentLogger.info('DISCOVERY_ORCHESTRATOR', 'URL validation enabled', {
              validateUrls: this.options.validateUrls,
              pagesBeforeValidation: allPages.length
            })

            // Separate sitemap URLs from other sources
            const sitemapPages = allPages.filter(p => p.source === 'sitemap')
            const otherPages = allPages.filter(p => p.source !== 'sitemap')

            permanentLogger.info('DISCOVERY_ORCHESTRATOR', 'Separated pages by source', {
              sitemapPages: sitemapPages.length,
              otherPages: otherPages.length,
              sources: [...new Set(allPages.map(p => p.source))]
            })

            // Only validate non-sitemap URLs
            if (otherPages.length > 0) {
              const urls = otherPages.map(p => p.url)
              const validationResult = await normalizationService.validateUrls(urls)
              const validOtherPages = otherPages.filter(p => validationResult.validUrls.includes(p.url))

              permanentLogger.info('DISCOVERY_ORCHESTRATOR', 'Validation results', {
                urlsToValidate: urls.length,
                validUrls: validationResult.validUrls.length,
                invalidUrls: validationResult.invalidUrls.length,
                validOtherPages: validOtherPages.length
              })

              // Combine trusted sitemap pages with validated other pages
              allPages = [...sitemapPages, ...validOtherPages]

              permanentLogger.info('DISCOVERY_ORCHESTRATOR', 'Combined pages after validation', {
                sitemapPages: sitemapPages.length,
                validOtherPages: validOtherPages.length,
                totalPages: allPages.length
              })
            } else {
              // If only sitemap pages, keep them all (trust the sitemap)
              allPages = sitemapPages
              permanentLogger.info('DISCOVERY_ORCHESTRATOR', 'Only sitemap pages, skipping validation', {
                pageCount: allPages.length
              })
            }
          } else {
            permanentLogger.info('DISCOVERY_ORCHESTRATOR', 'URL validation disabled', {
              pageCount: allPages.length
            })
          }

          // Apply limit
          if (allPages.length > this.options.maxUrls) {
            allPages = allPages.slice(0, this.options.maxUrls)
          }

          discoveryStats.total = allPages.length

          // Log final validation state
          permanentLogger.info('DISCOVERY_ORCHESTRATOR', 'Validation complete - final state', {
            finalPageCount: allPages.length,
            sampleUrls: allPages.slice(0, 5).map(p => p.url)
          })

          writer.phaseComplete('validation', {
            total: allPages.length
          })

          permanentLogger.info('DISCOVERY_ORCHESTRATOR', 'Phase 4 complete: Validation', {
            finalPageCount: allPages.length,
            validationApplied: this.options.validateUrls,
            limitApplied: allPages.length > this.options.maxUrls
          })

        } catch (error) {
          permanentLogger.captureError('DISCOVERY_ORCHESTRATOR', error as Error, {
            phase: 'validation',
            domain: this.domain
          })
          writer.phaseError('validation', error as Error)
        }

        // CRITICAL FIX: Clone pages array before sending final result
        // This prevents reference issues during streaming serialisation
        const finalPagesClone = JSON.parse(JSON.stringify(allPages))

        // Verify pages data before sending final event
        permanentLogger.info('DISCOVERY_ORCHESTRATOR', 'Preparing discovery complete event', {
          domain: this.domain,
          totalPages: finalPagesClone.length,
          isArray: Array.isArray(finalPagesClone),
          pagesType: typeof finalPagesClone,
          stats: discoveryStats,
          totalDuration: Date.now() - startTime,
          sampleUrls: finalPagesClone.slice(0, 5).map(p => p.url),
          firstPage: finalPagesClone[0] || null,
          pageStructureValid: finalPagesClone.length > 0 && finalPagesClone[0].url !== undefined
        })

        // Send final result with properly cloned pages
        writer.dataUpdate({
          type: 'discovery-complete',
          domain: this.domain,
          pages: finalPagesClone,
          sitemapFound: discoveryStats.sitemap > 0,
          discoveredFrom: discoveryStats,
          sessionId: this.options.sessionId,
          summary: {
            totalPages: finalPagesClone.length
          }
        })

        // Update database if session ID provided
        if (this.options.sessionId) {
          try {
            await this.updateDatabase({
              domain: this.domain,
              pages: allPages,
              sitemapFound: discoveryStats.sitemap > 0,
              discoveredFrom: discoveryStats,
              intelligenceEnabled: this.options.enableIntelligence,
              sessionId: this.options.sessionId,
              summary: {
                totalPages: allPages.length,
                timeMs: 0
              },
              errors: []
            })
          } catch (dbError) {
            // Capture database error with timing
            const errorTime = Date.now()
            permanentLogger.captureError('DISCOVERY_ORCHESTRATOR', dbError as Error, {
              domain: this.domain,
              phase: 'database-update',
              sessionId: this.options.sessionId,
              pagesFound: allPages.length,
              timing: { dbErrorMs: errorTime }
            })

            // Send error event to UI so user sees the actual error
            writer.notification(
              `Database update failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`,
              'error'
            )

            // Send discovery-failed event with the database error
            writer.dataUpdate({
              type: 'discovery-failed',
              domain: this.domain,
              error: dbError instanceof Error ? dbError.message : 'Database update failed',
              sessionId: this.options.sessionId,
              pagesFound: allPages.length // Include how many pages were found
            })

            // Re-throw to maintain error chain
            throw dbError
          }
        }

      } catch (error) {
        const startTime = Date.now()

        // Capture error with breadcrumbs and timing
        permanentLogger.captureError('DISCOVERY_ORCHESTRATOR', error as Error, {
          domain: this.domain,
          streaming: true,
          phase: 'discovery',
          timing: {
            errorCaptureMs: Date.now() - startTime
          }
        })

        // Send error event to frontend BEFORE throwing
        writer.notification(
          `Discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'error'
        )

        // Send a discovery-failed event so UI knows what happened
        writer.dataUpdate({
          type: 'discovery-failed',
          domain: this.domain,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          sessionId: this.options.sessionId
        })

        // Re-throw to maintain error propagation
        throw error
      }
    })
  }

  /**
   * Merge discovered pages, avoiding duplicates
   */
  private mergeDiscoveries(
    existing: any[],
    newPages: DiscoveredPage[],
    normalizationService: URLNormalizationService
  ): { merged: any[], newCount: number } {
    const existingUrls = new Set(existing.map(p => normalizationService.normalizeUrl(p.url)))
    let newCount = 0
    const merged = [...existing]

    for (const page of newPages) {
      const normalized = normalizationService.normalizeUrl(page.url)
      if (!existingUrls.has(normalized)) {
        merged.push({
          url: normalized,
          title: page.title,
          category: categorizeUrl(normalized),
          priority: page.priority,
          source: page.source
        })
        existingUrls.add(normalized)
        newCount++
      }
    }

    return { merged, newCount }
  }

  /**
   * Find blog URLs in discovered pages
   */
  private findBlogUrls(pages: any[]): string[] {
    // Dynamic blog discovery - find blog sections from actual discovered pages
    // Look for common blog patterns only in URLs that actually exist
    const blogPatterns = ['/blog', '/news', '/articles', '/posts']
    const blogUrls = new Set<string>()

    for (const page of pages) {
      // Only check pages that were discovered from sitemap or crawling (not patterns)
      if (page.source === 'sitemap' || page.source === 'crawl') {
        for (const pattern of blogPatterns) {
          // Check if this is a blog section root (not a blog post)
          if (page.url.includes(pattern) && !page.url.includes(`${pattern}/`)) {
            blogUrls.add(page.url)
          }
        }
      }
    }

    // Only return blog URLs that were actually discovered, not guessed
    return Array.from(blogUrls).slice(0, 3) // Limit to 3 blog sections
  }

  /**
   * Generate title from URL
   */
  private generateTitle(url: string): string {
    const path = url.replace(this.baseUrl, '').replace(/^\//, '')

    if (!path) return 'Home'

    return path
      .split('/')
      .filter(Boolean)
      .map(segment => segment.replace(/-/g, ' '))
      .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' > ')
  }

  /**
   * Update database with discovery results
   * Uses repository pattern if feature flag enabled
   */
  private async updateDatabase(result: DiscoveryResult) {
    try {
      // Prepare data for database
      const discoveredUrls = result.pages.map(p => p.url)
      const mergedData = {
        sitemap: {
          pages: result.pages,
          sitemapFound: result.sitemapFound,
          discoveredFrom: result.discoveredFrom,
          intelligenceEnabled: result.intelligenceEnabled
        },
        stats: {
          totalPages: result.pages.length,
          dataPoints: 0,
          totalLinks: 0
        },
        pages: {},
        extractedData: {}
      }

      // NEW: Use repository if feature flag enabled
      if (this.useRepository) {
        permanentLogger.info('DISCOVERY_ORCHESTRATOR', 'Using repository for database update', {
          sessionId: result.sessionId,
          urlCount: discoveredUrls.length
        })

        // Update discovered URLs
        await this.repository.updateDiscoveredUrls(result.sessionId, discoveredUrls)

        // Update merged data
        await this.repository.updateMergedData(result.sessionId, mergedData)

        // Update session phase
        await this.repository.updateSessionPhase(result.sessionId, 1)

        permanentLogger.info('DISCOVERY_ORCHESTRATOR', 'Database updated via repository', {
          sessionId: result.sessionId,
          urlsStored: discoveredUrls.length,
          pagesFound: result.pages.length
        })

        return
      }

      // Use repository pattern for database access
      const repository = CompanyIntelligenceRepository.getInstance()
      const session = await repository.getSession(result.sessionId)

      if (session) {
        const updated = await repository.updateSession(
          result.sessionId,
          {
            status: 'active',
            phase: 1,
            discovered_urls: discoveredUrls,
            merged_data: mergedData,
            updated_at: new Date().toISOString()
          },
          session.version
        )

        if (!updated) {
          throw new Error('Failed to update session in database')
        }

        permanentLogger.info('DISCOVERY_ORCHESTRATOR', 'Database updated successfully', {
          sessionId: result.sessionId,
          urlsStored: discoveredUrls.length,
          pagesFound: result.pages.length
        })
      }

    } catch (error) {
      permanentLogger.captureError('DISCOVERY_ORCHESTRATOR', error as Error, {
        sessionId: result.sessionId,
        phase: 'database-update',
        errorMessage: error instanceof Error ? error.message : String(error)
      })

      // Re-throw to prevent silent failure (Requirement #20)
      throw error
    }
  }
}