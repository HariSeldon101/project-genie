/**
 * Phase-Based Company Intelligence Streaming API
 * Real-time updates for phase-based execution
 * NO AUTOMATIC PROGRESSION - requires explicit approval between phases
 */

import { NextRequest, NextResponse } from 'next/server'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { LLMLogger } from '@/lib/utils/llm-logger'
import { getPhaseOrchestrator } from '@/lib/company-intelligence/core/phase-orchestrator'
import { ResearchPhase } from '@/lib/company-intelligence/types'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('sessionId')
  const phase = searchParams.get('phase')
  
  if (!sessionId) {
    return NextResponse.json(
      { error: 'Session ID required' },
      { status: 400 }
    )
  }
  
  permanentLogger.info('PHASE_STREAM', 'SSE connection established', {
    sessionId,
    phase
  })
  
  // Create SSE stream
  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()
  
  // Send initial connection message
  writer.write(encoder.encode(`data: ${JSON.stringify({ 
    type: 'connected', 
    message: 'Phase-based SSE connection established',
    sessionId,
    phase 
  })}\n\n`))
  
  // Set up event listeners for phase updates
  const orchestrator = getPhaseOrchestrator()
  
  // Send periodic status updates
  const statusInterval = setInterval(async () => {
    try {
      const session = orchestrator.getSession(sessionId)
      if (session) {
        await writer.write(encoder.encode(`data: ${JSON.stringify({
          type: 'status',
          session,
          currentPhase: session.currentPhase,
          phaseResults: session.phaseResults,
          status: session.status
        })}\n\n`))
        
        // Log if LLM operation is upcoming
        if (session.currentPhase === ResearchPhase.ENRICHMENT || 
            session.currentPhase === ResearchPhase.GENERATION) {
          if (session.status === 'ready' || session.status === 'awaiting_approval') {
            await writer.write(encoder.encode(`data: ${JSON.stringify({
              type: 'llm-warning',
              message: '⚠️ Next phase will use LLM APIs',
              phase: session.currentPhase,
              requiresApproval: true
            })}\n\n`))
          }
        }
      }
    } catch (error) {
      // Connection closed, clean up
      clearInterval(statusInterval)
    }
  }, 1000) // Update every second
  
  // Handle connection close
  req.signal.addEventListener('abort', () => {
    clearInterval(statusInterval)
    writer.close()
  })
  
  return new NextResponse(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

// POST endpoint for triggering phase actions with SSE updates
export async function POST(req: NextRequest) {
  const startTime = Date.now()
  
  try {
    const body = await req.json()
    const { action, sessionId, domain, phase } = body
    
    permanentLogger.info('PHASE_STREAM_POST', 'Phase action received', {
      action,
      sessionId,
      phase,
      domain
    })
    
    // CRITICAL: Log warning if this will use LLM
    if (action === 'execute' && 
        (phase === ResearchPhase.ENRICHMENT || phase === ResearchPhase.GENERATION)) {
      LLMLogger.logLLMOperationStarting({
        phase,
        operation: `Execute ${phase} phase`,
        estimatedCost: phase === ResearchPhase.ENRICHMENT ? 0.50 : 0.25,
        willUseLLM: true
      })
      
      // Add delay for user to see warning
      await new Promise(resolve => setTimeout(resolve, 3000))
    }
    
    const orchestrator = getPhaseOrchestrator()
    
    switch (action) {
      case 'initialize':
        if (!domain) {
          return NextResponse.json(
            { error: 'Domain is required' },
            { status: 400 }
          )
        }
        
        const session = await orchestrator.initializeSession({
          domain,
          depth: 'comprehensive',
          phaseControl: {
            mode: 'sequential',
            requireApproval: true,
            phases: Object.values(ResearchPhase)
          }
        })
        
        permanentLogger.info('PHASE_STREAM', 'Session initialized', {
          sessionId: session.id,
          domain: session.domain
        })
        
        return NextResponse.json({
          success: true,
          sessionId: session.id,
          session
        })
        
      case 'execute':
        if (!sessionId || !phase) {
          return NextResponse.json(
            { error: 'SessionId and phase are required' },
            { status: 400 }
          )
        }
        
        const result = await orchestrator.executePhase(sessionId, phase, false)
        
        permanentLogger.info('PHASE_STREAM', 'Phase executed', {
          sessionId,
          phase,
          status: result.status,
          duration: Date.now() - startTime
        })
        
        return NextResponse.json({
          success: true,
          result,
          session: orchestrator.getSession(sessionId)
        })
        
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
    
  } catch (error) {
    permanentLogger.captureError('PHASE_STREAM_ERROR', error as Error, {
      message: 'Request failed'
    })
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}