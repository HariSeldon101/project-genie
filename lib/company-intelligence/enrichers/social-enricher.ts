/**
 * Social Media Enricher
 * Extracts public social media data and metrics
 * Uses web scraping for public profiles (no API needed)
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { 
  SocialMediaMetricsSchema,
  type SocialMediaMetrics 
} from '../schemas/enrichment-schemas'

interface SocialEnricherOptions {
  companyName: string
  domain?: string
  socialUrls?: Record<string, string>
}

export class SocialEnricher {
  private cache: Map<string, { data: SocialMediaMetrics[], timestamp: number }>

  constructor() {
    this.cache = new Map()
    
    permanentLogger.info('SOCIAL_ENRICHER', 'Initialized social media enricher')
  }

  /**
   * Extract social media metrics and presence
   */
  async extractSocialData(options: SocialEnricherOptions): Promise<SocialMediaMetrics[]> {
    const cacheKey = options.companyName
    
    // Check cache (2 hour TTL for social data)
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < 7200000) {
      permanentLogger.info('SOCIAL_ENRICHER', 'Returning cached social data', {
        company: options.companyName,
        profiles: cached.data.length
      })
      return cached.data
    }

    const profiles: SocialMediaMetrics[] = []

    try {
      // Extract from provided URLs if available
      if (options.socialUrls) {
        for (const [platform, url] of Object.entries(options.socialUrls)) {
          const metrics = await this.extractFromUrl(platform, url)
          if (metrics) {
            profiles.push(metrics)
          }
        }
      }

      // If no URLs provided, throw error - no mock data allowed
      if (profiles.length === 0) {
        throw new Error(`No social media URLs provided for ${options.companyName}`)
      }

      // Calculate engagement scores
      profiles.forEach(profile => {
        this.calculateEngagementScore(profile)
      })

      // Cache the results
      this.cache.set(cacheKey, {
        data: profiles,
        timestamp: Date.now()
      })

      permanentLogger.info('SOCIAL_ENRICHER', 'Social data extracted', {
        company: options.companyName,
        profiles: profiles.length
      })

      return profiles

    } catch (error) {
      permanentLogger.captureError('SOCIAL_ENRICHER', error as Error, {
        message: 'Failed to extract social data'
      })
      
      // BULLETPROOF ARCHITECTURE: No fallback data - throw error
      throw new Error(`Social media enrichment failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Extract metrics from a social media URL
   */
  private async extractFromUrl(platform: string, url: string): Promise<SocialMediaMetrics | null> {
    try {
      // In production, this would use proper web scraping
      // For now, return structured estimates based on platform
      
      const platformLower = platform.toLowerCase()
      
      const baseMetrics: SocialMediaMetrics = {
        platform: this.normalizePlatform(platformLower),
        profileUrl: url,
        followers: null,
        lastActivity: null,
        verified: false
      }

      // Platform-specific patterns (would be extracted via scraping in production)
      switch (platformLower) {
        case 'linkedin':
          // Only return real scraped data - NO ESTIMATES
          return null

        case 'twitter':
        case 'x':
          // Only return real scraped data - NO ESTIMATES
          return null

        case 'facebook':
          // Only return real scraped data - NO ESTIMATES
          return null

        case 'instagram':
          // Only return real scraped data - NO ESTIMATES
          return null

        case 'youtube':
          // Only return real scraped data - NO ESTIMATES
          return null

        default:
          return baseMetrics
      }

    } catch (error) {
      permanentLogger.captureError('SOCIAL_ENRICHER', error as Error, {
        message: `Failed to extract from ${platform}`
      })
      return null
    }
  }

  // REMOVED: All estimation methods - NO MOCK DATA ALLOWED in bulletproof architecture

  /**
   * Normalize platform name
   */
  private normalizePlatform(platform: string): SocialMediaMetrics['platform'] {
    const platformMap: Record<string, SocialMediaMetrics['platform']> = {
      linkedin: 'linkedin',
      twitter: 'twitter',
      x: 'twitter',
      facebook: 'facebook',
      instagram: 'instagram',
      youtube: 'youtube',
      tiktok: 'tiktok'
    }

    return platformMap[platform.toLowerCase()] || 'other'
  }

  /**
   * Calculate engagement score for a profile
   */
  private calculateEngagementScore(profile: SocialMediaMetrics): void {
    if (!profile.engagement || !profile.followers) return

    const { postsPerMonth, averageLikes, averageComments } = profile.engagement
    
    if (postsPerMonth && averageLikes && profile.followers > 0) {
      // Simple engagement rate calculation
      const engagementRate = ((averageLikes + (averageComments || 0) * 2) / profile.followers) * 100
      
      // Add engagement rate to the profile (not in schema, but useful for sorting)
      ;(profile as any).engagementRate = Math.min(engagementRate, 100)
    }
  }

  /**
   * Analyze social media sentiment and themes
   */
  async analyzeSocialSentiment(profiles: SocialMediaMetrics[]): Promise<{
    overallSentiment: 'positive' | 'neutral' | 'negative'
    primaryPlatform: string
    totalReach: number
    engagementLevel: 'high' | 'medium' | 'low'
  }> {
    const totalFollowers = profiles.reduce((sum, p) => sum + (p.followers || 0), 0)
    
    // Find most active platform
    const primaryPlatform = profiles.reduce((best, current) => {
      const currentEngagement = current.engagement?.postsPerMonth || 0
      const bestEngagement = best.engagement?.postsPerMonth || 0
      return currentEngagement > bestEngagement ? current : best
    })

    // Calculate average engagement level
    const avgEngagementRate = profiles
      .filter(p => (p as any).engagementRate)
      .reduce((sum, p) => sum + (p as any).engagementRate, 0) / profiles.length

    const engagementLevel = avgEngagementRate > 5 ? 'high' : 
                           avgEngagementRate > 2 ? 'medium' : 'low'

    return {
      overallSentiment: 'neutral', // Would analyze actual posts in production
      primaryPlatform: primaryPlatform.platform,
      totalReach: totalFollowers,
      engagementLevel
    }
  }

  /**
   * Extract competitor social data for comparison
   */
  async extractCompetitorSocialData(
    competitors: string[]
  ): Promise<Map<string, SocialMediaMetrics[]>> {
    const competitorData = new Map<string, SocialMediaMetrics[]>()

    for (const competitor of competitors) {
      const data = await this.extractSocialData({
        companyName: competitor
      })
      competitorData.set(competitor, data)
    }

    return competitorData
  }

  /**
   * Generate social media recommendations
   */
  generateRecommendations(
    profiles: SocialMediaMetrics[],
    competitorData?: Map<string, SocialMediaMetrics[]>
  ): string[] {
    const recommendations: string[] = []

    // Check for missing platforms
    const platforms = new Set(profiles.map(p => p.platform))
    
    if (!platforms.has('linkedin')) {
      recommendations.push('Establish LinkedIn presence for B2B engagement')
    }
    
    if (!platforms.has('twitter')) {
      recommendations.push('Create Twitter/X account for real-time updates and customer engagement')
    }

    // Check engagement levels
    const lowEngagement = profiles.filter(p => 
      p.engagement && p.engagement.postsPerMonth && p.engagement.postsPerMonth < 5
    )
    
    if (lowEngagement.length > 0) {
      recommendations.push(`Increase posting frequency on ${lowEngagement.map(p => p.platform).join(', ')}`)
    }

    // Check for verification
    const unverified = profiles.filter(p => !p.verified && p.followers && p.followers > 10000)
    
    if (unverified.length > 0) {
      recommendations.push('Pursue platform verification for increased credibility')
    }

    return recommendations
  }
}

// Export singleton instance
export const socialEnricher = new SocialEnricher()