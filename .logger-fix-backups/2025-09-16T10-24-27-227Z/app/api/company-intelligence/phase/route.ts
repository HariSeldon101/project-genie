/**
 * Phase-Based Company Intelligence API
 * CRITICAL: Each phase must be executed separately
 * NO automatic progression without explicit user approval
 */

import { NextRequest, NextResponse } from 'next/server'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { LLMLogger } from '@/lib/utils/llm-logger'
import { getPhaseOrchestrator } from '@/lib/company-intelligence/core/phase-orchestrator'
import { ResearchPhase } from '@/lib/company-intelligence/types'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    const { 
      action,
      sessionId,
      domain,
      phase,
      autoApprove = false,
      phaseControl,
      options
    } = body
    
    permanentLogger.info('Received phase request', { category: 'PHASE_API', action,
      sessionId,
      phase,
      domain,
      autoApprove })
    
    const orchestrator = getPhaseOrchestrator()
    
    switch (action) {
      case 'initialize':
        // Create a new research session
        if (!domain) {
          return NextResponse.json(
            { error: 'Domain is required' },
            { status: 400 }
          )
        }
        
        const session = await orchestrator.initializeSession({
          domain,
          depth: 'comprehensive',
          phaseControl: phaseControl || {
            mode: 'sequential',
            requireApproval: true,
            phases: Object.values(ResearchPhase)
          },
          options
        })
        
        permanentLogger.info('Session initialized', { category: 'PHASE_API', sessionId: session.id,
          domain: session.domain })
        
        return NextResponse.json({
          success: true,
          sessionId: session.id,
          session
        })
        
      case 'execute':
        // Execute a specific phase
        if (!sessionId || !phase) {
          return NextResponse.json(
            { error: 'SessionId and phase are required' },
            { status: 400 }
          )
        }
        
        // Validate phase
        if (!Object.values(ResearchPhase).includes(phase)) {
          return NextResponse.json(
            { error: `Invalid phase: ${phase}` },
            { status: 400 }
          )
        }
        
        // Log if this will use LLM
        if (phase === ResearchPhase.ENRICHMENT || phase === ResearchPhase.GENERATION) {
          LLMLogger.logLLMOperationStarting({
            phase,
            operation: `Execute ${phase} phase`,
            estimatedCost: phase === ResearchPhase.ENRICHMENT ? 0.50 : 0.25,
            willUseLLM: true
          })
        }
        
        const result = await orchestrator.executePhase(sessionId, phase, autoApprove)
        
        permanentLogger.info('Phase executed', {
          category: 'PHASE_API',
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
        
      case 'approve':
        // Approve and continue to next phase
        if (!sessionId) {
          return NextResponse.json(
            { error: 'SessionId is required' },
            { status: 400 }
          )
        }
        
        const nextResult = await orchestrator.approveAndContinue(sessionId)
        
        return NextResponse.json({
          success: true,
          result: nextResult,
          session: orchestrator.getSession(sessionId)
        })
        
      case 'status':
        // Get session status
        if (!sessionId) {
          return NextResponse.json(
            { error: 'SessionId is required' },
            { status: 400 }
          )
        }
        
        const currentSession = orchestrator.getSession(sessionId)
        
        if (!currentSession) {
          return NextResponse.json(
            { error: 'Session not found' },
            { status: 404 }
          )
        }
        
        return NextResponse.json({
          success: true,
          session: currentSession
        })
        
      case 'abort':
        // Abort a session
        if (!sessionId) {
          return NextResponse.json(
            { error: 'SessionId is required' },
            { status: 400 }
          )
        }
        
        orchestrator.abortSession(sessionId)
        
        return NextResponse.json({
          success: true,
          message: 'Session aborted'
        })
        
      case 'scrape-only':
        // Special action for scraping without any LLM calls
        if (!domain) {
          return NextResponse.json(
            { error: 'Domain is required' },
            { status: 400 }
          )
        }
        
        permanentLogger.info('PHASE_API', '🟢 SCRAPING ONLY - NO LLM CALLS', { domain})
        
        // Initialize session for scraping only
        const scrapeSession = await orchestrator.initializeSession({
          domain,
          depth: 'basic',
          phaseControl: {
            mode: 'single',
            phases: [ResearchPhase.SCRAPING],
            stopAfter: ResearchPhase.SCRAPING,
            requireApproval: false
          },
          options
        })
        
        // Execute scraping phase
        const scrapeResult = await orchestrator.executePhase(
          scrapeSession.id,
          ResearchPhase.SCRAPING,
          true // Auto-approve since it's scraping only
        )
        
        permanentLogger.info('Scraping completed', {
          category: 'PHASE_API',
          sessionId: scrapeSession.id,
          domain,
          pagesScraped: scrapeResult.metrics?.itemsProcessed || 0,
          duration: Date.now() - startTime
        })
        
        return NextResponse.json({
          success: true,
          sessionId: scrapeSession.id,
          result: scrapeResult,
          message: 'Scraping completed without any LLM calls'
        })
        
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
    
  } catch (error) {
    permanentLogger.info('Request failed', {
      category: 'PHASE_API_ERROR',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Get all active sessions
  const orchestrator = getPhaseOrchestrator()
  
  // This would need to be implemented in the orchestrator
  return NextResponse.json({
    message: 'Use POST with appropriate action',
    availableActions: [
      'initialize',
      'execute',
      'approve',
      'status',
      'abort',
      'scrape-only'
    ]
  })
}