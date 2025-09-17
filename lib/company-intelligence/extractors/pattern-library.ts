/**
 * Pattern Library for Common Website Structures
 * Provides optimized selectors and extraction patterns for popular CMS and frameworks
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'

export interface SitePattern {
  name: string
  detection: {
    selectors?: string[]
    meta?: Record<string, string>
    headers?: Record<string, string>
    scripts?: string[]
  }
  extraction: {
    companyName?: string[]
    tagline?: string[]
    description?: string[]
    products?: string[]
    services?: string[]
    team?: string[]
    contact?: string[]
    pricing?: string[]
    about?: string[]
  }
}

/**
 * Pattern library for common website platforms
 */
export const SITE_PATTERNS: SitePattern[] = [
  {
    name: 'WordPress',
    detection: {
      meta: { generator: 'WordPress' },
      selectors: ['.wp-content', '#wp-admin-bar'],
      scripts: ['wp-content/themes', 'wp-includes']
    },
    extraction: {
      companyName: ['.site-title', '.site-name', 'h1.site-title', '.navbar-brand'],
      tagline: ['.site-description', '.tagline', '.site-tagline'],
      description: ['.site-description', 'meta[name="description"]'],
      products: ['.products', '.woocommerce-products', '.product-grid'],
      services: ['.services', '.service-item', '.service-box'],
      team: ['.team-member', '.staff-member', '.team-box'],
      contact: ['.contact-info', '.contact-details', '#contact'],
      pricing: ['.pricing-table', '.price-box', '.pricing-plan'],
      about: ['.about-content', '.about-section', '#about']
    }
  },
  {
    name: 'Shopify',
    detection: {
      meta: { generator: 'Shopify' },
      selectors: ['.shopify-section', '#shopify-features'],
      scripts: ['cdn.shopify.com']
    },
    extraction: {
      companyName: ['.site-header__logo', '.header__heading', '.logo'],
      tagline: ['.announcement-bar__message', '.header__tagline'],
      products: ['.product-card', '.product-item', '.grid-product'],
      pricing: ['.product-price', '.price__regular', '.price'],
      contact: ['.footer__contact', '.contact-information'],
      about: ['.about-us', '.rte', '.page-content']
    }
  },
  {
    name: 'Squarespace',
    detection: {
      meta: { generator: 'Squarespace' },
      selectors: ['.sqs-block', '#siteWrapper'],
      scripts: ['static.squarespace.com']
    },
    extraction: {
      companyName: ['.site-title', '.logo-text', '#logoImage'],
      tagline: ['.site-tagline', '.site-description'],
      products: ['.sqs-block-product', '.product-block'],
      services: ['.sqs-block-summary', '.summary-item'],
      team: ['.sqs-block-team-member', '.team-member-block'],
      contact: ['.sqs-block-contact', '.contact-block'],
      about: ['.sqs-block-content', '.page-description']
    }
  },
  {
    name: 'Wix',
    detection: {
      meta: { generator: 'Wix.com' },
      selectors: ['[data-wix-comp]', '#SITE_CONTAINER'],
      scripts: ['static.wixstatic.com']
    },
    extraction: {
      companyName: ['h1[role="heading"]', '[data-testid="logo"]', '.logo'],
      tagline: ['h2[role="heading"]', '.tagline'],
      products: ['[data-hook="product-item"]', '.product-item'],
      services: ['[data-hook="service-item"]', '.service-item'],
      team: ['[data-hook="team-member"]', '.team-member'],
      contact: ['[data-hook="contact-form"]', '.contact-info'],
      pricing: ['[data-hook="pricing-plan"]', '.pricing-plan']
    }
  },
  {
    name: 'Webflow',
    detection: {
      selectors: ['.w-', '[data-wf-page]', '.webflow-badge'],
      meta: { generator: 'Webflow' }
    },
    extraction: {
      companyName: ['.brand', '.logo-text', '.navbar-brand'],
      tagline: ['.hero-subtitle', '.tagline', '.subheading'],
      products: ['.product-card', '.collection-item', '.w-dyn-item'],
      services: ['.service-card', '.service-block', '.feature-block'],
      team: ['.team-member', '.team-card', '.person-card'],
      contact: ['.contact-form', '.contact-block', '.footer-contact'],
      pricing: ['.pricing-card', '.price-card', '.pricing-table'],
      about: ['.about-section', '.about-text', '.content-block']
    }
  },
  {
    name: 'React/Next.js',
    detection: {
      selectors: ['#__next', '#root', '[data-reactroot]'],
      scripts: ['_next/static', 'react', 'webpack']
    },
    extraction: {
      companyName: ['h1', '.logo', 'header h1', 'nav .brand'],
      tagline: ['h2', '.subtitle', '.hero-subtitle', 'header p'],
      products: ['[class*="product"]', '[class*="Product"]', '.card'],
      services: ['[class*="service"]', '[class*="Service"]', '.feature'],
      team: ['[class*="team"]', '[class*="Team"]', '[class*="member"]'],
      contact: ['[class*="contact"]', '[class*="Contact"]', 'footer'],
      pricing: ['[class*="pricing"]', '[class*="Pricing"]', '[class*="plan"]'],
      about: ['[class*="about"]', '[class*="About"]', 'main section']
    }
  },
  {
    name: 'Bootstrap',
    detection: {
      selectors: ['.container', '.row', '.col-', '.btn-primary'],
      scripts: ['bootstrap.min.js', 'bootstrap.bundle']
    },
    extraction: {
      companyName: ['.navbar-brand', '.brand', 'h1.display-1'],
      tagline: ['.lead', '.subtitle', 'p.lead'],
      products: ['.card', '.product-card', '.portfolio-item'],
      services: ['.service-box', '.feature-box', '.icon-box'],
      team: ['.team-member', '.team-card', '.staff-card'],
      contact: ['.contact-info', 'address', '.contact-section'],
      pricing: ['.pricing-card', '.price-table', '.pricing-box'],
      about: ['.about-section', '.about-us', '#about']
    }
  },
  {
    name: 'Ghost',
    detection: {
      meta: { generator: 'Ghost' },
      selectors: ['.gh-', '.ghost-', '[data-ghost]']
    },
    extraction: {
      companyName: ['.site-title', '.site-nav-logo', '.gh-head-logo'],
      tagline: ['.site-description', '.site-subtitle'],
      description: ['meta[name="description"]', '.site-description'],
      about: ['.gh-content', '.post-content', '.page-content'],
      contact: ['.gh-footer', 'footer .contact']
    }
  },
  {
    name: 'Drupal',
    detection: {
      meta: { generator: 'Drupal' },
      selectors: ['.drupal-', '#drupal-', '[data-drupal]']
    },
    extraction: {
      companyName: ['#site-name', '.site-name', '.site-branding__name'],
      tagline: ['#site-slogan', '.site-slogan', '.site-branding__slogan'],
      products: ['.view-products', '.product-teaser', '.node--type-product'],
      services: ['.view-services', '.service-teaser', '.node--type-service'],
      team: ['.view-team', '.team-member', '.node--type-team-member'],
      contact: ['.contact-block', '.block-contact', '#contact-form'],
      about: ['.node--type-page', '.page-content', '.field--name-body']
    }
  },
  {
    name: 'HubSpot',
    detection: {
      selectors: ['.hs-', '[data-hs]', '#hs-'],
      scripts: ['js.hsforms.net', 'js.hs-analytics.net']
    },
    extraction: {
      companyName: ['.logo', '.hs-logo', 'header .brand'],
      tagline: ['.tagline', '.hero-subtitle', '.page-center h2'],
      products: ['.hs-product', '.product-card', '.card-wrapper'],
      services: ['.hs-service', '.service-item', '.icon-box'],
      team: ['.hs-team-member', '.team-member-card'],
      contact: ['.hs-form', 'form[data-hs-form]', '.contact-module'],
      pricing: ['.hs-pricing', '.pricing-card', '.price-table'],
      about: ['.hs-about', '.page-content', '.widget-span']
    }
  }
]

/**
 * Detect website platform/CMS
 */
export function detectPlatform($: cheerio.CheerioAPI): string | null {
  for (const pattern of SITE_PATTERNS) {
    // Check meta tags
    if (pattern.detection.meta) {
      for (const [name, content] of Object.entries(pattern.detection.meta)) {
        const metaContent = $(`meta[name="${name}"]`).attr('content') || 
                           $(`meta[property="${name}"]`).attr('content')
        if (metaContent && metaContent.includes(content)) {
          permanentLogger.info('PATTERN_LIBRARY', `Detected ${pattern.name} via meta tag`)
          return pattern.name
        }
      }
    }
    
    // Check selectors
    if (pattern.detection.selectors) {
      for (const selector of pattern.detection.selectors) {
        if ($(selector).length > 0) {
          permanentLogger.info('PATTERN_LIBRARY', `Detected ${pattern.name} via selector`, { selector })
          return pattern.name
        }
      }
    }
    
    // Check scripts
    if (pattern.detection.scripts) {
      const scripts = $('script[src]').map((_, el) => $(el).attr('src')).get()
      for (const scriptPattern of pattern.detection.scripts) {
        if (scripts.some(src => src?.includes(scriptPattern))) {
          permanentLogger.info('PATTERN_LIBRARY', `Detected ${pattern.name} via script`)
          return pattern.name
        }
      }
    }
  }
  
  return null
}

/**
 * Get optimized selectors for detected platform
 */
export function getOptimizedSelectors(platform: string): SitePattern['extraction'] | null {
  const pattern = SITE_PATTERNS.find(p => p.name === platform)
  return pattern ? pattern.extraction : null
}

/**
 * Extract data using platform-specific patterns
 */
export function extractWithPatterns(
  $: cheerio.CheerioAPI,
  platform: string
): Record<string, any> {
  const selectors = getOptimizedSelectors(platform)
  if (!selectors) return {}
  
  const extracted: Record<string, any> = {}
  
  // Extract each data type using platform-specific selectors
  for (const [dataType, selectorList] of Object.entries(selectors)) {
    if (!selectorList) continue
    
    for (const selector of selectorList) {
      const elements = $(selector)
      if (elements.length > 0) {
        if (elements.length === 1) {
          extracted[dataType] = elements.text().trim()
        } else {
          extracted[dataType] = elements.map((_, el) => $(el).text().trim()).get()
        }
        break // Use first matching selector
      }
    }
  }
  
  return extracted
}

/**
 * Get all possible selectors for a data type across all platforms
 */
export function getAllSelectorsForType(dataType: keyof SitePattern['extraction']): string[] {
  const allSelectors: string[] = []
  
  for (const pattern of SITE_PATTERNS) {
    const selectors = pattern.extraction[dataType]
    if (selectors) {
      allSelectors.push(...selectors)
    }
  }
  
  // Remove duplicates
  return [...new Set(allSelectors)]
}

/**
 * Smart extraction using pattern matching
 */
export function smartExtractWithPatterns($: cheerio.CheerioAPI): Record<string, any> {
  // First try to detect the platform
  const platform = detectPlatform($)
  
  if (platform) {
    permanentLogger.info('PATTERN_LIBRARY', `Using ${platform} patterns for extraction`)
    return extractWithPatterns($, platform)
  }
  
  // Fallback: try all patterns and merge results
  permanentLogger.info('PATTERN_LIBRARY', 'Platform not detected, using all patterns')
  
  const results: Record<string, any> = {}
  const dataTypes: (keyof SitePattern['extraction'])[] = [
    'companyName', 'tagline', 'description', 'products', 
    'services', 'team', 'contact', 'pricing', 'about'
  ]
  
  for (const dataType of dataTypes) {
    const selectors = getAllSelectorsForType(dataType)
    for (const selector of selectors) {
      const elements = $(selector)
      if (elements.length > 0) {
        if (elements.length === 1) {
          results[dataType] = elements.text().trim()
        } else {
          results[dataType] = elements.map((_, el) => $(el).text().trim()).get()
        }
        break // Use first matching selector for each type
      }
    }
  }
  
  return results
}