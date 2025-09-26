/**
 * Client Error Reporting API Endpoint
 *
 * CLAUDE.md Compliance:
 * - Uses Repository Pattern (LogsRepository)
 * - NO mock data or fallbacks
 * - Proper error handling with captureError()
 * - NO graceful degradation - errors bubble up
 * - Uses proper TypeScript types
 *
 * This endpoint receives error reports from client-side code
 * and logs them using the server-side logger with proper auth.
 */

import { NextRequest, NextResponse } from 'next/server'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { LogsRepository } from '@/lib/repositories/logs-repository'
import { z } from 'zod'

// Define the expected request schema
const ClientErrorSchema = z.object({
  message: z.string(),
  stack: z.string().optional(),
  category: z.string().default('CLIENT_ERROR'),
  errorName: z.string().optional(),
  url: z.string().optional(),
  userAgent: z.string().optional(),
  breadcrumbs: z.array(z.any()).optional(),
  metadata: z.record(z.any()).optional()
})

type ClientErrorRequest = z.infer<typeof ClientErrorSchema>

export async function POST(request: NextRequest) {
  const routeCategory = 'CLIENT_ERROR_ROUTE'

  // Add breadcrumb for request tracking
  permanentLogger.breadcrumb('route_entry', 'Client error report received', {
    url: request.url,
    timestamp: new Date().toISOString()
  })

  try {
    // Parse and validate the request body
    const body = await request.json()

    // Validate using Zod schema - NO fallback values
    const validatedData = ClientErrorSchema.parse(body)

    // Log the client error using server-side logger
    // This uses the server auth context, avoiding RLS issues
    permanentLogger.captureError(
      validatedData.category,
      new Error(validatedData.message),
      {
        stack: validatedData.stack,
        errorName: validatedData.errorName,
        url: validatedData.url,
        userAgent: validatedData.userAgent,
        breadcrumbs: validatedData.breadcrumbs,
        metadata: {
          ...validatedData.metadata,
          source: 'client',
          reportedAt: new Date().toISOString()
        }
      }
    )

    // Also store in database via repository for searchability
    // Following CLAUDE.md: UI Component → API Route → Repository → Database
    const logsRepo = LogsRepository.getInstance()

    // Create a structured log entry
    const logEntry = {
      log_level: 'error' as const,
      category: validatedData.category,
      message: validatedData.message,
      data: {
        errorName: validatedData.errorName,
        url: validatedData.url,
        userAgent: validatedData.userAgent,
        metadata: validatedData.metadata
      },
      stack: validatedData.stack,
      breadcrumbs: validatedData.breadcrumbs,
      environment: process.env.NODE_ENV || 'development'
    }

    // Store via repository (this will be implemented next)
    await logsRepo.createClientError(logEntry)

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Error logged successfully'
    })

  } catch (error) {
    // CLAUDE.md: Never swallow errors silently
    permanentLogger.captureError(routeCategory, error as Error, {
      endpoint: '/api/logs/client-error',
      method: 'POST'
    })

    // Return error response - NO fallback data
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors
        },
        { status: 400 }
      )
    }

    // Generic error response
    return NextResponse.json(
      {
        error: 'Failed to log client error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// OPTIONS method for CORS if needed
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}