import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPhaseOrchestrator } from '@/lib/company-intelligence/core/phase-orchestrator'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { ReviewGateManager } from '@/lib/company-intelligence/services/review-gate-manager'
import { LLMLogger } from '@/lib/utils/llm-logger'
import { PhaseResult } from '@/lib/company-intelligence/types/phases'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

interface GenerationRequest {
  sessionId: string
  enrichmentResults: PhaseResult
  outputFormat?: 'report' | 'presentation' | 'summary'
}

export async function POST(request: NextRequest) {
  let sessionId = ''
  const llmLogger = LLMLogger.getInstance()
  
  try {
    permanentLogger.info('GENERATION_ENDPOINT', 'Starting generation phase request')
    
    const body: GenerationRequest = await request.json()
    sessionId = body.sessionId
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }
    
    if (!body.enrichmentResults) {
      return NextResponse.json(
        { error: 'Enrichment results are required for generation' },
        { status: 400 }
      )
    }
    
    // Get orchestrator instance
    const orchestrator = getPhaseOrchestrator()
    
    // Load session
    await orchestrator.loadSession(sessionId)
    
    // Create review gate manager
    const reviewManager = new ReviewGateManager()
    
    // Validate enrichment results meet quality threshold
    const enrichmentReview = await reviewManager.evaluatePhase({
      phase: 'enrichment',
      data: body.enrichmentResults.data,
      metadata: body.enrichmentResults.metadata,
      timestamp: body.enrichmentResults.timestamp
    })
    
    if (!enrichmentReview.approved) {
      permanentLogger.info('GENERATION_ENDPOINT', 'Enrichment results did not meet quality threshold', { sessionId,
        score: enrichmentReview.score,
        reason: enrichmentReview.reason })
      
      return NextResponse.json({
        phase: 'generation',
        status: 'blocked',
        reason: `Enrichment results insufficient: ${enrichmentReview.reason}`,
        score: enrichmentReview.score,
        sessionId
      }, { status: 400 })
    }
    
    // Store enrichment results in session
    orchestrator.setPhaseResult('enrichment', body.enrichmentResults)
    
    // Set output format preference
    if (body.outputFormat) {
      orchestrator.setOption('outputFormat', body.outputFormat)
    }
    
    // Log that we're about to make LLM calls for document generation
    permanentLogger.info('GENERATION_ENDPOINT', '⚠️ STARTING DOCUMENT GENERATION WITH LLM CALLS ⚠️', { sessionId,
      outputFormat: body.outputFormat || 'report' })
    
    llmLogger.startPhase('generation')
    
    // Execute generation phase (THIS MAKES LLM CALLS)
    const generationResult = await orchestrator.executePhase('generation')
    
    const phaseMetrics = llmLogger.endPhase('generation')
    
    permanentLogger.info('GENERATION_ENDPOINT', 'Generation phase completed', {
      sessionId,
      llmCallsMade: phaseMetrics.callCount,
      totalCost: phaseMetrics.totalCost,
      documentsGenerated: generationResult.data ? Object.keys(generationResult.data).length : 0
    })
    
    // Evaluate generation results
    const generationReview = await reviewManager.evaluatePhase({
      phase: 'generation',
      data: generationResult.data,
      metadata: {
        ...generationResult.metadata,
        llmMetrics: phaseMetrics
      },
      timestamp: generationResult.timestamp
    })
    
    // Mark session as complete
    orchestrator.setStatus('completed')
    await orchestrator.saveSession()
    
    // Calculate total session metrics
    const sessionMetrics = llmLogger.getSessionMetrics()
    
    permanentLogger.info('GENERATION_ENDPOINT', '✅ FULL PIPELINE COMPLETED', { sessionId,
      totalLLMCalls: sessionMetrics.totalCalls,
      totalCost: sessionMetrics.totalCost,
      totalTokens: sessionMetrics.totalTokens })
    
    return NextResponse.json({
      phase: 'generation',
      status: 'completed',
      result: generationResult,
      review: generationReview,
      sessionId,
      llmMetrics: phaseMetrics,
      sessionMetrics: sessionMetrics,
      pipelineComplete: true
    })
    
  } catch (error) {
    permanentLogger.captureError('GENERATION_ENDPOINT', new Error('Error in generation phase'), {
      error: error instanceof Error ? error.message : 'Unknown error',
      sessionId
    })
    
    llmLogger.endPhase('generation')
    
    return NextResponse.json(
      { 
        error: 'Failed to execute generation phase',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}