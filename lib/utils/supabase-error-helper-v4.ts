// lib/utils/supabase-error-helper.ts
/**
 * Supabase Error Helper
 * CLAUDE.md Compliant - Converts Supabase errors to JavaScript Error instances
 */

/**
 * Convert Supabase errors to proper JavaScript Error instances
 * This ensures all errors can be properly logged with permanentLogger.captureError()
 */
export function convertSupabaseError(error: any): Error {
  // If it's already a proper Error instance, return it
  if (error instanceof Error) {
    return error
  }

  // Handle Supabase PostgrestError format
  if (error && typeof error === 'object') {
    // Check for Supabase error structure
    if ('message' in error || 'details' in error || 'hint' in error || 'code' in error) {
      const errorMessage = [
        error.message,
        error.details,
        error.hint,
        error.code && `(Code: ${error.code})`
      ]
        .filter(Boolean)
        .join(' ')

      const jsError = new Error(errorMessage || 'Supabase error')
      
      // Preserve original error properties
      Object.assign(jsError, {
        supabaseError: error,
        code: error.code,
        details: error.details,
        hint: error.hint,
        originalError: error
      })

      return jsError
    }

    // Handle Supabase Auth error format
    if ('status' in error && 'msg' in error) {
      const jsError = new Error(error.msg || `Auth error (status: ${error.status})`)
      Object.assign(jsError, {
        status: error.status,
        originalError: error
      })
      return jsError
    }

    // Handle generic object with error property
    if ('error' in error) {
      return convertSupabaseError(error.error)
    }
  }

  // Handle string errors
  if (typeof error === 'string') {
    return new Error(error)
  }

  // Fallback for unknown error types
  const fallbackError = new Error('Unknown Supabase error')
  Object.assign(fallbackError, {
    originalError: error,
    errorType: typeof error,
    errorValue: String(error)
  })

  return fallbackError
}

/**
 * Type guard to check if an error is a Supabase PostgrestError
 */
export function isPostgrestError(error: any): boolean {
  return (
    error &&
    typeof error === 'object' &&
    ('code' in error || 'details' in error || 'hint' in error) &&
    !('stack' in error) // Distinguish from regular Error
  )
}

/**
 * Type guard to check if an error is a Supabase Auth error
 */
export function isSupabaseAuthError(error: any): boolean {
  return (
    error &&
    typeof error === 'object' &&
    'status' in error &&
    'msg' in error
  )
}

/**
 * Extract error code from Supabase error
 */
export function getSupabaseErrorCode(error: any): string | null {
  if (isPostgrestError(error)) {
    return error.code || null
  }
  if (isSupabaseAuthError(error)) {
    return `AUTH_${error.status}` || null
  }
  return null
}

/**
 * Get user-friendly error message from Supabase error
 */
export function getUserFriendlyErrorMessage(error: any): string {
  const code = getSupabaseErrorCode(error)
  
  // Map common Supabase error codes to user-friendly messages
  const errorMessages: Record<string, string> = {
    '23505': 'This item already exists',
    '23503': 'Referenced item does not exist',
    '23502': 'Required field is missing',
    '22P02': 'Invalid input format',
    'PGRST301': 'Not authenticated - please log in',
    'PGRST204': 'No data found',
    'AUTH_400': 'Invalid authentication credentials',
    'AUTH_401': 'You need to be logged in to access this',
    'AUTH_403': 'You do not have permission to access this',
    'AUTH_404': 'User not found',
    'AUTH_422': 'Invalid email or password',
    'AUTH_429': 'Too many requests - please try again later',
    'AUTH_500': 'Authentication service error - please try again'
  }

  if (code && code in errorMessages) {
    return errorMessages[code]
  }

  // Fallback to original message or generic error
  if (error && typeof error === 'object' && 'message' in error) {
    return error.message
  }

  return 'An unexpected error occurred. Please try again.'
}

/**
 * Check if error is a network/connection error
 */
export function isNetworkError(error: any): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection') ||
      message.includes('timeout')
    )
  }
  return false
}

/**
 * Retry wrapper for Supabase operations with exponential backoff
 */
export async function retrySupabaseOperation<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number
    initialDelay?: number
    maxDelay?: number
    shouldRetry?: (error: any) => boolean
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    shouldRetry = (error) => isNetworkError(error) || getSupabaseErrorCode(error) === 'AUTH_429'
  } = options

  let lastError: any
  let delay = initialDelay

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      if (attempt === maxRetries || !shouldRetry(error)) {
        throw convertSupabaseError(error)
      }

      // Exponential backoff with jitter
      const jitter = Math.random() * 0.3 * delay
      const waitTime = Math.min(delay + jitter, maxDelay)
      
      await new Promise(resolve => setTimeout(resolve, waitTime))
      delay *= 2
    }
  }

  throw convertSupabaseError(lastError)
}
