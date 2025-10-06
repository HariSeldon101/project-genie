/**
 * Fetch Sitemap API Route
 *
 * Discovers and returns sitemap information for a given domain.
 * Supports both streaming (SSE) and standard JSON responses.
 *
 * Refactored on 2025-09-14 to use service-oriented architecture.
 * Original implementation archived at: /archive/api/company-intelligence/fetch-sitemap/route-legacy-2025-09-14.ts
 *
 * @module api/company-intelligence
 */

import { NextRequest, NextResponse } from 'next/server'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { parseJsonRequest, createErrorResponse } from '@/lib/utils/request-parser'
// import { DiscoveryOrchestrator } from '@/lib/company-intelligence/orchestrators/discovery-orchestrator' // Archived
import { CompanyIntelligenceRepository } from '@/lib/repositories/company-intelligence-repository'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Maximum duration for the request
export const maxDuration = 60

/**
 * Request schema for sitemap discovery
 * Defines and validates the expected request structure
 */
const FetchSitemapRequestSchema = z.object({
  domain: z.string().min(1, 'Domain is required'),
  sessionId: z.string().optional(), // Now properly accepting sessionId from client
  enableIntelligence: z.boolean().optional().default(false),
  maxUrls: z.number().optional().default(200),
  validateUrls: z.boolean().optional().default(false)
})

/**
 * POST /api/company-intelligence/fetch-sitemap
 *
 * Discovers pages for a domain through sitemap parsing and web crawling.
 *
 * Request body:
 * - domain: string (required) - The domain to discover
 * - sessionId?: string - Session ID for database updates
 * - enableIntelligence?: boolean - Enable page intelligence analysis
 * - maxUrls?: number - Maximum URLs to discover (default: 200)
 * - validateUrls?: boolean - Validate URLs exist (default: false)
 *
 * Headers:
 * - Accept: text/event-stream - For streaming response
 * - Accept: application/json - For standard JSON response (default)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const routeCategory = 'FETCH_SITEMAP_ROUTE'

  // Add breadcrumb for route entry
  permanentLogger.info(routeCategory, 'Route handler started', {
    method: 'POST',
    url: request.url,
    timestamp: new Date().toISOString()
  })

  // Get authenticated user and set userId for logging
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Security: Require authentication for company intelligence features
  if (!user) {
    permanentLogger.warn(routeCategory, 'Authentication required for company intelligence', {
      url: request.url,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(
      {
        error: 'Authentication required',
        message: 'Please sign in to use company intelligence features'
      },
      { status: 401 }
    )
  }

  // Set user ID for all subsequent logging
  permanentLogger.setUserId(user.id)
  permanentLogger.breadcrumb('auth', 'User authenticated for discovery', {
    userId: user.id,
    email: user.email
  })

  try {
    // Use the new shared request parser with schema validation
    // This replaces the unsafe await request.json() call
    const parseResult = await parseJsonRequest(request, {
      schema: FetchSitemapRequestSchema,
      logCategory: routeCategory,
      maxBodySize: 1024 * 1024 // 1MB limit for this endpoint
    })

    // Check if parsing was successful
    const errorResponse = createErrorResponse(parseResult)
    if (errorResponse) {
      // Log the error and return early
      permanentLogger.captureError(routeCategory, new Error('Request parsing failed'), {
        error: parseResult.error,
        timing: parseResult.timing
      })
      return errorResponse
    }

    // Type-safe access to validated body
    const body = parseResult.data!

    // Get or create session automatically based on authenticated user
    const repository = CompanyIntelligenceRepository.getInstance()
    const session = await repository.getOrCreateUserSession(user.id, body.domain)

    // Log successful request with timing
    permanentLogger.info(routeCategory, 'Discovery request validated', {
      domain: body.domain,
      sessionId: session.id,  // Server-managed session
      userId: user.id,
      enableIntelligence: body.enableIntelligence,
      parseTimeMs: parseResult.timing?.parseMs,
      validationTimeMs: parseResult.timing?.validationMs
    })

    // V4 SIMPLIFICATION: Sitemap discovery not needed
    // V4 scrapers discover URLs automatically during scraping
    permanentLogger.info('FETCH_SITEMAP_ROUTE', 'V4: Sitemap phase not needed', {
      sessionId: session.id,
      domain: body.domain,
      message: 'V4 scrapers discover URLs automatically'
    })

    // Return simplified response for V4
    const pages: any[] = []  // Empty - scrapers will find URLs
    const sitemapFound = false  // Not relevant in V4

    // Log completion with detailed timing
    const totalTimeMs = Date.now() - startTime
    permanentLogger.info(routeCategory, 'Discovery complete', {
      domain: body.domain,
      pagesFound: pages.length,
      sitemapFound: sitemapFound,
      parseTimeMs: parseResult.timing?.parseMs,
      discoveryTimeMs: totalTimeMs - (parseResult.timing?.parseMs || 0),
      totalTimeMs
    })

    // Return JSON response with timing information
    // Transform to match expected format
    return NextResponse.json({
      sessionId: session.id,  // Include server-managed session ID
      domain: result.domain,
      pages: pages,
      sitemapFound: sitemapFound,
      success: result.success,
      metadata: result.metadata,
      timing: {
        parseMs: parseResult.timing?.parseMs,
        discoveryMs: totalTimeMs - (parseResult.timing?.parseMs || 0),
        totalMs: totalTimeMs
      }
    })

  } catch (error) {
    // Comprehensive error logging with breadcrumbs
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    const errorStack = error instanceof Error ? error.stack : undefined
    const totalTimeMs = Date.now() - startTime

    // Log the full error details to console for debugging
    console.error('❌ [FETCH_SITEMAP] Error details:', {
      message: errorMessage,
      stack: errorStack,
      error: error
    })

    permanentLogger.captureError(routeCategory, error as Error, {
      method: 'POST',
      path: '/api/company-intelligence/fetch-sitemap',
      errorMessage,
      errorStack,
      totalTimeMs,
      breadcrumbs: permanentLogger.getBreadcrumbs ? permanentLogger.getBreadcrumbs() : []
    })

    // Return detailed error response for debugging
    // NO fallback data - let the error be visible
    return NextResponse.json(
      {
        error: errorMessage,
        details: errorStack, // Include stack trace for debugging
        timing: { totalMs: totalTimeMs },
        // Include request ID for support/debugging
        requestId: request.headers.get('x-request-id') || 'unknown'
      },
      { status: 500 }
    )
  }
}