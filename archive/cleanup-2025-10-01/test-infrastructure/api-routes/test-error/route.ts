/**
 * Test endpoint to verify Supabase error handling
 * This will intentionally trigger an error to test the new error handling
 */

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { convertSupabaseError } from '@/lib/utils/supabase-error-helper'

export async function GET() {
  try {
    const supabase = await createServerClient()

    // Intentionally query a non-existent table to trigger an error
    const { data, error } = await supabase
      .from('non_existent_table_test_12345')
      .select('*')

    if (error) {
      // This is the NEW way - should log proper error message
      const jsError = convertSupabaseError(error)
      permanentLogger.captureError('TEST_ERROR_HANDLER', jsError, {
        operation: 'test_error_endpoint',
        purpose: 'Testing new error handling',
        timestamp: new Date().toISOString()
      })

      return NextResponse.json({
        success: false,
        message: 'Error triggered successfully for testing',
        errorDetails: {
          message: jsError.message,
          name: jsError.name,
          code: (jsError as any).code,
          hint: (jsError as any).hint
        }
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'No error occurred (unexpected)'
    })
  } catch (error) {
    // Fallback error handling
    const jsError = error instanceof Error ? error : new Error(String(error))
    permanentLogger.captureError('TEST_ERROR_HANDLER', jsError, {
      operation: 'test_error_endpoint_catch',
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: false,
      message: 'Caught error in try-catch',
      error: jsError.message
    }, { status: 500 })
  }
}