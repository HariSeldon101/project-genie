#!/usr/bin/env npx tsx
/**
 * Test document generation with fixes
 * Tests the complete flow with usage tracking
 */

import * as dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') })
import { DocumentGenerator } from './lib/documents/generator'
import { DocumentStorage } from './lib/documents/storage'
import { SanitizedProjectData } from './lib/llm/types'
import { DevLogger } from './lib/utils/dev-logger'

async function testGeneration() {
  console.log('\n🚀 Testing Document Generation with Fixes\n')
  console.log('=' .repeat(60))
  
  DevLogger.logSection('TEST GENERATION START')
  
  const testData: SanitizedProjectData = {
    projectName: 'Test Project',
    vision: 'To test the document generation with proper usage tracking',
    businessCase: 'Ensure all documents generate with proper metrics',
    description: 'A test project to validate our fixes',
    companyWebsite: 'https://testcompany.com',
    methodology: 'prince2',
    sector: 'Technology',
    stakeholders: [
      { placeholder: '[STAKEHOLDER_1]', role: 'Project Sponsor' },
      { placeholder: '[STAKEHOLDER_2]', role: 'Development Team Lead' }
    ],
    budget: 100000,
    timeline: 6,
    projectManager: '[PROJECT_MANAGER]',
    agilometer: {
      flexibility: 50,
      collaboration: 50,
      delivery: 50,
      documentation: 50,
      governance: 50
    }
  }
  
  const generator = new DocumentGenerator()
  const storage = new DocumentStorage()
  
  try {
    // Test individual document generation
    console.log('\n📝 Testing PID Generation...')
    const pidDoc = await generator.generateDocument('pid', testData, 'test-project-id')
    
    console.log('\n✅ PID Generated:')
    console.log('  - Content type:', typeof pidDoc.content)
    console.log('  - Content keys:', Object.keys(pidDoc.content))
    console.log('  - Has usage data:', !!pidDoc.metadata.usage)
    if (pidDoc.metadata.usage) {
      console.log('  - Input tokens:', pidDoc.metadata.usage.inputTokens)
      console.log('  - Output tokens:', pidDoc.metadata.usage.outputTokens)
      console.log('  - Total tokens:', pidDoc.metadata.usage.totalTokens)
      console.log('  - Generation time:', pidDoc.metadata.generationTimeMs, 'ms')
    }
    DevLogger.logUsageTracking('PID Test', pidDoc.metadata.usage)
    
    console.log('\n📝 Testing Business Case Generation...')
    const bcDoc = await generator.generateDocument('business_case', testData, 'test-project-id')
    
    console.log('\n✅ Business Case Generated:')
    console.log('  - Content type:', typeof bcDoc.content)
    console.log('  - Content keys:', Object.keys(bcDoc.content))
    console.log('  - Has usage data:', !!bcDoc.metadata.usage)
    if (bcDoc.metadata.usage) {
      console.log('  - Input tokens:', bcDoc.metadata.usage.inputTokens)
      console.log('  - Output tokens:', bcDoc.metadata.usage.outputTokens)
      console.log('  - Total tokens:', bcDoc.metadata.usage.totalTokens)
      console.log('  - Generation time:', bcDoc.metadata.generationTimeMs, 'ms')
    }
    DevLogger.logUsageTracking('Business Case Test', bcDoc.metadata.usage)
    
    // Check if content is properly formatted
    console.log('\n🔍 Checking Document Formats:')
    console.log('PID content structure:')
    if (typeof pidDoc.content === 'object' && pidDoc.content.projectDefinition) {
      console.log('  ✅ Has proper JSON structure')
    } else if (typeof pidDoc.content === 'string') {
      console.log('  ⚠️ Content is string, needs formatting')
    } else {
      console.log('  ❌ Unknown content format')
    }
    
    console.log('Business Case content structure:')
    if (typeof bcDoc.content === 'object' && bcDoc.content.businessCase) {
      console.log('  ✅ Has proper structure')
    } else {
      console.log('  ❌ Unexpected structure')
    }
    
    // Test aggregated metrics
    const aggregated = generator.getAggregatedMetrics()
    console.log('\n📊 Aggregated Metrics:')
    console.log('  - Documents generated:', aggregated.documentCount)
    console.log('  - Total input tokens:', aggregated.totalInputTokens)
    console.log('  - Total output tokens:', aggregated.totalOutputTokens)
    console.log('  - Total tokens:', aggregated.totalTokens)
    console.log('  - Total time:', aggregated.totalGenerationTimeMs, 'ms')
    
    console.log('\n✅ Test completed successfully!')
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message)
    console.error('Stack:', error.stack)
    DevLogger.logError('Test failed', error)
  }
  
  DevLogger.logSection('TEST GENERATION END')
}

// Run the test
testGeneration().then(() => {
  console.log('\n🏁 Test execution finished')
  process.exit(0)
}).catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})