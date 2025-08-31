const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function applyMigration() {
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
  
  try {
    // Try to check if we can access the database
    const { data: artifacts, error: testError } = await supabase
      .from('artifacts')
      .select('id')
      .limit(1);
    
    if (!testError) {
      console.log('✓ Connected to database successfully');
      
      // Try to insert a test record with generation_metadata
      const testData = {
        project_id: 'test-migration-check',
        type: 'test',
        title: 'Migration Test',
        content: '{}',
        version: 1,
        created_by: 'migration-script',
        generation_metadata: { test: true }
      };
      
      const { error: insertError } = await supabase
        .from('artifacts')
        .insert(testData);
      
      if (!insertError) {
        // Clean up test record
        await supabase
          .from('artifacts')
          .delete()
          .eq('project_id', 'test-migration-check');
        
        console.log('✓ Column generation_metadata already exists or was added successfully!');
        console.log('✓ Database is ready for generation metadata tracking');
      } else if (insertError.message && insertError.message.includes('column')) {
        console.log('✗ Column generation_metadata does not exist yet');
        console.log('');
        console.log('Please add it manually via Supabase Dashboard:');
        console.log('1. Go to https://supabase.com/dashboard/project/vnuieavheezjxbkyfxea/editor');
        console.log('2. Run this SQL command:');
        console.log('');
        console.log('ALTER TABLE artifacts');
        console.log('ADD COLUMN generation_metadata JSONB DEFAULT \'{}\'::jsonb;');
        console.log('');
        console.log('3. Click "Run" to apply the migration');
      } else {
        console.error('Unexpected error:', insertError.message);
      }
    } else {
      console.error('Could not connect to database:', testError.message);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

applyMigration();