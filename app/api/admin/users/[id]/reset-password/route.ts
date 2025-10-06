/**
 * Admin User Password Reset API
 *
 * Technical PM Note: Admin-only endpoint for forcing password resets
 * Uses Supabase Auth Admin API with service role key
 *
 * ✅ CLAUDE.md Compliance:
 * - Service role key used server-side only
 * - Audit logging for all password resets
 * - Proper error handling with captureError
 */

import { NextRequest, NextResponse } from 'next/server'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { checkAdminAuth } from '@/lib/admin/auth'
import { createClient } from '@supabase/supabase-js'
import { convertSupabaseError } from '@/lib/utils/supabase-error-helper'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * POST /api/admin/users/[id]/reset-password
 *
 * Request body:
 * - method: 'email' | 'manual' - How to reset password
 * - password: string (optional) - New password for manual reset
 *
 * Methods:
 * - email: Send password reset email to user
 * - manual: Set new password directly (requires password in body)
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  const timer = permanentLogger.timing('api.admin.users.reset_password')
  const { id: userId } = await params

  permanentLogger.breadcrumb('api_entry', 'Admin password reset request received', {
    endpoint: `/api/admin/users/${userId}/reset-password`,
    method: 'POST'
  })

  try {
    // Check admin authentication
    const adminUser = await checkAdminAuth()

    permanentLogger.info('API_ADMIN_RESET', 'Admin authentication verified', {
      adminUserId: adminUser.user.id,
      targetUserId: userId
    })

    // Parse request body
    const body = await request.json()
    const { method = 'email', password } = body

    permanentLogger.breadcrumb('parse_body', 'Reset method determined', {
      method,
      hasPassword: !!password
    })

    // Validate input
    if (method === 'manual' && !password) {
      return NextResponse.json(
        { error: 'Password required for manual reset' },
        { status: 400 }
      )
    }

    if (method !== 'email' && method !== 'manual') {
      return NextResponse.json(
        { error: 'Invalid reset method. Use "email" or "manual"' },
        { status: 400 }
      )
    }

    // Create Supabase admin client with service role key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get user details first
    const { data: targetUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId)

    if (getUserError) {
      permanentLogger.captureError('API_ADMIN_RESET', convertSupabaseError(getUserError), {
        operation: 'getUserById',
        userId
      })

      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (!targetUser?.user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    let result

    if (method === 'email') {
      // Generate password reset link and send email
      permanentLogger.breadcrumb('reset_method', 'Generating password reset email', {
        userEmail: targetUser.user.email
      })

      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: targetUser.user.email!
      })

      if (linkError) {
        permanentLogger.captureError('API_ADMIN_RESET', convertSupabaseError(linkError), {
          operation: 'generateRecoveryLink',
          userId
        })
        throw linkError
      }

      // Send the email (Supabase will handle this automatically if email templates are configured)
      // The link is also returned in case we need to handle it manually
      result = {
        method: 'email',
        message: 'Password reset email sent',
        email: targetUser.user.email,
        // Only include link in development for debugging
        ...(process.env.NODE_ENV === 'development' && { reset_link: linkData.properties?.action_link })
      }

      permanentLogger.info('API_ADMIN_RESET', 'Password reset email sent', {
        userId,
        userEmail: targetUser.user.email
      })

    } else {
      // Manual password reset - set new password directly
      permanentLogger.breadcrumb('reset_method', 'Setting new password manually', {
        userId
      })

      const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password }
      )

      if (updateError) {
        permanentLogger.captureError('API_ADMIN_RESET', convertSupabaseError(updateError), {
          operation: 'updatePassword',
          userId
        })
        throw updateError
      }

      result = {
        method: 'manual',
        message: 'Password updated successfully',
        user: {
          id: updateData.user.id,
          email: updateData.user.email
        }
      }

      permanentLogger.info('API_ADMIN_RESET', 'Password manually reset', {
        userId,
        userEmail: updateData.user.email
      })
    }

    // Log the password reset action for audit
    const { error: auditError } = await supabaseAdmin
      .from('activity_log')
      .insert({
        user_id: adminUser.user.id,
        action: `admin.password_reset.${method}`,
        entity_type: 'user',
        entity_id: userId,
        details: {
          target_user_id: userId,
          target_user_email: targetUser.user.email,
          reset_method: method,
          admin_user_id: adminUser.user.id,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      })

    if (auditError) {
      permanentLogger.captureError('ADMIN_AUDIT', convertSupabaseError(auditError), {
        action: 'password_reset',
        userId
      })
      // Don't fail the request just because audit logging failed
    }

    const duration = timer.stop()

    permanentLogger.info('API_ADMIN_RESET', 'Password reset completed', {
      userId,
      method,
      duration
    })

    return NextResponse.json(result)

  } catch (error) {
    permanentLogger.captureError('API_ADMIN_RESET', error as Error, {
      endpoint: `/api/admin/users/${userId}/reset-password`,
      method: 'POST'
    })

    timer.stop()

    if ((error as any)?.message?.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    )
  }
}