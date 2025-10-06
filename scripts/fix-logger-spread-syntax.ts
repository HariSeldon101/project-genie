#!/usr/bin/env npx tsx
/**
 * Script to fix malformed spread syntax in permanentLogger calls
 * Fixes patterns like: { category: 'X', ...{ data }) to { category: 'X', data }
 */

import fs from 'fs'
import path from 'path'

function fixFile(filePath: string): { fixed: boolean; changes: number } {
  console.log(`\n🔍 Processing: ${filePath}`)

  let content = fs.readFileSync(filePath, 'utf-8')
  const originalContent = content
  let changes = 0

  // Find all permanentLogger.info/warn/error calls with malformed spread
  // Pattern: permanentLogger.method('message', { category: 'X', ...{
  const regex = /permanentLogger\.(info|warn|error|debug)\((.*?)\)/gs

  content = content.replace(regex, (match, method, args) => {
    // Check if this match has the problematic pattern
    if (args.includes('...{')) {
      console.log(`  Found malformed spread in ${method} call`)

      // Extract the message and the object
      const messageMatch = args.match(/^'([^']*)'/)
      if (!messageMatch) return match

      const message = messageMatch[1]
      const afterMessage = args.substring(messageMatch[0].length)

      // Look for the category pattern
      const categoryMatch = afterMessage.match(/,\s*{\s*category:\s*'([^']*)'/)
      if (!categoryMatch) return match

      const category = categoryMatch[1]

      // Find the spread part
      const spreadMatch = afterMessage.match(/,\s*\.\.\.\{([^]*?)\}\s*\)$/)
      if (!spreadMatch) return match

      // Extract the content inside the spread
      let spreadContent = spreadMatch[1].trim()

      // Check for mismatched closing braces (like "data })" instead of "data }")
      // Remove any trailing ")" that might have been included
      spreadContent = spreadContent.replace(/\s*\}\s*\)?\s*$/, '')

      // Build the fixed version
      const fixed = `permanentLogger.${method}('${message}', {
      category: '${category}'${spreadContent ? ',\n      ' + spreadContent : ''}
    })`

      changes++
      console.log(`  ✅ Fixed ${method} call`)
      return fixed
    }

    return match
  })

  const fixed = content !== originalContent

  if (fixed) {
    // Create backup
    const backupPath = filePath + '.backup-' + Date.now()
    fs.writeFileSync(backupPath, originalContent, 'utf-8')
    console.log(`  📦 Backup created: ${backupPath}`)

    // Write fixed content
    fs.writeFileSync(filePath, content, 'utf-8')
    console.log(`  ✅ Fixed ${changes} issues`)
  } else {
    console.log(`  ✨ No issues found`)
  }

  return { fixed, changes }
}

// Test on single file first
async function main() {
  const testFile = process.argv[2]

  if (!testFile) {
    console.error('❌ Please provide a file to test on')
    console.error('Usage: npx tsx fix-logger-spread-syntax.ts <file>')
    process.exit(1)
  }

  const fullPath = path.resolve(testFile)

  if (!fs.existsSync(fullPath)) {
    console.error(`❌ File not found: ${fullPath}`)
    process.exit(1)
  }

  console.log('🔧 Testing fix script on single file...')
  console.log(`File: ${fullPath}`)

  const result = fixFile(fullPath)

  console.log('\n📊 Results:')
  console.log(`  Fixed: ${result.fixed}`)
  console.log(`  Changes: ${result.changes}`)

  if (result.fixed) {
    console.log('\n✅ Test successful! Review the changes and run build to verify.')
    console.log('If the changes look good, you can run this script on more files.')
  }
}

main().catch(console.error)