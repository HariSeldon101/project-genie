#!/usr/bin/env npx tsx
/**
 * Test script for logger signature fixes
 * Tests the regex patterns before applying to all files
 */

const testCases = [
  {
    name: 'Simple case with category only',
    input: `permanentLogger.info('STREAM_WRITER', 'Stream closed', { sessionId: this.sessionId })`,
    expected: `permanentLogger.info('STREAM_WRITER', 'Stream closed', { sessionId: this.sessionId })`
  },
  {
    name: 'Case with trailing comma after category',
    input: `permanentLogger.info('STREAM_WRITER', 'Client disconnected (abort signal)', { sessionId, correlationId })`,
    expected: `permanentLogger.info('STREAM_WRITER', 'Client disconnected (abort signal)', { sessionId, correlationId })`
  },
  {
    name: 'Case with spread operator',
    input: `permanentLogger.info('LLM_ERROR', 'LLM Call Failed', { ...context, duration: 123 })`,
    expected: `permanentLogger.info('LLM_ERROR', 'LLM Call Failed', { ...context, duration: 123 })`
  },
  {
    name: 'Multi-line case',
    input: `permanentLogger.info('Starting validation', {
      category: 'VALIDATOR',
      url: someUrl,
      timestamp: Date.now()
    })`,
    expected: `permanentLogger.info('VALIDATOR', 'Starting validation', {
      url: someUrl,
      timestamp: Date.now()
    })`
  },
  {
    name: 'Already correct - should not change',
    input: `permanentLogger.info('CATEGORY', 'message', { data: 123 })`,
    expected: `permanentLogger.info('CATEGORY', 'message', { data: 123 })`
  }
]

function fixLoggerSignature(input: string): string {
  // Skip if already correct (first param is CAPS_UNDERSCORES)
  if (/permanentLogger\.(info|warn|debug|captureError)\(\s*['"][A-Z_]+['"]/.test(input)) {
    return input
  }

  // Match the incorrect pattern:
  // permanentLogger.METHOD('message', { category: 'CATEGORY', ...rest })
  const regex = /permanentLogger\.(info|warn|debug|captureError)\(\s*['"]([^'"]+)['"]\s*,\s*\{([^}]*)\}/

  const match = input.match(regex)
  if (!match) {
    return input
  }

  const [fullMatch, method, message, dataContent] = match

  // Extract category from the data content
  const categoryMatch = dataContent.match(/category:\s*['"]([A-Z_]+)['"]/)
  if (!categoryMatch) {
    return input // No category found, leave as is
  }

  const category = categoryMatch[1]

  // Remove the category from the data content
  let cleanedData = dataContent
    .replace(/category:\s*['"][A-Z_]+['"]\s*,?\s*/, '') // Remove category and optional comma
    .trim()

  // Build the fixed version
  if (cleanedData) {
    // Has additional data
    return input.replace(
      regex,
      `permanentLogger.${method}('${category}', '${message}', { ${cleanedData} })`
    )
  } else {
    // No additional data
    return input.replace(
      regex,
      `permanentLogger.${method}('${category}', '${message}')`
    )
  }
}

// Run tests
console.log('🧪 Testing logger signature fixes...\n')

let passed = 0
let failed = 0

for (const test of testCases) {
  const result = fixLoggerSignature(test.input)
  const success = result === test.expected

  if (success) {
    console.log(`✅ ${test.name}`)
    passed++
  } else {
    console.log(`❌ ${test.name}`)
    console.log(`   Input:    ${test.input}`)
    console.log(`   Expected: ${test.expected}`)
    console.log(`   Got:      ${result}`)
    failed++
  }
}

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`)

if (failed === 0) {
  console.log('✨ All tests passed! The fix function is working correctly.')
} else {
  console.log('⚠️  Some tests failed. The fix function needs adjustment.')
}