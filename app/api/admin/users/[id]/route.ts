/**
 * Admin User Management API - Individual user operations
 *
 * Technical PM Note: Admin-only endpoint for managing individual users
 * Supports viewing details, updating settings, and managing access
 *
 * ✅ CLAUDE.md Compliance:
 * - Repository pattern for data access
 * - Proper error handling with captureError
 * - Admin authentication check
 * - Audit logging for all changes
 */

import { NextRequest, NextResponse } from 'next/server'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { checkAdminAuth } from '@/lib/admin/auth'
import { ProfilesRepository } from '@/lib/repositories/profiles-repository'
import { ActivityLogRepository } from '@/lib/repositories/activity-log-repository'
import { createClient } from '@/lib/supabase/server'
import { convertSupabaseError } from '@/lib/utils/supabase-error-helper'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * GET /api/admin/users/[id] - Get detailed user information
 *
 * Returns comprehensive user data including:
 * - Profile information
 * - Usage statistics (scrapes, documents)
 * - Recent activity
 * - Auth provider details
 * - Session status
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const timer = permanentLogger.timing('api.admin.users.get')
  const { id: userId } = await params

  permanentLogger.breadcrumb('api_entry', 'Admin user details request received', {
    endpoint: `/api/admin/users/${userId}`,
    method: 'GET'
  })

  try {
    // Check admin authentication
    const adminUser = await checkAdminAuth()

    permanentLogger.info('API_ADMIN_USER', 'Admin authentication verified', {
      targetUserId: userId,
      adminUserId: adminUser.user.id
    })

    // Get repository instance
    const repository = ProfilesRepository.getInstance()
    const activityRepo = ActivityLogRepository.getInstance()

    // Log that admin is viewing user details
    try {
      await activityRepo.logActivity({
        user_id: adminUser.user.id,
        action: 'admin.user.view_details',
        entity_type: 'user',
        entity_id: userId,
        details: {
          viewed_user_id: userId,
          timestamp: new Date().toISOString()
        },
        project_id: null
      })
      permanentLogger.breadcrumb('activity_log', 'Logged user detail view', {
        adminUserId: adminUser.user.id,
        targetUserId: userId
      })
    } catch (logError) {
      // Don't fail the request if logging fails, but log the error
      permanentLogger.captureError('ACTIVITY_LOG', logError as Error, {
        context: 'Failed to log user detail view'
      })
    }

    // Fetch comprehensive user data
    const userWithStats = await repository.getUserWithStats(userId)

    if (!userWithStats) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Try to get auth provider information (optional enhancement)
    // Note: This requires service role key which might not be available
    let authMetadata = null
    try {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (serviceRoleKey) {
        const supabase = await createClient()
        const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId)

        if (!authError && authUser) {
          authMetadata = {
            auth_provider: authUser.user?.app_metadata?.provider ||
                          authUser.user?.app_metadata?.providers?.[0] ||
                          'email',
            last_sign_in_at: authUser.user?.last_sign_in_at || null,
            email_confirmed: authUser.user?.email_confirmed_at ? true : false,
            phone_confirmed: authUser.user?.phone_confirmed_at ? true : false,
            created_at_auth: authUser.user?.created_at || userWithStats.created_at
          }
        }
      }
    } catch (authError) {
      // Auth metadata is optional - log but don't fail
      permanentLogger.info('API_ADMIN_USER', 'Could not fetch auth metadata (service role not available)', {
        userId
      })
    }

    // CLAUDE.md: NO FALLBACKS - return actual values, let NULLs be NULL
    const enhancedUser = {
      ...userWithStats,
      auth_provider: authMetadata?.auth_provider ?? userWithStats.auth_provider, // No 'email' fallback
      last_sign_in_at: authMetadata?.last_sign_in_at ?? userWithStats.last_sign_in_at, // Let it be NULL
      email_confirmed: authMetadata?.email_confirmed ?? null, // Don't assume true
      phone_confirmed: authMetadata?.phone_confirmed ?? null, // Don't assume false
      created_at_auth: authMetadata?.created_at_auth ?? userWithStats.created_at
    }

    const duration = timer.stop()

    permanentLogger.info('API_ADMIN_USER', 'User details fetched successfully', {
      userId,
      duration
    })

    return NextResponse.json(enhancedUser)

  } catch (error) {
    permanentLogger.captureError('API_ADMIN_USER', error as Error, {
      endpoint: `/api/admin/users/${userId}`,
      method: 'GET'
    })

    timer.stop()

    if ((error as any)?.message?.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      )
    }

    if ((error as any)?.message?.includes('not found')) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch user details' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/users/[id] - Update user settings
 *
 * Request body:
 * - is_admin: boolean (optional) - Grant/revoke admin access
 * - is_active: boolean (optional) - Enable/disable account
 * - subscription_tier: string (optional) - Update subscription level
 * - full_name: string (optional) - Update display name
 * - role: string (optional) - Update user role
 *
 * All changes are logged to activity_log for audit trail
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  const timer = permanentLogger.timing('api.admin.users.update')
  const { id: userId } = await params

  permanentLogger.breadcrumb('api_entry', 'Admin user update request received', {
    endpoint: `/api/admin/users/${userId}`,
    method: 'PATCH'
  })

  try {
    // Check admin authentication
    const adminUser = await checkAdminAuth()

    permanentLogger.info('API_ADMIN_USER', 'Admin authentication verified', {
      adminUserId: adminUser.user.id,
      targetUserId: userId
    })

    // Parse request body
    const body = await request.json()
    const {
      is_admin,
      is_active,
      subscription_tier,
      full_name,
      role
    } = body

    permanentLogger.breadcrumb('parse_body', 'Update request parsed', {
      hasAdminUpdate: is_admin !== undefined,
      hasActiveUpdate: is_active !== undefined,
      hasTierUpdate: subscription_tier !== undefined,
      hasNameUpdate: full_name !== undefined,
      hasRoleUpdate: role !== undefined
    })

    // Prevent self-modification of critical settings
    if (userId === adminUser.user.id && (is_admin === false || is_active === false)) {
      permanentLogger.warn('API_ADMIN_USER', 'Attempted self-demotion blocked', {
        adminUserId: adminUser.user.id,
        attemptedChanges: { is_admin, is_active }
      })

      return NextResponse.json(
        { error: 'Cannot modify your own admin status or disable your own account' },
        { status: 400 }
      )
    }

    // Get repository instance
    const repository = ProfilesRepository.getInstance()
    const supabase = await createClient()

    // Store original state for audit log
    const originalProfile = await repository.getProfileById(userId)

    let updatedProfile = originalProfile

    // Apply updates based on what's provided
    if (is_admin !== undefined) {
      updatedProfile = await repository.updateUserAdmin(userId, is_admin)

      // Log admin status change
      await logAdminAction(supabase, adminUser.user.id, 'user.admin_status', {
        target_user_id: userId,
        old_value: originalProfile.is_admin,
        new_value: is_admin
      })
    }

    if (is_active !== undefined) {
      updatedProfile = is_active
        ? await repository.enableUser(userId)
        : await repository.disableUser(userId)

      // Log account status change
      await logAdminAction(supabase, adminUser.user.id, 'user.account_status', {
        target_user_id: userId,
        old_value: originalProfile.is_active !== false,
        new_value: is_active
      })
    }

    if (subscription_tier) {
      updatedProfile = await repository.updateUserSubscription(userId, subscription_tier)

      // Log subscription change
      await logAdminAction(supabase, adminUser.user.id, 'user.subscription_tier', {
        target_user_id: userId,
        old_value: originalProfile.subscription_tier,
        new_value: subscription_tier
      })
    }

    if (full_name !== undefined || role !== undefined) {
      const updates: any = {}
      if (full_name !== undefined) updates.full_name = full_name
      if (role !== undefined) updates.role = role

      updatedProfile = await repository.updateUserSubscription(userId,
        updatedProfile.subscription_tier || 'free',
        updates
      )

      // Log profile updates
      await logAdminAction(supabase, adminUser.user.id, 'user.profile_update', {
        target_user_id: userId,
        updates
      })
    }

    const duration = timer.stop()

    permanentLogger.info('API_ADMIN_USER', 'User updated successfully', {
      userId,
      updates: body,
      duration
    })

    return NextResponse.json(updatedProfile)

  } catch (error) {
    permanentLogger.captureError('API_ADMIN_USER', error as Error, {
      endpoint: `/api/admin/users/${userId}`,
      method: 'PATCH'
    })

    timer.stop()

    if ((error as any)?.message?.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      )
    }

    if ((error as any)?.message?.includes('not found')) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/users/[id] - Soft delete user account
 *
 * This doesn't actually delete the user, but disables the account
 * and marks it for deletion. Actual deletion requires manual DB operation
 * for data integrity and compliance reasons.
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  const timer = permanentLogger.timing('api.admin.users.delete')
  const { id: userId } = await params

  permanentLogger.breadcrumb('api_entry', 'Admin user delete request received', {
    endpoint: `/api/admin/users/${userId}`,
    method: 'DELETE'
  })

  try {
    // Check admin authentication
    const adminUser = await checkAdminAuth()

    permanentLogger.info('API_ADMIN_USER', 'Admin authentication verified', {
      adminUserId: adminUser.user.id,
      targetUserId: userId
    })

    // Prevent self-deletion
    if (userId === adminUser.user.id) {
      permanentLogger.warn('API_ADMIN_USER', 'Attempted self-deletion blocked', {
        adminUserId: adminUser.user.id
      })

      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    // Get repository instance
    const repository = ProfilesRepository.getInstance()
    const supabase = await createClient()

    // Soft delete by disabling the account
    const updatedProfile = await repository.disableUser(userId)

    // Mark for deletion in profile
    await repository.updateUserSubscription(userId, 'free', {
      role: 'deleted',
      updated_at: new Date().toISOString()
    })

    // Log deletion
    await logAdminAction(supabase, adminUser.user.id, 'user.soft_delete', {
      target_user_id: userId,
      timestamp: new Date().toISOString()
    })

    const duration = timer.stop()

    permanentLogger.info('API_ADMIN_USER', 'User soft deleted successfully', {
      userId,
      duration
    })

    return NextResponse.json({
      message: 'User account disabled and marked for deletion',
      user: updatedProfile
    })

  } catch (error) {
    permanentLogger.captureError('API_ADMIN_USER', error as Error, {
      endpoint: `/api/admin/users/${userId}`,
      method: 'DELETE'
    })

    timer.stop()

    if ((error as any)?.message?.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      )
    }

    if ((error as any)?.message?.includes('not found')) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}

/**
 * Helper function to log admin actions for audit trail
 * Uses ActivityLogRepository for proper error handling
 */
async function logAdminAction(
  supabase: any,
  adminUserId: string,
  action: string,
  details: any
) {
  try {
    const activityRepo = ActivityLogRepository.getInstance()

    // Log the activity with proper repository pattern
    await activityRepo.logActivity({
      user_id: adminUserId,
      action: `admin.${action}`,
      entity_type: 'user',
      entity_id: details.target_user_id || null,
      details,
      project_id: null // Admin actions aren't project-specific
    })

    // Log for debugging
    permanentLogger.info('ADMIN_AUDIT', 'Admin action logged successfully', {
      adminUserId,
      action,
      targetUserId: details.target_user_id
    })
  } catch (error) {
    // Don't just log - throw the error so we know logging failed
    permanentLogger.captureError('ADMIN_AUDIT', error as Error, {
      action,
      details,
      adminUserId
    })
    // Throw to ensure we know activity logging is broken
    throw new Error(`Failed to log admin action: ${error}`)
  }
}