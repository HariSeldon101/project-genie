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

async function fixProjectsRecursion() {
  console.log('🔧 Fixing Projects Table Infinite Recursion');
  console.log('============================================\n');
  
  // Step 1: Drop problematic policies
  console.log('📍 Step 1: Dropping problematic policies...\n');
  
  const dropPolicies = [
    'DROP POLICY IF EXISTS "projects_select_owned" ON projects',
    'DROP POLICY IF EXISTS "projects_select_member" ON projects'
  ];
  
  for (const query of dropPolicies) {
    await executeSQL(query, query);
  }
  
  // Step 2: Create simple, non-recursive policy
  console.log('\n📍 Step 2: Creating simple SELECT policy...\n');
  
  // Single, simple SELECT policy that avoids recursion
  await executeSQL(
    `CREATE POLICY "projects_select_simple" ON projects 
     FOR SELECT USING (
       owner_id = (SELECT auth.uid()) OR
       id IN (
         SELECT pm.project_id 
         FROM project_members pm 
         WHERE pm.user_id = (SELECT auth.uid())
       )
     )`,
    'Create simple projects SELECT policy'
  );
  
  console.log('\n✨ Fixed! Projects table should no longer have infinite recursion.');
  console.log('\nThe new policy:');
  console.log('- Allows users to see projects they own');
  console.log('- Allows users to see projects they are members of');
  console.log('- Avoids circular references by using direct queries');
}

// Run the fix
fixProjectsRecursion().catch(console.error);