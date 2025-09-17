/**
 * Link Crawler Utility
 * Discovers internal links by crawling website pages
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { Page } from 'playwright'
import { getDeduplicator } from './content-deduplicator'

export interface CrawledLink {
  url: string
  text: string
  depth: number
  parentUrl: string
}

export class LinkCrawler {
  private domain: string
  private visitedUrls: Set<string> = new Set()
  private discoveredLinks: CrawledLink[] = []
  private maxDepth: number = 3
  private maxUrls: number = 100
  private deduplicator = getDeduplicator()

  constructor(domain: string, options?: { maxDepth?: number; maxUrls?: number }) {
    this.domain = domain
    this.maxDepth = options?.maxDepth ?? 3
    this.maxUrls = options?.maxUrls ?? 100
  }

  /**
   * Crawl website starting from homepage to discover all internal links
   */
  async crawlForLinks(page: Page): Promise<CrawledLink[]> {
    const startUrl = `https://${this.domain}`
    
    permanentLogger.info('LINK_CRAWLER', 'Starting link discovery', {
      domain: this.domain,
      maxDepth: this.maxDepth,
      maxUrls: this.maxUrls
    })

    await this.crawlPage(page, startUrl, 0, startUrl)
    
    // Also check common pages that might not be linked
    const commonPages = [
      '/sitemap',
      '/site-map',
      '/privacy',
      '/privacy-policy',
      '/terms',
      '/terms-of-service',
      '/blog',
      '/news',
      '/resources',
      '/careers',
      '/jobs'
    ]

    for (const path of commonPages) {
      const url = `https://${this.domain}${path}`
      if (!this.visitedUrls.has(this.deduplicator.normalizeUrl(url))) {
        try {
          await this.crawlPage(page, url, 1, startUrl)
        } catch (error) {
      // Log error but re-throw to avoid silent failures
      permanentLogger.captureError('ERROR', error as Error, {
        context: 'Unhandled error - needs proper handling'
      })
      throw error
    }
      }
    }

    permanentLogger.info('LINK_CRAWLER', 'Link discovery complete', {
      totalDiscovered: this.discoveredLinks.length,
      uniqueUrls: this.visitedUrls.size
    })

    return this.discoveredLinks
  }

  /**
   * Crawl a single page for links
   */
  private async crawlPage(page: Page, url: string, depth: number, parentUrl: string): Promise<void> {
    // Check limits
    if (depth > this.maxDepth || this.discoveredLinks.length >= this.maxUrls) {
      return
    }

    const normalizedUrl = this.deduplicator.normalizeUrl(url)
    
    // Skip if already visited
    if (this.visitedUrls.has(normalizedUrl)) {
      return
    }

    // Mark as visited
    this.visitedUrls.add(normalizedUrl)

    try {
      permanentLogger.debug('LINK_CRAWLER', 'Crawling page', { url, depth })
      
      // Navigate to the page
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      })

      // Skip if not successful
      if (!response || !response.ok()) {
        return
      }

      // Extract all links from the page
      const links = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href]'))
        return anchors.map(a => ({
          href: (a as HTMLAnchorElement).href,
          text: (a as HTMLAnchorElement).textContent?.trim() || ''
        }))
      })

      // Process each link
      for (const link of links) {
        if (this.discoveredLinks.length >= this.maxUrls) {
          break
        }

        // Check if it's an internal link
        if (this.isInternalLink(link.href)) {
          const linkNormalized = this.deduplicator.normalizeUrl(link.href)
          
          // Add to discovered links
          this.discoveredLinks.push({
            url: linkNormalized,
            text: link.text,
            depth: depth,
            parentUrl: normalizedUrl
          })

          // Recursively crawl if within depth limit
          if (depth < this.maxDepth && !this.visitedUrls.has(linkNormalized)) {
            await this.crawlPage(page, linkNormalized, depth + 1, normalizedUrl)
          }
        }
      }

      // Also extract navigation menu items specifically
      const navLinks = await page.evaluate(() => {
        const navSelectors = [
          'nav a',
          'header a',
          '.navigation a',
          '.nav a',
          '.menu a',
          '[role="navigation"] a'
        ]
        
        const links: { href: string; text: string }[] = []
        for (const selector of navSelectors) {
          const elements = document.querySelectorAll(selector)
          elements.forEach(el => {
            const anchor = el as HTMLAnchorElement
            if (anchor.href) {
              links.push({
                href: anchor.href,
                text: anchor.textContent?.trim() || ''
              })
            }
          })
        }
        return links
      })

      // Add navigation links with higher priority
      for (const link of navLinks) {
        if (this.isInternalLink(link.href)) {
          const linkNormalized = this.deduplicator.normalizeUrl(link.href)
          
          // Add or update with navigation context
          const existing = this.discoveredLinks.find(l => l.url === linkNormalized)
          if (!existing) {
            this.discoveredLinks.push({
              url: linkNormalized,
              text: link.text || 'Navigation Link',
              depth: 0, // Navigation links get priority
              parentUrl: url
            })
          }
        }
      }
      
    } catch (error) {
      permanentLogger.debug('LINK_CRAWLER', 'Failed to crawl page', {
        url,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Check if a URL is internal to the domain
   */
  private isInternalLink(url: string): boolean {
    try {
      const parsed = new URL(url)
      const domain = this.domain.replace('www.', '')
      const urlDomain = parsed.hostname.replace('www.', '')
      
      return urlDomain === domain || urlDomain.endsWith(`.${domain}`)
    } catch {
      // Relative URLs are internal
      return !url.startsWith('http') && !url.startsWith('//')
    }
  }

  // NOTE: Using ContentDeduplicator.normalizeUrl() instead of duplicate implementation

  /**
   * Get unique URLs from discovered links
   */
  getUniqueUrls(): string[] {
    const unique = new Set<string>()
    for (const link of this.discoveredLinks) {
      unique.add(link.url)
    }
    return Array.from(unique)
  }

  /**
   * Get prioritized URLs based on depth and navigation presence
   */
  getPrioritizedUrls(): string[] {
    // Sort by depth (lower is better) and deduplicate
    const sorted = [...this.discoveredLinks].sort((a, b) => a.depth - b.depth)
    const unique = new Set<string>()
    const prioritized: string[] = []
    
    for (const link of sorted) {
      if (!unique.has(link.url)) {
        unique.add(link.url)
        prioritized.push(link.url)
      }
    }
    
    return prioritized
  }
}