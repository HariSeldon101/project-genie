#!/usr/bin/env npx tsx
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { DocumentGenerator } from './lib/documents/generator'
import { DataSanitizer } from './lib/llm/sanitizer'

// Test project data for PRINCE2 documents
const testProjectData = {
  projectName: 'Digital Banking Transformation Initiative',
  vision: 'To modernize our banking operations and enhance customer experience through digital transformation',
  businessCase: 'Improve operational efficiency by 40%, reduce costs by 25%, and increase customer satisfaction scores to 90%',
  description: 'A comprehensive digital transformation program to modernize legacy banking systems and introduce innovative digital services',
  companyWebsite: 'https://example-bank.com',
  methodology: 'prince2' as const,
  sector: 'Banking & Financial Services',
  stakeholders: [
    { name: 'John Smith', email: 'john@example.com', role: 'Project Executive' },
    { name: 'Jane Doe', email: 'jane@example.com', role: 'Senior User' },
    { name: 'Bob Wilson', email: 'bob@example.com', role: 'Senior Supplier' }
  ],
  agilometer: {
    flexibility: 30,
    teamExperience: 70,
    riskTolerance: 40,
    documentation: 80,
    governance: 90
  }
}

async function testFullIntegration() {
  console.log('========================================')
  console.log('FULL INTEGRATION TEST - ALL PRINCE2 DOCS')
  console.log('========================================')
  console.log('Target: Generate all 6 PRINCE2 documents')
  console.log('Model: GPT-5 nano')
  console.log('Provider: vercel-ai')
  console.log('========================================\n')
  
  const sanitizer = new DataSanitizer()
  const generator = new DocumentGenerator({ provider: 'vercel-ai', useCache: false })
  
  try {
    // Step 1: Sanitize data
    console.log('📋 Step 1: Sanitizing project data...')
    const sanitized = sanitizer.sanitizeProjectData(testProjectData)
    console.log('✅ Data sanitized successfully\n')
    
    // Step 2: Generate all documents
    console.log('📋 Step 2: Generating all PRINCE2 documents...')
    const startTime = Date.now()
    const projectId = 'test-project-' + Date.now()
    
    const documents = await generator.generateProjectDocuments(
      testProjectData,
      projectId
    )
    
    const duration = Date.now() - startTime
    console.log(`\n✅ Generation complete in ${Math.round(duration / 1000)} seconds`)
    console.log(`Generated ${documents.length} documents\n`)
    
    // Step 3: Analyze each document
    console.log('📋 Step 3: Analyzing generated documents...\n')
    
    const documentStats = documents.map(doc => {
      const contentStr = typeof doc.content === 'string' 
        ? doc.content 
        : JSON.stringify(doc.content)
      
      return {
        type: doc.type,
        size: contentStr.length,
        hasContent: contentStr.length > 100,
        isJson: typeof doc.content === 'object',
        metadata: doc.metadata
      }
    })
    
    // Expected document types for PRINCE2
    const expectedTypes = [
      'pid',
      'business_case',
      'risk_register',
      'project_plan',
      'technical_landscape',
      'comparable_projects'
    ]
    
    // Check which documents were generated
    console.log('Document generation results:')
    expectedTypes.forEach(type => {
      const doc = documentStats.find(d => d.type === type)
      if (doc) {
        const status = doc.hasContent ? '✅' : '❌'
        const format = doc.isJson ? 'JSON' : 'TEXT'
        console.log(`  ${status} ${type}: ${doc.size} chars (${format})`)
      } else {
        console.log(`  ❌ ${type}: NOT GENERATED`)
      }
    })
    
    // Step 4: Save outputs for inspection
    const outputDir = './test-outputs/integration'
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }
    
    const timestamp = Date.now()
    documents.forEach(doc => {
      const filename = `${doc.type}-${timestamp}.json`
      const filepath = path.join(outputDir, filename)
      fs.writeFileSync(filepath, JSON.stringify(doc, null, 2))
    })
    
    console.log(`\n📋 Step 4: Outputs saved to ${outputDir}`)
    
    // Step 5: Calculate success metrics
    const successCount = documentStats.filter(d => d.hasContent).length
    const totalExpected = expectedTypes.length
    const successRate = (successCount / totalExpected * 100).toFixed(1)
    
    console.log('\n📋 Step 5: Success metrics')
    console.log(`  Documents generated: ${successCount}/${totalExpected}`)
    console.log(`  Success rate: ${successRate}%`)
    console.log(`  Total content size: ${documentStats.reduce((sum, d) => sum + d.size, 0)} chars`)
    
    // Step 6: Token usage estimate
    console.log('\n📋 Step 6: Token usage estimate')
    const totalChars = documentStats.reduce((sum, d) => sum + d.size, 0)
    const estimatedTokens = Math.ceil(totalChars / 4)
    const estimatedCost = (estimatedTokens / 1_000_000 * 0.200) // Output tokens only
    console.log(`  Total output: ~${estimatedTokens} tokens`)
    console.log(`  Estimated cost: ~$${estimatedCost.toFixed(3)}`)
    
    // Final verdict
    console.log('\n========================================')
    if (successCount === totalExpected) {
      console.log('🎉 SUCCESS: ALL DOCUMENTS GENERATED!')
      console.log('All 6 PRINCE2 documents were generated successfully.')
      return true
    } else if (successCount >= 4) {
      console.log('⚠️  PARTIAL SUCCESS')
      console.log(`${successCount} out of ${totalExpected} documents generated.`)
      const failed = expectedTypes.filter(type => 
        !documentStats.find(d => d.type === type && d.hasContent)
      )
      console.log('Failed documents:', failed.join(', '))
      return false
    } else {
      console.log('❌ FAILURE')
      console.log(`Only ${successCount} out of ${totalExpected} documents generated.`)
      return false
    }
    
  } catch (error: any) {
    console.log('========================================')
    console.log('❌ INTEGRATION TEST FAILED')
    console.log('Error:', error.message)
    console.log('\nStack trace:')
    console.log(error.stack)
    return false
  }
}

// Run the test
testFullIntegration().then(success => {
  if (success) {
    console.log('\n✅ Integration test passed - all documents working!')
    process.exit(0)
  } else {
    console.log('\n❌ Integration test failed - check logs above')
    process.exit(1)
  }
}).catch(error => {
  console.error('Unexpected error:', error)
  process.exit(1)
})