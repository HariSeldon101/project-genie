/**
 * Error Recovery Utilities
 * Provides graceful error handling and recovery strategies for scraping operations
 *
 * @module error-recovery
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { EventFactory } from '@/lib/realtime-events'

export interface ErrorRecoveryOptions {
  maxRetries?: number
  retryDelay?: number
  fallbackStrategy?: 'skip' | 'partial' | 'abort'
  notifyUser?: boolean
}

export class ErrorRecovery {
  private static retryCount = new Map<string, number>()

  /**
   * Handle HTTP errors gracefully
   */
  static async handleHttpError(
    error: any,
    url: string,
    options: ErrorRecoveryOptions = {}
  ): Promise<{ shouldRetry: boolean; shouldSkip: boolean; userMessage: string }> {
    const {
      maxRetries = 3,
      retryDelay = 1000,
      fallbackStrategy = 'skip',
      notifyUser = true
    } = options

    // Get current retry count
    const key = `${url}_${error.code || error.message}`
    const currentRetries = this.retryCount.get(key) || 0

    // Analyze error type
    const errorCode = error.response?.status || error.code || 'UNKNOWN'

    permanentLogger.breadcrumb('ERROR_RECOVERY', 'Analyzing error', {
      url,
      errorCode,
      currentRetries,
      maxRetries
    })

    // Determine recovery strategy based on error type
    switch (errorCode) {
      case 429: // Rate limited
        return {
          shouldRetry: currentRetries < maxRetries,
          shouldSkip: false,
          userMessage: 'Rate limited - waiting before retry...'
        }

      case 500:
      case 502:
      case 503:
      case 504: // Server errors
        if (currentRetries < maxRetries) {
          this.retryCount.set(key, currentRetries + 1)
          await this.delay(retryDelay * Math.pow(2, currentRetries)) // Exponential backoff

          return {
            shouldRetry: true,
            shouldSkip: false,
            userMessage: `Server error on ${new URL(url).hostname} - retrying (${currentRetries + 1}/${maxRetries})...`
          }
        } else {
          // Max retries reached
          this.retryCount.delete(key)

          if (fallbackStrategy === 'skip') {
            return {
              shouldRetry: false,
              shouldSkip: true,
              userMessage: `Skipping ${new URL(url).hostname} after ${maxRetries} failed attempts`
            }
          } else if (fallbackStrategy === 'partial') {
            return {
              shouldRetry: false,
              shouldSkip: true,
              userMessage: `Continuing with partial data from ${new URL(url).hostname}`
            }
          } else {
            return {
              shouldRetry: false,
              shouldSkip: false,
              userMessage: `Failed to scrape ${new URL(url).hostname} - aborting`
            }
          }
        }

      case 403: // Forbidden
      case 401: // Unauthorized
        return {
          shouldRetry: false,
          shouldSkip: true,
          userMessage: `Access denied to ${new URL(url).hostname} - skipping`
        }

      case 404: // Not found
        return {
          shouldRetry: false,
          shouldSkip: true,
          userMessage: `Page not found on ${new URL(url).hostname} - skipping`
        }

      case 'ECONNREFUSED':
      case 'ENOTFOUND':
      case 'ETIMEDOUT':
        return {
          shouldRetry: currentRetries < 2, // Only retry network errors twice
          shouldSkip: currentRetries >= 2,
          userMessage: `Network error accessing ${new URL(url).hostname}`
        }

      default:
        return {
          shouldRetry: false,
          shouldSkip: true,
          userMessage: `Unexpected error on ${new URL(url).hostname} - skipping`
        }
    }
  }

  /**
   * Create user-friendly error notification
   */
  static createErrorNotification(
    error: any,
    context: string,
    recoveryAction: string
  ) {
    // Don't create error events for recoverable errors
    if (recoveryAction === 'retrying' || recoveryAction === 'skipping') {
      // Create a warning instead of an error
      return EventFactory.notification(
        `${context}: ${recoveryAction}`,
        'warning',
        {
          duration: 3000,
          persistent: false
        }
      )
    }

    // Only create error notifications for fatal errors
    return EventFactory.notification(
      `Failed to complete ${context}. Please try again later.`,
      'error',
      {
        duration: 5000,
        persistent: true
      }
    )
  }

  /**
   * Wrap scraping operation with error recovery
   */
  static async withRecovery<T>(
    operation: () => Promise<T>,
    context: string,
    options: ErrorRecoveryOptions = {}
  ): Promise<T | null> {
    try {
      return await operation()
    } catch (error) {
      permanentLogger.breadcrumb('ERROR_RECOVERY', 'Operation failed', {
        context,
        error: error instanceof Error ? error.message : 'Unknown error'
      })

      // For scraping operations, return null to continue with other URLs
      if (options.fallbackStrategy === 'skip') {
        permanentLogger.info('ERROR_RECOVERY', `Skipping failed operation: ${context}`)
        return null
      }

      // Re-throw for critical operations
      throw error
    }
  }

  /**
   * Clear retry counts for a session
   */
  static clearRetryCount(sessionId?: string): void {
    if (sessionId) {
      // Clear specific session retries
      for (const key of this.retryCount.keys()) {
        if (key.includes(sessionId)) {
          this.retryCount.delete(key)
        }
      }
    } else {
      // Clear all
      this.retryCount.clear()
    }
  }

  /**
   * Delay helper for retries
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Check if error is recoverable
   */
  static isRecoverable(error: any): boolean {
    const errorCode = error.response?.status || error.code || 'UNKNOWN'

    const recoverableCodes = [
      429, // Rate limited
      500, 502, 503, 504, // Server errors
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ECONNRESET'
    ]

    return recoverableCodes.includes(errorCode)
  }

  /**
   * Get user-friendly error message
   */
  static getUserMessage(error: any, url?: string): string {
    const errorCode = error.response?.status || error.code || 'UNKNOWN'
    const hostname = url ? new URL(url).hostname : 'the website'

    const messages: Record<string, string> = {
      '429': `${hostname} is rate limiting requests. Waiting before retry...`,
      '500': `${hostname} is experiencing server issues`,
      '502': `${hostname} gateway error - server may be down`,
      '503': `${hostname} is temporarily unavailable`,
      '504': `${hostname} is not responding (timeout)`,
      '403': `Access denied to ${hostname}`,
      '404': `Page not found on ${hostname}`,
      'ECONNREFUSED': `Cannot connect to ${hostname}`,
      'ENOTFOUND': `Cannot find ${hostname}`,
      'ETIMEDOUT': `Connection to ${hostname} timed out`,
      'ECONNRESET': `Connection to ${hostname} was reset`
    }

    return messages[String(errorCode)] || `Error accessing ${hostname}`
  }
}