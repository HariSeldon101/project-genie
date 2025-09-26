/**
 * Firecrawl API Configuration Module
 *
 * Manages API key and endpoint configuration for Firecrawl v3 AI-powered scraper.
 * Firecrawl provides intelligent web scraping with LLM extraction capabilities.
 *
 * @module firecrawl-config
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'

export interface FirecrawlConfig {
  apiKey: string
  apiUrl: string
  isConfigured: () => boolean
  getHeaders: () => Record<string, string>
  getEndpoint: (path: string) => string
  validateKey: () => boolean
  getCreditsEndpoint: () => string
}

export const firecrawlConfig: FirecrawlConfig = {
  // Read from environment with fallbacks
  apiKey: process.env.FIRECRAWL_API_KEY || '',
  apiUrl: process.env.FIRECRAWL_API_URL || 'https://api.firecrawl.dev',

  /**
   * Check if Firecrawl is properly configured
   */
  isConfigured(): boolean {
    return this.validateKey()
  },

  /**
   * Validate API key format
   * Firecrawl keys start with 'fc-' prefix
   */
  validateKey(): boolean {
    return !!this.apiKey &&
           this.apiKey.startsWith('fc-') &&
           this.apiKey.length > 10 &&
           this.apiKey !== 'fc-your-api-key-here'
  },

  /**
   * Get authorization headers for API calls
   */
  getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'ProjectGenie/1.0'
    }
  },

  /**
   * Build full endpoint URL with proper versioning
   * Firecrawl uses /v2/ prefix for current API version
   */
  getEndpoint(path: string): string {
    const baseUrl = this.apiUrl.replace(/\/$/, '') // Remove trailing slash
    const cleanPath = path.startsWith('/') ? path : `/${path}`

    // Handle versioning - v2 is the current API version
    let versionedPath: string
    if (cleanPath.startsWith('/v')) {
      // Already versioned
      versionedPath = cleanPath
    } else {
      // Default to v2 for all endpoints
      versionedPath = `/v2${cleanPath}`
    }

    return `${baseUrl}${versionedPath}`
  },

  /**
   * Get the credits/usage endpoint
   */
  getCreditsEndpoint(): string {
    return this.getEndpoint('/team/credit-usage')
  }
}

/**
 * Validation function for startup checks
 */
export function validateFirecrawlConfig(): {
  valid: boolean
  message: string
  severity: 'info' | 'warning' | 'error'
} {
  if (!firecrawlConfig.apiKey) {
    return {
      valid: false,
      message: 'FIRECRAWL_API_KEY not set. AI Scraper will be disabled. Get a key at https://firecrawl.dev',
      severity: 'warning'
    }
  }

  if (!firecrawlConfig.apiKey.startsWith('fc-')) {
    return {
      valid: false,
      message: 'Invalid FIRECRAWL_API_KEY format. Should start with "fc-". Check your .env.local',
      severity: 'error'
    }
  }

  if (firecrawlConfig.apiKey === 'fc-your-api-key-here') {
    return {
      valid: false,
      message: 'FIRECRAWL_API_KEY is still the example value. Add your actual key to .env.local',
      severity: 'warning'
    }
  }

  return {
    valid: true,
    message: 'Firecrawl API configured successfully',
    severity: 'info'
  }
}

// Log configuration status on module load (development only)
if (process.env.NODE_ENV === 'development') {
  const validation = validateFirecrawlConfig()

  if (validation.valid) {
    permanentLogger.info('FIRECRAWL_CONFIG', validation.message, {
      apiUrl: firecrawlConfig.apiUrl,
      keyPrefix: firecrawlConfig.apiKey.substring(0, 6) + '***'
    })
  } else if (validation.severity === 'warning') {
    console.warn(`⚠️ Firecrawl: ${validation.message}`)
  } else if (validation.severity === 'error') {
    console.error(`❌ Firecrawl: ${validation.message}`)
  }
}