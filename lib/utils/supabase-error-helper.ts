/**
 * Supabase Error Helper
 *
 * CRITICAL: Supabase errors are NOT JavaScript Error instances!
 * They are PostgrestError objects with different properties.
 * This helper converts them to proper Error instances for consistent handling.
 *
 * @see /docs/supabase-nextjs-best-practices.md#5-error-handling
 */

import { PostgrestError, AuthError, StorageError } from '@supabase/supabase-js'

/**
 * Convert a Supabase PostgrestError to a JavaScript Error instance
 * Preserves all error details for debugging
 */
export function convertSupabaseError(error: PostgrestError | AuthError | StorageError | unknown): Error {
  // Handle PostgrestError (database errors)
  if (isPostgrestError(error)) {
    const jsError = new Error(error.message || 'Database operation failed')
    jsError.name = 'DatabaseError'

    // Preserve all PostgreSQL error details
    ;(jsError as any).code = error.code
    ;(jsError as any).details = error.details
    ;(jsError as any).hint = error.hint

    // Add more context if available
    if (error.code) {
      jsError.message = `${error.message} (Code: ${error.code})`

      // Add human-readable explanations for common error codes
      const errorExplanation = getErrorExplanation(error.code)
      if (errorExplanation) {
        jsError.message += ` - ${errorExplanation}`
      }
    }

    if (error.hint) {
      jsError.message += ` Hint: ${error.hint}`
    }

    return jsError
  }

  // Handle AuthError
  if (isAuthError(error)) {
    const jsError = new Error(error.message || 'Authentication failed')
    jsError.name = 'AuthError'
    ;(jsError as any).status = error.status
    ;(jsError as any).__isAuthError = error.__isAuthError
    return jsError
  }

  // Handle StorageError
  if (isStorageError(error)) {
    const jsError = new Error(error.message || 'Storage operation failed')
    jsError.name = 'StorageError'
    ;(jsError as any).statusCode = error.statusCode
    ;(jsError as any).error = error.error
    return jsError
  }

  // Handle plain object with message property
  if (error && typeof error === 'object' && 'message' in error) {
    const jsError = new Error((error as any).message || 'Unknown error')
    jsError.name = 'SupabaseError'

    // Copy all properties from the error object
    Object.keys(error).forEach(key => {
      if (key !== 'message') {
        ;(jsError as any)[key] = (error as any)[key]
      }
    })

    return jsError
  }

  // Handle Error instances (already proper errors)
  if (error instanceof Error) {
    return error
  }

  // Fallback for unknown error types
  const jsError = new Error(String(error) || 'Unknown error occurred')
  jsError.name = 'UnknownSupabaseError'
  ;(jsError as any).originalError = error
  return jsError
}

/**
 * Type guard for PostgrestError
 */
export function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'message' in error &&
    'code' in error &&
    'details' in error
  )
}

/**
 * Type guard for AuthError
 */
export function isAuthError(error: unknown): error is AuthError {
  return (
    error !== null &&
    typeof error === 'object' &&
    '__isAuthError' in error &&
    (error as any).__isAuthError === true
  )
}

/**
 * Type guard for StorageError
 */
export function isStorageError(error: unknown): error is StorageError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'statusCode' in error &&
    'error' in error &&
    typeof (error as any).error === 'string'
  )
}

/**
 * Get human-readable explanation for common PostgreSQL error codes
 */
function getErrorExplanation(code: string): string | null {
  const errorMap: Record<string, string> = {
    // Integrity Constraint Violations
    '23505': 'Unique constraint violation - This record already exists',
    '23503': 'Foreign key constraint violation - Referenced record does not exist',
    '23502': 'Not null constraint violation - Required field is missing',
    '23514': 'Check constraint violation - Value does not meet validation rules',

    // Insufficient Privilege
    '42501': 'Insufficient privilege - You do not have permission for this operation',

    // Syntax Errors
    '42601': 'Syntax error in SQL statement',
    '42P01': 'Undefined table - Table does not exist',
    '42703': 'Undefined column - Column does not exist',
    '42883': 'Undefined function - Function does not exist',

    // Connection Issues
    '08000': 'Connection exception',
    '08003': 'Connection does not exist',
    '08006': 'Connection failure',
    '08001': 'Unable to establish connection',
    '08004': 'Connection rejected',

    // Transaction Issues
    '25P02': 'Transaction is aborted, commands ignored until end of transaction block',
    '40001': 'Serialization failure - Transaction was rolled back due to concurrent update',
    '40P01': 'Deadlock detected',

    // Data Issues
    '22001': 'String data too long for column',
    '22003': 'Numeric value out of range',
    '22007': 'Invalid datetime format',
    '22P02': 'Invalid text representation',

    // Row Level Security
    'PGRST301': 'Row Level Security policy violation - You may not have access to this resource',

    // Rate Limiting
    '54000': 'Statement timeout - Query took too long to execute',
    '57014': 'Query was cancelled due to statement timeout',
  }

  return errorMap[code] || null
}

/**
 * Format error for logging with all available details
 */
export function formatSupabaseErrorForLogging(error: PostgrestError | AuthError | StorageError | unknown): {
  message: string
  details: Record<string, any>
} {
  const convertedError = convertSupabaseError(error)

  const details: Record<string, any> = {
    name: convertedError.name,
    message: convertedError.message,
  }

  // Add all additional properties
  Object.keys(convertedError).forEach(key => {
    if (!['name', 'message', 'stack'].includes(key)) {
      details[key] = (convertedError as any)[key]
    }
  })

  // Include stack trace if available (for debugging)
  if (convertedError.stack) {
    details.stack = convertedError.stack
  }

  return {
    message: convertedError.message,
    details
  }
}

/**
 * Helper to safely extract error message
 */
export function getSupabaseErrorMessage(error: unknown): string {
  if (isPostgrestError(error)) {
    return error.message || 'Database operation failed'
  }

  if (isAuthError(error)) {
    return error.message || 'Authentication failed'
  }

  if (isStorageError(error)) {
    return error.message || 'Storage operation failed'
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return (error as any).message || 'Operation failed'
  }

  if (error instanceof Error) {
    return error.message
  }

  return String(error) || 'Unknown error occurred'
}