#!/usr/bin/env tsx
/**
 * Clean migration script for permanent logger refactor
 * Tests on ONE file first as required!
 *
 * Usage:
 *   1. Test single file: npx tsx scripts/fix-logger-migration.ts --test
 *   2. Apply to all: npx tsx scripts/fix-logger-migration.ts --all
 */

import fs from 'fs/promises'
import path from 'path'

// Test file for safety
const TEST_FILE = 'app/api/test-log/route.ts'

interface MigrationResult {
  file: string
  original: string
  modified: string
  changeCount: number
}

/**
 * Apply all migrations to a line of code
 */
function migrateLine(line: string, fileName: string): { line: string; changed: boolean } {
  let modified = line
  let changed = false

  // Fix 1: Replace permanentLogger.captureError() with captureError()
  if (line.includes('permanentLogger.captureError(') || line.includes('logger.error(')) {
    // Simple replacement for basic patterns
    const errorPattern = /(permanent)?[Ll]ogger\.error\s*\(\s*['"`]([^'"`]+)['"`]\s*, new Error(new Error(\s*['"`]([^'"`]+))['"`](.*?)\)/g
    modified = modified.replace(errorPattern), (match, prefix, category, message, rest) => {
      changed = true
      return `permanentLogger.captureError('${category}', new Error('${message}')${rest})`
    })

    // Handle error object patterns
    const errorObjPattern = /(permanent)?[Ll]ogger\.error\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(error|e|err)(.*?)\)/g
    modified = modified.replace(errorObjPattern, (match, prefix, category, errorVar, rest) => {
      changed = true
      return `permanentLogger.captureError('${category}', ${errorVar}${rest})`
    })
  }

  // Fix 2: Add missing categories (detect and add based on context)
  const methods = ['info', 'warn', 'debug']
  for (const method of methods) {
    const singleParamPattern = new RegExp(`(permanentLogger|logger)\\.${method}\\s*\\(\\s*(['"\`])([^'"\`]*?)\\2\\s*\\)`, 'g')
    if (singleParamPattern.test(modified)) {
      // Determine category from file path
      let category = 'GENERAL'
      if (fileName.includes('/api/')) category = 'API'
      else if (fileName.includes('company-intelligence')) category = 'INTELLIGENCE'
      else if (fileName.includes('components/')) category = 'UI'
      else if (fileName.includes('scrapers/')) category = 'SCRAPER'

      modified = modified.replace(singleParamPattern, (match, logger, quote, message) => {
        changed = true
        return `${logger}.${method}('${category}', ${quote}${message}${quote})`
      })
    }
  }

  // Fix 3: Replace 'critical' with 'fatal'
  if (line.includes('critical')) {
    const criticalPatterns = [
      { from: /'critical'/g, to: "'fatal'" },
      { from: /"critical"/g, to: '"fatal"' },
      { from: /`critical`/g, to: '`fatal`' },
      { from: /\.critical\(/g, to: '.fatal(' }
    ]

    criticalPatterns.forEach(pattern => {
      if (pattern.from.test(modified)) {
        modified = modified.replace(pattern.from, pattern.to)
        changed = true
      }
    })
  }

  // Fix 4: Update timing patterns
  if (line.includes('const stop = permanentLogger.timing(')) {
    modified = modified.replace('const stop =', 'const timing =')
    changed = true
  }
  if (line.match(/^\s*stop\(\)/)) {
    modified = modified.replace(/stop\(\)/, 'timing.stop()')
    changed = true
  }

  return { line: modified, changed }
}

/**
 * Migrate a single file
 */
async function migrateFile(filePath: string): Promise<MigrationResult> {
  const content = await fs.readFile(filePath, 'utf-8')
  const lines = content.split('\n')
  const modifiedLines: string[] = []
  let changeCount = 0

  for (const line of lines) {
    const result = migrateLine(line, filePath)
    modifiedLines.push(result.line)
    if (result.changed) {
      changeCount++
      console.log(`  Line changed in ${path.basename(filePath)}:`)
      console.log(`    FROM: ${line.trim()}`)
      console.log(`    TO:   ${result.line.trim()}`)
    }
  }

  return {
    file: filePath,
    original: content,
    modified: modifiedLines.join('\n'),
    changeCount
  }
}

async function main() {
  const args = process.argv.slice(2)
  const testMode = args.includes('--test')
  const allMode = args.includes('--all')

  console.log('🔧 Permanent Logger Migration Tool\n')
  console.log('This will fix:')
  console.log('  1. error() → captureError() conversion')
  console.log('  2. Missing category parameters')
  console.log('  3. "critical" → "fatal" level')
  console.log('  4. Timing pattern updates\n')

  if (!testMode && !allMode) {
    console.log('Usage:')
    console.log('  Test mode: npx tsx scripts/fix-logger-migration.ts --test')
    console.log('  Apply all: npx tsx scripts/fix-logger-migration.ts --all')
    console.log('\n⚠️  ALWAYS run --test first!')
    process.exit(0)
  }

  if (testMode) {
    console.log(`📝 TEST MODE: Processing ${TEST_FILE}\n`)

    try {
      const result = await migrateFile(TEST_FILE)

      if (result.changeCount > 0) {
        console.log(`\n✅ Found ${result.changeCount} changes to make`)
        console.log('\nPreview of changes:')
        console.log('─'.repeat(50))

        // Show diff preview (first 20 lines)
        const originalLines = result.original.split('\n')
        const modifiedLines = result.modified.split('\n')

        for (let i = 0; i < Math.min(20, originalLines.length); i++) {
          if (originalLines[i] !== modifiedLines[i]) {
            console.log(`Line ${i + 1}:`)
            console.log(`  - ${originalLines[i]}`)
            console.log(`  + ${modifiedLines[i]}`)
          }
        }

        // Actually apply the change to test file
        console.log('\nApplying changes to test file...')
        await fs.writeFile(TEST_FILE, result.modified, 'utf-8')
        console.log('✅ Test file updated successfully!')
        console.log('\n📋 Next steps:')
        console.log('  1. Review the changes in the test file')
        console.log('  2. Test that the file still works')
        console.log('  3. If good, run with --all flag')
      } else {
        console.log('✅ No changes needed in test file')
      }
    } catch (error) {
      console.error('❌ Error processing test file:', error)
      process.exit(1)
    }
  }

  if (allMode) {
    console.log('🚀 Applying migrations to ALL files with breaking changes...\n')

    try {
      // Read the breaking changes report
      const reportContent = await fs.readFile('permanent-logger-breaking-changes.json', 'utf-8')
      const report = JSON.parse(reportContent)
      const filesToMigrate = [...new Set(report.map((item: any) => item.file))]

      console.log(`Found ${filesToMigrate.length} files to migrate\n`)

      let totalChanges = 0
      let filesChanged = 0

      for (const file of filesToMigrate) {
        process.stdout.write(`Processing ${file}...`)

        try {
          const result = await migrateFile(file)

          if (result.changeCount > 0) {
            await fs.writeFile(file, result.modified, 'utf-8')
            console.log(` ✅ ${result.changeCount} changes applied`)
            totalChanges += result.changeCount
            filesChanged++
          } else {
            console.log(' ✓ No changes needed')
          }
        } catch (error) {
          console.log(` ❌ Error: ${error}`)
        }
      }

      console.log('\n=== MIGRATION COMPLETE ===')
      console.log(`📊 Summary:`)
      console.log(`  Files processed: ${filesToMigrate.length}`)
      console.log(`  Files changed: ${filesChanged}`)
      console.log(`  Total changes: ${totalChanges}`)
      console.log('\n✅ Migration successful!')
      console.log('\n⚠️  Important: Run tests to verify everything works!')
    } catch (error) {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    }
  }
}

main().catch(console.error)