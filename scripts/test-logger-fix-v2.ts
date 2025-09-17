#!/usr/bin/env npx tsx
/**
 * Test script for logger signature fixes - VERSION 2
 * Fixed the regex to not add extra parentheses
 */

import * as fs from 'fs'
import * as path from 'path'

// Test files to try the fix on
const TEST_FILES = [
  'lib/config/validator.ts',
  'lib/realtime-events/server/stream-writer.ts',
  'lib/realtime-events/client/stream-reader.ts',
  'lib/utils/llm-logger.ts',
  'lib/company-intelligence/utils/state-synchronizer.ts'
]

function fixLoggerSignature(content: string): { fixed: string; changes: number } {
  let changes = 0

  // Pattern that matches the ENTIRE incorrect call
  // Group 1: method (info/warn/debug/captureError)
  // Group 2: message
  // Group 3: entire object contents including category
  const pattern = /permanentLogger\.(info|warn|debug|captureError)\(\s*['"]([^'"]+)['"]\s*,\s*\{([^}]*category:\s*['"]([A-Z_]+)['"][^}]*)\}\s*\)/gm

  const fixed = content.replace(pattern, (match, method, message, objectContents, category) => {
    // Skip if already correct (first param is CAPS)
    if (/^[A-Z_]+$/.test(message)) {
      return match
    }

    // Remove category field from object contents
    let cleanedContents = objectContents
      .replace(/category:\s*['"][A-Z_]+['"]\s*,?\s*/, '') // Remove category and optional comma
      .replace(/,\s*$/, '') // Remove trailing comma if present
      .trim()

    changes++

    // Build replacement based on whether there's remaining data
    if (cleanedContents) {
      return `permanentLogger.${method}('${category}', '${message}', { ${cleanedContents} })`
    } else {
      return `permanentLogger.${method}('${category}', '${message}')`
    }
  })

  return { fixed, changes }
}

async function testOnFile(filePath: string) {
  console.log(`\n📁 Testing on: ${filePath}`)
  console.log('=' .repeat(60))

  const fullPath = path.join(process.cwd(), filePath)

  if (!fs.existsSync(fullPath)) {
    console.log('❌ File not found!')
    return false
  }

  const original = fs.readFileSync(fullPath, 'utf-8')
  const { fixed, changes } = fixLoggerSignature(original)

  if (changes === 0) {
    console.log('✅ No changes needed (no violations found)')
    return true
  }

  console.log(`Found ${changes} violation(s) to fix`)

  // Show a sample of what changed
  const originalLines = original.split('\n')
  const fixedLines = fixed.split('\n')

  let samplesShown = 0
  for (let i = 0; i < originalLines.length && samplesShown < 3; i++) {
    if (originalLines[i] !== fixedLines[i]) {
      console.log(`\nLine ${i + 1}:`)
      console.log(`  ❌ OLD: ${originalLines[i].trim()}`)
      console.log(`  ✅ NEW: ${fixedLines[i].trim()}`)
      samplesShown++
    }
  }

  // Test that the fixed version is valid TypeScript
  const testFile = '/tmp/test-logger-syntax.ts'
  fs.writeFileSync(testFile, fixed)

  try {
    // Use TypeScript compiler to check syntax
    const { execSync } = require('child_process')
    execSync(`npx tsc --noEmit --skipLibCheck ${testFile}`, { stdio: 'pipe' })
    console.log('\n✅ Syntax check passed - no TypeScript errors!')
    return true
  } catch (error: any) {
    console.log('\n❌ Syntax check FAILED!')
    console.log('TypeScript errors:', error.stdout?.toString() || error.message)
    return false
  }
}

async function main() {
  console.log('🧪 Testing automated fix on individual files...')
  console.log('This will NOT modify any files - just testing the logic\n')

  let allPassed = true

  for (const file of TEST_FILES) {
    const passed = await testOnFile(file)
    if (!passed) {
      allPassed = false
    }
  }

  console.log('\n' + '=' .repeat(60))
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED! The automated fix logic is safe to use.')
  } else {
    console.log('❌ SOME TESTS FAILED! Do not proceed with mass fix.')
  }
}

main().catch(error => {
  console.error('Script error:', error)
  process.exit(1)
})