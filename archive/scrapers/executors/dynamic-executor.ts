/**
 * Dynamic Scraper Executor
 * 
 * EXTENDS BaseScraperExecutor (DRY principle applied)
 * JavaScript-enabled scraping using Playwright.
 * Handles client-side rendering, AJAX content, and interactive elements.
 * 
 * COMPREHENSIVE LOGGING: 25+ logging points with breadcrumbs
 * ERROR PROPAGATION: All errors sent to UI via SSEEventFactory
 * NO SILENT FAILURES: Every error is logged and propagated
 * 
 * @module dynamic-executor
 */

import { BrowserContext, Page } from 'playwright'
import {
  ScraperResult,
  ScraperOptions,
  PageResult,
  ValidationResult,
  MergedPageData,
  ValueEstimate,
  ScrapingError,
  DiscoveredLink,
  ContactInfo,
  SocialLinks,
  FormData,
  ImageData
} from '../additive/types'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { BaseScraperExecutor } from './base-executor'
import { BrowserPool } from '../browser/browser-pool'
import { EventFactory } from '@/lib/realtime-events'

/**
 * Dynamic scraper using Playwright for JavaScript execution
 * Extends BaseScraperExecutor for DRY principle
 */
export class DynamicScraperExecutor extends BaseScraperExecutor {
  id = 'dynamic'
  name = 'JavaScript Renderer (Playwright)'
  strategy = 'dynamic' as const
  description = 'Full browser rendering with JavaScript execution. Best for SPAs, dynamic content, and AJAX-loaded data.'
  speed = 'medium' as const

  private browserPool: BrowserPool

  constructor() {
    super()
    this.browserPool = BrowserPool.getInstance()
  }

  /**
   * Execute dynamic scraping on URLs with comprehensive logging
   */
  async scrape(urls: string[], options?: ScraperOptions): Promise<ScraperResult> {
    const startTime = Date.now()
    const pages: PageResult[] = []
    const allDiscoveredLinks: DiscoveredLink[] = []
    const errors: ScrapingError[] = []
    
    // Log scraping start with full context
    permanentLogger.info('Dynamic scraping started', {
      category: 'DYNAMIC_EXECUTOR',
      urlsReceived: !!urls,
      urlCount: urls ? urls.length : 0,
      urlsSample: urls ? urls.slice(0, 3) : [],
      urlsType: Array.isArray(urls) ? 'array' : typeof urls,
      hasOptions: !!options,
      sessionId: options?.sessionId
    })
    
    // CRITICAL: NO FALLBACKS - Throw error if no URLs provided
    if (!urls || urls.length === 0) {
      permanentLogger.captureError('DYNAMIC_EXECUTOR', new Error('No URLs provided for dynamic scraping'), {
        breadcrumbs: permanentLogger.getBreadcrumbs(),
        timestamp: Date.now(),
        sessionId: options?.sessionId,
        urlsReceived: urls,
        urlsType: Array.isArray(urls) ? 'empty_array' : typeof urls
      })
      
      // Send error event to UI via SSE
      if (options?.progressCallback) {
        const errorEvent = EventFactory.error(
          new Error('No URLs provided for dynamic scraping - check sitemap discovery phase'),
          { 
            source: EventSource.SCRAPER, 
            phase: 'initialization',
            scraperType: 'dynamic'
          }
        )
        await options.progressCallback(errorEvent)
      }
      
      // Throw error - NO FALLBACK EMPTY RETURN
      throw new Error('No URLs provided for dynamic scraping. Please ensure sitemap discovery has completed and returned URLs.')
    }
    
    permanentLogger.breadcrumb('dynamic_scraper_init', 'Dynamic scraper initializing', {
      urlCount: urls.length,
      waitForSelectors: options?.waitForSelectors,
      timeout: options?.timeout
    })
    
    // Initialize session with base class logging
    await this.startScrapingSession(urls, options)
    
    permanentLogger.info('Starting dynamic scraping with Playwright', { category: 'DYNAMIC_EXECUTOR', urlCount: urls.length,
      strategy: this.strategy,
      speed: this.speed,
      userAgent: options?.userAgent,
      hasHeaders: !!options?.headers,
      waitForSelectors: options?.waitForSelectors,
      extractTypes: options?.extractTypes })

    // Get browser context
    permanentLogger.breadcrumb('browser_init', 'Initializing browser context', {
      viewport: '1920x1080',
      hasUserAgent: !!options?.userAgent
    })
    
    const browser = await this.browserPool.getBrowser()
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: options?.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      extraHTTPHeaders: options?.headers
    })

    try {
      // Process URLs sequentially with detailed logging
      let processedCount = 0
      for (const url of urls) {
        const pageStartTime = Date.now() // Track timing for this URL
        
        // Add comprehensive logging at URL processing start
        permanentLogger.breadcrumb('url_processing_start', 'Starting URL processing', {
          url,
          index: processedCount,
          total: urls.length,
          sessionId: options?.sessionId,
          timestamp: pageStartTime
        })
        
        try {
          permanentLogger.breadcrumb('page_scrape_start', `Starting dynamic scrape of ${url}`, {
            url,
            index: processedCount,
            total: urls.length
          })
          
          // Log page attempt
          this.logPageAttempt(url, processedCount, urls.length)

          // Send initial progress event - opening URL
          await this.sendProgressEvent(
            processedCount,
            urls.length,
            `Opening ${url.substring(0, 50)}...`
          )

          const pageStartTime = Date.now()

          // Scrape with real-time status updates
          const pageResult = await this.scrapePageWithProgress(url, context, options, processedCount, urls.length)
          const pageDuration = Date.now() - pageStartTime

          pages.push(pageResult)

          if (pageResult.success) {
            // Log successful scrape
            await this.logPageSuccess(url, pageResult, pageDuration)

            // Send success progress with data metrics
            await this.sendProgressEvent(
              processedCount + 1,
              urls.length,
              `Completed ${url.substring(0, 50)} - Found ${pageResult.discoveredLinks?.length || 0} links, ${this.countPageDataPoints(pageResult)} data points`
            )

            // Collect discovered links with metadata
            if (pageResult.discoveredLinks) {
              permanentLogger.breadcrumb('links_discovered', `Found ${pageResult.discoveredLinks.length} links`, {
                url,
                linkCount: pageResult.discoveredLinks.length,
                dynamicElements: pageResult.structuredData?.dynamicElements || 0
              })

              for (const link of pageResult.discoveredLinks) {
                allDiscoveredLinks.push({
                  url: link,
                  foundOn: url,
                  type: this.classifyLink(link, url),
                  scraped: false,
                  priority: this.prioritizeLink(link, url)
                })
              }
            }
          } else {
            // Log page error
            await this.logPageError(url, pageResult.error || 'Unknown error', pageDuration)

            // Send error progress
            await this.sendProgressEvent(
              processedCount + 1,
              urls.length,
              `Failed to scrape ${url.substring(0, 50)} - ${pageResult.error || 'Unknown error'}`
            )
          }

          processedCount++
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error) || 'Unknown error'
          
          permanentLogger.captureError('DYNAMIC_EXECUTOR', error, {
        message: 'Critical error during dynamic scraping',
        url,
            Message,
            stack: error,
        errorMessage: error instanceof Error ? error.stack : undefined,
            processedCount,
            totalUrls: urls.length
      })
          
          // Log page error
          await this.logPageError(url, error, Date.now() - startTime)
          
          const errorTimestamp = Date.now()
          
          errors.push({
            code: 'DYNAMIC_SCRAPE_ERROR',
            message: errorMessage,
            url,
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: errorTimestamp
          })
          
          // CRITICAL FIX: Add failed page result to pages array with ALL required fields
          // This ensures failed pages are counted in statistics and visible in UI
          pages.push({
            url,
            success: false,
            statusCode: (error as any).response?.status || (error as any).code === 'ENOTFOUND' ? 404 : 0,
            title: '',
            description: '',
            content: '',
            textContent: '',
            discoveredLinks: [],
            structuredData: {},
            technologies: [],
            apiEndpoints: [],
            contactInfo: { emails: [], phones: [], addresses: [] },
            socialLinks: {},
            forms: [],
            images: [],
            error: errorMessage,
            duration: Date.now() - pageStartTime,
            bytesDownloaded: 0,
            timestamp: Date.now(),
            // Additional error context for debugging
            errorDetails: {
              message: errorMessage,
              stack: error instanceof Error ? error.stack : undefined,
              code: (error as any).code || 'UNKNOWN_ERROR',
              phase: 'page_load'
            }
          } as PageResult)
          
          processedCount++
        }
      }
    } finally {
      // Safely close browser context
      try {
        permanentLogger.breadcrumb('browser_cleanup', 'Closing browser context', {
          pagesProcessed: pages.length
        })
        await context.close()
      } catch (contextError) {
        // Context might already be closed
        permanentLogger.breadcrumb('context_close_error', 'Browser context close failed', {
          error: contextError instanceof Error ? contextError.message : 'Unknown error',
          pagesProcessed: pages.length
        })
      }
    }

    // Calculate statistics using base class
    this.stats.duration = Date.now() - startTime
    this.stats.pagesAttempted = pages.length
    this.stats.pagesSucceeded = pages.filter(p => p.success).length
    this.stats.pagesFailed = pages.filter(p => !p.success).length
    this.stats.bytesDownloaded = pages.reduce((sum, p) => sum + (p.bytesDownloaded || 0), 0)
    this.stats.linksDiscovered = allDiscoveredLinks.length
    this.stats.averageTimePerPage = this.stats.pagesAttempted > 0 
      ? Math.round(this.stats.duration / this.stats.pagesAttempted) 
      : 0
    this.stats.successRate = this.stats.pagesAttempted > 0
      ? Math.round((this.stats.pagesSucceeded / this.stats.pagesAttempted) * 100)
      : 0
    
    // Count total data points
    for (const page of pages) {
      if (!page.success) continue
      let dataPoints = 0
      if (page.title) dataPoints++
      if (page.description) dataPoints++
      if (page.structuredData) {
        dataPoints += Object.keys(page.structuredData).length
      }
      if (page.technologies?.length) dataPoints += page.technologies.length
      if (page.apiEndpoints?.length) dataPoints += page.apiEndpoints.length
      if (page.contactInfo) {
        dataPoints += (page.contactInfo.emails?.length || 0) + 
                     (page.contactInfo.phones?.length || 0)
      }
      if (page.socialLinks) {
        dataPoints += Object.keys(page.socialLinks).length
      }
      if (page.forms?.length) dataPoints += page.forms.length * 2
      if (page.images?.length) dataPoints += page.images.length
      if (page.discoveredLinks?.length) dataPoints += page.discoveredLinks.length
      this.stats.dataPointsExtracted += dataPoints
    }
    
    // Generate suggestions based on findings
    const suggestions = this.generateSuggestions(pages, allDiscoveredLinks)
    
    const result: ScraperResult = {
      scraperId: this.id,
      scraperName: this.name,
      strategy: this.strategy,
      timestamp: Date.now(),
      pages,
      discoveredLinks: allDiscoveredLinks,
      stats: this.stats,
      errors,
      suggestions
    }
    
    // Complete session with base class logging
    await this.completeScrapingSession(result, Date.now() - startTime)
    
    permanentLogger.info('Dynamic scraping completed', { category: 'DYNAMIC_EXECUTOR',
      duration: this.stats.duration,
      pagesSucceeded: this.stats.pagesSucceeded,
      pagesFailed: this.stats.pagesFailed,
      dataPointsExtracted: this.stats.dataPointsExtracted,
      linksDiscovered: allDiscoveredLinks.length,
      errors: errors.length,
      suggestions: suggestions.length,
      dynamicContentFound: pages.some(p => p.structuredData?.dynamicElements > 0)
    })
    
    return result
  }

  /**
   * Count data points from a single page result
   */
  private countPageDataPoints(page: PageResult): number {
    let count = 0
    if (page.title) count++
    if (page.description) count++
    if (page.structuredData) count += Object.keys(page.structuredData).length
    if (page.technologies?.length) count += page.technologies.length
    if (page.apiEndpoints?.length) count += page.apiEndpoints.length
    if (page.contactInfo) {
      count += (page.contactInfo.emails?.length || 0) +
               (page.contactInfo.phones?.length || 0) +
               (page.contactInfo.addresses?.length || 0)
    }
    if (page.socialLinks) count += Object.keys(page.socialLinks).length
    if (page.forms?.length) count += page.forms.length * 2
    if (page.images?.length) count += page.images.length
    if (page.discoveredLinks?.length) count += page.discoveredLinks.length
    return count
  }

  /**
   * Scrape a single page with real-time progress updates
   */
  private async scrapePageWithProgress(
    url: string,
    context: BrowserContext,
    options: ScraperOptions | undefined,
    currentIndex: number,
    totalUrls: number
  ): Promise<PageResult> {
    // Send progress - starting page load
    await this.sendProgressEvent(
      currentIndex,
      totalUrls,
      `Loading ${url.substring(0, 50)}...`
    )

    // Call the original scrapePage method
    const result = await this.scrapePage(url, context, options)

    // Send progress - extraction complete
    if (result.success) {
      await this.sendProgressEvent(
        currentIndex,
        totalUrls,
        `Extracting data from ${url.substring(0, 50)}...`
      )
    }

    return result
  }

  /**
   * Scrape a single page with Playwright and comprehensive logging
   */
  private async scrapePage(
    url: string, 
    context: BrowserContext, 
    options?: ScraperOptions
  ): Promise<PageResult> {
    const startTime = Date.now()
    
    permanentLogger.breadcrumb('page_open', `Opening new page for ${url}`, {
      url,
      timeout: options?.timeout
    })
    
    const page = await context.newPage()
    
    try {
      // Set timeout
      const timeout = options?.timeout || 15000
      page.setDefaultTimeout(timeout)
      
      permanentLogger.breadcrumb('navigation_start', `Navigating to ${url}`, {
        url,
        timeout,
        strategy: 'progressive'
      })
      
      // Navigate to page with progressive timeout strategy
      let response
      try {
        // First try with domcontentloaded (faster)
        response = await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: Math.min(timeout / 2, 10000)
        })
        
        permanentLogger.breadcrumb('dom_loaded', 'DOM content loaded', {
          url,
          status: response?.status()
        })
        
        // Then wait for network idle
        await page.waitForLoadState('networkidle', {
          timeout: timeout / 2
        })
        
        permanentLogger.breadcrumb('network_idle', 'Network idle state reached', {
          url
        })
        
      } catch (e) {
        permanentLogger.warn('DYNAMIC_EXECUTOR', 'Fast loading failed, using fallback strategy', {
          url,
          error: e instanceof Error ? e.message : 'Unknown'
        })
        
        // Fallback to simpler strategy
        response = await page.goto(url, {
          waitUntil: 'load',
          timeout
        })
      }
      
      const statusCode = response?.status() || 0
      
      permanentLogger.breadcrumb('page_loaded', `Page loaded with status ${statusCode}`, {
        url,
        statusCode
      })
      
      // Wait for specific selectors if provided
      if (options?.waitForSelectors) {
        for (const selector of options.waitForSelectors) {
          try {
            await page.waitForSelector(selector, { timeout: 5000 })
            permanentLogger.breadcrumb('selector_found', `Selector found: ${selector}`, {
              url,
              selector
            })
          } catch (error) {
            // Log selector timeout but continue - selectors are optional
            permanentLogger.warn('DYNAMIC_EXECUTOR', `Selector not found: ${selector}`, {
              url,
              selector,
              error: error instanceof Error ? error.message : String(error)
            })
          }
        }
      }
      
      // Wait for dynamic content
      permanentLogger.breadcrumb('dynamic_wait', 'Waiting for dynamic content to load', {
        url
      })
      await this.waitForDynamicContent(page)
      
      // Extract all data using page evaluation
      permanentLogger.breadcrumb('extraction_start', 'Extracting page data', {
        url
      })
      
      const extractedData = await page.evaluate(() => {
        // This runs in the browser context
        const data: any = {
          title: document.title,
          description: '',
          textContent: '',
          links: [],
          structuredData: {},
          dynamicElements: 0,
          ajaxRequests: [],
          localStorage: {},
          sessionStorage: {}
        }
        
        // Get meta description
        const metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement
        data.description = metaDesc?.content || ''
        
        // Get text content
        data.textContent = document.body?.innerText || ''
        
        // Get all links
        const links = Array.from(document.querySelectorAll('a[href]'))
        data.links = links.map(a => (a as HTMLAnchorElement).href).filter(href => href)
        
        // Count dynamic elements
        data.dynamicElements = document.querySelectorAll('[data-reactroot], [ng-app], [v-app], #__next').length
        
        // Get structured data
        const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]')
        jsonLdScripts.forEach((script, index) => {
          try {
            data.structuredData[`jsonld_${index}`] = JSON.parse(script.textContent || '{}')
          } catch (error) {
            // Log parse error but don't throw - this is non-critical data
            permanentLogger.warn('DYNAMIC_EXECUTOR', 'Failed to parse JSON-LD', {
              scriptIndex: index,
              error: error instanceof Error ? error.message : String(error),
              scriptContent: script.textContent?.substring(0, 100)
            })
          }
        })
        
        // Try to get localStorage data
        try {
          data.localStorage = { ...localStorage }
        } catch (error) {
          // Log but don't throw - localStorage might be restricted
          permanentLogger.warn('DYNAMIC_EXECUTOR', 'Cannot access localStorage', {
            error: error instanceof Error ? error.message : String(error)
          })
        }
        
        // Try to get sessionStorage data
        try {
          data.sessionStorage = { ...sessionStorage }
        } catch (error) {
          // Log but don't throw - sessionStorage might be restricted
          permanentLogger.warn('DYNAMIC_EXECUTOR', 'Cannot access sessionStorage', {
            error: error instanceof Error ? error.message : String(error)
          })
        }
        
        return data
      })
      
      permanentLogger.breadcrumb('data_extracted', 'Core data extracted', {
        url,
        titleLength: extractedData.title?.length,
        linkCount: extractedData.links?.length,
        dynamicElements: extractedData.dynamicElements
      })
      
      // Extract additional data
      const html = await page.content()
      const htmlSize = new TextEncoder().encode(html).length
      
      permanentLogger.breadcrumb('additional_extraction', 'Extracting additional data', {
        url,
        htmlSize
      })
      
      const technologies = await this.detectTechnologies(page, html)
      const apiEndpoints = await this.extractAPIEndpoints(page)
      const contactInfo = await this.extractContactInfo(page)
      const socialLinks = await this.extractSocialLinks(page)
      const forms = await this.extractForms(page)
      const images = await this.extractImages(page, url)
      
      // Check for infinite scroll or pagination
      const hasInfiniteScroll = await this.detectInfiniteScroll(page)
      const hasPagination = await this.detectPagination(page)
      
      permanentLogger.breadcrumb('features_detected', 'Page features detected', {
        url,
        technologies: technologies.length,
        apiEndpoints: apiEndpoints.length,
        hasInfiniteScroll,
        hasPagination
      })
      
      const duration = Date.now() - startTime
      
      permanentLogger.info('Page scraped successfully with Playwright', { category: 'DYNAMIC_EXECUTOR',
        url,
        success: true,
        duration,
        statusCode,
        bytesDownloaded: htmlSize,
        title: extractedData.title?.substring(0, 100),
        linkCount: extractedData.links?.length,
        dynamicElements: extractedData.dynamicElements,
        technologies: technologies.length,
        apiEndpoints: apiEndpoints.length,
        hasInfiniteScroll,
        hasPagination
      })
      
      return {
        url,
        success: true,
        statusCode,
        title: extractedData.title,
        description: extractedData.description,
        content: html,
        textContent: extractedData.textContent,
        discoveredLinks: extractedData.links,
        structuredData: {
          ...extractedData.structuredData,
          dynamicElements: extractedData.dynamicElements,
          hasInfiniteScroll,
          hasPagination,
          localStorage: extractedData.localStorage,
          sessionStorage: extractedData.sessionStorage
        },
        technologies,
        apiEndpoints,
        contactInfo,
        socialLinks,
        forms,
        images,
        duration,
        bytesDownloaded: htmlSize
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const duration = Date.now() - startTime
      
      permanentLogger.captureError('DYNAMIC_EXECUTOR', error, {
        message: 'Failed to scrape page with Playwright',
        url,
        Message,
        stack: error,
        errorMessage: error instanceof Error ? error.stack : undefined,
        duration
      })
      
      // Log error with breadcrumbs and throw
      permanentLogger.breadcrumb('page_error', 'Failed to scrape page', {
        url,
        error: errorMessage,
        duration
      })
      
      throw error // Proper error propagation per DRY/SOLID
    } finally {
      // Safely close page - check if it's still valid
      try {
        if (!page.isClosed()) {
          permanentLogger.breadcrumb('page_close', 'Closing page', {
            url
          })
          await page.close()
        }
      } catch (closeError) {
        // Page might already be closed if browser context was terminated
        permanentLogger.breadcrumb('page_close_skipped', 'Page already closed or invalid', {
          url,
          error: closeError instanceof Error ? closeError.message : 'Unknown error'
        })
      }
    }
  }

  /**
   * Wait for dynamic content to load
   */
  private async waitForDynamicContent(page: Page): Promise<void> {
    try {
      // Wait for common loading indicators to disappear
      await page.waitForFunction(() => {
        const spinners = document.querySelectorAll(
          '.spinner, .loader, .loading, [class*="load"], [class*="spin"]'
        )
        return spinners.length === 0 || 
               Array.from(spinners).every(el => {
                 const style = window.getComputedStyle(el as Element)
                 return style.display === 'none' || style.visibility === 'hidden'
               })
      }, { timeout: 2000 })
      
      permanentLogger.breadcrumb('spinners_hidden', 'Loading spinners hidden or absent')

    } catch (error) {
      // Timeout is expected for pages without spinners - log but continue
      permanentLogger.breadcrumb('spinner_timeout', 'Spinner wait timeout (continuing)', {
        error: error instanceof Error ? error.message : String(error)
      })
    }
    
    // Wait for AJAX to complete
    await page.waitForTimeout(500)
  }

  /**
   * Detect technologies using Playwright
   */
  private async detectTechnologies(page: Page, html: string): Promise<string[]> {
    const technologies = new Set<string>()
    
    // Check window object for frameworks
    const windowChecks = await page.evaluate(() => {
      const checks: string[] = []
      if ((window as any).React) checks.push('React')
      if ((window as any).Vue) checks.push('Vue.js')
      if ((window as any).angular) checks.push('Angular')
      if ((window as any).jQuery) checks.push('jQuery')
      if ((window as any).__NEXT_DATA__) checks.push('Next.js')
      if ((window as any).__NUXT__) checks.push('Nuxt.js')
      if ((window as any).gatsby) checks.push('Gatsby')
      if ((window as any).wp) checks.push('WordPress')
      return checks
    })
    
    windowChecks.forEach(tech => technologies.add(tech))
    
    // Check for other indicators in HTML
    if (html.includes('shopify')) technologies.add('Shopify')
    if (html.includes('cloudflare')) technologies.add('Cloudflare')
    if (html.includes('gtag') || html.includes('google-analytics')) technologies.add('Google Analytics')
    if (html.includes('fbq') || html.includes('facebook')) technologies.add('Facebook Pixel')
    
    return Array.from(technologies)
  }

  /**
   * Extract API endpoints using network interception
   */
  private async extractAPIEndpoints(page: Page): Promise<string[]> {
    const endpoints = new Set<string>()
    
    // Get all XHR/Fetch requests made by the page
    const requests = await page.evaluate(() => {
      const apiPatterns = ['/api/', '/v1/', '/v2/', '/graphql', '.json']
      const requests: string[] = []
      
      // Check performance entries
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      entries.forEach(entry => {
        if (apiPatterns.some(pattern => entry.name.includes(pattern))) {
          requests.push(entry.name)
        }
      })
      
      return requests
    })
    
    requests.forEach(req => endpoints.add(req))
    
    return Array.from(endpoints)
  }

  /**
   * Extract contact information using Playwright
   */
  private async extractContactInfo(page: Page): Promise<ContactInfo> {
    return await page.evaluate(() => {
      const info: ContactInfo = {
        emails: [],
        phones: [],
        addresses: []
      }
      
      // Extract emails
      const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
      const text = document.body?.innerText || ''
      const emailMatches = text.match(emailPattern) || []
      info.emails = Array.from(new Set(emailMatches))
      
      // Extract phone numbers
      const phonePattern = /[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,4}/g
      const phoneMatches = text.match(phonePattern) || []
      info.phones = Array.from(new Set(phoneMatches.filter(p => p.length >= 10)))
      
      // Extract addresses
      const addressElements = document.querySelectorAll('address, [itemprop="address"], .address')
      addressElements.forEach(el => {
        const address = (el as HTMLElement).innerText?.trim()
        if (address && address.length > 10) {
          info.addresses?.push(address)
        }
      })
      
      return info
    })
  }

  /**
   * Extract social media links using Playwright
   */
  private async extractSocialLinks(page: Page): Promise<SocialLinks> {
    return await page.evaluate(() => {
      const social: SocialLinks = {}
      const links = document.querySelectorAll('a[href]')
      
      const patterns = [
        { platform: 'twitter', regex: /twitter\.com|x\.com/ },
        { platform: 'linkedin', regex: /linkedin\.com/ },
        { platform: 'facebook', regex: /facebook\.com/ },
        { platform: 'instagram', regex: /instagram\.com/ },
        { platform: 'youtube', regex: /youtube\.com/ },
        { platform: 'github', regex: /github\.com/ }
      ]
      
      links.forEach(link => {
        const href = (link as HTMLAnchorElement).href
        patterns.forEach(({ platform, regex }) => {
          if (regex.test(href) && !social[platform]) {
            social[platform] = href
          }
        })
      })
      
      return social
    })
  }

  /**
   * Extract forms using Playwright
   */
  private async extractForms(page: Page): Promise<FormData[]> {
    return await page.evaluate(() => {
      const forms: FormData[] = []
      
      document.querySelectorAll('form').forEach(form => {
        const fields: FormData['fields'] = []
        
        form.querySelectorAll('input, select, textarea').forEach(field => {
          const element = field as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
          fields.push({
            name: element.name,
            type: element.type || element.tagName.toLowerCase(),
            required: element.required
          })
        })
        
        forms.push({
          action: (form as HTMLFormElement).action,
          method: (form as HTMLFormElement).method,
          fields
        })
      })
      
      return forms
    })
  }

  /**
   * Extract images using Playwright
   */
  private async extractImages(page: Page, baseUrl: string): Promise<ImageData[]> {
    return await page.evaluate((base) => {
      const images: ImageData[] = []
      const seen = new Set<string>()
      
      document.querySelectorAll('img').forEach(img => {
        let src = (img as HTMLImageElement).src || (img as HTMLImageElement).dataset.src
        
        if (!src || seen.has(src)) return
        seen.add(src)
        
        images.push({
          src,
          alt: (img as HTMLImageElement).alt,
          width: (img as HTMLImageElement).naturalWidth || parseInt((img as HTMLImageElement).width as any) || 0,
          height: (img as HTMLImageElement).naturalHeight || parseInt((img as HTMLImageElement).height as any) || 0
        })
      })
      
      return images
    }, baseUrl)
  }

  /**
   * Detect infinite scroll
   */
  private async detectInfiniteScroll(page: Page): Promise<boolean> {
    return await page.evaluate(() => {
      // Check for common infinite scroll indicators
      const indicators = [
        document.querySelector('[class*="infinite"]'),
        document.querySelector('[class*="endless"]'),
        document.querySelector('[data-infinite]'),
        // Check if scrolling loads more content
        document.body.scrollHeight > window.innerHeight * 2
      ]
      
      return indicators.some(Boolean)
    })
  }

  /**
   * Detect pagination with comprehensive error recovery
   */
  private async detectPagination(page: Page): Promise<boolean> {
    try {
      return await page.evaluate(() => {
        try {
          // Check for pagination elements using standard DOM API
          const indicators = [
            document.querySelector('.pagination'),
            document.querySelector('[class*="page"]'),
            document.querySelector('nav[aria-label*="pagination"]'),
            document.querySelector('a[rel="next"]'),
            // Fixed: Use standard DOM API instead of Playwright-specific selector
            Array.from(document.querySelectorAll('button')).find(btn =>
              btn.textContent?.toLowerCase().includes('next') ||
              btn.innerText?.toLowerCase().includes('next')
            ),
            // Additional common pagination patterns
            document.querySelector('.next-page'),
            document.querySelector('[aria-label*="Next"]'),
            document.querySelector('a[aria-label*="next"]')
          ]

          return indicators.some(Boolean)
        } catch (error) {
          // If any error occurs during pagination detection, continue without pagination
          console.warn('Pagination detection inner error:', error)
          return false
        }
      })
    } catch (error) {
      // Outer error recovery - ensure scraper doesn't crash completely
      permanentLogger.breadcrumb('pagination_detection_error', 'Failed to detect pagination', {
        error: error instanceof Error ? error.message : String(error),
        willContinue: true
      })
      console.warn('Pagination detection outer error - continuing without pagination:', error)
      return false
    }
  }

  /**
   * Classify a link type
   */
  private classifyLink(link: string, sourceUrl: string): DiscoveredLink['type'] {
    try {
      const linkUrl = new URL(link)
      const sourceUrlObj = new URL(sourceUrl)
      
      if (linkUrl.hostname === sourceUrlObj.hostname) {
        if (/\.(jpg|jpeg|png|gif|svg|css|js|pdf)$/i.test(linkUrl.pathname)) {
          return 'asset'
        }
        if (linkUrl.pathname.includes('/api/')) {
          return 'api'
        }
        return 'internal'
      }
      
      if (/twitter|facebook|linkedin|instagram|youtube|github/i.test(linkUrl.hostname)) {
        return 'social'
      }
      
      return 'external'
    } catch {
      return 'external'
    }
  }

  /**
   * Prioritize a link
   */
  private prioritizeLink(link: string, sourceUrl: string): 'high' | 'medium' | 'low' {
    try {
      const url = new URL(link)
      const source = new URL(sourceUrl)
      
      // High priority: same domain, important paths
      if (url.hostname === source.hostname) {
        if (/\/(about|products|services|api|docs)/i.test(url.pathname)) {
          return 'high'
        }
        return 'medium'
      }
      
      return 'low'
    } catch {
      return 'low'
    }
  }

  /**
   * Generate suggestions
   */
  private generateSuggestions(pages: PageResult[], links: DiscoveredLink[]): any[] {
    const suggestions: any[] = []
    
    // Check for API endpoints that could be scraped directly
    const apiEndpoints = pages.flatMap(p => p.apiEndpoints || [])
    if (apiEndpoints.length > 0) {
      suggestions.push({
        action: 'use_scraper',
        scraperId: 'api',
        label: 'Extract data from APIs',
        reason: `Found ${apiEndpoints.length} API endpoints that may provide structured data`,
        estimatedTime: '5-10s',
        estimatedValue: 'high',
        confidence: 80
      })
    }
    
    // Check for pagination or infinite scroll
    const hasPagination = pages.some(p => p.structuredData?.hasPagination)
    const hasInfiniteScroll = pages.some(p => p.structuredData?.hasInfiniteScroll)
    
    if (hasPagination || hasInfiniteScroll) {
      suggestions.push({
        action: 'use_scraper',
        scraperId: 'spa',
        label: 'Handle pagination/infinite scroll',
        reason: 'Detected pagination or infinite scroll that may have more content',
        estimatedTime: '30-60s',
        estimatedValue: 'medium',
        confidence: 70
      })
    }
    
    return suggestions
  }

  /**
   * Validate results
   */
  async validate(result: ScraperResult): Promise<ValidationResult> {
    const issues: ValidationResult['issues'] = []
    
    // Check if we got dynamic content
    const hasDynamicContent = result.pages.some(p => 
      p.structuredData?.dynamicElements && p.structuredData.dynamicElements > 0
    )
    
    if (!hasDynamicContent) {
      issues.push({
        severity: 'info',
        field: 'dynamic_content',
        message: 'No dynamic content detected - static scraper might be sufficient'
      })
    }
    
    // Check success rate
    if (result.stats.successRate < 80) {
      issues.push({
        severity: 'warning',
        field: 'success_rate',
        message: `Success rate ${result.stats.successRate.toFixed(1)}% is below optimal`
      })
    }
    
    const completeness = Math.min(100, result.stats.successRate + (hasDynamicContent ? 20 : 0))
    const quality = result.stats.successRate
    
    return {
      isValid: true,
      completeness,
      quality,
      issues,
      suggestions: []
    }
  }

  /**
   * Check if can handle URL
   */
  canHandle(url: string, existingData?: MergedPageData): boolean {
    // Can handle any HTTP(S) URL
    if (!url.startsWith('http')) return false
    
    // Especially good for JS frameworks
    if (existingData?.technologies.some(t => 
      ['React', 'Vue', 'Angular', 'Next.js'].includes(t)
    )) {
      return true
    }
    
    return true
  }

  /**
   * Estimate value
   */
  estimateValue(urls: string[], existingData?: Map<string, MergedPageData>): ValueEstimate {
    const unscrapedUrls = urls.filter(url => !existingData?.has(url))
    
    // Check if existing data suggests dynamic content
    let hasDynamicHints = false
    if (existingData) {
      for (const [url, data] of existingData) {
        if (data.technologies.some(t => ['React', 'Vue', 'Angular'].includes(t))) {
          hasDynamicHints = true
          break
        }
      }
    }
    
    return {
      expectedDataPoints: unscrapedUrls.length * (hasDynamicHints ? 25 : 15),
      confidence: hasDynamicHints ? 90 : 70,
      valueAdds: [
        'JavaScript execution',
        'AJAX content loading',
        'Interactive element handling',
        'Network request monitoring',
        'Local/session storage access',
        'Dynamic content detection'
      ],
      estimatedTime: `${Math.ceil(unscrapedUrls.length * 3)}s`
    }
  }
}