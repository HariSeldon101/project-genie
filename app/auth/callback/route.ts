import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'
  const origin = requestUrl.origin

  if (!code) {
    console.error('[Auth Callback] No code provided')
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
      console.error('[Auth Callback] Error exchanging code:', error.message)
      return NextResponse.redirect(new URL(`/login?error=${error.message}`, origin))
    }

    if (data.session) {
      console.log('[Auth Callback] Session established for user:', data.session.user.email)
      
      // Ensure profile exists (especially important for OAuth logins)
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.session.user.id)
          .single()
        
        if (!profile) {
          console.log('[Auth Callback] Creating profile for new user:', data.session.user.id)
          
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.session.user.id,
              email: data.session.user.email!,
              full_name: data.session.user.user_metadata?.full_name || 
                         data.session.user.user_metadata?.name ||
                         data.session.user.email?.split('@')[0] || 
                         'User',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              subscription_tier: 'free'
            })
          
          if (profileError && profileError.code !== '23505') { // Ignore unique constraint errors
            console.error('[Auth Callback] Error creating profile:', profileError)
          }
        }
      } catch (error) {
        console.error('[Auth Callback] Error checking/creating profile:', error)
      }
    }

    return response
  } catch (error) {
    console.error('[Auth Callback] Unexpected error:', error)
    return NextResponse.redirect(
      new URL(`/login?error=callback_error`, origin)
    )
  }
}

export const runtime = 'edge'