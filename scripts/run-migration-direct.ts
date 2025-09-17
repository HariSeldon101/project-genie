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

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
})

// Since we can't run raw SQL through the JS client, let's run the critical fixes
async function runCriticalFixes() {
  console.log('Running critical database fixes...')
  console.log('================================')
  
  try {
    // Step 1: Get all existing policies on projects table
    console.log('\n1. Checking existing policies...')
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'projects')
      .eq('schemaname', 'public')
    
    if (policies && policies.length > 0) {
      console.log(`Found ${policies.length} existing policies on projects table`)
      // Note: We can't drop them via JS client, need to use SQL
    }
    
    // Step 2: Test if we can create a project with service role
    console.log('\n2. Testing project creation with service role...')
    const testProject = {
      name: 'Migration Test Project',
      description: 'Testing after migration',
      owner_id: '1a0cb5c0-99ed-47a4-9002-15081310027d',
      methodology_type: 'agile',
      rag_status: 'green',
      status: 'planning'
    }
    
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert(testProject)
      .select()
      .single()
    
    if (projectError) {
      console.log('❌ Service role test failed:', projectError.message)
      
      // Check if it's because of missing columns
      if (projectError.message.includes('status')) {
        console.log('\nAdding missing status column...')
        // We'll need to run SQL for this
      }
    } else {
      console.log('✅ Service role can create projects')
      // Clean up test project
      if (project) {
        await supabase.from('projects').delete().eq('id', project.id)
        console.log('   Test project cleaned up')
      }
    }
    
    // Since we can't run the full migration via JS, let's create a simplified version
    console.log('\n' + '='.repeat(50))
    console.log('MANUAL INTERVENTION REQUIRED')
    console.log('='.repeat(50))
    console.log('\nThe Supabase JS client cannot execute raw SQL migrations.')
    console.log('Please run the following SQL in your Supabase Dashboard:\n')
    
    // Read and display the quick fix
    const quickFix = `
-- EMERGENCY FIX: Allow authenticated users to create projects
-- Step 1: Drop ALL existing policies on projects table
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'projects' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.projects', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- Step 2: Add missing columns if they don't exist
ALTER TABLE public.projects 
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'planning',
    ADD COLUMN IF NOT EXISTS company_info JSONB,
    ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;

-- Step 3: Create new, simple policies that WORK
CREATE POLICY "enable_insert_for_authenticated_users" ON public.projects
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "enable_select_for_owners" ON public.projects
    FOR SELECT 
    TO authenticated
    USING (auth.uid() = owner_id);

CREATE POLICY "enable_update_for_owners" ON public.projects
    FOR UPDATE 
    TO authenticated
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "enable_delete_for_owners" ON public.projects
    FOR DELETE 
    TO authenticated
    USING (auth.uid() = owner_id);

-- Step 4: Verify the fix
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'projects'
AND schemaname = 'public';
`
    
    console.log(quickFix)
    
    console.log('\n' + '='.repeat(50))
    console.log('After running the SQL above:')
    console.log('1. Go to https://project-genie-one.vercel.app/projects/new')
    console.log('2. Try creating a project')
    console.log('3. It should work!')
    console.log('='.repeat(50))
    
  } catch (error) {
    console.error('Error during migration:', error)
  }
}

runCriticalFixes()