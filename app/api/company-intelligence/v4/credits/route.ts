/**
 * Credits Management API - UPDATED 2025-10-01
 * CLAUDE.md COMPLIANT - API route handles auth directly
 * Next.js 15 COMPLIANT - No exported helper functions
 *
 * CRITICAL REVERT (2025-09-29): Auth handling restored to API layer
 * - API route now handles authentication directly
 * - Creates its own Supabase client
 * - Repository accepts client in constructor (isomorphic pattern)
 * - All auth checks happen before repository calls
 *
 * REFACTORED (2025-10-01): Extracted helper functions for Next.js 15
 * - All utility functions moved to @/lib/company-intelligence/utils/credit-helpers
 * - Route file now only exports HTTP handlers (GET, POST)
 *
 * @since 2025-09-29 - Reverted to distributed auth pattern
 * @since 2025-10-01 - Next.js 15 compliance (no helper exports)
 */

import { NextRequest, NextResponse } from 'next/server'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { CompanyIntelligenceRepositoryV4 } from '@/lib/repositories/intelligence-repository-v4'
import { convertSupabaseError } from '@/lib/utils/supabase-error-helper'
import { getUser } from '@/lib/auth/auth-helpers'      // REVERTED: Correct import for auth
import { createClient } from '@/lib/supabase/server'  // REVERTED: Need to create client

/**
 * GET /api/company-intelligence/v4/credits
 * Get user's credit balance
 *
 * REVERTED: 2025-09-29T10:15:00Z
 * - Auth handled directly in API route
 * - Must check user authentication before repository calls
 * - Repository requires userId parameter
 *
 * @param {NextRequest} request - The HTTP request
 * @returns {NextResponse} User's credit balance or error
 */
export async function GET(request: NextRequest) {
  const correlationId = crypto.randomUUID()
  const timer = permanentLogger.timing('credits_get', { correlationId })

  try {
    /**
     * REVERTED 2025-09-29T10:15:00Z
     * AUTH CHECK REQUIRED - API route must verify user
     */
    const user = await getUser()
    if (!user) {
      permanentLogger.warn('API_CREDITS', 'Unauthorized request', {
        correlationId
      })
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Create Supabase client and repository (REVERTED)
    const supabase = await createClient()  // FIX: Added await for async function
    const repository = new CompanyIntelligenceRepositoryV4(supabase)

    /**
     * Get credit balance using repository
     * REVERTED: userId parameter required
     */
    const profile = await repository.getUserProfile(user.id)

    if (!profile) {
      permanentLogger.warn('API_CREDITS', 'Profile not found', {
        correlationId
      })
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    const duration = timer.stop()

    permanentLogger.info('API_CREDITS', 'Balance retrieved', {
      balance: profile.credits_balance || 0,
      duration,
      correlationId
    })

    return NextResponse.json({
      balance: profile.credits_balance || 0,
      used: profile.credits_used || 0,
      total: profile.credits_total || 0,
      lastUpdated: profile.updated_at
    })

  } catch (error) {
    timer.stop()
    const jsError = convertSupabaseError(error)

    permanentLogger.captureError('API_CREDITS', jsError, {
      context: 'get_balance',
      correlationId
    })

    return NextResponse.json(
      { error: 'Failed to retrieve credit balance' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/company-intelligence/v4/credits/deduct
 * Deduct credits from user balance
 *
 * REVERTED: 2025-09-29T10:15:00Z
 * - Auth handled directly in API route
 * - Must check user authentication before repository calls
 *
 * @param {NextRequest} request - Contains amount and metadata in body
 * @returns {NextResponse} New balance or error
 */
export async function POST(request: NextRequest) {
  const correlationId = crypto.randomUUID()
  const timer = permanentLogger.timing('credits_deduct', { correlationId })

  try {
    /**
     * REVERTED 2025-09-29T10:15:00Z
     * AUTH CHECK REQUIRED - API route must verify user
     */
    const user = await getUser()
    if (!user) {
      permanentLogger.warn('API_CREDITS', 'Unauthorized request', {
        correlationId
      })
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { amount, description, metadata, sessionId } = body

    if (!amount || amount <= 0) {
      permanentLogger.warn('API_CREDITS', 'Invalid credit amount', {
        amount,
        userId: user.id,
        correlationId
      })
      return NextResponse.json(
        { error: 'Invalid credit amount' },
        { status: 400 }
      )
    }

    // Create Supabase client and repository (REVERTED)
    const supabase = await createClient()  // FIX: Added await for async function
    const repository = new CompanyIntelligenceRepositoryV4(supabase)

    /**
     * Use repository method for credit deduction
     * REVERTED: userId param required
     */
    const result = await repository.deductCredits(
      user.id,
      amount,
      description || 'Credit deduction',
      {
        ...metadata,
        sessionId,
        correlationId
      }
    )

    if (!result.success) {
      permanentLogger.warn('API_CREDITS', 'Credit deduction failed', {
        userId: user.id,
        amount,
        reason: result.error,
        correlationId
      })

      return NextResponse.json(
        {
          error: result.error || 'Failed to deduct credits',
          required: amount,
          available: result.balance
        },
        { status: result.error === 'Insufficient credits' ? 402 : 400 }
      )
    }

    const duration = timer.stop()

    permanentLogger.info('API_CREDITS', 'Credits deducted', {
      userId: user.id,
      amount,
      newBalance: result.newBalance,
      description,
      sessionId,
      duration,
      correlationId
    })

    return NextResponse.json({
      success: true,
      newBalance: result.newBalance,
      deducted: amount,
      transactionId: result.transactionId
    })

  } catch (error) {
    timer.stop()
    const jsError = convertSupabaseError(error)

    permanentLogger.captureError('API_CREDITS', jsError, {
      context: 'deduct_credits',
      correlationId
    })

    return NextResponse.json(
      { error: 'Failed to deduct credits' },
      { status: 500 }
    )
  }
}

/**
 * NOTE: All helper functions have been moved to:
 * @/lib/company-intelligence/utils/credit-helpers
 *
 * Import them as needed:
 * import {
 *   calculateScrapingCost,
 *   checkSufficientCredits,
 *   deductCredits,
 *   refundCredits
 * } from '@/lib/company-intelligence/utils/credit-helpers'
 */