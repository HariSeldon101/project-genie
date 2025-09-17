import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPhaseOrchestrator } from '@/lib/company-intelligence/core/phase-orchestrator'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { ReviewGateManager } from '@/lib/company-intelligence/services/review-gate-manager'
import { PhaseResult } from '@/lib/company-intelligence/types/phases'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

interface ExtractionRequest {
  sessionId: string
  scrapingResults: PhaseResult
}

export async function POST(request: NextRequest) {
  let sessionId = ''
  
  try {
    permanentLogger.info('EXTRACTION_ENDPOINT', 'Starting extraction phase request')
    
    const body: ExtractionRequest = await request.json()
    sessionId = body.sessionId
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }
    
    if (!body.scrapingResults) {
      return NextResponse.json(
        { error: 'Scraping results are required for extraction' },
        { status: 400 }
      )
    }
    
    // Get orchestrator instance
    const orchestrator = getPhaseOrchestrator()
    
    // Load session
    await orchestrator.loadSession(sessionId)
    
    // Create review gate manager
    const reviewManager = new ReviewGateManager()
    
    // Validate scraping results meet quality threshold
    const scrapingReview = await reviewManager.evaluatePhase({
      phase: 'scraping',
      data: body.scrapingResults.data,
      metadata: body.scrapingResults.metadata,
      timestamp: body.scrapingResults.timestamp
    })
    
    if (!scrapingReview.approved) {
      permanentLogger.info('Scraping results did not meet quality threshold', { category: 'EXTRACTION_ENDPOINT', sessionId,
        score: scrapingReview.score,
        reason: scrapingReview.reason })
      
      return NextResponse.json({
        phase: 'extraction',
        status: 'blocked',
        reason: `Scraping results insufficient: ${scrapingReview.reason}`,
        score: scrapingReview.score,
        sessionId
      }, { status: 400 })
    }
    
    // Store scraping results in session
    orchestrator.setPhaseResult('scraping', body.scrapingResults)
    
    // Execute extraction phase (NO LLM calls, just data parsing)
    permanentLogger.info('EXTRACTION_ENDPOINT', 'Starting extraction phase execution', { sessionId})
    
    const extractionResult = await orchestrator.executePhase('extraction')
    
    permanentLogger.info('Extraction phase completed', {
      category: 'EXTRACTION_ENDPOINT',
      sessionId,
      dataExtracted: extractionResult.data ? Object.keys(extractionResult.data).length : 0
    })
    
    // Evaluate extraction results
    const extractionReview = await reviewManager.evaluatePhase({
      phase: 'extraction',
      data: extractionResult.data,
      metadata: extractionResult.metadata,
      timestamp: extractionResult.timestamp
    })
    
    // Save session state
    await orchestrator.saveSession()
    
    return NextResponse.json({
      phase: 'extraction',
      status: 'completed',
      result: extractionResult,
      review: extractionReview,
      sessionId,
      nextPhase: extractionReview.approved ? 'enrichment' : null,
      canProceed: extractionReview.approved
    })
    
  } catch (error) {
    permanentLogger.captureError('EXTRACTION_ENDPOINT', new Error('Error in extraction phase'), {
      error: error instanceof Error ? error.message : 'Unknown error',
      sessionId
    })
    
    return NextResponse.json(
      { 
        error: 'Failed to execute extraction phase',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}