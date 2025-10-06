#!/usr/bin/env npx tsx

const SUPABASE_PAT = 'sbp_ce8146f94e3403eca0a088896812e9bbbf08929b'
const PROJECT_REF = 'vnuieavheezjxbkyfxea'
const SUPABASE_API_URL = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`

async function runSQL(sql: string): Promise<any> {
  const response = await fetch(SUPABASE_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_PAT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`API Error: ${response.status} - ${error}`)
  }

  return response.json()
}

async function fixRLS() {
  console.log('🔧 Fixing RLS configuration...\n')

  const steps = [
    {
      name: 'Disable RLS on projects table temporarily',
      sql: `ALTER TABLE projects DISABLE ROW LEVEL SECURITY;`
    },
    {
      name: 'Disable RLS on project_members table',
      sql: `ALTER TABLE project_members DISABLE ROW LEVEL SECURITY;`
    },
    {
      name: 'Drop all existing policies on projects',
      sql: `
        DO $$ 
        DECLARE
          pol record;
        BEGIN
          FOR pol IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = 'projects' AND schemaname = 'public'
          LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON projects', pol.policyname);
          END LOOP;
        END $$;
      `
    },
    {
      name: 'Re-enable RLS on projects',
      sql: `ALTER TABLE projects ENABLE ROW LEVEL SECURITY;`
    },
    {
      name: 'Create simple INSERT policy for authenticated users',
      sql: `
        CREATE POLICY "Authenticated users can create projects" ON projects
        FOR INSERT 
        WITH CHECK (
          auth.uid() IS NOT NULL AND 
          owner_id = auth.uid()
        );
      `
    },
    {
      name: 'Create SELECT policy for project owners',
      sql: `
        CREATE POLICY "Users can view their own projects" ON projects
        FOR SELECT 
        USING (owner_id = auth.uid());
      `
    },
    {
      name: 'Create UPDATE policy for project owners',
      sql: `
        CREATE POLICY "Users can update their own projects" ON projects
        FOR UPDATE 
        USING (owner_id = auth.uid());
      `
    },
    {
      name: 'Create DELETE policy for project owners',
      sql: `
        CREATE POLICY "Users can delete their own projects" ON projects
        FOR DELETE 
        USING (owner_id = auth.uid());
      `
    },
    {
      name: 'Re-enable RLS on project_members',
      sql: `ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;`
    },
    {
      name: 'Create policy for project_members',
      sql: `
        CREATE POLICY "Project members can be managed by project owner" ON project_members
        FOR ALL 
        USING (
          EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = project_members.project_id 
            AND projects.owner_id = auth.uid()
          )
        );
      `
    }
  ]

  let successCount = 0
  let errorCount = 0

  for (const step of steps) {
    console.log(`📝 ${step.name}...`)
    try {
      await runSQL(step.sql)
      console.log(`   ✅ Success`)
      successCount++
    } catch (error: any) {
      console.error(`   ❌ Failed: ${error.message}`)
      errorCount++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log(`📊 Results:`)
  console.log(`   ✅ Successful: ${successCount}`)
  console.log(`   ❌ Failed: ${errorCount}`)
  console.log('='.repeat(60))

  if (successCount === steps.length) {
    console.log('\n🎉 RLS fixed successfully!')
    console.log('You should now be able to create projects.')
  } else {
    console.log('\n⚠️  Some steps failed. You may need to run the SQL manually.')
  }

  // Verify the policies
  console.log('\n🧪 Verifying policies...')
  try {
    const result = await runSQL(`
      SELECT policyname, cmd, qual 
      FROM pg_policies 
      WHERE tablename = 'projects' 
      AND schemaname = 'public';
    `)
    
    if (result.data && result.data.length > 0) {
      console.log(`Found ${result.data.length} policies on projects table:`)
      result.data.forEach((policy: any) => {
        console.log(`   - ${policy.policyname} (${policy.cmd})`)
      })
    }
  } catch (error) {
    console.error('Could not verify policies:', error)
  }
}

fixRLS().catch(console.error)