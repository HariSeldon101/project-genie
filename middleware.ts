import { NextRequest } from 'next/server'
import { updateSession } from '@/lib/auth/auth-helpers'

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)

  // Protected routes
  const protectedPaths = ['/dashboard', '/projects', '/settings']
  const authPaths = ['/login', '/signup', '/auth']
  
  const path = request.nextUrl.pathname
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
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}