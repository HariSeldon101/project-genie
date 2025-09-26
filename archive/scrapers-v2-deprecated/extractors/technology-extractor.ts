/**
 * Extracts technology stack information from HTML
 *
 * @module scrapers-v2/extractors/technology-extractor
 * @description Detects technologies, frameworks, and libraries used by analyzing
 * HTML patterns, script sources, meta tags, and other fingerprints.
 * Uses pattern matching similar to Wappalyzer but optimized for our use case.
 *
 * DETECTION METHODS:
 * - Meta generator tags (CMS detection)
 * - JavaScript global variables (framework detection)
 * - CSS class patterns (UI framework detection)
 * - Script/link URLs (library detection)
 * - HTML attributes and comments
 * - HTTP headers (when available)
 *
 * COMPLIANCE:
 * - Pure extraction logic
 * - No external API calls
 * - Returns confidence scores
 */

import type { CheerioAPI } from 'cheerio'
import type { TechnologyStack, Technology } from '@/lib/company-intelligence/types/scraping-interfaces'
import { TechConfidence, ScraperType } from '@/lib/company-intelligence/types/scraping-enums'
import type { Url } from '../core/types'
import { BaseExtractor } from './extractor.interface'
import { permanentLogger } from '@/lib/utils/permanent-logger'

/**
 * Technology detection patterns
 * Based on common fingerprints left by frameworks and libraries
 */
const TECHNOLOGY_PATTERNS = {
  // Frontend frameworks
  react: {
    name: 'React',
    category: 'frontend',
    patterns: {
      globals: ['React', '__REACT_DEVTOOLS_GLOBAL_HOOK__', '_react'],
      attributes: ['data-reactroot', 'data-reactid', 'data-react-helmet'],
      scripts: ['react.js', 'react.min.js', 'react.production', '/static/js/'],
      comments: ['This HTML file is a template']
    }
  },
  vue: {
    name: 'Vue.js',
    category: 'frontend',
    patterns: {
      globals: ['Vue', '__VUE__', '__VUE_DEVTOOLS_GLOBAL_HOOK__'],
      attributes: ['v-if', 'v-for', 'v-model', 'v-show', 'v-bind', ':class'],
      scripts: ['vue.js', 'vue.min.js', 'vue@', '/vue/'],
      meta: { 'generator': 'Nuxt' }
    }
  },
  angular: {
    name: 'Angular',
    category: 'frontend',
    patterns: {
      globals: ['ng', 'angular', '__NG_CLI_ANALYTICS__'],
      attributes: ['ng-app', 'ng-controller', '*ngIf', '*ngFor', '[ngClass]'],
      scripts: ['angular.js', 'angular.min.js', '@angular/', '/main.'],
      comments: ['Angular']
    }
  },
  nextjs: {
    name: 'Next.js',
    category: 'frontend',
    patterns: {
      attributes: ['data-nextjs', 'data-next-router'],
      scripts: ['/_next/', '/_next/static/', 'next.js'],
      meta: { 'next-head-count': '.*' },
      comments: ['/_next/']
    }
  },

  // CSS frameworks
  bootstrap: {
    name: 'Bootstrap',
    category: 'frontend',
    patterns: {
      classes: ['container', 'row', 'col-', 'btn-primary', 'navbar-'],
      links: ['bootstrap.css', 'bootstrap.min.css', 'bootstrapcdn.com']
    }
  },
  tailwind: {
    name: 'Tailwind CSS',
    category: 'frontend',
    patterns: {
      classes: ['flex', 'w-full', 'h-screen', 'bg-gray-', 'text-sm', 'p-4', 'mx-auto'],
      comments: ['Tailwind']
    }
  },

  // Backend/CMS
  wordpress: {
    name: 'WordPress',
    category: 'backend',
    patterns: {
      meta: { 'generator': 'WordPress' },
      links: ['/wp-content/', '/wp-includes/'],
      scripts: ['/wp-content/', '/wp-includes/', 'wp-emoji'],
      comments: ['WordPress', 'wp-content']
    }
  },
  shopify: {
    name: 'Shopify',
    category: 'backend',
    patterns: {
      meta: { 'generator': 'Shopify' },
      scripts: ['cdn.shopify.com', '/s/files/'],
      globals: ['Shopify', '__st'],
      attributes: ['data-shopify']
    }
  },
  drupal: {
    name: 'Drupal',
    category: 'backend',
    patterns: {
      meta: { 'generator': 'Drupal' },
      scripts: ['/sites/all/', '/sites/default/'],
      comments: ['Drupal']
    }
  },

  // Analytics
  googleAnalytics: {
    name: 'Google Analytics',
    category: 'analytics',
    patterns: {
      scripts: ['google-analytics.com/analytics.js', 'googletagmanager.com/gtag/', 'gtag.js'],
      globals: ['ga', 'gtag', '_gaq', '__gaTracker']
    }
  },
  googleTagManager: {
    name: 'Google Tag Manager',
    category: 'analytics',
    patterns: {
      scripts: ['googletagmanager.com/gtm.js'],
      attributes: ['data-gtm'],
      comments: ['Google Tag Manager']
    }
  },
  segment: {
    name: 'Segment',
    category: 'analytics',
    patterns: {
      scripts: ['cdn.segment.com', 'segment.js'],
      globals: ['analytics', '__segment']
    }
  },

  // Hosting/CDN
  cloudflare: {
    name: 'Cloudflare',
    category: 'hosting',
    patterns: {
      scripts: ['cloudflare.com', 'cloudflare-static'],
      meta: { 'cdn': 'Cloudflare' }
    }
  },
  vercel: {
    name: 'Vercel',
    category: 'hosting',
    patterns: {
      headers: { 'x-vercel-id': '.*' },
      comments: ['Vercel']
    }
  },
  netlify: {
    name: 'Netlify',
    category: 'hosting',
    patterns: {
      headers: { 'x-nf-request-id': '.*' },
      comments: ['Netlify']
    }
  }
} as const

/**
 * Extracts technology stack from HTML
 */
export class TechnologyExtractor extends BaseExtractor<TechnologyStack> {
  /**
   * Extract technology stack from HTML
   */
  extract($: CheerioAPI, url: Url): TechnologyStack | undefined {
    try {
      const technologies: Technology[] = []
      const detected = new Set<string>()

      // Extract from meta tags
      this.detectFromMeta($, technologies, detected)

      // Extract from scripts
      this.detectFromScripts($, technologies, detected)

      // Extract from stylesheets
      this.detectFromStylesheets($, technologies, detected)

      // Extract from HTML attributes
      this.detectFromAttributes($, technologies, detected)

      // Extract from comments
      this.detectFromComments($, technologies, detected)

      // Extract from inline scripts (check for globals)
      this.detectFromInlineScripts($, technologies, detected)

      // Categorize technologies
      const stack = this.categorizeTechnologies(technologies)

      // Add CMS if detected
      this.detectCMS($, stack)

      // Add e-commerce platform if detected
      this.detectEcommerce($, stack)

      permanentLogger.debug('TECHNOLOGY_EXTRACTOR', 'Technologies detected', {
        url,
        count: technologies.length,
        categories: Object.keys(stack).filter(k =>
          (stack as any)[k]?.length > 0
        )
      })

      return stack

    } catch (error) {
      permanentLogger.captureError('TECHNOLOGY_EXTRACTOR', error as Error, { url })
      return undefined
    }
  }

  /**
   * Detect technologies from meta tags
   */
  private detectFromMeta($: CheerioAPI, technologies: Technology[], detected: Set<string>): void {
    for (const [key, tech] of Object.entries(TECHNOLOGY_PATTERNS)) {
      if (detected.has(key)) continue

      if (tech.patterns.meta) {
        for (const [metaName, pattern] of Object.entries(tech.patterns.meta)) {
          const content = this.getMetaContent($, metaName)
          if (content && new RegExp(pattern).test(content)) {
            technologies.push(this.createTechnology(
              tech.name,
              content.match(/\d+\.\d+/)?.[0],
              TechConfidence.CERTAIN
            ))
            detected.add(key)
            break
          }
        }
      }
    }
  }

  /**
   * Detect technologies from script tags
   */
  private detectFromScripts($: CheerioAPI, technologies: Technology[], detected: Set<string>): void {
    const scripts = $('script[src]')

    scripts.each((_, element) => {
      const src = $(element).attr('src') || ''

      for (const [key, tech] of Object.entries(TECHNOLOGY_PATTERNS)) {
        if (detected.has(key)) continue

        if (tech.patterns.scripts) {
          for (const scriptPattern of tech.patterns.scripts) {
            if (src.includes(scriptPattern)) {
              // Try to extract version from URL
              const version = this.extractVersionFromUrl(src)
              technologies.push(this.createTechnology(
                tech.name,
                version,
                TechConfidence.PROBABLE
              ))
              detected.add(key)
              break
            }
          }
        }
      }
    })
  }

  /**
   * Detect technologies from stylesheets
   */
  private detectFromStylesheets($: CheerioAPI, technologies: Technology[], detected: Set<string>): void {
    const links = $('link[rel="stylesheet"]')

    links.each((_, element) => {
      const href = $(element).attr('href') || ''

      for (const [key, tech] of Object.entries(TECHNOLOGY_PATTERNS)) {
        if (detected.has(key)) continue

        if (tech.patterns.links) {
          for (const linkPattern of tech.patterns.links) {
            if (href.includes(linkPattern)) {
              const version = this.extractVersionFromUrl(href)
              technologies.push(this.createTechnology(
                tech.name,
                version,
                TechConfidence.PROBABLE
              ))
              detected.add(key)
              break
            }
          }
        }
      }
    })
  }

  /**
   * Detect technologies from HTML attributes
   */
  private detectFromAttributes($: CheerioAPI, technologies: Technology[], detected: Set<string>): void {
    const html = $.html()

    for (const [key, tech] of Object.entries(TECHNOLOGY_PATTERNS)) {
      if (detected.has(key)) continue

      if (tech.patterns.attributes) {
        for (const attr of tech.patterns.attributes) {
          // Check if attribute exists in HTML
          if (html.includes(attr)) {
            technologies.push(this.createTechnology(
              tech.name,
              undefined,
              TechConfidence.PROBABLE
            ))
            detected.add(key)
            break
          }
        }
      }
    }
  }

  /**
   * Detect technologies from HTML comments
   */
  private detectFromComments($: CheerioAPI, technologies: Technology[], detected: Set<string>): void {
    const html = $.html()
    const commentRegex = /<!--[\s\S]*?-->/g
    const comments = html.match(commentRegex) || []

    for (const comment of comments) {
      for (const [key, tech] of Object.entries(TECHNOLOGY_PATTERNS)) {
        if (detected.has(key)) continue

        if (tech.patterns.comments) {
          for (const commentPattern of tech.patterns.comments) {
            if (comment.includes(commentPattern)) {
              technologies.push(this.createTechnology(
                tech.name,
                undefined,
                TechConfidence.POSSIBLE
              ))
              detected.add(key)
              break
            }
          }
        }
      }
    }
  }

  /**
   * Detect technologies from inline scripts (check for global variables)
   */
  private detectFromInlineScripts($: CheerioAPI, technologies: Technology[], detected: Set<string>): void {
    const scripts = $('script:not([src])')
    const scriptContent = scripts.text()

    for (const [key, tech] of Object.entries(TECHNOLOGY_PATTERNS)) {
      if (detected.has(key)) continue

      if (tech.patterns.globals) {
        for (const global of tech.patterns.globals) {
          // Check if global variable is mentioned
          if (scriptContent.includes(global)) {
            technologies.push(this.createTechnology(
              tech.name,
              undefined,
              TechConfidence.PROBABLE
            ))
            detected.add(key)
            break
          }
        }
      }
    }
  }

  /**
   * Detect CSS framework from class patterns
   */
  private detectCSSFramework($: CheerioAPI, technologies: Technology[], detected: Set<string>): void {
    const allClasses = new Set<string>()

    // Collect all classes
    $('[class]').each((_, element) => {
      const classes = $(element).attr('class')?.split(' ') || []
      classes.forEach(cls => allClasses.add(cls))
    })

    // Check for Bootstrap patterns
    if (!detected.has('bootstrap')) {
      const bootstrapClasses = ['container', 'row', 'col-md-', 'btn-primary', 'navbar']
      const hasBootstrap = bootstrapClasses.some(cls =>
        Array.from(allClasses).some(c => c.startsWith(cls))
      )
      if (hasBootstrap) {
        technologies.push(this.createTechnology('Bootstrap', undefined, TechConfidence.PROBABLE))
        detected.add('bootstrap')
      }
    }

    // Check for Tailwind patterns
    if (!detected.has('tailwind')) {
      const tailwindClasses = ['flex', 'w-full', 'bg-gray-', 'text-sm', 'p-4', 'mx-auto']
      const hasTailwind = tailwindClasses.filter(cls =>
        Array.from(allClasses).some(c => c === cls || c.startsWith(cls))
      ).length >= 3

      if (hasTailwind) {
        technologies.push(this.createTechnology('Tailwind CSS', undefined, TechConfidence.PROBABLE))
        detected.add('tailwind')
      }
    }
  }

  /**
   * Categorize technologies into stack categories
   */
  private categorizeTechnologies(technologies: Technology[]): TechnologyStack {
    const stack: TechnologyStack = {
      frontend: [],
      backend: [],
      analytics: [],
      hosting: []
    }

    for (const tech of technologies) {
      // Find category from patterns
      for (const [_, pattern] of Object.entries(TECHNOLOGY_PATTERNS)) {
        if (pattern.name === tech.name) {
          const category = pattern.category
          if (category === 'frontend') {
            stack.frontend.push(tech)
          } else if (category === 'backend') {
            stack.backend.push(tech)
          } else if (category === 'analytics') {
            stack.analytics.push(tech)
          } else if (category === 'hosting') {
            stack.hosting.push(tech)
          }
          break
        }
      }
    }

    return stack
  }

  /**
   * Detect CMS platform
   */
  private detectCMS($: CheerioAPI, stack: TechnologyStack): void {
    const generator = this.getMetaContent($, 'generator')

    if (generator) {
      if (generator.toLowerCase().includes('wordpress')) {
        stack.cms = 'WordPress'
      } else if (generator.toLowerCase().includes('drupal')) {
        stack.cms = 'Drupal'
      } else if (generator.toLowerCase().includes('joomla')) {
        stack.cms = 'Joomla'
      } else if (generator.toLowerCase().includes('wix')) {
        stack.cms = 'Wix'
      } else if (generator.toLowerCase().includes('squarespace')) {
        stack.cms = 'Squarespace'
      }
    }
  }

  /**
   * Detect e-commerce platform
   */
  private detectEcommerce($: CheerioAPI, stack: TechnologyStack): void {
    const generator = this.getMetaContent($, 'generator')
    const html = $.html()

    if (generator?.toLowerCase().includes('shopify') || html.includes('cdn.shopify.com')) {
      stack.ecommerce = 'Shopify'
    } else if (generator?.toLowerCase().includes('woocommerce') || html.includes('woocommerce')) {
      stack.ecommerce = 'WooCommerce'
    } else if (html.includes('magento')) {
      stack.ecommerce = 'Magento'
    } else if (html.includes('bigcommerce')) {
      stack.ecommerce = 'BigCommerce'
    }
  }

  /**
   * Extract version from URL
   */
  private extractVersionFromUrl(url: string): string | undefined {
    // Try common version patterns in URLs
    const patterns = [
      /@(\d+\.\d+\.\d+)/,  // @1.2.3
      /\/v?(\d+\.\d+\.\d+)/, // /v1.2.3 or /1.2.3
      /-(\d+\.\d+\.\d+)/,  // -1.2.3
      /\.(\d+\.\d+\.\d+)\./ // .1.2.3.
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) {
        return match[1]
      }
    }

    return undefined
  }

  /**
   * Create technology object
   */
  private createTechnology(name: string, version?: string, confidence: TechConfidence = TechConfidence.POSSIBLE): Technology {
    return {
      name,
      version,
      confidence,
      detectedBy: [ScraperType.STATIC]
    }
  }

  /**
   * Validate technology stack
   */
  validate(data: TechnologyStack): boolean {
    if (!data) return false

    // Must have at least one technology detected
    return data.frontend.length > 0 ||
           data.backend.length > 0 ||
           data.analytics.length > 0 ||
           data.hosting.length > 0 ||
           !!data.cms ||
           !!data.ecommerce
  }

  /**
   * Get confidence score
   */
  getConfidence(data: TechnologyStack): number {
    if (!data) return 0

    let score = 0
    let totalTech = 0

    // Score based on number and confidence of detected technologies
    const allTech = [
      ...data.frontend,
      ...data.backend,
      ...data.analytics,
      ...data.hosting
    ]

    for (const tech of allTech) {
      totalTech++
      switch (tech.confidence) {
        case TechConfidence.CERTAIN:
          score += 10
          break
        case TechConfidence.PROBABLE:
          score += 7
          break
        case TechConfidence.POSSIBLE:
          score += 4
          break
        case TechConfidence.UNCERTAIN:
          score += 2
          break
      }
    }

    // Bonus for CMS/e-commerce detection
    if (data.cms) score += 10
    if (data.ecommerce) score += 10

    return Math.min(score, 100)
  }
}