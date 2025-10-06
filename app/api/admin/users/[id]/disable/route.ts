/**
 * Admin User Enable/Disable API
 *
 * Technical PM Note: Admin-only endpoint for toggling user account status
 * Soft disable/enable preserves data while blocking access
 *
 * ✅ CLAUDE.md Compliance:
 * - Repository pattern for data access
 * - Audit logging for all status changes
 * - Proper error handling with captureError
 */

import { NextRequest, NextResponse } from 'next/server'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { checkAdminAuth } from '@/lib/admin/auth'
import { ProfilesRepository } from '@/lib/repositories/profiles-repository'
import { createClient } from '@/lib/supabase/server'
import { convertSupabaseError } from '@/lib/utils/supabase-error-helper'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * POST /api/admin/users/[id]/disable
 *
 * Request body:
 * - action: 'disable' | 'enable' - Action to perform
 *
 * Disabling a user:
 * - Sets is_active to false in profiles table
 * - User cannot log in or access the application
 * - Data is preserved for potential re-enablement
 *
 * Enabling a user:
 * - Sets is_active to true in profiles table
 * - Restores full access to the application
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  const timer = permanentLogger.timing('api.admin.users.disable')
  const { id: userId } = await params

  permanentLogger.breadcrumb('api_entry', 'Admin user status change request received', {
    endpoint: `/api/admin/users/${userId}/disable`,
    method: 'POST'
  })

  try {
    // Check admin authentication
    const adminUser = await checkAdminAuth()

    permanentLogger.info('API_ADMIN_DISABLE', 'Admin authentication verified', {
      adminUserId: adminUser.user.id,
      targetUserId: userId
    })

    // Parse request body
    const body = await request.json()
    const { action = 'disable' } = body

    permanentLogger.breadcrumb('parse_body', 'Action determined', {
      action
    })

    // Validate action
    if (action !== 'disable' && action !== 'enable') {
      return NextResponse.json(
        { error: 'Invalid action. Use "disable" or "enable"' },
        { status: 400 }
      )
    }

    // Prevent self-disable
    if (userId === adminUser.user.id && action === 'disable') {
      permanentLogger.warn('API_ADMIN_DISABLE', 'Attempted self-disable blocked', {
        adminUserId: adminUser.user.id
      })

      return NextResponse.json(
        { error: 'Cannot disable your own account' },
        { status: 400 }
      )
    }

    // Get repository instance
    const repository = ProfilesRepository.getInstance()

    // Get current profile state
    const currentProfile = await repository.getProfileById(userId)
    const wasActive = currentProfile.is_active !== false

    // Perform the action
    let updatedProfile
    if (action === 'disable') {
      updatedProfile = await repository.disableUser(userId)

      permanentLogger.info('API_ADMIN_DISABLE', 'User account disabled', {
        userId,
        wasActive
      })
    } else {
      updatedProfile = await repository.enableUser(userId)

      permanentLogger.info('API_ADMIN_DISABLE', 'User account enabled', {
        userId,
        wasActive
      })
    }

    // Log the action for audit trail
    const supabase = await createClient()
    const { error: auditError } = await supabase
      .from('activity_log')
      .insert({
        user_id: adminUser.user.id,
        action: `admin.user.${action}`,
        entity_type: 'user',
        entity_id: userId,
        details: {
          target_user_id: userId,
          target_user_email: currentProfile.email,
          previous_status: wasActive ? 'active' : 'inactive',
          new_status: action === 'enable' ? 'active' : 'inactive',
          admin_user_id: adminUser.user.id,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      })

    if (auditError) {
      permanentLogger.captureError('ADMIN_AUDIT', convertSupabaseError(auditError), {
        operation: `user.${action}`,
        targetUserId: userId
      })
      // Don't fail the request just because audit logging failed
    }

    const duration = timer.stop()

    permanentLogger.info('API_ADMIN_DISABLE', 'User status change completed', {
      userId,
      action,
      duration
    })

    return NextResponse.json({
      message: action === 'disable'
        ? 'User account disabled successfully'
        : 'User account enabled successfully',
      user: updatedProfile,
      is_active: action === 'enable'
    })

  } catch (error) {
    permanentLogger.captureError('API_ADMIN_DISABLE', error as Error, {
      operation: 'toggleUserStatus',
      targetUserId: userId
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
      { error: 'Failed to change user status' },
      { status: 500 }
    )
  }
}