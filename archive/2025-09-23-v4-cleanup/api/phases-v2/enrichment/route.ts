import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CompanyIntelligenceRepository } from '@/lib/repositories/company-intelligence-repository'
import { getPhaseOrchestrator } from '@/lib/company-intelligence/core/phase-orchestrator'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { ReviewGateManager } from '@/lib/company-intelligence/services/review-gate-manager'
import { LLMLogger } from '@/lib/utils/llm-logger'
import { PhaseResult } from '@/lib/company-intelligence/types/phases'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

interface EnrichmentRequest {
  domain: string  // Required - domain to enrich data for
  sessionId?: string  // Optional for backward compatibility
  extractionResults?: PhaseResult  // Optional - can be retrieved from session
  enableRateLimiting?: boolean
}

export async function POST(request: NextRequest) {
  let sessionId = ''
  const llmLogger = LLMLogger.getInstance()

  try {
    // 1. Authenticate user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      permanentLogger.warn('ENRICHMENT_ENDPOINT', 'Authentication required for enrichment', {
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
    permanentLogger.breadcrumb('auth', 'User authenticated for enrichment', {
      userId: user.id,
      email: user.email
    })

    permanentLogger.info('ENRICHMENT_ENDPOINT', 'Starting enrichment phase request')

    // 2. Parse request body
    const body: EnrichmentRequest = await request.json()

    // Domain is now required
    if (!body.domain) {
      return NextResponse.json(
        { error: 'Domain is required' },
        { status: 400 }
      )
    }

    // 3. Get or create session based on authenticated user and domain
    const repository = CompanyIntelligenceRepository.getInstance()
    const session = await repository.getOrCreateUserSession(user.id, body.domain)
    sessionId = session.id

    permanentLogger.info('ENRICHMENT_ENDPOINT', 'Session retrieved', {
      sessionId: session.id,
      domain: body.domain,
      userId: user.id
    })

    // 4. Get extraction results from session if not provided
    const extractionResults = body.extractionResults || session.merged_data?.extraction

    if (!extractionResults) {
      return NextResponse.json(
        { error: 'Extraction results are required for enrichment. Please run extraction phase first.' },
        { status: 400 }
      )
    }
    
    // Get orchestrator instance
    const orchestrator = getPhaseOrchestrator()

    // Load session with server-managed ID
    await orchestrator.loadSession(sessionId)
    
    // Create review gate manager
    const reviewManager = new ReviewGateManager()
    
    // Validate extraction results meet quality threshold
    const extractionReview = await reviewManager.evaluatePhase({
      phase: 'extraction',
      data: extractionResults.data,
      metadata: extractionResults.metadata,
      timestamp: extractionResults.timestamp
    })
    
    if (!extractionReview.approved) {
      permanentLogger.info('ENRICHMENT_ENDPOINT', 'Extraction results did not meet quality threshold', { sessionId,
        score: extractionReview.score,
        reason: extractionReview.reason })
      
      return NextResponse.json({
        phase: 'enrichment',
        status: 'paused',  // Fixed: was 'blocked' which is invalid enum
        reason: `Extraction results insufficient: ${extractionReview.reason}`,
        score: extractionReview.score,
        sessionId
      }, { status: 400 })
    }
    
    // Store extraction results in session
    orchestrator.setPhaseResult('extraction', extractionResults)
    
    // Log that we're about to make LLM calls
    permanentLogger.info('ENRICHMENT_ENDPOINT', '⚠️ STARTING ENRICHMENT WITH LLM CALLS ⚠️', { sessionId,
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