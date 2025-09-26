/**
 * @deprecated Since v4.0.0 - Use /api/company-intelligence/v4/scrape instead
 * @replacement /app/api/company-intelligence/v4/scrape/route.ts
 *
 * DEPRECATION NOTICE:
 * This API route is part of the legacy v2 7-layer architecture.
 * It has been replaced by the simpler v4 direct execution model.
 *
 * Breaking changes:
 * - OLD endpoint: /api/company-intelligence/phases/scraping
 * - NEW endpoint: /api/company-intelligence/v4/scrape
 *
 * - OLD body: { sessionId, domain, pages, options }
 * - NEW body: { domain, scraperType, config }
 *
 * - OLD response: Complex nested data structure
 * - NEW response: SSE stream with real-time progress
 *
 * Migration example:
 * OLD: fetch('/api/company-intelligence/phases/scraping', {
 *        body: JSON.stringify({ sessionId, pages })
 *      })
 *
 * NEW: fetch('/api/company-intelligence/v4/scrape', {
 *        body: JSON.stringify({ domain, scraperType: 'firecrawl' })
 *      })
 *
 * See: /docs/v4-streaming-scraper-architecture-22nd-sept.md
 *
 * This endpoint will be removed in v5.0.0
 */

import { NextRequest, NextResponse } from 'next/server'
import { UnifiedScraperExecutor } from '@/lib/company-intelligence/core/unified-scraper-executor'
import { CompanyIntelligenceRepository } from '@/lib/repositories/company-intelligence-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

interface ScrapingRequest {
  domain: string  // Required - domain to scrape
  sessionId?: string  // Optional for backward compatibility
  pages?: string[]  // Optional - retrieved from session.merged_data.sitemap.pages
  options?: {
    maxPages?: number
    timeout?: number
    mode?: 'static' | 'dynamic' | 'incremental'
    stream?: boolean
  }
}

/**
 * Bulletproof Scraping API Route
 * Uses server-side authentication and session management
 * NO mock data, NO silent failures, NO in-memory caches
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // 1. Authenticate user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      permanentLogger.warn('SCRAPING_API', 'Authentication required for scraping', {
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
    permanentLogger.breadcrumb('auth', 'User authenticated for scraping', {
      userId: user.id,
      email: user.email
    })

    // 2. Parse and validate request
    const body: ScrapingRequest = await request.json()

    // Domain is now required
    if (!body.domain) {
      permanentLogger.captureError('SCRAPING_API', new Error('Missing domain'), { body })
      return NextResponse.json(
        { error: 'Domain is required' },
        { status: 400 }
      )
    }

    // 3. Get or create session based on authenticated user and domain
    const repository = CompanyIntelligenceRepository.getInstance()
    const session = await repository.getOrCreateUserSession(user.id, body.domain)

    permanentLogger.info('Request received', {
      category: 'SCRAPING_API',
      sessionId: session.id,  // Server-managed session
      domain: body.domain,
      userId: user.id,
      mode: body.options?.mode || 'static',
      stream: body.options?.stream || false,
      timestamp: new Date().toISOString()
    })

    // 4. Initialize executor (handles everything internally)
    const executor = new UnifiedScraperExecutor()

    // 5. Handle streaming if requested
    if (body.options?.stream) {
      permanentLogger.info('SCRAPING_API', 'Starting streaming execution', {
        sessionId: session.id,  // Use server-managed session
        domain: body.domain,
        mode: body.options.mode || 'static'
      })

      const encoder = new TextEncoder()
      const stream = new TransformStream()
      const writer = stream.writable.getWriter()

      // Start async execution with progress callback
      executor.executeWithStreaming(
        {
          sessionId: session.id,  // Use server-managed session
          domain: body.domain,
          scraperId: body.options.mode || 'static',
          urls: body.pages || [],  // Will be retrieved from session.merged_data.sitemap.pages
          options: body.options
        },
        async (data) => {
          // Format as Server-Sent Events
          const message = `data: ${JSON.stringify(data)}\n\n`
          await writer.write(encoder.encode(message))
        }
      ).then(() => {
        permanentLogger.info('SCRAPING_API', 'Streaming completed', {
          sessionId: session.id,
          domain: body.domain,
          duration: Date.now() - startTime
        })
        writer.close()
      }).catch((error) => {
        permanentLogger.captureError('SCRAPING_API', new Error('Streaming error'), {
          error: error.message,
          stack: error.stack,
          sessionId: session.id,
          domain: body.domain
        })
        // Send error event before closing
        const errorMessage = `data: ${JSON.stringify({
          type: 'error',
          error: error.message
        })}\n\n`
        writer.write(encoder.encode(errorMessage)).then(() => writer.abort(error))
      })

      // Return streaming response immediately
      return new Response(stream.readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      })
    }

    // 6. Execute non-streaming request
    permanentLogger.info('SCRAPING_API', 'Starting standard execution', {
      sessionId: session.id,  // Use server-managed session
      domain: body.domain,
      mode: body.options?.mode || 'static'
    })

    const result = await executor.execute({
      sessionId: session.id,  // Use server-managed session
      domain: body.domain,
      scraperId: body.options?.mode || 'static',
      urls: body.pages || [],  // Will be retrieved from session.merged_data.sitemap.pages
      options: body.options
    })

    permanentLogger.info('Execution complete', {
      category: 'SCRAPING_API',
      sessionId: session.id,  // Use server-managed session
      domain: body.domain,
      success: result.success,
      duration: Date.now() - startTime,
      pagesScraped: result.newData.pages,
      dataPoints: result.newData.dataPoints,
      totalPages: result.totalData.pagesScraped
    })

    // Include sessionId in response for client reference
    return NextResponse.json({
      ...result,
      sessionId: session.id  // Return server-managed session for reference
    })
    
  } catch (error) {
    permanentLogger.captureError('SCRAPING_API', new Error('Request failed'), {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration: Date.now() - startTime
    })
    
    // NEVER return mock data or silent failures - throw real errors
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Scraping failed',
        details: process.env.NODE_ENV === 'development' ? {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        } : undefined
      },
      { status: 500 }
    )
  }
}