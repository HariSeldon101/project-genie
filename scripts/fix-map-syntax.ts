#!/usr/bin/env tsx
/**
 * Script to fix map/filter function syntax errors where closing paren is misplaced
 */

import { readFileSync, writeFileSync } from 'fs'

const files = [
  'components/company-intelligence/data-review/DataReviewPanel.tsx',
  'components/document-generator.tsx',
  'app/(dashboard)/documents/page.tsx',
  'app/(dashboard)/logs/page.tsx'
]

let totalFixed = 0

for (const file of files) {
  try {
    let content = readFileSync(file, 'utf-8')
    const originalContent = content
    
    // Fix pattern where closing paren is on wrong line after object literal
    // Look for patterns like: }\n     )) and fix to }))
    content = content.replace(/}\n\s+\)\)/g, '}))')
    
    // Fix double closing parens with wrong spacing
    content = content.replace(/}\s+\)\)/g, '}))')
    
    if (content !== originalContent) {
      writeFileSync(file, content)
      console.log(`✅ Fixed: ${file}`)
      totalFixed++
    }
  } catch (error) {
    console.error(`❌ Error processing ${file}:`, error)
  }
}

console.log(`\n🎯 Fixed ${totalFixed} files`)
