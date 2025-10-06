import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/auth/auth-helpers'

// Middleware runs in edge runtime by default, no explicit export needed

/**
 * Track user activity by updating last_sign_in_at timestamp
 * This runs asynchronously to avoid blocking the request
 */
async function trackUserActivity(userId: string, request: NextRequest) {
  try {
    // Skip tracking for frequent API calls to avoid DB spam
    const path = request.nextUrl.pathname
    const skipPaths = [
      '/api/monitoring',
      '/api/admin/ollama',
      '/_next',
      '/favicon',
      '.png',
      '.jpg',
      '.svg'
    ]

    if (skipPaths.some(skip => path.includes(skip))) {
      return
    }

    // Use fetch to call our API endpoint
    // This runs in the background without blocking
    const baseUrl = request.nextUrl.origin
    fetch(`${baseUrl}/api/admin/users/track-activity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId })
    }).catch(() => {
      // Silently ignore errors - activity tracking is non-critical
    })
  } catch (error) {
    // Activity tracking should never break the app
    console.error('[Middleware] Activity tracking error:', error)
  }
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Skip middleware for auth callback
  if (path === '/auth/callback') {
    console.log('[Middleware] Skipping auth callback route')
    return NextResponse.next()
  }

  try {
    const { supabaseResponse, user } = await updateSession(request)
    console.log(`[Middleware] Path: ${path}, User: ${user ? 'authenticated' : 'anonymous'}`)

    // Track user activity if authenticated
    if (user?.id) {
      // Fire and forget - don't await
      trackUserActivity(user.id, request)
    }

    // Protected routes
    const protectedPaths = ['/dashboard', '/projects', '/settings', '/analytics', '/team', '/documents', '/admin']
    const authPaths = ['/login', '/signup']

    const isProtectedPath = protectedPaths.some(p => path.startsWith(p))
    const isAuthPath = authPaths.some(p => path.startsWith(p))

    // Redirect to login if accessing protected route without auth
    if (isProtectedPath && !user) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/login'
      redirectUrl.searchParams.set('redirectTo', path)
      return Response.redirect(redirectUrl)
    }

    // Redirect to dashboard if accessing auth pages while logged in
    if (isAuthPath && user) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/dashboard'
      return Response.redirect(redirectUrl)
    }

    return supabaseResponse
  } catch (error) {
    console.error('[Middleware] Error:', error)
    console.error('[Middleware] Error details:', {
      path,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    // Return next response without auth processing if there's an error
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}