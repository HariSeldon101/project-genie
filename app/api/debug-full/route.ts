import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    
    // Collect all environment information
    const debugInfo = {
      timestamp: new Date().toISOString(),
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
        env: process.env.NODE_ENV,
      },
      nextjs: {
        runtime: process.env.NEXT_RUNTIME || 'unknown',
        version: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'development',
      },
      url: {
        href: url.href,
        origin: url.origin,
        pathname: url.pathname,
        host: url.host,
        protocol: url.protocol,
      },
      environment: {
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'NOT SET',
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET (hidden)' : 'NOT SET',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET (hidden)' : 'NOT SET',
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET (hidden)' : 'NOT SET',
        STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? 'SET (hidden)' : 'NOT SET',
        STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ? 'SET (hidden)' : 'NOT SET',
        RESEND_API_KEY: process.env.RESEND_API_KEY ? 'SET (hidden)' : 'NOT SET',
        OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'SET (hidden)' : 'NOT SET',
        DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY ? 'SET (hidden)' : 'NOT SET',
      },
      vercel: {
        ENV: process.env.VERCEL_ENV || 'NOT ON VERCEL',
        URL: process.env.VERCEL_URL || 'NOT SET',
        REGION: process.env.VERCEL_REGION || 'NOT SET',
        GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA || 'NOT SET',
      },
      headers: {
        'x-forwarded-for': request.headers.get('x-forwarded-for'),
        'x-forwarded-proto': request.headers.get('x-forwarded-proto'),
        'x-forwarded-host': request.headers.get('x-forwarded-host'),
        'host': request.headers.get('host'),
        'user-agent': request.headers.get('user-agent'),
      },
      // Test if we can import modules
      moduleTests: {
        nextResponse: typeof NextResponse !== 'undefined' ? 'OK' : 'FAILED',
      },
      status: 'success'
    }
    
    return NextResponse.json(debugInfo, { status: 200 })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}