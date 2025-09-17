import { NextRequest, NextResponse } from 'next/server'
import { permanentLogger } from '@/lib/utils/permanent-logger'

export async function POST(request: NextRequest) {
  // Set correlation ID for this request
  const requestId = `test-${Date.now()}`
  permanentLogger.setCorrelationId(requestId)
  permanentLogger.breadcrumb('navigation', 'Test log generation API called', { method: 'POST' })

  try {
    permanentLogger.breadcrumb('action', 'Generating test logs', { count: 4 })

    // Generate test logs
    permanentLogger.info('TEST_LOG', 'Test info message from API', { timestamp: new Date().toISOString() })
    permanentLogger.warn('TEST_LOG', 'Test warning message from API', { testData: 'warning' })
    permanentLogger.captureError('TEST_LOG', new Error('Test error message from API'), { testData: 'error' })
    permanentLogger.debug('TEST_LOG', 'Test debug message from API', { testData: 'debug' })

    permanentLogger.breadcrumb('action', 'Test logs generated successfully', { count: 4 })

    // Force flush to database
    await permanentLogger.flush()

    // Get recent breadcrumbs
    const breadcrumbs = permanentLogger.getBreadcrumbs()
    
    return NextResponse.json({
      success: true,
      message: 'Test logs generated',
      logsGenerated: 4,
      breadcrumbCount: breadcrumbs.length,
      requestId
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate test logs', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}