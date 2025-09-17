#!/usr/bin/env tsx
/**
 * Simple test for GPT-5 with Responses API
 */

import { config } from 'dotenv'
import { OpenAIProvider } from '../../lib/llm/providers/openai'

config({ path: '.env.local' })

async function test() {
  const provider = new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-5-mini',
    maxTokens: 500
  })

  console.log('Testing GPT-5 with simple prompt...\n')
  console.time('GPT-5 Simple Test')
  
  try {
    const result = await provider.generateText({
      system: 'You are a helpful assistant',
      user: 'Write a simple JSON object with name and age fields. Return only valid JSON, no markdown.'
    })
    
    console.timeEnd('GPT-5 Simple Test')
    console.log('\n✅ Response received:')
    console.log(result)
    
    try {
      const parsed = JSON.parse(result)
      console.log('\n✅ Successfully parsed JSON:')
      console.log(parsed)
    } catch (e) {
      console.log('\n⚠️ Response is not valid JSON')
    }
  } catch (error) {
    console.timeEnd('GPT-5 Simple Test')
    console.error('\n❌ Error:', error)
  }
}

test().catch(console.error)