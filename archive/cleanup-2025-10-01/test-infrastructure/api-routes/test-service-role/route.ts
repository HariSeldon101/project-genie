/**
 * Service Role Key Validation Endpoint
 *
 * Purpose: Test and validate that the service role key is working correctly
 * and can bypass RLS policies as expected.
 *
 * Security: This endpoint is for diagnostic purposes and should only be
 * accessible to admins or during development.
 *
 * CLAUDE.md Compliance:
 * - Uses direct database access (allowed for logging)
 * - Never returns service role key to client
 * - Provides clear error messages for debugging
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { permanentLogger } from '@/lib/utils/permanent-logger'

export async function GET(req: NextRequest) {
  try {
    permanentLogger.breadcrumb('test_service_role', 'Testing service role key')

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    // Basic environment check
    if (!url || !anonKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing basic Supabase configuration',
        hasUrl: !!url,
        hasAnonKey: !!anonKey
      }, { status: 500 })
    }

    const results = {
      environment: {
        hasUrl: !!url,
        hasAnonKey: !!anonKey,
        hasServiceRoleKey: !!serviceRoleKey,
        isProduction: process.env.NODE_ENV === 'production'
      },
      tests: {
        anonKeyTest: { success: false, message: '' },
        serviceRoleTest: { success: false, message: '' },
        rlsBypassTest: { success: false, message: '' },
        systemLogsTest: { success: false, message: '' }
      }
    }

    // Test 1: Anon key basic connectivity
    try {
      const anonClient = createClient(url, anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      })

      const { count, error } = await anonClient
        .from('permanent_logs')
        .select('*', { count: 'exact', head: true })

      if (error) {
        results.tests.anonKeyTest = {
          success: false,
          message: `Anon key failed: ${error.message}`
        }
      } else {
        results.tests.anonKeyTest = {
          success: true,
          message: `Anon key can query table (${count} rows)`
        }
      }
    } catch (err: any) {
      results.tests.anonKeyTest = {
        success: false,
        message: `Anon key error: ${err.message}`
      }
    }

    // Test 2: Service role key connectivity (if available)
    if (serviceRoleKey) {
      try {
        const serviceClient = createClient(url, serviceRoleKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        })

        const { count, error } = await serviceClient
          .from('permanent_logs')
          .select('*', { count: 'exact', head: true })

        if (error) {
          results.tests.serviceRoleTest = {
            success: false,
            message: `Service role failed: ${error.message}`
          }
        } else {
          results.tests.serviceRoleTest = {
            success: true,
            message: `Service role can query table (${count} rows)`
          }
        }
      } catch (err: any) {
        results.tests.serviceRoleTest = {
          success: false,
          message: `Service role error: ${err.message}`
        }
      }

      // Test 3: RLS bypass test (insert without user context)
      try {
        const serviceClient = createClient(url, serviceRoleKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        })

        const testLog = {
          log_level: 'debug',
          category: 'SERVICE_ROLE_TEST',
          message: 'Testing service role RLS bypass',
          data: { test: true, timestamp: new Date().toISOString() }
        }

        const { error } = await serviceClient
          .from('permanent_logs')
          .insert(testLog)

        if (error) {
          results.tests.rlsBypassTest = {
            success: false,
            message: `RLS bypass failed: ${error.message}`
          }
        } else {
          results.tests.rlsBypassTest = {
            success: true,
            message: 'Service role successfully bypassed RLS'
          }
        }
      } catch (err: any) {
        results.tests.rlsBypassTest = {
          success: false,
          message: `RLS bypass error: ${err.message}`
        }
      }

      // Test 4: System logs table test
      try {
        const serviceClient = createClient(url, serviceRoleKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        })

        const testLog = {
          log_level: 'debug',
          category: 'SYSTEM_LOGS_TEST',
          message: 'Testing system_logs fallback table',
          data: { test: true, timestamp: new Date().toISOString() }
        }

        const { error } = await serviceClient
          .from('system_logs')
          .insert(testLog)

        if (error) {
          // Table might not exist yet if migration hasn't run
          if (error.message.includes('relation') && error.message.includes('does not exist')) {
            results.tests.systemLogsTest = {
              success: false,
              message: 'system_logs table not created yet (run migration)'
            }
          } else {
            results.tests.systemLogsTest = {
              success: false,
              message: `System logs failed: ${error.message}`
            }
          }
        } else {
          results.tests.systemLogsTest = {
            success: true,
            message: 'Successfully wrote to system_logs table'
          }
        }
      } catch (err: any) {
        results.tests.systemLogsTest = {
          success: false,
          message: `System logs error: ${err.message}`
        }
      }
    } else {
      results.tests.serviceRoleTest = {
        success: false,
        message: 'Service role key not configured in environment'
      }
      results.tests.rlsBypassTest = {
        success: false,
        message: 'Cannot test - service role key missing'
      }
      results.tests.systemLogsTest = {
        success: false,
        message: 'Cannot test - service role key missing'
      }
    }

    // Determine overall status
    const allTestsPassed = Object.values(results.tests).every(test => test.success)

    permanentLogger.info('SERVICE_ROLE_TEST', 'Service role test completed', results)

    return NextResponse.json({
      success: allTestsPassed,
      message: allTestsPassed
        ? 'All tests passed - logging system fully operational'
        : 'Some tests failed - check individual test results',
      results
    }, { status: allTestsPassed ? 200 : 500 })

  } catch (error) {
    permanentLogger.captureError('SERVICE_ROLE_TEST', error as Error, {
      endpoint: '/api/logs/test-service-role'
    })

    return NextResponse.json({
      success: false,
      error: 'Test endpoint error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}