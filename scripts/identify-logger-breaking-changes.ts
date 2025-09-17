#!/usr/bin/env tsx
/**
 * Script to identify all breaking changes from the permanent logger refactor
 * This will help us systematically fix all affected files
 */

import { glob } from 'glob'
import fs from 'fs/promises'
import path from 'path'

interface BreakingChange {
  file: string
  line: number
  type: 'error_method' | 'missing_category' | 'critical_level' | 'timing_pattern'
  code: string
  suggestion: string
}

const breakingChanges: BreakingChange[] = []

async function analyzeFile(filePath: string): Promise<void> {
  const content = await fs.readFile(filePath, 'utf-8')
  const lines = content.split('\n')

  lines.forEach((line, index) => {
    const lineNum = index + 1

    // Check for error() method usage
    if (line.includes('permanentLogger.captureError(') || line.includes('logger.error(')) {
      breakingChanges.push({
        file: filePath, new Error(line: lineNum,
        type: 'error_method',
        code: line.trim()),
        suggestion: 'Replace with captureError(category, error, context)'
      })
    }

    // Check for info/warn/debug without category (first param should be a string)
    const methodsNeedingCategory = ['info', 'warn', 'debug']
    methodsNeedingCategory.forEach(method => {
      const pattern = new RegExp(`permanentLogger\\.${method}\\s*\\(\\s*['"\`]`)
      if (pattern.test(line)) {
        // Check if it looks like a single string parameter (no comma after first string)
        const afterMethod = line.substring(line.indexOf(`${method}(`))
        const firstComma = afterMethod.indexOf(',')
        const firstClosingQuote = afterMethod.search(/['"\`]/)

        if (firstClosingQuote > 0) {
          const secondQuoteStart = afterMethod.indexOf(afterMethod[firstClosingQuote], firstClosingQuote + 1)
          if (secondQuoteStart > 0 && (firstComma === -1 || firstComma > secondQuoteStart + 1)) {
            // Likely missing category
            breakingChanges.push({
              file: filePath,
              line: lineNum,
              type: 'missing_category',
              code: line.trim(),
              suggestion: `Add category as first parameter: ${method}('CATEGORY', message, data?)`
            })
          }
        }
      }
    })

    // Check for critical level (should be fatal)
    if (line.includes('.critical(') || line.includes("'critical'") || line.includes('"critical"')) {
      breakingChanges.push({
        file: filePath,
        line: lineNum,
        type: 'critical_level',
        code: line.trim(),
        suggestion: 'Replace "critical" with "fatal"'
      })
    }

    // Check for old timing pattern
    if (line.includes('const stop = permanentLogger.timing(')) {
      breakingChanges.push({
        file: filePath,
        line: lineNum,
        type: 'timing_pattern',
        code: line.trim(),
        suggestion: 'Rename variable: const timing = permanentLogger.timing(...)'
      })
    }
  })
}

async function main() {
  console.log('🔍 Identifying Breaking Changes in Permanent Logger Usage\n')
  console.log('Scanning for:')
  console.log('  1. error() method calls (must use captureError)')
  console.log('  2. Missing category parameters')
  console.log('  3. "critical" level usage (should be "fatal")')
  console.log('  4. Old timing patterns\n')

  // Find all TypeScript/JavaScript files
  const files = await glob('**/*.{ts,tsx,js,jsx}', {
    ignore: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/archive/**',
      '**/scripts/identify-logger-breaking-changes.ts',
      '**/lib/utils/permanent-logger.ts',
      '**/lib/utils/permanent-logger.types.ts'
    ],
    cwd: path.resolve(process.cwd())
  })

  console.log(`Found ${files.length} files to analyze...\n`)

  // Analyze each file
  for (const file of files) {
    await analyzeFile(file)
  }

  // Group by type
  const byType = {
    error_method: breakingChanges.filter(c => c.type === 'error_method'),
    missing_category: breakingChanges.filter(c => c.type === 'missing_category'),
    critical_level: breakingChanges.filter(c => c.type === 'critical_level'),
    timing_pattern: breakingChanges.filter(c => c.type === 'timing_pattern')
  }

  // Generate report
  console.log('=== BREAKING CHANGES REPORT ===\n')

  console.log(`📊 Summary:`)
  console.log(`  Total breaking changes: ${breakingChanges.length}`)
  console.log(`  Files affected: ${new Set(breakingChanges.map(c => c.file)).size}\n`)

  console.log(`🚨 Critical Issues (Will cause compilation errors):`)
  console.log(`  - error() method calls: ${byType.error_method.length}`)
  console.log(`  - Missing categories: ${byType.missing_category.length}\n`)

  console.log(`⚠️  Minor Issues (Should be updated):`)
  console.log(`  - "critical" level usage: ${byType.critical_level.length}`)
  console.log(`  - Old timing patterns: ${byType.timing_pattern.length}\n`)

  // List files using error() method
  if (byType.error_method.length > 0) {
    console.log('❌ Files using error() method (MUST FIX):')
    const errorFiles = [...new Set(byType.error_method.map(c => c.file))]
    errorFiles.forEach(file => {
      const count = byType.error_method.filter(c => c.file === file).length
      console.log(`  - ${file} (${count} occurrences)`)
    })
    console.log()
  }

  // List files missing categories
  if (byType.missing_category.length > 0) {
    console.log('⚠️  Files missing category parameters:')
    const categoryFiles = [...new Set(byType.missing_category.map(c => c.file))].slice(0, 10)
    categoryFiles.forEach(file => {
      const count = byType.missing_category.filter(c => c.file === file).length
      console.log(`  - ${file} (${count} occurrences)`)
    })
    if (byType.missing_category.length > 10) {
      console.log(`  ... and ${byType.missing_category.length - 10} more`)
    }
    console.log()
  }

  // Save detailed report
  const reportPath = 'permanent-logger-breaking-changes.json'
  await fs.writeFile(
    reportPath,
    JSON.stringify(breakingChanges, null, 2),
    'utf-8'
  )
  console.log(`📄 Detailed report saved to: ${reportPath}\n`)

  // Generate fix script
  console.log('🔧 Next Steps:')
  console.log('  1. Review the breaking changes report')
  console.log('  2. Test the fix-permanent-logger-errors.ts script on ONE file first')
  console.log('  3. Run the fix script to automatically update files')
  console.log('  4. Manually review complex cases')
  console.log('  5. Run tests to verify everything works\n')

  // Priority files to fix first
  if (byType.error_method.length > 0) {
    console.log('🎯 Priority Files (fix these first):')
    byType.error_method.slice(0, 5).forEach(change => {
      console.log(`\n  File: ${change.file}:${change.line}`)
      console.log(`  Code: ${change.code}`)
      console.log(`  Fix:  ${change.suggestion}`)
    })
  }
}

main().catch(console.error)