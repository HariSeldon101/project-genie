/**
 * Admin Settings Repository - Handles all database operations for admin settings
 *
 * Technical PM Note: Manages admin configuration including LLM provider settings,
 * feature flags, and system preferences. This centralizes all admin database access
 * to enforce security and audit logging.
 */

import { BaseRepository } from './base-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import type { Database } from '@/lib/database.types'

type AdminSetting = Database['public']['Tables']['admin_settings']['Row']
type AdminSettingInsert = Database['public']['Tables']['admin_settings']['Insert']
type AdminSettingUpdate = Database['public']['Tables']['admin_settings']['Update']

export class AdminSettingsRepository extends BaseRepository {
  private static instance: AdminSettingsRepository

  static getInstance(): AdminSettingsRepository {
    if (!this.instance) {
      this.instance = new AdminSettingsRepository()
    }
    return this.instance
  }

  /**
   * Get all admin settings
   * Used by admin dashboard to display current configuration
   */
  async getAllSettings(): Promise<AdminSetting[]> {
    const timer = permanentLogger.timing('repository.getAllSettings')

    return this.execute('getAllSettings', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching all admin settings', {
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('admin_settings')
        .select('*')
        .order('key')

      if (error) {
        permanentLogger.captureError('ADMIN_SETTINGS_REPO', error, {
          operation: 'getAllSettings'
        })
        timer.stop()
        throw error
      }

      timer.stop()
      permanentLogger.info('ADMIN_SETTINGS_REPO', 'Retrieved admin settings', {
        count: data?.length || 0
      })

      return data || []
    })
  }

  /**
   * Get a specific setting by key
   */
  async getSetting(key: string): Promise<AdminSetting | null> {
    const timer = permanentLogger.timing('repository.getSetting')

    return this.execute('getSetting', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching admin setting', {
        key,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('admin_settings')
        .select('*')
        .eq('key', key)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found - this is OK
          timer.stop()
          return null
        }
        permanentLogger.captureError('ADMIN_SETTINGS_REPO', error, {
          operation: 'getSetting',
          key
        })
        timer.stop()
        throw error
      }

      timer.stop()
      return data
    })
  }

  /**
   * Update or insert a setting (upsert)
   * CRITICAL: No ID generation - database handles via gen_random_uuid() if needed
   */
  async upsertSetting(setting: Omit<AdminSettingInsert, 'id'>): Promise<AdminSetting> {
    const timer = permanentLogger.timing('repository.upsertSetting')

    return this.execute('upsertSetting', async (client) => {
      permanentLogger.breadcrumb('repository', 'Upserting admin setting', {
        key: setting.key,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('admin_settings')
        .upsert(setting, {
          onConflict: 'key'
        })
        .select()
        .single()

      if (error) {
        permanentLogger.captureError('ADMIN_SETTINGS_REPO', error, {
          operation: 'upsertSetting',
          key: setting.key
        })
        timer.stop()
        throw error
      }

      timer.stop()
      permanentLogger.info('ADMIN_SETTINGS_REPO', 'Upserted admin setting', {
        key: setting.key
      })

      return data
    })
  }

  /**
   * Delete a setting
   */
  async deleteSetting(key: string): Promise<void> {
    const timer = permanentLogger.timing('repository.deleteSetting')

    return this.execute('deleteSetting', async (client) => {
      permanentLogger.breadcrumb('repository', 'Deleting admin setting', {
        key,
        timestamp: Date.now()
      })

      const { error } = await client
        .from('admin_settings')
        .delete()
        .eq('key', key)

      if (error) {
        permanentLogger.captureError('ADMIN_SETTINGS_REPO', error, {
          operation: 'deleteSetting',
          key
        })
        timer.stop()
        throw error
      }

      timer.stop()
      permanentLogger.info('ADMIN_SETTINGS_REPO', 'Deleted admin setting', {
        key
      })
    })
  }

  /**
   * Get settings by category (e.g., 'llm', 'features', 'security')
   */
  async getSettingsByCategory(category: string): Promise<AdminSetting[]> {
    const timer = permanentLogger.timing('repository.getSettingsByCategory')

    return this.execute('getSettingsByCategory', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching settings by category', {
        category,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('admin_settings')
        .select('*')
        .like('key', `${category}.%`)
        .order('key')

      if (error) {
        permanentLogger.captureError('ADMIN_SETTINGS_REPO', error, {
          operation: 'getSettingsByCategory',
          category
        })
        timer.stop()
        throw error
      }

      timer.stop()
      permanentLogger.info('ADMIN_SETTINGS_REPO', 'Retrieved settings by category', {
        category,
        count: data?.length || 0
      })

      return data || []
    })
  }
}