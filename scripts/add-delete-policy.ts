/**
 * Add DELETE Policy for permanent_logs table
 * Uses Supabase Management API with PAT token
 * This fixes the issue where logs cannot be deleted due to missing RLS policy
 */

async function addDeletePolicy() {
  const PAT_TOKEN = 'sbp_ce8146f94e3403eca0a088896812e9bbbf08929b'
  const PROJECT_REF = 'vnuieavheezjxbkyfxea'
  
  console.log('🔐 Adding DELETE policy for permanent_logs table...')
  
  try {
    // Use the Management API to add DELETE policy
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PAT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `
            -- Add DELETE policy for permanent_logs table
            -- This allows users to delete their own logs or admins to delete any logs
            
            -- First, drop existing DELETE policies if they exist
            DROP POLICY IF EXISTS "Users can delete their own logs" ON permanent_logs;
            DROP POLICY IF EXISTS "Admins can delete all logs" ON permanent_logs;
            
            -- Policy 1: Users can delete their own logs or logs without user_id
            CREATE POLICY "Users can delete their own logs" 
            ON permanent_logs 
            FOR DELETE 
            TO authenticated 
            USING (
              (user_id = auth.uid()) OR (user_id IS NULL)
            );
            
            -- Policy 2: Admins can delete all logs
            CREATE POLICY "Admins can delete all logs" 
            ON permanent_logs 
            FOR DELETE 
            TO authenticated 
            USING (
              EXISTS (
                SELECT 1
                FROM profiles
                WHERE profiles.id = auth.uid() 
                AND profiles.is_admin = true
              )
            );
            
            -- Return confirmation
            SELECT 
              'Policies created' as status,
              COUNT(*) as policy_count 
            FROM pg_policies 
            WHERE tablename = 'permanent_logs' 
            AND cmd = 'DELETE';
          `
        })
      }
    )
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API Error: ${response.status} - ${error}`)
    }
    
    const result = await response.json()
    console.log('✅ DELETE policies added successfully')
    console.log('📊 Result:', JSON.stringify(result, null, 2))
    
    // Verify the policies were created
    const verifyResponse = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PAT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `
            SELECT 
              policyname,
              cmd,
              qual
            FROM pg_policies 
            WHERE tablename = 'permanent_logs'
            ORDER BY cmd, policyname;
          `
        })
      }
    )
    
    if (verifyResponse.ok) {
      const policies = await verifyResponse.json()
      console.log('\n📋 Current policies on permanent_logs:')
      console.log(JSON.stringify(policies, null, 2))
    }
    
    console.log('\n✅ SUCCESS: DELETE policies have been added!')
    console.log('🎯 The "Delete All Logs" button should now work properly.')
    
  } catch (error) {
    console.error('❌ Error adding DELETE policy:', error)
    process.exit(1)
  }
}

// Run the script
addDeletePolicy()