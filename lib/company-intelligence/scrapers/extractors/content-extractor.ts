/**
 * Content Extractor
 *
 * Extracts main content from HTML pages including:
 * - Page title
 * - Main text content
 * - Headings hierarchy
 * - Images and media
 * - Internal/external links
 *
 * @module extractors/content-extractor
 */

import * as cheerio from 'cheerio'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { decodeHtmlEntities } from '@/lib/utils/html-decoder'

/**
 * Extracted content structure
 */
export interface ExtractedContent {
  title?: string
  description?: string
  headings: {
    h1: string[]
    h2: string[]
    h3: string[]
  }
  mainContent?: string
  paragraphs: string[]
  images: Array<{
    src: string
    alt?: string
    title?: string
  }>
  links: Array<{
    href: string
    text: string
    isExternal: boolean
  }>
  lists: {
    ordered: string[][]
    unordered: string[][]
  }
  tables: Array<{
    headers: string[]
    rows: string[][]
  }>
}

/**
 * Options for content extraction
 */
export interface ContentExtractorOptions {
  maxTextLength?: number
  includeImages?: boolean
  includeLinks?: boolean
  includeTables?: boolean
  baseUrl?: string
}

/**
 * Extracts main content from HTML
 */
export class ContentExtractor {
  private readonly options: Required<ContentExtractorOptions>

  constructor(options: ContentExtractorOptions = {}) {
    this.options = {
      maxTextLength: options.maxTextLength ?? 50000,
      includeImages: options.includeImages ?? true,
      includeLinks: options.includeLinks ?? true,
      includeTables: options.includeTables ?? true,
      baseUrl: options.baseUrl ?? ''
    }
  }

  /**
   * Extract content from HTML string
   */
  extract(html: string, url?: string): ExtractedContent {
    const timer = permanentLogger.timing('content_extraction')

    try {
      const $ = cheerio.load(html)
      const baseUrl = url || this.options.baseUrl

      // Remove script and style elements
      $('script, style, noscript').remove()

      const content: ExtractedContent = {
        title: this.extractTitle($),
        description: this.extractDescription($),
        headings: this.extractHeadings($),
        mainContent: this.extractMainContent($),
        paragraphs: this.extractParagraphs($),
        images: this.options.includeImages ? this.extractImages($, baseUrl) : [],
        links: this.options.includeLinks ? this.extractLinks($, baseUrl) : [],
        lists: this.extractLists($),
        tables: this.options.includeTables ? this.extractTables($) : []
      }

      const extractedSize = JSON.stringify(content).length
      timer.stop()

      permanentLogger.breadcrumb('content_extracted', 'Content extraction complete', {
        url,
        titleFound: !!content.title,
        paragraphCount: content.paragraphs.length,
        imageCount: content.images.length,
        linkCount: content.links.length,
        extractedSize
      })

      return content
    } catch (error) {
      timer.stop()
      permanentLogger.captureError('CONTENT_EXTRACTOR', error as Error, {
        url,
        phase: 'extraction'
      })
      throw error
    }
  }

  /**
   * Extract page title
   */
  private extractTitle($: cheerio.CheerioAPI): string | undefined {
    // Try multiple sources for title
    const title = $('title').text().trim() ||
                  $('meta[property="og:title"]').attr('content') ||
                  $('meta[name="twitter:title"]').attr('content') ||
                  $('h1').first().text().trim()

    return title ? htmlDecoder.decode(title) : undefined
  }

  /**
   * Extract page description
   */
  private extractDescription($: cheerio.CheerioAPI): string | undefined {
    const description = $('meta[name="description"]').attr('content') ||
                       $('meta[property="og:description"]').attr('content') ||
                       $('meta[name="twitter:description"]').attr('content')

    return description ? htmlDecoder.decode(description) : undefined
  }

  /**
   * Extract headings hierarchy
   */
  private extractHeadings($: cheerio.CheerioAPI): ExtractedContent['headings'] {
    const headings = {
      h1: [] as string[],
      h2: [] as string[],
      h3: [] as string[]
    }

    $('h1').each((_, el) => {
      const text = $(el).text().trim()
      if (text) headings.h1.push(htmlDecoder.decode(text))
    })

    $('h2').each((_, el) => {
      const text = $(el).text().trim()
      if (text) headings.h2.push(htmlDecoder.decode(text))
    })

    $('h3').each((_, el) => {
      const text = $(el).text().trim()
      if (text) headings.h3.push(htmlDecoder.decode(text))
    })

    return headings
  }

  /**
   * Extract main content area
   */
  private extractMainContent($: cheerio.CheerioAPI): string | undefined {
    // Look for main content areas
    const contentSelectors = [
      'main',
      'article',
      '[role="main"]',
      '#content',
      '.content',
      '#main',
      '.main'
    ]

    for (const selector of contentSelectors) {
      const content = $(selector).first()
      if (content.length) {
        const text = content.text().trim()
        if (text.length > 100) { // Minimum content length
          const decoded = htmlDecoder.decode(text)
          return decoded.substring(0, this.options.maxTextLength)
        }
      }
    }

    // Fallback to body text
    const bodyText = $('body').text().trim()
    if (bodyText) {
      const decoded = htmlDecoder.decode(bodyText)
      return decoded.substring(0, this.options.maxTextLength)
    }

    return undefined
  }

  /**
   * Extract paragraphs
   */
  private extractParagraphs($: cheerio.CheerioAPI): string[] {
    const paragraphs: string[] = []

    $('p').each((_, el) => {
      const text = $(el).text().trim()
      if (text && text.length > 20) { // Minimum paragraph length
        paragraphs.push(htmlDecoder.decode(text))
      }
    })

    return paragraphs
  }

  /**
   * Extract images
   */
  private extractImages(
    $: cheerio.CheerioAPI,
    baseUrl: string
  ): ExtractedContent['images'] {
    const images: ExtractedContent['images'] = []

    $('img').each((_, el) => {
      const $img = $(el)
      const src = $img.attr('src')

      if (src) {
        const absoluteSrc = this.makeAbsoluteUrl(src, baseUrl)
        images.push({
          src: absoluteSrc,
          alt: $img.attr('alt'),
          title: $img.attr('title')
        })
      }
    })

    return images
  }

  /**
   * Extract links
   */
  private extractLinks(
    $: cheerio.CheerioAPI,
    baseUrl: string
  ): ExtractedContent['links'] {
    const links: ExtractedContent['links'] = []
    const seen = new Set<string>()

    $('a[href]').each((_, el) => {
      const $link = $(el)
      const href = $link.attr('href')
      const text = $link.text().trim()

      if (href && !seen.has(href)) {
        seen.add(href)
        const absoluteHref = this.makeAbsoluteUrl(href, baseUrl)
        const isExternal = this.isExternalUrl(absoluteHref, baseUrl)

        links.push({
          href: absoluteHref,
          text: text ? htmlDecoder.decode(text) : '',
          isExternal
        })
      }
    })

    return links
  }

  /**
   * Extract lists
   */
  private extractLists($: cheerio.CheerioAPI): ExtractedContent['lists'] {
    const lists = {
      ordered: [] as string[][],
      unordered: [] as string[][]
    }

    // Extract ordered lists
    $('ol').each((_, ol) => {
      const items: string[] = []
      $(ol).find('> li').each((_, li) => {
        const text = $(li).text().trim()
        if (text) items.push(htmlDecoder.decode(text))
      })
      if (items.length > 0) {
        lists.ordered.push(items)
      }
    })

    // Extract unordered lists
    $('ul').each((_, ul) => {
      const items: string[] = []
      $(ul).find('> li').each((_, li) => {
        const text = $(li).text().trim()
        if (text) items.push(htmlDecoder.decode(text))
      })
      if (items.length > 0) {
        lists.unordered.push(items)
      }
    })

    return lists
  }

  /**
   * Extract tables
   */
  private extractTables($: cheerio.CheerioAPI): ExtractedContent['tables'] {
    const tables: ExtractedContent['tables'] = []

    $('table').each((_, table) => {
      const $table = $(table)
      const headers: string[] = []
      const rows: string[][] = []

      // Extract headers
      $table.find('thead th, thead td').each((_, cell) => {
        const text = $(cell).text().trim()
        headers.push(text ? htmlDecoder.decode(text) : '')
      })

      // If no thead, try first row
      if (headers.length === 0) {
        $table.find('tr').first().find('th, td').each((_, cell) => {
          const text = $(cell).text().trim()
          headers.push(text ? htmlDecoder.decode(text) : '')
        })
      }

      // Extract rows
      const startRow = headers.length > 0 ? 1 : 0
      $table.find('tr').slice(startRow).each((_, row) => {
        const cells: string[] = []
        $(row).find('td, th').each((_, cell) => {
          const text = $(cell).text().trim()
          cells.push(text ? htmlDecoder.decode(text) : '')
        })
        if (cells.length > 0) {
          rows.push(cells)
        }
      })

      if (headers.length > 0 || rows.length > 0) {
        tables.push({ headers, rows })
      }
    })

    return tables
  }

  /**
   * Make URL absolute
   */
  private makeAbsoluteUrl(url: string, baseUrl: string): string {
    if (!url || !baseUrl) return url

    try {
      // Already absolute
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url
      }

      // Protocol-relative
      if (url.startsWith('//')) {
        return 'https:' + url
      }

      // Relative URL
      const base = new URL(baseUrl)
      const absolute = new URL(url, base)
      return absolute.href
    } catch {
      return url
    }
  }

  /**
   * Check if URL is external
   */
  private isExternalUrl(url: string, baseUrl: string): boolean {
    if (!baseUrl) return false

    try {
      const urlObj = new URL(url)
      const baseObj = new URL(baseUrl)
      return urlObj.hostname !== baseObj.hostname
    } catch {
      return false
    }
  }
}