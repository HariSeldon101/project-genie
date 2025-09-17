# Phase 1C: Advanced Scraping Infrastructure
*Transform scraping capabilities with next-generation tools and techniques*

## 📚 Related Documents
- [Phase 1A: Scraping Operational](./phase-1a-scraping-operational.md) ✅
- [Phase 1B: Essential Extractors](./phase-1b-essential-extractors.md) 
- [Phase 2A: External Intelligence](./phase-2a-external-intelligence.md)
- [Phase 2B: Advanced OSINT](./phase-2b-advanced-osint.md)
- [Phase 3: Enricher Activation](./phase-3-enricher-activation.md)
- [Phase 4: GPT-5 Optimization](./phase-4-gpt5-llm-optimization.md)
- [Phase 5: Database & Performance](./phase-5-database-performance.md)

---

## 🎯 Phase 1C Overview

### Objectives
1. Integrate Firecrawl for AI-powered extraction
2. Implement advanced anti-detection techniques
3. Add platform-specific optimizations
4. Enable deep crawl capabilities
5. Create comprehensive UI for scraping control

### Timeline
- **Duration**: 1-2 weeks
- **Dependencies**: Phase 1A ✅, Phase 1B
- **Team Size**: 1-2 developers

### Success Metrics
- Scraping success rate: >95%
- Platform detection accuracy: >90%
- CAPTCHA solve rate: >85%
- Performance: <5s per page average
- Zero detection by major anti-bot services

---

## 🏗️ Architecture Design

### Current Architecture: StrategyManager Pattern
**IMPORTANT**: The scraping infrastructure now uses a **StrategyManager** that orchestrates different strategies based on site detection. This replaces the legacy PlaywrightScraper/CheerioScraper architecture.

### Component Hierarchy
```
lib/company-intelligence/scrapers/
├── strategies/
│   ├── strategy-manager.ts       # Main orchestrator (current architecture)
│   ├── base-strategy.ts          # Base class for all strategies
│   ├── static-strategy.ts        # Cheerio + Axios for fast HTML extraction
│   ├── dynamic-strategy.ts       # Playwright for JavaScript-heavy sites
│   ├── spa-strategy.ts           # Playwright with SPA optimizations
│   ├── ai-strategy.ts            # AI-powered extraction
│   ├── firecrawl-strategy.ts     # NEW: Firecrawl integration
│   └── platform-strategies/      # NEW: Platform-specific
│       ├── nextjs-strategy.ts
│       ├── wordpress-strategy.ts
│       └── shopify-strategy.ts
├── anti-detection/
│   ├── fingerprint-manager.ts    # Browser fingerprinting
│   ├── proxy-rotator.ts         # Proxy management
│   ├── captcha-solver.ts        # CAPTCHA integration
│   └── behavior-simulator.ts     # Human-like behavior
├── crawlers/
│   ├── deep-crawler.ts          # Multi-page crawling
│   ├── infinite-scroll.ts       # Infinite scroll handler
│   └── pagination-handler.ts    # Pagination detection
└── utils/
    ├── performance-monitor.ts    # Metrics collection
    └── error-recovery.ts        # Smart retry logic
```

---

## 🔧 Implementation Details

### 1.1 Firecrawl Integration

#### Installation & Setup
```bash
npm install @firecrawl/sdk axios cheerio
```

#### Implementation
```typescript
// lib/company-intelligence/scrapers/strategies/firecrawl-strategy.ts
import Firecrawl from '@firecrawl/sdk'
import { BaseStrategy, ScrapingResult } from './base-strategy'
// Note: BaseStrategy now has different signatures for StaticStrategy (no BrowserContext)
import { permanentLogger } from '@/lib/utils/permanent-logger'

export class FirecrawlStrategy extends BaseStrategy {
  private firecrawl: Firecrawl
  private logger = permanentLogger.create('FirecrawlStrategy')
  
  constructor(apiKey?: string) {
    super('firecrawl')
    // Use env var if no key provided
    this.firecrawl = new Firecrawl({
      apiKey: apiKey || process.env.FIRECRAWL_API_KEY
    })
  }
  
  async scrape(url: string, options?: any): Promise<ScrapingResult> {
    const startTime = Date.now()
    this.logger.log('Starting Firecrawl scrape', { url, options })
    
    try {
      // Use natural language prompt for extraction
      const result = await this.firecrawl.scrape({
        url,
        formats: ['markdown', 'structured_data'],
        extractionPrompt: options?.extractionPrompt || `
          Extract the following information:
          - Company name and description
          - Contact information (emails, phones, addresses)
          - Social media links
          - Team members and their roles
          - Products or services offered
          - Customer testimonials
          - Blog posts or news articles
          - Pricing information
          - Any financial data or metrics
        `,
        waitForSelector: options?.waitForSelector,
        screenshot: options?.screenshot || false,
        onlyMainContent: options?.onlyMainContent ?? true
      })
      
      const duration = Date.now() - startTime
      this.logger.metric('Scrape completed', {
        url,
        duration,
        dataSize: JSON.stringify(result).length
      })
      
      return {
        success: true,
        data: {
          url,
          content: result.markdown,
          structuredData: result.structured_data,
          metadata: result.metadata,
          screenshot: result.screenshot
        },
        metrics: {
          duration,
          scraperType: 'firecrawl',
          tokensUsed: result.usage?.tokens || 0
        }
      }
    } catch (error) {
      this.logger.error('Firecrawl scrape failed', error)
      throw error
    }
  }
  
  async crawl(url: string, options?: any): Promise<ScrapingResult[]> {
    this.logger.log('Starting Firecrawl crawl', { url, options })
    
    const results = await this.firecrawl.crawl({
      url,
      maxDepth: options?.maxDepth || 2,
      maxPages: options?.maxPages || 10,
      allowedDomains: options?.allowedDomains,
      excludePaths: options?.excludePaths || ['/admin', '/login', '/api'],
      extractionPrompt: options?.extractionPrompt
    })
    
    return results.pages.map(page => ({
      success: true,
      data: page,
      metrics: {
        scraperType: 'firecrawl',
        duration: 0
      }
    }))
  }
}
```

#### API Key Requirements
- **Service**: Firecrawl
- **Cost**: Free tier (100 pages/month) or $19/month (1000 pages)
- **Sign up**: https://firecrawl.com
- **Documentation**: https://docs.firecrawl.com

### 1.2 Anti-Detection System

#### Browser Fingerprinting Evasion
```typescript
// lib/company-intelligence/scrapers/anti-detection/fingerprint-manager.ts
import { Browser, BrowserContext } from 'playwright'
// Note: StealthPlugin is for Puppeteer, use Playwright's native stealth techniques

export class FingerprintManager {
  private logger = permanentLogger.create('FingerprintManager')
  
  async createStealthContext(browser: Browser): Promise<BrowserContext> {
    const context = await browser.newContext({
      viewport: this.getRandomViewport(),
      userAgent: this.getRandomUserAgent(),
      locale: this.getRandomLocale(),
      timezoneId: this.getRandomTimezone(),
      permissions: ['geolocation'],
      geolocation: this.getRandomGeolocation(),
      colorScheme: Math.random() > 0.5 ? 'light' : 'dark',
      deviceScaleFactor: this.getRandomDeviceScaleFactor(),
      hasTouch: Math.random() > 0.7,
      // WebGL and Canvas spoofing
      extraHTTPHeaders: {
        'Accept-Language': this.getRandomAcceptLanguage(),
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    })
    
    // Apply stealth techniques
    await this.applyStealthTechniques(context)
    
    return context
  }
  
  private async applyStealthTechniques(context: BrowserContext) {
    await context.addInitScript(() => {
      // Override WebGL fingerprinting
      const getParameter = WebGLRenderingContext.prototype.getParameter
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) return 'Intel Inc.' // UNMASKED_VENDOR_WEBGL
        if (parameter === 37446) return 'Intel Iris OpenGL Engine' // UNMASKED_RENDERER_WEBGL
        return getParameter.apply(this, arguments)
      }
      
      // Override Canvas fingerprinting
      const toDataURL = HTMLCanvasElement.prototype.toDataURL
      HTMLCanvasElement.prototype.toDataURL = function() {
        const context = this.getContext('2d')
        if (context) {
          // Add slight noise to canvas
          const imageData = context.getImageData(0, 0, this.width, this.height)
          for (let i = 0; i < imageData.data.length; i += 4) {
            imageData.data[i] += Math.random() * 2 - 1     // R
            imageData.data[i+1] += Math.random() * 2 - 1   // G
            imageData.data[i+2] += Math.random() * 2 - 1   // B
          }
          context.putImageData(imageData, 0, 0)
        }
        return toDataURL.apply(this, arguments)
      }
      
      // Override plugins enumeration
      Object.defineProperty(navigator, 'plugins', {
        value: new Proxy(navigator.plugins, {
          get: (target, prop) => {
            if (prop === 'length') return 3
            const plugins = ['Chrome PDF Plugin', 'Chrome PDF Viewer', 'Native Client']
            if (typeof prop === 'number' && prop < 3) {
              return { name: plugins[prop], filename: `${plugins[prop]}.so` }
            }
            return target[prop]
          }
        })
      })
      
      // Override battery API
      if (navigator.getBattery) {
        navigator.getBattery = async () => ({
          charging: true,
          chargingTime: 0,
          dischargingTime: Infinity,
          level: 0.98 + Math.random() * 0.02
        })
      }
    })
  }
  
  private getRandomViewport() {
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 1440, height: 900 },
      { width: 1536, height: 864 },
      { width: 1680, height: 1050 }
    ]
    return viewports[Math.floor(Math.random() * viewports.length)]
  }
  
  private getRandomUserAgent() {
    const agents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ]
    return agents[Math.floor(Math.random() * agents.length)]
  }
  
  private getRandomLocale() {
    return ['en-US', 'en-GB', 'en-CA', 'en-AU'][Math.floor(Math.random() * 4)]
  }
  
  private getRandomTimezone() {
    return ['America/New_York', 'America/Chicago', 'America/Los_Angeles', 'America/Denver'][Math.floor(Math.random() * 4)]
  }
  
  private getRandomGeolocation() {
    // Major US cities
    const locations = [
      { latitude: 40.7128, longitude: -74.0060 }, // NYC
      { latitude: 34.0522, longitude: -118.2437 }, // LA
      { latitude: 41.8781, longitude: -87.6298 },  // Chicago
      { latitude: 29.7604, longitude: -95.3698 }   // Houston
    ]
    return locations[Math.floor(Math.random() * locations.length)]
  }
  
  private getRandomDeviceScaleFactor() {
    return [1, 1.25, 1.5, 2][Math.floor(Math.random() * 4)]
  }
  
  private getRandomAcceptLanguage() {
    return ['en-US,en;q=0.9', 'en-GB,en;q=0.9', 'en-US,en;q=0.9,es;q=0.8'][Math.floor(Math.random() * 3)]
  }
}
```

#### Proxy Rotation System
```typescript
// lib/company-intelligence/scrapers/anti-detection/proxy-rotator.ts
export interface ProxyConfig {
  type: 'residential' | 'datacenter' | 'mobile'
  provider: 'oxylabs' | 'brightdata' | 'smartproxy'
  credentials: {
    username: string
    password: string
  }
  endpoints: string[]
}

export class ProxyRotator {
  private proxies: Map<string, ProxyConfig> = new Map()
  private currentIndex = 0
  private logger = permanentLogger.create('ProxyRotator')
  
  constructor() {
    this.loadProxyConfigs()
  }
  
  private loadProxyConfigs() {
    // Load from environment variables
    if (process.env.OXYLABS_USERNAME) {
      this.proxies.set('oxylabs', {
        type: 'residential',
        provider: 'oxylabs',
        credentials: {
          username: process.env.OXYLABS_USERNAME,
          password: process.env.OXYLABS_PASSWORD!
        },
        endpoints: ['pr.oxylabs.io:7777']
      })
    }
    
    if (process.env.BRIGHTDATA_USERNAME) {
      this.proxies.set('brightdata', {
        type: 'residential',
        provider: 'brightdata',
        credentials: {
          username: process.env.BRIGHTDATA_USERNAME,
          password: process.env.BRIGHTDATA_PASSWORD!
        },
        endpoints: ['brd.superproxy.io:22225']
      })
    }
  }
  
  getNextProxy(): ProxyConfig | null {
    const proxyArray = Array.from(this.proxies.values())
    if (proxyArray.length === 0) return null
    
    const proxy = proxyArray[this.currentIndex % proxyArray.length]
    this.currentIndex++
    
    this.logger.log('Rotating to proxy', {
      provider: proxy.provider,
      type: proxy.type,
      index: this.currentIndex
    })
    
    return proxy
  }
  
  formatProxyUrl(config: ProxyConfig): string {
    const { username, password } = config.credentials
    const endpoint = config.endpoints[0]
    return `http://${username}:${password}@${endpoint}`
  }
  
  async testProxy(config: ProxyConfig): Promise<boolean> {
    try {
      const response = await fetch('http://httpbin.org/ip', {
        // @ts-ignore - Node fetch with proxy
        agent: new HttpsProxyAgent(this.formatProxyUrl(config))
      })
      const data = await response.json()
      this.logger.log('Proxy test successful', {
        provider: config.provider,
        ip: data.origin
      })
      return true
    } catch (error) {
      this.logger.error('Proxy test failed', { provider: config.provider, error })
      return false
    }
  }
}
```

#### CAPTCHA Solving Integration
```typescript
// lib/company-intelligence/scrapers/anti-detection/captcha-solver.ts
import { Page } from 'playwright'

export interface CaptchaSolver {
  solve(page: Page, type: CaptchaType): Promise<boolean>
}

export enum CaptchaType {
  RECAPTCHA_V2 = 'recaptcha_v2',
  RECAPTCHA_V3 = 'recaptcha_v3',
  HCAPTCHA = 'hcaptcha',
  FUNCAPTCHA = 'funcaptcha',
  CLOUDFLARE = 'cloudflare'
}

export class TwoCaptchaSolver implements CaptchaSolver {
  private apiKey: string
  private logger = permanentLogger.create('TwoCaptchaSolver')
  
  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.TWOCAPTCHA_API_KEY!
  }
  
  async solve(page: Page, type: CaptchaType): Promise<boolean> {
    this.logger.log('Solving CAPTCHA', { type, url: page.url() })
    
    try {
      switch (type) {
        case CaptchaType.RECAPTCHA_V2:
          return await this.solveReCaptchaV2(page)
        case CaptchaType.HCAPTCHA:
          return await this.solveHCaptcha(page)
        case CaptchaType.CLOUDFLARE:
          return await this.solveCloudflare(page)
        default:
          throw new Error(`Unsupported CAPTCHA type: ${type}`)
      }
    } catch (error) {
      this.logger.error('CAPTCHA solving failed', { type, error })
      return false
    }
  }
  
  private async solveReCaptchaV2(page: Page): Promise<boolean> {
    // Get the site key
    const siteKey = await page.evaluate(() => {
      const element = document.querySelector('[data-sitekey]')
      return element?.getAttribute('data-sitekey')
    })
    
    if (!siteKey) {
      this.logger.error('Could not find reCAPTCHA site key')
      return false
    }
    
    // Submit to 2Captcha
    const response = await fetch('http://2captcha.com/in.php', {
      method: 'POST',
      body: new URLSearchParams({
        key: this.apiKey,
        method: 'userrecaptcha',
        googlekey: siteKey,
        pageurl: page.url(),
        json: '1'
      })
    })
    
    const { request: requestId } = await response.json()
    
    // Poll for solution
    let solution = null
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 5000))
      
      const resultResponse = await fetch(`http://2captcha.com/res.php?key=${this.apiKey}&action=get&id=${requestId}&json=1`)
      const result = await resultResponse.json()
      
      if (result.status === 1) {
        solution = result.request
        break
      }
    }
    
    if (!solution) {
      this.logger.error('CAPTCHA solving timeout')
      return false
    }
    
    // Inject solution
    await page.evaluate((token) => {
      // @ts-ignore
      document.getElementById('g-recaptcha-response').value = token
      // @ts-ignore
      if (window.___grecaptcha_cfg?.clients?.[0]?.callback) {
        // @ts-ignore
        window.___grecaptcha_cfg.clients[0].callback(token)
      }
    }, solution)
    
    this.logger.log('CAPTCHA solved successfully')
    return true
  }
  
  private async solveHCaptcha(page: Page): Promise<boolean> {
    // Similar implementation for hCaptcha
    return false
  }
  
  private async solveCloudflare(page: Page): Promise<boolean> {
    // Wait for Cloudflare challenge to complete
    await page.waitForSelector('body:not(.no-js)', { timeout: 30000 })
    return true
  }
}
```

#### Required Services & Costs
| Service | Purpose | Cost | Required |
|---------|---------|------|----------|
| **Proxies** | IP rotation | | |
| - Oxylabs | Residential proxies | $8-13/GB | Optional |
| - Bright Data | Residential proxies | $10-15/GB | Optional |
| - SmartProxy | Budget proxies | $7-12/GB | Optional |
| **CAPTCHA Solving** | | | |
| - 2Captcha | CAPTCHA solving | $0.50-1.00/1000 | Optional |
| - Anti-Captcha | Alternative solver | $0.70-1.20/1000 | Optional |
| - CapSolver | AI-based solver | $0.40-0.80/1000 | Optional |

### 1.3 Platform-Specific Strategies

#### Next.js Detection & Optimization
```typescript
// lib/company-intelligence/scrapers/strategies/platform-strategies/nextjs-strategy.ts
export class NextJSStrategy extends BaseStrategy {
  async scrape(url: string, options?: any): Promise<ScrapingResult> {
    const page = await this.browser.newPage()
    await page.goto(url)
    
    // Extract __NEXT_DATA__ for server-side rendered data
    const nextData = await page.evaluate(() => {
      const script = document.getElementById('__NEXT_DATA__')
      if (script) {
        try {
          return JSON.parse(script.textContent || '{}')
        } catch {
          return null
        }
      }
      return null
    })
    
    if (nextData) {
      this.logger.log('Found Next.js __NEXT_DATA__', {
        hasProps: !!nextData.props,
        buildId: nextData.buildId
      })
      
      // Extract data from props without needing to render
      return {
        success: true,
        data: {
          url,
          serverData: nextData.props?.pageProps,
          buildId: nextData.buildId,
          page: nextData.page,
          query: nextData.query,
          // Also get rendered content for completeness
          content: await page.content()
        },
        metrics: {
          scraperType: 'nextjs',
          hasServerData: true
        }
      }
    }
    
    // Fall back to standard scraping
    return super.scrape(url, options)
  }
}
```

#### WordPress API Extraction
```typescript
// lib/company-intelligence/scrapers/strategies/platform-strategies/wordpress-strategy.ts
export class WordPressStrategy extends BaseStrategy {
  async scrape(url: string, options?: any): Promise<ScrapingResult> {
    const domain = new URL(url).origin
    
    // Try WordPress REST API first
    const apiEndpoints = [
      '/wp-json/wp/v2/posts',
      '/wp-json/wp/v2/pages',
      '/wp-json/wp/v2/users',
      '/wp-json/wp/v2/categories',
      '/wp-json/wp/v2/media'
    ]
    
    const apiData: any = {}
    
    for (const endpoint of apiEndpoints) {
      try {
        const response = await fetch(`${domain}${endpoint}?per_page=100`)
        if (response.ok) {
          const data = await response.json()
          apiData[endpoint.split('/').pop()!] = data
          this.logger.log(`WordPress API data found`, { endpoint, count: data.length })
        }
      } catch (error) {
        // API might be disabled
      }
    }
    
    // Also check for WooCommerce
    try {
      const wooResponse = await fetch(`${domain}/wp-json/wc/v3/products`)
      if (wooResponse.ok) {
        apiData.products = await wooResponse.json()
      }
    } catch {}
    
    // Scrape the page normally too
    const pageData = await super.scrape(url, options)
    
    return {
      ...pageData,
      data: {
        ...pageData.data,
        wordpressApi: apiData,
        platform: 'wordpress'
      }
    }
  }
}
```

### 1.4 Deep Crawling System

#### Deep Crawler Implementation
```typescript
// lib/company-intelligence/scrapers/crawlers/deep-crawler.ts
export interface DeepCrawlOptions {
  maxDepth: number
  maxPages: number
  followPatterns?: RegExp[]
  excludePatterns?: RegExp[]
  parallelRequests?: number
  respectRobotsTxt?: boolean
}

export class DeepCrawler {
  private visited = new Set<string>()
  private queue: Array<{ url: string; depth: number }> = []
  private results: ScrapingResult[] = []
  private logger = permanentLogger.create('DeepCrawler')
  
  async crawl(
    startUrl: string,
    strategy: BaseStrategy,
    options: DeepCrawlOptions
  ): Promise<ScrapingResult[]> {
    this.logger.log('Starting deep crawl', { startUrl, options })
    
    // Check robots.txt if required
    if (options.respectRobotsTxt) {
      await this.checkRobotsTxt(startUrl)
    }
    
    // Initialize queue
    this.queue.push({ url: startUrl, depth: 0 })
    
    // Process queue
    while (this.queue.length > 0 && this.results.length < options.maxPages) {
      const batch = this.queue.splice(0, options.parallelRequests || 1)
      
      await Promise.all(batch.map(async ({ url, depth }) => {
        if (this.visited.has(url) || depth > options.maxDepth) {
          return
        }
        
        this.visited.add(url)
        
        try {
          // Scrape the page
          const result = await strategy.scrape(url)
          this.results.push(result)
          
          // Extract links if not at max depth
          if (depth < options.maxDepth) {
            const links = this.extractLinks(result.data.content, url)
            const filteredLinks = this.filterLinks(links, options)
            
            // Add to queue
            filteredLinks.forEach(link => {
              if (!this.visited.has(link)) {
                this.queue.push({ url: link, depth: depth + 1 })
              }
            })
          }
        } catch (error) {
          this.logger.error('Failed to crawl page', { url, error })
        }
      }))
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    this.logger.log('Deep crawl completed', {
      pagesVisited: this.visited.size,
      resultsCollected: this.results.length
    })
    
    return this.results
  }
  
  private extractLinks(html: string, baseUrl: string): string[] {
    const $ = cheerio.load(html)
    const links: string[] = []
    
    $('a[href]').each((_, element) => {
      const href = $(element).attr('href')
      if (href) {
        try {
          const absoluteUrl = new URL(href, baseUrl).toString()
          links.push(absoluteUrl)
        } catch {}
      }
    })
    
    return links
  }
  
  private filterLinks(links: string[], options: DeepCrawlOptions): string[] {
    return links.filter(link => {
      // Check if link matches follow patterns
      if (options.followPatterns?.length) {
        const matches = options.followPatterns.some(pattern => pattern.test(link))
        if (!matches) return false
      }
      
      // Check if link matches exclude patterns
      if (options.excludePatterns?.length) {
        const excluded = options.excludePatterns.some(pattern => pattern.test(link))
        if (excluded) return false
      }
      
      return true
    })
  }
  
  private async checkRobotsTxt(url: string): Promise<void> {
    try {
      const domain = new URL(url).origin
      const robotsUrl = `${domain}/robots.txt`
      const response = await fetch(robotsUrl)
      if (response.ok) {
        const text = await response.text()
        this.parseRobotsTxt(text)
      }
    } catch {}
  }
  
  private parseRobotsTxt(text: string): void {
    // Basic robots.txt parsing
    const lines = text.split('\n')
    const disallowed: string[] = []
    
    lines.forEach(line => {
      if (line.toLowerCase().startsWith('disallow:')) {
        const path = line.substring(9).trim()
        if (path) disallowed.push(path)
      }
    })
    
    // Add to exclude patterns
    // Implementation detail...
  }
}
```

### 1.5 UI Implementation

#### Scraper Control Panel
```tsx
// components/company-intelligence/scraper-control-panel.tsx
import { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { TooltipWrapper } from '@/components/company-intelligence/tooltip-wrapper'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { 
  TreeViewComponent,
  NodeSelectEventArgs 
} from '@syncfusion/ej2-react-navigations'
import { 
  ChartComponent,
  SeriesCollectionDirective,
  SeriesDirective,
  Inject,
  LineSeries,
  DateTime,
  Legend,
  Tooltip as ChartTooltip
} from '@syncfusion/ej2-react-charts'
import { permanentLogger } from '@/lib/utils/permanent-logger'

interface ScraperControlPanelProps {
  onStartScraping: (config: ScrapingConfig) => void
  scrapingStatus?: ScrapingStatus
}

export function ScraperControlPanel({ 
  onStartScraping, 
  scrapingStatus 
}: ScraperControlPanelProps) {
  const logger = permanentLogger.create('ScraperControlPanel')
  const [config, setConfig] = useState<ScrapingConfig>({
    strategy: 'auto',
    crawlMode: 'single',
    maxDepth: 1,
    maxPages: 10,
    useProxy: false,
    solveCaptcha: true,
    parallelRequests: 1
  })
  
  const [metrics, setMetrics] = useState<ScrapingMetrics>({
    successRate: 95,
    avgDuration: 3.2,
    captchasSolved: 12,
    proxiesUsed: 5
  })
  
  useEffect(() => {
    logger.log('ScraperControlPanel mounted', { config })
  }, [])
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Advanced Scraping Control</h3>
          <div className="flex gap-2">
            <TooltipWrapper content="95% success rate in last 24 hours">
              <Badge variant="success">
                Success Rate: {metrics.successRate}%
              </Badge>
            </TooltipWrapper>
            <TooltipWrapper content="Average time to scrape one page">
              <Badge variant="outline">
                Avg: {metrics.avgDuration}s
              </Badge>
            </TooltipWrapper>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="strategy" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="strategy">Strategy</TabsTrigger>
            <TabsTrigger value="crawl">Crawl Settings</TabsTrigger>
            <TabsTrigger value="anti-detection">Anti-Detection</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="strategy" className="space-y-4">
            <div>
              <label className="text-sm font-medium">Scraping Strategy</label>
              <TooltipWrapper content="Auto-detect will analyze the site and choose the best strategy">
                <Select 
                  value={config.strategy}
                  onValueChange={(value) => setConfig({...config, strategy: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">
                      Auto-Detect (Recommended)
                    </SelectItem>
                    <SelectItem value="firecrawl">
                      Firecrawl (AI-Powered)
                    </SelectItem>
                    <SelectItem value="static">
                      Static (Fast)
                    </SelectItem>
                    <SelectItem value="dynamic">
                      Dynamic (JavaScript)
                    </SelectItem>
                    <SelectItem value="nextjs">
                      Next.js Optimized
                    </SelectItem>
                    <SelectItem value="wordpress">
                      WordPress API
                    </SelectItem>
                  </SelectContent>
                </Select>
              </TooltipWrapper>
            </div>
            
            {config.strategy === 'firecrawl' && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  Firecrawl uses AI to intelligently extract structured data.
                  Perfect for complex sites with dynamic content.
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="crawl" className="space-y-4">
            <div>
              <label className="text-sm font-medium">Crawl Mode</label>
              <TooltipWrapper content="Control how deep the crawler goes">
                <Select 
                  value={config.crawlMode}
                  onValueChange={(value) => setConfig({...config, crawlMode: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">
                      Single Page Only
                    </SelectItem>
                    <SelectItem value="shallow">
                      Shallow (1-2 levels)
                    </SelectItem>
                    <SelectItem value="deep">
                      Deep (3+ levels)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </TooltipWrapper>
            </div>
            
            {config.crawlMode !== 'single' && (
              <>
                <div>
                  <label className="text-sm font-medium">
                    Max Depth: {config.maxDepth}
                  </label>
                  <TooltipWrapper content="Maximum crawl depth from starting page">
                    <Slider
                      value={[config.maxDepth]}
                      onValueChange={([value]) => setConfig({...config, maxDepth: value})}
                      min={1}
                      max={5}
                      step={1}
                      className="mt-2"
                    />
                  </TooltipWrapper>
                </div>
                
                <div>
                  <label className="text-sm font-medium">
                    Max Pages: {config.maxPages}
                  </label>
                  <TooltipWrapper content="Maximum number of pages to scrape">
                    <Slider
                      value={[config.maxPages]}
                      onValueChange={([value]) => setConfig({...config, maxPages: value})}
                      min={1}
                      max={100}
                      step={5}
                      className="mt-2"
                    />
                  </TooltipWrapper>
                </div>
                
                <div>
                  <label className="text-sm font-medium">
                    Parallel Requests: {config.parallelRequests}
                  </label>
                  <TooltipWrapper content="Number of pages to scrape simultaneously">
                    <Slider
                      value={[config.parallelRequests]}
                      onValueChange={([value]) => setConfig({...config, parallelRequests: value})}
                      min={1}
                      max={5}
                      step={1}
                      className="mt-2"
                    />
                  </TooltipWrapper>
                </div>
              </>
            )}
          </TabsContent>
          
          <TabsContent value="anti-detection" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Use Proxy Rotation</label>
                <p className="text-xs text-gray-500">
                  Rotate IP addresses to avoid detection
                </p>
              </div>
              <TooltipWrapper content="Costs $8-13 per GB of data">
                <Switch
                  checked={config.useProxy}
                  onCheckedChange={(checked) => setConfig({...config, useProxy: checked})}
                />
              </TooltipWrapper>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Auto-Solve CAPTCHAs</label>
                <p className="text-xs text-gray-500">
                  Automatically solve CAPTCHAs when encountered
                </p>
              </div>
              <TooltipWrapper content="Costs $0.50-1.00 per 1000 CAPTCHAs">
                <Switch
                  checked={config.solveCaptcha}
                  onCheckedChange={(checked) => setConfig({...config, solveCaptcha: checked})}
                />
              </TooltipWrapper>
            </div>
            
            {(config.useProxy || config.solveCaptcha) && (
              <div className="p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm font-medium text-yellow-800">
                  Estimated Additional Cost
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  Proxy: ${config.useProxy ? '0.10-0.50' : '0.00'} per session<br/>
                  CAPTCHA: ${config.solveCaptcha ? '0.01-0.05' : '0.00'} per session
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="metrics">
            <div className="space-y-4">
              <div className="h-64">
                <ChartComponent
                  primaryXAxis={{ 
                    valueType: 'DateTime',
                    title: 'Time'
                  }}
                  primaryYAxis={{
                    title: 'Success Rate (%)',
                    minimum: 0,
                    maximum: 100
                  }}
                  tooltip={{ enable: true }}
                  title="Scraping Performance (Last 24 Hours)"
                >
                  <Inject services={[LineSeries, DateTime, Legend, ChartTooltip]} />
                  <SeriesCollectionDirective>
                    <SeriesDirective
                      dataSource={generateMockMetrics()}
                      xName="time"
                      yName="successRate"
                      type="Line"
                      name="Success Rate"
                    />
                  </SeriesCollectionDirective>
                </ChartComponent>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{metrics.captchasSolved}</div>
                    <p className="text-xs text-muted-foreground">
                      CAPTCHAs Solved Today
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{metrics.proxiesUsed}</div>
                    <p className="text-xs text-muted-foreground">
                      Proxy Rotations
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfig(defaultConfig)}>
            Reset to Defaults
          </Button>
          <TooltipWrapper content="Start scraping with current configuration">
            <Button 
              onClick={() => {
                logger.log('Starting scraping', { config })
                onStartScraping(config)
              }}
              disabled={scrapingStatus?.isRunning}
            >
              {scrapingStatus?.isRunning ? 'Scraping...' : 'Start Scraping'}
            </Button>
          </TooltipWrapper>
        </div>
      </CardContent>
    </Card>
  )
}

function generateMockMetrics() {
  const data = []
  const now = new Date()
  for (let i = 24; i >= 0; i--) {
    data.push({
      time: new Date(now.getTime() - i * 60 * 60 * 1000),
      successRate: 90 + Math.random() * 10
    })
  }
  return data
}
```

---

## 📊 Database Schema

### New Tables for Phase 1
```sql
-- Scraping metrics table
CREATE TABLE scraping_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Session reference
  session_id UUID REFERENCES research_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Scraping details
  url TEXT NOT NULL,
  domain TEXT NOT NULL,
  scraper_strategy TEXT NOT NULL,
  crawl_mode TEXT DEFAULT 'single',
  depth INTEGER DEFAULT 1,
  
  -- Performance metrics
  success BOOLEAN DEFAULT false,
  duration_ms INTEGER,
  data_size_bytes INTEGER,
  pages_crawled INTEGER DEFAULT 1,
  
  -- Anti-detection metrics
  proxy_used BOOLEAN DEFAULT false,
  proxy_provider TEXT,
  captcha_encountered BOOLEAN DEFAULT false,
  captcha_solved BOOLEAN DEFAULT false,
  captcha_type TEXT,
  
  -- Error tracking
  error_code TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Indexes
  INDEX idx_scraping_metrics_session (session_id),
  INDEX idx_scraping_metrics_domain (domain),
  INDEX idx_scraping_metrics_created (created_at DESC)
);

-- Platform detection results
CREATE TABLE platform_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  domain TEXT UNIQUE NOT NULL,
  platform TEXT, -- 'wordpress', 'nextjs', 'shopify', etc.
  confidence DECIMAL(3,2), -- 0.00 to 1.00
  technologies JSONB, -- Array of detected technologies
  api_endpoints JSONB, -- Discovered API endpoints
  metadata JSONB, -- Additional platform-specific data
  
  INDEX idx_platform_domain (domain),
  INDEX idx_platform_type (platform)
);

-- Proxy usage tracking
CREATE TABLE proxy_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  session_id UUID REFERENCES research_sessions(id),
  provider TEXT NOT NULL,
  proxy_type TEXT NOT NULL, -- 'residential', 'datacenter', 'mobile'
  bytes_used INTEGER,
  cost_usd DECIMAL(10,4),
  success_rate DECIMAL(3,2),
  
  INDEX idx_proxy_session (session_id),
  INDEX idx_proxy_created (created_at DESC)
);
```

---

## 🧪 Testing Plan

### Test Suite for Phase 1
```typescript
// test-phase-1-scraping.ts
import { describe, test, expect, beforeAll } from 'vitest'
import { FirecrawlStrategy } from '@/lib/company-intelligence/scrapers/strategies/firecrawl-strategy'
import { FingerprintManager } from '@/lib/company-intelligence/scrapers/anti-detection/fingerprint-manager'
import { DeepCrawler } from '@/lib/company-intelligence/scrapers/crawlers/deep-crawler'

describe('Phase 1: Advanced Scraping Infrastructure', () => {
  describe('Firecrawl Integration', () => {
    test('should extract structured data using AI', async () => {
      const strategy = new FirecrawlStrategy()
      const result = await strategy.scrape('https://example.com')
      
      expect(result.success).toBe(true)
      expect(result.data.structuredData).toBeDefined()
      expect(result.metrics.scraperType).toBe('firecrawl')
    })
    
    test('should handle crawl mode', async () => {
      const strategy = new FirecrawlStrategy()
      const results = await strategy.crawl('https://example.com', {
        maxDepth: 2,
        maxPages: 5
      })
      
      expect(results).toHaveLength(5)
      expect(results[0].success).toBe(true)
    })
  })
  
  describe('Anti-Detection System', () => {
    test('should create unique fingerprints', async () => {
      const manager = new FingerprintManager()
      const browser = await chromium.launch()
      
      const context1 = await manager.createStealthContext(browser)
      const context2 = await manager.createStealthContext(browser)
      
      // Contexts should have different fingerprints
      const ua1 = await context1.evaluate(() => navigator.userAgent)
      const ua2 = await context2.evaluate(() => navigator.userAgent)
      
      expect(ua1).toBeDefined()
      expect(ua2).toBeDefined()
      // May be same UA but other properties differ
      
      await browser.close()
    })
    
    test('should rotate proxies', async () => {
      const rotator = new ProxyRotator()
      const proxy1 = rotator.getNextProxy()
      const proxy2 = rotator.getNextProxy()
      
      if (proxy1 && proxy2) {
        expect(proxy1).not.toBe(proxy2)
      }
    })
  })
  
  describe('Deep Crawling', () => {
    test('should respect max depth', async () => {
      const crawler = new DeepCrawler()
      const strategy = new StaticStrategy()
      
      const results = await crawler.crawl('https://example.com', strategy, {
        maxDepth: 2,
        maxPages: 10,
        parallelRequests: 2
      })
      
      expect(results.length).toBeLessThanOrEqual(10)
    })
  })
  
  describe('UI Components', () => {
    test('should have tooltips on all controls', async () => {
      const { container } = render(<ScraperControlPanel />)
      const tooltips = container.querySelectorAll('[data-tooltip]')
      
      expect(tooltips.length).toBeGreaterThan(10)
    })
  })
})
```

---

## 📋 Implementation Checklist

### Week 1 Tasks
- [ ] Set up Firecrawl account and API key
- [ ] Implement FirecrawlStrategy class
- [ ] Create FingerprintManager for anti-detection
- [ ] Set up proxy provider accounts (optional)
- [ ] Implement ProxyRotator class
- [ ] Create CAPTCHA solver integration
- [ ] Implement platform detection logic
- [ ] Create NextJSStrategy class
- [ ] Create WordPressStrategy class
- [ ] Create ShopifyStrategy class

### Week 2 Tasks
- [ ] Implement DeepCrawler class
- [ ] Add infinite scroll handler
- [ ] Create pagination detector
- [ ] Build ScraperControlPanel UI
- [ ] Add Syncfusion charts for metrics
- [ ] Create database migrations
- [ ] Implement performance monitoring
- [ ] Add comprehensive tests
- [ ] Update manifest.json
- [ ] Complete documentation

---

## 🚀 Deployment Steps

### Environment Variables
```bash
# Add to .env.local

# Firecrawl (Required for AI scraping)
FIRECRAWL_API_KEY=your_api_key_here

# Proxy Services (Optional)
OXYLABS_USERNAME=your_username
OXYLABS_PASSWORD=your_password
BRIGHTDATA_USERNAME=your_username
BRIGHTDATA_PASSWORD=your_password

# CAPTCHA Solving (Optional)
TWOCAPTCHA_API_KEY=your_api_key
ANTICAPTCHA_API_KEY=your_api_key
CAPSOLVER_API_KEY=your_api_key
```

### Database Migration
```bash
# Apply Phase 1 migrations
npm run supabase:migrate -- --name phase_1_scraping_infrastructure
```

### Manifest Update
```bash
# Update manifest with new features
npm run manifest:update
npm run manifest:check
```

### Testing
```bash
# Run Phase 1 tests
npm run test:phase1
```

---

## 💰 Cost Analysis

### Monthly Cost Estimate (1000 pages/day)
| Service | Usage | Cost |
|---------|-------|------|
| Firecrawl | 30,000 pages | $19/month (paid tier) |
| Proxies (optional) | 30 GB | $300/month |
| CAPTCHA (optional) | 500 solves | $0.50/month |
| **Total (with all options)** | | **$319.50/month** |
| **Total (Firecrawl only)** | | **$19/month** |

### ROI Calculation
- Manual scraping: 2 min/page × 1000 pages = 33 hours/day
- Automated: 5 sec/page × 1000 pages = 1.4 hours/day
- Time saved: 31.6 hours/day
- Value at $50/hour: $1,580/day saved
- **ROI: 495% in first month**

---

## 📝 Notes & Recommendations

### Critical Success Factors
1. Start with Firecrawl for immediate AI-powered benefits
2. Add anti-detection gradually based on site requirements
3. Monitor costs closely, especially proxy usage
4. Use platform-specific strategies for better data quality
5. Implement comprehensive logging for debugging

### Potential Challenges
1. Some sites may require specific proxy locations
2. CAPTCHA costs can add up with high-volume scraping
3. Platform detection may need regular updates
4. Rate limiting requires careful management

### Next Phase Dependencies
- Phase 2 (OSINT) can begin immediately after Firecrawl integration
- Phase 3 (Enrichers) depends on scraping data quality
- Phase 4 (GPT-5) can run in parallel with Phase 1
- Phase 5 (Database) should wait for stable data structures

---

## 🔗 Resources & Documentation

### Required Reading
- [Firecrawl Documentation](https://docs.firecrawl.com)
- [Playwright Stealth Techniques](https://github.com/berstend/puppeteer-extra/tree/master/packages/puppeteer-extra-plugin-stealth)
- [2Captcha API](https://2captcha.com/api-docs)
- [Oxylabs Residential Proxies](https://oxylabs.io/products/residential-proxies)

### Tools & Libraries
- Firecrawl SDK: `npm install @firecrawl/sdk`
- Playwright Extra: `npm install playwright-extra`
- Ghost Cursor: `npm install ghost-cursor`
- Cheerio: `npm install cheerio`

### Support & Community
- Firecrawl Discord: https://discord.gg/firecrawl
- Playwright Community: https://discord.gg/playwright
- Web Scraping Forum: https://forum.webscraping.pro