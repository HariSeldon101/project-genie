/**
 * Logs Stream API Route
 * Real-time Server-Sent Events for log streaming
 * MANDATORY: Uses SSEEventFactory for ALL events (as per 2025-01-11 guidelines)
 * Database-first architecture - streams logs from permanent_logs table
 *
 * Features:
 * - Real-time log streaming from database
 * - Correlation ID tracking for event streams
 * - Breadcrumb and timing tracking at all interfaces
 * - Proper error handling without fallbacks
 * - Clean SSE event structure using factory pattern
 *
 * @module logs-stream-api
 */

import { NextRequest } from 'next/server'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { EventFactory } from '@/lib/realtime-events'
import { LogsRepository } from '@/lib/repositories/logs-repository'
import { LogsTransformer } from '@/lib/logs/services/logs-transformer'

/**
 * GET /api/logs/stream
 *
 * Real-time log streaming endpoint using Server-Sent Events
 * Streams logs from database with proper standardization
 *
 * Query Parameters:
 * - level: Filter by log level (debug, info, warn, error, critical)
 * - category: Filter by log category
 * - sessionId: Optional session ID for correlation
 *
 * Returns: EventStream with standardized SSE events
 */
export async function GET(request: NextRequest) {
  // ========== SECURITY CHECK ==========
  // Only allow logs streaming in development environment
  // CRITICAL: Never expose logs in production!
  if (process.env.NODE_ENV !== 'development') {
    return new Response('Not available in production', { status: 403 })
  }

  const startTime = performance.now()

  // ========== PARAMETER EXTRACTION ==========
  // Extract query parameters for filtering
  const searchParams = request.nextUrl.searchParams
  const levelFilter = searchParams.get('level')?.split(',').filter(Boolean)
  const categoryFilter = searchParams.get('category')?.split(',').filter(Boolean)
  const sessionId = searchParams.get('sessionId')

  // ========== CORRELATION SETUP ==========
  // Generate or use provided correlation ID for event tracking
  const correlationId = EventFactory.getCorrelationId(sessionId || undefined)

  // ========== BREADCRUMB TRACKING ==========
  // Log stream initiation for debugging and tracing
  permanentLogger.breadcrumb('API_CALL', 'logs-stream-init', {
    correlationId,
    filters: { level: levelFilter, category: categoryFilter },
    timestamp: new Date().toISOString()
  })

  permanentLogger.info('logs-stream', 'Stream initiated', {
    correlationId,
    sessionId,
    filters: { level: levelFilter, category: categoryFilter }
  })

  // ========== SSE STREAM SETUP ==========
  // Create a TransformStream for Server-Sent Events
  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  // Track stream state
  let isStreamActive = true
  let lastLogId: string | null = null
  let pollInterval: NodeJS.Timeout | null = null

  // Reset sequence counter for new stream
  EventFactory.resetSequence()

  /**
   * Fetch and send new logs from database
   * Uses database-first approach - no mock data!
   */
  const fetchAndSendLogs = async () => {
    if (!isStreamActive) return

    const fetchStartTime = performance.now()

    try {
      // ========== DATABASE FETCH ==========
      // Fetch logs from database using repository pattern
      // CRITICAL: Database-first, no fallback data!
      const params = {
        pageSize: 50, // Fetch last 50 logs
        level: levelFilter,
        category: categoryFilter,
        cursor: lastLogId || undefined
      }

      const { logs: dbLogs } = await LogsRepository.getInstance().getPaginatedLogs(params)

      // ========== TRANSFORM LOGS ==========
      // Transform database logs to UI format
      const transformedLogs = LogsTransformer.transformLogs(dbLogs)

      // Only send new logs (after lastLogId)
      const newLogs = lastLogId
        ? transformedLogs.filter(log => log.id > lastLogId!)
        : transformedLogs.slice(-10) // Initial load: last 10 logs

      if (newLogs.length > 0) {
        // Update lastLogId to newest log
        lastLogId = newLogs[newLogs.length - 1].id

        // ========== CREATE SSE EVENT ==========
        // MANDATORY: Use SSEEventFactory for standardized events
        const event = EventFactory.data(
          newLogs,
          {
            source: EventSource.SYSTEM,
            correlationId,
            phase: 'streaming',
            count: newLogs.length,
            lastId: lastLogId
          }
        )

        // ========== SEND EVENT ==========
        // Format and send SSE event to client
        const sseMessage = EventFactory.formatForSSE(event)
        await writer.write(encoder.encode(sseMessage))

        // ========== TIMING TRACKING ==========
        // Track performance for monitoring
        const fetchDuration = performance.now() - fetchStartTime
        permanentLogger.timing('logs-stream-fetch', {
          duration: fetchDuration,
          logCount: newLogs.length,
          correlationId
        })

        // Log progress event
        permanentLogger.breadcrumb('DATABASE', 'logs-streamed', {
          count: newLogs.length,
          lastId: lastLogId,
          duration: fetchDuration
        })
      }
    } catch (error) {
      // ========== ERROR HANDLING ==========
      // NO SILENT FAILURES - Capture and send errors
      permanentLogger.captureError('logs-stream-fetch', error as Error, {
        correlationId,
        lastLogId,
        filters: { level: levelFilter, category: categoryFilter }
      })

      // Send error event to client
      const errorEvent = EventFactory.error(
        error as Error,
        {
          source: EventSource.SYSTEM,
          correlationId,
          context: 'fetch-error'
        }
      )

      try {
        const sseMessage = EventFactory.formatForSSE(errorEvent)
        await writer.write(encoder.encode(sseMessage))
      } catch (writeError) {
        // Stream might be closed
        console.error('Failed to send error event:', writeError)
        isStreamActive = false
      }
    }
  }

  // ========== INITIAL FETCH ==========
  // Send initial batch of logs immediately
  await fetchAndSendLogs()

  // Send initial status event
  const statusEvent = EventFactory.status(
    'connected',
    {
      filters: { level: levelFilter, category: categoryFilter },
      polling: true,
      interval: 2000
    },
    {
      source: EventSource.SYSTEM,
      correlationId
    }
  )

  try {
    const sseMessage = EventFactory.formatForSSE(statusEvent)
    await writer.write(encoder.encode(sseMessage))
  } catch (error) {
    console.error('Failed to send status event:', error)
  }

  // ========== POLLING SETUP ==========
  // Poll for new logs every 2 seconds
  // This is more efficient than continuous querying
  pollInterval = setInterval(fetchAndSendLogs, 2000)

  // ========== CLEANUP HANDLER ==========
  // Handle client disconnect and cleanup
  const cleanup = async () => {
    isStreamActive = false

    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }

    // ========== SEND COMPLETION EVENT ==========
    // Send final completion event before closing
    const sessionDuration = performance.now() - startTime
    const completeEvent = EventFactory.complete(
      {
        sessionDuration,
        correlationId,
        lastLogId
      },
      {
        source: EventSource.SYSTEM,
        correlationId
      }
    )

    try {
      const sseMessage = EventFactory.formatForSSE(completeEvent)
      await writer.write(encoder.encode(sseMessage))
    } catch (error) {
      // Stream might already be closed - this is OK
      console.log('Stream already closed:', error)
    }

    // Close the writer
    try {
      await writer.close()
    } catch (error) {
      // Log error but re-throw to avoid silent failures
      permanentLogger.captureError('ERROR', error as Error, {
        context: 'Unhandled error - needs proper handling'
      })
      throw error
    }

    // ========== LOG TERMINATION ==========
    // Log stream termination for monitoring
    permanentLogger.timing('logs-stream-total', {
      duration: sessionDuration,
      correlationId
    })

    permanentLogger.info('logs-stream', 'Stream terminated', {
      correlationId,
      duration: sessionDuration,
      lastLogId
    })
  }

  // Register cleanup on abort signal
  request.signal.addEventListener('abort', cleanup)

  // ========== RETURN SSE RESPONSE ==========
  // Return response with proper SSE headers
  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'X-Correlation-Id': correlationId,
      // CORS headers for development
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    },
  })
}