/**
 * Additive Scraping Session Manager
 * 
 * Manages the additive scraping process where each scraper execution
 * adds to the dataset. Users control when to stop and what to try next.
 * 
 * @module additive-session
 */

import {
  ScraperExecutor,
  ScraperResult,
  ScraperOptions,
  MergedPageData,
  ScrapingStats,
  ScrapingSuggestion,
  AdditiveSession,
  PageResult,
  ContactInfo,
  SocialLinks,
  FormData,
  ImageData,
  DiscoveredLink,
  logSessionEvent,
  logScraperExecution
} from './types'
import { permanentLogger } from '@/lib/utils/permanent-logger'

/**
 * Manages an additive scraping session
 */
export class AdditiveScrapingSession {
  private session: AdditiveSession
  private scraperMap: Map<string, ScraperExecutor>

  constructor(
    sessionId: string,
    domain: string,
    availableScrapers: ScraperExecutor[],
    previouslyDiscoveredUrls: string[] = []
  ) {
    this.session = {
      id: sessionId,
      startedAt: Date.now(),
      lastActivity: Date.now(),
      domain,
      history: [],
      mergedData: new Map(),
      availableScrapers,
      status: 'active',
      totalStats: this.createEmptyStats(),
      previouslyDiscoveredUrls: new Set(previouslyDiscoveredUrls)
    }

    // Create scraper lookup map
    this.scraperMap = new Map(
      availableScrapers.map(s => [s.id, s])
    )

    logSessionEvent(sessionId, 'SESSION_CREATED', {
      domain,
      availableScrapers: availableScrapers.map(s => s.id),
      previouslyDiscoveredUrls: previouslyDiscoveredUrls.length
    })
  }

  /**
   * Execute a scraper and add results to session
   */
  async addScrapingRun(
    scraperId: string,
    urls: string[],
    options?: ScraperOptions
  ): Promise<{
    newData: ScraperResult
    totalDataSoFar: {
      pagesScraped: number
      dataPoints: number
      discoveredLinks: number
      scraperRuns: number
    }
    suggestions: ScrapingSuggestion[]
  }> {
    const startTime = Date.now()
    
    logSessionEvent(this.session.id, 'SCRAPER_RUN_START', {
      scraperId,
      urlCount: urls.length,
      previousRuns: this.session.history.length
    })

    // Get the scraper
    const scraper = this.scraperMap.get(scraperId)
    if (!scraper) {
      throw new Error(`Scraper ${scraperId} not found`)
    }

    try {
      // Execute the scraper
      logScraperExecution(scraperId, 'EXECUTION_START', {
        urls: urls.length,
        strategy: scraper.strategy
      })

      const result = await scraper.scrape(urls, {
        ...options,
        sessionId: this.session.id
      })

      // CRITICAL DEBUG: Log what we received from scraper
      logSessionEvent(this.session.id, 'SCRAPER_RESULT_DEBUG', {
        scraperId,
        pagesCount: result.pages?.length || 0,
        hasPages: !!result.pages,
        isArray: Array.isArray(result.pages),
        firstPageUrl: result.pages?.[0]?.url || 'no-url',
        firstPageSuccess: result.pages?.[0]?.success
      })

      // Validate the results
      const validation = await scraper.validate(result)
      result.validation = validation

      logScraperExecution(scraperId, 'EXECUTION_COMPLETE', {
        duration: Date.now() - startTime,
        pagesScraped: result.pages.length,
        success: result.stats.pagesSucceeded,
        failed: result.stats.pagesFailed,
        discoveredLinks: result.discoveredLinks.length
      })

      // Add to history
      this.session.history.push(result)
      this.session.lastActivity = Date.now()

      // Merge with existing data
      this.mergeResults(result)

      // Update total stats
      this.updateTotalStats(result.stats)

      // Generate suggestions
      const suggestions = this.generateSuggestions()

      const totalData = this.getTotalDataSummary()

      logSessionEvent(this.session.id, 'SCRAPER_RUN_COMPLETE', {
        scraperId,
        newDataPoints: result.stats.dataPointsExtracted,
        totalDataPoints: totalData.dataPoints,
        suggestions: suggestions.length
      })

      return {
        newData: result,
        totalDataSoFar: totalData,
        suggestions
      }
    } catch (error) {
      logSessionEvent(this.session.id, 'SCRAPER_RUN_ERROR', {
        scraperId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Merge new results with existing data
   */
  private mergeResults(newResult: ScraperResult): void {
    logSessionEvent(this.session.id, 'MERGE_START', {
      scraperId: newResult.scraperId,
      pages: newResult.pages?.length || 0,
      hasPages: !!newResult.pages,
      isArray: Array.isArray(newResult.pages)
    })

    // CRITICAL: Check if pages exist
    if (!newResult.pages || !Array.isArray(newResult.pages)) {
      logSessionEvent(this.session.id, 'MERGE_ERROR_NO_PAGES', {
        scraperId: newResult.scraperId,
        pagesValue: newResult.pages
      })
      return
    }

    for (const page of newResult.pages) {
      const existing = this.session.mergedData.get(page.url)
      
      if (existing) {
        // Merge with existing data
        this.mergePage(existing, page, newResult.scraperId)
        logSessionEvent(this.session.id, 'PAGE_MERGED', {
          url: page.url,
          scrapersUsed: existing.scrapedBy.length
        })
      } else {
        // Create new merged data entry
        const merged = this.createMergedPage(page, newResult.scraperId)
        this.session.mergedData.set(page.url, merged)
        logSessionEvent(this.session.id, 'PAGE_ADDED', {
          url: page.url,
          scraperId: newResult.scraperId
        })
      }
    }

    logSessionEvent(this.session.id, 'MERGE_COMPLETE', {
      totalPages: this.session.mergedData.size,
      scraperId: newResult.scraperId
    })
  }

  /**
   * Merge a page result into existing merged data
   */
  private mergePage(
    existing: MergedPageData,
    newPage: PageResult,
    scraperId: string
  ): void {
    // Track which scraper touched this
    if (!existing.scrapedBy.includes(scraperId)) {
      existing.scrapedBy.push(scraperId)
    }

    // Update timestamp
    existing.lastUpdated = Date.now()

    // Merge title (prefer longer, more descriptive)
    if (newPage.title && (!existing.title || newPage.title.length > existing.title.length)) {
      existing.title = newPage.title
    }

    // Merge description
    if (newPage.description && (!existing.description || newPage.description.length > existing.description.length)) {
      existing.description = newPage.description
    }

    // Combine text content
    if (newPage.textContent) {
      existing.textContent = existing.textContent 
        ? existing.textContent + '\n\n' + newPage.textContent
        : newPage.textContent
    }

    // Merge discovered links (deduplicate)
    if (newPage.discoveredLinks) {
      const linkSet = new Set(existing.discoveredLinks)
      newPage.discoveredLinks.forEach(link => linkSet.add(link))
      existing.discoveredLinks = Array.from(linkSet)
    }

    // Merge structured data
    if (newPage.structuredData) {
      existing.structuredData = {
        ...existing.structuredData,
        ...newPage.structuredData
      }
    }

    // Merge technologies (deduplicate)
    if (newPage.technologies) {
      const techSet = new Set(existing.technologies)
      newPage.technologies.forEach(tech => techSet.add(tech))
      existing.technologies = Array.from(techSet)
    }

    // Merge API endpoints (deduplicate)
    if (newPage.apiEndpoints) {
      const apiSet = new Set(existing.apiEndpoints)
      newPage.apiEndpoints.forEach(api => apiSet.add(api))
      existing.apiEndpoints = Array.from(apiSet)
    }

    // Merge contact info
    if (newPage.contactInfo) {
      existing.contactInfo = this.mergeContactInfo(
        existing.contactInfo,
        newPage.contactInfo
      )
    }

    // Merge social links
    if (newPage.socialLinks) {
      existing.socialLinks = {
        ...existing.socialLinks,
        ...newPage.socialLinks
      }
    }

    // Merge forms (deduplicate by action)
    if (newPage.forms) {
      const formMap = new Map(existing.forms.map(f => [f.action || '', f]))
      newPage.forms.forEach(form => {
        if (!formMap.has(form.action || '')) {
          existing.forms.push(form)
        }
      })
    }

    // Merge images (deduplicate by src)
    if (newPage.images) {
      const imageMap = new Map(existing.images.map(i => [i.src, i]))
      newPage.images.forEach(img => {
        if (!imageMap.has(img.src)) {
          existing.images.push(img)
        }
      })
    }

    // Recalculate quality and completeness scores
    existing.qualityScore = this.calculateQualityScore(existing)
    existing.completenessScore = this.calculateCompletenessScore(existing)
  }

  /**
   * Create merged page data from a page result
   */
  private createMergedPage(page: PageResult, scraperId: string): MergedPageData {
    const now = Date.now()
    
    const merged: MergedPageData = {
      url: page.url,
      scrapedBy: [scraperId],
      firstScraped: now,
      lastUpdated: now,
      title: page.title,
      description: page.description,
      textContent: page.textContent,
      discoveredLinks: page.discoveredLinks || [],
      structuredData: page.structuredData || {},
      technologies: page.technologies || [],
      apiEndpoints: page.apiEndpoints || [],
      contactInfo: page.contactInfo || { emails: [], phones: [], addresses: [] },
      socialLinks: page.socialLinks || {},
      forms: page.forms || [],
      images: page.images || [],
      qualityScore: 0,
      completenessScore: 0
    }

    // Calculate initial scores
    merged.qualityScore = this.calculateQualityScore(merged)
    merged.completenessScore = this.calculateCompletenessScore(merged)

    return merged
  }

  /**
   * Merge contact info objects
   */
  private mergeContactInfo(existing: ContactInfo, newInfo: ContactInfo): ContactInfo {
    return {
      emails: Array.from(new Set([
        ...(existing.emails || []),
        ...(newInfo.emails || [])
      ])),
      phones: Array.from(new Set([
        ...(existing.phones || []),
        ...(newInfo.phones || [])
      ])),
      addresses: Array.from(new Set([
        ...(existing.addresses || []),
        ...(newInfo.addresses || [])
      ])),
      contactForms: Array.from(new Set([
        ...(existing.contactForms || []),
        ...(newInfo.contactForms || [])
      ]))
    }
  }

  /**
   * Calculate quality score for merged data
   */
  private calculateQualityScore(data: MergedPageData): number {
    let score = 0
    let factors = 0

    // Multiple scrapers = higher confidence
    if (data.scrapedBy.length > 1) {
      score += 20
      factors++
    }

    // Has title and description
    if (data.title && data.description) {
      score += 15
      factors++
    }

    // Has structured data
    if (Object.keys(data.structuredData).length > 0) {
      score += 15
      factors++
    }

    // Has technologies detected
    if (data.technologies.length > 0) {
      score += 10
      factors++
    }

    // Has contact info
    if (data.contactInfo.emails?.length || data.contactInfo.phones?.length) {
      score += 15
      factors++
    }

    // Has substantial text content
    if (data.textContent && data.textContent.length > 500) {
      score += 10
      factors++
    }

    // Has discovered links
    if (data.discoveredLinks.length > 5) {
      score += 10
      factors++
    }

    // Has images
    if (data.images.length > 0) {
      score += 5
      factors++
    }

    return factors > 0 ? Math.min(100, score) : 0
  }

  /**
   * Calculate completeness score for merged data
   */
  private calculateCompletenessScore(data: MergedPageData): number {
    const fields = [
      data.title,
      data.description,
      data.textContent,
      data.discoveredLinks.length > 0,
      Object.keys(data.structuredData).length > 0,
      data.technologies.length > 0,
      data.apiEndpoints.length > 0,
      Object.keys(data.socialLinks).length > 0,
      data.forms.length > 0,
      data.images.length > 0
    ]

    const filledFields = fields.filter(f => !!f).length
    return Math.round((filledFields / fields.length) * 100)
  }

  /**
   * Update total session stats
   */
  private updateTotalStats(newStats: ScrapingStats): void {
    const total = this.session.totalStats

    total.pagesAttempted += newStats.pagesAttempted
    total.pagesSucceeded += newStats.pagesSucceeded
    total.pagesFailed += newStats.pagesFailed
    total.bytesDownloaded += newStats.bytesDownloaded
    total.dataPointsExtracted += newStats.dataPointsExtracted
    total.linksDiscovered += newStats.linksDiscovered
    total.duration += newStats.duration

    // Recalculate averages
    if (total.pagesAttempted > 0) {
      total.averageTimePerPage = total.duration / total.pagesAttempted
      total.successRate = (total.pagesSucceeded / total.pagesAttempted) * 100
    }
  }

  /**
   * Generate simple rule-based suggestions for next steps
   * NO AI/LLM logic - just deterministic rules
   */
  generateSuggestions(): ScrapingSuggestion[] {
    const suggestions: ScrapingSuggestion[] = []
    
    logSessionEvent(this.session.id, 'GENERATING_SUGGESTIONS', {
      historyLength: this.session.history.length,
      pagesScraped: this.session.mergedData.size
    })

    // Check which scrapers haven't been used
    const usedScrapers = new Set(this.session.history.map(h => h.scraperId))
    const unusedScrapers = this.session.availableScrapers.filter(
      s => !usedScrapers.has(s.id) && !s.disabled
    )

    // Simple rule: Suggest unused scrapers
    for (const scraper of unusedScrapers) {
      if (scraper.id === 'dynamic' && !usedScrapers.has('dynamic')) {
        suggestions.push({
          action: 'use_scraper',
          scraperId: scraper.id,
          label: 'Try JavaScript Renderer',
          reason: 'May capture dynamic content not visible to static scraper',
          estimatedTime: '15-30s per page',
          estimatedValue: 'medium',
          confidence: 50  // No AI analysis, just a possibility
        })
      }
    }

    // Simple rule: If we have undiscovered links, suggest exploring them
    const undiscoveredLinks = this.getUndiscoveredLinks()
    if (undiscoveredLinks.length > 0) {
      const count = Math.min(undiscoveredLinks.length, 10)
      suggestions.push({
        action: 'explore_links',
        label: `Scrape ${count} more pages`,
        reason: `${undiscoveredLinks.length} pages discovered but not yet scraped`,
        estimatedTime: `${count * 3}s`,
        estimatedValue: 'medium',
        confidence: 100,  // Definite fact, not AI prediction
        targetUrls: undiscoveredLinks.slice(0, count).map(l => l.url)
      })
    }

    // Always offer completion
    suggestions.push({
      action: 'complete',
      label: 'Complete scraping',
      reason: `${this.session.mergedData.size} pages scraped, ${usedScrapers.size} scraper(s) used`,
      estimatedValue: 'low',
      confidence: 100
    })

    logSessionEvent(this.session.id, 'SUGGESTIONS_GENERATED', {
      count: suggestions.length,
      types: suggestions.map(s => s.action)
    })

    return suggestions
  }

  /**
   * Detect if content has JavaScript that needs rendering
   */
  private detectJavaScriptContent(): boolean {
    for (const [url, data] of this.session.mergedData) {
      // Check for React, Vue, Angular indicators
      if (data.technologies.some(t => 
        ['React', 'Vue', 'Angular', 'Next.js', 'Nuxt'].includes(t)
      )) {
        return true
      }

      // Check for script tags in content
      if (data.textContent?.includes('<script') || 
          data.textContent?.includes('window.') ||
          data.textContent?.includes('document.')) {
        return true
      }
    }
    return false
  }

  /**
   * Detect API hints in content
   */
  private detectAPIHints(): boolean {
    for (const [url, data] of this.session.mergedData) {
      // Check for API endpoints
      if (data.apiEndpoints.length > 0) {
        return true
      }

      // Check for API patterns in links
      if (data.discoveredLinks.some(link => 
        link.includes('/api/') || 
        link.includes('/v1/') || 
        link.includes('/v2/') ||
        link.includes('.json')
      )) {
        return true
      }
    }
    return false
  }

  /**
   * Get links that haven't been scraped yet
   */
  getUndiscoveredLinks(): DiscoveredLink[] {
    const scrapedUrls = new Set(this.session.mergedData.keys())
    const allDiscoveredLinks: DiscoveredLink[] = []

    // Collect all discovered links
    for (const result of this.session.history) {
      for (const link of result.discoveredLinks) {
        // Skip if already scraped
        if (!scrapedUrls.has(link.url) && !link.scraped) {
          // CRITICAL: Skip if already discovered in previous phases (e.g., sitemap)
          // This prevents counting sitemap URLs as "new discoveries"
          if (this.session.previouslyDiscoveredUrls && this.session.previouslyDiscoveredUrls.has(link.url)) {
            logSessionEvent(this.session.id, 'LINK_SKIPPED_DUPLICATE', {
              url: link.url,
              reason: 'Previously discovered in sitemap'
            })
            continue
          }
          allDiscoveredLinks.push(link)
        }
      }
    }

    // Deduplicate and prioritize
    const linkMap = new Map<string, DiscoveredLink>()
    for (const link of allDiscoveredLinks) {
      if (!linkMap.has(link.url)) {
        linkMap.set(link.url, link)
      }
    }

    return Array.from(linkMap.values()).sort((a, b) => {
      // Prioritize internal links
      if (a.type === 'internal' && b.type !== 'internal') return -1
      if (b.type === 'internal' && a.type !== 'internal') return 1
      
      // Then by priority
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      const aPriority = priorityOrder[a.priority || 'low']
      const bPriority = priorityOrder[b.priority || 'low']
      
      return aPriority - bPriority
    })
  }

  /**
   * Get average quality score across all pages
   */
  private getAverageQualityScore(): number {
    if (this.session.mergedData.size === 0) return 0
    
    let totalScore = 0
    for (const [url, data] of this.session.mergedData) {
      totalScore += data.qualityScore
    }
    
    return totalScore / this.session.mergedData.size
  }

  /**
   * Get total data summary
   */
  getTotalDataSummary() {
    // Count only truly new discovered links (excluding sitemap URLs)
    const newDiscoveredLinks = this.getUndiscoveredLinks().length
    
    const totalData = {
      pagesScraped: this.session.mergedData.size,
      dataPoints: this.session.totalStats.dataPointsExtracted,
      discoveredLinks: newDiscoveredLinks,  // Only count new links not from sitemap
      scraperRuns: this.session.history.length
    }
    
    // CRITICAL DEBUG: Log what we're returning
    logSessionEvent(this.session.id, 'TOTAL_DATA_CALCULATED', {
      mergedDataSize: this.session.mergedData.size,
      pagesScraped: totalData.pagesScraped,
      dataPoints: totalData.dataPoints,
      scraperRuns: totalData.scraperRuns
    })
    
    return totalData
  }

  /**
   * Get merged results
   */
  getMergedResults(): Map<string, MergedPageData> {
    return this.session.mergedData
  }

  /**
   * Get session history
   */
  getHistory(): ScraperResult[] {
    return this.session.history
  }

  /**
   * Get session status
   */
  getStatus(): AdditiveSession['status'] {
    return this.session.status
  }

  /**
   * Complete the session
   */
  complete(): void {
    this.session.status = 'completed'
    logSessionEvent(this.session.id, 'SESSION_COMPLETED', {
      duration: Date.now() - this.session.startedAt,
      totalPages: this.session.mergedData.size,
      totalScrapers: this.session.history.length,
      totalDataPoints: this.session.totalStats.dataPointsExtracted
    })
  }

  /**
   * Create empty stats object
   */
  private createEmptyStats(): ScrapingStats {
    return {
      duration: 0,
      pagesAttempted: 0,
      pagesSucceeded: 0,
      pagesFailed: 0,
      bytesDownloaded: 0,
      dataPointsExtracted: 0,
      linksDiscovered: 0,
      averageTimePerPage: 0,
      successRate: 0
    }
  }

  /**
   * Export session data
   */
  exportSession(): AdditiveSession {
    return this.session
  }
}