#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function applySecurityFixes() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  console.log('🔐 Applying Security and Performance Fixes\n');
  console.log('==========================================\n');
  
  // Phase 1: Fix Function Search Paths
  console.log('📍 Phase 1: Fixing Function Search Paths...\n');
  
  const searchPathFixes = [
    "ALTER FUNCTION update_bug_report_updated_at() SET search_path = public",
    "ALTER FUNCTION handle_new_user() SET search_path = public",
    "ALTER FUNCTION update_updated_at_column() SET search_path = public"
  ];
  
  for (const fix of searchPathFixes) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: fix });
      if (error) {
        console.log(`❌ Failed: ${fix.substring(0, 50)}...`);
        console.log(`   Error: ${error.message}`);
      } else {
        console.log(`✅ Fixed: ${fix.substring(0, 50)}...`);
      }
    } catch (err) {
      console.log(`❌ Failed: ${fix.substring(0, 50)}...`);
      console.log(`   Error: ${err.message}`);
    }
  }
  
  console.log('\n📍 Phase 2: Fixing RLS Performance Issues...\n');
  
  // Read the RLS fixes migration
  const rlsFixPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250830_fix_rls_performance.sql');
  let rlsFixes = '';
  
  if (fs.existsSync(rlsFixPath)) {
    rlsFixes = fs.readFileSync(rlsFixPath, 'utf8');
  } else {
    // Create the RLS fixes
    rlsFixes = `
-- Fix RLS Performance Issues
-- Wrap auth.uid() in SELECT to prevent multiple evaluations

-- Fix profiles policies
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
CREATE POLICY "profiles_select_policy" ON profiles
  FOR SELECT USING (id = (SELECT auth.uid()) OR id IN (
    SELECT user_id FROM project_members WHERE project_id IN (
      SELECT project_id FROM project_members WHERE user_id = (SELECT auth.uid())
    )
  ));

DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
CREATE POLICY "profiles_update_policy" ON profiles
  FOR UPDATE USING (id = (SELECT auth.uid()));

-- Fix projects policies
DROP POLICY IF EXISTS "projects_select_policy" ON projects;
CREATE POLICY "projects_select_policy" ON projects
  FOR SELECT USING (
    owner_id = (SELECT auth.uid()) OR 
    id IN (SELECT project_id FROM project_members WHERE user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "projects_insert_policy" ON projects;
CREATE POLICY "projects_insert_policy" ON projects
  FOR INSERT WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "projects_update_policy" ON projects;
CREATE POLICY "projects_update_policy" ON projects
  FOR UPDATE USING (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "projects_delete_policy" ON projects;
CREATE POLICY "projects_delete_policy" ON projects
  FOR DELETE USING (owner_id = (SELECT auth.uid()));

-- Fix artifacts policies
DROP POLICY IF EXISTS "artifacts_select_policy" ON artifacts;
CREATE POLICY "artifacts_select_policy" ON artifacts
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = (SELECT auth.uid())
      UNION
      SELECT project_id FROM project_members WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "artifacts_insert_policy" ON artifacts;
CREATE POLICY "artifacts_insert_policy" ON artifacts
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = (SELECT auth.uid())
      UNION
      SELECT project_id FROM project_members WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "artifacts_update_policy" ON artifacts;
CREATE POLICY "artifacts_update_policy" ON artifacts
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "artifacts_delete_policy" ON artifacts;
CREATE POLICY "artifacts_delete_policy" ON artifacts
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = (SELECT auth.uid())
    )
  );

-- Fix bug_reports policies
DROP POLICY IF EXISTS "bug_reports_select_policy" ON bug_reports;
CREATE POLICY "bug_reports_select_policy" ON bug_reports
  FOR SELECT USING (
    user_id = (SELECT auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND is_admin = true)
  );

DROP POLICY IF EXISTS "bug_reports_insert_policy" ON bug_reports;
CREATE POLICY "bug_reports_insert_policy" ON bug_reports
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "bug_reports_update_policy" ON bug_reports;
CREATE POLICY "bug_reports_update_policy" ON bug_reports
  FOR UPDATE USING (
    user_id = (SELECT auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND is_admin = true)
  );

-- Fix generation_analytics policies
DROP POLICY IF EXISTS "generation_analytics_insert_policy" ON generation_analytics;
CREATE POLICY "generation_analytics_insert_policy" ON generation_analytics
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "generation_analytics_select_policy" ON generation_analytics;
CREATE POLICY "generation_analytics_select_policy" ON generation_analytics
  FOR SELECT USING (
    user_id = (SELECT auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND is_admin = true)
  );
`;
  }
  
  // Apply RLS fixes line by line
  const statements = rlsFixes.split(';').filter(s => s.trim() && !s.trim().startsWith('--'));
  
  for (const statement of statements) {
    const trimmed = statement.trim();
    if (trimmed) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: trimmed + ';' });
        if (error) {
          console.log(`❌ Failed: ${trimmed.substring(0, 50)}...`);
          console.log(`   Error: ${error.message}`);
        } else {
          console.log(`✅ Applied: ${trimmed.substring(0, 50)}...`);
        }
      } catch (err) {
        console.log(`❌ Failed: ${trimmed.substring(0, 50)}...`);
        console.log(`   Error: ${err.message}`);
      }
    }
  }
  
  console.log('\n✨ Security fixes application complete!');
  console.log('\nNote: Some operations may require direct database access.');
  console.log('Check the Supabase Dashboard for any remaining warnings.');
  
  process.exit(0);
}

applySecurityFixes();