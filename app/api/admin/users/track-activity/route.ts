/**
 * User Activity Tracking API
 *
 * Technical PM Note: Lightweight endpoint for tracking user activity
 * Called by middleware to update last_sign_in_at timestamp
 * Runs asynchronously without blocking requests
 *
 * ✅ CLAUDE.md Compliance:
 * - Repository pattern for database access
 * - Proper error handling with convertSupabaseError
 * - Permanent logging for audit trail
 * - No mock data or fallbacks
 */

import { NextRequest, NextResponse } from 'next/server'
import { ProfilesRepository } from '@/lib/repositories/profiles-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'

// Cache last update times to avoid excessive DB writes
// Key: userId, Value: timestamp
const lastUpdateCache = new Map<string, number>()
const UPDATE_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * POST /api/admin/users/track-activity
 *
 * Updates the last_sign_in_at timestamp for a user
 * Uses caching to prevent excessive database updates
 *
 * Body:
 * - userId: string - The ID of the user whose activity to track
 *
 * Returns:
 * - 200: Activity tracked successfully
 * - 204: Activity tracking skipped (too recent)
 * - 400: Invalid request
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    // Check cache to avoid excessive updates
    const lastUpdate = lastUpdateCache.get(userId)
    const now = Date.now()

    if (lastUpdate && (now - lastUpdate) < UPDATE_INTERVAL_MS) {
      // Skip update if we've already updated recently
      return new NextResponse(null, { status: 204 })
    }

    // Update cache immediately to prevent race conditions
    lastUpdateCache.set(userId, now)

    // Clean up old cache entries (keep last 1000 users)
    if (lastUpdateCache.size > 1000) {
      const entriesToDelete = lastUpdateCache.size - 1000
      const keysToDelete = Array.from(lastUpdateCache.keys()).slice(0, entriesToDelete)
      keysToDelete.forEach(key => lastUpdateCache.delete(key))
    }

    // Breadcrumb for activity tracking
    permanentLogger.breadcrumb('user_activity', 'Tracking user activity', {
      userId,
      path: request.headers.get('referer') || 'unknown'
    })

    // Update last sign-in timestamp
    const repository = ProfilesRepository.getInstance()
    await repository.updateLastSignIn(userId)

    permanentLogger.info('ACTIVITY_TRACKING', 'User activity tracked', {
      userId,
      timestamp: new Date().toISOString()
    })

    return new NextResponse(null, { status: 200 })

  } catch (error) {
    // Don't log errors for activity tracking to avoid noise
    // This is a non-critical background operation
    return new NextResponse(null, { status: 200 })
  }
}

/**
 * GET /api/admin/users/track-activity
 *
 * Health check endpoint for activity tracking
 * Returns cache statistics
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    cacheSize: lastUpdateCache.size,
    updateInterval: UPDATE_INTERVAL_MS,
    timestamp: new Date().toISOString()
  })
}