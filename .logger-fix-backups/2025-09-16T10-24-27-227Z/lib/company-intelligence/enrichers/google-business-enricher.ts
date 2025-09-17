/**
 * Google Business Enricher
 * Discovers and extracts Google Business/Maps listing data
 * Following DRY principles with shared interfaces
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { 
  GoogleBusinessData,
  BusinessHours,
  GoogleReview,
  BusinessPhoto,
  PopularTimes,
  EnrichmentResult 
} from '../types/external-intelligence'

export class GoogleBusinessEnricher {
  private readonly searchTimeout = 10000
  private readonly scrapeTimeout = 15000

  /**
   * Main enrichment method for Google Business data
   */
  async enrich(
    companyName: string,
    domain: string,
    sessionId: string
  ): Promise<EnrichmentResult> {
    const startTime = Date.now()
    
    permanentLogger.info('Starting Google Business enrichment', { category: 'GOOGLE_BUSINESS_ENRICHER', companyName,
      domain,
      sessionId })

    try {
      // Step 1: Discover Google Business listing
      const businessData = await this.discoverGoogleBusiness(companyName, domain)
      
      if (!businessData) {
        permanentLogger.info('GOOGLE_BUSINESS_ENRICHER', 'No Google Business listing found', { companyName})
        
        return {
          success: false,
          source: 'google_business',
          error: 'Google Business listing not found',
          duration: Date.now() - startTime,
          timestamp: new Date()
        }
      }

      // Step 2: Enrich with additional data
      const enrichedData = await this.enrichBusinessData(businessData, sessionId)

      // Step 3: Fetch reviews if available
      if (enrichedData.placeId) {
        const reviews = await this.fetchReviews(enrichedData.placeId)
        if (reviews.length > 0) {
          enrichedData.reviews = reviews
          enrichedData.reviewCount = reviews.length
        }
      }

      permanentLogger.info('Google Business enrichment completed', { category: 'GOOGLE_BUSINESS_ENRICHER',
        companyName,
        rating: enrichedData.rating,
        reviewCount: enrichedData.reviewCount,
        verified: enrichedData.verified,
        duration: Date.now() - startTime
      })

      return {
        success: true,
        source: 'google_business',
        data: enrichedData,
        duration: Date.now() - startTime,
        timestamp: new Date()
      }

    } catch (error) {
      permanentLogger.captureError('GOOGLE_BUSINESS_ENRICHER', error, {
        message: 'Enrichment failed',
        companyName,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })

      return {
        success: false,
        source: 'google_business',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
        timestamp: new Date()
      }
    }
  }

  /**
   * Discover Google Business listing through search
   */
  private async discoverGoogleBusiness(
    companyName: string,
    domain: string
  ): Promise<Partial<GoogleBusinessData> | null> {
    permanentLogger.info('Searching for Google Business listing', { category: 'GOOGLE_BUSINESS_ENRICHER', companyName,
      domain })

    try {
      // Try multiple search strategies
      const searchQueries = [
        `"${companyName}" site:google.com/maps`,
        `"${companyName}" Google Business reviews hours`,
        `"${companyName}" "claimed this business" Google`,
        `${domain} Google Maps business listing`
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
        
        // Extract Google Business data from search results
        const businessData = this.extractBusinessDataFromSearch(results.items || [], companyName)
        
        if (businessData) {
          permanentLogger.info('Google Business listing found', { category: 'GOOGLE_BUSINESS_ENRICHER', query,
            businessName: businessData.businessName })
          return businessData
        }
      }

      // Fallback: Try to extract from company website
      const websiteData = await this.extractFromWebsite(domain)
      if (websiteData) {
        return websiteData
      }

      return null

    } catch (error) {
      permanentLogger.captureError('GOOGLE_BUSINESS_ENRICHER', error, {
        message: 'Discovery failed',
        companyName,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
      return null
    }
  }

  /**
   * Extract business data from search results
   */
  private extractBusinessDataFromSearch(
    searchResults: any[],
    companyName: string
  ): Partial<GoogleBusinessData> | null {
    for (const result of searchResults) {
      const url = result.link || result.url || ''
      const snippet = result.snippet || ''
      const title = result.title || ''

      // Check if this is a Google Maps/Business result
      if (url.includes('google.com/maps') || 
          url.includes('maps.google.com') ||
          snippet.includes('reviews') && snippet.includes('Google')) {
        
        // Extract Place ID from URL if available
        const placeIdMatch = url.match(/place\/([^\/]+)/) || 
                            url.match(/cid=(\d+)/)
        
        // Extract rating from snippet
        const ratingMatch = snippet.match(/(\d(?:\.\d)?)\s*(?:star|★|☆)/i) ||
                          snippet.match(/Rating:\s*(\d(?:\.\d)?)/i)
        
        // Extract review count
        const reviewMatch = snippet.match(/\((\d+(?:,\d+)?)\s*reviews?\)/i) ||
                          snippet.match(/(\d+(?:,\d+)?)\s*Google reviews?/i)
        
        // Extract address
        const addressMatch = snippet.match(/(?:Address|Located at):\s*([^•\|]+)/i)
        
        // Extract phone
        const phoneMatch = snippet.match(/(?:Phone|Call):\s*([\d\s\-\(\)+]+)/i)

        const businessData: Partial<GoogleBusinessData> = {
          businessName: title.replace(/\s*-\s*Google.*$/, '').trim() || companyName,
          placeId: placeIdMatch ? placeIdMatch[1] : undefined,
          verified: snippet.includes('Claimed') || snippet.includes('Verified'),
          category: this.extractCategory(snippet),
          address: addressMatch ? addressMatch[1].trim() : '',
          phone: phoneMatch ? phoneMatch[1].trim() : undefined,
          rating: ratingMatch ? parseFloat(ratingMatch[1]) : 0,
          reviewCount: reviewMatch ? parseInt(reviewMatch[1].replace(/,/g, '')) : 0,
          hours: [],
          photos: [],
          reviews: [],
          attributes: []
        }

        permanentLogger.info('Extracted business data from search', { category: 'GOOGLE_BUSINESS_ENRICHER', businessName: businessData.businessName,
          rating: businessData.rating,
          reviewCount: businessData.reviewCount })

        return businessData
      }
    }

    return null
  }

  /**
   * Extract category from snippet text
   */
  private extractCategory(text: string): string {
    // Common business categories
    const categories = [
      'Restaurant', 'Cafe', 'Bar', 'Hotel', 'Store', 'Shop',
      'Service', 'Agency', 'Company', 'Office', 'Clinic',
      'Salon', 'Gym', 'School', 'Bank', 'Pharmacy'
    ]

    for (const category of categories) {
      if (text.toLowerCase().includes(category.toLowerCase())) {
        return category
      }
    }

    return 'Business'
  }

  /**
   * Extract Google Business info from company website
   */
  private async extractFromWebsite(domain: string): Promise<Partial<GoogleBusinessData> | null> {
    permanentLogger.info('GOOGLE_BUSINESS_ENRICHER', 'Extracting from website', { domain})

    try {
      const response = await fetch('/api/company-intelligence/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `https://${domain}/contact`,
          phase: 1,
          extractMetadata: true
        }),
        signal: AbortSignal.timeout(this.scrapeTimeout)
      })

      if (!response.ok) {
        // Try homepage if contact page doesn't exist
        const homepageResponse = await fetch('/api/company-intelligence/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: `https://${domain}`,
            phase: 1,
            extractMetadata: true
          }),
          signal: AbortSignal.timeout(this.scrapeTimeout)
        })

        if (!homepageResponse.ok) return null
        
        const data = await homepageResponse.json()
        return this.parseWebsiteData(data, domain)
      }

      const data = await response.json()
      return this.parseWebsiteData(data, domain)

    } catch (error) {
      permanentLogger.captureError('GOOGLE_BUSINESS_ENRICHER', error, {
        message: 'Website extraction failed',
        domain,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
      return null
    }
  }

  /**
   * Parse website data for business information
   */
  private parseWebsiteData(scrapedData: any, domain: string): Partial<GoogleBusinessData> | null {
    const $ = scrapedData.$ || null
    const metadata = scrapedData.metadata || {}
    const html = scrapedData.html || ''

    const businessData: Partial<GoogleBusinessData> = {
      businessName: metadata.title?.replace(/\s*[\|\-].*$/, '').trim() || '',
      website: `https://${domain}`,
      verified: false,
      category: 'Business',
      hours: [],
      photos: [],
      reviews: [],
      attributes: []
    }

    if ($) {
      // Extract address
      const addressSelectors = [
        'address',
        '[itemprop="address"]',
        '.address',
        '[class*="address"]',
        '[data-address]'
      ]

      for (const selector of addressSelectors) {
        const address = $(selector).first().text().trim()
        if (address) {
          businessData.address = address
          break
        }
      }

      // Extract phone
      const phoneSelectors = [
        '[href^="tel:"]',
        '[itemprop="telephone"]',
        '.phone',
        '[class*="phone"]'
      ]

      for (const selector of phoneSelectors) {
        const phoneElement = $(selector).first()
        const phone = phoneElement.attr('href')?.replace('tel:', '') || 
                     phoneElement.text().trim()
        if (phone) {
          businessData.phone = phone
          break
        }
      }

      // Extract business hours
      const hoursContainer = $('.hours, .business-hours, [class*="hours"]').first()
      if (hoursContainer.length) {
        businessData.hours = this.parseBusinessHours(hoursContainer.html() || '')
      }

      // Extract location coordinates from structured data
      const geoScript = $('script[type="application/ld+json"]').text()
      if (geoScript) {
        try {
          const structured = JSON.parse(geoScript)
          if (structured.geo) {
            businessData.location = {
              lat: structured.geo.latitude,
              lng: structured.geo.longitude
            }
          }
          if (structured.address) {
            businessData.address = this.formatStructuredAddress(structured.address)
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
      }
    }

    // Regex fallbacks for phone and address
    if (!businessData.phone) {
      const phoneRegex = /(?:Phone|Tel|Call)[\s:]*([+\d\s\-\(\)]+)/i
      const phoneMatch = phoneRegex.exec(html)
      if (phoneMatch) {
        businessData.phone = phoneMatch[1].trim()
      }
    }

    if (!businessData.address) {
      const addressRegex = /(?:Address|Location)[\s:]*([^<\n]+)/i
      const addressMatch = addressRegex.exec(html)
      if (addressMatch) {
        businessData.address = addressMatch[1].trim()
      }
    }

    permanentLogger.info('Extracted from website', { category: 'GOOGLE_BUSINESS_ENRICHER', domain,
      hasAddress: !!businessData.address,
      hasPhone: !!businessData.phone,
      hasHours: businessData.hours.length > 0 })

    return businessData.businessName ? businessData : null
  }

  /**
   * Format structured address data
   */
  private formatStructuredAddress(address: any): string {
    if (typeof address === 'string') return address

    const parts = []
    if (address.streetAddress) parts.push(address.streetAddress)
    if (address.addressLocality) parts.push(address.addressLocality)
    if (address.addressRegion) parts.push(address.addressRegion)
    if (address.postalCode) parts.push(address.postalCode)
    if (address.addressCountry) parts.push(address.addressCountry)

    return parts.join(', ')
  }

  /**
   * Parse business hours from HTML
   */
  private parseBusinessHours(html: string): BusinessHours[] {
    const hours: BusinessHours[] = []
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    
    for (const day of days) {
      const dayRegex = new RegExp(`${day}[\\s:]*([\\d:apmAPM\\s-]+|Closed)`, 'i')
      const match = dayRegex.exec(html)
      
      if (match) {
        const timeStr = match[1].trim()
        
        if (timeStr.toLowerCase() === 'closed') {
          hours.push({
            day,
            open: '',
            close: '',
            isOpen: false
          })
        } else {
          const times = timeStr.match(/(\d{1,2}(?::\d{2})?\s*[apmAPM]+)/g)
          if (times && times.length >= 2) {
            hours.push({
              day,
              open: times[0],
              close: times[1],
              isOpen: true
            })
          }
        }
      }
    }

    return hours
  }

  /**
   * Enrich business data with additional information
   */
  private async enrichBusinessData(
    businessData: Partial<GoogleBusinessData>,
    sessionId: string
  ): Promise<GoogleBusinessData> {
    permanentLogger.info('GOOGLE_BUSINESS_ENRICHER', 'Enriching business data', { businessName: businessData.businessName})

    // Create full data structure
    const enrichedData: GoogleBusinessData = {
      sessionId,
      sourceType: 'google_business',
      fetchedAt: new Date(),
      confidence: 0.5,
      businessName: businessData.businessName || '',
      placeId: businessData.placeId,
      verified: businessData.verified || false,
      category: businessData.category || 'Business',
      subcategories: [],
      address: businessData.address || '',
      phone: businessData.phone,
      website: businessData.website,
      hours: businessData.hours || [],
      rating: businessData.rating || 0,
      reviewCount: businessData.reviewCount || 0,
      photos: [],
      reviews: [],
      attributes: [],
      location: businessData.location || { lat: 0, lng: 0 }
    }

    // Try to get more data if we have a place ID
    if (enrichedData.placeId) {
      const additionalData = await this.fetchPlaceDetails(enrichedData.placeId)
      if (additionalData) {
        Object.assign(enrichedData, additionalData)
      }
    }

    // Extract attributes from available data
    enrichedData.attributes = this.extractAttributes(enrichedData)

    // Calculate confidence score
    let confidence = 0.3 // Base confidence
    if (enrichedData.placeId) confidence += 0.2
    if (enrichedData.verified) confidence += 0.1
    if (enrichedData.rating > 0) confidence += 0.1
    if (enrichedData.reviewCount > 0) confidence += 0.1
    if (enrichedData.hours.length > 0) confidence += 0.1
    if (enrichedData.address) confidence += 0.1

    enrichedData.confidence = Math.min(confidence, 1)

    permanentLogger.info('Enrichment completed', { category: 'GOOGLE_BUSINESS_ENRICHER', businessName: enrichedData.businessName,
      confidence: enrichedData.confidence,
      attributes: enrichedData.attributes.length })

    return enrichedData
  }

  /**
   * Fetch additional place details (would require Google Places API)
   */
  private async fetchPlaceDetails(placeId: string): Promise<Partial<GoogleBusinessData> | null> {
    permanentLogger.info('GOOGLE_BUSINESS_ENRICHER', 'Fetching place details', { placeId})

    // This would typically use Google Places API
    // For now, we'll try to get additional data through search
    try {
      const response = await fetch('/api/web-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `Google Maps place ${placeId}`,
          maxResults: 3
        }),
        signal: AbortSignal.timeout(this.searchTimeout)
      })

      if (response.ok) {
        const results = await response.json()
        // Extract any additional data from search results
        return this.extractAdditionalPlaceData(results.items || [])
      }

    } catch (error) {
      permanentLogger.captureError('GOOGLE_BUSINESS_ENRICHER', error, {
        message: 'Place details fetch failed',
        placeId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    return null
  }

  /**
   * Extract additional place data from search results
   */
  private extractAdditionalPlaceData(searchResults: any[]): Partial<GoogleBusinessData> | null {
    const additionalData: Partial<GoogleBusinessData> = {}

    for (const result of searchResults) {
      const snippet = result.snippet || ''
      
      // Extract price level
      const priceMatch = snippet.match(/(\$+)(?:\s|,|\.|$)/)
      if (priceMatch && !additionalData.priceLevel) {
        additionalData.priceLevel = priceMatch[1] as any
      }

      // Extract current status
      if (snippet.includes('Open now')) {
        additionalData.currentStatus = 'open'
      } else if (snippet.includes('Closed now')) {
        additionalData.currentStatus = 'closed'
      } else if (snippet.includes('Temporarily closed')) {
        additionalData.currentStatus = 'temporarily_closed'
      }
    }

    return Object.keys(additionalData).length > 0 ? additionalData : null
  }

  /**
   * Fetch reviews for a business
   */
  private async fetchReviews(placeId: string): Promise<GoogleReview[]> {
    permanentLogger.info('GOOGLE_BUSINESS_ENRICHER', 'Fetching reviews', { placeId})

    const reviews: GoogleReview[] = []

    try {
      // Search for reviews
      const response = await fetch('/api/web-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `Google reviews "${placeId}"`,
          maxResults: 5
        }),
        signal: AbortSignal.timeout(this.searchTimeout)
      })

      if (response.ok) {
        const results = await response.json()
        
        // Extract review data from search results
        for (const result of (results.items || [])) {
          const snippet = result.snippet || ''
          
          // Look for review patterns
          const ratingMatch = snippet.match(/(\d)\s*(?:star|★)/i)
          const dateMatch = snippet.match(/(\d{1,2}\s+(?:days?|weeks?|months?)\s+ago)/i)
          
          if (ratingMatch) {
            reviews.push({
              author: 'Google User',
              rating: parseInt(ratingMatch[1]),
              text: snippet.replace(/\d\s*(?:star|★).*$/i, '').trim(),
              date: this.parseRelativeDate(dateMatch ? dateMatch[1] : 'recently')
            })
          }
        }
      }

    } catch (error) {
      permanentLogger.captureError('GOOGLE_BUSINESS_ENRICHER', error, {
        message: 'Reviews fetch failed',
        placeId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    permanentLogger.info('Reviews fetched', { category: 'GOOGLE_BUSINESS_ENRICHER', placeId,
      count: reviews.length })

    return reviews
  }

  /**
   * Parse relative date string to Date object
   */
  private parseRelativeDate(relativeDate: string): Date {
    const date = new Date()
    const match = relativeDate.match(/(\d+)\s+(day|week|month)s?/i)
    
    if (match) {
      const amount = parseInt(match[1])
      const unit = match[2].toLowerCase()
      
      switch (unit) {
        case 'day':
          date.setDate(date.getDate() - amount)
          break
        case 'week':
          date.setDate(date.getDate() - (amount * 7))
          break
        case 'month':
          date.setMonth(date.getMonth() - amount)
          break
      }
    }
    
    return date
  }

  /**
   * Extract business attributes
   */
  private extractAttributes(data: GoogleBusinessData): string[] {
    const attributes: string[] = []

    // Basic attributes based on available data
    if (data.verified) attributes.push('Verified Business')
    if (data.website) attributes.push('Website Available')
    if (data.phone) attributes.push('Phone Support')
    if (data.hours.length > 0) attributes.push('Hours Posted')
    if (data.rating >= 4) attributes.push('Highly Rated')
    if (data.reviewCount > 100) attributes.push('Popular')
    if (data.photos.length > 0) attributes.push('Photos Available')
    
    // Price level attribute
    if (data.priceLevel) {
      const priceLabels: Record<string, string> = {
        '$': 'Budget Friendly',
        '$$': 'Moderate Pricing',
        '$$$': 'Upscale',
        '$$$$': 'Premium'
      }
      const label = priceLabels[data.priceLevel]
      if (label) attributes.push(label)
    }

    return attributes
  }

  /**
   * Validate Google Business data
   */
  validateData(data: GoogleBusinessData): boolean {
    if (!data.businessName) {
      permanentLogger.info('GOOGLE_BUSINESS_ENRICHER', 'Validation failed - no business name')
      return false
    }

    // At least one of these should be present
    const hasMinimumData = data.address || 
                          data.phone || 
                          data.website || 
                          data.placeId ||
                          data.rating > 0

    if (!hasMinimumData) {
      permanentLogger.info('GOOGLE_BUSINESS_ENRICHER', 'Validation failed - insufficient data', { businessName: data.businessName})
      return false
    }

    return true
  }
}

// Export singleton instance
export const googleBusinessEnricher = new GoogleBusinessEnricher()