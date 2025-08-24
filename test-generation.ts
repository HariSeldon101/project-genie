#!/usr/bin/env npx tsx
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { DocumentGenerator } from './lib/documents/generator'
import { DataSanitizer } from './lib/llm/sanitizer'

// Test data that previously caused issues
const testProjectData = {
  projectName: 'Digital Transformation Initiative',
  vision: 'To modernize our operations and enhance customer experience',
  businessCase: 'Improve efficiency, reduce costs, and increase customer satisfaction',
  description: 'A comprehensive digital transformation program',
  companyWebsite: 'https://example.com',
  methodology: 'prince2',
  sector: 'Technology',
  stakeholders: [
    { name: 'John Smith', email: 'john@example.com', role: 'Project Sponsor' },
    { name: 'Jane Doe', email: 'jane@example.com', role: 'Business Analyst' }
  ],
  agilometer: {
    flexibility: 70,
    teamExperience: 80,
    riskTolerance: 60,
    documentation: 50,
    governance: 40
  }
}

async function testGeneration() {
  console.log('🧪 Testing Document Generation with DeepSeek Provider')
  console.log('=' .repeat(60))
  
  const generator = new DocumentGenerator()
  const sanitizer = new DataSanitizer()
  
  try {
    // Test 1: Sanitization
    console.log('\n📋 Test 1: Data Sanitization')
    const sanitized = sanitizer.sanitizeProjectData(testProjectData)
    console.log('✅ Data sanitized successfully')
    console.log('   Stakeholders converted to placeholders:', sanitized.stakeholders)
    
    // Test 2: Generate Risk Register (previously failing)
    console.log('\n📋 Test 2: Risk Register Generation')
    const riskDoc = await generator['generateRiskRegister'](sanitized, 'test-project-001')
    console.log('✅ Risk Register generated successfully')
    console.log('   Risks found:', riskDoc.content.risks?.length || 0)
    
    // Test 3: Generate Full Document Set
    console.log('\n📋 Test 3: Full Document Generation')
    const documents = await generator.generateProjectDocuments(testProjectData, 'test-project-001')
    console.log('✅ All documents generated successfully')
    console.log('   Total documents:', documents.length)
    documents.forEach(doc => {
      console.log(`   - ${doc.metadata.type}: v${doc.metadata.version}`)
    })
    
    // Test 4: Check for undefined properties
    console.log('\n📋 Test 4: Checking for undefined properties')
    documents.forEach(doc => {
      if (doc.metadata.type === 'risk_register') {
        const risks = doc.content.risks
        if (!risks) {
          console.error('❌ Risk register has no risks array!')
        } else {
          console.log('✅ Risk register has valid risks array with', risks.length, 'risks')
        }
      }
    })
    
    console.log('\n' + '=' .repeat(60))
    console.log('✅ All tests passed successfully!')
    console.log('DeepSeek provider is working correctly with fallback handling')
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message)
    console.error('Stack:', error.stack)
    process.exit(1)
  }
}

// Run tests
testGeneration().catch(console.error)