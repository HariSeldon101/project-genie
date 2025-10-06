/**
 * URL Pattern Matching Utility
 *
 * Centralised functions for URL pattern matching and categorisation.
 * Follows DRY principles by providing reusable URL analysis functions.
 *
 * @module url-patterns
 */

import { permanentLogger } from './permanent-logger'

/**
 * Checks if a URL contains a specific path segment as a complete segment.
 * Prevents false matches like '/service' matching '/customer-service-policy'.
 *
 * @param url - The URL to check
 * @param segment - The path segment to look for (without slashes)
 * @returns true if the URL has this as a complete path segment
 *
 * @example
 * hasPathSegment('https://example.com/services', 'services') // true
 * hasPathSegment('https://example.com/customer-service', 'service') // false
 * hasPathSegment('https://example.com/service/', 'service') // true
 */
export function hasPathSegment(url: string, segment: string): boolean {
  const path = url.toLowerCase()
  const seg = segment.toLowerCase().replace(/^\/|\/$/g, '') // Remove leading/trailing slashes

  // Check for exact matches as complete path segments
  return path === `/${seg}` ||                  // Exact match with leading slash
         path === `/${seg}/` ||                 // With trailing slash
         path.includes(`/${seg}/`) ||           // As a complete segment in the middle
         path.endsWith(`/${seg}`) ||            // At the end without trailing slash
         path === seg ||                        // Exact match (for relative paths)
         path.includes(`.com/${seg}`) ||        // Right after domain
         path.includes(`.co.uk/${seg}`) ||      // UK domains
         path.includes(`.org/${seg}`) ||        // Org domains
         path.includes(`.net/${seg}`)           // Net domains
}

/**
 * Checks if a URL matches any of the provided patterns.
 * Uses hasPathSegment for accurate matching.
 *
 * @param url - The URL to check
 * @param patterns - Array of patterns to match against
 * @returns true if the URL matches any pattern
 */
export function matchesAnyPattern(url: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    // Handle special cases
    if (pattern === '/') {
      // Homepage detection
      const path = extractPathname(url)
      return path === '/' || path === '' || path === '/index' || path === '/index.html'
    }

    // Use hasPathSegment for other patterns
    return hasPathSegment(url, pattern.replace(/^\/|\/$/g, ''))
  })
}

/**
 * Extracts path segments from a URL.
 * Handles both absolute and relative URLs.
 *
 * @param url - The URL to extract segments from
 * @returns Array of path segments
 */
export function getPathSegments(url: string): string[] {
  try {
    const parsed = new URL(url)
    return parsed.pathname.split('/').filter(Boolean)
  } catch {
    // Handle relative URLs
    const path = url.replace(/^\/+/, '') // Remove leading slashes
    return path.split('/').filter(Boolean)
  }
}

/**
 * Checks if a URL is a root-level page (no subdirectories).
 *
 * @param url - The URL to check
 * @returns true if it's a root-level page
 *
 * @example
 * isRootLevelPage('https://example.com/about') // true
 * isRootLevelPage('https://example.com/blog/post-123') // false
 */
export function isRootLevelPage(url: string): boolean {
  const segments = getPathSegments(url)
  return segments.length <= 1
}

/**
 * Extracts the pathname from a URL.
 * Handles both absolute and relative URLs.
 *
 * @param url - The URL to extract pathname from
 * @returns The pathname portion of the URL
 */
export function extractPathname(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.pathname
  } catch {
    // Handle relative URLs
    return url.startsWith('/') ? url : `/${url}`
  }
}

/**
 * Checks if a URL appears to be an archive or old content.
 * Useful for identifying less important pages.
 *
 * @param url - The URL to check
 * @returns true if it appears to be archived content
 */
export function isArchivePage(url: string): boolean {
  const lowerUrl = url.toLowerCase()

  // Check for year patterns (2015-2023 considered old)
  const oldYearPattern = /\/(201[5-9]|202[0-3])\//
  if (oldYearPattern.test(lowerUrl)) {
    return true
  }

  // Check for archive indicators
  const archiveIndicators = [
    '/archive',
    '/archives',
    '/old',
    '-old',
    '-archive',
    '/legacy',
    '/deprecated'
  ]

  return archiveIndicators.some(indicator => lowerUrl.includes(indicator))
}

/**
 * Checks if a URL is a blog post or article (not the main blog page).
 *
 * @param url - The URL to check
 * @returns true if it's an individual blog post/article
 */
export function isBlogPost(url: string): boolean {
  const segments = getPathSegments(url)

  // Main blog pages have 1 segment, posts have 2+
  const blogRoots = ['blog', 'news', 'insights', 'articles', 'posts']

  if (segments.length >= 2) {
    const firstSegment = segments[0].toLowerCase()
    return blogRoots.includes(firstSegment)
  }

  return false
}

/**
 * Checks if a URL is a main section page (blog, services, etc).
 *
 * @param url - The URL to check
 * @param section - The section name to check for
 * @returns true if it's the main section page
 */
export function isMainSectionPage(url: string, section: string): boolean {
  const segments = getPathSegments(url)

  // Main section pages have exactly 1 segment
  if (segments.length === 1) {
    return segments[0].toLowerCase() === section.toLowerCase()
  }

  return false
}

/**
 * Categorises a URL based on common patterns.
 * Returns a hint about what category it might belong to.
 *
 * @param url - The URL to categorise
 * @returns Category hint: 'legal', 'financial', 'blog', 'main', 'archive', or 'unknown'
 */
export function getCategoryHint(url: string): string {
  const lowerUrl = url.toLowerCase()

  // Legal pages
  if (matchesAnyPattern(lowerUrl, ['privacy', 'terms', 'cookies', 'legal', 'disclaimer', 'gdpr'])) {
    return 'legal'
  }

  // Financial/Investor pages
  if (matchesAnyPattern(lowerUrl, ['investor', 'investors', 'ir', 'financial', 'earnings', 'quarterly'])) {
    return 'financial'
  }

  // Archive pages
  if (isArchivePage(lowerUrl)) {
    return 'archive'
  }

  // Blog posts (not main blog page)
  if (isBlogPost(lowerUrl)) {
    return 'blog-post'
  }

  // Main section pages
  if (isRootLevelPage(lowerUrl)) {
    return 'main'
  }

  return 'unknown'
}

/**
 * Logs pattern matching decision for debugging.
 *
 * @param url - The URL being matched
 * @param pattern - The pattern it matched (or didn't match)
 * @param matched - Whether it matched
 * @param reason - Reason for the match/no-match
 */
export function logPatternMatch(
  url: string,
  pattern: string,
  matched: boolean,
  reason: string
): void {
  permanentLogger.breadcrumb('URL_PATTERNS', `Pattern ${matched ? 'matched' : 'not matched'}`, {
    url,
    pattern,
    matched,
    reason
  })
}