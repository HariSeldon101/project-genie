import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { permanentLogger } from '@/lib/utils/permanent-logger'

// ✅ CLAUDE.md Compliance:
// - NO ProfilesRepository import (Line 254: Repository pattern for API routes)
// - NO manual profile creation (Line 826-843: Automatic via trigger)
// - Proper error handling with permanentLogger.captureError (Line 248)
// - NO FALLBACK DATA (Line 239)

export async function GET(request: Request) {
  const timer = permanentLogger.timing('auth.callback.process')
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'
  const origin = requestUrl.origin

  permanentLogger.breadcrumb('auth', 'Processing auth callback', {
    hasCode: !!code,
    nextPath: next
  })

  if (!code) {
    permanentLogger.warn('AUTH_CALLBACK', 'No authorization code provided', {
      url: requestUrl.toString()
    })
    timer.stop()
    return NextResponse.redirect(new URL('/login?error=no_code', origin))
  }

  try {
    // Create redirect response first so we can set cookies on it
    const redirectUrl = new URL(next, origin)
    const response = NextResponse.redirect(redirectUrl)

    // Create Supabase client for Edge runtime with cookie handling
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            const cookieStore = request.headers.get('cookie')
            if (!cookieStore) return []

            return cookieStore.split(';').map(cookie => {
              const [name, value] = cookie.trim().split('=')
              return { name, value }
            })
          },
          setAll(cookiesToSet) {
            // Set cookies on the response
            cookiesToSet.forEach(({ name, value, options }) => {
              const cookieOptions = options || {}
              response.cookies.set({
                name,
                value,
                ...cookieOptions,
                sameSite: cookieOptions.sameSite as any || 'lax',
                secure: true,
              })
            })
          },
        },
      }
    )

    // Exchange code for session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      // ✅ CLAUDE.md Line 240: "NO SILENT FAILURES"
      permanentLogger.captureError('AUTH_CALLBACK', error, {
        operation: 'exchange_code',
        code: code.substring(0, 8) + '...' // Log partial code for debugging
      })
      return NextResponse.redirect(new URL(`/login?error=${error.message}`, origin))
    }

    if (data.session) {
      // ✅ CLAUDE.md Line 833-837: Profile creation process
      // 1. User signs up via Supabase Auth ✓
      // 2. Database trigger `on_auth_user_created` fires automatically ✓
      // 3. Profile is created with data from auth metadata ✓
      // 4. Updates are synced via `on_auth_user_updated` trigger ✓

      // The PostgreSQL trigger automatically:
      // - Creates profile with email and metadata (name, avatar_url)
      // - Handles OAuth provider metadata extraction
      // - Performs upsert to handle race conditions
      // - Updates profile when auth metadata changes

      permanentLogger.info('AUTH_CALLBACK', 'Authentication successful', {
        userId: data.session.user.id,
        email: data.session.user.email,
        provider: data.session.user.app_metadata.provider || 'email'
      })

      permanentLogger.breadcrumb('auth', 'Session established', {
        userId: data.session.user.id,
        expiresAt: data.session.expires_at
      })
    }

    const duration = timer.stop()
    permanentLogger.timing('auth.callback.success', duration)

    return response
  } catch (error) {
    // ✅ CLAUDE.md Line 248: "ALWAYS USE captureError FOR ERROR LOGGING"
    permanentLogger.captureError('AUTH_CALLBACK', error as Error, {
      operation: 'callback_processing',
      code: code ? code.substring(0, 8) + '...' : 'none',
      next
    })
    timer.stop()

    // NO FALLBACK - return error to user
    return NextResponse.redirect(new URL('/login?error=callback_error', origin))
  }
}

export const runtime = 'edge'