#!/usr/bin/env npx tsx

/**
 * Script to fix missing closing parentheses in permanentLogger calls
 * Fixes patterns like: permanentLogger.method('CATEGORY', 'message') -> permanentLogger.method('CATEGORY', 'message')
 */

import * as fs from 'fs'
import * as path from 'path'
import { glob } from 'glob'

const PROJECT_ROOT = path.join(__dirname, '..')

async function fixMissingParentheses() {
  console.log('🔍 Searching for files with missing closing parentheses...')

  // Find all TypeScript files
  const files = await glob('**/*.ts', {
    cwd: PROJECT_ROOT,
    ignore: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.next/**',
      'scripts/fix-missing-parentheses.ts' // Don't fix this script itself
    ]
  })

  let totalFixed = 0
  let filesFixed = 0

  for (const file of files) {
    const filePath = path.join(PROJECT_ROOT, file)
    const content = fs.readFileSync(filePath, 'utf-8')

    // Pattern to match lines that are missing closing parentheses
    // This matches permanentLogger calls that end with ')' but need '))'
    const lines = content.split('\n')
    let newLines = [...lines]
    let fileChanged = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Check if line contains permanentLogger call
      if (line.includes('permanentLogger.')) {
        // Count parentheses in the line
        const openCount = (line.match(/\(/g) || []).length
        const closeCount = (line.match(/\)/g) || []).length

        // If there's an imbalance and line ends with single ')'
        if (openCount > closeCount && line.trim().endsWith("')")) {
          // Add the missing closing parenthesis
          newLines[i] = line.replace(/'(\))$/, '\'))')
          console.log(`✅ Fixed line ${i + 1} in ${file}`)
          console.log(`   Before: ${line.trim()}`)
          console.log(`   After:  ${newLines[i].trim()}`)
          totalFixed++
          fileChanged = true
        }
      }
    }

    if (fileChanged) {
      fs.writeFileSync(filePath, newLines.join('\n'))
      filesFixed++
    }
  }

  console.log('\n📊 Summary:')
  console.log(`   Files checked: ${files.length}`)
  console.log(`   Files fixed: ${filesFixed}`)
  console.log(`   Total fixes: ${totalFixed}`)

  if (totalFixed === 0) {
    console.log('\n✨ No missing parentheses found!')
  } else {
    console.log('\n✨ All missing parentheses have been fixed!')
  }
}

// Run the script
fixMissingParentheses().catch(console.error)