/**
 * Test SSE Endpoint
 * Verifies that basic SSE streaming works correctly
 * Sends events every 500ms for 5 seconds
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  console.log('🔴 TEST SSE ENDPOINT CALLED')
  
  // Create a TransformStream for SSE
  const encoder = new TextEncoder()
  let intervalId: NodeJS.Timeout | null = null
  let eventCount = 0
  
  const stream = new ReadableStream({
    start(controller) {
      console.log('🔴 TEST SSE: Stream started')
      
      // Send initial event
      const initialEvent = `data: ${JSON.stringify({ 
        type: 'connected', 
        message: 'SSE stream connected',
        timestamp: Date.now() 
      })}\n\n`
      controller.enqueue(encoder.encode(initialEvent))
      console.log('🔴 TEST SSE: Sent initial event')
      
      // Send events every 500ms
      intervalId = setInterval(() => {
        eventCount++
        const event = `data: ${JSON.stringify({
          type: 'progress',
          count: eventCount,
          message: `Event #${eventCount}`,
          timestamp: Date.now()
        })}\n\n`
        
        console.log(`🔴 TEST SSE: Sending event #${eventCount}`)
        controller.enqueue(encoder.encode(event))
        
        // Stop after 10 events
        if (eventCount >= 10) {
          console.log('🔴 TEST SSE: Sending complete event')
          const completeEvent = `data: ${JSON.stringify({
            type: 'complete',
            total: eventCount,
            message: 'Stream complete',
            timestamp: Date.now()
          })}\n\n`
          controller.enqueue(encoder.encode(completeEvent))
          
          if (intervalId) {
            clearInterval(intervalId)
          }
          controller.close()
          console.log('🔴 TEST SSE: Stream closed')
        }
      }, 500)
    },
    
    cancel() {
      console.log('🔴 TEST SSE: Stream cancelled')
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  })
  
  // Return response with SSE headers
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  })
}

export async function POST(request: NextRequest) {
  console.log('🔴 TEST SSE POST ENDPOINT CALLED')
  
  // Parse body to test with parameters
  const body = await request.json()
  console.log('🔴 TEST SSE: Request body:', body)
  
  const { duration = 5000, interval = 500 } = body
  
  const encoder = new TextEncoder()
  let intervalId: NodeJS.Timeout | null = null
  let eventCount = 0
  const maxEvents = Math.floor(duration / interval)
  
  const stream = new ReadableStream({
    start(controller) {
      console.log('🔴 TEST SSE POST: Stream started', { maxEvents, interval })
      
      // Send initial event
      const initialEvent = `data: ${JSON.stringify({ 
        type: 'connected', 
        message: 'POST SSE stream connected',
        config: { duration, interval, maxEvents },
        timestamp: Date.now() 
      })}\n\n`
      controller.enqueue(encoder.encode(initialEvent))
      
      // Send events at specified interval
      intervalId = setInterval(() => {
        eventCount++
        const progress = (eventCount / maxEvents) * 100
        
        const event = `data: ${JSON.stringify({
          type: 'progress',
          current: eventCount,
          total: maxEvents,
          progress: Math.round(progress),
          message: `Processing ${eventCount}/${maxEvents}`,
          timestamp: Date.now()
        })}\n\n`
        
        console.log(`🔴 TEST SSE POST: Event #${eventCount}/${maxEvents} (${Math.round(progress)}%)`)
        controller.enqueue(encoder.encode(event))
        
        // Stop when done
        if (eventCount >= maxEvents) {
          const completeEvent = `data: ${JSON.stringify({
            type: 'complete',
            total: eventCount,
            message: 'POST stream complete',
            timestamp: Date.now()
          })}\n\n`
          controller.enqueue(encoder.encode(completeEvent))
          
          if (intervalId) {
            clearInterval(intervalId)
          }
          controller.close()
          console.log('🔴 TEST SSE POST: Stream complete')
        }
      }, interval)
    },
    
    cancel() {
      console.log('🔴 TEST SSE POST: Stream cancelled')
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  })
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  })
}