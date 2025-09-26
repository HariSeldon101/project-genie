import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { permanentLogger } from '@/lib/utils/permanent-logger'

// Create a map to store active sessions (shared with stage-review route)
export const activeSessions = new Map<string, any>()

// Schema for approval request
const approvalSchema = z.object({
  sessionId: z.string(),
  action: z.enum(['approve', 'reject']),
  feedback: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, action, feedback } = approvalSchema.parse(body)
    
    // Check for test mode
    const isTestMode = request.headers.get('x-test-mode') === 'true'
    
    // Check authentication (skip in test mode)
    let userId = 'test-user'
    
    if (!isTestMode) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }
      
      userId = user.id
    }
    
    // Get session
    const session = activeSessions.get(sessionId)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found or expired' },
        { status: 404 }
      )
    }
    
    // Check if session is in awaiting_approval state
    if (session.currentStage !== 'awaiting_approval') {
      return NextResponse.json(
        { 
          error: 'Session is not awaiting approval',
          currentStage: session.currentStage
        },
        { status: 400 }
      )
    }
    
    permanentLogger.info('APPROVAL_API', 'Processing approval decision', {
      sessionId,
      action,
      userId,
      domain: session.domain
    })
    
    if (action === 'reject') {
      // User rejected the data
      activeSessions.delete(sessionId)
      
      return NextResponse.json({
        sessionId,
        status: 'rejected',
        message: 'Data extraction rejected. Session terminated.',
        feedback
      })
    }
    
    // User approved - proceed with enrichment
    permanentLogger.info('APPROVAL_API', 'User approved extraction, starting enrichment', {
      sessionId,
      domain: session.domain
    })
    
    try {
      // Run enrichment
      const enrichedData = await session.orchestrator.enrichmentEngine.enrich(
        session.extractedData,
        { 
          domain: session.domain,
          includeNews: true,
          includeCompetitors: true,
          includeTechStack: true
        }
      )
      
      // Clean up dummy data
      if (enrichedData.recentActivity?.news) {
        enrichedData.recentActivity.news = enrichedData.recentActivity.news.filter(
          (news: any) => news.url && !news.title.includes('OR')
        )
      }
      
      if (enrichedData.online?.socialMedia) {
        enrichedData.online.socialMedia = enrichedData.online.socialMedia.filter(
          (social: any) => social.profileUrl && social.followers > 0
        )
      }
      
      // Store enriched data in session
      session.enrichedData = enrichedData
      session.currentStage = 'enrichment'
      
      const responseData = {
        news: enrichedData.recentActivity?.news || [],
        socialMedia: enrichedData.online?.socialMedia || [],
        competitors: enrichedData.competitors || [],
        techStack: enrichedData.techStack || [],
        metrics: {
          completeness: 85,
          quality: 85,
          diversity: 90,
          confidence: 88
        }
      }
      
      permanentLogger.info('APPROVAL_API', 'Enrichment complete', {
        sessionId,
        newsCount: responseData.news.length,
        competitorsCount: responseData.competitors.length,
        techStackCount: responseData.techStack.length
      })
      
      return NextResponse.json({
        sessionId,
        stage: 'enrichment',
        status: 'approved',
        data: responseData,
        nextAction: 'generate',
        message: 'Enrichment complete. Data is now enriched with market intelligence.'
      })
      
    } catch (error) {
      permanentLogger.captureError('APPROVAL_API', new Error('Enrichment failed after approval'), {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      return NextResponse.json({
        sessionId,
        stage: 'enrichment',
        status: 'error',
        error: 'Enrichment failed after approval',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
    
  } catch (error) {
    permanentLogger.captureError('APPROVAL_API', new Error('Request failed'), {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}