/**
 * Scraper Execution API Endpoint
 *
 * Thin orchestration layer for v3 scrapers
 * Delegates all work to scraper implementations
 */

import { NextRequest } from 'next/server'
import { createScraper, ScraperType } from '@/lib/company-intelligence/scrapers-v3'
import { EventFactory, StreamWriter, EventSource } from '@/lib/realtime-events'
import { permanentLogger } from '@/lib/utils/permanent-logger'

export async function POST(req: NextRequest) {
  const timer = permanentLogger.timing('scraper_v3_execution')

  try {
    const body = await req.json()
    const { domain, config, sessionId } = body

    permanentLogger.info('SCRAPER_V3_API', 'Request received', {
      domain,
      scraperType: config.scraperType,
      sessionId
    })

    // Create StreamWriter with proper constructor
    const streamWriter = new StreamWriter(
      sessionId || 'anonymous',
      `scraper-${Date.now()}`,
      req.signal  // Pass abort signal for cleanup
    )

    // Create the stream
    const stream = streamWriter.createStream()

    // Start async scraping process
    ;(async () => {
      try {
        // Map to ScraperType enum
        let scraperType: ScraperType
        switch (config.scraperType) {
          case 'firecrawl':
            scraperType = ScraperType.FIRECRAWL
            break
          case 'playwright':
            scraperType = ScraperType.PLAYWRIGHT
            break
          case 'cheerio':
            scraperType = ScraperType.CHEERIO
            break
          default:
            throw new Error(`Unknown scraper type: ${config.scraperType}`)
        }

        // Create scraper instance
        const scraper = createScraper(scraperType, config.preset || 'quick')

        // Prepare URLs
        const urlsToScrape = domain.startsWith('http') ? [domain] : [`https://${domain}`]

        // Execute scraping - scraper handles its own logging
        const result = await scraper.scrape(urlsToScrape, streamWriter)

        // Transform data for UI
        const categories = transformScraperData(result, config.scraperType)

        const duration = timer.stop()

        permanentLogger.info('SCRAPER_V3_API', 'Request complete', {
          domain,
          scraperType: config.scraperType,
          duration,
          success: result.success || !!categories.length
        })

        // Send completion event using proper EventFactory method
        await streamWriter.sendEvent(EventFactory.scraping('complete', {
          categories,
          totalItems: categories.reduce((acc, cat) => acc + cat.items.length, 0),
          scraper: config.scraperType,
          duration,
          creditsUsed: result.creditsUsed || 0,  // Will be 0 for Cheerio/Playwright, actual for Firecrawl
          creditsRemaining: result.creditsRemaining  // If available from Firecrawl
        }, {
          source: EventSource.SERVER,
          correlationId: streamWriter['correlationId'],
          sessionId
        }))

      } catch (error) {
        timer.stop()
        permanentLogger.captureError('SCRAPER_V3_API', error as Error, {
          endpoint: '/api/company-intelligence/scrapers-v3/execute'
        })

        // Send error event using proper EventFactory method
        await streamWriter.sendEvent(EventFactory.error(
          error instanceof Error ? error : new Error('Scraping failed'),
          {
            source: EventSource.SERVER,
            correlationId: streamWriter['correlationId']
          }
        ))
      } finally {
        // Close the stream properly
        streamWriter.close()
      }
    })()

    // Return the SSE response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })

  } catch (error) {
    // Handle synchronous errors
    permanentLogger.captureError('SCRAPER_V3_API', error as Error, {
      endpoint: '/api/company-intelligence/scrapers-v3/execute',
      phase: 'initialization'
    })

    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Failed to initialize scraper'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

/**
 * Transform scraper results into UI categories
 */
function transformScraperData(result: any, scraperType: string): any[] {
  const categories = []

  if (!result.data && !result.html && !result[0]?.html) {
    return []
  }

  // Handle different scraper response formats
  if (scraperType === 'cheerio') {
    // Cheerio returns array of results
    const cheerioResults = Array.isArray(result) ? result : [result]
    const validResults = cheerioResults.filter(r => r.html || r.links)

    if (validResults.length > 0) {
      categories.push({
        id: 'content',
        title: 'Page Content',
        icon: 'FileText',
        items: validResults.map((r, i) => ({
          id: `content-${i}`,
          type: 'HTML',
          content: r.html || '',
          title: r.title || 'Page Content',
          links: r.links || []
        }))
      })
    }
  } else if (result.data?.extract) {
    // Firecrawl schema extraction
    Object.entries(result.data.extract).forEach(([key, value]) => {
      if (value) {
        categories.push({
          id: key,
          title: key.charAt(0).toUpperCase() + key.slice(1),
          icon: getIconForCategory(key),
          items: Array.isArray(value) ? value : [value]
        })
      }
    })
  } else if (result.content) {
    // Playwright HTML content
    categories.push({
      id: 'content',
      title: 'Page Content',
      icon: 'FileText',
      items: [{
        id: 'playwright-content',
        type: 'HTML',
        content: result.content
      }]
    })
  }

  return categories
}

function getIconForCategory(category: string): string {
  const icons: Record<string, string> = {
    company: 'Building',
    contact: 'Phone',
    products: 'Package',
    technology: 'Code',
    links: 'Link',
    content: 'FileText'
  }
  return icons[category] || 'Circle'
}