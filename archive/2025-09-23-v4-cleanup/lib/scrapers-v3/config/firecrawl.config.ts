/**
 * Firecrawl Configuration
 *
 * NATIVE FEATURES LEVERAGED:
 * - Map API for URL discovery (replaces sitemap-discovery.ts - 400 lines)
 * - Schema extraction (replaces 6 extractors - 3,600 lines)
 * - Markdown conversion (replaces content processing)
 * - Screenshots and PDF generation
 * - Built-in anti-detection with stealth proxies
 * - Automatic rate limiting and retry logic
 *
 * WHAT WE DON'T IMPLEMENT:
 * - URL validation (Firecrawl handles internally)
 * - Cookie management (Handled by service)
 * - HTML parsing (Schema extraction instead)
 * - Robots.txt checking (Respected automatically)
 *
 * COST STRUCTURE:
 * - Basic scraping: $0.05/page
 * - With extraction: +$0.10/page
 * - With screenshots: +$0.02/page
 * - With actions: +$0.05/page
 * - Stealth proxies: +$0.10/page
 */

/**
 * Firecrawl configuration interface
 * Controls all native Firecrawl features and behaviors
 */
export interface FirecrawlConfig {
  /**
   * Feature toggles for Firecrawl capabilities
   * Each feature adds specific functionality and cost
   */
  features: {
    /**
     * Enable URL discovery via Map API
     * Replaces entire sitemap-discovery.ts (400 lines) with 1 API call
     */
    map: boolean

    /**
     * Enable structured data extraction with schemas
     * Replaces all 6 custom extractors (3,600 lines)
     */
    extract: boolean

    /**
     * Convert HTML to clean markdown
     * Perfect for LLM consumption
     */
    markdown: boolean

    /**
     * Capture full-page screenshots
     * Useful for visual validation
     */
    screenshots: boolean

    /**
     * Generate PDF versions of pages
     * For archival or documentation
     */
    pdf: boolean

    /**
     * Enable page interactions
     * Click, scroll, wait for dynamic content
     */
    actions: boolean

    /**
     * Extract all links from pages
     * For crawling and discovery
     */
    links: boolean
  }

  /**
   * Anti-detection and privacy settings
   * Avoid blocking and rate limiting
   */
  stealth: {
    /**
     * Use residential/mobile proxies
     * Essential for sensitive sites
     */
    useProxy: boolean

    /**
     * Proxy geo-location
     * Match target site's country
     */
    proxyCountry?: 'US' | 'UK' | 'CA' | 'AU' | 'DE' | 'FR' | 'auto'

    /**
     * Rotate user agents
     * Appear as different browsers
     */
    rotateUserAgent: boolean

    /**
     * Requests per second limit
     * Lower = more human-like
     */
    rateLimit: number

    /**
     * Delay between requests in ms
     * Add human-like pauses
     */
    crawlDelay?: number

    /**
     * Maximum concurrent requests
     * Lower = less suspicious
     */
    maxConcurrency?: number
  }

  /**
   * Data extraction configuration
   * How to extract structured data from pages
   */
  extraction: {
    /**
     * Enable schema-based extraction
     * Use predefined data structures
     */
    useSchema: boolean

    /**
     * Schema type to use
     * Determines data structure
     */
    schemaType: 'company' | 'ecommerce' | 'blog' | 'news' | 'custom'

    /**
     * Custom extraction schema
     * JSON schema for specific needs
     */
    customSchema?: any

    /**
     * Use LLM for extraction
     * AI-powered data extraction
     */
    llmExtraction?: boolean

    /**
     * Extraction prompt for LLM
     * Guide AI extraction behavior
     */
    extractionPrompt?: string

    /**
     * Only extract main content
     * Skip headers, footers, ads
     */
    onlyMainContent?: boolean
  }

  /**
   * Cost and performance limits
   * Control spending and resource usage
   */
  limits: {
    /**
     * Maximum pages to scrape
     * Hard limit for cost control
     */
    maxPages: number

    /**
     * Maximum crawl depth
     * How deep to follow links
     */
    maxDepth?: number

    /**
     * Maximum credits per request
     * Standard: 1, LLM extraction: 50
     */
    maxCreditsPerRequest: number

    /**
     * Request timeout in ms
     * Fail if page doesn't load
     */
    timeout: number

    /**
     * Maximum retries for failed requests
     * Resilience against temporary failures
     */
    maxRetries: number

    /**
     * Maximum file size to process
     * Skip large files
     */
    maxFileSize?: number
  }

  /**
   * Advanced scraping options
   * Fine-tune behavior for specific sites
   */
  advanced?: {
    /**
     * HTML tags to include
     * Filter content by tags
     */
    includeTags?: string[]

    /**
     * HTML tags to exclude
     * Remove unwanted elements
     */
    excludeTags?: string[]

    /**
     * Wait for specific selector
     * Ensure dynamic content loads
     */
    waitForSelector?: string

    /**
     * Remove cookie banners
     * Clean page before extraction
     */
    removeCookieBanners?: boolean

    /**
     * Bypass Cloudflare protection
     * Handle anti-bot challenges
     */
    bypassCF?: boolean

    /**
     * Custom headers to send
     * Mimic specific browsers/clients
     */
    headers?: Record<string, string>

    /**
     * JavaScript to execute on page
     * Custom page manipulation
     */
    executeScript?: string

    /**
     * Search pattern for Map API
     * Filter discovered URLs
     */
    searchPattern?: string

    /**
     * Include metadata in results
     * Page title, description, etc.
     */
    includeMetadata?: boolean
  }

  /**
   * Response format options
   * Control output structure
   */
  formats?: {
    /**
     * Include raw HTML
     * Full page source
     */
    includeHtml?: boolean

    /**
     * Include cleaned text
     * Text without HTML
     */
    includeText?: boolean

    /**
     * Include all links found
     * For crawling purposes
     */
    includeLinks?: boolean

    /**
     * Screenshot format
     * PNG or JPEG
     */
    screenshotFormat?: 'png' | 'jpeg'

    /**
     * Screenshot quality (JPEG only)
     * 0-100
     */
    screenshotQuality?: number
  }
}

/**
 * Preset configurations for common use cases
 * Ready-to-use configurations for different scenarios
 */
export const FIRECRAWL_PRESETS: Record<string, FirecrawlConfig> = {
  /**
   * Quick discovery preset
   * Fast URL discovery without extraction
   */
  discovery: {
    features: {
      map: true,
      extract: false,
      markdown: false,
      screenshots: false,
      pdf: false,
      actions: false,
      links: true
    },
    stealth: {
      useProxy: false,
      rotateUserAgent: true,
      rateLimit: 2
    },
    extraction: {
      useSchema: false,
      schemaType: 'company'
    },
    limits: {
      maxPages: 50,
      maxCreditsPerRequest: 1,  // Standard scrape
      timeout: 30000,
      maxRetries: 2
    }
  },

  /**
   * Quick scraping preset
   * Fast extraction with basic features
   */
  quick: {
    features: {
      map: false,
      extract: true,
      markdown: true,
      screenshots: false,
      pdf: false,
      actions: false,
      links: false
    },
    stealth: {
      useProxy: false,
      rotateUserAgent: true,
      rateLimit: 1
    },
    extraction: {
      useSchema: true,
      schemaType: 'company',
      onlyMainContent: true
    },
    limits: {
      maxPages: 10,
      maxCreditsPerRequest: 1,  // Standard scrape
      timeout: 30000,
      maxRetries: 2
    }
  },

  /**
   * Comprehensive scraping preset
   * All features enabled for maximum data
   */
  comprehensive: {
    features: {
      map: true,
      extract: true,
      markdown: true,
      screenshots: true,
      pdf: false,
      actions: true,
      links: true
    },
    stealth: {
      useProxy: true,
      proxyCountry: 'US',
      rotateUserAgent: true,
      rateLimit: 0.5,
      crawlDelay: 2000
    },
    extraction: {
      useSchema: true,
      schemaType: 'company',
      llmExtraction: true,
      onlyMainContent: false
    },
    limits: {
      maxPages: 100,
      maxDepth: 3,
      maxCreditsPerRequest: 50,  // LLM extraction
      timeout: 60000,
      maxRetries: 3
    },
    advanced: {
      removeCookieBanners: true,
      bypassCF: true,
      includeMetadata: true
    }
  },

  /**
   * Maximum stealth preset
   * For heavily protected sites
   */
  stealth: {
    features: {
      map: false,
      extract: true,
      markdown: true,
      screenshots: false,
      pdf: false,
      actions: true,
      links: false
    },
    stealth: {
      useProxy: true,
      proxyCountry: 'US',
      rotateUserAgent: true,
      rateLimit: 0.2, // Very slow
      crawlDelay: 5000, // 5 seconds between requests
      maxConcurrency: 1
    },
    extraction: {
      useSchema: true,
      schemaType: 'company',
      onlyMainContent: true
    },
    limits: {
      maxPages: 20,
      maxCreditsPerRequest: 50,  // LLM extraction
      timeout: 90000,
      maxRetries: 5
    },
    advanced: {
      removeCookieBanners: true,
      bypassCF: true,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    }
  },

  /**
   * AI-powered extraction preset
   * Use LLM for intelligent extraction
   */
  ai_extraction: {
    features: {
      map: false,
      extract: true,
      markdown: true,
      screenshots: false,
      pdf: false,
      actions: true,
      links: false
    },
    stealth: {
      useProxy: false,
      rotateUserAgent: true,
      rateLimit: 1
    },
    extraction: {
      useSchema: true,
      schemaType: 'custom',
      llmExtraction: true,
      extractionPrompt: 'Extract all business-relevant information including company details, contact information, products/services, and key personnel.',
      onlyMainContent: true
    },
    limits: {
      maxPages: 10,
      maxCreditsPerRequest: 50,  // LLM extraction // Higher cost for AI
      timeout: 60000,
      maxRetries: 2
    }
  },

  /**
   * E-commerce preset
   * Optimized for online stores
   */
  ecommerce: {
    features: {
      map: true,
      extract: true,
      markdown: false,
      screenshots: true,
      pdf: false,
      actions: true, // For dynamic product loading
      links: true
    },
    stealth: {
      useProxy: true,
      proxyCountry: 'US',
      rotateUserAgent: true,
      rateLimit: 0.5
    },
    extraction: {
      useSchema: true,
      schemaType: 'ecommerce',
      onlyMainContent: true
    },
    limits: {
      maxPages: 100,
      maxCreditsPerRequest: 1,  // Standard scrape with features
      timeout: 60000,
      maxRetries: 3
    },
    advanced: {
      waitForSelector: '[data-product], .product-item, .product-card',
      removeCookieBanners: true,
      executeScript: 'window.scrollTo(0, document.body.scrollHeight);' // Trigger lazy loading
    }
  }
}

/**
 * Configuration validator
 * Ensures config is valid and complete
 */
export function validateFirecrawlConfig(config: Partial<FirecrawlConfig>): FirecrawlConfig {
  const defaultConfig: FirecrawlConfig = {
    features: {
      map: false,
      extract: true,
      markdown: true,
      screenshots: false,
      pdf: false,
      actions: false,
      links: false
    },
    stealth: {
      useProxy: false,
      rotateUserAgent: true,
      rateLimit: 1
    },
    extraction: {
      useSchema: true,
      schemaType: 'company'
    },
    limits: {
      maxPages: 10,
      maxCreditsPerRequest: 1,  // Standard scrape
      timeout: 30000,
      maxRetries: 2
    }
  }

  // Merge with defaults
  return {
    ...defaultConfig,
    ...config,
    features: { ...defaultConfig.features, ...config.features },
    stealth: { ...defaultConfig.stealth, ...config.stealth },
    extraction: { ...defaultConfig.extraction, ...config.extraction },
    limits: { ...defaultConfig.limits, ...config.limits },
    advanced: { ...defaultConfig.advanced, ...config.advanced }
  }
}

/**
 * Cost calculator for Firecrawl operations
 * Estimates cost based on configuration
 */
export function estimateFirecrawlCredits(config: FirecrawlConfig): number {
  // Firecrawl's actual credit model:
  // - Standard scrape: 1 credit per page
  // - LLM extraction: 50 credits per page
  // All features (screenshots, PDFs, proxies) are included in base credit cost

  if (config.extraction.llmExtraction) {
    return 50  // LLM extraction uses 50 credits
  }

  return 1  // Standard scrape uses 1 credit
}

/**
 * Get recommended config based on site characteristics
 */
export function getRecommendedConfig(siteInfo: {
  hasCloudflare?: boolean
  isEcommerce?: boolean
  requiresJavaScript?: boolean
  sensitiveContent?: boolean
}): FirecrawlConfig {
  if (siteInfo.sensitiveContent || siteInfo.hasCloudflare) {
    return FIRECRAWL_PRESETS.stealth
  }

  if (siteInfo.isEcommerce) {
    return FIRECRAWL_PRESETS.ecommerce
  }

  if (siteInfo.requiresJavaScript) {
    return FIRECRAWL_PRESETS.comprehensive
  }

  return FIRECRAWL_PRESETS.quick
}