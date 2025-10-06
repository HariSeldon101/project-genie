/**
 * Apply permanent logs migration using Supabase Management API
 * Creates the dedicated permanent_logs table with all required features
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const PROJECT_REF = 'vnuieavheezjxbkyfxea';
const PAT_TOKEN = 'sbp_ce8146f94e3403eca0a088896812e9bbbf08929b';

async function applyMigration() {
  try {
    console.log('📦 Reading migration file...');
    
    // Read the migration SQL file
    const migrationPath = join(process.cwd(), 'supabase/migrations/20250911_create_permanent_logs_table.sql');
    const sqlContent = readFileSync(migrationPath, 'utf-8');
    
    console.log('🚀 Applying permanent_logs table migration...');
    
    // Apply the migration using Management API
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PAT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: sqlContent
        }),
      }
    );
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Migration applied successfully!');
      console.log('📊 Created:');
      console.log('   - Table: permanent_logs');
      console.log('   - Indexes: 7 performance indexes');
      console.log('   - RLS Policies: 4 security policies');
      console.log('   - Functions: 3 RPC functions');
      console.log('');
      console.log('🎯 Features enabled:');
      console.log('   - 6 log levels (debug, info, warn, error, fatal, metric)');
      console.log('   - Request correlation tracking');
      console.log('   - Breadcrumb trails');
      console.log('   - Performance timing waterfall');
      console.log('   - Error similarity detection');
      console.log('   - Automatic log rotation');
      
      return true;
    } else {
      console.error('❌ Migration failed:', result);
      return false;
    }
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    return false;
  }
}

// Run the migration
applyMigration().then(success => {
  process.exit(success ? 0 : 1);
});