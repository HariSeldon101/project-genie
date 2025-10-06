/**
 * Admin User Management API - List all users with statistics
 *
 * Technical PM Note: Admin-only endpoint for user management dashboard
 * Provides comprehensive user data including usage statistics
 *
 * ✅ CLAUDE.md Compliance:
 * - Repository pattern for data access
 * - Proper error handling with captureError
 * - Admin authentication check
 * - No mock data or fallbacks
 */

import { NextRequest, NextResponse } from 'next/server'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { validateAdminAuthForAPI } from '@/lib/admin/auth'
import { ProfilesRepository } from '@/lib/repositories/profiles-repository'
import { ActivityLogRepository } from '@/lib/repositories/activity-log-repository'
import { createClient } from '@/lib/supabase/server'
import { convertSupabaseError } from '@/lib/utils/supabase-error-helper'

/**
 * GET /api/admin/users - List all users with statistics
 *
 * Query params:
 * - search: string (optional) - Search by email or name
 * - tier: string (optional) - Filter by subscription tier
 * - status: string (optional) - Filter by active/inactive
 * - limit: number (optional) - Results per page (default 50)
 * - offset: number (optional) - Pagination offset
 *
 * Returns:
 * - users: Array of user profiles with usage statistics
 * - total: Total user count
 * - auth_providers: Map of auth providers used
 */
export async function GET(request: NextRequest) {
  const timer = permanentLogger.timing('api.admin.users.list')

  permanentLogger.breadcrumb('api_entry', 'Admin users list request received', {
    endpoint: '/api/admin/users',
    method: 'GET'
  })

  try {
    // Check admin authentication - Use API-specific validation that returns JSON
    const authResult = await validateAdminAuthForAPI()

    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: authResult.error || 'Not authenticated' },
        { status: 401 }
      )
    }

    if (!authResult.isAdmin) {
      return NextResponse.json(
        { error: authResult.error || 'Admin access required' },
        { status: 403 }
      )
    }

    const adminUser = authResult.user!

    permanentLogger.info('API_ADMIN_USERS', 'Admin authentication verified', {
      adminUserId: adminUser.id
    })

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const tier = searchParams.get('tier') || ''
    const status = searchParams.get('status') || ''
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Log that admin is viewing the user list
    const activityRepo = ActivityLogRepository.getInstance()
    try {
      await activityRepo.logActivity({
        user_id: adminUser.id,
        action: 'admin.user.view_list',
        entity_type: 'user_list',
        entity_id: null,
        details: {
          search,
          tier,
          status,
          limit,
          offset,
          timestamp: new Date().toISOString()
        },
        project_id: null
      })
      permanentLogger.breadcrumb('activity_log', 'Logged user list view', {
        adminUserId: adminUser.id,
        filters: { search, tier, status }
      })
    } catch (logError) {
      // Don't fail the request if logging fails
      permanentLogger.captureError('ACTIVITY_LOG', logError as Error, {
        context: 'Failed to log user list view'
      })
    }

    permanentLogger.breadcrumb('parse_params', 'Query parameters parsed', {
      search,
      tier,
      status,
      limit,
      offset
    })

    // Get repository instance
    const repository = ProfilesRepository.getInstance()

    // Fetch users based on search criteria - CLAUDE.md: Use proper method with stats
    let users
    if (search) {
      users = await repository.searchUsers(search)
    } else {
      // CLAUDE.md: NO MOCK DATA - use the proper method that includes stats
      users = await repository.getAllUsersWithStats()
    }

    // Apply filters
    if (tier) {
      users = users.filter(u => u.subscription_tier === tier)
    }

    if (status === 'active') {
      users = users.filter(u => u.is_active !== false)
    } else if (status === 'inactive') {
      users = users.filter(u => u.is_active === false)
    }

    // CLAUDE.md: NO MOCK DATA - auth_provider and last_sign_in_at come from database
    // These fields should be NULL if not set, not fallback values

    // Apply pagination
    const total = users.length
    const paginatedUsers = users.slice(offset, offset + limit)

    const duration = timer.stop()

    permanentLogger.info('API_ADMIN_USERS', 'Users list fetched successfully', {
      total,
      returned: paginatedUsers.length,
      duration
    })

    return NextResponse.json({
      users: paginatedUsers, // CLAUDE.md: Return raw data from repository
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    })

  } catch (error) {
    // CLAUDE.md: No console.error - use permanentLogger exclusively
    permanentLogger.captureError('API_ADMIN_USERS', error as Error, {
      endpoint: '/api/admin/users',
      method: 'GET'
    })

    timer.stop()

    // Check if it's an auth error
    if ((error as any)?.message?.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}