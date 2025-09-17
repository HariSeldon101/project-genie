#!/usr/bin/env tsx
/**
 * Setup test accounts for automated UI testing
 * This script ensures all test accounts have known passwords
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import chalk from 'chalk'

// Load environment variables
dotenv.config({ path: '.env.local' })

// Test account configuration
const TEST_ACCOUNTS = [
  { email: 'test@bigfluffy.ai', password: 'TestPassword123!', role: 'test' },
  { email: 'free_user@projectgenie.com', password: 'FreeUser123!', role: 'free' },
  { email: 'basic_user@projectgenie.com', password: 'BasicUser123!', role: 'basic' },
  { email: 'premium_user@projectgenie.com', password: 'PremiumUser123!', role: 'premium' },
  { email: 'team_user@projectgenie.com', password: 'TeamUser123!', role: 'team' },
  { email: 'admin_user@projectgenie.com', password: 'AdminUser123!', role: 'admin' }
]

// Create Supabase admin client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role for admin operations
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function setupTestAccounts() {
  console.log(chalk.cyan.bold('\n🔧 Setting up test accounts for UI automation\n'))
  
  const results = {
    success: [],
    failed: [],
    existing: []
  }
  
  for (const account of TEST_ACCOUNTS) {
    console.log(chalk.blue(`Processing ${account.email}...`))
    
    try {
      // First, try to sign in to see if account exists with this password
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: account.password
      })
      
      if (signInData?.user) {
        console.log(chalk.green(`  ✓ Account already configured: ${account.email}`))
        results.existing.push(account.email)
        continue
      }
      
      // If sign in failed, try to update the password (account exists but different password)
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
      
      if (listError) {
        throw listError
      }
      
      const existingUser = users?.find(u => u.email === account.email)
      
      if (existingUser) {
        // Update password for existing user
        const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
          existingUser.id,
          { password: account.password }
        )
        
        if (updateError) {
          throw updateError
        }
        
        console.log(chalk.yellow(`  ⟳ Password updated for: ${account.email}`))
        results.success.push(account.email)
      } else {
        // Create new user if doesn't exist
        const { data: createData, error: createError } = await supabase.auth.admin.createUser({
          email: account.email,
          password: account.password,
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            role: account.role,
            test_account: true
          }
        })
        
        if (createError) {
          throw createError
        }
        
        console.log(chalk.green(`  ✓ Account created: ${account.email}`))
        results.success.push(account.email)
      }
      
    } catch (error) {
      console.log(chalk.red(`  ✗ Failed to setup ${account.email}: ${error.message}`))
      results.failed.push(account.email)
    }
  }
  
  // Print summary
  console.log(chalk.cyan.bold('\n' + '='.repeat(60)))
  console.log(chalk.cyan.bold('SETUP COMPLETE'))
  console.log(chalk.cyan.bold('='.repeat(60)))
  
  if (results.success.length > 0) {
    console.log(chalk.green(`\n✓ Successfully configured: ${results.success.length} accounts`))
    results.success.forEach(email => console.log(chalk.gray(`  - ${email}`)))
  }
  
  if (results.existing.length > 0) {
    console.log(chalk.blue(`\n◉ Already configured: ${results.existing.length} accounts`))
    results.existing.forEach(email => console.log(chalk.gray(`  - ${email}`)))
  }
  
  if (results.failed.length > 0) {
    console.log(chalk.red(`\n✗ Failed to configure: ${results.failed.length} accounts`))
    results.failed.forEach(email => console.log(chalk.gray(`  - ${email}`)))
  }
  
  // Save credentials to file for test script
  const testConfig = {
    accounts: TEST_ACCOUNTS.filter(acc => 
      results.success.includes(acc.email) || results.existing.includes(acc.email)
    ),
    defaultAccount: TEST_ACCOUNTS[0],
    timestamp: new Date().toISOString()
  }
  
  const fs = await import('fs/promises')
  const configPath = './test-config.json'
  await fs.writeFile(configPath, JSON.stringify(testConfig, null, 2))
  console.log(chalk.gray(`\nTest configuration saved to: ${configPath}`))
  
  // Test one account to verify
  console.log(chalk.cyan.bold('\n🧪 Verifying setup with test login...'))
  const testAccount = TEST_ACCOUNTS[0]
  
  const { data: testData, error: testError } = await supabase.auth.signInWithPassword({
    email: testAccount.email,
    password: testAccount.password
  })
  
  if (testData?.user) {
    console.log(chalk.green(`✓ Test login successful for ${testAccount.email}`))
    console.log(chalk.gray(`  User ID: ${testData.user.id}`))
    console.log(chalk.gray(`  Access Token: ${testData.session?.access_token?.substring(0, 20)}...`))
  } else {
    console.log(chalk.red(`✗ Test login failed: ${testError?.message}`))
  }
  
  console.log(chalk.green.bold('\n✨ Setup complete! You can now run the UI tests.\n'))
  console.log(chalk.gray('Run: npx tsx test-ui-automation.ts'))
}

// Run setup
setupTestAccounts().catch(error => {
  console.error(chalk.red.bold('\n❌ Setup failed:'), error)
  process.exit(1)
})