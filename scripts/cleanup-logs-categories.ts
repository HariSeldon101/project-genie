/**
 * Cleanup script to remove logs from internal logging categories
 * These are old error logs that shouldn't be in the UI
 */

import { createClient } from '@supabase/supabase-js'

async function cleanupLogsCategories() {
  console.log('🧹 Starting cleanup of internal log categories...')

  try {
    // Use direct Supabase client for script
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Categories to remove - these are internal logging categories
    const categoriesToRemove = [
      'logs-repository',
      'logs-service',
      'logs-api',
      'logs-api-delete',
      'logs-service-clear',
      'logs-repository-clear',
      'logs-repository-rotate'
    ]

    console.log('📝 Removing logs from categories:', categoriesToRemove)

    // Delete logs from these categories
    const { data, error } = await supabase
      .from('permanent_logs')
      .delete()
      .in('category', categoriesToRemove)
      .select()

    if (error) {
      console.error('❌ Error deleting logs:', error)
      throw error
    }

    const deletedCount = data?.length || 0
    console.log(`✅ Successfully deleted ${deletedCount} log entries from internal categories`)

    // Verify cleanup
    const { data: remainingLogs, error: checkError } = await supabase
      .from('permanent_logs')
      .select('category')
      .in('category', categoriesToRemove)

    if (checkError) {
      console.error('❌ Error checking remaining logs:', checkError)
    } else if (remainingLogs && remainingLogs.length > 0) {
      console.warn(`⚠️ Warning: ${remainingLogs.length} logs still remain in internal categories`)
    } else {
      console.log('✨ All internal category logs successfully removed')
    }

  } catch (error) {
    console.error('❌ Cleanup failed:', error)
    process.exit(1)
  }
}

// Run the cleanup
cleanupLogsCategories()