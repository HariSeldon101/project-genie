#!/usr/bin/env tsx

/**
 * Script to Find Unsafe JSON Parsing in API Routes
 *
 * This script identifies all API routes that use unsafe `await request.json()`
 * without proper error handling, helping to identify DRY violations that need
 * to be fixed with the shared request parser.
 *
 * Usage: npx tsx scripts/find-unsafe-json-parsing.ts
 */

import { readdir, readFile } from 'fs/promises'
import { join, relative } from 'path'
import { glob } from 'glob'

interface UnsafeRoute {
  file: string
  line: number
  code: string
  hasErrorHandling: boolean
  usesSharedParser: boolean
}

async function findUnsafeJsonParsing(): Promise<void> {
  console.log('🔍 Searching for unsafe JSON parsing in API routes...\n')

  // Find all route.ts files in the app/api directory
  const routeFiles = await glob('app/api/**/route.ts', {
    cwd: process.cwd(),
    absolute: false
  })

  const unsafeRoutes: UnsafeRoute[] = []
  const safeRoutes: string[] = []
  let totalRoutes = 0

  for (const file of routeFiles) {
    totalRoutes++
    const content = await readFile(file, 'utf-8')
    const lines = content.split('\n')

    // Check if using shared parser
    const usesSharedParser = content.includes('parseJsonRequest')

    if (usesSharedParser) {
      safeRoutes.push(file)
      continue
    }

    // Find lines with await request.json()
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line.includes('await request.json()') || line.includes('await req.json()')) {
        // Check if it's within a try-catch block
        const hasErrorHandling = checkErrorHandling(lines, i)

        unsafeRoutes.push({
          file,
          line: i + 1,
          code: line.trim(),
          hasErrorHandling,
          usesSharedParser: false
        })
      }
    }
  }

  // Display results
  console.log('📊 Analysis Results:')
  console.log('═══════════════════════════════════════════════')
  console.log(`Total API routes scanned: ${totalRoutes}`)
  console.log(`✅ Safe routes (using shared parser): ${safeRoutes.length}`)
  console.log(`⚠️  Unsafe routes (direct JSON parsing): ${unsafeRoutes.length}`)
  console.log('')

  if (safeRoutes.length > 0) {
    console.log('✅ Routes already using shared parser:')
    console.log('───────────────────────────────────────')
    safeRoutes.forEach(route => {
      console.log(`  ✓ ${route}`)
    })
    console.log('')
  }

  if (unsafeRoutes.length > 0) {
    console.log('⚠️  Routes with unsafe JSON parsing:')
    console.log('───────────────────────────────────────')

    const grouped = unsafeRoutes.reduce((acc, route) => {
      if (!acc[route.file]) acc[route.file] = []
      acc[route.file].push(route)
      return acc
    }, {} as Record<string, UnsafeRoute[]>)

    Object.entries(grouped).forEach(([file, routes]) => {
      console.log(`\n📄 ${file}`)
      routes.forEach(route => {
        const status = route.hasErrorHandling ? '⚠️  Has try-catch but not using shared parser' : '❌ No error handling'
        console.log(`   Line ${route.line}: ${status}`)
        console.log(`   Code: ${route.code}`)
      })
    })

    console.log('\n🔧 Recommended Actions:')
    console.log('═══════════════════════════════════════════════')
    console.log('1. Import the shared request parser:')
    console.log("   import { parseJsonRequest, createErrorResponse } from '@/lib/utils/request-parser'")
    console.log('')
    console.log('2. Replace unsafe parsing:')
    console.log('   // OLD (unsafe):')
    console.log('   const body = await request.json()')
    console.log('')
    console.log('   // NEW (safe):')
    console.log('   const parseResult = await parseJsonRequest(request, { schema })')
    console.log('   const errorResponse = createErrorResponse(parseResult)')
    console.log('   if (errorResponse) return errorResponse')
    console.log('   const body = parseResult.data!')
    console.log('')
    console.log('3. Add schema validation with Zod for type safety')
    console.log('')
    console.log(`📈 Potential DRY improvement: Fixing ${unsafeRoutes.length} violations with ONE shared utility!`)
  } else {
    console.log('🎉 Excellent! All routes are using safe JSON parsing!')
  }

  // Calculate metrics
  const percentageSafe = totalRoutes > 0 ? ((safeRoutes.length / totalRoutes) * 100).toFixed(1) : '0'
  console.log('\n📊 Code Quality Metrics:')
  console.log('═══════════════════════════════════════════════')
  console.log(`DRY Compliance: ${percentageSafe}% of routes use shared parser`)
  console.log(`Technical Debt: ${unsafeRoutes.length} routes need updating`)
  console.log(`Estimated Time to Fix: ${unsafeRoutes.length * 5} minutes`)
}

function checkErrorHandling(lines: string[], lineIndex: number): boolean {
  // Look backwards for try block
  let tryFound = false
  let braceCount = 0

  for (let i = lineIndex; i >= 0; i--) {
    const line = lines[i]
    if (line.includes('try {') || line.includes('try{')) {
      tryFound = true
      break
    }
    // If we hit a function declaration, we've gone too far
    if (line.includes('function ') || line.includes('=>')) {
      break
    }
  }

  // Look forward for catch block
  let catchFound = false
  for (let i = lineIndex; i < Math.min(lineIndex + 20, lines.length); i++) {
    const line = lines[i]
    if (line.includes('} catch') || line.includes('}catch')) {
      catchFound = true
      break
    }
  }

  return tryFound && catchFound
}

// Run the script
findUnsafeJsonParsing().catch(console.error)