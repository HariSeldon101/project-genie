import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

async function checkRLSStatus() {
  console.log('Checking RLS configuration...')
  console.log('=' + '='.repeat(50))
  
  // Check if RLS is enabled
  const { data: tables } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'projects')
    .single()
  
  console.log('Projects table exists:', !!tables)
  
  // Try to get RLS status via pg_tables
  const { data: rlsStatus } = await supabase
    .from('pg_tables')
    .select('tablename, rowsecurity')
    .eq('schemaname', 'public')
    .eq('tablename', 'projects')
    .single()
  
  console.log('RLS enabled on projects table:', rlsStatus?.rowsecurity)
  
  // Check policies
  const { data: policies } = await supabase
    .from('pg_policies')
    .select('policyname, cmd, qual, with_check')
    .eq('tablename', 'projects')
    .eq('schemaname', 'public')
  
  if (policies && policies.length > 0) {
    console.log(`\nFound ${policies.length} policies:`)
    policies.forEach(p => {
      console.log(`\n  Policy: ${p.policyname}`)
      console.log(`  Command: ${p.cmd}`)
      console.log(`  USING: ${p.qual || 'none'}`)
      console.log(`  WITH CHECK: ${p.with_check || 'none'}`)
    })
  } else {
    console.log('\n❌ No policies found!')
    console.log('\nThis means either:')
    console.log('1. RLS is disabled on the table, OR')
    console.log('2. The policies weren\'t created successfully')
  }
  
  // Test with a real user ID from your screenshot
  console.log('\n' + '='.repeat(50))
  console.log('Testing project creation with your user ID...')
  
  const testProject = {
    name: 'Direct Test Project',
    description: 'Testing with service role',
    owner_id: '33d0ca9f-be05-458f-b5bb-c67e4e8f23cf', // Your actual user ID from the error
    methodology_type: 'agile', 
    rag_status: 'green',
    status: 'planning',
    progress: 0,
    company_info: {
      website: 'bigfluffy.ai',
      sector: 'Telecommunications'
    }
  }
  
  const { data, error } = await supabase
    .from('projects')
    .insert(testProject)
    .select()
    .single()
  
  if (error) {
    console.log('❌ Insert failed:', error.message)
    console.log('Error code:', error.code)
    console.log('Error hint:', error.hint)
  } else {
    console.log('✅ Project created successfully!')
    console.log('Project ID:', data.id)
    
    // Clean up
    await supabase.from('projects').delete().eq('id', data.id)
    console.log('Test project deleted')
  }
  
  console.log('\n' + '='.repeat(50))
  console.log('SOLUTION:')
  console.log('=' + '='.repeat(50))
  console.log('\nGo to: https://supabase.com/dashboard/project/vnuieavheezjxbkyfxea/auth/policies')
  console.log('\n1. Find the "projects" table')
  console.log('2. Toggle "Enable RLS" to ON if it\'s OFF')
  console.log('3. Click "New Policy"')
  console.log('4. Choose "Enable insert for users based on user_id"')
  console.log('5. Set the policy name: "Users can insert their own projects"')
  console.log('6. Set USING expression: (auth.uid() = owner_id)')
  console.log('7. Save the policy')
  console.log('\nRepeat for SELECT, UPDATE, and DELETE operations.')
}

checkRLSStatus()