import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixMissingProfiles() {
  try {
    console.log('Fetching all users from auth.users...')
    
    // Get all users
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
    
    if (usersError) {
      console.error('Error fetching users:', usersError)
      return
    }
    
    console.log(`Found ${users.users.length} users`)
    
    // Check which users don't have profiles
    const { data: existingProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return
    }
    
    const existingProfileIds = new Set(existingProfiles?.map(p => p.id) || [])
    const usersWithoutProfiles = users.users.filter(user => !existingProfileIds.has(user.id))
    
    console.log(`Found ${usersWithoutProfiles.length} users without profiles`)
    
    // Create profiles for users who don't have them
    for (const user of usersWithoutProfiles) {
      const fullName = user.user_metadata?.full_name || 
                       user.user_metadata?.name || 
                       user.email?.split('@')[0] || 
                       'Unknown'
      
      console.log(`Creating profile for ${user.email}...`)
      
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          full_name: fullName,
          created_at: user.created_at,
          updated_at: new Date().toISOString()
        })
      
      if (error) {
        console.error(`Error creating profile for ${user.email}:`, error)
      } else {
        console.log(`✓ Profile created for ${user.email}`)
      }
    }
    
    console.log('Done!')
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

fixMissingProfiles()