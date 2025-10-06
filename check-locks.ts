/**
 * Script to check and clear stale execution locks
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function checkLocks() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  console.log('🔍 Checking execution locks...\n')

  // Get all locks
  const { data: locks, error } = await supabase
    .from('execution_locks')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching locks:', error)
    return
  }

  if (!locks || locks.length === 0) {
    console.log('✅ No locks found in database')
    return
  }

  console.log(`Found ${locks.length} total locks:\n`)

  // Check unreleased locks
  const unreleasedLocks = locks.filter(l => !l.released)
  const expiredLocks = unreleasedLocks.filter(l => new Date(l.expires_at) < new Date())

  console.log(`📊 Lock Statistics:`)
  console.log(`  - Total locks: ${locks.length}`)
  console.log(`  - Unreleased locks: ${unreleasedLocks.length}`)
  console.log(`  - Expired unreleased locks: ${expiredLocks.length}\n`)

  if (unreleasedLocks.length > 0) {
    console.log('🔴 UNRELEASED LOCKS:')
    unreleasedLocks.forEach(lock => {
      const expired = new Date(lock.expires_at) < new Date()
      console.log(`  ID: ${lock.id}`)
      console.log(`  Session: ${lock.session_id}`)
      console.log(`  Scraper: ${lock.scraper_id}`)
      console.log(`  Created: ${lock.created_at || lock.acquired_at}`)
      console.log(`  Expires: ${lock.expires_at} ${expired ? '❌ EXPIRED' : '✅ Valid'}`)
      console.log(`  ---`)
    })
  }

  // Ask if should clear expired locks
  if (expiredLocks.length > 0) {
    console.log('\n🗑️  Clearing expired locks...')
    
    const { error: deleteError } = await supabase
      .from('execution_locks')
      .delete()
      .in('id', expiredLocks.map(l => l.id))

    if (deleteError) {
      console.error('Error deleting expired locks:', deleteError)
    } else {
      console.log(`✅ Deleted ${expiredLocks.length} expired locks`)
    }
  }

  // Clear ALL unreleased locks (for testing)
  if (unreleasedLocks.length > 0) {
    console.log('\n🔥 CLEARING ALL UNRELEASED LOCKS FOR TESTING...')
    
    const { error: updateError } = await supabase
      .from('execution_locks')
      .update({ released: true, released_at: new Date().toISOString() })
      .eq('released', false)

    if (updateError) {
      console.error('Error releasing locks:', updateError)
    } else {
      console.log(`✅ Released ${unreleasedLocks.length} locks`)
    }
  }
}

checkLocks().catch(console.error)