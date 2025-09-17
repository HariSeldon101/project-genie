/**
 * URLNormalizationService
 *
 * Service responsible for URL normalization, deduplication, validation, and prioritization.
 * Leverages existing utilities from /lib/utils for consistency.
 *
 * @module company-intelligence/services
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { validateUrls } from '@/lib/utils/url-validator'
import { normalizeUrl as utilNormalizeUrl, generateTitleFromUrl } from '@/lib/utils/html-decoder'
import type { DiscoveredPage } from './page-crawler'
import type { EnhancedSitemapEntry } from './sitemap-discovery'

/**
 * URL with metadata for processing
 */
export interface URLEntry {
  url: string
  priority?: number
  source?: string
  title?: string
  [key: string]: any // Allow additional metadata
}

/**
 * Result of URL normalization
 */
export interface NormalizationResult {
  originalCount: number
  normalizedCount: number
  duplicatesRemoved: number
  invalidRemoved: number
  timeMs: number
}

/**
 * Result of URL validation
 */
export interface ValidationResult {
  validUrls: string[]
  invalidUrls: string[]
  totalChecked: number
  timeMs: number
}

/**
 * Service for URL normalization and processing
 * Centralizes all URL-related operations using existing utilities
 */
export class URLNormalizationService {
  private domain: string
  private baseUrl: string

  constructor(domain: string) {
    // Normalize domain
    this.domain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
    this.baseUrl = `https://${this.domain}`
  }

  /**
   * Normalize a single URL
   * Uses the existing normalizeUrl utility from html-decoder
   */
  normalizeUrl(url: string): string {
    try {
      // Use existing utility
      const normalized = utilNormalizeUrl(url)

      // Additional normalization for consistency
      if (normalized.endsWith('/') && normalized !== this.baseUrl + '/') {
        return normalized.slice(0, -1)
      }

      return normalized
    } catch (error) {
      permanentLogger.debug('URL_NORMALIZATION', 'Failed to normalize URL', {
        url,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return url
    }
  }

  /**
   * Deduplicate an array of URLs
   * Returns unique URLs while preserving metadata
   */
  deduplicateUrls<T extends URLEntry>(entries: T[]): T[] {
    const startTime = Date.now()
    const seen = new Map<string, T>()
    const duplicates: string[] = []

    for (const entry of entries) {
      const normalized = this.normalizeUrl(entry.url)

      if (!seen.has(normalized)) {
        seen.set(normalized, {
          ...entry,
          url: normalized
        })
      } else {
        duplicates.push(entry.url)
        // If the new entry has higher priority, replace
        const existing = seen.get(normalized)!
        if ((entry.priority || 0) > (existing.priority || 0)) {
          seen.set(normalized, {
            ...entry,
            url: normalized
          })
        }
      }
    }

    const result = Array.from(seen.values())

    permanentLogger.info('URL_NORMALIZATION', 'Deduplication complete', {
      originalCount: entries.length,
      uniqueCount: result.length,
      duplicatesRemoved: duplicates.length,
      timeMs: Date.now() - startTime
    })

    return result
  }

  /**
   * Validate URLs to check if they actually exist
   * Uses the existing validateUrls utility
   */
  async validateUrls(urls: string[]): Promise<ValidationResult> {
    const startTime = Date.now()

    permanentLogger.info('URL_NORMALIZATION', 'Starting URL validation', {
      totalUrls: urls.length
    })

    try {
      // Use existing validation utility
      const validUrls = await validateUrls(urls)
      const invalidUrls = urls.filter(url => !validUrls.includes(url))

      const result: ValidationResult = {
        validUrls,
        invalidUrls,
        totalChecked: urls.length,
        timeMs: Date.now() - startTime
      }

      permanentLogger.info('URL_NORMALIZATION', 'Validation complete', {
        valid: validUrls.length,
        invalid: invalidUrls.length,
        totalChecked: urls.length,
        timeMs: result.timeMs
      })

      return result

    } catch (error) {
      permanentLogger.captureError('URL_NORMALIZATION', error as Error, {
        phase: 'validation',
        urlCount: urls.length
      })

      // Return all as invalid on error
      return {
        validUrls: [],
        invalidUrls: urls,
        totalChecked: urls.length,
        timeMs: Date.now() - startTime
      }
    }
  }

  /**
   * Prioritize URLs based on various factors
   * Handles both DiscoveredPage and EnhancedSitemapEntry types
   */
  prioritizeUrls<T extends URLEntry>(entries: T[]): T[] {
    const startTime = Date.now()

    const prioritized = entries.sort((a, b) => {
      // Priority 1: Explicit priority value
      const aPriority = a.priority || 0.5
      const bPriority = b.priority || 0.5
      if (aPriority !== bPriority) {
        return bPriority - aPriority
      }

      // Priority 2: Homepage gets top priority
      if (a.url === this.baseUrl || a.url === this.baseUrl + '/') return -1
      if (b.url === this.baseUrl || b.url === this.baseUrl + '/') return 1

      // Priority 3: Important pages (about, services, contact)
      const importantPatterns = ['/about', '/services', '/products', '/contact']
      const aImportant = importantPatterns.some(p => a.url.includes(p))
      const bImportant = importantPatterns.some(p => b.url.includes(p))
      if (aImportant && !bImportant) return -1
      if (!aImportant && bImportant) return 1

      // Priority 4: URL depth (fewer segments = higher priority)
      const aDepth = a.url.split('/').length
      const bDepth = b.url.split('/').length
      if (aDepth !== bDepth) {
        return aDepth - bDepth
      }

      // Priority 5: URL length (shorter = higher priority)
      return a.url.length - b.url.length
    })

    permanentLogger.info('URL_NORMALIZATION', 'Prioritization complete', {
      count: entries.length,
      timeMs: Date.now() - startTime
    })

    return prioritized
  }

  /**
   * Merge and deduplicate URLs from multiple sources
   * Combines sitemap entries and discovered pages
   */
  mergeUrlSources(
    sitemapEntries: EnhancedSitemapEntry[],
    discoveredPages: DiscoveredPage[]
  ): URLEntry[] {
    const startTime = Date.now()
    const merged = new Map<string, URLEntry>()

    // Add sitemap entries first (usually more reliable)
    for (const entry of sitemapEntries) {
      const normalized = this.normalizeUrl(entry.url)
      merged.set(normalized, {
        url: normalized,
        priority: entry.priority || 0.5,
        source: entry.source,
        title: generateTitleFromUrl(entry.url),
        lastmod: entry.lastmod,
        changefreq: entry.changefreq
      })
    }

    // Add discovered pages (may override if higher priority)
    for (const page of discoveredPages) {
      const normalized = this.normalizeUrl(page.url)

      if (!merged.has(normalized)) {
        merged.set(normalized, {
          url: normalized,
          priority: page.priority,
          source: page.source,
          title: page.title,
          depth: page.depth
        })
      } else {
        // Merge metadata if URL already exists
        const existing = merged.get(normalized)!
        if (page.priority > (existing.priority || 0)) {
          merged.set(normalized, {
            ...existing,
            priority: page.priority,
            title: page.title || existing.title,
            source: page.source
          })
        }
      }
    }

    const result = Array.from(merged.values())

    permanentLogger.info('URL_NORMALIZATION', 'Source merge complete', {
      sitemapEntries: sitemapEntries.length,
      discoveredPages: discoveredPages.length,
      mergedTotal: result.length,
      timeMs: Date.now() - startTime
    })

    return result
  }

  /**
   * Filter URLs by patterns
   * Useful for including/excluding certain URL patterns
   */
  filterUrlsByPatterns(
    urls: string[],
    includePatterns: RegExp[] = [],
    excludePatterns: RegExp[] = []
  ): string[] {
    const startTime = Date.now()

    let filtered = urls

    // Apply include patterns if provided
    if (includePatterns.length > 0) {
      filtered = filtered.filter(url =>
        includePatterns.some(pattern => pattern.test(url))
      )
    }

    // Apply exclude patterns
    if (excludePatterns.length > 0) {
      filtered = filtered.filter(url =>
        !excludePatterns.some(pattern => pattern.test(url))
      )
    }

    permanentLogger.info('URL_NORMALIZATION', 'Pattern filtering complete', {
      originalCount: urls.length,
      filteredCount: filtered.length,
      includePatterns: includePatterns.length,
      excludePatterns: excludePatterns.length,
      timeMs: Date.now() - startTime
    })

    return filtered
  }

  /**
   * Check if URL belongs to the same domain
   */
  isSameDomain(url: string): boolean {
    try {
      const urlObj = new URL(url)
      return urlObj.hostname === this.domain ||
             urlObj.hostname === `www.${this.domain}` ||
             urlObj.hostname === this.domain.replace('www.', '')
    } catch {
      return false
    }
  }

  /**
   * Convert relative URL to absolute
   */
  toAbsoluteUrl(url: string): string {
    if (url.startsWith('http')) {
      return url
    }

    if (url.startsWith('//')) {
      return `https:${url}`
    }

    if (url.startsWith('/')) {
      return `${this.baseUrl}${url}`
    }

    // Relative path without leading slash
    return `${this.baseUrl}/${url}`
  }

  /**
   * Generate URL statistics for reporting
   */
  generateUrlStatistics(urls: string[]): Record<string, any> {
    const stats = {
      total: urls.length,
      unique: new Set(urls.map(u => this.normalizeUrl(u))).size,
      byDepth: {} as Record<number, number>,
      byExtension: {} as Record<string, number>,
      homepage: 0,
      blog: 0,
      resources: 0,
      other: 0
    }

    for (const url of urls) {
      // Count by depth
      const depth = url.split('/').length - 3 // Subtract protocol and domain
      stats.byDepth[depth] = (stats.byDepth[depth] || 0) + 1

      // Count by extension
      const match = url.match(/\.([a-z0-9]+)$/i)
      if (match) {
        const ext = match[1].toLowerCase()
        stats.byExtension[ext] = (stats.byExtension[ext] || 0) + 1
      }

      // Count by type
      if (url === this.baseUrl || url === this.baseUrl + '/') {
        stats.homepage++
      } else if (url.includes('/blog') || url.includes('/news') || url.includes('/articles')) {
        stats.blog++
      } else if (url.includes('/resources') || url.includes('/downloads') || url.includes('/docs')) {
        stats.resources++
      } else {
        stats.other++
      }
    }

    return stats
  }

  /**
   * Batch process URLs with normalization, deduplication, and validation
   */
  async batchProcessUrls(
    urls: string[],
    options: {
      validate?: boolean
      deduplicate?: boolean
      prioritize?: boolean
      limit?: number
    } = {}
  ): Promise<{
    urls: string[]
    stats: NormalizationResult
    validation?: ValidationResult
  }> {
    const startTime = Date.now()
    const originalCount = urls.length
    let processed = urls

    // Normalize all URLs
    processed = processed.map(url => this.normalizeUrl(url))

    // Deduplicate if requested
    if (options.deduplicate !== false) {
      const beforeDedupe = processed.length
      processed = Array.from(new Set(processed))
      permanentLogger.info('URL_NORMALIZATION', 'Deduplication', {
        before: beforeDedupe,
        after: processed.length,
        removed: beforeDedupe - processed.length
      })
    }

    // Validate if requested
    let validationResult: ValidationResult | undefined
    if (options.validate) {
      validationResult = await this.validateUrls(processed)
      processed = validationResult.validUrls
    }

    // Prioritize if requested
    if (options.prioritize) {
      const entries = processed.map(url => ({ url, priority: 0.5 }))
      processed = this.prioritizeUrls(entries).map(e => e.url)
    }

    // Apply limit if specified
    if (options.limit && processed.length > options.limit) {
      processed = processed.slice(0, options.limit)
    }

    const stats: NormalizationResult = {
      originalCount,
      normalizedCount: processed.length,
      duplicatesRemoved: originalCount - processed.length,
      invalidRemoved: validationResult ? validationResult.invalidUrls.length : 0,
      timeMs: Date.now() - startTime
    }

    permanentLogger.info('URL_NORMALIZATION', 'Batch processing complete', stats)

    return {
      urls: processed,
      stats,
      validation: validationResult
    }
  }
}