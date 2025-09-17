#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setupAdmin() {
  console.log('🔧 Setting up admin user...')
  
  const adminEmail = 'stu@bigfluffy.ai'
  const adminPassword = 'aval0n'
  
  try {
    // Check if user already exists
    const { data: existingUser } = await supabase.auth.admin.listUsers()
    const userExists = existingUser?.users?.some(u => u.email === adminEmail)
    
    let userId: string
    
    if (userExists) {
      console.log('✓ Admin user already exists')
      const user = existingUser?.users?.find(u => u.email === adminEmail)
      userId = user!.id
    } else {
      // Create the admin user
      console.log('Creating admin user...')
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: {
          full_name: 'Admin User'
        }
      })
      
      if (createError) {
        console.error('❌ Error creating user:', createError)
        process.exit(1)
      }
      
      userId = newUser.user!.id
      console.log('✓ Admin user created')
    }
    
    // Ensure profile exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (!profile) {
      console.log('Creating profile...')
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: adminEmail,
          full_name: 'Admin User'
        })
      
      if (profileError) {
        console.error('❌ Error creating profile:', profileError)
        process.exit(1)
      }
      console.log('✓ Profile created')
    }
    
    // Set admin flag
    console.log('Setting admin flag...')
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_admin: true })
      .eq('id', userId)
    
    if (updateError) {
      console.error('❌ Error updating admin flag:', updateError)
      process.exit(1)
    }
    
    console.log('✓ Admin flag set')
    
    // Insert default LLM configuration
    console.log('Setting up default configuration...')
    const { error: settingsError } = await supabase
      .from('admin_settings')
      .upsert({
        setting_key: 'llm_config',
        setting_value: {
          provider: 'vercel-ai',
          model: 'gpt-5-nano',
          temperature: 0.7,
          maxTokens: 4000,
          ollama: {
            baseUrl: 'http://localhost:11434',
            enabled: false
          }
        },
        updated_by: userId
      })
    
    if (settingsError) {
      console.error('⚠️ Warning: Could not set default configuration:', settingsError.message)
    } else {
      console.log('✓ Default configuration set')
    }
    
    console.log('\n✅ Admin setup complete!')
    console.log('📧 Email:', adminEmail)
    console.log('🔑 Password:', adminPassword)
    console.log('\nYou can now log in and access the admin menu.')
    
  } catch (error) {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  }
}

setupAdmin()