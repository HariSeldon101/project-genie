/**
 * ExecutionLocksRepository - Database operations for execution locks
 *
 * Manages execution locks to prevent duplicate operations
 * Technical PM: Follows repository pattern for database isolation
 */

import { BaseRepository } from './base-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'

export interface ExecutionLock {
  id: string
  lock_key: string
  session_id: string
  scraper_id: string
  acquired_at: string
  expires_at: string
  released: boolean
  released_at?: string
}

export interface CreateLockParams {
  lock_key: string
  session_id: string
  scraper_id: string
  expires_at: string
  released: boolean
}

export class ExecutionLocksRepository extends BaseRepository {
  private static instance: ExecutionLocksRepository

  private constructor() {
    super()
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ExecutionLocksRepository {
    if (!ExecutionLocksRepository.instance) {
      ExecutionLocksRepository.instance = new ExecutionLocksRepository()
    }
    return ExecutionLocksRepository.instance
  }

  /**
   * Create a new execution lock
   */
  async createLock(params: CreateLockParams): Promise<ExecutionLock | null> {
    try {
      permanentLogger.breadcrumb('EXECUTION_LOCKS_REPO', 'Creating lock', {
        lock_key: params.lock_key
      })

      const supabase = await this.getClient()

      const { data, error } = await supabase
        .from('execution_locks')
        .insert(params)
        .select()
        .single()

      if (error) {
        // Check if it's a unique constraint violation
        if (error.code === '23505') {
          permanentLogger.info('EXECUTION_LOCKS_REPO', 'Lock already exists', {
            lock_key: params.lock_key
          })
          return null
        }
        throw error
      }

      permanentLogger.info('EXECUTION_LOCKS_REPO', 'Lock created', {
        id: data.id
      })

      return data
    } catch (error) {
      permanentLogger.captureError('EXECUTION_LOCKS_REPO', error as Error, {
        operation: 'createLock'
      })
      throw error
    }
  }

  /**
   * Check if a lock exists and is still valid
   */
  async checkLock(lockKey: string): Promise<ExecutionLock | null> {
    try {
      permanentLogger.breadcrumb('EXECUTION_LOCKS_REPO', 'Checking lock', {
        lock_key: lockKey
      })

      const supabase = await this.getClient()

      const { data, error } = await supabase
        .from('execution_locks')
        .select('*')
        .eq('lock_key', lockKey)
        .eq('released', false)
        .gte('expires_at', new Date().toISOString())
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No lock found
          return null
        }
        throw error
      }

      return data
    } catch (error) {
      permanentLogger.captureError('EXECUTION_LOCKS_REPO', error as Error, {
        operation: 'checkLock'
      })
      throw error
    }
  }

  /**
   * Release a lock
   */
  async releaseLock(lockId: string): Promise<boolean> {
    try {
      permanentLogger.breadcrumb('EXECUTION_LOCKS_REPO', 'Releasing lock', {
        id: lockId
      })

      const supabase = await this.getClient()

      const { error } = await supabase
        .from('execution_locks')
        .update({
          released: true,
          released_at: new Date().toISOString()
        })
        .eq('id', lockId)
        .eq('released', false)

      if (error) {
        throw error
      }

      permanentLogger.info('EXECUTION_LOCKS_REPO', 'Lock released', {
        id: lockId
      })

      return true
    } catch (error) {
      permanentLogger.captureError('EXECUTION_LOCKS_REPO', error as Error, {
        operation: 'releaseLock'
      })
      throw error
    }
  }

  /**
   * Clean up expired locks
   */
  async cleanExpiredLocks(): Promise<number> {
    try {
      permanentLogger.breadcrumb('EXECUTION_LOCKS_REPO', 'Cleaning expired locks', {})

      const supabase = await this.getClient()

      const { data, error } = await supabase
        .from('execution_locks')
        .update({
          released: true,
          released_at: new Date().toISOString()
        })
        .eq('released', false)
        .lt('expires_at', new Date().toISOString())
        .select('id')

      if (error) {
        throw error
      }

      const count = data?.length || 0

      permanentLogger.info('EXECUTION_LOCKS_REPO', 'Expired locks cleaned', {
        count
      })

      return count
    } catch (error) {
      permanentLogger.captureError('EXECUTION_LOCKS_REPO', error as Error, {
        operation: 'cleanExpiredLocks'
      })
      throw error
    }
  }

  /**
   * Get all active locks
   */
  async getActiveLocks(): Promise<ExecutionLock[]> {
    try {
      permanentLogger.breadcrumb('EXECUTION_LOCKS_REPO', 'Getting active locks', {})

      const supabase = await this.getClient()

      const { data, error } = await supabase
        .from('execution_locks')
        .select('*')
        .eq('released', false)
        .gte('expires_at', new Date().toISOString())
        .order('acquired_at', { ascending: false })

      if (error) {
        throw error
      }

      return data || []
    } catch (error) {
      permanentLogger.captureError('EXECUTION_LOCKS_REPO', error as Error, {
        operation: 'getActiveLocks'
      })
      throw error
    }
  }

  /**
   * Get locks by session ID
   */
  async getLocksBySession(sessionId: string): Promise<ExecutionLock[]> {
    try {
      permanentLogger.breadcrumb('EXECUTION_LOCKS_REPO', 'Getting locks by session', {
        sessionId
      })

      const supabase = await this.getClient()

      const { data, error } = await supabase
        .from('execution_locks')
        .select('*')
        .eq('session_id', sessionId)
        .order('acquired_at', { ascending: false })

      if (error) {
        throw error
      }

      return data || []
    } catch (error) {
      permanentLogger.captureError('EXECUTION_LOCKS_REPO', error as Error, {
        operation: 'getLocksBySession'
      })
      throw error
    }
  }

  /**
   * Force release all locks for a session
   */
  async releaseSessionLocks(sessionId: string): Promise<number> {
    try {
      permanentLogger.breadcrumb('EXECUTION_LOCKS_REPO', 'Releasing session locks', {
        sessionId
      })

      const supabase = await this.getClient()

      const { data, error } = await supabase
        .from('execution_locks')
        .update({
          released: true,
          released_at: new Date().toISOString()
        })
        .eq('session_id', sessionId)
        .eq('released', false)
        .select('id')

      if (error) {
        throw error
      }

      const count = data?.length || 0

      permanentLogger.info('EXECUTION_LOCKS_REPO', 'Session locks released', {
        sessionId,
        count
      })

      return count
    } catch (error) {
      permanentLogger.captureError('EXECUTION_LOCKS_REPO', error as Error, {
        operation: 'releaseSessionLocks'
      })
      throw error
    }
  }
}