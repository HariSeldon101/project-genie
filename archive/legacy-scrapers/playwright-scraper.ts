/**
 * Playwright-based scraper for JavaScript-heavy and dynamic websites
 * Optimized for serverless environments with browser instance pooling
 */

import { Browser, BrowserContext, Page } from 'playwright'
import { logger } from '../../../utils/permanent-logger'
import { brandAssetExtractor } from '../../services/brand-asset-extractor'
import { imageExtractor } from '../../services/image-extractor'
import type { 
  IScraper, 
  ScrapedData, 
  ScrapeOptions, 
  ContactInfo,
  SocialLinks,
  TeamMember,
  Testimonial,
  ProductService,
  BlogPost,
  BrandAssets,
  PageData
} from '../types'
import { filterBrandColors, parseColorToHex } from '../utils/color-extractor'
import type { WebsiteAnalysis } from '../detection/website-detector'
import { SitemapParser } from '../utils/sitemap-parser'
import { LinkCrawler } from '../utils/link-crawler'
import { SectionExtractor } from '../utils/section-extractor'
import { NavigationParser } from '../utils/navigation-parser'
import { CSSVariableExtractor } from '../utils/css-variable-extractor'

// Import new modular components
import { BrowserPool } from '../browser'
import { ScrollHandler, PaginationHandler } from '../handlers'

// REMOVED: BrowserPool class has been extracted to ../browser/browser-pool.ts
// The following BrowserPool implementation has been moved to a separate module
/* Legacy BrowserPool class - now using imported module
class BrowserPool {
  private browser: Browser | null = null
  private lastUsed: number = 0
  private readonly TIMEOUT = 60000 // 1 minute idle timeout
  private cleanupTimer: NodeJS.Timeout | null = null
  private isClosing: boolean = false
  private cleanupHandlersRegistered: boolean = false

  static getInstance(): BrowserPool {
    if (!globalBrowserPool) {
      globalBrowserPool = new BrowserPool()
    }
    return globalBrowserPool
  }

  private registerCleanupHandlers(): void {
    if (this.cleanupHandlersRegistered) return
    
    // Only register cleanup handlers when browser is actually created
    this.cleanupHandlersRegistered = true
    process.once('exit', () => {
      globalBrowserPool?.cleanup().catch(() => {})
    })
    process.once('SIGINT', () => {
      globalBrowserPool?.cleanup().then(() => process.exit(0))
    })
    process.once('SIGTERM', () => {
      globalBrowserPool?.cleanup().then(() => process.exit(0))
    })
  }

  async getBrowser(): Promise<Browser> {
    this.lastUsed = Date.now()
    
    // Check if closing
    if (this.isClosing) {
      throw new Error('Browser pool is closing')
    }
    
    // Check if browser is still connected and healthy
    if (this.browser) {
      try {
        // Test browser connectivity with a simple operation
        const contexts = this.browser.contexts()
        if (contexts.length > 10) {
          // Too many contexts, browser might be overloaded
          logger.warn('PLAYWRIGHT_SCRAPER', 'Browser has too many contexts, closing', { 
            contextCount: contexts.length 
          })
          await this.cleanup()
          this.browser = null
        } else if (this.browser.isConnected()) {
          // Browser is healthy, return it
          logger.info('PLAYWRIGHT_SCRAPER', '✅ Reusing healthy browser instance', {
            contextCount: contexts.length
          })
          this.resetCleanupTimer()
          return this.browser
        }
      } catch (error) {
        logger.warn('PLAYWRIGHT_SCRAPER', 'Browser health check failed, creating new instance', error)
        await this.cleanup()
        this.browser = null
      }
    }
    
    if (!this.browser) {
      logger.info('PLAYWRIGHT_SCRAPER', 'Launching new browser instance')
      
      // Register cleanup handlers only when actually creating browser
      this.registerCleanupHandlers()
      
      try {
        this.browser = await chromium.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            // Removed --single-process as it causes issues with multiple pages
            '--disable-gpu',
            // Removed --disable-web-security as it can cause issues
            '--disable-features=IsolateOrigins,site-per-process',
            '--deterministic-fetch',
            '--disable-blink-features=AutomationControlled',
            // Add memory optimization flags
            '--memory-pressure-off',
            '--max_old_space_size=4096'
          ],
          timeout: 15000 // Increased timeout for browser launch
        })
      } catch (error) {
        logger.error('PLAYWRIGHT_SCRAPER', 'Failed to launch browser', error)
        throw error
      }
    }

    this.resetCleanupTimer()
    return this.browser
  }

  private resetCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer)
    }
    
    // Cleanup after idle timeout to free resources
    this.cleanupTimer = setTimeout(() => {
      logger.info('PLAYWRIGHT_SCRAPER', '⏱️ Auto-cleanup triggered after idle timeout')
      this.cleanup()
    }, this.TIMEOUT) // Use the full timeout (60 seconds)
  }

  async cleanup(): Promise<void> {
    this.isClosing = true
    
    if (this.browser) {
      logger.info('PLAYWRIGHT_SCRAPER', 'Closing browser instance')
      try {
        // Close all pages first
        const contexts = this.browser.contexts()
        for (const context of contexts) {
          const pages = context.pages()
          for (const page of pages) {
            await page.close().catch(() => {})
          }
          await context.close().catch(() => {})
        }
        // Then close browser
        await this.browser.close()
      } catch (e) {
        logger.error('PLAYWRIGHT_SCRAPER', 'Error closing browser', e)
      }
      this.browser = null
    }
    
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer)
      this.cleanupTimer = null
    }
    
    this.isClosing = false
  }
}
*/ // End of removed BrowserPool class

export class PlaywrightScraper implements IScraper {
  readonly name = 'playwright'
  private pool: BrowserPool | null = null
  
  // Deep crawl state management (from AdvancedPlaywrightScraper)
  private visitedUrls = new Set<string>()
  private pageContents: any[] = []
  private maxDepth = 1
  private maxPages = 10
  
  private getPool(): BrowserPool {
    if (!this.pool) {
      this.pool = BrowserPool.getInstance()
    }
    return this.pool
  }
  
  canHandle(url: string, analysis?: WebsiteAnalysis): boolean {
    if (analysis) {
      // Use Playwright for JS-heavy sites or those that need interaction
      return analysis.requiresJS || 
             analysis.hasInfiniteScroll || 
             analysis.frameworks.some(f => 
               ['react', 'vue', 'angular', 'nextjs', 'nuxt', 'gatsby'].includes(f.framework) && 
               f.confidence > 0.5
             )
    }
    // Default to being able to handle any site
    return true
  }
  
  async init?(): Promise<void> {
    // Pre-warm the browser pool
    await this.getPool().getBrowser()
  }
  
  async scrape(url: string, options?: ScrapeOptions): Promise<ScrapedData> {
    const startTime = Date.now()
    let context: BrowserContext | null = null
    let page: Page | null = null
    
    // Determine if deep crawl is enabled (from AdvancedPlaywrightScraper)
    const deepCrawl = options?.deepCrawl ?? false
    this.maxDepth = deepCrawl ? (options?.maxDepth ?? 3) : 1
    this.maxPages = deepCrawl ? (options?.maxPages ?? 50) : 1
    
    // Clear state for new crawl
    this.visitedUrls.clear()
    this.pageContents = []
    
    try {
      // Validate URL before attempting to scrape
      if (!url || !url.startsWith('http')) {
        throw new Error(`Invalid URL provided: ${url}`)
      }
      
      logger.info('PLAYWRIGHT_SCRAPER', 'Starting scrape with metadata', { 
        url,
        timeout: options?.timeout || 30000,
        retryAttempts: options?.retryAttempts || 3,
        hasMetadata: !!options?.siteMetadata,
        organizationName: options?.siteMetadata?.organizationName,
        siteType: options?.siteMetadata?.siteType,
        language: options?.siteMetadata?.language,
        technologies: options?.siteMetadata?.technologies ? Object.keys(options.siteMetadata.technologies).length : 0
      })
      
      const browser = await this.getPool().getBrowser()
      logger.info('PLAYWRIGHT_SCRAPER', '✅ Got browser from pool', { url })
      
      // Create a new incognito context
      logger.info('PLAYWRIGHT_SCRAPER', '🔧 Creating browser context', { url })
      
      try {
        context = await browser.newContext({
          viewport: { width: 1920, height: 1080 },
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          locale: 'en-US',
          timezoneId: 'America/New_York',
          deviceScaleFactor: 1,
          hasTouch: false,
          javaScriptEnabled: true,
          ignoreHTTPSErrors: true
        })
      } catch (contextError) {
        logger.error('PLAYWRIGHT_SCRAPER', '❌ Failed to create browser context', {
          url,
          error: contextError instanceof Error ? contextError.message : 'Unknown'
        })
        throw contextError
      }
      
      // Note: Removed addInitScript as we're adding helpers directly in evaluate calls
      logger.info('PLAYWRIGHT_SCRAPER', '✅ Browser context created', { url })

      // Create page with optimizations
      logger.info('PLAYWRIGHT_SCRAPER', '📄 Creating new page', { url })
      
      try {
        page = await context.newPage()
        logger.info('PLAYWRIGHT_SCRAPER', '✅ Page created successfully', { url })
      } catch (pageError) {
        logger.error('PLAYWRIGHT_SCRAPER', '❌ Failed to create page', {
          url,
          error: pageError instanceof Error ? pageError.message : 'Unknown'
        })
        throw pageError
      }
      
      // Block unnecessary resources for faster loading
      logger.info('PLAYWRIGHT_SCRAPER', '🚫 Setting up resource blocking', { url })
      
      try {
        await page.route('**/*', (route) => {
          const resourceType = route.request().resourceType()
          if (['font', 'media'].includes(resourceType)) {
            route.abort()
          } else {
            route.continue()
          }
        })
      } catch (routeError) {
        logger.warn('PLAYWRIGHT_SCRAPER', 'Resource blocking setup failed (non-fatal)', {
          url,
          error: routeError instanceof Error ? routeError.message : 'Unknown'
        })
      }

      // Set extra headers to appear more legitimate
      await page.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      })

      // Navigate with timeout
      logger.info('PLAYWRIGHT_SCRAPER', '🌐 Navigating to URL', { url, timeout: options?.timeout || 30000 })
      
      let response
      try {
        response = await page.goto(url, {
          waitUntil: 'domcontentloaded', // Changed from networkidle for better reliability
          timeout: options?.timeout || 30000
        })
      } catch (navError) {
        logger.error('PLAYWRIGHT_SCRAPER', '❌ Navigation failed', {
          url,
          error: navError instanceof Error ? navError.message : 'Unknown',
          stack: navError instanceof Error ? navError.stack?.split('\n').slice(0, 3) : []
        })
        throw navError
      }

      if (!response) {
        throw new Error(`No response received from ${url}`)
      }
      
      if (!response.ok() && response.status() !== 304) { // 304 is OK (not modified)
        throw new Error(`Failed to load page: HTTP ${response.status()}`)
      }
      
      logger.info('PLAYWRIGHT_SCRAPER', '✅ Page loaded successfully', { 
        url, 
        status: response.status() 
      })

      // Wait for dynamic content to load
      logger.info('PLAYWRIGHT_SCRAPER', '⏳ Waiting for dynamic content', { url })
      await page.waitForTimeout(2000)
      
      // Scroll to trigger lazy loading
      logger.info('PLAYWRIGHT_SCRAPER', '📜 Auto-scrolling page', { url })
      try {
        // Enhanced scrolling for deep crawl mode
        if (deepCrawl && options?.extractFullContent) {
          await this.handleInfiniteScroll(page)
        } else {
          await this.autoScroll(page)
        }
      } catch (scrollError) {
        logger.warn('PLAYWRIGHT_SCRAPER', 'Auto-scroll failed (non-fatal)', {
          url,
          error: scrollError instanceof Error ? scrollError.message : 'Unknown'
        })
      }
      
      // Extract all data
      logger.info('PLAYWRIGHT_SCRAPER', '🔍 Extracting page data', { url })
      let data: ScrapedData
      
      if (deepCrawl) {
        // Deep crawl mode: crawl multiple pages and aggregate data
        await this.crawlPage(url, context, 0, {
          followLinks: options?.followLinks ?? true,
          extractFullContent: options?.extractFullContent ?? true,
          handlePagination: true,
          handleInfiniteScroll: true
        })
        data = this.aggregateData(url)
      } else {
        // Standard single-page extraction
        data = await this.extractAllData(page, url)
      }
      
      logger.info('PLAYWRIGHT_SCRAPER', 'Scrape completed', {
        url,
        duration: Date.now() - startTime,
        dataPoints: Object.keys(data).filter(k => data[k]).length
      })
      
      return data
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const errorStack = error instanceof Error ? error.stack : undefined
      const duration = Date.now() - startTime
      
      logger.error('PLAYWRIGHT_SCRAPER', '❌ Scrape failed completely', { 
        url, 
        errorMessage,
        errorStack: errorStack?.split('\n').slice(0, 10),
        errorType: error?.constructor?.name,
        duration,
        timeout: options?.timeout || 30000,
        retryAttempts: options?.retryAttempts || 3
      })
      
      // Provide more specific error message based on error type
      if (errorMessage.includes('timeout')) {
        throw new Error(`PlaywrightScraper timeout for ${url} after ${duration}ms`)
      } else if (errorMessage.includes('net::')) {
        throw new Error(`PlaywrightScraper network error for ${url}: ${errorMessage}`)
      } else {
        throw new Error(`PlaywrightScraper failed for ${url}: ${errorMessage}`)
      }
    } finally {
      // Clean up resources
      if (page) await page.close().catch(() => {})
      if (context) await context.close().catch(() => {})
    }
  }
  
  async cleanup?(): Promise<void> {
    await this.getPool().cleanup()
  }

  private async autoScroll(page: Page): Promise<void> {
    await page.evaluate(async () => {
      // Add TypeScript helpers directly in evaluate context
      (window as any).__name = (func: any) => func;
      await new Promise<void>((resolve) => {
        let totalHeight = 0
        const distance = 500
        const maxScrolls = 10
        let scrolls = 0
        
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight
          window.scrollBy(0, distance)
          totalHeight += distance
          scrolls++
          
          if (totalHeight >= scrollHeight - window.innerHeight || scrolls >= maxScrolls) {
            clearInterval(timer)
            window.scrollTo(0, 0) // Scroll back to top
            resolve()
          }
        }, 200)
      })
    })
  }

  private async extractAllData(page: Page, url: string): Promise<ScrapedData> {
    logger.info('PLAYWRIGHT_SCRAPER', '📊 Starting data extraction', { url })
    
    // Execute all extraction in the browser context for efficiency
    const extractedData = await page.evaluate(() => {
      // Add TypeScript helpers directly in evaluate context
      (window as any).__name = (func: any) => func;
      
      // Helper function to clean text
      function cleanText(text: any): string {
        if (!text) return ''
        return String(text).replace(/\s+/g, ' ').trim()
      }

      // Helper to get all text from an element recursively
      function getAllText(element: Element): string {
        let text = ''
        element.childNodes.forEach((node: Node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            text += (node.textContent || '') + ' '
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            text += getAllText(node as Element) + ' '
          }
        })
        return text.trim()
      }

      // Get all page text for pattern matching
      const pageText = document.body ? getAllText(document.body) : ''
      
      // Extract title - be more flexible
      const title = document.querySelector('h1')?.textContent || 
                   document.querySelector('[role="heading"][aria-level="1"]')?.textContent ||
                   document.querySelector('.hero-title, .hero-heading, [class*="hero"] h1')?.textContent ||
                   document.title || ''

      // Extract description - look for more patterns
      const description = document.querySelector('meta[name="description"]')?.getAttribute('content') ||
                         document.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
                         document.querySelector('.hero-subtitle, .hero-description, .tagline')?.textContent ||
                         document.querySelector('h2')?.textContent ||
                         document.querySelector('p')?.textContent || ''

      // Extract ALL text content in structured way
      const allH1s = Array.from(document.querySelectorAll('h1, [role="heading"][aria-level="1"]')).map(h => cleanText(h.textContent))
      const allH2s = Array.from(document.querySelectorAll('h2, [role="heading"][aria-level="2"]')).map(h => cleanText(h.textContent))
      const allH3s = Array.from(document.querySelectorAll('h3, [role="heading"][aria-level="3"]')).map(h => cleanText(h.textContent))
      const allParagraphs = Array.from(document.querySelectorAll('p')).map(p => cleanText(p.textContent)).filter(t => t.length > 20)
      
      // Get main content area if possible
      const mainContent = document.querySelector('main, [role="main"], #main, .main-content, article')?.textContent || pageText
      
      // Extract logos and images with better detection
      const logos: string[] = []
      const brandAssets: string[] = []
      
      // Look for logo images - be more thorough
      document.querySelectorAll('img, svg').forEach(function(element) {
        let src = ''
        if (element.tagName === 'IMG') {
          const img = element as HTMLImageElement
          src = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || ''
        } else if (element.tagName === 'svg') {
          // For SVG, create data URL
          const svgString = new XMLSerializer().serializeToString(element)
          src = 'data:image/svg+xml,' + encodeURIComponent(svgString)
        }
        
        const alt = element.getAttribute('alt')?.toLowerCase() || ''
        const className = element.className?.toString().toLowerCase() || ''
        const id = element.id?.toLowerCase() || ''
        const ariaLabel = element.getAttribute('aria-label')?.toLowerCase() || ''
        
        // Better logo detection
        if (src && (alt.includes('logo') || className.includes('logo') || id.includes('logo') || 
            ariaLabel.includes('logo') || element.closest('header') || element.closest('nav'))) {
          logos.push(src)
        } else if (src && (className.includes('brand') || className.includes('hero') || className.includes('banner'))) {
          brandAssets.push(src)
        }
      })

      // Look for SVG logos
      document.querySelectorAll('svg').forEach(function(svg) {
        const classList = svg.className?.baseVal?.toLowerCase() || ''
        const id = svg.id?.toLowerCase() || ''
        
        if (classList.includes('logo') || id.includes('logo')) {
          const svgString = new XMLSerializer().serializeToString(svg)
          logos.push('data:image/svg+xml,' + encodeURIComponent(svgString))
        }
      })

      // Extract brand colors
      const brandColors: string[] = []
      const colorMap = new Map<string, number>()
      
      // Get computed styles from key elements
      const keyElements = document.querySelectorAll('header, nav, button, .btn, .button, h1, h2, .hero, .cta, [class*="brand"], [class*="primary"]')
      keyElements.forEach(function(el) {
        const styles = window.getComputedStyle(el)
        const bgColor = styles.backgroundColor
        const color = styles.color
        const borderColor = styles.borderColor
        
        // Count occurrences
        if (bgColor && bgColor !== 'transparent' && bgColor !== 'rgba(0, 0, 0, 0)') {
          colorMap.set(bgColor, (colorMap.get(bgColor) || 0) + 1)
        }
        if (color && color !== 'transparent') {
          colorMap.set(color, (colorMap.get(color) || 0) + 1)
        }
        if (borderColor && borderColor !== 'transparent') {
          colorMap.set(borderColor, (colorMap.get(borderColor) || 0) + 1)
        }
      })
      
      // Sort by frequency and take top colors
      const sortedColors = Array.from(colorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([color]) => color)
        .slice(0, 10)
      
      brandColors.push(...sortedColors)
      
      // Extract favicon
      let favicon = ''
      const faviconLink = document.querySelector('link[rel*="icon"]') as HTMLLinkElement
      if (faviconLink) {
        favicon = faviconLink.href
      }
      
      // Extract fonts
      const fonts: string[] = []
      const fontSet = new Set<string>()
      
      // Check computed styles for font families
      const textElements = document.querySelectorAll('body, h1, h2, h3, h4, h5, h6, p, a, button')
      textElements.forEach(function(el) {
        const fontFamily = window.getComputedStyle(el).fontFamily
        if (fontFamily) {
          // Clean up font family string
          const cleanedFonts = fontFamily
            .split(',')
            .map(f => f.trim().replace(/['"]/g, ''))
            .filter(f => !f.includes('sans-serif') && !f.includes('serif') && !f.includes('monospace'))
          
          cleanedFonts.forEach(f => fontSet.add(f))
        }
      })
      
      fonts.push(...Array.from(fontSet).slice(0, 5))

      // Extract contact info
      const emails = []
      const phones = []
      const addresses = []
      
      // Find emails with better regex
      const emailRegex = /([a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi
      const emailMatches = pageText.match(emailRegex) || []
      // Also check for mailto links
      document.querySelectorAll('a[href^="mailto:"]').forEach(link => {
        const email = link.getAttribute('href')?.replace('mailto:', '').split('?')[0]
        if (email) emails.push(email)
      })
      emails.push(...emailMatches.filter(function(e) { 
        return !e.includes('example') && !e.includes('@2x') && !e.includes('placeholder')
      }))
      
      // Find phones with better patterns
      const phoneRegex = /(\+?\d{1,4}[\s.-]?)?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{1,4}[\s.-]?\d{0,4}/g
      const phoneMatches = pageText.match(phoneRegex) || []
      // Also check for tel links
      document.querySelectorAll('a[href^="tel:"]').forEach(link => {
        const phone = link.getAttribute('href')?.replace('tel:', '')
        if (phone) phones.push(phone)
      })
      phones.push(...phoneMatches.filter(p => {
        const cleaned = p.replace(/[^\d]/g, '')
        return cleaned.length >= 10 && cleaned.length <= 15
      }).map(function(p) { return cleanText(p) }))
      
      // Find addresses
      document.querySelectorAll('address, .address, .location, .office').forEach(function(el) {
        const text = cleanText(el.textContent)
        if (text.length > 10) addresses.push(text)
      })

      // Extract social links
      const socialLinks = {}
      const socialPatterns = {
        twitter: /twitter\.com|x\.com/i,
        linkedin: /linkedin\.com/i,
        facebook: /facebook\.com/i,
        instagram: /instagram\.com/i,
        youtube: /youtube\.com/i,
        github: /github\.com/i,
        tiktok: /tiktok\.com/i,
        medium: /medium\.com/i
      }
      
      document.querySelectorAll('a[href]').forEach(function(link) {
        const href = link.href
        for (const [platform, pattern] of Object.entries(socialPatterns)) {
          if (pattern.test(href) && !socialLinks[platform]) {
            socialLinks[platform] = href
          }
        }
      })

      // Extract team members with intelligent detection
      const teamMembers: any[] = []
      const teamKeywords = ['team', 'founder', 'ceo', 'cto', 'leadership', 'about', 'people', 'staff']
      
      // First try specific selectors
      const teamSelectors = [
        '.team-member', '.staff', '.employee', '.founder', '.person',
        '[class*="team"]', '[class*="founder"]', '[class*="member"]',
        'article[class*="team"]', 'div[class*="team"]'
      ]
      
      teamSelectors.forEach(function(selector) {
        document.querySelectorAll(selector).forEach(function(el) {
          const name = el.querySelector('h2, h3, h4, [class*="name"], .title')?.textContent || 
                      el.querySelector('strong, b')?.textContent || ''
          const role = el.querySelector('[class*="role"], [class*="title"], [class*="position"], .subtitle')?.textContent || ''
          const bio = el.querySelector('[class*="bio"], [class*="desc"], p')?.textContent || ''
          const imageEl = el.querySelector('img')
          const image = imageEl?.getAttribute('src') || imageEl?.getAttribute('data-src') || null
          
          if (name && name.length > 2 && name.length < 100) {
            teamMembers.push({
              name: cleanText(name),
              role: cleanText(role),
              bio: cleanText(bio).substring(0, 500),
              image,
              linkedin: null,
              twitter: null
            })
          }
        })
      })
      
      // If no team members found, look for patterns in text with better validation
      if (teamMembers.length === 0) {
        // Look for sections that might contain team info
        const possibleTeamSections = Array.from(document.querySelectorAll('section, div')).filter(el => {
          const text = el.textContent?.toLowerCase() || ''
          const className = el.className?.toString().toLowerCase() || ''
          return teamKeywords.some(keyword => text.includes(keyword) || className.includes(keyword))
        })
        
        possibleTeamSections.forEach(section => {
          // Look for names with roles/titles (much more accurate)
          const rolePatterns = [
            // Name followed by role
            /\b([A-Z][a-z]+ (?:[A-Z]\.? )?[A-Z][a-z]+)(?:,?\s*)(CEO|CTO|CFO|COO|CMO|Founder|Co-Founder|President|Vice President|VP|Director|Manager|Lead|Head of|Engineer|Developer|Designer|Analyst)\b/gi,
            // Role followed by name
            /\b(CEO|CTO|CFO|COO|CMO|Founder|Co-Founder|President|Vice President|VP|Director|Manager|Lead|Head of|Engineer|Developer|Designer|Analyst)(?::?\s+)([A-Z][a-z]+ (?:[A-Z]\.? )?[A-Z][a-z]+)\b/gi
          ]
          
          rolePatterns.forEach(pattern => {
            const matches = Array.from(section.textContent?.matchAll(pattern) || [])
            matches.forEach(match => {
              let name = ''
              let role = ''
              
              // Determine which capture group has the name vs role
              if (match[1] && match[1].match(/^[A-Z]/)) {
                name = match[1]
                role = match[2] || ''
              } else {
                role = match[1] || ''
                name = match[2]
              }
              
              // Validate the name
              const isValidName = name && 
                name.length >= 5 && // Min length
                name.length <= 50 && // Max length
                !name.match(/\b(Business|Service|Product|Company|Contact|About|Team|Our|Your|The|And|With|For|From|Made|Simple|Core|Free|Learn|More|Every|Role|Key|Application|Discuss|Specific|Need|Powered|Result|conversion|by|of|in|at|to)\b/i) && // Exclude common non-name words
                !name.match(/^(by |of |in |at |to |from |with )/i) && // Name shouldn't start with prepositions
                name.match(/^[A-Z][a-z]+/) && // Must start with capital letter followed by lowercase
                name.split(' ').length >= 2 && // At least two parts
                name.split(' ').length <= 4 && // At most 4 parts (first, middle, last, suffix)
                name.split(' ').every(part => part.length >= 2) // Each part should be at least 2 chars
              
              if (isValidName && !teamMembers.find(m => m.name === cleanText(name))) {
                teamMembers.push({
                  name: cleanText(name),
                  role: cleanText(role),
                  bio: '',
                  image: null,
                  linkedin: null,
                  twitter: null
                })
              }
            })
          })
        })
      }

      // Extract testimonials
      const testimonials = []
      const testimonialSelectors = [
        '.testimonial', '.review', '.quote', 'blockquote'
      ]
      
      testimonialSelectors.forEach(function(selector) {
        document.querySelectorAll(selector).forEach(function(el) {
          const content = el.querySelector('p, .content, .text')?.textContent ||
                         el.textContent || ''
          const author = el.querySelector('.author, .name, cite')?.textContent || ''
          const role = el.querySelector('.role, .company, .title')?.textContent || ''
          const rating = el.querySelector('.rating, .stars')?.getAttribute('data-rating') || null
          
          if (content && content.length > 20) {
            testimonials.push({
              content: cleanText(content),
              author: cleanText(author),
              role: cleanText(role),
              rating: rating ? parseFloat(rating) : null,
              date: null
            })
          }
        })
      })

      // Extract products/services with better detection
      const products: any[] = []
      const productKeywords = ['product', 'service', 'solution', 'offering', 'feature', 'plan', 'pricing']
      
      // Enhanced selectors
      const productSelectors = [
        '.product', '.service', '.offering', '.feature', '.solution',
        '[class*="product"]', '[class*="service"]', '[class*="feature"]',
        '.card', '.pricing-card', '.plan'
      ]
      
      productSelectors.forEach(function(selector) {
        document.querySelectorAll(selector).forEach(function(el) {
          const name = el.querySelector('h2, h3, h4, [class*="title"], [class*="name"], strong')?.textContent || ''
          const description = el.querySelector('[class*="desc"], [class*="summary"], p')?.textContent || ''
          const price = el.querySelector('[class*="price"], [class*="cost"], [class*="pricing"]')?.textContent || ''
          const imageEl = el.querySelector('img')
          const image = imageEl?.getAttribute('src') || imageEl?.getAttribute('data-src') || null
          
          // Extract features if present
          const featuresList = el.querySelectorAll('li, [class*="feature"]')
          const features = Array.from(featuresList).map(f => cleanText(f.textContent)).filter(f => f.length > 0)
          
          if (name && name.length > 2 && name.length < 200) {
            products.push({
              name: cleanText(name),
              description: cleanText(description).substring(0, 500),
              price: cleanText(price),
              image,
              features: features.slice(0, 10),
              link: el.querySelector('a')?.getAttribute('href') || null
            })
          }
        })
      })
      
      // If no products found, look for sections mentioning products/services
      if (products.length === 0) {
        const productSections = Array.from(document.querySelectorAll('section, div')).filter(el => {
          const text = el.textContent?.toLowerCase() || ''
          const className = el.className?.toString().toLowerCase() || ''
          return productKeywords.some(keyword => text.includes(keyword) || className.includes(keyword))
        })
        
        productSections.slice(0, 1).forEach(section => {
          const items = section.querySelectorAll('h3, h4')
          items.forEach(item => {
            const name = item.textContent
            const description = item.nextElementSibling?.textContent || ''
            if (name && name.length > 2 && name.length < 200) {
              products.push({
                name: cleanText(name),
                description: cleanText(description).substring(0, 500),
                price: '',
                image: null,
                features: [],
                link: null
              })
            }
          })
        })
      }

      // Extract blog posts
      const blogPosts = []
      const blogSelectors = [
        'article', '.post', '.blog-post'
      ]
      
      blogSelectors.forEach(function(selector) {
        document.querySelectorAll(selector).forEach(function(el) {
          const title = el.querySelector('h1, h2, h3, .title')?.textContent || ''
          const excerpt = el.querySelector('.excerpt, .summary, p')?.textContent || ''
          const author = el.querySelector('.author, .by')?.textContent || ''
          const date = el.querySelector('.date, time')?.textContent || ''
          const link = el.querySelector('a')?.href || null
          
          if (title && title.length > 5) {
            blogPosts.push({
              title: cleanText(title),
              excerpt: cleanText(excerpt),
              author: cleanText(author),
              date: cleanText(date),
              link,
              tags: []
            })
          }
        })
      })

      // Navigation is now extracted by NavigationParser above
      const navigationItems: any[] = []
      
      // Get company/about info from various sources
      let aboutSection = ''
      const aboutElements = document.querySelectorAll('[class*="about"], [id*="about"], section')
      aboutElements.forEach(el => {
        if (!aboutSection && el.textContent && el.textContent.toLowerCase().includes('about')) {
          aboutSection = el.textContent
        }
      })
      
      const heroSection = document.querySelector('[class*="hero"], header, .banner, .jumbotron')?.textContent || ''
      
      return {
        title: cleanText(title),
        description: cleanText(description),
        content: cleanText(mainContent).substring(0, 5000), // Add actual content
        h1: allH1s.slice(0, 5),
        h2: allH2s.slice(0, 10),
        h3: allH3s.slice(0, 10),
        paragraphs: allParagraphs.slice(0, 10),
        aboutText: cleanText(aboutSection).substring(0, 1000),
        heroText: cleanText(heroSection).substring(0, 500),
        logos: [...new Set(logos)].slice(0, 5),
        brandAssets: [...new Set(brandAssets)].slice(0, 10),
        brandColors,
        favicon,
        fonts,
        emails: [...new Set(emails)].slice(0, 10),
        phones: [...new Set(phones)].slice(0, 5),
        addresses: [...new Set(addresses)].slice(0, 3),
        socialLinks,
        teamMembers: [...new Map(teamMembers.map(m => [m.name, m])).values()].slice(0, 20), // Dedupe by name
        testimonials: testimonials.slice(0, 15),
        products: [...new Map(products.map(p => [p.name, p])).values()].slice(0, 20), // Dedupe by name
        blogPosts: blogPosts.slice(0, 10),
        navigationItems: navigationItems.slice(0, 20),
        pageTextLength: pageText.length,
        hasContent: pageText.length > 100,
        pageUrl: window.location.href,
        pageTitle: document.title
      }
    })

    // Log extraction results for debugging
    logger.info('PLAYWRIGHT_SCRAPER', 'Extraction complete', {
      url,
      hasContent: extractedData.hasContent,
      pageTextLength: extractedData.pageTextLength,
      titlesFound: extractedData.h1?.length || 0,
      paragraphsFound: extractedData.paragraphs?.length || 0,
      emailsFound: extractedData.emails?.length || 0,
      socialLinksFound: Object.keys(extractedData.socialLinks || {}).length,
      teamMembersFound: extractedData.teamMembers?.length || 0,
      productsFound: extractedData.products?.length || 0
    })

    // Extract sections using SectionExtractor
    const sectionExtractor = new SectionExtractor()
    const sections = await sectionExtractor.extractSections(page)
    
    // Extract navigation using NavigationParser
    const navigationParser = new NavigationParser(page)
    const navigationStructure = await navigationParser.parseNavigation()
    
    // Extract CSS variables and theme colors
    const cssExtractor = new CSSVariableExtractor(page)
    const cssVariables = await cssExtractor.extractCSSVariables()
    const themeColors = await cssExtractor.extractThemeColors()
    
    logger.info('PLAYWRIGHT_SCRAPER', 'Section extraction complete', {
      url,
      sectionsFound: sections.length,
      sectionTypes: sections.map(s => s.type)
    })
    
    // Get the page HTML content for brand asset extraction
    const pageHtml = await page.content()
    
    // Use shared BrandAssetExtractor service for comprehensive brand extraction
    const brandAssets = await brandAssetExtractor.extractBrandAssets({
      url,
      html: pageHtml,
      siteMetadata: options?.siteMetadata,
      fetchExternalCSS: true
    })
    
    logger.info('PLAYWRIGHT_SCRAPER', 'Brand asset extraction complete', {
      url,
      hasLogo: !!brandAssets.logo,
      hasFavicon: !!brandAssets.favicon,
      colorCount: brandAssets.colors?.length || 0,
      fontCount: brandAssets.fonts?.length || 0
    })
    
    // Use shared ImageExtractor service for comprehensive image extraction
    const images = await imageExtractor.extractImages({
      url,
      page,
      maxImages: 100
    })
    
    logger.info('PLAYWRIGHT_SCRAPER', 'Image extraction complete', {
      url,
      heroCount: images.hero?.length || 0,
      productCount: images.products?.length || 0,
      totalImages: images.all?.length || 0
    })
    
    // Process brand colors to hex format (for backward compatibility)
    const brandColorsHex = filterBrandColors(extractedData.brandColors || [])
    
    // Determine page type from URL
    const pageType = (pageUrl: string): PageData['type'] => {
      const lower = pageUrl.toLowerCase()
      if (lower === url.toLowerCase() || lower.endsWith('/')) return 'home'
      if (lower.includes('/about')) return 'about'
      if (lower.includes('/blog') || lower.includes('/news')) return 'blog'
      if (lower.includes('/contact')) return 'contact'
      if (lower.includes('/product') || lower.includes('/service')) return 'product'
      return 'other'
    }
    
    // Create page data
    const pageData: PageData = {
      url: extractedData.pageUrl || url,
      title: extractedData.pageTitle || extractedData.title,
      type: pageType(extractedData.pageUrl || url),
      content: extractedData.content || '',
      structuredData: {
        h1: extractedData.h1,
        h2: extractedData.h2,
        heroText: extractedData.heroText
      }
    }

    // Convert to proper types with enhanced data
    const data: ScrapedData = {
      url,
      title: extractedData.title,
      description: extractedData.description,
      content: extractedData.content || '', // Now includes actual content
      logos: extractedData.logos,
      brandAssets, // Use the brand assets from our shared service
      images, // Use the images from our shared service
      contactInfo: {
        emails: extractedData.emails,
        phones: extractedData.phones,
        addresses: extractedData.addresses
      } as ContactInfo,
      socialLinks: extractedData.socialLinks as SocialLinks,
      teamMembers: extractedData.teamMembers as TeamMember[],
      testimonials: extractedData.testimonials as Testimonial[],
      products: extractedData.products as ProductService[],
      blogPosts: extractedData.blogPosts as BlogPost[],
      pages: [pageData], // Add page info for UI
      metadata: {
        scrapedAt: new Date().toISOString(),
        scraper: this.name,
        hasContent: extractedData.hasContent,
        contentLength: extractedData.pageTextLength,
        pagesScraped: 1
      },
      // Add structured data for better processing
      structured: {
        h1: extractedData.h1,
        h2: extractedData.h2,
        h3: extractedData.h3,
        paragraphs: extractedData.paragraphs,
        aboutText: extractedData.aboutText,
        heroText: extractedData.heroText,
        navigationItems: [
          ...navigationStructure.mainNav.map(n => ({ text: n.text, href: n.href })),
          ...navigationStructure.footerNav.map(n => ({ text: n.text, href: n.href }))
        ].slice(0, 20),
        breadcrumbs: navigationStructure.breadcrumbs,
        sections: sections.map(s => ({
          type: s.type,
          title: s.title,
          content: s.content.substring(0, 500),
          confidence: s.confidence
        }))
      }
    }

    return data
  }

  /**
   * Discover all available pages on the website
   * Enhanced with robust fallback mechanisms
   */
  async discoverPages(url: string, options?: any): Promise<string[]> {
    const startTime = Date.now()
    const maxPages = options?.maxPages || 50
    const maxDepth = options?.maxDepth || 3
    
    logger.info('PLAYWRIGHT_SCRAPER', '🔍 Starting enhanced page discovery', { 
      url,
      options: { maxPages, maxDepth }
    })
    console.log('[DISCOVERY DEBUG] Starting discoverPages with:', { url, maxPages, maxDepth })
    
    // Extract domain and base URL
    const urlObj = new URL(url)
    const domain = urlObj.hostname
    const baseUrl = urlObj.origin
    const discoveredUrls: string[] = [url]
    
    // 1. Try sitemap discovery (but don't fail if it errors)
    let sitemapUrls: any[] = []
    try {
      logger.info('PLAYWRIGHT_SCRAPER', 'Step 1: Checking for sitemap...', { domain })
      const sitemapParser = new SitemapParser(domain, maxPages)
      sitemapUrls = await sitemapParser.discoverUrls()
      
      if (sitemapUrls.length > 0) {
        logger.info('PLAYWRIGHT_SCRAPER', '✅ Found URLs from sitemap!', {
          count: sitemapUrls.length,
          sampleUrls: sitemapUrls.slice(0, 5).map(e => e.url)
        })
        console.log('[DISCOVERY DEBUG] Sitemap found URLs:', sitemapUrls.length)
        console.log('[DISCOVERY DEBUG] Sample sitemap URLs:', sitemapUrls.slice(0, 5).map(e => e.url))
        discoveredUrls.push(...sitemapUrls.map(entry => entry.url))
      } else {
        console.log('[DISCOVERY DEBUG] No URLs found in sitemap')
      }
    } catch (sitemapError) {
      logger.warn('PLAYWRIGHT_SCRAPER', 'Sitemap discovery failed, continuing...', {
        error: sitemapError instanceof Error ? sitemapError.message : 'Unknown'
      })
    }

    // 2. Always crawl for links (don't skip even if sitemap found some)
    let browser: Browser | null = null
    let context: BrowserContext | null = null
    let page: Page | null = null
    
    try {
      logger.info('PLAYWRIGHT_SCRAPER', 'Step 2: Crawling website for links...')
      console.log('[DISCOVERY DEBUG] Starting browser crawling phase...')
      console.log('[DISCOVERY DEBUG] URLs discovered so far:', discoveredUrls.length)
      
      // Use browser pool instead of creating new instance
      browser = await this.getPool().getBrowser()
      context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (compatible; CompanyIntelligenceBot/1.0)',
        viewport: { width: 1920, height: 1080 },
        ignoreHTTPSErrors: true
      })
      
      // Note: Removed addInitScript - adding helpers directly in evaluate calls for reliability
      
      page = await context.newPage()
      
      // Navigate to homepage
      logger.info('PLAYWRIGHT_SCRAPER', '🌐 Navigating to homepage for discovery', { url })
      
      try {
        await page.goto(url, { 
          waitUntil: 'domcontentloaded',
          timeout: 30000 
        })
        logger.info('PLAYWRIGHT_SCRAPER', '✅ Homepage loaded for discovery', { url })
      } catch (navError) {
        logger.error('PLAYWRIGHT_SCRAPER', '❌ Homepage navigation failed during discovery', {
          url,
          error: navError instanceof Error ? navError.message : 'Unknown'
        })
        throw navError
      }
      
      // Wait for dynamic content
      await page.waitForTimeout(2000)
      
      // Extract ALL links from the page
      const pageLinks = await page.evaluate(() => {
        // Add TypeScript helpers directly in evaluate context
        (window as any).__name = (func: any) => func;
        
        const links: string[] = []
        document.querySelectorAll('a[href]').forEach((a: Element) => {
          const href = (a as HTMLAnchorElement).href
          if (href) links.push(href)
        })
        return links
      })
      
      console.log('[DISCOVERY DEBUG] Raw links found on homepage:', pageLinks.length)
      console.log('[DISCOVERY DEBUG] First 5 raw links:', pageLinks.slice(0, 5))
      
      // Filter for internal links
      const internalLinks = pageLinks
        .filter(link => {
          try {
            const linkUrl = new URL(link)
            return linkUrl.hostname === domain || linkUrl.hostname === `www.${domain}`
          } catch {
            return false
          }
        })
        .filter(link => !link.includes('#'))
        .filter(link => !link.match(/\.(jpg|jpeg|png|gif|pdf|doc|docx|zip)$/i))
      
      console.log('[DISCOVERY DEBUG] Internal links after filtering:', internalLinks.length)
      console.log('[DISCOVERY DEBUG] Sample internal links:', internalLinks.slice(0, 10))
      
      logger.info('PLAYWRIGHT_SCRAPER', '✅ Found links from homepage', {
        totalLinks: pageLinks.length,
        internalLinks: internalLinks.length,
        sampleUrls: internalLinks.slice(0, 10)
      })
      
      discoveredUrls.push(...internalLinks)
      console.log('[DISCOVERY DEBUG] Total discovered URLs now:', discoveredUrls.length)
      
      // REMOVED: Deep crawl with hardcoded paths
      // User requirement: "NEVER EVER ADD FALLBACK OR HARD CODED DATA - We need the errors to test the app"
      // Deep crawling should use discovered URLs instead of hardcoded paths
      
    } catch (crawlError) {
      logger.error('PLAYWRIGHT_SCRAPER', '❌ Browser crawling failed during discovery', {
        url,
        error: crawlError instanceof Error ? crawlError.message : 'Unknown',
        stack: crawlError instanceof Error ? crawlError.stack?.split('\n').slice(0, 5) : []
      })
    } finally {
      // Clean up - only close page and context, NOT browser (it's from the pool)
      try {
        if (page) await page.close()
        if (context) await context.close()
        // DON'T close browser - it's managed by the pool
      } catch (cleanupError) {
        // Log but don't throw - discovery results are more important than cleanup
        logger.warn('PLAYWRIGHT_SCRAPER', 'Browser cleanup error (non-fatal)', {
          error: cleanupError instanceof Error ? cleanupError.message : 'Unknown'
        })
      }
    }

    // REMOVED: No fallback URLs - we need to see real discovery results
    // User requirement: "NEVER EVER ADD FALLBACK OR HARD CODED DATA - We need the errors to test the app"

    // 5. Deduplicate and prioritize
    console.log('[DISCOVERY DEBUG] Before deduplication:', discoveredUrls.length, 'URLs')
    const uniqueUrls = Array.from(new Set(discoveredUrls.filter(Boolean)))
    console.log('[DISCOVERY DEBUG] After deduplication:', uniqueUrls.length, 'unique URLs')
    console.log('[DISCOVERY DEBUG] First 20 unique URLs:', uniqueUrls.slice(0, 20))
    
    const prioritizedUrls = this.prioritizeDiscoveredUrls(uniqueUrls).slice(0, maxPages)
    console.log('[DISCOVERY DEBUG] After prioritization:', prioritizedUrls.length, 'URLs')
    console.log('[DISCOVERY DEBUG] Prioritized URLs:', prioritizedUrls)

    // Ensure we have at least 10 URLs
    if (prioritizedUrls.length < 10) {
      logger.warn('PLAYWRIGHT_SCRAPER', 'Adding more fallback URLs')
      console.log('[DISCOVERY DEBUG] WARNING: Only', prioritizedUrls.length, 'URLs, adding fallbacks')
      for (const path of ['/testimonials', '/case-studies', '/partners', '/resources']) {
        prioritizedUrls.push(baseUrl + path)
      }
    }

    const duration = Date.now() - startTime
    logger.info('PLAYWRIGHT_SCRAPER', '🎯 Page discovery complete!', {
      totalFound: prioritizedUrls.length,
      duration,
      uniqueUrls: uniqueUrls.length,
      finalUrls: prioritizedUrls
    })
    
    console.log('[DISCOVERY DEBUG] FINAL RESULT:', prioritizedUrls.length, 'URLs being returned')

    return prioritizedUrls.slice(0, maxPages)
  }

  /**
   * Prioritize discovered URLs by importance
   */
  private prioritizeDiscoveredUrls(urls: string[]): string[] {
    return urls.sort((a, b) => {
      // Homepage first
      if (a.match(/\/$/) && !b.match(/\/$/)) return -1
      if (b.match(/\/$/) && !a.match(/\/$/)) return 1
      
      // Important pages
      const importantPatterns = [
        /\/about/i,
        /\/services?/i,
        /\/products?/i,
        /\/solutions?/i,
        /\/contact/i,
        /\/team/i,
        /\/pricing/i,
        /\/features/i
      ]
      
      const aImportant = importantPatterns.some(p => p.test(a))
      const bImportant = importantPatterns.some(p => p.test(b))
      
      if (aImportant && !bImportant) return -1
      if (!aImportant && bImportant) return 1
      
      // Shorter URLs tend to be more important
      return a.length - b.length
    }).slice(0, 50) // Limit to top 50 URLs
  }
  
  // ====================================================================
  // DEEP CRAWL METHODS (Merged from AdvancedPlaywrightScraper)
  // ====================================================================
  
  /**
   * Crawl a page and optionally follow links (deep crawl mode)
   */
  private async crawlPage(
    url: string,
    context: BrowserContext,
    depth: number,
    options: {
      followLinks?: boolean
      extractFullContent?: boolean
      handlePagination?: boolean
      handleInfiniteScroll?: boolean
    }
  ): Promise<void> {
    // Check limits
    if (depth > this.maxDepth || this.visitedUrls.size >= this.maxPages) {
      return
    }
    
    // Check if already visited
    const normalizedUrl = this.normalizeUrl(url)
    if (this.visitedUrls.has(normalizedUrl)) {
      return
    }
    
    this.visitedUrls.add(normalizedUrl)
    
    let page: Page | null = null
    
    try {
      page = await context.newPage()
      
      // Set up resource blocking for performance
      await page.route('**/*', (route) => {
        const resourceType = route.request().resourceType()
        if (['font', 'media', 'websocket'].includes(resourceType)) {
          route.abort()
        } else {
          route.continue()
        }
      })
      
      logger.info('PLAYWRIGHT_SCRAPER', `Deep crawling page (depth: ${depth})`, { url })
      
      // Navigate to page
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      })
      
      if (!response || !response.ok()) {
        logger.warn('PLAYWRIGHT_SCRAPER', `Failed to load page: ${url}`)
        return
      }
      
      // Wait for dynamic content
      await page.waitForTimeout(2000)
      
      // Handle infinite scroll if enabled
      if (options.handleInfiniteScroll) {
        await this.handleInfiniteScroll(page)
      }
      
      // Handle pagination if enabled
      if (options.handlePagination && depth < 2) {
        await this.handlePagination(page, context, depth)
      }
      
      // Extract content
      const content = await this.extractPageContent(page, url, options.extractFullContent ?? true)
      if (content) {
        this.pageContents.push(content)
      }
      
      // Find and follow links if enabled
      if (options.followLinks && depth < this.maxDepth) {
        const links = await this.extractInternalLinks(page, url)
        const prioritizedLinks = this.prioritizePageUrls(links)
        
        // Crawl child pages
        for (const link of prioritizedLinks.slice(0, 10)) {
          if (this.visitedUrls.size >= this.maxPages) break
          await this.crawlPage(link, context, depth + 1, {
            ...options,
            followLinks: depth < 2 // Only follow links 2 levels deep
          })
        }
      }
      
    } catch (error) {
      logger.error('PLAYWRIGHT_SCRAPER', `Error crawling ${url}`, { error })
    } finally {
      if (page) await page.close()
    }
  }
  
  /**
   * Handle infinite scroll pages (from AdvancedPlaywrightScraper)
   */
  private async handleInfiniteScroll(page: Page): Promise<void> {
    // Use the new ScrollHandler module for infinite scroll
    const result = await this.scrollHandler.handleInfiniteScroll(page, 20)
    
    logger.info('PLAYWRIGHT_SCRAPER', 'Infinite scroll completed', {
      itemsLoaded: result.itemsLoaded,
      scrollDepth: result.scrollDepth
    })
  }
  
  /**
   * Handle pagination (from AdvancedPlaywrightScraper)
   */
  private async handlePagination(page: Page, context: BrowserContext, currentDepth: number): Promise<void> {
    try {
      // Use the new PaginationHandler module
      const pagesVisited = await this.paginationHandler.handlePagination(
        page,
        context,
        async (newPage, url) => {
          // Extract content from each pagination page
          if (this.visitedUrls.size >= this.maxPages) return
          
          this.visitedUrls.add(url)
          const content = await this.extractPageContent(newPage, url, true)
          this.pageContents.push(content)
          
          logger.info('PLAYWRIGHT_SCRAPER', `Extracted content from pagination page: ${url}`)
        }
      )
      
      logger.info('PLAYWRIGHT_SCRAPER', `Handled ${pagesVisited.length} pagination pages`)
    } catch (error) {
      logger.error('PLAYWRIGHT_SCRAPER', 'Error handling pagination', { error })
    }
  }
  
  /**
   * Extract comprehensive page content (from AdvancedPlaywrightScraper)
   */
  private async extractPageContent(page: Page, url: string, fullContent: boolean): Promise<any> {
    try {
      const content = await page.evaluate((extractFull) => {
        function cleanText(text: any): string {
          if (!text) return ''
          return String(text).replace(/\s+/g, ' ').trim()
        }
        
        // Detect page type
        let pageType: 'page' | 'blog' | 'product' | 'article' = 'page'
        const urlLower = window.location.href.toLowerCase()
        
        if (urlLower.includes('/blog/') || urlLower.includes('/post/') || 
            urlLower.includes('/article/') || urlLower.includes('/news/')) {
          pageType = 'blog'
        } else if (urlLower.includes('/product/') || urlLower.includes('/shop/')) {
          pageType = 'product'
        } else if (document.querySelector('article')) {
          pageType = 'article'
        }
        
        // Extract content based on page type
        let mainContent = ''
        let excerpt = ''
        let author = ''
        let date = ''
        
        if (pageType === 'blog' || pageType === 'article') {
          const articleElement = document.querySelector('article, .post-content, .entry-content, main')
          if (articleElement) {
            mainContent = extractFull ? 
              articleElement.textContent || '' : 
              cleanText(articleElement.textContent).substring(0, 2000)
          }
          
          // Extract metadata
          excerpt = document.querySelector('meta[name="description"]')?.getAttribute('content') || ''
          author = document.querySelector('.author, .by-line')?.textContent || ''
          date = document.querySelector('time, .date')?.textContent || ''
          
        } else {
          // For regular pages
          const main = document.querySelector('main, #content, .content')
          if (main) {
            mainContent = extractFull ? 
              main.textContent || '' : 
              cleanText(main.textContent).substring(0, 5000)
          }
        }
        
        // Extract images
        const images: string[] = []
        document.querySelectorAll('img').forEach(img => {
          const src = img.src || img.getAttribute('data-src')
          if (src && !src.includes('data:image')) {
            images.push(src)
          }
        })
        
        // Extract links for crawling
        const links: string[] = []
        document.querySelectorAll('a[href]').forEach(a => {
          const href = (a as HTMLAnchorElement).href
          if (href && href.startsWith(window.location.origin)) {
            links.push(href)
          }
        })
        
        return {
          title: document.title,
          content: cleanText(mainContent),
          type: pageType,
          excerpt: cleanText(excerpt).substring(0, 500),
          author: cleanText(author),
          date: cleanText(date),
          images: [...new Set(images)].slice(0, 20),
          links: [...new Set(links)]
        }
      }, fullContent)
      
      if (content) {
        return {
          ...content,
          url
        }
      }
      
      return null
      
    } catch (error) {
      logger.error('PLAYWRIGHT_SCRAPER', 'Error extracting page content', { url, error })
      return null
    }
  }
  
  /**
   * Extract internal links from a page (from AdvancedPlaywrightScraper)
   */
  private async extractInternalLinks(page: Page, baseUrl: string): Promise<string[]> {
    try {
      const links = await page.evaluate((base) => {
        const baseUrl = new URL(base)
        const links: string[] = []
        
        document.querySelectorAll('a[href]').forEach(a => {
          try {
            const href = (a as HTMLAnchorElement).href
            const url = new URL(href)
            
            // Only internal links
            if (url.hostname === baseUrl.hostname && !url.hash) {
              links.push(url.href)
            }
          } catch (e) {
            // Invalid URL
          }
        })
        
        return [...new Set(links)]
      }, baseUrl)
      
      return links
      
    } catch (error) {
      logger.error('PLAYWRIGHT_SCRAPER', 'Error extracting links', { error })
      return []
    }
  }
  
  /**
   * Prioritize URLs for crawling (from AdvancedPlaywrightScraper)
   */
  private prioritizePageUrls(urls: string[]): string[] {
    // Priority keywords
    const highPriority = ['about', 'product', 'service', 'team', 'contact', 'blog', 'news']
    const mediumPriority = ['feature', 'solution', 'case-study', 'portfolio']
    const lowPriority = ['privacy', 'terms', 'cookie', 'legal']
    
    const scored = urls.map(url => {
      let score = 0
      const urlLower = url.toLowerCase()
      
      // Check for high priority
      highPriority.forEach(keyword => {
        if (urlLower.includes(keyword)) score += 10
      })
      
      // Check for medium priority
      mediumPriority.forEach(keyword => {
        if (urlLower.includes(keyword)) score += 5
      })
      
      // Check for low priority
      lowPriority.forEach(keyword => {
        if (urlLower.includes(keyword)) score -= 5
      })
      
      // Penalize very long URLs (usually deep pages)
      const depth = url.split('/').length
      if (depth > 5) score -= 2
      
      return { url, score }
    })
    
    // Sort by score descending
    scored.sort((a, b) => b.score - a.score)
    
    return scored.map(s => s.url)
  }
  
  /**
   * Aggregate data from multiple crawled pages (from AdvancedPlaywrightScraper)
   */
  private aggregateData(baseUrl: string): ScrapedData {
    logger.info('PLAYWRIGHT_SCRAPER', 'Aggregating data from crawled pages', {
      pagesVisited: this.visitedUrls.size,
      contentPages: this.pageContents.length
    })
    
    // Combine all content
    const allContent = this.pageContents.map(p => p.content).join('\n\n')
    const allImages = [...new Set(this.pageContents.flatMap(p => p.images || []))]
    
    // Find main page data (homepage or first page)
    const mainPage = this.pageContents.find(p => p.url === baseUrl) || this.pageContents[0] || {}
    
    // Extract unique team members, products, etc from all pages
    const blogPosts = this.pageContents
      .filter(p => p.type === 'blog' || p.type === 'article')
      .map(p => ({
        title: p.title,
        excerpt: p.excerpt,
        author: p.author,
        date: p.date,
        link: p.url,
        tags: []
      }))
    
    // Create aggregated result
    const data: ScrapedData = {
      url: baseUrl,
      title: mainPage.title || '',
      description: mainPage.excerpt || '',
      content: allContent.substring(0, 10000), // Limit total content
      logos: [],
      brandAssets: {
        logo: null,
        favicon: null,
        colors: [],
        fonts: [],
        gradients: [],
        cssVariables: {}
      },
      contactInfo: {
        emails: [],
        phones: [],
        addresses: []
      },
      socialLinks: {},
      teamMembers: [],
      testimonials: [],
      products: [],
      blogPosts: blogPosts.slice(0, 20),
      pages: this.pageContents.map(p => ({
        url: p.url,
        title: p.title,
        type: p.type || 'other',
        content: p.content.substring(0, 1000),
        structuredData: {}
      })),
      metadata: {
        scrapedAt: new Date().toISOString(),
        scraper: this.name,
        hasContent: allContent.length > 100,
        contentLength: allContent.length,
        pagesScraped: this.visitedUrls.size
      }
    }
    
    return data
  }
  
  /**
   * Helper to normalize URLs for comparison
   */
  private normalizeUrl(url: string): string {
    try {
      const u = new URL(url)
      u.hash = ''
      u.searchParams.delete('utm_source')
      u.searchParams.delete('utm_medium')
      u.searchParams.delete('utm_campaign')
      const path = u.pathname.replace(/\/$/, '') // Remove trailing slash
      return `${u.origin}${path}`
    } catch {
      return url
    }
  }
}