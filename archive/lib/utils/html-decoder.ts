/**
 * Shared HTML entity decoder utility
 * Ensures consistent HTML entity decoding across the entire application
 * Following DRY principles - single source of truth for HTML decoding
 *
 * @deprecated This file uses regex-based HTML entity decoding which is unreliable.
 * Use the 'he' library instead for proper HTML entity encoding/decoding:
 *
 * Example migration:
 * ```typescript
 * // Old (deprecated):
 * import { decodeHtmlEntities } from '@/lib/utils/html-decoder'
 * const decoded = decodeHtmlEntities(html)
 *
 * // New (recommended):
 * import he from 'he'
 * const decoded = he.decode(html)
 * ```
 *
 * For full HTML parsing and text extraction, use DOMParser (client) or cheerio (server).
 * See CLAUDE.md for complete migration guidelines.
 */

/**
 * Decodes HTML entities to their readable characters
 *
 * @deprecated Use `he.decode()` from the 'he' library instead.
 * This regex-based approach doesn't handle all HTML entities correctly.
 *
 * @param html - String containing HTML entities
 * @returns Decoded string with readable characters
 */
export function decodeHtmlEntities(html: string): string {
  if (!html) return ''
  
  return html
    // Common HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    // Dashes and spaces
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&nbsp;/g, ' ')
    // Additional entities
    .replace(/&copy;/g, '©')
    .replace(/&reg;/g, '®')
    .replace(/&trade;/g, '™')
    .replace(/&euro;/g, '€')
    .replace(/&pound;/g, '£')
    .replace(/&yen;/g, '¥')
    // Fractions
    .replace(/&frac12;/g, '½')
    .replace(/&frac14;/g, '¼')
    .replace(/&frac34;/g, '¾')
    // Arrows
    .replace(/&larr;/g, '←')
    .replace(/&rarr;/g, '→')
    .replace(/&uarr;/g, '↑')
    .replace(/&darr;/g, '↓')
    // Mathematical
    .replace(/&times;/g, '×')
    .replace(/&divide;/g, '÷')
    .replace(/&plusmn;/g, '±')
    // Quotes
    .replace(/&lsquo;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    // Numeric entities (common ones)
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
    .replace(/&#x([a-fA-F0-9]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
}

/**
 * Normalizes a URL for deduplication
 * Removes trailing slashes, fragments, and normalizes protocol
 * @param url - URL to normalize
 * @returns Normalized URL string
 */
export function normalizeUrl(url: string): string {
  if (!url) return ''
  
  try {
    // Parse the URL
    const parsed = new URL(url)
    
    // Normalize protocol to https
    parsed.protocol = 'https:'
    
    // Remove trailing slash from pathname
    parsed.pathname = parsed.pathname.replace(/\/$/, '') || '/'
    
    // Remove fragment
    parsed.hash = ''
    
    // Sort query parameters for consistency
    const params = Array.from(parsed.searchParams.entries())
    params.sort((a, b) => a[0].localeCompare(b[0]))
    parsed.search = params.length > 0 
      ? '?' + params.map(([k, v]) => `${k}=${v}`).join('&')
      : ''
    
    return parsed.toString()
  } catch {
    // If URL parsing fails, do basic normalization
    return url
      .replace(/^http:/, 'https:')
      .replace(/\/$/, '')
      .replace(/#.*$/, '')
  }
}

/**
 * Generates a readable title from a URL path
 * @param url - Full URL or path
 * @param baseUrl - Base URL to remove from the path
 * @returns Human-readable title
 */
export function generateTitleFromUrl(url: string, baseUrl?: string): string {
  // Remove base URL if provided
  const path = baseUrl ? url.replace(baseUrl, '') : url
  
  // Extract path segments
  const segments = path
    .replace(/^https?:\/\/[^\/]+/, '') // Remove protocol and domain
    .split('/')
    .filter(Boolean)
  
  if (segments.length === 0) {
    return 'Home'
  }
  
  // Convert segments to readable format
  const title = segments
    .map(segment => {
      // Remove file extensions
      segment = segment.replace(/\.[^.]+$/, '')
      // Replace hyphens and underscores with spaces
      segment = segment.replace(/[-_]/g, ' ')
      // Capitalize each word
      segment = segment
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
      return segment
    })
    .join(' > ')
  
  // Apply HTML entity decoding to the final title
  return decodeHtmlEntities(title)
}