#!/usr/bin/env node

const https = require('https');

const PAT_TOKEN = 'sbp_10122b563ee9bd601c0b31dc799378486acf13d2';
const PROJECT_REF = 'vnuieavheezjxbkyfxea';

async function executeSQL(query, description) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query });
    
    const options = {
      hostname: 'api.supabase.com',
      port: 443,
      path: `/v1/projects/${PROJECT_REF}/database/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAT_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log(`✅ ${description}`);
          resolve(responseData);
        } else {
          console.log(`❌ ${description}`);
          console.log(`   Status: ${res.statusCode}, Response: ${responseData}`);
          resolve(null);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log(`❌ ${description}`);
      console.log(`   Error: ${error.message}`);
      reject(error);
    });
    
    req.write(data);
    req.end();
  });
}

async function applyRLSFixes() {
  console.log('📍 Applying RLS Performance Fixes...');
  console.log('====================================\n');
  
  // Phase 1: Drop existing policies
  console.log('Dropping existing policies...\n');
  
  const dropPolicies = [
    ['DROP POLICY IF EXISTS "profiles_select_policy" ON profiles', 'Drop profiles_select_policy'],
    ['DROP POLICY IF EXISTS "profiles_update_policy" ON profiles', 'Drop profiles_update_policy'],
    ['DROP POLICY IF EXISTS "Users can view own profile" ON profiles', 'Drop Users can view own profile'],
    ['DROP POLICY IF EXISTS "Users can update own profile" ON profiles', 'Drop Users can update own profile'],
    
    ['DROP POLICY IF EXISTS "projects_select_policy" ON projects', 'Drop projects_select_policy'],
    ['DROP POLICY IF EXISTS "projects_insert_policy" ON projects', 'Drop projects_insert_policy'],
    ['DROP POLICY IF EXISTS "projects_update_policy" ON projects', 'Drop projects_update_policy'],
    ['DROP POLICY IF EXISTS "projects_delete_policy" ON projects', 'Drop projects_delete_policy'],
    ['DROP POLICY IF EXISTS "Users can view own projects" ON projects', 'Drop Users can view own projects'],
    ['DROP POLICY IF EXISTS "Users can create projects" ON projects', 'Drop Users can create projects'],
    ['DROP POLICY IF EXISTS "Users can update own projects" ON projects', 'Drop Users can update own projects'],
    ['DROP POLICY IF EXISTS "Users can delete own projects" ON projects', 'Drop Users can delete own projects'],
    
    ['DROP POLICY IF EXISTS "artifacts_select_policy" ON artifacts', 'Drop artifacts_select_policy'],
    ['DROP POLICY IF EXISTS "artifacts_insert_policy" ON artifacts', 'Drop artifacts_insert_policy'],
    ['DROP POLICY IF EXISTS "artifacts_update_policy" ON artifacts', 'Drop artifacts_update_policy'],
    ['DROP POLICY IF EXISTS "artifacts_delete_policy" ON artifacts', 'Drop artifacts_delete_policy'],
    ['DROP POLICY IF EXISTS "Users can view artifacts of their projects" ON artifacts', 'Drop artifacts view policy'],
    ['DROP POLICY IF EXISTS "Users can create artifacts in their projects" ON artifacts', 'Drop artifacts create policy'],
    ['DROP POLICY IF EXISTS "Users can update artifacts in their projects" ON artifacts', 'Drop artifacts update policy'],
    ['DROP POLICY IF EXISTS "Users can delete artifacts in their projects" ON artifacts', 'Drop artifacts delete policy'],
    
    ['DROP POLICY IF EXISTS "project_members_select_policy" ON project_members', 'Drop project_members_select_policy'],
    ['DROP POLICY IF EXISTS "project_members_insert_policy" ON project_members', 'Drop project_members_insert_policy'],
    ['DROP POLICY IF EXISTS "project_members_update_policy" ON project_members', 'Drop project_members_update_policy'],
    ['DROP POLICY IF EXISTS "project_members_delete_policy" ON project_members', 'Drop project_members_delete_policy'],
    
    ['DROP POLICY IF EXISTS "bug_reports_select_policy" ON bug_reports', 'Drop bug_reports_select_policy'],
    ['DROP POLICY IF EXISTS "bug_reports_insert_policy" ON bug_reports', 'Drop bug_reports_insert_policy'],
    ['DROP POLICY IF EXISTS "bug_reports_update_policy" ON bug_reports', 'Drop bug_reports_update_policy'],
    ['DROP POLICY IF EXISTS "Users can view bug reports" ON bug_reports', 'Drop bug reports view policy'],
    ['DROP POLICY IF EXISTS "Users can create bug reports" ON bug_reports', 'Drop bug reports create policy'],
    ['DROP POLICY IF EXISTS "Users can update bug reports" ON bug_reports', 'Drop bug reports update policy'],
    
    ['DROP POLICY IF EXISTS "generation_analytics_insert_policy" ON generation_analytics', 'Drop analytics insert policy'],
    ['DROP POLICY IF EXISTS "generation_analytics_select_policy" ON generation_analytics', 'Drop analytics select policy'],
    ['DROP POLICY IF EXISTS "Users can insert own analytics" ON generation_analytics', 'Drop user analytics insert'],
    ['DROP POLICY IF EXISTS "Users can view own analytics" ON generation_analytics', 'Drop user analytics view'],
    ['DROP POLICY IF EXISTS "Admins can view all analytics" ON generation_analytics', 'Drop admin analytics view']
  ];
  
  for (const [query, description] of dropPolicies) {
    await executeSQL(query, description);
  }
  
  console.log('\nCreating optimized policies...\n');
  
  // Phase 2: Create new optimized policies
  const createPolicies = [
    // Profiles policies
    ['CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (id = (SELECT auth.uid()))', 'Create profiles_select_own'],
    ['CREATE POLICY "profiles_select_team" ON profiles FOR SELECT USING (id IN (SELECT user_id FROM project_members WHERE project_id IN (SELECT project_id FROM project_members WHERE user_id = (SELECT auth.uid()))))', 'Create profiles_select_team'],
    ['CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = (SELECT auth.uid()))', 'Create profiles_update_own'],
    
    // Projects policies
    ['CREATE POLICY "projects_select_owner" ON projects FOR SELECT USING (owner_id = (SELECT auth.uid()))', 'Create projects_select_owner'],
    ['CREATE POLICY "projects_select_member" ON projects FOR SELECT USING (id IN (SELECT project_id FROM project_members WHERE user_id = (SELECT auth.uid())))', 'Create projects_select_member'],
    ['CREATE POLICY "projects_insert" ON projects FOR INSERT WITH CHECK (owner_id = (SELECT auth.uid()))', 'Create projects_insert'],
    ['CREATE POLICY "projects_update_owner" ON projects FOR UPDATE USING (owner_id = (SELECT auth.uid()))', 'Create projects_update_owner'],
    ['CREATE POLICY "projects_delete_owner" ON projects FOR DELETE USING (owner_id = (SELECT auth.uid()))', 'Create projects_delete_owner'],
    
    // Artifacts policies
    ['CREATE POLICY "artifacts_access" ON artifacts FOR ALL USING (project_id IN (SELECT id FROM projects WHERE owner_id = (SELECT auth.uid()) UNION SELECT project_id FROM project_members WHERE user_id = (SELECT auth.uid())))', 'Create artifacts_access'],
    
    // Project members policies
    ['CREATE POLICY "project_members_select" ON project_members FOR SELECT USING (user_id = (SELECT auth.uid()) OR project_id IN (SELECT id FROM projects WHERE owner_id = (SELECT auth.uid())))', 'Create project_members_select'],
    ['CREATE POLICY "project_members_manage" ON project_members FOR ALL USING (project_id IN (SELECT id FROM projects WHERE owner_id = (SELECT auth.uid())))', 'Create project_members_manage'],
    
    // Bug reports policies
    ['CREATE POLICY "bug_reports_select_own" ON bug_reports FOR SELECT USING (user_id = (SELECT auth.uid()))', 'Create bug_reports_select_own'],
    ['CREATE POLICY "bug_reports_select_admin" ON bug_reports FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND is_admin = true))', 'Create bug_reports_select_admin'],
    ['CREATE POLICY "bug_reports_insert" ON bug_reports FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()))', 'Create bug_reports_insert'],
    ['CREATE POLICY "bug_reports_update_own" ON bug_reports FOR UPDATE USING (user_id = (SELECT auth.uid()))', 'Create bug_reports_update_own'],
    ['CREATE POLICY "bug_reports_update_admin" ON bug_reports FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND is_admin = true))', 'Create bug_reports_update_admin'],
    
    // Generation analytics policies
    ['CREATE POLICY "generation_analytics_insert" ON generation_analytics FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()))', 'Create analytics_insert'],
    ['CREATE POLICY "generation_analytics_select_own" ON generation_analytics FOR SELECT USING (user_id = (SELECT auth.uid()))', 'Create analytics_select_own'],
    ['CREATE POLICY "generation_analytics_select_admin" ON generation_analytics FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND is_admin = true))', 'Create analytics_select_admin']
  ];
  
  for (const [query, description] of createPolicies) {
    await executeSQL(query, description);
  }
  
  console.log('\n✨ RLS Performance fixes complete!');
  console.log('\nNote: Check Supabase Dashboard to verify all policies were applied correctly.');
}

// Run the script
applyRLSFixes().catch(console.error);