#!/usr/bin/env npx tsx

/**
 * Test generating a single document to isolate the issue
 */

import { DocumentGenerator } from './lib/documents/generator'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

async function testSingleDocument() {
  console.log('\n' + '='.repeat(60))
  console.log('🧪 Testing Single Document Generation')
  console.log('='.repeat(60))
  
  const projectData = {
    name: 'Test Project',
    methodology: 'Agile',
    vision: 'Test vision',
    businessCase: 'Test business case',
    description: 'Test description',
    sector: 'Technology',
    stakeholders: [
      { placeholder: '[STAKEHOLDER_1]', role: 'Project Manager' }
    ],
    companyWebsite: 'www.example.com'
  }
  
  console.log('📋 Project:', projectData.name)
  console.log('🔧 Methodology:', projectData.methodology)
  
  try {
    // Initialize generator with vercel-ai provider
    const generator = new DocumentGenerator({ provider: 'vercel-ai' })
    
    console.log('\n🔨 Testing Charter generation...\n')
    
    // Get sanitized data
    const DataSanitizer = (await import('./lib/llm/sanitizer')).DataSanitizer
    const sanitizer = new DataSanitizer()
    const sanitizedData = sanitizer.sanitizeProjectData(projectData)
    
    // Try to generate just the charter
    const charter = await (generator as any).generateCharter(
      sanitizedData,
      'test-project-' + Date.now()
    )
    
    console.log('✅ Charter generated successfully!')
    console.log('📊 Content length:', JSON.stringify(charter.content).length, 'chars')
    console.log('📄 Content preview:', JSON.stringify(charter.content).substring(0, 200))
    
    if (charter.metadata?.usage) {
      console.log('\n💰 Token Usage:')
      console.log('  Input tokens:', charter.metadata.usage.inputTokens)
      console.log('  Output tokens:', charter.metadata.usage.outputTokens)
      console.log('  Reasoning tokens:', charter.metadata.usage.reasoningTokens)
      console.log('  Total tokens:', charter.metadata.usage.totalTokens)
    }
    
  } catch (error) {
    console.error('\n❌ Document generation failed!')
    console.error('Error:', error)
    console.error('\nFull error details:')
    console.error(JSON.stringify(error, null, 2))
    
    if ((error as any).stack) {
      console.error('\nStack trace:')
      console.error((error as any).stack)
    }
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('Test completed')
  console.log('='.repeat(60))
}

// Run the test
testSingleDocument().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})