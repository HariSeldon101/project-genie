/**
 * Auth User API - Get current authenticated user
 *
 * Technical PM: This endpoint provides auth status
 * without exposing any database operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { permanentLogger } from '@/lib/utils/permanent-logger'

export async function GET(request: NextRequest) {
  const timer = permanentLogger.timing('api.auth.user.get')

  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      timer.stop()
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    permanentLogger.breadcrumb('api', 'User auth check', {
      userId: user.id,
      timestamp: Date.now()
    })

    timer.stop()
    return NextResponse.json({
      id: user.id,
      email: user.email,
      app_metadata: user.app_metadata,
      user_metadata: user.user_metadata
    })
  } catch (error) {
    timer.stop()
    permanentLogger.captureError('API_AUTH', error as Error, {
      endpoint: 'GET /api/auth/user'
    })

    return NextResponse.json(
      { error: 'Failed to get user' },
      { status: 500 }
    )
  }
}