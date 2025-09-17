#!/usr/bin/env tsx

/**
 * Fix broken permanentLogger.captureError syntax from automated script
 * The automated script created malformed object syntax - this fixes it
 */

import fs from 'fs'
import path from 'path'

const filesToFix = [
  'lib/company-intelligence/enrichers/financial-enricher.ts',
  'lib/company-intelligence/enrichers/google-business-enricher.ts',
  'lib/company-intelligence/enrichers/linkedin-company-enricher.ts',
  'lib/company-intelligence/enrichers/news-regulatory-enricher.ts',
  'lib/company-intelligence/enrichers/social-media-enricher.ts',
  'lib/company-intelligence/services/external-intelligence-orchestrator.ts',
  'lib/company-intelligence/services/image-extractor.ts',
  'lib/company-intelligence/services/brand-asset-extractor.ts',
  'lib/company-intelligence/intelligence/structured-data-extractor.ts',
  'lib/company-intelligence/intelligence/content-pattern-matcher.ts',
  'lib/company-intelligence/intelligence/page-intelligence-analyzer.ts',
  'lib/company-intelligence/scrapers/executors/static-executor.ts',
  'lib/company-intelligence/scrapers/executors/dynamic-executor.ts',
  'lib/company-intelligence/scrapers/executors/base-executor.ts',
]

let totalFixed = 0

function fixFile(filePath: string): boolean {
  const fullPath = path.join(process.cwd(), filePath)

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`)
    return false
  }

  let content = fs.readFileSync(fullPath, 'utf-8')
  const originalContent = content
  let fixes = 0

  // Fix pattern 1: permanentLogger.captureError with malformed object spread
  // Pattern: permanentLogger.captureError('CONTEXT', error, { message: 'text', ...{
  //            companyName,
  //            instanceof Error ? error.message : 'Unknown'
  //          } })

  // This regex finds the broken pattern and captures the parts
  const brokenPattern = /permanentLogger\.captureError\(([^,]+),\s*(\w+),\s*\{\s*message:\s*([^,]+),\s*\.\.\.\{([^}]*?)(\s+instanceof\s+Error\s*\?\s*[^:]+:\s*[^}]+)\}\s*\}\s*\)/g

  content = content.replace(brokenPattern, (match, context, errorVar, message, beforeError, errorCheck) => {
    fixes++
    // Extract the properties before the error check
    const props = beforeError.trim().replace(/,\s*$/, '')

    // Clean up the error check - it's missing the variable name
    const cleanErrorCheck = errorCheck.trim()
    const errorMessage = cleanErrorCheck.replace(/^\s*instanceof Error/, `${errorVar} instanceof Error`)

    // Reconstruct properly
    if (props) {
      return `permanentLogger.captureError(${context}, ${errorVar}, {\n        message: ${message},\n        ${props},\n        errorMessage: ${errorMessage}\n      })`
    } else {
      return `permanentLogger.captureError(${context}, ${errorVar}, {\n        message: ${message},\n        errorMessage: ${errorMessage}\n      })`
    }
  })

  // Fix pattern 2: Simple missing property name for instanceof check
  // Pattern: instanceof Error ? error.message : 'Unknown'
  // Should be: errorMessage: error instanceof Error ? error.message : 'Unknown'

  const missingPropPattern = /permanentLogger\.captureError\(([^,]+),\s*(\w+),\s*\{([^}]*?)\s+instanceof\s+Error\s*\?([^}]+)\}\s*\)/g

  content = content.replace(missingPropPattern, (match, context, errorVar, beforeError, afterCheck) => {
    if (!beforeError.includes('errorMessage:')) {
      fixes++
      const props = beforeError.trim()
      const errorCheck = `${errorVar} instanceof Error ?${afterCheck}`
      return `permanentLogger.captureError(${context}, ${errorVar}, {\n        ${props}\n        errorMessage: ${errorCheck}\n      })`
    }
    return match
  })

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf-8')
    console.log(`✅ Fixed ${filePath} (${fixes} corrections)`)
    totalFixed += fixes
    return true
  } else {
    console.log(`⏭️  No changes needed in ${filePath}`)
    return false
  }
}

// Main execution
console.log('🔧 Fixing broken captureError syntax...\n')

for (const file of filesToFix) {
  fixFile(file)
}

console.log('\n' + '='.repeat(60))
console.log(`✅ Fixed ${totalFixed} syntax errors!`)
console.log('='.repeat(60))
console.log('\n⚠️  Please run TypeScript compilation to verify all errors are fixed.')