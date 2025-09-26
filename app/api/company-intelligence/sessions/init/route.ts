/**
 * Session Initialization Endpoint
 *
 * Creates or retrieves a session for the authenticated user and domain.
 * This endpoint is called when a user enters a domain in Company Intelligence.
 *
 * @module api/company-intelligence/sessions/init
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CompanyIntelligenceRepository } from '@/lib/repositories/company-intelligence-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { z } from 'zod'

// Request validation schema
const InitSessionSchema = z.object({
  domain: z.string().min(1, 'Domain is required').transform(d => d.toLowerCase().trim())
})

/**
 * POST /api/company-intelligence/sessions/init
 *
 * Initialize or retrieve a session for the authenticated user and domain.
 *
 * Request body:
 * - domain: string (required) - The company domain
 *
 * Response:
 * - sessionId: string - The session ID for client reference
 * - domain: string - The normalized domain
 * - isNew: boolean - Whether this is a new session
 * - phase: number - Current phase of the session
 */
export async function POST(request: NextRequest) {
  const routeCategory = 'SESSION_INIT'

  try {
    // Step 1: Authenticate user
    permanentLogger.info(routeCategory, 'Initializing session for user', {
      url: request.url,
      timestamp: new Date().toISOString()
    })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      permanentLogger.warn(routeCategory, 'Authentication required', {
        url: request.url
      })

      return NextResponse.json(
        {
          error: 'Authentication required',
          message: 'Please sign in to use Company Intelligence features'
        },
        { status: 401 }
      )
    }

    // Set user ID for logging
    permanentLogger.setUserId(user.id)
    permanentLogger.breadcrumb('auth', 'User authenticated', {
      userId: user.id,
      email: user.email
    })

    // Step 2: Parse and validate request
    const body = await request.json()
    const parseResult = InitSessionSchema.safeParse(body)

    if (!parseResult.success) {
      permanentLogger.warn(routeCategory, 'Invalid request', {
        errors: parseResult.error.errors
      })

      return NextResponse.json(
        {
          error: 'Invalid request',
          message: parseResult.error.errors[0]?.message || 'Domain is required'
        },
        { status: 400 }
      )
    }

    const { domain } = parseResult.data

    // Step 3: Get or create session
    permanentLogger.info(routeCategory, 'Getting or creating session', {
      domain,
      userId: user.id
    })

    const repository = CompanyIntelligenceRepository.getInstance()
    const session = await repository.getOrCreateUserSession(user.id, domain)

    // Determine if this is a new session
    const isNew = !session.merged_data || Object.keys(session.merged_data).length === 0

    permanentLogger.info(routeCategory, 'Session initialized successfully', {
      sessionId: session.id,
      domain: session.domain,
      isNew,
      phase: session.phase,
      userId: user.id
    })

    // Step 4: Return session info to client
    return NextResponse.json({
      sessionId: session.id,
      domain: session.domain,
      isNew,
      phase: session.phase || 1,
      status: session.status || 'active',
      company_name: session.company_name
    })

  } catch (error) {
    permanentLogger.captureError(routeCategory, error as Error, {
      method: 'POST',
      path: '/api/company-intelligence/sessions/init'
    })

    return NextResponse.json(
      {
        error: 'Failed to initialize session',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}