/**
 * Smart Router Service
 *
 * Intelligently selects the optimal scraper based on site technology,
 * quality requirements, and historical performance.
 *
 * ARCHITECTURE COMPLIANCE:
 * - Repository pattern for database access
 * - No mock data - real routing decisions only
 * - Proper error handling with convertSupabaseError
 * - Type-safe with scraping interfaces
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { convertSupabaseError } from '@/lib/utils/supabase-error-helper'
import {
  ScraperType,
  RoutingDecision,
  QualityMetrics,
  ScraperRun,
  TechConfidence,
  MergedData,
  DataLayer,
  Technology,
  SiteAnalysisData
} from '../types'

/**
 * Intelligent scraper routing service
 *
 * Responsibilities:
 * - Detect website technology stack
 * - Select optimal scraper based on site characteristics
 * - Provide fallback alternatives
 * - Learn from historical performance
 */
export class SmartRouter {
  // Technology patterns for detection
  private readonly TECHNOLOGY_PATTERNS: Record<string, RegExp[]> = {
    react: [
      /react/i,
      /_react/i,
      /react-dom/i,
      /ReactDOM\.render/,
      /__REACT_DEVTOOLS/
    ],
    angular: [
      /angular/i,
      /ng-app/,
      /ng-controller/,
      /angular\.module/
    ],
    vue: [
      /vue/i,
      /v-if/,
      /v-for/,
      /v-model/,
      /Vue\.createApp/
    ],
    nextjs: [
      /_next/i,
      /__NEXT_DATA__/,
      /next\.js/i,
      /next-head/
    ],
    wordpress: [
      /wp-content/i,
      /wp-includes/i,
      /wordpress/i,
      /wp-json/
    ],
    shopify: [
      /shopify/i,
      /myshopify\.com/,
      /cdn\.shopify/
    ],
    static: [
      /\.html$/i,
      /<!DOCTYPE html>/i
    ]
  }

  // Scraper capabilities mapping
  private readonly SCRAPER_CAPABILITIES: Record<ScraperType, {
    goodFor: string[]
    badFor: string[]
    technologies: string[]
  }> = {
    [ScraperType.STATIC]: {
      goodFor: ['static', 'wordpress', 'simple HTML', 'blogs'],
      badFor: ['react', 'angular', 'vue', 'heavy JavaScript'],
      technologies: ['static', 'wordpress']
    },
    [ScraperType.DYNAMIC]: {
      goodFor: ['react', 'angular', 'vue', 'nextjs', 'JavaScript-heavy'],
      badFor: ['none'],
      technologies: ['react', 'angular', 'vue', 'nextjs', 'spa']
    },
    [ScraperType.SPA]: {
      goodFor: ['react', 'angular', 'vue', 'complex SPAs'],
      badFor: ['static'],
      technologies: ['react', 'angular', 'vue']
    },
    [ScraperType.API]: {
      goodFor: ['apis', 'json', 'structured data'],
      badFor: ['html scraping'],
      technologies: ['api', 'graphql', 'rest']
    },
    [ScraperType.FIRECRAWL]: {
      goodFor: ['complex', 'dynamic', 'unstructured'],
      badFor: ['simple static'],
      technologies: ['any']
    }
  }

  /**
   * Get routing recommendation based on site analysis and quality needs
   */
  async getRecommendation(
    domain: string,
    currentQuality: QualityMetrics,
    scrapingHistory: ScraperRun[],
    mergedData: MergedData | null
  ): Promise<RoutingDecision | null> {
    const timer = permanentLogger.timing('routing_decision', { domain })

    permanentLogger.info('SMART_ROUTER', 'Generating routing recommendation', {
      domain,
      currentQualityScore: currentQuality.overallScore,
      historyCount: scrapingHistory.length
    })

    try {
      // Detect technology stack from site analysis
      const detectedTech = this.detectTechnology(mergedData)

      // Get scrapers that haven't been used yet
      const usedScrapers = new Set(scrapingHistory.map(h => h.scraperId))
      const availableScrapers = this.getAvailableScrapers(usedScrapers)

      if (availableScrapers.length === 0) {
        permanentLogger.info('SMART_ROUTER', 'All scrapers have been used', { domain })
        return null
      }

      // Score each available scraper
      const scoredScrapers = this.scoreScrapers(
        availableScrapers,
        detectedTech,
        currentQuality,
        scrapingHistory
      )

      if (scoredScrapers.length === 0) {
        permanentLogger.warn('SMART_ROUTER', 'No suitable scrapers found', { domain })
        return null
      }

      // Select the best scraper
      const bestScraper = scoredScrapers[0]

      // Get alternatives
      const alternatives = scoredScrapers
        .slice(1, 4)
        .map(s => s.scraper)

      // Calculate estimated quality gain
      const estimatedQualityGain = this.estimateQualityGain(
        bestScraper.scraper,
        currentQuality,
        detectedTech
      )

      // Estimate cost
      const estimatedCost = this.estimateCost(bestScraper.scraper)

      const decision: RoutingDecision = {
        recommendedScraper: bestScraper.scraper,
        reason: bestScraper.reason,
        alternativeScrapers: alternatives,
        estimatedQualityGain,
        estimatedCost,
        confidence: bestScraper.confidence
      }

      permanentLogger.info('SMART_ROUTER', 'Routing decision made', {
        domain,
        recommended: decision.recommendedScraper,
        confidence: decision.confidence,
        alternatives: decision.alternativeScrapers.length
      })

      return decision

    } catch (error) {
      permanentLogger.captureError('SMART_ROUTER', convertSupabaseError(error), {
        operation: 'getRecommendation',
        domain
      })
      throw error
    } finally {
      timer.stop()
    }
  }

  /**
   * Detect technology stack from site analysis and HTML patterns
   */
  detectTechnology(mergedData: MergedData | null): Technology[] {
    const technologies: Technology[] = []

    if (!mergedData) {
      return technologies
    }

    // Check site analysis data
    if (mergedData[DataLayer.SITE_ANALYSIS]) {
      const siteData = mergedData[DataLayer.SITE_ANALYSIS] as SiteAnalysisData

      // Use technologies from site analysis if available
      if (siteData.technologies && siteData.technologies.length > 0) {
        technologies.push(...siteData.technologies)
      }
    }

    // Analyze static content for technology patterns
    if (mergedData[DataLayer.STATIC_CONTENT]) {
      const staticData = mergedData[DataLayer.STATIC_CONTENT]

      // Check HTML content for patterns
      if (staticData.content?.paragraphs) {
        const contentString = staticData.content.paragraphs.join(' ')
        technologies.push(...this.detectTechFromContent(contentString))
      }
    }

    // Deduplicate technologies
    const uniqueTech = technologies.reduce((acc, tech) => {
      const exists = acc.find(t => t.name === tech.name)
      if (!exists) {
        acc.push(tech)
      } else if (tech.confidence > exists.confidence) {
        // Update with higher confidence
        exists.confidence = tech.confidence
      }
      return acc
    }, [] as Technology[])

    permanentLogger.debug('SMART_ROUTER', 'Technologies detected', {
      count: uniqueTech.length,
      technologies: uniqueTech.map(t => `${t.name} (${t.confidence})`)
    })

    return uniqueTech
  }

  /**
   * Detect technology from content strings
   */
  private detectTechFromContent(content: string): Technology[] {
    const detected: Technology[] = []

    for (const [tech, patterns] of Object.entries(this.TECHNOLOGY_PATTERNS)) {
      let matches = 0
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          matches++
        }
      }

      if (matches > 0) {
        const confidence = this.calculateConfidence(matches, patterns.length)
        detected.push({
          name: tech,
          confidence,
          detectedBy: [ScraperType.STATIC],
          category: 'frontend'
        })
      }
    }

    return detected
  }

  /**
   * Calculate confidence level based on pattern matches
   */
  private calculateConfidence(matches: number, totalPatterns: number): TechConfidence {
    const ratio = matches / totalPatterns

    if (ratio >= 0.75) return TechConfidence.CERTAIN
    if (ratio >= 0.5) return TechConfidence.PROBABLE
    if (ratio >= 0.25) return TechConfidence.POSSIBLE
    return TechConfidence.UNCERTAIN
  }

  /**
   * Get scrapers that haven't been used yet
   */
  private getAvailableScrapers(usedScrapers: Set<ScraperType>): ScraperType[] {
    const allScrapers = [
      ScraperType.STATIC,
      ScraperType.DYNAMIC,
      // ScraperType.SPA,      // Phase 2
      // ScraperType.API,      // Phase 2
      // ScraperType.FIRECRAWL // Phase 2
    ]

    return allScrapers.filter(s => !usedScrapers.has(s))
  }

  /**
   * Score scrapers based on technology fit and expected performance
   */
  private scoreScrapers(
    scrapers: ScraperType[],
    technologies: Technology[],
    currentQuality: QualityMetrics,
    history: ScraperRun[]
  ): Array<{
    scraper: ScraperType
    score: number
    reason: string
    confidence: TechConfidence
  }> {
    const scored = scrapers.map(scraper => {
      let score = 0
      let reasons: string[] = []

      // Score based on technology compatibility
      const techScore = this.scoreTechnologyFit(scraper, technologies)
      score += techScore.score
      if (techScore.reason) reasons.push(techScore.reason)

      // Score based on quality improvement potential
      const qualityScore = this.scoreQualityPotential(scraper, currentQuality)
      score += qualityScore.score
      if (qualityScore.reason) reasons.push(qualityScore.reason)

      // Score based on historical performance (if any similar sites)
      const historyScore = this.scoreHistoricalPerformance(scraper, history)
      score += historyScore
      if (historyScore > 0) reasons.push('Good historical performance')

      // Determine confidence
      const confidence = this.determineConfidence(score, technologies)

      // Generate comprehensive reason
      const reason = reasons.length > 0
        ? reasons.join('. ')
        : `Suitable for extracting additional data from the site`

      return { scraper, score, reason, confidence }
    })

    // Sort by score (highest first)
    scored.sort((a, b) => b.score - a.score)

    return scored
  }

  /**
   * Score technology fit for a scraper
   */
  private scoreTechnologyFit(
    scraper: ScraperType,
    technologies: Technology[]
  ): { score: number; reason: string } {
    const capabilities = this.SCRAPER_CAPABILITIES[scraper]
    let score = 0
    let matchedTech: string[] = []

    for (const tech of technologies) {
      const techName = tech.name.toLowerCase()

      // Positive match
      if (capabilities.goodFor.some(good => techName.includes(good))) {
        score += 30 * (tech.confidence === TechConfidence.CERTAIN ? 1 : 0.7)
        matchedTech.push(tech.name)
      }

      // Negative match
      if (capabilities.badFor.some(bad => techName.includes(bad))) {
        score -= 20
      }

      // Direct technology match
      if (capabilities.technologies.includes(techName)) {
        score += 40
        matchedTech.push(tech.name)
      }
    }

    // Default score if no technology detected
    if (technologies.length === 0) {
      if (scraper === ScraperType.STATIC) {
        score = 30 // Prefer static for unknown sites
      } else {
        score = 20
      }
    }

    const reason = matchedTech.length > 0
      ? `Optimized for ${matchedTech.join(', ')}`
      : ''

    return { score, reason }
  }

  /**
   * Score quality improvement potential
   */
  private scoreQualityPotential(
    scraper: ScraperType,
    currentQuality: QualityMetrics
  ): { score: number; reason: string } {
    let score = 0
    let reason = ''

    // Low quality - any scraper has high potential
    if (currentQuality.overallScore < 30) {
      score = 40
      reason = 'High potential for quality improvement'
    }
    // Medium quality - dynamic scrapers have advantage
    else if (currentQuality.overallScore < 70) {
      if (scraper === ScraperType.DYNAMIC || scraper === ScraperType.SPA) {
        score = 30
        reason = 'Can extract dynamic content to improve quality'
      } else {
        score = 20
      }
    }
    // High quality - specialized scrapers for fine-tuning
    else {
      if (scraper === ScraperType.FIRECRAWL || scraper === ScraperType.API) {
        score = 25
        reason = 'Can extract specialized data for fine-tuning'
      } else {
        score = 10
      }
    }

    // Bonus for missing field coverage
    if (currentQuality.missingFields.length > 5 && scraper === ScraperType.DYNAMIC) {
      score += 15
      reason = 'Can fill many missing fields'
    }

    return { score, reason }
  }

  /**
   * Score based on historical performance
   */
  private scoreHistoricalPerformance(
    scraper: ScraperType,
    history: ScraperRun[]
  ): number {
    // For now, return a neutral score
    // In production, this would analyze past performance metrics
    return 0
  }

  /**
   * Determine confidence level for routing decision
   */
  private determineConfidence(score: number, technologies: Technology[]): TechConfidence {
    // High score with detected technologies = high confidence
    if (score >= 70 && technologies.length > 0) {
      return TechConfidence.CERTAIN
    }
    if (score >= 50) {
      return TechConfidence.PROBABLE
    }
    if (score >= 30) {
      return TechConfidence.POSSIBLE
    }
    return TechConfidence.UNCERTAIN
  }

  /**
   * Estimate quality gain from a scraper
   */
  private estimateQualityGain(
    scraper: ScraperType,
    currentQuality: QualityMetrics,
    technologies: Technology[]
  ): number {
    let baseGain = 0

    // Base gain depends on scraper type
    switch (scraper) {
      case ScraperType.STATIC:
        baseGain = 15
        break
      case ScraperType.DYNAMIC:
        baseGain = 25
        break
      case ScraperType.SPA:
        baseGain = 20
        break
      case ScraperType.API:
        baseGain = 15
        break
      case ScraperType.FIRECRAWL:
        baseGain = 30
        break
    }

    // Adjust based on current quality (diminishing returns)
    if (currentQuality.overallScore > 70) {
      baseGain *= 0.5
    } else if (currentQuality.overallScore > 50) {
      baseGain *= 0.75
    }

    // Bonus for technology match
    const capabilities = this.SCRAPER_CAPABILITIES[scraper]
    const hasGoodMatch = technologies.some(tech =>
      capabilities.technologies.includes(tech.name.toLowerCase())
    )
    if (hasGoodMatch) {
      baseGain *= 1.2
    }

    return Math.round(baseGain)
  }

  /**
   * Estimate cost for a scraper
   */
  private estimateCost(scraper: ScraperType): number {
    // Base cost estimates
    const costs: Record<ScraperType, number> = {
      [ScraperType.STATIC]: 0.01,
      [ScraperType.DYNAMIC]: 0.10,
      [ScraperType.SPA]: 0.15,
      [ScraperType.API]: 0.02,
      [ScraperType.FIRECRAWL]: 0.50
    }

    return costs[scraper] || 0.10
  }

  /**
   * Get fallback scraper when no optimal choice exists
   */
  getFallbackScraper(usedScrapers: Set<ScraperType>): ScraperType | null {
    // Fallback order: Static -> Dynamic -> SPA -> API -> Firecrawl
    const fallbackOrder = [
      ScraperType.STATIC,
      ScraperType.DYNAMIC,
      ScraperType.SPA,
      ScraperType.API,
      ScraperType.FIRECRAWL
    ]

    for (const scraper of fallbackOrder) {
      if (!usedScrapers.has(scraper)) {
        permanentLogger.info('SMART_ROUTER', 'Using fallback scraper', { scraper })
        return scraper
      }
    }

    return null
  }

  /**
   * Validate routing decision before execution
   */
  validateDecision(decision: RoutingDecision): boolean {
    // Validate that recommended scraper is valid
    if (!Object.values(ScraperType).includes(decision.recommendedScraper)) {
      permanentLogger.warn('SMART_ROUTER', 'Invalid scraper in decision', {
        scraper: decision.recommendedScraper
      })
      return false
    }

    // Validate cost is reasonable
    if (decision.estimatedCost < 0 || decision.estimatedCost > 10) {
      permanentLogger.warn('SMART_ROUTER', 'Unreasonable cost estimate', {
        cost: decision.estimatedCost
      })
      return false
    }

    // Validate quality gain is reasonable
    if (decision.estimatedQualityGain < 0 || decision.estimatedQualityGain > 100) {
      permanentLogger.warn('SMART_ROUTER', 'Unreasonable quality gain estimate', {
        gain: decision.estimatedQualityGain
      })
      return false
    }

    return true
  }
}