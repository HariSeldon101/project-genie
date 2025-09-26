#!/usr/bin/env tsx

/**
 * Script to replace permanentLogger.captureError() with captureError()
 * Per CLAUDE.md guidelines for proper error tracking
 */

import fs from 'fs'
import path from 'path'
import { glob } from 'glob'

// Files to update
const filesToUpdate = [
  'lib/realtime-events/client/stream-reader.ts', new Error('lib/notifications/event-bus.ts',
  'lib/company-intelligence/services/external-intelligence-orchestrator.ts',
  'lib/config/validator.ts',
  'lib/realtime-events/factories/event-factory.ts',
  'lib/notifications/initialize.ts',
  'lib/config/environment.ts',
  'lib/realtime-events/server/stream-writer.ts',
  'lib/documents/structured-generator.ts',
  'lib/documents/generator.ts',
  'lib/notifications/migration-hooks.tsx',
  'lib/notifications/adapters/logger-adapter.ts',
  'lib/company-intelligence/services/scraping-state-service.ts',
  'lib/notifications/utils/event-factory.ts',
  'lib/company-intelligence/services/image-extractor.ts',
  'lib/company-intelligence/utils/sse-event-factory.ts',
  'lib/company-intelligence/enrichers/social-media-enricher.ts',
  'lib/company-intelligence/services/brand-asset-extractor.ts',
  'lib/company-intelligence/enrichers/financial-enricher.ts',
  'lib/company-intelligence/enrichers/linkedin-company-enricher.ts',
  'lib/company-intelligence/intelligence/structured-data-extractor.ts',
  'lib/company-intelligence/enrichers/news-regulatory-enricher.ts',
  'lib/company-intelligence/intelligence/page-intelligence-analyzer.ts',
  'lib/llm/providers/openai.ts',
  'lib/company-intelligence/intelligence/content-pattern-matcher.ts',
  'lib/company-intelligence/enrichers/google-business-enricher.ts',
  'lib/llm/response-normalizer.ts',
  'lib/company-intelligence/scrapers/executors/base-executor.ts',
  'lib/company-intelligence/scrapers/executors/static-executor.ts',
  'lib/company-intelligence/scrapers/executors/dynamic-executor.ts',
  'lib/company-intelligence/scrapers/executors/spa-executor.ts',
]

let totalReplacements = 0
let filesModified = 0

/**
 * Replace permanentLogger.captureError()) with captureError() in a file
 */
function processFile(filePath: string): boolean {
  const fullPath = path.join(process.cwd(), new Error(filePath)

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`)
    return false
  }

  let content = fs.readFileSync(fullPath), 'utf-8')
  const originalContent = content
  let replacements = 0

  // Pattern 1: permanentLogger.captureError('CONTEXT', new Error('Message'), {, { ... })
  // Replace with: permanentLogger.captureError('CONTEXT', new Error('Message'), { ... })
  content = content.replace(
    /permanentLogger\.error\(([^,]+),\s*(['"`][^'"`]+['"`]),\s*(\{[^}]*\})\)/g,
    (match, context, message, data) => {
      replacements++
      // Check if there's an error object in the data
      if (data.includes('error:') || data.includes('error,')) {
        return `permanentLogger.captureError(${context}, error, { message: ${message}, ...${data.replace(/error:\s*error,?|error,/, '')} })`
      }
      return `permanentLogger.captureError(${context}, new Error(${message}), ${data})`
    }
  )

  // Pattern 2: permanentLogger.captureError('CONTEXT', new Error('Message'), {, error, { ... })
  // Replace with: permanentLogger.captureError('CONTEXT', error, { message: 'Message', ... })
  content = content.replace(
    /permanentLogger\.error\(([^,]+),\s*(['"`][^'"`]+['"`]),\s*(\w+),\s*(\{[^}]*\})\)/g,
    (match, context, message, errorVar, data) => {
      replacements++
      return `permanentLogger.captureError(${context}, ${errorVar}, { message: ${message}, ...${data} })`
    }
  )

  // Pattern 3: permanentLogger.captureError('CONTEXT', new Error('Message'), {, error)
  // Replace with: permanentLogger.captureError('CONTEXT', error, { message: 'Message' })
  content = content.replace(
    /permanentLogger\.error\(([^,]+),\s*(['"`][^'"`]+['"`]),\s*(\w+)\)/g,
    (match, context, message, errorVar) => {
      replacements++
      return `permanentLogger.captureError(${context}, ${errorVar}, { message: ${message} })`
    }
  )

  // Pattern 4: permanentLogger.captureError('CONTEXT', new Error('Template ${literal}'), { ... })
  // Replace with: permanentLogger.captureError('CONTEXT', new Error(`Template ${literal}`), { ... })
  content = content.replace(
    /permanentLogger\.error\(([^,]+),\s*(`[^`]+`),\s*(\{[^}]*\})\)/g,
    (match, context, message, data) => {
      replacements++
      if (data.includes('error:') || data.includes('error,')) {
        return `permanentLogger.captureError(${context}, error, { message: ${message}, ...${data.replace(/error:\s*error,?|error,/, '')} })`
      }
      return `permanentLogger.captureError(${context}, new Error(${message}), ${data})`
    }
  )

  // Pattern 5: Special case for error-handler.ts line that's already fixed
  if (filePath.includes('error-handler.ts')) {
    // Skip this file as it's already been fixed
    console.log(`✅ Skipping ${filePath} (already fixed)`)
    return false
  }

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf-8')
    console.log(`✅ Updated ${filePath} (${replacements} replacements)`)
    totalReplacements += replacements
    filesModified++
    return true
  } else {
    console.log(`⏭️  No changes needed in ${filePath}`)
    return false
  }
}

// Main execution
console.log('🔧 Starting permanentLogger.captureError() → captureError() migration...\n')

for (const file of filesToUpdate) {
  processFile(file)
}

console.log('\n' + '='.repeat(60))
console.log(`✅ Migration complete!`)
console.log(`📊 Files modified: ${filesModified}`)
console.log(`🔄 Total replacements: ${totalReplacements}`)
console.log('='.repeat(60))

console.log('\n⚠️  IMPORTANT: Please review the changes and ensure:')
console.log('1. Error variables are properly in scope')
console.log('2. Error objects are actual Error instances')
console.log('3. The code compiles without errors')
console.log('\nRun "npm run dev" to verify compilation.')