/**
 * Cost Optimizer Service
 *
 * Manages budget constraints and optimizes scraper selection based on
 * cost-effectiveness for the Progressive Scraping Architecture.
 *
 * ARCHITECTURE COMPLIANCE:
 * - Repository pattern for database access
 * - No mock data - real cost calculations only
 * - Proper error handling with convertSupabaseError
 * - Type-safe with scraping interfaces
 */

import { CompanyIntelligenceRepository } from '@/lib/repositories/company-intelligence-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { convertSupabaseError } from '@/lib/utils/supabase-error-helper'
import {
  ScraperType,
  CostTier,
  CostBreakdown,
  ScraperRun,
  SessionConfig
} from '../types'

/**
 * Cost tracking and optimization service
 *
 * Responsibilities:
 * - Track cumulative spending per session
 * - Project costs for future operations
 * - Enforce budget constraints
 * - Optimize scraper selection for cost-effectiveness
 */
export class CostOptimizer {
  private repository = CompanyIntelligenceRepository.getInstance()

  // Cost per page for each scraper type (in USD)
  private readonly SCRAPER_COSTS: Record<ScraperType, number> = {
    [ScraperType.STATIC]: 0.001,      // Cheerio - very cheap
    [ScraperType.DYNAMIC]: 0.01,      // Playwright - moderate
    [ScraperType.SPA]: 0.015,         // SPA scraper - moderate+
    [ScraperType.API]: 0.002,         // API calls - cheap
    [ScraperType.FIRECRAWL]: 0.05     // AI-powered - expensive
  }

  // Fixed costs for operations (overhead)
  private readonly OPERATION_OVERHEAD = 0.0001 // Per operation overhead

  /**
   * Check if budget allows for more scraping
   */
  async checkBudget(
    sessionId: string,
    maxBudget: number
  ): Promise<{ exceeded: boolean; totalSpent: number; remaining: number }> {
    const timer = permanentLogger.timing('budget_check', { sessionId })

    permanentLogger.info('COST_OPTIMIZER', 'Checking budget status', {
      sessionId,
      maxBudget
    })

    try {
      // Get current session to check cost breakdown
      const session = await this.repository.getSessionById(sessionId)

      if (!session) {
        throw new Error(`Session ${sessionId} not found`)
      }

      // Extract current spending from cost_breakdown JSONB
      const costBreakdown = session.cost_breakdown as CostBreakdown
      const totalSpent = costBreakdown?.total || 0
      const remaining = maxBudget - totalSpent
      const exceeded = totalSpent >= maxBudget

      permanentLogger.info('COST_OPTIMIZER', 'Budget check completed', {
        sessionId,
        totalSpent,
        remaining,
        exceeded,
        percentUsed: Math.round((totalSpent / maxBudget) * 100)
      })

      return { exceeded, totalSpent, remaining }

    } catch (error) {
      permanentLogger.captureError('COST_OPTIMIZER', convertSupabaseError(error), {
        operation: 'checkBudget',
        sessionId,
        maxBudget
      })
      throw error
    } finally {
      timer.stop()
    }
  }

  /**
   * Project cost for a specific scraper and URL count
   */
  projectCost(
    scraperType: ScraperType,
    urlCount: number,
    includeOverhead: boolean = true
  ): number {
    const baseCost = this.SCRAPER_COSTS[scraperType] || 0.01
    const pageCost = baseCost * urlCount
    const overhead = includeOverhead ? this.OPERATION_OVERHEAD : 0

    const totalCost = pageCost + overhead

    permanentLogger.debug('COST_OPTIMIZER', 'Cost projection calculated', {
      scraperType,
      urlCount,
      baseCost,
      totalCost
    })

    return Number(totalCost.toFixed(4))
  }

  /**
   * Get cost tier classification based on total cost
   */
  getCostTier(totalCost: number): CostTier {
    if (totalCost === 0) return CostTier.FREE
    if (totalCost < 0.01) return CostTier.CHEAP
    if (totalCost < 0.10) return CostTier.MODERATE
    return CostTier.EXPENSIVE
  }

  /**
   * Optimize scraper selection based on budget and quality requirements
   */
  async optimizeScraperSelection(
    sessionId: string,
    remainingBudget: number,
    targetQuality: number,
    currentQuality: number,
    availableScrapers: ScraperType[]
  ): Promise<{
    recommended: ScraperType | null
    reason: string
    projectedCost: number
  }> {
    permanentLogger.info('COST_OPTIMIZER', 'Optimizing scraper selection', {
      sessionId,
      remainingBudget,
      targetQuality,
      currentQuality,
      availableScrapers
    })

    try {
      // Calculate quality gap
      const qualityGap = targetQuality - currentQuality

      // If budget is exhausted, no scraper can be recommended
      if (remainingBudget <= 0) {
        return {
          recommended: null,
          reason: 'Budget exhausted',
          projectedCost: 0
        }
      }

      // Get scraping history to avoid repetition
      const history = await this.repository.getScrapingHistory(sessionId)
      const usedScrapers = new Set(history.map((h: ScraperRun) => h.scraperId))

      // Filter out already used scrapers
      const unusedScrapers = availableScrapers.filter(s => !usedScrapers.has(s))

      if (unusedScrapers.length === 0) {
        return {
          recommended: null,
          reason: 'All available scrapers have been used',
          projectedCost: 0
        }
      }

      // Rank scrapers by cost-effectiveness
      const rankedOptions = this.rankScrapersByCostEffectiveness(
        unusedScrapers,
        qualityGap,
        remainingBudget
      )

      if (rankedOptions.length === 0) {
        return {
          recommended: null,
          reason: 'No scrapers within budget',
          projectedCost: 0
        }
      }

      // Select the most cost-effective option
      const bestOption = rankedOptions[0]

      permanentLogger.info('COST_OPTIMIZER', 'Scraper selection optimized', {
        sessionId,
        recommended: bestOption.scraper,
        projectedCost: bestOption.estimatedCost,
        costEffectiveness: bestOption.costEffectiveness
      })

      return {
        recommended: bestOption.scraper,
        reason: bestOption.reason,
        projectedCost: bestOption.estimatedCost
      }

    } catch (error) {
      permanentLogger.captureError('COST_OPTIMIZER', convertSupabaseError(error), {
        operation: 'optimizeScraperSelection',
        sessionId
      })

      // Return conservative recommendation on error
      return {
        recommended: ScraperType.STATIC,
        reason: 'Defaulting to most cost-effective scraper',
        projectedCost: this.projectCost(ScraperType.STATIC, 10)
      }
    }
  }

  /**
   * Track spending for a completed scraping operation
   */
  async trackSpending(
    sessionId: string,
    scraperType: ScraperType,
    pagesScraped: number,
    actualCost?: number
  ): Promise<void> {
    const timer = permanentLogger.timing('track_spending', { sessionId })

    try {
      // Use actual cost if provided, otherwise calculate
      const cost = actualCost || this.projectCost(scraperType, pagesScraped)

      permanentLogger.info('COST_OPTIMIZER', 'Tracking spending', {
        sessionId,
        scraperType,
        pagesScraped,
        cost
      })

      // Note: The actual update is handled by database triggers
      // This method is for logging and potential future enhancements

      permanentLogger.breadcrumb('spending_tracked', 'Spending recorded', {
        sessionId,
        scraperType,
        cost
      })

    } catch (error) {
      permanentLogger.captureError('COST_OPTIMIZER', convertSupabaseError(error), {
        operation: 'trackSpending',
        sessionId,
        scraperType,
        pagesScraped
      })
      // Don't throw - spending tracking shouldn't break the flow
    } finally {
      timer.stop()
    }
  }

  /**
   * Calculate return on investment for a scraper
   */
  calculateROI(
    qualityImprovement: number,
    cost: number
  ): number {
    if (cost === 0) return 1000 // Max ROI for free operations
    return Number((qualityImprovement / cost).toFixed(2))
  }

  /**
   * Get spending breakdown by scraper type
   */
  async getSpendingBreakdown(sessionId: string): Promise<CostBreakdown> {
    const timer = permanentLogger.timing('spending_breakdown', { sessionId })

    try {
      const session = await this.repository.getSessionById(sessionId)

      if (!session) {
        throw new Error(`Session ${sessionId} not found`)
      }

      const costBreakdown = session.cost_breakdown as CostBreakdown || {
        total: 0,
        byScraper: {},
        byPhase: {},
        projectedTotal: 0,
        budgetRemaining: 0,
        tier: CostTier.FREE
      }

      // Update tier based on current total
      costBreakdown.tier = this.getCostTier(costBreakdown.total)

      permanentLogger.info('COST_OPTIMIZER', 'Spending breakdown retrieved', {
        sessionId,
        total: costBreakdown.total,
        tier: costBreakdown.tier
      })

      return costBreakdown

    } catch (error) {
      permanentLogger.captureError('COST_OPTIMIZER', convertSupabaseError(error), {
        operation: 'getSpendingBreakdown',
        sessionId
      })
      throw error
    } finally {
      timer.stop()
    }
  }

  /**
   * Rank scrapers by cost-effectiveness
   */
  private rankScrapersByCostEffectiveness(
    scrapers: ScraperType[],
    qualityGap: number,
    budget: number
  ): Array<{
    scraper: ScraperType
    estimatedCost: number
    estimatedQualityGain: number
    costEffectiveness: number
    reason: string
  }> {
    const options = []

    for (const scraper of scrapers) {
      // Estimate pages to scrape (conservative estimate)
      const estimatedPages = this.estimatePagesForScraper(scraper)
      const estimatedCost = this.projectCost(scraper, estimatedPages)

      // Skip if over budget
      if (estimatedCost > budget) {
        continue
      }

      // Estimate quality gain based on scraper capabilities
      const estimatedQualityGain = this.estimateQualityGain(scraper, qualityGap)

      // Calculate cost-effectiveness (quality points per dollar)
      const costEffectiveness = this.calculateROI(estimatedQualityGain, estimatedCost)

      // Generate reason based on scraper type
      const reason = this.getScraperReason(scraper, estimatedCost, estimatedQualityGain)

      options.push({
        scraper,
        estimatedCost,
        estimatedQualityGain,
        costEffectiveness,
        reason
      })
    }

    // Sort by cost-effectiveness (highest first)
    options.sort((a, b) => b.costEffectiveness - a.costEffectiveness)

    return options
  }

  /**
   * Estimate number of pages a scraper will process
   */
  private estimatePagesForScraper(scraper: ScraperType): number {
    // Conservative estimates based on scraper type
    switch (scraper) {
      case ScraperType.STATIC:
        return 15 // Usually scrapes main pages quickly
      case ScraperType.DYNAMIC:
        return 10 // Slower, fewer pages
      case ScraperType.SPA:
        return 8  // Complex SPA navigation
      case ScraperType.API:
        return 5  // API endpoints
      case ScraperType.FIRECRAWL:
        return 5  // AI-powered, selective
      default:
        return 10
    }
  }

  /**
   * Estimate quality gain from a scraper
   */
  private estimateQualityGain(scraper: ScraperType, qualityGap: number): number {
    // Estimate based on scraper capabilities and quality gap
    const maxGain = Math.min(qualityGap, 30) // Cap at 30 points per scraper

    switch (scraper) {
      case ScraperType.STATIC:
        return Math.min(maxGain, 20) // Good for basic content
      case ScraperType.DYNAMIC:
        return Math.min(maxGain, 25) // Better for dynamic content
      case ScraperType.SPA:
        return Math.min(maxGain, 25) // Good for modern apps
      case ScraperType.API:
        return Math.min(maxGain, 15) // Limited but accurate
      case ScraperType.FIRECRAWL:
        return Math.min(maxGain, 30) // AI can extract more
      default:
        return 15
    }
  }

  /**
   * Generate human-readable reason for scraper selection
   */
  private getScraperReason(
    scraper: ScraperType,
    cost: number,
    qualityGain: number
  ): string {
    const costStr = `$${cost.toFixed(4)}`
    const qualityStr = `+${qualityGain} quality points`

    switch (scraper) {
      case ScraperType.STATIC:
        return `Most cost-effective at ${costStr} for ${qualityStr}. Best for static HTML content.`
      case ScraperType.DYNAMIC:
        return `Good value at ${costStr} for ${qualityStr}. Handles JavaScript-rendered content.`
      case ScraperType.SPA:
        return `Moderate cost at ${costStr} for ${qualityStr}. Optimized for single-page applications.`
      case ScraperType.API:
        return `Efficient at ${costStr} for ${qualityStr}. Direct API access when available.`
      case ScraperType.FIRECRAWL:
        return `Premium option at ${costStr} for ${qualityStr}. AI-powered extraction for complex data.`
      default:
        return `Estimated ${costStr} for ${qualityStr} improvement.`
    }
  }

  /**
   * Check if a scraper is within budget
   */
  isWithinBudget(
    scraperType: ScraperType,
    estimatedPages: number,
    remainingBudget: number
  ): boolean {
    const projectedCost = this.projectCost(scraperType, estimatedPages)
    return projectedCost <= remainingBudget
  }

  /**
   * Get cost summary for reporting
   */
  async getCostSummary(sessionId: string): Promise<{
    totalSpent: number
    averageCostPerScraper: number
    mostExpensiveScraper: ScraperType | null
    cheapestScraper: ScraperType | null
    tier: CostTier
  }> {
    try {
      const breakdown = await this.getSpendingBreakdown(sessionId)
      const scraperCosts = breakdown.byScraper as Record<ScraperType, number>

      const scraperTypes = Object.keys(scraperCosts) as ScraperType[]
      const costs = Object.values(scraperCosts)

      let mostExpensive: ScraperType | null = null
      let cheapest: ScraperType | null = null
      let maxCost = 0
      let minCost = Infinity

      scraperTypes.forEach((scraper, i) => {
        if (costs[i] > maxCost) {
          maxCost = costs[i]
          mostExpensive = scraper
        }
        if (costs[i] < minCost) {
          minCost = costs[i]
          cheapest = scraper
        }
      })

      return {
        totalSpent: breakdown.total,
        averageCostPerScraper: scraperTypes.length > 0
          ? breakdown.total / scraperTypes.length
          : 0,
        mostExpensiveScraper: mostExpensive,
        cheapestScraper: cheapest,
        tier: breakdown.tier
      }

    } catch (error) {
      permanentLogger.captureError('COST_OPTIMIZER', convertSupabaseError(error), {
        operation: 'getCostSummary',
        sessionId
      })
      throw error
    }
  }
}