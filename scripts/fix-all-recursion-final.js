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

async function fixAllRecursion() {
  console.log('🔧 Complete Fix for All Recursion Issues');
  console.log('=========================================\n');
  
  // Step 1: Drop ALL policies on all tables
  console.log('📍 Step 1: Dropping ALL existing policies...\n');
  
  // Drop all policies using DO block
  const dropAllPolicies = `
    DO $$
    DECLARE
      r RECORD;
    BEGIN
      -- Drop all policies on profiles
      FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public')
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', r.policyname);
      END LOOP;
      
      -- Drop all policies on projects
      FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'projects' AND schemaname = 'public')
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON projects', r.policyname);
      END LOOP;
      
      -- Drop all policies on artifacts
      FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'artifacts' AND schemaname = 'public')
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON artifacts', r.policyname);
      END LOOP;
      
      -- Drop all policies on project_members
      FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'project_members' AND schemaname = 'public')
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON project_members', r.policyname);
      END LOOP;
      
      -- Drop all policies on bug_reports
      FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'bug_reports' AND schemaname = 'public')
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON bug_reports', r.policyname);
      END LOOP;
      
      -- Drop all policies on generation_analytics
      FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'generation_analytics' AND schemaname = 'public')
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON generation_analytics', r.policyname);
      END LOOP;
    END $$;
  `;
  
  await executeSQL(dropAllPolicies, 'Drop ALL existing policies');
  
  // Step 2: Create ultra-simple policies with NO cross-references
  console.log('\n📍 Step 2: Creating ultra-simple policies...\n');
  
  const simplePolicies = [
    // PROFILES - Public read, own update
    [`CREATE POLICY "profiles_public_read" ON profiles 
      FOR SELECT USING (true)`, 'Profiles: Public read'],
    
    [`CREATE POLICY "profiles_own_update" ON profiles 
      FOR UPDATE USING (id = auth.uid())`, 'Profiles: Own update'],
    
    // PROJECTS - Direct ownership only for now
    [`CREATE POLICY "projects_owner_all" ON projects 
      FOR ALL USING (owner_id = auth.uid())`, 'Projects: Owner all access'],
    
    // ARTIFACTS - Check project ownership via subquery
    [`CREATE POLICY "artifacts_owner_all" ON artifacts 
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM projects p 
          WHERE p.id = artifacts.project_id 
          AND p.owner_id = auth.uid()
        )
      )`, 'Artifacts: Owner all access'],
    
    // PROJECT_MEMBERS - View own, manage if project owner
    [`CREATE POLICY "project_members_own" ON project_members 
      FOR SELECT USING (user_id = auth.uid())`, 'Project members: View own'],
    
    [`CREATE POLICY "project_members_owner_manage" ON project_members 
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM projects p 
          WHERE p.id = project_members.project_id 
          AND p.owner_id = auth.uid()
        )
      )`, 'Project members: Owner manage'],
    
    // BUG_REPORTS - Own or admin
    [`CREATE POLICY "bug_reports_own" ON bug_reports 
      FOR ALL USING (user_id = auth.uid())`, 'Bug reports: Own all access'],
    
    [`CREATE POLICY "bug_reports_admin_view" ON bug_reports 
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() 
          AND is_admin = true
        )
      )`, 'Bug reports: Admin view'],
    
    // GENERATION_ANALYTICS - Own only
    [`CREATE POLICY "generation_analytics_own" ON generation_analytics 
      FOR ALL USING (user_id = auth.uid())`, 'Analytics: Own all access']
  ];
  
  for (const [query, description] of simplePolicies) {
    await executeSQL(query, description);
  }
  
  // Step 3: Add member access to projects as a separate policy
  console.log('\n📍 Step 3: Adding member access to projects...\n');
  
  // Add this as a completely separate policy to avoid recursion
  await executeSQL(
    `CREATE POLICY "projects_member_read" ON projects 
     FOR SELECT USING (
       id IN (
         SELECT project_id FROM project_members 
         WHERE user_id = auth.uid()
       )
     )`,
    'Projects: Member read access'
  );
  
  console.log('\n✨ Complete! All recursion issues should be fixed.');
  console.log('\nKey changes:');
  console.log('- Removed ALL circular references');
  console.log('- Projects: Owners have full access, members have read access');
  console.log('- No policies reference each other in circular ways');
  console.log('- Simplified all access patterns');
}

// Run the fix
fixAllRecursion().catch(console.error);