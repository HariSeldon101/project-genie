const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function applyPromptParamsMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }
  
  console.log('🔄 Applying prompt parameters migration...');
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  });
  
  try {
    // Check current columns
    console.log('📊 Checking current table structure...');
    
    // Since we can't ALTER TABLE directly, we need to use Supabase Dashboard
    console.log('\n' + '='.repeat(80));
    console.log('📋 MANUAL MIGRATION REQUIRED');
    console.log('='.repeat(80));
    console.log('\nThe database requires manual migration via Supabase Dashboard.');
    console.log('\n📍 Steps to apply migration:');
    console.log('\n1. Open Supabase SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/vqphngwdnmbcdmmasmwx/sql/new');
    console.log('\n2. Copy and paste this SQL:');
    console.log('\n' + '-'.repeat(80));
    
    const migrationSQL = `-- Add columns to store prompt parameters and additional generation metadata
ALTER TABLE artifacts
ADD COLUMN IF NOT EXISTS generation_reasoning_level TEXT,
ADD COLUMN IF NOT EXISTS generation_temperature DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS generation_max_tokens INTEGER,
ADD COLUMN IF NOT EXISTS generation_input_tokens INTEGER,
ADD COLUMN IF NOT EXISTS generation_output_tokens INTEGER,
ADD COLUMN IF NOT EXISTS generation_reasoning_tokens INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN artifacts.generation_reasoning_level IS 'Reasoning level used for generation (minimal, low, medium, high)';
COMMENT ON COLUMN artifacts.generation_temperature IS 'Temperature parameter used for generation';
COMMENT ON COLUMN artifacts.generation_max_tokens IS 'Maximum tokens parameter used for generation';
COMMENT ON COLUMN artifacts.generation_input_tokens IS 'Number of input tokens used';
COMMENT ON COLUMN artifacts.generation_output_tokens IS 'Number of output tokens generated';
COMMENT ON COLUMN artifacts.generation_reasoning_tokens IS 'Number of reasoning tokens used (GPT-5 models)';

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'artifacts' 
AND column_name LIKE 'generation_%'
ORDER BY column_name;`;
    
    console.log(migrationSQL);
    console.log('-'.repeat(80));
    console.log('\n3. Click "Run" to execute the migration');
    console.log('\n4. Verify the columns were added in the result');
    console.log('\n' + '='.repeat(80));
    
    // Now clear test data for the user
    console.log('\n🗑️  Preparing to clear test data for stusandboxacc@gmail.com...');
    
    // Get user ID
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', 'stusandboxacc@gmail.com')
      .single();
    
    if (userData) {
      console.log(`✅ Found user: ${userData.id}`);
      
      // Count existing data
      const { count: projectCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', userData.id);
      
      console.log(`📊 Found ${projectCount} projects to delete`);
      
      // Get project IDs for artifact deletion
      const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .eq('owner_id', userData.id);
      
      if (projects && projects.length > 0) {
        const projectIds = projects.map(p => p.id);
        
        // Count artifacts
        const { count: artifactCount } = await supabase
          .from('artifacts')
          .select('*', { count: 'exact', head: true })
          .in('project_id', projectIds);
        
        console.log(`📊 Found ${artifactCount} artifacts to delete`);
        
        console.log('\n🎯 Ready to clear data. Run this SQL in Supabase Dashboard:');
        console.log('\n' + '-'.repeat(80));
        
        const clearDataSQL = `-- Clear test data for stusandboxacc@gmail.com
-- User ID: ${userData.id}

-- Delete artifacts first (foreign key constraint)
DELETE FROM artifacts 
WHERE project_id IN (
  SELECT id FROM projects WHERE owner_id = '${userData.id}'
);

-- Delete projects
DELETE FROM projects 
WHERE owner_id = '${userData.id}';

-- Add admin privileges
UPDATE profiles 
SET is_admin = true 
WHERE id = '${userData.id}';

-- Verify cleanup
SELECT 
  (SELECT COUNT(*) FROM projects WHERE owner_id = '${userData.id}') as remaining_projects,
  (SELECT COUNT(*) FROM artifacts WHERE project_id IN (SELECT id FROM projects WHERE owner_id = '${userData.id}')) as remaining_artifacts,
  (SELECT is_admin FROM profiles WHERE id = '${userData.id}') as is_admin;`;
        
        console.log(clearDataSQL);
        console.log('-'.repeat(80));
      } else {
        console.log('ℹ️  No projects found for user');
      }
    } else {
      console.log('⚠️  User stusandboxacc@gmail.com not found');
    }
    
    console.log('\n✅ Migration plan prepared. Please execute the SQL above in Supabase Dashboard.');
    console.log('📍 Dashboard URL: https://supabase.com/dashboard/project/vqphngwdnmbcdmmasmwx/sql/new');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

applyPromptParamsMigration();