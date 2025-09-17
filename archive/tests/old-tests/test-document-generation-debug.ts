#!/usr/bin/env npx tsx

/**
 * Debug test for document generation with detailed logging
 */

import { DocumentGenerator } from './lib/documents/generator'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

// Enable verbose logging
process.env.DEBUG = 'true'

async function testDocumentGeneration() {
  console.log('\n' + '='.repeat(60))
  console.log('🧪 Testing Document Generation with Debug Info')
  console.log('='.repeat(60))
  
  const projectData = {
    name: 'Digital Banking Test',
    methodology: 'Agile',
    vision: 'Transform banking with digital solutions',
    businessCase: 'Reduce costs by 30% and improve customer satisfaction',
    description: 'A comprehensive digital transformation initiative',
    sector: 'Banking',
    stakeholders: [
      { placeholder: '[STAKEHOLDER_1]', role: 'Project Sponsor' },
      { placeholder: '[STAKEHOLDER_2]', role: 'Technical Lead' }
    ],
    companyWebsite: 'www.example-bank.com'
  }
  
  console.log('📋 Project:', projectData.name)
  console.log('🔧 Methodology:', projectData.methodology)
  console.log('🌍 Sector:', projectData.sector)
  
  try {
    // Initialize generator
    const generator = new DocumentGenerator({ provider: 'vercel-ai' })
    
    console.log('\n🚀 Starting document generation...\n')
    console.log('Provider info:', generator.getProviderInfo())
    
    const startTime = Date.now()
    
    // Generate all documents
    const documents = await generator.generateProjectDocuments(
      projectData,
      'test-project-' + Date.now()
    )
    
    const duration = Date.now() - startTime
    
    console.log('\n' + '='.repeat(60))
    console.log('✅ Document generation completed!')
    console.log('='.repeat(60))
    console.log(`⏱️  Total time: ${duration}ms`)
    console.log(`📄 Documents generated: ${documents.length}`)
    
    // Get aggregated metrics
    const metrics = generator.getAggregatedMetrics()
    console.log('\n💰 Aggregated Metrics:')
    console.log('  Provider:', metrics.provider)
    console.log('  Model:', metrics.model)
    console.log('  Total Input Tokens:', metrics.totalInputTokens)
    console.log('  Total Output Tokens:', metrics.totalOutputTokens)
    console.log('  Total Reasoning Tokens:', metrics.totalReasoningTokens)
    console.log('  Total Tokens:', metrics.totalTokens)
    console.log('  Document Count:', metrics.documentCount)
    console.log('  Total Generation Time:', metrics.totalGenerationTimeMs, 'ms')
    
    console.log('\n📄 Documents:')
    for (const doc of documents) {
      console.log(`\n  📝 ${doc.metadata.type}`)
      console.log(`     Content length: ${JSON.stringify(doc.content).length} chars`)
      console.log(`     Generation time: ${doc.metadata.generationTimeMs}ms`)
      console.log(`     Model: ${doc.metadata.model}`)
      
      if (doc.metadata.usage) {
        console.log(`     Tokens: ${doc.metadata.usage.totalTokens}`)
      }
      
      // Check if content is valid
      if (!doc.content || JSON.stringify(doc.content).length < 100) {
        console.error(`     ⚠️  WARNING: Content seems too short!`)
      }
    }
    
    // Get debug info
    const debugInfo = generator.getDebugInfo()
    console.log('\n🔍 Debug Info:')
    console.log(JSON.stringify(debugInfo, null, 2))
    
  } catch (error) {
    console.error('\n❌ Document generation failed!')
    console.error('Error:', error)
    
    if ((error as any).message) {
      console.error('Message:', (error as any).message)
    }
    
    if ((error as any).stack) {
      console.error('\nStack trace:')
      const stack = (error as any).stack.split('\n')
      stack.slice(0, 10).forEach((line: string) => console.error(line))
    }
    
    process.exit(1)
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('✅ Test completed successfully!')
  console.log('='.repeat(60))
}

// Run the test
testDocumentGeneration().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})