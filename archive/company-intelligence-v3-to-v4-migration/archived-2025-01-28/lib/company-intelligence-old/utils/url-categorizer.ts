/**
 * URL Categorization Utility
 *
 * Categorizes URLs based on their business importance
 * Following DRY/SOLID principles - single source of truth for categorization
 *
 * Categories:
 * - critical: Core business pages (homepage, about, services, products, contact)
 * - important: Secondary business pages (team, pricing, features, solutions)
 * - useful: Content pages (blog posts, case studies, resources)
 * - optional: Legal/misc pages (privacy, terms, etc.)
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'

export type UrlCategory = 'critical' | 'important' | 'useful' | 'optional'

/**
 * Categorize a URL based on its pathname
 * @param url - The URL to categorize
 * @returns The category of the URL
 */
export function categorizeUrl(url: string): UrlCategory {
  try {
    const parsedUrl = new URL(url)
    const pathname = parsedUrl.pathname.toLowerCase().replace(/\/$/, '') // Remove trailing slash

    // Homepage is always critical
    if (pathname === '' || pathname === '/') {
      return 'critical'
    }

    // Key business pages and their sub-pages are CRITICAL
    const criticalPaths = ['/about', '/services', '/products', '/contact']
    if (criticalPaths.some(p => pathname === p || pathname.startsWith(`${p}/`))) {
      return 'critical'
    }

    // Secondary business pages are important
    const importantPaths = ['/team', '/pricing', '/features', '/solutions', '/customers', '/testimonials']
    if (importantPaths.some(p => pathname === p || pathname.startsWith(`${p}/`))) {
      return 'important'
    }

    // Main content sections (not individual posts) are important
    const contentSections = ['/blog', '/news', '/insights', '/resources']
    if (contentSections.some(p => pathname === p)) {
      return 'important'
    }

    // Individual content pages are useful
    const usefulPatterns = [
      '/blog/', '/news/', '/insights/', '/resources/',
      '/case-study', '/case-studies', '/portfolio',
      '/white-paper', '/whitepaper', '/article',
      '/post/', '/posts/'
    ]
    if (usefulPatterns.some(p => pathname.includes(p))) {
      return 'useful'
    }

    // Legal and administrative pages are optional
    const optionalPatterns = [
      'privacy', 'terms', 'cookie', 'legal', 'disclaimer',
      'sitemap', 'robots', 'accessibility', 'gdpr',
      'unsubscribe', 'preferences', 'settings'
    ]
    if (optionalPatterns.some(p => pathname.includes(p))) {
      return 'optional'
    }

    // Archive and old content is optional
    if (pathname.includes('/archive') || pathname.includes('/old')) {
      return 'optional'
    }

    // Default to useful for unmatched pages
    return 'useful'

  } catch (error) {
    // Log error but don't throw - return safe default
    permanentLogger.captureError('URL_CATEGORIZER', error as Error, {
      url,
      context: 'categorization_failed'
    })
    return 'optional' // Safe default for invalid URLs
  }
}

/**
 * Batch categorize multiple URLs
 * @param urls - Array of URLs to categorize
 * @returns Map of URL to category
 */
export function categorizeUrls(urls: string[]): Map<string, UrlCategory> {
  const categorized = new Map<string, UrlCategory>()

  urls.forEach(url => {
    categorized.set(url, categorizeUrl(url))
  })

  return categorized
}

/**
 * Get category priority (for sorting)
 * Lower number = higher priority
 */
export function getCategoryPriority(category: UrlCategory): number {
  const priorities: Record<UrlCategory, number> = {
    'critical': 1,
    'important': 2,
    'useful': 3,
    'optional': 4
  }
  return priorities[category]
}

/**
 * Sort URLs by category priority
 */
export function sortUrlsByCategory(urls: string[]): string[] {
  return urls.sort((a, b) => {
    const categoryA = categorizeUrl(a)
    const categoryB = categorizeUrl(b)
    return getCategoryPriority(categoryA) - getCategoryPriority(categoryB)
  })
}