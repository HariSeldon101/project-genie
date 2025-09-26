/**
 * Scraping Merger Module
 * 
 * Intelligently merges data from multiple scraping passes to create
 * a comprehensive dataset. Tracks data provenance and quality scores.
 * 
 * Features:
 * - Content deduplication
 * - Quality scoring based on multiple sources
 * - Provenance tracking
 * - Conflict resolution
 * - Incremental enhancement
 * 
 * @module scraping-merger
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { ScrapingResult } from '../plugins/base-scraper-plugin'
import * as cheerio from 'cheerio'
import { createHash } from 'crypto'

/**
 * Represents a single scraping pass
 */
export interface ScrapingPass {
  id: string
  scraperName: string
  strategy: string
  timestamp: string
  url: string
  duration: number
  result: ScrapingResult
  metadata?: Record<string, any>
}

/**
 * Merged scraping data with provenance
 */
export interface MergedScrapingData {
  url: string
  
  // Combined content
  content: string
  html: string
  text: string
  title: string
  
  // Structured data from all passes
  structured: Record<string, any>
  
  // Metadata merged from all passes
  metadata: {
    statusCode?: number
    contentType?: string
    totalDuration: number
    screenshots: string[] // Multiple screenshots if available
    [key: string]: any
  }
  
  // Data provenance tracking
  sources: Array<{
    scraper: string
    strategy: string
    timestamp: string
    dataPoints: string[] // Which data points came from this source
    confidence: number
  }>
  
  // Quality metrics
  quality: {
    score: number // 0-100
    completeness: number // 0-100
    consistency: number // 0-100
    freshness: number // 0-100
  }
  
  // Merge statistics
  statistics: {
    totalPasses: number
    successfulPasses: number
    failedPasses: number
    uniqueDataPoints: number
    duplicateDataPoints: number
    conflictingDataPoints: number
  }
}

/**
 * Options for merging strategy
 */
export interface MergeOptions {
  // Conflict resolution strategy
  conflictResolution: 'latest' | 'highest_quality' | 'manual' | 'combine'
  
  // Whether to deduplicate content
  deduplicateContent: boolean
  
  // Minimum confidence threshold for data inclusion
  minConfidence: number
  
  // Whether to preserve all HTML versions
  preserveAllHtml: boolean
  
  // Custom merge functions for specific fields
  customMergers?: Record<string, (values: any[]) => any>
}

/**
 * Scraping Merger for combining multiple scraping passes
 */
export class ScrapingMerger {
  private logger = permanentLogger.create('SCRAPING_MERGER')
  private options: MergeOptions
  
  constructor(options?: Partial<MergeOptions>) {
    this.options = {
      conflictResolution: 'highest_quality',
      deduplicateContent: true,
      minConfidence: 0.5,
      preserveAllHtml: false,
      ...options
    }
  }
  
  /**
   * Merge multiple scraping passes into a unified dataset
   */
  merge(passes: ScrapingPass[]): MergedScrapingData {
    const startTime = Date.now()
    
    this.logger.info('Starting merge operation', {
      passCount: passes.length,
      scrapers: passes.map(p => p.scraperName),
      url: passes[0]?.url
    })
    
    if (passes.length === 0) {
      throw new Error('No scraping passes to merge')
    }
    
    // Sort passes by timestamp for chronological processing
    const sortedPasses = [...passes].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
    
    // Merge content
    const mergedContent = this.mergeContent(sortedPasses)
    const mergedHtml = this.mergeHtml(sortedPasses)
    const mergedText = this.mergeText(sortedPasses)
    const mergedTitle = this.mergeTitle(sortedPasses)
    
    // Merge structured data
    const mergedStructured = this.mergeStructuredData(sortedPasses)
    
    // Merge metadata
    const mergedMetadata = this.mergeMetadata(sortedPasses)
    
    // Track data sources
    const sources = this.trackSources(sortedPasses)
    
    // Calculate quality metrics
    const quality = this.calculateQuality(sortedPasses, mergedContent)
    
    // Calculate statistics
    const statistics = this.calculateStatistics(sortedPasses, mergedStructured)
    
    const duration = Date.now() - startTime
    
    this.logger.info('Merge operation completed', {
      duration,
      quality,
      statistics
    })
    
    return {
      url: passes[0].url,
      content: mergedContent,
      html: mergedHtml,
      text: mergedText,
      title: mergedTitle,
      structured: mergedStructured,
      metadata: mergedMetadata,
      sources,
      quality,
      statistics
    }
  }
  
  /**
   * Merge content from multiple passes
   */
  private mergeContent(passes: ScrapingPass[]): string {
    const contents = passes
      .map(p => p.result.content || '')
      .filter(c => c.length > 0)
    
    if (contents.length === 0) return ''
    
    if (this.options.deduplicateContent) {
      // Deduplicate content blocks
      const uniqueBlocks = new Set<string>()
      const contentBlocks: string[] = []
      
      for (const content of contents) {
        const blocks = this.extractContentBlocks(content)
        for (const block of blocks) {
          const hash = this.hashContent(block)
          if (!uniqueBlocks.has(hash)) {
            uniqueBlocks.add(hash)
            contentBlocks.push(block)
          }
        }
      }
      
      return contentBlocks.join('\n\n')
    }
    
    // Use conflict resolution strategy
    return this.resolveConflict(contents)
  }
  
  /**
   * Merge HTML from multiple passes
   */
  private mergeHtml(passes: ScrapingPass[]): string {
    const htmls = passes
      .map(p => p.result.html || '')
      .filter(h => h.length > 0)
    
    if (htmls.length === 0) return ''
    
    if (this.options.preserveAllHtml) {
      // Combine all HTML with markers
      return htmls.map((html, i) => 
        `<!-- Scraping Pass ${i + 1}: ${passes[i].scraperName} -->\n${html}`
      ).join('\n\n')
    }
    
    // Merge HTML intelligently
    return this.mergeHtmlDocuments(htmls)
  }
  
  /**
   * Merge text content from multiple passes
   */
  private mergeText(passes: ScrapingPass[]): string {
    const texts = passes
      .map(p => p.result.text || '')
      .filter(t => t.length > 0)
    
    if (texts.length === 0) return ''
    
    // Find the longest text (likely most complete)
    const longestText = texts.reduce((a, b) => a.length > b.length ? a : b)
    
    // Enhance with unique content from other passes
    const enhancedText = this.enhanceText(longestText, texts)
    
    return enhancedText
  }
  
  /**
   * Merge titles from multiple passes
   */
  private mergeTitle(passes: ScrapingPass[]): string {
    const titles = passes
      .map(p => p.result.title || '')
      .filter(t => t.length > 0)
    
    if (titles.length === 0) return ''
    
    // Use the most common title or the longest one
    const titleCounts = new Map<string, number>()
    for (const title of titles) {
      titleCounts.set(title, (titleCounts.get(title) || 0) + 1)
    }
    
    // Sort by count, then by length
    const sortedTitles = Array.from(titleCounts.entries())
      .sort((a, b) => {
        if (a[1] !== b[1]) return b[1] - a[1] // By count
        return b[0].length - a[0].length // By length
      })
    
    return sortedTitles[0][0]
  }
  
  /**
   * Merge structured data from multiple passes
   */
  private mergeStructuredData(passes: ScrapingPass[]): Record<string, any> {
    const merged: Record<string, any> = {}
    
    for (const pass of passes) {
      if (!pass.result.structured) continue
      
      for (const [key, value] of Object.entries(pass.result.structured)) {
        if (!(key in merged)) {
          // New field, add it
          merged[key] = value
        } else {
          // Field exists, merge values
          merged[key] = this.mergeValues(merged[key], value, key)
        }
      }
    }
    
    return merged
  }
  
  /**
   * Merge metadata from multiple passes
   */
  private mergeMetadata(passes: ScrapingPass[]): any {
    const metadata: any = {
      totalDuration: passes.reduce((sum, p) => sum + p.duration, 0),
      screenshots: []
    }
    
    // Collect all screenshots
    for (const pass of passes) {
      if (pass.result.metadata?.screenshot) {
        metadata.screenshots.push(pass.result.metadata.screenshot)
      }
    }
    
    // Use latest status code
    const latestPass = passes[passes.length - 1]
    if (latestPass.result.metadata?.statusCode) {
      metadata.statusCode = latestPass.result.metadata.statusCode
    }
    
    // Merge other metadata fields
    for (const pass of passes) {
      if (!pass.result.metadata) continue
      
      for (const [key, value] of Object.entries(pass.result.metadata)) {
        if (!['screenshot', 'statusCode', 'duration'].includes(key)) {
          metadata[key] = value
        }
      }
    }
    
    return metadata
  }
  
  /**
   * Track data sources and provenance
   */
  private trackSources(passes: ScrapingPass[]): MergedScrapingData['sources'] {
    return passes.map(pass => ({
      scraper: pass.scraperName,
      strategy: pass.strategy,
      timestamp: pass.timestamp,
      dataPoints: this.identifyDataPoints(pass.result),
      confidence: this.calculatePassConfidence(pass)
    }))
  }
  
  /**
   * Calculate quality metrics for merged data
   */
  private calculateQuality(
    passes: ScrapingPass[],
    mergedContent: string
  ): MergedScrapingData['quality'] {
    const successfulPasses = passes.filter(p => 
      p.result.content && p.result.content.length > 0
    )
    
    // Completeness: ratio of successful passes
    const completeness = (successfulPasses.length / passes.length) * 100
    
    // Consistency: how similar the content is across passes
    const consistency = this.calculateConsistency(passes)
    
    // Freshness: based on most recent pass
    const latestPass = passes[passes.length - 1]
    const ageHours = (Date.now() - new Date(latestPass.timestamp).getTime()) / (1000 * 60 * 60)
    const freshness = Math.max(0, 100 - (ageHours * 2)) // Lose 2% per hour
    
    // Overall score
    const score = (completeness * 0.4 + consistency * 0.3 + freshness * 0.3)
    
    return {
      score: Math.round(score),
      completeness: Math.round(completeness),
      consistency: Math.round(consistency),
      freshness: Math.round(freshness)
    }
  }
  
  /**
   * Calculate statistics for the merge operation
   */
  private calculateStatistics(
    passes: ScrapingPass[],
    mergedStructured: Record<string, any>
  ): MergedScrapingData['statistics'] {
    const successfulPasses = passes.filter(p => 
      p.result.content && p.result.content.length > 0
    )
    
    const failedPasses = passes.filter(p => 
      p.result.errors && p.result.errors.length > 0
    )
    
    // Count unique data points
    const allDataPoints = new Set<string>()
    const duplicateCount = { count: 0 }
    
    for (const pass of passes) {
      const points = this.identifyDataPoints(pass.result)
      for (const point of points) {
        if (allDataPoints.has(point)) {
          duplicateCount.count++
        } else {
          allDataPoints.add(point)
        }
      }
    }
    
    return {
      totalPasses: passes.length,
      successfulPasses: successfulPasses.length,
      failedPasses: failedPasses.length,
      uniqueDataPoints: allDataPoints.size,
      duplicateDataPoints: duplicateCount.count,
      conflictingDataPoints: 0 // TODO: Implement conflict detection
    }
  }
  
  // Helper methods
  
  private extractContentBlocks(content: string): string[] {
    // Split content into meaningful blocks (paragraphs, sections, etc.)
    return content.split(/\n\n+/).filter(block => block.trim().length > 0)
  }
  
  private hashContent(content: string): string {
    return createHash('md5').update(content.trim()).digest('hex')
  }
  
  private resolveConflict(values: any[]): any {
    switch (this.options.conflictResolution) {
      case 'latest':
        return values[values.length - 1]
      
      case 'highest_quality':
        // Return the longest/most complete value
        return values.reduce((a, b) => {
          const aScore = this.calculateValueQuality(a)
          const bScore = this.calculateValueQuality(b)
          return aScore > bScore ? a : b
        })
      
      case 'combine':
        // Combine all unique values
        if (typeof values[0] === 'string') {
          return [...new Set(values)].join('\n\n')
        }
        return values
      
      case 'manual':
      default:
        return values[0]
    }
  }
  
  private mergeHtmlDocuments(htmls: string[]): string {
    if (htmls.length === 1) return htmls[0]
    
    // Parse all HTML documents
    const docs = htmls.map(html => cheerio.load(html))
    
    // Use the first document as base
    const $ = docs[0]
    
    // Merge unique elements from other documents
    for (let i = 1; i < docs.length; i++) {
      const $other = docs[i]
      
      // Merge body content
      $other('body > *').each((_, elem) => {
        const html = $other(elem).html()
        if (html && !$('body').html()?.includes(html)) {
          $('body').append($other(elem).clone())
        }
      })
      
      // Merge unique meta tags
      $other('head meta').each((_, elem) => {
        const name = $other(elem).attr('name')
        const property = $other(elem).attr('property')
        const key = name || property
        
        if (key && !$(`meta[name="${key}"], meta[property="${key}"]`).length) {
          $('head').append($other(elem).clone())
        }
      })
    }
    
    return $.html()
  }
  
  private enhanceText(baseText: string, allTexts: string[]): string {
    const baseLines = new Set(baseText.split('\n').map(l => l.trim()))
    const enhanced = [baseText]
    
    for (const text of allTexts) {
      if (text === baseText) continue
      
      const lines = text.split('\n')
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed && !baseLines.has(trimmed)) {
          enhanced.push(trimmed)
          baseLines.add(trimmed)
        }
      }
    }
    
    return enhanced.join('\n')
  }
  
  private mergeValues(existing: any, newValue: any, key: string): any {
    // Check for custom merger
    if (this.options.customMergers?.[key]) {
      return this.options.customMergers[key]([existing, newValue])
    }
    
    // Arrays: combine unique values
    if (Array.isArray(existing) && Array.isArray(newValue)) {
      return [...new Set([...existing, ...newValue])]
    }
    
    // Objects: deep merge
    if (typeof existing === 'object' && typeof newValue === 'object') {
      return { ...existing, ...newValue }
    }
    
    // Primitives: use conflict resolution
    return this.resolveConflict([existing, newValue])
  }
  
  private identifyDataPoints(result: ScrapingResult): string[] {
    const points: string[] = []
    
    if (result.title) points.push(`title:${result.title}`)
    if (result.metadata?.statusCode) points.push(`status:${result.metadata.statusCode}`)
    
    // Add structured data fields
    if (result.structured) {
      for (const key of Object.keys(result.structured)) {
        points.push(`field:${key}`)
      }
    }
    
    return points
  }
  
  private calculatePassConfidence(pass: ScrapingPass): number {
    let confidence = 0.5 // Base confidence
    
    // Increase for successful content
    if (pass.result.content && pass.result.content.length > 100) {
      confidence += 0.2
    }
    
    // Increase for structured data
    if (pass.result.structured && Object.keys(pass.result.structured).length > 0) {
      confidence += 0.2
    }
    
    // Decrease for errors
    if (pass.result.errors && pass.result.errors.length > 0) {
      confidence -= 0.3
    }
    
    // Increase for fast execution
    if (pass.duration < 1000) {
      confidence += 0.1
    }
    
    return Math.max(0, Math.min(1, confidence))
  }
  
  private calculateValueQuality(value: any): number {
    if (typeof value === 'string') {
      return value.length
    }
    if (Array.isArray(value)) {
      return value.length * 10
    }
    if (typeof value === 'object' && value !== null) {
      return Object.keys(value).length * 5
    }
    return 1
  }
  
  private calculateConsistency(passes: ScrapingPass[]): number {
    if (passes.length < 2) return 100
    
    const contents = passes
      .map(p => p.result.content || '')
      .filter(c => c.length > 0)
    
    if (contents.length < 2) return 100
    
    // Calculate similarity between contents
    let totalSimilarity = 0
    let comparisons = 0
    
    for (let i = 0; i < contents.length - 1; i++) {
      for (let j = i + 1; j < contents.length; j++) {
        totalSimilarity += this.calculateSimilarity(contents[i], contents[j])
        comparisons++
      }
    }
    
    return comparisons > 0 ? (totalSimilarity / comparisons) * 100 : 100
  }
  
  private calculateSimilarity(text1: string, text2: string): number {
    // Simple similarity based on common words
    const words1 = new Set(text1.toLowerCase().split(/\s+/))
    const words2 = new Set(text2.toLowerCase().split(/\s+/))
    
    const intersection = new Set([...words1].filter(x => words2.has(x)))
    const union = new Set([...words1, ...words2])
    
    return union.size > 0 ? intersection.size / union.size : 0
  }
}