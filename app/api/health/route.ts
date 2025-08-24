import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.version,
    nextVersion: process.env.NEXT_RUNTIME || 'unknown'
  })
}