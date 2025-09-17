const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function applyMigrations() {
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
  
  // Test columns that need to be added
  const testColumns = [
    'generation_provider',
    'generation_model',
    'generation_tokens',
    'generation_cost',
    'generation_time_ms',
    'generation_metadata'
  ];
  
  try {
    console.log('🔍 Checking artifacts table columns...');
    
    // First check which columns exist
    const { data: existingArtifact } = await supabase
      .from('artifacts')
      .select('*')
      .limit(1);
    
    const existingColumns = existingArtifact && existingArtifact.length > 0 
      ? Object.keys(existingArtifact[0])
      : [];
    
    console.log('Existing columns:', existingColumns.join(', '));
    
    const missingColumns = testColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length === 0) {
      console.log('✅ All columns already exist!');
      return;
    }
    
    console.log('❌ Missing columns:', missingColumns.join(', '));
    console.log('');
    
    // Test if we can add columns by trying to insert with those fields
    console.log('🧪 Testing column addition...');
    
    // Create test data with all generation fields
    const testData = {
      project_id: 'migration-test-' + Date.now(),
      type: 'test',
      title: 'Migration Test',
      content: '{}',
      version: 1,
      created_by: '00000000-0000-0000-0000-000000000000',
      // Add all generation columns
      generation_provider: 'test-provider',
      generation_model: 'test-model',
      generation_tokens: 100,
      generation_cost: 0.001,
      generation_time_ms: 1000,
      generation_metadata: { test: true }
    };
    
    // Try to insert with all columns
    const { data: insertData, error: insertError } = await supabase
      .from('artifacts')
      .insert(testData)
      .select();
    
    if (insertError) {
      console.log('⚠️  Cannot add columns automatically via Supabase client');
      console.log('Error:', insertError.message);
      console.log('');
      console.log('📋 MANUAL MIGRATION REQUIRED:');
      console.log('================================');
      console.log('Please run this SQL in Supabase Dashboard:');
      console.log('');
      console.log('1. Go to: https://supabase.com/dashboard/project/vnuieavheezjxbkyfxea/editor');
      console.log('2. Copy and run this SQL:');
      console.log('');
      console.log('-- Add missing columns to artifacts table');
      console.log('ALTER TABLE artifacts');
      
      if (missingColumns.includes('generation_provider')) {
        console.log('ADD COLUMN IF NOT EXISTS generation_provider TEXT,');
      }
      if (missingColumns.includes('generation_model')) {
        console.log('ADD COLUMN IF NOT EXISTS generation_model TEXT,');
      }
      if (missingColumns.includes('generation_tokens')) {
        console.log('ADD COLUMN IF NOT EXISTS generation_tokens INTEGER,');
      }
      if (missingColumns.includes('generation_cost')) {
        console.log('ADD COLUMN IF NOT EXISTS generation_cost NUMERIC(10,6),');
      }
      if (missingColumns.includes('generation_time_ms')) {
        console.log('ADD COLUMN IF NOT EXISTS generation_time_ms INTEGER,');
      }
      if (missingColumns.includes('generation_metadata')) {
        console.log('ADD COLUMN IF NOT EXISTS generation_metadata JSONB DEFAULT \'{}\'::jsonb;');
      }
      
      console.log('');
      console.log('3. Click "Run" to apply the migration');
      console.log('================================');
    } else {
      // Clean up test record
      if (insertData && insertData.length > 0) {
        await supabase
          .from('artifacts')
          .delete()
          .eq('project_id', testData.project_id);
        
        console.log('✅ All columns successfully verified!');
        console.log('✅ Database is ready for document generation');
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.log('');
    console.log('Please apply the migration manually in Supabase Dashboard');
  }
  
  process.exit(0);
}

applyMigrations();