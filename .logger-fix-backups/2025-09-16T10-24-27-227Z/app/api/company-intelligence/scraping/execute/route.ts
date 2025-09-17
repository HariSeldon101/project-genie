/**
 * Additive Scraping Execution API
 * 
 * CRITICAL: This API follows the BULLETPROOF ARCHITECTURE:
 * - ALL DATA comes from Supabase database (single source of truth)
 * - URLs are NEVER passed from UI - they come from session.discovered_urls
 * - Session data is stored in company_intelligence_sessions table
 * 
 * Uses the bulletproof UnifiedScraperExecutor for all operations:
 * - Database-first session management (no fragile caches)
 * - Execution locks to prevent duplicates
 * - Intelligent data aggregation with deduplication
 * 
 * @module scraping-execute-api
 */

import { NextRequest, NextResponse } from 'next/server'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { UnifiedScraperExecutor } from '@/lib/company-intelligence/core/unified-scraper-executor'
import { ScrapingErrorHandler } from '@/lib/company-intelligence/error-handler'
import { createClient } from '@/lib/supabase/server'
// Using new unified event system - migration complete
import { EventFactory, StreamWriter } from '@/lib/realtime-events'

// Single instance of executor (singleton pattern)
const executor = new UnifiedScraperExecutor()


/**
 * Execute a scraper and add results to session
 */
export async function POST(request: NextRequest) {
  // CRITICAL: Add console.log to verify API is being called
  console.log('🔴 SCRAPING EXECUTE API CALLED - POST')

  const startTime = Date.now()

  return await permanentLogger.withRequest('scraping-execute', async (requestId) => {
    permanentLogger.breadcrumb('navigation', 'Scraping execution API called', { method: 'POST' })

    try {
    // Parse request body
    const body = await request.json()
    const { 
      sessionId, 
      domain,
      scraperId, 
      options,
      stream = false 
    } = body
    
    // CRITICAL: URLs come from database, NOT from request (bulletproof architecture)
    // The UI NEVER passes URLs - they are stored in session.discovered_urls during sitemap stage

    permanentLogger.breadcrumb('input', 'Scraping parameters received', {
      sessionId,
      domain,
      scraperId,
      stream
      // URLs will be retrieved from database by executor
    })

    permanentLogger.info('Scraper execution request received', { category: 'SCRAPING_EXECUTE', sessionId,
      domain,
      scraperId,
      stream })

    // Validate required fields (URLs come from database)
    if (!sessionId || !scraperId) {
      permanentLogger.captureError('SCRAPING_EXECUTE', new Error('Missing required fields'), {
        hasSessionId: !!sessionId,
        hasDomain: !!domain,
        hasScraperId: !!scraperId
      })
      
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          details: 'sessionId and scraperId are required'
        },
        { status: 400 }
      )
    }

    // Authenticate user and verify session ownership
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      permanentLogger.captureError('SCRAPING_EXECUTE', new Error('Authentication failed'), {
        error: authError?.message,
        hasUser: !!user
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the user owns this session
    const { data: session, error: sessionError } = await supabase
      .from('company_intelligence_sessions')
      .select('id, domain')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !session) {
      permanentLogger.captureError('SCRAPING_EXECUTE', new Error('Session not found or unauthorized'), {
        sessionId,
        userId: user.id,
        error: sessionError?.message
      })
      return NextResponse.json({ error: 'Session not found or unauthorized' }, { status: 404 })
    }

    // Use domain from session if not provided
    const finalDomain = domain || session.domain
    
    if (!finalDomain) {
      permanentLogger.captureError('SCRAPING_EXECUTE', new Error('No domain available'), {
        sessionId,
        requestDomain: domain,
        sessionDomain: session.domain
      })
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
    }
    
    // Get discovered URLs directly from the session we just retrieved
    const { data: sessionWithUrls, error: urlsError } = await supabase
      .from('company_intelligence_sessions')
      .select('discovered_urls')
      .eq('id', sessionId)
      .single()
    
    if (urlsError) {
      permanentLogger.captureError('SCRAPING_EXECUTE', new Error('Failed to get discovered URLs'), {
        sessionId,
        error: urlsError.message
      })
      return NextResponse.json({ error: 'Failed to get discovered URLs' }, { status: 500 })
    }
    
    const discoveredUrls = sessionWithUrls?.discovered_urls || []
    
    permanentLogger.info('Retrieved discovered URLs from session', {
      category: 'SCRAPING_EXECUTE',
      sessionId,
      domain: finalDomain,
      hasUrls: !!discoveredUrls,
      urlCount: Array.isArray(discoveredUrls) ? discoveredUrls.length : 0,
      urlsSample: Array.isArray(discoveredUrls) ? discoveredUrls.slice(0, 3) : []
    })
    
    // Ensure we have URLs
    if (!discoveredUrls || discoveredUrls.length === 0) {
      permanentLogger.captureError('SCRAPING_EXECUTE', new Error('No URLs found in session'), {
        sessionId,
        domain: finalDomain
      })
      return NextResponse.json({ 
        error: 'No URLs available for scraping. Please complete sitemap discovery first.' 
      }, { status: 400 })
    }

    // Handle streaming response with new StreamWriter from unified event system
    console.log('🔴 SCRAPING_EXECUTE: Stream flag check', { stream, typeOfStream: typeof stream })

    if (stream) {
      console.log('🔴 SCRAPING_EXECUTE: STREAMING MODE ACTIVATED', {
        sessionId,
        scraperId,
        urlCount: discoveredUrls.length
      })

      permanentLogger.info('Starting streaming execution', { category: 'SCRAPING_EXECUTE', sessionId,
        scraperId,
        urlCount: discoveredUrls.length })

      const correlationId = `${sessionId}_${Date.now()}`

      console.log('🔴 SCRAPING_EXECUTE: Creating StreamWriter...')

      // Create StreamWriter with abort signal for proper cleanup
      const streamWriter = new StreamWriter(
        sessionId,
        correlationId,
        request.signal // Pass abort signal for client disconnect handling!
      )

      console.log('🔴 SCRAPING_EXECUTE: Creating ReadableStream...')

      // Create response with proper headers (Next.js 15 best practices)
      const response = new Response(streamWriter.createStream(), {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform', // no-transform is critical
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no' // Disable nginx buffering
        }
      })
      
      console.log('🔴 SCRAPING_EXECUTE: Response created, headers set')
      
      // Progress callback that uses SSEEventFactory for consistency
      const progressCallback = async (event: any) => {
        console.log('🔴 SCRAPING_EXECUTE: progressCallback CALLED:', {
          eventType: event?.type,
          eventMessage: event?.data?.message || event?.message,
          hasEvent: !!event
        })
        
        try {
          // Ensure event is properly formatted using SSEEventFactory
          let sseEvent
          
          // If event already has an id, it's from SSEEventFactory
          if (event.id && event.type && event.timestamp) {
            console.log('🔴 SCRAPING_EXECUTE: Event already formatted from SSEEventFactory')
            sseEvent = event
          } else {
            console.log('🔴 SCRAPING_EXECUTE: Converting legacy event to SSE format')
            // Convert legacy events to SSE format
            if (event.type === 'progress') {
              sseEvent = EventFactory.progress(
                event.current || 0,
                event.total || 100,
                event.data?.message || event.message || 'Processing...',
                { source: EventSource.SCRAPER, phase: 'scraping', sessionId, ...event }
              )
            } else if (event.type === 'error') {
              // Extract error message properly - check both data.error and data.message
              const errorMessage = event.data?.error || event.data?.message || event.error || event.message || event
              sseEvent = EventFactory.error(
                errorMessage,
                { source: EventSource.SCRAPER, correlationId, sessionId }
              )
            } else if (event.type === 'complete' || event.type === 'scraper_complete') {
              sseEvent = EventFactory.complete(
                event,
                { source: EventSource.SCRAPER, correlationId, sessionId }
              )
            } else {
              // Default to data event
              sseEvent = EventFactory.data(
                event,
                { source: EventSource.SCRAPER, correlationId, sessionId }
              )
            }
          }
          
          console.log('🔴 SCRAPING_EXECUTE: Sending SSE event to manager...')
          await streamWriter.sendEvent(sseEvent)
          console.log('🔴 SCRAPING_EXECUTE: SSE event sent successfully')
        } catch (error) {
          console.log('🔴 SCRAPING_EXECUTE: ERROR sending progress event:', error)
          permanentLogger.captureError('SCRAPING_EXECUTE', new Error('Failed to send progress event'), {
            error: error instanceof Error ? error.message : 'Unknown',
            sessionId
          })
        }
      }
      
      // Execute with streaming in background with proper error handling
      executor.executeWithStreaming(
        { 
          sessionId, 
          domain: finalDomain, 
          scraperId, 
          urls: discoveredUrls, 
          options, 
          stream: true 
        },
        progressCallback
      ).then(() => {
        permanentLogger.info('Streaming execution completed', {
          category: 'SCRAPING_EXECUTE',
          sessionId,
          duration: Date.now() - startTime
        })
      }).catch(error => {
        permanentLogger.captureError('SCRAPING_EXECUTE', new Error('Streaming execution failed'), {
          sessionId,
          error: error instanceof Error ? error.message : 'Unknown',
          stack: error instanceof Error ? error.stack : undefined
        })
        
        // Send error event to client
        streamWriter.sendEvent(EventFactory.error(error, {
          source: EventSource.SCRAPER,
          correlationId,
          sessionId
        }))
      }).finally(() => {
        // Clean shutdown
        streamWriter.close()
      })
      
      return response
    }
    
    // Non-streaming execution using UnifiedScraperExecutor
    permanentLogger.info('Starting non-streaming execution', { category: 'SCRAPING_EXECUTE', sessionId,
      scraperId
      // URL count will be determined from database
    })
    
    const result = await executor.execute({
      sessionId,
      domain: finalDomain,
      scraperId,
      urls: discoveredUrls, // Pass discovered URLs directly
      options,
      stream: false
    })
    
    const duration = Date.now() - startTime
    
    permanentLogger.info('Execution complete', { category: 'SCRAPING_EXECUTE', sessionId,
      scraperId,
      duration,
      pagesScraped: result.newData.pages,
      dataPoints: result.newData.dataPoints,
      discoveredLinks: result.newData.discoveredLinks,
      suggestions: result.suggestions.length })
    
    return NextResponse.json(result)
    
    } catch (error) {
      permanentLogger.captureError('SCRAPING_EXECUTE', new Error('Execution failed'), {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })

      return NextResponse.json(
        {
          error: 'Scraper execution failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }
  })
}


/**
 * GET /api/company-intelligence/scraping/execute
 * Get session status and available scrapers
 * 
 * IMPORTANT: All data comes from Supabase database (single source of truth)
 * Session data is retrieved from company_intelligence_sessions table
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      )
    }
    
    // Use UnifiedScraperExecutor to get session status
    const status = await executor.getSessionStatus(sessionId)
    
    permanentLogger.info('Session status retrieved', { category: 'SCRAPING_STATUS', sessionId,
      scraperRuns: status.scraperRuns,
      pagesScraped: status.pagesScraped,
      totalDataPoints: status.totalDataPoints })
    
    return NextResponse.json(status)
    
  } catch (error) {
    const errorMsg = ScrapingErrorHandler.handleError('SCRAPING_STATUS', error, {
      showToUser: false // Don't show internal errors to user for status checks
    })
    
    // Return empty stats on error to prevent UI crashes
    return NextResponse.json({
      sessionId: request.nextUrl.searchParams.get('sessionId') || '',
      scraperRuns: 0,
      pagesScraped: 0,
      totalDataPoints: 0,
      availableScrapers: executor.getAvailableScrapers(),
      usedScrapers: [],
      suggestions: ['Error fetching status - please retry'],
      error: errorMsg
    })
  }
}