/**
 * Content Deduplication Utility
 * Tracks and prevents re-scraping of duplicate content
 */

import crypto from 'crypto'
import { permanentLogger } from '@/lib/utils/permanent-logger'

export interface ContentEntry {
  url: string
  hash: string
  scrapedAt: Date
  title?: string
  contentLength?: number
}

export class ContentDeduplicator {
  private contentCache: Map<string, ContentEntry> = new Map()
  private urlCache: Set<string> = new Set()
  private contentHashes: Set<string> = new Set()
  private readonly maxCacheSize: number = 1000
  private readonly cacheExpiryMs: number = 24 * 60 * 60 * 1000 // 24 hours

  constructor(options?: { maxCacheSize?: number; cacheExpiryMs?: number }) {
    this.maxCacheSize = options?.maxCacheSize ?? 1000
    this.cacheExpiryMs = options?.cacheExpiryMs ?? 24 * 60 * 60 * 1000
  }

  /**
   * Generate hash for content to detect duplicates
   */
  private generateContentHash(content: string): string {
    // Normalize content before hashing
    const normalized = content
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .trim()
    
    return crypto
      .createHash('sha256')
      .update(normalized)
      .digest('hex')
  }

  /**
   * Check if URL has been scraped recently
   */
  hasScrapedUrl(url: string): boolean {
    const normalizedUrl = this.normalizeUrl(url)
    
    if (!this.urlCache.has(normalizedUrl)) {
      return false
    }

    // Check if cached entry is expired
    const entry = this.contentCache.get(normalizedUrl)
    if (entry) {
      const age = Date.now() - entry.scrapedAt.getTime()
      if (age > this.cacheExpiryMs) {
        // Expired, remove from cache
        this.removeEntry(normalizedUrl)
        return false
      }
    }

    return true
  }

  /**
   * Check if content is duplicate based on hash
   */
  isDuplicateContent(content: string): boolean {
    const hash = this.generateContentHash(content)
    return this.contentHashes.has(hash)
  }

  /**
   * Add scraped content to deduplication cache
   */
  addContent(url: string, content: string, title?: string): void {
    const normalizedUrl = this.normalizeUrl(url)
    const hash = this.generateContentHash(content)
    
    // Check cache size limit
    if (this.contentCache.size >= this.maxCacheSize) {
      this.evictOldestEntries()
    }

    const entry: ContentEntry = {
      url: normalizedUrl,
      hash,
      scrapedAt: new Date(),
      title,
      contentLength: content.length
    }

    this.contentCache.set(normalizedUrl, entry)
    this.urlCache.add(normalizedUrl)
    this.contentHashes.add(hash)

    permanentLogger.debug('CONTENT_DEDUP', 'Added content to cache', {
      url: normalizedUrl,
      hash: hash.substring(0, 8),
      contentLength: content.length
    })
  }

  /**
   * Get content entry for URL
   */
  getEntry(url: string): ContentEntry | undefined {
    const normalizedUrl = this.normalizeUrl(url)
    return this.contentCache.get(normalizedUrl)
  }

  /**
   * Check if content should be scraped
   */
  shouldScrape(url: string, content?: string): boolean {
    // Check URL first
    if (this.hasScrapedUrl(url)) {
      permanentLogger.debug('CONTENT_DEDUP', 'URL already scraped', { url })
      return false
    }

    // Check content hash if provided
    if (content && this.isDuplicateContent(content)) {
      permanentLogger.debug('CONTENT_DEDUP', 'Duplicate content detected', { url })
      return false
    }

    return true
  }

  /**
   * Normalize URL for comparison
   * Made public to avoid duplication across codebase (DRY principle)
   */
  public normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url)
      // Remove fragment, trailing slashes, and normalize
      parsed.hash = ''
      let normalized = parsed.toString()
      if (normalized.endsWith('/')) {
        normalized = normalized.slice(0, -1)
      }
      // Remove common tracking parameters
      const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'fbclid']
      trackingParams.forEach(param => {
        parsed.searchParams.delete(param)
      })
      return parsed.toString()
    } catch {
      return url
    }
  }

  /**
   * Remove entry from all caches
   */
  private removeEntry(url: string): void {
    const entry = this.contentCache.get(url)
    if (entry) {
      this.contentCache.delete(url)
      this.urlCache.delete(url)
      this.contentHashes.delete(entry.hash)
    }
  }

  /**
   * Evict oldest entries when cache is full
   */
  private evictOldestEntries(): void {
    const entriesToRemove = Math.floor(this.maxCacheSize * 0.2) // Remove 20% oldest
    const sortedEntries = Array.from(this.contentCache.entries())
      .sort((a, b) => a[1].scrapedAt.getTime() - b[1].scrapedAt.getTime())
    
    for (let i = 0; i < entriesToRemove && i < sortedEntries.length; i++) {
      const [url] = sortedEntries[i]
      this.removeEntry(url)
    }

    permanentLogger.debug('CONTENT_DEDUP', 'Evicted old entries', {
      removed: entriesToRemove,
      remaining: this.contentCache.size
    })
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    urlsCached: number
    uniqueHashes: number
    oldestEntry?: Date
    newestEntry?: Date
  } {
    const entries = Array.from(this.contentCache.values())
    const sorted = entries.sort((a, b) => a.scrapedAt.getTime() - b.scrapedAt.getTime())
    
    return {
      urlsCached: this.urlCache.size,
      uniqueHashes: this.contentHashes.size,
      oldestEntry: sorted[0]?.scrapedAt,
      newestEntry: sorted[sorted.length - 1]?.scrapedAt
    }
  }

  /**
   * Clear all caches
   */
  clear(): void {
    this.contentCache.clear()
    this.urlCache.clear()
    this.contentHashes.clear()
    permanentLogger.info('CONTENT_DEDUP', 'Cleared all caches')
  }

  /**
   * Export cache for persistence
   */
  export(): ContentEntry[] {
    return Array.from(this.contentCache.values())
  }

  /**
   * Import cache from persistence
   */
  import(entries: ContentEntry[]): void {
    this.clear()
    entries.forEach(entry => {
      if (typeof entry.scrapedAt === 'string') {
        entry.scrapedAt = new Date(entry.scrapedAt)
      }
      this.contentCache.set(entry.url, entry)
      this.urlCache.add(entry.url)
      this.contentHashes.add(entry.hash)
    })
    permanentLogger.info('CONTENT_DEDUP', 'Imported cache entries', {
      count: entries.length
    })
  }
}

// Singleton instance for global deduplication
let globalDeduplicator: ContentDeduplicator | null = null

export function getDeduplicator(): ContentDeduplicator {
  if (!globalDeduplicator) {
    globalDeduplicator = new ContentDeduplicator()
  }
  return globalDeduplicator
}