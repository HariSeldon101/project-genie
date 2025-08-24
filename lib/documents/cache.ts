/**
 * Document Cache System
 * Caches generated documents to avoid repeated API calls
 */

import { GeneratedDocument, SanitizedProjectData } from '../llm/types'
import crypto from 'crypto'

interface CacheEntry {
  key: string
  documents: GeneratedDocument[]
  timestamp: Date
  expiresAt: Date
  metadata: {
    projectId: string
    methodology: string
    provider: string
    hits: number
  }
}

export class DocumentCache {
  private cache: Map<string, CacheEntry> = new Map()
  private maxSize: number
  private ttlMs: number
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(options: {
    maxSize?: number
    ttlMinutes?: number
    enableCleanup?: boolean
  } = {}) {
    this.maxSize = options.maxSize || 100
    this.ttlMs = (options.ttlMinutes || 60) * 60 * 1000

    // Start cleanup interval if enabled
    if (options.enableCleanup !== false) {
      this.cleanupInterval = setInterval(() => {
        this.cleanup()
      }, 5 * 60 * 1000) // Cleanup every 5 minutes
    }
  }

  /**
   * Generate cache key from project data
   */
  private generateKey(projectData: SanitizedProjectData, projectId: string): string {
    // Create a deterministic hash from relevant project data
    const keyData = {
      projectId,
      methodology: projectData.methodology,
      vision: projectData.vision,
      businessCase: projectData.businessCase,
      sector: projectData.sector,
      // Include stakeholder count but not details
      stakeholderCount: projectData.stakeholders?.length || 0
    }

    const hash = crypto.createHash('sha256')
    hash.update(JSON.stringify(keyData))
    return hash.digest('hex')
  }

  /**
   * Get cached documents if available
   */
  get(
    projectData: SanitizedProjectData, 
    projectId: string
  ): GeneratedDocument[] | null {
    const key = this.generateKey(projectData, projectId)
    const entry = this.cache.get(key)

    if (!entry) {
      console.log('📭 Cache miss for project', projectId)
      return null
    }

    // Check if expired
    if (new Date() > entry.expiresAt) {
      console.log('⏰ Cache expired for project', projectId)
      this.cache.delete(key)
      return null
    }

    // Update hit count
    entry.metadata.hits++
    
    console.log(`📬 Cache hit for project ${projectId} (${entry.metadata.hits} hits)`)
    return entry.documents
  }

  /**
   * Store documents in cache
   */
  set(
    projectData: SanitizedProjectData,
    projectId: string,
    documents: GeneratedDocument[],
    provider: string
  ): void {
    const key = this.generateKey(projectData, projectId)

    // Check cache size limit
    if (this.cache.size >= this.maxSize) {
      this.evictOldest()
    }

    const entry: CacheEntry = {
      key,
      documents,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + this.ttlMs),
      metadata: {
        projectId,
        methodology: projectData.methodology,
        provider,
        hits: 0
      }
    }

    this.cache.set(key, entry)
    console.log(`💾 Cached ${documents.length} documents for project ${projectId}`)
  }

  /**
   * Invalidate cache for a specific project
   */
  invalidate(projectId: string): void {
    let deleted = 0
    for (const [key, entry] of this.cache.entries()) {
      if (entry.metadata.projectId === projectId) {
        this.cache.delete(key)
        deleted++
      }
    }
    if (deleted > 0) {
      console.log(`🗑️ Invalidated ${deleted} cache entries for project ${projectId}`)
    }
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    const size = this.cache.size
    this.cache.clear()
    console.log(`🗑️ Cleared ${size} cache entries`)
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = new Date()
    let cleaned = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired cache entries`)
    }
  }

  /**
   * Evict oldest entry when cache is full
   */
  private evictOldest(): void {
    let oldest: CacheEntry | null = null
    let oldestKey: string | null = null

    for (const [key, entry] of this.cache.entries()) {
      if (!oldest || entry.timestamp < oldest.timestamp) {
        oldest = entry
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
      console.log(`📤 Evicted oldest cache entry (project ${oldest!.metadata.projectId})`)
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number
    maxSize: number
    totalHits: number
    avgHitsPerEntry: number
    oldestEntry: Date | null
    newestEntry: Date | null
  } {
    let totalHits = 0
    let oldestDate: Date | null = null
    let newestDate: Date | null = null

    for (const entry of this.cache.values()) {
      totalHits += entry.metadata.hits
      
      if (!oldestDate || entry.timestamp < oldestDate) {
        oldestDate = entry.timestamp
      }
      
      if (!newestDate || entry.timestamp > newestDate) {
        newestDate = entry.timestamp
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      totalHits,
      avgHitsPerEntry: this.cache.size > 0 ? totalHits / this.cache.size : 0,
      oldestEntry: oldestDate,
      newestEntry: newestDate
    }
  }

  /**
   * Get cache entries for debugging
   */
  getEntries(): Array<{
    projectId: string
    methodology: string
    provider: string
    documentCount: number
    timestamp: Date
    expiresAt: Date
    hits: number
  }> {
    return Array.from(this.cache.values()).map(entry => ({
      projectId: entry.metadata.projectId,
      methodology: entry.metadata.methodology,
      provider: entry.metadata.provider,
      documentCount: entry.documents.length,
      timestamp: entry.timestamp,
      expiresAt: entry.expiresAt,
      hits: entry.metadata.hits
    }))
  }

  /**
   * Stop cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }
}