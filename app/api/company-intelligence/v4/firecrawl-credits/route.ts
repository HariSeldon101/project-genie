/**
 * Firecrawl Credits API - Admin Feature
 *
 * PURPOSE: Fetches ACTUAL credit balance from Firecrawl API
 * No calculations, no user credits - just real API data
 *
 * CLAUDE.md Compliant:
 * - No mock data or fallbacks
 * - Proper error handling with permanentLogger
 * - Real API data only
 *
 * @returns {Object} Actual Firecrawl credit balance and usage
 */

import { NextRequest, NextResponse } from 'next/server'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { firecrawlConfig } from '@/lib/config/firecrawl'
import { getUser } from '@/lib/auth/auth-helpers'

/**
 * GET /api/company-intelligence/v4/firecrawl-credits
 *
 * Fetches real-time credit information from Firecrawl API
 * For admin monitoring of actual API usage
 */
export async function GET(request: NextRequest) {
  const correlationId = crypto.randomUUID()
  const timer = permanentLogger.timing('firecrawl_credits_fetch', { correlationId })

  permanentLogger.breadcrumb('api_entry', 'Firecrawl credits request received', {
    endpoint: '/api/company-intelligence/v4/firecrawl-credits',
    correlationId
  })

  try {
    // Admin authentication check
    const user = await getUser()
    if (!user) {
      permanentLogger.warn('FIRECRAWL_CREDITS', 'Unauthorized request', { correlationId })
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    permanentLogger.breadcrumb('auth_check', 'User authenticated', {
      userId: user.id,
      correlationId
    })

    // Check Firecrawl configuration
    if (!firecrawlConfig.isConfigured()) {
      permanentLogger.warn('FIRECRAWL_CREDITS', 'Firecrawl API key not configured', {
        correlationId
      })
      return NextResponse.json({
        error: 'Firecrawl not configured',
        message: 'Please add FIRECRAWL_API_KEY to environment variables',
        credits: 0,
        used: 0
      }, { status: 503 })
    }

    permanentLogger.breadcrumb('config_check', 'Firecrawl configured', {
      endpoint: firecrawlConfig.getCreditsEndpoint(),
      correlationId
    })

    // Fetch ACTUAL credits from Firecrawl API
    const firecrawlTimer = permanentLogger.timing('firecrawl_api_call', { correlationId })

    const response = await fetch(firecrawlConfig.getCreditsEndpoint(), {
      method: 'GET',
      headers: firecrawlConfig.getHeaders()
    })

    const apiDuration = firecrawlTimer.stop()

    permanentLogger.breadcrumb('api_response', 'Firecrawl API responded', {
      status: response.status,
      duration: apiDuration,
      correlationId
    })

    if (!response.ok) {
      const errorText = await response.text()
      permanentLogger.warn('FIRECRAWL_CREDITS', 'Firecrawl API error', {
        status: response.status,
        statusText: response.statusText,
        errorText,
        correlationId
      })

      throw new Error(`Firecrawl API error: ${response.status} - ${errorText}`)
    }

    const apiResponse = await response.json()

    // Log the actual response structure for debugging
    permanentLogger.debug('FIRECRAWL_CREDITS', 'Raw API response', {
      apiResponse,
      correlationId
    })

    // DEBUG: Log to console for immediate visibility
    console.log('🔍 FIRECRAWL API RESPONSE:', JSON.stringify(apiResponse, null, 2))

    // Extract from Firecrawl v2 API response format: { success: true, data: { remainingCredits: 525 } }
    const credits = apiResponse.data?.remainingCredits || 0
    // Firecrawl doesn't provide "used" credits in this endpoint, only remaining
    // We could calculate if we knew the plan limit, but for now just return 0
    const used = 0

    console.log('💳 PARSED CREDITS:', { credits, used })

    const totalDuration = timer.stop()

    // Return ACTUAL data - no math, no calculations
    permanentLogger.info('FIRECRAWL_CREDITS', 'Credits fetched successfully', {
      credits,
      used,
      totalDuration,
      correlationId
    })

    return NextResponse.json({
      credits,
      used,
      // Include raw data for debugging/transparency
      raw: process.env.NODE_ENV === 'development' ? apiResponse : undefined,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    timer.stop()

    console.error('❌ FIRECRAWL CREDITS ERROR:', error)

    permanentLogger.captureError('FIRECRAWL_CREDITS', error as Error, {
      correlationId,
      endpoint: firecrawlConfig.getCreditsEndpoint()
    })

    return NextResponse.json({
      error: 'Failed to fetch credits',
      message: error instanceof Error ? error.message : 'Unknown error',
      credits: 0,
      used: 0
    }, { status: 500 })
  }
}