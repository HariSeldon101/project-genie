/**
 * Data Quality Assessor Service
 *
 * Evaluates the quality of scraped company intelligence data and provides
 * recommendations for improving data completeness and accuracy.
 *
 * ARCHITECTURE COMPLIANCE:
 * - Repository pattern for all database access
 * - No mock data - real assessments only
 * - Proper error handling with convertSupabaseError
 * - Uses type-safe interfaces from scraping-interfaces
 */

import { CompanyIntelligenceRepository } from '@/lib/repositories/company-intelligence-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { convertSupabaseError } from '@/lib/utils/supabase-error-helper'
import {
  QualityMetrics,
  QualityLevel,
  QualityRecommendation,
  ScraperType,
  MergedData,
  DataLayer,
  Priority,
  ScraperRun
} from '../types'

/**
 * Service for assessing data quality and providing improvement recommendations
 *
 * Quality scoring is based on:
 * - Field coverage: Presence of critical business information
 * - Content depth: Richness of extracted content
 * - Data freshness: How recently the data was updated
 * - Source quality: Number of data sources/layers
 */
export class DataQualityAssessor {
  private repository = CompanyIntelligenceRepository.getInstance()

  // Critical fields for company intelligence with their importance weights
  private readonly REQUIRED_FIELDS = [
    'company.name',
    'company.description',
    'contact.email',
    'contact.phone',
    'address.formatted',
    'technologies.frontend',
    'technologies.backend',
    'social.linkedin',
    'social.twitter',
    'company.industry',
    'company.employeeCount',
    'company.foundedYear'
  ]

  // Field weights for quality scoring (1.0 = critical, 0.1 = nice-to-have)
  private readonly FIELD_WEIGHTS: Record<string, number> = {
    'company.name': 1.0,              // Critical
    'company.description': 0.9,       // Very important
    'contact.email': 0.9,              // Very important
    'contact.phone': 0.7,              // Important
    'address.formatted': 0.6,          // Important
    'technologies.frontend': 0.5,      // Useful
    'technologies.backend': 0.5,        // Useful
    'social.linkedin': 0.4,            // Nice to have
    'social.twitter': 0.3,             // Nice to have
    'company.industry': 0.8,           // Very important
    'company.employeeCount': 0.5,      // Useful
    'company.foundedYear': 0.4,        // Nice to have
    'company.revenue': 0.6,            // Important if available
    'company.website': 0.8,            // Very important
    'technologies.cms': 0.3,           // Nice to have
    'technologies.analytics': 0.3      // Nice to have
  }

  /**
   * Calculate comprehensive quality score for a session
   */
  async calculateQualityScore(sessionId: string): Promise<QualityMetrics> {
    const timer = permanentLogger.timing('quality_assessment', { sessionId })

    permanentLogger.info('QUALITY_ASSESSOR', 'Starting quality assessment', {
      sessionId
    })

    try {
      // Get session data from repository
      const session = await this.repository.getSessionById(sessionId)

      if (!session) {
        permanentLogger.warn('QUALITY_ASSESSOR', 'Session not found', { sessionId })
        throw new Error(`Session ${sessionId} not found`)
      }

      const mergedData = session.merged_data as MergedData

      // If no data yet, return empty metrics
      if (!mergedData || Object.keys(mergedData).length === 0) {
        permanentLogger.info('QUALITY_ASSESSOR', 'No data to assess yet', { sessionId })
        return this.getEmptyMetrics()
      }

      // Calculate individual quality dimensions
      const fieldCoverage = this.calculateFieldCoverage(mergedData)
      const contentDepth = this.calculateContentDepth(mergedData)
      const dataFreshness = this.calculateDataFreshness(session.updated_at)
      const sourceQuality = this.calculateSourceQuality(mergedData)

      // Calculate weighted overall score
      const overallScore = this.calculateOverallScore({
        fieldCoverage,
        contentDepth,
        dataFreshness,
        sourceQuality
      })

      // Determine quality level based on score
      const level = this.determineQualityLevel(overallScore)

      // Find missing critical fields
      const missingFields = this.findMissingFields(mergedData)

      // Generate improvement recommendations
      const recommendations = await this.generateRecommendations(
        sessionId,
        mergedData,
        missingFields,
        overallScore
      )

      const metrics: QualityMetrics = {
        fieldCoverage,
        contentDepth,
        dataFreshness,
        sourceQuality,
        overallScore,
        level,
        missingFields,
        recommendations
      }

      permanentLogger.info('QUALITY_ASSESSOR', 'Quality assessment completed', {
        sessionId,
        overallScore,
        level,
        missingFieldsCount: missingFields.length
      })

      return metrics

    } catch (error) {
      permanentLogger.captureError('QUALITY_ASSESSOR', convertSupabaseError(error), {
        operation: 'calculateQualityScore',
        sessionId
      })
      throw error
    } finally {
      timer.stop()
    }
  }

  /**
   * Calculate field coverage percentage based on weighted importance
   */
  private calculateFieldCoverage(data: MergedData): number {
    let coveredWeight = 0
    let totalWeight = 0

    for (const [field, weight] of Object.entries(this.FIELD_WEIGHTS)) {
      totalWeight += weight

      if (this.hasField(data, field)) {
        coveredWeight += weight
      }
    }

    // Return percentage (0-100)
    return totalWeight > 0 ? Math.round((coveredWeight / totalWeight) * 100) : 0
  }

  /**
   * Calculate content depth score based on richness of extracted data
   */
  private calculateContentDepth(data: MergedData): number {
    let depthScore = 0
    let maxPossibleScore = 100

    // Check static content depth
    if (data[DataLayer.STATIC_CONTENT]) {
      const staticData = data[DataLayer.STATIC_CONTENT]

      // Score based on content volume
      if (staticData.content?.paragraphs?.length) {
        const paragraphScore = Math.min(staticData.content.paragraphs.length * 2, 20)
        depthScore += paragraphScore
      }

      if (staticData.content?.images?.length) {
        const imageScore = Math.min(staticData.content.images.length * 3, 15)
        depthScore += imageScore
      }

      if (staticData.content?.headings?.h1?.length) {
        depthScore += Math.min(staticData.content.headings.h1.length * 5, 10)
      }
    }

    // Check dynamic content depth
    if (data[DataLayer.DYNAMIC_CONTENT]) {
      const dynamicData = data[DataLayer.DYNAMIC_CONTENT]

      // Contact information depth
      if (dynamicData.contactData?.emails?.length) {
        depthScore += Math.min(dynamicData.contactData.emails.length * 10, 20)
      }

      if (dynamicData.contactData?.phones?.length) {
        depthScore += Math.min(dynamicData.contactData.phones.length * 8, 15)
      }

      // Technology stack depth
      if (dynamicData.technologies?.frontend?.length) {
        depthScore += Math.min(dynamicData.technologies.frontend.length * 3, 10)
      }

      if (dynamicData.technologies?.backend?.length) {
        depthScore += Math.min(dynamicData.technologies.backend.length * 3, 10)
      }
    }

    // Cap at 100
    return Math.min(Math.round(depthScore), 100)
  }

  /**
   * Calculate data freshness score (0-100, where 100 is very fresh)
   */
  private calculateDataFreshness(lastUpdated: string): number {
    const hoursOld = (Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60)

    if (hoursOld < 1) return 100      // Less than 1 hour old
    if (hoursOld < 24) return 90      // Less than 1 day old
    if (hoursOld < 72) return 70      // Less than 3 days old
    if (hoursOld < 168) return 50     // Less than 1 week old
    if (hoursOld < 720) return 30     // Less than 1 month old
    if (hoursOld < 2160) return 20    // Less than 3 months old
    return 10                         // Older than 3 months
  }

  /**
   * Calculate source quality based on number and variety of data sources
   */
  private calculateSourceQuality(data: MergedData): number {
    let sourceCount = 0
    let qualityScore = 0

    // Count active data layers
    if (data[DataLayer.SITE_ANALYSIS]) {
      sourceCount++
      qualityScore += 20
    }

    if (data[DataLayer.STATIC_CONTENT] && Object.keys(data[DataLayer.STATIC_CONTENT]).length > 0) {
      sourceCount++
      qualityScore += 25
    }

    if (data[DataLayer.DYNAMIC_CONTENT] && Object.keys(data[DataLayer.DYNAMIC_CONTENT]).length > 0) {
      sourceCount++
      qualityScore += 30
    }

    if (data[DataLayer.AI_EXTRACTED] && Object.keys(data[DataLayer.AI_EXTRACTED]).length > 0) {
      sourceCount++
      qualityScore += 15
    }

    if (data[DataLayer.LLM_ENRICHED] && Object.keys(data[DataLayer.LLM_ENRICHED]).length > 0) {
      sourceCount++
      qualityScore += 10
    }

    // Bonus for multiple sources (data validation through redundancy)
    if (sourceCount >= 3) {
      qualityScore = Math.min(qualityScore + 20, 100)
    } else if (sourceCount >= 2) {
      qualityScore = Math.min(qualityScore + 10, 100)
    }

    return Math.min(qualityScore, 100)
  }

  /**
   * Calculate weighted overall score from individual metrics
   */
  private calculateOverallScore(metrics: {
    fieldCoverage: number
    contentDepth: number
    dataFreshness: number
    sourceQuality: number
  }): number {
    // Weights for each dimension (must sum to 1.0)
    const weights = {
      fieldCoverage: 0.40,   // Most important - having the right data
      contentDepth: 0.25,    // Important - richness of data
      sourceQuality: 0.20,   // Important - multiple sources for validation
      dataFreshness: 0.15    // Less critical but still matters
    }

    const weightedScore =
      metrics.fieldCoverage * weights.fieldCoverage +
      metrics.contentDepth * weights.contentDepth +
      metrics.dataFreshness * weights.dataFreshness +
      metrics.sourceQuality * weights.sourceQuality

    return Math.round(weightedScore)
  }

  /**
   * Determine quality level enum from numerical score
   */
  private determineQualityLevel(score: number): QualityLevel {
    if (score >= 90) return QualityLevel.EXCELLENT
    if (score >= 70) return QualityLevel.HIGH
    if (score >= 50) return QualityLevel.MEDIUM
    return QualityLevel.LOW
  }

  /**
   * Find missing required fields in the merged data
   */
  private findMissingFields(data: MergedData): string[] {
    const missing: string[] = []

    for (const field of this.REQUIRED_FIELDS) {
      if (!this.hasField(data, field)) {
        missing.push(field)
      }
    }

    return missing
  }

  /**
   * Check if a field exists in any layer of the merged data
   */
  private hasField(data: MergedData, fieldPath: string): boolean {
    const parts = fieldPath.split('.')

    // Check all data layers for the field
    const layers = [
      DataLayer.STATIC_CONTENT,
      DataLayer.DYNAMIC_CONTENT,
      DataLayer.AI_EXTRACTED,
      DataLayer.LLM_ENRICHED
    ]

    for (const layer of layers) {
      if (!data[layer]) continue

      let current: any = data[layer]
      let found = true

      // Navigate through the field path
      for (const part of parts) {
        if (current && typeof current === 'object' && part in current) {
          current = current[part]
        } else {
          found = false
          break
        }
      }

      // Check if we found a non-empty value
      if (found && current !== null && current !== undefined) {
        // For arrays, check if not empty
        if (Array.isArray(current) && current.length === 0) {
          continue
        }
        // For strings, check if not empty
        if (typeof current === 'string' && current.trim() === '') {
          continue
        }
        return true
      }
    }

    // Special case for site analysis data
    if (fieldPath.startsWith('site.') && data[DataLayer.SITE_ANALYSIS]) {
      const siteParts = fieldPath.substring(5).split('.')
      let current: any = data[DataLayer.SITE_ANALYSIS]

      for (const part of siteParts) {
        if (current && typeof current === 'object' && part in current) {
          current = current[part]
        } else {
          return false
        }
      }

      return current !== null && current !== undefined
    }

    return false
  }

  /**
   * Generate quality improvement recommendations based on current state
   */
  private async generateRecommendations(
    sessionId: string,
    data: MergedData,
    missingFields: string[],
    currentScore: number
  ): Promise<QualityRecommendation[]> {
    const recommendations: QualityRecommendation[] = []

    try {
      // Get scraping history to see what's already been tried
      const history = await this.repository.getScrapingHistory(sessionId)
      const usedScrapers = new Set(history.map((h: ScraperRun) => h.scraperId))

      // Recommend Static scraper if not used and missing basic content
      if (!usedScrapers.has(ScraperType.STATIC) && currentScore < 90) {
        recommendations.push({
          scraper: ScraperType.STATIC,
          reason: 'Fast extraction of basic HTML content, metadata, and static information',
          expectedImprovement: this.estimateImprovementForStatic(missingFields),
          estimatedCost: 0.001,
          priority: Priority.HIGH
        })
      }

      // Recommend Dynamic scraper for JavaScript-rendered content
      if (!usedScrapers.has(ScraperType.DYNAMIC)) {
        const needsDynamic = missingFields.some(f =>
          f.includes('contact') ||
          f.includes('technologies') ||
          f.includes('social')
        )

        if (needsDynamic || currentScore < 70) {
          recommendations.push({
            scraper: ScraperType.DYNAMIC,
            reason: 'Extract JavaScript-rendered content including contact forms, dynamic elements, and technology stack',
            expectedImprovement: this.estimateImprovementForDynamic(missingFields),
            estimatedCost: 0.01,
            priority: missingFields.some(f => f.includes('contact')) ? Priority.HIGH : Priority.MEDIUM
          })
        }
      }

      // Recommend AI extraction for complex patterns (Phase 2)
      if (currentScore < 80 && !usedScrapers.has(ScraperType.FIRECRAWL)) {
        recommendations.push({
          scraper: ScraperType.FIRECRAWL,
          reason: 'AI-powered extraction can identify complex patterns and extract structured data from unstructured content',
          expectedImprovement: 25,
          estimatedCost: 0.05,
          priority: Priority.LOW // Phase 2
        })
      }

      // Sort recommendations by priority
      recommendations.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 }
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      })

    } catch (error) {
      permanentLogger.captureError('QUALITY_ASSESSOR', convertSupabaseError(error), {
        operation: 'generateRecommendations',
        sessionId
      })
      // Return recommendations based on current data even if history fails
    }

    return recommendations
  }

  /**
   * Estimate quality improvement from static scraper
   */
  private estimateImprovementForStatic(missingFields: string[]): number {
    let improvement = 0

    const staticFields = [
      'company.name', 'company.description', 'company.industry',
      'address.formatted', 'company.website'
    ]

    for (const field of missingFields) {
      if (staticFields.includes(field)) {
        improvement += this.FIELD_WEIGHTS[field] * 10 || 5
      }
    }

    return Math.min(Math.round(improvement), 30)
  }

  /**
   * Estimate quality improvement from dynamic scraper
   */
  private estimateImprovementForDynamic(missingFields: string[]): number {
    let improvement = 0

    const dynamicFields = [
      'contact.email', 'contact.phone', 'technologies.frontend',
      'technologies.backend', 'social.linkedin', 'social.twitter'
    ]

    for (const field of missingFields) {
      if (dynamicFields.includes(field)) {
        improvement += this.FIELD_WEIGHTS[field] * 15 || 8
      }
    }

    return Math.min(Math.round(improvement), 40)
  }

  /**
   * Get empty metrics structure for new sessions
   */
  private getEmptyMetrics(): QualityMetrics {
    return {
      fieldCoverage: 0,
      contentDepth: 0,
      dataFreshness: 100, // New session is "fresh"
      sourceQuality: 0,
      overallScore: 0,
      level: QualityLevel.LOW,
      missingFields: this.REQUIRED_FIELDS,
      recommendations: [
        {
          scraper: ScraperType.STATIC,
          reason: 'Start with basic static content extraction to establish baseline data',
          expectedImprovement: 30,
          estimatedCost: 0.001,
          priority: Priority.HIGH
        }
      ]
    }
  }
}