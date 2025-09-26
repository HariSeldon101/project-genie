/**
 * Extracts social media profiles from HTML
 *
 * @module scrapers-v2/extractors/social-extractor
 * @description Finds and validates social media profile links.
 * Searches for social links in common locations (header, footer),
 * analyzes link patterns, and extracts usernames where possible.
 *
 * DETECTION METHODS:
 * - URL pattern matching for known social platforms
 * - Icon class analysis (fa-twitter, icon-facebook, etc.)
 * - Meta tags (twitter:site, og:see_also)
 * - Structured data (sameAs property)
 * - Link text and aria-labels
 *
 * COMPLIANCE:
 * - Pure extraction logic
 * - No API calls to validate profiles
 * - Returns normalized profile URLs
 */

import type { CheerioAPI } from 'cheerio'
import type { SocialMediaProfiles } from '@/lib/company-intelligence/types/scraping-interfaces'
import type { Url } from '../core/types'
import { BaseExtractor } from './extractor.interface'
import { permanentLogger } from '@/lib/utils/permanent-logger'

/**
 * Social media platform patterns
 * Used to identify and normalize social media URLs
 */
const SOCIAL_PATTERNS = {
  linkedin: {
    patterns: [
      /linkedin\.com\/company\/([^\/\?\#]+)/i,
      /linkedin\.com\/in\/([^\/\?\#]+)/i,
      /linkedin\.com\/showcase\/([^\/\?\#]+)/i
    ],
    normalizeUrl: (match: string) => {
      // Ensure it's a proper LinkedIn URL
      if (!match.startsWith('http')) {
        match = `https://${match}`
      }
      return match.split('?')[0] // Remove query params
    }
  },
  twitter: {
    patterns: [
      /twitter\.com\/([^\/\?\#]+)/i,
      /x\.com\/([^\/\?\#]+)/i
    ],
    normalizeUrl: (match: string) => {
      // Normalize to x.com
      return match.replace('twitter.com', 'x.com').split('?')[0]
    }
  },
  facebook: {
    patterns: [
      /facebook\.com\/([^\/\?\#]+)/i,
      /fb\.com\/([^\/\?\#]+)/i
    ],
    normalizeUrl: (match: string) => {
      return match.split('?')[0]
    }
  },
  instagram: {
    patterns: [
      /instagram\.com\/([^\/\?\#]+)/i,
      /instagr\.am\/([^\/\?\#]+)/i
    ],
    normalizeUrl: (match: string) => {
      return match.split('?')[0]
    }
  },
  youtube: {
    patterns: [
      /youtube\.com\/(channel|user|c)\/([^\/\?\#]+)/i,
      /youtube\.com\/@([^\/\?\#]+)/i
    ],
    normalizeUrl: (match: string) => {
      return match.split('?')[0]
    }
  },
  github: {
    patterns: [
      /github\.com\/([^\/\?\#]+)/i
    ],
    normalizeUrl: (match: string) => {
      // Remove .git extension if present
      return match.replace(/\.git$/, '').split('?')[0]
    }
  },
  tiktok: {
    patterns: [
      /tiktok\.com\/@([^\/\?\#]+)/i
    ],
    normalizeUrl: (match: string) => {
      return match.split('?')[0]
    }
  },
  pinterest: {
    patterns: [
      /pinterest\.com\/([^\/\?\#]+)/i
    ],
    normalizeUrl: (match: string) => {
      return match.split('?')[0]
    }
  },
  medium: {
    patterns: [
      /medium\.com\/@([^\/\?\#]+)/i,
      /([^\/]+)\.medium\.com/i
    ],
    normalizeUrl: (match: string) => {
      return match.split('?')[0]
    }
  }
} as const

/**
 * Icon class patterns for social media
 * Many sites use Font Awesome or similar icon fonts
 */
const ICON_PATTERNS = {
  linkedin: ['linkedin', 'fa-linkedin', 'icon-linkedin', 'social-linkedin'],
  twitter: ['twitter', 'fa-twitter', 'icon-twitter', 'social-twitter', 'fa-x-twitter'],
  facebook: ['facebook', 'fa-facebook', 'icon-facebook', 'social-facebook', 'fb'],
  instagram: ['instagram', 'fa-instagram', 'icon-instagram', 'social-instagram'],
  youtube: ['youtube', 'fa-youtube', 'icon-youtube', 'social-youtube'],
  github: ['github', 'fa-github', 'icon-github', 'social-github'],
  tiktok: ['tiktok', 'fa-tiktok', 'icon-tiktok', 'social-tiktok'],
  pinterest: ['pinterest', 'fa-pinterest', 'icon-pinterest', 'social-pinterest']
} as const

/**
 * Extracts social media profiles from HTML
 */
export class SocialExtractor extends BaseExtractor<SocialMediaProfiles> {
  /**
   * Extract social media profiles from HTML
   */
  extract($: CheerioAPI, url: Url): SocialMediaProfiles | undefined {
    try {
      const profiles: Partial<SocialMediaProfiles> = {}

      // Extract from all links on the page
      const allLinks = this.extractAllSocialLinks($)

      // Extract from meta tags
      const metaProfiles = this.extractFromMeta($)
      Object.assign(profiles, metaProfiles)

      // Extract from structured data
      const structuredProfiles = this.extractFromStructuredData($)
      Object.assign(profiles, structuredProfiles)

      // Merge all found profiles
      for (const [platform, url] of allLinks) {
        if (!profiles[platform as keyof SocialMediaProfiles]) {
          profiles[platform as keyof SocialMediaProfiles] = url as any
        }
      }

      // Extract from specific areas (footer, header, about)
      this.extractFromSpecificAreas($, profiles)

      // Clean up and validate URLs
      const cleanedProfiles = this.cleanAndValidateProfiles(profiles)

      // Check if we found any profiles
      if (Object.keys(cleanedProfiles).length === 0) {
        permanentLogger.debug('SOCIAL_EXTRACTOR', 'No social profiles found', { url })
        return undefined
      }

      permanentLogger.debug('SOCIAL_EXTRACTOR', 'Social profiles extracted', {
        url,
        count: Object.keys(cleanedProfiles).length,
        platforms: Object.keys(cleanedProfiles)
      })

      return cleanedProfiles

    } catch (error) {
      permanentLogger.captureError('SOCIAL_EXTRACTOR', error as Error, { url })
      return undefined
    }
  }

  /**
   * Extract all social links from the page
   */
  private extractAllSocialLinks($: CheerioAPI): Map<string, string> {
    const socialLinks = new Map<string, string>()

    // Get all links
    $('a[href]').each((_, element) => {
      const href = $(element).attr('href')
      if (!href) return

      // Check each social platform pattern
      for (const [platform, config] of Object.entries(SOCIAL_PATTERNS)) {
        for (const pattern of config.patterns) {
          if (pattern.test(href)) {
            // Normalize the URL
            const normalizedUrl = this.normalizeUrl(href)
            if (normalizedUrl) {
              const finalUrl = config.normalizeUrl(normalizedUrl)
              socialLinks.set(platform, finalUrl)
              break
            }
          }
        }
      }

      // Also check for icon classes
      const classes = $(element).attr('class') || ''
      const ariaLabel = $(element).attr('aria-label') || ''
      const title = $(element).attr('title') || ''

      for (const [platform, iconPatterns] of Object.entries(ICON_PATTERNS)) {
        const hasIconClass = iconPatterns.some(pattern =>
          classes.toLowerCase().includes(pattern)
        )
        const hasAriaLabel = ariaLabel.toLowerCase().includes(platform)
        const hasTitle = title.toLowerCase().includes(platform)

        if ((hasIconClass || hasAriaLabel || hasTitle) && href && !socialLinks.has(platform)) {
          // This might be a social link
          if (this.isValidUrl(href)) {
            socialLinks.set(platform, this.normalizeUrl(href))
          }
        }
      }
    })

    return socialLinks
  }

  /**
   * Extract from meta tags
   */
  private extractFromMeta($: CheerioAPI): Partial<SocialMediaProfiles> {
    const profiles: Partial<SocialMediaProfiles> = {}

    // Twitter/X
    const twitterSite = this.getMetaContent($, 'twitter:site')
    if (twitterSite) {
      const username = twitterSite.replace('@', '')
      profiles.twitter = `https://x.com/${username}`
    }

    const twitterCreator = this.getMetaContent($, 'twitter:creator')
    if (twitterCreator && !profiles.twitter) {
      const username = twitterCreator.replace('@', '')
      profiles.twitter = `https://x.com/${username}`
    }

    // Facebook
    const fbAppId = this.getMetaContent($, 'fb:app_id')
    const fbPage = this.getMetaContent($, 'fb:page_id')
    const articlePublisher = this.getMetaContent($, 'article:publisher')

    if (articlePublisher && articlePublisher.includes('facebook.com')) {
      profiles.facebook = articlePublisher
    }

    return profiles
  }

  /**
   * Extract from structured data
   */
  private extractFromStructuredData($: CheerioAPI): Partial<SocialMediaProfiles> {
    const profiles: Partial<SocialMediaProfiles> = {}

    // Get JSON-LD structured data
    const jsonLd = this.getJsonLd($, 'Organization')
    if (jsonLd?.sameAs) {
      const sameAs = Array.isArray(jsonLd.sameAs) ? jsonLd.sameAs : [jsonLd.sameAs]

      for (const url of sameAs) {
        if (typeof url !== 'string') continue

        // Match against social patterns
        for (const [platform, config] of Object.entries(SOCIAL_PATTERNS)) {
          for (const pattern of config.patterns) {
            if (pattern.test(url)) {
              profiles[platform as keyof SocialMediaProfiles] = config.normalizeUrl(url) as any
              break
            }
          }
        }
      }
    }

    return profiles
  }

  /**
   * Extract from specific page areas
   */
  private extractFromSpecificAreas($: CheerioAPI, profiles: Partial<SocialMediaProfiles>): void {
    // Common areas where social links are found
    const areas = [
      'footer',
      'header',
      'nav',
      '.social',
      '.social-links',
      '.social-media',
      '#social',
      '[class*="social"]',
      '[id*="social"]'
    ]

    areas.forEach(selector => {
      $(selector).find('a[href]').each((_, element) => {
        const href = $(element).attr('href')
        if (!href) return

        // Check each platform
        for (const [platform, config] of Object.entries(SOCIAL_PATTERNS)) {
          if (profiles[platform as keyof SocialMediaProfiles]) continue

          for (const pattern of config.patterns) {
            if (pattern.test(href)) {
              const normalizedUrl = this.normalizeUrl(href)
              if (normalizedUrl) {
                profiles[platform as keyof SocialMediaProfiles] = config.normalizeUrl(normalizedUrl) as any
                break
              }
            }
          }
        }
      })
    })
  }

  /**
   * Clean and validate social profiles
   */
  private cleanAndValidateProfiles(profiles: Partial<SocialMediaProfiles>): SocialMediaProfiles {
    const cleaned: Partial<SocialMediaProfiles> = {}

    for (const [platform, url] of Object.entries(profiles)) {
      if (!url || typeof url !== 'string') continue

      // Validate URL
      if (!this.isValidUrl(url)) continue

      // Skip if it's just the platform homepage
      if (this.isHomepage(url)) continue

      // Add to cleaned profiles
      cleaned[platform as keyof SocialMediaProfiles] = url as any
    }

    return cleaned as SocialMediaProfiles
  }

  /**
   * Normalize URL (add protocol if missing, etc.)
   */
  private normalizeUrl(url: string): string {
    // Skip empty or anchor-only URLs
    if (!url || url === '#' || url.startsWith('javascript:')) {
      return ''
    }

    // Add protocol if missing
    if (!url.startsWith('http')) {
      if (url.startsWith('//')) {
        url = `https:${url}`
      } else if (url.startsWith('/')) {
        // Relative URL - we can't use this for social media
        return ''
      } else {
        url = `https://${url}`
      }
    }

    return url
  }

  /**
   * Check if URL is valid
   */
  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
      return false
    }
  }

  /**
   * Check if URL is just the platform homepage
   */
  private isHomepage(url: string): boolean {
    try {
      const parsed = new URL(url)
      const path = parsed.pathname

      // Check if it's just the domain with no specific profile
      if (path === '/' || path === '') return true

      // Check for generic paths
      const genericPaths = ['/home', '/index', '/login', '/signup', '/register']
      if (genericPaths.includes(path.toLowerCase())) return true

      return false
    } catch {
      return true
    }
  }

  /**
   * Validate social media profiles
   */
  validate(data: SocialMediaProfiles): boolean {
    if (!data) return false

    // Must have at least one profile
    return Object.keys(data).length > 0
  }

  /**
   * Get confidence score
   */
  getConfidence(data: SocialMediaProfiles): number {
    if (!data) return 0

    let score = 0
    const platforms = Object.keys(data)

    // Base score per platform
    score = platforms.length * 15

    // Bonus for major platforms
    if (data.linkedin) score += 10
    if (data.twitter) score += 10
    if (data.facebook) score += 5
    if (data.instagram) score += 5

    // Extra bonus for having multiple platforms
    if (platforms.length >= 3) score += 10
    if (platforms.length >= 5) score += 10

    return Math.min(score, 100)
  }
}