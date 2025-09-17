#!/usr/bin/env tsx
/**
 * Script to clean up maintenance-related log categories from the database
 * These categories were created by internal logging that shouldn't be persisted
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function cleanupMaintenanceLogs() {
  console.log('🧹 Cleaning up maintenance log categories...')

  const maintenanceCategories = [
    'logs-api-delete',
    'logs-service-clear',
    'logs-service-rotate',
    'logs-repository-clear',
    'logs-repository-clear-failed',
    'logs-repository-rotate'
  ]

  try {
    // Delete logs with maintenance categories
    const { data, error, count } = await supabase
      .from('permanent_logs')
      .delete()
      .in('category', maintenanceCategories)
      .select('id')

    if (error) {
      console.error('❌ Error deleting logs:', error)
      return
    }

    const deletedCount = data?.length || 0
    console.log(`✅ Successfully deleted ${deletedCount} maintenance logs`)

    // Verify categories are gone
    const { data: remaining, error: checkError } = await supabase
      .from('permanent_logs')
      .select('category')
      .in('category', maintenanceCategories)
      .limit(1)

    if (checkError) {
      console.error('❌ Error checking remaining logs:', checkError)
      return
    }

    if (remaining && remaining.length > 0) {
      console.warn('⚠️ Some maintenance logs may still remain')
    } else {
      console.log('✅ All maintenance log categories have been cleaned up')
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the cleanup
cleanupMaintenanceLogs()
  .then(() => {
    console.log('🎉 Cleanup complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Cleanup failed:', error)
    process.exit(1)
  })