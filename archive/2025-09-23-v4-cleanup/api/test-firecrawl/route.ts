/**
 * Firecrawl API Connection Test Endpoint
 *
 * Tests the Firecrawl API configuration and connection status.
 * Used by the UI to display real-time API availability.
 *
 * @endpoint GET /api/company-intelligence/test-firecrawl
 */

import { NextResponse } from 'next/server'
import { firecrawlConfig, validateFirecrawlConfig } from '@/lib/config/firecrawl'
import { permanentLogger } from '@/lib/utils/permanent-logger'

export async function GET() {
  console.log('[test-firecrawl] API endpoint called at', new Date().toISOString())
  const timer = permanentLogger.timing('firecrawl_api_test')

  permanentLogger.breadcrumb('api_entry', 'Testing Firecrawl API connection', {
    endpoint: '/api/company-intelligence/test-firecrawl',
    timestamp: new Date().toISOString()
  })

  try {
    // Validate configuration
    console.log('[test-firecrawl] Validating Firecrawl configuration...')
    const validation = validateFirecrawlConfig()

    if (!validation.valid) {
      permanentLogger.info('FIRECRAWL_TEST', validation.message, {
        severity: validation.severity
      })

      return NextResponse.json({
        status: validation.severity === 'error' ? 'invalid_key' : 'not_configured',
        message: validation.message,
        canScrape: false
      })
    }

    // Test API connection with account endpoint
    const apiEndpoint = firecrawlConfig.getCreditsEndpoint()
    console.log('[test-firecrawl] Calling API endpoint:', apiEndpoint)
    permanentLogger.breadcrumb('external_call_start', 'Calling Firecrawl account endpoint', {
      endpoint: apiEndpoint
    })

    const response = await fetch(
      apiEndpoint,
      {
        method: 'GET',
        headers: firecrawlConfig.getHeaders(),
        signal: AbortSignal.timeout(5000) // 5 second timeout
      }
    )

    console.log('[test-firecrawl] API response status:', response.status)

    const duration = timer.stop()

    permanentLogger.breadcrumb('external_call_end', 'Firecrawl API response received', {
      status: response.status,
      duration
    })

    // Handle successful response
    if (response.ok) {
      const data = await response.json()

      permanentLogger.info('FIRECRAWL_TEST', 'API connection successful', {
        credits: data.credits || data.remainingCredits || 0,
        responseTime: duration
      })

      return NextResponse.json({
        status: 'connected',
        message: 'Firecrawl API connected successfully',
        canScrape: true,
        credits: data.credits || data.remainingCredits || 0,
        responseTime: duration
      })
    }

    // Handle specific error codes
    if (response.status === 401) {
      permanentLogger.warn('FIRECRAWL_TEST', 'Invalid API key', {
        status: response.status
      })

      return NextResponse.json({
        status: 'invalid_key',
        message: 'Invalid API key - check your FIRECRAWL_API_KEY',
        canScrape: false
      })
    }

    if (response.status === 429) {
      permanentLogger.warn('FIRECRAWL_TEST', 'Rate limited', {
        status: response.status
      })

      return NextResponse.json({
        status: 'error',
        message: 'Rate limited - too many requests',
        canScrape: false
      })
    }

    // Handle other errors
    permanentLogger.warn('FIRECRAWL_TEST', `API error: ${response.status}`, {
      status: response.status,
      statusText: response.statusText
    })

    return NextResponse.json({
      status: 'error',
      message: `API error: ${response.status} ${response.statusText}`,
      canScrape: false
    })

  } catch (error) {
    timer.stop()

    // Handle timeout specifically
    if (error instanceof Error && error.name === 'AbortError') {
      permanentLogger.captureError('FIRECRAWL_TEST', error, {
        type: 'timeout'
      })

      return NextResponse.json({
        status: 'error',
        message: 'Connection timeout - Firecrawl API may be down',
        canScrape: false
      })
    }

    // Handle other connection errors
    permanentLogger.captureError('FIRECRAWL_TEST', error as Error, {
      apiUrl: firecrawlConfig.apiUrl
    })

    return NextResponse.json({
      status: 'connection_error',
      message: 'Cannot reach Firecrawl API - check your internet connection',
      canScrape: false
    })
  }
}