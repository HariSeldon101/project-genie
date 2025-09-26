/**
 * Data extractor interface for separation of concerns
 *
 * @module scrapers-v2/extractors/extractor.interface
 * @description Defines contract for data extraction from HTML/DOM.
 * Extractors are responsible for finding and extracting specific
 * types of data from parsed HTML, keeping this logic separate
 * from the scraping mechanics.
 *
 * DESIGN PRINCIPLE:
 * - Single Responsibility: Each extractor handles one data type
 * - Pure Functions: Extraction logic has no side effects
 * - Composability: Extractors can be combined and reused
 * - Testability: Easy to test with mock HTML
 *
 * COMPLIANCE:
 * - No database access
 * - No network requests
 * - Pure transformation logic only
 */

import type { CheerioAPI } from 'cheerio'
import type { Url } from '../core/types'

/**
 * Generic data extractor interface
 * @template T The type of data being extracted
 *
 * RESPONSIBILITIES:
 * - Extract specific data type from HTML
 * - Validate extracted data
 * - Calculate confidence scores
 * - Provide extraction metadata
 */
export interface IDataExtractor<T> {
  /**
   * Extract data from Cheerio-loaded HTML
   *
   * @param $ - Cheerio instance with loaded HTML
   * @param url - Source URL for context
   * @returns Extracted data or undefined if not found
   *
   * CONTRACT:
   * - Must be pure function (no side effects)
   * - Must handle malformed HTML gracefully
   * - Should extract as much data as possible
   * - Returns undefined if no valid data found
   */
  extract($: CheerioAPI, url: Url): T | undefined

  /**
   * Validate extracted data
   * Ensures data meets minimum quality standards
   *
   * @param data - Data to validate
   * @returns True if data is valid and complete enough
   *
   * CONTRACT:
   * - Must check required fields
   * - Should validate data formats
   * - Returns false for insufficient data
   */
  validate(data: T): boolean

  /**
   * Get extraction confidence score
   * Indicates how confident we are in the extracted data
   *
   * @param data - Extracted data
   * @returns Confidence score 0-100
   *
   * CONTRACT:
   * - 0 = No confidence (shouldn't extract)
   * - 50 = Moderate confidence
   * - 100 = High confidence (all signals present)
   */
  getConfidence(data: T): number
}

/**
 * Result type for extraction with metadata
 * Provides additional context about the extraction
 */
export interface ExtractionResult<T> {
  /**
   * Extracted data (undefined if extraction failed)
   */
  data: T | undefined

  /**
   * Confidence score (0-100)
   */
  confidence: number

  /**
   * Source of the extracted data
   */
  source: ExtractionSource

  /**
   * Any errors encountered during extraction
   */
  errors: string[]

  /**
   * Extraction timestamp
   */
  timestamp: Date

  /**
   * Additional metadata specific to the extraction
   */
  metadata?: Record<string, any>
}

/**
 * Source of extracted data
 * Helps understand where data came from
 */
export enum ExtractionSource {
  /**
   * Data from meta tags (og:, twitter:, etc.)
   */
  META = 'meta',

  /**
   * Data from structured data (JSON-LD, microdata)
   */
  STRUCTURED_DATA = 'structured-data',

  /**
   * Data from page content (text, headings, etc.)
   */
  CONTENT = 'content',

  /**
   * Data inferred from patterns/context
   */
  INFERENCE = 'inference',

  /**
   * Data from multiple sources combined
   */
  MIXED = 'mixed'
}

/**
 * Base abstract class for extractors
 * Provides common functionality
 */
export abstract class BaseExtractor<T> implements IDataExtractor<T> {
  /**
   * Extract data from HTML
   */
  abstract extract($: CheerioAPI, url: Url): T | undefined

  /**
   * Validate extracted data
   * Default implementation checks for non-null
   */
  validate(data: T): boolean {
    return data !== null && data !== undefined
  }

  /**
   * Calculate confidence score
   * Default implementation returns 50 (moderate)
   */
  getConfidence(data: T): number {
    if (!data) return 0
    return 50
  }

  /**
   * Extract with full result metadata
   *
   * @param $ - Cheerio instance
   * @param url - Source URL
   * @returns Full extraction result with metadata
   */
  extractWithMetadata($: CheerioAPI, url: Url): ExtractionResult<T> {
    const errors: string[] = []
    let data: T | undefined
    let source = ExtractionSource.CONTENT

    try {
      data = this.extract($, url)

      if (data && !this.validate(data)) {
        errors.push('Data validation failed')
        data = undefined
      }
    } catch (error) {
      errors.push((error as Error).message)
    }

    return {
      data,
      confidence: data ? this.getConfidence(data) : 0,
      source,
      errors,
      timestamp: new Date()
    }
  }

  /**
   * Helper: Clean text content
   * Removes extra whitespace and newlines
   *
   * @param text - Text to clean
   * @returns Cleaned text
   */
  protected cleanText(text: string | undefined): string | undefined {
    if (!text) return undefined

    return text
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
      .trim()
  }

  /**
   * Helper: Extract meta tag content
   *
   * @param $ - Cheerio instance
   * @param name - Meta tag name or property
   * @returns Content value or undefined
   */
  protected getMetaContent($: CheerioAPI, name: string): string | undefined {
    // Try property first (og:, twitter:)
    let content = $(`meta[property="${name}"]`).attr('content')

    // Try name if property didn't work
    if (!content) {
      content = $(`meta[name="${name}"]`).attr('content')
    }

    return this.cleanText(content)
  }

  /**
   * Helper: Extract JSON-LD structured data
   *
   * @param $ - Cheerio instance
   * @param type - Schema.org type to look for
   * @returns Parsed JSON-LD data or undefined
   */
  protected getJsonLd($: CheerioAPI, type?: string): any {
    const scripts = $('script[type="application/ld+json"]')

    for (let i = 0; i < scripts.length; i++) {
      const script = scripts.eq(i)
      const text = script.text()

      if (!text) continue

      try {
        const data = JSON.parse(text)

        // If no type specified, return first valid JSON-LD
        if (!type) return data

        // Check if data matches requested type
        if (data['@type'] === type) {
          return data
        }

        // Check array of objects
        if (Array.isArray(data)) {
          const found = data.find(item => item['@type'] === type)
          if (found) return found
        }

        // Check @graph
        if (data['@graph'] && Array.isArray(data['@graph'])) {
          const found = data['@graph'].find((item: any) => item['@type'] === type)
          if (found) return found
        }
      } catch {
        // Invalid JSON, continue to next script
        continue
      }
    }

    return undefined
  }

  /**
   * Helper: Extract text from selector
   *
   * @param $ - Cheerio instance
   * @param selector - CSS selector
   * @returns Text content or undefined
   */
  protected getText($: CheerioAPI, selector: string): string | undefined {
    const element = $(selector).first()
    if (!element.length) return undefined
    return this.cleanText(element.text())
  }

  /**
   * Helper: Extract attribute from selector
   *
   * @param $ - Cheerio instance
   * @param selector - CSS selector
   * @param attribute - Attribute name
   * @returns Attribute value or undefined
   */
  protected getAttribute(
    $: CheerioAPI,
    selector: string,
    attribute: string
  ): string | undefined {
    const element = $(selector).first()
    if (!element.length) return undefined
    return element.attr(attribute)
  }

  /**
   * Helper: Extract all matching texts
   *
   * @param $ - Cheerio instance
   * @param selector - CSS selector
   * @returns Array of text contents
   */
  protected getAllTexts($: CheerioAPI, selector: string): string[] {
    const texts: string[] = []

    $(selector).each((_, element) => {
      const text = this.cleanText($(element).text())
      if (text) {
        texts.push(text)
      }
    })

    return texts
  }

  /**
   * Helper: Check if element exists
   *
   * @param $ - Cheerio instance
   * @param selector - CSS selector
   * @returns True if element exists
   */
  protected exists($: CheerioAPI, selector: string): boolean {
    return $(selector).length > 0
  }

  /**
   * Helper: Extract email addresses from text
   *
   * @param text - Text to search
   * @returns Array of email addresses
   */
  protected extractEmails(text: string): string[] {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
    const matches = text.match(emailRegex) || []
    return [...new Set(matches)] // Remove duplicates
  }

  /**
   * Helper: Extract phone numbers from text
   *
   * @param text - Text to search
   * @returns Array of phone numbers
   */
  protected extractPhones(text: string): string[] {
    // Common phone patterns
    const phoneRegex = /[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,5}[-\s\.]?[0-9]{1,5}/g
    const matches = text.match(phoneRegex) || []

    // Filter out too short numbers
    return matches
      .filter(phone => phone.replace(/\D/g, '').length >= 7)
      .map(phone => phone.trim())
  }

  /**
   * Helper: Extract URLs from text or attributes
   *
   * @param text - Text to search
   * @returns Array of URLs
   */
  protected extractUrls(text: string): string[] {
    const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g
    const matches = text.match(urlRegex) || []
    return [...new Set(matches)]
  }
}