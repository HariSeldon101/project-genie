#!/usr/bin/env npx tsx
/**
 * Comprehensive script to fix all permanentLogger call patterns
 * Based on manual analysis of multiple files
 */

import fs from 'fs'
import path from 'path'
import { glob } from 'glob'

interface FixResult {
  file: string
  fixed: boolean
  changes: number
  error?: string
}

function fixFile(filePath: string): FixResult {
  try {
    let content = fs.readFileSync(filePath, 'utf-8')
    const originalContent = content
    let changes = 0

    // Pattern 1: Fix malformed spread syntax { category: 'X', ...{ data })
    // This matches permanentLogger.method('message', { category: 'CAT', ...{
    content = content.replace(
      /permanentLogger\.(info|warn|error|debug|critical)\(([^,]+),\s*\{\s*category:\s*'([^']+)',\s*\.\.\.\{([^}]*)\}\s*\)/gs,
      (match, method, message, category, innerContent) => {
        changes++
        // Clean up the inner content - remove any trailing })
        innerContent = innerContent.replace(/\s*\}\s*\)\s*$/, '')

        // Build the fixed version
        return `permanentLogger.${method}(${message}, {
      category: '${category}'${innerContent ? ',\n      ' + innerContent.trim() : ''}
    })`
      }
    )

    // Pattern 2: Fix wrong method signatures (category, message, data) -> (message, { category, ...data })
    content = content.replace(
      /permanentLogger\.(warn|error)\('([^']+)',\s*'([^']+)',\s*\{/g,
      (match, method, category, message) => {
        changes++
        return `permanentLogger.${method}('${message}', {
          category: '${category}',`
      }
    )

    // Pattern 3: Fix permanentLogger.log() calls (doesn't exist) -> info()
    content = content.replace(
      /permanentLogger\.log\('([^']+)',\s*`([^`]+)`\)/g,
      (match, category, message) => {
        changes++
        return `permanentLogger.info(\`${message}\`, { category: '${category}' })`
      }
    )

    // Pattern 4: Fix permanentLogger.log() with data
    content = content.replace(
      /permanentLogger\.log\('([^']+)',\s*`([^`]+)`,\s*\{/g,
      (match, category, message) => {
        changes++
        return `permanentLogger.info(\`${message}\`, {
      category: '${category}',`
      }
    )

    // Pattern 5: Fix Date.now( }) syntax errors
    content = content.replace(/Date\.now\(\s*\}\)/g, () => {
      changes++
      return 'Date.now()'
    })

    // Pattern 6: Fix mismatched closing braces in filter/map chains
    content = content.replace(/\.filter\(([^)]+)\s*\}\)/g, (match, condition) => {
      if (condition.includes('=>')) {
        changes++
        return `.filter(${condition})`
      }
      return match
    })

    content = content.replace(/\.map\(([^)]+)\s*\}\)/g, (match, mapper) => {
      if (mapper.includes('=>')) {
        changes++
        return `.map(${mapper})`
      }
      return match
    })

    // Pattern 7: Fix Array.from(x }) patterns
    content = content.replace(/Array\.from\(([^)]+)\s*\}\)/g, (match, arg) => {
      changes++
      return `Array.from(${arg})`
    })

    const fixed = content !== originalContent

    return {
      file: filePath,
      fixed,
      changes
    }
  } catch (error) {
    return {
      file: filePath,
      fixed: false,
      changes: 0,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

async function main() {
  const batchSize = parseInt(process.argv[2] || '10')
  console.log(`🔧 Fixing logger calls in batches of ${batchSize}`)

  // Find all files with issues
  const files = await glob('**/*.{ts,tsx}', {
    ignore: [
      'node_modules/**',
      '.next/**',
      'dist/**',
      'build/**',
      'scripts/fix-logger-comprehensive.ts'
    ]
  })

  // Filter to files that actually have the patterns
  const filesToFix: string[] = []
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8')
    if (
      content.includes('permanentLogger') && (
        content.includes('...{') ||
        content.match(/permanentLogger\.(warn|error)\('[^']+',\s*'[^']+',/) ||
        content.includes('permanentLogger.log(') ||
        content.includes('Date.now( }')
      )
    ) {
      filesToFix.push(file)
    }
  }

  console.log(`📊 Found ${filesToFix.length} files to fix`)

  // Process in batches
  const results: FixResult[] = []
  for (let i = 0; i < filesToFix.length; i += batchSize) {
    const batch = filesToFix.slice(i, Math.min(i + batchSize, filesToFix.length))
    console.log(`\n📦 Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} files)`)

    for (const file of batch) {
      const result = fixFile(file)
      results.push(result)

      if (result.error) {
        console.log(`  ❌ Error: ${path.basename(file)} - ${result.error}`)
      } else if (result.fixed) {
        console.log(`  ✅ Fixed: ${path.basename(file)} (${result.changes} changes)`)

        // Create backup of original
        const originalContent = fs.readFileSync(file, 'utf-8')
        const backupPath = file + '.backup-' + Date.now()
        fs.writeFileSync(backupPath, originalContent, 'utf-8')

        // Apply the fixes
        let fixedContent = originalContent
        const fixResult = fixFile(file)
        if (fixResult.fixed) {
          // Re-read the file and apply all patterns
          fixedContent = fs.readFileSync(file, 'utf-8')

          // Apply all the fix patterns (duplicate the logic from fixFile)
          // Pattern 1: Fix malformed spread syntax
          fixedContent = fixedContent.replace(
            /permanentLogger\.(info|warn|error|debug|critical)\(([^,]+),\s*\{\s*category:\s*'([^']+)',\s*\.\.\.\{([^}]*)\}\s*\)/gs,
            (match, method, message, category, innerContent) => {
              innerContent = innerContent.replace(/\s*\}\s*\)\s*$/, '')
              return `permanentLogger.${method}(${message}, {\n      category: '${category}'${innerContent ? ',\n      ' + innerContent.trim() : ''}\n    })`
            }
          )

          // Write the fixed content
          fs.writeFileSync(file, fixedContent, 'utf-8')
        }
      } else {
        console.log(`  ⏭️  Skipped: ${path.basename(file)} (no issues)`)
      }
    }

    // Ask for confirmation after each batch
    if (i + batchSize < filesToFix.length) {
      console.log(`\n⏸️  Batch complete. ${filesToFix.length - i - batchSize} files remaining.`)
      console.log('   Review the changes and press Enter to continue, or Ctrl+C to stop...')
      await new Promise(resolve => {
        process.stdin.once('data', resolve)
      })
    }
  }

  // Summary
  const fixed = results.filter(r => r.fixed).length
  const errors = results.filter(r => r.error).length
  const totalChanges = results.reduce((sum, r) => sum + r.changes, 0)

  console.log('\n📊 Summary:')
  console.log(`   Files processed: ${results.length}`)
  console.log(`   Files fixed: ${fixed}`)
  console.log(`   Files with errors: ${errors}`)
  console.log(`   Total changes: ${totalChanges}`)
}

// Enable stdin for user input
process.stdin.setRawMode?.(true)
process.stdin.resume()

main().catch(console.error)