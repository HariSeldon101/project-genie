/**
 * Tracks and calculates scraping costs
 *
 * @module scrapers-v2/utilities/cost-calculator
 * @description Pure functions for cost calculation and budget tracking.
 * Provides accurate cost estimates for different scrapers and features.
 *
 * COST MODEL:
 * - Per-page base costs
 * - Feature-specific additions
 * - Batch operation discounts
 * - Budget enforcement
 *
 * COMPLIANCE:
 * - Pure functions
 * - No external dependencies
 * - Deterministic calculations
 */

import { ScraperType } from '@/lib/company-intelligence/types/scraping-enums'
import { SCRAPER_METRICS } from '../core/types'
import type { FirecrawlConfig } from '../types/firecrawl.types'

/**
 * Cost breakdown for different operations
 * All costs in USD
 */
export const COST_TABLE = {
  // Base scraper costs per page
  scrapers: {
    [ScraperType.STATIC]: 0.001,
    [ScraperType.DYNAMIC]: 0.01,
    [ScraperType.SPA]: 0.015,
    [ScraperType.API]: 0.005,
    [ScraperType.FIRECRAWL]: 0.05
  },

  // Firecrawl feature costs
  firecrawl: {
    base: 0.05,
    map: 0.01,          // Per URL discovered
    schema: 0.10,       // LLM extraction
    screenshot: 0.02,
    pdf: 0.03,
    actions: 0.05,
    markdown: 0.01
  },

  // Additional operation costs
  operations: {
    browserInstance: 0.001,  // Per browser instance
    apiCall: 0.0001,        // Per API call
    storageGb: 0.02,        // Per GB stored
    bandwidthGb: 0.05       // Per GB transferred
  }
} as const

/**
 * Batch operation discounts
 * Applied when processing multiple URLs
 */
const BATCH_DISCOUNTS = {
  10: 0.95,    // 5% discount for 10+ URLs
  50: 0.90,    // 10% discount for 50+ URLs
  100: 0.85,   // 15% discount for 100+ URLs
  500: 0.80,   // 20% discount for 500+ URLs
  1000: 0.75   // 25% discount for 1000+ URLs
} as const

/**
 * Calculate cost for a single scraper run
 *
 * @param scraperType - Type of scraper
 * @param urlCount - Number of URLs to scrape
 * @param options - Additional options
 * @returns Cost in USD
 */
export function calculateScraperCost(
  scraperType: ScraperType,
  urlCount: number,
  options?: {
    includeOverhead?: boolean
    applyBatchDiscount?: boolean
  }
): number {
  const { includeOverhead = true, applyBatchDiscount = true } = options || {}

  // Base cost
  let cost = COST_TABLE.scrapers[scraperType] * urlCount

  // Apply batch discount if eligible
  if (applyBatchDiscount && urlCount >= 10) {
    const discount = getBatchDiscount(urlCount)
    cost *= discount
  }

  // Add overhead costs if requested
  if (includeOverhead) {
    cost += calculateOverheadCost(scraperType, urlCount)
  }

  return Math.round(cost * 10000) / 10000 // Round to 4 decimal places
}

/**
 * Calculate Firecrawl cost based on configuration
 *
 * @param config - Firecrawl configuration
 * @param urlCount - Number of URLs to process
 * @returns Cost in USD
 */
export function calculateFirecrawlCost(
  config: FirecrawlConfig,
  urlCount: number
): number {
  let cost = COST_TABLE.firecrawl.base * urlCount

  // Map discovery cost
  if (config.enableMap) {
    const discoveredUrls = config.mapOptions?.limit || 10
    cost += COST_TABLE.firecrawl.map * discoveredUrls
  }

  // Schema extraction cost
  if (config.useSchema) {
    cost += COST_TABLE.firecrawl.schema * urlCount
  }

  // Screenshot cost
  if (config.enableScreenshots) {
    cost += COST_TABLE.firecrawl.screenshot * urlCount
  }

  // PDF generation cost
  if (config.enablePdf) {
    cost += COST_TABLE.firecrawl.pdf * urlCount
  }

  // Actions cost
  if (config.enableActions && config.actions?.length) {
    cost += COST_TABLE.firecrawl.actions * urlCount
  }

  // Markdown conversion cost
  if (config.enableMarkdown) {
    cost += COST_TABLE.firecrawl.markdown * urlCount
  }

  // Apply max cost per page limit
  const maxTotalCost = config.maxCostPerPage * urlCount
  if (cost > maxTotalCost) {
    cost = maxTotalCost
  }

  return Math.round(cost * 10000) / 10000
}

/**
 * Get batch discount rate
 *
 * @param urlCount - Number of URLs
 * @returns Discount multiplier (0-1)
 */
function getBatchDiscount(urlCount: number): number {
  for (const [threshold, discount] of Object.entries(BATCH_DISCOUNTS).reverse()) {
    if (urlCount >= parseInt(threshold)) {
      return discount
    }
  }
  return 1.0 // No discount
}

/**
 * Calculate overhead costs
 * Includes infrastructure and processing costs
 *
 * @param scraperType - Type of scraper
 * @param urlCount - Number of URLs
 * @returns Overhead cost in USD
 */
function calculateOverheadCost(scraperType: ScraperType, urlCount: number): number {
  let overhead = 0

  // Browser costs for dynamic scrapers
  if (scraperType === ScraperType.DYNAMIC || scraperType === ScraperType.SPA) {
    overhead += COST_TABLE.operations.browserInstance * Math.ceil(urlCount / 10)
  }

  // API costs
  overhead += COST_TABLE.operations.apiCall * urlCount

  // Estimated storage (100KB per page average)
  const storageGb = (urlCount * 0.0001)
  overhead += COST_TABLE.operations.storageGb * storageGb

  // Estimated bandwidth (500KB per page average)
  const bandwidthGb = (urlCount * 0.0005)
  overhead += COST_TABLE.operations.bandwidthGb * bandwidthGb

  return overhead
}

/**
 * Calculate cumulative cost for multiple scraper runs
 *
 * @param runs - Array of scraper runs with type and URL count
 * @returns Total cost in USD
 */
export function calculateCumulativeCost(
  runs: Array<{
    scraperType: ScraperType
    urlCount: number
    config?: any
  }>
): number {
  let totalCost = 0

  for (const run of runs) {
    if (run.scraperType === ScraperType.FIRECRAWL && run.config) {
      totalCost += calculateFirecrawlCost(run.config, run.urlCount)
    } else {
      totalCost += calculateScraperCost(run.scraperType, run.urlCount)
    }
  }

  return Math.round(totalCost * 10000) / 10000
}

/**
 * Check if operation would exceed budget
 *
 * @param currentSpent - Amount already spent
 * @param estimatedCost - Estimated cost of operation
 * @param budget - Total budget
 * @returns Budget check result
 */
export function checkBudget(
  currentSpent: number,
  estimatedCost: number,
  budget: number
): {
  withinBudget: boolean
  remainingBudget: number
  percentUsed: number
  canAfford: boolean
} {
  const remainingBudget = budget - currentSpent
  const percentUsed = (currentSpent / budget) * 100
  const canAfford = estimatedCost <= remainingBudget
  const withinBudget = currentSpent < budget

  return {
    withinBudget,
    remainingBudget: Math.max(0, remainingBudget),
    percentUsed: Math.min(100, percentUsed),
    canAfford
  }
}

/**
 * Estimate cost for progressive scraping session
 * Estimates total cost to reach quality target
 *
 * @param currentQuality - Current quality score
 * @param targetQuality - Target quality score
 * @param urlCount - Number of URLs to scrape
 * @param availableScrapers - Scrapers available to use
 * @returns Estimated total cost
 */
export function estimateProgressiveCost(
  currentQuality: number,
  targetQuality: number,
  urlCount: number,
  availableScrapers: ScraperType[] = [
    ScraperType.STATIC,
    ScraperType.DYNAMIC,
    ScraperType.FIRECRAWL
  ]
): {
  estimatedCost: number
  scrapersNeeded: ScraperType[]
  breakdown: Record<ScraperType, number>
} {
  const scrapersNeeded: ScraperType[] = []
  const breakdown: Record<string, number> = {}
  let estimatedCost = 0
  let quality = currentQuality

  // Simulate progressive enhancement
  for (const scraperType of availableScrapers) {
    if (quality >= targetQuality) break

    // Estimate quality improvement
    const metrics = SCRAPER_METRICS[scraperType]
    const qualityImprovement = (metrics.quality.min + metrics.quality.max) / 2

    // Calculate cost for this scraper
    const cost = calculateScraperCost(scraperType, urlCount)
    estimatedCost += cost
    breakdown[scraperType] = cost
    scrapersNeeded.push(scraperType)

    // Update quality
    quality += qualityImprovement

    // Cap at 100
    if (quality > 100) quality = 100
  }

  return {
    estimatedCost,
    scrapersNeeded,
    breakdown: breakdown as Record<ScraperType, number>
  }
}

/**
 * Get cost tier for a given amount
 * Used for UI display and decision making
 *
 * @param cost - Cost in USD
 * @returns Cost tier
 */
export function getCostTier(cost: number): 'free' | 'cheap' | 'moderate' | 'expensive' {
  if (cost === 0) return 'free'
  if (cost < 0.01) return 'cheap'
  if (cost < 0.10) return 'moderate'
  return 'expensive'
}

/**
 * Format cost for display
 * Handles very small and large amounts appropriately
 *
 * @param cost - Cost in USD
 * @param options - Formatting options
 * @returns Formatted cost string
 */
export function formatCost(
  cost: number,
  options?: {
    minimumFractionDigits?: number
    maximumFractionDigits?: number
    includeCurrency?: boolean
  }
): string {
  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 4,
    includeCurrency = true
  } = options || {}

  const formatted = cost.toLocaleString('en-US', {
    minimumFractionDigits,
    maximumFractionDigits
  })

  return includeCurrency ? `$${formatted}` : formatted
}

/**
 * Calculate ROI for scraping operation
 * Helps determine if cost is justified
 *
 * @param cost - Cost of operation
 * @param dataPoints - Number of data points extracted
 * @param qualityScore - Quality score achieved
 * @returns ROI metrics
 */
export function calculateROI(
  cost: number,
  dataPoints: number,
  qualityScore: number
): {
  costPerDataPoint: number
  costPerQualityPoint: number
  efficiency: number
} {
  const costPerDataPoint = dataPoints > 0 ? cost / dataPoints : Infinity
  const costPerQualityPoint = qualityScore > 0 ? cost / qualityScore : Infinity

  // Efficiency score (0-1) based on cost effectiveness
  let efficiency = 0
  if (costPerDataPoint < 0.001) efficiency += 0.5
  else if (costPerDataPoint < 0.01) efficiency += 0.3
  else if (costPerDataPoint < 0.1) efficiency += 0.1

  if (costPerQualityPoint < 0.01) efficiency += 0.5
  else if (costPerQualityPoint < 0.05) efficiency += 0.3
  else if (costPerQualityPoint < 0.1) efficiency += 0.1

  return {
    costPerDataPoint: Math.round(costPerDataPoint * 10000) / 10000,
    costPerQualityPoint: Math.round(costPerQualityPoint * 10000) / 10000,
    efficiency: Math.min(1, efficiency)
  }
}