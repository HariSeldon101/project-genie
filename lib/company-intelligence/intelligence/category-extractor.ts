/**
 * Intelligence Category Extractor
 * CLAUDE.md Compliant - No ID generation, proper logging, error handling
 */

import { z } from 'zod'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { convertSupabaseError } from '@/lib/utils/supabase-error-helper'
import { EventFactory } from '@/lib/realtime-events/factories/event-factory'
import { CompanyIntelligenceRepositoryV4 as CompanyIntelligenceRepository } from '@/lib/repositories/intelligence-repository-v4'
import {
  IntelligenceCategory,
  ScraperType,
  ExtractionStatus,
  SessionPhase
} from '@/lib/company-intelligence/types/intelligence-enums'
import {
  INTELLIGENCE_CATEGORIES,
  CategorySchema
} from '@/lib/company-intelligence/types/intelligence-categories'

/**
 * Extracted intelligence for a category
 */
export interface ExtractedIntelligence {
  category: IntelligenceCategory
  items: IntelligenceItem[]
  confidence: number
  sources: string[]
  metadata: CategorySchema
  extractedAt: string
  quality: ExtractionStatus
}

/**
 * Individual intelligence item
 */
export interface IntelligenceItem {
  id: string // Will be empty string - PostgreSQL generates UUID
  type: string
  content: any
  source: string
  confidence: number
  extractedAt: string
  metadata?: Record<string, any>
}

/**
 * Intelligence Category Extractor
 * Transforms raw scraped data into categorized business intelligence
 * 
 * CLAUDE.md Compliance:
 * - No mock data - extracts from real scraped content only
 * - No ID generation - PostgreSQL handles all UUIDs
 * - Uses convertSupabaseError for all Supabase error handling
 * - Repository pattern ready - outputs structured data
 * - PermanentLogger for all operations with MODULE_NAME
 * - Proper error handling with captureError
 */
export class IntelligenceCategoryExtractor {
  private patterns: Map<IntelligenceCategory, RegExp[]>
  private categoryCache: Map<string, IntelligenceCategory>
  private repository: CompanyIntelligenceRepository

  constructor() {
    this.patterns = new Map()
    this.categoryCache = new Map()
    this.repository = new CompanyIntelligenceRepository()

    // Initialize patterns from category definitions
    Object.entries(INTELLIGENCE_CATEGORIES).forEach(([key, category]) => {
      const patterns = category.keywords.map(keyword => 
        new RegExp(`\\b${keyword}\\b`, 'i')
      )
      this.patterns.set(key as IntelligenceCategory, patterns)
    })

    permanentLogger.info('CATEGORY_EXTRACTOR', 'Extractor initialized', {
      categoriesCount: this.patterns.size
    })
  }

  /**
   * Extract intelligence categories from scraped data
   */
  public async extractCategories(
    scrapedData: Map<string, any>,
    sessionId: string,
    correlationId: string
  ): Promise<Map<IntelligenceCategory, ExtractedIntelligence>> {
    const timer = permanentLogger.timing('intelligence_extraction')
    const results = new Map<IntelligenceCategory, ExtractedIntelligence>()

    try {
      permanentLogger.addBreadcrumb({
        message: 'Starting intelligence extraction',
        data: {
          pagesCount: scrapedData.size,
          sessionId,
          correlationId
        }
      })

      // Process each scraped page
      let processedPages = 0
      
      for (const [url, pageData] of scrapedData) {
        const pageIntelligence = await this.extractFromPage(url, pageData)

        // Merge with existing results
        for (const [category, intel] of pageIntelligence) {
          if (results.has(category)) {
            const existing = results.get(category)!
            existing.items.push(...intel.items)
            existing.sources = [...new Set([...existing.sources, ...intel.sources])]
            existing.confidence = this.recalculateConfidence(existing)
            existing.quality = this.determineQuality(existing.items, existing.confidence)
          } else {
            results.set(category, intel)
          }
        }

        processedPages++

        // Progress event every 10 pages
        if (processedPages % 10 === 0) {
          EventFactory.create('scraping').progress(
            processedPages, 
            scrapedData.size, 
            'Extracting intelligence',
            { sessionId, correlationId }
          )
        }
      }

      const duration = timer.stop()

      permanentLogger.info('CATEGORY_EXTRACTOR', 'Extraction completed', {
        categoriesFound: results.size,
        totalItems: this.countTotalItems(results),
        pagesProcessed: processedPages,
        duration,
        sessionId,
        correlationId
      })

      // Save to repository
      await this.saveResults(results, sessionId)

      return results

    } catch (error) {
      timer.stop()
      const jsError = convertSupabaseError(error)
      
      permanentLogger.captureError('CATEGORY_EXTRACTOR', jsError, {
        context: 'extraction_failed',
        pagesProcessed: scrapedData.size,
        categoriesFound: results.size,
        sessionId,
        correlationId
      })
      
      throw jsError
    }
  }

  /**
   * Extract intelligence from a single page
   */
  private async extractFromPage(
    url: string,
    pageData: any
  ): Promise<Map<IntelligenceCategory, ExtractedIntelligence>> {
    const results = new Map<IntelligenceCategory, ExtractedIntelligence>()

    // Get content from various formats
    const content = this.extractContent(pageData)
    if (!content) {
      permanentLogger.debug('CATEGORY_EXTRACTOR', 'No extractable content', { url })
      return results
    }

    // Check URL patterns for quick categorization
    const urlCategory = this.categorizeByUrl(url)
    if (urlCategory) {
      permanentLogger.debug('CATEGORY_EXTRACTOR', 'URL pattern match', {
        url,
        category: urlCategory
      })
    }

    // Check if we have AI-extracted schema data
    if (pageData.extractedSchema || pageData.extract) {
      this.processSchemaExtraction(pageData.extractedSchema || pageData.extract, url, results)
    }

    // Pattern-based extraction
    for (const [category, patterns] of this.patterns) {
      const matches = this.findMatches(content, patterns, url)

      if (matches.length > 0) {
        const items = matches.map(match => this.createIntelligenceItem(match, category, url))
        const confidence = this.calculateConfidence(matches, urlCategory === category)
        
        const intelligence: ExtractedIntelligence = {
          category,
          items,
          confidence,
          sources: [url],
          metadata: INTELLIGENCE_CATEGORIES[category],
          extractedAt: new Date().toISOString(),
          quality: this.determineQuality(items, confidence)
        }

        if (results.has(category)) {
          // Merge with schema-extracted data
          const existing = results.get(category)!
          existing.items.push(...intelligence.items)
          existing.confidence = Math.max(existing.confidence, confidence)
          existing.quality = this.determineQuality(existing.items, existing.confidence)
        } else {
          results.set(category, intelligence)
        }
      }
    }

    return results
  }

  /**
   * Extract content from various page data formats
   */
  private extractContent(pageData: any): string {
    // Priority: markdown > text > html
    return pageData.markdown ||
           pageData.text ||
           pageData.html ||
           pageData.content ||
           ''
  }

  /**
   * Process AI-extracted schema data
   */
  private processSchemaExtraction(
    schemaData: any,
    url: string,
    results: Map<IntelligenceCategory, ExtractedIntelligence>
  ): void {
    // Schema data is already structured by our Zod schemas
    Object.entries(schemaData).forEach(([key, value]) => {
      const category = this.findCategoryForSchemaKey(key)
      if (category) {
        const item: IntelligenceItem = {
          id: '', // PostgreSQL gen_random_uuid() will handle this
          type: 'schema_extracted',
          content: value,
          source: url,
          confidence: 0.9, // High confidence for AI extraction
          extractedAt: new Date().toISOString()
        }

        const intelligence: ExtractedIntelligence = {
          category,
          items: [item],
          confidence: 0.9,
          sources: [url],
          metadata: INTELLIGENCE_CATEGORIES[category],
          extractedAt: new Date().toISOString(),
          quality: ExtractionStatus.COMPLETED
        }

        results.set(category, intelligence)
      }
    })
  }

  /**
   * Categorize URL by patterns
   */
  private categorizeByUrl(url: string): IntelligenceCategory | null {
    // Check cache first
    if (this.categoryCache.has(url)) {
      return this.categoryCache.get(url)!
    }

    const urlLower = url.toLowerCase()
    let category: IntelligenceCategory | null = null

    // URL pattern mapping
    const urlPatterns: Array<[RegExp, IntelligenceCategory]> = [
      [/\/about|\/company|\/who-we-are/i, IntelligenceCategory.CORPORATE],
      [/\/pricing|\/plans|\/subscribe/i, IntelligenceCategory.PRICING],
      [/\/products?|\/services?|\/features?/i, IntelligenceCategory.PRODUCTS],
      [/\/case-stud|\/success|\/customers/i, IntelligenceCategory.CASE_STUDIES],
      [/\/blog|\/news|\/articles/i, IntelligenceCategory.BLOG],
      [/\/team|\/people|\/leadership/i, IntelligenceCategory.TEAM],
      [/\/careers?|\/jobs?|\/hiring/i, IntelligenceCategory.CAREERS],
      [/\/investors?|\/funding/i, IntelligenceCategory.INVESTORS],
      [/\/partners?|\/integrations?/i, IntelligenceCategory.PARTNERSHIPS],
      [/\/support|\/help|\/docs/i, IntelligenceCategory.SUPPORT],
      [/\/compliance|\/security|\/privacy/i, IntelligenceCategory.COMPLIANCE],
      [/\/press|\/media|\/news/i, IntelligenceCategory.PRESS]
    ]

    for (const [pattern, cat] of urlPatterns) {
      if (pattern.test(urlLower)) {
        category = cat
        break
      }
    }

    // Cache result
    if (category) {
      this.categoryCache.set(url, category)
    }

    return category
  }

  /**
   * Find pattern matches in content
   */
  private findMatches(
    content: string,
    patterns: RegExp[],
    source: string
  ): Array<{text: string, context: string, pattern: string}> {
    const matches: Array<{text: string, context: string, pattern: string}> = []
    const maxMatchesPerPattern = 10

    patterns.forEach(pattern => {
      try {
        const regex = new RegExp(pattern.source, 'gi')
        const results = content.matchAll(regex)
        let count = 0

        for (const match of results) {
          if (count >= maxMatchesPerPattern) break

          matches.push({
            text: match[0],
            context: this.extractContext(content, match.index || 0),
            pattern: pattern.source
          })
          count++
        }
      } catch (error) {
        const jsError = convertSupabaseError(error)
        permanentLogger.captureError('CATEGORY_EXTRACTOR', jsError, {
          context: 'pattern_match_error',
          pattern: pattern.source,
          source
        })
      }
    })

    return matches
  }

  /**
   * Extract context around a match
   */
  private extractContext(content: string, index: number, contextSize: number = 200): string {
    const start = Math.max(0, index - contextSize)
    const end = Math.min(content.length, index + contextSize)
    let context = content.substring(start, end).trim()

    // Clean up context
    context = context.replace(/\s+/g, ' ')
    context = context.substring(0, 400)

    return context
  }

  /**
   * Create intelligence item from match
   */
  private createIntelligenceItem(
    match: any,
    category: IntelligenceCategory,
    url: string
  ): IntelligenceItem {
    return {
      id: '', // PostgreSQL gen_random_uuid() will handle this
      type: 'pattern_match',
      content: {
        text: match.text,
        context: match.context,
        pattern: match.pattern
      },
      source: url,
      confidence: 0.7,
      extractedAt: new Date().toISOString(),
      metadata: { category: category.toLowerCase() }
    }
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(matches: any[], urlMatch: boolean): number {
    let confidence = 0.5

    if (urlMatch) confidence += 0.2
    if (matches.length > 10) confidence += 0.2
    else if (matches.length > 5) confidence += 0.1
    else if (matches.length > 2) confidence += 0.05

    return Math.min(confidence, 0.95)
  }

  /**
   * Recalculate confidence for merged results
   */
  private recalculateConfidence(intelligence: ExtractedIntelligence): number {
    if (intelligence.items.length === 0) return 0

    const avgConfidence = intelligence.items.reduce((sum, item) => sum + item.confidence, 0) / intelligence.items.length
    const sourceBoost = Math.min(intelligence.sources.length * 0.05, 0.2)

    return Math.min(avgConfidence + sourceBoost, 1.0)
  }

  /**
   * Determine data quality using proper enum
   */
  private determineQuality(items: IntelligenceItem[], confidence: number): ExtractionStatus {
    if (items.length === 0) return ExtractionStatus.PENDING
    if (confidence > 0.8 && items.length > 5) return ExtractionStatus.COMPLETED
    if (confidence > 0.6 && items.length > 3) return ExtractionStatus.PARTIAL
    if (confidence > 0.4 && items.length > 1) return ExtractionStatus.PROCESSING
    return ExtractionStatus.FAILED
  }

  /**
   * Find category for schema key
   */
  private findCategoryForSchemaKey(key: string): IntelligenceCategory | null {
    const keyMappings: Record<string, IntelligenceCategory> = {
      'mission': IntelligenceCategory.CORPORATE,
      'vision': IntelligenceCategory.CORPORATE,
      'leadership': IntelligenceCategory.TEAM,
      'products': IntelligenceCategory.PRODUCTS,
      'pricing': IntelligenceCategory.PRICING,
      'competitors': IntelligenceCategory.COMPETITORS,
      'caseStudies': IntelligenceCategory.CASE_STUDIES,
      'team': IntelligenceCategory.TEAM,
      'techStack': IntelligenceCategory.TECHNICAL,
      'certifications': IntelligenceCategory.COMPLIANCE
    }

    return keyMappings[key] || null
  }

  /**
   * Count total items across categories
   */
  private countTotalItems(results: Map<IntelligenceCategory, ExtractedIntelligence>): number {
    let total = 0
    results.forEach(intel => {
      total += intel.items.length
    })
    return total
  }

  /**
   * Save results to repository
   */
  private async saveResults(
    results: Map<IntelligenceCategory, ExtractedIntelligence>,
    sessionId: string
  ): Promise<void> {
    try {
      const intelligenceData: Record<string, ExtractedIntelligence> = {}
      results.forEach((value, key) => {
        intelligenceData[key] = value
      })

      await this.repository.updateSession(sessionId, {
        phase: SessionPhase.PROCESSING,
        items_found: this.countTotalItems(results),
        metadata: {
          categories_extracted: Array.from(results.keys()),
          extraction_completed_at: new Date().toISOString()
        }
      })

      permanentLogger.info('CATEGORY_EXTRACTOR', 'Results saved to repository', {
        sessionId,
        categoriesCount: results.size
      })

    } catch (error) {
      const jsError = convertSupabaseError(error)
      permanentLogger.captureError('CATEGORY_EXTRACTOR', jsError, {
        context: 'save_results',
        sessionId
      })
      // Don't throw - extraction succeeded even if save failed
    }
  }
}

/**
 * Transform scraped data to categorized intelligence
 * Factory function for easy use
 */
export async function transformToIntelligenceCategories(
  scrapedData: Map<string, any>,
  sessionId: string = '',
  correlationId: string = ''
): Promise<Record<IntelligenceCategory, ExtractedIntelligence>> {
  const extractor = new IntelligenceCategoryExtractor()
  const extracted = await extractor.extractCategories(scrapedData, sessionId, correlationId)

  // Convert Map to plain object
  const result: Partial<Record<IntelligenceCategory, ExtractedIntelligence>> = {}

  extracted.forEach((intelligence, category) => {
    result[category] = intelligence
  })

  return result as Record<IntelligenceCategory, ExtractedIntelligence>
}
