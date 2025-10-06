import { NextRequest, NextResponse } from 'next/server'
import { AdminSettingsRepository } from '@/lib/repositories/admin-settings-repository'
import { ProfilesRepository } from '@/lib/repositories/profiles-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'

/**
 * GET /api/settings
 * Get user settings or admin settings based on user role
 */
export async function GET(request: NextRequest) {
  const timer = permanentLogger.timing('api.settings.get')

  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') // Optional category filter

    permanentLogger.breadcrumb('api', 'Fetching settings', { category })

    // Get current user to check permissions
    const profilesRepo = ProfilesRepository.getInstance()
    const profile = await profilesRepo.getCurrentUserProfile()

    if (!profile) {
      timer.stop()
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const settingsRepo = AdminSettingsRepository.getInstance()

    // Get settings based on category or all settings
    const settings = category
      ? await settingsRepo.getSettingsByCategory(category)
      : await settingsRepo.getAllSettings()

    timer.stop()
    permanentLogger.info('API_SETTINGS', 'Settings retrieved', {
      count: settings.length,
      category,
      userId: profile.id
    })

    return NextResponse.json(settings)
  } catch (error) {
    permanentLogger.captureError('API_SETTINGS', error as Error, {
      operation: 'GET'
    })
    timer.stop()
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/settings
 * Update settings (admin only for global settings, user for personal settings)
 */
export async function PUT(request: NextRequest) {
  const timer = permanentLogger.timing('api.settings.put')

  try {
    const body = await request.json()

    // Validate input
    if (!body || typeof body !== 'object') {
      timer.stop()
      return NextResponse.json(
        { error: 'Invalid settings data' },
        { status: 400 }
      )
    }

    // Get current user
    const profilesRepo = ProfilesRepository.getInstance()
    const profile = await profilesRepo.getCurrentUserProfile()

    if (!profile) {
      timer.stop()
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    permanentLogger.breadcrumb('api', 'Updating settings', {
      userId: profile.id,
      settingsCount: Object.keys(body).length
    })

    const settingsRepo = AdminSettingsRepository.getInstance()
    const updatedSettings = []

    // Update each setting
    for (const [key, value] of Object.entries(body)) {
      try {
        const updated = await settingsRepo.upsertSetting({
          key,
          value: typeof value === 'object' ? JSON.stringify(value) : String(value),
          updated_at: new Date().toISOString()
        })
        updatedSettings.push(updated)
      } catch (settingError) {
        permanentLogger.captureError('API_SETTINGS', settingError as Error, {
          operation: 'upsertSetting',
          key
        })
      }
    }

    timer.stop()
    permanentLogger.info('API_SETTINGS', 'Settings updated', {
      count: updatedSettings.length,
      userId: profile.id
    })

    return NextResponse.json(updatedSettings)
  } catch (error) {
    permanentLogger.captureError('API_SETTINGS', error as Error, {
      operation: 'PUT'
    })
    timer.stop()
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/settings
 * Create new setting
 */
export async function POST(request: NextRequest) {
  const timer = permanentLogger.timing('api.settings.post')

  try {
    const body = await request.json()
    const { key, value } = body

    if (!key || value === undefined) {
      timer.stop()
      return NextResponse.json(
        { error: 'Key and value are required' },
        { status: 400 }
      )
    }

    // Get current user
    const profilesRepo = ProfilesRepository.getInstance()
    const profile = await profilesRepo.getCurrentUserProfile()

    if (!profile) {
      timer.stop()
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    permanentLogger.breadcrumb('api', 'Creating setting', {
      key,
      userId: profile.id
    })

    const settingsRepo = AdminSettingsRepository.getInstance()
    const setting = await settingsRepo.upsertSetting({
      key,
      value: typeof value === 'object' ? JSON.stringify(value) : String(value),
      created_at: new Date().toISOString()
    })

    timer.stop()
    permanentLogger.info('API_SETTINGS', 'Setting created', {
      key,
      userId: profile.id
    })

    return NextResponse.json(setting)
  } catch (error) {
    permanentLogger.captureError('API_SETTINGS', error as Error, {
      operation: 'POST'
    })
    timer.stop()
    return NextResponse.json(
      { error: 'Failed to create setting' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/settings
 * Delete a setting
 */
export async function DELETE(request: NextRequest) {
  const timer = permanentLogger.timing('api.settings.delete')

  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (!key) {
      timer.stop()
      return NextResponse.json(
        { error: 'Setting key is required' },
        { status: 400 }
      )
    }

    // Get current user
    const profilesRepo = ProfilesRepository.getInstance()
    const profile = await profilesRepo.getCurrentUserProfile()

    if (!profile) {
      timer.stop()
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    permanentLogger.breadcrumb('api', 'Deleting setting', {
      key,
      userId: profile.id
    })

    const settingsRepo = AdminSettingsRepository.getInstance()
    await settingsRepo.deleteSetting(key)

    timer.stop()
    permanentLogger.info('API_SETTINGS', 'Setting deleted', {
      key,
      userId: profile.id
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    permanentLogger.captureError('API_SETTINGS', error as Error, {
      operation: 'DELETE'
    })
    timer.stop()
    return NextResponse.json(
      { error: 'Failed to delete setting' },
      { status: 500 }
    )
  }
}