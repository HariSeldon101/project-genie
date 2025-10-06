import fetch from 'node-fetch'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_ACCESS_TOKEN = 'sbp_ce8146f94e3403eca0a088896812e9bbbf08929b'
const PROJECT_REF = 'vnuieavheezjxbkyfxea'

async function runMigrationViaAPI() {
  console.log('Running database migration via Supabase Management API...')
  console.log('Project:', PROJECT_REF)
  
  const migrationSQL = `
-- Drop ALL existing policies on projects table
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

-- Add missing columns if they don't exist
ALTER TABLE public.projects 
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'planning',
    ADD COLUMN IF NOT EXISTS company_info JSONB,
    ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100);

-- Create new, working policies
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

-- Return success
SELECT 'Migration completed successfully!' as result;
  `

  try {
    // Execute SQL via Supabase Management API
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: migrationSQL
        })
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('API Error:', response.status, error)
      
      // Try alternative endpoint
      console.log('\nTrying alternative approach...')
      
      // Split into individual statements
      const statements = [
        // Drop policies using a simpler approach
        "DROP POLICY IF EXISTS \"projects_owner_all\" ON public.projects",
        "DROP POLICY IF EXISTS \"projects_select_owner\" ON public.projects",
        "DROP POLICY IF EXISTS \"projects_select_member\" ON public.projects",
        "DROP POLICY IF EXISTS \"projects_insert\" ON public.projects",
        "DROP POLICY IF EXISTS \"projects_update_owner\" ON public.projects",
        "DROP POLICY IF EXISTS \"projects_delete_owner\" ON public.projects",
        "DROP POLICY IF EXISTS \"users_own_projects\" ON public.projects",
        "DROP POLICY IF EXISTS \"simple_projects_policy\" ON public.projects",
        "DROP POLICY IF EXISTS \"allow_all_authenticated\" ON public.projects",
        "DROP POLICY IF EXISTS \"authenticated_users_insert\" ON public.projects",
        "DROP POLICY IF EXISTS \"owners_select\" ON public.projects",
        "DROP POLICY IF EXISTS \"owners_update\" ON public.projects",
        "DROP POLICY IF EXISTS \"owners_delete\" ON public.projects",
        
        // Add columns
        "ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'planning'",
        "ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS company_info JSONB",
        "ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0",
        
        // Create policies
        `CREATE POLICY "enable_insert_for_authenticated_users" ON public.projects
         FOR INSERT TO authenticated
         WITH CHECK (auth.uid() = owner_id)`,
         
        `CREATE POLICY "enable_select_for_owners" ON public.projects
         FOR SELECT TO authenticated
         USING (auth.uid() = owner_id)`,
         
        `CREATE POLICY "enable_update_for_owners" ON public.projects
         FOR UPDATE TO authenticated
         USING (auth.uid() = owner_id)
         WITH CHECK (auth.uid() = owner_id)`,
         
        `CREATE POLICY "enable_delete_for_owners" ON public.projects
         FOR DELETE TO authenticated
         USING (auth.uid() = owner_id)`
      ]
      
      console.log('Executing statements individually...')
      for (const stmt of statements) {
        console.log(`Executing: ${stmt.substring(0, 50)}...`)
        const res = await fetch(
          `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: stmt })
          }
        )
        
        if (!res.ok) {
          const err = await res.text()
          console.log(`  Warning: ${err}`)
        } else {
          console.log('  ✓ Success')
        }
      }
      
      return
    }

    const result = await response.json()
    console.log('Migration successful:', result)
    
  } catch (error) {
    console.error('Error:', error)
    
    // Final fallback - use psql directly if available
    console.log('\n' + '='.repeat(60))
    console.log('ALTERNATIVE: Run this command in your terminal:')
    console.log('='.repeat(60))
    console.log(`
PGPASSWORD="${process.env.SUPABASE_DB_PASSWORD || 'your-db-password'}" psql \\
  -h "db.${PROJECT_REF}.supabase.co" \\
  -p 5432 \\
  -U postgres \\
  -d postgres \\
  -c "${migrationSQL.replace(/\n/g, ' ').replace(/"/g, '\\"')}"
    `)
    console.log('='.repeat(60))
  }
}

runMigrationViaAPI()