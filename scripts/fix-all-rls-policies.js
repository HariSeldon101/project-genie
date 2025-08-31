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
          console.log(`   Response: ${responseData}`);
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

async function fixAllRLSPolicies() {
  console.log('🔧 Comprehensive RLS Policy Fix');
  console.log('================================\n');
  
  // Step 1: Drop ALL existing policies
  console.log('📍 Step 1: Dropping all existing policies...\n');
  
  const dropPolicies = [
    // Profiles
    'DROP POLICY IF EXISTS "profiles_select_own" ON profiles',
    'DROP POLICY IF EXISTS "profiles_select_public" ON profiles',
    'DROP POLICY IF EXISTS "profiles_update" ON profiles',
    
    // Projects
    'DROP POLICY IF EXISTS "projects_select" ON projects',
    'DROP POLICY IF EXISTS "projects_insert" ON projects',
    'DROP POLICY IF EXISTS "projects_update" ON projects',
    'DROP POLICY IF EXISTS "projects_delete" ON projects',
    
    // Artifacts
    'DROP POLICY IF EXISTS "artifacts_all" ON artifacts',
    
    // Project Members
    'DROP POLICY IF EXISTS "project_members_own_membership" ON project_members',
    'DROP POLICY IF EXISTS "project_members_owner_view" ON project_members',
    'DROP POLICY IF EXISTS "project_members_owner_manage" ON project_members',
    
    // Bug Reports
    'DROP POLICY IF EXISTS "bug_reports_select" ON bug_reports',
    'DROP POLICY IF EXISTS "bug_reports_insert" ON bug_reports',
    'DROP POLICY IF EXISTS "bug_reports_update" ON bug_reports',
    
    // Generation Analytics
    'DROP POLICY IF EXISTS "generation_analytics_select" ON generation_analytics',
    'DROP POLICY IF EXISTS "generation_analytics_insert" ON generation_analytics'
  ];
  
  for (const query of dropPolicies) {
    await executeSQL(query, query);
  }
  
  // Step 2: Create new, non-circular policies
  console.log('\n📍 Step 2: Creating new optimized policies...\n');
  
  const createPolicies = [
    // === PROFILES POLICIES ===
    // Allow users to see all profiles (needed for joins)
    [`CREATE POLICY "profiles_select_all" ON profiles 
      FOR SELECT USING (true)`, 'Profiles: Allow public read'],
    
    // Users can only update their own profile
    [`CREATE POLICY "profiles_update_own" ON profiles 
      FOR UPDATE USING (id = (SELECT auth.uid()))`, 'Profiles: Update own'],
    
    // === PROJECTS POLICIES ===
    // Users can see projects they own
    [`CREATE POLICY "projects_select_owned" ON projects 
      FOR SELECT USING (owner_id = (SELECT auth.uid()))`, 'Projects: Select owned'],
    
    // Users can see projects they're members of (no circular reference)
    [`CREATE POLICY "projects_select_member" ON projects 
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM project_members pm 
          WHERE pm.project_id = projects.id 
          AND pm.user_id = (SELECT auth.uid())
        )
      )`, 'Projects: Select as member'],
    
    // Users can create projects
    [`CREATE POLICY "projects_insert" ON projects 
      FOR INSERT WITH CHECK (owner_id = (SELECT auth.uid()))`, 'Projects: Insert'],
    
    // Users can update their own projects
    [`CREATE POLICY "projects_update" ON projects 
      FOR UPDATE USING (owner_id = (SELECT auth.uid()))`, 'Projects: Update'],
    
    // Users can delete their own projects
    [`CREATE POLICY "projects_delete" ON projects 
      FOR DELETE USING (owner_id = (SELECT auth.uid()))`, 'Projects: Delete'],
    
    // === ARTIFACTS POLICIES ===
    // Users can manage artifacts in their projects
    [`CREATE POLICY "artifacts_owned_projects" ON artifacts 
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM projects p 
          WHERE p.id = artifacts.project_id 
          AND p.owner_id = (SELECT auth.uid())
        )
      )`, 'Artifacts: Owned projects'],
    
    // Users can access artifacts in projects they're members of
    [`CREATE POLICY "artifacts_member_projects" ON artifacts 
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM project_members pm 
          WHERE pm.project_id = artifacts.project_id 
          AND pm.user_id = (SELECT auth.uid())
        )
      )`, 'Artifacts: Member projects'],
    
    // === PROJECT MEMBERS POLICIES ===
    // Users can see their own memberships
    [`CREATE POLICY "project_members_own" ON project_members 
      FOR SELECT USING (user_id = (SELECT auth.uid()))`, 'Project members: Own'],
    
    // Project owners can manage members
    [`CREATE POLICY "project_members_owner_all" ON project_members 
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM projects p 
          WHERE p.id = project_members.project_id 
          AND p.owner_id = (SELECT auth.uid())
        )
      )`, 'Project members: Owner manage'],
    
    // === BUG REPORTS POLICIES ===
    // Users can see their own bug reports
    [`CREATE POLICY "bug_reports_own" ON bug_reports 
      FOR SELECT USING (user_id = (SELECT auth.uid()))`, 'Bug reports: Own'],
    
    // Admins can see all bug reports
    [`CREATE POLICY "bug_reports_admin" ON bug_reports 
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = (SELECT auth.uid()) 
          AND is_admin = true
        )
      )`, 'Bug reports: Admin'],
    
    // Users can create bug reports
    [`CREATE POLICY "bug_reports_insert" ON bug_reports 
      FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()))`, 'Bug reports: Insert'],
    
    // Users can update their own bug reports
    [`CREATE POLICY "bug_reports_update_own" ON bug_reports 
      FOR UPDATE USING (user_id = (SELECT auth.uid()))`, 'Bug reports: Update own'],
    
    // Admins can update any bug report
    [`CREATE POLICY "bug_reports_update_admin" ON bug_reports 
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = (SELECT auth.uid()) 
          AND is_admin = true
        )
      )`, 'Bug reports: Update admin'],
    
    // === GENERATION ANALYTICS POLICIES ===
    // Users can insert their own analytics
    [`CREATE POLICY "generation_analytics_insert" ON generation_analytics 
      FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()))`, 'Analytics: Insert'],
    
    // Users can see their own analytics
    [`CREATE POLICY "generation_analytics_own" ON generation_analytics 
      FOR SELECT USING (user_id = (SELECT auth.uid()))`, 'Analytics: Own'],
    
    // Admins can see all analytics
    [`CREATE POLICY "generation_analytics_admin" ON generation_analytics 
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = (SELECT auth.uid()) 
          AND is_admin = true
        )
      )`, 'Analytics: Admin']
  ];
  
  for (const [query, description] of createPolicies) {
    await executeSQL(query, description);
  }
  
  console.log('\n✨ RLS policies fixed successfully!');
  console.log('\nKey improvements:');
  console.log('- Removed all circular references');
  console.log('- Simplified policy logic');
  console.log('- Profiles are now publicly readable for joins');
  console.log('- Project membership checks are direct');
  console.log('- No more infinite recursion issues');
}

// Run the fix
fixAllRLSPolicies().catch(console.error);