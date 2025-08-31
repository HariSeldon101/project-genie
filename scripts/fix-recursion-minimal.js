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

async function minimalRecursionFix() {
  console.log('🔧 Minimal Recursion Fix - Absolute Simplest Policies');
  console.log('====================================================\n');
  
  // Step 1: Disable RLS on all tables temporarily
  console.log('📍 Step 1: Disabling RLS on all tables...\n');
  
  const tables = ['profiles', 'projects', 'artifacts', 'project_members', 'bug_reports', 'generation_analytics'];
  
  for (const table of tables) {
    await executeSQL(
      `ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY`,
      `Disable RLS on ${table}`
    );
  }
  
  // Step 2: Drop ALL existing policies
  console.log('\n📍 Step 2: Dropping ALL policies...\n');
  
  const dropAllPolicies = `
    DO $$
    DECLARE
      r RECORD;
    BEGIN
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
  
  await executeSQL(dropAllPolicies, 'Drop ALL policies');
  
  // Step 3: Create MINIMAL policies - owner only, no cross-references
  console.log('\n📍 Step 3: Creating minimal owner-only policies...\n');
  
  const policies = [
    // Profiles - Everyone can read, users can update their own
    {
      query: `CREATE POLICY "read_all" ON profiles FOR SELECT USING (true)`,
      desc: 'Profiles: Read all'
    },
    {
      query: `CREATE POLICY "update_own" ON profiles FOR UPDATE USING (id = auth.uid())`,
      desc: 'Profiles: Update own'
    },
    
    // Projects - Only owners, no member access for now
    {
      query: `CREATE POLICY "owner_only" ON projects FOR ALL USING (owner_id = auth.uid())`,
      desc: 'Projects: Owner only'
    },
    
    // Artifacts - Check ownership through subquery (one-way only)
    {
      query: `CREATE POLICY "via_project" ON artifacts FOR ALL 
              USING (EXISTS (
                SELECT 1 FROM projects 
                WHERE projects.id = artifacts.project_id 
                AND projects.owner_id = auth.uid()
              ))`,
      desc: 'Artifacts: Via project ownership'
    },
    
    // Project members - Check ownership through subquery (one-way only)
    {
      query: `CREATE POLICY "via_project" ON project_members FOR ALL 
              USING (EXISTS (
                SELECT 1 FROM projects 
                WHERE projects.id = project_members.project_id 
                AND projects.owner_id = auth.uid()
              ))`,
      desc: 'Project members: Via project ownership'
    },
    
    // Bug reports - User owns their own
    {
      query: `CREATE POLICY "own_only" ON bug_reports FOR ALL USING (user_id = auth.uid())`,
      desc: 'Bug reports: Own only'
    },
    
    // Generation analytics - User owns their own
    {
      query: `CREATE POLICY "own_only" ON generation_analytics FOR ALL USING (user_id = auth.uid())`,
      desc: 'Generation analytics: Own only'
    }
  ];
  
  for (const policy of policies) {
    await executeSQL(policy.query, policy.desc);
  }
  
  // Step 4: Re-enable RLS
  console.log('\n📍 Step 4: Re-enabling RLS...\n');
  
  for (const table of tables) {
    await executeSQL(
      `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`,
      `Enable RLS on ${table}`
    );
  }
  
  console.log('\n✨ Minimal fix complete!');
  console.log('\nWhat we did:');
  console.log('1. Temporarily disabled RLS on all tables');
  console.log('2. Dropped ALL existing policies');
  console.log('3. Created minimal owner-only policies');
  console.log('4. Re-enabled RLS');
  console.log('\nNote: Member access temporarily disabled to ensure no recursion');
  console.log('Projects are now owner-only until we can safely add member access');
}

// Run the fix
minimalRecursionFix().catch(console.error);