/**
 * Technology to Strategy Mapping
 * 
 * Maps detected website technologies to optimal scraping strategies.
 * This enables intelligent routing based on site analysis from Phase 1.
 * 
 * Strategy Types:
 * - static: Use Cheerio (10x faster) for static HTML sites
 * - dynamic: Use Playwright for JavaScript-heavy sites
 * - spa: Use Playwright with SPA optimizations
 * - hybrid: Check page-by-page (e.g., Next.js can be static or dynamic)
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'

export type ScrapingStrategy = 'static' | 'dynamic' | 'spa' | 'hybrid'

export interface TechnologyMapping {
  technology: string
  strategy: ScrapingStrategy
  reason: string
  estimatedSpeed: 'fast' | 'normal' | 'slow'
  requiresBrowser: boolean
}

// Technology mappings based on framework detection
const TECHNOLOGY_MAPPINGS: Record<string, TechnologyMapping> = {
  // Static site generators and CMS - Use Cheerio for speed
  WORDPRESS: {
    technology: 'WordPress',
    strategy: 'static',
    reason: 'WordPress renders server-side HTML',
    estimatedSpeed: 'fast',
    requiresBrowser: false
  },
  JEKYLL: {
    technology: 'Jekyll',
    strategy: 'static',
    reason: 'Jekyll generates static HTML',
    estimatedSpeed: 'fast',
    requiresBrowser: false
  },
  HUGO: {
    technology: 'Hugo',
    strategy: 'static',
    reason: 'Hugo generates static HTML',
    estimatedSpeed: 'fast',
    requiresBrowser: false
  },
  DRUPAL: {
    technology: 'Drupal',
    strategy: 'static',
    reason: 'Drupal renders server-side HTML',
    estimatedSpeed: 'fast',
    requiresBrowser: false
  },
  JOOMLA: {
    technology: 'Joomla',
    strategy: 'static',
    reason: 'Joomla renders server-side HTML',
    estimatedSpeed: 'fast',
    requiresBrowser: false
  },
  
  // Hybrid frameworks - Need to check page-by-page
  NEXTJS: {
    technology: 'Next.js',
    strategy: 'static', // TEMPORARY: Changed from 'hybrid' for testing enhancement UI
    reason: 'TESTING: Mapped to static to test enhancement UI flow',
    estimatedSpeed: 'fast', // Changed from 'normal' for testing
    requiresBrowser: false
  },
  GATSBY: {
    technology: 'Gatsby',
    strategy: 'static', // Gatsby is primarily static
    reason: 'Gatsby generates static pages at build time',
    estimatedSpeed: 'fast',
    requiresBrowser: false
  },
  NUXTJS: {
    technology: 'Nuxt.js',
    strategy: 'hybrid',
    reason: 'Nuxt.js can be static or dynamic',
    estimatedSpeed: 'normal',
    requiresBrowser: false // Will be determined per page
  },
  
  // Single Page Applications - Need Playwright
  REACT: {
    technology: 'React',
    strategy: 'spa',
    reason: 'React SPAs require JavaScript execution',
    estimatedSpeed: 'slow',
    requiresBrowser: true
  },
  VUE: {
    technology: 'Vue',
    strategy: 'spa',
    reason: 'Vue SPAs require JavaScript execution',
    estimatedSpeed: 'slow',
    requiresBrowser: true
  },
  ANGULAR: {
    technology: 'Angular',
    strategy: 'spa',
    reason: 'Angular SPAs require JavaScript execution',
    estimatedSpeed: 'slow',
    requiresBrowser: true
  },
  
  // E-commerce platforms - Usually need Playwright
  SHOPIFY: {
    technology: 'Shopify',
    strategy: 'dynamic',
    reason: 'Shopify uses dynamic product loading',
    estimatedSpeed: 'normal',
    requiresBrowser: true
  },
  MAGENTO: {
    technology: 'Magento',
    strategy: 'dynamic',
    reason: 'Magento has complex JavaScript interactions',
    estimatedSpeed: 'normal',
    requiresBrowser: true
  },
  WOOCOMMERCE: {
    technology: 'WooCommerce',
    strategy: 'static', // WooCommerce on WordPress is mostly static
    reason: 'WooCommerce renders server-side with WordPress',
    estimatedSpeed: 'fast',
    requiresBrowser: false
  },
  
  // Website builders - Mixed approach
  WIX: {
    technology: 'Wix',
    strategy: 'dynamic',
    reason: 'Wix uses heavy JavaScript rendering',
    estimatedSpeed: 'slow',
    requiresBrowser: true
  },
  SQUARESPACE: {
    technology: 'Squarespace',
    strategy: 'static',
    reason: 'Squarespace renders mostly static HTML',
    estimatedSpeed: 'fast',
    requiresBrowser: false
  },
  WEBFLOW: {
    technology: 'Webflow',
    strategy: 'static',
    reason: 'Webflow exports clean HTML',
    estimatedSpeed: 'fast',
    requiresBrowser: false
  }
}

/**
 * Get the optimal scraping strategy for a detected technology
 */
export function getStrategyForTechnology(technology: string): TechnologyMapping {
  const startTime = Date.now()
  
  permanentLogger.info('STRATEGY_MAPPING', 'Mapping technology to strategy', {
    inputTechnology: technology,
    timestamp: new Date().toISOString()
  })
  
  // Normalize technology name
  const normalizedTech = technology.toUpperCase().replace(/[\s\-\.]/g, '')
  
  // Find mapping
  const mapping = TECHNOLOGY_MAPPINGS[normalizedTech] || {
    technology: technology,
    strategy: 'dynamic' as ScrapingStrategy,
    reason: 'Unknown technology - using safe dynamic strategy',
    estimatedSpeed: 'normal' as const,
    requiresBrowser: true
  }
  
  const duration = Date.now() - startTime
  
  permanentLogger.info('STRATEGY_MAPPING', 'Strategy selected for technology', {
    technology,
    mappedStrategy: mapping.strategy,
    reason: mapping.reason,
    requiresBrowser: mapping.requiresBrowser,
    estimatedSpeed: mapping.estimatedSpeed,
    mappingDuration: duration
  })
  
  return mapping
}

/**
 * Analyze a list of pages and group them by recommended strategy
 */
export function groupPagesByStrategy(
  pages: string[],
  siteAnalysisData?: any
): Record<ScrapingStrategy, string[]> {
  permanentLogger.info('STRATEGY_GROUPING', 'Starting page grouping', {
    totalPages: pages.length,
    hasSiteAnalysis: !!siteAnalysisData,
    detectedTechnology: siteAnalysisData?.siteType
  })
  
  const groups: Record<ScrapingStrategy, string[]> = {
    static: [],
    dynamic: [],
    spa: [],
    hybrid: []
  }
  
  // If we have site analysis, use it to determine strategy
  if (siteAnalysisData?.siteType) {
    const mapping = getStrategyForTechnology(siteAnalysisData.siteType)
    
    if (mapping.strategy === 'hybrid') {
      // For hybrid sites, analyze each page
      pages.forEach(page => {
        // Check if page likely needs JavaScript
        if (isLikelyStaticPage(page)) {
          groups.static.push(page)
        } else {
          groups.dynamic.push(page)
        }
      })
      
      permanentLogger.info('STRATEGY_GROUPING', 'Hybrid site pages analyzed', {
        staticPages: groups.static.length,
        dynamicPages: groups.dynamic.length
      })
    } else {
      // All pages use the same strategy
      groups[mapping.strategy] = [...pages]
      
      permanentLogger.info('STRATEGY_GROUPING', 'All pages use same strategy', {
        strategy: mapping.strategy,
        pageCount: pages.length
      })
    }
  } else {
    // No site analysis, use URL heuristics
    pages.forEach(page => {
      if (isLikelyStaticPage(page)) {
        groups.static.push(page)
      } else {
        groups.dynamic.push(page)
      }
    })
    
    permanentLogger.info('STRATEGY_GROUPING', 'Used URL heuristics (no site analysis)', {
      staticPages: groups.static.length,
      dynamicPages: groups.dynamic.length
    })
  }
  
  // Log summary
  permanentLogger.info('STRATEGY_GROUPING', 'Page grouping complete', {
    static: groups.static.length,
    dynamic: groups.dynamic.length,
    spa: groups.spa.length,
    hybrid: groups.hybrid.length,
    estimatedTime: {
      static: `${groups.static.length * 0.5}s`,
      dynamic: `${groups.dynamic.length * 2}s`,
      spa: `${groups.spa.length * 3}s`,
      total: `${groups.static.length * 0.5 + groups.dynamic.length * 2 + groups.spa.length * 3}s`
    }
  })
  
  return groups
}

/**
 * Heuristic to determine if a page is likely static
 */
function isLikelyStaticPage(url: string): boolean {
  const staticPatterns = [
    /\/about/i,
    /\/contact/i,
    /\/privacy/i,
    /\/terms/i,
    /\/blog\//i,
    /\/news\//i,
    /\/press/i,
    /\.html$/i,
    /\/page\/\d+/i
  ]
  
  const dynamicPatterns = [
    /\/api\//i,
    /\/search/i,
    /\/dashboard/i,
    /\/account/i,
    /\/cart/i,
    /\/checkout/i,
    /\/app\//i,
    /\?.*=/i // Query parameters often indicate dynamic content
  ]
  
  // Check for dynamic patterns first (higher priority)
  if (dynamicPatterns.some(pattern => pattern.test(url))) {
    return false
  }
  
  // Check for static patterns
  if (staticPatterns.some(pattern => pattern.test(url))) {
    return true
  }
  
  // Default to static for simple paths
  return !url.includes('?') && !url.includes('#')
}

/**
 * Get performance estimate for a strategy
 */
export function getStrategyPerformance(strategy: ScrapingStrategy): {
  averageTime: number
  description: string
  color: string
} {
  const performances = {
    static: {
      averageTime: 0.5,
      description: 'Lightning fast HTML parsing',
      color: 'green'
    },
    dynamic: {
      averageTime: 2,
      description: 'Full browser automation',
      color: 'blue'
    },
    spa: {
      averageTime: 3,
      description: 'SPA with JS execution',
      color: 'orange'
    },
    hybrid: {
      averageTime: 1.5,
      description: 'Mixed approach',
      color: 'yellow'
    }
  }
  
  return performances[strategy]
}