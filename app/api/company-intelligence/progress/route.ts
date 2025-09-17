/**
 * Server-Sent Events (SSE) endpoint for real-time progress updates
 * Streams discovery and scraping progress to the UI
 */

import { NextRequest } from 'next/server'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { 
  progressSessions, 
  createProgressSession 
} from '@/lib/company-intelligence/services/progress-manager'

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId')
  
  if (!sessionId) {
    return new Response('Missing sessionId', { status: 400 })
  }
  
  permanentLogger.info('PROGRESS_SSE', `Starting SSE stream for session ${sessionId}`)
  
  // Create or get session
  const session = createProgressSession(sessionId)
  
  // Create SSE stream
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection event
      const connectEvent = `event: connected\ndata: ${JSON.stringify({ sessionId, time: Date.now() })}\n\n`
      controller.enqueue(encoder.encode(connectEvent))
      
      let lastSentIndex = 0
      
      // Poll for new events every 100ms
      const interval = setInterval(() => {
        const session = progressSessions.get(sessionId)
        
        if (!session || !session.isActive) {
          // Session ended, close stream
          const endEvent = `event: end\ndata: ${JSON.stringify({ sessionId })}\n\n`
          controller.enqueue(encoder.encode(endEvent))
          clearInterval(interval)
          controller.close()
          return
        }
        
        // Send any new events
        const newEvents = session.events.slice(lastSentIndex)
        for (const event of newEvents) {
          const sseEvent = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`
          controller.enqueue(encoder.encode(sseEvent))
          lastSentIndex++
        }
        
        // Keep-alive ping every 30 seconds
        const timeSinceLastEvent = Date.now() - session.lastEventTime
        if (timeSinceLastEvent > 30000) {
          const pingEvent = `event: ping\ndata: ${JSON.stringify({ time: Date.now() })}\n\n`
          controller.enqueue(encoder.encode(pingEvent))
          session.lastEventTime = Date.now()
        }
      }, 100)
      
      // Cleanup on disconnect
      req.signal.addEventListener('abort', () => {
        clearInterval(interval)
        permanentLogger.info('PROGRESS_SSE', `Client disconnected from session ${sessionId}`)
      })
    }
  })
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering
    }
  })
}