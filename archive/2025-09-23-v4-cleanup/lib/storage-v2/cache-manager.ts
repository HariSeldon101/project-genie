/**
 * Cache Manager
 * Manages caching of company intelligence data for performance
 * Uses in-memory cache with optional Redis support
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import type { CompanyInformationPack } from '../types'

export class CacheManager {
  private memoryCache: Map<string, { data: CompanyInformationPack; expiry: number }>
  private ttl: number // Time to live in milliseconds

  constructor(ttl: number = 7 * 24 * 60 * 60 * 1000) { // Default 7 days
    this.memoryCache = new Map()
    this.ttl = ttl

    permanentLogger.info('CACHE_MANAGER', 'Initialized cache manager', {
      ttl: `${ttl / 1000 / 60 / 60} hours`
    })

    // Clean up expired entries periodically
    setInterval(() => this.cleanup(), 60 * 60 * 1000) // Every hour
  }

  /**
   * Get cached pack by domain
   */
  async get(domain: string): Promise<CompanyInformationPack | null> {
    try {
      // Check memory cache first
      const cached = this.memoryCache.get(domain)
      
      if (cached) {
        if (Date.now() < cached.expiry) {
          permanentLogger.info('CACHE_MANAGER', 'Cache hit', { domain })
          return cached.data
        } else {
          // Expired, remove it
          this.memoryCache.delete(domain)
        }
      }

      permanentLogger.info('CACHE_MANAGER', 'Cache miss', { domain })
      return null

    } catch (error) {
      permanentLogger.captureError('CACHE_MANAGER', error as Error, {
        context: 'Cache get error',
        domain
      })
      return null
    }
  }

  /**
   * Set cached pack
   */
  async set(domain: string, pack: CompanyInformationPack): Promise<void> {
    try {
      const expiry = Date.now() + this.ttl

      // Store in memory cache
      this.memoryCache.set(domain, { data: pack, expiry })

      permanentLogger.info('CACHE_MANAGER', 'Cached pack', {
        domain,
        companyName: pack.companyName,
        expiryDate: new Date(expiry).toISOString()
      })

    } catch (error) {
      permanentLogger.captureError('CACHE_MANAGER', error as Error, {
        context: 'Cache set error',
        domain
      })
    }
  }

  /**
   * Invalidate cache for a domain
   */
  async invalidate(domain: string): Promise<void> {
    try {
      this.memoryCache.delete(domain)

      permanentLogger.info('CACHE_MANAGER', 'Cache invalidated', { domain })

    } catch (error) {
      permanentLogger.captureError('CACHE_MANAGER', error as Error, {
        context: 'Cache invalidation error',
        domain
      })
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      const size = this.memoryCache.size
      this.memoryCache.clear()

      permanentLogger.info('CACHE_MANAGER', 'Cache cleared', { entriesRemoved: size })

    } catch (error) {
      permanentLogger.captureError('CACHE_MANAGER', error as Error, {
        context: 'Cache clear error'
      })
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    let removed = 0

    for (const [domain, entry] of this.memoryCache.entries()) {
      if (now >= entry.expiry) {
        this.memoryCache.delete(domain)
        removed++
      }
    }

    if (removed > 0) {
      permanentLogger.info('CACHE_MANAGER', 'Cleanup completed', {
        entriesRemoved: removed,
        remainingEntries: this.memoryCache.size
      })
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; domains: string[] } {
    return {
      size: this.memoryCache.size,
      domains: Array.from(this.memoryCache.keys())
    }
  }
}