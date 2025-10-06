#!/usr/bin/env npx tsx

import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

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

async function applyMigration() {
  console.log('🔧 Applying profile schema fix via Supabase Management API...\n')

  const migrations = [
    {
      name: 'Drop old foreign key constraint',
      sql: `ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_owner_id_fkey;`
    },
    {
      name: 'Add new foreign key to profiles table',
      sql: `ALTER TABLE projects ADD CONSTRAINT projects_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE;`
    },
    {
      name: 'Drop unused public.users table',
      sql: `DROP TABLE IF EXISTS public.users CASCADE;`
    },
    {
      name: 'Ensure profiles table has required columns',
      sql: `ALTER TABLE profiles 
            ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free',
            ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;`
    },
    {
      name: 'Create or replace trigger function',
      sql: `CREATE OR REPLACE FUNCTION public.handle_new_user()
            RETURNS trigger AS $$
            BEGIN
              INSERT INTO public.profiles (
                id, 
                email, 
                full_name, 
                created_at, 
                updated_at,
                subscription_tier
              )
              VALUES (
                new.id,
                new.email,
                COALESCE(
                  new.raw_user_meta_data->>'full_name',
                  new.raw_user_meta_data->>'name',
                  split_part(new.email, '@', 1)
                ),
                now(),
                now(),
                'free'
              )
              ON CONFLICT (id) DO UPDATE
              SET 
                email = EXCLUDED.email,
                full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
                updated_at = now();
              
              RETURN new;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;`
    },
    {
      name: 'Recreate trigger',
      sql: `DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
            CREATE TRIGGER on_auth_user_created
              AFTER INSERT ON auth.users
              FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();`
    },
    {
      name: 'Create profiles for existing users',
      sql: `INSERT INTO public.profiles (
              id,
              email,
              full_name,
              created_at,
              updated_at,
              subscription_tier
            )
            SELECT 
              id,
              email,
              COALESCE(
                raw_user_meta_data->>'full_name',
                raw_user_meta_data->>'name',
                split_part(email, '@', 1)
              ),
              created_at,
              now(),
              'free'
            FROM auth.users
            WHERE id NOT IN (SELECT id FROM public.profiles)
            ON CONFLICT (id) DO NOTHING;`
    },
    {
      name: 'Update RLS policies',
      sql: `DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
            DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
            DROP POLICY IF EXISTS "Users can insert their own projects" ON projects;
            DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;
            DROP POLICY IF EXISTS "Users can create projects within tier limits" ON projects;
            
            CREATE POLICY "Users can view their own projects" ON projects
              FOR SELECT USING (
                owner_id = auth.uid() OR
                EXISTS (
                  SELECT 1 FROM project_members 
                  WHERE project_members.project_id = projects.id 
                  AND project_members.user_id = auth.uid()
                )
              );
            
            CREATE POLICY "Users can update their own projects" ON projects
              FOR UPDATE USING (owner_id = auth.uid());
            
            CREATE POLICY "Users can insert their own projects" ON projects
              FOR INSERT WITH CHECK (
                owner_id = auth.uid() AND
                EXISTS (
                  SELECT 1 FROM profiles 
                  WHERE profiles.id = auth.uid()
                )
              );
            
            CREATE POLICY "Users can delete their own projects" ON projects
              FOR DELETE USING (owner_id = auth.uid());`
    }
  ]

  let successCount = 0
  let errorCount = 0
  const errors: string[] = []

  for (const migration of migrations) {
    console.log(`📝 Running: ${migration.name}...`)
    try {
      const result = await runSQL(migration.sql)
      console.log(`   ✅ Success`)
      successCount++
    } catch (error: any) {
      console.error(`   ❌ Failed: ${error.message}`)
      errors.push(`${migration.name}: ${error.message}`)
      errorCount++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log(`📊 Migration Results:`)
  console.log(`   ✅ Successful: ${successCount}`)
  console.log(`   ❌ Failed: ${errorCount}`)
  console.log('='.repeat(60))

  if (errorCount > 0) {
    console.log('\n❌ Errors encountered:')
    errors.forEach((err, i) => {
      console.log(`   ${i + 1}. ${err}`)
    })
  }

  // Verify the fix
  console.log('\n🧪 Verifying the fix...')
  try {
    const checkSQL = `
      SELECT 
        conname AS constraint_name,
        conrelid::regclass AS table_name,
        confrelid::regclass AS referenced_table
      FROM pg_constraint
      WHERE conname = 'projects_owner_id_fkey';
    `
    
    const result = await runSQL(checkSQL)
    console.log('Foreign key check result:', JSON.stringify(result, null, 2))
    
    if (result.data && result.data.length > 0) {
      const constraint = result.data[0]
      if (constraint.referenced_table === 'profiles') {
        console.log('✅ Foreign key correctly references profiles table!')
      } else {
        console.log(`⚠️  Foreign key still references ${constraint.referenced_table}`)
      }
    }
  } catch (error: any) {
    console.error('Could not verify fix:', error.message)
  }

  if (successCount === migrations.length) {
    console.log('\n🎉 Migration completed successfully!')
    console.log('You should now be able to create projects without profile errors.')
  } else {
    console.log('\n⚠️  Some migrations failed. Please check the errors above.')
  }
}

// Run the migration
applyMigration().catch(console.error)