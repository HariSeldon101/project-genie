/**
 * Single Page Application (SPA) Strategy Module
 * 
 * Specialized strategy for modern SPAs with client-side routing.
 * Handles React, Vue, Angular, and other SPA frameworks.
 * 
 * Features:
 * - Client-side routing detection
 * - Route interception
 * - State management handling
 * - Virtual DOM awareness
 * - History API navigation
 * 
 * @module spa-strategy
 */

import { Page, BrowserContext } from 'playwright'
import { BaseStrategy, StrategyConfig, ScrapingResult } from './base-strategy'
import { permanentLogger } from '../../../utils/permanent-logger'
import { socialMediaExtractor } from '../extractors/social-media-extractor'

/**
 * SPA scraping strategy
 * 
 * Best for:
 * - React applications
 * - Vue.js applications
 * - Angular applications
 * - Next.js client-side apps
 * - Gatsby dynamic routes
 */
export class SPAStrategy extends BaseStrategy {
  constructor(config?: StrategyConfig) {
    super({
      ...config,
      // SPAs require full JavaScript
      loadImages: true,
      loadStylesheets: true,
      executeJavaScript: true,
      timeout: 45000 // Longer timeout for SPAs
    })
    this.strategyName = 'spa'
  }

  /**
   * Detect if site is a SPA
   * 
   * Indicators:
   * - React/Vue/Angular presence
   * - Client-side routing
   * - Virtual DOM
   * - History API usage
   * - Single entry point
   * 
   * @param url - URL to check
   * @param page - Optional page for deeper inspection
   * @returns Confidence score (0-1)
   */
  async detect(url: string, page?: Page): Promise<number> {
    if (!page) {
      // URL patterns common in SPAs
      const spaPatterns = [
        '/#/',
        '/app',
        '/dashboard',
        '/portal'
      ]
      
      const hasSPAPattern = spaPatterns.some(pattern => url.includes(pattern))
      return hasSPAPattern ? 0.6 : 0.2
    }

    try {
      const indicators = await page.evaluate(() => {
        const checks = {
          // React detection
          isReact: false,
          reactVersion: '',
          // Vue detection
          isVue: false,
          vueVersion: '',
          // Angular detection
          isAngular: false,
          angularVersion: '',
          // Client-side routing
          hasRouter: false,
          routerType: '',
          // Virtual DOM indicators
          hasVirtualDOM: false,
          // History API usage
          usesHistoryAPI: false,
          // SPA specific elements
          hasSPAElements: false,
          // Single root element
          hasSingleRoot: false
        }

        // React detection
        if (window.hasOwnProperty('React') || document.querySelector('[data-reactroot]')) {
          checks.isReact = true
          try {
            checks.reactVersion = (window as any).React?.version || ''
          } catch (error) {
            // Log but don't throw - version detection is optional
            permanentLogger.breadcrumb('spa_detection', 'React version detection failed', {
              error: error instanceof Error ? error.message : String(error)
            })
          }
        }

        // Check for React in production (minified)
        if (document.querySelector('#root') || document.querySelector('#__next')) {
          const rootElement = document.querySelector('#root') || document.querySelector('#__next')
          if (rootElement && rootElement.hasAttribute('data-reactroot') || 
              rootElement?._reactRootContainer) {
            checks.isReact = true
          }
        }

        // Vue detection
        if (window.hasOwnProperty('Vue') || document.querySelector('#app[data-v-]')) {
          checks.isVue = true
          try {
            checks.vueVersion = (window as any).Vue?.version || ''
          } catch (error) {
            // Log but don't throw - version detection is optional
            permanentLogger.breadcrumb('spa_detection', 'Vue version detection failed', {
              error: error instanceof Error ? error.message : String(error)
            })
          }
        }

        // Angular detection
        if (window.hasOwnProperty('ng') || 
            document.querySelector('[ng-app]') || 
            document.querySelector('[ng-version]')) {
          checks.isAngular = true
          const versionAttr = document.querySelector('[ng-version]')
          if (versionAttr) {
            checks.angularVersion = versionAttr.getAttribute('ng-version') || ''
          }
        }

        // Router detection
        if (window.hasOwnProperty('ReactRouter') || 
            window.location.pathname.includes('react-router')) {
          checks.hasRouter = true
          checks.routerType = 'React Router'
        } else if (window.hasOwnProperty('VueRouter') || 
                   document.querySelector('[data-server-rendered]')) {
          checks.hasRouter = true
          checks.routerType = 'Vue Router'
        } else if (document.querySelector('[ui-router]') || 
                   document.querySelector('[ng-view]')) {
          checks.hasRouter = true
          checks.routerType = 'Angular Router'
        }

        // Virtual DOM check
        checks.hasVirtualDOM = !!(
          document.querySelector('[data-reactid]') ||
          document.querySelector('[data-v-]') ||
          (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ ||
          (window as any).__VUE_DEVTOOLS_GLOBAL_HOOK__
        )

        // History API usage
        checks.usesHistoryAPI = !!(
          window.history?.pushState &&
          window.addEventListener &&
          document.querySelector('[data-route]')
        )

        // SPA elements
        checks.hasSPAElements = !!(
          document.querySelector('#app') ||
          document.querySelector('#root') ||
          document.querySelector('[data-app]') ||
          document.querySelector('.app-container')
        )

        // Single root check
        const bodyChildren = document.body.children
        checks.hasSingleRoot = bodyChildren.length === 1 || 
                               (bodyChildren.length === 2 && 
                                document.querySelector('script[src*="bundle"]') !== null)

        return checks
      })

      // Calculate confidence score
      let score = 0.2 // Base score

      // Framework detection (highest weight)
      if (indicators.isReact || indicators.isVue || indicators.isAngular) {
        score += 0.4
      }

      if (indicators.hasRouter) score += 0.2
      if (indicators.hasVirtualDOM) score += 0.15
      if (indicators.usesHistoryAPI) score += 0.1
      if (indicators.hasSPAElements) score += 0.1
      if (indicators.hasSingleRoot) score += 0.05

      // Normalize score
      score = Math.min(1, Math.max(0, score))

      this.log('SPA detection', { url, indicators, score })
      return score
    } catch (error) {
      this.log('Error detecting SPA', error)
      return 0.3
    }
  }

  /**
   * Execute SPA scraping strategy
   * 
   * @param url - URL to scrape
   * @param context - Browser context
   * @returns Scraping result
   */
  async execute(url: string, context: BrowserContext): Promise<ScrapingResult> {
    const startTime = Date.now()
    const errors: string[] = []

    this.log('Executing SPA strategy', { url })

    const page = await context.newPage()
    
    try {
      // Configure for SPA scraping
      await this.configurePage(page)
      
      // Track route changes
      const routes: string[] = []
      await page.evaluateOnNewDocument(() => {
        // Override pushState to track route changes
        const originalPushState = history.pushState
        history.pushState = function(...args) {
          window.postMessage({ 
            type: 'ROUTE_CHANGE', 
            url: args[2] 
          }, '*')
          return originalPushState.apply(history, args)
        }
      })

      // Listen for route changes
      page.on('console', msg => {
        if (msg.type() === 'info' && msg.text().includes('ROUTE_CHANGE')) {
          routes.push(msg.text())
        }
      })

      // Navigate and wait for app to initialize
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: this.config.timeout
      })

      // Wait for SPA to fully initialize
      await this.waitForSPAInit(page)

      // Extract route information
      const routeInfo = await this.extractRoutes(page)

      // Navigate through main routes if possible
      const exploredRoutes = await this.exploreRoutes(page, routeInfo.routes.slice(0, 5))

      // Extract content from current view
      const content = await this.extractSPAContent(page)
      const metadata = await this.extractMetadata(page)
      
      // Extract social media accounts with full SPA context
      const socialAccounts = await socialMediaExtractor.extract(page)
      if (socialAccounts.length > 0) {
        // Convert array to object format expected by UI
        const socialAccountsMap: Record<string, string> = {}
        socialAccounts.forEach(account => {
          // Use platform as key, URL as value (avoid duplicates)
          if (!socialAccountsMap[account.platform]) {
            socialAccountsMap[account.platform] = account.url
          }
        })
        metadata.socialMediaAccounts = socialAccountsMap
      }
      
      const metrics = await this.measureMetrics(startTime, page)

      // Extract SPA specific information
      const spaInfo = await this.extractSPAInfo(page)
      
      return {
        content,
        title: metadata.title,
        description: metadata.description || metadata['og:description'],
        metadata: {
          ...metadata,
          ...spaInfo,
          routes: routeInfo,
          exploredRoutes
        },
        metrics,
        errors: errors.length > 0 ? errors : undefined,
        strategy: this.strategyName
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      errors.push(`SPA scraping failed: ${errorMessage}`)
      permanentLogger.captureError('SPA_STRATEGY', new Error('Scraping failed'), { url, error: errorMessage })
      
      return {
        content: '',
        errors,
        strategy: this.strategyName
      }
    } finally {
      await page.close()
    }
  }

  /**
   * Wait for SPA to initialize
   * 
   * @param page - Page instance
   */
  private async waitForSPAInit(page: Page): Promise<void> {
    try {
      // Wait for common SPA initialization indicators
      const initSelectors = [
        '[data-app-ready="true"]',
        '[data-loaded="true"]',
        '.app-initialized',
        '#app.hydrated',
        '#root[data-hydrated]'
      ]

      let initialized = false
      for (const selector of initSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 })
          initialized = true
          break
        } catch {
          // Continue to next selector
        }
      }

      if (!initialized) {
        // Fallback: wait for common framework indicators
        await page.waitForFunction(() => {
          return !!(
            (window as any).React?.version ||
            (window as any).Vue?.version ||
            (window as any).angular ||
            document.querySelector('[data-reactroot]') ||
            document.querySelector('[data-v-]')
          )
        }, { timeout: 10000 })
      }

      // Additional wait for async operations
      await page.waitForTimeout(2000)

    } catch (error) {
      this.log('SPA initialization wait timeout', error)
    }
  }

  /**
   * Extract routes from SPA
   * 
   * @param page - Page instance
   * @returns Route information
   */
  private async extractRoutes(page: Page): Promise<any> {
    return await page.evaluate(() => {
      const routes: string[] = []
      const routeInfo: Record<string, any> = {
        routes: [],
        currentRoute: window.location.pathname,
        framework: ''
      }

      // Try to detect framework and extract routes
      try {
        // React Router
        if ((window as any).__REACT_ROUTER__) {
          routeInfo.framework = 'React Router'
          const router = (window as any).__REACT_ROUTER__
          if (router.routes) {
            routes.push(...Object.keys(router.routes))
          }
        }

        // Vue Router
        if ((window as any).$router || (window as any).__VUE_ROUTER__) {
          routeInfo.framework = 'Vue Router'
          const router = (window as any).$router || (window as any).__VUE_ROUTER__
          if (router.options?.routes) {
            routes.push(...router.options.routes.map((r: any) => r.path))
          }
        }

        // Angular Router
        if ((window as any).ng?.router) {
          routeInfo.framework = 'Angular Router'
          const router = (window as any).ng.router
          if (router.config) {
            routes.push(...router.config.map((r: any) => r.path))
          }
        }
      } catch (e) {
      // Log error but re-throw to avoid silent failures
      permanentLogger.captureError('ERROR', e as Error, {
        context: 'Unhandled error - needs proper handling'
      })
      throw e
    }

      // Fallback: extract from links
      if (routes.length === 0) {
        const links = Array.from(document.querySelectorAll('a[href]'))
        const internalLinks = links
          .map(link => link.getAttribute('href'))
          .filter(href => href && (href.startsWith('/') || href.startsWith('#')))
          .filter(href => !href.includes('http'))
        
        routes.push(...new Set(internalLinks))
      }

      routeInfo.routes = [...new Set(routes)].slice(0, 20)
      return routeInfo
    })
  }

  /**
   * Explore routes in SPA
   * 
   * @param page - Page instance
   * @param routes - Routes to explore
   * @returns Explored route data
   */
  private async exploreRoutes(page: Page, routes: string[]): Promise<any[]> {
    const exploredRoutes: any[] = []
    
    for (const route of routes) {
      try {
        // Navigate to route
        await page.evaluate((r) => {
          if (window.history?.pushState) {
            window.history.pushState({}, '', r)
            // Trigger route change event
            window.dispatchEvent(new PopStateEvent('popstate'))
          }
        }, route)

        // Wait for content to update
        await page.waitForTimeout(1000)

        // Extract route content
        const routeData = await page.evaluate(() => ({
          url: window.location.pathname,
          title: document.title,
          contentLength: document.body.innerText.length,
          hasContent: document.body.innerText.length > 100
        }))

        exploredRoutes.push(routeData)
      } catch (error) {
        this.log(`Failed to explore route: ${route}`, error)
      }
    }

    return exploredRoutes
  }

  /**
   * Extract content from SPA
   * 
   * @param page - Page instance
   * @returns Extracted content
   */
  private async extractSPAContent(page: Page): Promise<string> {
    return await page.evaluate(() => {
      // Framework-specific content extraction
      let contentRoot: Element | null = null

      // React
      contentRoot = document.querySelector('#root') || 
                   document.querySelector('#__next') ||
                   document.querySelector('[data-reactroot]')

      // Vue
      if (!contentRoot) {
        contentRoot = document.querySelector('#app') ||
                     document.querySelector('[data-server-rendered="true"]')
      }

      // Angular
      if (!contentRoot) {
        contentRoot = document.querySelector('app-root') ||
                     document.querySelector('[ng-app]')
      }

      // Fallback
      if (!contentRoot) {
        contentRoot = document.querySelector('main') || document.body
      }

      // Clean content
      const clone = contentRoot.cloneNode(true) as Element

      // Remove non-content elements
      const removeSelectors = [
        'script',
        'style',
        'nav',
        'header',
        'footer',
        '.navigation',
        '.sidebar',
        '[data-testid]',
        '[data-test]'
      ]

      removeSelectors.forEach(selector => {
        clone.querySelectorAll(selector).forEach(el => el.remove())
      })

      return clone.textContent?.trim() || ''
    })
  }

  /**
   * Extract SPA specific information
   * 
   * @param page - Page instance
   * @returns SPA information
   */
  private async extractSPAInfo(page: Page): Promise<Record<string, any>> {
    return await page.evaluate(() => {
      const info: Record<string, any> = {}

      // Framework detection with version
      if ((window as any).React) {
        info.framework = 'React'
        info.frameworkVersion = (window as any).React.version
      } else if ((window as any).Vue) {
        info.framework = 'Vue'
        info.frameworkVersion = (window as any).Vue.version
      } else if ((window as any).angular) {
        info.framework = 'Angular'
        info.frameworkVersion = (window as any).angular.version
      }

      // Build tool detection
      if (document.querySelector('script[src*="webpack"]')) {
        info.buildTool = 'Webpack'
      } else if (document.querySelector('script[src*="vite"]')) {
        info.buildTool = 'Vite'
      } else if (document.querySelector('script[src*="parcel"]')) {
        info.buildTool = 'Parcel'
      }

      // State management
      if ((window as any).__REDUX_DEVTOOLS_EXTENSION__) {
        info.stateManagement = 'Redux'
      } else if ((window as any).__MOBX_DEVTOOLS_GLOBAL_HOOK__) {
        info.stateManagement = 'MobX'
      } else if ((window as any).__VUE_DEVTOOLS_GLOBAL_HOOK__) {
        info.stateManagement = 'Vuex'
      }

      // Component count
      if (info.framework === 'React') {
        const reactComponents = document.querySelectorAll('[data-reactroot] *')
        info.componentCount = reactComponents.length
      }

      // Get app configuration if exposed
      if ((window as any).__APP_CONFIG__) {
        info.hasAppConfig = true
      }

      return info
    })
  }
}