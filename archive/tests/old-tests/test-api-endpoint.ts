#!/usr/bin/env npx tsx

/**
 * Test the document generation API endpoint
 */

import fetch from 'node-fetch'

async function testDocumentGeneration() {
  console.log('\n' + '='.repeat(60))
  console.log('🧪 Testing Document Generation API Endpoint')
  console.log('='.repeat(60))
  
  const projectData = {
    name: 'Digital Banking Transformation Initiative',
    methodology: 'Agile',
    vision: 'Transform banking operations with digital-first solutions',
    businessCase: 'Improve customer experience and reduce operational costs by 30%',
    description: 'A comprehensive digital transformation of our banking services to meet modern customer expectations',
    sector: 'Banking',
    stakeholders: [
      { placeholder: '[STAKEHOLDER_1]', role: 'Project Sponsor' },
      { placeholder: '[STAKEHOLDER_2]', role: 'Technical Lead' }
    ],
    companyWebsite: 'www.example-bank.com'
  }
  
  const requestBody = {
    projectId: `test-project-${Date.now()}`,
    projectData,
    forceProvider: 'vercel-ai' // Force vercel-ai provider for testing
  }
  
  console.log('📋 Test project:', projectData.name)
  console.log('🔧 Methodology:', projectData.methodology)
  console.log('🎯 Provider:', requestBody.forceProvider)
  console.log('\nMaking API request...\n')
  
  try {
    const response = await fetch('http://localhost:3008/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      console.error('❌ API Error:', result.error)
      console.error('Details:', result.details)
      return
    }
    
    console.log('✅ Document Generation Successful!')
    console.log('-'.repeat(60))
    console.log('📊 Metrics:')
    console.log('  Provider:', result.provider)
    console.log('  Model:', result.model)
    console.log('  Documents generated:', result.metrics?.documentsGenerated)
    console.log('  Total tokens:', result.metrics?.totalTokens)
    console.log('  Generation time:', result.metrics?.generationTimeMs, 'ms')
    console.log('  Estimated cost:', '$' + (result.metrics?.estimatedCostUsd || 0).toFixed(4))
    
    console.log('\n📄 Documents Generated:')
    if (result.documents) {
      for (const doc of result.documents) {
        console.log(`\n  📝 ${doc.title}`)
        console.log(`     Type: ${doc.type}`)
        console.log(`     Version: ${doc.version}`)
        console.log(`     Content length: ${doc.content?.length || 0} chars`)
        console.log(`     Generation time: ${doc.generationTimeMs}ms`)
        
        // Check if content exists and is not empty
        if (!doc.content || doc.content.length === 0) {
          console.error('     ⚠️  WARNING: Empty content!')
        } else {
          // Show first 100 chars of content
          console.log(`     Preview: ${doc.content.substring(0, 100)}...`)
        }
      }
    }
    
    // Check for any empty documents
    const emptyDocs = result.documents?.filter((d: any) => !d.content || d.content.length === 0) || []
    if (emptyDocs.length > 0) {
      console.error(`\n⚠️  Warning: ${emptyDocs.length} documents have empty content!`)
      emptyDocs.forEach((d: any) => console.error(`  - ${d.title}`))
    } else {
      console.log('\n✅ All documents have content!')
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error)
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('✅ Test completed!')
  console.log('='.repeat(60))
}

// Run the test
testDocumentGeneration().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})