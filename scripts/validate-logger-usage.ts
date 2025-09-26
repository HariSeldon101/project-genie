#!/usr/bin/env tsx

/**
 * Script to validate correct permanentLogger usage
 * Ensures all logging calls follow the correct signature:
 * permanentLogger.method(category: string, message: string, data?: any)
 */

import { promises as fs } from 'fs'
import { glob } from 'glob'
import * as path from 'path'

interface LoggerIssue {
  file: string
  line: number
  content: string
  issue: string
}

async function validateLoggerUsage(): Promise<LoggerIssue[]> {
  const issues: LoggerIssue[] = []

  // Find all TypeScript files
  const files = await glob('**/*.{ts,tsx}', {
    ignore: [
      'node_modules/**',
      '.next/**',
      'scripts/validate-logger-usage.ts',
      'archive/**',
      '*.test.ts',
      '*.spec.ts'
    ],
    cwd: process.cwd()
  })

  console.log(`📝 Checking ${files.length} files for logger usage...`)

  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8')
    const lines = content.split('\n')

    lines.forEach((line, index) => {
      const lineNumber = index + 1

      // Check for incorrect patterns where message comes before category
      // Pattern: permanentLogger.method('message', { category: 'X' })
      const incorrectPattern1 = /permanentLogger\.(info|warn|debug)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*\{.*category\s*:/

      // Pattern: permanentLogger.method('message', data) without category
      const incorrectPattern2 = /permanentLogger\.(info|warn|debug)\s*\(\s*['"`][^A-Z_][^'"`]*['"`]\s*,/

      // Check for captureError with wrong signature
      const incorrectError = /permanentLogger\.error\s*\(/

      if (incorrectPattern1.test(line)) {
        issues.push({
          file,
          line: lineNumber,
          content: line.trim(),
          issue: 'Message appears before category (category in data object)'
        })
      } else if (incorrectPattern2.test(line)) {
        // Check if first argument looks like a message (not all caps)
        const match = line.match(/permanentLogger\.(info|warn|debug)\s*\(\s*['"`]([^'"`]+)['"`]/)
        if (match && match[2] && !/^[A-Z_]+$/.test(match[2])) {
          issues.push({
            file,
            line: lineNumber,
            content: line.trim(),
            issue: 'First parameter should be category (all caps with underscores)'
          })
        }
      } else if (incorrectError.test(line)) {
        issues.push({
          file,
          line: lineNumber,
          content: line.trim(),
          issue: 'permanentLogger.error() does not exist - use captureError() instead'
        })
      }
    })
  }

  return issues
}

// Run validation
async function main() {
  console.log('🔍 Validating permanentLogger usage...\n')

  const issues = await validateLoggerUsage()

  if (issues.length === 0) {
    console.log('✅ All permanentLogger usage is correct!')
    process.exit(0)
  } else {
    console.log(`❌ Found ${issues.length} logger usage issues:\n`)

    issues.forEach((issue, i) => {
      console.log(`${i + 1}. ${issue.file}:${issue.line}`)
      console.log(`   Issue: ${issue.issue}`)
      console.log(`   Line: ${issue.content}`)
      console.log()
    })

    console.log('📝 Remember:')
    console.log('   - Category (UPPERCASE_WITH_UNDERSCORES) always comes first')
    console.log('   - Use captureError() for errors, not error()')
    console.log('   - Signature: permanentLogger.method(category, message, data?)')

    process.exit(1)
  }
}

main().catch(console.error)