import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function verifyProjectCreation() {
  console.log('Verifying project creation after migration...')
  console.log('=' + '='.repeat(50))
  
  try {
    // 1. Check if policies exist
    console.log('\n1. Checking RLS policies on projects table...')
    const { data: policies } = await supabase
      .from('pg_policies')
      .select('policyname, cmd, roles')
      .eq('tablename', 'projects')
      .eq('schemaname', 'public')
    
    if (policies && policies.length > 0) {
      console.log(`✅ Found ${policies.length} policies:`)
      policies.forEach(p => {
        console.log(`   - ${p.policyname} (${p.cmd}) for ${p.roles}`)
      })
    } else {
      console.log('❌ No policies found on projects table')
    }
    
    // 2. Check table columns
    console.log('\n2. Checking projects table columns...')
    const { data: columns } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, column_default')
      .eq('table_name', 'projects')
      .eq('table_schema', 'public')
    
    const requiredColumns = ['status', 'company_info', 'progress']
    const existingColumns = columns?.map(c => c.column_name) || []
    
    requiredColumns.forEach(col => {
      if (existingColumns.includes(col)) {
        console.log(`✅ Column '${col}' exists`)
      } else {
        console.log(`❌ Column '${col}' is missing`)
      }
    })
    
    // 3. Test project creation with service role
    console.log('\n3. Testing project creation with service role...')
    const testProject = {
      name: 'Verification Test Project',
      description: 'Testing after migration',
      owner_id: '1a0cb5c0-99ed-47a4-9002-15081310027d', // Test user ID
      methodology_type: 'agile',
      rag_status: 'green',
      status: 'planning',
      progress: 0
    }
    
    const { data: project, error } = await supabase
      .from('projects')
      .insert(testProject)
      .select()
      .single()
    
    if (error) {
      console.log('❌ Failed to create project:', error.message)
      console.log('   Error details:', error)
    } else {
      console.log('✅ Successfully created test project')
      console.log(`   ID: ${project.id}`)
      console.log(`   Name: ${project.name}`)
      
      // Clean up
      await supabase.from('projects').delete().eq('id', project.id)
      console.log('   Test project cleaned up')
    }
    
    // 4. Summary
    console.log('\n' + '='.repeat(50))
    console.log('VERIFICATION COMPLETE')
    console.log('='.repeat(50))
    
    if (policies && policies.length > 0 && !error) {
      console.log('✅ Database is properly configured!')
      console.log('   Users should now be able to create projects.')
      console.log('\nNext steps:')
      console.log('1. Test at: https://project-genie-one.vercel.app/projects/new')
      console.log('2. Sign in with Google')
      console.log('3. Create a new project')
    } else {
      console.log('⚠️  Some issues remain:')
      if (!policies || policies.length === 0) {
        console.log('   - RLS policies are missing')
      }
      if (error) {
        console.log('   - Project creation is still failing')
      }
      console.log('\nPlease ensure the migration SQL was run successfully.')
    }
    
  } catch (err) {
    console.error('Error during verification:', err)
  }
}

verifyProjectCreation()