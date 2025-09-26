/**
 * Base Repository - Abstract base class for all repository implementations
 *
 * Purpose (for technical PMs):
 * - Provides common database operations for all repositories
 * - Handles authentication, error logging, and timing consistently
 * - Ensures DRY principle - write once, use everywhere
 * - Makes testing easier - mock in one place for all database operations
 *
 * @module repositories
 */

import { getPooledClient } from '@/lib/supabase/connection-pool'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { convertSupabaseError } from '@/lib/utils/supabase-error-helper'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

/**
 * Abstract base repository providing common database functionality
 * All domain-specific repositories should extend this class
 */
export abstract class BaseRepository {
  /**
   * Logger instance for breadcrumbs and error tracking
   * Uses permanentLogger for consistent logging across the application
   */
  protected logger = permanentLogger

  /**
   * Repository name for logging context
   * Automatically set to the class constructor name
   */
  protected repositoryName: string

  /**
   * Type-safe logger wrapper that automatically includes repository name as category
   *
   * IMPORTANT (2025-01-22): This wrapper ensures compliance with CLAUDE.md logger signatures.
   * The permanentLogger requires (category, message, data) but many repositories were calling
   * it with just (message, data), causing data to be stringified as the message.
   *
   * CORRECT USAGE:
   * ```typescript
   * // Use the wrapper methods that auto-include category
   * this.log.info('Operation completed', { userId: '123' })
   * this.log.error(error, { context: 'Failed to fetch' })
   * ```
   *
   * DO NOT:
   * ```typescript
   * // Don't call permanentLogger directly
   * this.logger.info('message', data) // WRONG - missing category!
   * ```
   *
   * Available methods follow CLAUDE.md exact signatures:
   * - info(message, data?) - Normal operations
   * - warn(message, data?) - Recoverable issues
   * - debug(message, data?) - Debug info (dev only)
   * - captureError(error, context?) - Error conditions (NO .error() method exists!)
   * - breadcrumb(action, message, data?) - User journey tracking
   * - timing(label, metadata?) - Performance measurement
   */
  protected log = {
    info: (message: string, data?: any) => {
      // Generate proper category: REPO_COMPANY_INTELLIGENCE format
      const category = 'REPO_' + this.repositoryName
        .replace(/Repository$/i, '')
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .toUpperCase()

      return this.logger.info(category, message, data)
    },

    warn: (message: string, data?: any) => {
      const category = 'REPO_' + this.repositoryName
        .replace(/Repository$/i, '')
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .toUpperCase()

      return this.logger.warn(category, message, data)
    },

    debug: (message: string, data?: any) => {
      const category = 'REPO_' + this.repositoryName
        .replace(/Repository$/i, '')
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .toUpperCase()

      return this.logger.debug(category, message, data)
    },

    // IMPORTANT: No .error() method exists per CLAUDE.md line 108
    // Must use captureError instead
    captureError: (error: Error, context?: any) => {
      const category = 'REPO_' + this.repositoryName
        .replace(/Repository$/i, '')
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .toUpperCase()

      return this.logger.captureError(category, error, context)
    },

    breadcrumb: (action: string, message: string, data?: any) =>
      this.logger.breadcrumb(action, message, data),

    timing: (label: string, metadata?: any) =>
      this.logger.timing(label, metadata)
  }

  constructor() {
    // Set repository name from class name for logging context
    this.repositoryName = this.constructor.name
  }

  /**
   * Get Supabase client with proper authentication context
   * Uses connection pool singleton to prevent creating hundreds of connections
   * Type safety is enforced through Database types
   *
   * @returns Promise<SupabaseClient<Database>> Typed authenticated Supabase client
   * @throws Error if client creation fails
   */
  protected async getClient(): Promise<SupabaseClient<Database>> {
    const startTime = performance.now()

    try {
      // Use pooled connection instead of creating new one
      // This dramatically reduces database connection overhead
      const client = await getPooledClient()

      // Log breadcrumb for debugging (much faster now)
      this.logger.breadcrumb(
        'db_client_acquired',  // Descriptive action - WHAT happened
        `Reused pooled Supabase client for ${this.repositoryName}`,
        {
          repository: this.repositoryName,  // Repository in data for tracking
          duration: performance.now() - startTime,
          timestamp: new Date().toISOString(),
          pooled: true
        }
      )

      return client
    } catch (error) {
      // Capture error with full context for debugging
      this.logger.captureError(
        this.repositoryName,
        error as Error,
        {
          operation: 'getClient',
          duration: performance.now() - startTime,
          context: 'Failed to get pooled Supabase client'
        }
      )
      throw error
    }
  }

  /**
   * Execute a database operation with standard error handling and timing
   * This is the core method that all repository operations should use
   *
   * @param operation - Name of the operation for logging
   * @param fn - Async function that performs the database operation
   * @returns Promise<T> Result of the database operation
   * @throws Error if operation fails (never returns fallback data)
   */
  protected async execute<T>(
    operation: string,
    fn: (client: SupabaseClient) => Promise<T>
  ): Promise<T> {
    const startTime = performance.now()

    // Add breadcrumb at operation start
    this.logger.breadcrumb(
      'db_operation_start',  // Action describing WHAT happened
      `Starting ${operation} in ${this.repositoryName}`,
      {
        repository: this.repositoryName,
        operation,
        timestamp: new Date().toISOString()
      }
    )

    try {
      // Get authenticated client
      const client = await this.getClient()

      // Execute the actual database operation
      const result = await fn(client)

      // Log timing for performance monitoring
      const duration = performance.now() - startTime

      // Add success breadcrumb with timing
      this.logger.breadcrumb(
        'db_operation_complete',  // Action describing WHAT happened
        `Completed ${operation} in ${this.repositoryName}`,
        {
          repository: this.repositoryName,
          operation,
          duration,
          timestamp: new Date().toISOString()
        }
      )

      return result
    } catch (error) {
      const duration = performance.now() - startTime

      // Convert Supabase errors to proper JavaScript Error instances
      // This is CRITICAL for proper error logging (CLAUDE.md requirement)
      const jsError = error instanceof Error ? error :
                      (error && typeof error === 'object' && 'message' in error) ?
                      convertSupabaseError(error) :
                      new Error(String(error))

      // Capture error with full context and breadcrumbs
      this.logger.captureError(
        this.repositoryName,
        jsError,
        {
          operation,
          duration,
          breadcrumbs: this.logger.getBreadcrumbs(),
          context: `Repository operation failed: ${operation}`
        }
      )

      // CRITICAL: Always throw errors - never return fallback data
      // This ensures errors are visible and can be fixed
      throw jsError
    }
  }

  /**
   * Get current authenticated user from Supabase auth
   * Throws error if user is not authenticated
   *
   * @returns Promise<User> Authenticated user object
   * @throws Error if user is not authenticated
   */
  protected async getCurrentUser() {
    return this.execute('getCurrentUser', async (client) => {
      const { data: { user }, error } = await client.auth.getUser()

      if (error || !user) {
        // No fallback - throw error for proper handling
        throw new Error('User not authenticated')
      }

      // Log user retrieval for debugging
      this.logger.breadcrumb(
        'user_authenticated',  // Action describing WHAT happened
        `User authenticated via ${this.repositoryName}`,
        {
          repository: this.repositoryName,
          userId: user.id,
          email: user.email
        }
      )

      return user
    })
  }

  /**
   * Execute a transaction-like operation with multiple queries
   * Note: Supabase doesn't support true transactions, but this ensures
   * all operations use the same client instance
   *
   * @param operation - Name of the transaction for logging
   * @param fn - Async function containing multiple database operations
   * @returns Promise<T> Result of the transaction
   */
  protected async transaction<T>(
    operation: string,
    fn: (client: SupabaseClient) => Promise<T>
  ): Promise<T> {
    const startTime = performance.now()

    this.logger.breadcrumb(
      'db_transaction_start',  // Action describing WHAT happened
      `Starting transaction ${operation} in ${this.repositoryName}`,
      {
        repository: this.repositoryName,
        operation,
        timestamp: new Date().toISOString()
      }
    )

    try {
      // Use single client for all operations in transaction
      const client = await this.getClient()
      const result = await fn(client)

      this.logger.breadcrumb(
        'db_transaction_complete',  // Action describing WHAT happened
        `Completed transaction ${operation} in ${this.repositoryName}`,
        {
          repository: this.repositoryName,
          operation,
          duration: performance.now() - startTime,
          success: true
        }
      )

      return result
    } catch (error) {
      // Log transaction failure
      this.logger.captureError(
        this.repositoryName,
        error as Error,
        {
          operation: `${operation}-transaction`,
          duration: performance.now() - startTime,
          context: 'Transaction failed'
        }
      )
      throw error
    }
  }

  /**
   * Helper method to check if a database error is a unique constraint violation
   * Useful for handling duplicate key errors gracefully
   *
   * @param error - The error to check
   * @returns boolean True if error is a unique constraint violation
   */
  protected isUniqueViolation(error: any): boolean {
    return error?.code === '23505' // PostgreSQL unique violation code
  }

  /**
   * Helper method to check if a database error is a foreign key violation
   * Useful for handling referential integrity errors
   *
   * @param error - The error to check
   * @returns boolean True if error is a foreign key violation
   */
  protected isForeignKeyViolation(error: any): boolean {
    return error?.code === '23503' // PostgreSQL foreign key violation code
  }

  /**
   * Helper method to check if error is due to row level security
   *
   * @param error - The error to check
   * @returns boolean True if error is RLS related
   */
  protected isRLSError(error: any): boolean {
    return error?.message?.includes('row-level security') ||
           error?.code === '42501' // PostgreSQL insufficient privilege
  }
}