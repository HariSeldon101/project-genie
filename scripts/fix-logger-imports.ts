#!/usr/bin/env node

/**
 * Fix incorrect logger imports from permanent-logger
 * Changes: import { permanentLogger } from '@/lib/utils/permanent-logger'
 * To: import { permanentLogger } from '@/lib/utils/permanent-logger'
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const projectRoot = process.cwd()
let filesFixed = 0
let totalFiles = 0

function fixFile(filePath: string): boolean {
  const content = readFileSync(filePath, 'utf-8')

  // Pattern to match incorrect imports
  const patterns = [
    // import { permanentLogger } from '@/lib/utils/permanent-logger'
    /import\s*{\s*logger\s*}\s*from\s*['"]@\/lib\/utils\/permanent-logger['"]/g,
    // import { permanentLogger as something } from '@/lib/utils/permanent-logger'
    /import\s*{\s*logger\s+as\s+\w+\s*}\s*from\s*['"]@\/lib\/utils\/permanent-logger['"]/g,
  ]

  let modified = content
  let hasChanges = false

  patterns.forEach(pattern => {
    if (pattern.test(content)) {
      hasChanges = true
      modified = modified.replace(pattern, (match) => {
        return match.replace('{ logger', '{ permanentLogger')
      })
    }
  })

  // Also fix any usage of just 'logger' that should be 'permanentLogger'
  // But only if we imported from permanent-logger
  if (hasChanges && modified.includes('permanentLogger')) {
    // Replace standalone logger. calls
    modified = modified.replace(/\blogger\.(info|warn|debug|error|captureError)\(/g, 'permanentLogger.$1(')
  }

  if (hasChanges) {
    writeFileSync(filePath, modified)
    console.log(`✅ Fixed: ${filePath}`)
    return true
  }

  return false
}

function processDirectory(dir: string, exclude: string[] = ['node_modules', '.next', '.git', 'dist']) {
  const items = readdirSync(dir)

  for (const item of items) {
    const fullPath = join(dir, item)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      if (!exclude.includes(item)) {
        processDirectory(fullPath, exclude)
      }
    } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx') || item.endsWith('.js') || item.endsWith('.jsx'))) {
      totalFiles++
      if (fixFile(fullPath)) {
        filesFixed++
      }
    }
  }
}

console.log('🔍 Searching for files with incorrect logger imports...')
processDirectory(projectRoot)

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ Import fixing complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Files scanned: ${totalFiles}
✅ Files fixed: ${filesFixed}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`)

if (filesFixed === 0) {
  console.log('✅ All imports are already correct!')
} else {
  console.log('🎉 All incorrect imports have been fixed!')
}