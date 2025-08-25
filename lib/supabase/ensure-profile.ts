import { createBrowserClient } from '@supabase/ssr'

/**
 * Ensures that the authenticated user has a profile in the database
 * Creates one if it doesn't exist
 * This is the primary function for ensuring profiles exist before any operations
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

    console.log('Ensuring profile for user:', user.id, user.email)

    // Check if profile exists in profiles table
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle() // Use maybeSingle to avoid error if not found

    // Profile exists, all good
    if (existingProfile) {
      console.log('Profile already exists:', existingProfile.id)
      return { success: true, profile: existingProfile }
    }

    // Profile doesn't exist, create it
    console.log('Profile not found, creating for user:', user.id)
    
    // Extract user metadata for full name
    const fullName = user.user_metadata?.full_name || 
                    user.user_metadata?.name ||
                    user.email?.split('@')[0] || 
                    'User'
    
    const profileData = {
      id: user.id,
      email: user.email!,
      full_name: fullName,
      subscription_tier: 'free',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    console.log('Attempting to create profile with data:', profileData)
    
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert(profileData)
      .select()
      .single()

    if (createError) {
      console.error('Error creating profile:', createError)
      
      // If it's a unique constraint error, the profile exists (race condition)
      // Try to fetch it again
      if (createError.code === '23505') {
        console.log('Profile already exists (race condition), fetching...')
        
        const { data: retryProfile, error: retryError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (retryProfile) {
          console.log('Successfully fetched existing profile')
          return { success: true, profile: retryProfile }
        }
        
        if (retryError) {
          console.error('Error fetching profile on retry:', retryError)
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