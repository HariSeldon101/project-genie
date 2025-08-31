/**
 * Script to clear all cached PDFs from Supabase Storage
 * Run this to force regeneration of all PDFs with latest formatting
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

async function clearPDFCache() {
  console.log('🧹 Starting PDF cache cleanup...')
  
  // Create Supabase client with service role key
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })

  try {
    // List all files in the pdfs bucket
    const { data: files, error: listError } = await supabase.storage
      .from('pdfs')
      .list('', {
        limit: 1000,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    if (listError) {
      console.error('❌ Error listing files:', listError)
      return
    }

    if (!files || files.length === 0) {
      console.log('✅ No cached PDFs found')
      return
    }

    console.log(`📋 Found ${files.length} cached PDF(s)`)

    // Delete all files
    const filePaths = files.map(file => file.name)
    
    // Supabase requires full paths for deletion
    // We need to recursively list subdirectories
    const allFiles: string[] = []
    
    async function listRecursive(prefix: string) {
      const { data, error } = await supabase.storage
        .from('pdfs')
        .list(prefix)
      
      if (error) {
        console.error(`❌ Error listing ${prefix}:`, error)
        return
      }
      
      if (data) {
        for (const item of data) {
          const fullPath = prefix ? `${prefix}/${item.name}` : item.name
          
          // Check if it's a directory (has no file extension)
          if (!item.name.includes('.')) {
            // Recursively list subdirectory
            await listRecursive(fullPath)
          } else {
            // It's a file, add to list
            allFiles.push(fullPath)
          }
        }
      }
    }
    
    // Start recursive listing from root
    await listRecursive('')
    
    if (allFiles.length === 0) {
      console.log('✅ No files to delete')
      return
    }
    
    console.log(`🗑️  Deleting ${allFiles.length} file(s)...`)
    
    // Delete files in batches of 100
    const batchSize = 100
    for (let i = 0; i < allFiles.length; i += batchSize) {
      const batch = allFiles.slice(i, i + batchSize)
      const { error: deleteError } = await supabase.storage
        .from('pdfs')
        .remove(batch)
      
      if (deleteError) {
        console.error(`❌ Error deleting batch ${i / batchSize + 1}:`, deleteError)
      } else {
        console.log(`✅ Deleted batch ${i / batchSize + 1} (${batch.length} files)`)
      }
    }

    console.log('✅ PDF cache cleared successfully!')
    console.log('📝 All PDFs will be regenerated with the latest formatting on next access')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

// Run the cleanup
clearPDFCache()
  .then(() => {
    console.log('🎉 Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })