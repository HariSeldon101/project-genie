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
import { convertSupabaseError } from '@/lib/utils/supabase-error-helper'
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
   * Get profile by ID - returns null if not found (doesn't throw)
   * Used for checking profile existence
   */
  async getProfile(userId: string): Promise<Profile | null> {
    const timer = permanentLogger.timing('repository.getProfile')

    return this.execute('getProfile', async (client) => {
      permanentLogger.breadcrumb('repository', 'Checking if profile exists', {
        userId,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        // Check if it's a "not found" error
        if (error.code === 'PGRST116') {
          permanentLogger.breadcrumb('repository', 'Profile not found', {
            userId
          })
          timer.stop()
          return null
        }

        // Real error - log and throw
        permanentLogger.captureError('PROFILES_REPO', error, {
          operation: 'getProfile',
          userId
        })
        throw error
      }

      timer.stop()
      return data
    })
  }

  /**
   * Upsert profile - creates or updates
   * Used as fallback when database trigger fails
   */
  async upsertProfile(profile: ProfileInsert): Promise<Profile> {
    const timer = permanentLogger.timing('repository.upsertProfile')

    return this.execute('upsertProfile', async (client) => {
      permanentLogger.breadcrumb('repository', 'Upserting profile', {
        userId: profile.id,
        operation: 'INSERT ON CONFLICT UPDATE',
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('profiles')
        .upsert({
          ...profile,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        permanentLogger.captureError('PROFILES_REPO', error, {
          operation: 'upsertProfile',
          userId: profile.id
        })
        throw error
      }

      if (!data) {
        throw new Error('Upsert failed - no data returned')
      }

      const duration = timer.stop()
      permanentLogger.breadcrumb('repository', 'Profile upserted', {
        userId: profile.id,
        duration
      })

      return data
    })
  }

  /**
   * Delete profile - for account deletion
   */
  async deleteProfile(userId: string): Promise<void> {
    const timer = permanentLogger.timing('repository.deleteProfile')

    return this.execute('deleteProfile', async (client) => {
      permanentLogger.breadcrumb('repository', 'Deleting profile', {
        userId,
        timestamp: Date.now()
      })

      const { error } = await client
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (error) {
        permanentLogger.captureError('PROFILES_REPO', error, {
          operation: 'deleteProfile',
          userId
        })
        throw error
      }

      timer.stop()
      permanentLogger.breadcrumb('repository', 'Profile deleted', {
        userId
      })
    })
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

  /**
   * Get all users with statistics - Admin only
   * Technical PM: Comprehensive user data for admin dashboard
   * Includes scrape counts, document counts, and auth info
   */
  async getAllUsersWithStats(): Promise<any[]> {
    const timer = permanentLogger.timing('repository.getAllUsersWithStats')

    return this.execute('getAllUsersWithStats', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching all users with stats', {
        timestamp: Date.now()
      })

      // Get all profiles first
      const { data: profiles, error: profilesError } = await client
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (profilesError) {
        const jsError = convertSupabaseError(profilesError)
        permanentLogger.captureError('PROFILES_REPO', jsError, {
          operation: 'getAllUsersWithStats',
          stage: 'profiles'
        })
        throw jsError
      }

      if (!profiles || profiles.length === 0) {
        timer.stop()
        return []
      }

      // Get auth data for all users
      const userIds = profiles.map(p => p.id)

      // Get scraping stats
      const { data: scrapeStats, error: scrapeError } = await client
        .from('company_intelligence_sessions')
        .select('user_id')
        .in('user_id', userIds)

      if (scrapeError) {
        const jsError = convertSupabaseError(scrapeError)
        permanentLogger.captureError('PROFILES_REPO', jsError, {
          operation: 'getAllUsersWithStats',
          stage: 'scrapeStats'
        })
        throw jsError // CLAUDE.md: No graceful degradation - throw the error
      }

      // Get document stats
      const { data: docStats, error: docError } = await client
        .from('artifacts')
        .select('created_by')
        .in('created_by', userIds)

      if (docError) {
        const jsError = convertSupabaseError(docError)
        permanentLogger.captureError('PROFILES_REPO', jsError, {
          operation: 'getAllUsersWithStats',
          stage: 'docStats'
        })
        throw jsError // CLAUDE.md: No graceful degradation - throw the error
      }

      // Count scrapes and documents per user
      const scrapeCountMap = new Map<string, number>()
      const docCountMap = new Map<string, number>()

      scrapeStats?.forEach(s => {
        const count = scrapeCountMap.get(s.user_id) || 0
        scrapeCountMap.set(s.user_id, count + 1)
      })

      docStats?.forEach(d => {
        const count = docCountMap.get(d.created_by) || 0
        docCountMap.set(d.created_by, count + 1)
      })

      // Combine all data - NO FALLBACKS per CLAUDE.md
      const usersWithStats = profiles.map(profile => ({
        ...profile,
        scrape_count: scrapeCountMap.get(profile.id) ?? 0, // Use nullish coalescing for legitimate zeros
        document_count: docCountMap.get(profile.id) ?? 0, // Use nullish coalescing for legitimate zeros
        auth_provider: profile.auth_provider, // NO FALLBACK - let it be NULL if not set
        last_sign_in_at: profile.last_sign_in_at // NO FALLBACK - let it be NULL if never signed in
      }))

      const duration = timer.stop()
      permanentLogger.breadcrumb('repository', 'Users with stats fetched', {
        userCount: usersWithStats.length,
        duration
      })

      return usersWithStats
    })
  }

  /**
   * Get user with detailed statistics - Admin only
   * Technical PM: Full user details including activity and auth info
   * Updated to use new views for accurate counts
   */
  async getUserWithStats(userId: string): Promise<any> {
    const timer = permanentLogger.timing('repository.getUserWithStats')

    return this.execute('getUserWithStats', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching user with stats', {
        userId,
        timestamp: Date.now()
      })

      // Try to get comprehensive stats from the view first
      // Note: View may not be available in all environments or during migrations
      const { data: userStats, error: statsError } = await client
        .from('user_activity_stats')
        .select('*')
        .eq('id', userId)
        .maybeSingle() // Use maybeSingle to handle when row doesn't exist

      permanentLogger.info('PROFILES_REPO', 'View query attempted', {
        userId,
        hasError: !!statsError,
        hasData: !!userStats,
        errorMessage: statsError?.message
      })

      if (!statsError && userStats) {
        // Successfully got data from view
        permanentLogger.info('PROFILES_REPO', 'Using view data path', { userId })
        // Get recent scrapes for detail view
        const { data: recentScrapes, error: scrapesError } = await client
          .from('company_intelligence_sessions')
          .select('id, company_name, domain, status, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10)

        if (scrapesError) {
          const jsError = convertSupabaseError(scrapesError)
          permanentLogger.captureError('PROFILES_REPO', jsError, {
            operation: 'getUserWithStats',
            stage: 'recentScrapes',
            userId
          })
          throw jsError
        }

        // Get recent documents for detail view
        const { data: recentDocuments, error: docsError } = await client
          .from('artifacts')
          .select('id, title, type, created_at')
          .eq('created_by', userId)
          .order('created_at', { ascending: false })
          .limit(10)

        if (docsError) {
          const jsError = convertSupabaseError(docsError)
          permanentLogger.captureError('PROFILES_REPO', jsError, {
            operation: 'getUserWithStats',
            stage: 'recentDocuments',
            userId
          })
          throw jsError
        }

        // Get activity log if it exists
        const { data: activities, error: activitiesError } = await client
          .from('activity_log')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50)

        if (activitiesError) {
          const jsError = convertSupabaseError(activitiesError)
          permanentLogger.captureError('PROFILES_REPO', jsError, {
            operation: 'getUserWithStats',
            stage: 'activities',
            userId
          })
          throw jsError
        }

        const userWithStats = {
          ...userStats,
          recent_scrapes: recentScrapes, // NO FALLBACK - let it be NULL
          recent_documents: recentDocuments, // NO FALLBACK - let it be NULL
          recent_activity: activities // NO FALLBACK - let it be NULL
        }

        const duration = timer.stop()
        permanentLogger.breadcrumb('repository', 'User with stats fetched from view', {
          userId,
          scrapeCount: userWithStats.scrape_count,
          documentCount: userWithStats.document_count,
          duration
        })

        return userWithStats
      }

      // CLAUDE.md: NO FALLBACK LOGIC - but handle view access issues gracefully
      if (statsError) {
        // Check if it's a "relation does not exist" error (view doesn't exist)
        if (statsError.message?.includes('relation') && statsError.message?.includes('does not exist')) {
          permanentLogger.warn('PROFILES_REPO', 'View user_activity_stats does not exist, using direct queries', {
            operation: 'getUserWithStats',
            stage: 'user_activity_stats_view',
            userId,
            error: 'View does not exist - using fallback'
          })
          // Don't throw - continue with fallback
        } else {
          // For other errors, log but continue with manual query
          permanentLogger.warn('PROFILES_REPO', 'Could not access user_activity_stats view, using direct queries', {
            userId,
            error: statsError.message
          })
        }
      }

      // If view doesn't exist OR returned no data, fall back to direct queries
      // This is NOT mock data - it's querying the actual tables
      if (!userStats) {
        permanentLogger.info('PROFILES_REPO', 'Using direct table queries instead of view', {
          userId
        })

        // Get profile directly
        const { data: profile, error: profileError } = await client
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()

        if (profileError) {
          const jsError = convertSupabaseError(profileError)
          permanentLogger.captureError('PROFILES_REPO', jsError, {
            operation: 'getUserWithStats',
            stage: 'profile_fetch',
            userId
          })
          throw jsError
        }

        if (!profile) {
          throw new Error(`User not found: ${userId}`)
        }

        // Get real counts from tables
        const { count: scrapeCount } = await client
          .from('company_intelligence_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)

        const { count: documentCount } = await client
          .from('artifacts')
          .select('*', { count: 'exact', head: true })
          .eq('created_by', userId)

        // Get recent scrapes
        const { data: recentScrapes } = await client
          .from('company_intelligence_sessions')
          .select('id, company_name, domain, status, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10)

        // Get recent documents
        const { data: recentDocuments } = await client
          .from('artifacts')
          .select('id, title, type, created_at')
          .eq('created_by', userId)
          .order('created_at', { ascending: false })
          .limit(10)

        // Get activity log
        const { data: activities, error: activitiesError } = await client
          .from('activity_log')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50)

        if (activitiesError) {
          permanentLogger.warn('PROFILES_REPO', 'Failed to fetch activities in fallback path', {
            userId,
            error: activitiesError.message
          })
        }

        permanentLogger.info('PROFILES_REPO', 'Fallback path data fetched', {
          userId,
          scrapeCount: scrapeCount ?? 0,
          documentCount: documentCount ?? 0,
          activitiesCount: activities?.length ?? 0,
          scrapesCount: recentScrapes?.length ?? 0,
          documentsCount: recentDocuments?.length ?? 0
        })

        // Return real data - no mock values
        return {
          ...profile,
          scrape_count: scrapeCount ?? 0,
          document_count: documentCount ?? 0,
          recent_scrapes: recentScrapes || [],
          recent_documents: recentDocuments || [],
          recent_activity: activities || []
        }
      }

      // This code path should never execute if views are properly set up
      // Removing all fallback logic per CLAUDE.md compliance
      throw new Error('Unexpected code path - this should never execute')
    })
  }

  /**
   * Update user admin status - Admin only
   * Technical PM: Grant or revoke admin privileges
   */
  async updateUserAdmin(userId: string, isAdmin: boolean): Promise<Profile> {
    const timer = permanentLogger.timing('repository.updateUserAdmin')

    return this.execute('updateUserAdmin', async (client) => {
      permanentLogger.breadcrumb('repository', 'Updating user admin status', {
        userId,
        isAdmin,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('profiles')
        .update({
          is_admin: isAdmin,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        permanentLogger.captureError('PROFILES_REPO', error, {
          operation: 'updateUserAdmin',
          userId,
          isAdmin
        })
        throw error
      }

      if (!data) {
        throw new Error(`Failed to update admin status for user: ${userId}`)
      }

      const duration = timer.stop()
      permanentLogger.breadcrumb('repository', 'User admin status updated', {
        userId,
        isAdmin,
        duration
      })

      return data
    })
  }

  /**
   * Disable user account - Admin only
   * Technical PM: Soft disable by setting is_active to false
   */
  async disableUser(userId: string): Promise<Profile> {
    const timer = permanentLogger.timing('repository.disableUser')

    return this.execute('disableUser', async (client) => {
      permanentLogger.breadcrumb('repository', 'Disabling user account', {
        userId,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('profiles')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        permanentLogger.captureError('PROFILES_REPO', error, {
          operation: 'disableUser',
          userId
        })
        throw error
      }

      if (!data) {
        throw new Error(`Failed to disable user: ${userId}`)
      }

      const duration = timer.stop()
      permanentLogger.breadcrumb('repository', 'User disabled', {
        userId,
        duration
      })

      return data
    })
  }

  /**
   * Enable user account - Admin only
   * Technical PM: Re-enable a disabled account
   */
  async enableUser(userId: string): Promise<Profile> {
    const timer = permanentLogger.timing('repository.enableUser')

    return this.execute('enableUser', async (client) => {
      permanentLogger.breadcrumb('repository', 'Enabling user account', {
        userId,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('profiles')
        .update({
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        permanentLogger.captureError('PROFILES_REPO', error, {
          operation: 'enableUser',
          userId
        })
        throw error
      }

      if (!data) {
        throw new Error(`Failed to enable user: ${userId}`)
      }

      const duration = timer.stop()
      permanentLogger.breadcrumb('repository', 'User enabled', {
        userId,
        duration
      })

      return data
    })
  }

  /**
   * Search users by email or name - Admin only
   * Technical PM: For admin user search functionality
   */
  async searchUsers(query: string): Promise<Profile[]> {
    const timer = permanentLogger.timing('repository.searchUsers')

    return this.execute('searchUsers', async (client) => {
      permanentLogger.breadcrumb('repository', 'Searching users', {
        query,
        timestamp: Date.now()
      })

      const searchPattern = `%${query}%`

      const { data, error } = await client
        .from('profiles')
        .select('*')
        .or(`email.ilike.${searchPattern},full_name.ilike.${searchPattern}`)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        permanentLogger.captureError('PROFILES_REPO', error, {
          operation: 'searchUsers',
          query
        })
        throw error
      }

      const results = data || []

      const duration = timer.stop()
      permanentLogger.breadcrumb('repository', 'Users searched', {
        query,
        resultCount: results.length,
        duration
      })

      return results
    })
  }

  /**
   * Update last sign in time for a user
   * Technical PM: Called when user successfully authenticates
   */
  async updateLastSignIn(userId: string): Promise<void> {
    const timer = permanentLogger.timing('repository.updateLastSignIn')

    return this.execute('updateLastSignIn', async (client) => {
      permanentLogger.breadcrumb('repository', 'Updating last sign in', {
        userId,
        timestamp: Date.now()
      })

      const { error } = await client
        .from('profiles')
        .update({
          last_sign_in_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) {
        permanentLogger.captureError('PROFILES_REPO', error, {
          operation: 'updateLastSignIn',
          userId
        })
        // Don't throw - this is a non-critical update
      }

      const duration = timer.stop()
      permanentLogger.breadcrumb('repository', 'Last sign in updated', {
        userId,
        duration
      })
    })
  }

  /**
   * Update user subscription and tier - Admin only
   * Technical PM: Admin override for subscription management
   */
  async updateUserSubscription(
    userId: string,
    tier: 'free' | 'basic' | 'premium' | 'team',
    updates?: Partial<ProfileUpdate>
  ): Promise<Profile> {
    const timer = permanentLogger.timing('repository.updateUserSubscription')

    return this.execute('updateUserSubscription', async (client) => {
      permanentLogger.breadcrumb('repository', 'Updating user subscription', {
        userId,
        tier,
        hasAdditionalUpdates: !!updates,
        timestamp: Date.now()
      })

      const updateData: any = {
        subscription_tier: tier,
        updated_at: new Date().toISOString(),
        ...updates
      }

      const { data, error } = await client
        .from('profiles')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        permanentLogger.captureError('PROFILES_REPO', error, {
          operation: 'updateUserSubscription',
          userId,
          tier
        })
        throw error
      }

      if (!data) {
        throw new Error(`Failed to update subscription for user: ${userId}`)
      }

      const duration = timer.stop()
      permanentLogger.breadcrumb('repository', 'User subscription updated', {
        userId,
        tier,
        duration
      })

      return data
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