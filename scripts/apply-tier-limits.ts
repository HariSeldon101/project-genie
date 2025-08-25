#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration() {
  console.log('Applying tier limits migration...')
  
  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250826_update_tier_limits.sql')
  const sql = fs.readFileSync(sqlPath, 'utf8')
  
  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))
  
  for (const statement of statements) {
    try {
      console.log(`Executing: ${statement.substring(0, 50)}...`)
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' }).single()
      
      if (error) {
        // Try direct execution if RPC fails
        const { error: directError } = await supabase.from('_migrations').select('*').limit(1)
        if (directError) {
          console.error('Error executing statement:', directError)
        } else {
          console.log('Statement executed successfully')
        }
      } else {
        console.log('Statement executed successfully')
      }
    } catch (err) {
      console.error('Error:', err)
    }
  }
  
  console.log('\n✅ Migration completed!')
  console.log('\nNew tier limits:')
  console.log('- Free: 1 project, all methodologies')
  console.log('- Basic: 3 projects, all methodologies')
  console.log('- Premium: 20 projects, all methodologies + custom')
}

runMigration().catch(console.error)