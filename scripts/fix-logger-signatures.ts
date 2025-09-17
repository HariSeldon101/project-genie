#!/usr/bin/env npx tsx
/**
 * Fix incorrect permanentLogger signatures
 *
 * PROBLEM:
 * Wrong: permanentLogger.info('message', { category: 'CATEGORY', ...data })
 * Right: permanentLogger.info('CATEGORY', 'message', { ...data })
 *
 * This script ONLY fixes instances where:
 * 1. The first parameter is a string message (not a CAPS_CATEGORY)
 * 2. The second parameter has { category: 'SOME_CATEGORY' }
 * 3. It's a permanentLogger call (not other loggers)
 */

import * as fs from 'fs'
import * as path from 'path'
import { glob } from 'glob'

const DRY_RUN = true // SAFETY: Always start with dry run!
const VERBOSE = true // Show all matches for verification

interface Match {
  file: string
  line: number
  original: string
  fixed: string
}

// Pattern to match EXACTLY the wrong signature
// This is VERY specific to avoid false positives
const WRONG_PATTERN = /permanentLogger\.(info|warn|debug|captureError)\(\s*['"]([^'"]+)['"]\s*,\s*\{\s*category:\s*['"]([A-Z_]+)['"]\s*,?([^}]*)\}/g

function fixLoggerSignature(content: string, filePath: string): { content: string; matches: Match[] } {
  const matches: Match[] = []
  const lines = content.split('\n')
  let modified = false

  const fixedLines = lines.map((line, index) => {
    // Skip if line doesn't contain permanentLogger
    if (!line.includes('permanentLogger.')) {
      return line
    }

    // Skip if it already looks correct (first param is CAPS_CATEGORY)
    if (/permanentLogger\.(info|warn|debug|captureError)\(\s*['"][A-Z_]+['"]/.test(line)) {
      return line
    }

    // Check if it matches our wrong pattern
    const wrongMatch = line.match(/permanentLogger\.(info|warn|debug|captureError)\(\s*['"]([^'"]+)['"]\s*,\s*\{\s*category:\s*['"]([A-Z_]+)['"]/)

    if (wrongMatch) {
      const [fullMatch, method, message, category] = wrongMatch

      // Build the fixed version
      let fixedLine = line

      // Extract the rest of the data object (after category)
      const dataMatch = line.match(/category:\s*['"][A-Z_]+['"]\s*,?\s*(.*)$/)
      let remainingData = ''

      if (dataMatch && dataMatch[1]) {
        // Clean up the remaining data
        remainingData = dataMatch[1]
          .replace(/^\s*,\s*/, '') // Remove leading comma
          .replace(/\}\s*\).*$/, '') // Remove closing brace and paren

        if (remainingData && !remainingData.match(/^\s*$/)) {
          // We have additional data
          fixedLine = line.replace(
            /permanentLogger\.(info|warn|debug|captureError)\([^)]+\)/,
            `permanentLogger.${method}('${category}', '${message}', { ${remainingData} })`
          )
        } else {
          // No additional data, just category
          fixedLine = line.replace(
            /permanentLogger\.(info|warn|debug|captureError)\([^)]+\)/,
            `permanentLogger.${method}('${category}', '${message}')`
          )
        }
      }

      matches.push({
        file: filePath,
        line: index + 1,
        original: line.trim(),
        fixed: fixedLine.trim()
      })

      modified = true
      return fixedLine
    }

    return line
  })

  return {
    content: modified ? fixedLines.join('\n') : content,
    matches
  }
}

async function main() {
  console.log('🔍 Searching for incorrect permanentLogger signatures...')
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no files will be modified)' : 'LIVE (files WILL be modified)'}`)
  console.log()

  // Find all TypeScript files, excluding test files and archives
  const files = await glob('**/*.ts', {
    ignore: [
      'node_modules/**',
      'archive/**',
      'test/**',
      'tests/**',
      '*.test.ts',
      '*.spec.ts',
      'scripts/fix-logger-*.ts', // Don't fix other fix scripts
      '.next/**',
      'dist/**',
      'build/**'
    ],
    cwd: process.cwd()
  })

  console.log(`Found ${files.length} TypeScript files to check`)
  console.log()

  const allMatches: Match[] = []
  const filesWithIssues: Set<string> = new Set()

  for (const file of files) {
    const filePath = path.join(process.cwd(), file)
    const content = fs.readFileSync(filePath, 'utf-8')

    // Check if file contains the wrong pattern
    if (!content.includes('category:')) {
      continue // Skip files that definitely don't have the issue
    }

    const { content: fixedContent, matches } = fixLoggerSignature(content, file)

    if (matches.length > 0) {
      filesWithIssues.add(file)
      allMatches.push(...matches)

      if (VERBOSE) {
        console.log(`📁 ${file}`)
        for (const match of matches) {
          console.log(`  Line ${match.line}:`)
          console.log(`    ❌ ${match.original}`)
          console.log(`    ✅ ${match.fixed}`)
        }
        console.log()
      }

      if (!DRY_RUN && fixedContent !== content) {
        fs.writeFileSync(filePath, fixedContent)
      }
    }
  }

  // Summary
  console.log('=' .repeat(80))
  console.log('📊 SUMMARY')
  console.log('=' .repeat(80))
  console.log(`Files checked: ${files.length}`)
  console.log(`Files with issues: ${filesWithIssues.size}`)
  console.log(`Total violations found: ${allMatches.length}`)
  console.log()

  if (filesWithIssues.size > 0) {
    console.log('Files that need fixing:')
    for (const file of filesWithIssues) {
      const count = allMatches.filter(m => m.file === file).length
      console.log(`  - ${file} (${count} violation${count > 1 ? 's' : ''})`)
    }
    console.log()

    if (DRY_RUN) {
      console.log('⚠️  This was a DRY RUN - no files were modified')
      console.log('To apply these fixes, change DRY_RUN to false at the top of this script')
      console.log()
      console.log('First 5 changes that would be made:')
      allMatches.slice(0, 5).forEach(match => {
        console.log(`\n${match.file}:${match.line}`)
        console.log(`  FROM: ${match.original}`)
        console.log(`    TO: ${match.fixed}`)
      })
    } else {
      console.log('✅ All files have been fixed!')
    }
  } else {
    console.log('✅ No violations found - all logger signatures are correct!')
  }
}

// Run the script
main().catch(error => {
  console.error('❌ Script failed:', error)
  process.exit(1)
})