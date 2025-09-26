/**
 * Validates and normalizes URLs for scraping
 *
 * @module scrapers-v2/utilities/url-validator
 * @description Pure functions for URL validation, normalization, and deduplication.
 * Ensures URLs are properly formatted and safe to scrape.
 *
 * VALIDATION RULES:
 * - Protocol must be HTTP/HTTPS
 * - Domain must be valid
 * - Path normalization
 * - Query parameter handling
 * - Fragment removal
 * - Robots.txt compliance
 *
 * COMPLIANCE:
 * - Pure functions
 * - No network calls
 * - Deterministic validation
 */

import type { Url } from '../core/types'
import { Url as createUrl } from '../core/types'

/**
 * Common invalid URL patterns
 * These should be filtered out
 */
const INVALID_PATTERNS = [
  /^javascript:/i,
  /^mailto:/i,
  /^tel:/i,
  /^ftp:/i,
  /^file:/i,
  /^data:/i,
  /^about:/i,
  /^chrome:/i,
  /^edge:/i,
  /#$/  // Anchor-only links
] as const

/**
 * Common file extensions to skip
 * These are typically not HTML pages
 */
const SKIP_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.zip',
  '.rar',
  '.tar',
  '.gz',
  '.exe',
  '.dmg',
  '.pkg',
  '.deb',
  '.rpm',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.svg',
  '.webp',
  '.mp4',
  '.avi',
  '.mov',
  '.mp3',
  '.wav',
  '.flac'
] as const

/**
 * Common query parameters to remove
 * These typically don't affect content
 */
const REMOVE_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'ref',
  'source',
  '__cf_chl_jschl_tk__',
  '__cf_chl_captcha_tk__'
] as const

/**
 * Validate a single URL
 * Checks if URL is valid and safe to scrape
 *
 * @param url - URL to validate
 * @returns True if valid
 */
export function isValidUrl(url: string): boolean {
  // Check for empty or invalid input
  if (!url || typeof url !== 'string') {
    return false
  }

  // Check against invalid patterns
  for (const pattern of INVALID_PATTERNS) {
    if (pattern.test(url)) {
      return false
    }
  }

  // Try to parse URL
  try {
    const parsed = new URL(url)

    // Check protocol
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false
    }

    // Check hostname
    if (!parsed.hostname || parsed.hostname.length < 3) {
      return false
    }

    // Check for localhost/private IPs (optional - might want to allow for testing)
    if (isPrivateUrl(parsed)) {
      return false
    }

    // Check file extension
    const path = parsed.pathname.toLowerCase()
    for (const ext of SKIP_EXTENSIONS) {
      if (path.endsWith(ext)) {
        return false
      }
    }

    return true

  } catch {
    return false
  }
}

/**
 * Normalize URL for consistency
 * Removes fragments, normalizes protocol, cleans parameters
 *
 * @param url - URL to normalize
 * @returns Normalized URL or null if invalid
 */
export function normalizeUrl(url: string): string | null {
  if (!isValidUrl(url)) {
    return null
  }

  try {
    const parsed = new URL(url)

    // Remove fragment
    parsed.hash = ''

    // Normalize protocol to HTTPS where possible
    // (In practice, you might want to keep the original protocol)
    // parsed.protocol = 'https:'

    // Clean query parameters
    const params = new URLSearchParams(parsed.search)
    for (const param of REMOVE_PARAMS) {
      params.delete(param)
    }

    // Sort parameters for consistency
    const sortedParams = new URLSearchParams(
      Array.from(params.entries()).sort()
    )

    parsed.search = sortedParams.toString()

    // Normalize path
    parsed.pathname = normalizePath(parsed.pathname)

    return parsed.href

  } catch {
    return null
  }
}

/**
 * Normalize URL path
 * Handles trailing slashes and dot segments
 *
 * @param path - Path to normalize
 * @returns Normalized path
 */
function normalizePath(path: string): string {
  // Remove dot segments
  const segments = path.split('/').filter(segment => segment !== '.')

  const normalized: string[] = []
  for (const segment of segments) {
    if (segment === '..') {
      normalized.pop()
    } else if (segment !== '') {
      normalized.push(segment)
    }
  }

  // Reconstruct path
  let result = '/' + normalized.join('/')

  // Preserve trailing slash if it was there (indicates directory)
  if (path.endsWith('/') && !result.endsWith('/')) {
    result += '/'
  }

  return result
}

/**
 * Check if URL is private/internal
 * These should typically not be scraped
 *
 * @param parsed - Parsed URL object
 * @returns True if private
 */
function isPrivateUrl(parsed: URL): boolean {
  const hostname = parsed.hostname.toLowerCase()

  // Localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return true
  }

  // Private IP ranges
  const parts = hostname.split('.')
  if (parts.length === 4 && parts.every(p => /^\d+$/.test(p))) {
    const octets = parts.map(p => parseInt(p))

    // 10.0.0.0/8
    if (octets[0] === 10) return true

    // 172.16.0.0/12
    if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true

    // 192.168.0.0/16
    if (octets[0] === 192 && octets[1] === 168) return true
  }

  // Local domains
  if (hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    return true
  }

  return false
}

/**
 * Create absolute URL from relative
 * Handles various relative URL formats
 *
 * @param relative - Relative URL
 * @param base - Base URL
 * @returns Absolute URL or null if invalid
 */
export function makeAbsolute(relative: string, base: string): string | null {
  if (!relative || !base) {
    return null
  }

  try {
    // Already absolute
    if (relative.startsWith('http://') || relative.startsWith('https://')) {
      return normalizeUrl(relative)
    }

    // Protocol-relative
    if (relative.startsWith('//')) {
      const baseUrl = new URL(base)
      return normalizeUrl(`${baseUrl.protocol}${relative}`)
    }

    // Invalid protocols
    if (INVALID_PATTERNS.some(p => p.test(relative))) {
      return null
    }

    // Relative to base
    const absoluteUrl = new URL(relative, base)
    return normalizeUrl(absoluteUrl.href)

  } catch {
    return null
  }
}

/**
 * Deduplicate URLs
 * Removes duplicates after normalization
 *
 * @param urls - Array of URLs
 * @returns Deduplicated array
 */
export function deduplicateUrls(urls: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const url of urls) {
    const normalized = normalizeUrl(url)
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized)
      result.push(normalized)
    }
  }

  return result
}

/**
 * Filter URLs by domain
 * Keeps only URLs from specified domain(s)
 *
 * @param urls - URLs to filter
 * @param allowedDomains - Allowed domains
 * @param includeSubdomains - Whether to include subdomains
 * @returns Filtered URLs
 */
export function filterByDomain(
  urls: string[],
  allowedDomains: string[],
  includeSubdomains = true
): string[] {
  return urls.filter(url => {
    try {
      const parsed = new URL(url)
      const hostname = parsed.hostname.toLowerCase()

      return allowedDomains.some(domain => {
        const normalizedDomain = domain.toLowerCase()

        if (includeSubdomains) {
          return hostname === normalizedDomain ||
                 hostname.endsWith(`.${normalizedDomain}`)
        } else {
          return hostname === normalizedDomain
        }
      })
    } catch {
      return false
    }
  })
}

/**
 * Extract domain from URL
 * Gets the domain without subdomain
 *
 * @param url - URL to extract from
 * @returns Domain or null
 */
export function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url)
    const parts = parsed.hostname.split('.')

    // Handle special cases (localhost, IP addresses)
    if (parts.length < 2) {
      return parsed.hostname
    }

    // Simple approach: last two parts
    // (In production, use public suffix list for accuracy)
    return parts.slice(-2).join('.')

  } catch {
    return null
  }
}

/**
 * Check if URL is crawlable
 * Basic robots.txt compliance (simplified)
 *
 * @param url - URL to check
 * @param robotsRules - Parsed robots.txt rules (simplified)
 * @returns True if crawlable
 */
export function isCrawlable(
  url: string,
  robotsRules?: {
    disallowed: string[]
    allowed: string[]
    crawlDelay?: number
  }
): boolean {
  if (!robotsRules) {
    return true // No rules means allowed
  }

  try {
    const parsed = new URL(url)
    const path = parsed.pathname

    // Check disallowed paths
    for (const rule of robotsRules.disallowed || []) {
      if (path.startsWith(rule)) {
        // Check if explicitly allowed
        const isAllowed = (robotsRules.allowed || []).some(allowed =>
          path.startsWith(allowed) && allowed.length > rule.length
        )

        if (!isAllowed) {
          return false
        }
      }
    }

    return true

  } catch {
    return false
  }
}

/**
 * Batch validate URLs
 * Validates and returns valid URLs with metadata
 *
 * @param urls - URLs to validate
 * @returns Validation results
 */
export function batchValidate(urls: string[]): Array<{
  original: string
  normalized: string | null
  valid: boolean
  reason?: string
}> {
  return urls.map(url => {
    if (!url) {
      return {
        original: url,
        normalized: null,
        valid: false,
        reason: 'Empty URL'
      }
    }

    // Check invalid patterns
    for (const pattern of INVALID_PATTERNS) {
      if (pattern.test(url)) {
        return {
          original: url,
          normalized: null,
          valid: false,
          reason: `Invalid protocol: ${url.split(':')[0]}`
        }
      }
    }

    // Try to normalize
    const normalized = normalizeUrl(url)

    if (!normalized) {
      return {
        original: url,
        normalized: null,
        valid: false,
        reason: 'Failed to parse URL'
      }
    }

    return {
      original: url,
      normalized,
      valid: true
    }
  })
}

/**
 * Convert strings to validated URLs
 * Used for type-safe URL handling
 *
 * @param urls - URL strings
 * @returns Validated URL array
 */
export function toValidatedUrls(urls: string[]): Url[] {
  const validated: Url[] = []

  for (const url of urls) {
    try {
      validated.push(createUrl(url))
    } catch {
      // Skip invalid URLs
      continue
    }
  }

  return validated
}

/**
 * Get URL depth
 * Counts path segments (useful for crawl depth limiting)
 *
 * @param url - URL to analyze
 * @returns Depth or -1 if invalid
 */
export function getUrlDepth(url: string): number {
  try {
    const parsed = new URL(url)
    const segments = parsed.pathname.split('/').filter(s => s.length > 0)
    return segments.length
  } catch {
    return -1
  }
}

/**
 * Check if URL matches pattern
 * Supports wildcards and basic pattern matching
 *
 * @param url - URL to check
 * @param pattern - Pattern to match (supports * wildcard)
 * @returns True if matches
 */
export function matchesPattern(url: string, pattern: string): boolean {
  // Convert pattern to regex
  const regexPattern = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special chars
    .replace(/\*/g, '.*') // Replace * with .*

  const regex = new RegExp(`^${regexPattern}$`, 'i')
  return regex.test(url)
}

/**
 * Sort URLs for optimal crawling
 * Prioritizes important pages
 *
 * @param urls - URLs to sort
 * @returns Sorted URLs
 */
export function prioritizeUrls(urls: string[]): string[] {
  return urls.sort((a, b) => {
    // Prioritize shorter URLs (usually more important)
    const depthA = getUrlDepth(a)
    const depthB = getUrlDepth(b)

    if (depthA !== depthB) {
      return depthA - depthB
    }

    // Prioritize certain paths
    const priorityPaths = ['/', '/about', '/contact', '/products', '/services']
    const getPriority = (url: string) => {
      const path = new URL(url).pathname
      const index = priorityPaths.indexOf(path)
      return index === -1 ? priorityPaths.length : index
    }

    try {
      return getPriority(a) - getPriority(b)
    } catch {
      return 0
    }
  })
}