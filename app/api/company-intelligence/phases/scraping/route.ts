import { NextRequest, NextResponse } from 'next/server'
import { UnifiedScraperExecutor } from '@/lib/company-intelligence/core/unified-scraper-executor'
import { permanentLogger } from '@/lib/utils/permanent-logger'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

interface ScrapingRequest {
  sessionId: string
  domain?: string  // Optional - retrieved from session
  pages?: string[]  // Optional - retrieved from session.discovered_urls
  options?: {
    maxPages?: number
    timeout?: number
    mode?: 'static' | 'dynamic' | 'incremental'
    stream?: boolean
  }
}

/**
 * Bulletproof Scraping API Route
 * Uses existing utilities: SessionManager, UnifiedScraperExecutor, ExecutionLockManager, DataAggregator
 * NO mock data, NO silent failures, NO in-memory caches
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // 1. Parse and validate request
    const body: ScrapingRequest = await request.json()
    
    permanentLogger.info('Request received', {
      category: 'SCRAPING_API',
      sessionId: body.sessionId,
      domain: body.domain,
      mode: body.options?.mode || 'static',
      stream: body.options?.stream || false,
      timestamp: new Date().toISOString()
    })
    
    // 2. Validate required fields
    if (!body.sessionId) {
      permanentLogger.captureError('SCRAPING_API', new Error('Missing sessionId'), { body })
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }
    
    // 3. Initialize executor (handles everything internally)
    const executor = new UnifiedScraperExecutor()
    
    // 4. Handle streaming if requested
    if (body.options?.stream) {
      permanentLogger.info('SCRAPING_API', 'Starting streaming execution', { sessionId: body.sessionId,
        mode: body.options.mode || 'static' })
      
      const encoder = new TextEncoder()
      const stream = new TransformStream()
      const writer = stream.writable.getWriter()
      
      // Start async execution with progress callback
      executor.executeWithStreaming(
        {
          sessionId: body.sessionId,
          domain: body.domain || '',  // Will be retrieved from session
          scraperId: body.options.mode || 'static',
          urls: body.pages || [],  // Will be retrieved from session.discovered_urls
          options: body.options
        },
        async (data) => {
          // Format as Server-Sent Events
          const message = `data: ${JSON.stringify(data)}\n\n`
          await writer.write(encoder.encode(message))
        }
      ).then(() => {
        permanentLogger.info('SCRAPING_API', 'Streaming completed', {
          sessionId: body.sessionId,
          duration: Date.now() - startTime
        })
        writer.close()
      }).catch((error) => {
        permanentLogger.captureError('SCRAPING_API', new Error('Streaming error'), {
          error: error.message,
          stack: error.stack,
          sessionId: body.sessionId
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
    
    // 5. Execute non-streaming request
    permanentLogger.info('SCRAPING_API', 'Starting standard execution', { sessionId: body.sessionId,
      mode: body.options?.mode || 'static' })
    
    const result = await executor.execute({
      sessionId: body.sessionId,
      domain: body.domain || '',  // Will be retrieved from session
      scraperId: body.options?.mode || 'static',
      urls: body.pages || [],  // Will be retrieved from session.discovered_urls
      options: body.options
    })
    
    permanentLogger.info('Execution complete', {
      category: 'SCRAPING_API',
      sessionId: body.sessionId,
      success: result.success,
      duration: Date.now() - startTime,
      pagesScraped: result.newData.pages,
      dataPoints: result.newData.dataPoints,
      totalPages: result.totalData.pagesScraped
    })
    
    return NextResponse.json(result)
    
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