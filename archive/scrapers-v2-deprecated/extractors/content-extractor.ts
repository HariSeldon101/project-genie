/**
 * Extracts page content structure from HTML
 *
 * @module scrapers-v2/extractors/content-extractor
 * @description Extracts structured content including titles, descriptions,
 * headings, paragraphs, and images. Focuses on main content areas while
 * filtering out navigation, ads, and other non-content elements.
 *
 * EXTRACTION STRATEGY:
 * - Identify main content area (article, main, content divs)
 * - Build heading hierarchy for document structure
 * - Extract meaningful paragraphs (skip boilerplate)
 * - Capture images with metadata
 * - Filter out navigation, footer, sidebar content
 *
 * COMPLIANCE:
 * - Pure extraction logic
 * - No external dependencies
 * - Content quality scoring
 */

import type { CheerioAPI } from 'cheerio'
import type { ContentData, ImageData } from '@/lib/company-intelligence/types/scraping-interfaces'
import type { Url } from '../core/types'
import { BaseExtractor } from './extractor.interface'
import { permanentLogger } from '@/lib/utils/permanent-logger'

/**
 * Selectors for main content areas
 * Ordered by specificity and likelihood
 */
const CONTENT_SELECTORS = [
  'article',
  'main',
  '[role="main"]',
  '.main-content',
  '#main-content',
  '.content',
  '#content',
  '.post-content',
  '.entry-content',
  '.page-content',
  '.article-body',
  '.article-content',
  '.story-body'
]

/**
 * Selectors to exclude from content extraction
 * These typically contain non-content elements
 */
const EXCLUDE_SELECTORS = [
  'nav',
  'header',
  'footer',
  'aside',
  '.sidebar',
  '.navigation',
  '.menu',
  '.ad',
  '.advertisement',
  '.banner',
  '.popup',
  '.modal',
  '.cookie',
  '.newsletter',
  'script',
  'style',
  'noscript'
]

/**
 * Minimum text length for meaningful content
 */
const MIN_PARAGRAPH_LENGTH = 20
const MIN_TITLE_LENGTH = 3
const MAX_TITLE_LENGTH = 200

/**
 * Extracts structured content from HTML
 */
export class ContentExtractor extends BaseExtractor<ContentData> {
  /**
   * Extract content data from HTML
   */
  extract($: CheerioAPI, url: Url): ContentData | undefined {
    try {
      // Extract all content pieces
      const titles = this.extractTitles($)
      const descriptions = this.extractDescriptions($)
      const headings = this.extractHeadings($)
      const paragraphs = this.extractParagraphs($)
      const images = this.extractImages($, url)

      // Check if we have any meaningful content
      if (
        titles.length === 0 &&
        paragraphs.length === 0 &&
        images.length === 0 &&
        Object.keys(headings).length === 0
      ) {
        permanentLogger.debug('CONTENT_EXTRACTOR', 'No meaningful content found', { url })
        return undefined
      }

      const contentData: ContentData = {
        titles,
        descriptions,
        headings,
        paragraphs,
        images
      }

      permanentLogger.debug('CONTENT_EXTRACTOR', 'Content extracted', {
        url,
        titleCount: titles.length,
        paragraphCount: paragraphs.length,
        imageCount: images.length,
        headingLevels: Object.keys(headings).length
      })

      return contentData

    } catch (error) {
      permanentLogger.captureError('CONTENT_EXTRACTOR', error as Error, { url })
      return undefined
    }
  }

  /**
   * Extract page titles
   */
  private extractTitles($: CheerioAPI): string[] {
    const titles: string[] = []

    // Primary title from title tag
    const titleTag = this.getText($, 'title')
    if (titleTag && this.isValidTitle(titleTag)) {
      titles.push(titleTag)
    }

    // OG title
    const ogTitle = this.getMetaContent($, 'og:title')
    if (ogTitle && this.isValidTitle(ogTitle) && !titles.includes(ogTitle)) {
      titles.push(ogTitle)
    }

    // Twitter title
    const twitterTitle = this.getMetaContent($, 'twitter:title')
    if (twitterTitle && this.isValidTitle(twitterTitle) && !titles.includes(twitterTitle)) {
      titles.push(twitterTitle)
    }

    // H1 as potential title
    const h1 = this.getText($, 'h1')
    if (h1 && this.isValidTitle(h1) && !titles.includes(h1)) {
      titles.push(h1)
    }

    return titles
  }

  /**
   * Extract descriptions
   */
  private extractDescriptions($: CheerioAPI): string[] {
    const descriptions: string[] = []

    // Meta description
    const metaDesc = this.getMetaContent($, 'description')
    if (metaDesc && metaDesc.length > MIN_PARAGRAPH_LENGTH) {
      descriptions.push(metaDesc)
    }

    // OG description
    const ogDesc = this.getMetaContent($, 'og:description')
    if (ogDesc && ogDesc.length > MIN_PARAGRAPH_LENGTH && !descriptions.includes(ogDesc)) {
      descriptions.push(ogDesc)
    }

    // Twitter description
    const twitterDesc = this.getMetaContent($, 'twitter:description')
    if (twitterDesc && twitterDesc.length > MIN_PARAGRAPH_LENGTH && !descriptions.includes(twitterDesc)) {
      descriptions.push(twitterDesc)
    }

    // Schema.org description
    const jsonLd = this.getJsonLd($)
    if (jsonLd?.description && !descriptions.includes(jsonLd.description)) {
      descriptions.push(this.cleanText(jsonLd.description) || '')
    }

    return descriptions.filter(d => d.length > 0)
  }

  /**
   * Extract heading hierarchy
   */
  private extractHeadings($: CheerioAPI): Record<string, string[]> {
    const headings: Record<string, string[]> = {}

    // Find main content area
    const mainContent = this.findMainContent($)

    // Extract headings h1-h6
    for (let level = 1; level <= 6; level++) {
      const selector = `h${level}`
      const levelHeadings: string[] = []

      const elements = mainContent ? mainContent.find(selector) : $(selector)

      elements.each((_, element) => {
        const text = this.cleanText($(element).text())
        if (text && text.length >= MIN_TITLE_LENGTH && text.length <= MAX_TITLE_LENGTH) {
          levelHeadings.push(text)
        }
      })

      if (levelHeadings.length > 0) {
        headings[selector] = levelHeadings
      }
    }

    return headings
  }

  /**
   * Extract meaningful paragraphs
   */
  private extractParagraphs($: CheerioAPI): string[] {
    const paragraphs: string[] = []
    const seen = new Set<string>()

    // Find main content area
    const mainContent = this.findMainContent($)

    // Get paragraphs from main content or fallback to all
    const elements = mainContent ? mainContent.find('p') : $('p')

    elements.each((_, element) => {
      const $element = $(element)

      // Skip if within excluded area
      if (this.isInExcludedArea($element)) return

      const text = this.cleanText($element.text())

      // Validate paragraph
      if (text && text.length >= MIN_PARAGRAPH_LENGTH && !seen.has(text)) {
        // Skip common boilerplate patterns
        if (this.isBoilerplate(text)) return

        paragraphs.push(text)
        seen.add(text)

        // Limit to reasonable number of paragraphs
        if (paragraphs.length >= 20) return false
      }
    })

    return paragraphs
  }

  /**
   * Extract images with metadata
   */
  private extractImages($: CheerioAPI, baseUrl: Url): ImageData[] {
    const images: ImageData[] = []
    const seen = new Set<string>()

    // Find main content area
    const mainContent = this.findMainContent($)
    const elements = mainContent ? mainContent.find('img') : $('img')

    elements.each((_, element) => {
      const $img = $(element)

      // Skip if in excluded area
      if (this.isInExcludedArea($img)) return

      const src = $img.attr('src')
      if (!src || seen.has(src)) return

      // Skip tracking pixels and tiny images
      const width = parseInt($img.attr('width') || '0')
      const height = parseInt($img.attr('height') || '0')
      if ((width > 0 && width < 10) || (height > 0 && height < 10)) return

      // Build absolute URL
      const imageUrl = this.makeAbsoluteUrl(src, baseUrl)
      if (!imageUrl) return

      // Skip common non-content images
      if (this.isNonContentImage(imageUrl)) return

      const imageData: ImageData = {
        url: imageUrl,
        alt: this.cleanText($img.attr('alt')),
        caption: this.findImageCaption($img, $),
        width: width || undefined,
        height: height || undefined
      }

      images.push(imageData)
      seen.add(src)

      // Limit to reasonable number of images
      if (images.length >= 50) return false
    })

    return images
  }

  /**
   * Find main content area
   */
  private findMainContent($: CheerioAPI): CheerioAPI | null {
    for (const selector of CONTENT_SELECTORS) {
      const content = $(selector).first()
      if (content.length > 0) {
        return content as any
      }
    }
    return null
  }

  /**
   * Check if element is in excluded area
   */
  private isInExcludedArea($element: any): boolean {
    for (const selector of EXCLUDE_SELECTORS) {
      if ($element.closest(selector).length > 0) {
        return true
      }
    }
    return false
  }

  /**
   * Check if text is boilerplate
   */
  private isBoilerplate(text: string): boolean {
    const boilerplatePatterns = [
      /^copyright/i,
      /^all rights reserved/i,
      /^terms (of|and) /i,
      /^privacy policy/i,
      /^cookie policy/i,
      /^follow us/i,
      /^subscribe/i,
      /^sign up/i,
      /^download our app/i,
      /^view more/i,
      /^read more/i,
      /^click here/i,
      /^loading/i
    ]

    return boilerplatePatterns.some(pattern => pattern.test(text))
  }

  /**
   * Check if title is valid
   */
  private isValidTitle(title: string): boolean {
    if (!title) return false
    const cleaned = this.cleanText(title)
    if (!cleaned) return false
    return cleaned.length >= MIN_TITLE_LENGTH && cleaned.length <= MAX_TITLE_LENGTH
  }

  /**
   * Find image caption
   */
  private findImageCaption($img: any, $: CheerioAPI): string | undefined {
    // Check for figcaption
    const figure = $img.closest('figure')
    if (figure.length > 0) {
      const figcaption = figure.find('figcaption').first()
      if (figcaption.length > 0) {
        return this.cleanText(figcaption.text())
      }
    }

    // Check for title attribute
    const title = $img.attr('title')
    if (title) {
      return this.cleanText(title)
    }

    // Check for adjacent caption elements
    const next = $img.next()
    if (next.length > 0) {
      const tagName = next.prop('tagName')?.toLowerCase()
      if (tagName === 'p' || tagName === 'span' || tagName === 'div') {
        const text = this.cleanText(next.text())
        if (text && text.length < 200) {
          // Likely a caption if it's short
          return text
        }
      }
    }

    return undefined
  }

  /**
   * Make absolute URL
   */
  private makeAbsoluteUrl(src: string, baseUrl: Url): string | null {
    try {
      // Already absolute
      if (src.startsWith('http://') || src.startsWith('https://')) {
        return src
      }

      // Protocol-relative
      if (src.startsWith('//')) {
        return `https:${src}`
      }

      // Data URI or other schemes
      if (src.startsWith('data:') || src.startsWith('javascript:')) {
        return null
      }

      // Relative URL
      const base = new URL(baseUrl)
      return new URL(src, base).href
    } catch {
      return null
    }
  }

  /**
   * Check if image is non-content
   */
  private isNonContentImage(url: string): boolean {
    const nonContentPatterns = [
      /pixel\./i,
      /tracking/i,
      /analytics/i,
      /doubleclick/i,
      /googleadservices/i,
      /facebook\.com\/tr/i,
      /\.gif$/i, // Often tracking pixels
      /1x1/i,
      /spacer/i,
      /blank/i,
      /placeholder/i
    ]

    return nonContentPatterns.some(pattern => pattern.test(url))
  }

  /**
   * Validate content data
   */
  validate(data: ContentData): boolean {
    if (!data) return false

    // Must have some content
    return data.titles.length > 0 ||
           data.paragraphs.length > 0 ||
           data.images.length > 0 ||
           Object.keys(data.headings).length > 0
  }

  /**
   * Get confidence score
   */
  getConfidence(data: ContentData): number {
    if (!data) return 0

    let score = 0

    // Title scoring
    if (data.titles.length > 0) score += 20
    if (data.titles.length > 1) score += 5

    // Description scoring
    if (data.descriptions.length > 0) score += 15
    if (data.descriptions.length > 1) score += 5

    // Heading scoring
    const headingCount = Object.values(data.headings).reduce((sum, h) => sum + h.length, 0)
    if (headingCount > 0) score += Math.min(headingCount * 3, 20)

    // Paragraph scoring
    if (data.paragraphs.length >= 3) score += 15
    if (data.paragraphs.length >= 5) score += 10

    // Image scoring
    if (data.images.length > 0) score += 10
    if (data.images.some(img => img.alt)) score += 5

    return Math.min(score, 100)
  }
}