const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

// Use anon key to simulate browser client
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testDocumentsQuery() {
  console.log('Testing documents query as authenticated user...')
  
  // First authenticate as the user
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'stusandboxacc@gmail.com',
    password: process.env.TEST_USER_PASSWORD || 'test123' // You'll need to set this
  })
  
  if (authError) {
    console.log('Skipping auth, will test with service role...')
  } else {
    console.log('Authenticated as:', authData.user?.email)
  }
  
  // Get user's projects
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name, owner_id')
    .eq('owner_id', '1a0cb5c0-99ed-47a4-9002-15081310027d')
  
  console.log('\n=== Projects Query ===')
  console.log('Error:', projectsError)
  console.log('Projects found:', projects?.length || 0)
  console.log('Project IDs:', projects?.map(p => p.id))
  
  if (projects && projects.length > 0) {
    // Try simple query
    const { data: artifacts, error: artifactsError } = await supabase
      .from('artifacts')
      .select('*')
      .in('project_id', projects.map(p => p.id))
      .order('created_at', { ascending: false })
    
    console.log('\n=== Artifacts Query (Simple) ===')
    console.log('Error:', artifactsError)
    console.log('Artifacts found:', artifacts?.length || 0)
    if (artifacts && artifacts.length > 0) {
      console.log('Sample artifact:', {
        id: artifacts[0].id,
        type: artifacts[0].type,
        project_id: artifacts[0].project_id,
        created_at: artifacts[0].created_at
      })
    }
    
    // Try with RLS off (using service key)
    const supabaseService = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    )
    
    const { data: artifactsService, error: artifactsServiceError } = await supabaseService
      .from('artifacts')
      .select('*')
      .in('project_id', projects.map(p => p.id))
      .order('created_at', { ascending: false })
    
    console.log('\n=== Artifacts Query (Service Role - No RLS) ===')
    console.log('Error:', artifactsServiceError)
    console.log('Artifacts found:', artifactsService?.length || 0)
    
    // Check RLS policies
    const { data: policies } = await supabaseService
      .rpc('get_policies', { table_name: 'artifacts' })
      .single()
    
    console.log('\n=== RLS Policies ===')
    console.log('Policies:', policies)
  }
}

testDocumentsQuery().catch(console.error)