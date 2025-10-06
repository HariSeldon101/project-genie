/**
 * Company Intelligence Repository - Centralised database access for all company intelligence operations
 *
 * Purpose (for technical PMs):
 * - Single source of truth for all company intelligence database operations
 * - Replaces 22+ files with scattered database logic
 * - Ensures consistent error handling and logging
 * - Makes testing much easier - mock this one class instead of 22 files
 * - Follows DRY principle - no duplicate database code
 *
 * @module repositories
 */

import { BaseRepository } from './base-repository'
import { PhaseDataRepository } from './phase-data-repository'
import { CacheManager } from './cache-manager'
import { convertSupabaseError } from '@/lib/utils/supabase-error-helper'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Session data structure matching database schema
 * Note: discovered_urls removed - using merged_data.site_analysis.sitemap_pages as single source of truth
 */
export interface SessionData {
  id: string
  user_id: string
  company_name: string
  domain: string
  status: 'active' | 'completed' | 'failed' | 'aborted'
  phase: number
  version: number
  merged_data?: any
  execution_history?: any[]
  created_at: string
  updated_at: string
  last_lock_id?: string
}

/**
 * Lock status for concurrency control
 */
export interface LockStatus {
  isLocked: boolean
  lockId?: string
  lockedAt?: string
  sessionId: string
}

/**
 * Pack data structure for storing analysis results
 */
export interface PackData {
  id: string
  session_id: string
  pack_data: any
  pack_type: string
  created_at: string
  updated_at: string
}

/**
 * Page intelligence data structure
 */
export interface PageIntelligence {
  id: string
  session_id: string
  url: string
  title?: string
  description?: string
  content?: string
  metadata?: any
  created_at: string
}

/**
 * Company Intelligence Repository
 * Centralises all database operations for company intelligence features
 * Singleton pattern ensures single instance across application
 */
export class CompanyIntelligenceRepository extends BaseRepository {
  private static instance: CompanyIntelligenceRepository
  private phaseDataRepo: PhaseDataRepository
  private sessionCache: CacheManager<SessionData>

  constructor() {
    super()
    // Initialize dependencies
    this.phaseDataRepo = PhaseDataRepository.getInstance()
    this.sessionCache = new CacheManager<SessionData>(5) // 5-minute cache
  }

  /**
   * Get singleton instance of repository
   * Ensures we only have one instance managing database connections
   */
  static getInstance(): CompanyIntelligenceRepository {
    if (!this.instance) {
      this.instance = new CompanyIntelligenceRepository()
    }
    return this.instance
  }

  // ==========================================
  // SESSION OPERATIONS (Core functionality)
  // ==========================================

  /**
   * ⚠️ DEPRECATED: Use getOrCreateUserSession() instead
   * This method is kept for reference only and should NOT be used.
   * It doesn't properly handle the unique constraint on user_id + domain
   * and will cause duplicate key violations.
   *
   * @deprecated Since 2025-09-21 - Use getOrCreateUserSession() instead
   */
  // Method removed to prevent accidental usage

  /**
   * 🔑 PRIMARY SESSION MANAGEMENT METHOD
   * Get or create active session for current user and domain
   *
   * This is the ONLY method that should be used for session management.
   * It properly handles all edge cases and database constraints.
   *
   * ✅ FEATURES:
   * - Idempotent: Can be called multiple times safely
   * - Handles existing sessions (returns them)
   * - Reactivates inactive sessions automatically
   * - Creates new sessions only when needed
   * - Race condition safe (handles concurrent calls)
   * - Respects unique constraint on user_id + domain
   *
   * ❌ NEVER USE:
   * - createSession() - deprecated, causes constraint violations
   * - Direct database inserts - bypasses business logic
   *
   * 🎯 DATABASE CONSTRAINT:
   * The company_intelligence_sessions table has a UNIQUE constraint on (user_id, domain)
   * This method gracefully handles violations of this constraint.
   *
   * 📝 ALGORITHM:
   * 1. Check for ANY existing session (active or inactive)
   * 2. If found and inactive -> reactivate it
   * 3. If found and active -> return it
   * 4. If not found -> create new session
   * 5. If creation fails with duplicate key -> fetch and return existing (race condition handling)
   *
   * @param userId - Authenticated user ID from Supabase auth
   * @param domain - Company domain (e.g., example.com) - will be normalized
   * @returns Promise<SessionData> Always returns a valid session (existing or new)
   * @throws Error if userId or domain is missing, or if database operation fails
   */
  async getOrCreateUserSession(userId: string, domain: string): Promise<SessionData> {
    return this.execute('getOrCreateUserSession', async (client) => {

      // CRITICAL: Validate required parameters - NO DEFENSIVE FALLBACKS
      // We want errors to surface immediately, not silently fail
      if (!userId) {
        throw new Error('User ID is required for session creation')
      }

      if (!domain) {
        throw new Error('Domain is required for session creation')
      }

      // STEP 1: Check for ANY existing session (not just active)
      // This prevents constraint violations by finding all sessions
      const { data: existing } = await client
        .from('company_intelligence_sessions')
        .select('*')
        .eq('domain', domain)
        .eq('user_id', userId)
        .maybeSingle()  // Returns null if not found, no error

      if (existing) {
        // STEP 2: Handle existing sessions

        // Case A: Session exists but is not active - reactivate it
        // This handles scenarios where sessions were aborted/failed/completed
        if (existing.status !== 'active') {
          this.log.info('Reactivating existing session', {
            sessionId: existing.id,
            domain,
            userId,
            previousStatus: existing.status
          })

          const { data: updated, error } = await client
            .from('company_intelligence_sessions')
            .update({
              status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id)
            .select()
            .single()

          if (error) {
            // CLAUDE.md: Convert Supabase error properly
            const jsError = convertSupabaseError(error)
            this.log.captureError(jsError, {
              message: 'Failed to reactivate session',
              sessionId: existing.id,
              domain,
              userId
            })
            throw jsError
          }

          return updated as SessionData
        }

        // Case B: Session is already active - return it as-is
        this.log.info('Found existing active session for user', {
          sessionId: existing.id,
          domain,
          userId
        })
        return existing as SessionData
      }

      // STEP 3: No existing session - create new one
      // Auto-generate company name from domain for convenience
      const companyName = domain.split('.')[0]
        .replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())

      const { data, error } = await client
        .from('company_intelligence_sessions')
        .insert({
          user_id: userId,
          company_name: companyName,
          domain,
          status: 'active',
          phase: 1,
          version: 0,
          merged_data: {},
          execution_history: []
          // NOTE: id is auto-generated by PostgreSQL using gen_random_uuid()
          // NEVER generate UUIDs in application code
        })
        .select()
        .single()

      if (error) {
        // STEP 4: Handle race conditions gracefully
        // Another request may have created a session between our check and insert

        // PostgreSQL unique constraint violation code is '23505'
        // This is EXPECTED in concurrent scenarios and not an error
        // Note: We check the raw error code before conversion
        if (error.code === '23505') {
          this.log.info('Session already exists (race condition resolved)', {
            domain,
            userId,
            errorCode: error.code
          })

          // Try to fetch the session that was created by the other request
          const { data: existingSession } = await client
            .from('company_intelligence_sessions')
            .select('*')
            .eq('domain', domain)
            .eq('user_id', userId)
            .eq('status', 'active')
            .maybeSingle()

          if (existingSession) {
            this.log.info('Returning existing session after duplicate key violation', {
              sessionId: existingSession.id,
              domain,
              userId
            })
            return existingSession as SessionData
          }
        }

        // STEP 5: Genuine error - not a race condition
        // CLAUDE.md: Convert Supabase error properly
        const jsError = convertSupabaseError(error)
        this.log.captureError(jsError, {
          message: 'Failed to create session',
          domain,
          userId,
          errorCode: error.code
        })
        throw jsError
      }

      // Success - new session created
      this.log.info('Created new session for user', {
        sessionId: data.id,
        domain,
        userId
      })

      return data as SessionData
    })
  }

  /**
   * Get session by ID
   *
   * @param sessionId - UUID of the session
   * @returns Promise<SessionData> Session data
   * @throws Error if session not found
   */
  async getSession(sessionId: string): Promise<SessionData> {
    return this.execute('getSession', async (client) => {
      const { data, error } = await client
        .from('company_intelligence_sessions')
        .select('*')
        .eq('id', sessionId)
        .maybeSingle()

      if (error) {
        throw new Error(`Failed to retrieve session: ${error.message}`)
      }

      if (!data) {
        throw new Error(`Session not found: ${sessionId}`)
      }

      return data as SessionData
    })
  }

  /**
   * Update session with partial data
   * Only updates provided fields, leaves others unchanged
   *
   * @param sessionId - UUID of the session
   * @param updates - Partial session data to update
   */
  async updateSession(sessionId: string, updates: Partial<SessionData>): Promise<void> {
    return this.execute('updateSession', async (client) => {
      // Always update the updated_at timestamp
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      }

      const { error } = await client
        .from('company_intelligence_sessions')
        .update(updateData)
        .eq('id', sessionId)

      if (error) {
        throw new Error(`Failed to update session: ${error.message}`)
      }

      this.log.info('Session updated', {
        sessionId,
        updatedFields: Object.keys(updates)
      })
    })
  }

  /**
   * List all sessions for the current user
   *
   * @returns Promise<SessionData[]> Array of user's sessions
   */
  async listUserSessions(): Promise<SessionData[]> {
    return this.execute('listUserSessions', async (client) => {
      const user = await this.getCurrentUser()

      const { data, error } = await client
        .from('company_intelligence_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to list sessions: ${error.message}`)
      }

      // CRITICAL: No fallback arrays - data must exist (CLAUDE.md requirement)
      if (!data || data.length === 0) {
        // Empty array is valid - user may have no sessions
        return [] as SessionData[]
      }
      return data as SessionData[]
    })
  }


  /**
   * Update merged data for a session
   * This contains all aggregated intelligence data
   *
   * @param sessionId - UUID of the session
   * @param data - Merged intelligence data (JSONB)
   */
  async updateMergedData(sessionId: string, data: any): Promise<void> {
    return this.execute('updateMergedData', async (client) => {
      const { error } = await client
        .from('company_intelligence_sessions')
        .update({
          merged_data: data,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)

      if (error) {
        throw new Error(`Failed to update merged data: ${error.message}`)
      }

      this.log.info('Merged data updated', {
        sessionId,
        dataKeys: Object.keys(data || {})
      })
    })
  }

  /**
   * Update session phase (1-5 for discovery phases)
   *
   * @param sessionId - UUID of the session
   * @param phase - Phase number (1-5)
   */
  async updateSessionPhase(sessionId: string, phase: number): Promise<void> {
    return this.execute('updateSessionPhase', async (client) => {
      const { error } = await client
        .from('company_intelligence_sessions')
        .update({
          phase,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)

      if (error) {
        throw new Error(`Failed to update phase: ${error.message}`)
      }

      this.log.info('Session phase updated', {
        sessionId,
        phase
      })
    })
  }

  // ==========================================
  // LOCK OPERATIONS (Concurrency control)
  // ==========================================

  /**
   * Acquire execution lock for a session
   * Prevents concurrent operations on same session
   *
   * @param sessionId - UUID of the session
   * @param lockId - Unique identifier for this lock attempt
   * @returns Promise<boolean> True if lock acquired, false if already locked
   */
  async acquireLock(sessionId: string, lockId: string): Promise<boolean> {
    return this.execute('acquireLock', async (client) => {
      // Try to insert lock record
      const { data, error } = await client
        .from('execution_locks')
        .insert({
          session_id: sessionId,
          lock_key: lockId,  // Changed from lock_id to lock_key (actual column name)
          scraper_id: 'unified_executor',  // Required field
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()  // 5 minute expiry
        })
        .select()
        .single()

      // If unique constraint violation, session is already locked
      if (error && this.isUniqueViolation(error)) {
        this.log.info('Lock already exists', {
          sessionId,
          lockId
        })
        return false
      }

      if (error) {
        throw new Error(`Failed to acquire lock: ${error.message}`)
      }

      // Also update session with lock ID for tracking
      await client
        .from('company_intelligence_sessions')
        .update({
          last_lock_id: lockId,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)

      this.log.info('Lock acquired', {
        sessionId,
        lockId
      })

      return true
    })
  }

  /**
   * Release execution lock for a session
   *
   * @param sessionId - UUID of the session
   * @param lockId - Lock ID to release (must match current lock)
   */
  async releaseLock(sessionId: string, lockId: string): Promise<void> {
    return this.execute('releaseLock', async (client) => {
      const { error } = await client
        .from('execution_locks')
        .delete()
        .eq('session_id', sessionId)
        .eq('lock_key', lockId)  // Changed from lock_id to lock_key (actual column name)

      if (error) {
        throw new Error(`Failed to release lock: ${error.message}`)
      }

      this.log.info('Lock released', {
        sessionId,
        lockId
      })
    })
  }

  /**
   * Check if session is locked
   *
   * @param sessionId - UUID of the session
   * @returns Promise<LockStatus> Lock status information
   */
  async checkLock(sessionId: string): Promise<LockStatus> {
    return this.execute('checkLock', async (client) => {
      const { data, error } = await client
        .from('execution_locks')
        .select('*')
        .eq('session_id', sessionId)
        .single()

      // No lock found (error from single() when no rows)
      if (error && error.code === 'PGRST116') {
        return {
          isLocked: false,
          sessionId
        }
      }

      if (error) {
        throw new Error(`Failed to check lock: ${error.message}`)
      }

      return {
        isLocked: true,
        lockId: data.lock_id,
        lockedAt: data.locked_at,
        sessionId
      }
    })
  }

  // ==========================================
  // PACK OPERATIONS (Data storage)
  // ==========================================

  /**
   * Create intelligence pack (stores analysis results)
   *
   * @param sessionId - UUID of the session
   * @param packData - Analysis results to store
   * @param packType - Type of pack (e.g., 'analysis', 'report')
   * @returns Promise<string> Created pack ID
   */
  async createPack(sessionId: string, packData: any, packType: string = 'analysis'): Promise<string> {
    return this.execute('createPack', async (client) => {
      const { data, error } = await client
        .from('company_intelligence_pack')
        .insert({
          session_id: sessionId,
          pack_data: packData,
          pack_type: packType
          // id is auto-generated by Supabase
        })
        .select('id')
        .single()

      if (error) {
        throw new Error(`Failed to create pack: ${error.message}`)
      }

      this.log.info('Pack created', {
        packId: data.id,
        sessionId,
        packType
      })

      return data.id
    })
  }

  /**
   * Get pack by ID
   *
   * @param packId - UUID of the pack
   * @returns Promise<PackData> Pack data
   */
  async getPack(packId: string): Promise<PackData> {
    return this.execute('getPack', async (client) => {
      const { data, error } = await client
        .from('company_intelligence_pack')
        .select('*')
        .eq('id', packId)
        .single()

      if (error) {
        throw new Error(`Pack not found: ${error.message}`)
      }

      return data as PackData
    })
  }

  /**
   * List all packs for a session
   *
   * @param sessionId - UUID of the session
   * @returns Promise<PackData[]> Array of packs
   */
  async listSessionPacks(sessionId: string): Promise<PackData[]> {
    return this.execute('listSessionPacks', async (client) => {
      const { data, error } = await client
        .from('company_intelligence_pack')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to list packs: ${error.message}`)
      }

      // CRITICAL: No fallback arrays - data must exist (CLAUDE.md requirement)
      if (!data || data.length === 0) {
        // Empty array is valid - session may have no packs
        return [] as PackData[]
      }
      return data as PackData[]
    })
  }

  // ==========================================
  // INTELLIGENCE OPERATIONS (Data enrichment)
  // ==========================================

  /**
   * Store page intelligence data
   *
   * @param sessionId - UUID of the session
   * @param pageData - Page analysis data
   */
  async storePageIntelligence(sessionId: string, pageData: Partial<PageIntelligence>): Promise<void> {
    return this.execute('storePageIntelligence', async (client) => {
      const { error } = await client
        .from('page_intelligence')
        .upsert({
          ...pageData,
          session_id: sessionId
        })

      if (error) {
        throw new Error(`Failed to store page intelligence: ${error.message}`)
      }

      this.log.info('Page intelligence stored', {
        sessionId,
        url: pageData.url
      })
    })
  }

  /**
   * Get all page intelligence for a session
   *
   * @param sessionId - UUID of the session
   * @returns Promise<PageIntelligence[]> Array of page intelligence data
   */
  async getPageIntelligence(sessionId: string): Promise<PageIntelligence[]> {
    return this.execute('getPageIntelligence', async (client) => {
      const { data, error } = await client
        .from('page_intelligence')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to get page intelligence: ${error.message}`)
      }

      // CRITICAL: No fallback arrays - data must exist (CLAUDE.md requirement)
      if (!data || data.length === 0) {
        // Empty array is valid - session may have no page intelligence yet
        return [] as PageIntelligence[]
      }
      return data as PageIntelligence[]
    })
  }

  /**
   * Store financial data for a company
   *
   * @param sessionId - UUID of the session
   * @param data - Financial intelligence data
   */
  async storeFinancialData(sessionId: string, data: any): Promise<void> {
    return this.execute('storeFinancialData', async (client) => {
      const { error } = await client
        .from('company_financial_data')
        .upsert({
          session_id: sessionId,
          ...data
        })

      if (error) {
        throw new Error(`Failed to store financial data: ${error.message}`)
      }

      this.log.info('Financial data stored', {
        sessionId,
        dataKeys: Object.keys(data)
      })
    })
  }

  /**
   * Store social media profiles
   *
   * @param sessionId - UUID of the session
   * @param profiles - Social media profile data
   */
  async storeSocialProfiles(sessionId: string, profiles: any): Promise<void> {
    return this.execute('storeSocialProfiles', async (client) => {
      const { error } = await client
        .from('company_social_profiles')
        .upsert({
          session_id: sessionId,
          ...profiles
        })

      if (error) {
        throw new Error(`Failed to store social profiles: ${error.message}`)
      }

      this.log.info('Social profiles stored', {
        sessionId,
        platforms: Object.keys(profiles)
      })
    })
  }

  /**
   * Store LinkedIn data
   *
   * @param sessionId - UUID of the session
   * @param data - LinkedIn company/employee data
   */
  async storeLinkedInData(sessionId: string, data: any): Promise<void> {
    return this.execute('storeLinkedInData', async (client) => {
      const { error } = await client
        .from('company_linkedin_data')
        .upsert({
          session_id: sessionId,
          ...data
        })

      if (error) {
        throw new Error(`Failed to store LinkedIn data: ${error.message}`)
      }

      this.log.info('LinkedIn data stored', {
        sessionId,
        employeeCount: data.employee_count
      })
    })
  }

  /**
   * Get external intelligence summary
   *
   * @param sessionId - UUID of the session
   * @returns Promise<any> External intelligence data
   */
  async getExternalIntelligence(sessionId: string): Promise<any> {
    return this.execute('getExternalIntelligence', async (client) => {
      const { data, error } = await client
        .from('external_intelligence_summary')
        .select('*')
        .eq('session_id', sessionId)
        .single()

      if (error && error.code !== 'PGRST116') { // Ignore not found
        throw new Error(`Failed to get external intelligence: ${error.message}`)
      }

      return data || null
    })
  }

  // ==========================================
  // PHASE DATA OPERATIONS (Stage management)
  // ==========================================

  /**
   * Save phase data for a specific stage
   * Delegates to PhaseDataRepository for DRY/SOLID compliance
   *
   * @param sessionId - UUID of the session
   * @param stage - Stage number (e.g., 'stage1', 'stage2')
   * @param data - Phase data to save
   */
  async savePhaseData(sessionId: string, stage: string, data: any): Promise<void> {
    // Delegate to PhaseDataRepository to avoid duplication
    return this.phaseDataRepo.savePhaseData(sessionId, stage, data)
  }

  /**
   * Get phase data for a specific stage
   * Delegates to PhaseDataRepository for DRY/SOLID compliance
   *
   * @param sessionId - UUID of the session
   * @param stage - Stage number (e.g., 'stage1', 'stage2')
   * @returns Promise<any> Phase data or null if not found
   */
  async getPhaseData(sessionId: string, stage: string): Promise<any> {
    // Delegate to PhaseDataRepository to avoid duplication
    return this.phaseDataRepo.getPhaseData(sessionId, stage)
  }

  /**
   * Get all phase data for a session
   * Delegates to PhaseDataRepository for DRY/SOLID compliance
   *
   * @param sessionId - UUID of the session
   * @returns Promise<Record<string, any>> All phase data
   */
  async getAllPhaseData(sessionId: string): Promise<Record<string, any>> {
    // Delegate to PhaseDataRepository to avoid duplication
    return this.phaseDataRepo.getAllPhaseData(sessionId)
  }

  /**
   * Delete phase data for a specific stage
   * Delegates to PhaseDataRepository for DRY/SOLID compliance
   *
   * @param sessionId - UUID of the session
   * @param stage - Stage to delete
   */
  async deletePhaseData(sessionId: string, stage: string): Promise<void> {
    // Delegate to PhaseDataRepository to avoid duplication
    return this.phaseDataRepo.deletePhaseData(sessionId, stage)
  }

  /**
   * Cleanup old phase data (sliding window)
   * Keeps only the specified number of most recent stages
   *
   * @param sessionId - UUID of the session
   * @param keepStages - Number of stages to keep (default 2)
   */
  async cleanupOldPhaseData(sessionId: string, keepStages: number = 2): Promise<void> {
    // Delegate to PhaseDataRepository for SOLID principle compliance
    return this.phaseDataRepo.cleanupOldPhaseData(sessionId, keepStages)
  }


  // ==========================================
  // CACHE OPERATIONS (Performance optimization)
  // ==========================================

  /**
   * Get data from cache
   *
   * @param key - Cache key
   * @returns Cached data or null if not found/expired
   */
  private getCache(key: string): any | null {
    const cached = this.cache.get(key)

    if (!cached) {
      return null
    }

    // Check if cache is expired
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key)
      return null
    }

    return cached.data
  }

  /**
   * Set data in cache
   *
   * @param key - Cache key
   * @param data - Data to cache
   */
  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  /**
   * Clear all cache entries for a session
   *
   * @param sessionId - UUID of the session
   */
  clearSessionCache(sessionId: string): void {
    // Clear session cache
    this.sessionCache.clearPattern(sessionId)
    // Also clear phase data cache
    this.phaseDataRepo.clearSessionCache(sessionId)

    this.log.info('Session cache cleared', {
      sessionId
    })
  }

  // DEPRECATED - Old implementation
  clearSessionCache_OLD(sessionId: string): void {
    const keysToDelete: string[] = []

    for (const key of this.cache.keys()) {
      if (key.includes(sessionId)) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key))

    this.log.info('Session cache cleared', {
      sessionId,
      clearedKeys: keysToDelete.length
    })
  }

  /**
   * Clear entire cache
   */
  clearAllCache(): void {
    // Clear all caches
    this.sessionCache.clear()
    this.phaseDataRepo.clearAllCache()

    this.log.info('All cache cleared')
  }


  // ==========================================
  // BULK OPERATIONS (Performance optimisation)
  // ==========================================

  /**
   * Bulk insert multiple pages at once
   * More efficient than individual inserts
   *
   * @param sessionId - UUID of the session
   * @param pages - Array of page data to insert
   */
  async bulkInsertPages(sessionId: string, pages: any[]): Promise<void> {
    return this.execute('bulkInsertPages', async (client) => {
      // Add session_id to all pages
      const pagesWithSession = pages.map(page => ({
        ...page,
        session_id: sessionId
      }))

      const { error } = await client
        .from('page_intelligence')
        .insert(pagesWithSession)

      if (error) {
        throw new Error(`Failed to bulk insert pages: ${error.message}`)
      }

      this.log.info('Pages bulk inserted', {
        sessionId,
        pageCount: pages.length
      })
    })
  }

  /**
   * Clean up old sessions
   * Removes sessions older than specified days
   *
   * @param daysOld - Number of days to keep sessions
   * @returns Promise<number> Number of sessions deleted
   */
  async cleanupOldSessions(daysOld: number = 30): Promise<number> {
    return this.execute('cleanupOldSessions', async (client) => {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)

      const { data, error } = await client
        .from('company_intelligence_sessions')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .select('id')

      if (error) {
        throw new Error(`Failed to cleanup sessions: ${error.message}`)
      }

      const deletedCount = data?.length || 0

      this.log.info('Old sessions cleaned up', {
        deletedCount,
        daysOld,
        cutoffDate: cutoffDate.toISOString()
      })

      return deletedCount
    })
  }

  /**
   * Abort a session and update its status
   * Used when user cancels an in-progress intelligence gathering
   *
   * @param sessionId - UUID of the session to abort
   * @returns void
   * @throws Error if abort fails
   */
  async abortSession(sessionId: string): Promise<void> {
    return this.execute('abortSession', async (client) => {
      permanentLogger.breadcrumb('database', 'Aborting session', { sessionId })

      // First check if session exists and is owned by user
      const { data: session, error: fetchError } = await client
        .from('company_intelligence_sessions')
        .select('id, status, user_id')
        .eq('id', sessionId)
        .single()

      if (fetchError || !session) {
        throw new Error(`Session not found: ${sessionId}`)
      }

      // Update session status to aborted
      const { error } = await client
        .from('company_intelligence_sessions')
        .update({
          status: 'aborted',
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)

      if (error) {
        throw new Error(`Failed to abort session: ${error.message}`)
      }

      // Clear cache for this session
      this.sessionCache.delete(sessionId)
      this.phaseDataRepo.clearSessionCache(sessionId)

      permanentLogger.info('CI_REPOSITORY', 'Session aborted successfully', {
        sessionId
      })
    })
  }

  /**
   * Recover a failed or aborted session
   * Attempts to restore session to last known good state
   *
   * @param sessionId - UUID of the session to recover
   * @returns SessionData - The recovered session
   * @throws Error if recovery fails
   */
  async recoverSession(sessionId: string): Promise<SessionData> {
    return this.execute('recoverSession', async (client) => {
      permanentLogger.breadcrumb('database', 'Recovering session', { sessionId })

      // Get current session state
      const { data: session, error: fetchError } = await client
        .from('company_intelligence_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (fetchError || !session) {
        throw new Error(`Session not found for recovery: ${sessionId}`)
      }

      // Only recover if session is in recoverable state
      if (session.status === 'completed') {
        permanentLogger.info('CI_REPOSITORY', 'Session already completed, no recovery needed', {
          sessionId
        })
        return session as SessionData
      }

      // Update session to active status for recovery
      const { data: recovered, error } = await client
        .from('company_intelligence_sessions')
        .update({
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to recover session: ${error.message}`)
      }

      // Update cache with recovered session
      this.sessionCache.set(sessionId, recovered as SessionData)

      permanentLogger.info('CI_REPOSITORY', 'Session recovered successfully', {
        sessionId,
        previousStatus: session.status,
        currentPhase: recovered.phase
      })

      return recovered as SessionData
    })
  }

  /**
   * Get logs for a specific session
   * Retrieves permanent logs associated with the session
   *
   * @param sessionId - UUID of the session
   * @param limit - Maximum number of logs to return (default: 100)
   * @returns Array of log entries
   */
  async getSessionLogs(sessionId: string, limit: number = 100): Promise<any[]> {
    return this.execute('getSessionLogs', async (client) => {
      permanentLogger.breadcrumb('database', 'Fetching session logs', {
        sessionId,
        limit
      })

      // Query permanent_logs table for this session
      const { data: logs, error } = await client
        .from('permanent_logs')
        .select('*')
        .or(`data->>'sessionId'.eq.${sessionId},data->>'session_id'.eq.${sessionId}`)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        throw new Error(`Failed to fetch session logs: ${error.message}`)
      }

      permanentLogger.info('CI_REPOSITORY', 'Session logs retrieved', {
        sessionId,
        logCount: logs?.length || 0
      })

      return logs || []
    })
  }
}