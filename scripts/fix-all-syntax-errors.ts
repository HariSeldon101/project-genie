#!/usr/bin/env npx tsx
/**
 * Comprehensive script to fix all syntax errors from malformed logger calls
 */

import fs from 'fs'
import path from 'path'
import { glob } from 'glob'

// Files with known issues
const filesToFix = [
  'components/company-intelligence/hooks/use-stage-navigation.ts',
  'lib/notifications/event-bus.ts',
  'lib/notifications/migration-hooks.tsx',
  'lib/company-intelligence/**/*.ts',
  'lib/company-intelligence/**/*.tsx',
  'components/company-intelligence/**/*.ts',
  'components/company-intelligence/**/*.tsx'
]

interface FixResult {
  file: string
  fixed: boolean
  changes: number
  error?: string
}

function fixFile(filePath: string): FixResult {
  console.log(`🔍 Processing: ${filePath}`)

  try {
    let content = fs.readFileSync(filePath, 'utf-8')
    const originalContent = content
    let changes = 0

    // Fix 1: malformed spread syntax { category: 'X', ...{ => { category: 'X',
    content = content.replace(/(\{[^}]*category:\s*'[^']*',)\s*\.\.\.\{/g, (match, prefix) => {
      changes++
      console.log(`  ✅ Fixed malformed spread syntax`)
      return prefix
    })

    // Fix 2: Double closing braces }}) => })
    content = content.replace(/\}\s*\}\s*\)/g, (match) => {
      // Check if this is part of a valid nested structure
      const beforeMatch = content.substring(0, content.indexOf(match))
      const openBraces = (beforeMatch.match(/\{/g) || []).length
      const closeBraces = (beforeMatch.match(/\}/g) || []).length

      if (openBraces < closeBraces + 2) {
        changes++
        console.log(`  ✅ Fixed double closing braces`)
        return '})'
      }
      return match
    })

    // Fix 3: Missing closing parenthesis in logger calls
    // Pattern: permanentLogger.method('message', { ... )
    // Should be: permanentLogger.method('message', { ... })
    content = content.replace(
      /(permanentLogger\.\w+\([^)]*\{[^}]*)\s+\)\s*$/gm,
      (match, prefix) => {
        changes++
        console.log(`  ✅ Fixed missing closing brace in logger call`)
        return prefix + '})'
      }
    )

    // Fix 4: Missing closing bracket in persistentToast calls
    content = content.replace(
      /(persistentToast\.\w+\([^)]*\{[^}]*)\s+\)\s*$/gm,
      (match, prefix) => {
        changes++
        console.log(`  ✅ Fixed missing closing brace in toast call`)
        return prefix + '})'
      }
    )

    // Fix 5: Fix incorrect TypeScript generic syntax
    // From: const func = useCallback(<T = any>(
    // To: const func = useCallback<(args) => ReturnType>((
    content = content.replace(
      /useCallback\(<([^>]+)>\(/g,
      'useCallback<$1>(('
    )

    // Fix 6: Fix captureError calls with malformed spread
    content = content.replace(
      /permanentLogger\.captureError\(([^,]+),\s*([^,]+),\s*\{([^}]*)\.\.\.\{([^}]*)\}\s*\}\s*\)/g,
      (match, context, error, before, after) => {
        changes++
        console.log(`  ✅ Fixed captureError with malformed spread`)
        const cleanBefore = before.trim()
        const cleanAfter = after.trim()
        const separator = cleanBefore && cleanAfter ? ', ' : ''
        return `permanentLogger.captureError(${context}, ${error}, { ${cleanBefore}${separator}${cleanAfter} })`
      }
    )

    // Fix 7: Fix logger calls where closing paren comes before closing brace
    // Pattern: data ) instead of data })
    content = content.replace(
      /(permanentLogger\.\w+\([^)]*\{[^}]*)\s+\)\s*\n/gm,
      (match, prefix) => {
        if (!prefix.includes('}')) {
          changes++
          console.log(`  ✅ Fixed misplaced closing parenthesis`)
          return prefix + '})\n'
        }
        return match
      }
    )

    const fixed = content !== originalContent

    if (fixed) {
      // Create backup
      const backupPath = filePath + '.backup-' + Date.now()
      fs.writeFileSync(backupPath, originalContent, 'utf-8')
      console.log(`  📦 Backup created: ${path.basename(backupPath)}`)

      // Write fixed content
      fs.writeFileSync(filePath, content, 'utf-8')
      console.log(`  ✅ Fixed ${changes} issues`)
    } else {
      console.log(`  ✨ No issues found`)
    }

    return { file: filePath, fixed, changes }
  } catch (error) {
    console.error(`  ❌ Error processing file: ${error}`)
    return {
      file: filePath,
      fixed: false,
      changes: 0,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

async function main() {
  console.log('🔧 Starting comprehensive syntax fix...\n')

  const results: FixResult[] = []
  const allFiles = new Set<string>()

  // Expand glob patterns
  for (const pattern of filesToFix) {
    const files = await glob(pattern, {
      ignore: ['**/node_modules/**', '**/*.backup-*'],
      absolute: true
    })
    files.forEach(f => allFiles.add(f))
  }

  console.log(`Found ${allFiles.size} files to check\n`)

  // Process all files
  for (const file of allFiles) {
    const result = fixFile(file)
    results.push(result)
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 SUMMARY')
  console.log('='.repeat(60))

  const fixedFiles = results.filter(r => r.fixed)
  const totalChanges = results.reduce((sum, r) => sum + r.changes, 0)
  const errorFiles = results.filter(r => r.error)

  console.log(`✅ Files fixed: ${fixedFiles.length}`)
  console.log(`📝 Total changes: ${totalChanges}`)
  console.log(`❌ Errors: ${errorFiles.length}`)

  if (fixedFiles.length > 0) {
    console.log('\n📝 Fixed files:')
    fixedFiles.forEach(r => {
      console.log(`  - ${path.relative(process.cwd(), r.file)} (${r.changes} changes)`)
    })
  }

  if (errorFiles.length > 0) {
    console.log('\n❌ Files with errors:')
    errorFiles.forEach(r => {
      console.log(`  - ${path.relative(process.cwd(), r.file)}: ${r.error}`)
    })
  }

  console.log('\n✅ Syntax fix complete!')
  console.log('💡 Now run your build/dev command to verify all errors are resolved.')
}

main().catch(console.error)