import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'
  
  // First, test if this route is even being called
  console.log('=== AUTH CALLBACK STARTED ===')
  console.log('Code:', code?.substring(0, 8) + '...')
  console.log('Next:', next)
  console.log('Origin:', requestUrl.origin)
  
  if (!code) {
    console.log('No code provided, redirecting to login')
    return NextResponse.redirect(new URL('/login?error=no_code', requestUrl.origin))
  }

  try {
    // Check if environment variables are set
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables')
      return NextResponse.redirect(new URL('/login?error=config_error', requestUrl.origin))
    }
    
    console.log('Creating Supabase client...')
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            } catch (error) {
              console.error('Cookie error:', error)
            }
          },
        },
      }
    )

    console.log('Exchanging code for session...')
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Exchange error:', error.message, error.status, error.name)
      // Include more details in the error redirect
      const errorUrl = new URL('/login', requestUrl.origin)
      errorUrl.searchParams.set('error', error.message)
      errorUrl.searchParams.set('error_code', error.status?.toString() || 'unknown')
      return NextResponse.redirect(errorUrl)
    }

    console.log('Session established successfully')
    
    // Verify we can get the user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('User verification failed:', userError)
      return NextResponse.redirect(new URL('/login?error=user_verification_failed', requestUrl.origin))
    }

    console.log('User verified:', user.email)
    
    // Skip profile creation for now to simplify
    console.log('Redirecting to:', next)
    
    // Create the redirect response
    const redirectUrl = new URL(next, requestUrl.origin)
    console.log('Full redirect URL:', redirectUrl.toString())
    
    return NextResponse.redirect(redirectUrl)
    
  } catch (error: any) {
    console.error('=== CALLBACK ERROR ===')
    console.error('Type:', error.constructor.name)
    console.error('Message:', error.message)
    console.error('Stack:', error.stack)
    
    const errorUrl = new URL('/login', requestUrl.origin)
    errorUrl.searchParams.set('error', 'callback_exception')
    errorUrl.searchParams.set('message', error.message || 'Unknown error')
    return NextResponse.redirect(errorUrl)
  }
}