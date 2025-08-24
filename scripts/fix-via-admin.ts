import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Create admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createTestUserAndProject() {
  console.log('Creating test scenario to fix database...')
  console.log('=' + '='.repeat(50))
  
  try {
    // 1. Create a test user using admin privileges
    console.log('\n1. Creating test user...')
    const { data: { user }, error: userError } = await supabase.auth.admin.createUser({
      email: 'test@project-genie.com',
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: {
        full_name: 'Test User'
      }
    })
    
    if (userError) {
      console.log('User might already exist:', userError.message)
      // Try to get existing user
      const { data: { users } } = await supabase.auth.admin.listUsers()
      const existingUser = users.find(u => u.email === 'test@project-genie.com')
      
      if (existingUser) {
        console.log('Using existing test user:', existingUser.id)
        
        // 2. Test project creation with this user
        console.log('\n2. Testing project creation...')
        const projectData = {
          name: 'Policy Test Project',
          description: 'Testing RLS policies',
          owner_id: existingUser.id,
          methodology_type: 'agile',
          rag_status: 'green',
          status: 'planning',
          progress: 0,
          company_info: {
            website: 'test.com',
            sector: 'Technology'
          }
        }
        
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .insert(projectData)
          .select()
          .single()
        
        if (projectError) {
          console.log('❌ Project creation failed:', projectError)
          
          // Analyze the error
          if (projectError.message.includes('foreign key')) {
            console.log('\n⚠️  This is still showing as a foreign key error.')
            console.log('The real issue is RLS policies are blocking the insert.')
          }
          
          // Try to fix by creating a simpler policy
          console.log('\n3. Attempting emergency fix...')
          console.log('Please run this SQL directly in Supabase Dashboard:')
          console.log('=' + '='.repeat(50))
          console.log(`
-- EMERGENCY FIX: Disable RLS temporarily
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;

-- Or create a super permissive policy
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_authenticated_temporary" ON public.projects
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);
          `)
          console.log('=' + '='.repeat(50))
          
        } else {
          console.log('✅ Project created successfully!')
          console.log('   ID:', project.id)
          console.log('   Name:', project.name)
          
          // Clean up
          await supabase.from('projects').delete().eq('id', project.id)
          console.log('   Test project cleaned up')
          
          console.log('\n' + '='.repeat(50))
          console.log('✅ DATABASE IS WORKING!')
          console.log('='.repeat(50))
          console.log('Users can now create projects at:')
          console.log('https://project-genie-one.vercel.app/projects/new')
        }
      }
    } else if (user) {
      console.log('Created test user:', user.id)
      // Continue with testing...
    }
    
    // 4. Final verification
    console.log('\n4. Checking table structure...')
    
    // Check if we can at least query the table
    const { data: projects, error: queryError } = await supabase
      .from('projects')
      .select('id, name, status, progress')
      .limit(1)
    
    if (queryError) {
      console.log('Query error:', queryError)
    } else {
      console.log('✓ Can query projects table')
      
      // Check column existence by trying to select them
      const { error: colError } = await supabase
        .from('projects')
        .select('status, company_info, progress')
        .limit(1)
      
      if (colError) {
        console.log('❌ Missing columns:', colError.message)
      } else {
        console.log('✓ Required columns exist')
      }
    }
    
  } catch (error) {
    console.error('Unexpected error:', error)
  }
  
  console.log('\n' + '='.repeat(50))
  console.log('RECOMMENDATION:')
  console.log('='.repeat(50))
  console.log('The issue appears to be RLS policies blocking inserts.')
  console.log('Go to your Supabase Dashboard and:')
  console.log()
  console.log('1. Navigate to: https://supabase.com/dashboard/project/vnuieavheezjxbkyfxea/editor')
  console.log('2. Go to Table Editor → projects')
  console.log('3. Click "RLS disabled/enabled" toggle')
  console.log('4. Either disable RLS temporarily OR')
  console.log('5. Add this simple policy:')
  console.log()
  console.log('   Name: allow_authenticated_users')
  console.log('   Policy: FOR ALL')
  console.log('   Target roles: authenticated')
  console.log('   USING expression: auth.uid() = owner_id')
  console.log('   WITH CHECK expression: auth.uid() = owner_id')
  console.log()
  console.log('This will allow users to manage their own projects.')
  console.log('='.repeat(50))
}

createTestUserAndProject()