/**
 * Static Website Strategy Module
 * 
 * Optimized strategy for static HTML websites using Cheerio for fast, lightweight scraping.
 * Uses axios for HTTP requests and Cheerio for HTML parsing, following best practices.
 * 
 * Features:
 * - Fast HTML parsing with Cheerio
 * - HTTP requests with axios
 * - Built-in caching mechanism
 * - Retry logic with exponential backoff
 * - Efficient content extraction
 * - No browser overhead
 * 
 * @module static-strategy
 */

import axios, { AxiosRequestConfig, AxiosError } from 'axios'
import * as cheerio from 'cheerio'
import { permanentLogger } from '../../../utils/permanent-logger'

// Import types from base strategy
export interface ScrapingResult {
  content: string
  title?: string
  description?: string
  metadata?: Record<string, any>
  metrics?: {
    loadTime: number
    contentSize: number
    requestCount: number
  }
  errors?: string[]
  strategy: string
}

export interface StrategyConfig {
  timeout?: number
  userAgent?: string
  headers?: Record<string, string>
  debug?: boolean
  maxRetries?: number
  retryDelay?: number
  cacheEnabled?: boolean
  cacheTTL?: number
}

// Default configuration
const DEFAULT_CONFIG: Required<Omit<StrategyConfig, 'headers'>> = {
  timeout: 30000,
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  debug: false,
  maxRetries: 3,
  retryDelay: 2000,
  cacheEnabled: true,
  cacheTTL: 300000 // 5 minutes
}

// Simple in-memory cache for HTML content
interface CacheEntry {
  html: string
  timestamp: number
  metadata?: Record<string, any>
}

class HTMLCache {
  private cache: Map<string, CacheEntry> = new Map()
  private ttl: number

  constructor(ttl: number = 300000) {
    this.ttl = ttl
  }

  get(url: string): string | null {
    const entry = this.cache.get(url)
    if (!entry) return null

    const now = Date.now()
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(url)
      return null
    }

    permanentLogger.info('STATIC_STRATEGY_CACHE', 'Cache hit', { url })
    return entry.html
  }

  set(url: string, html: string, metadata?: Record<string, any>): void {
    this.cache.set(url, {
      html,
      timestamp: Date.now(),
      metadata
    })
    permanentLogger.info('STATIC_STRATEGY_CACHE', 'Cached HTML', { url, size: html.length })
  }

  clear(): void {
    this.cache.clear()
  }
}

/**
 * Static website scraping strategy using Cheerio
 * 
 * Best for:
 * - Traditional HTML websites
 * - Server-side rendered content
 * - Blogs and news sites
 * - Documentation sites
 * - Sites with minimal JavaScript
 */
export class StaticStrategy {
  private config: Required<Omit<StrategyConfig, 'headers'>>
  private headers: Record<string, string>
  private strategyName: string = 'static'
  private cache: HTMLCache

  constructor(config?: StrategyConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.headers = {
      'User-Agent': this.config.userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      ...config?.headers
    }
    this.cache = new HTMLCache(this.config.cacheTTL)
  }

  /**
   * Get the strategy name
   */
  getName(): string {
    return this.strategyName
  }

  /**
   * Detect if site is suitable for static scraping
   * Since we're using HTTP requests, we analyze based on URL patterns
   * 
   * @param url - URL to check
   * @returns Confidence score (0-1)
   */
  async detect(url: string): Promise<number> {
    // URL-based heuristics for static sites
    const staticIndicators = [
      '.html',
      '/blog/',
      '/news/',
      '/docs/',
      '/documentation/',
      '/articles/',
      'wordpress',
      'medium.com',
      'wikipedia',
      'github.io',
      'readthedocs'
    ]
    
    const dynamicIndicators = [
      'app.',
      'dashboard.',
      'portal.',
      '/app/',
      '/dashboard/'
    ]
    
    const urlLower = url.toLowerCase()
    
    // Check for static indicators
    const hasStaticIndicator = staticIndicators.some(indicator => 
      urlLower.includes(indicator)
    )
    
    // Check for dynamic indicators (negative score)
    const hasDynamicIndicator = dynamicIndicators.some(indicator =>
      urlLower.includes(indicator)
    )
    
    // Calculate base score
    let score = 0.5
    if (hasStaticIndicator) score += 0.3
    if (hasDynamicIndicator) score -= 0.3
    
    // Try to fetch headers to check for static site generators
    try {
      const response = await axios.head(url, {
        timeout: 5000,
        headers: this.headers
      })
      
      const headers = response.headers
      const contentType = headers['content-type'] || ''
      
      // HTML content is a good sign
      if (contentType.includes('text/html')) score += 0.1
      
      // Check for static site generator headers
      const generator = headers['x-generator'] || headers['x-powered-by'] || ''
      const staticGenerators = ['jekyll', 'hugo', 'gatsby', 'wordpress', 'drupal']
      if (staticGenerators.some(gen => generator.toLowerCase().includes(gen))) {
        score += 0.2
      }
      
    } catch (error) {
      // If we can't fetch headers, use base score
      this.log('Could not fetch headers for detection', { url, error })
    }
    
    // Normalize score
    score = Math.min(1, Math.max(0, score))
    
    this.log('Static site detection', { url, score })
    return score
  }

  /**
   * Execute static scraping strategy using Cheerio
   * 
   * @param url - URL to scrape
   * @returns Scraping result
   */
  async execute(url: string): Promise<ScrapingResult> {
    const startTime = Date.now()
    const errors: string[] = []

    this.log('Executing static strategy with Cheerio', { url })

    try {
      // Check cache first
      let html = this.config.cacheEnabled ? this.cache.get(url) : null
      
      if (!html) {
        // Fetch HTML with retry logic
        html = await this.fetchWithRetry(url)
        
        if (this.config.cacheEnabled && html) {
          this.cache.set(url, html)
        }
      }

      if (!html) {
        throw new Error('Failed to fetch HTML content')
      }

      // Load HTML into Cheerio
      const $ = cheerio.load(html)
      
      // Extract content
      const content = this.extractContent($)
      const metadata = this.extractMetadata($)
      const socialAccounts = this.extractSocialAccounts($)
      const staticInfo = this.extractStaticSiteInfo($)
      
      // Add social accounts to metadata if found
      if (socialAccounts && Object.keys(socialAccounts).length > 0) {
        metadata.socialMediaAccounts = socialAccounts
      }
      
      // Calculate metrics
      const endTime = Date.now()
      const metrics = {
        loadTime: endTime - startTime,
        contentSize: html.length,
        requestCount: 1 // Single HTTP request
      }
      
      permanentLogger.info('STATIC_STRATEGY', 'Content extracted successfully', {
        url,
        contentLength: content.length,
        metadataKeys: Object.keys(metadata).length,
        loadTime: metrics.loadTime
      })
      
      return {
        content,
        title: metadata.title,
        description: metadata.description,
        metadata: {
          ...metadata,
          ...staticInfo,
          scraper: 'cheerio',  // Indicate we're using Cheerio
          httpClient: 'axios'  // Indicate we're using Axios
        },
        metrics,
        errors: errors.length > 0 ? errors : undefined,
        strategy: this.strategyName
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      errors.push(`Static scraping failed: ${errorMessage}`)
      permanentLogger.captureError('STATIC_STRATEGY', new Error('Scraping failed'), { url, error: errorMessage })
      
      return {
        content: '',
        errors,
        strategy: this.strategyName
      }
    }
  }

  /**
   * Fetch HTML with retry logic and exponential backoff
   * 
   * @param url - URL to fetch
   * @returns HTML content
   */
  private async fetchWithRetry(url: string): Promise<string> {
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        this.log(`Fetching HTML (attempt ${attempt}/${this.config.maxRetries})`, { url })
        
        const axiosConfig: AxiosRequestConfig = {
          timeout: this.config.timeout,
          headers: this.headers,
          maxRedirects: 5,
          validateStatus: (status) => status < 400
        }
        
        const response = await axios.get(url, axiosConfig)
        
        if (response.status === 200 && response.data) {
          permanentLogger.info('STATIC_STRATEGY', 'HTML fetched successfully', {
            url,
            status: response.status,
            contentLength: response.data.length,
            attempt
          })
          return response.data
        }
        
        throw new Error(`Unexpected status: ${response.status}`)
        
      } catch (error) {
        lastError = error as Error
        
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError
          permanentLogger.warn('STATIC_STRATEGY', `Fetch attempt ${attempt} failed`, {
            url,
            status: axiosError.response?.status,
            message: axiosError.message
          })
        }
        
        // Don't retry on 4xx errors (except 429)
        if (axios.isAxiosError(error) && error.response) {
          const status = error.response.status
          if (status >= 400 && status < 500 && status !== 429) {
            break
          }
        }
        
        // Exponential backoff
        if (attempt < this.config.maxRetries) {
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1)
          this.log(`Waiting ${delay}ms before retry`, { url, attempt })
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    throw lastError || new Error('Failed to fetch HTML after retries')
  }

  /**
   * Extract content using Cheerio selectors
   * 
   * @param $ - Cheerio instance
   * @returns Extracted text content
   */
  private extractContent($: cheerio.CheerioAPI): string {
    // Remove unwanted elements
    $('script, style, noscript, iframe').remove()
    $('.sidebar, .advertisement, .ads, .ad, .social-share, .comments, #comments').remove()
    $('.cookie-banner, .popup, .modal, .newsletter-signup').remove()
    
    // Priority content selectors
    const contentSelectors = [
      'main',
      'article',
      '[role="main"]',
      '#content',
      '.content',
      '.post-content',
      '.entry-content',
      '.page-content',
      '.documentation-content',
      '.markdown-body',
      '.container',
      '.wrapper',
      '.main-content',
      '#main-content',
      '.site-content'
    ]
    
    let contentText = ''
    
    // Try to find main content area
    for (const selector of contentSelectors) {
      const element = $(selector)
      if (element.length > 0) {
        const text = element.text().trim()
        if (text.length > 100) {
          contentText = text
          break
        }
      }
    }
    
    // If no specific content area found, extract from body
    if (!contentText) {
      // Get all text from paragraphs, headings, and lists
      const textParts: string[] = []
      
      // Headings
      $('h1, h2, h3, h4, h5, h6').each((_, el) => {
        const text = $(el).text().trim()
        if (text) textParts.push(text)
      })
      
      // Paragraphs
      $('p').each((_, el) => {
        const text = $(el).text().trim()
        if (text && text.length > 20) textParts.push(text)
      })
      
      // List items
      $('li').each((_, el) => {
        const text = $(el).text().trim()
        if (text && text.length > 10) textParts.push(text)
      })
      
      contentText = textParts.join('\n\n')
    }
    
    // Clean up whitespace
    return contentText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n')
  }

  /**
   * Extract metadata using Cheerio
   * 
   * @param $ - Cheerio instance
   * @returns Metadata object
   */
  private extractMetadata($: cheerio.CheerioAPI): Record<string, any> {
    const metadata: Record<string, any> = {}
    
    // Title
    metadata.title = $('title').text().trim() || 
                    $('meta[property="og:title"]').attr('content') || 
                    $('h1').first().text().trim()
    
    // Description
    metadata.description = $('meta[name="description"]').attr('content') ||
                          $('meta[property="og:description"]').attr('content')
    
    // Keywords
    const keywords = $('meta[name="keywords"]').attr('content')
    if (keywords) metadata.keywords = keywords
    
    // Open Graph tags
    const ogTags: Record<string, string> = {}
    $('meta[property^="og:"]').each((_, el) => {
      const property = $(el).attr('property')?.replace('og:', '')
      const content = $(el).attr('content')
      if (property && content) {
        ogTags[property] = content
      }
    })
    if (Object.keys(ogTags).length > 0) {
      metadata.openGraph = ogTags
    }
    
    // Twitter Card tags
    const twitterTags: Record<string, string> = {}
    $('meta[name^="twitter:"], meta[property^="twitter:"]').each((_, el) => {
      const name = $(el).attr('name') || $(el).attr('property')
      const content = $(el).attr('content')
      if (name && content) {
        const key = name.replace('twitter:', '')
        twitterTags[key] = content
      }
    })
    if (Object.keys(twitterTags).length > 0) {
      metadata.twitterCard = twitterTags
    }
    
    // JSON-LD structured data
    const jsonLdScripts: any[] = []
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const jsonText = $(el).html()
        if (jsonText) {
          const parsed = JSON.parse(jsonText)
          jsonLdScripts.push(parsed)
        }
      } catch (e) {
      // Log error but re-throw to avoid silent failures
      permanentLogger.captureError('ERROR', e as Error, {
        context: 'Unhandled error - needs proper handling'
      })
      throw e
    }
    })
    if (jsonLdScripts.length > 0) {
      metadata.jsonLd = jsonLdScripts
    }
    
    // Canonical URL
    const canonical = $('link[rel="canonical"]').attr('href')
    if (canonical) metadata.canonical = canonical
    
    // Language
    metadata.language = $('html').attr('lang') || 'en'
    
    return metadata
  }

  /**
   * Extract social media accounts using Cheerio
   * 
   * @param $ - Cheerio instance
   * @returns Social media accounts map
   */
  private extractSocialAccounts($: cheerio.CheerioAPI): Record<string, string> {
    const accounts: Record<string, string> = {}
    
    // Common social media domains
    const socialDomains = {
      'facebook.com': 'facebook',
      'twitter.com': 'twitter',
      'x.com': 'twitter',
      'instagram.com': 'instagram',
      'linkedin.com': 'linkedin',
      'youtube.com': 'youtube',
      'github.com': 'github',
      'pinterest.com': 'pinterest',
      'tiktok.com': 'tiktok'
    }
    
    // Find all links
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href')
      if (!href) return
      
      // Check if it's a social media link
      for (const [domain, platform] of Object.entries(socialDomains)) {
        if (href.includes(domain) && !accounts[platform]) {
          // Clean up the URL
          try {
            const url = new URL(href, 'https://example.com')
            if (url.hostname.includes(domain)) {
              accounts[platform] = href.startsWith('http') ? href : `https://${domain}${url.pathname}`
            }
          } catch (e) {
      // Log error but re-throw to avoid silent failures
      permanentLogger.captureError('ERROR', e as Error, {
        context: 'Unhandled error - needs proper handling'
      })
      throw e
    }
        }
      }
    })
    
    return accounts
  }

  /**
   * Extract static site specific information
   * 
   * @param $ - Cheerio instance
   * @returns Static site information
   */
  private extractStaticSiteInfo($: cheerio.CheerioAPI): Record<string, any> {
    const info: Record<string, any> = {}
    
    // Site generator
    const generator = $('meta[name="generator"]').attr('content')
    if (generator) {
      info.generator = generator
    }
    
    // RSS feeds
    const rssFeeds: any[] = []
    $('link[type="application/rss+xml"], link[type="application/atom+xml"]').each((_, el) => {
      const feed = {
        title: $(el).attr('title'),
        href: $(el).attr('href'),
        type: $(el).attr('type')
      }
      if (feed.href) rssFeeds.push(feed)
    })
    if (rssFeeds.length > 0) {
      info.rssFeeds = rssFeeds
    }
    
    // Sitemap
    const sitemap = $('link[rel="sitemap"]').attr('href')
    if (sitemap) {
      info.sitemap = sitemap
    }
    
    // Publication date
    const dateSelectors = [
      'meta[property="article:published_time"]',
      'meta[name="publish_date"]',
      'time[datetime]',
      '.published-date',
      '.post-date',
      '.date'
    ]
    
    for (const selector of dateSelectors) {
      const element = $(selector).first()
      if (element.length > 0) {
        const date = element.attr('content') || 
                     element.attr('datetime') ||
                     element.text().trim()
        if (date) {
          info.publishDate = date
          break
        }
      }
    }
    
    // Author
    const authorSelectors = [
      'meta[name="author"]',
      'meta[property="article:author"]',
      '.author-name',
      '.by-author',
      '[rel="author"]',
      '.author'
    ]
    
    for (const selector of authorSelectors) {
      const element = $(selector).first()
      if (element.length > 0) {
        const author = element.attr('content') || element.text().trim()
        if (author) {
          info.author = author
          break
        }
      }
    }
    
    // Categories/Tags
    const categories = new Set<string>()
    $('[rel="category"], [rel="tag"], .category, .tag, .post-tag').each((_, el) => {
      const text = $(el).text().trim()
      if (text) categories.add(text)
    })
    if (categories.size > 0) {
      info.categories = Array.from(categories)
    }
    
    return info
  }

  /**
   * Log debug information
   * 
   * @param message - Message to log
   * @param data - Additional data
   */
  private log(message: string, data?: any): void {
    if (this.config.debug) {
      permanentLogger.info(`STRATEGY_STATIC`, message, data)
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.cache.clear()
  }
}

// For backward compatibility with existing code that expects detect to have optional page parameter
export interface IStaticStrategy {
  detect(url: string, page?: any): Promise<number>
  execute(url: string, context?: any): Promise<ScrapingResult>
  getName(): string
  cleanup(): void
}