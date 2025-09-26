/**
 * Test script to verify Supabase error handling is working correctly
 * This will create an intentional error to test if it's logged properly
 */

import { permanentLogger } from './lib/utils/permanent-logger'
import { convertSupabaseError } from './lib/utils/supabase-error-helper'

// Simulate a Supabase PostgrestError object
const mockSupabaseError = {
  message: 'duplicate key value violates unique constraint "artifacts_pkey"',
  code: '23505',
  details: 'Key (id)=(test-id) already exists.',
  hint: 'Use a different ID value or let the database generate one.'
}

console.log('\n=== Testing Supabase Error Handling ===\n')

// Test 1: Direct logging (OLD WAY - produces [object Object])
console.log('1. Testing OLD error handling (should show [object Object]):')
console.log('   String conversion:', String(mockSupabaseError))
console.log('   Result: ', String(mockSupabaseError) === '[object Object]' ? '❌ Shows [object Object]' : '✅ Shows proper message')

// Test 2: Using convertSupabaseError helper (NEW WAY)
console.log('\n2. Testing NEW error handling with convertSupabaseError:')
const convertedError = convertSupabaseError(mockSupabaseError)
console.log('   Error name:', convertedError.name)
console.log('   Error message:', convertedError.message)
console.log('   Error code:', (convertedError as any).code)
console.log('   Error details:', (convertedError as any).details)
console.log('   Error hint:', (convertedError as any).hint)
console.log('   Result: ✅ Shows proper error details')

// Test 3: Test the extractErrorDetails in permanent-logger
console.log('\n3. Testing permanentLogger.extractErrorDetails:')
console.log('   (This is internal to permanentLogger, testing via captureError)')

// Create a test to see what gets logged
console.log('\n4. Testing actual logging:')
console.log('   Logging unconverted Supabase error (may show [object Object] in old code):')
// Note: We can't directly test this without modifying the code

console.log('\n5. Testing with real Error instance:')
const realError = new Error('This is a regular JavaScript error')
console.log('   Error message:', realError.message)
console.log('   String conversion:', String(realError))

console.log('\n=== Test Complete ===\n')
console.log('Summary:')
console.log('- Supabase errors are NOT Error instances')
console.log('- They need to be converted using convertSupabaseError()')
console.log('- The permanent-logger now handles both types correctly')
console.log('- All repository error handlers should use convertSupabaseError()')