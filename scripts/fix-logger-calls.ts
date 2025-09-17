#!/usr/bin/env npx tsx
/**
 * Script to fix all permanentLogger.log() calls to use proper methods
 * Converts: permanentLogger.log('CATEGORY', 'message', data)
 * To: permanentLogger.info('CATEGORY', 'message', { ...data})
 */

import fs from 'fs'
import path from 'path'
import { glob } from 'glob'

async function fixLoggerCalls() {
  console.log('🔍 Finding files with permanentLogger.log() calls...')

  // Find all TypeScript/JavaScript files
  const files = await glob('**/*.{ts,tsx,js,jsx}', {
    ignore: [
      'node_modules/**',
      '.next/**',
      'dist/**',
      'build/**',
      '*.config.js',
      'scripts/fix-logger-calls.ts', // Skip this file
      'lib/utils/permanent-logger.ts' // Skip the logger itself
    ],
    cwd: process.cwd()
  })

  let totalFixed = 0
  let filesFixed = 0

  for (const file of files) {
    const filePath = path.join(process.cwd(), file)
    let content = fs.readFileSync(filePath, 'utf-8')
    const originalContent = content

    // Pattern to match permanentLogger.log('CATEGORY', 'message', data)
    // This regex handles various formats including multiline
    const patterns = [
      // Simple case: permanentLogger.log('CATEGORY', 'message')
      /permanentLogger\.log\(\s*'([^']+)'\s*,\s*'([^']+)'\s*\)/g,

      // With data: permanentLogger.log('CATEGORY', 'message', data)
      /permanentLogger\.log\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*([^)]+)\)/g,
    ]

    // First pattern: without data
    content = content.replace(patterns[0], (match, category, message) => {
      totalFixed++
      return `permanentLogger.info('${category}', '${message}')`
    })

    // Second pattern: with data
    content = content.replace(patterns[1], (match, category, message, data) => {
      totalFixed++
      // Clean up the data parameter
      data = data.trim()

      // If data is a simple object literal, merge it
      if (data.startsWith('{') && data.endsWith('}')) {
        // Remove the braces and merge
        const innerData = data.slice(1, -1).trim()
        if (innerData) {
          return `permanentLogger.info('${category}', '${message}', { ${innerData} })`
        } else {
          return `permanentLogger.info('${category}', '${message}')`
        }
      } else {
        // Data is a variable or expression, use spread
        return `permanentLogger.info('${category}', '${message}', { ...${data} })`
      }
    })

    // Write back if changed
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf-8')
      filesFixed++
      console.log(`✅ Fixed ${filePath}`)
    }
  }

  console.log(`\n📊 Summary:`)
  console.log(`   Files scanned: ${files.length}`)
  console.log(`   Files fixed: ${filesFixed}`)
  console.log(`   Total calls fixed: ${totalFixed}`)
}

// Run the script
fixLoggerCalls().catch(console.error)