import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfilesRepository } from '@/lib/repositories/profiles-repository'

export async function checkAdminAuth() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Check if user is admin using ProfilesRepository
  const profilesRepo = ProfilesRepository.getInstance()
  try {
    const profile = await profilesRepo.getProfileById(user.id)

    if (!profile?.is_admin) {
      redirect('/dashboard')
    }

    return { user, isAdmin: true }
  } catch (error) {
    // If profile doesn't exist or error, redirect to dashboard
    redirect('/dashboard')
  }
}

export async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    // Use ProfilesRepository instead of direct database access
    const profilesRepo = ProfilesRepository.getInstance()
    const profile = await profilesRepo.getProfileById(userId)
    return profile?.is_admin || false
  } catch (error) {
    console.error('[isUserAdmin] Failed to get profile:', error)
    return false
  }
}

/**
 * Validates admin authentication for API routes
 * Returns user and admin status WITHOUT redirecting
 * This is the proper pattern for API routes
 */
export async function validateAdminAuthForAPI() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      authenticated: false,
      isAdmin: false,
      user: null,
      error: 'Not authenticated'
    }
  }

  // Check if user is admin using ProfilesRepository
  const profilesRepo = ProfilesRepository.getInstance()
  try {
    const profile = await profilesRepo.getProfileById(user.id)

    if (!profile?.is_admin) {
      return {
        authenticated: true,
        isAdmin: false,
        user,
        error: 'Not authorized - admin access required'
      }
    }

    return {
      authenticated: true,
      isAdmin: true,
      user,
      error: null
    }
  } catch (error) {
    return {
      authenticated: true,
      isAdmin: false,
      user,
      error: 'Failed to verify admin status'
    }
  }
}