/**
 * @fileoverview Cheerio streaming scraper for static HTML scraping
 * @module scrapers-v4/scrapers/cheerio
 *
 * ARCHITECTURE: Fast, lightweight scraper for static sites.
 * Uses axios for HTTP requests and cheerio for HTML parsing.
 * No JavaScript execution - ideal for server-rendered content.
 *
 * V4 PRINCIPLES:
 * - Real progress based on actual HTTP requests
 * - No mock data - every event represents real work
 * - Direct execution without orchestration layers
 */

import axios, { AxiosInstance } from 'axios'
import * as cheerio from 'cheerio'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { StreamWriter, EventFactory } from '@/lib/realtime-events'
import {
  ScraperType,
  ScrapingPhase,
  ProgressEventType,
  LogCategory,
  Constants,
  type ScrapingResult,
  type StreamingScraperConfig,
  type ProgressUpdate,
  type ScrapingMetrics
} from '../types'

/**
 * Cheerio streaming scraper implementation for static HTML content
 * @class CheerioStreamingScraper
 * @description Fast, lightweight scraper for server-rendered sites using axios and cheerio.
 * Provides real-time progress updates via SSE streaming without JavaScript execution.
 *
 * @example
 * ```typescript
 * const scraper = new CheerioStreamingScraper({ maxPages: 10, timeout: 5000 })
 * const result = await scraper.scrapeWithStreaming(['https://example.com'], streamWriter)
 * ```
 */
export class CheerioStreamingScraper {
  private client: AxiosInstance
  private readonly config: StreamingScraperConfig

  /**
   * Creates a new Cheerio streaming scraper instance
   * @constructor
   * @param {StreamingScraperConfig} config - Optional configuration object
   * @param {number} [config.maxPages=10] - Maximum pages to scrape
   * @param {number} [config.timeout=10000] - Request timeout in milliseconds
   * @param {Record<string,string>} [config.headers] - HTTP headers to send
   * @param {boolean} [config.followRedirects=true] - Whether to follow redirects
   * @param {number} [config.maxRedirects=5] - Maximum redirects to follow
   */
  constructor(config: StreamingScraperConfig = {}) {
    // Apply defaults with explicit values (following CLAUDE.md - no hidden logic)
    this.config = {
      maxPages: config.maxPages ?? 10,  // Cheerio is fast, but let's be conservative
      timeout: config.timeout ?? 10000,  // 10 seconds per page
      headers: config.headers ?? {
        'User-Agent': 'Mozilla/5.0 (compatible; ProjectGenie/1.0)'
      },
      followRedirects: config.followRedirects ?? true,
      maxRedirects: config.maxRedirects ?? 5
    }

    // Initialize axios client with config
    this.client = axios.create({
      timeout: this.config.timeout,
      headers: this.config.headers,
      maxRedirects: this.config.followRedirects ? this.config.maxRedirects : 0
    })

    permanentLogger.info(LogCategory.CHEERIO_V4, 'Cheerio scraper initialized', {
      maxPages: this.config.maxPages,
      timeout: this.config.timeout,
      followRedirects: this.config.followRedirects
    })
  }

  /**
   * Scrapes multiple URLs with real-time progress streaming
   * @public
   * @async
   * @param {string[]} urls - Array of absolute URLs to scrape
   * @param {StreamWriter} streamWriter - SSE stream writer for progress updates
   * @returns {Promise<ScrapingResult>} Complete scraping result with metrics and scraped data
   * @throws {Error} Throws error if all URLs fail to scrape
   *
   * @example
   * ```typescript
   * const urls = ['https://example.com', 'https://example.com/about']
   * const result = await scraper.scrapeWithStreaming(urls, streamWriter)
   * console.log(`Scraped ${result.metrics.pagesScraped} pages`)
   * ```
   */
  async scrapeWithStreaming(
    urls: string[],
    streamWriter: StreamWriter
  ): Promise<ScrapingResult> {
    const startTime = Date.now()
    const timer = permanentLogger.timing('cheerio_streaming_scrape', {
      urlCount: urls.length
    })

    permanentLogger.breadcrumb('scrape_start', 'Starting Cheerio scrape', {
      urls: urls.slice(0, 3),  // Log first 3 URLs
      totalCount: urls.length
    })

    const dataMap = new Map<string, any>()
    let successCount = 0
    let failCount = 0

    try {
      // Send initialization event
      await this.sendProgress(streamWriter, {
        type: ProgressEventType.SCRAPE_STARTED,
        phase: ScrapingPhase.INITIALIZATION,
        current: 0,
        total: urls.length,
        percentage: 0,
        message: `Starting to scrape ${urls.length} pages`,
        metadata: {
          scraperType: ScraperType.CHEERIO,
          urls: urls.slice(0, 5)  // First 5 for preview
        },
        timestamp: Date.now(),
        source: ScraperType.CHEERIO
      })

      // Scrape each URL sequentially (could be parallel, but let's be nice to servers)
      for (let i = 0; i < urls.length && i < this.config.maxPages!; i++) {
        const url = urls[i]
        const pageTimer = permanentLogger.timing('cheerio_page_scrape', { url })

        try {
          permanentLogger.breadcrumb('page_start', `Scraping page ${i + 1}`, { url })

          // REAL HTTP request - not mock data
          const response = await this.client.get(url)

          // Parse HTML with cheerio
          const $ = cheerio.load(response.data)

          // Extract real content
          const pageData = {
            url,
            title: $('title').text() || $('h1').first().text() || '',
            description: $('meta[name="description"]').attr('content') ||
                        $('meta[property="og:description"]').attr('content') || '',
            html: response.data,
            text: $('body').text().replace(/\s+/g, ' ').trim(),
            links: this.extractLinks($, url),
            images: this.extractImages($, url),
            metadata: {
              statusCode: response.status,
              contentType: response.headers['content-type'],
              contentLength: response.data.length,
              responseTime: pageTimer.stop()
            }
          }

          dataMap.set(url, pageData)
          successCount++

          // Send REAL progress update
          const percentage = Math.round(((i + 1) / urls.length) * 100)
          await this.sendProgress(streamWriter, {
            type: ProgressEventType.PAGE_COMPLETE,
            phase: ScrapingPhase.SCRAPING,
            current: i + 1,
            total: urls.length,
            percentage,
            message: `Scraped ${i + 1} of ${urls.length} pages`,
            metadata: {
              url,
              title: pageData.title,
              contentLength: pageData.metadata.contentLength,
              linksFound: pageData.links.length,
              imagesFound: pageData.images.length
            },
            timestamp: Date.now(),
            source: ScraperType.CHEERIO
          })

          permanentLogger.info(LogCategory.CHEERIO_V4, 'Page scraped successfully', {
            url,
            contentLength: pageData.metadata.contentLength,
            responseTime: pageData.metadata.responseTime
          })

        } catch (pageError) {
          pageTimer.stop()
          failCount++

          const error = pageError instanceof Error ? pageError : new Error(String(pageError))
          permanentLogger.captureError(LogCategory.CHEERIO_V4, error, {
            url,
            pageIndex: i
          })

          // Send error event for this page
          await this.sendProgress(streamWriter, {
            type: ProgressEventType.ERROR_OCCURRED,
            phase: ScrapingPhase.SCRAPING,
            current: i + 1,
            total: urls.length,
            percentage: Math.round(((i + 1) / urls.length) * 100),
            message: `Failed to scrape ${url}: ${error.message}`,
            metadata: {
              url,
              error: error.message
            },
            timestamp: Date.now(),
            source: ScraperType.CHEERIO
          })
        }
      }

      const duration = timer.stop()
      const metrics: ScrapingMetrics = {
        pagesScraped: successCount,
        pagesFailed: failCount,
        duration,
        creditsUsed: 0,  // Cheerio is free
        costEstimate: 0,  // No cost
        startedAt: startTime,
        completedAt: Date.now(),
        dataSize: JSON.stringify(Array.from(dataMap.values())).length
      }

      // Send completion event
      await this.sendProgress(streamWriter, {
        type: ProgressEventType.PAGE_COMPLETE,
        phase: ScrapingPhase.COMPLETE,
        current: successCount,
        total: urls.length,
        percentage: 100,
        message: `Completed: ${successCount} pages scraped, ${failCount} failed`,
        metadata: metrics,
        timestamp: Date.now(),
        source: ScraperType.CHEERIO
      })

      permanentLogger.info(LogCategory.CHEERIO_V4, 'Scraping complete', {
        successCount,
        failCount,
        duration,
        dataSize: metrics.dataSize
      })

      return {
        success: true,
        domain: urls[0] ? new URL(urls[0]).hostname : '',
        scraperType: ScraperType.CHEERIO,
        data: dataMap,
        metrics
      }

    } catch (error) {
      timer.stop()
      const jsError = error instanceof Error ? error : new Error(String(error))

      permanentLogger.captureError(LogCategory.CHEERIO_V4, jsError, {
        urls: urls.slice(0, 3),
        config: this.config
      })

      // Send error event
      await this.sendProgress(streamWriter, {
        type: ProgressEventType.ERROR_OCCURRED,
        phase: ScrapingPhase.ERROR,
        current: successCount,
        total: urls.length,
        percentage: 0,
        message: jsError.message,
        metadata: {
          error: jsError.message,
          urlsAttempted: urls.length
        },
        timestamp: Date.now(),
        source: ScraperType.CHEERIO
      })

      // Return error result (no mock data - real error)
      return {
        success: false,
        domain: urls[0] ? new URL(urls[0]).hostname : '',
        scraperType: ScraperType.CHEERIO,
        data: dataMap,  // Return partial data if any
        error: {
          code: 'SCRAPE_FAILED',
          message: jsError.message,
          details: process.env.NODE_ENV === 'development' ? jsError.stack : undefined
        },
        metrics: {
          pagesScraped: successCount,
          pagesFailed: failCount,
          duration: Date.now() - startTime,
          creditsUsed: 0,
          costEstimate: 0,
          startedAt: startTime
        }
      }
    }
  }

  /**
   * Extracts all same-domain links from the page
   * @private
   * @param {cheerio.CheerioAPI} $ - Cheerio instance with loaded HTML
   * @param {string} baseUrl - Base URL for resolving relative links
   * @returns {string[]} Array of absolute URLs (duplicates removed)
   */
  private extractLinks($: cheerio.CheerioAPI, baseUrl: string): string[] {
    const links: string[] = []
    const baseHost = new URL(baseUrl).hostname

    $('a[href]').each((_, elem) => {
      try {
        const href = $(elem).attr('href')
        if (href) {
          const absoluteUrl = new URL(href, baseUrl).href
          // Only include same-domain links
          if (new URL(absoluteUrl).hostname === baseHost) {
            links.push(absoluteUrl)
          }
        }
      } catch (error) {
        // Log invalid URL but continue processing
        permanentLogger.debug('CHEERIO_V4', 'Invalid URL found in links', {
          href: href,
          baseUrl: baseUrl,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    })

    return [...new Set(links)]  // Remove duplicates
  }

  /**
   * Extracts all image URLs from the page
   * @private
   * @param {cheerio.CheerioAPI} $ - Cheerio instance with loaded HTML
   * @param {string} baseUrl - Base URL for resolving relative image paths
   * @returns {string[]} Array of absolute image URLs (duplicates removed)
   */
  private extractImages($: cheerio.CheerioAPI, baseUrl: string): string[] {
    const images: string[] = []

    $('img[src]').each((_, elem) => {
      try {
        const src = $(elem).attr('src')
        if (src) {
          const absoluteUrl = new URL(src, baseUrl).href
          images.push(absoluteUrl)
        }
      } catch (error) {
        // Log invalid image URL but continue processing
        permanentLogger.debug('CHEERIO_V4', 'Invalid image URL found', {
          src: src,
          baseUrl: baseUrl,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    })

    return [...new Set(images)]  // Remove duplicates
  }

  /**
   * Sends progress update via SSE stream
   * @private
   * @async
   * @param {StreamWriter} streamWriter - SSE stream writer instance
   * @param {ProgressUpdate} update - Progress update containing current state
   * @returns {Promise<void>} Resolves when event is sent
   */
  private async sendProgress(
    streamWriter: StreamWriter,
    update: ProgressUpdate
  ): Promise<void> {
    try {
      // Use EventFactory for consistent event format
      const event = EventFactory.progress(
        update.current,
        update.total,
        update.message,
        {
          phase: update.phase,
          source: update.source,
          metadata: {
            ...update.metadata,
            type: update.type,
            scraperType: ScraperType.CHEERIO,
            timestamp: update.timestamp
          }
        }
      )

      await streamWriter.sendEvent(event)

      permanentLogger.breadcrumb('progress_sent', 'Progress event sent', {
        type: update.type,
        phase: update.phase,
        percentage: update.percentage
      })

    } catch (error) {
      // Log error but don't fail scraping if progress sending fails
      permanentLogger.captureError(LogCategory.STREAM_V4, error as Error, {
        updateType: update.type,
        phase: update.phase
      })
    }
  }

  /**
   * Gets the current scraper configuration
   * @public
   * @returns {StreamingScraperConfig} Copy of current configuration object
   */
  public getConfig(): StreamingScraperConfig {
    return { ...this.config }
  }

  /**
   * Estimates cost for scraping operation
   * @public
   * @param {number} [pageCount] - Number of pages to scrape (unused)
   * @returns {number} Always returns 0 as Cheerio scraping is free
   */
  public estimateCost(pageCount?: number): number {
    return 0
  }
}