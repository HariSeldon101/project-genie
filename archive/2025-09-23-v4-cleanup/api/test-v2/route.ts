/**
 * Test endpoint for Company Intelligence
 * Returns mock data immediately without any processing
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: 'Company Intelligence API is running',
    testMode: true,
    timestamp: new Date().toISOString()
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  
  // Return mock company pack immediately
  const mockPack = {
    id: 'test-' + Date.now(),
    domain: body.domain || 'example.com',
    companyName: 'Example Company',
    generatedAt: new Date().toISOString(),
    basics: {
      companyName: 'Example Company',
      industry: 'Technology',
      founded: '2020',
      headquarters: 'San Francisco, CA',
      website: body.domain || 'example.com'
    },
    metadata: {
      dataQuality: 85,
      scrapingDetails: {
        pagesScraped: 5,
        totalPages: 8,
        duration: 1234,
        errors: []
      }
    },
    success: true
  }
  
  return NextResponse.json({
    success: true,
    packId: mockPack.id,
    pack: mockPack,
    metrics: {
      duration: 100,
      pagesScraped: 5,
      dataQuality: 85
    }
  })
}