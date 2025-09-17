#!/usr/bin/env npx tsx

/**
 * Test analytics fix - ensure no UUID errors
 */

import { DocumentStorage } from './lib/documents/storage'
import { logger } from './lib/utils/permanent-logger'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function testAnalyticsFix() {
  console.log('\n' + '='.repeat(60))
  console.log('🧪 Testing Analytics Fix')
  console.log('='.repeat(60))
  
  // Clear log
  logger.clear()
  
  try {
    const storage = new DocumentStorage()
    
    // Test with no user (should skip analytics)
    console.log('\n1. Testing without user (should skip analytics)...')
    
    const testDoc = {
      content: 'Test content',
      metadata: {
        projectId: 'test-project-123',
        type: 'test',
        version: 1,
        usage: { totalTokens: 100 }
      }
    }
    
    const testMetrics = {
      provider: 'test',
      model: 'test-model',
      totalTokens: 100,
      generationTimeMs: 1000,
      success: true
    }
    
    // This should not throw UUID error
    await storage.storeDocuments([testDoc], 'test-user-id', testMetrics)
    
    console.log('✅ No error thrown!')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
  
  // Check for errors
  const errorCount = await logger.checkErrors()
  console.log(`\n📊 Errors in log: ${errorCount}`)
  
  if (errorCount === 0) {
    console.log('✅ SUCCESS: No UUID errors!')
  } else {
    console.log('❌ FAILED: Errors still present')
    const errors = await logger.getRecentErrors(3)
    errors.forEach((e, i) => console.log(`\nError ${i+1}:`, e.substring(0, 200)))
  }
  
  console.log('\n' + '='.repeat(60))
}

testAnalyticsFix().catch(console.error)