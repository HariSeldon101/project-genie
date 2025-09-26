import { NextRequest, NextResponse } from 'next/server'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { CompanyIntelligenceRepository } from '@/lib/repositories/company-intelligence-repository'

/**
 * GET /api/company-intelligence/sessions
 * List all sessions for the current user
 * Uses repository pattern for centralized data access
 */
export async function GET(request: NextRequest) {
  return await permanentLogger.withRequest('list_sessions', async (requestId) => {
    try {
      const repository = CompanyIntelligenceRepository.getInstance()

      permanentLogger.info('SESSIONS_API', 'Listing user sessions')

      // Get query parameters for filtering
      const { searchParams } = new URL(request.url)
      const domain = searchParams.get('domain')
      const status = searchParams.get('status')
      const limit = parseInt(searchParams.get('limit') || '50')
      const offset = parseInt(searchParams.get('offset') || '0')

      // Get all user sessions (repository handles auth check)
      const sessions = await repository.listUserSessions()

      // Apply client-side filtering (could be enhanced in repository)
      let filtered = sessions

      if (domain) {
        filtered = filtered.filter(s =>
          s.domain.toLowerCase().includes(domain.toLowerCase())
        )
      }

      if (status) {
        filtered = filtered.filter(s => s.status === status)
      }

      // Apply pagination
      const paginated = filtered.slice(offset, offset + limit)

      permanentLogger.info('SESSIONS_API', 'Sessions retrieved', {
        total: sessions.length,
        filtered: filtered.length,
        returned: paginated.length
      })

      return NextResponse.json({
        sessions: paginated,
        total: filtered.length
      })
    } catch (error) {
      // Check if it's an auth error
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        permanentLogger.warn('SESSIONS_API', 'Unauthorized access attempt', {
          error: error.message
        })
        return NextResponse.json({
          error: 'Unauthorized - Please sign in',
          details: error.message
        }, { status: 401 })
      }

      permanentLogger.captureError('SESSIONS_API', error as Error, {
        endpoint: 'GET /api/company-intelligence/sessions'
      })

      return NextResponse.json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }
  })
}

/**
 * POST /api/company-intelligence/sessions
 * Create a new company intelligence session
 * Uses repository pattern for centralized data access
 */
export async function POST(request: NextRequest) {
  return await permanentLogger.withRequest('create_session', async (requestId) => {
    try {
      const repository = CompanyIntelligenceRepository.getInstance()

      // Get the current user first
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        permanentLogger.warn('SESSIONS_API', 'Authentication required for session creation')
        return NextResponse.json(
          { error: 'Authentication required', message: 'Please sign in to create sessions' },
          { status: 401 }
        )
      }

      // Parse request body
      const body = await request.json()
      const { company_name, domain } = body

      permanentLogger.info('SESSIONS_API', 'Creating new session', {
        company_name,
        domain,
        userId: user.id
      })

      // Validate required fields
      if (!company_name || !domain) {
        permanentLogger.warn('SESSIONS_API', 'Missing required fields', {
          hasCompanyName: !!company_name,
          hasDomain: !!domain
        })
        return NextResponse.json(
          { error: 'Company name and domain are required' },
          { status: 400 }
        )
      }

      // Create session using the ONLY correct method
      // This method handles all edge cases including duplicates and reactivation
      const session = await repository.getOrCreateUserSession(user.id, domain)

      permanentLogger.info('SESSIONS_API', 'Session created successfully', {
        sessionId: session.id,
        domain: session.domain,
        isNew: session.status === 'active' && !session.updated_at
      })

      return NextResponse.json({
        message: 'Session created successfully',
        session
      }, { status: 201 })
    } catch (error) {
      // Check if it's an auth error
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        permanentLogger.warn('SESSIONS_API', 'Unauthorized session creation attempt', {
          error: error.message
        })
        return NextResponse.json({
          error: 'Unauthorized - Please sign in',
          details: error.message
        }, { status: 401 })
      }

      permanentLogger.captureError('SESSIONS_API', error as Error, {
        endpoint: 'POST /api/company-intelligence/sessions'
      })

      return NextResponse.json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }
  })
}