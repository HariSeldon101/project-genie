import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { ProfilesRepository } from '@/lib/repositories/profiles-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'

export async function GET(request: Request) {
  const timer = permanentLogger.timing('api.fix-profile.get')

  try {
    // Create Supabase client using our server helper
    const supabase = await createServerClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Use repository instead of direct database access
    const profilesRepo = ProfilesRepository.getInstance()

    permanentLogger.breadcrumb('api', 'Checking profile existence', {
      userId: user.id,
      timestamp: Date.now()
    })

    // Check if profile exists using repository
    const existingProfile = await profilesRepo.getProfile(user.id)

    // If profile exists, return it
    if (existingProfile) {
      timer.stop()
      return NextResponse.json({
        message: 'Profile already exists',
        profile: existingProfile
      })
    }

    // Try to create profile
    const fullName = user.user_metadata?.full_name ||
                     user.user_metadata?.name ||
                     user.email?.split('@')[0] ||
                     'Unknown User'

    permanentLogger.info('API_FIX_PROFILE', 'Creating missing profile', {
      userId: user.id,
      email: user.email
    })

    const newProfile = await profilesRepo.upsertProfile({
      id: user.id,
      email: user.email!,
      full_name: fullName,
      avatar_url: user.user_metadata?.avatar_url || null,
    })

    timer.stop()
    return NextResponse.json({
      message: 'Profile created successfully',
      profile: newProfile
    })

  } catch (error) {
    timer.stop()
    permanentLogger.captureError('API_FIX_PROFILE', error as Error, {
      endpoint: 'GET /api/fix-profile'
    })

    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export const runtime = 'edge'