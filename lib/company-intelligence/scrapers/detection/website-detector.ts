/**
 * Website Framework Detection System
 * Automatically identifies website technology stack for optimal scraper selection
 */

import * as cheerio from 'cheerio'
import { permanentLogger } from '../../../utils/permanent-logger'

export interface WebsiteSignature {
  framework: string
  confidence: number
  indicators: string[]
}

export interface WebsiteAnalysis {
  url: string
  frameworks: WebsiteSignature[]
  isStatic: boolean
  requiresJS: boolean
  hasForms: boolean
  hasInfiniteScroll: boolean
  requiresCrossBrowser: boolean
  recommendedScraper: 'cheerio' | 'puppeteer' | 'playwright'
}

interface FrameworkIndicator {
  selector?: string
  header?: string
  value?: string
  path?: string
  script?: string
  meta?: string
  weight: number
}

export class WebsiteDetector {
  private static signatures: Record<string, { indicators: FrameworkIndicator[] }> = {
    nextjs: {
      indicators: [
        { selector: 'script[src*="/_next"]', weight: 10 },
        { selector: '#__next', weight: 8 },
        { header: 'x-powered-by', value: 'Next.js', weight: 10 },
        { meta: 'next-head-count', weight: 10 },
        { script: '__NEXT_DATA__', weight: 10 },
        { path: '/_next/static/', weight: 8 }
      ]
    },
    wordpress: {
      indicators: [
        { selector: 'meta[name="generator"][content*="WordPress"]', weight: 10 },
        { selector: 'link[rel="https://api.w.org/"]', weight: 8 },
        { path: '/wp-content/', weight: 6 },
        { path: '/wp-includes/', weight: 6 },
        { path: '/wp-admin/', weight: 6 },
        { script: 'wp-emoji', weight: 4 }
      ]
    },
    webflow: {
      indicators: [
        { selector: '.w-webflow-badge', weight: 8 },
        { selector: 'meta[name="generator"][content*="Webflow"]', weight: 10 },
        { script: 'webflow.js', weight: 8 },
        { selector: '[data-wf-page]', weight: 6 },
        { script: 'Webflow', weight: 6 }
      ]
    },
    react: {
      indicators: [
        { selector: '#root', weight: 5 },
        { selector: '[data-reactroot]', weight: 8 },
        { script: 'react', weight: 6 },
        { script: 'React', weight: 6 },
        { script: '_react', weight: 4 }
      ]
    },
    vue: {
      indicators: [
        { selector: '#app', weight: 5 },
        { selector: '[data-v-]', weight: 8 },
        { script: 'vue', weight: 6 },
        { script: 'Vue', weight: 6 },
        { meta: 'generator', value: 'Vue', weight: 8 }
      ]
    },
    angular: {
      indicators: [
        { selector: '[ng-app]', weight: 8 },
        { selector: '[ng-version]', weight: 10 },
        { selector: 'app-root', weight: 6 },
        { script: 'angular', weight: 6 },
        { script: 'Angular', weight: 6 }
      ]
    },
    shopify: {
      indicators: [
        { meta: 'shopify-digital-wallet', weight: 10 },
        { selector: '.shopify-section', weight: 8 },
        { script: 'cdn.shopify.com', weight: 8 },
        { path: '/cdn/shop/', weight: 6 },
        { script: 'Shopify', weight: 6 }
      ]
    },
    wix: {
      indicators: [
        { meta: 'generator', value: 'Wix.com', weight: 10 },
        { selector: '[data-wix-comp]', weight: 8 },
        { script: 'static.wixstatic.com', weight: 8 },
        { selector: '#SITE_CONTAINER', weight: 6 }
      ]
    },
    squarespace: {
      indicators: [
        { selector: '.sqs-block', weight: 6 },
        { script: 'static.squarespace.com', weight: 8 },
        { meta: 'generator', value: 'Squarespace', weight: 10 },
        { selector: '#siteWrapper', weight: 6 }
      ]
    },
    gatsby: {
      indicators: [
        { selector: '#___gatsby', weight: 10 },
        { meta: 'generator', value: 'Gatsby', weight: 10 },
        { script: 'gatsby', weight: 6 },
        { path: '/static/', weight: 4 }
      ]
    },
    nuxt: {
      indicators: [
        { selector: '#__nuxt', weight: 10 },
        { meta: 'generator', value: 'Nuxt', weight: 10 },
        { script: '__NUXT__', weight: 8 },
        { path: '/_nuxt/', weight: 8 }
      ]
    },
    jekyll: {
      indicators: [
        { meta: 'generator', value: 'Jekyll', weight: 10 },
        { selector: '.jekyll', weight: 4 },
        { path: '/assets/', weight: 2 }
      ]
    },
    drupal: {
      indicators: [
        { meta: 'generator', value: 'Drupal', weight: 10 },
        { header: 'x-generator', value: 'Drupal', weight: 10 },
        { path: '/sites/default/', weight: 6 },
        { script: 'Drupal', weight: 6 }
      ]
    },
    joomla: {
      indicators: [
        { meta: 'generator', value: 'Joomla', weight: 10 },
        { path: '/components/com_', weight: 6 },
        { path: '/modules/mod_', weight: 6 },
        { script: 'Joomla', weight: 6 }
      ]
    },
    magento: {
      indicators: [
        { script: 'Mage', weight: 8 },
        { path: '/skin/frontend/', weight: 6 },
        { path: '/media/catalog/', weight: 6 },
        { selector: '.magento', weight: 4 }
      ]
    }
  }

  static async detect(html: string, headers: Record<string, string> = {}): Promise<WebsiteSignature[]> {
    const startTime = Date.now()
    permanentLogger.info('WEBSITE_DETECTOR', 'Starting framework detection')
    
    const $ = cheerio.load(html)
    const results: WebsiteSignature[] = []

    for (const [framework, config] of Object.entries(this.signatures)) {
      let score = 0
      const foundIndicators: string[] = []

      for (const indicator of config.indicators) {
        // Check selector
        if (indicator.selector) {
          try {
            if ($(indicator.selector).length > 0) {
              score += indicator.weight
              foundIndicators.push(`selector: ${indicator.selector}`)
              permanentLogger.info('WEBSITE_DETECTOR', `Found selector indicator for ${framework}`, { 
                selector: indicator.selector 
              })
            }
          } catch (e) {
      // Log error but re-throw to avoid silent failures
      permanentLogger.captureError('ERROR', e as Error, {
        context: 'Unhandled error - needs proper handling'
      })
      throw e
    }
        }

        // Check header
        if (indicator.header && headers[indicator.header]) {
          const headerValue = headers[indicator.header].toLowerCase()
          if (!indicator.value || headerValue.includes(indicator.value.toLowerCase())) {
            score += indicator.weight
            foundIndicators.push(`header: ${indicator.header}`)
            permanentLogger.info('WEBSITE_DETECTOR', `Found header indicator for ${framework}`, { 
              header: indicator.header,
              value: headerValue 
            })
          }
        }

        // Check path in HTML
        if (indicator.path && html.includes(indicator.path)) {
          score += indicator.weight
          foundIndicators.push(`path: ${indicator.path}`)
          permanentLogger.info('WEBSITE_DETECTOR', `Found path indicator for ${framework}`, { 
            path: indicator.path 
          })
        }

        // Check script content
        if (indicator.script && html.includes(indicator.script)) {
          score += indicator.weight
          foundIndicators.push(`script: ${indicator.script}`)
          permanentLogger.info('WEBSITE_DETECTOR', `Found script indicator for ${framework}`, { 
            script: indicator.script 
          })
        }

        // Check meta tags
        if (indicator.meta) {
          const metaContent = $(`meta[name="${indicator.meta}"]`).attr('content') || 
                             $(`meta[property="${indicator.meta}"]`).attr('content')
          if (metaContent) {
            if (!indicator.value || metaContent.toLowerCase().includes(indicator.value.toLowerCase())) {
              score += indicator.weight
              foundIndicators.push(`meta: ${indicator.meta}`)
              permanentLogger.info('WEBSITE_DETECTOR', `Found meta indicator for ${framework}`, { 
                meta: indicator.meta,
                content: metaContent 
              })
            }
          }
        }
      }

      if (score > 0) {
        const confidence = Math.min(score / 10, 1) // Normalize to 0-1
        results.push({
          framework,
          confidence,
          indicators: foundIndicators
        })
      }
    }

    // Sort by confidence
    results.sort((a, b) => b.confidence - a.confidence)

    permanentLogger.info('WEBSITE_DETECTOR', 'Framework detection complete', {
      duration: Date.now() - startTime,
      frameworksDetected: results.map(r => `${r.framework} (${Math.round(r.confidence * 100)}%)`),
      topFramework: results[0]?.framework || 'unknown'
    })

    return results
  }

  static async analyze(url: string, html: string, headers: Record<string, string> = {}): Promise<WebsiteAnalysis> {
    const frameworks = await this.detect(html, headers)
    const $ = cheerio.load(html)

    // Analyze characteristics
    const hasReactIndicators = html.includes('React') || html.includes('react') || $('#root').length > 0
    const hasVueIndicators = html.includes('Vue') || html.includes('vue') || $('#app').length > 0
    const hasAngularIndicators = $('[ng-app], [ng-version], app-root').length > 0
    const hasNextIndicators = html.includes('__NEXT_DATA__') || html.includes('/_next/')
    
    const isStatic = !hasReactIndicators && !hasVueIndicators && !hasAngularIndicators && !hasNextIndicators
    const requiresJS = !isStatic || frameworks.some(f => 
      ['react', 'vue', 'angular', 'nextjs', 'gatsby', 'nuxt'].includes(f.framework)
    )
    
    const hasForms = $('form').length > 0
    const hasInfiniteScroll = html.includes('IntersectionObserver') || 
                             html.includes('infinite') || 
                             html.includes('loadMore')

    // Determine recommended scraper
    let recommendedScraper: 'cheerio' | 'puppeteer' | 'playwright' = 'cheerio'
    
    if (requiresJS || hasInfiniteScroll) {
      recommendedScraper = 'puppeteer'
      
      // Use Playwright for complex scenarios
      if (frameworks.some(f => f.framework === 'angular' && f.confidence > 0.7) ||
          frameworks.some(f => f.framework === 'wix' && f.confidence > 0.7)) {
        recommendedScraper = 'playwright'
      }
    }

    const analysis: WebsiteAnalysis = {
      url,
      frameworks,
      isStatic,
      requiresJS,
      hasForms,
      hasInfiniteScroll,
      requiresCrossBrowser: false,
      recommendedScraper
    }

    permanentLogger.info('WEBSITE_DETECTOR', 'Website analysis complete', {
      url,
      topFramework: frameworks[0]?.framework || 'unknown',
      isStatic,
      requiresJS,
      recommendedScraper,
      characteristics: {
        hasForms,
        hasInfiniteScroll
      }
    })

    return analysis
  }

  static getFrameworkSpecificSelectors(framework: string): Record<string, string> {
    const selectors: Record<string, Record<string, string>> = {
      wordpress: {
        title: '.entry-title, .post-title, h1.title',
        content: '.entry-content, .post-content, article',
        author: '.author-name, .by-author, .entry-author',
        date: '.entry-date, .published, time',
        categories: '.category, .cat-links',
        tags: '.tags, .tag-links'
      },
      shopify: {
        productTitle: '.product__title, h1.product-title',
        price: '.product__price, .price',
        description: '.product__description, .product-description',
        images: '.product__image img, .product-photo img',
        variants: '.product-form__input, .variant-input',
        addToCart: '.product-form__cart-submit, button[name="add"]'
      },
      nextjs: {
        main: 'main, #__next',
        navigation: 'nav, header nav',
        content: 'article, section, .content',
        footer: 'footer'
      },
      webflow: {
        container: '.w-container, .container',
        section: '.w-section, .section',
        nav: '.w-nav, .navbar',
        content: '.w-richtext, .rich-text'
      }
    }

    return selectors[framework] || {}
  }
}

// Export types
export type { FrameworkIndicator }