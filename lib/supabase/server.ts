import { createServerClient } from '@supabase/ssr'
import type { cookies as cookiesType } from 'next/headers'

export async function createClient() {
  // Dynamic import to avoid webpack issues in Next.js 15.5.0
  let cookieStore: Awaited<ReturnType<typeof cookiesType>>
  try {
    const nextHeaders = await import('next/headers')
    cookieStore = await nextHeaders.cookies()
  } catch (error) {
    console.error('[createClient] Failed to import cookies:', error)
    throw error
  }

  return createServerClient(
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
          } catch {
            // Server Component, ignore
          }
        },
      },
    }
  )
}
