#!/usr/bin/env npx tsx
/**
 * Production-ready script to fix ALL incorrect permanentLogger signatures
 *
 * TESTED PATTERN:
 * Wrong: permanentLogger.info('message', { category: 'CATEGORY', ...data })
 * Right: permanentLogger.info('CATEGORY', 'message', { ...data })
 *
 * SAFETY FEATURES:
 * - Dry run by default
 * - Creates backups
 * - Shows preview of changes
 * - Can be rolled back
 */

import * as fs from 'fs'
import * as path from 'path'
import { glob } from 'glob'

// SAFETY: Start in DRY RUN mode
const DRY_RUN = process.argv.includes('--apply') ? false : true
const BACKUP_DIR = '.logger-fix-backups'
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-')

interface FileChange {
  file: string
  originalContent: string
  fixedContent: string
  changeCount: number
  examples: string[]
}

/**
 * Fix logger signatures in content
 * This pattern has been tested on real files
 */
function fixLoggerSignatures(content: string, filePath: string): FileChange | null {
  let changeCount = 0
  const examples: string[] = []
  const lines = content.split('\n')

  // Process line by line for better control
  const fixedLines = lines.map((line, index) => {
    // Skip if doesn't contain permanentLogger
    if (!line.includes('permanentLogger.')) {
      return line
    }

    // Skip if already correct (first param is CAPS_UNDERSCORES)
    if (/permanentLogger\.(info|warn|debug|captureError)\(\s*['"][A-Z_]+['"]/.test(line)) {
      return line
    }

    // Check for our incorrect pattern
    const match = line.match(
      /permanentLogger\.(info|warn|debug|captureError)\(\s*['"]([^'"]+)['"]\s*,\s*\{\s*category:\s*['"]([A-Z_]+)['"]/
    )

    if (match) {
      const [fullMatch, method, message, category] = match
      changeCount++

      // Capture example for reporting (first 3 only)
      if (examples.length < 3) {
        examples.push(`Line ${index + 1}: ${message} → ${category}`)
      }

      // Build the fixed line
      // First, extract everything after the method call
      const afterMethod = line.substring(line.indexOf(`permanentLogger.${method}(`) + `permanentLogger.${method}(`.length)

      // Find the data object content (after category)
      const dataMatch = afterMethod.match(/\{\s*category:\s*['"][A-Z_]+['"]\s*,?\s*(.*?)\}/)

      if (dataMatch) {
        const remainingData = dataMatch[1].trim()

        // Build the replacement
        let fixedCall: string
        if (remainingData) {
          // Has additional data
          fixedCall = `permanentLogger.${method}('${category}', '${message}', { ${remainingData} })`
        } else {
          // No additional data
          fixedCall = `permanentLogger.${method}('${category}', '${message}')`
        }

        // Replace the method call in the line
        return line.replace(/permanentLogger\.(info|warn|debug|captureError)\([^)]+\)/, fixedCall)
      }
    }

    return line
  })

  if (changeCount === 0) {
    return null
  }

  return {
    file: filePath,
    originalContent: content,
    fixedContent: fixedLines.join('\n'),
    changeCount,
    examples
  }
}

/**
 * Create backup of a file
 */
function createBackup(filePath: string, content: string): void {
  const backupPath = path.join(BACKUP_DIR, TIMESTAMP, filePath)
  const backupDir = path.dirname(backupPath)

  // Create backup directory
  fs.mkdirSync(backupDir, { recursive: true })

  // Write backup
  fs.writeFileSync(backupPath, content)
}

/**
 * Main execution
 */
async function main() {
  console.log('🔧 Logger Signature Fix Script')
  console.log('=' .repeat(80))
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN (preview only)' : '⚡ APPLY MODE (will modify files)'}`)
  console.log(`Timestamp: ${TIMESTAMP}`)
  console.log()

  if (!DRY_RUN) {
    console.log(`📁 Backups will be created in: ${BACKUP_DIR}/${TIMESTAMP}/`)
    console.log()
  }

  // Find all TypeScript files
  const files = await glob('**/*.ts', {
    ignore: [
      'node_modules/**',
      'archive/**',
      '.next/**',
      'dist/**',
      'build/**',
      'scripts/fix-*.ts',  // Don't fix our own scripts
      '.logger-fix-backups/**'
    ],
    cwd: process.cwd()
  })

  console.log(`Found ${files.length} TypeScript files to check`)
  console.log()

  const changes: FileChange[] = []
  let filesProcessed = 0
  let totalViolations = 0

  // Process each file
  for (const file of files) {
    filesProcessed++

    // Show progress every 50 files
    if (filesProcessed % 50 === 0) {
      process.stdout.write(`\rProcessing... ${filesProcessed}/${files.length}`)
    }

    const filePath = path.join(process.cwd(), file)
    const content = fs.readFileSync(filePath, 'utf-8')

    // Quick check to skip files without the pattern
    if (!content.includes('category:') || !content.includes('permanentLogger')) {
      continue
    }

    const change = fixLoggerSignatures(content, file)
    if (change) {
      changes.push(change)
      totalViolations += change.changeCount

      if (!DRY_RUN) {
        // Create backup
        createBackup(file, content)

        // Apply fix
        fs.writeFileSync(filePath, change.fixedContent)
      }
    }
  }

  // Clear progress line
  process.stdout.write('\r' + ' '.repeat(50) + '\r')

  // Report results
  console.log('📊 RESULTS')
  console.log('=' .repeat(80))
  console.log(`Files scanned: ${files.length}`)
  console.log(`Files with violations: ${changes.length}`)
  console.log(`Total violations found: ${totalViolations}`)
  console.log()

  if (changes.length > 0) {
    console.log('📝 Files that need fixing:')
    console.log()

    // Group by directory for better readability
    const byDir = new Map<string, FileChange[]>()
    for (const change of changes) {
      const dir = path.dirname(change.file)
      if (!byDir.has(dir)) {
        byDir.set(dir, [])
      }
      byDir.get(dir)!.push(change)
    }

    // Show grouped results
    for (const [dir, dirChanges] of byDir) {
      console.log(`  📁 ${dir}/`)
      for (const change of dirChanges) {
        const filename = path.basename(change.file)
        console.log(`      ${filename} (${change.changeCount} fix${change.changeCount > 1 ? 'es' : ''})`)

        // Show examples for first few files
        if (changes.indexOf(change) < 5) {
          for (const example of change.examples) {
            console.log(`        → ${example}`)
          }
        }
      }
    }
    console.log()

    if (DRY_RUN) {
      console.log('⚠️  This was a DRY RUN - no files were modified')
      console.log()
      console.log('To apply these fixes, run:')
      console.log('  npx tsx scripts/fix-all-logger-signatures.ts --apply')
      console.log()
      console.log('This will:')
      console.log('  1. Create backups of all files')
      console.log('  2. Apply the fixes')
      console.log('  3. Show you how to rollback if needed')
    } else {
      console.log('✅ All fixes have been applied!')
      console.log()
      console.log(`📁 Backups created in: ${BACKUP_DIR}/${TIMESTAMP}/`)
      console.log()
      console.log('To rollback these changes:')
      console.log(`  cp -r ${BACKUP_DIR}/${TIMESTAMP}/* .`)
      console.log()
      console.log('Next steps:')
      console.log('  1. Test the application')
      console.log('  2. Check that logs display correctly')
      console.log('  3. Commit the changes if everything works')
    }
  } else {
    console.log('✅ No violations found - all logger signatures are correct!')
  }

  // Final summary
  console.log()
  console.log('=' .repeat(80))
  console.log('🎯 Script completed successfully')
}

// Run the script
main().catch(error => {
  console.error('❌ Script failed:', error)
  process.exit(1)
})