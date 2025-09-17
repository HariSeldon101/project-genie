/**
 * Social Media Extractor
 *
 * Extracts social media profiles and links from HTML pages including:
 * - Social media profile URLs
 * - Social sharing metadata
 * - Platform-specific identifiers
 *
 * @module extractors/social-extractor
 */

import * as cheerio from 'cheerio'
import { permanentLogger } from '@/lib/utils/permanent-logger'

/**
 * Supported social media platforms
 */
export type SocialPlatform =
  | 'facebook'
  | 'twitter'
  | 'linkedin'
  | 'instagram'
  | 'youtube'
  | 'github'
  | 'tiktok'
  | 'pinterest'
  | 'reddit'
  | 'discord'
  | 'telegram'
  | 'whatsapp'
  | 'medium'
  | 'slack'

/**
 * Extracted social media information
 */
export interface ExtractedSocial {
  profiles: Array<{
    platform: SocialPlatform
    url: string
    username?: string
    type?: 'profile' | 'page' | 'group' | 'channel'
  }>
  sharing: {
    title?: string
    description?: string
    image?: string
    twitterCard?: string
    twitterSite?: string
    twitterCreator?: string
    ogType?: string
    ogSiteName?: string
  }
  feeds: Array<{
    type: 'rss' | 'atom'
    url: string
    title?: string
  }>
}

/**
 * Platform URL patterns
 */
const PLATFORM_PATTERNS: Record<SocialPlatform, RegExp[]> = {
  facebook: [
    /(?:https?:\/\/)?(?:www\.)?facebook\.com\/([a-zA-Z0-9.]+)/,
    /(?:https?:\/\/)?(?:www\.)?fb\.com\/([a-zA-Z0-9.]+)/
  ],
  twitter: [
    /(?:https?:\/\/)?(?:www\.)?twitter\.com\/([a-zA-Z0-9_]+)/,
    /(?:https?:\/\/)?(?:www\.)?x\.com\/([a-zA-Z0-9_]+)/
  ],
  linkedin: [
    /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:company|in)\/([a-zA-Z0-9-]+)/
  ],
  instagram: [
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)/
  ],
  youtube: [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:c|channel|user)\/([a-zA-Z0-9_-]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/@([a-zA-Z0-9_-]+)/
  ],
  github: [
    /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9-]+)/
  ],
  tiktok: [
    /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@([a-zA-Z0-9_.]+)/
  ],
  pinterest: [
    /(?:https?:\/\/)?(?:www\.)?pinterest\.com\/([a-zA-Z0-9_-]+)/
  ],
  reddit: [
    /(?:https?:\/\/)?(?:www\.)?reddit\.com\/(?:r|u|user)\/([a-zA-Z0-9_-]+)/
  ],
  discord: [
    /(?:https?:\/\/)?(?:www\.)?discord\.gg\/([a-zA-Z0-9]+)/,
    /(?:https?:\/\/)?(?:www\.)?discord\.com\/invite\/([a-zA-Z0-9]+)/
  ],
  telegram: [
    /(?:https?:\/\/)?(?:www\.)?t\.me\/([a-zA-Z0-9_]+)/,
    /(?:https?:\/\/)?(?:www\.)?telegram\.me\/([a-zA-Z0-9_]+)/
  ],
  whatsapp: [
    /(?:https?:\/\/)?(?:www\.)?wa\.me\/([0-9]+)/,
    /(?:https?:\/\/)?(?:www\.)?whatsapp\.com\/([a-zA-Z0-9]+)/
  ],
  medium: [
    /(?:https?:\/\/)?(?:www\.)?medium\.com\/@([a-zA-Z0-9_.-]+)/
  ],
  slack: [
    /(?:https?:\/\/)?([a-zA-Z0-9-]+)\.slack\.com/
  ]
}

/**
 * Extracts social media information from HTML
 */
export class SocialExtractor {
  /**
   * Extract social media information from HTML
   */
  extract(html: string, url?: string): ExtractedSocial {
    const timer = permanentLogger.timing('social_extraction')

    try {
      const $ = cheerio.load(html)

      const social: ExtractedSocial = {
        profiles: this.extractProfiles($),
        sharing: this.extractSharingMetadata($),
        feeds: this.extractFeeds($)
      }

      timer.stop()

      permanentLogger.breadcrumb('social_extracted', 'Social extraction complete', {
        url,
        profileCount: social.profiles.length,
        feedCount: social.feeds.length,
        hasSharing: !!social.sharing.title
      })

      return social
    } catch (error) {
      timer.stop()
      permanentLogger.captureError('SOCIAL_EXTRACTOR', error as Error, {
        url,
        phase: 'extraction'
      })
      throw error
    }
  }

  /**
   * Extract social media profiles
   */
  private extractProfiles($: cheerio.CheerioAPI): ExtractedSocial['profiles'] {
    const profiles: ExtractedSocial['profiles'] = []
    const seen = new Set<string>()

    // Search all links for social media URLs
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href')
      if (!href) return

      // Check each platform's patterns
      for (const [platform, patterns] of Object.entries(PLATFORM_PATTERNS)) {
        for (const pattern of patterns) {
          const match = href.match(pattern)
          if (match && !seen.has(href)) {
            seen.add(href)
            profiles.push({
              platform: platform as SocialPlatform,
              url: href,
              username: match[1],
              type: this.determineProfileType(href, platform as SocialPlatform)
            })
            break
          }
        }
      }
    })

    // Look for social icons by class/id
    const socialSelectors = [
      '[class*="social"]',
      '[class*="facebook"]',
      '[class*="twitter"]',
      '[class*="linkedin"]',
      '[class*="instagram"]',
      '[class*="youtube"]',
      '[id*="social"]'
    ]

    for (const selector of socialSelectors) {
      $(selector).find('a[href]').each((_, el) => {
        const href = $(el).attr('href')
        if (!href || seen.has(href)) return

        const platform = this.detectPlatformFromUrl(href)
        if (platform) {
          seen.add(href)
          profiles.push({
            platform,
            url: href,
            username: this.extractUsernameFromUrl(href, platform),
            type: this.determineProfileType(href, platform)
          })
        }
      })
    }

    // Look for structured data
    $('[itemtype*="schema.org/Organization"] [itemprop="sameAs"]').each((_, el) => {
      const href = $(el).attr('href') || $(el).text()
      if (!href || seen.has(href)) return

      const platform = this.detectPlatformFromUrl(href)
      if (platform) {
        seen.add(href)
        profiles.push({
          platform,
          url: href,
          username: this.extractUsernameFromUrl(href, platform),
          type: 'profile'
        })
      }
    })

    return profiles
  }

  /**
   * Extract social sharing metadata
   */
  private extractSharingMetadata($: cheerio.CheerioAPI): ExtractedSocial['sharing'] {
    const sharing: ExtractedSocial['sharing'] = {}

    // Open Graph metadata
    sharing.title = $('meta[property="og:title"]').attr('content')
    sharing.description = $('meta[property="og:description"]').attr('content')
    sharing.image = $('meta[property="og:image"]').attr('content')
    sharing.ogType = $('meta[property="og:type"]').attr('content')
    sharing.ogSiteName = $('meta[property="og:site_name"]').attr('content')

    // Twitter Card metadata
    sharing.twitterCard = $('meta[name="twitter:card"]').attr('content')
    sharing.twitterSite = $('meta[name="twitter:site"]').attr('content')
    sharing.twitterCreator = $('meta[name="twitter:creator"]').attr('content')

    // Fallbacks
    if (!sharing.title) {
      sharing.title = $('meta[name="twitter:title"]').attr('content')
    }
    if (!sharing.description) {
      sharing.description = $('meta[name="twitter:description"]').attr('content')
    }
    if (!sharing.image) {
      sharing.image = $('meta[name="twitter:image"]').attr('content')
    }

    return sharing
  }

  /**
   * Extract RSS/Atom feeds
   */
  private extractFeeds($: cheerio.CheerioAPI): ExtractedSocial['feeds'] {
    const feeds: ExtractedSocial['feeds'] = []
    const seen = new Set<string>()

    // Look for feed links in head
    $('link[type="application/rss+xml"], link[type="application/atom+xml"]').each((_, el) => {
      const $link = $(el)
      const href = $link.attr('href')
      const title = $link.attr('title')
      const type = $link.attr('type')

      if (href && !seen.has(href)) {
        seen.add(href)
        feeds.push({
          type: type?.includes('rss') ? 'rss' : 'atom',
          url: href,
          title
        })
      }
    })

    // Look for common feed URLs
    $('a[href*="/feed"], a[href*="/rss"], a[href*="/atom"]').each((_, el) => {
      const href = $(el).attr('href')
      if (href && !seen.has(href)) {
        seen.add(href)
        feeds.push({
          type: href.includes('atom') ? 'atom' : 'rss',
          url: href,
          title: $(el).text().trim()
        })
      }
    })

    return feeds
  }

  /**
   * Detect platform from URL
   */
  private detectPlatformFromUrl(url: string): SocialPlatform | null {
    const lower = url.toLowerCase()

    for (const [platform, patterns] of Object.entries(PLATFORM_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(url)) {
          return platform as SocialPlatform
        }
      }
    }

    // Simple domain check fallback
    if (lower.includes('facebook.com') || lower.includes('fb.com')) return 'facebook'
    if (lower.includes('twitter.com') || lower.includes('x.com')) return 'twitter'
    if (lower.includes('linkedin.com')) return 'linkedin'
    if (lower.includes('instagram.com')) return 'instagram'
    if (lower.includes('youtube.com')) return 'youtube'
    if (lower.includes('github.com')) return 'github'
    if (lower.includes('tiktok.com')) return 'tiktok'
    if (lower.includes('pinterest.com')) return 'pinterest'
    if (lower.includes('reddit.com')) return 'reddit'
    if (lower.includes('discord.gg') || lower.includes('discord.com')) return 'discord'
    if (lower.includes('t.me') || lower.includes('telegram.me')) return 'telegram'
    if (lower.includes('wa.me') || lower.includes('whatsapp.com')) return 'whatsapp'
    if (lower.includes('medium.com')) return 'medium'
    if (lower.includes('.slack.com')) return 'slack'

    return null
  }

  /**
   * Extract username from URL
   */
  private extractUsernameFromUrl(url: string, platform: SocialPlatform): string | undefined {
    const patterns = PLATFORM_PATTERNS[platform]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match && match[1]) {
        return match[1]
      }
    }

    return undefined
  }

  /**
   * Determine profile type from URL
   */
  private determineProfileType(
    url: string,
    platform: SocialPlatform
  ): ExtractedSocial['profiles'][0]['type'] {
    const lower = url.toLowerCase()

    // Facebook
    if (platform === 'facebook') {
      if (lower.includes('/groups/')) return 'group'
      if (lower.includes('/pages/')) return 'page'
    }

    // LinkedIn
    if (platform === 'linkedin') {
      if (lower.includes('/company/')) return 'page'
      if (lower.includes('/in/')) return 'profile'
    }

    // YouTube
    if (platform === 'youtube') {
      if (lower.includes('/channel/') || lower.includes('/c/')) return 'channel'
    }

    // Reddit
    if (platform === 'reddit') {
      if (lower.includes('/r/')) return 'group'
      if (lower.includes('/u/') || lower.includes('/user/')) return 'profile'
    }

    // Discord/Telegram
    if (platform === 'discord' || platform === 'telegram') {
      return 'channel'
    }

    return 'profile'
  }
}