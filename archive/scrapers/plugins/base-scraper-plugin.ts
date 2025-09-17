/**
 * Base Scraper Plugin Interface
 * 
 * Extends the IIntelligencePlugin interface to provide a plugin-based
 * architecture for scrapers. This enables auto-discovery and dynamic
 * registration of new scraping strategies.
 * 
 * Features:
 * - Auto-discovery via manifest patterns
 * - Capability declaration for intelligent routing
 * - Cost tracking for optimization
 * - Mergeable results for multi-pass scraping
 * 
 * @module base-scraper-plugin
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'

/**
 * Plugin context passed to scraper plugins
 */
export interface PluginContext {
  url: string
  sessionId: string
  domain: string
  options?: {
    timeout?: number
    maxRetries?: number
    headers?: Record<string, string>
  }
  previousData?: any // Data from previous scraping passes
  metadata?: Record<string, any>
}

/**
 * Result returned by scraper plugins
 */
export interface PluginResult {
  success: boolean
  data?: any
  error?: string
  metadata?: {
    duration: number
    bytesScraped?: number
    strategy?: string
    [key: string]: any
  }
}

/**
 * Scraper capabilities declaration
 */
export interface ScraperCapabilities {
  supportsJavaScript: boolean
  supportsAuthentication: boolean
  supportsProxies: boolean
  supportsCookies: boolean
  supportsHeaders: boolean
  maxConcurrency: number
  rateLimit?: {
    requests: number
    period: number // in seconds
  }
}

/**
 * Cost estimate for scraping
 */
export interface CostEstimate {
  perPage: number // Cost per page in USD
  perMB: number // Cost per MB of data
  setupCost?: number // One-time setup cost
  minimumCharge?: number // Minimum charge per session
}

/**
 * Plugin requirements
 */
export interface PluginRequirements {
  apiKey?: boolean
  browser?: boolean
  proxy?: boolean
  captchaSolver?: boolean
}

/**
 * Base intelligence plugin interface (from shared content)
 */
export interface IIntelligencePlugin {
  name: string
  version: string
  category: 'scraper' | 'enricher' | 'extractor' | 'analyzer'
  enabled: boolean
  priority: number // 1-100, higher = runs first
  
  // Lifecycle methods
  initialize(): Promise<void>
  execute(context: PluginContext): Promise<PluginResult>
  cleanup(): Promise<void>
  
  // Metadata methods
  getCapabilities(): ScraperCapabilities
  getCost(): CostEstimate
  getRequirements(): PluginRequirements
}

/**
 * Scraper-specific plugin interface
 */
export interface IScraperPlugin extends IIntelligencePlugin {
  category: 'scraper'
  
  /**
   * Type of scraper
   */
  scraperType: 'static' | 'dynamic' | 'api' | 'browser' | 'hybrid'
  
  /**
   * Speed category for performance expectations
   */
  speed: 'fast' | 'normal' | 'slow'
  
  /**
   * Whether results can be merged with other scraper results
   */
  mergeable: boolean
  
  /**
   * Check if this scraper can handle a specific URL
   */
  canScrape(url: string): Promise<boolean>
  
  /**
   * Scrape a single URL
   */
  scrape(url: string, options?: ScrapingOptions): Promise<ScrapingResult>
  
  /**
   * Scrape multiple URLs in batch
   */
  scrapeBatch?(urls: string[], options?: ScrapingOptions): Promise<BatchScrapingResult>
  
  /**
   * Enhance existing data with this scraper's capabilities
   */
  enhance?(existingData: any, url: string): Promise<EnhancedResult>
}

/**
 * Scraping options
 */
export interface ScrapingOptions {
  timeout?: number
  waitForSelector?: string
  screenshot?: boolean
  fullPage?: boolean
  cookies?: Array<{ name: string; value: string; domain: string }>
  headers?: Record<string, string>
  proxy?: {
    server: string
    username?: string
    password?: string
  }
  userAgent?: string
  viewport?: {
    width: number
    height: number
  }
}

/**
 * Single page scraping result
 */
export interface ScrapingResult {
  url: string
  content?: string
  html?: string
  text?: string
  title?: string
  metadata?: {
    statusCode?: number
    contentType?: string
    contentLength?: number
    loadTime?: number
    screenshot?: string // base64
    [key: string]: any
  }
  structured?: Record<string, any> // Structured data extracted
  errors?: string[]
  strategy: string // Which strategy/plugin was used
}

/**
 * Batch scraping result
 */
export interface BatchScrapingResult {
  successful: ScrapingResult[]
  failed: Array<{
    url: string
    error: string
  }>
  metrics: {
    totalTime: number
    averageTime: number
    successRate: number
  }
}

/**
 * Enhanced scraping result (for multi-pass)
 */
export interface EnhancedResult extends ScrapingResult {
  enhancement: {
    addedFields: string[]
    improvedFields: string[]
    confidence: number
    source: string
  }
}

/**
 * Base implementation for scraper plugins
 */
export abstract class BaseScraperPlugin implements IScraperPlugin {
  name: string
  version: string
  category: 'scraper' = 'scraper'
  enabled: boolean = true
  priority: number = 50
  scraperType: 'static' | 'dynamic' | 'api' | 'browser' | 'hybrid' = 'dynamic'
  speed: 'fast' | 'normal' | 'slow' = 'normal'
  mergeable: boolean = true
  
  protected logger: ReturnType<typeof permanentLogger.create>
  
  constructor(name: string, version: string = '1.0.0') {
    this.name = name
    this.version = version
    this.logger = permanentLogger.create(`PLUGIN_${name.toUpperCase()}`)
  }
  
  /**
   * Initialize the plugin
   */
  async initialize(): Promise<void> {
    this.logger.log('Initializing plugin', {
      name: this.name,
      version: this.version,
      type: this.scraperType
    })
    
    // Check requirements
    const requirements = this.getRequirements()
    if (requirements.apiKey && !this.hasApiKey()) {
      this.enabled = false
      this.logger.warn('INTELLIGENCE', 'Plugin disabled: API key required but not found')
    }
  }
  
  /**
   * Execute scraping via plugin context
   */
  async execute(context: PluginContext): Promise<PluginResult> {
    const startTime = Date.now()
    
    try {
      this.logger.log('Executing scraping', {
        url: context.url,
        sessionId: context.sessionId
      })
      
      const result = await this.scrape(context.url, context.options)
      
      return {
        success: true,
        data: result,
        metadata: {
          duration: Date.now() - startTime,
          strategy: this.name
        }
      }
    } catch (error) {
      this.logger.captureError('UNKNOWN', new Error('Scraping failed'), {
        url: context.url,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          duration: Date.now() - startTime,
          strategy: this.name
        }
      }
    }
  }
  
  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.logger.log('Cleaning up plugin resources')
  }
  
  /**
   * Check if API key is available (override in subclasses)
   */
  protected hasApiKey(): boolean {
    return true // Override in subclasses that need API keys
  }
  
  // Abstract methods to be implemented by subclasses
  abstract getCapabilities(): ScraperCapabilities
  abstract getCost(): CostEstimate
  abstract getRequirements(): PluginRequirements
  abstract canScrape(url: string): Promise<boolean>
  abstract scrape(url: string, options?: ScrapingOptions): Promise<ScrapingResult>
}

/**
 * Plugin registry for auto-discovery and management
 */
export class ScraperPluginRegistry {
  private static instance: ScraperPluginRegistry
  private plugins: Map<string, IScraperPlugin> = new Map()
  private logger = permanentLogger.create('PLUGIN_REGISTRY')
  
  private constructor() {}
  
  static getInstance(): ScraperPluginRegistry {
    if (!ScraperPluginRegistry.instance) {
      ScraperPluginRegistry.instance = new ScraperPluginRegistry()
    }
    return ScraperPluginRegistry.instance
  }
  
  /**
   * Register a scraper plugin
   */
  async register(plugin: IScraperPlugin): Promise<void> {
    this.logger.log('Registering plugin', {
      name: plugin.name,
      version: plugin.version,
      type: plugin.scraperType
    })
    
    await plugin.initialize()
    this.plugins.set(plugin.name, plugin)
  }
  
  /**
   * Get all enabled plugins
   */
  getEnabledPlugins(): IScraperPlugin[] {
    return Array.from(this.plugins.values()).filter(p => p.enabled)
  }
  
  /**
   * Get plugins that can handle a URL
   */
  async getPluginsForUrl(url: string): Promise<IScraperPlugin[]> {
    const suitable: IScraperPlugin[] = []
    
    for (const plugin of this.getEnabledPlugins()) {
      if (await plugin.canScrape(url)) {
        suitable.push(plugin)
      }
    }
    
    // Sort by priority
    return suitable.sort((a, b) => b.priority - a.priority)
  }
  
  /**
   * Get a specific plugin by name
   */
  getPlugin(name: string): IScraperPlugin | undefined {
    return this.plugins.get(name)
  }
  
  /**
   * Auto-discover plugins from filesystem
   */
  async autoDiscover(): Promise<void> {
    this.logger.log('Starting plugin auto-discovery')
    
    // This would scan the plugins directory and auto-register
    // Implementation depends on build system and module resolution
    // For now, plugins need to be manually registered
    
    this.logger.log('Auto-discovery complete', {
      pluginsFound: this.plugins.size
    })
  }
}