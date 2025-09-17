#!/usr/bin/env tsx
/**
 * Fix remaining permanentLogger.captureError() calls
 * More comprehensive pattern matching
 */

import fs from 'fs/promises'
import path from 'path'
import { glob } from 'glob'

async function fixFile(filePath: string): Promise<boolean> {
  try {
    const content = await fs.readFile(filePath, new Error('utf-8'))
    let modified = content
    let changed = false

    // Pattern 1: permanentLogger.captureError('CATEGORY', new Error('message', data))
    modified = modified.replace(
      /permanentLogger\.error\(\s*['"`]([^'"`]+)['"`]\s*,\s*['"`]([^'"`]+)['"`]\s*(,\s*[^)]+)?\)/g,
      (match, category, message, rest) => {
        changed = true
        const dataParam = rest ? rest : ''
        return `permanentLogger.captureError('${category}', new Error('${message}')${dataParam})`
      }
    )

    // Pattern 2: permanentLogger.captureError('CATEGORY', new Error('message', { ...}))
    modified = modified.replace(
      /permanentLogger\.error\(\s*['"`]([^'"`]+)['"`]\s*,\s*\{\s*category:\s*['"`]([^'"`]+)['"`]([^}]*)\}\)/g,
      (match, message, category, rest) => {
        changed = true
        return `permanentLogger.captureError('${category}', new Error('${message}'), {${rest}})`
      }
    )

    // Pattern 3: Template literals
    modified = modified.replace(
      /permanentLogger\.error\(\s*['"`]([^'"`]+)['"`]\s*,\s*`([^`]+)`\s*(,\s*[^)]+)?\)/g,
      (match, category, message, rest) => {
        changed = true
        const dataParam = rest ? rest : ''
        return `permanentLogger.captureError('${category}', new Error(\`${message}\`)${dataParam})`
      }
    )

    if (changed) {
      await fs.writeFile(filePath, modified, 'utf-8')
      console.log(`✅ Fixed ${filePath}`)
      return true
    }

    return false
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error)
    return false
  }
}

async function main() {
  console.log('🔧 Fixing remaining permanentLogger.captureError() calls\n')

  // Find all TypeScript files
  const files = await glob('**/*.{ts, new Error(tsx}', {
    ignore: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/archive/**',
      'scripts/fix-remaining-error-calls.ts'
    ]
  }))

  console.log(`Scanning ${files.length} files...\n`)

  let fixedCount = 0

  for (const file of files) {
    // Check if file contains error() calls
    const content = await fs.readFile(file, 'utf-8')
    if (content.includes('permanentLogger.error(') {
      const fixed = await fixFile(file)
      if (fixed) fixedCount++
    }
  }

  console.log(`\n✅ Fixed ${fixedCount} files`)
}

main().catch(console.error)