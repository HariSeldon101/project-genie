/**
 * Request Parser Utility
 *
 * Shared utility for safely parsing JSON request bodies across all API routes.
 * This fixes 20+ DRY violations where every route had duplicate JSON parsing logic.
 *
 * Features:
 * - Safe JSON parsing with error handling
 * - Content-type validation
 * - Request size limits
 * - Optional schema validation
 * - Timing measurements
 * - Comprehensive error logging
 *
 * @module utils/request-parser
 */

import { NextRequest } from 'next/server'
import { permanentLogger } from './permanent-logger'
import { z } from 'zod'

/**
 * Options for request parsing
 */
export interface ParseRequestOptions {
  /**
   * Maximum allowed request body size in bytes
   * Default: 10MB (10 * 1024 * 1024)
   */
  maxBodySize?: number

  /**
   * Whether to require application/json content-type
   * Default: true
   */
  requireJsonContentType?: boolean

  /**
   * Optional Zod schema for validation
   */
  schema?: z.ZodSchema

  /**
   * Category for logging (helps with debugging)
   */
  logCategory?: string
}

/**
 * Result of parsing a request
 */
export interface ParseRequestResult<T = any> {
  success: boolean
  data?: T
  error?: string
  timing?: {
    parseMs: number
    validationMs?: number
  }
}

/**
 * Default maximum body size (10MB)
 * This prevents memory exhaustion from large payloads
 */
const DEFAULT_MAX_BODY_SIZE = 10 * 1024 * 1024 // 10MB

/**
 * Safely parse JSON from a NextRequest with comprehensive error handling
 *
 * This function replaces unsafe `await request.json()` calls throughout the codebase.
 * It provides consistent error handling, validation, and logging across all API routes.
 *
 * @param request - The NextRequest object
 * @param options - Parsing options
 * @returns Parsed and optionally validated request body
 * @throws Never throws - returns error in result object for proper error handling
 *
 * @example
 * ```typescript
 * // Basic usage (replaces unsafe await request.json())
 * const result = await parseJsonRequest(request)
 * if (!result.success) {
 *   return NextResponse.json({ error: result.error }, { status: 400 })
 * }
 * const body = result.data
 *
 * // With schema validation
 * const schema = z.object({
 *   domain: z.string().min(1),
 *   sessionId: z.string().optional()
 * })
 * const result = await parseJsonRequest(request, { schema })
 * ```
 */
export async function parseJsonRequest<T = any>(
  request: NextRequest,
  options: ParseRequestOptions = {}
): Promise<ParseRequestResult<T>> {
  const startTime = Date.now()
  const {
    maxBodySize = DEFAULT_MAX_BODY_SIZE,
    requireJsonContentType = true,
    schema,
    logCategory = 'REQUEST_PARSER'
  } = options

  // Add breadcrumb for request parsing start
  permanentLogger.info(logCategory, 'Starting request parsing', {
    method: request.method,
    url: request.url,
    requireJsonContentType,
    hasSchema: !!schema
  })

  try {
    // Step 1: Validate content-type if required
    if (requireJsonContentType) {
      const contentType = request.headers.get('content-type')
      if (!contentType?.includes('application/json')) {
        const error = `Invalid Content-Type: expected application/json, got ${contentType || 'none'}`
        permanentLogger.captureError(logCategory, new Error(error), {
          contentType,
          url: request.url
        })
        return {
          success: false,
          error,
          timing: { parseMs: Date.now() - startTime }
        }
      }
    }

    // Step 2: Read request body as text first (safer than direct JSON parse)
    let bodyText: string
    try {
      bodyText = await request.text()
    } catch (readError) {
      const error = 'Failed to read request body'
      permanentLogger.captureError(logCategory, readError as Error, {
        url: request.url,
        originalError: String(readError)
      })
      return {
        success: false,
        error,
        timing: { parseMs: Date.now() - startTime }
      }
    }

    // Step 3: Check for empty body
    if (!bodyText || bodyText.trim() === '') {
      const error = 'Request body is empty'
      permanentLogger.captureError(logCategory, new Error(error), {
        url: request.url,
        bodyLength: 0
      })
      return {
        success: false,
        error,
        timing: { parseMs: Date.now() - startTime }
      }
    }

    // Step 4: Check body size
    const bodySize = new Blob([bodyText]).size
    if (bodySize > maxBodySize) {
      const error = `Request body too large: ${bodySize} bytes exceeds maximum of ${maxBodySize} bytes`
      permanentLogger.captureError(logCategory, new Error(error), {
        url: request.url,
        bodySize,
        maxBodySize
      })
      return {
        success: false,
        error,
        timing: { parseMs: Date.now() - startTime }
      }
    }

    // Step 5: Parse JSON with error handling
    let parsedData: any
    const parseStartTime = Date.now()
    try {
      parsedData = JSON.parse(bodyText)
    } catch (parseError) {
      const error = 'Invalid JSON in request body'
      permanentLogger.captureError(logCategory, parseError as Error, {
        url: request.url,
        bodyPreview: bodyText.substring(0, 100),
        parseError: String(parseError)
      })
      return {
        success: false,
        error,
        timing: { parseMs: Date.now() - startTime }
      }
    }
    const parseMs = Date.now() - parseStartTime

    // Step 6: Optional schema validation
    if (schema) {
      const validationStartTime = Date.now()
      try {
        const validated = schema.parse(parsedData)
        const validationMs = Date.now() - validationStartTime

        // Success with validation
        permanentLogger.info(logCategory, 'Request parsed and validated successfully', {
          url: request.url,
          parseMs,
          validationMs,
          totalMs: Date.now() - startTime
        })

        return {
          success: true,
          data: validated as T,
          timing: { parseMs, validationMs }
        }
      } catch (validationError) {
        // Handle Zod validation errors with detailed messages
        let errorMessage = 'Request validation failed'
        if (validationError instanceof z.ZodError) {
          const issues = validationError.errors.map(e => `${e.path.join('.')}: ${e.message}`)
          errorMessage = `Validation failed: ${issues.join(', ')}`
        }

        permanentLogger.captureError(logCategory, validationError as Error, {
          url: request.url,
          validationErrors: validationError instanceof z.ZodError ? validationError.errors : undefined
        })

        return {
          success: false,
          error: errorMessage,
          timing: {
            parseMs,
            validationMs: Date.now() - validationStartTime
          }
        }
      }
    }

    // Success without validation
    permanentLogger.info(logCategory, 'Request parsed successfully', {
      url: request.url,
      parseMs,
      totalMs: Date.now() - startTime
    })

    return {
      success: true,
      data: parsedData as T,
      timing: { parseMs }
    }

  } catch (unexpectedError) {
    // Catch-all for any unexpected errors
    const error = 'Unexpected error parsing request'
    permanentLogger.captureError(logCategory, unexpectedError as Error, {
      url: request.url,
      unexpectedError: String(unexpectedError)
    })

    return {
      success: false,
      error,
      timing: { parseMs: Date.now() - startTime }
    }
  }
}

/**
 * Helper function to create a standardized error response
 * Use this with parseJsonRequest for consistent error responses
 *
 * @param result - The parse result
 * @param statusCode - HTTP status code for error (default: 400)
 * @returns NextResponse with error or null if successful
 *
 * @example
 * ```typescript
 * const result = await parseJsonRequest(request, { schema })
 * const errorResponse = createErrorResponse(result)
 * if (errorResponse) return errorResponse
 *
 * // Continue with result.data
 * ```
 */
export function createErrorResponse(
  result: ParseRequestResult,
  statusCode: number = 400
): Response | null {
  if (!result.success) {
    return new Response(
      JSON.stringify({
        error: result.error,
        timing: result.timing
      }),
      {
        status: statusCode,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
  return null
}

/**
 * Type guard to check if parsing was successful
 * Provides type narrowing for TypeScript
 *
 * @param result - The parse result
 * @returns True if successful with data
 */
export function isParseSuccess<T>(
  result: ParseRequestResult<T>
): result is ParseRequestResult<T> & { success: true; data: T } {
  return result.success === true && result.data !== undefined
}