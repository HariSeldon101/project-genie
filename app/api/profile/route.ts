/**
 * Profile API - User profile management endpoint
 *
 * Technical PM: Provides profile operations through repositories
 * UI components MUST use this endpoint, not direct database access
 *
 * POST: Verify profile exists, create if missing (trigger failure fallback)
 * GET: Fetch user profile
 * PUT: Update user profile
 * DELETE: Delete user profile
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ProfilesRepository } from '@/lib/repositories/profiles-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'

export async function GET(request: NextRequest) {
  const timer = permanentLogger.timing('api.profile.get')

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      timer.stop()
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    permanentLogger.breadcrumb('api', 'Fetching user profile', {
      userId: user.id,
      timestamp: Date.now()
    })

    const profilesRepo = ProfilesRepository.getInstance()
    const profile = await profilesRepo.getProfile(user.id)

    // If no profile exists, return user auth metadata
    const profileData = profile || {
      id: user.id,
      email: user.email || '',
      full_name: user.user_metadata?.full_name || '',
      avatar_url: user.user_metadata?.avatar_url || null,
      phone: null,
      location: null,
      created_at: user.created_at,
      updated_at: null
    }

    permanentLogger.info('API_PROFILE', 'Profile fetched', {
      userId: user.id,
      hasProfile: !!profile
    })

    timer.stop()
    return NextResponse.json(profileData)

  } catch (error) {
    timer.stop()
    permanentLogger.captureError('API_PROFILE', error as Error, {
      endpoint: 'GET /api/profile'
    })

    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  const timer = permanentLogger.timing('api.profile.put')

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      timer.stop()
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { full_name, avatar_url, phone, location } = body

    permanentLogger.breadcrumb('api', 'Updating user profile', {
      userId: user.id,
      hasAvatar: !!avatar_url,
      timestamp: Date.now()
    })

    // Update auth metadata first
    if (full_name !== undefined || avatar_url !== undefined) {
      const updateData: any = {}
      if (full_name !== undefined) updateData.full_name = full_name
      if (avatar_url !== undefined) updateData.avatar_url = avatar_url

      const { error: authError } = await supabase.auth.updateUser({
        data: updateData
      })

      if (authError) {
        permanentLogger.captureError('API_PROFILE', authError as Error, {
          operation: 'updateAuthMetadata',
          userId: user.id
        })
        throw authError
      }
    }

    // Upsert to profiles table through repository
    const profilesRepo = ProfilesRepository.getInstance()
    const updatedProfile = await profilesRepo.upsertProfile({
      id: user.id,
      email: user.email || body.email,
      full_name: full_name || user.user_metadata?.full_name || '',
      avatar_url: avatar_url || user.user_metadata?.avatar_url || null,
      phone: phone || null,
      location: location || null
    })

    permanentLogger.info('API_PROFILE', 'Profile updated', {
      userId: user.id,
      hasAvatar: !!avatar_url
    })

    timer.stop()
    return NextResponse.json(updatedProfile)

  } catch (error) {
    timer.stop()
    permanentLogger.captureError('API_PROFILE', error as Error, {
      endpoint: 'PUT /api/profile'
    })

    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const timer = permanentLogger.timing('api.profile.post')

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      timer.stop()
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    permanentLogger.breadcrumb('api', 'Verifying/creating user profile', {
      userId: user.id,
      email: user.email,
      timestamp: Date.now()
    })

    const profilesRepo = ProfilesRepository.getInstance()

    // First check if profile exists
    let profile = await profilesRepo.getProfile(user.id)

    if (!profile) {
      // Profile doesn't exist - trigger must have failed!
      // This is a critical error that should be logged
      const triggerError = new Error(`Database trigger failed to create profile for user ${user.id}`)
      permanentLogger.captureError('API_PROFILE_CRITICAL', triggerError, {
        userId: user.id,
        email: user.email,
        context: 'Profile should have been created by on_auth_user_created trigger',
        action: 'Creating profile manually as fallback'
      })

      // Create the profile as a fallback
      profile = await profilesRepo.upsertProfile({
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '',
        avatar_url: user.user_metadata?.avatar_url || null
      })

      permanentLogger.info('API_PROFILE', 'Profile created manually after trigger failure', {
        userId: user.id,
        email: user.email
      })
    } else {
      permanentLogger.info('API_PROFILE', 'Profile verified - exists as expected', {
        userId: user.id,
        hasProfile: true
      })
    }

    timer.stop()
    return NextResponse.json(profile)

  } catch (error) {
    timer.stop()
    permanentLogger.captureError('API_PROFILE', error as Error, {
      endpoint: 'POST /api/profile'
    })

    return NextResponse.json(
      { error: 'Failed to verify/create profile' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const timer = permanentLogger.timing('api.profile.delete')

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      timer.stop()
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    permanentLogger.breadcrumb('api', 'Deleting user profile', {
      userId: user.id,
      timestamp: Date.now()
    })

    const profilesRepo = ProfilesRepository.getInstance()
    await profilesRepo.deleteProfile(user.id)

    permanentLogger.info('API_PROFILE', 'Profile deleted', {
      userId: user.id
    })

    timer.stop()
    return NextResponse.json({ success: true })

  } catch (error) {
    timer.stop()
    permanentLogger.captureError('API_PROFILE', error as Error, {
      endpoint: 'DELETE /api/profile'
    })

    return NextResponse.json(
      { error: 'Failed to delete profile' },
      { status: 500 }
    )
  }
}