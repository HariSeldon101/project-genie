/**
 * Test PII detection fix
 * Verifies that legitimate project descriptions are allowed
 */

// Load environment variables
import { config } from 'dotenv'
config({ path: '.env.local' })

import { DataSanitizer } from './lib/llm/sanitizer'

const sanitizer = new DataSanitizer()

console.log('🧪 Testing PII Detection Fix...\n')

// Test cases that SHOULD pass (legitimate project descriptions)
const shouldPass = [
  'This is CloudSync Platform Development',
  'This is Project Genie',
  'This is Enterprise Data Sync',
  'This is a cloud-based synchronization platform',
  'Project Description: This is Modern React',
  'Overview: This is Next.js Platform'
]

// Test cases that SHOULD fail (actual PII)
const shouldFail = [
  'My name is John Smith',
  'I am Jane Doe working on this',
  "I'm Robert Johnson and this is my project"
]

console.log('✅ Testing legitimate project descriptions (SHOULD PASS):')
for (const text of shouldPass) {
  try {
    sanitizer.validatePrompt(text)
    console.log(`   ✅ PASS: "${text}"`)
  } catch (error) {
    console.error(`   ❌ FAIL: "${text}"`)
    console.error(`      Error: ${error instanceof Error ? error.message : error}`)
  }
}

console.log('\n❌ Testing actual PII patterns (SHOULD FAIL):')
for (const text of shouldFail) {
  try {
    sanitizer.validatePrompt(text)
    console.error(`   ❌ FAIL: "${text}" - Should have been blocked!`)
  } catch (error) {
    console.log(`   ✅ PASS: "${text}" - Correctly blocked`)
    console.log(`      Reason: ${error instanceof Error ? error.message : error}`)
  }
}

console.log('\n🎉 PII Detection Test Complete!')
