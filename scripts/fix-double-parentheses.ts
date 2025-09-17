#!/usr/bin/env npx tsx

/**
 * Script to fix double closing parentheses in permanentLogger calls
 * Fixes: permanentLogger.method('CATEGORY', 'message')) -> permanentLogger.method('CATEGORY', 'message')
 */

import * as fs from 'fs'
import * as path from 'path'
import { glob } from 'glob'

const PROJECT_ROOT = path.join(__dirname, '..')

async function fixDoubleParentheses() {
  console.log('🔍 Searching for files with double closing parentheses...')

  // Find all TypeScript files
  const files = await glob('**/*.ts', {
    cwd: PROJECT_ROOT,
    ignore: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.next/**',
      'scripts/fix-double-parentheses.ts' // Don't fix this script itself
    ]
  })

  let totalFixed = 0
  let filesFixed = 0

  for (const file of files) {
    const filePath = path.join(PROJECT_ROOT, file)
    const content = fs.readFileSync(filePath, 'utf-8')

    // Pattern to match double closing parentheses in logger calls
    // Matches: permanentLogger.(info|warn|error|debug|log)('category', 'message'))
    const pattern = /permanentLogger\.(info|warn|error|debug|log)\(([^)]+)\)\)/g

    let newContent = content
    let matches = 0

    newContent = newContent.replace(pattern, (match, method, params) => {
      // Check if this is actually a double parenthesis issue
      // (not a nested function call)
      const openCount = (params.match(/\(/g) || []).length
      const closeCount = (params.match(/\)/g) || []).length

      // If parentheses are balanced within params, it's a double closing issue
      if (openCount === closeCount) {
        matches++
        return `permanentLogger.${method}(${params})`
      }

      // Otherwise, leave it as is
      return match
    })

    if (matches > 0) {
      fs.writeFileSync(filePath, newContent)
      console.log(`✅ Fixed ${matches} double parentheses in ${file}`)
      totalFixed += matches
      filesFixed++
    }
  }

  console.log('\n📊 Summary:')
  console.log(`   Files checked: ${files.length}`)
  console.log(`   Files fixed: ${filesFixed}`)
  console.log(`   Total fixes: ${totalFixed}`)

  if (totalFixed === 0) {
    console.log('\n✨ No double parentheses found!')
  } else {
    console.log('\n✨ All double parentheses have been fixed!')
  }
}

// Run the script
fixDoubleParentheses().catch(console.error)