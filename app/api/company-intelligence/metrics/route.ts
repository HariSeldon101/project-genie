// app/api/company-intelligence/metrics/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CompanyIntelligenceRepositoryV4 } from '@/lib/repositories/intelligence-repository-v4'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { convertSupabaseError } from '@/lib/utils/supabase-error-helper'

export async function GET(request: NextRequest) {
  const timer = permanentLogger.timing('api_fetch_metrics')
  
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    
    if (!sessionId) {
      permanentLogger.warn('METRICS_API', 'Missing session ID in request')
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // Create Supabase client (this uses cookies from next/headers)
    const supabase = await createClient()
    
    // Create repository instance with dependency injection
    const repository = new CompanyIntelligenceRepositoryV4(supabase)
    
    // Get session data first
    const session = await repository.getSession(sessionId)
    
    // Calculate metrics from the session data and related tables
    const metrics = await calculateMetrics(supabase, sessionId, session)
    
    permanentLogger.breadcrumb('metrics_api_success', 'Successfully fetched metrics', {
      sessionId,
      pagesProcessed: metrics?.pagesSucceeded || 0
    })
    
    return NextResponse.json(metrics)
    
  } catch (err) {
    const error = convertSupabaseError(err)
    permanentLogger.captureError('METRICS_API', error, { 
      context: 'Failed to fetch execution metrics' 
    })
    
    return NextResponse.json(
      { error: error.message },
      { status: error.code === 'SUPABASE_NOT_FOUND' ? 404 : 500 }
    )
  } finally {
    timer.stop()
  }
}

/**
 * Calculate execution metrics from session and related data
 */
async function calculateMetrics(supabase: any, sessionId: string, session: any) {
  // Get page statistics if using scraped_pages table
  const { data: pageStats } = await supabase
    .from('scraped_pages')
    .select('status')
    .eq('session_id', sessionId)

  const pagesSucceeded = pageStats?.filter((p: any) => p.status === 'completed').length || 0
  const pagesFailed = pageStats?.filter((p: any) => p.status === 'failed').length || 0

  // Get data points count
  const { count: dataPointsCount } = await supabase
    .from('scraped_data')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId)

  // Get links discovered
  const { count: linksCount } = await supabase
    .from('scraping_queue')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId)

  // Calculate duration
  const startTime = session.created_at ? new Date(session.created_at).getTime() : Date.now()
  const endTime = session.updated_at ? new Date(session.updated_at).getTime() : Date.now()
  const durationMs = endTime - startTime

  // If extraction_stats exist in session, merge them
  const extractionStats = session.extraction_stats || {}

  return {
    pagesSucceeded: extractionStats.pagesSucceeded || pagesSucceeded,
    pagesFailed: extractionStats.pagesFailed || pagesFailed,
    dataPointsExtracted: extractionStats.dataPointsExtracted || dataPointsCount || 0,
    linksDiscovered: extractionStats.linksDiscovered || linksCount || 0,
    durationMs,
    averagePageTime: pagesSucceeded > 0 ? Math.round(durationMs / pagesSucceeded) : 0,
    lastUpdated: session.updated_at || new Date().toISOString(),
    // Include session status and phase for the monitor
    status: session.status,
    phase: session.phase
  }
}
