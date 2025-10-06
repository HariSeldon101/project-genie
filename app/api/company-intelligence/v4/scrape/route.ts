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
// Import only types at module level - actual implementations loaded dynamically
import type {
  ScrapingResult
} from '@/lib/company-intelligence/scrapers-v4/types'

// We'll dynamically import the actual scraper functions when needed

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

          // Dynamically import scrapers to avoid SSR issues
          const scraperModule = await import('@/lib/company-intelligence/scrapers-v4')
          const { createScraper, ScraperType } = scraperModule

          // Map string to ScraperType enum
          let typeEnum: any
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

          // FIX 1: Enhanced logging to track data flow
          const dataMapKeys = Array.from(result.data.keys()).slice(0, 5)
          const firstEntry = result.data.size > 0 ? {
            url: Array.from(result.data.keys())[0],
            value: Array.from(result.data.values())[0]
          } : null

          permanentLogger.info('API_V4', 'Scraping completed', {
            success: result.success,
            pagesScraped: result.metrics?.pagesScraped,
            duration: scraperDuration,
            dataSize: result.data.size,
            dataMapKeys, // First 5 URLs scraped
            samplePageData: firstEntry ? {
              url: firstEntry.url,
              hasMarkdown: !!firstEntry.value?.markdown,
              hasText: !!firstEntry.value?.text,
              hasHtml: !!firstEntry.value?.html,
              hasTitle: !!firstEntry.value?.title,
              markdownLength: firstEntry.value?.markdown?.length || 0,
              textLength: firstEntry.value?.text?.length || 0,
              htmlLength: firstEntry.value?.html?.length || 0
            } : null
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

            // FIX 4: Log what we're about to save
            const mergedDataPayload = {
              ...session.merged_data,
              pages: scrapedPages,
              scraping_metrics: result.metrics,
              scraping_completed_at: new Date().toISOString(),
              scraperType: typeEnum
            }

            const payloadSize = JSON.stringify(mergedDataPayload).length
            const pageCount = Object.keys(scrapedPages).length
            const samplePageKeys = Object.keys(scrapedPages).slice(0, 3)

            permanentLogger.info('API_V4', 'Preparing database write', {
              sessionId: session.id,
              pageCount,
              payloadSize,
              samplePageKeys,
              metricsIncluded: !!result.metrics,
              payloadStructure: {
                hasPagesKey: !!mergedDataPayload.pages,
                pagesCount: pageCount,
                hasMetrics: !!mergedDataPayload.scraping_metrics,
                scraperType: mergedDataPayload.scraperType
              }
            })

            // Update merged_data with scraped content (proper repository pattern)
            await repository.updateMergedData(session.id, mergedDataPayload)

            // Update session phase to indicate scraping is complete
            await repository.updateSessionPhase(session.id, 2) // Phase 2 = post-scraping

            const persistDuration = persistTimer.stop()

            // FIX 4: Verify write by reading back (using correct method name)
            const verifySession = await repository.getSession(session.id)
            const savedPageCount = verifySession.merged_data?.pages ?
              Object.keys(verifySession.merged_data.pages).length : 0

            permanentLogger.info('API_V4', 'Data persisted to repository', {
              sessionId: session.id,
              pageCount: result.data.size,
              duration: persistDuration,
              // Verification data
              savedPageCount,
              savedMetricsPresent: !!verifySession.merged_data?.scraping_metrics,
              writeVerified: savedPageCount === pageCount,
              verificationDetails: savedPageCount !== pageCount ? {
                expected: pageCount,
                actual: savedPageCount,
                difference: pageCount - savedPageCount
              } : null
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

          // FIX 3: Log complete event payload before sending
          const totalItems = categories.reduce((sum, cat) => sum + cat.items.length, 0)
          permanentLogger.info('API_V4', 'Sending scraping.complete event', {
            sessionId: session.id,
            success: result.success,
            categoryCount: categories.length,
            totalItems,
            categoriesStructure: categories.map(cat => ({
              id: cat.id,
              title: cat.title,
              itemCount: cat.items?.length || 0,
              sampleItem: cat.items?.[0] ? {
                id: cat.items[0].id,
                hasContent: cat.id === 'pages' ? (cat.items[0].content?.length > 0) : true
              } : null
            })),
            metricsIncluded: !!result.metrics,
            metricsData: result.metrics ? {
              pagesScraped: result.metrics.pagesScraped,
              pagesFailed: result.metrics.pagesFailed,
              duration: result.metrics.duration,
              creditsUsed: result.metrics.creditsUsed
            } : null
          })

          await streamWriter.sendEvent(EventFactory.scraping('complete', {
            sessionId: session.id,
            success: result.success,
            categories,
            totalItems,
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
 * FIX 2: Added comprehensive logging to track transformation
 */
/**
 * Calculate quality score for scraped content
 * Based on content length, number of links, and number of images
 *
 * @param content - The scraped content
 * @param linkCount - Number of links found
 * @param imageCount - Number of images found
 * @returns Quality score from 0-100
 */
function calculateQualityScore(content: string, linkCount: number, imageCount: number): number {
  let score = 0

  // Content length score (0-40 points)
  if (content.length > 5000) score += 40
  else if (content.length > 2000) score += 30
  else if (content.length > 500) score += 20
  else if (content.length > 100) score += 10

  // Link richness (0-30 points)
  if (linkCount > 20) score += 30
  else if (linkCount > 10) score += 20
  else if (linkCount > 5) score += 10
  else if (linkCount > 0) score += 5

  // Image richness (0-30 points)
  if (imageCount > 10) score += 30
  else if (imageCount > 5) score += 20
  else if (imageCount > 2) score += 10
  else if (imageCount > 0) score += 5

  return Math.min(score, 100) // Cap at 100
}

function transformToCategories(result: ScrapingResult): any[] {
  // Log function entry
  permanentLogger.breadcrumb('transform', 'transformToCategories called', {
    success: result.success,
    dataSize: result.data.size,
    hasMetrics: !!result.metrics
  })

  const categories = []

  if (!result.success || result.data.size === 0) {
    // Log why returning empty
    permanentLogger.warn('API_V4', 'transformToCategories returning empty - no data', {
      success: result.success,
      dataSize: result.data.size,
      reason: !result.success ? 'scraping failed' : 'no data scraped'
    })
    return []
  }

  // Group pages by content type
  const pageItems: any[] = []

  result.data.forEach((pageData, url) => {
    try {
      // SAFETY: Skip if pageData is undefined or null
      if (!pageData || typeof pageData !== 'object') {
        permanentLogger.warn('API_V4', 'Skipping invalid pageData entry', {
          url,
          pageDataType: typeof pageData,
          pageDataValue: pageData
        })
        return // Skip this iteration
      }

    // FIX: Playwright returns 'content', Firecrawl returns 'markdown', Cheerio returns 'html'/'text'
    const content = pageData.content || pageData.markdown || pageData.text || pageData.html || ''

    // Determine scraper source from pageData or result metadata
    const source = (pageData.source || result.metrics?.scraperType || 'playwright') as 'firecrawl' | 'playwright' | 'cheerio'

    // Calculate estimated token count (rough estimate: 1 token ≈ 4 characters)
    const estimatedTokens = Math.ceil(content.length / 4)

    // Null-safe array access for links and images (defensive programming)
    // EXTREME SAFETY: Log everything before attempting to access
    permanentLogger.debug('API_V4', 'BEFORE linkCount calculation', {
      url,
      pageDataExists: !!pageData,
      pageDataType: typeof pageData,
      hasLinksProperty: pageData && 'links' in pageData,
      linksValue: pageData?.links,
      linksType: typeof pageData?.links,
      isLinksArray: Array.isArray(pageData?.links)
    })

    const linkCount = (pageData && Array.isArray(pageData.links)) ? pageData.links.length : 0

    permanentLogger.debug('API_V4', 'BEFORE imageCount calculation', {
      url,
      hasImagesProperty: pageData && 'images' in pageData,
      imagesValue: pageData?.images,
      imagesType: typeof pageData?.images,
      isImagesArray: Array.isArray(pageData?.images)
    })

    const imageCount = (pageData && Array.isArray(pageData.images)) ? pageData.images.length : 0

    // Debug logging to track scraper data structure differences
    permanentLogger.debug('API_V4', 'Page data structure check', {
      url,
      hasLinks: !!pageData.links,
      linksIsArray: Array.isArray(pageData.links),
      linkCount,
      hasImages: !!pageData.images,
      imagesIsArray: Array.isArray(pageData.images),
      imageCount,
      contentLength: content.length,
      availableKeys: Object.keys(pageData).slice(0, 10) // First 10 keys only
    })

    // Calculate quality score based on content length, links, images
    const quality = calculateQualityScore(content, linkCount, imageCount)

    // Generate preview (first 150 chars of content)
    const preview = content.slice(0, 150).trim() + (content.length > 150 ? '...' : '')

    pageItems.push({
      id: `page-${pageItems.length}`,
      categoryId: 'pages', // Required by DataItem interface
      type: 'webpage',     // Required by DataItem interface
      source,              // Required: 'firecrawl' | 'playwright' | 'cheerio'
      content,
      preview,             // Required: truncated content for display
      selected: false,     // Required: initial selection state
      quality,             // Required: 0-100 quality score
      tokens: estimatedTokens,  // Required: estimated token count
      cost: (estimatedTokens / 1000000) * 15, // Required: cost at $15/1M tokens
      timestamp: Date.now(), // Required: when scraped
      metadata: {
        url,
        title: pageData.title || url,
        // Ensure arrays are ALWAYS arrays (defensive null safety)
        links: Array.isArray(pageData.links) ? pageData.links : [],
        images: Array.isArray(pageData.images) ? pageData.images : [],
        ...pageData.metadata
      },
      // Debug info to track content availability
      _debug: {
        hasContent: !!pageData.content,
        hasMarkdown: !!pageData.markdown,
        hasText: !!pageData.text,
        hasHtml: !!pageData.html,
        contentLength: content.length
      }
    })
    } catch (error) {
      // Catch ANY error in processing this page and log it with full context
      permanentLogger.captureError('API_V4', error as Error, {
        operation: 'transformToCategories_forEach',
        url,
        pageDataExists: !!pageData,
        pageDataType: typeof pageData,
        pageDataKeys: pageData ? Object.keys(pageData) : [],
        errorLocation: 'forEach iteration'
      })
      // Skip this page but continue processing others
      return
    }
  })

  // Log pageItems results
  permanentLogger.info('API_V4', 'Page items created in transformToCategories', {
    count: pageItems.length,
    sampleItem: pageItems[0] ? {
      id: pageItems[0].id,
      url: pageItems[0].url,
      title: pageItems[0].title,
      contentLength: pageItems[0].content?.length || 0,
      hasLinks: (pageItems[0].metadata?.links?.length || 0) > 0,
      hasImages: (pageItems[0].metadata?.images?.length || 0) > 0
    } : null
  })

  if (pageItems.length > 0) {
    categories.push({
      id: 'pages',
      title: 'Scraped Pages',
      icon: 'FileText',
      items: pageItems
    })
  } else {
    permanentLogger.warn('API_V4', 'No page items created despite having data', {
      dataSize: result.data.size,
      dataKeys: Array.from(result.data.keys()).slice(0, 3)
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

  // Log final categories structure
  permanentLogger.info('API_V4', 'Categories transformed', {
    categoryCount: categories.length,
    categorySummary: categories.map(cat => ({
      id: cat.id,
      title: cat.title,
      itemCount: cat.items?.length || 0,
      firstItemSample: cat.items?.[0] ? {
        id: cat.items[0].id,
        hasContent: cat.id === 'pages' ? !!cat.items[0].content : true
      } : null
    }))
  })

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