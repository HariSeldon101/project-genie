import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth/auth-helpers'
import { DashboardNav } from '@/components/dashboard/nav'
import { UserMenu } from '@/components/dashboard/user-menu'
import { createServerClient } from '@supabase/ssr'
import type { cookies as cookiesType } from 'next/headers'

export const dynamic = 'force-dynamic'

async function ensureProfileExists(userId: string, email: string) {
  // Dynamic import to avoid webpack issues in Next.js 15.5.0
  let cookieStore: Awaited<ReturnType<typeof cookiesType>>
  try {
    const nextHeaders = await import('next/headers')
    cookieStore = await nextHeaders.cookies()
  } catch (error) {
    console.error('[Dashboard Layout] Failed to import cookies:', error)
    throw error
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
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch (error) {
            // Cookie setting might fail in some contexts
            console.error('[Dashboard Layout] Error setting cookies:', error)
          }
        },
      },
    }
  )

  try {
    // Check if profile exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (!profile) {
      console.log('[Dashboard Layout] Creating missing profile for user:', userId)
      
      // Create profile if it doesn't exist
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: email,
          full_name: email.split('@')[0] || 'User',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          subscription_tier: 'free'
        })
      
      if (error && error.code !== '23505') { // Ignore unique constraint errors
        console.error('[Dashboard Layout] Error creating profile:', error)
      }
    }
  } catch (error) {
    console.error('[Dashboard Layout] Error in ensureProfileExists:', error)
    // Don't throw - allow the user to continue even if profile creation fails
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  try {
    const user = await getUser()

    if (!user) {
      redirect('/login')
    }

    // Ensure profile exists for the authenticated user
    if (user.email) {
      await ensureProfileExists(user.id, user.email)
    }

    return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex h-screen">
        <DashboardNav />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-6 py-4">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Project Genie
              </h1>
              <UserMenu user={user} />
            </div>
          </header>
          
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
  } catch (error) {
    console.error('[Dashboard Layout] Error in layout:', error)
    // If there's an error, redirect to login
    redirect('/login')
  }
}
