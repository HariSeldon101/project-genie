#!/usr/bin/env tsx

/**
 * Script to automatically fix incorrect permanentLogger usage patterns
 * Fixes the common pattern: permanentLogger.info('message', { category: 'CATEGORY', ...data })
 * To the correct pattern: permanentLogger.info('CATEGORY', 'message', { ...data })
 */

import { promises as fs } from 'fs'
import { glob } from 'glob'
import * as path from 'path'

interface Fix {
  file: string
  original: string
  fixed: string
  line: number
}

async function fixLoggerPatterns(): Promise<Fix[]> {
  const fixes: Fix[] = []

  // Find all TypeScript files to fix
  const files = await glob('**/*.{ts,tsx}', {
    ignore: [
      'node_modules/**',
      '.next/**',
      'scripts/validate-logger-usage.ts',
      'scripts/fix-logger-pattern-issues.ts',
      'archive/**',
      '*.test.ts',
      '*.spec.ts'
    ],
    cwd: process.cwd()
  })

  console.log(`📝 Processing ${files.length} files...`)

  for (const file of files) {
    let content = await fs.readFile(file, 'utf-8')
    let hasChanges = false
    const lines = content.split('\n')
    const newLines: string[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1
      let fixedLine = line

      // Pattern 1: Fix message before category (with category in data object)
      // permanentLogger.info('message', { category: 'CATEGORY', ...data })
      const pattern1 = /permanentLogger\.(info|warn|debug)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*\{\s*category:\s*['"`]([^'"`]+)['"`](.*?)\}\s*\)/g

      fixedLine = fixedLine.replace(pattern1, (match, method, message, category, restOfData) => {
        // Clean up restOfData - remove leading comma if present
        const cleanData = restOfData.trim().startsWith(',') ? restOfData.trim().substring(1).trim() : restOfData.trim()

        if (cleanData) {
          // If there's additional data, include it
          return `permanentLogger.${method}('${category}', '${message}', { ${cleanData} })`
        } else {
          // No additional data
          return `permanentLogger.${method}('${category}', '${message}')`
        }
      })

      // Pattern 2: Fix lowercase/mixed case categories to uppercase
      // Only for categories that are clearly not uppercase
      const pattern2 = /permanentLogger\.(info|warn|debug)\s*\(\s*['"`]([a-z][a-z0-9\-_]*?)['"`]\s*,/g

      fixedLine = fixedLine.replace(pattern2, (match, method, category) => {
        // Convert to uppercase with underscores
        const upperCategory = category.toUpperCase().replace(/-/g, '_')
        return `permanentLogger.${method}('${upperCategory}',`
      })

      // Pattern 3: Fix permanentLogger.error() calls
      // permanentLogger.error(...) -> permanentLogger.captureError(...)
      if (fixedLine.includes('permanentLogger.error(') && !fixedLine.includes('permanentLogger.error() does not exist')) {
        // This is an actual usage, not a comment about it
        fixedLine = fixedLine.replace(/permanentLogger\.error\(/g, 'permanentLogger.captureError(')
      }

      if (fixedLine !== line) {
        hasChanges = true
        fixes.push({
          file,
          original: line.trim(),
          fixed: fixedLine.trim(),
          line: lineNumber
        })
      }

      newLines.push(fixedLine)
    }

    if (hasChanges) {
      await fs.writeFile(file, newLines.join('\n'), 'utf-8')
    }
  }

  return fixes
}

// Run the fix
async function main() {
  console.log('🔧 Fixing permanentLogger usage patterns...\n')

  const fixes = await fixLoggerPatterns()

  if (fixes.length === 0) {
    console.log('✅ No issues found - all logger usage is correct!')
  } else {
    console.log(`✅ Fixed ${fixes.length} logger usage issues:\n`)

    // Group fixes by file
    const fixesByFile = new Map<string, Fix[]>()
    fixes.forEach(fix => {
      if (!fixesByFile.has(fix.file)) {
        fixesByFile.set(fix.file, [])
      }
      fixesByFile.get(fix.file)!.push(fix)
    })

    // Display fixes by file
    let fileCount = 0
    fixesByFile.forEach((fileFixes, file) => {
      fileCount++
      console.log(`${fileCount}. ${file} (${fileFixes.length} fixes)`)

      // Show first 2 fixes as examples
      fileFixes.slice(0, 2).forEach(fix => {
        console.log(`   Line ${fix.line}:`)
        console.log(`   - Before: ${fix.original}`)
        console.log(`   + After:  ${fix.fixed}`)
      })

      if (fileFixes.length > 2) {
        console.log(`   ... and ${fileFixes.length - 2} more fixes`)
      }
      console.log()
    })

    console.log('📝 Summary:')
    console.log(`   - Files modified: ${fixesByFile.size}`)
    console.log(`   - Total fixes: ${fixes.length}`)
    console.log('\n✅ All logger patterns have been fixed!')
    console.log('Run "npm run dev" to test the changes.')
  }
}

main().catch(console.error)