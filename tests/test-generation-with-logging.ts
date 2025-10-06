#!/usr/bin/env npx tsx

/**
 * Test document generation with permanent logging
 */

import { logger } from './lib/utils/permanent-logger'
import { UnifiedLLMProvider } from './lib/llm/unified-provider'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function testGenerationWithLogging() {
  console.log('\n' + '='.repeat(60))
  console.log('🧪 Testing Document Generation with Permanent Logging')
  console.log('='.repeat(60))
  
  logger.info('TEST_START', 'Starting generation test with permanent logging')
  
  try {
    // Test 1: Initialize provider
    logger.info('TEST', 'Initializing UnifiedLLM Provider')
    const provider = new UnifiedLLMProvider({
      model: 'gpt-5-mini',
      maxTokens: 1000,
      reasoningEffort: 'minimal'
    })
    
    // Test 2: Generate text
    logger.info('TEST', 'Generating text response')
    const response = await provider.generateText({
      system: 'You are a helpful assistant.',
      user: 'Write a brief project description for a task management app.'
    })
    
    logger.info('TEST', 'Text generation completed', {
      responseLength: response.content.length,
      timeMs: response.generationTimeMs,
      model: response.model,
      tokens: response.usage?.totalTokens
    })
    
    console.log('✅ Generation successful!')
    console.log('   Response length:', response.content.length)
    console.log('   Time:', response.generationTimeMs, 'ms')
    
    // Test 3: Check for errors in log
    const errorCount = await logger.checkErrors()
    console.log(`\n📊 Log Analysis: ${errorCount} errors found`)
    
    if (errorCount > 0) {
      const recentErrors = await logger.getRecentErrors(5)
      console.log('\n❌ Recent errors:')
      recentErrors.forEach((error, i) => {
        console.log(`${i + 1}. ${error.substring(0, 200)}...`)
      })
    }
    
    logger.info('TEST_COMPLETE', 'Generation test completed successfully', {
      errorCount,
      success: true
    })
    
  } catch (error) {
    logger.error('TEST_ERROR', 'Generation test failed', error, error.stack)
    console.error('Test failed:', error)
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('📝 Check claude-code-dev-log.md for complete logs')
  console.log('='.repeat(60))
}

// Run the test
testGenerationWithLogging().catch(console.error)