/**
 * PageCrawlerService
 *
 * Service responsible for crawling web pages to discover links.
 * Extracts links from homepages, blog sections, and other pages
 * with proper error handling and breadcrumbs.
 *
 * @module company-intelligence/services
 */

import * as cheerio from 'cheerio'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { generateTitleFromUrl } from '@/lib/utils/html-decoder'

/**
 * Configuration options for page crawling
 */
export interface PageCrawlerOptions {
  timeout?: number
  maxDepth?: number
  userAgent?: string
  maxLinksPerPage?: number
  followExternalLinks?: boolean
}

/**
 * Represents a discovered page with metadata
 */
export interface DiscoveredPage {
  url: string
  title: string
  priority: number
  source: 'homepage' | 'blog' | 'navigation' | 'footer' | 'content' | 'pattern'
  depth: number
  discoveredAt: number
}

/**
 * Result of a crawling operation
 */
export interface CrawlResult {
  pages: DiscoveredPage[]
  linksFound: number
  errors: string[]
  timeMs: number
}

/**
 * Service for crawling web pages and discovering links
 */
export class PageCrawlerService {
  private baseUrl: string
  private domain: string
  private options: Required<PageCrawlerOptions>
  private visitedUrls: Set<string>

  constructor(baseUrl: string, options: PageCrawlerOptions = {}) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
    this.domain = new URL(baseUrl).hostname

    // Set default options
    this.options = {
      timeout: options.timeout ?? 10000,
      maxDepth: options.maxDepth ?? 2,
      userAgent: options.userAgent ?? 'Mozilla/5.0 (compatible; CompanyIntelligenceBot/1.0)',
      maxLinksPerPage: options.maxLinksPerPage ?? 200,
      followExternalLinks: options.followExternalLinks ?? false
    }

    this.visitedUrls = new Set<string>()
  }

  /**
   * Crawl the homepage to discover all links
   * Extracts links from navigation, footer, and content sections
   */
  async crawlHomepage(): Promise<CrawlResult> {
    const startTime = Date.now()
    const result: CrawlResult = {
      pages: [],
      linksFound: 0,
      errors: [],
      timeMs: 0
    }

    permanentLogger.info('PAGE_CRAWLER', 'Starting homepage crawl', {
      baseUrl: this.baseUrl,
      maxLinks: this.options.maxLinksPerPage
    })

    try {
      // Add homepage itself
      result.pages.push({
        url: this.baseUrl,
        title: 'Home',
        priority: 1.0,
        source: 'homepage',
        depth: 0,
        discoveredAt: Date.now()
      })

      // Fetch homepage HTML
      const html = await this.fetchPage(this.baseUrl)
      if (!html) {
        result.errors.push('Failed to fetch homepage')
        return result
      }

      const $ = cheerio.load(html)
      const discoveredUrls = new Map<string, DiscoveredPage>()

      // Extract links from different sections
      const sections = [
        { selector: 'nav', source: 'navigation' as const, priority: 0.9 },
        { selector: 'header', source: 'navigation' as const, priority: 0.9 },
        { selector: 'footer', source: 'footer' as const, priority: 0.8 },
        { selector: 'main', source: 'content' as const, priority: 0.7 },
        { selector: 'aside', source: 'content' as const, priority: 0.6 }
      ]

      for (const section of sections) {
        const links = this.extractLinksFromSection($, section.selector)

        permanentLogger.info('PAGE_CRAWLER', `Extracted links from ${section.selector}`, {
          count: links.length,
          source: section.source
        })

        for (const link of links) {
          const normalizedUrl = this.normalizeUrl(link)
          if (normalizedUrl && this.isValidInternalUrl(normalizedUrl)) {
            if (!discoveredUrls.has(normalizedUrl)) {
              const title = await this.extractPageTitle(normalizedUrl, $)
              discoveredUrls.set(normalizedUrl, {
                url: normalizedUrl,
                title,
                priority: section.priority,
                source: section.source,
                depth: 1,
                discoveredAt: Date.now()
              })
            }
          }
        }
      }

      // Also extract all links from the page (catch-all)
      $('a[href]').each((_, element) => {
        const href = $(element).attr('href')
        if (href) {
          const normalizedUrl = this.normalizeUrl(href)
          if (normalizedUrl && this.isValidInternalUrl(normalizedUrl)) {
            if (!discoveredUrls.has(normalizedUrl)) {
              const text = $(element).text().trim() || generateTitleFromUrl(normalizedUrl)
              discoveredUrls.set(normalizedUrl, {
                url: normalizedUrl,
                title: text,
                priority: 0.5,
                source: 'content',
                depth: 1,
                discoveredAt: Date.now()
              })
            }
          }
        }
      })

      // Add all discovered pages to result
      result.pages.push(...Array.from(discoveredUrls.values()))
      result.linksFound = discoveredUrls.size

      // Apply max links limit
      if (result.pages.length > this.options.maxLinksPerPage) {
        result.pages = this.prioritizePages(result.pages).slice(0, this.options.maxLinksPerPage)
      }

      result.timeMs = Date.now() - startTime

      permanentLogger.info('PAGE_CRAWLER', 'Homepage crawl complete', {
        pagesFound: result.pages.length,
        linksFound: result.linksFound,
        timeMs: result.timeMs
      })

    } catch (error) {
      permanentLogger.captureError('PAGE_CRAWLER', error as Error, {
        url: this.baseUrl,
        phase: 'homepage-crawl'
      })
      result.errors.push(error instanceof Error ? error.message : 'Unknown error')
    }

    return result
  }

  /**
   * Crawl blog section to discover articles
   */
  async crawlBlogSection(blogUrl: string): Promise<CrawlResult> {
    const startTime = Date.now()
    const result: CrawlResult = {
      pages: [],
      linksFound: 0,
      errors: [],
      timeMs: 0
    }

    permanentLogger.info('PAGE_CRAWLER', 'Starting blog section crawl', {
      blogUrl
    })

    try {
      // Add blog page itself
      result.pages.push({
        url: blogUrl,
        title: 'Blog',
        priority: 0.8,
        source: 'blog',
        depth: 0,
        discoveredAt: Date.now()
      })

      // Fetch blog page HTML
      const html = await this.fetchPage(blogUrl)
      if (!html) {
        result.errors.push('Failed to fetch blog page')
        return result
      }

      const $ = cheerio.load(html)
      const articleUrls = new Set<string>()

      // Common selectors for blog articles
      const articleSelectors = [
        'article a[href]',
        '.post a[href]',
        '.blog-post a[href]',
        '.article-link',
        '[class*="blog"] a[href]',
        '[class*="article"] a[href]',
        '[class*="post"] a[href]'
      ]

      for (const selector of articleSelectors) {
        $(selector).each((_, element) => {
          const href = $(element).attr('href')
          if (href) {
            const normalizedUrl = this.normalizeUrl(href)
            if (normalizedUrl && this.isValidInternalUrl(normalizedUrl) && this.looksLikeArticle(normalizedUrl)) {
              articleUrls.add(normalizedUrl)
            }
          }
        })
      }

      // Extract titles and create page entries
      for (const url of articleUrls) {
        const title = await this.extractArticleTitle(url, $)
        result.pages.push({
          url,
          title,
          priority: 0.6,
          source: 'blog',
          depth: 1,
          discoveredAt: Date.now()
        })
      }

      result.linksFound = articleUrls.size
      result.timeMs = Date.now() - startTime

      permanentLogger.info('PAGE_CRAWLER', 'Blog crawl complete', {
        articlesFound: result.pages.length - 1, // Minus the blog page itself
        timeMs: result.timeMs
      })

    } catch (error) {
      permanentLogger.captureError('PAGE_CRAWLER', error as Error, {
        url: blogUrl,
        phase: 'blog-crawl'
      })
      result.errors.push(error instanceof Error ? error.message : 'Unknown error')
    }

    return result
  }

  /**
   * Crawl a specific page for links
   */
  async crawlPageForLinks(pageUrl: string, depth: number = 1): Promise<CrawlResult> {
    const startTime = Date.now()
    const result: CrawlResult = {
      pages: [],
      linksFound: 0,
      errors: [],
      timeMs: 0
    }

    // Check if already visited or max depth reached
    if (this.visitedUrls.has(pageUrl) || depth > this.options.maxDepth) {
      return result
    }

    this.visitedUrls.add(pageUrl)

    permanentLogger.info('PAGE_CRAWLER', 'Crawling page for links', {
      url: pageUrl,
      depth
    })

    try {
      const html = await this.fetchPage(pageUrl)
      if (!html) {
        result.errors.push(`Failed to fetch ${pageUrl}`)
        return result
      }

      const $ = cheerio.load(html)
      const links = new Set<string>()

      // Extract all links
      $('a[href]').each((_, element) => {
        const href = $(element).attr('href')
        if (href) {
          const normalizedUrl = this.normalizeUrl(href)
          if (normalizedUrl && this.isValidInternalUrl(normalizedUrl) && !this.visitedUrls.has(normalizedUrl)) {
            links.add(normalizedUrl)
          }
        }
      })

      // Create page entries
      for (const url of links) {
        const title = generateTitleFromUrl(url)
        result.pages.push({
          url,
          title,
          priority: Math.max(0.3, 0.5 - (depth * 0.1)), // Lower priority for deeper pages
          source: 'content',
          depth: depth + 1,
          discoveredAt: Date.now()
        })
      }

      result.linksFound = links.size
      result.timeMs = Date.now() - startTime

      permanentLogger.info('PAGE_CRAWLER', 'Page crawl complete', {
        url: pageUrl,
        linksFound: result.linksFound,
        depth,
        timeMs: result.timeMs
      })

    } catch (error) {
      permanentLogger.captureError('PAGE_CRAWLER', error as Error, {
        url: pageUrl,
        phase: 'page-crawl',
        depth
      })
      result.errors.push(error instanceof Error ? error.message : 'Unknown error')
    }

    return result
  }

  /**
   * Fetch a page's HTML content
   */
  private async fetchPage(url: string): Promise<string | null> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.options.userAgent
        },
        signal: AbortSignal.timeout(this.options.timeout)
      })

      if (!response.ok) {
        permanentLogger.warn('PAGE_CRAWLER', 'Failed to fetch page', {
          url,
          status: response.status
        })
        return null
      }

      return await response.text()

    } catch (error) {
      permanentLogger.debug('PAGE_CRAWLER', 'Error fetching page', {
        url,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return null
    }
  }

  /**
   * Extract links from a specific section
   */
  private extractLinksFromSection($: cheerio.CheerioAPI, selector: string): string[] {
    const links: string[] = []

    $(selector).find('a[href]').each((_, element) => {
      const href = $(element).attr('href')
      if (href) {
        links.push(href)
      }
    })

    // Also check for data-href attributes (common in React/Next.js apps)
    $(selector).find('[data-href]').each((_, element) => {
      const href = $(element).attr('data-href')
      if (href) {
        links.push(href)
      }
    })

    return links
  }

  /**
   * Extract page title from HTML or generate from URL
   */
  private async extractPageTitle(url: string, $?: cheerio.CheerioAPI): Promise<string> {
    // If we have the page loaded, try to find the title
    if ($) {
      const linkElement = $(`a[href="${url}"], a[href="${url}/"]`)
      if (linkElement.length > 0) {
        const text = linkElement.first().text().trim()
        if (text) return text
      }
    }

    // Try to fetch the page and get its title
    try {
      const html = await this.fetchPage(url)
      if (html) {
        const pageDoc = cheerio.load(html)
        const title = pageDoc('title').text().trim()
        if (title) {
          // Clean up common title patterns
          return title
            .replace(/\s*[|\-–—]\s*.*$/, '') // Remove site name suffix
            .trim()
        }
      }
    } catch {
      // Fall through to URL-based title
    }

    // Generate title from URL
    return generateTitleFromUrl(url)
  }

  /**
   * Extract article title
   */
  private async extractArticleTitle(url: string, $: cheerio.CheerioAPI): Promise<string> {
    // Try to find the link text
    const linkElement = $(`a[href="${url}"], a[href="${url}/"]`)
    if (linkElement.length > 0) {
      const text = linkElement.first().text().trim()
      if (text) return text

      // Check for title attribute
      const titleAttr = linkElement.first().attr('title')
      if (titleAttr) return titleAttr
    }

    // Generate from URL
    return generateTitleFromUrl(url)
  }

  /**
   * Normalize a URL to absolute form
   */
  private normalizeUrl(href: string): string | null {
    try {
      // Skip non-HTTP links
      if (
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('javascript:') ||
        href.includes('youtube.com') ||
        href.includes('twitter.com') ||
        href.includes('facebook.com') ||
        href.includes('linkedin.com') ||
        href.includes('instagram.com') ||
        href.match(/\.(jpg|jpeg|png|gif|pdf|zip|exe|dmg|svg|ico|webp)$/i)
      ) {
        return null
      }

      // Convert to absolute URL
      let absoluteUrl: string
      if (href.startsWith('http')) {
        absoluteUrl = href
      } else if (href.startsWith('/')) {
        absoluteUrl = `${this.baseUrl}${href}`
      } else {
        absoluteUrl = `${this.baseUrl}/${href}`
      }

      // Normalize the URL
      const url = new URL(absoluteUrl)
      url.hash = ''
      let normalized = url.toString()
      if (normalized.endsWith('/') && normalized !== this.baseUrl + '/') {
        normalized = normalized.slice(0, -1)
      }

      return normalized

    } catch {
      return null
    }
  }

  /**
   * Check if URL is valid and internal
   */
  private isValidInternalUrl(url: string): boolean {
    try {
      const urlObj = new URL(url)

      // Check if same domain
      if (!this.options.followExternalLinks && urlObj.hostname !== this.domain) {
        return false
      }

      // Skip certain patterns
      const skipPatterns = [
        /\/wp-admin/,
        /\/admin/,
        /\/login/,
        /\/logout/,
        /\/register/,
        /\/cart/,
        /\/checkout/,
        /\?/,  // Skip URLs with query parameters
        /#/    // Skip URLs with fragments
      ]

      return !skipPatterns.some(pattern => pattern.test(url))

    } catch {
      return false
    }
  }

  /**
   * Check if URL looks like a blog article
   */
  private looksLikeArticle(url: string): boolean {
    const articlePatterns = [
      /\/blog\//,
      /\/article\//,
      /\/post\//,
      /\/news\//,
      /\/insights\//,
      /\/resources\//,
      /\/\d{4}\/\d{2}\//,  // Date-based URLs (2024/01/)
      /\d{4}-\d{2}-\d{2}/  // Date in URL
    ]

    return articlePatterns.some(pattern => pattern.test(url))
  }

  /**
   * Prioritize pages based on importance
   */
  private prioritizePages(pages: DiscoveredPage[]): DiscoveredPage[] {
    return pages.sort((a, b) => {
      // Priority 1: Explicit priority value
      if (a.priority !== b.priority) {
        return b.priority - a.priority
      }

      // Priority 2: Depth (shallower = higher priority)
      if (a.depth !== b.depth) {
        return a.depth - b.depth
      }

      // Priority 3: Source importance
      const sourceOrder = {
        homepage: 0,
        navigation: 1,
        footer: 2,
        blog: 3,
        content: 4,
        pattern: 5
      }
      const aOrder = sourceOrder[a.source]
      const bOrder = sourceOrder[b.source]
      if (aOrder !== bOrder) {
        return aOrder - bOrder
      }

      // Priority 4: URL length (shorter = higher priority)
      return a.url.length - b.url.length
    })
  }
}