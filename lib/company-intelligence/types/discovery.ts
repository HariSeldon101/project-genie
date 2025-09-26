/**
 * Discovery Types
 *
 * Shared type definitions for discovery operations
 * Following UK English spelling per CLAUDE.md
 */

/**
 * Discovery result containing URLs and metadata
 */
export interface DiscoveryResult {
  success: boolean
  domain: string
  urls?: string[]
  merged_data?: {
    sitemap?: {
      pages: Array<{
        url: string
        title?: string
        priority?: number
        source?: string
        discovered_at?: string
      }>
      totalCount: number
      timestamp: string
    }
    site_analysis?: {
      sitemap_found?: boolean
      homepage_crawled?: boolean
      blog_discovered?: boolean
      phases_completed?: string[]
      timestamp?: string
    }
  }
  metadata?: {
    phases?: Array<{
      name: string
      success: boolean
      duration?: number
      error?: string
    }>
    totalDuration?: number
    timestamp?: string
  }
}

/**
 * Discovery progress update
 */
export interface DiscoveryProgress {
  phase: string
  status: 'in_progress' | 'completed' | 'error'
  message?: string
  data?: any
  error?: Error
  duration?: number
  timestamp: number
  completed?: number
  total?: number
}

/**
 * Discovery phase configuration
 */
export interface DiscoveryPhase {
  id: string
  name: string
  description: string
  timeout?: number
  maxUrls?: number
  validateUrls?: boolean
}

/**
 * Discovery options
 */
export interface DiscoveryOptions {
  maxUrls?: number
  timeout?: number
  validateUrls?: boolean
  enableIntelligence?: boolean
  includeSubdomains?: boolean
}

/**
 * Discovery error
 */
export interface DiscoveryError extends Error {
  phase?: string
  domain?: string
  statusCode?: number
  retryable?: boolean
}