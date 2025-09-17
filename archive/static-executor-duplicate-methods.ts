/**
 * ARCHIVED: Duplicate extraction methods from StaticScraperExecutor
 * Archived Date: 2025-01-12
 * Reason: Phase 4 - Removing duplicate code in favor of existing extractors
 * 
 * These methods were replaced by:
 * - SmartExtractor (comprehensive company data extraction)
 * - BlogContentExtractor (blog-specific link extraction)
 * - socialMediaExtractor (social media link extraction)
 * 
 * NOTE: Methods for forms, images, API endpoints, and structured data were kept
 * as they provide unique functionality not covered by the extractors.
 * 
 * STRATEGIC REVIEW NEEDED (End of Phase 7):
 * 1. Is the "unique" functionality genuinely unique?
 * 2. Is it required for the application?
 * 3. What other code could benefit from these extraction patterns?
 * 4. Should these be moved to dedicated extractors?
 */

import type { ContactInfo, SocialLinks, FormData, ImageData } from '../additive/types'
import * as cheerio from 'cheerio'

// ============= ARCHIVED METHODS (Removed in Phase 4) =============

/**
 * Extract page title
 * REPLACED BY: SmartExtractor.extractCompanyData().name
 */
private extractTitle($: cheerio.CheerioAPI): string {
  return $('title').first().text().trim() ||
         $('meta[property="og:title"]').attr('content')?.trim() ||
         $('h1').first().text().trim() ||
         ''
}

/**
 * Extract page description
 * REPLACED BY: SmartExtractor.extractCompanyData().description
 */
private extractDescription($: cheerio.CheerioAPI): string {
  return $('meta[name="description"]').attr('content')?.trim() ||
         $('meta[property="og:description"]').attr('content')?.trim() ||
         $('p').first().text().trim().substring(0, 200) ||
         ''
}

/**
 * Extract text content
 * REPLACED BY: Direct implementation in scrapePage()
 */
private extractTextContent($: cheerio.CheerioAPI): string {
  // Remove script and style elements
  $('script, style, noscript').remove()
  
  // Get main content areas
  const contentSelectors = [
    'main',
    'article',
    '[role="main"]',
    '#content',
    '.content',
    'body'
  ]
  
  for (const selector of contentSelectors) {
    const content = $(selector).first()
    if (content.length) {
      return content.text().replace(/\s+/g, ' ').trim()
    }
  }
  
  return $('body').text().replace(/\s+/g, ' ').trim()
}

/**
 * Extract all links from the page with proper deduplication
 * REPLACED BY: Direct implementation in scrapePage() + BlogContentExtractor
 */
private extractLinks($: cheerio.CheerioAPI, baseUrl: string): string[] {
  const links: string[] = []
  const seen = new Set<string>()
  
  // Extract all links from <a> tags
  $('a[href]').each((_, element) => {
    const href = $(element).attr('href')
    if (!href) return
    
    // Skip non-HTTP links
    if (href.startsWith('javascript:') || 
        href.startsWith('mailto:') || 
        href.startsWith('tel:') ||
        href.startsWith('#')) {
      return
    }
    
    // Resolve relative URLs
    let fullUrl = href
    try {
      const url = new URL(href, baseUrl)
      fullUrl = url.href
      
      // Skip non-HTTP(S) protocols
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return
      }
    } catch {
      // If URL parsing fails, skip this link
      return
    }
    
    // Skip if already seen
    if (seen.has(fullUrl)) return
    
    // Skip asset files
    if (/\.(css|js|jpg|jpeg|png|gif|svg|ico|woff|woff2|ttf|eot|pdf|zip|doc|docx|xls|xlsx)$/i.test(fullUrl)) {
      return
    }
    
    // Add to seen set and links array
    seen.add(fullUrl)
    links.push(fullUrl)
  })
  
  // Also include canonical and alternate links
  $('link[rel="canonical"], link[rel="alternate"]').each((_, element) => {
    const href = $(element).attr('href')
    if (!href) return
    
    try {
      const url = new URL(href, baseUrl)
      const fullUrl = url.href
      
      if (!seen.has(fullUrl) && 
          !(/\.(css|js|jpg|jpeg|png|gif|svg|ico|woff|woff2|ttf|eot|pdf|zip|doc|docx|xls|xlsx)$/i.test(fullUrl))) {
        seen.add(fullUrl)
        links.push(fullUrl)
      }
    } catch {
      // Invalid URL, skip
    }
  })
  
  return links
}

/**
 * Extract contact information
 * REPLACED BY: SmartExtractor.extractCompanyData() (emails, phones, addresses)
 */
private extractContactInfo($: cheerio.CheerioAPI): ContactInfo {
  const info: ContactInfo = {
    emails: [],
    phones: [],
    addresses: []
  }
  
  // Extract emails
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
  const text = $('body').text()
  const emailMatches = text.match(emailPattern) || []
  info.emails = Array.from(new Set(emailMatches))
  
  // Also check mailto links
  $('a[href^="mailto:"]').each((_, element) => {
    const mailto = $(element).attr('href')?.replace('mailto:', '').split('?')[0]
    if (mailto && !info.emails?.includes(mailto)) {
      info.emails?.push(mailto)
    }
  })
  
  // Extract phone numbers
  const phonePattern = /[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,4}/g
  const phoneMatches = text.match(phonePattern) || []
  info.phones = Array.from(new Set(phoneMatches.filter(p => p.length >= 10)))
  
  // Also check tel links
  $('a[href^="tel:"]').each((_, element) => {
    const tel = $(element).attr('href')?.replace('tel:', '')
    if (tel && !info.phones?.includes(tel)) {
      info.phones?.push(tel)
    }
  })
  
  // Extract addresses
  const addressSelectors = [
    'address',
    '[itemprop="address"]',
    '.address',
    '[class*="address"]'
  ]
  
  const addresses = new Set<string>()
  for (const selector of addressSelectors) {
    $(selector).each((_, element) => {
      const address = $(element).text().trim()
      if (address && address.length > 10) {
        addresses.add(address)
      }
    })
  }
  info.addresses = Array.from(addresses)
  
  return info
}

/**
 * Extract social media links
 * REPLACED BY: socialMediaExtractor.extract()
 */
private extractSocialLinks($: cheerio.CheerioAPI): SocialLinks {
  const social: SocialLinks = {}
  
  const socialPatterns = [
    { platform: 'twitter', pattern: /twitter\.com|x\.com/ },
    { platform: 'linkedin', pattern: /linkedin\.com/ },
    { platform: 'facebook', pattern: /facebook\.com/ },
    { platform: 'instagram', pattern: /instagram\.com/ },
    { platform: 'youtube', pattern: /youtube\.com/ },
    { platform: 'github', pattern: /github\.com/ },
    { platform: 'tiktok', pattern: /tiktok\.com/ },
    { platform: 'pinterest', pattern: /pinterest\.com/ }
  ]
  
  $('a[href]').each((_, element) => {
    const href = $(element).attr('href')
    if (!href) return
    
    for (const { platform, pattern } of socialPatterns) {
      if (pattern.test(href) && !social[platform]) {
        social[platform] = href
      }
    }
  })
  
  return social
}