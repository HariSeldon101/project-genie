/**
 * Smart Data Extractor
 * Intelligently extracts company information from scraped content
 */

import * as cheerio from 'cheerio'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { detectPlatform, smartExtractWithPatterns } from './pattern-library'

export interface ExtractedCompanyData {
  basics: {
    companyName?: string
    tagline?: string
    description?: string
    mission?: string
    vision?: string
    values?: string[]
    foundedYear?: string
    headquarters?: string
    website?: string
    email?: string
    phone?: string
    socialMedia?: Record<string, string>
  }
  business: {
    industry?: string
    products?: Array<{
      name: string
      description?: string
      features?: string[]
    }>
    services?: Array<{
      name: string
      description?: string
    }>
    targetMarket?: string
    businessModel?: string
  }
  team: {
    size?: string
    keyPeople?: Array<{
      name: string
      role: string
      bio?: string
    }>
  }
  metrics?: {
    revenue?: string
    funding?: string
    customers?: string
    growth?: string
  }
}

export class SmartExtractor {
  /**
   * Extract company data from HTML using intelligent pattern matching
   */
  extractFromHtml(html: string, url: string): ExtractedCompanyData {
    const $ = cheerio.load(html)
    
    // First try platform-specific patterns
    const platform = detectPlatform($)
    let patternData: Record<string, any> = {}
    
    if (platform) {
      permanentLogger.info('SMART_EXTRACTOR', `Detected ${platform} platform, using optimized patterns`)
      patternData = smartExtractWithPatterns($)
    }
    
    // Extract using our standard methods
    const standardData = {
      basics: this.extractBasics($, url),
      business: this.extractBusiness($),
      team: this.extractTeam($),
      metrics: this.extractMetrics($)
    }
    
    // Merge pattern data with standard extraction (pattern data takes precedence)
    return this.mergeExtractedData(standardData, patternData)
  }
  
  /**
   * Merge extracted data from different sources
   */
  private mergeExtractedData(
    standard: ExtractedCompanyData,
    pattern: Record<string, any>
  ): ExtractedCompanyData {
    const merged = { ...standard }
    
    // Merge pattern data into appropriate sections
    if (pattern.companyName && !merged.basics.companyName) {
      merged.basics.companyName = pattern.companyName
    }
    if (pattern.tagline && !merged.basics.tagline) {
      merged.basics.tagline = pattern.tagline
    }
    if (pattern.description && !merged.basics.description) {
      merged.basics.description = pattern.description
    }
    if (pattern.products && (!merged.business.products || merged.business.products.length === 0)) {
      merged.business.products = Array.isArray(pattern.products) 
        ? pattern.products.map((p: string) => ({ name: p }))
        : [{ name: pattern.products }]
    }
    if (pattern.services && (!merged.business.services || merged.business.services.length === 0)) {
      merged.business.services = Array.isArray(pattern.services)
        ? pattern.services.map((s: string) => ({ name: s }))
        : [{ name: pattern.services }]
    }
    if (pattern.team && (!merged.team.keyPeople || merged.team.keyPeople.length === 0)) {
      merged.team.keyPeople = Array.isArray(pattern.team)
        ? pattern.team.map((t: string) => ({ name: t, role: 'Team Member' }))
        : [{ name: pattern.team, role: 'Team Member' }]
    }
    
    return merged
  }

  /**
   * Extract from plain text content
   */
  extractFromText(text: string, metadata?: any): Partial<ExtractedCompanyData> {
    const data: Partial<ExtractedCompanyData> = {}
    
    // Extract email addresses
    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g
    const emails = text.match(emailRegex)
    if (emails && emails.length > 0) {
      data.basics = { ...data.basics, email: emails[0] }
    }
    
    // Extract phone numbers
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g
    const phones = text.match(phoneRegex)
    if (phones && phones.length > 0) {
      data.basics = { ...data.basics, phone: phones[0] }
    }
    
    // Extract founded year
    const foundedRegex = /(?:founded|established|since|started)(?:\s+in)?\s+(\d{4})/i
    const foundedMatch = text.match(foundedRegex)
    if (foundedMatch) {
      data.basics = { ...data.basics, foundedYear: foundedMatch[1] }
    }
    
    // Extract company size
    const sizeRegex = /(\d+[\d,]*)\s*(?:employees|team members|people)/i
    const sizeMatch = text.match(sizeRegex)
    if (sizeMatch) {
      data.team = { size: sizeMatch[1] }
    }
    
    // Extract funding information
    const fundingRegex = /\$(\d+[\d,]*\.?\d*)\s*([MBK])?(?:illion)?(?:\s+in\s+funding|\s+raised)?/i
    const fundingMatch = text.match(fundingRegex)
    if (fundingMatch) {
      data.metrics = { ...data.metrics, funding: fundingMatch[0] }
    }
    
    return data
  }

  private extractBasics($: cheerio.CheerioAPI, url: string): ExtractedCompanyData['basics'] {
    const basics: ExtractedCompanyData['basics'] = {}
    
    // Company name from various sources
    basics.companyName = 
      $('meta[property="og:site_name"]').attr('content') ||
      $('meta[name="application-name"]').attr('content') ||
      $('[itemtype*="Organization"] [itemprop="name"]').text() ||
      $('.logo-text, .brand-name, .company-name').first().text().trim() ||
      $('title').text().split(/[|\-–]/)[0].trim()
    
    // Extract hero section content - ENHANCED
    const heroSection = $('.hero, .hero-section, section.hero, .banner, .jumbotron, header section, [class*="hero"], [id*="hero"]').first()
    const heroH1 = heroSection.find('h1').first().text().trim() || $('h1').first().text().trim()
    const heroH2 = heroSection.find('h2').first().text().trim() || $('h2').first().text().trim()
    const heroP = heroSection.find('p').first().text().trim() || $('.hero p').first().text().trim()
    
    // Tagline/slogan - prioritize hero content
    basics.tagline = heroH1 ||
      $('.tagline, .slogan, .subtitle, .hero-subtitle, .hero-text h1').first().text().trim() ||
      $('meta[property="og:description"]').attr('content')?.substring(0, 150) ||
      heroH2
    
    // Description - combine hero content for better context
    const heroContent = [heroH1, heroH2, heroP].filter(Boolean).join('. ')
    basics.description = heroContent ||
      $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') ||
      $('.about-summary, .company-description, .hero-description').first().text().trim()
    
    // Mission statement
    const missionElement = $('*:contains("mission"):not(script)').filter((_, el) => {
      const text = $(el).text().toLowerCase()
      return text.includes('our mission') || text.includes('mission statement')
    }).first()
    if (missionElement.length) {
      basics.mission = missionElement.next('p, div').text().trim() || 
                      missionElement.parent().text().trim()
    }
    
    // Vision statement
    const visionElement = $('*:contains("vision"):not(script)').filter((_, el) => {
      const text = $(el).text().toLowerCase()
      return text.includes('our vision') || text.includes('vision statement')
    }).first()
    if (visionElement.length) {
      basics.vision = visionElement.next('p, div').text().trim() || 
                     visionElement.parent().text().trim()
    }
    
    // Values
    const valuesElement = $('*:contains("values"):not(script)').filter((_, el) => {
      const text = $(el).text().toLowerCase()
      return text.includes('our values') || text.includes('core values')
    }).first()
    if (valuesElement.length) {
      const valuesList = valuesElement.parent().find('li').map((_, el) => $(el).text().trim()).get()
      if (valuesList.length > 0) {
        basics.values = valuesList
      }
    }
    
    // Contact information
    basics.email = $('a[href^="mailto:"]').first().attr('href')?.replace('mailto:', '')
    basics.phone = $('a[href^="tel:"]').first().attr('href')?.replace('tel:', '')
    
    // Social media links
    const socialMedia: Record<string, string> = {}
    $('a[href*="linkedin.com"]').each((_, el) => {
      socialMedia.linkedin = $(el).attr('href') || ''
    })
    $('a[href*="twitter.com"], a[href*="x.com"]').each((_, el) => {
      socialMedia.twitter = $(el).attr('href') || ''
    })
    $('a[href*="facebook.com"]').each((_, el) => {
      socialMedia.facebook = $(el).attr('href') || ''
    })
    $('a[href*="github.com"]').each((_, el) => {
      socialMedia.github = $(el).attr('href') || ''
    })
    if (Object.keys(socialMedia).length > 0) {
      basics.socialMedia = socialMedia
    }
    
    basics.website = url
    
    return basics
  }

  private extractBusiness($: cheerio.CheerioAPI): ExtractedCompanyData['business'] {
    const business: ExtractedCompanyData['business'] = {}
    
    // Products
    const products: ExtractedCompanyData['business']['products'] = []
    $('.product-card, .product-item, .solution-card, .feature-card').each((_, el) => {
      const name = $(el).find('h2, h3, h4, .product-name, .title').first().text().trim()
      const description = $(el).find('p, .description, .summary').first().text().trim()
      if (name) {
        products.push({ name, description })
      }
    })
    
    // Alternative product extraction
    if (products.length === 0) {
      $('*:contains("Products"):not(script), *:contains("Solutions"):not(script)').each((_, el) => {
        $(el).parent().find('h3, h4').each((_, prodEl) => {
          const name = $(prodEl).text().trim()
          const description = $(prodEl).next('p').text().trim()
          if (name && !name.toLowerCase().includes('products')) {
            products.push({ name, description })
          }
        })
      })
    }
    
    if (products.length > 0) {
      business.products = products
    }
    
    // Enhanced Services extraction
    const services: ExtractedCompanyData['business']['services'] = []
    
    // Try multiple service selectors
    $('.service-card, .service-item, .service, .solution-item, [class*="service"]').each((_, el) => {
      const name = $(el).find('h2, h3, h4, .service-name, .title').first().text().trim()
      const description = $(el).find('p, .description, .service-desc').first().text().trim()
      if (name && name.length < 100) { // Avoid grabbing full paragraphs as names
        services.push({ name, description })
      }
    })
    
    // Alternative: Look for services sections
    if (services.length === 0) {
      $('section:contains("Services"), div:contains("What We Do"), section:contains("Solutions")').each((_, section) => {
        $(section).find('h3, h4, .service-title').each((_, el) => {
          const name = $(el).text().trim()
          const description = $(el).next('p').text().trim() || $(el).parent().find('p').first().text().trim()
          if (name && !name.toLowerCase().includes('service') && name.length < 100) {
            services.push({ name, description })
          }
        })
      })
    }
    
    // Look for list-based services
    if (services.length === 0) {
      $('ul li, .services-list li').each((_, el) => {
        const text = $(el).text().trim()
        if (text.length > 10 && text.length < 100 && !text.includes('©')) {
          // Check if it looks like a service
          const serviceKeywords = ['consulting', 'training', 'implementation', 'automation', 'development', 'support', 'solution', 'service', 'management']
          if (serviceKeywords.some(kw => text.toLowerCase().includes(kw))) {
            services.push({ 
              name: text.split(/[:\-–]/)[0].trim(),
              description: text.includes(':') ? text.split(':')[1]?.trim() : ''
            })
          }
        }
      })
    }
    
    if (services.length > 0) {
      business.services = services.slice(0, 20) // Limit to 20 services
    }
    
    // Enhanced industry detection from hero and key content areas
    const heroText = $('.hero, .hero-section, h1, h2, .banner').text().toLowerCase()
    const metaDescription = $('meta[name="description"]').attr('content')?.toLowerCase() || ''
    const aboutText = $('.about, .about-us, .what-we-do').text().toLowerCase()
    const servicesText = $('.services, .solutions, .products').text().toLowerCase()
    const combinedText = `${heroText} ${metaDescription} ${aboutText} ${servicesText}`
    
    // Industry keywords with better AI detection
    const industryKeywords = {
      'AI Solutions': ['ai made simple', 'ai solutions', 'ai consultancy', 'ai automation', 'ai training', 'ai outsourcing'],
      'Artificial Intelligence': ['artificial intelligence', 'machine learning', 'deep learning', 'neural', 'nlp', 'computer vision'],
      'Business AI': ['business ai', 'ai for business', 'enterprise ai', 'ai implementation'],
      'SaaS': ['software as a service', 'saas', 'cloud platform', 'subscription'],
      'FinTech': ['financial technology', 'fintech', 'payments', 'banking', 'cryptocurrency'],
      'HealthTech': ['healthcare', 'medical', 'health tech', 'telemedicine', 'biotech'],
      'E-commerce': ['ecommerce', 'online store', 'marketplace', 'retail'],
      'EdTech': ['education technology', 'edtech', 'learning platform', 'online courses'],
      'Marketing': ['marketing', 'advertising', 'digital marketing', 'growth'],
      'Cybersecurity': ['security', 'cybersecurity', 'data protection', 'encryption']
    }
    
    // Check hero/meta first for better accuracy
    for (const [industry, keywords] of Object.entries(industryKeywords)) {
      if (keywords.some(keyword => combinedText.includes(keyword))) {
        business.industry = industry
        break
      }
    }
    
    // Fallback to full page text if no industry found
    if (!business.industry) {
      const pageText = $('body').text().toLowerCase()
      for (const [industry, keywords] of Object.entries(industryKeywords)) {
        if (keywords.some(keyword => pageText.includes(keyword))) {
          business.industry = industry
          break
        }
      }
    }
    
    return business
  }

  private extractTeam($: cheerio.CheerioAPI): ExtractedCompanyData['team'] {
    const team: ExtractedCompanyData['team'] = {}
    const keyPeople: ExtractedCompanyData['team']['keyPeople'] = []
    
    // Team members
    $('.team-member, .person-card, .leadership-member, .founder-card').each((_, el) => {
      const name = $(el).find('.name, h3, h4, .member-name').first().text().trim()
      const role = $(el).find('.role, .title, .position, .job-title').first().text().trim()
      const bio = $(el).find('.bio, .description, p').first().text().trim()
      
      if (name && role) {
        keyPeople.push({ name, role, bio })
      }
    })
    
    // Alternative extraction for team
    if (keyPeople.length === 0) {
      $('*:contains("Team"):not(script), *:contains("Leadership"):not(script)').each((_, el) => {
        $(el).parent().find('.person, .member').each((_, personEl) => {
          const name = $(personEl).find('h3, h4, .name').first().text().trim()
          const role = $(personEl).find('.role, .title').first().text().trim()
          if (name && role) {
            keyPeople.push({ name, role })
          }
        })
      })
    }
    
    if (keyPeople.length > 0) {
      team.keyPeople = keyPeople
    }
    
    // Team size
    const sizeText = $('*:contains("employees"):not(script), *:contains("team"):not(script)').text()
    const sizeMatch = sizeText.match(/(\d+[\d,]*)\s*(?:employees|team members|people)/i)
    if (sizeMatch) {
      team.size = sizeMatch[1]
    }
    
    return team
  }

  private extractMetrics($: cheerio.CheerioAPI): ExtractedCompanyData['metrics'] {
    const metrics: ExtractedCompanyData['metrics'] = {}
    const bodyText = $('body').text()
    
    // Revenue
    const revenueMatch = bodyText.match(/\$(\d+[\d,]*\.?\d*)\s*([MBK])?(?:illion)?\s+(?:in\s+)?(?:revenue|ARR)/i)
    if (revenueMatch) {
      metrics.revenue = revenueMatch[0]
    }
    
    // Funding
    const fundingMatch = bodyText.match(/\$(\d+[\d,]*\.?\d*)\s*([MBK])?(?:illion)?\s+(?:in\s+)?(?:funding|raised|investment)/i)
    if (fundingMatch) {
      metrics.funding = fundingMatch[0]
    }
    
    // Customers
    const customersMatch = bodyText.match(/(\d+[\d,]*)\+?\s*(?:customers|clients|users|companies)/i)
    if (customersMatch) {
      metrics.customers = customersMatch[0]
    }
    
    // Growth
    const growthMatch = bodyText.match(/(\d+)%\s*(?:growth|increase|year-over-year|YoY)/i)
    if (growthMatch) {
      metrics.growth = growthMatch[0]
    }
    
    return Object.keys(metrics).length > 0 ? metrics : undefined
  }
}