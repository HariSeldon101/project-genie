/**
 * Profile Avatar API - Handle avatar uploads
 *
 * Technical PM: Storage operations handled directly here
 * Cannot use repository pattern for storage to avoid circular dependencies
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { ProfilesRepository } from '@/lib/repositories/profiles-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'

export async function POST(request: NextRequest) {
  const timer = permanentLogger.timing('api.profile.avatar.post')

  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      timer.stop()
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('avatar') as File

    if (!file) {
      timer.stop()
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      timer.stop()
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      timer.stop()
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })
    }

    permanentLogger.breadcrumb('api', 'Uploading avatar', {
      userId: user.id,
      fileSize: file.size,
      fileType: file.type,
      timestamp: Date.now()
    })

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}-${Date.now()}.${fileExt}`
    const filePath = `avatars/${fileName}`

    // Upload to storage (direct operation - no repository for storage)
    const { error: uploadError, data } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      // If file exists, try with a different name
      if (uploadError.message?.includes('already exists')) {
        const retryPath = `avatars/${user.id}-${Date.now()}-retry.${fileExt}`
        const { error: retryError } = await supabase.storage
          .from('avatars')
          .upload(retryPath, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (retryError) {
          permanentLogger.captureError('API_PROFILE_AVATAR', retryError as Error, {
            operation: 'uploadAvatar',
            userId: user.id
          })
          throw retryError
        }
      } else {
        permanentLogger.captureError('API_PROFILE_AVATAR', uploadError as Error, {
          operation: 'uploadAvatar',
          userId: user.id
        })
        throw uploadError
      }
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(data?.path || filePath)

    // Update profile with new avatar URL using repository
    const profilesRepo = ProfilesRepository.getInstance()
    const updatedProfile = await profilesRepo.updateProfile({
      avatar_url: publicUrl
    })

    // Also update auth metadata
    await supabase.auth.updateUser({
      data: { avatar_url: publicUrl }
    })

    permanentLogger.info('API_PROFILE_AVATAR', 'Avatar uploaded', {
      userId: user.id,
      filePath: data?.path || filePath,
      publicUrl
    })

    timer.stop()
    return NextResponse.json({
      avatar_url: publicUrl,
      profile: updatedProfile
    })
  } catch (error) {
    timer.stop()
    permanentLogger.captureError('API_PROFILE_AVATAR', error as Error, {
      endpoint: 'POST /api/profile/avatar'
    })

    return NextResponse.json(
      { error: 'Failed to upload avatar' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const timer = permanentLogger.timing('api.profile.avatar.delete')

  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      timer.stop()
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    permanentLogger.breadcrumb('api', 'Deleting avatar', {
      userId: user.id,
      timestamp: Date.now()
    })

    // Get current profile to find avatar URL
    const profilesRepo = ProfilesRepository.getInstance()
    const profile = await profilesRepo.getCurrentProfile()

    if (profile.avatar_url) {
      // Extract file path from URL
      const url = new URL(profile.avatar_url)
      const pathParts = url.pathname.split('/')
      const bucketIndex = pathParts.indexOf('avatars')
      if (bucketIndex !== -1) {
        const filePath = pathParts.slice(bucketIndex + 1).join('/')

        // Delete from storage (direct operation)
        const { error: deleteError } = await supabase.storage
          .from('avatars')
          .remove([`avatars/${filePath}`])

        if (deleteError) {
          permanentLogger.captureError('API_PROFILE_AVATAR', deleteError as Error, {
            operation: 'deleteAvatar',
            userId: user.id
          })
          // Continue even if delete fails - we'll still clear the URL
        }
      }
    }

    // Clear avatar URL from profile using repository
    const updatedProfile = await profilesRepo.updateProfile({
      avatar_url: null
    })

    // Also clear from auth metadata
    await supabase.auth.updateUser({
      data: { avatar_url: null }
    })

    permanentLogger.info('API_PROFILE_AVATAR', 'Avatar deleted', {
      userId: user.id
    })

    timer.stop()
    return NextResponse.json({
      success: true,
      profile: updatedProfile
    })
  } catch (error) {
    timer.stop()
    permanentLogger.captureError('API_PROFILE_AVATAR', error as Error, {
      endpoint: 'DELETE /api/profile/avatar'
    })

    return NextResponse.json(
      { error: 'Failed to delete avatar' },
      { status: 500 }
    )
  }
}