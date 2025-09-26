/**
 * Extracts company information from HTML
 *
 * @module scrapers-v2/extractors/company-extractor
 * @description Specialized extractor for company data including
 * name, description, industry, and other business information.
 * Searches multiple sources including meta tags, JSON-LD,
 * and page content.
 *
 * EXTRACTION SOURCES:
 * - OpenGraph meta tags (og:site_name, og:title)
 * - Twitter meta tags (twitter:site)
 * - JSON-LD structured data (Organization schema)
 * - Standard meta tags (application-name, description)
 * - Page title and headings
 *
 * COMPLIANCE:
 * - Pure extraction logic (no side effects)
 * - No database or network access
 * - Returns undefined if insufficient data
 */

import type { CheerioAPI } from 'cheerio'
import type { CompanyInfo } from '@/lib/company-intelligence/types/scraping-interfaces'
import type { Url } from '../core/types'
import { BaseExtractor, ExtractionSource } from './extractor.interface'
import { permanentLogger } from '@/lib/utils/permanent-logger'

/**
 * Extracts company information from HTML
 *
 * RESPONSIBILITIES:
 * - Extract company name from multiple sources
 * - Find company description and tagline
 * - Extract industry and business details
 * - Locate logo and branding assets
 */
export class CompanyExtractor extends BaseExtractor<CompanyInfo> {
  /**
   * Extract company information from HTML
   *
   * @param $ - Cheerio instance with loaded HTML
   * @param url - Source URL for context
   * @returns CompanyInfo or undefined if not found
   */
  extract($: CheerioAPI, url: Url): CompanyInfo | undefined {
    try {
      const companyInfo: Partial<CompanyInfo> = {}

      // Extract from JSON-LD first (most reliable)
      const jsonLdData = this.extractFromJsonLd($)
      if (jsonLdData) {
        Object.assign(companyInfo, jsonLdData)
      }

      // Extract from meta tags
      const metaData = this.extractFromMeta($)
      Object.assign(companyInfo, metaData)

      // Extract from page content if still missing data
      if (!companyInfo.name) {
        companyInfo.name = this.extractNameFromContent($)
      }

      if (!companyInfo.description) {
        companyInfo.description = this.extractDescriptionFromContent($)
      }

      // Set website from current URL if not found
      if (!companyInfo.website) {
        const urlObj = new URL(url)
        companyInfo.website = `${urlObj.protocol}//${urlObj.host}`
      }

      // Only return if we have at least a name
      if (!companyInfo.name) {
        permanentLogger.debug('COMPANY_EXTRACTOR', 'No company name found', { url })
        return undefined
      }

      permanentLogger.debug('COMPANY_EXTRACTOR', 'Company info extracted', {
        url,
        hasName: !!companyInfo.name,
        hasDescription: !!companyInfo.description,
        hasLogo: !!companyInfo.logoUrl
      })

      return companyInfo as CompanyInfo

    } catch (error) {
      permanentLogger.captureError('COMPANY_EXTRACTOR', error as Error, { url })
      return undefined
    }
  }

  /**
   * Extract company data from JSON-LD structured data
   *
   * @param $ - Cheerio instance
   * @returns Partial company info
   */
  private extractFromJsonLd($: CheerioAPI): Partial<CompanyInfo> | null {
    const data = this.getJsonLd($, 'Organization')
    if (!data) return null

    const info: Partial<CompanyInfo> = {}

    // Extract basic info
    if (data.name) info.name = this.cleanText(data.name)
    if (data.description) info.description = this.cleanText(data.description)
    if (data.url) info.website = data.url
    if (data.logo) {
      // Logo can be string or ImageObject
      if (typeof data.logo === 'string') {
        info.logoUrl = data.logo
      } else if (data.logo.url) {
        info.logoUrl = data.logo.url
      }
    }

    // Extract founding year
    if (data.foundingDate) {
      const year = new Date(data.foundingDate).getFullYear()
      if (!isNaN(year)) {
        info.foundedYear = year
      }
    }

    // Extract employee count
    if (data.numberOfEmployees) {
      if (typeof data.numberOfEmployees === 'number') {
        info.employeeCount = String(data.numberOfEmployees)
      } else if (typeof data.numberOfEmployees === 'string') {
        info.employeeCount = data.numberOfEmployees
      } else if (data.numberOfEmployees.value) {
        info.employeeCount = String(data.numberOfEmployees.value)
      }
    }

    // Extract headquarters
    if (data.address) {
      const address = data.address
      if (typeof address === 'object') {
        info.headquarters = {
          street: address.streetAddress,
          city: address.addressLocality,
          state: address.addressRegion,
          country: address.addressCountry,
          postalCode: address.postalCode
        }
      }
    }

    // Extract industry
    if (data.industry) info.industry = this.cleanText(data.industry)

    // Extract tagline/slogan
    if (data.slogan) info.tagline = this.cleanText(data.slogan)

    return info
  }

  /**
   * Extract company data from meta tags
   *
   * @param $ - Cheerio instance
   * @returns Partial company info
   */
  private extractFromMeta($: CheerioAPI): Partial<CompanyInfo> {
    const info: Partial<CompanyInfo> = {}

    // Company name from various meta tags
    if (!info.name) {
      info.name = this.getMetaContent($, 'og:site_name') ||
                  this.getMetaContent($, 'application-name') ||
                  this.getMetaContent($, 'apple-mobile-web-app-title') ||
                  this.getMetaContent($, 'twitter:site')?.replace('@', '')
    }

    // Description from meta tags
    if (!info.description) {
      info.description = this.getMetaContent($, 'og:description') ||
                        this.getMetaContent($, 'description') ||
                        this.getMetaContent($, 'twitter:description')
    }

    // Logo from meta tags
    if (!info.logoUrl) {
      info.logoUrl = this.getMetaContent($, 'og:image') ||
                     this.getMetaContent($, 'twitter:image') ||
                     this.getAttribute($, 'link[rel="icon"]', 'href') ||
                     this.getAttribute($, 'link[rel="apple-touch-icon"]', 'href')
    }

    // Website from meta
    if (!info.website) {
      info.website = this.getMetaContent($, 'og:url')
    }

    return info
  }

  /**
   * Extract company name from page content
   *
   * @param $ - Cheerio instance
   * @returns Company name or undefined
   */
  private extractNameFromContent($: CheerioAPI): string | undefined {
    // Try to get from title tag
    const title = this.getText($, 'title')
    if (title) {
      // Extract company name from patterns like "Company Name | Tagline"
      const parts = title.split(/[|\-–—]/)
      if (parts.length > 0) {
        return this.cleanText(parts[0])
      }
    }

    // Try to get from h1
    const h1 = this.getText($, 'h1')
    if (h1 && h1.length < 100) { // Reasonable length for company name
      return h1
    }

    // Try to get from logo alt text
    const logoAlt = this.getAttribute($, 'img[src*="logo"]', 'alt') ||
                    this.getAttribute($, 'img[class*="logo"]', 'alt')
    if (logoAlt) {
      return this.cleanText(logoAlt)
    }

    return undefined
  }

  /**
   * Extract description from page content
   *
   * @param $ - Cheerio instance
   * @returns Description or undefined
   */
  private extractDescriptionFromContent($: CheerioAPI): string | undefined {
    // Look for about section
    const aboutSelectors = [
      '.about-description',
      '#about p',
      '[class*="about"] p',
      '[id*="about"] p',
      '.company-description',
      '.hero-subtitle',
      '.tagline'
    ]

    for (const selector of aboutSelectors) {
      const text = this.getText($, selector)
      if (text && text.length > 20 && text.length < 500) {
        return text
      }
    }

    // Try first paragraph after h1/h2 containing "about"
    const aboutHeading = $('h1:contains("About"), h2:contains("About")').first()
    if (aboutHeading.length) {
      const nextP = aboutHeading.nextAll('p').first()
      if (nextP.length) {
        return this.cleanText(nextP.text())
      }
    }

    return undefined
  }

  /**
   * Validate extracted company data
   *
   * @param data - Company info to validate
   * @returns True if data is valid
   */
  validate(data: CompanyInfo): boolean {
    // Must have at least a name
    if (!data || !data.name) {
      return false
    }

    // Name should be reasonable length
    if (data.name.length < 2 || data.name.length > 200) {
      return false
    }

    // If we have a founding year, validate it
    if (data.foundedYear) {
      const currentYear = new Date().getFullYear()
      if (data.foundedYear < 1800 || data.foundedYear > currentYear) {
        return false
      }
    }

    return true
  }

  /**
   * Calculate confidence score for extracted data
   *
   * @param data - Company info
   * @returns Confidence score 0-100
   */
  getConfidence(data: CompanyInfo): number {
    if (!data) return 0

    let score = 0

    // Base score for having a name
    if (data.name) score += 30

    // Additional points for completeness
    if (data.description) score += 20
    if (data.website) score += 10
    if (data.logoUrl) score += 10
    if (data.industry) score += 10
    if (data.foundedYear) score += 5
    if (data.employeeCount) score += 5
    if (data.headquarters) score += 5
    if (data.tagline) score += 5

    return Math.min(score, 100)
  }
}