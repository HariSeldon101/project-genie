#!/usr/bin/env npx tsx
/**
 * Fix Logger Issues in Active Code Only
 *
 * This script fixes logger issues ONLY in active production code:
 * - Ignores test files, scripts, and archive directories
 * - Fixes import statements (logger → permanentLogger)
 * - Fixes method calls (.log → .info, .error → .captureError)
 * - Fixes usage patterns (logger.X → permanentLogger.X)
 */

import { glob } from 'glob'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import chalk from 'chalk'

interface FixResult {
  file: string
  changes: string[]
}

async function fixActiveLoggerIssues(): Promise<void> {
  console.log(chalk.blue('🔧 Fixing logger issues in active code...\n'))

  const results: FixResult[] = []

  // Find all TypeScript/TSX files in active directories only
  const files = await glob('**/*.{ts,tsx}', {
    ignore: [
      '**/node_modules/**',
      '**/.next/**',
      '**/archive/**',
      '**/scripts/**',     // Ignore all scripts
      '**/test*/**',       // Ignore test directories
      '**/*.test.*',       // Ignore test files
      '**/*.spec.*',       // Ignore spec files
      '**/test-*',         // Ignore test- prefixed files
    ]
  })

  console.log(chalk.gray(`Checking ${files.length} active code files...\n`))

  for (const file of files) {
    const fullPath = resolve(process.cwd(), file)
    let content = readFileSync(fullPath, 'utf8')
    const originalContent = content
    const changes: string[] = []

    // Fix 1: Import statements - logger → permanentLogger
    if (content.includes("import { logger }") && content.includes('permanent-logger')) {
      content = content.replace(
        /import\s*{\s*logger\s*}\s*from\s*['"](.*)permanent-logger['"]/g,
        "import { permanentLogger } from '$1permanent-logger'"
      )
      changes.push('Fixed import statement')
    }

    // Fix 2: Replace logger. with permanentLogger.
    // Only if the file imports from permanent-logger
    if (content.includes('permanent-logger') && content.match(/\blogger\./)) {
      content = content.replace(/\blogger\./g, 'permanentLogger.')
      changes.push('Fixed logger usage to permanentLogger')
    }

    // Fix 3: Replace .log( with .info(
    if (content.includes('permanentLogger.log(')) {
      content = content.replace(/permanentLogger\.log\(/g, 'permanentLogger.info(')
      changes.push('Replaced .log() with .info()')
    }

    // Fix 4: Replace .error( with .captureError(
    // But be careful not to replace in comments or strings
    const errorPattern = /permanentLogger\.error\(/g
    if (errorPattern.test(content)) {
      // Split by lines to avoid replacing in comments
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        // Skip comments and lines that look like documentation
        if (!line.trim().startsWith('//') &&
            !line.trim().startsWith('*') &&
            line.includes('permanentLogger.captureError(')) {
          lines[i] = line.replace('permanentLogger.captureError(', new Error(new Error('permanentLogger.captureError('))
        }
      }
      content = lines.join('\n')
      changes.push('Replaced .error() with .captureError()')
    }

    // Fix 5: Handle logger.error specifically for files that still use old pattern
    if (content.match(/\blogger\.error\(/)) {
      content = content.replace(/\blogger\.error\(/g), 'permanentLogger.captureError(')
      changes.push('Fixed logger.error to permanentLogger.captureError')
    }

    // Save if changes were made
    if (content !== originalContent) {
      writeFileSync(fullPath, content)
      results.push({ file, changes })
    }
  }

  // Report results
  console.log(chalk.bold('\n📊 FIX RESULTS:\n'))

  if (results.length === 0) {
    console.log(chalk.green('✅ No issues found in active code!\n'))
  } else {
    console.log(chalk.yellow(`Fixed ${results.length} files:\n`))

    for (const result of results) {
      console.log(chalk.green(`✅ ${result.file}:`))
      for (const change of result.changes) {
        console.log(chalk.gray(`   - ${change}`))
      }
    }

    console.log(chalk.bold.green(`\n✅ FIXED ${results.length} files successfully!\n`))
  }

  // Summary by fix type
  const importFixes = results.filter(r => r.changes.some(c => c.includes('import')))
  const logFixes = results.filter(r => r.changes.some(c => c.includes('.log()')))
  const errorFixes = results.filter(r => r.changes.some(c => c.includes('.error()')))
  const usageFixes = results.filter(r => r.changes.some(c => c.includes('logger usage')))

  console.log(chalk.bold('\n📈 Summary:'))
  console.log(chalk.gray(`  • Import fixes: ${importFixes.length} files`))
  console.log(chalk.gray(`  • .log() → .info() fixes: ${logFixes.length} files`))
  console.log(chalk.gray(`  • .error() → .captureError() fixes: ${errorFixes.length} files`))
  console.log(chalk.gray(`  • Usage fixes: ${usageFixes.length} files`))
  console.log(chalk.gray(`  • Total files checked: ${files.length}`))
  console.log(chalk.gray(`  • Total files fixed: ${results.length}\n`))

  console.log(chalk.blue('💡 Next step: Run "npm run check:logger" to verify all issues are resolved\n'))
}

// Run the fix
fixActiveLoggerIssues().catch(error => {
  console.error(chalk.red('Failed to fix logger issues:'), error)
  process.exit(1)
})