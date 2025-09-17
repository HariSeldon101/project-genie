/**
 * Phase Data Repository - Manages stage data for company intelligence sessions
 *
 * Purpose (for technical PMs):
 * - Handles all phase/stage data operations
 * - Implements sliding window pattern to limit memory usage
 * - Stores stage data in merged_data field of sessions
 * - Provides cleanup mechanisms for memory management
 *
 * SOLID Principle: Single Responsibility - Only handles phase data
 * DRY Principle: Centralized phase data logic
 *
 * @module phase-data-repository
 */

import { BaseRepository } from './base-repository'
import { CacheManager } from './cache-manager'
import { permanentLogger } from '@/lib/utils/permanent-logger'

/**
 * Phase Data Repository Class
 *
 * Manages phase/stage data with sliding window pattern
 * Prevents memory issues by keeping only recent stages
 *
 * Key Features:
 * - Sliding window (max 2 stages in memory)
 * - Automatic cleanup of old stages
 * - Cached retrieval for performance
 * - No fallback data (throws errors on missing data)
 */
export class PhaseDataRepository extends BaseRepository {
  private static instance: PhaseDataRepository
  private cache: CacheManager<any>

  /**
   * Maximum stages to keep in memory/database
   * Prevents unbounded growth that was causing browser freezes
   */
  private readonly MAX_STAGES_IN_MEMORY = 2

  constructor() {
    super()
    // 5-minute cache for phase data
    this.cache = new CacheManager(5)
  }

  /**
   * Get singleton instance
   * Ensures single database connection pool
   */
  static getInstance(): PhaseDataRepository {
    if (!this.instance) {
      this.instance = new PhaseDataRepository()
    }
    return this.instance
  }

  /**
   * Save phase data for a specific stage
   *
   * Technical Details:
   * - Stores in merged_data field of session
   * - Updates cache after save
   * - No fallback values allowed
   *
   * @param sessionId - UUID of the session
   * @param stage - Stage identifier (e.g., 'stage1', 'stage2')
   * @param data - Phase data to save
   * @throws Error if save fails
   */
  async savePhaseData(sessionId: string, stage: string, data: any): Promise<void> {
    const cacheKey = `phase_${sessionId}_${stage}`

    // Add timing for performance monitoring
    const timer = permanentLogger.timing('save-phase-data', {
      sessionId,
      stage
    })

    return this.execute('savePhaseData', async (client) => {
      permanentLogger.breadcrumb('database', 'Saving phase data', {
        sessionId,
        stage,
        dataSize: JSON.stringify(data).length
      })

      // Fetch current session to get merged_data
      const { data: session, error: fetchError } = await client
        .from('company_intelligence_sessions')
        .select('merged_data')
        .eq('id', sessionId)
        .single()

      if (fetchError) {
        throw new Error(`Failed to fetch session for phase data: ${fetchError.message}`)
      }

      // CRITICAL: Initialize merged_data if null (first save)
      // Using ?? instead of || to avoid issues with falsy values
      const mergedData = session?.merged_data ?? {}

      // Add new stage data
      mergedData[stage] = data

      // Update session with new merged_data
      const { error } = await client
        .from('company_intelligence_sessions')
        .update({
          merged_data: mergedData,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)

      if (error) {
        throw new Error(`Failed to save phase data: ${error.message}`)
      }

      // Update cache after successful save
      this.cache.set(cacheKey, data)

      // Stop timer and log
      const duration = timer.stop()
      permanentLogger.info('PHASE_DATA_REPO', 'Phase data saved', {
        sessionId,
        stage,
        duration,
        dataSize: JSON.stringify(data).length
      })
    })
  }

  /**
   * Get phase data for a specific stage
   *
   * Technical Details:
   * - Checks cache first for performance
   * - Falls back to database if not cached
   * - Throws error if no data found (no fallback)
   *
   * @param sessionId - UUID of the session
   * @param stage - Stage identifier
   * @returns Phase data for the stage
   * @throws Error if stage data not found
   */
  async getPhaseData(sessionId: string, stage: string): Promise<any> {
    const cacheKey = `phase_${sessionId}_${stage}`

    // Check cache first
    const cached = this.cache.get(cacheKey)
    if (cached !== null) {
      permanentLogger.debug('PHASE_DATA_REPO', 'Phase data retrieved from cache', {
        sessionId,
        stage
      })
      return cached
    }

    return this.execute('getPhaseData', async (client) => {
      permanentLogger.breadcrumb('database', 'Fetching phase data', {
        sessionId,
        stage
      })

      const { data, error } = await client
        .from('company_intelligence_sessions')
        .select('merged_data')
        .eq('id', sessionId)
        .single()

      if (error) {
        throw new Error(`Failed to get phase data: ${error.message}`)
      }

      // CRITICAL: No fallback - throw if stage not found
      const phaseData = data?.merged_data?.[stage]

      if (phaseData === undefined) {
        throw new Error(`No phase data found for stage ${stage} in session ${sessionId}`)
      }

      // Update cache for next retrieval
      if (phaseData !== null) {
        this.cache.set(cacheKey, phaseData)
      }

      return phaseData
    })
  }

  /**
   * Get all phase data for a session
   *
   * @param sessionId - UUID of the session
   * @returns All phase data as object
   * @throws Error if no data found
   */
  async getAllPhaseData(sessionId: string): Promise<Record<string, any>> {
    return this.execute('getAllPhaseData', async (client) => {
      permanentLogger.breadcrumb('database', 'Fetching all phase data', {
        sessionId
      })

      const { data, error } = await client
        .from('company_intelligence_sessions')
        .select('merged_data')
        .eq('id', sessionId)
        .single()

      if (error) {
        throw new Error(`Failed to get all phase data: ${error.message}`)
      }

      // CRITICAL: No fallback - throw if no data
      if (!data?.merged_data) {
        throw new Error(`No phase data found for session ${sessionId}`)
      }

      return data.merged_data
    })
  }

  /**
   * Delete phase data for a specific stage
   *
   * Used for cleanup and memory management
   *
   * @param sessionId - UUID of the session
   * @param stage - Stage to delete
   */
  async deletePhaseData(sessionId: string, stage: string): Promise<void> {
    const cacheKey = `phase_${sessionId}_${stage}`

    return this.execute('deletePhaseData', async (client) => {
      permanentLogger.breadcrumb('database', 'Deleting phase data', {
        sessionId,
        stage
      })

      // Fetch current merged_data
      const { data: session, error: fetchError } = await client
        .from('company_intelligence_sessions')
        .select('merged_data')
        .eq('id', sessionId)
        .single()

      if (fetchError) {
        throw new Error(`Failed to fetch session for phase deletion: ${fetchError.message}`)
      }

      const mergedData = session?.merged_data ?? {}

      // Remove the stage
      delete mergedData[stage]

      // Update session
      const { error } = await client
        .from('company_intelligence_sessions')
        .update({
          merged_data: mergedData,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)

      if (error) {
        throw new Error(`Failed to delete phase data: ${error.message}`)
      }

      // Clear from cache
      this.cache.delete(cacheKey)

      permanentLogger.info('PHASE_DATA_REPO', 'Phase data deleted', {
        sessionId,
        stage
      })
    })
  }

  /**
   * Cleanup old phase data (sliding window implementation)
   *
   * CRITICAL: This prevents memory issues by keeping only recent stages
   * Solves the browser freeze problem from unbounded sessionStorage
   *
   * @param sessionId - UUID of the session
   * @param keepStages - Number of stages to keep (default: 2)
   */
  async cleanupOldPhaseData(sessionId: string, keepStages: number = 2): Promise<void> {
    return this.execute('cleanupOldPhaseData', async (client) => {
      permanentLogger.breadcrumb('database', 'Cleaning up old phase data', {
        sessionId,
        keepStages
      })

      // Get current merged_data
      const { data, error } = await client
        .from('company_intelligence_sessions')
        .select('merged_data')
        .eq('id', sessionId)
        .single()

      if (error) {
        throw new Error(`Failed to get session for cleanup: ${error.message}`)
      }

      const mergedData = data?.merged_data ?? {}

      // Find all stage keys and sort by stage number
      const stageKeys = Object.keys(mergedData)
        .filter(key => key.startsWith('stage'))
        .sort((a, b) => {
          const numA = parseInt(a.replace(/\D/g, '') || '0')
          const numB = parseInt(b.replace(/\D/g, '') || '0')
          return numB - numA // Sort descending (newest first)
        })

      // If we have more stages than allowed, remove oldest
      if (stageKeys.length > keepStages) {
        const stagesToDelete = stageKeys.slice(keepStages)

        permanentLogger.info('PHASE_DATA_REPO', 'Removing old stages', {
          sessionId,
          stagesToDelete,
          keptStages: stageKeys.slice(0, keepStages)
        })

        // Remove old stages from merged_data
        for (const stage of stagesToDelete) {
          delete mergedData[stage]
          // Clear from cache
          this.cache.delete(`phase_${sessionId}_${stage}`)
        }

        // Update session with cleaned data
        const { error: updateError } = await client
          .from('company_intelligence_sessions')
          .update({
            merged_data: mergedData,
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId)

        if (updateError) {
          throw new Error(`Failed to cleanup old phase data: ${updateError.message}`)
        }

        permanentLogger.info('PHASE_DATA_REPO', 'Old phase data cleaned up', {
          sessionId,
          deletedCount: stagesToDelete.length,
          remainingStages: keepStages
        })
      }
    })
  }

  /**
   * Clear all cache entries for a session
   *
   * @param sessionId - UUID of the session
   */
  clearSessionCache(sessionId: string): void {
    this.cache.clearPattern(sessionId)

    permanentLogger.info('PHASE_DATA_REPO', 'Session cache cleared', {
      sessionId
    })
  }

  /**
   * Clear entire cache
   * Used for major data changes or testing
   */
  clearAllCache(): void {
    this.cache.clear()
    permanentLogger.info('PHASE_DATA_REPO', 'All cache cleared')
  }
}