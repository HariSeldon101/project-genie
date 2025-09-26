/**
 * MermaidService - Centralized service for all Mermaid diagram operations
 * Implements singleton pattern for consistent initialization and caching
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import type {
  MermaidConfig,
  MermaidRenderResult,
  MermaidValidationResult
} from '@/lib/utils/mermaid-types'

// Import MermaidTheme as a value, not just a type
import { MermaidTheme } from '@/lib/utils/mermaid-types'

import {
  initializeMermaid,
  validateMermaidSyntax,
  renderMermaidSafely,
  getMermaidErrorFallback
} from '@/lib/utils/mermaid-helpers'

export interface CacheEntry {
  svg: string
  timestamp: number
  hitCount: number
}

export class MermaidService {
  private static instance: MermaidService | null = null
  private initialized: boolean = false
  private config: MermaidConfig | null = null
  private cache: Map<string, CacheEntry> = new Map()
  private mermaidModule: any = null
  private initPromise: Promise<void> | null = null

  // Cache configuration
  private readonly MAX_CACHE_SIZE = 100
  private readonly CACHE_TTL = 15 * 60 * 1000 // 15 minutes
  private readonly RENDER_TIMEOUT = 5000 // 5 seconds

  private constructor() {
    // Private constructor enforces singleton pattern
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): MermaidService {
    if (!MermaidService.instance) {
      MermaidService.instance = new MermaidService()
    }
    return MermaidService.instance
  }

  /**
   * Initialize Mermaid with configuration
   * Safe to call multiple times - will only initialize once
   */
  public async initialize(config?: MermaidConfig): Promise<void> {
    // If already initializing, wait for it
    if (this.initPromise) {
      return this.initPromise
    }

    // If already initialized with same config, skip
    if (this.initialized && JSON.stringify(this.config) === JSON.stringify(config)) {
      return
    }

    // Start initialization
    this.initPromise = this.performInitialization(config)

    try {
      await this.initPromise
    } finally {
      this.initPromise = null
    }
  }

  private async performInitialization(config?: MermaidConfig): Promise<void> {
    const timer = permanentLogger.timing('mermaid_initialization')

    try {
      permanentLogger.breadcrumb('mermaid_init_start', 'Starting Mermaid service initialization', {
        hasConfig: !!config
      })

      // Check if we're in browser environment
      if (typeof window === 'undefined') {
        permanentLogger.warn('MERMAID_SERVICE', 'Cannot initialize in server environment', {
          environment: 'server'
        })
        timer.cancel()
        return
      }

      // Default configuration
      const defaultConfig: MermaidConfig = {
        theme: MermaidTheme.DEFAULT,
        startOnLoad: false,
        securityLevel: 'loose',
        logLevel: 'fatal', // Set to 'fatal' to suppress all non-critical logs
        flowchart: {
          htmlLabels: true,
          curve: 'basis',
          padding: 15,
          ...config?.flowchart
        },
        gantt: {
          numberSectionStyles: 4,
          fontSize: 11,
          gridLineStartPadding: 350,
          ...config?.gantt
        },
        themeVariables: {
          primaryColor: '#6366f1',
          primaryTextColor: '#fff',
          primaryBorderColor: '#4f46e5',
          lineColor: '#e5e7eb',
          secondaryColor: '#f3f4f6',
          tertiaryColor: '#fef3c7',
          darkMode: false,
          ...config?.themeVariables
        }
      }

      // Merge with provided config
      this.config = { ...defaultConfig, ...config }

      // Initialize Mermaid
      await initializeMermaid(this.config)

      // Load Mermaid module
      this.mermaidModule = (await import('mermaid')).default

      this.initialized = true

      const duration = timer.stop()
      permanentLogger.info('MERMAID_SERVICE', 'Initialized successfully', {
        duration,
        theme: this.config?.theme
      })
      permanentLogger.breadcrumb('mermaid_init_complete', 'Mermaid service initialization complete', {
        duration
      })
    } catch (error) {
      timer.stop()
      permanentLogger.captureError('MERMAID_SERVICE', error as Error, {
        stage: 'initialization',
        hasConfig: !!config,
        theme: config?.theme
      })
      throw error
    }
  }

  /**
   * Render a Mermaid diagram with caching
   */
  public async render(
    definition: string,
    type: string,
    options?: {
      cache?: boolean
      containerId?: string
    }
  ): Promise<MermaidRenderResult> {
    const timer = permanentLogger.timing('mermaid_render', { type, cacheEnabled: options?.cache })

    permanentLogger.breadcrumb('render_start', 'Starting Mermaid diagram render', {
      diagramType: type,
      cacheEnabled: options?.cache !== false
    })

    try {
      // Ensure initialized
      if (!this.initialized) {
        await this.initialize()
      }

      // Check cache if enabled
      const cacheKey = this.getCacheKey(definition, type)
      if (options?.cache !== false) {
        const cached = this.getFromCache(cacheKey)
        if (cached) {
          permanentLogger.breadcrumb('cache_hit', 'Mermaid diagram served from cache', {
            diagramType: type,
            cacheKey
          })
          permanentLogger.info('MERMAID_CACHE', 'Cache hit for diagram', {
            type,
            hitCount: cached.hitCount
          })
          timer.stop()
          return {
            success: true,
            svg: cached.svg,
            error: undefined,
            fallback: undefined
          }
        }
      }

      // Render the diagram
      const result = await this.renderWithTimeout(definition, options?.containerId)

      // Cache successful renders
      if (result.success && result.svg && options?.cache !== false) {
        this.addToCache(cacheKey, result.svg)
      }

      const duration = timer.stop()
      permanentLogger.breadcrumb('render_complete', 'Mermaid diagram render complete', {
        diagramType: type,
        success: result.success,
        duration
      })

      return result
    } catch (error) {
      timer.stop()
      const err = error as Error
      // Only log essential information to avoid circular structure errors
      console.warn(`MermaidService render error for ${type}: ${err.message || 'Unknown error'}`)
      permanentLogger.captureError('MERMAID_SERVICE', err, {
        stage: 'render',
        diagramType: type,
        cacheEnabled: options?.cache !== false
      })
      return {
        success: false,
        svg: undefined,
        error: error as Error,
        fallback: getMermaidErrorFallback(error as Error, definition)
      }
    }
  }

  /**
   * Render with timeout protection
   */
  private async renderWithTimeout(
    definition: string,
    containerId?: string
  ): Promise<MermaidRenderResult> {
    const timeoutPromise = new Promise<MermaidRenderResult>((_, reject) =>
      setTimeout(() => reject(new Error('Render timeout')), this.RENDER_TIMEOUT)
    )

    const renderPromise = renderMermaidSafely(definition, containerId)

    return Promise.race([renderPromise, timeoutPromise])
  }

  /**
   * Validate Mermaid syntax without rendering
   */
  public async validate(definition: string): Promise<MermaidValidationResult> {
    return validateMermaidSyntax(definition)
  }

  /**
   * Clear the cache
   */
  public clearCache(): void {
    const previousSize = this.cache.size
    this.cache.clear()
    permanentLogger.info('MERMAID_CACHE', 'Cache cleared', {
      itemsCleared: previousSize
    })
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    size: number
    totalHits: number
    entries: Array<{ key: string; hits: number; age: number }>
  } {
    const now = Date.now()
    const entries = Array.from(this.cache.entries()).map(([key, value]) => ({
      key,
      hits: value.hitCount,
      age: now - value.timestamp
    }))

    const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0)

    return {
      size: this.cache.size,
      totalHits,
      entries
    }
  }

  /**
   * Export diagram as image
   */
  public async exportToImage(
    svg: string,
    format: 'png' | 'svg' = 'svg'
  ): Promise<Blob> {
    if (format === 'svg') {
      return new Blob([svg], { type: 'image/svg+xml' })
    }

    // For PNG export, we need to convert SVG to PNG
    return new Promise((resolve, reject) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height
        ctx?.drawImage(img, 0, 0)

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to convert to PNG'))
          }
        }, 'image/png')
      }

      img.onerror = () => reject(new Error('Failed to load SVG'))

      // Convert SVG to data URL
      const svgBlob = new Blob([svg], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(svgBlob)
      img.src = url
    })
  }

  /**
   * Reset the service (mainly for testing)
   */
  public reset(): void {
    this.initialized = false
    this.config = null
    this.mermaidModule = null
    this.clearCache()
    permanentLogger.info('MERMAID_SERVICE', 'Service reset', {
      action: 'reset'
    })
  }

  /**
   * Generate cache key
   */
  private getCacheKey(definition: string, type: string): string {
    // Simple hash function for cache key
    let hash = 0
    const str = `${type}:${definition}`
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return `mermaid_${type}_${hash}`
  }

  /**
   * Get from cache if valid
   */
  private getFromCache(key: string): CacheEntry | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    // Check if cache entry is still valid
    const age = Date.now() - entry.timestamp
    if (age > this.CACHE_TTL) {
      this.cache.delete(key)
      return null
    }

    // Update hit count
    entry.hitCount++
    return entry
  }

  /**
   * Add to cache with LRU eviction
   */
  private addToCache(key: string, svg: string): void {
    // Remove oldest entry if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.findOldestCacheEntry()
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }

    // Add new entry
    this.cache.set(key, {
      svg,
      timestamp: Date.now(),
      hitCount: 0
    })
  }

  /**
   * Find oldest cache entry for LRU eviction
   */
  private findOldestCacheEntry(): string | null {
    let oldestKey: string | null = null
    let oldestTime = Infinity

    for (const [key, value] of this.cache.entries()) {
      // Consider both age and hit count for eviction
      const score = value.timestamp + (value.hitCount * 60000) // 1 minute bonus per hit
      if (score < oldestTime) {
        oldestTime = score
        oldestKey = key
      }
    }

    return oldestKey
  }

  /**
   * Process multiple diagrams in batch
   */
  public async renderBatch(
    diagrams: Array<{ definition: string; type: string; id?: string }>
  ): Promise<Map<string, MermaidRenderResult>> {
    const results = new Map<string, MermaidRenderResult>()

    // Process in parallel but with a concurrency limit
    const BATCH_SIZE = 5
    for (let i = 0; i < diagrams.length; i += BATCH_SIZE) {
      const batch = diagrams.slice(i, i + BATCH_SIZE)
      const batchResults = await Promise.all(
        batch.map(async (diagram) => {
          const id = diagram.id || `diagram_${i}`
          const result = await this.render(diagram.definition, diagram.type)
          return { id, result }
        })
      )

      batchResults.forEach(({ id, result }) => {
        results.set(id, result)
      })
    }

    return results
  }

  /**
   * Get initialization status
   */
  public isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Get current configuration
   */
  public getConfig(): MermaidConfig | null {
    return this.config
  }
}

// Export singleton instance for convenience
export const mermaidService = MermaidService.getInstance()

// Export helper function for React components
export function useMermaidService(): MermaidService {
  return MermaidService.getInstance()
}