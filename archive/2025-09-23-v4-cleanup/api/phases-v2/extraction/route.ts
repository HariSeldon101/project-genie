import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CompanyIntelligenceRepository } from '@/lib/repositories/company-intelligence-repository'
import { getPhaseOrchestrator } from '@/lib/company-intelligence/core/phase-orchestrator'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { ReviewGateManager } from '@/lib/company-intelligence/services/review-gate-manager'
import { PhaseResult } from '@/lib/company-intelligence/types/phases'
import { convertSupabaseError } from '@/lib/utils/supabase-error-helper'
// Added: 2025-09-22 17:57 Paris - Fix error handling per CLAUDE.md

export const maxDuration = 300
export const dynamic = 'force-dynamic'

interface ExtractionRequest {
  domain: string  // Required - domain to extract data from
  sessionId?: string  // Optional for backward compatibility
  scrapingResults?: PhaseResult  // Optional - can be retrieved from session
}

export async function POST(request: NextRequest) {
  let sessionId = ''

  try {
    // 1. Authenticate user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      permanentLogger.warn('EXTRACTION_ENDPOINT', 'Authentication required for extraction', {
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
    permanentLogger.breadcrumb('auth', 'User authenticated for extraction', {
      userId: user.id,
      email: user.email
    })

    permanentLogger.info('EXTRACTION_ENDPOINT', 'Starting extraction phase request')

    // 2. Parse request body
    const body: ExtractionRequest = await request.json()

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

    permanentLogger.info('EXTRACTION_ENDPOINT', 'Session retrieved', {
      sessionId: session.id,
      domain: body.domain,
      userId: user.id
    })

    // 4. Get scraping results from session if not provided
    const scrapingResults = body.scrapingResults || session.merged_data?.scraping

    if (!scrapingResults) {
      return NextResponse.json(
        { error: 'Scraping results are required for extraction. Please run scraping phase first.' },
        { status: 400 }
      )
    }
    
    // Get orchestrator instance
    const orchestrator = getPhaseOrchestrator()

    // Load session with server-managed ID
    await orchestrator.loadSession(sessionId)
    
    // Create review gate manager
    const reviewManager = new ReviewGateManager()
    
    // Validate scraping results meet quality threshold
    const scrapingReview = await reviewManager.evaluatePhase({
      phase: 'scraping',
      data: scrapingResults.data,
      metadata: scrapingResults.metadata,
      timestamp: scrapingResults.timestamp
    })
    
    if (!scrapingReview.approved) {
      permanentLogger.info('EXTRACTION_ENDPOINT', 'Scraping results did not meet quality threshold', { sessionId,
        score: scrapingReview.score,
        reason: scrapingReview.reason })
      
      return NextResponse.json({
        phase: 'extraction',
        status: 'paused',  // Fixed: was 'blocked' which is invalid enum
        reason: `Scraping results insufficient: ${scrapingReview.reason}`,
        score: scrapingReview.score,
        sessionId
      }, { status: 400 })
    }
    
    // Store scraping results in session
    orchestrator.setPhaseResult('scraping', scrapingResults)
    
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
    // Fixed: 2025-09-22 17:57 Paris - Proper error handling with conversion
    // Check if it might be a Supabase error structure
    if (error && typeof error === 'object' && 'code' in error) {
      const supabaseError = convertSupabaseError(error)
      permanentLogger.captureError('EXTRACTION_ENDPOINT', supabaseError, {
        phase: 'extraction',
        sessionId,
        domain: body?.domain,
        errorCode: (error as any).code
      })

      return NextResponse.json(
        {
          error: 'Failed to execute extraction phase',
          details: supabaseError.message,
          sessionId
        },
        { status: 500 }
      )
    }

    // Regular error handling for non-Supabase errors
    const jsError = error instanceof Error ? error : new Error(String(error))
    permanentLogger.captureError('EXTRACTION_ENDPOINT', jsError, {
      phase: 'extraction',
      sessionId,
      domain: body?.domain
    })

    return NextResponse.json(
      {
        error: 'Failed to execute extraction phase',
        details: jsError.message,
        sessionId
      },
      { status: 500 }
    )
  }
}