#!/usr/bin/env node
/**
 * Build-time validation script
 * Checks for forbidden patterns and ensures code quality
 */

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

console.log('🔍 Running COMPREHENSIVE build-time validation...')

// 1. TYPE CHECK WITH STRICT MODE
console.log('\n📝 1. Running STRICT TypeScript validation...')
try {
  execSync('npx tsc --noEmit --skipLibCheck false', { stdio: 'inherit' })
  console.log('✅ TypeScript validation passed')
} catch (error) {
  console.error('❌ TypeScript errors found!')
  console.error('⚠️  Fix TypeScript errors before committing!')
  process.exit(1)
}

// 2. NEXT.JS BUILD CHECK (Critical for catching module resolution errors!)
console.log('\n🏗️  2. Running Next.js build check...')
console.log('   This catches import errors that TypeScript misses...')
try {
  // Run build but don't output the results (just check for errors)
  execSync('next build --no-lint 2>&1', { stdio: 'pipe' })
  console.log('✅ Next.js build check passed - all modules resolve correctly!')
} catch (error) {
  console.error('❌ BUILD FAILED! Module resolution or build errors found!')
  console.error('⚠️  Run "npm run build" to see full error details')
  console.error('⚠️  This MUST be fixed before deployment!')
  process.exit(1)
}

// 3. LINT CHECK
console.log('\n🧹 3. Running ESLint validation...')
try {
  execSync('npm run lint', { stdio: 'inherit' })
  console.log('✅ ESLint validation passed')
} catch (error) {
  console.error('❌ ESLint errors found!')
  process.exit(1)
}

// 4. CUSTOM VALIDATION: Check for forbidden patterns
console.log('\n🔎 3. Checking for forbidden patterns...')

const forbiddenPatterns = [
  {
    pattern: /permanentLogger\.error\(/g,
    message: 'permanentLogger.error() does not exist! Use captureError() instead.'
  },
  {
    pattern: /permanentLogger\.log\(/g,
    message: 'permanentLogger.log() does not exist! Use info() instead.'
  },
  {
    pattern: /timer\.end\(\)/g,
    message: 'Use timer.stop() not timer.end()!'
  },
  {
    pattern: /: any[\s,;>\)]/g,
    message: 'Avoid using "any" type! Use specific types instead.'
  },
  {
    pattern: /this\.logger\.startRequest\(/g,
    message: 'this.logger.startRequest() does not exist! Use permanentLogger.timing() instead.'
  },
  {
    pattern: /streamReader\.start\(\)/g,
    message: 'streamReader.start() does not exist! Use streamReader.connect() instead.'
  }
]

function checkFile(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const errors: string[] = []

  forbiddenPatterns.forEach(({ pattern, message }) => {
    const matches = content.match(pattern)
    if (matches) {
      const lines = content.split('\n')
      matches.forEach(match => {
        const lineNum = lines.findIndex(line => line.includes(match.toString())) + 1
        errors.push(`${filePath}:${lineNum} - ${message} Found: "${match}"`)
      })
    }
  })

  return errors
}

// Recursively check all TypeScript files
function checkDirectory(dir: string): string[] {
  const errors: string[] = []

  // Skip certain directories
  const skipDirs = ['.', 'node_modules', '.next', 'dist', 'build', '.git', 'archive']

  try {
    const files = fs.readdirSync(dir)

    for (const file of files) {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)

      if (stat.isDirectory()) {
        if (!skipDirs.some(skip => file.startsWith(skip))) {
          errors.push(...checkDirectory(filePath))
        }
      } else if ((file.endsWith('.ts') || file.endsWith('.tsx')) && !file.endsWith('.d.ts')) {
        const fileErrors = checkFile(filePath)
        errors.push(...fileErrors)
      }
    }
  } catch (err) {
    console.warn(`Warning: Could not check directory ${dir}`)
  }

  return errors
}

const errors = checkDirectory('./lib')
errors.push(...checkDirectory('./app'))
errors.push(...checkDirectory('./components'))

if (errors.length > 0) {
  console.error('\n❌ Forbidden patterns found:')
  errors.forEach(err => console.error(`  ${err}`))
  console.error(`\nTotal violations: ${errors.length}`)
  process.exit(1)
} else {
  console.log('✅ No forbidden patterns found')
}

// 4. Check for specific method signatures
console.log('\n🔬 4. Verifying method signatures...')
const loggerPath = './lib/utils/permanent-logger.ts'
if (fs.existsSync(loggerPath)) {
  const content = fs.readFileSync(loggerPath, 'utf-8')

  // Verify correct methods exist
  const requiredMethods = [
    'captureError',
    'info',
    'warn',
    'debug',
    'breadcrumb',
    'timing'
  ]

  const missingMethods = requiredMethods.filter(method =>
    !content.includes(`${method}(`) && !content.includes(`${method}:`)
  )

  if (missingMethods.length > 0) {
    console.error('❌ Missing required methods in permanentLogger:', missingMethods)
    process.exit(1)
  }

  // Verify forbidden methods don't exist
  if (content.includes('error(') && !content.includes('captureError(')) {
    console.error('❌ Found forbidden error() method in permanentLogger')
    process.exit(1)
  }

  console.log('✅ Method signatures verified')
}

console.log('\n🎉 All validations passed!')
console.log('Your code meets all quality standards and can be safely committed.')