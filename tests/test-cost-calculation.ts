#!/usr/bin/env npx tsx
/**
 * Test cost calculation
 */

import * as dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') })

import { DocumentGenerator } from './lib/documents/generator'
import { SanitizedProjectData } from './lib/llm/types'

async function test() {
  console.log('\n🚀 Testing Cost Calculation\n')
  
  const testData: SanitizedProjectData = {
    projectName: 'Cost Test Project',
    vision: 'Testing cost calculation',
    businessCase: 'Ensure cost is calculated properly',
    description: 'Testing cost metrics',
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
    console.log('📝 Generating Risk Register...')
    const doc = await generator.generateDocument('risk_register', testData, 'test-cost-id')
    
    console.log('\n✅ Generation Complete!')
    console.log('=' .repeat(50))
    
    if (doc.metadata.usage) {
      console.log('📊 Usage Metrics:')
      console.log('  Input tokens:', doc.metadata.usage.inputTokens)
      console.log('  Output tokens:', doc.metadata.usage.outputTokens)
      console.log('  Total tokens:', doc.metadata.usage.totalTokens)
      console.log('  💰 Cost: $' + (doc.metadata.usage.costUsd || 0).toFixed(4))
      console.log('  Time:', doc.metadata.generationTimeMs, 'ms')
      
      if (!doc.metadata.usage.costUsd || doc.metadata.usage.costUsd === 0) {
        console.error('\n❌ Cost calculation failed - still showing $0')
      } else {
        console.log('\n✅ Cost calculation working!')
      }
    } else {
      console.error('❌ No usage metadata captured')
    }
    
  } catch (error: any) {
    console.error('❌ Failed:', error.message)
  }
  
  process.exit(0)
}

test().catch(console.error)