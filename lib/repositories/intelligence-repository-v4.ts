/**
 * Company Intelligence Repository V4 - REVERTED 2025-09-29T10:00:00Z
 *
 * CRITICAL REVERT (2025-09-29): Removed BaseRepository inheritance
 * - Reverted to standalone class for client/server compatibility
 * - Now accepts SupabaseClient in constructor (isomorphic design)
 * - Requires userId parameters for all user-specific operations
 * - Each API route must handle its own authentication
 *
 * WHY THIS REVERT WAS NECESSARY:
 * BaseRepository imports server-only code (next/headers) which cannot
 * be used in client components. This repository needs to work in both
 * client components and API routes, requiring an isomorphic design.
 *
 * USAGE:
 * ```typescript
 * // Client-side
 * import { createClient } from '@/lib/supabase/client'
 * const supabase = createClient()
 * const repo = new CompanyIntelligenceRepositoryV4(supabase)
 *
 * // Server-side
 * import { createClient } from '@/lib/supabase/server'
 * const supabase = createClient()
 * const repo = new CompanyIntelligenceRepositoryV4(supabase)
 * ```
 *
 * @since 2025-09-29 - Reverted to isomorphic pattern
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { convertSupabaseError } from '@/lib/utils/supabase-error-helper'
import type { Database } from '@/lib/database.types'

/**
 * ScrapingSession interface - represents a company intelligence session
 * Matches the database schema for company_intelligence_sessions table
 */
export interface ScrapingSession {
  id: string
  user_id: string
  domain: string
  status: string
  phase: string
  merged_data?: any
  extraction_stats?: any
  metadata?: any
  scraper_type?: string
  max_pages?: number
  depth?: string
  categories?: string[]
  total_credits_estimated?: number
  total_credits_used?: number
  created_at?: string
  updated_at?: string
}

/**
 * Company Intelligence Repository V4
 * Handles all database operations for company intelligence sessions
 *
 * REVERTED DESIGN:
 * - Accepts SupabaseClient in constructor (client or server)
 * - All methods require explicit userId parameters
 * - No singleton pattern (each usage creates new instance)
 * - Works in both client components and API routes
 */
export class CompanyIntelligenceRepositoryV4 {
  private supabase: SupabaseClient
  private readonly TABLE_NAME = 'company_intelligence_sessions'

  /**
   * Constructor - accepts Supabase client
   * REVERTED: Public constructor for isomorphic usage
   *
   * @param {SupabaseClient} supabase - The Supabase client (browser or server)
   */
  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  /**
   * Get or create a user session for a domain
   * REVERTED: Requires userId parameter (auth handled by caller)
   *
   * CRITICAL: Handles unique constraint on (user_id, domain) per CLAUDE.md
   * - Checks for existing session (any status)
   * - Reactivates inactive sessions
   * - Returns existing active sessions
   * - Creates new only when needed
   * - Handles race conditions
   *
   * @param {string} userId - The authenticated user's ID
   * @param {string} domain - The domain to analyze
   * @returns {Promise<ScrapingSession>} The session object
   *
   * @example
   * // API route must check auth first
   * const user = await getUser()
   * if (!user) return 401
   * const session = await repo.getOrCreateUserSession(user.id, 'example.com')
   */
  async getOrCreateUserSession(userId: string, domain: string): Promise<ScrapingSession> {
    const correlationId = crypto.randomUUID()

    permanentLogger.breadcrumb('session_lookup', 'Looking for existing session', {
      domain,
      userId,
      correlationId
    })

    try {
      // First try to find existing session (any status - not just active)
      const { data: existing, error: fetchError } = await this.supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('user_id', userId)
        .eq('domain', domain)
        .single()

      if (existing && !fetchError) {
        // Check if session needs reactivation
        if (existing.status === 'inactive') {
          const { data: reactivated, error: reactivateError } = await this.supabase
            .from(this.TABLE_NAME)
            .update({
              status: 'active',
              phase: 'initialization',
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id)
            .select()
            .single()

          if (!reactivateError && reactivated) {
            permanentLogger.info('REPO_CI_V4', 'Session reactivated', {
              sessionId: reactivated.id,
              domain,
              correlationId
            })
            return reactivated
          }
        }

        permanentLogger.info('REPO_CI_V4', 'Existing session found', {
          sessionId: existing.id,
          domain,
          status: existing.status,
          correlationId
        })
        return existing
      }

      // Create new session - let PostgreSQL generate the ID via gen_random_uuid()
      const { data: newSession, error: createError } = await this.supabase
        .from(this.TABLE_NAME)
        .insert({
          user_id: userId,
          domain,
          status: 'active',
          phase: 'initialization',
          merged_data: {},
          extraction_stats: {},
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) {
        // Handle unique constraint violation (race condition)
        if (createError.code === '23505') {
          // Try to fetch again - another request may have created it
          const { data: retryFetch } = await this.supabase
            .from(this.TABLE_NAME)
            .select('*')
            .eq('user_id', userId)
            .eq('domain', domain)
            .single()

          if (retryFetch) {
            permanentLogger.info('REPO_CI_V4', 'Session found after race condition', {
              sessionId: retryFetch.id,
              domain,
              correlationId
            })
            return retryFetch
          }
        }

        const jsError = convertSupabaseError(createError)
        permanentLogger.captureError('REPO_CI_V4', jsError, {
          domain,
          userId,
          correlationId
        })
        throw jsError
      }

      permanentLogger.info('REPO_CI_V4', 'New session created', {
        sessionId: newSession!.id,
        domain,
        correlationId
      })

      return newSession!

    } catch (error) {
      const jsError = convertSupabaseError(error)
      permanentLogger.captureError('REPO_CI_V4', jsError, {
        operation: 'getOrCreateUserSession',
        domain,
        userId,
        correlationId
      })
      throw jsError
    }
  }

  /**
   * Update session with partial data
   * REVERTED: Direct Supabase usage
   *
   * @param {string} sessionId - The session ID to update
   * @param {Partial<ScrapingSession>} updates - Partial updates to apply
   * @returns {Promise<ScrapingSession>} Updated session
   */
  async updateSession(sessionId: string, updates: Partial<ScrapingSession>): Promise<ScrapingSession> {
    try {
      const { data, error } = await this.supabase
        .from(this.TABLE_NAME)
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .select()
        .single()

      if (error) {
        const jsError = convertSupabaseError(error)
        permanentLogger.captureError('REPO_CI_V4', jsError, {
          sessionId,
          updatedFields: Object.keys(updates)
        })
        throw jsError
      }

      permanentLogger.info('REPO_CI_V4', 'Session updated', {
        sessionId,
        updatedFields: Object.keys(updates)
      })

      return data
    } catch (error) {
      const jsError = convertSupabaseError(error)
      permanentLogger.captureError('REPO_CI_V4', jsError, {
        operation: 'updateSession',
        sessionId
      })
      throw jsError
    }
  }

  /**
   * Update merged data for a session
   * REVERTED: Direct Supabase usage
   *
   * @param {string} sessionId - The session ID
   * @param {any} data - Data to merge
   */
  async updateMergedData(sessionId: string, data: any): Promise<void> {
    try {
      // Get existing merged data
      const { data: session, error: fetchError } = await this.supabase
        .from(this.TABLE_NAME)
        .select('merged_data')
        .eq('id', sessionId)
        .single()

      if (fetchError) {
        const jsError = convertSupabaseError(fetchError)
        permanentLogger.captureError('REPO_CI_V4', jsError, { sessionId })
        throw jsError
      }

      // Merge with existing data
      const updatedData = {
        ...(session.merged_data || {}),
        ...data
      }

      // Update session
      const { error: updateError } = await this.supabase
        .from(this.TABLE_NAME)
        .update({
          merged_data: updatedData,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)

      if (updateError) {
        const jsError = convertSupabaseError(updateError)
        permanentLogger.captureError('REPO_CI_V4', jsError, { sessionId })
        throw jsError
      }

      permanentLogger.info('REPO_CI_V4', 'Merged data updated', {
        sessionId,
        dataKeys: Object.keys(data)
      })
    } catch (error) {
      const jsError = convertSupabaseError(error)
      permanentLogger.captureError('REPO_CI_V4', jsError, {
        operation: 'updateMergedData',
        sessionId
      })
      throw jsError
    }
  }

  /**
   * Get session by ID
   * REVERTED: Direct Supabase usage
   *
   * @param {string} sessionId - The session ID to retrieve
   * @returns {Promise<ScrapingSession>} The session
   */
  async getSession(sessionId: string): Promise<ScrapingSession> {
    try {
      const { data, error } = await this.supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('id', sessionId)
        .single()

      if (error) {
        const jsError = convertSupabaseError(error)
        permanentLogger.captureError('REPO_CI_V4', jsError, { sessionId })
        throw jsError
      }

      return data
    } catch (error) {
      const jsError = convertSupabaseError(error)
      permanentLogger.captureError('REPO_CI_V4', jsError, {
        operation: 'getSession',
        sessionId
      })
      throw jsError
    }
  }

  /**
   * Get all sessions for a user
   * REVERTED: Requires userId parameter
   *
   * @param {string} userId - The user ID
   * @returns {Promise<ScrapingSession[]>} Array of user's sessions
   */
  async getSessionsByUser(userId: string): Promise<ScrapingSession[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        const jsError = convertSupabaseError(error)
        permanentLogger.captureError('REPO_CI_V4', jsError, { userId })
        throw jsError
      }

      permanentLogger.info('REPO_CI_V4', 'User sessions retrieved', {
        userId,
        count: data?.length || 0
      })

      return data || []
    } catch (error) {
      const jsError = convertSupabaseError(error)
      permanentLogger.captureError('REPO_CI_V4', jsError, {
        operation: 'getSessionsByUser',
        userId
      })
      throw jsError
    }
  }

  /**
   * Update extraction stats
   * REVERTED: Direct Supabase usage
   *
   * @param {string} sessionId - The session ID
   * @param {any} stats - Extraction statistics to update
   */
  async updateExtractionStats(sessionId: string, stats: any): Promise<void> {
    try {
      const { error } = await this.supabase
        .from(this.TABLE_NAME)
        .update({
          extraction_stats: stats,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)

      if (error) {
        const jsError = convertSupabaseError(error)
        permanentLogger.captureError('REPO_CI_V4', jsError, { sessionId })
        throw jsError
      }

      permanentLogger.info('REPO_CI_V4', 'Extraction stats updated', {
        sessionId,
        statsKeys: Object.keys(stats)
      })
    } catch (error) {
      const jsError = convertSupabaseError(error)
      permanentLogger.captureError('REPO_CI_V4', jsError, {
        operation: 'updateExtractionStats',
        sessionId
      })
      throw jsError
    }
  }

  /**
   * Get user profile
   * REVERTED: Requires userId parameter
   * NOTE: This accesses the user_profiles table
   *
   * @param {string} userId - The user ID
   * @returns {Promise<any>} User profile with credits info
   */
  async getUserProfile(userId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        const jsError = convertSupabaseError(error)
        permanentLogger.captureError('REPO_CI_V4', jsError, { userId })
        throw jsError
      }

      return data
    } catch (error) {
      const jsError = convertSupabaseError(error)
      permanentLogger.captureError('REPO_CI_V4', jsError, {
        operation: 'getUserProfile',
        userId
      })
      throw jsError
    }
  }

  /**
   * Deduct credits from user
   * REVERTED: Requires userId parameter
   *
   * @param {string} userId - The user ID
   * @param {number} amount - Amount to deduct
   * @param {string} description - Description of deduction
   * @param {any} metadata - Additional metadata
   */
  async deductCredits(userId: string, amount: number, description: string, metadata?: any): Promise<any> {
    try {
      // Get current balance
      const profile = await this.getUserProfile(userId)
      const currentBalance = profile?.credits_balance || 0

      if (currentBalance < amount) {
        return {
          success: false,
          error: 'Insufficient credits',
          balance: currentBalance
        }
      }

      // Update balance
      const newBalance = currentBalance - amount
      const { error: updateError } = await this.supabase
        .from('profiles')
        .update({
          credits_balance: newBalance,
          credits_used: (profile?.credits_used || 0) + amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (updateError) {
        const jsError = convertSupabaseError(updateError)
        permanentLogger.captureError('REPO_CI_V4', jsError, { userId, amount })
        throw jsError
      }

      // Log transaction
      const { data: transaction, error: txError } = await this.supabase
        .from('credit_transactions')
        .insert({
          user_id: userId,
          amount: -amount,
          balance_after: newBalance,
          description,
          metadata,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (txError) {
        permanentLogger.warn('REPO_CI_V4', 'Failed to log credit transaction', {
          userId,
          amount,
          error: convertSupabaseError(txError).message
        })
      }

      permanentLogger.info('REPO_CI_V4', 'Credits deducted', {
        userId,
        amount,
        newBalance,
        transactionId: transaction?.id
      })

      return {
        success: true,
        newBalance,
        transactionId: transaction?.id
      }
    } catch (error) {
      const jsError = convertSupabaseError(error)
      permanentLogger.captureError('REPO_CI_V4', jsError, {
        operation: 'deductCredits',
        userId,
        amount
      })
      throw jsError
    }
  }

  /**
   * Add credits to user (for refunds)
   * REVERTED: Requires userId parameter
   *
   * @param {string} userId - The user ID
   * @param {number} amount - Amount to add
   * @param {string} description - Description of addition
   * @param {any} metadata - Additional metadata
   */
  async addCredits(userId: string, amount: number, description: string, metadata?: any): Promise<any> {
    try {
      // Get current balance
      const profile = await this.getUserProfile(userId)
      const currentBalance = profile?.credits_balance || 0
      const newBalance = currentBalance + amount

      // Update balance
      const { error: updateError } = await this.supabase
        .from('profiles')
        .update({
          credits_balance: newBalance,
          credits_total: (profile?.credits_total || 0) + amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (updateError) {
        const jsError = convertSupabaseError(updateError)
        permanentLogger.captureError('REPO_CI_V4', jsError, { userId, amount })
        throw jsError
      }

      // Log transaction
      const { data: transaction, error: txError } = await this.supabase
        .from('credit_transactions')
        .insert({
          user_id: userId,
          amount: amount,
          balance_after: newBalance,
          description,
          metadata,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (txError) {
        permanentLogger.warn('REPO_CI_V4', 'Failed to log credit transaction', {
          userId,
          amount,
          error: convertSupabaseError(txError).message
        })
      }

      permanentLogger.info('REPO_CI_V4', 'Credits added', {
        userId,
        amount,
        newBalance,
        transactionId: transaction?.id
      })

      return {
        success: true,
        newBalance,
        transactionId: transaction?.id
      }
    } catch (error) {
      const jsError = convertSupabaseError(error)
      permanentLogger.captureError('REPO_CI_V4', jsError, {
        operation: 'addCredits',
        userId,
        amount
      })
      throw jsError
    }
  }

  /**
   * Get intelligence items for a session
   * NOTE: This is a placeholder - actual implementation may vary
   *
   * @param {string} sessionId - The session ID
   * @param {any} filters - Optional filters
   */
  async getIntelligenceItems(sessionId: string, filters?: any): Promise<any[]> {
    try {
      // This would typically query a separate intelligence_items table
      // For now, returning empty array as placeholder
      permanentLogger.info('REPO_CI_V4', 'Getting intelligence items', {
        sessionId,
        filters
      })

      return []
    } catch (error) {
      const jsError = convertSupabaseError(error)
      permanentLogger.captureError('REPO_CI_V4', jsError, {
        operation: 'getIntelligenceItems',
        sessionId
      })
      throw jsError
    }
  }
}