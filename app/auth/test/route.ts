import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  
  return NextResponse.json({
    message: 'Auth test endpoint working',
    origin: requestUrl.origin,
    pathname: requestUrl.pathname,
    search: requestUrl.search,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET',
    },
    timestamp: new Date().toISOString()
  })
}