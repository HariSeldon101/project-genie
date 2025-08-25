import { createBrowserClient } from '@supabase/ssr'

/**
 * Ensures that the authenticated user has a profile in the database
 * Creates one if it doesn't exist
 */
export async function ensureUserProfile() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  try {
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('Auth error in ensureUserProfile:', authError)
      return { success: false, error: authError || new Error('No user found') }
    }

    // Check if profile exists
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    // Profile exists, all good
    if (existingProfile) {
      return { success: true, profile: existingProfile }
    }

    // Profile doesn't exist, create it
    console.log('Profile not found, creating for user:', user.id)
    
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating profile:', createError)
      
      // If it's a unique constraint error, the profile might exist but we couldn't read it
      // Try to fetch it again
      if (createError.code === '23505') {
        const { data: retryProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single()
        
        if (retryProfile) {
          return { success: true, profile: retryProfile }
        }
      }
      
      return { success: false, error: createError }
    }

    console.log('Profile created successfully:', newProfile)
    return { success: true, profile: newProfile }
  } catch (error) {
    console.error('Unexpected error in ensureUserProfile:', error)
    return { success: false, error }
  }
}