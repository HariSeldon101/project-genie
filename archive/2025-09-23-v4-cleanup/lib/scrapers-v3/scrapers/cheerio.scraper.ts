/**
 * Cheerio Scraper - Lightweight HTML fetching
 *
 * Thin wrapper around fetch + cheerio for basic HTML extraction
 * No complex logic - that's handled by orchestration layer
 */

import * as cheerio from 'cheerio'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { StreamWriter, EventFactory, EventSource } from '@/lib/realtime-events'

export interface CheerioResult {
  url: string
  html?: string
  text?: string
  title?: string
  links?: string[]
  error?: string
  creditsUsed: number  // Always 0 for Cheerio (free open-source)
}

export class CheerioScraper {
  constructor() {
    permanentLogger.info('CHEERIO_SCRAPER', 'Initialized lightweight scraper')
  }

  async scrape(urls: string[], streamWriter: StreamWriter | null = null): Promise<CheerioResult[]> {
    const timer = permanentLogger.timing('cheerio_batch_scrape', { urlCount: urls.length })
    permanentLogger.info('CHEERIO_SCRAPER', 'Starting scrape', { urlCount: urls.length })

    const results: CheerioResult[] = []

    for (const url of urls) {
      // Use proper SSE event pattern
      if (streamWriter) {
        await streamWriter.sendEvent(EventFactory.status('scraping', `Scraping ${url}`, {
          source: EventSource.SCRAPER,
          metadata: {
            scraper: 'cheerio',
            url,
            phase: 'scraping'
          }
        }))
      }

      results.push(await this.scrapePage(url))
    }

    const duration = timer.stop()
    permanentLogger.info('CHEERIO_SCRAPER', 'Scrape complete', {
      urlCount: urls.length,
      duration,
      errorCount: results.filter(r => r.error).length
    })

    return results
  }

  private async scrapePage(url: string): Promise<CheerioResult> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; bot/1.0)',
          'Accept': 'text/html,application/xhtml+xml'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const html = await response.text()
      const $ = cheerio.load(html)

      // Extract basic data - orchestration layer decides what to do with it
      const links = $('a[href]')
        .map((_, el) => $(el).attr('href'))
        .get()
        .filter(Boolean)
        .map(href => {
          try {
            return new URL(href as string, url).href
          } catch {
            return null
          }
        })
        .filter(Boolean) as string[]

      return {
        url,
        html,
        text: $('body').text().replace(/\s+/g, ' ').trim().substring(0, 5000),
        title: $('title').text().trim(),
        links: [...new Set(links)],
        creditsUsed: 0  // Cheerio is free open-source
      }
    } catch (error) {
      permanentLogger.captureError('CHEERIO_SCRAPER', error as Error, { url })
      return {
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
        creditsUsed: 0  // No credits used even on error
      }
    }
  }

  async discoverLinks(url: string): Promise<string[]> {
    const result = await this.scrapePage(url)
    return result.links || []
  }
}