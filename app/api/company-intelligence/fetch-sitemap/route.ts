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
import { DiscoveryOrchestrator } from '@/lib/company-intelligence/orchestrators/discovery-orchestrator'
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

    // Log successful request with timing
    permanentLogger.info(routeCategory, 'Discovery request validated', {
      domain: body.domain,
      sessionId: body.sessionId,
      enableIntelligence: body.enableIntelligence,
      parseTimeMs: parseResult.timing?.parseMs,
      validationTimeMs: parseResult.timing?.validationMs
    })

    // Create orchestrator with request parameters
    const orchestrator = new DiscoveryOrchestrator(body)

    // Check if client wants streaming response
    const acceptHeader = request.headers.get('accept')
    const wantsStream = acceptHeader?.includes('text/event-stream')

    if (wantsStream) {
      // Return streaming response
      permanentLogger.info('FETCH_SITEMAP_ROUTE', 'Returning streaming response')

      return new Response(
        orchestrator.executeWithStream(request.signal),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      )
    }

    // Execute standard discovery
    const result = await orchestrator.execute()

    // Log completion with detailed timing
    const totalTimeMs = Date.now() - startTime
    permanentLogger.info(routeCategory, 'Discovery complete', {
      domain: body.domain,
      pagesFound: result.pages.length,
      sitemapFound: result.sitemapFound,
      parseTimeMs: parseResult.timing?.parseMs,
      discoveryTimeMs: totalTimeMs - (parseResult.timing?.parseMs || 0),
      totalTimeMs
    })

    // Return JSON response with timing information
    return NextResponse.json({
      ...result,
      timing: {
        parseMs: parseResult.timing?.parseMs,
        discoveryMs: totalTimeMs - (parseResult.timing?.parseMs || 0),
        totalMs: totalTimeMs
      }
    })

  } catch (error) {
    // Comprehensive error logging with breadcrumbs
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    const totalTimeMs = Date.now() - startTime

    permanentLogger.captureError(routeCategory, error as Error, {
      method: 'POST',
      path: '/api/company-intelligence/fetch-sitemap',
      errorMessage,
      totalTimeMs,
      breadcrumbs: permanentLogger.getBreadcrumbs ? permanentLogger.getBreadcrumbs() : []
    })

    // Return detailed error response for debugging
    // NO fallback data - let the error be visible
    return NextResponse.json(
      {
        error: errorMessage,
        timing: { totalMs: totalTimeMs },
        // Include request ID for support/debugging
        requestId: request.headers.get('x-request-id') || 'unknown'
      },
      { status: 500 }
    )
  }
}