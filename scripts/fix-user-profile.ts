import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

async function fixUserProfile() {
  const userId = '33d0ca9f-be05-458f-b5bb-c67e4e8f23cf' // Your user ID from the error
  
  console.log('Fixing profile for user:', userId)
  console.log('=' + '='.repeat(50))
  
  // 1. Check if profile exists
  console.log('\n1. Checking if profile exists...')
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (existingProfile) {
    console.log('✅ Profile already exists!')
    console.log('   Full name:', existingProfile.full_name)
    console.log('   Email:', existingProfile.email)
  } else {
    console.log('❌ Profile not found!')
    
    // 2. Get user data from auth
    console.log('\n2. Getting user data from auth...')
    const { data: { user } } = await supabase.auth.admin.getUserById(userId)
    
    if (user) {
      console.log('Found auth user:')
      console.log('   Email:', user.email)
      console.log('   Created:', user.created_at)
      
      // 3. Create profile
      console.log('\n3. Creating profile...')
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          avatar_url: user.user_metadata?.avatar_url,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (profileError) {
        console.log('❌ Failed to create profile:', profileError.message)
      } else {
        console.log('✅ Profile created successfully!')
        console.log('   ID:', newProfile.id)
        console.log('   Email:', newProfile.email)
        console.log('   Full name:', newProfile.full_name)
      }
    } else {
      console.log('❌ User not found in auth!')
      console.log('This user ID might be invalid.')
    }
  }
  
  // 4. Now test project creation
  console.log('\n4. Testing project creation...')
  const testProject = {
    name: 'Data Migration Project',
    description: 'Migrate to AWS',
    owner_id: userId,
    methodology_type: 'prince2',
    rag_status: 'green',
    status: 'planning',
    progress: 0,
    company_info: {
      website: 'bigfluffy.ai',
      sector: 'Telecommunications'
    }
  }
  
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert(testProject)
    .select()
    .single()
  
  if (projectError) {
    console.log('❌ Project creation failed:', projectError.message)
    
    if (projectError.message.includes('foreign key')) {
      console.log('\n⚠️  Profile still missing or not linked properly.')
      console.log('Creating profile manually...')
      
      // Force create profile
      const { error: forceError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: 'user@bigfluffy.ai',
          full_name: 'Project User',
          updated_at: new Date().toISOString()
        })
      
      if (forceError) {
        console.log('Failed to force create:', forceError.message)
      } else {
        console.log('✅ Profile force created!')
        
        // Retry project creation
        const { data: retryProject, error: retryError } = await supabase
          .from('projects')
          .insert(testProject)
          .select()
          .single()
        
        if (retryError) {
          console.log('Still failing:', retryError.message)
        } else {
          console.log('✅ Project created after profile fix!')
          console.log('   Project ID:', retryProject.id)
          
          // Clean up
          await supabase.from('projects').delete().eq('id', retryProject.id)
        }
      }
    }
  } else {
    console.log('✅ Project created successfully!')
    console.log('   Project ID:', project.id)
    console.log('   Project Name:', project.name)
    
    // Clean up test project
    await supabase.from('projects').delete().eq('id', project.id)
    console.log('   Test project cleaned up')
    
    console.log('\n' + '='.repeat(50))
    console.log('✅ EVERYTHING IS WORKING!')
    console.log('=' + '='.repeat(50))
    console.log('\nYou can now create projects at:')
    console.log('https://project-genie-one.vercel.app/projects/new')
  }
}

fixUserProfile()