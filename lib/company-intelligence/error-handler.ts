/**
 * Centralized Error Handler for Company Intelligence
 * 
 * SOLID Principles:
 * - Single Responsibility: Only handles error processing and notification
 * - DRY: Centralizes all error handling logic in one place
 * 
 * @module error-handler
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { EventPriority } from '@/lib/notifications/types'
import { ErrorRecovery } from './utils/error-recovery'

// Import notification system (will be injected to avoid circular dependencies)
let notificationSender: ((message: string, type: string, priority: EventPriority) => void) | null = null

/**
 * Centralized error handler for scraping operations
 * Follows SOLID principles and DRY pattern
 */
export class ScrapingErrorHandler {
  private static instance: ScrapingErrorHandler

  /**
   * Initialize the error handler with notification sender
   */
  static initialize(sendNotification: (message: string, type: string, priority: EventPriority) => void) {
    notificationSender = sendNotification
  }

  /**
   * Handle errors with consistent logging and user notification
   * @param context - Where the error occurred (e.g., 'SCRAPING_CONTROL', 'SESSION_STATUS')
   * @param error - The error object or message
   * @param options - Additional options for error handling
   */
  static handleError(
    context: string, 
    error: any, 
    options: {
      showToUser?: boolean
      priority?: EventPriority
      scraperName?: string
      additionalData?: any
    } = {}
  ): string {
    const {
      showToUser = true,
      priority = EventPriority.CRITICAL,
      scraperName,
      additionalData
    } = options

    // Check if this is a recoverable error
    const isRecoverable = ErrorRecovery.isRecoverable(error)

    // Get user-friendly message
    const userMessage = additionalData?.url
      ? ErrorRecovery.getUserMessage(error, additionalData.url)
      : this.formatError(context, error, scraperName)

    // Log to permanent logger with full context
    // IMPORTANT: Using captureError per CLAUDE.md guidelines for proper breadcrumb capture
    permanentLogger.captureError(context, error, {
      userMessage,
      isRecoverable,
      scraperName,
      ...additionalData
    })

    // For recoverable errors, show as warning instead of error
    if (notificationSender) {
      if (isRecoverable) {
        // Show as warning for recoverable errors (less alarming)
        notificationSender(userMessage, 'warning', EventPriority.NORMAL)
      } else if (showToUser) {
        // Only show as error if it's non-recoverable and showToUser is true
        notificationSender(userMessage, 'error', priority)
      }
    } else {
      // Fallback: If notification sender not initialized, use permanent logger
      import('@/lib/utils/permanent-logger').then(({ permanentLogger }) => {
        permanentLogger.captureError('ERROR_HANDLER', new Error(`[ERROR NOT SHOWN TO USER] ${userMessage}`))
      })
    }
    
    // Also use persistentToast as backup to ensure visibility
    if (showToUser && typeof window !== 'undefined') {
      // Dynamic import to avoid SSR issues
      import('@/lib/hooks/use-persistent-toast').then(({ persistentToast }) => {
        persistentToast.error(userMessage, { priority })
      }).catch(() => {
        // Ignore import errors in SSR
      })
    }
    
    // Log critical errors with high priority
    if (priority === EventPriority.CRITICAL) {
      permanentLogger.info('CRITICAL', `${context}: ${userMessage}`, additionalData)
    }

    return userMessage
  }

  /**
   * Format error message consistently
   */
  private static formatError(context: string, error: any, scraperName?: string): string {
    const errorMsg = error?.message || error?.error || String(error) || 'Unknown error'
    const prefix = scraperName ? `[${context}] ${scraperName}` : `[${context}]`
    
    // Special handling for common error types
    if (error?.status === 404) {
      return `${prefix} Endpoint not found (404)`
    }
    if (error?.status === 401) {
      return `${prefix} Authentication required`
    }
    if (error?.status === 500) {
      return `${prefix} Server error - please try again`
    }
    
    return `${prefix} ${errorMsg}`
  }

  /**
   * Handle API response errors
   */
  static async handleApiError(
    context: string,
    response: Response,
    options: Parameters<typeof ScrapingErrorHandler.handleError>[2] = {}
  ): Promise<string> {
    let errorDetail = `HTTP ${response.status}`
    
    try {
      const body = await response.text()
      if (body) {
        try {
          const json = JSON.parse(body)
          errorDetail = json.error || json.message || errorDetail
        } catch {
          errorDetail = body.substring(0, 100) // First 100 chars of text response
        }
      }
    } catch {
      // Ignore body parsing errors
    }
    
    return this.handleError(context, {
      status: response.status,
      message: errorDetail
    }, options)
  }

  /**
   * Handle streaming errors with special formatting
   */
  static handleStreamingError(
    data: any,
    options: Parameters<typeof ScrapingErrorHandler.handleError>[2] = {}
  ): string {
    const context = 'STREAMING'
    const error = data.error || data.message || 'Streaming failed'
    
    return this.handleError(context, error, {
      ...options,
      additionalData: {
        type: data.type,
        scraperId: data.scraperId,
        ...options.additionalData
      }
    })
  }

  /**
   * Utility to wrap async functions with error handling
   */
  static async withErrorHandling<T>(
    context: string,
    operation: () => Promise<T>,
    options: Parameters<typeof ScrapingErrorHandler.handleError>[2] = {}
  ): Promise<T | null> {
    try {
      return await operation()
    } catch (error) {
      this.handleError(context, error, options)
      return null
    }
  }
}

// Export singleton instance
export const errorHandler = ScrapingErrorHandler