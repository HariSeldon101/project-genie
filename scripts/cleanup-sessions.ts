#!/usr/bin/env tsx
/**
 * Cleanup duplicate Supabase sessions for a user
 * Usage: npx tsx scripts/cleanup-sessions.ts <email>
 */

import { createClient } from '@supabase/supabase-js'
import chalk from 'chalk'

// Get email from command line args
const email = process.argv[2]

if (!email) {
  console.error(chalk.red('❌ Please provide an email address'))
  console.log(chalk.gray('Usage: npx tsx scripts/cleanup-sessions.ts <email>'))
  process.exit(1)
}

// Initialize Supabase admin client (needs service role key for auth operations)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false
    }
  }
)

async function cleanupSessions() {
  console.log(chalk.cyan.bold('\n🧹 Session Cleanup Utility\n'))
  console.log(chalk.gray(`Target user: ${email}`))
  console.log(chalk.gray('-'.repeat(50)))
  
  try {
    // Note: Due to Supabase security, we cannot directly query or delete sessions
    // from the auth.sessions table using the client library.
    // This would need to be done through:
    // 1. Supabase Dashboard
    // 2. Direct database connection with service role
    // 3. Custom database function with proper permissions
    
    console.log(chalk.yellow('\n⚠️  Session cleanup requires one of the following:'))
    console.log(chalk.gray('1. Manual cleanup via Supabase Dashboard'))
    console.log(chalk.gray('2. Database migration with DELETE permissions'))
    console.log(chalk.gray('3. Custom RPC function with proper auth'))
    
    console.log(chalk.cyan('\n📝 Recommended solution:'))
    console.log(chalk.gray('1. Go to Supabase Dashboard > Authentication > Users'))
    console.log(chalk.gray(`2. Find user: ${email}`))
    console.log(chalk.gray('3. Click on user to view sessions'))
    console.log(chalk.gray('4. Manually revoke old sessions'))
    
    console.log(chalk.cyan('\n🔧 To prevent future duplicates:'))
    console.log(chalk.gray('1. Implement session refresh instead of new login'))
    console.log(chalk.gray('2. Check for existing session before signInWithPassword'))
    console.log(chalk.gray('3. Use getSession() to reuse existing sessions'))
    console.log(chalk.gray('4. Implement proper logout to clean up sessions'))
    
  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), error)
  }
}

// Alternative: Create a SQL script to be run via Supabase SQL Editor
function generateCleanupSQL() {
  console.log(chalk.cyan('\n📋 SQL Script for Supabase SQL Editor:\n'))
  console.log(chalk.green(`
-- Run this in Supabase SQL Editor to clean up duplicate sessions
-- Keep only the most recent session for the user

WITH user_info AS (
  SELECT id FROM auth.users WHERE email = '${email}'
),
sessions_to_keep AS (
  SELECT id 
  FROM auth.sessions 
  WHERE user_id = (SELECT id FROM user_info)
  ORDER BY created_at DESC
  LIMIT 1
)
DELETE FROM auth.sessions
WHERE user_id = (SELECT id FROM user_info)
  AND id NOT IN (SELECT id FROM sessions_to_keep);

-- Check remaining sessions
SELECT COUNT(*) as session_count 
FROM auth.sessions 
WHERE user_id = (SELECT id FROM auth.users WHERE email = '${email}');
  `))
}

// Run the cleanup
cleanupSessions().then(() => {
  generateCleanupSQL()
  console.log(chalk.green('\n✅ Cleanup instructions generated'))
})