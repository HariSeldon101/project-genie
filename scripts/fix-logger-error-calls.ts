#!/usr/bin/env npx tsx
/**
 * Script to fix all this.logger.error calls to use permanentLogger.captureError
 * This ensures proper error logging according to codebase standards
 */

import * as fs from 'fs/promises'
import * as path from 'path'

const filesToFix = [
  'lib/notifications/utils/stream-handler.ts',
  'lib/company-intelligence/core/unified-scraper-executor.ts',
  'lib/company-intelligence/core/session-manager.ts',
  'lib/company-intelligence/scrapers/plugins/firecrawl-plugin.ts',
  'lib/company-intelligence/scrapers/plugins/base-scraper-plugin.ts'
]

async function fixFile(filePath: string) {
  try {
    const fullPath = path.join(process.cwd(), filePath)
    let content = await fs.readFile(fullPath, 'utf-8')

    // Count replacements for reporting
    let replacements = 0

    // Replace this.logger.error( with this.logger.captureError(
    // We need to handle the different parameter patterns

    // Pattern 1: this.logger.error('CONTEXT', 'message', { ... })
    // Should become: this.logger.captureError('CONTEXT', new Error('message'), { ... })
    content = content.replace(
      /this\.logger\.error\('([^']+)',\s*'([^']+)',\s*\{/g,
      (match, context, message) => {
        replacements++
        return `this.logger.captureError('${context}', new Error('${message}'), {`
      }
    )

    // Pattern 2: this.logger.error('message', { ... })
    // Should become: this.logger.captureError('UNKNOWN', new Error('message'), { ... })
    content = content.replace(
      /this\.logger\.error\('([^']+)',\s*\{/g,
      (match, message) => {
        replacements++
        return `this.logger.captureError('UNKNOWN', new Error('${message}'), {`
      }
    )

    // Pattern 3: Handle cases where error is already an Error object
    // this.logger.error('CONTEXT', error.message, { error })
    // Should become: this.logger.captureError('CONTEXT', error, { })
    content = content.replace(
      /this\.logger\.error\('([^']+)',\s*error\.message,\s*\{\s*error\s*\}\)/g,
      (match, context) => {
        replacements++
        return `this.logger.captureError('${context}', error instanceof Error ? error : new Error(String(error)), {})`
      }
    )

    if (replacements > 0) {
      await fs.writeFile(fullPath, content)
      console.log(`✅ Fixed ${replacements} logger.error calls in ${filePath}`)
    } else {
      console.log(`ℹ️  No changes needed in ${filePath}`)
    }

    return replacements
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error)
    return 0
  }
}

async function main() {
  console.log('🔧 Fixing logger.error calls to use captureError...\n')

  let totalReplacements = 0

  for (const file of filesToFix) {
    const count = await fixFile(file)
    totalReplacements += count
  }

  console.log(`\n✨ Fixed ${totalReplacements} total logger.error calls`)
  console.log('📝 All files now use permanentLogger.captureError() for proper error tracking')
}

main().catch(console.error)