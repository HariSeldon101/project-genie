#!/usr/bin/env npx tsx

/**
 * Test generation with clean log
 */

import { logger } from './lib/utils/permanent-logger'
import { UnifiedLLMProvider } from './lib/llm/unified-provider'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function testGenerationClean() {
  console.log('\n' + '='.repeat(60))
  console.log('🧪 Testing Generation with Clean Log')
  console.log('='.repeat(60))
  
  // Clear the log file first
  logger.clear()
  console.log('✅ Log file cleared')
  
  logger.info('TEST', 'Starting clean generation test')
  
  try {
    const provider = new UnifiedLLMProvider({
      model: 'gpt-5-mini',
      maxTokens: 1000,
      reasoningEffort: 'minimal'
    })
    
    logger.info('TEST', 'Generating test content')
    
    const response = await provider.generateText({
      system: 'You are a helpful assistant.',
      user: 'Write a brief summary about cloud computing.'
    })
    
    logger.info('TEST_SUCCESS', 'Generation completed', {
      length: response.content.length,
      time: response.generationTimeMs,
      tokens: response.usage?.totalTokens
    })
    
    console.log('✅ Success!')
    console.log('   Length:', response.content.length)
    console.log('   Time:', response.generationTimeMs, 'ms')
    
  } catch (error) {
    logger.error('TEST_FAIL', 'Generation failed', error, error.stack)
    console.error('❌ Test failed:', error)
  }
  
  // Check for errors
  const errorCount = await logger.checkErrors()
  console.log(`\n📊 Errors in log: ${errorCount}`)
  
  if (errorCount > 0) {
    const errors = await logger.getRecentErrors(5)
    console.log('\nRecent errors:')
    errors.forEach((e, i) => console.log(`${i+1}. ${e.substring(0, 100)}...`))
  } else {
    console.log('✅ No errors found!')
  }
  
  console.log('\n' + '='.repeat(60))
}

testGenerationClean().catch(console.error)