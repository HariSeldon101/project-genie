/**
 * Current Profile API - Access current user's profile
 *
 * Technical PM Note: Returns the profile for the authenticated user.
 * No user ID needed - it's determined from the auth session.
 *
 * Endpoints:
 * GET /api/profiles/current - Get current user's profile
 * PUT /api/profiles/current - Update current user's profile
 */

import { NextRequest, NextResponse } from 'next/server'
import { ProfilesRepository } from '@/lib/repositories/profiles-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'

const profilesRepo = ProfilesRepository.getInstance()

export async function GET(request: NextRequest) {
  const timer = permanentLogger.timing('api.profile.current.get')

  try {
    permanentLogger.breadcrumb('api', 'GET /api/profiles/current request', {
      timestamp: Date.now()
    })

    // Get current user's profile through repository
    const profile = await profilesRepo.getCurrentProfile()

    const duration = timer.stop()
    permanentLogger.breadcrumb('api', 'Profile fetched successfully', {
      userId: profile.id,
      duration
    })

    return NextResponse.json(profile)
  } catch (error) {
    timer.stop()
    permanentLogger.captureError('API_PROFILE', error as Error, {
      method: 'GET',
      endpoint: 'current'
    })

    if (error instanceof Error) {
      if (error.message.includes('not authenticated')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      if (error.message.includes('not found')) {
        // Profile doesn't exist yet - return minimal data
        // This isn't fallback data - it's a valid state for new users
        return NextResponse.json(
          {
            error: 'Profile not found',
            message: 'Please complete your profile setup'
          },
          { status: 404 }
        )
      }
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch profile',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  const timer = permanentLogger.timing('api.profile.current.put')

  try {
    permanentLogger.breadcrumb('api', 'PUT /api/profiles/current request', {
      timestamp: Date.now()
    })

    const body = await request.json()

    // Validate no protected fields are being updated
    if ('id' in body || 'created_at' in body) {
      return NextResponse.json(
        { error: 'Cannot update protected fields: id, created_at' },
        { status: 400 }
      )
    }

    // Update profile through repository
    const profile = await profilesRepo.updateProfile(body)

    const duration = timer.stop()
    permanentLogger.breadcrumb('api', 'Profile updated successfully', {
      userId: profile.id,
      duration
    })

    return NextResponse.json(profile)
  } catch (error) {
    timer.stop()
    permanentLogger.captureError('API_PROFILE', error as Error, {
      method: 'PUT',
      endpoint: 'current'
    })

    if (error instanceof Error) {
      if (error.message.includes('not authenticated')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    return NextResponse.json(
      {
        error: 'Failed to update profile',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}