import { Client } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const PROJECT_REF = 'vnuieavheezjxbkyfxea'

// Database connection using service role
const connectionString = `postgresql://postgres.${PROJECT_REF}:${process.env.SUPABASE_SERVICE_ROLE_KEY}@aws-0-eu-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true`

async function fixDatabase() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  })

  try {
    console.log('Connecting to database...')
    await client.connect()
    console.log('Connected successfully!')

    // 1. First, check current policies
    console.log('\n1. Checking current policies...')
    const policiesResult = await client.query(`
      SELECT policyname, cmd 
      FROM pg_policies 
      WHERE tablename = 'projects' 
      AND schemaname = 'public'
    `)
    
    if (policiesResult.rows.length > 0) {
      console.log(`Found ${policiesResult.rows.length} existing policies:`)
      for (const policy of policiesResult.rows) {
        console.log(`  - ${policy.policyname} (${policy.cmd})`)
        
        // Drop each policy
        console.log(`    Dropping ${policy.policyname}...`)
        await client.query(`DROP POLICY IF EXISTS "${policy.policyname}" ON public.projects`)
      }
    }

    // 2. Add missing columns
    console.log('\n2. Adding missing columns...')
    
    try {
      await client.query(`ALTER TABLE public.projects ADD COLUMN status TEXT DEFAULT 'planning'`)
      console.log('  ✓ Added status column')
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log('  - status column already exists')
      } else throw e
    }

    try {
      await client.query(`ALTER TABLE public.projects ADD COLUMN company_info JSONB`)
      console.log('  ✓ Added company_info column')
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log('  - company_info column already exists')
      } else throw e
    }

    try {
      await client.query(`ALTER TABLE public.projects ADD COLUMN progress INTEGER DEFAULT 0`)
      console.log('  ✓ Added progress column')
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log('  - progress column already exists')
      } else throw e
    }

    // 3. Create new policies
    console.log('\n3. Creating new RLS policies...')

    // Insert policy
    await client.query(`
      CREATE POLICY "enable_insert_for_authenticated_users" ON public.projects
      FOR INSERT 
      TO authenticated
      WITH CHECK (auth.uid() = owner_id)
    `)
    console.log('  ✓ Created INSERT policy')

    // Select policy
    await client.query(`
      CREATE POLICY "enable_select_for_owners" ON public.projects
      FOR SELECT 
      TO authenticated
      USING (auth.uid() = owner_id)
    `)
    console.log('  ✓ Created SELECT policy')

    // Update policy
    await client.query(`
      CREATE POLICY "enable_update_for_owners" ON public.projects
      FOR UPDATE 
      TO authenticated
      USING (auth.uid() = owner_id)
      WITH CHECK (auth.uid() = owner_id)
    `)
    console.log('  ✓ Created UPDATE policy')

    // Delete policy
    await client.query(`
      CREATE POLICY "enable_delete_for_owners" ON public.projects
      FOR DELETE 
      TO authenticated
      USING (auth.uid() = owner_id)
    `)
    console.log('  ✓ Created DELETE policy')

    // 4. Verify the fix
    console.log('\n4. Verifying the fix...')
    const finalPolicies = await client.query(`
      SELECT policyname, cmd, roles
      FROM pg_policies 
      WHERE tablename = 'projects' 
      AND schemaname = 'public'
    `)
    
    console.log(`\n✅ Successfully created ${finalPolicies.rows.length} policies:`)
    for (const policy of finalPolicies.rows) {
      console.log(`  - ${policy.policyname} (${policy.cmd}) for ${policy.roles}`)
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ DATABASE FIXED SUCCESSFULLY!')
    console.log('='.repeat(60))
    console.log('\nYou should now be able to:')
    console.log('1. Go to https://project-genie-one.vercel.app')
    console.log('2. Sign in with Google')
    console.log('3. Create new projects without errors')
    console.log('='.repeat(60))

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await client.end()
  }
}

// Check if pg module is available
async function checkAndInstall() {
  try {
    require('pg')
    await fixDatabase()
  } catch {
    console.log('Installing pg module...')
    const { execSync } = require('child_process')
    execSync('npm install pg', { stdio: 'inherit' })
    await fixDatabase()
  }
}

checkAndInstall()