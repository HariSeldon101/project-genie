#!/usr/bin/env npx tsx
/**
 * Test storing document with cost
 */

import * as dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') })

import { DocumentStorage } from './lib/documents/storage'
import { GeneratedDocument } from './lib/llm/types'

async function test() {
  console.log('\n🚀 Testing Document Storage with Cost\n')
  
  const storage = new DocumentStorage()
  
  const testDoc: GeneratedDocument = {
    metadata: {
      projectId: 'ac851696-16bc-4868-a84a-79e40bcb9950', // Real project ID
      type: 'test_document',
      methodology: 'agile',
      version: 1,
      generatedAt: new Date(),
      llmProvider: 'vercel-ai',
      model: 'gpt-5-mini',
      usage: {
        inputTokens: 1000,
        outputTokens: 2000,
        totalTokens: 3000,
        costUsd: 0.225  // $0.025 + $0.20 = $0.225
      },
      generationTimeMs: 5000,
      temperature: 0.7,
      maxTokens: 4000,
      reasoningEffort: 'medium'
    },
    content: {
      test: 'This is a test document with cost data'
    }
  }
  
  try {
    // Use a test user ID
    const testUserId = 'de604769-70c7-40e0-b12a-5c34f0d5bd76' // Valid UUID format
    
    console.log('📝 Storing document with cost data:')
    console.log('  Tokens:', testDoc.metadata.usage?.totalTokens)
    console.log('  Cost: $' + (testDoc.metadata.usage?.costUsd || 0).toFixed(4))
    
    const ids = await storage.storeDocuments([testDoc], testUserId)
    
    if (ids.length > 0) {
      console.log('✅ Document stored with ID:', ids[0])
      
      // Now retrieve it to verify cost was stored
      const stored = await storage.getDocument(ids[0])
      console.log('\n📊 Retrieved document:')
      console.log('  Tokens:', stored.generation_tokens)
      console.log('  Cost: $' + (stored.generation_cost || 0).toFixed(4))
      
      if (!stored.generation_cost || stored.generation_cost === 0) {
        console.error('\n❌ Cost was not stored in database!')
      } else {
        console.log('\n✅ Cost successfully stored!')
      }
    }
    
  } catch (error: any) {
    console.error('❌ Failed:', error.message)
  }
  
  process.exit(0)
}

test().catch(console.error)