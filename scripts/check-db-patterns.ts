#!/usr/bin/env npx tsx

/**
 * Static Analysis Script for Repository Pattern Compliance
 *
 * Checks all TypeScript/TSX files for direct database access
 * that violates the repository pattern required by CLAUDE.md
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

interface Violation {
  file: string
  line: number
  code: string
  pattern: string
}

/**
 * Patterns that indicate direct database access
 */
const VIOLATION_PATTERNS = [
  {
    pattern: /\.from\(['"`]company_intelligence/g,
    name: 'Direct company_intelligence table access'
  },
  {
    pattern: /\.from\(['"`]permanent_logs/g,
    name: 'Direct permanent_logs table access'
  },
  {
    pattern: /\.from\(['"`]corporate_/g,
    name: 'Direct corporate tables access'
  },
  {
    pattern: /supabase\s*\.\s*from\(/g,
    name: 'Direct Supabase from() call'
  },
  {
    pattern: /createClient[^)]*\)\s*\.\s*from\(/g,
    name: 'Immediate from() after client creation'
  }
]

/**
 * Files/directories to skip
 */
const SKIP_PATTERNS = [
  'node_modules',
  '.next',
  '.git',
  'dist',
  'build',
  '.turbo',
  'coverage',
  'public',
  '.logger-fix-backups',
  'archive'
]

/**
 * Allowed files that can make direct DB calls
 */
const ALLOWED_FILES = [
  '/repositories/',
  'monitored-client.ts',
  'base-repository.ts',
  'company-intelligence-repository.ts',
  'phase-data-repository.ts',
  'cache-manager.ts',
  'database.types.ts',
  'check-db-patterns.ts', // This file
  'permanent-logger-db.ts' // EXCEPTION: Required to avoid circular dependency - see docs/logging-architecture-exception.md
]

/**
 * Check if a file should be skipped
 */
function shouldSkipFile(path: string): boolean {
  return ALLOWED_FILES.some(allowed => path.includes(allowed))
}

/**
 * Check a single file for violations
 */
function checkFile(filePath: string): Violation[] {
  if (shouldSkipFile(filePath)) {
    return []
  }

  const violations: Violation[] = []
  const content = readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')

  VIOLATION_PATTERNS.forEach(({ pattern, name }) => {
    const matches = content.matchAll(pattern)
    for (const match of matches) {
      if (match.index !== undefined) {
        // Find line number
        let charCount = 0
        let lineNum = 0
        for (let i = 0; i < lines.length; i++) {
          charCount += lines[i].length + 1 // +1 for newline
          if (charCount > match.index) {
            lineNum = i + 1
            break
          }
        }

        violations.push({
          file: filePath,
          line: lineNum,
          code: match[0],
          pattern: name
        })
      }
    }
  })

  return violations
}

/**
 * Recursively check directory for violations
 */
function checkDirectory(dir: string): Violation[] {
  const violations: Violation[] = []

  try {
    const files = readdirSync(dir)

    for (const file of files) {
      const path = join(dir, file)

      // Skip unwanted directories
      if (SKIP_PATTERNS.some(skip => path.includes(skip))) {
        continue
      }

      const stat = statSync(path)

      if (stat.isDirectory()) {
        violations.push(...checkDirectory(path))
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        violations.push(...checkFile(path))
      }
    }
  } catch (error) {
    console.error(`Error checking directory ${dir}:`, error)
  }

  return violations
}

/**
 * Format violation for display
 */
function formatViolation(violation: Violation): string {
  const cleanPath = violation.file.replace(process.cwd(), '.')
  return `  ${cleanPath}:${violation.line} - ${violation.pattern}`
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Checking for repository pattern violations...\n')

  const violations: Violation[] = []

  // Check all relevant directories
  violations.push(...checkDirectory('./app'))
  violations.push(...checkDirectory('./lib'))
  violations.push(...checkDirectory('./components'))

  if (violations.length === 0) {
    console.log('✅ No repository pattern violations found!')
    console.log('\nAll database access is properly going through repository layer.')
    process.exit(0)
  } else {
    console.error(`❌ Found ${violations.length} repository pattern violations:\n`)

    // Group violations by file
    const byFile = violations.reduce((acc, v) => {
      if (!acc[v.file]) acc[v.file] = []
      acc[v.file].push(v)
      return acc
    }, {} as Record<string, Violation[]>)

    // Display violations
    Object.entries(byFile).forEach(([file, fileViolations]) => {
      const cleanPath = file.replace(process.cwd(), '.')
      console.error(`\n📁 ${cleanPath} (${fileViolations.length} violations):`)
      fileViolations.forEach(v => {
        console.error(`  Line ${v.line}: ${v.pattern}`)
        console.error(`    Code: ${v.code.trim()}`)
      })
    })

    console.error('\n✅ How to fix:')
    console.error('1. Import CompanyIntelligenceRepository')
    console.error('2. Use repository.getSession(), repository.createSession(), etc.')
    console.error('3. Never call supabase.from() directly outside repositories')
    console.error('\nSee CLAUDE.md for repository pattern guidelines.')

    process.exit(1)
  }
}

// Run the check
main()