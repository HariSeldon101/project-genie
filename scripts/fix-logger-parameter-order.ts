#!/usr/bin/env npx tsx

/**
 * Script to fix incorrect permanentLogger call parameter order
 * Changes from: permanentLogger.info('message', { category: 'CATEGORY', ...data })
 * To: permanentLogger.info('CATEGORY', 'message', { ...data })
 */

import * as fs from 'fs'
import * as path from 'path'
import { glob } from 'glob'

const PROJECT_ROOT = path.join(__dirname, '..')

async function fixLoggerCalls() {
  console.log('🔍 Searching for files with incorrect logger parameter order...')

  // Find all TypeScript files
  const files = await glob('**/*.ts', {
    cwd: PROJECT_ROOT,
    ignore: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.next/**',
      'scripts/fix-logger-parameter-order.ts' // Don't fix this script itself
    ]
  })

  let totalFixed = 0
  let filesFixed = 0

  for (const file of files) {
    const filePath = path.join(PROJECT_ROOT, file)
    const content = fs.readFileSync(filePath, 'utf-8')

    // Pattern to match incorrect logger calls
    // Matches: permanentLogger.(info|warn|error|debug)('message', { category: 'CATEGORY', ...
    const pattern = /permanentLogger\.(info|warn|error|debug)\((['"])(.*?)\2,\s*\{\s*category:\s*(['"])(.*?)\4,?\s*(.*?)\}/g

    let newContent = content
    let matches = 0

    newContent = newContent.replace(pattern, (match, method, quote1, message, quote2, category, restData) => {
      matches++
      // If restData is empty or just whitespace, don't include the object
      const cleanedRest = restData.trim()
      if (cleanedRest === '' || cleanedRest === ',') {
        return `permanentLogger.${method}(${quote2}${category}${quote2}, ${quote1}${message}${quote1})`
      } else {
        // Remove trailing comma if present
        const finalRest = cleanedRest.endsWith(',') ? cleanedRest.slice(0, -1) : cleanedRest
        return `permanentLogger.${method}(${quote2}${category}${quote2}, ${quote1}${message}${quote1}, { ${finalRest}}`
      }
    })

    // Also handle cases where category is the only property
    const simplePattern = /permanentLogger\.(info|warn|error|debug)\((['"])(.*?)\2,\s*\{\s*category:\s*(['"])(.*?)\4\s*\}\)/g

    newContent = newContent.replace(simplePattern, (match, method, quote1, message, quote2, category) => {
      matches++
      return `permanentLogger.${method}(${quote2}${category}${quote2}, ${quote1}${message}${quote1})`
    })

    if (matches > 0) {
      fs.writeFileSync(filePath, newContent)
      console.log(`✅ Fixed ${matches} logger calls in ${file}`)
      totalFixed += matches
      filesFixed++
    }
  }

  console.log('\n📊 Summary:')
  console.log(`   Files checked: ${files.length}`)
  console.log(`   Files fixed: ${filesFixed}`)
  console.log(`   Total logger calls fixed: ${totalFixed}`)

  if (totalFixed === 0) {
    console.log('\n✨ No incorrect logger calls found!')
  } else {
    console.log('\n✨ All logger calls have been fixed!')
  }
}

// Run the script
fixLoggerCalls().catch(console.error)