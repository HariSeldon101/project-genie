#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

async function testBugFetch() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  console.log('Testing bug reports fetch...\n');
  
  // Test 1: Simple fetch
  console.log('Test 1: Simple fetch');
  const { data: simpleData, error: simpleError } = await supabase
    .from('bug_reports')
    .select('*');
  
  console.log('Result:', { count: simpleData?.length, error: simpleError });
  
  // Test 2: With profiles join using foreign key
  console.log('\nTest 2: With profiles join (foreign key)');
  const { data: fkData, error: fkError } = await supabase
    .from('bug_reports')
    .select(`
      *,
      profiles!bug_reports_user_id_fkey(email, full_name)
    `);
  
  console.log('Result:', { count: fkData?.length, error: fkError });
  
  // Test 3: With profiles join using column name
  console.log('\nTest 3: With profiles join (column name)');
  const { data: colData, error: colError } = await supabase
    .from('bug_reports')
    .select(`
      *,
      profiles:user_id(email, full_name)
    `);
  
  console.log('Result:', { count: colData?.length, error: colError });
  
  // Test 4: Check if user is authenticated
  console.log('\nTest 4: Check authentication');
  const { data: { user } } = await supabase.auth.getUser();
  console.log('Authenticated user:', user?.email || 'Not authenticated');
  
  // Test 5: Authenticate and try again
  if (!user) {
    console.log('\nTest 5: Authenticating as test user...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'free_user@projectgenie.com',
      password: 'morzineavoriaz'
    });
    
    if (authError) {
      console.log('Auth error:', authError);
    } else {
      console.log('Authenticated as:', authData.user?.email);
      
      // Try fetching again
      const { data: authFetchData, error: authFetchError } = await supabase
        .from('bug_reports')
        .select('*');
      
      console.log('Fetch after auth:', { count: authFetchData?.length, error: authFetchError });
    }
  }
}

testBugFetch().catch(console.error);