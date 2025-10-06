/**
 * @fileoverview Credit Balance API Endpoint
 * @module api/company-intelligence/credits
 *
 * ⚠️ DEPRECATED: 2025-10-03
 * This endpoint returns MOCK DATA (hardcoded 500 credits).
 * Use /api/company-intelligence/v4/firecrawl-credits instead for REAL Firecrawl API data.
 *
 * REASON FOR DEPRECATION:
 * - Violates CLAUDE.md: "NO MOCK DATA OR FALLBACKS"
 * - Returns hardcoded {remaining: 500, used: 150, limit: 1000}
 * - Real endpoint exists at /api/company-intelligence/v4/firecrawl-credits
 *
 * MIGRATION:
 * Replace: fetch('/api/company-intelligence/credits')
 * With:    fetch('/api/company-intelligence/v4/firecrawl-credits')
 * Update:  data.remaining → data.credits
 *
 * TODO: Archive this file after confirming no active imports
 */

import { NextRequest, NextResponse } from 'next/server'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/company-intelligence/credits
 *
 * Fetches current credit balance for the authenticated user.
 *
 * @returns {object} Credit information
 * @returns {number} remaining - Credits remaining in account
 * @returns {number} used - Total credits used
 * @returns {number} limit - Account credit limit
 */
export async function GET(req: NextRequest) {
  const timer = permanentLogger.timing('api_credits_check')

  try {
    // ============================================================
    // AUTHENTICATION
    // ============================================================
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      permanentLogger.warn('API_CREDITS', 'Unauthorized credit check attempt', {
        error: authError?.message
      })
      timer.stop()
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    permanentLogger.breadcrumb('auth', 'User authenticated for credit check', {
      userId: user.id
    })

    // ============================================================
    // CREDIT BALANCE CHECK
    // ============================================================

    // TODO: Replace with actual Firecrawl API integration
    // For now, return realistic mock data for UI development

    // Future implementation:
    // const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY })
    // const credits = await firecrawl.getCreditBalance()

    // Mock data for development
    const credits = {
      remaining: 500,  // Mock: Credits remaining
      used: 150,       // Mock: Credits used
      limit: 1000      // Mock: Total credit limit
    }

    permanentLogger.info('API_CREDITS', 'Credit balance fetched', {
      userId: user.id,
      remaining: credits.remaining,
      // Never log full credit details in production
    })

    const duration = timer.stop()

    permanentLogger.breadcrumb('credits_check', 'Credit check completed', {
      duration,
      userId: user.id
    })

    // Return actual credit data (will be from Firecrawl API)
    return NextResponse.json({
      remaining: credits.remaining,
      used: credits.used,
      limit: credits.limit,
      // Never include dollar amounts, only credits
    })

  } catch (error) {
    timer.stop()
    permanentLogger.captureError('API_CREDITS', error as Error, {
      endpoint: '/api/company-intelligence/credits',
      method: 'GET'
    })

    return NextResponse.json(
      { error: 'Failed to fetch credit balance' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/company-intelligence/credits/refresh
 *
 * Forces a refresh of credit balance from Firecrawl API.
 * Useful after a purchase or when balance seems stale.
 *
 * @returns {object} Updated credit information
 */
export async function POST(req: NextRequest) {
  const timer = permanentLogger.timing('api_credits_refresh')

  try {
    // ============================================================
    // AUTHENTICATION
    // ============================================================
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      timer.stop()
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    permanentLogger.info('API_CREDITS', 'Credit refresh requested', {
      userId: user.id
    })

    // ============================================================
    // FORCE REFRESH FROM FIRECRAWL
    // ============================================================

    // TODO: Implement actual Firecrawl refresh
    // This would bypass any caching and get fresh data

    const credits = {
      remaining: 500,  // Will be from live API
      used: 150,
      limit: 1000,
      lastUpdated: new Date().toISOString()
    }

    timer.stop()

    return NextResponse.json(credits)

  } catch (error) {
    timer.stop()
    permanentLogger.captureError('API_CREDITS', error as Error, {
      endpoint: '/api/company-intelligence/credits/refresh',
      method: 'POST'
    })

    return NextResponse.json(
      { error: 'Failed to refresh credit balance' },
      { status: 500 }
    )
  }
}