/**
 * Contact Information Extractor
 *
 * Extracts contact information from HTML pages including:
 * - Email addresses
 * - Phone numbers
 * - Physical addresses
 * - Contact forms
 * - Business hours
 *
 * @module extractors/contact-extractor
 */

import * as cheerio from 'cheerio'
import { permanentLogger } from '@/lib/utils/permanent-logger'

/**
 * Extracted contact information
 */
export interface ExtractedContact {
  emails: Array<{
    email: string
    context?: string
    type?: 'general' | 'support' | 'sales' | 'info'
  }>
  phones: Array<{
    number: string
    formatted?: string
    type?: 'main' | 'mobile' | 'fax' | 'support'
    country?: string
  }>
  addresses: Array<{
    full: string
    street?: string
    city?: string
    state?: string
    postalCode?: string
    country?: string
    type?: 'headquarters' | 'office' | 'mailing'
  }>
  businessHours?: Array<{
    day: string
    open?: string
    close?: string
    closed?: boolean
  }>
  contactForms: Array<{
    action?: string
    method?: string
    fields: string[]
  }>
}

/**
 * Regular expressions for contact extraction
 */
const PATTERNS = {
  email: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
  phone: {
    international: /(?:\+?[1-9]\d{0,3}[\s.-]?)?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{1,9}/g,
    us: /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
    uk: /(?:\+?44[\s.-]?)?(?:\(?\d{2,5}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}/g
  },
  postalCode: {
    us: /\b\d{5}(?:-\d{4})?\b/g,
    uk: /\b[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}\b/gi,
    canada: /\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/gi
  }
}

/**
 * Extracts contact information from HTML
 */
export class ContactExtractor {
  /**
   * Extract contact information from HTML
   */
  extract(html: string, url?: string): ExtractedContact {
    const timer = permanentLogger.timing('contact_extraction')

    try {
      const $ = cheerio.load(html)
      const text = $('body').text()

      const contact: ExtractedContact = {
        emails: this.extractEmails($, text),
        phones: this.extractPhones($, text),
        addresses: this.extractAddresses($),
        businessHours: this.extractBusinessHours($),
        contactForms: this.extractContactForms($)
      }

      timer.stop()

      permanentLogger.breadcrumb('contact_extracted', 'Contact extraction complete', {
        url,
        emailCount: contact.emails.length,
        phoneCount: contact.phones.length,
        addressCount: contact.addresses.length
      })

      return contact
    } catch (error) {
      timer.stop()
      permanentLogger.captureError('CONTACT_EXTRACTOR', error as Error, {
        url,
        phase: 'extraction'
      })
      throw error
    }
  }

  /**
   * Extract email addresses
   */
  private extractEmails(
    $: cheerio.CheerioAPI,
    text: string
  ): ExtractedContact['emails'] {
    const emails: ExtractedContact['emails'] = []
    const seen = new Set<string>()

    // Extract from mailto links
    $('a[href^="mailto:"]').each((_, el) => {
      const href = $(el).attr('href')
      if (href) {
        const email = href.replace('mailto:', '').split('?')[0].toLowerCase()
        if (this.isValidEmail(email) && !seen.has(email)) {
          seen.add(email)
          emails.push({
            email,
            context: $(el).text().trim(),
            type: this.classifyEmailType(email)
          })
        }
      }
    })

    // Extract from text using regex
    const matches = text.match(PATTERNS.email) || []
    for (const match of matches) {
      const email = match.toLowerCase()
      if (this.isValidEmail(email) && !seen.has(email)) {
        seen.add(email)
        emails.push({
          email,
          type: this.classifyEmailType(email)
        })
      }
    }

    // Look for structured data
    $('[itemtype*="schema.org"] [itemprop="email"]').each((_, el) => {
      const email = $(el).text().trim().toLowerCase()
      if (this.isValidEmail(email) && !seen.has(email)) {
        seen.add(email)
        emails.push({
          email,
          context: 'structured data',
          type: this.classifyEmailType(email)
        })
      }
    })

    return emails
  }

  /**
   * Extract phone numbers
   */
  private extractPhones(
    $: cheerio.CheerioAPI,
    text: string
  ): ExtractedContact['phones'] {
    const phones: ExtractedContact['phones'] = []
    const seen = new Set<string>()

    // Extract from tel links
    $('a[href^="tel:"]').each((_, el) => {
      const href = $(el).attr('href')
      if (href) {
        const number = href.replace('tel:', '').trim()
        const normalized = this.normalizePhone(number)
        if (normalized && !seen.has(normalized)) {
          seen.add(normalized)
          phones.push({
            number: normalized,
            formatted: $(el).text().trim(),
            type: this.classifyPhoneType($(el).text())
          })
        }
      }
    })

    // Extract from text using regex
    const matches = text.match(PATTERNS.phone.international) || []
    for (const match of matches) {
      const normalized = this.normalizePhone(match)
      if (normalized && normalized.length >= 10 && !seen.has(normalized)) {
        seen.add(normalized)
        phones.push({
          number: normalized,
          formatted: match.trim()
        })
      }
    }

    // Look for structured data
    $('[itemtype*="schema.org"] [itemprop="telephone"]').each((_, el) => {
      const phone = $(el).text().trim()
      const normalized = this.normalizePhone(phone)
      if (normalized && !seen.has(normalized)) {
        seen.add(normalized)
        phones.push({
          number: normalized,
          formatted: phone,
          type: 'main'
        })
      }
    })

    return phones
  }

  /**
   * Extract physical addresses
   */
  private extractAddresses($: cheerio.CheerioAPI): ExtractedContact['addresses'] {
    const addresses: ExtractedContact['addresses'] = []
    const seen = new Set<string>()

    // Look for address microdata
    $('[itemtype*="PostalAddress"], [itemtype*="Place"]').each((_, el) => {
      const $addr = $(el)
      const street = $addr.find('[itemprop="streetAddress"]').text().trim()
      const city = $addr.find('[itemprop="addressLocality"]').text().trim()
      const state = $addr.find('[itemprop="addressRegion"]').text().trim()
      const postalCode = $addr.find('[itemprop="postalCode"]').text().trim()
      const country = $addr.find('[itemprop="addressCountry"]').text().trim()

      const full = [street, city, state, postalCode, country]
        .filter(Boolean)
        .join(', ')

      if (full && !seen.has(full)) {
        seen.add(full)
        addresses.push({
          full,
          street,
          city,
          state,
          postalCode,
          country,
          type: 'office'
        })
      }
    })

    // Look for common address containers
    const addressSelectors = [
      '.address',
      '.location',
      '.contact-address',
      '[class*="address"]',
      'address'
    ]

    for (const selector of addressSelectors) {
      $(selector).each((_, el) => {
        const text = $(el).text().trim()
        if (text && text.length > 10 && text.length < 500 && !seen.has(text)) {
          // Check if it looks like an address
          if (this.looksLikeAddress(text)) {
            seen.add(text)
            addresses.push({
              full: text,
              ...this.parseAddress(text)
            })
          }
        }
      })
    }

    return addresses
  }

  /**
   * Extract business hours
   */
  private extractBusinessHours($: cheerio.CheerioAPI): ExtractedContact['businessHours'] {
    const hours: ExtractedContact['businessHours'] = []
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

    // Look for opening hours microdata
    $('[itemtype*="OpeningHoursSpecification"]').each((_, el) => {
      const $spec = $(el)
      const dayOfWeek = $spec.find('[itemprop="dayOfWeek"]').text().trim()
      const opens = $spec.find('[itemprop="opens"]').text().trim()
      const closes = $spec.find('[itemprop="closes"]').text().trim()

      if (dayOfWeek) {
        hours.push({
          day: dayOfWeek,
          open: opens,
          close: closes
        })
      }
    })

    // Look for common patterns
    const hoursText = $('.hours, .business-hours, [class*="hours"]').text()
    if (hoursText) {
      for (const day of days) {
        const pattern = new RegExp(`${day}[:\\s]+([\\d:apm\\s-]+)`, 'i')
        const match = hoursText.match(pattern)
        if (match) {
          const times = this.parseTimeRange(match[1])
          hours.push({
            day: day.charAt(0).toUpperCase() + day.slice(1),
            ...times
          })
        }
      }
    }

    return hours.length > 0 ? hours : undefined
  }

  /**
   * Extract contact forms
   */
  private extractContactForms($: cheerio.CheerioAPI): ExtractedContact['contactForms'] {
    const forms: ExtractedContact['contactForms'] = []

    $('form').each((_, el) => {
      const $form = $(el)
      const action = $form.attr('action')
      const method = $form.attr('method')

      // Check if it's likely a contact form
      const formText = $form.text().toLowerCase()
      const isContactForm = formText.includes('contact') ||
                            formText.includes('email') ||
                            formText.includes('message') ||
                            formText.includes('inquiry')

      if (isContactForm) {
        const fields: string[] = []

        // Extract form fields
        $form.find('input[name], textarea[name], select[name]').each((_, field) => {
          const name = $(field).attr('name')
          if (name && !fields.includes(name)) {
            fields.push(name)
          }
        })

        forms.push({
          action,
          method: method?.toUpperCase(),
          fields
        })
      }
    })

    return forms
  }

  /**
   * Validate email address
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email) && !email.includes('..')
  }

  /**
   * Classify email type
   */
  private classifyEmailType(email: string): ExtractedContact['emails'][0]['type'] {
    const lower = email.toLowerCase()
    if (lower.includes('support')) return 'support'
    if (lower.includes('sales')) return 'sales'
    if (lower.includes('info')) return 'info'
    return 'general'
  }

  /**
   * Normalize phone number
   */
  private normalizePhone(phone: string): string {
    return phone.replace(/[^\d+]/g, '')
  }

  /**
   * Classify phone type
   */
  private classifyPhoneType(context: string): ExtractedContact['phones'][0]['type'] {
    const lower = context.toLowerCase()
    if (lower.includes('fax')) return 'fax'
    if (lower.includes('mobile') || lower.includes('cell')) return 'mobile'
    if (lower.includes('support')) return 'support'
    return 'main'
  }

  /**
   * Check if text looks like an address
   */
  private looksLikeAddress(text: string): boolean {
    // Check for common address indicators
    const indicators = [
      /\d+\s+\w+\s+(street|st|avenue|ave|road|rd|lane|ln|drive|dr|boulevard|blvd)/i,
      /\b(suite|ste|floor|fl|unit|apt)\s*#?\s*\d+/i,
      /\b\d{5}(?:-\d{4})?\b/, // US ZIP
      /\b[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}\b/i // UK postcode
    ]

    return indicators.some(pattern => pattern.test(text))
  }

  /**
   * Parse address components
   */
  private parseAddress(text: string): Partial<ExtractedContact['addresses'][0]> {
    const parsed: Partial<ExtractedContact['addresses'][0]> = {}

    // Try to extract postal code
    const zipMatch = text.match(/\b(\d{5}(?:-\d{4})?)\b/)
    if (zipMatch) {
      parsed.postalCode = zipMatch[1]
    }

    // Try to extract state (US)
    const stateMatch = text.match(/\b([A-Z]{2})\b/)
    if (stateMatch) {
      parsed.state = stateMatch[1]
    }

    return parsed
  }

  /**
   * Parse time range
   */
  private parseTimeRange(text: string): { open?: string; close?: string; closed?: boolean } {
    const lower = text.toLowerCase()

    if (lower.includes('closed')) {
      return { closed: true }
    }

    const timePattern = /(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/gi
    const times = text.match(timePattern)

    if (times && times.length >= 2) {
      return {
        open: times[0].trim(),
        close: times[1].trim()
      }
    }

    return {}
  }
}