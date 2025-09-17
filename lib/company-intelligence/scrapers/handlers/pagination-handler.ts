/**
 * Pagination Handler Module
 * 
 * Detects and handles various pagination patterns on websites.
 * Supports numbered pages, load more buttons, and next/previous navigation.
 * 
 * Features:
 * - Auto-detection of pagination patterns
 * - Multiple pagination strategy support
 * - Pagination limit management
 * - URL deduplication
 * - Progress tracking
 * 
 * @module pagination-handler
 */

import { Page, BrowserContext } from 'playwright'
import { permanentLogger } from '../../../utils/permanent-logger'

/**
 * Pagination detection patterns
 */
const PAGINATION_SELECTORS = [
  // Numbered pagination
  'a[href*="page="]',
  'a[href*="/page/"]',
  'a[href*="?p="]',
  'a[href*="&p="]',
  
  // Class-based pagination
  '.pagination a',
  '.page-numbers a',
  '.pager a',
  'nav[aria-label*="pagination"] a',
  '[role="navigation"] a',
  
  // Next/Previous buttons
  'a.next',
  'a.prev',
  'a.previous',
  'a[rel="next"]',
  'a[rel="prev"]',
  'button:has-text("Next")',
  'button:has-text("Previous")',
  'button:has-text("Load More")',
  'button:has-text("Show More")',
  
  // Icon-based navigation
  'a[aria-label*="next"]',
  'a[aria-label*="previous"]',
  'button[aria-label*="next"]',
  'button[aria-label*="previous"]'
]

/**
 * Configuration for pagination handling
 */
export interface PaginationConfig {
  /** Maximum number of pages to follow */
  maxPages?: number
  /** Delay between page loads in milliseconds */
  pageDelay?: number
  /** Whether to extract content from each page */
  extractContent?: boolean
  /** Custom pagination selectors */
  customSelectors?: string[]
  /** Enable debug logging */
  debug?: boolean
}

/**
 * Default pagination configuration
 */
const DEFAULT_CONFIG: Required<Omit<PaginationConfig, 'customSelectors'>> = {
  maxPages: 5,
  pageDelay: 1000,
  extractContent: true,
  debug: false
}

/**
 * Result of pagination detection
 */
export interface PaginationInfo {
  /** Type of pagination detected */
  type: 'numbered' | 'next-prev' | 'load-more' | 'none'
  /** Total pages detected (if numbered) */
  totalPages?: number
  /** Current page number */
  currentPage?: number
  /** Available pagination links */
  links: string[]
  /** Next page URL if available */
  nextPageUrl?: string
  /** Previous page URL if available */
  prevPageUrl?: string
}

/**
 * Pagination Handler for managing multi-page content
 */
export class PaginationHandler {
  private config: Required<Omit<PaginationConfig, 'customSelectors'>>
  private customSelectors: string[]
  private visitedUrls: Set<string> = new Set()

  constructor(config?: PaginationConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.customSelectors = config?.customSelectors || []
  }

  /**
   * Detect pagination on the current page
   * 
   * @param page - Playwright page instance
   * @returns Pagination information
   */
  async detectPagination(page: Page): Promise<PaginationInfo> {
    if (this.config.debug) {
      permanentLogger.info('PAGINATION_HANDLER', 'Detecting pagination patterns')
    }

    const selectors = [...PAGINATION_SELECTORS, ...this.customSelectors]
    
    const paginationData = await page.evaluate((selectorList) => {
      const links: string[] = []
      let nextPageUrl: string | undefined
      let prevPageUrl: string | undefined
      let currentPage = 1
      let totalPages = 0
      let type: 'numbered' | 'next-prev' | 'load-more' | 'none' = 'none'

      // Helper to get absolute URL
      const getAbsoluteUrl = (href: string): string => {
        const link = document.createElement('a')
        link.href = href
        return link.href
      }

      // Check each selector
      for (const selector of selectorList) {
        try {
          const elements = document.querySelectorAll(selector)
          
          elements.forEach((el) => {
            const href = (el as HTMLAnchorElement).href || el.getAttribute('href')
            const text = el.textContent?.toLowerCase() || ''
            
            if (href && !href.includes('#')) {
              const absoluteUrl = getAbsoluteUrl(href)
              
              // Detect next/previous
              if (text.includes('next') || el.getAttribute('rel') === 'next') {
                nextPageUrl = absoluteUrl
                type = type === 'none' ? 'next-prev' : type
              } else if (text.includes('prev') || el.getAttribute('rel') === 'prev') {
                prevPageUrl = absoluteUrl
                type = type === 'none' ? 'next-prev' : type
              }
              
              // Detect numbered pagination
              const pageMatch = href.match(/[?&]page=(\d+)|\/page\/(\d+)/)
              if (pageMatch) {
                const pageNum = parseInt(pageMatch[1] || pageMatch[2])
                if (pageNum > totalPages) totalPages = pageNum
                type = 'numbered'
              }
              
              // Detect load more buttons
              if (el.tagName === 'BUTTON' && (text.includes('load more') || text.includes('show more'))) {
                type = 'load-more'
              }
              
              // Add to links if it's a valid pagination link
              if (!links.includes(absoluteUrl)) {
                links.push(absoluteUrl)
              }
            }
          })
        } catch (error) {
      // Log error but re-throw to avoid silent failures
      permanentLogger.captureError('ERROR', error as Error, {
        context: 'Unhandled error - needs proper handling'
      })
      throw error
    }
      }

      // Try to detect current page
      const activePageEl = document.querySelector('.pagination .active, .pagination .current, [aria-current="page"]')
      if (activePageEl) {
        const pageText = activePageEl.textContent
        if (pageText) {
          const pageNum = parseInt(pageText)
          if (!isNaN(pageNum)) {
            currentPage = pageNum
          }
        }
      }

      return {
        type,
        totalPages: totalPages || undefined,
        currentPage,
        links: links.slice(0, 10), // Limit to 10 links
        nextPageUrl,
        prevPageUrl
      }
    }, selectors)

    if (this.config.debug) {
      permanentLogger.info('PAGINATION_HANDLER', 'Pagination detected', paginationData)
    }

    return paginationData
  }

  /**
   * Handle pagination by navigating through pages
   * 
   * @param page - Current page instance
   * @param context - Browser context for opening new pages
   * @param onPageLoad - Callback for each page load
   * @returns Array of page URLs visited
   */
  async handlePagination(
    page: Page,
    context: BrowserContext,
    onPageLoad?: (page: Page, url: string) => Promise<void>
  ): Promise<string[]> {
    const startUrl = page.url()
    this.visitedUrls.add(startUrl)

    const paginationInfo = await this.detectPagination(page)
    
    if (paginationInfo.type === 'none') {
      permanentLogger.info('PAGINATION_HANDLER', 'No pagination detected')
      return [startUrl]
    }

    permanentLogger.info('PAGINATION_HANDLER', `Handling ${paginationInfo.type} pagination`, {
      totalPages: paginationInfo.totalPages,
      linksFound: paginationInfo.links.length
    })

    const pagesVisited: string[] = [startUrl]

    // Handle based on pagination type
    switch (paginationInfo.type) {
      case 'numbered':
        await this.handleNumberedPagination(context, paginationInfo, onPageLoad, pagesVisited)
        break
      
      case 'next-prev':
        await this.handleNextPrevPagination(page, context, paginationInfo, onPageLoad, pagesVisited)
        break
      
      case 'load-more':
        await this.handleLoadMore(page, onPageLoad, pagesVisited)
        break
    }

    return pagesVisited
  }

  /**
   * Handle numbered pagination
   */
  private async handleNumberedPagination(
    context: BrowserContext,
    paginationInfo: PaginationInfo,
    onPageLoad?: (page: Page, url: string) => Promise<void>,
    pagesVisited: string[] = []
  ): Promise<void> {
    const linksToVisit = paginationInfo.links
      .filter(url => !this.visitedUrls.has(url))
      .slice(0, this.config.maxPages - 1) // -1 because we already visited the first page

    for (const url of linksToVisit) {
      if (pagesVisited.length >= this.config.maxPages) break

      try {
        const newPage = await context.newPage()
        await newPage.goto(url, { waitUntil: 'networkidle' })
        
        this.visitedUrls.add(url)
        pagesVisited.push(url)

        if (onPageLoad) {
          await onPageLoad(newPage, url)
        }

        await newPage.close()
        
        // Delay between pages
        if (this.config.pageDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, this.config.pageDelay))
        }
      } catch (error) {
        permanentLogger.captureError('PAGINATION_HANDLER', new Error('Error loading page ${url}'), error)
      }
    }
  }

  /**
   * Handle next/previous pagination
   */
  private async handleNextPrevPagination(
    page: Page,
    context: BrowserContext,
    paginationInfo: PaginationInfo,
    onPageLoad?: (page: Page, url: string) => Promise<void>,
    pagesVisited: string[] = []
  ): Promise<void> {
    let currentUrl = paginationInfo.nextPageUrl

    while (currentUrl && pagesVisited.length < this.config.maxPages) {
      if (this.visitedUrls.has(currentUrl)) break

      try {
        const newPage = await context.newPage()
        await newPage.goto(currentUrl, { waitUntil: 'networkidle' })
        
        this.visitedUrls.add(currentUrl)
        pagesVisited.push(currentUrl)

        if (onPageLoad) {
          await onPageLoad(newPage, currentUrl)
        }

        // Look for next page on the new page
        const nextInfo = await this.detectPagination(newPage)
        currentUrl = nextInfo.nextPageUrl

        await newPage.close()
        
        // Delay between pages
        if (this.config.pageDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, this.config.pageDelay))
        }
      } catch (error) {
        permanentLogger.captureError('PAGINATION_HANDLER', new Error('Error loading page ${currentUrl}'), error)
        break
      }
    }
  }

  /**
   * Handle load more button pagination
   */
  private async handleLoadMore(
    page: Page,
    onPageLoad?: (page: Page, url: string) => Promise<void>,
    pagesVisited: string[] = []
  ): Promise<void> {
    let attempts = 0
    const maxAttempts = this.config.maxPages - 1 // -1 because we already loaded the first page

    while (attempts < maxAttempts) {
      try {
        // Look for load more button
        const loadMoreButton = await page.$('button:has-text("Load More"), button:has-text("Show More")')
        
        if (!loadMoreButton) {
          permanentLogger.info('PAGINATION_HANDLER', 'No more load more button found')
          break
        }

        // Click the button
        await loadMoreButton.click()
        
        // Wait for content to load
        await page.waitForTimeout(this.config.pageDelay || 1000)
        
        // Track as a new "page"
        const currentUrl = `${page.url()}#page-${attempts + 2}`
        pagesVisited.push(currentUrl)

        if (onPageLoad) {
          await onPageLoad(page, currentUrl)
        }

        attempts++
      } catch (error) {
        permanentLogger.captureError('PAGINATION_HANDLER', new Error('Error clicking load more'), error)
        break
      }
    }
  }

  /**
   * Reset visited URLs tracking
   */
  resetVisited(): void {
    this.visitedUrls.clear()
  }
}