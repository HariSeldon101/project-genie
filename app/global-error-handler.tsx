'use client'

/**
 * Global Error Handler Component
 *
 * CLAUDE.md Compliance:
 * - NO graceful degradation - errors are reported
 * - Real errors for debugging
 * - Reports to server endpoint to avoid RLS issues
 */

import { useEffect } from 'react'

/**
 * Report error to server-side logging endpoint
 */
async function reportError(
  message: string,
  stack?: string,
  category: string = 'GLOBAL_ERROR',
  metadata?: Record<string, any>
) {
  try {
    await fetch('/api/logs/client-error', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message,
        stack,
        category,
        url: window.location.href,
        userAgent: navigator.userAgent,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString()
        }
      })
    })
  } catch (err) {
    // Log to console if reporting fails
    console.error('Failed to report error:', err)
  }
}

export function GlobalErrorHandler() {
  useEffect(() => {
    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Special handling for empty object rejections
      // These are common from certain libraries and provide no useful debugging info
      const reason = event.reason

      // Check if the rejection is an empty object {}
      const isEmptyObject =
        reason &&
        typeof reason === 'object' &&
        !Array.isArray(reason) &&
        Object.keys(reason).length === 0 &&
        reason.constructor === Object

      // Check if it's a non-error object (some libraries reject with plain objects)
      const isNonErrorObject =
        reason &&
        typeof reason === 'object' &&
        !(reason instanceof Error) &&
        !reason.message &&
        !reason.stack

      if (isEmptyObject) {
        // Empty objects provide no debugging value - likely from a library
        // Log minimally to console but don't report to server
        console.warn('Promise rejected with empty object {} - likely from a library', {
          promise: event.promise
        })
        return // Don't report empty objects as they provide no useful info
      }

      // For non-error objects, try to extract meaningful info
      let message: string
      let stack: string | undefined
      let metadata: Record<string, any> = {}

      if (isNonErrorObject) {
        // Object rejection but not an Error instance
        try {
          message = `Promise rejected with object: ${JSON.stringify(reason, null, 2)}`
          metadata = { rejectedValue: reason }
        } catch {
          // JSON.stringify failed (circular reference, etc)
          message = `Promise rejected with non-serializable object: ${Object.prototype.toString.call(reason)}`
        }
      } else if (reason instanceof Error) {
        // Proper Error object
        message = reason.message || 'Unknown error'
        stack = reason.stack
      } else if (typeof reason === 'string') {
        // String rejection
        message = reason
      } else if (reason === null || reason === undefined) {
        // Null/undefined rejection
        message = `Promise rejected with ${reason === null ? 'null' : 'undefined'}`
      } else {
        // Fallback for any other type
        message = String(reason)
      }

      // Log to console with full context
      console.error('Unhandled promise rejection:', {
        reason,
        message,
        type: typeof reason,
        isError: reason instanceof Error,
        keys: typeof reason === 'object' ? Object.keys(reason) : undefined
      })

      // Report to server with enhanced context
      reportError(
        message,
        stack,
        'UNHANDLED_REJECTION',
        {
          type: 'unhandledRejection',
          promise: String(event.promise),
          reasonType: typeof reason,
          isError: reason instanceof Error,
          ...metadata
        }
      )
    }

    // Handle global JavaScript errors
    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error)

      reportError(
        event.message,
        event.error?.stack,
        'WINDOW_ERROR',
        {
          type: 'windowError',
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      )
    }

    // Add event listeners
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleError)

    // Cleanup on unmount
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleError)
    }
  }, [])

  // This component doesn't render anything
  return null
}