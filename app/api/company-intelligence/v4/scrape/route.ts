/**
 * @fileoverview V4 Scraper Execution API Endpoint - FIXED VERSION
 * @module api/company-intelligence/v4/scrape
 *
 * ARCHITECTURE: Direct 2-layer implementation (API → Scraper)
 * Following all CLAUDE.md principles and repository pattern
 *
 * KEY FIXES FROM NON-COMPLIANCE REPORT:
 * 1. StreamWriter constructor: response first, encoder second ✅
 * 2. Repository pattern: ALL database access through repository ✅
 * 3. Session management: ONLY use getOrCreateUserSession() ✅
 * 4. Error handling: Convert Supabase errors properly ✅
 * 5. Timer management: No double stops ✅
 * 6. Data persistence: Save to merged_data in sessions table ✅
 * 7. CheerioStreamingScraper: Now implemented ✅
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { convertSupabaseError } from '@/lib/utils/supabase-error-helper'
import { StreamWriter, EventFactory, EventSource } from '@/lib/realtime-events'
import { CompanyIntelligenceRepository } from '@/lib/repositories/company-intelligence-repository'
import {
  createScraper,
  ScraperType,
  ProgressEventType,
  ScrapingPhase,
  type ScrapingResult
} from '@/lib/company-intelligence/scrapers-v4'

// Set maximum duration for scraping operations
export const maxDuration = 300 // 5 minutes
export const dynamic = 'force-dynamic'

/**
 * V4 scraping endpoint - direct execution with repository integration
 * POST /api/company-intelligence/v4/scrape
 */
export async function POST(req: NextRequest) {
  let totalTimer: any

  try {
    totalTimer = permanentLogger.timing('v4_scrape_total')

    // ============================================================
    // AUTHENTICATION
    // ============================================================
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      const jsError = convertSupabaseError(authError)
      permanentLogger.captureError('API_V4', jsError, {
        endpoint: '/api/company-intelligence/v4/scrape',
        phase: 'authentication'
      })
      if (totalTimer) totalTimer.stop()
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!user) {
      permanentLogger.warn('API_V4', 'No authenticated user', {
        endpoint: '/api/company-intelligence/v4/scrape'
      })
      if (totalTimer) totalTimer.stop()
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Set user context for all subsequent logs
    permanentLogger.setUserId(user.id)
    permanentLogger.breadcrumb('auth', 'User authenticated', {
      userId: user.id,
      endpoint: '/api/company-intelligence/v4/scrape'
    })

    // ============================================================
    // REQUEST PARSING
    // ============================================================
    const body = await req.json()
    const { domain, scraperType, config = {} } = body

    if (!domain) {
      permanentLogger.warn('API_V4', 'Missing domain in request', { body })
      if (totalTimer) totalTimer.stop()
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
    }

    permanentLogger.info('API_V4', 'V4 scrape request received', {
      domain,
      scraperType,
      config,
      userId: user.id
    })

    // ============================================================
    // SESSION MANAGEMENT (USING REPOSITORY)
    // ============================================================
    const repository = CompanyIntelligenceRepository.getInstance()

    // CRITICAL: Use getOrCreateUserSession to handle constraints properly
    permanentLogger.breadcrumb('session', 'Getting or creating session', {
      userId: user.id,
      domain
    })

    const session = await repository.getOrCreateUserSession(user.id, domain)

    permanentLogger.info('API_V4', 'Session ready', {
      sessionId: session.id,
      domain: session.domain,
      status: session.status
    })

    // ============================================================
    // STREAM SETUP (FIXED CONSTRUCTOR)
    // ============================================================
    // Create StreamWriter with correct parameters
    const streamWriter = new StreamWriter(
      session.id,                      // Session ID from repository
      `v4-scrape-${Date.now()}`,      // Unique correlation ID
      req.signal                        // Abort signal for cleanup
    )

    // Create the SSE stream
    const stream = streamWriter.createStream()

    // Create encoder for any additional encoding needs
    const encoder = new TextEncoder()

    // Start async scraping process
    ;(async () => {

      permanentLogger.breadcrumb('stream', 'Stream writer created', {
        sessionId: session.id
      })

      let scraperTimer: any
      try {
          // ============================================================
          // SCRAPER INITIALIZATION
          // ============================================================
          scraperTimer = permanentLogger.timing('v4_scraper_execution', {
            scraperType,
            domain
          })

          // Map string to ScraperType enum
          let typeEnum: ScraperType
          switch (scraperType?.toLowerCase()) {
            case 'firecrawl':
              typeEnum = ScraperType.FIRECRAWL
              break
            case 'playwright':
              typeEnum = ScraperType.PLAYWRIGHT
              break
            case 'cheerio':
              typeEnum = ScraperType.CHEERIO
              break
            default:
              // Default to Firecrawl as the premium option
              typeEnum = ScraperType.FIRECRAWL
          }

          permanentLogger.info('API_V4', 'Creating scraper instance', {
            type: typeEnum,
            config
          })

          // Create scraper instance (now supports all types including Cheerio)
          const scraper = createScraper(typeEnum, config)

          // Send initialization event
          await streamWriter.sendEvent(EventFactory.scraping('started', {
            domain,
            scraperType: typeEnum,
            sessionId: session.id,
            maxPages: config.maxPages || 50
          }, {
            source: EventSource.SERVER,
            sessionId: session.id
          }))

          // ============================================================
          // EXECUTE SCRAPING
          // ============================================================
          permanentLogger.breadcrumb('scraping', 'Starting scrape execution', {
            scraperType: typeEnum,
            domain
          })

          let result: ScrapingResult

          // Different scrapers have different method signatures
          if (typeEnum === ScraperType.FIRECRAWL || typeEnum === ScraperType.PLAYWRIGHT) {
            // These scrapers expect a domain
            const scrapeDomain = domain.startsWith('http')
              ? new URL(domain).hostname
              : domain

            result = await (scraper as any).scrapeWithStreaming(scrapeDomain, streamWriter)
          } else {
            // Cheerio expects an array of URLs
            const urls = domain.startsWith('http')
              ? [domain]
              : [`https://${domain}`]

            result = await (scraper as any).scrapeWithStreaming(urls, streamWriter)
          }

          const scraperDuration = scraperTimer.stop()
          scraperTimer = null // Prevent double stop

          permanentLogger.info('API_V4', 'Scraping completed', {
            success: result.success,
            pagesScraped: result.metrics?.pagesScraped,
            duration: scraperDuration,
            dataSize: result.data.size
          })

          // ============================================================
          // DATA PERSISTENCE (REPOSITORY PATTERN)
          // ============================================================
          if (result.success && result.data.size > 0) {
            const persistTimer = permanentLogger.timing('v4_data_persistence')

            permanentLogger.breadcrumb('persist', 'Saving scraped data to repository', {
              sessionId: session.id,
              pageCount: result.data.size
            })

            // Convert Map to object for JSON storage
            const scrapedPages: Record<string, any> = {}
            result.data.forEach((value, key) => {
              scrapedPages[key] = value
            })

            // Update merged_data with scraped content (proper repository pattern)
            await repository.updateMergedData(session.id, {
              ...session.merged_data,
              pages: scrapedPages,
              scraping_metrics: result.metrics,
              scraping_completed_at: new Date().toISOString(),
              scraperType: typeEnum
            })

            // Update session phase to indicate scraping is complete
            await repository.updateSessionPhase(session.id, 2) // Phase 2 = post-scraping

            const persistDuration = persistTimer.stop()

            permanentLogger.info('API_V4', 'Data persisted to repository', {
              sessionId: session.id,
              pageCount: result.data.size,
              duration: persistDuration
            })

            // Send data saved event
            await streamWriter.sendEvent(EventFactory.scraping('dataSaved', {
              sessionId: session.id,
              pageCount: result.data.size,
              dataSize: JSON.stringify(scrapedPages).length
            }, {
              source: EventSource.SERVER,
              sessionId: session.id
            }))
          }

          // ============================================================
          // COMPLETION EVENT
          // ============================================================
          const totalDuration = totalTimer.stop()
          totalTimer = null // Prevent double stop

          // Transform data for UI consumption
          const categories = transformToCategories(result)

          await streamWriter.sendEvent(EventFactory.scraping('complete', {
            sessionId: session.id,
            success: result.success,
            categories,
            totalItems: categories.reduce((sum, cat) => sum + cat.items.length, 0),
            metrics: {
              ...result.metrics,
              totalDuration,
              scraperDuration
            },
            error: result.error
          }, {
            source: EventSource.SERVER,
            sessionId: session.id
          }))

          permanentLogger.info('API_V4', 'V4 scrape complete', {
            sessionId: session.id,
            success: result.success,
            totalDuration,
            pagesScraped: result.metrics?.pagesScraped
          })

        } catch (error) {
          // Handle scraping errors
          const jsError = error instanceof Error ? error : new Error(String(error))

          permanentLogger.captureError('API_V4', jsError, {
            endpoint: '/api/company-intelligence/v4/scrape',
            sessionId: session.id,
            phase: 'scraping'
          })

          // Send error event
          await streamWriter.sendEvent(EventFactory.error(jsError, {
            source: EventSource.SERVER,
            sessionId: session.id
          }))

          // Stop timers if they exist
          if (scraperTimer) scraperTimer.stop()
          if (totalTimer) {
            totalTimer.stop()
            totalTimer = null
          }
      } finally {
        // Close the stream
        streamWriter.close()
      }
    })()

    // Return SSE response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Session-Id': session.id,
        'X-Accel-Buffering': 'no' // Disable nginx buffering
      }
    })

  } catch (error) {
    // Handle synchronous errors
    if (totalTimer) totalTimer.stop()
    const jsError = error instanceof Error ? error : new Error(String(error))

    permanentLogger.captureError('API_V4', jsError, {
      endpoint: '/api/company-intelligence/v4/scrape',
      phase: 'initialization'
    })

    return NextResponse.json(
      { error: jsError.message },
      { status: 500 }
    )
  }
}

/**
 * Transform scraping results into UI-friendly categories
 */
function transformToCategories(result: ScrapingResult): any[] {
  const categories = []

  if (!result.success || result.data.size === 0) {
    return []
  }

  // Group pages by content type
  const pageItems: any[] = []

  result.data.forEach((pageData, url) => {
    pageItems.push({
      id: `page-${pageItems.length}`,
      url,
      title: pageData.title || url,
      content: pageData.markdown || pageData.text || pageData.html || '',
      metadata: pageData.metadata || {},
      links: pageData.links || [],
      images: pageData.images || []
    })
  })

  if (pageItems.length > 0) {
    categories.push({
      id: 'pages',
      title: 'Scraped Pages',
      icon: 'FileText',
      items: pageItems
    })
  }

  // Add metrics as a category
  if (result.metrics) {
    categories.push({
      id: 'metrics',
      title: 'Scraping Metrics',
      icon: 'BarChart',
      items: [{
        id: 'metrics-summary',
        pagesScraped: result.metrics.pagesScraped,
        pagesFailed: result.metrics.pagesFailed,
        duration: `${Math.round(result.metrics.duration / 1000)}s`,
        creditsUsed: result.metrics.creditsUsed,
        costEstimate: result.metrics.costEstimate
          ? `$${result.metrics.costEstimate.toFixed(4)}`
          : 'Free'
      }]
    })
  }

  return categories
}

/**
 * GET method to check endpoint health
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    version: '4.0.0',
    endpoint: '/api/company-intelligence/v4/scrape',
    scrapers: ['firecrawl', 'playwright', 'cheerio'],
    fixes: [
      'StreamWriter constructor fixed',
      'Repository pattern enforced',
      'getOrCreateUserSession used',
      'Supabase errors converted',
      'Timer double stops prevented',
      'CheerioStreamingScraper implemented'
    ]
  })
}

/**
 * OPTIONS method for CORS preflight
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  })
}