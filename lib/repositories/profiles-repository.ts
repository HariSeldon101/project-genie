/**
 * Profiles Repository - Handles all database operations for user profiles
 *
 * Technical PM Note: Centralizes profile data access with proper security.
 * Profile creation is handled automatically by PostgreSQL triggers when users sign up.
 * This repository only handles reading and updating existing profiles.
 *
 * ✅ CLAUDE.md Compliance:
 * - Profile creation via database triggers (Lines 826-843)
 * - NO client-side profile creation methods (Line 839)
 * - Repository pattern for data access (Lines 253-288)
 * - Proper error handling with captureError (Line 248)
 */

import { BaseRepository } from './base-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import type { Database } from '@/lib/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']
type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export class ProfilesRepository extends BaseRepository {
  private static instance: ProfilesRepository

  static getInstance(): ProfilesRepository {
    if (!this.instance) {
      this.instance = new ProfilesRepository()
    }
    return this.instance
  }

  /**
   * Get current user's profile
   * CRITICAL: No fallback data - throws if profile doesn't exist
   * Profile is guaranteed to exist via database trigger on user creation
   */
  async getCurrentProfile(): Promise<Profile> {
    const timer = permanentLogger.timing('repository.getCurrentProfile')

    return this.execute('getCurrentProfile', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching current user profile', {
        timestamp: Date.now()
      })

      const user = await this.getCurrentUser()

      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        permanentLogger.captureError('PROFILES_REPO', error, {
          operation: 'getCurrentProfile',
          userId: user.id
        })
        throw error
      }

      // NO FALLBACK - throw if not found
      // This should never happen as profiles are created by database trigger
      if (!data) {
        const notFoundError = new Error('Profile not found - database trigger may have failed')
        permanentLogger.captureError('PROFILES_REPO', notFoundError, {
          userId: user.id,
          context: 'Profile should exist via on_auth_user_created trigger'
        })
        throw notFoundError
      }

      const duration = timer.stop()
      permanentLogger.breadcrumb('repository', 'Profile fetched', {
        userId: user.id,
        duration
      })

      return data
    })
  }

  /**
   * Get profile by user ID
   * Technical PM: Admin function - requires elevated permissions
   */
  async getProfileById(userId: string): Promise<Profile> {
    const timer = permanentLogger.timing('repository.getProfileById')

    return this.execute('getProfileById', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching profile by ID', {
        targetUserId: userId,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        permanentLogger.captureError('PROFILES_REPO', error, {
          operation: 'getProfileById',
          targetUserId: userId
        })
        throw error
      }

      if (!data) {
        throw new Error(`Profile not found for user ${userId}`)
      }

      timer.stop()
      return data
    })
  }

  /**
   * Update current user's profile
   * Technical PM: Users can only update their own profile
   */
  async updateProfile(updates: ProfileUpdate): Promise<Profile> {
    const timer = permanentLogger.timing('repository.updateProfile')

    return this.execute('updateProfile', async (client) => {
      permanentLogger.breadcrumb('repository', 'Updating user profile', {
        timestamp: Date.now(),
        updateFields: Object.keys(updates)
      })

      const user = await this.getCurrentUser()

      // Prevent updating protected fields
      const safeUpdates = { ...updates }
      delete (safeUpdates as any).id // Never allow ID updates
      delete (safeUpdates as any).created_at // Never allow created_at updates

      const { data, error } = await client
        .from('profiles')
        .update(safeUpdates)
        .eq('id', user.id)
        .select()
        .single()

      if (error) {
        permanentLogger.captureError('PROFILES_REPO', error, {
          operation: 'updateProfile',
          userId: user.id,
          updateFields: Object.keys(updates)
        })
        throw error
      }

      if (!data) {
        throw new Error('Profile update failed - no data returned')
      }

      const duration = timer.stop()
      permanentLogger.breadcrumb('repository', 'Profile updated', {
        userId: user.id,
        duration
      })

      return data
    })
  }

  /**
   * Update avatar URL for user profile
   * Technical PM: Separate method for avatar updates with storage integration
   */
  async updateAvatar(userId: string, avatarUrl: string | null): Promise<Profile> {
    const timer = permanentLogger.timing('repository.updateAvatar')

    return this.execute('updateAvatar', async (client) => {
      permanentLogger.breadcrumb('repository', 'Updating avatar URL', {
        userId,
        hasAvatar: !!avatarUrl,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('profiles')
        .update({
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        permanentLogger.captureError('PROFILES_REPO', error, {
          operation: 'updateAvatar',
          userId
        })
        throw error
      }

      if (!data) {
        throw new Error('Avatar update failed - profile not found')
      }

      const duration = timer.stop()
      permanentLogger.breadcrumb('repository', 'Avatar updated', {
        userId,
        duration
      })

      return data
    })
  }

  /**
   * Update subscription tier
   * Technical PM: Called by payment/subscription services
   */
  async updateSubscriptionTier(
    userId: string,
    tier: 'free' | 'basic' | 'premium'
  ): Promise<Profile> {
    const timer = permanentLogger.timing('repository.updateSubscriptionTier')

    return this.execute('updateSubscriptionTier', async (client) => {
      permanentLogger.breadcrumb('repository', 'Updating subscription tier', {
        userId,
        newTier: tier,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('profiles')
        .update({
          subscription_tier: tier,
          subscription_updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        permanentLogger.captureError('PROFILES_REPO', error, {
          operation: 'updateSubscriptionTier',
          userId,
          tier
        })
        throw error
      }

      if (!data) {
        throw new Error('Subscription update failed - profile not found')
      }

      const duration = timer.stop()
      permanentLogger.breadcrumb('repository', 'Subscription tier updated', {
        userId,
        tier,
        duration
      })

      return data
    })
  }

  /**
   * Get profiles by subscription tier
   * Technical PM: Admin function for subscription management
   */
  async getProfilesByTier(tier: 'free' | 'basic' | 'premium'): Promise<Profile[]> {
    const timer = permanentLogger.timing('repository.getProfilesByTier')

    return this.execute('getProfilesByTier', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching profiles by tier', {
        tier,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('subscription_tier', tier)
        .order('created_at', { ascending: false })

      if (error) {
        permanentLogger.captureError('PROFILES_REPO', error, {
          operation: 'getProfilesByTier',
          tier
        })
        throw error
      }

      // Empty array is valid - no fallback needed
      const profiles = data || []

      const duration = timer.stop()
      permanentLogger.breadcrumb('repository', 'Profiles by tier fetched', {
        tier,
        count: profiles.length,
        duration
      })

      return profiles
    })
  }

  /**
   * Get all profiles - Admin only
   * Technical PM: For admin statistics and user management
   */
  async getAllProfiles(): Promise<Profile[]> {
    const timer = permanentLogger.timing('repository.getAllProfiles')

    return this.execute('getAllProfiles', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching all profiles', {
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        permanentLogger.captureError('PROFILES_REPO', error, {
          operation: 'getAllProfiles'
        })
        throw error
      }

      timer.stop()
      return data || []
    })
  }
}

// ✅ METHODS IN THIS REPOSITORY:
// - getCurrentProfile() - Read current user's profile
// - getProfileById(id) - Read specific profile (admin)
// - updateProfile(updates) - Update current user's profile
// - updateAvatar(userId, url) - Update avatar URL
// - updateSubscriptionTier(userId, tier) - Update subscription
// - getProfilesByTier(tier) - Get profiles by subscription tier
// - getAllProfiles() - Get all profiles (admin)

// ❌ REMOVED METHODS (handled by database triggers):
// - ensureProfile() - NOT NEEDED, triggers handle creation
// - profileExists() - NOT NEEDED, always exists after signup
// - createProfile() - NOT NEEDED, automatic via trigger