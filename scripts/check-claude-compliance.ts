#!/usr/bin/env tsx

/**
 * CLAUDE.md Compliance Checker
 *
 * This script verifies that the codebase follows all CLAUDE.md guidelines.
 * Think of it as a quality inspector that checks if our code follows all the rules.
 *
 * What it checks:
 * 1. File sizes (warning if >500 lines)
 * 2. PermanentLogger usage (no .error() method)
 * 3. Repository pattern (no direct DB calls outside API routes)
 * 4. Unified event system usage
 * 5. No mock data or fallbacks
 * 6. Proper error handling (no silent failures)
 * 7. Semantic HTML usage
 * 8. Utils function usage
 * 9. Database ID generation (no client-side UUIDs for DB)
 * 10. PM-friendly documentation
 *
 * @module scripts
 */

import fs from 'fs/promises'
import path from 'path'
import { glob } from 'glob'

interface ComplianceResult {
  file: string
  violations: string[]
  warnings: string[]
  lineCount?: number
}

class ComplianceChecker {
  private results: ComplianceResult[] = []
  private totalViolations = 0
  private totalWarnings = 0

  /**
   * Check a single file for compliance
   */
  async checkFile(filePath: string): Promise<ComplianceResult> {
    const content = await fs.readFile(filePath, 'utf-8')
    const lines = content.split('\n')
    const result: ComplianceResult = {
      file: path.relative(process.cwd(), filePath),
      violations: [],
      warnings: [],
      lineCount: lines.length
    }

    // 1. Check file size (>500 lines is a warning)
    if (lines.length > 500) {
      result.warnings.push(`File has ${lines.length} lines (exceeds 500 line warning threshold)`)
    }

    // 2. Check for permanentLogger.captureError() usage (VIOLATION)
    if (/permanentLogger\.error\(/.test(content)) {
      result.violations.push('Uses permanentLogger.captureError() - method does not exist! Use captureError()')
    }

    // 3. Check for this.logger (should be this.logger)
    if (/this\.permanentLogger/.test(content)) {
      result.violations.push('Uses this.logger instead of this.logger')
    }

    // 4. Check for direct createClient() calls outside API routes
    const isApiRoute = filePath.includes('/api/') && filePath.endsWith('route.ts')
    const isRepository = filePath.includes('/repositories/')
    if (!isApiRoute && !isRepository && /createClient\(/.test(content)) {
      // Check if it's importing from Supabase
      if (/from ['"]@\/lib\/supabase/.test(content)) {
        result.violations.push('Direct database access outside API route (violates repository pattern)')
      }
    }

    // 5. Check for deprecated SSE imports
    if (/from ['"].*\/sse-event-factory['"]/.test(content)) {
      result.violations.push('Uses deprecated SSEEventFactory - use unified EventFactory from @/lib/realtime-events')
    }
    if (/from ['"].*\/sse-stream-manager['"]/.test(content)) {
      result.violations.push('Uses deprecated SSEStreamManager - use StreamWriter from @/lib/realtime-events')
    }

    // 6. Check for mock data patterns
    if (/mockData|fallbackData|defaultData|MOCK_|FALLBACK_/.test(content)) {
      if (!filePath.includes('test') && !filePath.includes('spec')) {
        result.warnings.push('Contains potential mock/fallback data patterns')
      }
    }

    // 7. Check for silent failures
    if (/catch\s*\([^)]*\)\s*{\s*(\/\/.*)?}/.test(content)) {
      result.violations.push('Empty catch block - potential silent failure')
    }
    if (/catch\s*\([^)]*\)\s*{\s*return\s+(null|undefined|false|\[\]|\{\})/.test(content)) {
      result.violations.push('Catch block returns fallback value - silent failure')
    }

    // 8. Check for div soup in components
    if (filePath.endsWith('.tsx')) {
      const divCount = (content.match(/<div/g) || []).length
      const semanticTags = (content.match(/<(main|section|article|nav|aside|header|footer|figure)/g) || []).length

      if (divCount > 20 && semanticTags < 3) {
        result.warnings.push(`High div usage (${divCount}) with low semantic HTML (${semanticTags} tags)`)
      }
    }

    // 9. Check for client-side UUID generation for database IDs
    if (/crypto\.randomUUID\(\)|nanoid\(\)/.test(content)) {
      // Check if it's being used for database IDs
      const surroundingLines = lines.filter(line =>
        line.includes('id:') || line.includes('id =') || line.includes('.id =')
      )
      if (surroundingLines.some(line => /id:\s*(crypto\.randomUUID|nanoid)\(\)/.test(line))) {
        // Check if it's for sessionId or correlationId (those are OK)
        if (!/sessionId|correlationId|trackingId/.test(content)) {
          result.warnings.push('Potential client-side UUID generation for database IDs')
        }
      }
    }

    // 10. Check for missing breadcrumbs at function boundaries
    const functionCount = (content.match(/async\s+\w+\s*\(|function\s+\w+\s*\(/g) || []).length
    const breadcrumbCount = (content.match(/permanentLogger\.breadcrumb\(/g) || []).length

    if (functionCount > 5 && breadcrumbCount === 0) {
      result.warnings.push(`No breadcrumbs found despite having ${functionCount} functions`)
    }

    // 11. Check for missing timing measurements
    const timingCount = (content.match(/permanentLogger\.timing\(/g) || []).length
    if (functionCount > 5 && timingCount === 0) {
      result.warnings.push(`No timing measurements despite having ${functionCount} functions`)
    }

    // 12. Check for hardcoded stage lists (should use manifest)
    if (/const\s+stages\s*=\s*\[['"]/.test(content)) {
      result.warnings.push('Hardcoded stage list - should load from PROJECT_MANIFEST.json')
    }

    // 13. Check for PM-unfriendly comments
    const technicalComments = (content.match(/\/\*\*[\s\S]*?\*\//g) || [])
      .filter(comment => {
        const hasBusinessContext = /think of|like a|imagine|for example|business/i.test(comment)
        const hasTechnicalJargon = /mutex|semaphore|goroutine|thread|heap|stack|pointer/i.test(comment)
        return !hasBusinessContext && hasTechnicalJargon
      })

    if (technicalComments.length > 3) {
      result.warnings.push('Comments may be too technical for PM audience')
    }

    // 14. Check for missing error propagation
    if (/throw new Error.*\n.*catch/.test(content)) {
      const rethrowPattern = /catch[\s\S]*?throw/
      if (!rethrowPattern.test(content)) {
        result.warnings.push('Errors caught but not re-thrown - potential error swallowing')
      }
    }

    return result
  }

  /**
   * Run compliance check on all relevant files
   */
  async runCheck(): Promise<void> {
    console.log('🔍 CLAUDE.md Compliance Checker Starting...\n')
    console.log('This checks if our code follows all the rules in CLAUDE.md\n')

    // Get all TypeScript files
    const files = await glob('**/*.{ts,tsx}', {
      cwd: process.cwd(),
      absolute: true,
      ignore: [
        '**/node_modules/**',
        '**/.next/**',
        '**/dist/**',
        '**/build/**',
        '**/archive/**',
        '**/*.test.ts',
        '**/*.spec.ts'
      ]
    })

    console.log(`📁 Checking ${files.length} files for compliance...\n`)

    // Check each file
    for (const file of files) {
      const result = await this.checkFile(file)

      if (result.violations.length > 0 || result.warnings.length > 0) {
        this.results.push(result)
        this.totalViolations += result.violations.length
        this.totalWarnings += result.warnings.length
      }
    }

    // Print results
    this.printResults()
  }

  /**
   * Print compliance check results
   */
  private printResults(): void {
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('                    COMPLIANCE CHECK RESULTS                   ')
    console.log('═══════════════════════════════════════════════════════════════\n')

    if (this.totalViolations === 0 && this.totalWarnings === 0) {
      console.log('✅ PERFECT COMPLIANCE! No violations or warnings found.\n')
      return
    }

    // Print violations first (critical)
    if (this.totalViolations > 0) {
      console.log(`❌ VIOLATIONS (${this.totalViolations} total) - MUST FIX:\n`)

      for (const result of this.results.filter(r => r.violations.length > 0)) {
        console.log(`📄 ${result.file}`)
        for (const violation of result.violations) {
          console.log(`   ❌ ${violation}`)
        }
        console.log()
      }
    }

    // Print warnings (should fix)
    if (this.totalWarnings > 0) {
      console.log(`⚠️  WARNINGS (${this.totalWarnings} total) - SHOULD FIX:\n`)

      for (const result of this.results.filter(r => r.warnings.length > 0)) {
        console.log(`📄 ${result.file}`)
        if (result.lineCount && result.lineCount > 500) {
          console.log(`   📏 ${result.lineCount} lines`)
        }
        for (const warning of result.warnings) {
          console.log(`   ⚠️  ${warning}`)
        }
        console.log()
      }
    }

    // Print summary
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('                           SUMMARY                             ')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log(`Files checked:     ${this.results.length > 0 ? 'Multiple' : '0'}`)
    console.log(`Files with issues: ${this.results.length}`)
    console.log(`Total violations:  ${this.totalViolations} ❌`)
    console.log(`Total warnings:    ${this.totalWarnings} ⚠️`)
    console.log()

    // Print next steps
    if (this.totalViolations > 0) {
      console.log('📋 NEXT STEPS:')
      console.log('1. Fix all violations immediately (breaking CLAUDE.md rules)')
      console.log('2. Address warnings to improve code quality')
      console.log('3. Run this check again to verify fixes')
      console.log()
      console.log('💡 TIP: Focus on violations first - they break core guidelines!')
    }
  }
}

// Run the compliance checker
const checker = new ComplianceChecker()
checker.runCheck().catch(console.error)