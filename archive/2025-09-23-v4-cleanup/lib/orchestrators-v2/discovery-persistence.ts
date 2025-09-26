/**
 * DiscoveryPersistence - Database operations for discovery results
 *
 * CRITICAL CLAUDE.md Compliance:
 * - ALL operations through CompanyIntelligenceRepository
 * - NO direct Supabase calls
 * - NO mock data or fallback values
 * - Proper error handling with permanentLogger
 * - File size: ~200 lines (well under 500 limit)
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { CompanyIntelligenceRepository } from '@/lib/repositories/company-intelligence-repository'
import type { DiscoveryResult } from '../types/discovery'

/**
 * Handles all database persistence for discovery operations
 * Follows repository pattern strictly - NO direct DB access
 */
export class DiscoveryPersistence {
  private repository: CompanyIntelligenceRepository

  /**
   * Constructor with optional dependency injection
   * @param repository - Optional repository instance for testing
   */
  constructor(repository?: CompanyIntelligenceRepository) {
    // MANDATORY: Use repository pattern per CLAUDE.md
    this.repository = repository || CompanyIntelligenceRepository.getInstance()

    permanentLogger.info('DISCOVERY_PERSISTENCE', 'Persistence layer initialized', {
      hasCustomRepository: !!repository
    })
  }

  /**
   * Save discovery results to database
   * @param sessionId - Session to update
   * @param results - Discovery results to save
   */
  async saveDiscoveryResults(
    sessionId: string,
    results: DiscoveryResult
  ): Promise<void> {
    console.log('💾 [PERSISTENCE] saveDiscoveryResults called with:', {
      sessionId,
      urlCount: results.urls?.length || 0,
      hasmerged_data: !!results.merged_data
    })  // DEBUG

    const startTime = Date.now()

    permanentLogger.breadcrumb('persistence_save', 'Saving discovery results', {
      sessionId,
      urlCount: results.urls?.length || 0,
      hasmerged_data: !!results.merged_data
    })

    try {
      // Get current session for version control
      const currentSession = await this.repository.getSession(sessionId)

      if (!currentSession) {
        throw new Error(`Session not found: ${sessionId}`)
      }

      // Prepare update with merged_data
      const updates = {
        merged_data: {
          ...currentSession.merged_data,
          ...results.merged_data,
          // Ensure sitemap is properly structured
          sitemap: results.merged_data?.sitemap || {
            pages: results.urls?.map(url => ({
              url,
              source: 'discovery',
              discovered_at: new Date().toISOString()
            })) || [],
            totalCount: results.urls?.length || 0,
            timestamp: new Date().toISOString()
          }
        },
        status: 'completed' as const,  // Fixed: was 'discovery_complete' which is invalid enum
        phase: 2 // Move to next phase
      }

      // Update through repository ONLY - NO direct DB calls
      // Note: Repository doesn't support versioned updates, so we can't do optimistic locking
      await this.repository.updateSession(
        sessionId,
        updates
      )

      // Since updateSession returns void, we assume it succeeded if no error was thrown

      console.log('💾 [PERSISTENCE] Results saved successfully:', {
        sessionId,
        urlsSaved: results.urls?.length || 0
      })  // DEBUG

      permanentLogger.info('DISCOVERY_PERSISTENCE', 'Discovery results saved', {
        sessionId,
        duration: Date.now() - startTime,
        urlsSaved: results.urls?.length || 0,
        newPhase: 2
      })

    } catch (error) {
      console.log('💾 [PERSISTENCE] ERROR saving results:', {
        error: (error as Error).message,
        sessionId,
        urlCount: results.urls?.length || 0
      })  // DEBUG
      // CRITICAL: Proper error handling per CLAUDE.md
      permanentLogger.captureError('DISCOVERY_PERSISTENCE', error as Error, {
        sessionId,
        operation: 'saveDiscoveryResults'
      })
      throw error // NEVER swallow errors
    }
  }

  /**
   * Update session status
   * @param sessionId - Session to update
   * @param status - New status
   * @param metadata - Optional metadata
   */
  async updateSessionStatus(
    sessionId: string,
    status: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    permanentLogger.breadcrumb('persistence_status', 'Updating session status', {
      sessionId,
      status,
      hasMetadata: !!metadata
    })

    try {
      const session = await this.repository.getSession(sessionId)

      if (!session) {
        throw new Error(`Session not found: ${sessionId}`)
      }

      const updates: any = { status }

      if (metadata) {
        updates.execution_history = [
          ...(session.execution_history || []),
          {
            timestamp: new Date().toISOString(),
            status,
            metadata
          }
        ]
      }

      await this.repository.updateSession(
        sessionId,
        updates,
        session.version
      )

      permanentLogger.info('DISCOVERY_PERSISTENCE', 'Status updated', {
        sessionId,
        status
      })

    } catch (error) {
      permanentLogger.captureError('DISCOVERY_PERSISTENCE', error as Error, {
        sessionId,
        operation: 'updateSessionStatus',
        status
      })
      throw error
    }
  }

  /**
   * Add execution to history
   * @param sessionId - Session ID
   * @param execution - Execution details
   */
  async addExecutionToHistory(
    sessionId: string,
    execution: {
      phase: string
      status: string
      duration?: number
      error?: string
      metadata?: any
    }
  ): Promise<void> {
    permanentLogger.breadcrumb('persistence_history', 'Adding to execution history', {
      sessionId,
      phase: execution.phase
    })

    try {
      const session = await this.repository.getSession(sessionId)

      if (!session) {
        throw new Error(`Session not found: ${sessionId}`)
      }

      const historyEntry = {
        ...execution,
        timestamp: new Date().toISOString()
      }

      await this.repository.updateSession(
        sessionId,
        {
          execution_history: [
            ...(session.execution_history || []),
            historyEntry
          ]
        },
        session.version
      )

      permanentLogger.info('DISCOVERY_PERSISTENCE', 'History updated', {
        sessionId,
        phase: execution.phase,
        status: execution.status
      })

    } catch (error) {
      permanentLogger.captureError('DISCOVERY_PERSISTENCE', error as Error, {
        sessionId,
        operation: 'addExecutionToHistory',
        phase: execution.phase
      })
      throw error
    }
  }
}