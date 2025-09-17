import * as dotenv from 'dotenv'
import fetch from 'node-fetch'

// Load environment variables
dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Extract project ref from URL
const projectRef = SUPABASE_URL.split('//')[1].split('.')[0] // vnuieavheezjxbkyfxea

async function executeSQLViaAPI() {
  console.log('Attempting to execute SQL via Supabase REST API...')
  console.log('Project Reference:', projectRef)
  
  // The SQL to execute - simplified version
  const sql = `
-- Drop conflicting policies
DROP POLICY IF EXISTS "projects_owner_all" ON public.projects;
DROP POLICY IF EXISTS "projects_select_owner" ON public.projects;
DROP POLICY IF EXISTS "projects_select_member" ON public.projects;
DROP POLICY IF EXISTS "projects_insert" ON public.projects;
DROP POLICY IF EXISTS "projects_update_owner" ON public.projects;
DROP POLICY IF EXISTS "projects_delete_owner" ON public.projects;
DROP POLICY IF EXISTS "users_own_projects" ON public.projects;
DROP POLICY IF EXISTS "simple_projects_policy" ON public.projects;

-- Add missing columns
ALTER TABLE public.projects 
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'planning',
    ADD COLUMN IF NOT EXISTS company_info JSONB,
    ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100);

-- Create working policies
CREATE POLICY "authenticated_users_insert" ON public.projects
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "owners_select" ON public.projects
    FOR SELECT 
    TO authenticated
    USING (auth.uid() = owner_id);

CREATE POLICY "owners_update" ON public.projects
    FOR UPDATE 
    TO authenticated
    USING (auth.uid() = owner_id);

CREATE POLICY "owners_delete" ON public.projects
    FOR DELETE 
    TO authenticated
    USING (auth.uid() = owner_id);

-- Return success
SELECT 'Policies fixed successfully!' as result;
  `

  try {
    // Try using the Supabase REST API's RPC endpoint
    // Note: This requires a custom RPC function to execute SQL, which may not exist
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ query: sql })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.log('REST API approach failed:', response.status, errorText)
      
      // Try alternative approach - use pg endpoint if available
      console.log('\nTrying alternative approach...')
      
      // Unfortunately, direct SQL execution requires either:
      // 1. Supabase Management API (requires access token)
      // 2. Direct PostgreSQL connection (blocked from this network)
      // 3. Custom RPC function (doesn't exist)
      
      throw new Error('Cannot execute SQL directly via API')
    }

    const result = await response.json()
    console.log('Success:', result)
    
  } catch (error) {
    console.error('\n' + '='.repeat(60))
    console.error('UNABLE TO EXECUTE SQL AUTOMATICALLY')
    console.error('='.repeat(60))
    console.error('\nReason:', error instanceof Error ? error.message : error)
    console.error('\nThe Supabase API does not allow direct SQL execution.')
    console.error('You must run the SQL manually in the Supabase Dashboard.')
    console.error('\n' + '='.repeat(60))
    console.error('COPY THIS SQL AND RUN IT IN SUPABASE DASHBOARD:')
    console.error('='.repeat(60))
    console.log(sql)
    console.error('\n' + '='.repeat(60))
    console.error('Steps:')
    console.error('1. Go to https://supabase.com/dashboard/project/' + projectRef)
    console.error('2. Click on "SQL Editor" in the left sidebar')
    console.error('3. Paste the SQL above')
    console.error('4. Click "Run"')
    console.error('5. Test at https://project-genie-one.vercel.app/projects/new')
    console.error('='.repeat(60))
  }
}

executeSQLViaAPI()