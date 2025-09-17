/**
 * SitemapDiscoveryService
 *
 * Service responsible for discovering and parsing sitemaps.
 * Uses the existing SitemapParser utility and adds proper error handling,
 * breadcrumbs, and timing measurements.
 *
 * @module company-intelligence/services
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { SitemapParser, type SitemapEntry } from '../scrapers/utils/sitemap-parser'
import { httpGet } from '@/lib/utils/http-fetcher'

/**
 * Configuration options for sitemap discovery
 */
export interface SitemapDiscoveryOptions {
  maxUrls?: number
  timeout?: number
  customLocations?: string[]
  includeNestedSitemaps?: boolean
}

/**
 * Enhanced sitemap entry with additional metadata
 */
export interface EnhancedSitemapEntry extends SitemapEntry {
  source: 'sitemap' | 'robots' | 'nested' | 'custom'
  discoveredAt: number
}

/**
 * Result of sitemap discovery operation
 */
export interface SitemapDiscoveryResult {
  entries: EnhancedSitemapEntry[]
  sitemapFound: boolean
  sitemapsChecked: string[]
  nestedSitemapsFound: number
  totalTimeMs: number
  errors: string[]
}

/**
 * Service for discovering and parsing sitemaps
 * Wraps the existing SitemapParser utility with enhanced functionality
 */
export class SitemapDiscoveryService {
  private parser: SitemapParser
  private domain: string
  private options: Required<SitemapDiscoveryOptions>

  constructor(domain: string, options: SitemapDiscoveryOptions = {}) {
    // Normalize domain (remove protocol and trailing slash)
    this.domain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '')

    // Set default options
    this.options = {
      maxUrls: options.maxUrls ?? 500,
      timeout: options.timeout ?? 10000,
      customLocations: options.customLocations ?? [],
      includeNestedSitemaps: options.includeNestedSitemaps ?? true
    }

    // Initialize the underlying parser
    this.parser = new SitemapParser(this.domain, this.options.maxUrls)
  }

  /**
   * Discover all sitemaps for the domain
   * Returns a list of sitemap URLs found through various methods
   */
  async discoverSitemaps(): Promise<string[]> {
    const startTime = Date.now()
    const sitemapUrls: string[] = []

    permanentLogger.info('SITEMAP_DISCOVERY', 'Starting sitemap discovery', {
      domain: this.domain,
      maxUrls: this.options.maxUrls,
      timestamp: new Date().toISOString(),
      method: 'discoverSitemaps'
    })

    try {
      // Generate domain variants to handle www/non-www cases
      const domainVariants = this.getDomainVariants()

      // Add standard sitemap locations for each domain variant
      const standardLocations: string[] = []
      for (const domain of domainVariants) {
        standardLocations.push(
          `https://${domain}/sitemap.xml`,
          `https://${domain}/sitemap_index.xml`,
          `https://${domain}/sitemap-index.xml`,
          `https://${domain}/wp-sitemap.xml`,
          `https://${domain}/post-sitemap.xml`,
          `https://${domain}/page-sitemap.xml`,
          `https://${domain}/sitemap`
        )
      }

      // Add custom locations if provided
      const allLocations = [
        ...standardLocations,
        ...this.options.customLocations.map(loc =>
          loc.startsWith('http') ? loc : `https://${this.domain}${loc}`
        )
      ]

      // Check robots.txt for sitemap references
      permanentLogger.info('SITEMAP_DISCOVERY', 'Checking robots.txt for sitemaps', {
        domain: this.domain
      })
      const robotsSitemaps = await this.checkRobotsForSitemaps()
      allLocations.push(...robotsSitemaps)

      permanentLogger.info('SITEMAP_DISCOVERY', 'Robots.txt check complete', {
        sitemapsFound: robotsSitemaps.length,
        urls: robotsSitemaps
      })

      // Deduplicate URLs
      const uniqueLocations = Array.from(new Set(allLocations))

      permanentLogger.info('SITEMAP_DISCOVERY', 'Sitemap locations identified', {
        count: uniqueLocations.length,
        fromRobots: robotsSitemaps.length,
        fromStandard: standardLocations.length,
        fromCustom: this.options.customLocations.length,
        timeMs: Date.now() - startTime,
        locations: uniqueLocations.slice(0, 5) // Log first 5 for debugging
      })

      return uniqueLocations

    } catch (error) {
      permanentLogger.captureError('SITEMAP_DISCOVERY', error as Error, {
        domain: this.domain,
        phase: 'discovery'
      })
      throw error
    }
  }

  /**
   * Parse a sitemap and return enhanced entries
   */
  async parseSitemap(url: string, source: EnhancedSitemapEntry['source'] = 'sitemap'): Promise<EnhancedSitemapEntry[]> {
    const startTime = Date.now()

    permanentLogger.info('SITEMAP_DISCOVERY', 'Parsing sitemap', {
      url,
      source,
      timestamp: new Date().toISOString(),
      method: 'parseSitemap'
    })

    try {
      // Use httpGet to handle redirects automatically
      permanentLogger.info('SITEMAP_DISCOVERY', 'Fetching sitemap content', {
        url,
        timeout: this.options.timeout
      })

      const fetchStart = Date.now()
      const result = await httpGet(url, {
        timeout: this.options.timeout,
        maxRedirects: 5
      })

      permanentLogger.info('SITEMAP_DISCOVERY', 'Sitemap fetch complete', {
        url,
        status: result.status,
        ok: result.ok,
        hasText: !!result.text,
        textLength: result.text?.length || 0,
        fetchTimeMs: Date.now() - fetchStart,
        redirectCount: result.redirectCount || 0,
        finalUrl: result.finalUrl
      })

      if (!result.ok || !result.text) {
        permanentLogger.warn('SITEMAP_DISCOVERY', 'Failed to fetch sitemap', {
          url,
          status: result.status,
          finalUrl: result.finalUrl,
          redirectCount: result.redirectCount
        })
        return []
      }

      // Log if we followed redirects
      if (result.redirectCount > 0) {
        permanentLogger.info('SITEMAP_DISCOVERY', 'Followed redirects to fetch sitemap', {
          originalUrl: url,
          finalUrl: result.finalUrl,
          redirectCount: result.redirectCount
        })
      }

      const text = result.text
      const entries: EnhancedSitemapEntry[] = []

      // Parse URL entries
      const urlMatches = text.matchAll(/<url>([\s\S]*?)<\/url>/g)
      for (const match of urlMatches) {
        const urlContent = match[1]
        const locMatch = urlContent.match(/<loc>(.*?)<\/loc>/)

        if (locMatch) {
          const entry: EnhancedSitemapEntry = {
            url: locMatch[1].trim(),
            source,
            discoveredAt: Date.now()
          }

          // Extract optional fields
          const lastmodMatch = urlContent.match(/<lastmod>(.*?)<\/lastmod>/)
          if (lastmodMatch) entry.lastmod = lastmodMatch[1]

          const priorityMatch = urlContent.match(/<priority>(.*?)<\/priority>/)
          if (priorityMatch) entry.priority = parseFloat(priorityMatch[1])

          const changefreqMatch = urlContent.match(/<changefreq>(.*?)<\/changefreq>/)
          if (changefreqMatch) entry.changefreq = changefreqMatch[1]

          entries.push(entry)
        }
      }

      permanentLogger.info('SITEMAP_DISCOVERY', 'Sitemap parsed successfully', {
        url,
        entriesFound: entries.length,
        timeMs: Date.now() - startTime,
        sampleUrls: entries.slice(0, 3).map(e => e.url) // Log first 3 URLs for debugging
      })

      return entries

    } catch (error) {
      permanentLogger.captureError('SITEMAP_DISCOVERY', error as Error, {
        url,
        phase: 'parsing',
        source,
        timeElapsed: Date.now() - startTime,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
      return []
    }
  }

  /**
   * Parse nested sitemaps (sitemap index files)
   */
  async parseNestedSitemaps(indexUrl: string): Promise<EnhancedSitemapEntry[]> {
    const startTime = Date.now()
    const allEntries: EnhancedSitemapEntry[] = []

    permanentLogger.info('SITEMAP_DISCOVERY', 'Parsing sitemap index', {
      url: indexUrl
    })

    try {
      const response = await fetch(indexUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CompanyIntelligenceBot/1.0)'
        },
        signal: AbortSignal.timeout(this.options.timeout)
      })

      if (!response.ok) {
        return allEntries
      }

      const text = await response.text()

      // Find nested sitemap references
      const sitemapMatches = text.matchAll(/<sitemap>([\s\S]*?)<\/sitemap>/g)
      const nestedUrls: string[] = []

      for (const match of sitemapMatches) {
        const sitemapContent = match[1]
        const locMatch = sitemapContent.match(/<loc>(.*?)<\/loc>/)
        if (locMatch) {
          nestedUrls.push(locMatch[1].trim())
        }
      }

      permanentLogger.info('SITEMAP_DISCOVERY', 'Found nested sitemaps', {
        count: nestedUrls.length,
        urls: nestedUrls
      })

      // Parse each nested sitemap
      for (const nestedUrl of nestedUrls) {
        const entries = await this.parseSitemap(nestedUrl, 'nested')
        allEntries.push(...entries)
      }

      permanentLogger.info('SITEMAP_DISCOVERY', 'Nested sitemap parsing complete', {
        totalEntries: allEntries.length,
        nestedSitemaps: nestedUrls.length,
        timeMs: Date.now() - startTime
      })

      return allEntries

    } catch (error) {
      permanentLogger.captureError('SITEMAP_DISCOVERY', error as Error, {
        url: indexUrl,
        phase: 'nested-parsing'
      })
      return allEntries
    }
  }

  /**
   * Execute complete sitemap discovery
   * This is the main entry point that orchestrates all discovery methods
   */
  async execute(): Promise<SitemapDiscoveryResult> {
    const startTime = Date.now()
    const result: SitemapDiscoveryResult = {
      entries: [],
      sitemapFound: false,
      sitemapsChecked: [],
      nestedSitemapsFound: 0,
      totalTimeMs: 0,
      errors: []
    }

    try {
      // Breadcrumb for debugging
      permanentLogger.info('SITEMAP_DISCOVERY', 'Starting complete discovery execution', {
        domain: this.domain,
        options: this.options,
        timestamp: new Date().toISOString(),
        method: 'execute'
      })

      // Discover sitemap URLs
      permanentLogger.info('SITEMAP_DISCOVERY', 'Discovering sitemap URLs', {
        phase: 'url-discovery'
      })

      const discoveryStart = Date.now()
      const sitemapUrls = await this.discoverSitemaps()
      result.sitemapsChecked = sitemapUrls

      permanentLogger.info('SITEMAP_DISCOVERY', 'Sitemap URL discovery complete', {
        urlsFound: sitemapUrls.length,
        discoveryTimeMs: Date.now() - discoveryStart,
        urls: sitemapUrls
      })

      // Try each sitemap URL
      permanentLogger.info('SITEMAP_DISCOVERY', 'Trying sitemap URLs', {
        totalUrls: sitemapUrls.length
      })

      for (const sitemapUrl of sitemapUrls) {
        permanentLogger.info('SITEMAP_DISCOVERY', 'Trying sitemap URL', {
          url: sitemapUrl,
          isIndex: sitemapUrl.includes('index')
        })

        try {
          // Check if it's a sitemap index
          if (sitemapUrl.includes('index') && this.options.includeNestedSitemaps) {
            const nestedEntries = await this.parseNestedSitemaps(sitemapUrl)
            if (nestedEntries.length > 0) {
              result.entries.push(...nestedEntries)
              result.nestedSitemapsFound++
              result.sitemapFound = true
            }
          } else {
            // Parse regular sitemap
            const entries = await this.parseSitemap(sitemapUrl)
            if (entries.length > 0) {
              result.entries.push(...entries)
              result.sitemapFound = true
            }
          }

          // Stop if we found a working sitemap
          if (result.sitemapFound) {
            permanentLogger.info('SITEMAP_DISCOVERY', 'Found working sitemap, stopping search', {
              url: sitemapUrl,
              entriesFound: result.entries.length
            })
            break
          }
        } catch (error) {
          const errorMsg = `Failed to parse ${sitemapUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`
          result.errors.push(errorMsg)

          permanentLogger.warn('SITEMAP_DISCOVERY', 'Failed to parse sitemap URL', {
            url: sitemapUrl,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      // Deduplicate entries
      result.entries = this.deduplicateEntries(result.entries)

      // Apply max URL limit
      if (result.entries.length > this.options.maxUrls) {
        result.entries = this.prioritizeEntries(result.entries).slice(0, this.options.maxUrls)
      }

      result.totalTimeMs = Date.now() - startTime

      permanentLogger.info('SITEMAP_DISCOVERY', 'Discovery execution complete', {
        entriesFound: result.entries.length,
        sitemapFound: result.sitemapFound,
        nestedSitemapsFound: result.nestedSitemapsFound,
        totalTimeMs: result.totalTimeMs,
        errors: result.errors.length,
        errorDetails: result.errors.slice(0, 3), // Log first 3 errors
        sampleEntries: result.entries.slice(0, 5).map(e => e.url) // Log first 5 URLs found
      })

      return result

    } catch (error) {
      permanentLogger.captureError('SITEMAP_DISCOVERY', error as Error, {
        domain: this.domain,
        phase: 'execution',
        timeElapsed: Date.now() - startTime,
        partialResults: {
          entriesFound: result.entries.length,
          sitemapsChecked: result.sitemapsChecked.length,
          errors: result.errors.length
        }
      })
      throw error
    }
  }

  /**
   * Generate domain variants to handle www/non-www cases
   * For example: bigfluffy.ai -> [bigfluffy.ai, www.bigfluffy.ai]
   */
  private getDomainVariants(): string[] {
    const variants = [this.domain]

    // Add www variant if not present
    if (!this.domain.startsWith('www.')) {
      variants.push(`www.${this.domain}`)
    }

    // Add non-www variant if www is present
    if (this.domain.startsWith('www.')) {
      variants.push(this.domain.substring(4))
    }

    return variants
  }

  /**
   * Check robots.txt for sitemap references
   */
  private async checkRobotsForSitemaps(): Promise<string[]> {
    const sitemaps: string[] = []
    const startTime = Date.now()

    try {
      const robotsUrl = `https://${this.domain}/robots.txt`

      permanentLogger.info('SITEMAP_DISCOVERY', 'Fetching robots.txt', {
        url: robotsUrl
      })

      const response = await fetch(robotsUrl, {
        signal: AbortSignal.timeout(5000)
      })

      permanentLogger.info('SITEMAP_DISCOVERY', 'Robots.txt fetch result', {
        url: robotsUrl,
        status: response.status,
        ok: response.ok,
        fetchTimeMs: Date.now() - startTime
      })

      if (response.ok) {
        const text = await response.text()
        const lines = text.split('\n')

        for (const line of lines) {
          if (line.toLowerCase().startsWith('sitemap:')) {
            const sitemapUrl = line.substring(8).trim()
            if (sitemapUrl) {
              sitemaps.push(sitemapUrl)
            }
          }
        }

        if (sitemaps.length > 0) {
          permanentLogger.info('SITEMAP_DISCOVERY', 'Found sitemaps in robots.txt', {
            count: sitemaps.length,
            urls: sitemaps
          })
        }
      }
    } catch (error) {
      // Log but don't fail - robots.txt is optional
      permanentLogger.info('SITEMAP_DISCOVERY', 'Could not fetch robots.txt (optional)', {
        domain: this.domain,
        error: error instanceof Error ? error.message : 'Unknown error',
        timeMs: Date.now() - startTime
      })
    }

    return sitemaps
  }

  /**
   * Deduplicate entries based on URL
   */
  private deduplicateEntries(entries: EnhancedSitemapEntry[]): EnhancedSitemapEntry[] {
    const seen = new Set<string>()
    const unique: EnhancedSitemapEntry[] = []

    for (const entry of entries) {
      const normalized = this.normalizeUrl(entry.url)
      if (!seen.has(normalized)) {
        seen.add(normalized)
        unique.push({
          ...entry,
          url: normalized
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
      parsed.hash = ''
      let normalized = parsed.toString()
      if (normalized.endsWith('/') && normalized !== `https://${this.domain}/`) {
        normalized = normalized.slice(0, -1)
      }
      return normalized
    } catch {
      return url
    }
  }

  /**
   * Prioritize entries based on importance
   */
  private prioritizeEntries(entries: EnhancedSitemapEntry[]): EnhancedSitemapEntry[] {
    return entries.sort((a, b) => {
      // Priority 1: Explicit priority value
      if (a.priority && b.priority) {
        return b.priority - a.priority
      }

      // Priority 2: Source (sitemap > robots > nested > custom)
      const sourceOrder = { sitemap: 0, robots: 1, nested: 2, custom: 3 }
      const aOrder = sourceOrder[a.source]
      const bOrder = sourceOrder[b.source]
      if (aOrder !== bOrder) {
        return aOrder - bOrder
      }

      // Priority 3: URL depth (fewer segments = higher priority)
      const aDepth = a.url.split('/').length
      const bDepth = b.url.split('/').length
      if (aDepth !== bDepth) {
        return aDepth - bDepth
      }

      // Priority 4: URL length (shorter = higher priority)
      return a.url.length - b.url.length
    })
  }
}