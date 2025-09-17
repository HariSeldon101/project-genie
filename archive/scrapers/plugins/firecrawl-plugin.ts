/**
 * Firecrawl Plugin Adapter
 * 
 * Integration adapter for Firecrawl API - a powerful web scraping service
 * that handles JavaScript rendering, CAPTCHA solving, and anti-bot measures.
 * 
 * Features:
 * - Automatic JavaScript rendering
 * - CAPTCHA solving
 * - Anti-bot detection bypass
 * - Structured data extraction
 * - Screenshot capture
 * - PDF generation
 * 
 * Note: This plugin is disabled by default until API key is configured.
 * To enable, set FIRECRAWL_API_KEY in environment variables.
 * 
 * @module firecrawl-plugin
 */

import { 
  BaseScraperPlugin,
  IScraperPlugin,
  ScraperCapabilities,
  CostEstimate,
  PluginRequirements,
  ScrapingOptions,
  ScrapingResult,
  BatchScrapingResult,
  EnhancedResult
} from './base-scraper-plugin'
import { permanentLogger } from '@/lib/utils/permanent-logger'

/**
 * Firecrawl API configuration
 */
interface FirecrawlConfig {
  apiKey?: string
  apiUrl?: string
  timeout?: number
  maxRetries?: number
}

/**
 * Firecrawl API request options
 */
interface FirecrawlOptions {
  url: string
  waitForSelector?: string
  screenshot?: boolean
  fullPage?: boolean
  extractSchema?: Record<string, any> // JSON schema for structured extraction
  onlyMainContent?: boolean
  includeTags?: string[]
  excludeTags?: string[]
  waitTime?: number // Time to wait before scraping (ms)
  headers?: Record<string, string>
  cookies?: Array<{ name: string; value: string }>
}

/**
 * Firecrawl API response
 */
interface FirecrawlResponse {
  success: boolean
  data?: {
    url: string
    content: string
    markdown?: string
    html?: string
    rawHtml?: string
    screenshot?: string // base64
    metadata?: {
      title?: string
      description?: string
      language?: string
      keywords?: string[]
      ogImage?: string
      statusCode?: number
      error?: string
    }
    llm_extraction?: Record<string, any>
  }
  error?: string
}

/**
 * Firecrawl Plugin - Premium web scraping service integration
 */
export class FirecrawlPlugin extends BaseScraperPlugin implements IScraperPlugin {
  scraperType: 'api' = 'api'
  speed: 'normal' = 'normal'
  mergeable: boolean = true
  
  private config: FirecrawlConfig
  private apiKey?: string
  
  constructor(config?: FirecrawlConfig) {
    super('Firecrawl', '1.0.0')
    
    this.config = {
      apiUrl: 'https://api.firecrawl.dev/v0',
      timeout: 60000,
      maxRetries: 3,
      ...config
    }
    
    // Check for API key
    this.apiKey = this.config.apiKey || process.env.FIRECRAWL_API_KEY
    this.enabled = !!this.apiKey
    this.priority = 85 // High priority due to advanced capabilities
    
    if (!this.enabled) {
      this.logger.warn('INTELLIGENCE', 'Firecrawl plugin disabled: No API key found')
      this.logger.log('To enable Firecrawl, set FIRECRAWL_API_KEY environment variable')
    }
  }
  
  /**
   * Get scraper capabilities
   */
  getCapabilities(): ScraperCapabilities {
    return {
      supportsJavaScript: true,
      supportsAuthentication: true,
      supportsProxies: true,
      supportsCookies: true,
      supportsHeaders: true,
      maxConcurrency: 10,
      rateLimit: {
        requests: 100,
        period: 60 // 100 requests per minute
      }
    }
  }
  
  /**
   * Get cost estimate
   */
  getCost(): CostEstimate {
    return {
      perPage: 0.01, // $0.01 per page (estimated)
      perMB: 0.005, // $0.005 per MB
      setupCost: 0,
      minimumCharge: 0
    }
  }
  
  /**
   * Get plugin requirements
   */
  getRequirements(): PluginRequirements {
    return {
      apiKey: true,
      browser: false, // Firecrawl handles browser internally
      proxy: false, // Firecrawl handles proxies internally
      captchaSolver: false // Firecrawl handles CAPTCHAs internally
    }
  }
  
  /**
   * Check if this scraper can handle a URL
   */
  async canScrape(url: string): Promise<boolean> {
    // Firecrawl can handle any URL if enabled
    if (!this.enabled) return false
    
    // Check for specific patterns where Firecrawl excels
    const preferredPatterns = [
      /linkedin\.com/i, // LinkedIn (anti-bot protection)
      /facebook\.com/i, // Facebook (authentication)
      /instagram\.com/i, // Instagram (dynamic content)
      /twitter\.com/i, // Twitter (infinite scroll)
      /amazon\.com/i, // Amazon (anti-bot)
      /glassdoor\.com/i, // Glassdoor (authentication)
      /indeed\.com/i, // Indeed (anti-bot)
      /cloudflare\.com/i // Sites with Cloudflare protection
    ]
    
    // Return higher confidence for preferred sites
    const isPreferred = preferredPatterns.some(pattern => pattern.test(url))
    
    this.logger.log('Checking URL compatibility', {
      url,
      isPreferred,
      enabled: this.enabled
    })
    
    return true // Can scrape any URL
  }
  
  /**
   * Scrape a single URL using Firecrawl API
   */
  async scrape(url: string, options?: ScrapingOptions): Promise<ScrapingResult> {
    if (!this.enabled || !this.apiKey) {
      throw new Error('Firecrawl plugin is not enabled. Please configure FIRECRAWL_API_KEY')
    }
    
    const startTime = Date.now()
    
    this.logger.log('Starting Firecrawl scrape', {
      url,
      options: options ? Object.keys(options) : []
    })
    
    try {
      // Prepare Firecrawl request
      const firecrawlOptions: FirecrawlOptions = {
        url,
        waitForSelector: options?.waitForSelector,
        screenshot: options?.screenshot,
        fullPage: options?.fullPage,
        headers: options?.headers,
        cookies: options?.cookies,
        onlyMainContent: true,
        waitTime: options?.timeout || 5000
      }
      
      // Make API request to Firecrawl
      const response = await this.callFirecrawlAPI('/scrape', firecrawlOptions)
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Firecrawl scraping failed')
      }
      
      const duration = Date.now() - startTime
      
      this.logger.log('Firecrawl scrape completed', {
        url,
        duration,
        hasContent: !!response.data.content,
        contentLength: response.data.content?.length || 0
      })
      
      // Convert Firecrawl response to standard format
      return {
        url,
        content: response.data.markdown || response.data.content,
        html: response.data.html || response.data.rawHtml,
        text: response.data.content,
        title: response.data.metadata?.title,
        metadata: {
          statusCode: response.data.metadata?.statusCode,
          contentType: 'text/html',
          contentLength: response.data.content?.length,
          loadTime: duration,
          screenshot: response.data.screenshot,
          description: response.data.metadata?.description,
          keywords: response.data.metadata?.keywords,
          language: response.data.metadata?.language
        },
        structured: response.data.llm_extraction,
        errors: response.data.metadata?.error ? [response.data.metadata.error] : undefined,
        strategy: 'firecrawl'
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      this.logger.captureError('UNKNOWN', new Error('Firecrawl scrape failed'), {
        url,
        error: errorMessage,
        duration: Date.now() - startTime
      })
      
      return {
        url,
        errors: [errorMessage],
        strategy: 'firecrawl'
      }
    }
  }
  
  /**
   * Scrape multiple URLs in batch
   */
  async scrapeBatch?(urls: string[], options?: ScrapingOptions): Promise<BatchScrapingResult> {
    const startTime = Date.now()
    const successful: ScrapingResult[] = []
    const failed: Array<{ url: string; error: string }> = []
    
    this.logger.log('Starting batch scrape', {
      urlCount: urls.length,
      options: options ? Object.keys(options) : []
    })
    
    // Process URLs with rate limiting
    const batchSize = 5 // Process 5 URLs at a time
    
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize)
      const promises = batch.map(url => this.scrape(url, options))
      
      const results = await Promise.allSettled(promises)
      
      results.forEach((result, index) => {
        const url = batch[index]
        
        if (result.status === 'fulfilled') {
          if (result.value.errors && result.value.errors.length > 0) {
            failed.push({
              url,
              error: result.value.errors.join('; ')
            })
          } else {
            successful.push(result.value)
          }
        } else {
          failed.push({
            url,
            error: result.reason?.message || 'Unknown error'
          })
        }
      })
      
      // Rate limiting delay between batches
      if (i + batchSize < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second delay
      }
    }
    
    const totalTime = Date.now() - startTime
    const successRate = successful.length / urls.length
    
    this.logger.log('Batch scrape completed', {
      totalUrls: urls.length,
      successful: successful.length,
      failed: failed.length,
      totalTime,
      successRate
    })
    
    return {
      successful,
      failed,
      metrics: {
        totalTime,
        averageTime: totalTime / urls.length,
        successRate
      }
    }
  }
  
  /**
   * Enhance existing data with Firecrawl's advanced extraction
   */
  async enhance?(existingData: any, url: string): Promise<EnhancedResult> {
    this.logger.log('Enhancing existing data with Firecrawl', {
      url,
      hasExistingContent: !!existingData.content
    })
    
    // Scrape with Firecrawl
    const enhancedData = await this.scrape(url, {
      screenshot: true,
      fullPage: true
    })
    
    // Identify what was added/improved
    const addedFields: string[] = []
    const improvedFields: string[] = []
    
    // Check for new structured data
    if (enhancedData.structured && !existingData.structured) {
      addedFields.push('structured_data')
    } else if (enhancedData.structured && existingData.structured) {
      const newKeys = Object.keys(enhancedData.structured).filter(
        key => !(key in existingData.structured)
      )
      addedFields.push(...newKeys.map(k => `structured.${k}`))
    }
    
    // Check for screenshot
    if (enhancedData.metadata?.screenshot && !existingData.metadata?.screenshot) {
      addedFields.push('screenshot')
    }
    
    // Check for improved content
    if (enhancedData.content && existingData.content) {
      const newLength = enhancedData.content.length
      const oldLength = existingData.content.length
      
      if (newLength > oldLength * 1.2) {
        improvedFields.push('content')
      }
    }
    
    return {
      ...enhancedData,
      enhancement: {
        addedFields,
        improvedFields,
        confidence: 0.95, // High confidence in Firecrawl results
        source: 'firecrawl'
      }
    }
  }
  
  /**
   * Call Firecrawl API
   */
  private async callFirecrawlAPI(
    endpoint: string, 
    data: any
  ): Promise<FirecrawlResponse> {
    const url = `${this.config.apiUrl}${endpoint}`
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(this.config.timeout!)
      })
      
      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Firecrawl API error: ${response.status} - ${error}`)
      }
      
      return await response.json()
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Firecrawl API request timed out')
        }
        throw error
      }
      throw new Error('Unknown error calling Firecrawl API')
    }
  }
  
  /**
   * Check if API key is available
   */
  protected hasApiKey(): boolean {
    return !!this.apiKey
  }
}

/**
 * Factory function to create and register Firecrawl plugin
 */
export async function createFirecrawlPlugin(): Promise<FirecrawlPlugin> {
  const plugin = new FirecrawlPlugin()
  
  // Auto-register with plugin registry if available
  try {
    const { ScraperPluginRegistry } = await import('./base-scraper-plugin')
    const registry = ScraperPluginRegistry.getInstance()
    await registry.register(plugin)
    
    permanentLogger.info('Plugin registered with registry', { category: 'FIRECRAWL_PLUGIN', enabled: plugin.enabled,
      priority: plugin.priority })
  } catch (error) {
    permanentLogger.warn('FIRECRAWL_PLUGIN', 'Failed to register with registry', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
  
  return plugin
}

// Export for auto-discovery
export default FirecrawlPlugin