/**
 * Social Media Enricher
 * Discovers and aggregates company presence across social media platforms
 * Following DRY principles with shared interfaces
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { 
  SocialProfile, 
  EngagementMetrics,
  SocialActivity,
  EnrichmentResult 
} from '../types/external-intelligence'

interface PlatformSearchStrategy {
  platform: SocialProfile['platform']
  searchPatterns: string[]
  urlPattern: RegExp
  profilePattern: RegExp
}

export class SocialMediaEnricher {
  private readonly searchTimeout = 8000
  private readonly scrapeTimeout = 10000
  
  // Platform-specific search strategies (DRY principle)
  private readonly platformStrategies: PlatformSearchStrategy[] = [
    {
      platform: 'twitter',
      searchPatterns: [
        'site:twitter.com {company}',
        'site:x.com {company}',
        '{company} Twitter official'
      ],
      urlPattern: /https?:\/\/(www\.)?(twitter\.com|x\.com)\/[a-zA-Z0-9_]+/i,
      profilePattern: /https?:\/\/(www\.)?(twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/i
    },
    {
      platform: 'facebook',
      searchPatterns: [
        'site:facebook.com {company} official',
        '{company} Facebook page'
      ],
      urlPattern: /https?:\/\/(www\.)?facebook\.com\/[a-zA-Z0-9.-]+/i,
      profilePattern: /https?:\/\/(www\.)?facebook\.com\/([a-zA-Z0-9.-]+)/i
    },
    {
      platform: 'instagram',
      searchPatterns: [
        'site:instagram.com {company}',
        '{company} Instagram official'
      ],
      urlPattern: /https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9_.]+/i,
      profilePattern: /https?:\/\/(www\.)?instagram\.com\/([a-zA-Z0-9_.]+)/i
    },
    {
      platform: 'youtube',
      searchPatterns: [
        'site:youtube.com {company} channel',
        '{company} YouTube official channel'
      ],
      urlPattern: /https?:\/\/(www\.)?youtube\.com\/(c\/|channel\/|@)[a-zA-Z0-9_-]+/i,
      profilePattern: /https?:\/\/(www\.)?youtube\.com\/(c\/|channel\/|@)([a-zA-Z0-9_-]+)/i
    },
    {
      platform: 'tiktok',
      searchPatterns: [
        'site:tiktok.com {company}',
        '{company} TikTok official'
      ],
      urlPattern: /https?:\/\/(www\.)?tiktok\.com\/@[a-zA-Z0-9_.]+/i,
      profilePattern: /https?:\/\/(www\.)?tiktok\.com\/@([a-zA-Z0-9_.]+)/i
    }
  ]

  /**
   * Main enrichment method for social media profiles
   */
  async enrich(
    companyName: string,
    domain: string,
    sessionId: string
  ): Promise<EnrichmentResult> {
    const startTime = Date.now()
    
    permanentLogger.info('SOCIAL_MEDIA_ENRICHER', 'Starting social media enrichment', { companyName,
      domain,
      sessionId })

    try {
      // Step 1: Check homepage for social links (fastest method)
      const homepageProfiles = await this.extractSocialLinksFromHomepage(domain)
      
      permanentLogger.info('SOCIAL_MEDIA_ENRICHER', 'Homepage social links found', {
        count: homepageProfiles.length,
        platforms: homepageProfiles.map(p => p.platform)
      })

      // Step 2: Search for profiles not found on homepage
      const searchedProfiles = await this.searchForSocialProfiles(
        companyName, 
        domain,
        homepageProfiles
      )

      // Step 3: Combine and deduplicate profiles
      const allProfiles = this.deduplicateProfiles([
        ...homepageProfiles,
        ...searchedProfiles
      ])

      // Step 4: Enrich each profile with metrics
      const enrichedProfiles = await this.enrichProfiles(allProfiles, sessionId)

      permanentLogger.info('SOCIAL_MEDIA_ENRICHER', 'Social media enrichment completed', { companyName,
        totalProfiles: enrichedProfiles.length,
        platforms: enrichedProfiles.map(p => ({
          platform: p.platform,
          followers: p.followers,
          verified: p.verified
        })),
        duration: Date.now() - startTime
      })

      return {
        success: true,
        source: 'social',
        data: enrichedProfiles,
        duration: Date.now() - startTime,
        timestamp: new Date()
      }

    } catch (error) {
      permanentLogger.captureError('SOCIAL_MEDIA_ENRICHER', error as Error, {
        message: 'Enrichment failed',
        companyName,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })

      return {
        success: false,
        source: 'social',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
        timestamp: new Date()
      }
    }
  }

  /**
   * Extract social media links from company homepage
   */
  private async extractSocialLinksFromHomepage(domain: string): Promise<Partial<SocialProfile>[]> {
    permanentLogger.info('SOCIAL_MEDIA_ENRICHER', 'Extracting social links from homepage', { domain})

    try {
      const response = await fetch('/api/company-intelligence/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `https://${domain}`,
          phase: 1, // Quick Cheerio scrape
          extractLinks: true
        }),
        signal: AbortSignal.timeout(this.scrapeTimeout)
      })

      if (!response.ok) {
        throw new Error(`Homepage scrape failed: ${response.status}`)
      }

      const data = await response.json()
      const html = data.html || ''
      const links = data.links || []

      const profiles: Partial<SocialProfile>[] = []

      // Check each platform strategy
      for (const strategy of this.platformStrategies) {
        // Search in HTML for social links
        const matches = html.matchAll(new RegExp(strategy.urlPattern.source, 'gi'))
        
        for (const match of matches) {
          const url = match[0]
          const usernameMatch = url.match(strategy.profilePattern)
          
          if (usernameMatch) {
            profiles.push({
              platform: strategy.platform,
              profileUrl: url,
              username: usernameMatch[2] || usernameMatch[1]
            })
            
            permanentLogger.info('SOCIAL_MEDIA_ENRICHER', 'Found social profile on homepage', { platform: strategy.platform,
              url })
            
            break // Only take first match per platform
          }
        }

        // Also check extracted links
        for (const link of links) {
          if (strategy.urlPattern.test(link)) {
            const usernameMatch = link.match(strategy.profilePattern)
            
            if (usernameMatch && !profiles.find(p => p.platform === strategy.platform)) {
              profiles.push({
                platform: strategy.platform,
                profileUrl: link,
                username: usernameMatch[2] || usernameMatch[1]
              })
              
              permanentLogger.info('SOCIAL_MEDIA_ENRICHER', 'Found social profile in links', { platform: strategy.platform,
                url: link })
            }
          }
        }
      }

      return profiles

    } catch (error) {
      permanentLogger.captureError('SOCIAL_MEDIA_ENRICHER', error as Error, {
        message: 'Homepage extraction failed',
        domain,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
      return []
    }
  }

  /**
   * Search for social profiles using web search
   */
  private async searchForSocialProfiles(
    companyName: string,
    domain: string,
    existingProfiles: Partial<SocialProfile>[]
  ): Promise<Partial<SocialProfile>[]> {
    permanentLogger.info('SOCIAL_MEDIA_ENRICHER', 'Searching for additional social profiles', {
      companyName,
      existingPlatforms: existingProfiles.map(p => p.platform)
    })

    const profiles: Partial<SocialProfile>[] = []

    for (const strategy of this.platformStrategies) {
      // Skip if we already have this platform
      if (existingProfiles.find(p => p.platform === strategy.platform)) {
        continue
      }

      try {
        // Try each search pattern
        for (const searchPattern of strategy.searchPatterns) {
          const query = searchPattern
            .replace('{company}', companyName)
            .replace('{domain}', domain.replace(/\.(com|org|net|io|co|uk).*/, ''))

          const response = await fetch('/api/web-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query,
              maxResults: 3
            }),
            signal: AbortSignal.timeout(this.searchTimeout)
          })

          if (!response.ok) continue

          const results = await response.json()
          
          // Look for matching URLs
          for (const result of (results.items || [])) {
            const url = result.link || result.url
            
            if (url && strategy.urlPattern.test(url)) {
              const usernameMatch = url.match(strategy.profilePattern)
              
              if (usernameMatch) {
                profiles.push({
                  platform: strategy.platform,
                  profileUrl: url,
                  username: usernameMatch[2] || usernameMatch[1]
                })
                
                permanentLogger.info('SOCIAL_MEDIA_ENRICHER', 'Found social profile via search', { platform: strategy.platform,
                  query,
                  url })
                
                break // Found profile for this platform
              }
            }
          }
          
          if (profiles.find(p => p.platform === strategy.platform)) {
            break // Already found this platform
          }
        }

      } catch (error) {
        permanentLogger.captureError('SOCIAL_MEDIA_ENRICHER', error as Error, {
          message: 'Platform search failed',
          platform: strategy.platform,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return profiles
  }

  /**
   * Deduplicate social profiles
   */
  private deduplicateProfiles(profiles: Partial<SocialProfile>[]): Partial<SocialProfile>[] {
    const uniqueProfiles = new Map<string, Partial<SocialProfile>>()
    
    for (const profile of profiles) {
      const key = `${profile.platform}-${profile.username}`
      
      if (!uniqueProfiles.has(key)) {
        uniqueProfiles.set(key, profile)
      }
    }
    
    permanentLogger.info('SOCIAL_MEDIA_ENRICHER', 'Deduplicated profiles', { original: profiles.length,
      unique: uniqueProfiles.size })
    
    return Array.from(uniqueProfiles.values())
  }

  /**
   * Enrich profiles with detailed metrics
   */
  private async enrichProfiles(
    profiles: Partial<SocialProfile>[],
    sessionId: string
  ): Promise<SocialProfile[]> {
    permanentLogger.info('SOCIAL_MEDIA_ENRICHER', 'Enriching social profiles', { count: profiles.length})

    const enrichedProfiles: SocialProfile[] = []

    for (const profile of profiles) {
      if (!profile.profileUrl || !profile.platform) continue

      try {
        // Scrape the social profile page
        const response = await fetch('/api/company-intelligence/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: profile.profileUrl,
            phase: 1, // Quick scrape for public data
            extractMetadata: true
          }),
          signal: AbortSignal.timeout(this.scrapeTimeout)
        })

        if (!response.ok) {
          throw new Error(`Profile scrape failed: ${response.status}`)
        }

        const scrapedData = await response.json()
        
        // Parse platform-specific data
        const enrichedProfile = this.parsePlatformData(
          profile,
          scrapedData,
          sessionId
        )
        
        enrichedProfiles.push(enrichedProfile)
        
        permanentLogger.info('SOCIAL_MEDIA_ENRICHER', 'Profile enriched', { platform: enrichedProfile.platform,
          username: enrichedProfile.username,
          followers: enrichedProfile.followers,
          verified: enrichedProfile.verified })

      } catch (error) {
        permanentLogger.captureError('SOCIAL_MEDIA_ENRICHER', error as Error, {
          message: 'Profile enrichment failed',
          platform: profile.platform,
          url: profile.profileUrl,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        })
        
        // Add basic profile even if enrichment fails
        enrichedProfiles.push(this.createBasicProfile(profile, sessionId))
      }
    }

    return enrichedProfiles
  }

  /**
   * Parse platform-specific data from scraped content
   */
  private parsePlatformData(
    profile: Partial<SocialProfile>,
    scrapedData: any,
    sessionId: string
  ): SocialProfile {
    const $ = scrapedData.$ || null
    const metadata = scrapedData.metadata || {}
    const html = scrapedData.html || ''

    // Base profile data
    const socialProfile: SocialProfile = {
      sessionId,
      sourceType: 'social',
      fetchedAt: new Date(),
      confidence: 0.5,
      platform: profile.platform!,
      profileUrl: profile.profileUrl!,
      username: profile.username || '',
      verified: false,
      followers: 0,
      engagement: {
        averageLikes: 0,
        averageComments: 0,
        averageShares: 0,
        engagementRate: 0
      },
      recentActivity: []
    }

    // Platform-specific extraction
    switch (profile.platform) {
      case 'twitter':
        socialProfile.displayName = metadata.title?.replace(' on X', '').replace(' (@', '').trim()
        socialProfile.bio = metadata.description || ''
        
        // Extract followers from HTML patterns
        const twitterFollowers = this.extractNumber(html, /(\d+(?:,\d+)*)\s*Followers/i)
        if (twitterFollowers) socialProfile.followers = twitterFollowers
        
        const twitterFollowing = this.extractNumber(html, /(\d+(?:,\d+)*)\s*Following/i)
        if (twitterFollowing) socialProfile.following = twitterFollowing
        
        const twitterPosts = this.extractNumber(html, /(\d+(?:,\d+)*)\s*(Tweets|Posts)/i)
        if (twitterPosts) socialProfile.posts = twitterPosts
        
        // Check for verification
        socialProfile.verified = html.includes('verified-badge') || 
                                html.includes('VerifiedBadge') ||
                                html.includes('blue-tick')
        break

      case 'facebook':
        socialProfile.displayName = metadata.title?.replace(' - Facebook', '').trim()
        socialProfile.bio = metadata.description || ''
        
        const fbFollowers = this.extractNumber(html, /(\d+(?:,\d+)*)\s*(people follow|followers)/i)
        if (fbFollowers) socialProfile.followers = fbFollowers
        
        const fbLikes = this.extractNumber(html, /(\d+(?:,\d+)*)\s*(people like|likes)/i)
        if (fbLikes && fbLikes > socialProfile.followers) {
          socialProfile.followers = fbLikes
        }
        
        socialProfile.verified = html.includes('verified_badge') || 
                                html.includes('VerifiedBadge')
        break

      case 'instagram':
        socialProfile.displayName = metadata.title?.split('•')[0]?.trim()
        socialProfile.bio = metadata.description || ''
        
        const igFollowers = this.extractNumber(html, /(\d+(?:\.?\d+)*[KMB]?)\s*Followers/i)
        if (igFollowers) socialProfile.followers = this.parseCompactNumber(igFollowers.toString())
        
        const igPosts = this.extractNumber(html, /(\d+(?:,\d+)*)\s*Posts/i)
        if (igPosts) socialProfile.posts = igPosts
        
        socialProfile.verified = html.includes('verified') || 
                                metadata.verified === 'true'
        break

      case 'youtube':
        socialProfile.displayName = metadata.title?.replace(' - YouTube', '').trim()
        socialProfile.bio = metadata.description || ''
        
        const ytSubscribers = this.extractNumber(html, /(\d+(?:\.?\d+)*[KMB]?)\s*subscribers/i)
        if (ytSubscribers) socialProfile.followers = this.parseCompactNumber(ytSubscribers.toString())
        
        const ytVideos = this.extractNumber(html, /(\d+(?:,\d+)*)\s*videos/i)
        if (ytVideos) socialProfile.posts = ytVideos
        
        // YouTube verification
        socialProfile.verified = html.includes('verified') || 
                                html.includes('ytVerifiedBadge')
        break

      case 'tiktok':
        socialProfile.displayName = metadata.title?.split('|')[0]?.trim()
        socialProfile.bio = metadata.description || ''
        
        const ttFollowers = this.extractNumber(html, /(\d+(?:\.?\d+)*[KMB]?)\s*Followers/i)
        if (ttFollowers) socialProfile.followers = this.parseCompactNumber(ttFollowers.toString())
        
        const ttLikes = this.extractNumber(html, /(\d+(?:\.?\d+)*[KMB]?)\s*Likes/i)
        if (ttLikes) {
          socialProfile.engagement.averageLikes = this.parseCompactNumber(ttLikes.toString())
        }
        
        socialProfile.verified = html.includes('verified-badge') || 
                                html.includes('svg-verified')
        break
    }

    // Extract profile image if available
    if ($) {
      socialProfile.profileImage = $('meta[property="og:image"]').attr('content') ||
                                  $('img[alt*="profile"]').first().attr('src') ||
                                  $('img[alt*="avatar"]').first().attr('src')
    }

    // Calculate engagement rate (simplified)
    if (socialProfile.followers > 0) {
      socialProfile.engagement.engagementRate = 
        ((socialProfile.engagement.averageLikes + 
          socialProfile.engagement.averageComments) / 
          socialProfile.followers) * 100
    }

    // Set confidence based on data completeness
    let confidence = 0.3 // Base confidence
    if (socialProfile.followers > 0) confidence += 0.2
    if (socialProfile.displayName) confidence += 0.1
    if (socialProfile.bio) confidence += 0.1
    if (socialProfile.verified) confidence += 0.2
    if (socialProfile.profileImage) confidence += 0.1
    
    socialProfile.confidence = Math.min(confidence, 1)

    return socialProfile
  }

  /**
   * Extract number from text with pattern
   */
  private extractNumber(text: string, pattern: RegExp): number | null {
    const match = pattern.exec(text)
    
    if (match && match[1]) {
      const numStr = match[1].replace(/,/g, '')
      const num = parseInt(numStr)
      
      if (!isNaN(num)) {
        return num
      }
    }
    
    return null
  }

  /**
   * Parse compact number format (1.2K, 3.5M, etc.)
   */
  private parseCompactNumber(str: string): number {
    const match = str.match(/(\d+(?:\.\d+)?)\s*([KMB])?/i)
    
    if (!match) return 0
    
    let num = parseFloat(match[1])
    const suffix = match[2]?.toUpperCase()
    
    switch (suffix) {
      case 'K': return Math.round(num * 1000)
      case 'M': return Math.round(num * 1000000)
      case 'B': return Math.round(num * 1000000000)
      default: return Math.round(num)
    }
  }

  /**
   * Create basic profile when enrichment fails
   */
  private createBasicProfile(
    profile: Partial<SocialProfile>,
    sessionId: string
  ): SocialProfile {
    return {
      sessionId,
      sourceType: 'social',
      fetchedAt: new Date(),
      confidence: 0.3,
      platform: profile.platform!,
      profileUrl: profile.profileUrl!,
      username: profile.username || '',
      verified: false,
      followers: 0,
      engagement: {
        averageLikes: 0,
        averageComments: 0,
        averageShares: 0,
        engagementRate: 0
      },
      recentActivity: []
    }
  }

  /**
   * Validate social profile data
   */
  validateProfile(profile: SocialProfile): boolean {
    if (!profile.profileUrl || !profile.platform || !profile.username) {
      permanentLogger.info('SOCIAL_MEDIA_ENRICHER', 'Profile validation failed', { platform: profile.platform,
        hasUrl: !!profile.profileUrl,
        hasUsername: !!profile.username })
      return false
    }

    // Check URL matches platform
    const strategy = this.platformStrategies.find(s => s.platform === profile.platform)
    if (strategy && !strategy.urlPattern.test(profile.profileUrl)) {
      permanentLogger.info('SOCIAL_MEDIA_ENRICHER', 'URL pattern mismatch', { platform: profile.platform,
        url: profile.profileUrl })
      return false
    }

    return true
  }
}

// Export singleton instance
export const socialMediaEnricher = new SocialMediaEnricher()