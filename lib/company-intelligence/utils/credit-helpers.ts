/**
 * Credit Helper Functions
 * Extracted from v4/credits/route.ts for Next.js 15 compliance
 *
 * NOTE: Next.js 15 doesn't allow route files to export non-handler functions
 * These utilities are used by multiple routes and must be in a separate file
 *
 * @since 2025-10-01 - Extracted for Next.js 15 compliance
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { CompanyIntelligenceRepositoryV4 } from '@/lib/repositories/intelligence-repository-v4'
import { convertSupabaseError } from '@/lib/utils/supabase-error-helper'
import { createClient } from '@/lib/supabase/server'

import {
  ScraperType,
  IntelligenceDepth,
  DEPTH_CREDIT_COSTS,
  SCRAPER_CREDIT_COSTS
} from '@/lib/company-intelligence/types/intelligence-enums'

/**
 * Credit calculation types
 */
interface CreditCalculationOptions {
  extractSchema?: boolean
  premium?: boolean
  depth?: IntelligenceDepth
}

/**
 * Calculate scraping cost based on scraper type and options
 * Used by scrape route
 *
 * @param {ScraperType | string} scraperType - The type of scraper
 * @param {number} pageCount - Number of pages to scrape
 * @param {CreditCalculationOptions} options - Additional options
 * @returns {number} Total credit cost
 */
export function calculateScrapingCost(
  scraperType: ScraperType | 'firecrawl' | 'playwright',
  pageCount: number,
  options: CreditCalculationOptions = {}
): number {
  permanentLogger.breadcrumb('calculate_cost', 'Calculating scraping cost', {
    scraperType,
    pageCount,
    options
  })

  // Map string scraper types to enum
  const scraperEnum: ScraperType =
    scraperType === 'firecrawl' ? ScraperType.FIRECRAWL :
    scraperType === 'playwright' ? ScraperType.PLAYWRIGHT :
    scraperType as ScraperType

  // Base cost per page from enum
  const baseCostPerPage = SCRAPER_CREDIT_COSTS[scraperEnum] || 1

  // Depth multiplier
  const depth = options.depth || IntelligenceDepth.STANDARD
  const depthMultiplier = DEPTH_CREDIT_COSTS[depth] || 1

  // Additional costs
  const schemaCost = options.extractSchema ? 0.5 : 0
  const premiumMultiplier = options.premium ? 1.5 : 1

  // Calculate total
  const totalCost = Math.ceil(
    pageCount * baseCostPerPage * depthMultiplier * premiumMultiplier +
    (schemaCost * pageCount)
  )

  permanentLogger.breadcrumb('cost_calculated', 'Scraping cost calculated', {
    baseCostPerPage,
    depthMultiplier,
    premiumMultiplier,
    schemaCost,
    totalCost
  })

  return totalCost
}

/**
 * Check if user has sufficient credits
 * Used by scrape route
 *
 * @param {string} userId - The user ID to check
 * @param {number} requiredCredits - Credits required
 * @returns {Promise} Sufficiency check result
 */
export async function checkSufficientCredits(
  userId: string,
  requiredCredits: number
): Promise<{ sufficient: boolean; balance: number }> {
  const timer = permanentLogger.timing('check_credits', { userId, requiredCredits })

  try {
    // Create Supabase client and repository
    const supabase = await createClient()
    const repository = new CompanyIntelligenceRepositoryV4(supabase)

    const profile = await repository.getUserProfile(userId)
    const balance = profile?.credits_balance || 0

    const result = {
      sufficient: balance >= requiredCredits,
      balance
    }

    const duration = timer.stop()

    permanentLogger.breadcrumb('credits_checked', 'Credit check completed', {
      userId,
      required: requiredCredits,
      balance,
      sufficient: result.sufficient,
      duration
    })

    return result

  } catch (error) {
    timer.stop()
    const jsError = convertSupabaseError(error)

    permanentLogger.captureError('CREDIT_HELPERS', jsError, {
      context: 'checkSufficientCredits',
      userId,
      required: requiredCredits
    })

    return { sufficient: false, balance: 0 }
  }
}

/**
 * Deduct credits directly via repository
 * Used by scrape route - does NOT call API endpoint
 *
 * @param {string} userId - The user ID
 * @param {number} amount - Amount to deduct
 * @param {string} description - Description of deduction
 * @param {any} metadata - Additional metadata
 * @returns {Promise<boolean>} Success status
 */
export async function deductCredits(
  userId: string,
  amount: number,
  description: string,
  metadata?: any
): Promise<boolean> {
  const timer = permanentLogger.timing('deduct_credits_direct', { userId, amount })

  try {
    // Create Supabase client and repository
    const supabase = await createClient()
    const repository = new CompanyIntelligenceRepositoryV4(supabase)

    const result = await repository.deductCredits(
      userId,
      amount,
      description,
      metadata
    )

    const duration = timer.stop()

    if (result.success) {
      permanentLogger.info('CREDIT_HELPERS', 'Credits deducted directly', {
        userId,
        amount,
        newBalance: result.newBalance,
        transactionId: result.transactionId,
        duration
      })
    } else {
      permanentLogger.warn('CREDIT_HELPERS', 'Direct deduction failed', {
        userId,
        amount,
        error: result.error,
        duration
      })
    }

    return result.success

  } catch (error) {
    timer.stop()
    const jsError = convertSupabaseError(error)

    permanentLogger.captureError('CREDIT_HELPERS', jsError, {
      context: 'deductCredits_direct',
      userId,
      amount
    })

    return false
  }
}

/**
 * Refund credits to user
 * Used when operations fail after deduction
 *
 * @param {string} userId - The user ID
 * @param {number} amount - Amount to refund
 * @param {string} reason - Reason for refund
 * @param {any} metadata - Additional metadata
 * @returns {Promise<boolean>} Success status
 */
export async function refundCredits(
  userId: string,
  amount: number,
  reason: string,
  metadata?: any
): Promise<boolean> {
  const timer = permanentLogger.timing('refund_credits', { userId, amount })

  try {
    // Create Supabase client and repository
    const supabase = await createClient()
    const repository = new CompanyIntelligenceRepositoryV4(supabase)

    const result = await repository.addCredits(
      userId,
      amount,
      `Refund: ${reason}`,
      {
        ...metadata,
        type: 'refund',
        originalReason: reason
      }
    )

    const duration = timer.stop()

    permanentLogger.info('CREDIT_HELPERS', 'Credits refunded', {
      userId,
      amount,
      reason,
      newBalance: result.newBalance,
      duration
    })

    return result.success

  } catch (error) {
    timer.stop()
    const jsError = convertSupabaseError(error)

    permanentLogger.captureError('CREDIT_HELPERS', jsError, {
      context: 'refundCredits',
      userId,
      amount,
      reason
    })

    return false
  }
}
