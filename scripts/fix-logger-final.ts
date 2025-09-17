#!/usr/bin/env npx tsx
/**
 * Final comprehensive fix for all permanentLogger patterns
 */

import fs from 'fs'
import path from 'path'
import { glob } from 'glob'

function fixFileContent(content: string): { fixed: string; changes: number } {
  let fixed = content
  let changes = 0

  // Pattern 1: Fix malformed spread { category: 'X', ...{ data })
  const pattern1 = /permanentLogger\.(info|warn|error|debug|critical)\(([^,]+),\s*\{\s*category:\s*'([^']+)',\s*\.\.\.\{([^}]*)\}\s*\)/gs
  fixed = fixed.replace(pattern1, (match, method, message, category, innerContent) => {
    changes++
    // Clean up inner content
    innerContent = innerContent.replace(/\s*\}\s*\)\s*$/, '').trim()
    return `permanentLogger.${method}(${message}, {
      category: '${category}'${innerContent ? ',\n      ' + innerContent : ''}
    })`
  })

  // Pattern 2: Fix wrong signatures like warn('CATEGORY', 'message', data)
  const pattern2 = /permanentLogger\.(warn|error)\('([^']+)',\s*'([^']+)'/g
  fixed = fixed.replace(pattern2, (match, method, category, message) => {
    changes++
    return `permanentLogger.${method}('${message}', { category: '${category}'`
  })

  // Pattern 3: Fix permanentLogger.log() -> info()
  const pattern3 = /permanentLogger\.log\(/g
  fixed = fixed.replace(pattern3, () => {
    changes++
    return 'permanentLogger.info('
  })

  // Pattern 4: Fix Date.now( })
  const pattern4 = /Date\.now\(\s*\}\)/g
  fixed = fixed.replace(pattern4, () => {
    changes++
    return 'Date.now()'
  })

  // Pattern 5: Fix mismatched braces in array methods
  const pattern5 = /\.(filter|map|slice)\(([^)]+)\s*\}\)/g
  fixed = fixed.replace(pattern5, (match, method, args) => {
    if (args.includes('=>')) {
      changes++
      return `.${method}(${args})`
    }
    return match
  })

  // Pattern 6: Fix Array.from(x })
  const pattern6 = /Array\.from\(([^)]+)\s*\}\)/g
  fixed = fixed.replace(pattern6, (match, arg) => {
    changes++
    return `Array.from(${arg})`
  })

  return { fixed, changes }
}

async function main() {
  const batchSize = parseInt(process.argv[2] || '10')
  console.log(`🔧 Comprehensive logger fix - batch size: ${batchSize}`)

  // Find all TypeScript files
  const files = await glob('**/*.{ts,tsx}', {
    ignore: [
      'node_modules/**',
      '.next/**',
      'dist/**',
      'build/**',
      '*.backup-*',
      'scripts/fix-logger-*.ts'
    ]
  })

  // Filter files that need fixing
  const needsFix: string[] = []
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8')
    if (content.includes('permanentLogger') && (
      content.includes('...{') ||
      content.includes('permanentLogger.log(') ||
      content.match(/permanentLogger\.(warn|error)\('[^']+',\s*'/) ||
      content.includes('Date.now( }') ||
      content.match(/\}\)\.slice\(/)
    )) {
      needsFix.push(file)
    }
  }

  console.log(`📊 Found ${needsFix.length} files that need fixing\n`)

  let totalFixed = 0
  let totalChanges = 0

  // Process in batches
  for (let i = 0; i < needsFix.length; i += batchSize) {
    const batch = needsFix.slice(i, Math.min(i + batchSize, needsFix.length))
    console.log(`📦 Batch ${Math.floor(i / batchSize) + 1}: Processing ${batch.length} files`)

    for (const file of batch) {
      try {
        const original = fs.readFileSync(file, 'utf-8')
        const { fixed, changes } = fixFileContent(original)

        if (changes > 0) {
          // Create backup
          const backupPath = file + '.backup-' + Date.now()
          fs.writeFileSync(backupPath, original, 'utf-8')

          // Write fixed content
          fs.writeFileSync(file, fixed, 'utf-8')

          console.log(`  ✅ ${path.basename(file)}: ${changes} fixes applied`)
          totalFixed++
          totalChanges += changes
        } else {
          console.log(`  ⏭️  ${path.basename(file)}: No changes needed`)
        }
      } catch (error) {
        console.log(`  ❌ ${path.basename(file)}: ${error}`)
      }
    }

    if (i + batchSize < needsFix.length) {
      console.log(`\n   ${needsFix.length - i - batchSize} files remaining...`)
      console.log(`   Press Enter to continue or Ctrl+C to stop`)
      await new Promise(resolve => {
        process.stdin.once('data', resolve)
      })
    }
  }

  console.log('\n✨ Complete!')
  console.log(`   Files fixed: ${totalFixed}`)
  console.log(`   Total changes: ${totalChanges}`)
}

process.stdin.setRawMode?.(true)
process.stdin.resume()
main().catch(console.error)