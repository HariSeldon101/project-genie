import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

// Note: Supabase JS client doesn't support running raw SQL migrations
// We need to use the Supabase Management API or run via the dashboard

console.log('======================================')
console.log('COMPREHENSIVE DATABASE FIX')
console.log('======================================')
console.log('')
console.log('The migration file has been created at:')
console.log('supabase/migrations/20240824_comprehensive_schema_fix.sql')
console.log('')
console.log('To apply this fix, you have two options:')
console.log('')
console.log('OPTION 1 (Recommended): Run via Supabase Dashboard')
console.log('------------------------------------------------')
console.log('1. Go to: https://supabase.com/dashboard')
console.log('2. Select your project')
console.log('3. Navigate to SQL Editor')
console.log('4. Copy and paste the contents of the migration file')
console.log('5. Click "Run" to execute')
console.log('')
console.log('OPTION 2: Use Supabase CLI (if linked)')
console.log('----------------------------------------')
console.log('Run: supabase db push')
console.log('')
console.log('The migration will:')
console.log('✓ Drop all conflicting RLS policies')
console.log('✓ Create missing tables (documents, decisions, sprints, etc.)')
console.log('✓ Set up proper RLS policies that allow project creation')
console.log('✓ Add performance indexes')
console.log('✓ Create helper functions and triggers')
console.log('')
console.log('After running the migration, users will be able to:')
console.log('• Create projects without foreign key errors')
console.log('• Access their own projects and those they\'re members of')
console.log('• All PRD features will have database support')
console.log('')

// Let's also create a simpler test to verify the current issue
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function testCurrentState() {
  console.log('Testing current database state...')
  console.log('================================')
  
  // Test with service role (bypasses RLS)
  const { data: serviceTest, error: serviceError } = await supabase
    .from('projects')
    .insert({
      name: 'Test - Service Role',
      description: 'Testing with service role key',
      owner_id: '1a0cb5c0-99ed-47a4-9002-15081310027d',
      methodology_type: 'agile',
      rag_status: 'green'
    })
    .select()
  
  if (serviceError) {
    console.log('❌ Service role test failed:', serviceError.message)
  } else {
    console.log('✅ Service role test succeeded - project created')
    // Clean up
    if (serviceTest && serviceTest[0]) {
      await supabase.from('projects').delete().eq('id', serviceTest[0].id)
    }
  }
  
  // Test with anon key (uses RLS)
  const anonSupabase = createClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  
  const { error: anonError } = await anonSupabase
    .from('projects')
    .insert({
      name: 'Test - Anon Key',
      description: 'Testing with anon key (RLS active)',
      owner_id: '1a0cb5c0-99ed-47a4-9002-15081310027d',
      methodology_type: 'agile',
      rag_status: 'green'
    })
    .select()
  
  if (anonError) {
    console.log('❌ Anon key test failed (expected):', anonError.message)
    console.log('   This confirms RLS is blocking the insert')
  } else {
    console.log('✅ Anon key test succeeded (unexpected)')
  }
  
  console.log('')
  console.log('Please run the migration to fix these issues!')
}

testCurrentState()