/**
 * Sitemap Parser Utility
 * Discovers and parses XML sitemaps to find all available URLs
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { httpGet } from '@/lib/utils/http-fetcher'

export interface SitemapEntry {
  url: string
  lastmod?: string
  changefreq?: string
  priority?: number
}

export class SitemapParser {
  private domain: string
  private maxUrls: number = 500

  constructor(domain: string, maxUrls: number = 500) {
    this.domain = domain
    this.maxUrls = maxUrls
  }

  /**
   * Discover and parse sitemaps for a domain
   */
  async discoverUrls(): Promise<SitemapEntry[]> {
    const urls: SitemapEntry[] = []
    
    // Try common sitemap locations
    const sitemapLocations = [
      `https://${this.domain}/sitemap.xml`,
      `https://${this.domain}/sitemap_index.xml`,
      `https://${this.domain}/sitemap-index.xml`,
      `https://${this.domain}/wp-sitemap.xml`,
      `https://${this.domain}/post-sitemap.xml`,
      `https://${this.domain}/page-sitemap.xml`,
      `https://${this.domain}/sitemap.xml.gz`
    ]

    // Check robots.txt for sitemap references
    const robotsSitemaps = await this.checkRobotsTxt()
    sitemapLocations.push(...robotsSitemaps)

    permanentLogger.info('SITEMAP_PARSER', 'Checking sitemap locations', {
      domain: this.domain,
      locations: sitemapLocations.length
    })

    for (const location of sitemapLocations) {
      try {
        const sitemapUrls = await this.parseSitemap(location)
        if (sitemapUrls.length > 0) {
          permanentLogger.info('SITEMAP_PARSER', 'Found sitemap with URLs', {
            location,
            urlCount: sitemapUrls.length
          })
          urls.push(...sitemapUrls)
          
          // If we found a sitemap index, it might reference other sitemaps
          if (location.includes('index')) {
            for (const entry of sitemapUrls) {
              if (entry.url.endsWith('.xml')) {
                const nestedUrls = await this.parseSitemap(entry.url)
                urls.push(...nestedUrls)
              }
            }
          }
          
          // Stop if we have enough URLs
          if (urls.length >= this.maxUrls) {
            break
          }
        }
      } catch (error) {
        permanentLogger.debug('SITEMAP_PARSER', 'Failed to parse sitemap', {
          location,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Deduplicate and limit URLs
    const uniqueUrls = this.deduplicateUrls(urls)
    const prioritizedUrls = this.prioritizeUrls(uniqueUrls)
    
    permanentLogger.info('SITEMAP_PARSER', 'Sitemap discovery complete', {
      totalFound: urls.length,
      uniqueUrls: uniqueUrls.length,
      returning: Math.min(prioritizedUrls.length, this.maxUrls)
    })

    return prioritizedUrls.slice(0, this.maxUrls)
  }

  /**
   * Check robots.txt for sitemap references
   */
  private async checkRobotsTxt(): Promise<string[]> {
    const sitemaps: string[] = []

    try {
      // Use httpGet to handle redirects (e.g., bigfluffy.ai -> www.bigfluffy.ai)
      const result = await httpGet(`https://${this.domain}/robots.txt`, {
        timeout: 5000
      })

      if (result.ok && result.text) {
        const text = result.text
        const lines = text.split('\n')
        
        for (const line of lines) {
          if (line.toLowerCase().startsWith('sitemap:')) {
            const sitemapUrl = line.substring(8).trim()
            if (sitemapUrl) {
              sitemaps.push(sitemapUrl)
              permanentLogger.info('SITEMAP_PARSER', 'Found sitemap in robots.txt', {
                url: sitemapUrl
              })
            }
          }
        }
      }
    } catch (error) {
      permanentLogger.debug('SITEMAP_PARSER', 'Failed to fetch robots.txt', {
        domain: this.domain,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    return sitemaps
  }

  /**
   * Parse a single sitemap XML file
   */
  private async parseSitemap(url: string): Promise<SitemapEntry[]> {
    const entries: SitemapEntry[] = []

    try {
      // Use httpGet to handle redirects automatically
      const result = await httpGet(url, {
        timeout: 10000,
        maxRedirects: 5
      })

      if (!result.ok || !result.text) {
        return entries
      }

      const text = result.text

      // Log if we followed redirects to help with debugging
      if (result.redirectCount > 0) {
        permanentLogger.info('SITEMAP_PARSER', 'Followed redirects to fetch sitemap', {
          originalUrl: url,
          finalUrl: result.finalUrl,
          redirectCount: result.redirectCount
        })
      }
      
      // Simple XML parsing for sitemaps
      const urlMatches = text.matchAll(/<url>([\s\S]*?)<\/url>/g)
      
      for (const match of urlMatches) {
        const urlContent = match[1]
        
        // Extract URL
        const locMatch = urlContent.match(/<loc>(.*?)<\/loc>/)
        if (locMatch) {
          const entry: SitemapEntry = {
            url: locMatch[1]
          }
          
          // Extract optional fields
          const lastmodMatch = urlContent.match(/<lastmod>(.*?)<\/lastmod>/)
          if (lastmodMatch) {
            entry.lastmod = lastmodMatch[1]
          }
          
          const priorityMatch = urlContent.match(/<priority>(.*?)<\/priority>/)
          if (priorityMatch) {
            entry.priority = parseFloat(priorityMatch[1])
          }
          
          const changefreqMatch = urlContent.match(/<changefreq>(.*?)<\/changefreq>/)
          if (changefreqMatch) {
            entry.changefreq = changefreqMatch[1]
          }
          
          entries.push(entry)
        }
      }

      // Also check for sitemap index entries (nested sitemaps)
      const sitemapMatches = text.matchAll(/<sitemap>([\s\S]*?)<\/sitemap>/g)
      const nestedSitemaps: string[] = []
      
      for (const match of sitemapMatches) {
        const sitemapContent = match[1]
        const locMatch = sitemapContent.match(/<loc>(.*?)<\/loc>/)
        if (locMatch) {
          nestedSitemaps.push(locMatch[1])
          permanentLogger.info('SITEMAP_PARSER', 'Found nested sitemap', {
            url: locMatch[1]
          })
        }
      }
      
      // Recursively parse nested sitemaps
      for (const nestedUrl of nestedSitemaps) {
        permanentLogger.info('SITEMAP_PARSER', 'Parsing nested sitemap', {
          url: nestedUrl
        })
        const nestedEntries = await this.parseSitemap(nestedUrl)
        entries.push(...nestedEntries)
      }
      
    } catch (error) {
      permanentLogger.debug('SITEMAP_PARSER', 'Failed to parse sitemap XML', {
        url,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    return entries
  }

  /**
   * Deduplicate URLs
   */
  private deduplicateUrls(urls: SitemapEntry[]): SitemapEntry[] {
    const seen = new Set<string>()
    const unique: SitemapEntry[] = []
    
    for (const entry of urls) {
      // Normalize URL
      const normalizedUrl = this.normalizeUrl(entry.url)
      if (!seen.has(normalizedUrl)) {
        seen.add(normalizedUrl)
        unique.push({
          ...entry,
          url: normalizedUrl
        })
      }
    }
    
    return unique
  }

  /**
   * Normalize URL for comparison
   */
  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url)
      // Remove trailing slashes, fragment, and normalize
      parsed.hash = ''
      let normalized = parsed.toString()
      if (normalized.endsWith('/')) {
        normalized = normalized.slice(0, -1)
      }
      return normalized
    } catch {
      return url
    }
  }

  /**
   * Prioritize URLs based on importance
   */
  private prioritizeUrls(urls: SitemapEntry[]): SitemapEntry[] {
    return urls.sort((a, b) => {
      // Prioritize by explicit priority if available
      if (a.priority && b.priority) {
        return b.priority - a.priority
      }
      
      // Prioritize by URL depth (fewer segments = higher priority)
      const aDepth = a.url.split('/').length
      const bDepth = b.url.split('/').length
      
      if (aDepth !== bDepth) {
        return aDepth - bDepth  // Lower depth (fewer segments) comes first
      }
      
      // Prioritize shorter URLs (likely more important)
      return a.url.length - b.url.length
    })
  }
}