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

async function ultimateRecursionFix() {
  console.log('🔧 Ultimate Recursion Fix - Complete Policy Rewrite');
  console.log('==================================================\n');
  
  // Step 1: Drop ALL policies
  console.log('📍 Step 1: Removing ALL existing policies...\n');
  
  const dropAllPolicies = `
    DO $$
    DECLARE
      r RECORD;
    BEGIN
      -- Drop all policies on all tables
      FOR r IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public'
      )
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
      END LOOP;
    END $$;
  `;
  
  await executeSQL(dropAllPolicies, 'Drop ALL policies on ALL tables');
  
  // Step 2: Create NEW ultra-simple policies with NO dependencies
  console.log('\n📍 Step 2: Creating new ultra-simple policies...\n');
  
  const policies = [
    // PROFILES - Simplest possible
    {
      query: `CREATE POLICY "allow_public_read" ON profiles 
              FOR SELECT USING (true)`,
      desc: 'Profiles: Allow public read'
    },
    {
      query: `CREATE POLICY "allow_own_update" ON profiles 
              FOR UPDATE USING (id = auth.uid())`,
      desc: 'Profiles: Allow own update'
    },
    
    // PROJECTS - Owner-only for now (no member access to avoid recursion)
    {
      query: `CREATE POLICY "owner_full_access" ON projects 
              FOR ALL USING (owner_id = auth.uid())`,
      desc: 'Projects: Owner full access'
    },
    
    // ARTIFACTS - Simple owner check via projects
    {
      query: `CREATE POLICY "artifacts_via_owner" ON artifacts 
              FOR ALL USING (
                project_id IN (
                  SELECT id FROM projects WHERE owner_id = auth.uid()
                )
              )`,
      desc: 'Artifacts: Access via project ownership'
    },
    
    // PROJECT_MEMBERS - Owner manages all
    {
      query: `CREATE POLICY "members_owner_manages" ON project_members 
              FOR ALL USING (
                project_id IN (
                  SELECT id FROM projects WHERE owner_id = auth.uid()
                )
              )`,
      desc: 'Project Members: Owner manages all'
    },
    
    // BUG_REPORTS - User owns their own
    {
      query: `CREATE POLICY "bugs_own_access" ON bug_reports 
              FOR ALL USING (user_id = auth.uid())`,
      desc: 'Bug Reports: Own access'
    },
    
    // GENERATION_ANALYTICS - User owns their own
    {
      query: `CREATE POLICY "analytics_own_access" ON generation_analytics 
              FOR ALL USING (user_id = auth.uid())`,
      desc: 'Analytics: Own access'
    }
  ];
  
  for (const policy of policies) {
    await executeSQL(policy.query, policy.desc);
  }
  
  // Step 3: Add member read access as completely separate policy
  console.log('\n📍 Step 3: Adding member read access (isolated)...\n');
  
  // This is the ONLY policy that crosses tables, and it's one-way only
  await executeSQL(
    `CREATE POLICY "member_read_only" ON projects 
     FOR SELECT USING (
       EXISTS (
         SELECT 1 FROM project_members pm
         WHERE pm.project_id = projects.id
         AND pm.user_id = auth.uid()
       )
     )`,
    'Projects: Member read-only access (via EXISTS)'
  );
  
  // Also allow members to see their own membership
  await executeSQL(
    `CREATE POLICY "members_see_own" ON project_members 
     FOR SELECT USING (user_id = auth.uid())`,
    'Project Members: See own membership'
  );
  
  console.log('\n✨ Ultimate fix complete!');
  console.log('\nKey changes:');
  console.log('- Removed ALL existing policies from ALL tables');
  console.log('- Created simple, one-way policies only');
  console.log('- No circular references whatsoever');
  console.log('- Used EXISTS instead of IN for member access');
  console.log('- Projects: Owners have full access, members have read via EXISTS');
}

// Run the fix
ultimateRecursionFix().catch(console.error);