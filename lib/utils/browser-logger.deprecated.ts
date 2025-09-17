/**
 * DEPRECATED - Browser-compatible logger
 *
 * ⚠️ DEPRECATED AS OF: January 15, 2025
 * ⚠️ DO NOT USE IN NEW CODE
 *
 * This logger has been deprecated in favor of permanentLogger which:
 * - Works on both client and server
 * - Persists logs to database
 * - Provides breadcrumbs for debugging
 * - Has built-in timing measurements
 * - Properly captures errors with stack traces
 *
 * Migration guide:
 * 1. Replace: import { logger } from '@/lib/utils/browser-logger'
 *    With:    import { permanentLogger } from '@/lib/utils/permanent-logger'
 *
 * 2. Replace: permanentLogger.captureError(context, new Error(message, data))
 *    With:    permanentLogger.captureError(context, error, data)
 *
 * 3. Other methods (info, warn, debug) have the same signature
 *
 * This file is kept for reference only and will be removed in a future version.
 * All usages have been migrated to permanentLogger as of this deprecation date.
 */

export const logger = {
  info: (context: string, message: string, data?: any) => {
    console.log(`[${context}] ${message}`, data || '')
  },

  warn: (context: string, message: string, data?: any) => {
    console.warn(`[${context}] ${message}`, data || '')
  },

  error: (context: string, message: string, data?: any) => {
    console.error(`[${context}] ${message}`, data || '')
  },

  debug: (context: string, message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[${context}] ${message}`, data || '')
    }
  }
}