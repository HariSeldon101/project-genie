/**
 * CheerioScraper - Fast static HTML scraper with comprehensive data extraction
 * Optimized for WordPress, static sites, and server-rendered content
 */

import * as cheerio from 'cheerio'

type CheerioAPI = cheerio.CheerioAPI
import { logger } from '../../../utils/permanent-logger'
import { brandAssetExtractor } from '../../services/brand-asset-extractor'
import { imageExtractor } from '../../services/image-extractor'
import type { 
  IScraper, 
  ScrapedData, 
  ScrapeOptions, 
  ContactInfo,
  SocialLinks,
  TeamMember,
  Testimonial,
  ProductService,
  BlogPost,
  BrandAssets
} from '../types'
import type { WebsiteAnalysis } from '../detection/website-detector'

export class CheerioScraper implements IScraper {
  readonly name = 'cheerio'
  private currentUrl: string = ''
  
  canHandle(url: string, analysis?: WebsiteAnalysis): boolean {
    if (analysis) {
      // Best for static sites
      const isOptimal = analysis.isStatic && !analysis.requiresJS
      logger.debug('CHEERIO_SCRAPER', 'Can handle check', { 
        url, 
        isStatic: analysis.isStatic, 
        requiresJS: analysis.requiresJS,
        isOptimal 
      })
      return isOptimal
    }
    // Default to being able to handle any site
    return true
  }
  
  async scrape(url: string, options?: ScrapeOptions): Promise<ScrapedData> {
    const startTime = Date.now()
    this.currentUrl = url
    
    try {
      logger.info('CHEERIO_SCRAPER', 'Starting scrape with metadata', { 
        url,
        hasMetadata: !!options?.siteMetadata,
        organizationName: options?.siteMetadata?.organizationName,
        siteType: options?.siteMetadata?.siteType,
        language: options?.siteMetadata?.language,
        charset: options?.siteMetadata?.charset,
        hasBrandAssets: !!options?.siteMetadata?.brandAssets,
        technologies: options?.siteMetadata?.technologies ? Object.keys(options.siteMetadata.technologies).length : 0
      })
      
      // Fetch HTML with metadata-enhanced headers
      const response = await fetch(url, {
        headers: {
          'User-Agent': options?.userAgent || 'Mozilla/5.0 (compatible; CompanyIntelligenceBot/1.0)',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': options?.siteMetadata?.language ? `${options.siteMetadata.language},en;q=0.9` : 'en-US,en;q=0.9',
          'Accept-Charset': options?.siteMetadata?.charset || 'utf-8',
          ...options?.headers
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const html = await response.text()
      const $ = cheerio.load(html)
      
      // Extract all data with metadata context
      const title = this.extractTitle($, options?.siteMetadata)
      const description = this.extractDescription($)
      const logos = this.extractLogos($, options?.siteMetadata)
      
      // Use shared BrandAssetExtractor service for brand assets
      const brandAssets = await brandAssetExtractor.extractBrandAssets({
        url,
        html,
        $,
        siteMetadata: options?.siteMetadata,
        fetchExternalCSS: true
      })
      
      // Use shared ImageExtractor service for comprehensive image extraction
      const images = await imageExtractor.extractImages({
        url,
        $,
        maxImages: 100
      })
      
      const contactInfo = this.extractContactInfo($, options?.siteMetadata)
      const socialLinks = this.extractSocialLinks($, options?.siteMetadata)
      const teamMembers = this.extractTeamMembers($)
      const testimonials = this.extractTestimonials($)
      const products = this.extractProducts($)
      const blogPosts = this.extractBlogPosts($)
      const content = this.extractMainContent($)
      
      // Detect framework
      const frameworks = await this.detectFramework($)
      const topFramework = frameworks[0] || null
      
      logger.info('CHEERIO_SCRAPER', 'Scrape completed', {
        url,
        duration: Date.now() - startTime,
        dataExtracted: {
          title: !!title,
          description: !!description,
          logos: logos.length,
          contacts: contactInfo.emails.length + contactInfo.phones.length,
          socialLinks: Object.keys(socialLinks).length,
          teamMembers: teamMembers.length,
          products: products.length,
          blogPosts: blogPosts.length
        }
      })
      
      // Return scraped data with compatibility fields
      const scrapedData: ScrapedData = {
        url,
        title: title || '',
        description: description || '',
        content: content || '',
        logos,
        brandAssets,
        contactInfo,
        socialLinks,
        teamMembers,
        testimonials,
        products,
        blogPosts,
        images,
        metadata: {
          scrapedAt: new Date().toISOString(),
          scraper: this.name,
          framework: topFramework,
          duration: Date.now() - startTime
        },
        // Add compatibility fields for orchestrator
        data: {
          raw: { html: html.substring(0, 100000), text: content },
          structured: {
            title,
            description,
            logos,
            contactInfo,
            socialLinks,
            teamMembers,
            testimonials,
            products,
            blogPosts
          },
          metadata: {
            scraper: this.name,
            framework: topFramework
          }
        },
        raw: { html: html.substring(0, 100000), text: content },
        structured: {
          title,
          description,
          logos,
          contactInfo,
          socialLinks,
          teamMembers,
          testimonials,
          products,
          blogPosts
        },
        scraperUsed: this.name
      }
      
      return scrapedData
      
    } catch (error) {
      logger.error('CHEERIO_SCRAPER', 'Scrape failed', { url, error })
      throw error
    }
  }
  
  private extractTitle($: CheerioAPI, metadata?: ScrapeOptions['siteMetadata']): string {
    // Try H1 first
    const h1 = this.extractH1($)
    if (h1) return h1
    
    // Then try title tag
    const titleTag = $('title').text().trim()
    if (titleTag) {
      // Clean up common patterns
      return titleTag.split(/[|\-–]/)[0].trim()
    }
    
    // Try meta og:title
    const ogTitle = $('meta[property="og:title"]').attr('content')
    if (ogTitle) return ogTitle.trim()
    
    // Try hero text as last resort
    const heroText = this.extractHeroText($)
    if (heroText && heroText.length < 100) return heroText
    
    // Use organization name from metadata as final fallback
    return metadata?.organizationName || ''
  }
  
  private extractDescription($: CheerioAPI): string {
    // Try various meta tags
    const metaDesc = 
      $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content') ||
      $('meta[itemprop="description"]').attr('content')
    
    if (metaDesc) return metaDesc.trim()
    
    // Try to find description in content
    const selectors = [
      '.description',
      '.intro',
      '.lead',
      '.tagline',
      '.subtitle',
      'main p:first',
      'article p:first',
      '.content p:first',
      '.hero p',
      '.about p:first'
    ]
    
    for (const selector of selectors) {
      const text = $(selector).first().text().trim()
      if (text && text.length > 30 && text.length < 500) {
        return text.substring(0, 300)
      }
    }
    
    return ''
  }
  
  private extractH1($: CheerioAPI): string {
    const selectors = [
      'h1:not(header h1):first',
      'main h1:first',
      'article h1:first',
      '.hero h1:first',
      '[role="main"] h1:first',
      '.content h1:first',
      '#main h1:first',
      '.page-title:first',
      '.entry-title:first',
      '.post-title:first'
    ]
    
    for (const selector of selectors) {
      try {
        const h1 = $(selector).first().text().trim()
        if (h1 && h1.length > 0 && h1.length < 200) {
          return h1
        }
      } catch (e) {
        // Invalid selector, skip
      }
    }
    
    // Fallback: any h1
    const anyH1 = $('h1').first().text().trim()
    if (anyH1 && anyH1.length > 0 && anyH1.length < 200) {
      return anyH1
    }
    
    return ''
  }
  
  private extractHeroText($: CheerioAPI): string {
    const selectors = [
      '.hero p:first',
      '.hero-subtitle',
      '.hero-description',
      '.hero .subtitle',
      '.banner p:first',
      '.banner-subtitle',
      '.jumbotron p:first',
      '[role="banner"] p:first',
      '.hero h2:first',
      '.tagline',
      '.subtitle',
      'header p:first'
    ]
    
    for (const selector of selectors) {
      const text = $(selector).first().text().trim()
      if (text && text.length > 10 && text.length < 500) {
        return text
      }
    }
    
    return ''
  }
  
  private extractMainContent($: CheerioAPI): string {
    // Remove unwanted elements
    $('script, style, noscript, nav, header, footer, aside').remove()
    
    const contentSelectors = [
      'main',
      '[role="main"]',
      '#main-content',
      '.main-content',
      '#content',
      '.content',
      'article',
      '.article-content',
      '.page-content',
      '.entry-content',
      '.post-content'
    ]
    
    let bestContent = ''
    let maxLength = 0
    
    for (const selector of contentSelectors) {
      const element = $(selector).first()
      if (element.length) {
        const content = element.text()
          .replace(/\s+/g, ' ')
          .trim()
        
        if (content.length > maxLength) {
          maxLength = content.length
          bestContent = content
        }
      }
    }
    
    if (bestContent.length > 100) {
      return bestContent.substring(0, 5000)
    }
    
    // Fallback: get body text
    return $('body').text()
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 5000)
  }
  
  private extractLogos($: CheerioAPI, metadata?: ScrapeOptions['siteMetadata']): string[] {
    const logos: string[] = []
    const baseUrl = this.currentUrl ? new URL(this.currentUrl).origin : ''
    
    const logoSelectors = [
      'img[alt*="logo" i]',
      'img[class*="logo" i]',
      'img[id*="logo" i]',
      'img[src*="logo" i]',
      '.logo img',
      '#logo img',
      '.navbar-brand img',
      '.site-logo img',
      '.brand img',
      '.header-logo img',
      'header img:first',
      'nav img:first',
      'a[href="/"] img:first',
      // SVG logos
      'svg[class*="logo" i]',
      'svg[id*="logo" i]',
      '.logo svg',
      '#logo svg'
    ]
    
    logoSelectors.forEach(selector => {
      $(selector).each((_, el) => {
        if (el.name === 'svg') {
          const svgHtml = $.html(el)
          if (svgHtml && !logos.some(l => l.includes('svg'))) {
            logos.push(`data:image/svg+xml,${encodeURIComponent(svgHtml)}`)
          }
        } else {
          const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src')
          if (src && !logos.includes(src)) {
            const absoluteUrl = this.makeAbsoluteUrl(src, baseUrl)
            logos.push(absoluteUrl)
          }
        }
      })
    })
    
    // Add og:image from metadata if available
    if (metadata?.brandAssets?.ogImage) {
      const ogImage = this.makeAbsoluteUrl(metadata.brandAssets.ogImage, baseUrl)
      if (!logos.includes(ogImage)) {
        logos.unshift(ogImage) // Add at beginning as primary brand image
      }
    }
    
    // Check favicon as potential logo
    const favicon = metadata?.brandAssets?.favicon || $('link[rel*="icon"]').attr('href')
    if (favicon && logos.length === 0) {
      logos.push(this.makeAbsoluteUrl(favicon, baseUrl))
    }
    
    return [...new Set(logos)].slice(0, 5)
  }
  
  // Removed extractBrandAssets method - now using shared BrandAssetExtractor service
  
  private extractContactInfo($: CheerioAPI, metadata?: ScrapeOptions['siteMetadata']): ContactInfo {
    const emails: string[] = []
    const phones: string[] = []
    const addresses: string[] = []
    
    // Extract emails
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
    const bodyText = $.html()
    const emailMatches = bodyText.match(emailRegex) || []
    emailMatches.forEach(email => {
      if (!email.includes('.png') && !email.includes('.jpg') && !email.includes('example')) {
        emails.push(email)
      }
    })
    
    // Extract phones
    const phoneRegex = /[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}/g
    const phoneMatches = bodyText.match(phoneRegex) || []
    phoneMatches.forEach(phone => {
      if (phone.length >= 10) {
        phones.push(phone)
      }
    })
    
    // Extract addresses
    const addressSelectors = [
      '[itemprop="address"]',
      '.address',
      'address',
      '.contact-address',
      '.location',
      '.office-address'
    ]
    
    addressSelectors.forEach(selector => {
      $(selector).each((_, el) => {
        const address = $(el).text().trim()
        if (address && address.length > 10) {
          addresses.push(address)
        }
      })
    })
    
    return {
      emails: [...new Set(emails)].slice(0, 10),
      phones: [...new Set(phones)].slice(0, 5),
      addresses: [...new Set(addresses)].slice(0, 3)
    }
  }
  
  private extractSocialLinks($: CheerioAPI, metadata?: ScrapeOptions['siteMetadata']): SocialLinks {
    const socialLinks: SocialLinks = {}
    
    // Add Twitter/X handle from metadata if available
    if (metadata?.socialHandles?.twitter) {
      const handle = metadata.socialHandles.twitter.replace('@', '')
      socialLinks.twitter = `https://twitter.com/${handle}`
    }
    
    const patterns = {
      twitter: /twitter\.com|x\.com/i,
      linkedin: /linkedin\.com/i,
      facebook: /facebook\.com/i,
      instagram: /instagram\.com/i,
      youtube: /youtube\.com/i,
      github: /github\.com/i,
      tiktok: /tiktok\.com/i,
      medium: /medium\.com/i
    }
    
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href')
      if (href) {
        for (const [platform, pattern] of Object.entries(patterns)) {
          if (pattern.test(href) && !socialLinks[platform]) {
            socialLinks[platform] = href
          }
        }
      }
    })
    
    return socialLinks
  }
  
  private extractTeamMembers($: CheerioAPI): TeamMember[] {
    const members: TeamMember[] = []
    
    const teamSelectors = [
      '.team-member',
      '.staff-member',
      '.employee',
      '.founder',
      '[class*="team"]',
      '[class*="staff"]'
    ]
    
    teamSelectors.forEach(selector => {
      $(selector).each((_, el) => {
        const $el = $(el)
        const name = $el.find('h2, h3, h4, .name').first().text().trim()
        const role = $el.find('.role, .title, .position').first().text().trim()
        const bio = $el.find('.bio, .description, p').first().text().trim()
        const image = $el.find('img').first().attr('src') || null
        
        if (name) {
          members.push({
            name,
            role: role || null,
            bio: bio || null,
            image: image ? this.makeAbsoluteUrl(image, this.currentUrl) : null,
            linkedin: null,
            twitter: null
          })
        }
      })
    })
    
    return members.slice(0, 20)
  }
  
  private extractTestimonials($: CheerioAPI): Testimonial[] {
    const testimonials: Testimonial[] = []
    
    const selectors = [
      '.testimonial',
      '.review',
      '.quote',
      '[class*="testimonial"]',
      '[class*="review"]',
      'blockquote'
    ]
    
    selectors.forEach(selector => {
      $(selector).each((_, el) => {
        const $el = $(el)
        const content = $el.find('p, .content, .text').first().text().trim() ||
                       $el.text().trim()
        const author = $el.find('.author, .name, cite').first().text().trim()
        const role = $el.find('.role, .company, .title').first().text().trim()
        
        if (content && content.length > 20) {
          testimonials.push({
            content: content.substring(0, 500),
            author: author || null,
            role: role || null,
            rating: null,
            date: null
          })
        }
      })
    })
    
    return testimonials.slice(0, 15)
  }
  
  private extractProducts($: CheerioAPI): ProductService[] {
    const products: ProductService[] = []
    
    const selectors = [
      '.product',
      '.service',
      '.offering',
      '[class*="product"]',
      '[class*="service"]',
      '.card',
      '.feature'
    ]
    
    selectors.forEach(selector => {
      $(selector).each((_, el) => {
        const $el = $(el)
        const name = $el.find('h2, h3, h4, .title, .name').first().text().trim()
        const description = $el.find('.description, .summary, p').first().text().trim()
        const price = $el.find('.price, .cost').first().text().trim()
        const image = $el.find('img').first().attr('src') || null
        
        if (name && name.length > 2) {
          products.push({
            name,
            description: description || null,
            price: price || null,
            image: image ? this.makeAbsoluteUrl(image, this.currentUrl) : null,
            features: [],
            link: null
          })
        }
      })
    })
    
    return products.slice(0, 20)
  }
  
  private extractBlogPosts($: CheerioAPI): BlogPost[] {
    const posts: BlogPost[] = []
    
    const selectors = [
      'article',
      '.post',
      '.blog-post',
      '[class*="article"]',
      '[class*="post"]'
    ]
    
    selectors.forEach(selector => {
      $(selector).each((_, el) => {
        const $el = $(el)
        const title = $el.find('h1, h2, h3, .title').first().text().trim()
        const excerpt = $el.find('.excerpt, .summary, p').first().text().trim()
        const author = $el.find('.author, .by').first().text().trim()
        const date = $el.find('.date, time').first().text().trim()
        const link = $el.find('a').first().attr('href') || null
        
        if (title && title.length > 5) {
          posts.push({
            title,
            excerpt: excerpt || null,
            author: author || null,
            date: date || null,
            link: link ? this.makeAbsoluteUrl(link, this.currentUrl) : null,
            tags: []
          })
        }
      })
    })
    
    return posts.slice(0, 10)
  }
  
  private makeAbsoluteUrl(url: string, baseUrl: string): string {
    if (!url) return ''
    if (url.startsWith('http')) return url
    if (url.startsWith('//')) return `https:${url}`
    if (url.startsWith('/')) return `${baseUrl}${url}`
    return `${baseUrl}/${url}`
  }
  
  private async detectFramework($: CheerioAPI): Promise<string[]> {
    const frameworks: string[] = []
    
    // WordPress
    if ($('meta[name="generator"][content*="WordPress"]').length ||
        $.html().includes('/wp-content/') ||
        $.html().includes('/wp-includes/')) {
      frameworks.push('wordpress')
    }
    
    // React
    if ($('#root').length || $('[data-reactroot]').length) {
      frameworks.push('react')
    }
    
    // Vue
    if ($('#app').length || $('[data-v-]').length) {
      frameworks.push('vue')
    }
    
    // Next.js
    if ($('#__next').length || $.html().includes('/_next/')) {
      frameworks.push('nextjs')
    }
    
    return frameworks
  }
}