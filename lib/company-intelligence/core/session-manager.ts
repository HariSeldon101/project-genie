/**
 * SessionManager - Bulletproof session management with database-first approach
 * 
 * What it does (like a 12-year-old would understand):
 * - Creates new research sessions (like starting a new notebook page)
 * - Loads existing sessions (like finding your old notebook)
 * - Updates session data (like adding notes to your page)
 * - Prevents duplicate sessions (like checking you don't have two notebooks for same thing)
 * 
 * Why we need it:
 * - REMOVES fragile in-memory caches that lose data on hot reload
 * - ENSURES data persists even if server restarts
 * - PREVENTS race conditions with optimistic locking
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { CompanyIntelligenceRepository } from '@/lib/repositories/company-intelligence-repository'
import { EnvironmentConfig } from '@/lib/config/environment'
import crypto from 'crypto'

export interface SessionData {
  id: string
  company_name: string
  domain: string
  status: string
  phase: number
  version: number
  discovered_urls?: any  // URLs discovered during sitemap phase (JSONB in database)
  merged_data: Map<string, any>
  execution_history: any[]
  created_at: string
  updated_at: string
  last_lock_id?: string
}

export class SessionManager {
  private logger = permanentLogger
  private repository = CompanyIntelligenceRepository.getInstance()

  /**
   * Create a new session in the database
   * @param companyName - The company name
   * @param domain - The company domain
   * @returns The created session
   */
  async createSession(companyName: string, domain: string): Promise<SessionData> {
    const startTime = Date.now()

    this.logger.breadcrumb('SESSION_MANAGER', 'Starting session creation', {
      companyName,
      domain
    })

    this.logger.info('SESSION_MANAGER', 'Creating new session', { companyName, domain })

    try {
      const sessionData = await this.repository.createSession(companyName, domain)

      this.logger.timing('session_creation_complete', {
        totalDuration: Date.now() - startTime,
        sessionId: sessionData.id
      })

      this.logger.info('Session created successfully', {
        sessionId: sessionData.id,
        duration: Date.now() - startTime
      })

      return this.convertToSessionData(sessionData)
    } catch (error) {
      this.logger.captureError('SESSION_MANAGER', error as Error, {
        operation: 'createSession',
        companyName,
        domain
      })
      throw error
    }
  }

  /**
   * Get an existing session by ID
   * @param sessionId - The session ID
   * @returns The session data or null if not found
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    const startTime = Date.now()

    this.logger.breadcrumb('SESSION_GET', 'Retrieving session', { sessionId })
    this.logger.info('Getting session', { sessionId })

    try {
      const session = await this.repository.getSession(sessionId)

      if (!session) {
        this.logger.breadcrumb('SESSION_GET', 'Session not found', { sessionId })
        this.logger.info('Session not found', { sessionId })
        return null
      }

      this.logger.timing('session_retrieval_complete', {
        totalDuration: Date.now() - startTime
      })

      this.logger.info('Session retrieved successfully', {
        sessionId,
        version: session.version,
        duration: Date.now() - startTime
      })

      return this.convertToSessionData(session)
    } catch (error) {
      this.logger.captureError('SESSION_MANAGER', error as Error, {
        operation: 'getSession',
        sessionId
      })
      throw error
    }
  }

  /**
   * Update session with optimistic locking and retry logic
   * @param sessionId - The session ID
   * @param updates - The updates to apply
   * @param expectedVersion - The expected version for optimistic locking
   * @returns The updated session or null if version mismatch after retries
   */
  async updateSession(
    sessionId: string,
    updates: Partial<SessionData>,
    expectedVersion: number
  ): Promise<SessionData | null> {
    const startTime = Date.now()

    this.logger.breadcrumb('SESSION_UPDATE', 'Starting session update', {
      sessionId,
      expectedVersion,
      updateKeys: Object.keys(updates)
    })

    this.logger.info('Updating session', { sessionId, expectedVersion })

    // Convert merged_data Map to plain object for JSONB storage
    const processedUpdates = { ...updates }

    if (processedUpdates.merged_data instanceof Map) {
      const mergedDataObj: Record<string, any> = {}
      processedUpdates.merged_data.forEach((value, key) => {
        mergedDataObj[key] = value
      })
      processedUpdates.merged_data = mergedDataObj as any

      this.logger.breadcrumb('DATA_CONVERSION', 'Converted Map to object for JSONB', {
        keys: Object.keys(mergedDataObj),
        dataSize: JSON.stringify(mergedDataObj).length
      })
    }

    // Ensure proper JSON serialization for nested objects
    if (processedUpdates.merged_data && typeof processedUpdates.merged_data === 'object') {
      try {
        // Deep clone and validate JSON serialization
        const serialized = JSON.stringify(processedUpdates.merged_data)
        processedUpdates.merged_data = JSON.parse(serialized)

        this.logger.breadcrumb('DATA_VALIDATION', 'Validated JSON serialization', {
          dataSize: serialized.length
        })
      } catch (serializeError) {
        this.logger.captureError('SESSION_MANAGER', new Error('Failed to serialize merged_data'), {
          error: serializeError,
          dataType: typeof processedUpdates.merged_data
        })
        throw new Error('Failed to serialize data for database storage')
      }
    }

    try {
      const updated = await this.repository.updateSession(
        sessionId,
        processedUpdates,
        expectedVersion
      )

      if (!updated) {
        this.logger.warn('Version mismatch during update', {
          sessionId,
          expectedVersion
        })
        return null
      }

      this.logger.timing('session_update_complete', {
        totalDuration: Date.now() - startTime,
        versionChange: `${expectedVersion} -> ${updated.version}`
      })

      this.logger.info('Session updated successfully', {
        sessionId,
        oldVersion: expectedVersion,
        newVersion: updated.version,
        duration: Date.now() - startTime
      })

      return this.convertToSessionData(updated)
    } catch (error) {
      this.logger.captureError('SESSION_MANAGER', error as Error, {
        operation: 'updateSession',
        sessionId,
        expectedVersion
      })
      throw error
    }
  }

  /**
   * Find session by domain
   * @param domain - The company domain
   * @returns The session data or null if not found
   */
  async findSessionByDomain(domain: string): Promise<SessionData | null> {
    const startTime = Date.now()

    this.logger.breadcrumb('SESSION_FIND', 'Finding session by domain', { domain })
    this.logger.info('Finding session by domain', { domain })

    try {
      const session = await this.repository.findSessionByDomain(domain)

      if (!session) {
        this.logger.breadcrumb('SESSION_FIND', 'No active session for domain', { domain })
        this.logger.info('No active session found for domain', { domain })
        return null
      }

      this.logger.timing('domain_search_complete', {
        totalDuration: Date.now() - startTime
      })

      this.logger.info('Session found by domain', {
        sessionId: session.id,
        domain,
        duration: Date.now() - startTime
      })

      return this.convertToSessionData(session)
    } catch (error) {
      this.logger.captureError('SESSION_MANAGER', error as Error, {
        operation: 'findSessionByDomain',
        domain
      })
      throw error
    }
  }

  /**
   * Add execution to history
   * @param sessionId - The session ID
   * @param execution - The execution details
   * @returns The updated session
   */
  async addExecutionToHistory(
    sessionId: string, 
    execution: any
  ): Promise<SessionData | null> {
    const startTime = Date.now()
    
    this.logger.breadcrumb('EXECUTION_HISTORY', 'Adding execution to history', { 
      sessionId,
      executionType: execution?.type 
    })
    
    this.logger.info('Adding execution to history', { sessionId })

    try {
      // Get current session
      this.logger.breadcrumb('EXECUTION_HISTORY', 'Fetching current session', { sessionId })
      
      const session = await this.getSession(sessionId)
      this.logger.timing('current_session_fetched', { found: !!session })
      
      if (!session) {
        this.logger.breadcrumb('EXECUTION_HISTORY', 'Session not found', { sessionId })
        this.logger.captureError('UNKNOWN', new Error('Session not found'), { sessionId })
        return null
      }

      // Add to execution history
      const updatedHistory = [...session.execution_history, execution]

      // Update with optimistic locking
      this.logger.breadcrumb('EXECUTION_HISTORY', 'Attempting optimistic update', { 
        sessionId,
        version: session.version 
      })
      
      const updated = await this.updateSession(
        sessionId,
        { execution_history: updatedHistory },
        session.version
      )
      
      this.logger.timing('execution_history_update_attempted', { success: !!updated })

      if (!updated) {
        // Retry once if version mismatch
        this.logger.breadcrumb('EXECUTION_HISTORY', 'Version mismatch, retrying', { sessionId })
        this.logger.info('Retrying after version mismatch', { sessionId })
        
        const retrySession = await this.getSession(sessionId)
        if (retrySession) {
          this.logger.breadcrumb('EXECUTION_HISTORY', 'Retry with new version', { 
            version: retrySession.version 
          })
          
          const retryHistory = [...retrySession.execution_history, execution]
          const retryResult = await this.updateSession(
            sessionId,
            { execution_history: retryHistory },
            retrySession.version
          )
          
          this.logger.timing('execution_history_retry_complete', { 
            success: !!retryResult 
          })
          
          return retryResult
        }
      }

      this.logger.breadcrumb('EXECUTION_HISTORY', 'Execution added successfully', { 
        sessionId,
        success: !!updated 
      })
      
      this.logger.timing('execution_history_complete', { 
        totalDuration: Date.now() - startTime 
      })
      
      this.logger.info('Execution added to history', { 
        sessionId,
        duration: Date.now() - startTime 
      })

      return updated
    } catch (error) {
      this.logger.captureError('SESSION_MANAGER', error, {
        operation: 'addExecutionToHistory',
        sessionId,
        breadcrumbs: this.logger.getBreadcrumbs()
      })
      throw error
    }
  }

  /**
   * Convert database record to SessionData
   * @param record - The database record
   * @returns The SessionData object
   */
  private convertToSessionData(record: any): SessionData {
    // Keep merged_data as a plain object (don't convert to Map)
    // This avoids serialization issues and data loss
    
    return {
      id: record.id,
      company_name: record.company_name,
      domain: record.domain,
      status: record.status,
      phase: record.phase || 1,
      version: record.version || 0,
      discovered_urls: record.discovered_urls,  // Include discovered_urls from database
      merged_data: record.merged_data || {},
      execution_history: record.execution_history || [],
      created_at: record.created_at,
      updated_at: record.updated_at,
      last_lock_id: record.last_lock_id
    }
  }

  /**
   * Generate a unique session key for deduplication
   * @param domain - The company domain
   * @returns A unique hash key
   */
  generateSessionKey(domain: string): string {
    return crypto
      .createHash('sha256')
      .update(`session:${domain}`)
      .digest('hex')
  }
}