#!/usr/bin/env tsx
/**
 * Script to fix common syntax errors with closing braces in wrong places
 */

import { readFileSync, writeFileSync } from 'fs'
import { glob } from 'glob'
import path from 'path'

async function fixSyntaxErrors() {
  console.log('🔧 Fixing syntax errors in TypeScript files...')

  // Find all TypeScript files
  const files = await glob('**/*.{ts,tsx}', {
    ignore: ['node_modules/**', 'archive/**', '.next/**', 'scripts/fix-syntax-errors.ts'],
    cwd: process.cwd()
  })

  let totalFixed = 0

  for (const file of files) {
    const filePath = path.join(process.cwd(), file)
    let content = readFileSync(filePath, 'utf-8')
    const originalContent = content

    // Pattern 1: Fix .slice(0, N })
    content = content.replace(/\.slice\(([^)]*)\s+}\)/g, '.slice($1)')

    // Pattern 2: Fix .map(f => f.something })
    content = content.replace(/\.map\(([^)]*)\s+}\)\)/g, '.map($1))')

    // Pattern 3: Fix Math.min(a, b })
    content = content.replace(/Math\.(min|max|round|floor|ceil)\(([^)]*)\s+}\)/g, 'Math.$1($2)')

    // Pattern 4: Fix array methods with extra }
    content = content.replace(/\.(filter|find|some|every|reduce)\(([^)]*)\s+}\)/g, '.$1($2)')

    // Pattern 5: Fix new Set(array.map(f => f.type }))
    content = content.replace(/new Set\(([^)]*\.map\([^)]*)\s+}\)\)/g, 'new Set($1))')

    // Pattern 6: Fix substring(0, N })
    content = content.replace(/\.substring\(([^)]*)\s+}\)/g, '.substring($1)')

    if (content !== originalContent) {
      writeFileSync(filePath, content)
      console.log(`✅ Fixed: ${file}`)
      totalFixed++
    }
  }

  console.log(`\n🎯 Fixed ${totalFixed} files`)
}

fixSyntaxErrors().catch(console.error)
