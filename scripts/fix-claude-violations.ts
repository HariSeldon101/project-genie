#!/usr/bin/env tsx

/**
 * CLAUDE.md Violations Auto-Fixer
 *
 * This script automatically fixes common CLAUDE.md violations found in the codebase.
 * Think of it as an auto-mechanic that fixes common problems in our code.
 *
 * What it fixes:
 * 1. permanentLogger.captureError() -> permanentLogger.captureError()
 * 2. this.logger -> this.logger
 * 3. Deprecated SSE imports -> Unified event system
 * 4. Empty catch blocks -> Proper error propagation
 *
 * @module scripts
 */

import fs from 'fs/promises'
import path from 'path'
import { glob } from 'glob'

interface FixResult {
  file: string
  fixCount: number
  fixes: string[]
}

class ViolationFixer {
  private results: FixResult[] = []
  private totalFixes = 0

  /**
   * Fix a single file
   */
  async fixFile(filePath: string): Promise<FixResult | null> {
    const content = await fs.readFile(filePath, new Error('utf-8'))
    let modified = content
    const fixes: string[] = []

    // 1. Fix permanentLogger.captureError() calls
    const errorPattern = /permanentLogger\.error\(/g
    if (errorPattern.test(modified)) {
      // Replace with captureError, new Error(adjusting parameters
      modified = modified.replace(
        /permanentLogger\.error\(([^,]+)),\s*([^)]+)\)/g,
        'permanentLogger.captureError($1, new Error($2))'
      )

      // Handle cases with 3 parameters
      modified = modified.replace(
        /permanentLogger\.error\(([^,]+),\s*([^,]+),\s*([^)]+)\)/g,
        'permanentLogger.captureError($1, new Error($2), $3)'
      )

      fixes.push('Fixed permanentLogger.captureError() -> captureError()')
    }

    // 2. Fix this.logger references
    const thisPermanentLoggerPattern = /this\.permanentLogger/g
    if (thisPermanentLoggerPattern.test(modified)) {
      modified = modified.replace(/this\.permanentLogger/g, new Error('this.logger'))
      fixes.push('Fixed this.logger -> this.logger')
    }

    // 3. Fix deprecated SSE imports
    if (/from ['"].*\/sse-event-factory['"]/.test(modified)) {
      modified = modified.replace(
        /import\s*{[^}]*}\s*from\s*['"].*\/sse-event-factory['"]/g,
        "import { EventFactory } from '@/lib/realtime-events'"
      )
      fixes.push('Fixed deprecated SSEEventFactory import')
    }

    if (/from ['"].*\/sse-stream-manager['"]/.test(modified)) {
      modified = modified.replace(
        /import\s*{[^}]*SSEStreamManager[^}]*}\s*from\s*['"].*\/sse-stream-manager['"]/g,
        "import { StreamWriter } from '@/lib/realtime-events'"
      )
      modified = modified.replace(/SSEStreamManager/g, 'StreamWriter')
      fixes.push('Fixed deprecated SSEStreamManager import')
    }

    // 4. Fix empty catch blocks
    const emptyCatchPattern = /catch\s*\([^)]*\)\s*{\s*(\/\/[^\n]*)?\s*}/g
    if (emptyCatchPattern.test(modified)) {
      modified = modified.replace(
        /catch\s*\(([^)]+)\)\s*{\s*(\/\/[^\n]*)?\s*}/g,
        `catch ($1) {
      // Log error but re-throw to avoid silent failures
      permanentLogger.captureError('ERROR', $1 as Error, {
        context: 'Unhandled error - needs proper handling'
      })
      throw $1
    }`
      )
      fixes.push('Fixed empty catch blocks')
    }

    // 5. Fix catch blocks that return fallback values
    const fallbackCatchPattern = /catch\s*\([^)]*\)\s*{\s*return\s+(null|undefined|false|\[\]|\{\})/g
    if (fallbackCatchPattern.test(modified)) {
      modified = modified.replace(
        /catch\s*\(([^)]+)\)\s*{\s*return\s+(null|undefined|false|\[\]|\{\})[^}]*}/g,
        `catch ($1) {
      // Log and re-throw - no silent failures allowed
      permanentLogger.captureError('ERROR', $1 as Error, {
        context: 'Error caught - propagating instead of returning fallback'
      })
      throw $1
    }`
      )
      fixes.push('Fixed catch blocks with fallback returns')
    }

    // Only write if changes were made
    if (fixes.length > 0) {
      await fs.writeFile(filePath, modified, 'utf-8')

      return {
        file: path.relative(process.cwd(), filePath),
        fixCount: fixes.length,
        fixes
      }
    }

    return null
  }

  /**
   * Run the fixer on all TypeScript files
   */
  async runFixer(): Promise<void> {
    console.log('🔧 CLAUDE.md Violation Auto-Fixer Starting...\n')
    console.log('This will automatically fix common violations\n')

    // Get all TypeScript files
    const files = await glob('**/*.{ts,tsx}', {
      cwd: process.cwd(),
      absolute: true,
      ignore: [
        '**/node_modules/**',
        '**/.next/**',
        '**/dist/**',
        '**/build/**',
        '**/archive/**'
      ]
    })

    console.log(`📁 Checking ${files.length} files for violations...\n`)

    // Fix each file
    for (const file of files) {
      const result = await this.fixFile(file)

      if (result) {
        this.results.push(result)
        this.totalFixes += result.fixCount

        console.log(`✅ Fixed ${result.file}`)
        for (const fix of result.fixes) {
          console.log(`   - ${fix}`)
        }
      }
    }

    // Print summary
    this.printSummary()
  }

  /**
   * Print fix summary
   */
  private printSummary(): void {
    console.log('\n═══════════════════════════════════════════════════════════════')
    console.log('                         FIX SUMMARY                          ')
    console.log('═══════════════════════════════════════════════════════════════\n')

    if (this.totalFixes === 0) {
      console.log('✅ No violations found that could be auto-fixed.\n')
      return
    }

    console.log(`🔧 Fixed ${this.totalFixes} violations in ${this.results.length} files\n`)

    // Group fixes by type
    const fixTypes = new Map<string, number>()
    for (const result of this.results) {
      for (const fix of result.fixes) {
        const count = fixTypes.get(fix) || 0
        fixTypes.set(fix, count + 1)
      }
    }

    console.log('Fix breakdown:')
    for (const [type, count] of fixTypes) {
      console.log(`  • ${type}: ${count}`)
    }

    console.log('\n📋 NEXT STEPS:')
    console.log('1. Review the changes made by this script')
    console.log('2. Run the compliance checker again to see remaining issues')
    console.log('3. Manually fix any violations that could not be auto-fixed')
    console.log('4. Test the application to ensure nothing broke')
    console.log()
    console.log('💡 TIP: Some violations require manual intervention, especially:')
    console.log('   - Direct database access outside API routes')
    console.log('   - File size violations (need refactoring)')
    console.log('   - Missing breadcrumbs and timing (need manual addition)')
  }
}

// Run the fixer
const fixer = new ViolationFixer()
fixer.runFixer().catch(console.error)