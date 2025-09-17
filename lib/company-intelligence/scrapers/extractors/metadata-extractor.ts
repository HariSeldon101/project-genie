/**
 * Metadata Extractor
 *
 * Extracts structured metadata from HTML pages including:
 * - Meta tags
 * - JSON-LD structured data
 * - Microdata
 * - Open Graph protocol
 * - Twitter Cards
 * - Dublin Core
 *
 * @module extractors/metadata-extractor
 */

import * as cheerio from 'cheerio'
import { permanentLogger } from '@/lib/utils/permanent-logger'

/**
 * Extracted metadata information
 */
export interface ExtractedMetadata {
  basic: {
    title?: string
    description?: string
    keywords?: string[]
    author?: string
    generator?: string
    robots?: string
    canonical?: string
    language?: string
    viewport?: string
    charset?: string
  }
  openGraph: {
    title?: string
    description?: string
    type?: string
    url?: string
    image?: string
    siteName?: string
    locale?: string
    video?: string
    audio?: string
  }
  twitter: {
    card?: string
    site?: string
    creator?: string
    title?: string
    description?: string
    image?: string
    imageAlt?: string
  }
  dublinCore: {
    title?: string
    creator?: string
    subject?: string
    description?: string
    publisher?: string
    contributor?: string
    date?: string
    type?: string
    format?: string
    identifier?: string
    source?: string
    language?: string
    relation?: string
    coverage?: string
    rights?: string
  }
  jsonLd: Array<Record<string, any>>
  microdata: Array<{
    type: string
    properties: Record<string, any>
  }>
  custom: Record<string, string>
}

/**
 * Extracts metadata from HTML
 */
export class MetadataExtractor {
  /**
   * Extract metadata from HTML
   */
  extract(html: string, url?: string): ExtractedMetadata {
    const timer = permanentLogger.timing('metadata_extraction')

    try {
      const $ = cheerio.load(html)

      const metadata: ExtractedMetadata = {
        basic: this.extractBasicMeta($),
        openGraph: this.extractOpenGraph($),
        twitter: this.extractTwitterCard($),
        dublinCore: this.extractDublinCore($),
        jsonLd: this.extractJsonLd($),
        microdata: this.extractMicrodata($),
        custom: this.extractCustomMeta($)
      }

      timer.stop()

      permanentLogger.breadcrumb('metadata_extracted', 'Metadata extraction complete', {
        url,
        hasJsonLd: metadata.jsonLd.length > 0,
        hasMicrodata: metadata.microdata.length > 0,
        hasOpenGraph: !!metadata.openGraph.title,
        hasTwitter: !!metadata.twitter.card
      })

      return metadata
    } catch (error) {
      timer.stop()
      permanentLogger.captureError('METADATA_EXTRACTOR', error as Error, {
        url,
        phase: 'extraction'
      })
      throw error
    }
  }

  /**
   * Extract basic meta tags
   */
  private extractBasicMeta($: cheerio.CheerioAPI): ExtractedMetadata['basic'] {
    const basic: ExtractedMetadata['basic'] = {}

    // Title
    basic.title = $('title').text().trim() ||
                  $('meta[name="title"]').attr('content')

    // Description
    basic.description = $('meta[name="description"]').attr('content')

    // Keywords
    const keywords = $('meta[name="keywords"]').attr('content')
    if (keywords) {
      basic.keywords = keywords.split(',').map(k => k.trim()).filter(Boolean)
    }

    // Author
    basic.author = $('meta[name="author"]').attr('content')

    // Generator
    basic.generator = $('meta[name="generator"]').attr('content')

    // Robots
    basic.robots = $('meta[name="robots"]').attr('content')

    // Canonical URL
    basic.canonical = $('link[rel="canonical"]').attr('href')

    // Language
    basic.language = $('html').attr('lang') ||
                    $('meta[name="language"]').attr('content') ||
                    $('meta[http-equiv="content-language"]').attr('content')

    // Viewport
    basic.viewport = $('meta[name="viewport"]').attr('content')

    // Charset
    basic.charset = $('meta[charset]').attr('charset') ||
                   $('meta[http-equiv="Content-Type"]').attr('content')?.match(/charset=([^;]+)/)?.[1]

    return basic
  }

  /**
   * Extract Open Graph metadata
   */
  private extractOpenGraph($: cheerio.CheerioAPI): ExtractedMetadata['openGraph'] {
    const og: ExtractedMetadata['openGraph'] = {}

    og.title = $('meta[property="og:title"]').attr('content')
    og.description = $('meta[property="og:description"]').attr('content')
    og.type = $('meta[property="og:type"]').attr('content')
    og.url = $('meta[property="og:url"]').attr('content')
    og.image = $('meta[property="og:image"]').attr('content')
    og.siteName = $('meta[property="og:site_name"]').attr('content')
    og.locale = $('meta[property="og:locale"]').attr('content')
    og.video = $('meta[property="og:video"]').attr('content')
    og.audio = $('meta[property="og:audio"]').attr('content')

    return og
  }

  /**
   * Extract Twitter Card metadata
   */
  private extractTwitterCard($: cheerio.CheerioAPI): ExtractedMetadata['twitter'] {
    const twitter: ExtractedMetadata['twitter'] = {}

    twitter.card = $('meta[name="twitter:card"]').attr('content')
    twitter.site = $('meta[name="twitter:site"]').attr('content')
    twitter.creator = $('meta[name="twitter:creator"]').attr('content')
    twitter.title = $('meta[name="twitter:title"]').attr('content')
    twitter.description = $('meta[name="twitter:description"]').attr('content')
    twitter.image = $('meta[name="twitter:image"]').attr('content')
    twitter.imageAlt = $('meta[name="twitter:image:alt"]').attr('content')

    return twitter
  }

  /**
   * Extract Dublin Core metadata
   */
  private extractDublinCore($: cheerio.CheerioAPI): ExtractedMetadata['dublinCore'] {
    const dc: ExtractedMetadata['dublinCore'] = {}

    dc.title = $('meta[name="DC.Title"], meta[name="dc.title"]').attr('content')
    dc.creator = $('meta[name="DC.Creator"], meta[name="dc.creator"]').attr('content')
    dc.subject = $('meta[name="DC.Subject"], meta[name="dc.subject"]').attr('content')
    dc.description = $('meta[name="DC.Description"], meta[name="dc.description"]').attr('content')
    dc.publisher = $('meta[name="DC.Publisher"], meta[name="dc.publisher"]').attr('content')
    dc.contributor = $('meta[name="DC.Contributor"], meta[name="dc.contributor"]').attr('content')
    dc.date = $('meta[name="DC.Date"], meta[name="dc.date"]').attr('content')
    dc.type = $('meta[name="DC.Type"], meta[name="dc.type"]').attr('content')
    dc.format = $('meta[name="DC.Format"], meta[name="dc.format"]').attr('content')
    dc.identifier = $('meta[name="DC.Identifier"], meta[name="dc.identifier"]').attr('content')
    dc.source = $('meta[name="DC.Source"], meta[name="dc.source"]').attr('content')
    dc.language = $('meta[name="DC.Language"], meta[name="dc.language"]').attr('content')
    dc.relation = $('meta[name="DC.Relation"], meta[name="dc.relation"]').attr('content')
    dc.coverage = $('meta[name="DC.Coverage"], meta[name="dc.coverage"]').attr('content')
    dc.rights = $('meta[name="DC.Rights"], meta[name="dc.rights"]').attr('content')

    return dc
  }

  /**
   * Extract JSON-LD structured data
   */
  private extractJsonLd($: cheerio.CheerioAPI): ExtractedMetadata['jsonLd'] {
    const jsonLdData: ExtractedMetadata['jsonLd'] = []

    $('script[type="application/ld+json"]').each((_, el) => {
      const content = $(el).html()
      if (content) {
        try {
          const parsed = JSON.parse(content)
          jsonLdData.push(parsed)
        } catch (error) {
          permanentLogger.breadcrumb('jsonld_parse_error', 'Failed to parse JSON-LD', {
            error: (error as Error).message
          })
        }
      }
    })

    return jsonLdData
  }

  /**
   * Extract Microdata
   */
  private extractMicrodata($: cheerio.CheerioAPI): ExtractedMetadata['microdata'] {
    const microdata: ExtractedMetadata['microdata'] = []
    const processed = new Set<Element>()

    // Find all itemscope elements
    $('[itemscope]').each((_, el) => {
      if (processed.has(el)) return
      processed.add(el)

      const $item = $(el)
      const type = $item.attr('itemtype')

      if (type) {
        const properties: Record<string, any> = {}

        // Extract properties
        $item.find('[itemprop]').each((_, prop) => {
          const $prop = $(prop)
          const propName = $prop.attr('itemprop')

          if (propName) {
            // Get the value based on element type
            let value: any

            if ($prop.attr('content')) {
              value = $prop.attr('content')
            } else if ($prop.attr('href')) {
              value = $prop.attr('href')
            } else if ($prop.attr('src')) {
              value = $prop.attr('src')
            } else if ($prop.attr('datetime')) {
              value = $prop.attr('datetime')
            } else {
              value = $prop.text().trim()
            }

            // Handle multiple values for the same property
            if (properties[propName]) {
              if (Array.isArray(properties[propName])) {
                properties[propName].push(value)
              } else {
                properties[propName] = [properties[propName], value]
              }
            } else {
              properties[propName] = value
            }
          }
        })

        microdata.push({
          type: type.replace(/.*\/([^/]+)$/, '$1'), // Extract type name
          properties
        })
      }
    })

    return microdata
  }

  /**
   * Extract custom meta tags
   */
  private extractCustomMeta($: cheerio.CheerioAPI): Record<string, string> {
    const custom: Record<string, string> = {}
    const standardNames = new Set([
      'title', 'description', 'keywords', 'author', 'generator',
      'robots', 'viewport', 'charset', 'language'
    ])

    // Extract non-standard meta tags
    $('meta[name], meta[property]').each((_, el) => {
      const $meta = $(el)
      const name = $meta.attr('name') || $meta.attr('property')
      const content = $meta.attr('content')

      if (name && content && !standardNames.has(name)) {
        // Skip OG and Twitter tags (already extracted)
        if (!name.startsWith('og:') &&
            !name.startsWith('twitter:') &&
            !name.startsWith('DC.') &&
            !name.startsWith('dc.')) {
          custom[name] = content
        }
      }
    })

    return custom
  }
}