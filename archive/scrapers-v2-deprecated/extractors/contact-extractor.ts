/**
 * Extracts contact information from HTML
 *
 * @module scrapers-v2/extractors/contact-extractor
 * @description Specialized extractor for contact data including
 * emails, phones, and addresses. Searches multiple sources
 * including structured data, contact pages, and footers.
 *
 * EXTRACTION PATTERNS:
 * - Email: mailto links, text patterns
 * - Phone: tel links, common phone formats
 * - Address: structured data, address tags, footer content
 *
 * COMPLIANCE:
 * - Pure extraction logic
 * - No external dependencies
 * - Validates data formats
 */

import type { CheerioAPI } from 'cheerio'
import type { ContactData, Address } from '@/lib/company-intelligence/types/scraping-interfaces'
import type { Url } from '../core/types'
import { BaseExtractor } from './extractor.interface'
import { permanentLogger } from '@/lib/utils/permanent-logger'

/**
 * Extracts contact information from HTML
 */
export class ContactExtractor extends BaseExtractor<ContactData> {
  /**
   * Extract contact data from HTML
   */
  extract($: CheerioAPI, url: Url): ContactData | undefined {
    try {
      const emails = this.extractEmailAddresses($)
      const phones = this.extractPhoneNumbers($)
      const addresses = this.extractAddresses($)

      // Check if we found any contact data
      if (emails.length === 0 && phones.length === 0 && addresses.length === 0) {
        permanentLogger.debug('CONTACT_EXTRACTOR', 'No contact data found', { url })
        return undefined
      }

      const contactData: ContactData = {
        emails,
        phones,
        addresses,
        contactForm: this.hasContactForm($)
      }

      // Find support email if exists
      const supportEmail = emails.find(email =>
        email.includes('support') ||
        email.includes('help') ||
        email.includes('contact')
      )
      if (supportEmail) {
        contactData.supportEmail = supportEmail
      }

      // Find sales email if exists
      const salesEmail = emails.find(email =>
        email.includes('sales') ||
        email.includes('inquiry')
      )
      if (salesEmail) {
        contactData.salesEmail = salesEmail
      }

      permanentLogger.debug('CONTACT_EXTRACTOR', 'Contact data extracted', {
        url,
        emailCount: emails.length,
        phoneCount: phones.length,
        addressCount: addresses.length
      })

      return contactData

    } catch (error) {
      permanentLogger.captureError('CONTACT_EXTRACTOR', error as Error, { url })
      return undefined
    }
  }

  /**
   * Extract email addresses
   */
  private extractEmailAddresses($: CheerioAPI): string[] {
    const emails = new Set<string>()

    // Extract from mailto links
    $('a[href^="mailto:"]').each((_, element) => {
      const href = $(element).attr('href')
      if (href) {
        const email = href.replace('mailto:', '').split('?')[0]
        if (this.isValidEmail(email)) {
          emails.add(email.toLowerCase())
        }
      }
    })

    // Extract from text content (common areas)
    const selectors = [
      'footer',
      '.contact',
      '#contact',
      '.footer',
      '.contact-info',
      '.email',
      '[class*="contact"]',
      '[id*="contact"]'
    ]

    selectors.forEach(selector => {
      const text = $(selector).text()
      if (text) {
        const found = this.extractEmails(text)
        found.forEach(email => emails.add(email.toLowerCase()))
      }
    })

    // Extract from structured data
    const jsonLd = this.getJsonLd($, 'Organization')
    if (jsonLd?.email) {
      if (this.isValidEmail(jsonLd.email)) {
        emails.add(jsonLd.email.toLowerCase())
      }
    }

    return Array.from(emails)
  }

  /**
   * Extract phone numbers
   */
  private extractPhoneNumbers($: CheerioAPI): string[] {
    const phones = new Set<string>()

    // Extract from tel links
    $('a[href^="tel:"]').each((_, element) => {
      const href = $(element).attr('href')
      if (href) {
        const phone = href.replace('tel:', '')
        if (this.isValidPhone(phone)) {
          phones.add(this.normalizePhone(phone))
        }
      }
    })

    // Extract from text content
    const selectors = [
      'footer',
      '.contact',
      '#contact',
      '.phone',
      '.tel',
      '[class*="phone"]',
      '[class*="tel"]'
    ]

    selectors.forEach(selector => {
      const text = $(selector).text()
      if (text) {
        const found = this.extractPhones(text)
        found.forEach(phone => {
          if (this.isValidPhone(phone)) {
            phones.add(this.normalizePhone(phone))
          }
        })
      }
    })

    // Extract from structured data
    const jsonLd = this.getJsonLd($, 'Organization')
    if (jsonLd?.telephone) {
      if (this.isValidPhone(jsonLd.telephone)) {
        phones.add(this.normalizePhone(jsonLd.telephone))
      }
    }

    return Array.from(phones)
  }

  /**
   * Extract addresses
   */
  private extractAddresses($: CheerioAPI): Address[] {
    const addresses: Address[] = []

    // Extract from structured data first
    const jsonLd = this.getJsonLd($, 'Organization')
    if (jsonLd?.address) {
      const addr = this.parseStructuredAddress(jsonLd.address)
      if (addr) addresses.push(addr)
    }

    // Extract from address tags
    $('address').each((_, element) => {
      const text = $(element).text()
      const addr = this.parseAddressText(text)
      if (addr) addresses.push(addr)
    })

    // Extract from common selectors
    const selectors = [
      '.address',
      '.location',
      '[class*="address"]',
      '[class*="location"]'
    ]

    selectors.forEach(selector => {
      $(selector).each((_, element) => {
        const text = $(element).text()
        const addr = this.parseAddressText(text)
        if (addr) addresses.push(addr)
      })
    })

    // Remove duplicates
    return this.deduplicateAddresses(addresses)
  }

  /**
   * Parse structured address data
   */
  private parseStructuredAddress(data: any): Address | null {
    if (!data) return null

    const address: Address = {}

    if (typeof data === 'string') {
      address.formatted = this.cleanText(data)
    } else {
      if (data.streetAddress) address.street = this.cleanText(data.streetAddress)
      if (data.addressLocality) address.city = this.cleanText(data.addressLocality)
      if (data.addressRegion) address.state = this.cleanText(data.addressRegion)
      if (data.addressCountry) address.country = this.cleanText(data.addressCountry)
      if (data.postalCode) address.postalCode = this.cleanText(data.postalCode)
    }

    // Only return if we have some data
    if (Object.keys(address).length > 0) {
      return address
    }

    return null
  }

  /**
   * Parse address from text
   */
  private parseAddressText(text: string): Address | null {
    if (!text || text.length < 10) return null

    const cleaned = this.cleanText(text)
    if (!cleaned) return null

    // Simple address parsing (can be enhanced)
    const address: Address = {
      formatted: cleaned
    }

    // Try to extract postal code
    const postalMatch = cleaned.match(/\b[A-Z0-9]{3,10}\b/g)
    if (postalMatch) {
      address.postalCode = postalMatch[postalMatch.length - 1]
    }

    return address
  }

  /**
   * Check if page has contact form
   */
  private hasContactForm($: CheerioAPI): boolean {
    // Look for form elements with contact-related attributes
    const contactFormSelectors = [
      'form[id*="contact"]',
      'form[class*="contact"]',
      'form[action*="contact"]',
      'form[action*="submit"]',
      'form input[name*="email"]',
      'form input[type="email"]'
    ]

    for (const selector of contactFormSelectors) {
      if (this.exists($, selector)) {
        return true
      }
    }

    return false
  }

  /**
   * Validate email address
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    return emailRegex.test(email)
  }

  /**
   * Validate phone number
   */
  private isValidPhone(phone: string): boolean {
    const digits = phone.replace(/\D/g, '')
    return digits.length >= 7 && digits.length <= 15
  }

  /**
   * Normalize phone number format
   */
  private normalizePhone(phone: string): string {
    return phone.trim().replace(/\s+/g, ' ')
  }

  /**
   * Deduplicate addresses
   */
  private deduplicateAddresses(addresses: Address[]): Address[] {
    const unique = new Map<string, Address>()

    addresses.forEach(addr => {
      const key = JSON.stringify(addr)
      if (!unique.has(key)) {
        unique.set(key, addr)
      }
    })

    return Array.from(unique.values())
  }

  /**
   * Validate contact data
   */
  validate(data: ContactData): boolean {
    if (!data) return false

    // Must have at least one contact method
    return data.emails.length > 0 ||
           data.phones.length > 0 ||
           data.addresses.length > 0 ||
           data.contactForm === true
  }

  /**
   * Get confidence score
   */
  getConfidence(data: ContactData): number {
    if (!data) return 0

    let score = 0

    // Email scoring
    if (data.emails.length > 0) score += 30
    if (data.emails.length > 2) score += 10
    if (data.supportEmail) score += 10

    // Phone scoring
    if (data.phones.length > 0) score += 20
    if (data.phones.length > 1) score += 10

    // Address scoring
    if (data.addresses.length > 0) score += 15
    if (data.addresses.some(a => a.street && a.city)) score += 10

    // Contact form
    if (data.contactForm) score += 5

    return Math.min(score, 100)
  }
}