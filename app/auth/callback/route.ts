import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'
  
  // Debug logging
  console.log('Auth callback initiated with code:', code?.substring(0, 8) + '...')
  console.log('Redirect target:', next)
  
  if (!code) {
    console.error('No code provided to auth callback')
    return NextResponse.redirect(new URL('/login?error=no_code', requestUrl.origin))
  }

  try {
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
              console.error('Cookie setting error:', error)
            }
          },
        },
      }
    )

    console.log('Exchanging code for session...')
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Session exchange error:', error)
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin)
      )
    }

    console.log('Session established successfully')
    
    // Get user to ensure session is valid
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('User fetch error:', userError)
      return NextResponse.redirect(
        new URL('/login?error=session_invalid', requestUrl.origin)
      )
    }

    console.log('User authenticated:', user.email)
    
    // Check if user profile exists
    try {
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single()
      
      if (profileError && profileError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        console.log('Creating user profile...')
        const { error: insertError } = await supabase.from('users').insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
        })
        
        if (insertError) {
          console.error('Profile creation error:', insertError)
        } else {
          console.log('Profile created successfully')
        }
      }
    } catch (profileError) {
      console.error('Profile check error:', profileError)
    }
    
    // Successful authentication - redirect to next page
    console.log('Redirecting to:', next)
    return NextResponse.redirect(new URL(next, requestUrl.origin))
    
  } catch (error: any) {
    console.error('Auth callback exception:', error)
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message || 'Unknown error')}`, requestUrl.origin)
    )
  }
}