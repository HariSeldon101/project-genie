const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})

async function fixProjectIds() {
  console.log('Fixing project IDs for recently generated documents...')
  
  // First, check what documents exist
  const { data: checkData, error: checkError } = await supabase
    .from('artifacts')
    .select('id, project_id, type, created_at')
    .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
  
  if (checkError) {
    console.error('Error checking documents:', checkError)
    return
  }
  
  console.log('Found documents:', checkData)
  
  // Update documents with wrong project ID
  const wrongProjectId = 'a8379e03-c3e7-41a5-85e3-dfadeb1052e2'
  const correctProjectId = '85eaaf02-a4b1-42fb-8791-26e13763f903'
  
  const docsToUpdate = checkData.filter(doc => doc.project_id === wrongProjectId)
  
  if (docsToUpdate.length > 0) {
    console.log(`Updating ${docsToUpdate.length} documents from project ${wrongProjectId} to ${correctProjectId}`)
    
    const { data: updateData, error: updateError } = await supabase
      .from('artifacts')
      .update({ project_id: correctProjectId })
      .eq('project_id', wrongProjectId)
      .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
      .select()
    
    if (updateError) {
      console.error('Error updating documents:', updateError)
      return
    }
    
    console.log('Successfully updated documents:', updateData)
  } else {
    console.log('No documents need updating')
  }
  
  // Verify the fix
  const { data: verifyData, error: verifyError } = await supabase
    .from('artifacts')
    .select('id, project_id, type, created_at')
    .eq('project_id', correctProjectId)
    .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
  
  if (verifyError) {
    console.error('Error verifying:', verifyError)
    return
  }
  
  console.log('Documents after fix:', verifyData)
}

fixProjectIds().catch(console.error)