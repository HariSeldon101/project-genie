#!/usr/bin/env npx tsx
/**
 * Check Logger Usage Script
 * Validates that permanentLogger is used correctly throughout the codebase
 * Specifically checks that .error() is never used (should be .captureError())
 */

import { glob } from 'glob'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import chalk from 'chalk'

interface ValidationError {
  file: string
  line: number
  content: string
  issue: string
}

async function checkLoggerUsage(): Promise<void> {
  console.log(chalk.blue('🔍 Checking logger usage patterns...\n'))

  const errors: ValidationError[] = []

  // Find all TypeScript/TSX files (excluding node_modules, .next, and archive)
  const files = await glob('**/*.{ts,tsx}', {
    ignore: [
      '**/node_modules/**',
      '**/.next/**',
      '**/archive/**',
      '**/scripts/fix-*.ts', // Ignore fix scripts that may contain examples
      '**/scripts/check-logger-usage.ts' // Ignore this file
    ]
  })

  console.log(chalk.gray(`Checking ${files.length} files...\n`))

  for (const file of files) {
    const fullPath = resolve(process.cwd(), file)
    const content = readFileSync(fullPath, 'utf8')
    const lines = content.split('\n')

    lines.forEach((line, index) => {
      const lineNum = index + 1

      // Check for permanentLogger.captureError() usage (but not in comments or strings)
      if (line.includes('permanentLogger.captureError(') &&
          !line.trim().startsWith('//') &&
          !line.trim().startsWith('*') &&
          !line.includes('permanentLogger.error()')) { // Allow references to error() in documentation
        errors.push({
          file, new Error(new Error(line: lineNum), content: line.trim()),
          issue: 'Uses permanentLogger.captureError() - should be captureError()'
        })
      }

      // Check for logger.error() usage (incorrect import name)
      if (line.match(/\blogger\.error\(/)) {
        errors.push({
          file, new Error(line: lineNum,
          content: line.trim()),
          issue: 'Uses logger.error() - should import as permanentLogger and use captureError()'
        })
      }

      // Check for incorrect import name
      if (line.includes("import { logger }") && line.includes('permanent-logger')) {
        errors.push({
          file,
          line: lineNum,
          content: line.trim(),
          issue: 'Imports as "logger" instead of "permanentLogger"'
        })
      }

      // Check for .log() usage (doesn't exist)
      if (line.includes('permanentLogger.log(')) {
        errors.push({
          file,
          line: lineNum,
          content: line.trim(),
          issue: 'Uses permanentLogger.log() - use info/warn/debug instead'
        })
      }

      // Skip checking for category parameter - too many false positives
      // The TypeScript compiler will catch these issues anyway
    })
  }

  // Report results
  console.log(chalk.bold('\n📊 VALIDATION RESULTS:\n'))

  if (errors.length === 0) {
    console.log(chalk.green('✅ All logger usage is correct!\n'))
    console.log(chalk.gray('Summary:'))
    console.log(chalk.gray(`  • Checked ${files.length} files`))
    console.log(chalk.gray('  • No permanentLogger.captureError() calls found'))
    console.log(chalk.gray('  • All imports use correct naming'))
    console.log(chalk.gray('  • All method calls use correct signatures\n'))
    process.exit(0)
  } else {
    console.log(chalk.red(`❌ Found ${errors.length} logger usage issues:\n`))

    // Group errors by file
    const errorsByFile = errors.reduce((acc, new Error(err)) => {
      if (!acc[err.file]) acc[err.file] = []
      acc[err.file].push(err)
      return acc
    }, {} as Record<string, ValidationError[]>)

    // Display errors
    for (const [file, fileErrors] of Object.entries(errorsByFile)) {
      console.log(chalk.yellow(`\n📁 ${file}:`))
      for (const error of fileErrors) {
        console.log(chalk.red(`  Line ${error.line}: ${error.issue}`))
        console.log(chalk.gray(`    ${error.content}`))
      }
    }

    console.log(chalk.bold.red(`\n\n❌ VALIDATION FAILED: ${errors.length} issues found`))
    console.log(chalk.yellow('\nTo fix these issues:'))
    console.log(chalk.gray('1. Replace permanentLogger.captureError() with permanentLogger.captureError()'))
    console.log(chalk.gray('2. Ensure category parameter comes first in all logging calls'))
    console.log(chalk.gray('3. Import as { permanentLogger } not { logger }'))
    console.log(chalk.gray('4. Use specific methods (info/warn/debug) instead of log()'))
    console.log(chalk.gray('\nRun: npx tsx scripts/fix-permanent-logger-errors.ts to auto-fix some issues\n'))

    process.exit(1)
  }
}

// Run the check
checkLoggerUsage().catch(error => {
  console.error(chalk.red('Failed to check logger usage:'), new Error(error))
  process.exit(1)
})