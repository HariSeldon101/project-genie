/**
 * LinkedIn Company Enricher
 * Discovers and extracts company data from LinkedIn company pages
 * Following DRY principles with shared interfaces
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { 
  LinkedInCompanyData, 
  LinkedInLocation, 
  LinkedInPost,
  EnrichmentResult 
} from '../types/external-intelligence'

export class LinkedInCompanyEnricher {
  private readonly searchTimeout = 10000
  private readonly scrapeTimeout = 15000

  /**
   * Main enrichment method for LinkedIn company data
   */
  async enrich(
    companyName: string, 
    domain: string,
    sessionId: string
  ): Promise<EnrichmentResult> {
    const startTime = Date.now()
    
    permanentLogger.info('Starting LinkedIn enrichment', { category: 'LINKEDIN_ENRICHER', companyName,
      domain,
      sessionId })

    try {
      // Step 1: Discover LinkedIn company page URL
      const linkedInUrl = await this.discoverLinkedInUrl(companyName, domain)
      
      if (!linkedInUrl) {
        permanentLogger.info('LINKEDIN_ENRICHER', 'No LinkedIn page found', { companyName})
        
        return {
          success: false,
          source: 'linkedin',
          error: 'LinkedIn company page not found',
          duration: Date.now() - startTime,
          timestamp: new Date()
        }
      }

      permanentLogger.info('LinkedIn URL discovered', { category: 'LINKEDIN_ENRICHER', companyName,
        linkedInUrl })

      // Step 2: Scrape LinkedIn company data
      const linkedInData = await this.scrapeLinkedInPage(linkedInUrl, sessionId)
      
      if (!linkedInData) {
        throw new Error('Failed to extract LinkedIn data')
      }

      // Step 3: Enrich with additional searches if needed
      const enrichedData = await this.enrichLinkedInData(linkedInData, companyName)

      permanentLogger.info('LinkedIn enrichment completed', { category: 'LINKEDIN_ENRICHER',
        companyName,
        employeeCount: enrichedData.employeeCount,
        followers: enrichedData.followers,
        specialties: enrichedData.specialties.length,
        recentPosts: enrichedData.recentPosts.length,
        duration: Date.now() - startTime
      })

      return {
        success: true,
        source: 'linkedin',
        data: enrichedData,
        duration: Date.now() - startTime,
        timestamp: new Date()
      }

    } catch (error) {
      permanentLogger.captureError('LINKEDIN_ENRICHER', error, {
        message: 'Enrichment failed',
        companyName,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })

      return {
        success: false,
        source: 'linkedin',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
        timestamp: new Date()
      }
    }
  }

  /**
   * Discover LinkedIn company page URL through web search
   */
  private async discoverLinkedInUrl(
    companyName: string,
    domain: string
  ): Promise<string | null> {
    permanentLogger.info('Searching for LinkedIn page', { category: 'LINKEDIN_ENRICHER', companyName,
      domain })

    try {
      // Try multiple search queries for better discovery
      const searchQueries = [
        `site:linkedin.com/company "${companyName}"`,
        `site:linkedin.com/company ${domain.replace(/\.(com|org|net|io|co|uk).*/, '')}`,
        `"${companyName}" LinkedIn company page`
      ]

      for (const query of searchQueries) {
        const response = await fetch('/api/web-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            query,
            maxResults: 5
          }),
          signal: AbortSignal.timeout(this.searchTimeout)
        })

        if (!response.ok) continue

        const results = await response.json()
        
        // Look for LinkedIn company URLs
        const linkedInUrl = this.extractLinkedInUrl(results.items || [])
        if (linkedInUrl) {
          permanentLogger.info('LinkedIn URL found', { category: 'LINKEDIN_ENRICHER', query,
            url: linkedInUrl })
          return linkedInUrl
        }
      }

      // Fallback: Check if domain homepage has LinkedIn link
      const homepageUrl = await this.checkHomepageForLinkedIn(domain)
      if (homepageUrl) {
        return homepageUrl
      }

      return null

    } catch (error) {
      permanentLogger.captureError('LINKEDIN_ENRICHER', error, {
        message: 'URL discovery failed',
        companyName,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
      return null
    }
  }

  /**
   * Extract LinkedIn company URL from search results
   */
  private extractLinkedInUrl(searchResults: any[]): string | null {
    const linkedInPattern = /https?:\/\/(www\.)?linkedin\.com\/company\/[a-zA-Z0-9-]+/i

    for (const result of searchResults) {
      const url = result.link || result.url
      if (url && linkedInPattern.test(url)) {
        // Clean up the URL
        const match = url.match(linkedInPattern)
        if (match) {
          return match[0].replace(/\/$/, '') // Remove trailing slash
        }
      }
    }

    return null
  }

  /**
   * Check company homepage for LinkedIn link
   */
  private async checkHomepageForLinkedIn(domain: string): Promise<string | null> {
    permanentLogger.info('LINKEDIN_ENRICHER', 'Checking homepage for LinkedIn link', { domain})

    try {
      const response = await fetch('/api/company-intelligence/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `https://${domain}`,
          phase: 1 // Quick Cheerio scrape
        }),
        signal: AbortSignal.timeout(this.searchTimeout)
      })

      if (!response.ok) return null

      const data = await response.json()
      const html = data.html || ''

      // Look for LinkedIn links in the HTML
      const linkedInRegex = /href=["']?(https?:\/\/(www\.)?linkedin\.com\/company\/[a-zA-Z0-9-]+)/gi
      const match = linkedInRegex.exec(html)

      if (match) {
        permanentLogger.info('Found LinkedIn link on homepage', { category: 'LINKEDIN_ENRICHER', domain,
          url: match[1] })
        return match[1]
      }

      return null

    } catch (error) {
      permanentLogger.captureError('LINKEDIN_ENRICHER', error, {
        message: 'Homepage check failed',
        domain,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
      return null
    }
  }

  /**
   * Scrape LinkedIn company page data
   */
  private async scrapeLinkedInPage(
    linkedInUrl: string,
    sessionId: string
  ): Promise<LinkedInCompanyData | null> {
    permanentLogger.info('LINKEDIN_ENRICHER', 'Scraping LinkedIn page', { url: linkedInUrl})

    try {
      // Use Playwright for LinkedIn (requires JavaScript rendering)
      const response = await fetch('/api/company-intelligence/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: linkedInUrl,
          phase: 3, // Playwright scrape for dynamic content
          waitForSelector: '[data-test-id="about-us__description"]',
          extractMetadata: true
        }),
        signal: AbortSignal.timeout(this.scrapeTimeout)
      })

      if (!response.ok) {
        throw new Error(`Scraping failed: ${response.status}`)
      }

      const scrapedData = await response.json()
      
      // Extract LinkedIn-specific data
      const linkedInData = this.parseLinkedInData(scrapedData, linkedInUrl, sessionId)
      
      return linkedInData

    } catch (error) {
      permanentLogger.captureError('LINKEDIN_ENRICHER', error, {
        message: 'Scraping failed',
        url: linkedInUrl,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
      return null
    }
  }

  /**
   * Parse scraped data into LinkedIn structure
   */
  private parseLinkedInData(
    scrapedData: any,
    linkedInUrl: string,
    sessionId: string
  ): LinkedInCompanyData {
    const $ = scrapedData.$ || null // Cheerio instance if available
    const metadata = scrapedData.metadata || {}
    const html = scrapedData.html || ''

    permanentLogger.info('Parsing LinkedIn data', {
      category: 'LINKEDIN_ENRICHER',
      hasCheerio: !!$,
      metadataKeys: Object.keys(metadata)
    })

    // Extract company ID from URL
    const companyId = linkedInUrl.match(/\/company\/([^\/]+)/)?.[1] || ''

    // Initialize data structure
    const linkedInData: LinkedInCompanyData = {
      sessionId,
      sourceType: 'linkedin',
      fetchedAt: new Date(),
      confidence: 0.8,
      companyUrl: linkedInUrl,
      companyId,
      name: '',
      description: '',
      industry: '',
      companySize: '',
      headquarters: { country: '' },
      specialties: [],
      followers: 0,
      recentPosts: [],
      locations: []
    }

    // Extract using Cheerio if available
    if ($) {
      // Company name
      linkedInData.name = $('h1').first().text().trim() ||
                         $('[data-test-id="org-name"]').text().trim() ||
                         metadata.title?.replace(' | LinkedIn', '').trim() || ''

      // Tagline
      linkedInData.tagline = $('[data-test-id="tagline"]').text().trim() ||
                            $('.org-top-card-summary__tagline').text().trim()

      // Description
      linkedInData.description = $('[data-test-id="about-us__description"]').text().trim() ||
                                $('.org-about-us-organization-description').text().trim() ||
                                metadata.description || ''

      // Industry
      linkedInData.industry = $('[data-test-id="about-us__industry"]').text().trim() ||
                             $('.org-top-card-summary__industry').text().trim() || ''

      // Company size
      linkedInData.companySize = $('[data-test-id="about-us__size"]').text().trim() ||
                                $('.org-about-company-module__company-size').text().trim() || ''

      // Extract employee count from size string
      const sizeMatch = linkedInData.companySize.match(/[\d,]+/g)
      if (sizeMatch) {
        const numbers = sizeMatch.map(n => parseInt(n.replace(/,/g, '')))
        linkedInData.employeeCount = Math.max(...numbers)
      }

      // Headquarters
      const hqText = $('[data-test-id="about-us__headquarters"]').text().trim() ||
                    $('.org-top-card-summary__headquarters').text().trim()
      
      if (hqText) {
        const hqParts = hqText.split(',').map(p => p.trim())
        linkedInData.headquarters = {
          city: hqParts[0],
          state: hqParts.length > 2 ? hqParts[1] : undefined,
          country: hqParts[hqParts.length - 1]
        }
      }

      // Founded year
      const foundedText = $('[data-test-id="about-us__founded"]').text().trim()
      if (foundedText) {
        const yearMatch = foundedText.match(/\d{4}/)
        if (yearMatch) {
          linkedInData.founded = parseInt(yearMatch[0])
        }
      }

      // Specialties
      const specialtiesText = $('[data-test-id="about-us__specialties"]').text().trim() ||
                             $('.org-page-details__definition-text').text().trim()
      
      if (specialtiesText) {
        linkedInData.specialties = specialtiesText
          .split(/[,;]/)
          .map(s => s.trim())
          .filter(s => s.length > 0)
      }

      // Website
      linkedInData.websiteUrl = $('[data-test-id="about-us__website"]').attr('href') ||
                               $('.org-top-card-primary-actions__action--website').attr('href')

      // Logo
      linkedInData.logo = $('.org-top-card-primary-content__logo').attr('src') ||
                         $('img[class*="org-logo"]').first().attr('src')

      // Followers
      const followersText = $('.org-top-card-secondary-content__followers-count').text().trim() ||
                           $('[data-test-id="followers-count"]').text().trim()
      
      if (followersText) {
        const followersMatch = followersText.match(/[\d,]+/)
        if (followersMatch) {
          linkedInData.followers = parseInt(followersMatch[0].replace(/,/g, ''))
        }
      }

      // Company type
      linkedInData.companyType = $('[data-test-id="about-us__company-type"]').text().trim() ||
                                $('.org-page-details__definition-text').eq(1).text().trim()

      // Verified status
      linkedInData.verified = $('.org-top-card__verified-badge').length > 0 ||
                             $('[data-test-id="verified-badge"]').length > 0

      permanentLogger.info('Extracted LinkedIn details', { category: 'LINKEDIN_ENRICHER', name: linkedInData.name,
        industry: linkedInData.industry,
        employeeCount: linkedInData.employeeCount,
        followers: linkedInData.followers,
        specialties: linkedInData.specialties.length })
    }

    // Fallback extraction using regex if Cheerio fails
    if (!linkedInData.name) {
      linkedInData.name = this.extractWithRegex(html, /<h1[^>]*>([^<]+)<\/h1>/) ||
                         metadata.title?.replace(' | LinkedIn', '').trim() || ''
    }

    if (!linkedInData.description) {
      linkedInData.description = metadata.description || 
                                this.extractWithRegex(html, /description["']?\s*:\s*["']([^"']+)/) || ''
    }

    // Set confidence based on data completeness
    let filledFields = 0
    const totalFields = 10
    
    if (linkedInData.name) filledFields++
    if (linkedInData.description) filledFields++
    if (linkedInData.industry) filledFields++
    if (linkedInData.companySize) filledFields++
    if (linkedInData.headquarters.country) filledFields++
    if (linkedInData.specialties.length > 0) filledFields++
    if (linkedInData.followers > 0) filledFields++
    if (linkedInData.websiteUrl) filledFields++
    if (linkedInData.logo) filledFields++
    if (linkedInData.employeeCount) filledFields++

    linkedInData.confidence = filledFields / totalFields

    return linkedInData
  }

  /**
   * Extract data using regex pattern
   */
  private extractWithRegex(html: string, pattern: RegExp): string | null {
    const match = pattern.exec(html)
    return match ? match[1].trim() : null
  }

  /**
   * Enrich LinkedIn data with additional information
   */
  private async enrichLinkedInData(
    linkedInData: LinkedInCompanyData,
    companyName: string
  ): Promise<LinkedInCompanyData> {
    permanentLogger.info('Enriching LinkedIn data', { category: 'LINKEDIN_ENRICHER',
      companyName,
      currentDataPoints: Object.keys(linkedInData).length
    })

    try {
      // Try to fetch recent posts (would require LinkedIn API or advanced scraping)
      const recentPosts = await this.fetchRecentPosts(linkedInData.companyUrl)
      if (recentPosts.length > 0) {
        linkedInData.recentPosts = recentPosts
      }

      // Try to get job openings count
      const jobOpenings = await this.fetchJobOpenings(linkedInData.companyId || companyName)
      if (jobOpenings !== null) {
        linkedInData.jobOpenings = jobOpenings
      }

      // Calculate employee growth if we have historical data
      // This would require storing historical data or using LinkedIn API
      
      permanentLogger.info('Enrichment completed', { category: 'LINKEDIN_ENRICHER', companyName,
        recentPosts: linkedInData.recentPosts.length,
        jobOpenings: linkedInData.jobOpenings })

    } catch (error) {
      permanentLogger.captureError('LINKEDIN_ENRICHER', error, {
        message: 'Enrichment enhancement failed',
        companyName,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    return linkedInData
  }

  /**
   * Fetch recent LinkedIn posts (simplified - would need API access for full data)
   */
  private async fetchRecentPosts(companyUrl: string): Promise<LinkedInPost[]> {
    permanentLogger.info('LINKEDIN_ENRICHER', 'Fetching recent posts', { companyUrl})

    // This is a simplified version - full implementation would require
    // LinkedIn API access or more sophisticated scraping
    const posts: LinkedInPost[] = []

    try {
      const postsUrl = `${companyUrl}/posts`
      
      // Attempt to scrape posts page
      const response = await fetch('/api/company-intelligence/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: postsUrl,
          phase: 1, // Quick scrape
          timeout: 5000
        }),
        signal: AbortSignal.timeout(5000)
      })

      if (response.ok) {
        const data = await response.json()
        // Parse posts from HTML (simplified)
        // Full implementation would extract actual post data
        
        permanentLogger.info('LINKEDIN_ENRICHER', 'Posts page scraped', { success: true})
      }

    } catch (error) {
      permanentLogger.info('LINKEDIN_ENRICHER', 'Posts fetch skipped', { reason: 'Not accessible without authentication'})
    }

    return posts
  }

  /**
   * Fetch job openings count
   */
  private async fetchJobOpenings(companyIdentifier: string): Promise<number | null> {
    permanentLogger.info('LINKEDIN_ENRICHER', 'Checking job openings', { companyIdentifier})

    try {
      // Search for job listings
      const response = await fetch('/api/web-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `site:linkedin.com/jobs "${companyIdentifier}" careers hiring`,
          maxResults: 1
        }),
        signal: AbortSignal.timeout(5000)
      })

      if (response.ok) {
        const results = await response.json()
        
        // Try to extract job count from search results
        if (results.items?.[0]?.snippet) {
          const countMatch = results.items[0].snippet.match(/(\d+)\s*(job|position|opening)/i)
          if (countMatch) {
            const count = parseInt(countMatch[1])
            permanentLogger.info('LINKEDIN_ENRICHER', 'Job openings found', { count})
            return count
          }
        }
      }

    } catch (error) {
      permanentLogger.info('LINKEDIN_ENRICHER', 'Job openings check failed', { error: error instanceof Error ? error.message : 'Unknown error'})
    }

    return null
  }

  /**
   * Validate LinkedIn data quality
   */
  validateData(data: LinkedInCompanyData): boolean {
    const requiredFields = ['name', 'companyUrl', 'description']
    
    for (const field of requiredFields) {
      if (!data[field as keyof LinkedInCompanyData]) {
        permanentLogger.info('LINKEDIN_ENRICHER', 'Validation failed', { missingField: field})
        return false
      }
    }

    // Check confidence threshold
    if (data.confidence < 0.3) {
      permanentLogger.info('LINKEDIN_ENRICHER', 'Low confidence data', { confidence: data.confidence})
      return false
    }

    return true
  }
}

// Export singleton instance
export const linkedInCompanyEnricher = new LinkedInCompanyEnricher()