#!/usr/bin/env node

/**
 * Script to create test accounts with different subscription tiers
 * Password for all accounts: morzineavoriaz
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables')
  console.log('Make sure you have these in your .env.local file:')
  console.log('- NEXT_PUBLIC_SUPABASE_URL')
  console.log('- SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const testAccounts = [
  {
    email: 'free_user@projectgenie.com',
    password: 'morzineavoriaz',
    full_name: 'Free User',
    subscription_tier: 'free',
    is_admin: false
  },
  {
    email: 'basic_user@projectgenie.com',
    password: 'morzineavoriaz',
    full_name: 'Basic User',
    subscription_tier: 'basic',
    is_admin: false
  },
  {
    email: 'premium_user@projectgenie.com',
    password: 'morzineavoriaz',
    full_name: 'Premium User',
    subscription_tier: 'premium',
    is_admin: false
  },
  {
    email: 'team_user@projectgenie.com',
    password: 'morzineavoriaz',
    full_name: 'Team User',
    subscription_tier: 'team',
    is_admin: false
  },
  {
    email: 'admin_user@projectgenie.com',
    password: 'morzineavoriaz',
    full_name: 'Admin User',
    subscription_tier: 'premium',
    is_admin: true
  }
]

async function createTestAccounts() {
  console.log('🚀 Starting test account creation...\n')

  for (const account of testAccounts) {
    try {
      console.log(`Creating account: ${account.email}`)
      
      // Step 1: Create the auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: account.full_name
        }
      })

      if (authError) {
        if (authError.message?.includes('already been registered')) {
          console.log(`  ⚠️  User already exists, skipping auth creation`)
          
          // Try to get existing user
          const { data: { users } } = await supabase.auth.admin.listUsers()
          const existingUser = users?.find(u => u.email === account.email)
          
          if (existingUser) {
            // Update the profile instead
            const { error: profileError } = await supabase
              .from('profiles')
              .upsert({
                id: existingUser.id,
                email: account.email,
                full_name: account.full_name,
                subscription_tier: account.subscription_tier,
                is_admin: account.is_admin,
                updated_at: new Date().toISOString()
              })
            
            if (profileError) {
              console.log(`  ❌ Error updating profile: ${profileError.message}`)
            } else {
              console.log(`  ✅ Profile updated successfully`)
            }
          }
          continue
        } else {
          throw authError
        }
      }

      console.log(`  ✅ Auth user created: ${authData.user.id}`)

      // Step 2: Create/update the profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          email: account.email,
          full_name: account.full_name,
          subscription_tier: account.subscription_tier,
          is_admin: account.is_admin,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (profileError) {
        console.log(`  ❌ Error creating profile: ${profileError.message}`)
      } else {
        console.log(`  ✅ Profile created with ${account.subscription_tier} tier${account.is_admin ? ' (Admin)' : ''}`)
      }

      console.log('')

    } catch (error) {
      console.error(`❌ Error creating ${account.email}:`, error.message)
      console.log('')
    }
  }

  console.log('✨ Test account creation complete!\n')
  console.log('Test Accounts:')
  console.log('═══════════════════════════════════════════════')
  testAccounts.forEach(account => {
    console.log(`📧 ${account.email.padEnd(30)} | Tier: ${account.subscription_tier.padEnd(8)} | Admin: ${account.is_admin ? 'Yes' : 'No'}`)
  })
  console.log('═══════════════════════════════════════════════')
  console.log('\n🔑 Password for all accounts: morzineavoriaz\n')
}

// Run the script
createTestAccounts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })