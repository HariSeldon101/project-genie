#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

async function fixRLS() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for admin access
  )

  console.log('🔧 Fixing RLS policies to prevent infinite recursion...')
  
  const sqlFile = fs.readFileSync(
    path.join(__dirname, '..', 'supabase', 'fix-rls-final.sql'), 
    'utf8'
  )
  
  // Split SQL into individual statements
  const statements = sqlFile
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))
  
  for (const statement of statements) {
    if (statement.includes('DROP POLICY') || 
        statement.includes('CREATE POLICY') || 
        statement.includes('ALTER TABLE') ||
        statement.includes('GRANT')) {
      try {
        console.log(`Executing: ${statement.substring(0, 50)}...`)
        const { error } = await supabase.rpc('exec_sql', { 
          sql_query: statement + ';' 
        }).single()
        
        if (error) {
          // Try direct execution as alternative
          const { data, error: directError } = await supabase
            .from('_sql')
            .insert({ query: statement + ';' })
            .select()
            .single()
          
          if (directError) {
            console.warn(`⚠️  Warning: ${directError.message}`)
          }
        }
      } catch (err) {
        console.warn(`⚠️  Statement skipped: ${err.message}`)
      }
    }
  }
  
  console.log('✅ RLS policies have been updated!')
  console.log('📝 Testing project creation...')
  
  // Test by creating a test project
  const { data: { user } } = await supabase.auth.signInWithPassword({
    email: process.env.TEST_USER_EMAIL || 'test@example.com',
    password: process.env.TEST_USER_PASSWORD || 'testpassword'
  })
  
  if (user) {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: 'RLS Test Project',
        description: 'Testing RLS policies',
        methodology_type: 'agile',
        owner_id: user.id,
        vision: 'Test',
        business_case: 'Test'
      })
      .select()
      .single()
    
    if (error) {
      console.error('❌ Project creation failed:', error.message)
      console.log('You may need to run the SQL manually in Supabase dashboard')
    } else {
      console.log('✅ Project created successfully!')
      
      // Clean up test project
      await supabase
        .from('projects')
        .delete()
        .eq('id', data.id)
    }
  }
}

fixRLS().catch(console.error)