/**
 * Extractor Pipeline
 *
 * Orchestrates multiple extractors to process HTML content
 * and produce comprehensive extracted data.
 *
 * Features:
 * - Configurable extractor chain
 * - Parallel and sequential processing
 * - Result merging and deduplication
 * - Performance tracking
 *
 * @module extractors/extractor-pipeline
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { ContentExtractor, type ExtractedContent } from './content-extractor'
import { ContactExtractor, type ExtractedContact } from './contact-extractor'
import { SocialExtractor, type ExtractedSocial } from './social-extractor'
import { MetadataExtractor, type ExtractedMetadata } from './metadata-extractor'

/**
 * Combined extraction result
 */
export interface ExtractedData {
  url?: string
  timestamp: number
  content?: ExtractedContent
  contact?: ExtractedContact
  social?: ExtractedSocial
  metadata?: ExtractedMetadata
  summary?: {
    hasContent: boolean
    hasContact: boolean
    hasSocial: boolean
    hasStructuredData: boolean
    totalDataPoints: number
  }
}

/**
 * Pipeline configuration options
 */
export interface PipelineOptions {
  extractContent?: boolean
  extractContact?: boolean
  extractSocial?: boolean
  extractMetadata?: boolean
  parallel?: boolean
  timeout?: number
}

/**
 * Extractor type enumeration
 */
export type ExtractorType = 'content' | 'contact' | 'social' | 'metadata'

/**
 * Orchestrates extraction pipeline
 */
export class ExtractorPipeline {
  private contentExtractor: ContentExtractor
  private contactExtractor: ContactExtractor
  private socialExtractor: SocialExtractor
  private metadataExtractor: MetadataExtractor
  private readonly defaultOptions: Required<PipelineOptions>

  constructor(options: PipelineOptions = {}) {
    this.contentExtractor = new ContentExtractor()
    this.contactExtractor = new ContactExtractor()
    this.socialExtractor = new SocialExtractor()
    this.metadataExtractor = new MetadataExtractor()

    this.defaultOptions = {
      extractContent: options.extractContent ?? true,
      extractContact: options.extractContact ?? true,
      extractSocial: options.extractSocial ?? true,
      extractMetadata: options.extractMetadata ?? true,
      parallel: options.parallel ?? true,
      timeout: options.timeout ?? 30000
    }
  }

  /**
   * Extract data from HTML using configured extractors
   */
  async extract(
    html: string,
    url?: string,
    options?: PipelineOptions
  ): Promise<ExtractedData> {
    const timer = permanentLogger.timing('pipeline_extraction', { url })
    const config = { ...this.defaultOptions, ...options }

    permanentLogger.info('EXTRACTOR_PIPELINE', 'Starting extraction', {
      url,
      extractors: this.getEnabledExtractors(config),
      parallel: config.parallel
    })

    try {
      const result: ExtractedData = {
        url,
        timestamp: Date.now()
      }

      if (config.parallel) {
        // Run extractors in parallel
        await this.extractParallel(html, url, config, result)
      } else {
        // Run extractors sequentially
        await this.extractSequential(html, url, config, result)
      }

      // Add summary
      result.summary = this.generateSummary(result)

      const duration = timer.stop()

      permanentLogger.info('EXTRACTOR_PIPELINE', 'Extraction complete', {
        url,
        duration,
        dataPoints: result.summary.totalDataPoints
      })

      return result
    } catch (error) {
      timer.stop()
      permanentLogger.captureError('EXTRACTOR_PIPELINE', error as Error, {
        url,
        phase: 'extraction'
      })
      throw error
    }
  }

  /**
   * Extract using parallel processing
   */
  private async extractParallel(
    html: string,
    url: string | undefined,
    config: Required<PipelineOptions>,
    result: ExtractedData
  ): Promise<void> {
    const promises: Promise<void>[] = []

    if (config.extractContent) {
      promises.push(
        this.runExtractor('content', () =>
          this.contentExtractor.extract(html, url)
        ).then(data => { result.content = data as ExtractedContent })
      )
    }

    if (config.extractContact) {
      promises.push(
        this.runExtractor('contact', () =>
          this.contactExtractor.extract(html, url)
        ).then(data => { result.contact = data as ExtractedContact })
      )
    }

    if (config.extractSocial) {
      promises.push(
        this.runExtractor('social', () =>
          this.socialExtractor.extract(html, url)
        ).then(data => { result.social = data as ExtractedSocial })
      )
    }

    if (config.extractMetadata) {
      promises.push(
        this.runExtractor('metadata', () =>
          this.metadataExtractor.extract(html, url)
        ).then(data => { result.metadata = data as ExtractedMetadata })
      )
    }

    // Wait for all extractors with timeout
    await Promise.race([
      Promise.all(promises),
      this.timeout(config.timeout)
    ])
  }

  /**
   * Extract using sequential processing
   */
  private async extractSequential(
    html: string,
    url: string | undefined,
    config: Required<PipelineOptions>,
    result: ExtractedData
  ): Promise<void> {
    if (config.extractContent) {
      result.content = await this.runExtractor('content', () =>
        this.contentExtractor.extract(html, url)
      ) as ExtractedContent
    }

    if (config.extractContact) {
      result.contact = await this.runExtractor('contact', () =>
        this.contactExtractor.extract(html, url)
      ) as ExtractedContact
    }

    if (config.extractSocial) {
      result.social = await this.runExtractor('social', () =>
        this.socialExtractor.extract(html, url)
      ) as ExtractedSocial
    }

    if (config.extractMetadata) {
      result.metadata = await this.runExtractor('metadata', () =>
        this.metadataExtractor.extract(html, url)
      ) as ExtractedMetadata
    }
  }

  /**
   * Run a single extractor with error handling
   */
  private async runExtractor<T>(
    type: ExtractorType,
    extractFn: () => T | Promise<T>
  ): Promise<T | undefined> {
    const timer = permanentLogger.timing(`${type}_extraction`)

    try {
      permanentLogger.breadcrumb(`extract_${type}`, `Running ${type} extractor`)
      const result = await extractFn()
      timer.stop()
      return result
    } catch (error) {
      timer.stop()
      permanentLogger.captureError('EXTRACTOR_PIPELINE', error as Error, {
        extractor: type,
        phase: 'extraction'
      })
      // Return undefined on error, don't fail the whole pipeline
      return undefined
    }
  }

  /**
   * Generate summary of extracted data
   */
  private generateSummary(data: ExtractedData): ExtractedData['summary'] {
    let totalDataPoints = 0

    // Count content data points
    if (data.content) {
      totalDataPoints += data.content.paragraphs?.length || 0
      totalDataPoints += data.content.images?.length || 0
      totalDataPoints += data.content.links?.length || 0
      totalDataPoints += data.content.headings?.h1?.length || 0
      totalDataPoints += data.content.headings?.h2?.length || 0
    }

    // Count contact data points
    if (data.contact) {
      totalDataPoints += data.contact.emails?.length || 0
      totalDataPoints += data.contact.phones?.length || 0
      totalDataPoints += data.contact.addresses?.length || 0
    }

    // Count social data points
    if (data.social) {
      totalDataPoints += data.social.profiles?.length || 0
      totalDataPoints += data.social.feeds?.length || 0
    }

    // Count metadata data points
    if (data.metadata) {
      totalDataPoints += data.metadata.jsonLd?.length || 0
      totalDataPoints += data.metadata.microdata?.length || 0
      totalDataPoints += Object.keys(data.metadata.custom || {}).length
    }

    return {
      hasContent: !!data.content?.mainContent,
      hasContact: !!(data.contact?.emails?.length || data.contact?.phones?.length),
      hasSocial: !!data.social?.profiles?.length,
      hasStructuredData: !!(data.metadata?.jsonLd?.length || data.metadata?.microdata?.length),
      totalDataPoints
    }
  }

  /**
   * Get list of enabled extractors
   */
  private getEnabledExtractors(config: Required<PipelineOptions>): string[] {
    const enabled: string[] = []
    if (config.extractContent) enabled.push('content')
    if (config.extractContact) enabled.push('contact')
    if (config.extractSocial) enabled.push('social')
    if (config.extractMetadata) enabled.push('metadata')
    return enabled
  }

  /**
   * Timeout helper
   */
  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Pipeline extraction timeout after ${ms}ms`))
      }, ms)
    })
  }

  /**
   * Merge multiple extraction results
   * Useful when extracting from multiple pages
   */
  static mergeResults(results: ExtractedData[]): ExtractedData {
    if (results.length === 0) {
      return {
        timestamp: Date.now(),
        summary: {
          hasContent: false,
          hasContact: false,
          hasSocial: false,
          hasStructuredData: false,
          totalDataPoints: 0
        }
      }
    }

    if (results.length === 1) {
      return results[0]
    }

    // Merge logic for multiple results
    const merged: ExtractedData = {
      timestamp: Date.now(),
      content: this.mergeContent(results.map(r => r.content).filter(Boolean)),
      contact: this.mergeContact(results.map(r => r.contact).filter(Boolean)),
      social: this.mergeSocial(results.map(r => r.social).filter(Boolean)),
      metadata: this.mergeMetadata(results.map(r => r.metadata).filter(Boolean))
    }

    // Recalculate summary
    const pipeline = new ExtractorPipeline()
    merged.summary = pipeline.generateSummary(merged)

    return merged
  }

  /**
   * Merge content results
   */
  private static mergeContent(contents: ExtractedContent[]): ExtractedContent | undefined {
    if (contents.length === 0) return undefined

    const merged: ExtractedContent = {
      title: contents[0]?.title,
      description: contents[0]?.description,
      headings: {
        h1: [],
        h2: [],
        h3: []
      },
      paragraphs: [],
      images: [],
      links: [],
      lists: {
        ordered: [],
        unordered: []
      },
      tables: []
    }

    // Merge all content
    for (const content of contents) {
      if (content.headings) {
        merged.headings.h1.push(...(content.headings.h1 || []))
        merged.headings.h2.push(...(content.headings.h2 || []))
        merged.headings.h3.push(...(content.headings.h3 || []))
      }
      merged.paragraphs.push(...(content.paragraphs || []))
      merged.images.push(...(content.images || []))
      merged.links.push(...(content.links || []))
      merged.lists.ordered.push(...(content.lists?.ordered || []))
      merged.lists.unordered.push(...(content.lists?.unordered || []))
      merged.tables.push(...(content.tables || []))
    }

    // Deduplicate
    merged.headings.h1 = [...new Set(merged.headings.h1)]
    merged.headings.h2 = [...new Set(merged.headings.h2)]
    merged.headings.h3 = [...new Set(merged.headings.h3)]
    merged.paragraphs = [...new Set(merged.paragraphs)]

    return merged
  }

  /**
   * Merge contact results
   */
  private static mergeContact(contacts: ExtractedContact[]): ExtractedContact | undefined {
    if (contacts.length === 0) return undefined

    const merged: ExtractedContact = {
      emails: [],
      phones: [],
      addresses: [],
      contactForms: []
    }

    const seenEmails = new Set<string>()
    const seenPhones = new Set<string>()

    for (const contact of contacts) {
      // Merge emails (deduplicate)
      for (const email of contact.emails || []) {
        if (!seenEmails.has(email.email)) {
          seenEmails.add(email.email)
          merged.emails.push(email)
        }
      }

      // Merge phones (deduplicate)
      for (const phone of contact.phones || []) {
        if (!seenPhones.has(phone.number)) {
          seenPhones.add(phone.number)
          merged.phones.push(phone)
        }
      }

      // Merge addresses
      merged.addresses.push(...(contact.addresses || []))
      merged.contactForms.push(...(contact.contactForms || []))
    }

    return merged
  }

  /**
   * Merge social results
   */
  private static mergeSocial(socials: ExtractedSocial[]): ExtractedSocial | undefined {
    if (socials.length === 0) return undefined

    const merged: ExtractedSocial = {
      profiles: [],
      sharing: socials[0]?.sharing || {},
      feeds: []
    }

    const seenProfiles = new Set<string>()
    const seenFeeds = new Set<string>()

    for (const social of socials) {
      // Merge profiles (deduplicate)
      for (const profile of social.profiles || []) {
        if (!seenProfiles.has(profile.url)) {
          seenProfiles.add(profile.url)
          merged.profiles.push(profile)
        }
      }

      // Merge feeds (deduplicate)
      for (const feed of social.feeds || []) {
        if (!seenFeeds.has(feed.url)) {
          seenFeeds.add(feed.url)
          merged.feeds.push(feed)
        }
      }
    }

    return merged
  }

  /**
   * Merge metadata results
   */
  private static mergeMetadata(metadatas: ExtractedMetadata[]): ExtractedMetadata | undefined {
    if (metadatas.length === 0) return undefined

    const merged: ExtractedMetadata = {
      basic: metadatas[0]?.basic || {},
      openGraph: metadatas[0]?.openGraph || {},
      twitter: metadatas[0]?.twitter || {},
      dublinCore: metadatas[0]?.dublinCore || {},
      jsonLd: [],
      microdata: [],
      custom: {}
    }

    for (const metadata of metadatas) {
      merged.jsonLd.push(...(metadata.jsonLd || []))
      merged.microdata.push(...(metadata.microdata || []))
      Object.assign(merged.custom, metadata.custom || {})
    }

    return merged
  }
}