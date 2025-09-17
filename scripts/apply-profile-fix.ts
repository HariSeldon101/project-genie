#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration() {
  console.log('🔧 Applying profile schema fix migration...\n')
  
  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250826_fix_profile_schema_mismatch.sql')
  const sql = fs.readFileSync(sqlPath, 'utf8')
  
  // Split SQL into individual statements (handling DO blocks correctly)
  const statements: string[] = []
  let currentStatement = ''
  let inDoBlock = false
  
  const lines = sql.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    
    // Check for DO block start
    if (trimmed.startsWith('DO $$')) {
      inDoBlock = true
    }
    
    currentStatement += line + '\n'
    
    // Check for DO block end
    if (inDoBlock && trimmed.endsWith('$$;')) {
      inDoBlock = false
      statements.push(currentStatement.trim())
      currentStatement = ''
    } else if (!inDoBlock && trimmed.endsWith(';') && !trimmed.startsWith('--')) {
      statements.push(currentStatement.trim())
      currentStatement = ''
    }
  }
  
  console.log(`📝 Found ${statements.length} SQL statements to execute\n`)
  
  let successCount = 0
  let errorCount = 0
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    if (!statement || statement.startsWith('--')) continue
    
    const preview = statement.substring(0, 80).replace(/\n/g, ' ')
    console.log(`[${i + 1}/${statements.length}] Executing: ${preview}...`)
    
    try {
      // Try to execute via RPC if available
      const { error } = await supabase.rpc('exec_sql', { 
        sql_query: statement 
      }).single()
      
      if (error) {
        // If RPC doesn't exist, try a different approach
        // For now, we'll just note the error
        console.warn(`   ⚠️  RPC execution failed, statement may need manual execution`)
        errorCount++
      } else {
        console.log(`   ✅ Success`)
        successCount++
      }
    } catch (err) {
      console.error(`   ❌ Error: ${err}`)
      errorCount++
    }
  }
  
  console.log('\n' + '='.repeat(60))
  console.log(`📊 Migration Summary:`)
  console.log(`   ✅ Successful: ${successCount}`)
  console.log(`   ❌ Failed: ${errorCount}`)
  console.log('='.repeat(60))
  
  if (errorCount > 0) {
    console.log('\n⚠️  Some statements failed. You may need to run the migration manually via Supabase dashboard.')
    console.log('   Migration file: supabase/migrations/20250826_fix_profile_schema_mismatch.sql')
  } else {
    console.log('\n✅ Migration completed successfully!')
  }
  
  // Test the fix
  console.log('\n🧪 Testing profile creation...')
  
  try {
    // Get any authenticated user
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()
    
    if (usersError) {
      console.error('Could not list users:', usersError)
      return
    }
    
    if (users && users.length > 0) {
      const testUser = users[0]
      console.log(`Testing with user: ${testUser.email}`)
      
      // Check if profile exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', testUser.id)
        .single()
      
      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error checking profile:', profileError)
      } else if (profile) {
        console.log('✅ Profile exists for user')
        
        // Try to create a test project to verify foreign key
        console.log('Testing project creation...')
        const { error: projectError } = await supabase
          .from('projects')
          .insert({
            name: 'Test Project - Delete Me',
            owner_id: testUser.id,
            methodology_type: 'agile',
            status: 'planning'
          })
        
        if (projectError) {
          console.error('❌ Project creation failed:', projectError.message)
          console.log('\n⚠️  The foreign key issue may still exist. Please check the migration manually.')
        } else {
          console.log('✅ Project creation test passed!')
          
          // Clean up test project
          await supabase
            .from('projects')
            .delete()
            .eq('name', 'Test Project - Delete Me')
            .eq('owner_id', testUser.id)
        }
      } else {
        console.log('⚠️  No profile found for test user')
      }
    }
  } catch (err) {
    console.error('Test failed:', err)
  }
}

runMigration().catch(console.error)