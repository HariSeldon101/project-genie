/**
 * Calculates quality scores for extracted data
 *
 * @module scrapers-v2/utilities/quality-calculator
 * @description Pure functions for quality assessment of scraped data.
 * Provides consistent scoring across all scrapers and data types.
 *
 * SCORING ALGORITHM:
 * - Base score from scraper type
 * - Field completeness bonus
 * - Data depth bonus
 * - Freshness factor
 * - Source diversity multiplier
 *
 * COMPLIANCE:
 * - Pure functions (no side effects)
 * - No database access
 * - Deterministic scoring
 */

import type { ExtractedData } from '@/lib/company-intelligence/types/scraping-interfaces'
import { ScraperType } from '@/lib/company-intelligence/types/scraping-enums'
import { SCRAPER_METRICS } from '../core/types'

/**
 * Quality scoring weights
 * Used to balance different aspects of data quality
 */
export const QUALITY_WEIGHTS = {
  fieldCoverage: 0.35,    // How many fields have data
  contentDepth: 0.30,     // How detailed is the data
  dataFreshness: 0.15,    // How recent is the data
  sourceQuality: 0.20     // Quality of the source scraper
} as const

/**
 * Field importance weights
 * Some fields are more important than others
 */
const FIELD_WEIGHTS: Record<string, number> = {
  // Company fields
  'company.name': 3.0,
  'company.description': 2.0,
  'company.industry': 1.5,
  'company.website': 1.0,
  'company.logo': 0.5,

  // Contact fields
  'contact.email': 3.0,
  'contact.phone': 2.0,
  'contact.address': 1.5,
  'contact.support': 1.0,

  // Technology fields
  'tech.frontend': 2.0,
  'tech.backend': 2.0,
  'tech.analytics': 1.0,
  'tech.cms': 1.5,

  // Social fields
  'social.linkedin': 2.0,
  'social.twitter': 1.5,
  'social.facebook': 1.0,
  'social.instagram': 1.0,

  // Content fields
  'content.titles': 2.0,
  'content.descriptions': 1.5,
  'content.paragraphs': 1.0,
  'content.images': 0.5
} as const

/**
 * Calculate quality contribution for extracted data
 * Main entry point for quality scoring
 *
 * @param scraperType - Type of scraper used
 * @param data - Extracted data to assess
 * @returns Quality score between min and max for scraper type
 */
export function calculateQualityContribution(
  scraperType: ScraperType,
  data: Partial<ExtractedData>
): number {
  const metrics = SCRAPER_METRICS[scraperType]

  // Start with base score
  let score = metrics.quality.min

  // Calculate field coverage score
  const coverageScore = calculateFieldCoverage(data)
  score += coverageScore * (metrics.quality.max - metrics.quality.min) * 0.5

  // Calculate content depth score
  const depthScore = calculateContentDepth(data)
  score += depthScore * (metrics.quality.max - metrics.quality.min) * 0.3

  // Calculate data completeness score
  const completenessScore = calculateCompleteness(data)
  score += completenessScore * (metrics.quality.max - metrics.quality.min) * 0.2

  // Cap at maximum for scraper type
  return Math.min(Math.round(score), metrics.quality.max)
}

/**
 * Calculate field coverage percentage
 * Measures how many important fields have data
 *
 * @param data - Extracted data
 * @returns Coverage score 0-1
 */
export function calculateFieldCoverage(data: Partial<ExtractedData>): number {
  if (!data) return 0

  let totalWeight = 0
  let coveredWeight = 0

  // Check company fields
  if (data.companyInfo) {
    if (data.companyInfo.name) {
      coveredWeight += FIELD_WEIGHTS['company.name']
    }
    totalWeight += FIELD_WEIGHTS['company.name']

    if (data.companyInfo.description) {
      coveredWeight += FIELD_WEIGHTS['company.description']
    }
    totalWeight += FIELD_WEIGHTS['company.description']

    if (data.companyInfo.industry) {
      coveredWeight += FIELD_WEIGHTS['company.industry']
    }
    totalWeight += FIELD_WEIGHTS['company.industry']
  }

  // Check contact fields
  if (data.contactData) {
    if (data.contactData.emails && data.contactData.emails.length > 0) {
      coveredWeight += FIELD_WEIGHTS['contact.email']
    }
    totalWeight += FIELD_WEIGHTS['contact.email']

    if (data.contactData.phones && data.contactData.phones.length > 0) {
      coveredWeight += FIELD_WEIGHTS['contact.phone']
    }
    totalWeight += FIELD_WEIGHTS['contact.phone']

    if (data.contactData.addresses && data.contactData.addresses.length > 0) {
      coveredWeight += FIELD_WEIGHTS['contact.address']
    }
    totalWeight += FIELD_WEIGHTS['contact.address']
  }

  // Check technology fields
  if (data.technologies) {
    if (data.technologies.frontend && data.technologies.frontend.length > 0) {
      coveredWeight += FIELD_WEIGHTS['tech.frontend']
    }
    totalWeight += FIELD_WEIGHTS['tech.frontend']

    if (data.technologies.backend && data.technologies.backend.length > 0) {
      coveredWeight += FIELD_WEIGHTS['tech.backend']
    }
    totalWeight += FIELD_WEIGHTS['tech.backend']

    if (data.technologies.cms) {
      coveredWeight += FIELD_WEIGHTS['tech.cms']
    }
    totalWeight += FIELD_WEIGHTS['tech.cms']
  }

  // Check social fields
  if (data.socialMedia) {
    if (data.socialMedia.linkedin) {
      coveredWeight += FIELD_WEIGHTS['social.linkedin']
    }
    totalWeight += FIELD_WEIGHTS['social.linkedin']

    if (data.socialMedia.twitter) {
      coveredWeight += FIELD_WEIGHTS['social.twitter']
    }
    totalWeight += FIELD_WEIGHTS['social.twitter']
  }

  // Calculate weighted coverage
  return totalWeight > 0 ? coveredWeight / totalWeight : 0
}

/**
 * Calculate content depth score
 * Measures how detailed and rich the extracted data is
 *
 * @param data - Extracted data
 * @returns Depth score 0-1
 */
export function calculateContentDepth(data: Partial<ExtractedData>): number {
  if (!data) return 0

  let depthScore = 0
  let factors = 0

  // Company depth
  if (data.companyInfo) {
    const companyFields = Object.keys(data.companyInfo).filter(k =>
      (data.companyInfo as any)[k] !== undefined
    ).length
    depthScore += Math.min(companyFields / 10, 1) // Cap at 10 fields
    factors++
  }

  // Contact depth
  if (data.contactData) {
    const emailCount = data.contactData.emails?.length || 0
    const phoneCount = data.contactData.phones?.length || 0
    const addressCount = data.contactData.addresses?.length || 0

    depthScore += Math.min((emailCount + phoneCount + addressCount) / 5, 1)
    factors++
  }

  // Technology depth
  if (data.technologies) {
    const techCount =
      (data.technologies.frontend?.length || 0) +
      (data.technologies.backend?.length || 0) +
      (data.technologies.analytics?.length || 0) +
      (data.technologies.hosting?.length || 0)

    depthScore += Math.min(techCount / 10, 1)
    factors++
  }

  // Social depth
  if (data.socialMedia) {
    const socialCount = Object.keys(data.socialMedia).filter(k =>
      (data.socialMedia as any)[k] !== undefined
    ).length

    depthScore += Math.min(socialCount / 5, 1)
    factors++
  }

  // Content depth
  if (data.content) {
    const hasContent =
      (data.content.titles?.length || 0) > 0 ||
      (data.content.paragraphs?.length || 0) >= 3 ||
      (data.content.images?.length || 0) > 0

    depthScore += hasContent ? 1 : 0
    factors++
  }

  return factors > 0 ? depthScore / factors : 0
}

/**
 * Calculate data completeness
 * Measures overall completeness of required data
 *
 * @param data - Extracted data
 * @returns Completeness score 0-1
 */
export function calculateCompleteness(data: Partial<ExtractedData>): number {
  if (!data) return 0

  const checks = [
    // Essential company info
    !!data.companyInfo?.name,
    !!data.companyInfo?.description,

    // Contact info
    (data.contactData?.emails?.length || 0) > 0,
    (data.contactData?.phones?.length || 0) > 0 ||
    (data.contactData?.addresses?.length || 0) > 0,

    // Technology detection
    (data.technologies?.frontend?.length || 0) > 0 ||
    (data.technologies?.backend?.length || 0) > 0,

    // Social presence
    !!data.socialMedia && Object.keys(data.socialMedia).length > 0,

    // Content
    (data.content?.paragraphs?.length || 0) >= 3
  ]

  const passedChecks = checks.filter(c => c).length
  return passedChecks / checks.length
}

/**
 * Calculate quality score for multiple data sources
 * Used when data comes from multiple scrapers
 *
 * @param sources - Array of {scraperType, data} objects
 * @returns Combined quality score
 */
export function calculateCombinedQuality(
  sources: Array<{ scraperType: ScraperType; data: Partial<ExtractedData> }>
): number {
  if (sources.length === 0) return 0

  // Calculate individual scores
  const scores = sources.map(source =>
    calculateQualityContribution(source.scraperType, source.data)
  )

  // Weight by scraper quality tier
  const weightedScores = sources.map((source, i) => {
    const metrics = SCRAPER_METRICS[source.scraperType]
    const weight = metrics.quality.max / 50 // Higher quality scrapers have more weight
    return scores[i] * weight
  })

  // Calculate weighted average
  const totalWeight = sources.reduce((sum, source) => {
    const metrics = SCRAPER_METRICS[source.scraperType]
    return sum + (metrics.quality.max / 50)
  }, 0)

  return Math.round(
    weightedScores.reduce((sum, score) => sum + score, 0) / totalWeight
  )
}

/**
 * Get quality level from score
 * Maps numeric score to quality level
 *
 * @param score - Quality score (0-100)
 * @returns Quality level string
 */
export function getQualityLevel(score: number): 'low' | 'medium' | 'high' | 'excellent' {
  if (score >= 90) return 'excellent'
  if (score >= 70) return 'high'
  if (score >= 50) return 'medium'
  return 'low'
}

/**
 * Calculate data freshness score
 * Based on when data was last updated
 *
 * @param lastUpdated - Last update timestamp
 * @returns Freshness score 0-1
 */
export function calculateFreshness(lastUpdated: Date | string): number {
  const now = Date.now()
  const updated = typeof lastUpdated === 'string' ? new Date(lastUpdated).getTime() : lastUpdated.getTime()
  const hoursOld = (now - updated) / (1000 * 60 * 60)

  if (hoursOld < 1) return 1.0      // Less than 1 hour: perfect
  if (hoursOld < 24) return 0.9     // Less than 1 day: excellent
  if (hoursOld < 72) return 0.7     // Less than 3 days: good
  if (hoursOld < 168) return 0.5    // Less than 1 week: moderate
  if (hoursOld < 720) return 0.3    // Less than 1 month: stale
  return 0.1                        // Older than 1 month: very stale
}

/**
 * Get recommendations for quality improvement
 * Suggests which scrapers to use next
 *
 * @param currentScore - Current quality score
 * @param missingFields - List of missing important fields
 * @param usedScrapers - Scrapers already used
 * @returns Array of recommendations
 */
export function getQualityRecommendations(
  currentScore: number,
  missingFields: string[],
  usedScrapers: ScraperType[]
): Array<{
  scraper: ScraperType
  reason: string
  expectedImprovement: number
}> {
  const recommendations = []

  // If score is low and static scraper not used
  if (currentScore < 50 && !usedScrapers.includes(ScraperType.STATIC)) {
    recommendations.push({
      scraper: ScraperType.STATIC,
      reason: 'Quick extraction of basic HTML content and metadata',
      expectedImprovement: 15
    })
  }

  // If missing dynamic content and dynamic scraper not used
  if (
    missingFields.some(f => f.includes('contact') || f.includes('tech')) &&
    !usedScrapers.includes(ScraperType.DYNAMIC)
  ) {
    recommendations.push({
      scraper: ScraperType.DYNAMIC,
      reason: 'JavaScript rendering needed for dynamic content',
      expectedImprovement: 20
    })
  }

  // If score still low and Firecrawl not used
  if (currentScore < 70 && !usedScrapers.includes(ScraperType.FIRECRAWL)) {
    recommendations.push({
      scraper: ScraperType.FIRECRAWL,
      reason: 'AI-powered extraction for complex data patterns',
      expectedImprovement: 30
    })
  }

  return recommendations
}