#!/usr/bin/env npx tsx

/**
 * Test script for GPT-5 Responses API fix
 * This verifies that GPT-5 models now correctly use the Responses API
 * and return actual content instead of empty responses
 */

import { VercelAIProvider } from './lib/llm/providers/vercel-ai'
import { LLMPrompt } from './lib/llm/types'
import { z } from 'zod'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

// Test schema
const TestSchema = z.object({
  title: z.string(),
  summary: z.string(),
  items: z.array(z.string()),
  analysis: z.object({
    strengths: z.array(z.string()),
    opportunities: z.array(z.string())
  })
})

async function testVercelAIProvider() {
  console.log('\n' + '='.repeat(60))
  console.log('🧪 Testing GPT-5 with Responses API Fix')
  console.log('='.repeat(60))
  
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('❌ Missing OPENAI_API_KEY')
    process.exit(1)
  }
  
  console.log('✅ API Key found:', apiKey.substring(0, 10) + '...')
  
  // Initialize provider
  const provider = new VercelAIProvider({
    apiKey,
    model: 'gpt-5-mini',
    maxTokens: 1500
  })
  
  // Test prompts
  const testPrompts: { name: string, prompt: LLMPrompt }[] = [
    {
      name: 'Simple JSON Generation',
      prompt: {
        system: 'You are a helpful assistant that generates structured JSON data.',
        user: `Create a project analysis with the following structure:
- title: "Digital Banking Platform"
- summary: A brief 2-sentence summary
- items: List exactly 3 key features
- analysis with strengths (2 items) and opportunities (2 items)`,
        maxTokens: 1000,
        reasoningEffort: 'minimal'
      }
    },
    {
      name: 'Complex Document Generation',
      prompt: {
        system: 'You are a project manager creating structured documentation.',
        user: `Generate a risk assessment for a cloud migration project with:
- title: The project title
- summary: Executive summary (2 sentences)
- items: List exactly 5 major risks
- analysis: Include 3 strengths and 3 opportunities`,
        maxTokens: 1500,
        reasoningEffort: 'low'
      }
    }
  ]
  
  // Run tests
  for (const { name, prompt } of testPrompts) {
    console.log(`\n📋 Test: ${name}`)
    console.log('-'.repeat(40))
    
    try {
      const startTime = Date.now()
      
      // Test generateJSON with the schema
      const result = await provider.generateJSON(prompt, TestSchema)
      
      const duration = Date.now() - startTime
      
      console.log('✅ Success!')
      console.log(`⏱️  Duration: ${duration}ms`)
      console.log('📊 Result structure:')
      console.log('  - Title:', result.title)
      console.log('  - Summary length:', result.summary.length, 'chars')
      console.log('  - Items count:', result.items.length)
      console.log('  - Strengths count:', result.analysis.strengths.length)
      console.log('  - Opportunities count:', result.analysis.opportunities.length)
      
      // Validate content is not empty
      if (!result.title || !result.summary || result.items.length === 0) {
        console.error('⚠️  Warning: Some fields are empty!')
      }
      
      // Show sample content
      console.log('\n📝 Sample content:')
      console.log('  Title:', result.title)
      console.log('  First item:', result.items[0])
      console.log('  First strength:', result.analysis.strengths[0])
      
    } catch (error) {
      console.error('❌ Test failed:', error)
      console.error('Error details:', {
        message: (error as any).message,
        stack: (error as any).stack?.split('\n')[0]
      })
    }
  }
  
  // Test text generation as well
  console.log('\n' + '='.repeat(60))
  console.log('🧪 Testing Text Generation')
  console.log('='.repeat(60))
  
  try {
    const textPrompt: LLMPrompt = {
      system: 'You are a helpful assistant.',
      user: 'Write a 3-sentence summary about the benefits of cloud computing.',
      maxTokens: 500,
      reasoningEffort: 'minimal'
    }
    
    const startTime = Date.now()
    const text = await provider.generateText(textPrompt)
    const duration = Date.now() - startTime
    
    console.log('✅ Text generation successful!')
    console.log(`⏱️  Duration: ${duration}ms`)
    console.log('📝 Length:', text.length, 'chars')
    console.log('📄 Content:', text.substring(0, 200) + (text.length > 200 ? '...' : ''))
    
  } catch (error) {
    console.error('❌ Text generation failed:', error)
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('✅ All tests completed!')
  console.log('='.repeat(60))
}

// Run the tests
testVercelAIProvider().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})