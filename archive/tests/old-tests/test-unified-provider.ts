#!/usr/bin/env npx tsx

/**
 * Test the unified LLM provider
 */

import { UnifiedLLMProvider } from './lib/llm/unified-provider'
import { z } from 'zod'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const TestSchema = z.object({
  title: z.string(),
  summary: z.string(),
  points: z.array(z.string())
})

async function testUnifiedProvider() {
  console.log('\n' + '='.repeat(60))
  console.log('🧪 Testing Unified LLM Provider')
  console.log('='.repeat(60))
  
  try {
    const provider = new UnifiedLLMProvider({
      model: 'gpt-5-mini',
      maxTokens: 1000,
      reasoningEffort: 'minimal'
    })
    
    console.log('\n📋 Provider Info:')
    console.log(provider.getProviderInfo())
    
    // Test 1: Text Generation
    console.log('\n1️⃣ Testing Text Generation...')
    const textResponse = await provider.generateText({
      system: 'You are a helpful assistant.',
      user: 'Write a 2-sentence summary about cloud computing benefits.'
    })
    
    console.log('✅ Text generated successfully')
    console.log('   Length:', textResponse.content.length, 'chars')
    console.log('   Time:', textResponse.generationTimeMs, 'ms')
    console.log('   Content:', textResponse.content.substring(0, 100) + '...')
    
    // Test 2: JSON Generation
    console.log('\n2️⃣ Testing JSON Generation...')
    const jsonResponse = await provider.generateJSON(
      {
        system: 'You are a helpful assistant that generates structured data.',
        user: 'Create a project summary with title, summary (2 sentences), and 3 key points about digital transformation.'
      },
      TestSchema
    )
    
    console.log('✅ JSON generated successfully')
    console.log('   Title:', jsonResponse.content.title)
    console.log('   Points:', jsonResponse.content.points.length)
    console.log('   Time:', jsonResponse.generationTimeMs, 'ms')
    
    // Test 3: Health Check
    console.log('\n3️⃣ Testing Health Check...')
    const isHealthy = await provider.healthCheck()
    console.log(isHealthy ? '✅ Provider is healthy' : '❌ Provider health check failed')
    
    // Show usage metrics
    if (jsonResponse.usage) {
      console.log('\n💰 Token Usage:')
      console.log('   Input:', jsonResponse.usage.inputTokens)
      console.log('   Output:', jsonResponse.usage.outputTokens)
      console.log('   Reasoning:', jsonResponse.usage.reasoningTokens)
      console.log('   Total:', jsonResponse.usage.totalTokens)
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error)
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('✅ All tests completed!')
  console.log('='.repeat(60))
}

// Run the test
testUnifiedProvider().catch(console.error)