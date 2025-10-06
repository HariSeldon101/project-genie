/**
 * Delete All Logs Script
 * Uses Supabase Management API directly with PAT token
 * Now uses the RPC function for atomic deletion
 */

async function deleteAllLogs() {
  const PAT_TOKEN = 'sbp_ce8146f94e3403eca0a088896812e9bbbf08929b'
  const PROJECT_REF = 'vnuieavheezjxbkyfxea'
  
  console.log('🗑️  Starting deletion of all logs from database...')
  console.log('📋 Using RPC function: delete_all_permanent_logs()')
  
  try {
    // Use the Management API to call the RPC function
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PAT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: 'SELECT * FROM delete_all_permanent_logs();'
        })
      }
    )
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API Error: ${response.status} - ${error}`)
    }
    
    const result = await response.json()
    
    // Parse the RPC function result
    if (result && result[0] && result[0].delete_all_permanent_logs) {
      const deleteResult = result[0].delete_all_permanent_logs
      
      console.log('✅ Delete operation completed')
      console.log('📊 Results:')
      console.log(`   - Before count: ${deleteResult.before_count}`)
      console.log(`   - Deleted count: ${deleteResult.deleted_count}`)
      console.log(`   - After count: ${deleteResult.after_count}`)
      console.log(`   - Success: ${deleteResult.success}`)
      
      if (deleteResult.success && deleteResult.after_count === 0) {
        console.log('✅ SUCCESS: All logs have been deleted!')
      } else if (deleteResult.success && deleteResult.after_count > 0) {
        console.log(`⚠️  WARNING: ${deleteResult.after_count} logs still remain`)
      } else if (!deleteResult.success) {
        console.log(`❌ ERROR: ${deleteResult.error || 'Unknown error'}`)
      }
    } else {
      console.log('📊 Raw result:', JSON.stringify(result, null, 2))
    }
    
  } catch (error) {
    console.error('❌ Error deleting logs:', error)
    process.exit(1)
  }
}

// Run the deletion
deleteAllLogs()