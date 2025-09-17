/**
 * Social Media Extractor
 * 
 * Extracts actual social media account links from web pages.
 * Runs during scraping phase for more reliable extraction with full page context.
 * 
 * @module social-media-extractor
 */

import { Page } from 'playwright'
import { permanentLogger } from '@/lib/utils/permanent-logger'

/**
 * Social media platform configuration
 */
interface PlatformConfig {
  name: string
  patterns: RegExp[]
  validateUrl?: (url: string) => boolean
}

/**
 * Extracted social media account
 */
export interface SocialMediaAccount {
  platform: string
  url: string
  username?: string
  verified?: boolean
}

/**
 * Social Media Extractor
 * 
 * Extracts actual social media account links from pages,
 * distinguishing them from share buttons and other non-account links.
 */
export class SocialMediaExtractor {
  private platforms: Map<string, PlatformConfig>

  constructor() {
    this.platforms = new Map([
      ['facebook', {
        name: 'Facebook',
        patterns: [
          /facebook\.com\/(?!sharer|share|dialog)/i,
          /fb\.com\/(?!sharer|share)/i
        ],
        validateUrl: (url) => {
          // Exclude common non-profile patterns
          const excludePatterns = [
            /\/sharer\//i,
            /\/share/i,
            /\/dialog\//i,
            /\/plugins\//i,
            /\/developers\//i,
            /\/help\//i,
            /\/policies\//i
          ]
          return !excludePatterns.some(pattern => pattern.test(url))
        }
      }],
      ['twitter', {
        name: 'Twitter/X',
        patterns: [
          /twitter\.com\/(?!intent|share|widgets)/i,
          /x\.com\/(?!intent|share|widgets)/i
        ],
        validateUrl: (url) => {
          const excludePatterns = [
            /\/intent\//i,
            /\/share/i,
            /\/widgets\//i,
            /\/embed\//i
          ]
          return !excludePatterns.some(pattern => pattern.test(url))
        }
      }],
      ['linkedin', {
        name: 'LinkedIn',
        patterns: [
          /linkedin\.com\/company\//i,
          /linkedin\.com\/in\//i,
          /linkedin\.com\/school\//i
        ]
      }],
      ['instagram', {
        name: 'Instagram',
        patterns: [
          /instagram\.com\/(?!p\/|reel\/|tv\/)/i,
          /instagr\.am\/(?!p\/|reel\/|tv\/)/i
        ]
      }],
      ['youtube', {
        name: 'YouTube',
        patterns: [
          /youtube\.com\/(c\/|channel\/|user\/|@)/i,
          /youtube\.com\/(?!watch|embed|playlist)/i
        ]
      }],
      ['tiktok', {
        name: 'TikTok',
        patterns: [
          /tiktok\.com\/@/i
        ]
      }],
      ['pinterest', {
        name: 'Pinterest',
        patterns: [
          /pinterest\.com\/(?!pin\/|pins\/)/i
        ]
      }],
      ['github', {
        name: 'GitHub',
        patterns: [
          /github\.com\/[^\/]+\/?$/i
        ],
        validateUrl: (url) => {
          // Only organization/user profiles, not repos
          const parts = url.replace(/https?:\/\/github\.com\//i, '').split('/')
          return parts.length === 1 || (parts.length === 2 && parts[1] === '')
        }
      }]
    ])
  }

  /**
   * Extract social media accounts from a page
   * 
   * @param page - Playwright page instance
   * @returns Array of found social media accounts
   */
  async extract(page: Page): Promise<SocialMediaAccount[]> {
    try {
      const accounts = await page.evaluate(() => {
        const results: Array<{platform: string, url: string, username?: string}> = []
        const processedUrls = new Set<string>()

        // Find all links on the page
        const links = document.querySelectorAll('a[href]')
        
        links.forEach(link => {
          const href = link.getAttribute('href')
          if (!href) return

          // Normalize URL
          let normalizedUrl: string
          try {
            const url = new URL(href, window.location.origin)
            normalizedUrl = url.href
          } catch {
            return // Invalid URL
          }

          // Skip if already processed
          if (processedUrls.has(normalizedUrl)) return
          processedUrls.add(normalizedUrl)

          // Check against each platform
          // This will be processed on the Node side
          results.push({
            platform: 'unknown',
            url: normalizedUrl
          })
        })

        // Also check for social media meta tags
        const metaTags = document.querySelectorAll('meta[property^="article:author"], meta[name^="twitter:creator"]')
        metaTags.forEach(tag => {
          const content = tag.getAttribute('content')
          if (content && content.startsWith('http')) {
            results.push({
              platform: 'unknown',
              url: content
            })
          }
        })

        return results
      })

      // Process and validate each URL
      const validAccounts: SocialMediaAccount[] = []
      const seenUrls = new Set<string>()

      for (const account of accounts) {
        // Skip duplicates
        if (seenUrls.has(account.url)) continue

        // Check each platform
        for (const [key, config] of this.platforms) {
          const matches = config.patterns.some(pattern => pattern.test(account.url))
          
          if (matches) {
            // Additional validation if provided
            if (config.validateUrl && !config.validateUrl(account.url)) {
              continue
            }

            // Extract username if possible
            const username = this.extractUsername(account.url, key)

            validAccounts.push({
              platform: key,
              url: account.url,
              username
            })

            seenUrls.add(account.url)
            break // Found platform, move to next URL
          }
        }
      }

      // Try to find additional accounts in specific page sections
      const footerAccounts = await this.extractFromFooter(page)
      const headerAccounts = await this.extractFromHeader(page)
      
      // Merge and deduplicate
      const allAccounts = [...validAccounts, ...footerAccounts, ...headerAccounts]
      const uniqueAccounts = this.deduplicateAccounts(allAccounts)

      permanentLogger.info('SOCIAL_MEDIA_EXTRACTOR', 'Extraction complete', {
        url: page.url(),
        accountsFound: uniqueAccounts.length,
        platforms: uniqueAccounts.map(a => a.platform)
      })

      return uniqueAccounts

    } catch (error) {
      permanentLogger.captureError('SOCIAL_MEDIA_EXTRACTOR', error as Error, {
        phase: 'extraction'
      })
      return []
    }
  }

  /**
   * Extract social media accounts specifically from footer
   * 
   * @param page - Playwright page instance
   * @returns Array of found social media accounts
   */
  private async extractFromFooter(page: Page): Promise<SocialMediaAccount[]> {
    try {
      return await page.evaluate(() => {
        const results: Array<{platform: string, url: string}> = []
        
        // Common footer selectors
        const footerSelectors = [
          'footer',
          '[role="contentinfo"]',
          '.footer',
          '#footer',
          '.site-footer'
        ]

        for (const selector of footerSelectors) {
          const footer = document.querySelector(selector)
          if (footer) {
            const links = footer.querySelectorAll('a[href*="facebook"], a[href*="twitter"], a[href*="x.com"], a[href*="linkedin"], a[href*="instagram"], a[href*="youtube"], a[href*="tiktok"], a[href*="pinterest"], a[href*="github"]')
            
            links.forEach(link => {
              const href = link.getAttribute('href')
              if (href) {
                try {
                  const url = new URL(href, window.location.origin)
                  results.push({
                    platform: 'unknown',
                    url: url.href
                  })
                } catch {
                  // Invalid URL
                }
              }
            })
            break // Found footer, stop searching
          }
        }

        return results
      })
      .then(accounts => {
        // Process with platform detection
        return accounts.map(account => {
          for (const [key, config] of this.platforms) {
            if (config.patterns.some(p => p.test(account.url))) {
              if (!config.validateUrl || config.validateUrl(account.url)) {
                return {
                  platform: key,
                  url: account.url,
                  username: this.extractUsername(account.url, key)
                }
              }
            }
          }
          return null
        }).filter(Boolean) as SocialMediaAccount[]
      })
    } catch {
      return []
    }
  }

  /**
   * Extract social media accounts specifically from header
   * 
   * @param page - Playwright page instance
   * @returns Array of found social media accounts
   */
  private async extractFromHeader(page: Page): Promise<SocialMediaAccount[]> {
    try {
      return await page.evaluate(() => {
        const results: Array<{platform: string, url: string}> = []
        
        // Common header selectors
        const headerSelectors = [
          'header',
          '[role="banner"]',
          '.header',
          '#header',
          '.site-header',
          'nav'
        ]

        for (const selector of headerSelectors) {
          const header = document.querySelector(selector)
          if (header) {
            const links = header.querySelectorAll('a[href*="facebook"], a[href*="twitter"], a[href*="x.com"], a[href*="linkedin"], a[href*="instagram"], a[href*="youtube"], a[href*="tiktok"], a[href*="pinterest"], a[href*="github"]')
            
            links.forEach(link => {
              const href = link.getAttribute('href')
              if (href) {
                try {
                  const url = new URL(href, window.location.origin)
                  results.push({
                    platform: 'unknown',
                    url: url.href
                  })
                } catch {
                  // Invalid URL
                }
              }
            })
          }
        }

        return results
      })
      .then(accounts => {
        // Process with platform detection
        return accounts.map(account => {
          for (const [key, config] of this.platforms) {
            if (config.patterns.some(p => p.test(account.url))) {
              if (!config.validateUrl || config.validateUrl(account.url)) {
                return {
                  platform: key,
                  url: account.url,
                  username: this.extractUsername(account.url, key)
                }
              }
            }
          }
          return null
        }).filter(Boolean) as SocialMediaAccount[]
      })
    } catch {
      return []
    }
  }

  /**
   * Extract username from social media URL
   * 
   * @param url - Social media URL
   * @param platform - Platform name
   * @returns Username if extractable
   */
  private extractUsername(url: string, platform: string): string | undefined {
    try {
      const urlObj = new URL(url)
      const pathname = urlObj.pathname

      switch (platform) {
        case 'twitter':
          // twitter.com/username or x.com/username
          const twitterMatch = pathname.match(/^\/([^\/]+)\/?$/)
          return twitterMatch ? twitterMatch[1] : undefined

        case 'instagram':
          // instagram.com/username
          const instaMatch = pathname.match(/^\/([^\/]+)\/?$/)
          return instaMatch ? instaMatch[1] : undefined

        case 'facebook':
          // facebook.com/username or facebook.com/pages/name/id
          const fbMatch = pathname.match(/^\/([^\/]+)\/?$/)
          if (fbMatch && !['pages', 'groups', 'events'].includes(fbMatch[1])) {
            return fbMatch[1]
          }
          return undefined

        case 'linkedin':
          // linkedin.com/company/name or linkedin.com/in/name
          const linkedinMatch = pathname.match(/^\/(company|in|school)\/([^\/]+)\/?/)
          return linkedinMatch ? linkedinMatch[2] : undefined

        case 'youtube':
          // youtube.com/@username or youtube.com/c/channelname
          const ytMatch = pathname.match(/^\/(@[^\/]+|c\/[^\/]+|channel\/[^\/]+|user\/[^\/]+)/)
          return ytMatch ? ytMatch[1] : undefined

        case 'tiktok':
          // tiktok.com/@username
          const tiktokMatch = pathname.match(/^\/@([^\/]+)/)
          return tiktokMatch ? tiktokMatch[1] : undefined

        case 'github':
          // github.com/username
          const githubMatch = pathname.match(/^\/([^\/]+)\/?$/)
          return githubMatch ? githubMatch[1] : undefined

        default:
          return undefined
      }
    } catch {
      return undefined
    }
  }

  /**
   * Deduplicate social media accounts
   * 
   * @param accounts - Array of accounts to deduplicate
   * @returns Deduplicated array
   */
  private deduplicateAccounts(accounts: SocialMediaAccount[]): SocialMediaAccount[] {
    const seen = new Map<string, SocialMediaAccount>()
    
    for (const account of accounts) {
      const key = `${account.platform}:${account.url}`
      if (!seen.has(key)) {
        seen.set(key, account)
      }
    }

    return Array.from(seen.values())
  }

  /**
   * Validate if a URL is a legitimate social media profile
   * 
   * @param url - URL to validate
   * @param platform - Platform to check against
   * @returns True if valid profile URL
   */
  validateProfileUrl(url: string, platform: string): boolean {
    const config = this.platforms.get(platform)
    if (!config) return false

    const matches = config.patterns.some(pattern => pattern.test(url))
    if (!matches) return false

    if (config.validateUrl) {
      return config.validateUrl(url)
    }

    return true
  }
}

// Export singleton instance
export const socialMediaExtractor = new SocialMediaExtractor()