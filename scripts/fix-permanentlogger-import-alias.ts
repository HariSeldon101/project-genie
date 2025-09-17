#!/usr/bin/env npx tsx

/**
 * Fix script for permanentLogger import aliasing issue
 *
 * Problem: Files import `permanentLogger as logger` but use `permanentLogger` in code
 * Solution: Remove the alias from the import statement
 *
 * This script follows guideline #30: Test on one file first before applying to all
 */

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

// List of files that need fixing
const AFFECTED_FILES = [
  'lib/hooks/use-log-filters.ts',
  'app/(dashboard)/logs/page.tsx',
  'components/logs/log-entry.tsx',
  'components/logs/log-filters.tsx',
  'components/logs/log-controls.tsx',
  'components/logs/log-pagination.tsx',
  'lib/utils/log-operations.ts',
  'lib/company-intelligence/storage/pack-store.ts',
  'lib/company-intelligence/scrapers/utils/sitemap-parser.ts'
]

// Project root directory
const PROJECT_ROOT = '/Users/stuartholmes/Desktop/Udemy & Other Courses/The Complete AI Coding Course - August 2025/project-genie'

// Pattern to match the incorrect import
const INCORRECT_IMPORT_PATTERN = /import\s*{\s*permanentLogger\s+as\s+logger\s*}\s*from\s*['"]@\/lib\/utils\/permanent-logger['"]/g

// Correct import statement
const CORRECT_IMPORT = "import { permanentLogger } from '@/lib/utils/permanent-logger'"

/**
 * Fix the import statement in a single file
 * @param filePath - Relative path to the file
 * @param testMode - If true, only shows what would be changed without modifying
 * @returns true if file was modified, false if no changes needed
 */
function fixFile(filePath: string, testMode: boolean = false): boolean {
  const fullPath = join(PROJECT_ROOT, filePath)

  try {
    // Read the file content
    const content = readFileSync(fullPath, 'utf-8')

    // Check if the file has the incorrect import
    if (INCORRECT_IMPORT_PATTERN.test(content)) {
      // Reset the regex lastIndex
      INCORRECT_IMPORT_PATTERN.lastIndex = 0

      // Replace the incorrect import with the correct one
      const fixedContent = content.replace(INCORRECT_IMPORT_PATTERN, CORRECT_IMPORT)

      if (testMode) {
        console.log(`\n📋 TEST MODE - Would fix: ${filePath}`)
        console.log('  ❌ Old import: import { permanentLogger as logger } from ...')
        console.log('  ✅ New import: import { permanentLogger } from ...')

        // Count how many permanentLogger usages exist
        const usageCount = (content.match(/permanentLogger\./g) || []).length
        console.log(`  📊 Found ${usageCount} usages of permanentLogger. in the file`)
      } else {
        // Write the fixed content back to the file
        writeFileSync(fullPath, fixedContent, 'utf-8')
        console.log(`✅ Fixed: ${filePath}`)
      }

      return true
    } else {
      if (testMode) {
        console.log(`⏭️  Skipped: ${filePath} (import already correct or not found)`)
      }
      return false
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error)
    return false
  }
}

/**
 * Main execution function
 */
function main() {
  console.log('🔧 permanentLogger Import Fix Script')
  console.log('=====================================\n')

  // Get command line arguments
  const args = process.argv.slice(2)
  const testOnly = args.includes('--test')
  const singleFile = args.includes('--single')

  if (testOnly) {
    console.log('🧪 Running in TEST MODE - no files will be modified\n')
  }

  if (singleFile) {
    // Test on the first file only (following guideline #30)
    const testFile = AFFECTED_FILES[0]
    console.log(`📝 Testing fix on single file: ${testFile}\n`)

    const wasFixed = fixFile(testFile, testOnly)

    if (!testOnly && wasFixed) {
      console.log('\n✨ Single file fix completed successfully!')
      console.log('👉 Run "npx tsx scripts/fix-permanentlogger-import-alias.ts --test" to preview all changes')
      console.log('👉 Run "npx tsx scripts/fix-permanentlogger-import-alias.ts" to fix all files')
    }
  } else {
    // Process all files
    console.log(`Processing ${AFFECTED_FILES.length} files...\n`)

    let fixedCount = 0
    let skippedCount = 0

    for (const file of AFFECTED_FILES) {
      const wasFixed = fixFile(file, testOnly)
      if (wasFixed) {
        fixedCount++
      } else {
        skippedCount++
      }
    }

    // Summary
    console.log('\n📊 Summary:')
    console.log(`  ✅ Files ${testOnly ? 'to be fixed' : 'fixed'}: ${fixedCount}`)
    console.log(`  ⏭️  Files skipped: ${skippedCount}`)
    console.log(`  📁 Total files processed: ${AFFECTED_FILES.length}`)

    if (!testOnly && fixedCount > 0) {
      console.log('\n✨ All import statements have been fixed!')
      console.log('👉 Next step: Run "npm run build" to verify TypeScript compilation')
    }
  }
}

// Run the script
main()