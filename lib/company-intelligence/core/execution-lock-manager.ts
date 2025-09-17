/**
 * ExecutionLockManager - Prevents duplicate scraper executions
 *
 * What it does (like a 12-year-old would understand):
 * - Acts like a "busy" sign on a bathroom door
 * - Prevents two scrapers from running the same job at the same time
 * - Automatically cleans up old locks that forgot to unlock
 * - Uses unique keys to identify each execution request
 *
 * Why we need it:
 * - PREVENTS duplicate runs when user clicks button multiple times
 * - ENSURES only one scraper runs for same session/urls at a time
 * - PROVIDES idempotent responses - same request gets same result
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { CompanyIntelligenceRepository } from '@/lib/repositories/company-intelligence-repository'
import { ExecutionLocksRepository } from '@/lib/repositories/execution-locks-repository'
import crypto from 'crypto'

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

export class ExecutionLockManager {
  private logger = permanentLogger
  private locksRepository = ExecutionLocksRepository.getInstance()
  private companyIntelligenceRepository = CompanyIntelligenceRepository.getInstance()
  private readonly DEFAULT_LOCK_DURATION_MS = 5 * 60 * 1000 // 5 minutes

  /**
   * Attempt to acquire a lock for execution
   * @param sessionId - The session ID
   * @param scraperId - The scraper ID
   * @param urls - The URLs to scrape (for unique key generation)
   * @param durationMs - Lock duration in milliseconds
   * @param forceNew - Force a new lock even if one exists (for streaming)
   * @returns The lock if acquired, null if already locked
   */
  async acquireLock(
    sessionId: string,
    scraperId: string,
    urls: string[],
    durationMs: number = this.DEFAULT_LOCK_DURATION_MS,
    forceNew: boolean = false
  ): Promise<ExecutionLock | null> {
    const startTime = Date.now()
    // If forceNew, add timestamp to make key unique
    const lockKey = forceNew
      ? this.generateLockKey(sessionId, scraperId, urls, Date.now().toString())
      : this.generateLockKey(sessionId, scraperId, urls)

    this.logger.info('EXECUTION_LOCK', 'Attempting to acquire lock', {
      sessionId,
      scraperId,
      urlCount: urls.length,
      lockKey,
      forceNew
    })

    try {
      // CRITICAL: Validate session exists before creating lock
      const sessionExists = await this.companyIntelligenceRepository.getSession(sessionId)

      if (!sessionExists) {
        this.logger.info('EXECUTION_LOCK', 'Invalid session ID - cannot acquire lock', {
          sessionId
        })
        // Return null instead of throwing to prevent cascading errors
        return null
      }

      const expiresAt = new Date(Date.now() + durationMs).toISOString()

      // Try to insert the lock
      const lock = await this.locksRepository.createLock({
        lock_key: lockKey,
        session_id: sessionId,
        scraper_id: scraperId,
        expires_at: expiresAt,
        released: false
      })

      if (!lock) {
        // Lock already exists - check if expired
        this.logger.info('EXECUTION_LOCK', 'Lock already exists - checking if expired', { lockKey })

        // Check if existing lock has expired
        const expired = await this.cleanupExpiredLock(lockKey)

        if (expired) {
          // Try again after cleanup
          return this.acquireLock(sessionId, scraperId, urls, durationMs)
        }

        this.logger.info('EXECUTION_LOCK', 'Could not acquire lock - already held', {
          lockKey,
          duration: Date.now() - startTime
        })
        return null
      }

      this.logger.info('EXECUTION_LOCK', 'Lock acquired successfully', {
        lockId: lock.id,
        lockKey,
        expiresAt,
        duration: Date.now() - startTime
      })

      return lock
    } catch (error) {
      this.logger.captureError('EXECUTION_LOCK', error as Error, {
        operation: 'acquireLock',
        sessionId,
        scraperId
      })
      throw error
    }
  }

  /**
   * Release a lock after execution completes
   * @param lockId - The lock ID to release
   * @returns True if released, false if not found
   */
  async releaseLock(lockId: string): Promise<boolean> {
    const startTime = Date.now()
    this.logger.info('EXECUTION_LOCK', 'Releasing lock', { lockId })

    try {
      const released = await this.locksRepository.releaseLock(lockId)

      if (released) {
        this.logger.info('EXECUTION_LOCK', 'Lock released successfully', {
          lockId,
          duration: Date.now() - startTime
        })
      } else {
        this.logger.info('EXECUTION_LOCK', 'Lock not found or already released', { lockId })
      }

      return released
    } catch (error) {
      this.logger.captureError('EXECUTION_LOCK', error as Error, {
        operation: 'releaseLock',
        lockId
      })
      throw error
    }
  }

  /**
   * Check if a lock exists for given parameters
   * @param sessionId - The session ID
   * @param scraperId - The scraper ID
   * @param urls - The URLs to check
   * @returns The lock if exists and not expired, null otherwise
   */
  async checkLock(
    sessionId: string,
    scraperId: string,
    urls: string[]
  ): Promise<ExecutionLock | null> {
    const startTime = Date.now()
    const lockKey = this.generateLockKey(sessionId, scraperId, urls)

    this.logger.info('EXECUTION_LOCK', 'Checking for existing lock', { lockKey })

    try {
      const lock = await this.locksRepository.checkLock(lockKey)

      if (lock) {
        this.logger.info('EXECUTION_LOCK', 'Active lock found', {
          lockId: lock.id,
          lockKey,
          expiresAt: lock.expires_at,
          duration: Date.now() - startTime
        })
      } else {
        this.logger.info('EXECUTION_LOCK', 'No active lock found', { lockKey })
      }

      return lock
    } catch (error) {
      this.logger.captureError('EXECUTION_LOCK', error as Error, {
        operation: 'checkLock',
        sessionId,
        scraperId
      })
      throw error
    }
  }

  /**
   * Clean up expired lock
   * @param lockKey - The lock key to clean up
   * @returns True if cleaned up, false if still active
   */
  private async cleanupExpiredLock(lockKey: string): Promise<boolean> {
    const startTime = Date.now()
    this.logger.info('EXECUTION_LOCK', 'Cleaning up expired lock', { lockKey })

    try {
      // Check if lock is expired
      const lock = await this.locksRepository.checkLock(lockKey)

      if (!lock) {
        // Lock doesn't exist or is already expired
        return true
      }

      // Check if expired
      const now = new Date()
      const expiresAt = new Date(lock.expires_at)

      if (expiresAt < now) {
        // Release the expired lock
        await this.locksRepository.releaseLock(lock.id)

        this.logger.info('EXECUTION_LOCK', 'Expired lock cleaned up', {
          lockKey,
          duration: Date.now() - startTime
        })

        return true
      }

      this.logger.info('EXECUTION_LOCK', 'Lock still active', {
        lockKey,
        expiresAt: lock.expires_at
      })

      return false
    } catch (error) {
      this.logger.captureError('EXECUTION_LOCK', error as Error, {
        operation: 'cleanupExpiredLock',
        lockKey
      })
      return false
    }
  }

  /**
   * Clean up all expired locks (maintenance task)
   * @returns Number of locks cleaned up
   */
  async cleanupAllExpiredLocks(): Promise<number> {
    const startTime = Date.now()
    this.logger.info('EXECUTION_LOCK', 'Cleaning up all expired locks')

    try {
      const cleanedCount = await this.locksRepository.cleanExpiredLocks()

      this.logger.info('EXECUTION_LOCK', 'All expired locks cleaned', {
        cleanedCount,
        duration: Date.now() - startTime
      })

      return cleanedCount
    } catch (error) {
      this.logger.captureError('EXECUTION_LOCK', error as Error, {
        operation: 'cleanupAllExpiredLocks'
      })
      throw error
    }
  }

  /**
   * Generate a unique lock key for deduplication
   * @param sessionId - The session ID
   * @param scraperId - The scraper ID
   * @param urls - The URLs being scraped
   * @param suffix - Optional suffix to make key unique
   * @returns A unique hash key
   */
  private generateLockKey(
    sessionId: string,
    scraperId: string,
    urls: string[],
    suffix?: string
  ): string {
    // Sort URLs for consistent key generation
    const sortedUrls = [...urls].sort().join(',')

    // Include a time window (10 second buckets) to allow re-runs after short delays
    // This prevents permanent locks while still preventing rapid duplicate requests
    const timeWindow = suffix || Math.floor(Date.now() / 10000).toString() // Use suffix if provided, else time window

    const keyString = `lock:${sessionId}:${scraperId}:${timeWindow}:${sortedUrls}`

    permanentLogger.info('🔴 LOCK_MANAGER: Generating lock key:', {
      sessionId: sessionId.substring(0, 8),
      scraperId,
      timeWindow,
      urlCount: urls.length,
      keyString: keyString.substring(0, 50) + '...'
    })

    return crypto
      .createHash('sha256')
      .update(keyString)
      .digest('hex')
  }

  /**
   * Extend lock duration if still working
   * @param lockId - The lock ID to extend
   * @param additionalMs - Additional milliseconds to extend
   * @returns True if extended, false if not found
   */
  async extendLock(
    lockId: string,
    additionalMs: number = this.DEFAULT_LOCK_DURATION_MS
  ): Promise<boolean> {
    const startTime = Date.now()
    this.logger.info('EXECUTION_LOCK', 'Extending lock', { lockId, additionalMs })

    try {
      // Get current lock from repository
      const locks = await this.locksRepository.getActiveLocks()
      const lock = locks.find(l => l.id === lockId)

      if (!lock || lock.released) {
        this.logger.info('EXECUTION_LOCK', 'Lock not found or already released', { lockId })
        return false
      }

      // Calculate new expiry
      const currentExpiry = new Date(lock.expires_at)
      const newExpiry = new Date(Math.max(
        currentExpiry.getTime(),
        Date.now()
      ) + additionalMs)

      // We would need to add an updateLock method to the repository
      // For now, log that this operation is not supported
      this.logger.warn('EXECUTION_LOCK', 'Lock extension not yet implemented in repository', {
        lockId,
        currentExpiry: currentExpiry.toISOString(),
        desiredExpiry: newExpiry.toISOString()
      })

      // Return false to indicate not extended
      return false
    } catch (error) {
      this.logger.captureError('EXECUTION_LOCK', error as Error, {
        operation: 'extendLock',
        lockId
      })
      return false
    }
  }
}