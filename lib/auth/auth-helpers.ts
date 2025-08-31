import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import type { cookies as cookiesType } from 'next/headers'

export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { supabaseResponse, user }
}

export async function getUser() {
  try {
    // Dynamic import to avoid webpack issues in Next.js 15.5.0
    let cookieStore: Awaited<ReturnType<typeof cookiesType>>
    try {
      const nextHeaders = await import('next/headers')
      cookieStore = await nextHeaders.cookies()
    } catch (error) {
      console.error('[getUser] Failed to import cookies:', error)
      return null
    }
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
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch (error) {
              // Edge runtime might have issues setting cookies in some contexts
              console.error('Error setting cookies:', error)
            }
          },
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    return user
  } catch (error) {
    console.error('[getUser] Error:', error)
    return null
  }
}