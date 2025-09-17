#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.local') })

async function testDatabaseProjects() {
  console.log('🧪 Testing Database Projects\n')
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.log('❌ No authenticated user found')
      console.log('   You may need to sign in first')
      
      // Try to get all projects without auth filter (for testing)
      console.log('\n📊 Checking all projects in database:')
      const { data: allProjects, error: allError } = await supabase
        .from('projects')
        .select('id, name, owner_id, created_at')
        .limit(5)
      
      if (allError) {
        console.error('Error fetching projects:', allError)
      } else {
        console.log(`Found ${allProjects?.length || 0} projects total`)
        if (allProjects && allProjects.length > 0) {
          console.log('\nSample projects:')
          allProjects.forEach(p => {
            console.log(`  - ${p.name} (owner: ${p.owner_id?.substring(0, 8)}...)`)
          })
        }
      }
      return
    }
    
    console.log(`✅ Authenticated as: ${user.email}`)
    console.log(`   User ID: ${user.id}\n`)
    
    // Test 1: Simple owner query (like projects page)
    console.log('Test 1: Simple owner query')
    const { data: ownerProjects, error: ownerError } = await supabase
      .from('projects')
      .select('*')
      .eq('owner_id', user.id)
    
    if (ownerError) {
      console.error('❌ Error:', ownerError)
    } else {
      console.log(`✅ Found ${ownerProjects?.length || 0} projects where user is owner`)
    }
    
    // Test 2: Complex OR query (like dashboard tried to use)
    console.log('\nTest 2: Complex OR query with subselect')
    const { data: complexProjects, error: complexError } = await supabase
      .from('projects')
      .select('*')
      .or(`owner_id.eq.${user.id},id.in.(select project_id from project_members where user_id='${user.id}')`)
    
    if (complexError) {
      console.error('❌ Error:', complexError)
    } else {
      console.log(`✅ Found ${complexProjects?.length || 0} projects with complex query`)
    }
    
    // Test 3: Check project_members table
    console.log('\nTest 3: Check project_members table')
    const { data: memberProjects, error: memberError } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', user.id)
    
    if (memberError) {
      console.error('❌ Error:', memberError)
    } else {
      console.log(`✅ User is member of ${memberProjects?.length || 0} projects`)
    }
    
    // Test 4: Create a test project
    console.log('\nTest 4: Creating a test project')
    const testProject = {
      name: `Test Project ${Date.now()}`,
      description: 'Created by test script',
      methodology_type: 'agile',
      status: 'on_track',
      owner_id: user.id,
      progress: 0
    }
    
    const { data: newProject, error: createError } = await supabase
      .from('projects')
      .insert(testProject)
      .select()
      .single()
    
    if (createError) {
      console.error('❌ Error creating project:', createError)
    } else {
      console.log(`✅ Created project: ${newProject.name}`)
      console.log(`   ID: ${newProject.id}`)
      
      // Clean up - delete the test project
      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', newProject.id)
      
      if (deleteError) {
        console.error('⚠️ Could not delete test project:', deleteError)
      } else {
        console.log('   🗑️ Test project deleted')
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run test
testDatabaseProjects().catch(console.error)