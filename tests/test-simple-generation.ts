#!/usr/bin/env npx tsx
/**
 * Simple test for document generation
 */

import * as dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') })

import { DocumentGenerator } from './lib/documents/generator'
import { SanitizedProjectData } from './lib/llm/types'

async function test() {
  console.log('\n🚀 Simple Generation Test\n')
  
  const testData: SanitizedProjectData = {
    projectName: 'Quick Test Project',
    vision: 'Testing document generation',
    businessCase: 'Validate fixes work properly',
    description: 'A simple test',
    companyWebsite: 'https://test.com',
    methodology: 'prince2',
    sector: 'Technology',
    stakeholders: [
      { placeholder: '[STAKEHOLDER_1]', role: 'Sponsor' }
    ],
    budget: 50000,
    timeline: 3,
    projectManager: '[PM]'
  }
  
  const generator = new DocumentGenerator()
  
  try {
    console.log('📝 Generating Business Case...')
    const doc = await generator.generateDocument('business_case', testData, 'test-id')
    
    console.log('✅ Success!')
    console.log('  Content type:', typeof doc.content)
    console.log('  Has usage?', !!doc.metadata.usage)
    if (doc.metadata.usage) {
      console.log('  Tokens:', doc.metadata.usage.totalTokens)
      console.log('  Time:', doc.metadata.generationTimeMs, 'ms')
    }
    
    // Check content structure
    if (doc.content && doc.content.businessCase) {
      console.log('  ✅ Proper structure')
      console.log('  Content length:', doc.content.businessCase.length, 'chars')
    } else {
      console.log('  ❌ Wrong structure:', Object.keys(doc.content))
    }
    
  } catch (error: any) {
    console.error('❌ Failed:', error.message)
  }
  
  process.exit(0)
}

test().catch(console.error)