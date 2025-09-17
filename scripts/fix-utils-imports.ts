#!/usr/bin/env tsx

/**
 * Fix Utility Import Names
 *
 * This script fixes incorrect import names for utility functions.
 * It corrects:
 * - httpFetch -> httpFetcher
 * - htmlDecoder -> decodeHtmlEntities
 *
 * Part of CLAUDE.md compliance - using correct utility functions.
 */

import fs from 'fs/promises'
import path from 'path'
import { glob } from 'glob'

// Define the replacements to make
const replacements = [
  {
    // Fix httpFetch import
    pattern: /import\s*{\s*httpFetch\s*}\s*from\s*['"]@\/lib\/utils\/http-fetcher['"]/g,
    replacement: "import { httpFetcher } from '@/lib/utils/http-fetcher'"
  },
  {
    // Fix httpFetch usage
    pattern: /\bhttpFetch\(/g,
    replacement: 'httpFetcher('
  },
  {
    // Fix htmlDecoder import
    pattern: /import\s*{\s*htmlDecoder\s*}\s*from\s*['"]@\/lib\/utils\/html-decoder['"]/g,
    replacement: "import { decodeHtmlEntities } from '@/lib/utils/html-decoder'"
  },
  {
    // Fix htmlDecoder usage
    pattern: /\bhtmlDecoder\(/g,
    replacement: 'decodeHtmlEntities('
  }
]

async function fixFile(filePath: string): Promise<boolean> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    let modified = content
    let hasChanges = false

    for (const { pattern, replacement } of replacements) {
      const newContent = modified.replace(pattern, replacement)
      if (newContent !== modified) {
        hasChanges = true
        modified = newContent
      }
    }

    if (hasChanges) {
      await fs.writeFile(filePath, modified, 'utf-8')
      console.log(`✅ Fixed: ${filePath}`)
      return true
    }

    return false
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error)
    return false
  }
}

async function main() {
  console.log('🔍 Searching for files with incorrect utility imports...\n')

  // Find all TypeScript files in company-intelligence directory
  const files = await glob('lib/company-intelligence/**/*.{ts,tsx}', {
    cwd: process.cwd(),
    absolute: true,
    ignore: ['**/node_modules/**', '**/.next/**']
  })

  console.log(`Found ${files.length} files to check\n`)

  let fixedCount = 0
  for (const file of files) {
    const fixed = await fixFile(file)
    if (fixed) fixedCount++
  }

  console.log(`\n✨ Complete! Fixed ${fixedCount} files`)
}

main().catch(console.error)