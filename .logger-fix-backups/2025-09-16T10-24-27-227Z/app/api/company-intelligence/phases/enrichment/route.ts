import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPhaseOrchestrator } from '@/lib/company-intelligence/core/phase-orchestrator'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { ReviewGateManager } from '@/lib/company-intelligence/services/review-gate-manager'
import { LLMLogger } from '@/lib/utils/llm-logger'
import { PhaseResult } from '@/lib/company-intelligence/types/phases'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

interface EnrichmentRequest {
  sessionId: string
  extractionResults: PhaseResult
  enableRateLimiting?: boolean
}

export async function POST(request: NextRequest) {
  let sessionId = ''
  const llmLogger = LLMLogger.getInstance()
  
  try {
    permanentLogger.info('ENRICHMENT_ENDPOINT', 'Starting enrichment phase request')
    
    const body: EnrichmentRequest = await request.json()
    sessionId = body.sessionId
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }
    
    if (!body.extractionResults) {
      return NextResponse.json(
        { error: 'Extraction results are required for enrichment' },
        { status: 400 }
      )
    }
    
    // Get orchestrator instance
    const orchestrator = getPhaseOrchestrator()
    
    // Load session
    await orchestrator.loadSession(sessionId)
    
    // Create review gate manager
    const reviewManager = new ReviewGateManager()
    
    // Validate extraction results meet quality threshold
    const extractionReview = await reviewManager.evaluatePhase({
      phase: 'extraction',
      data: body.extractionResults.data,
      metadata: body.extractionResults.metadata,
      timestamp: body.extractionResults.timestamp
    })
    
    if (!extractionReview.approved) {
      permanentLogger.info('Extraction results did not meet quality threshold', { category: 'ENRICHMENT_ENDPOINT', sessionId,
        score: extractionReview.score,
        reason: extractionReview.reason })
      
      return NextResponse.json({
        phase: 'enrichment',
        status: 'blocked',
        reason: `Extraction results insufficient: ${extractionReview.reason}`,
        score: extractionReview.score,
        sessionId
      }, { status: 400 })
    }
    
    // Store extraction results in session
    orchestrator.setPhaseResult('extraction', body.extractionResults)
    
    // Log that we're about to make LLM calls
    permanentLogger.info('⚠️ STARTING ENRICHMENT WITH LLM CALLS ⚠️', { category: 'ENRICHMENT_ENDPOINT', sessionId,
      rateLimitingEnabled: body.enableRateLimiting ?? true })
    
    llmLogger.startPhase('enrichment')
    
    // Execute enrichment phase (THIS MAKES LLM CALLS)
    const enrichmentResult = await orchestrator.executePhase('enrichment')
    
    const phaseMetrics = llmLogger.endPhase('enrichment')
    
    permanentLogger.info('Enrichment phase completed', {
      category: 'ENRICHMENT_ENDPOINT',
      sessionId,
      llmCallsMode: phaseMetrics.callCount,
      totalCost: phaseMetrics.totalCost,
      dataEnriched: enrichmentResult.data ? Object.keys(enrichmentResult.data).length : 0
    })
    
    // Evaluate enrichment results
    const enrichmentReview = await reviewManager.evaluatePhase({
      phase: 'enrichment',
      data: enrichmentResult.data,
      metadata: {
        ...enrichmentResult.metadata,
        llmMetrics: phaseMetrics
      },
      timestamp: enrichmentResult.timestamp
    })
    
    // Save session state
    await orchestrator.saveSession()
    
    return NextResponse.json({
      phase: 'enrichment',
      status: 'completed',
      result: enrichmentResult,
      review: enrichmentReview,
      sessionId,
      llmMetrics: phaseMetrics,
      nextPhase: enrichmentReview.approved ? 'generation' : null,
      canProceed: enrichmentReview.approved
    })
    
  } catch (error) {
    permanentLogger.captureError('ENRICHMENT_ENDPOINT', new Error('Error in enrichment phase'), {
      error: error instanceof Error ? error.message : 'Unknown error',
      sessionId
    })
    
    llmLogger.endPhase('enrichment')
    
    return NextResponse.json(
      { 
        error: 'Failed to execute enrichment phase',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}