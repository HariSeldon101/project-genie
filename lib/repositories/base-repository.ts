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

import { createClient } from '@/lib/supabase/server'
import { permanentLogger } from '@/lib/utils/permanent-logger'
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

  constructor() {
    // Set repository name from class name for logging context
    this.repositoryName = this.constructor.name
  }

  /**
   * Get Supabase client with proper authentication context
   * Handles SSR authentication via cookies (critical for auth to work)
   * Type safety is enforced through Database types
   *
   * @returns Promise<SupabaseClient<Database>> Typed authenticated Supabase client
   * @throws Error if client creation fails
   */
  protected async getClient(): Promise<SupabaseClient<Database>> {
    const startTime = performance.now()

    try {
      // Create client with cookie-based auth for SSR
      const client = await createClient()

      // Log breadcrumb for debugging auth issues
      this.logger.breadcrumb(
        this.repositoryName,
        'supabase-client-created',
        {
          duration: performance.now() - startTime,
          timestamp: new Date().toISOString()
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
          context: 'Failed to create Supabase client'
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
      this.repositoryName,
      `${operation}-start`,
      {
        timestamp: new Date().toISOString(),
        operation
      }
    )

    try {
      // Get authenticated client
      const client = await this.getClient()

      // Execute the actual database operation
      const result = await fn(client)

      // Log timing for performance monitoring
      const duration = performance.now() - startTime
      this.logger.timing(
        `${this.repositoryName}.${operation}`,
        {
          duration,
          success: true
        }
      )

      // Add success breadcrumb
      this.logger.breadcrumb(
        this.repositoryName,
        `${operation}-complete`,
        {
          duration,
          timestamp: new Date().toISOString()
        }
      )

      return result
    } catch (error) {
      const duration = performance.now() - startTime

      // Capture error with full context and breadcrumbs
      this.logger.captureError(
        this.repositoryName,
        error as Error,
        {
          operation,
          duration,
          breadcrumbs: this.logger.getBreadcrumbs(),
          context: `Repository operation failed: ${operation}`
        }
      )

      // CRITICAL: Always throw errors - never return fallback data
      // This ensures errors are visible and can be fixed
      throw error
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
        this.repositoryName,
        'user-authenticated',
        {
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
      this.repositoryName,
      `${operation}-transaction-start`,
      { timestamp: new Date().toISOString() }
    )

    try {
      // Use single client for all operations in transaction
      const client = await this.getClient()
      const result = await fn(client)

      this.logger.breadcrumb(
        this.repositoryName,
        `${operation}-transaction-complete`,
        {
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