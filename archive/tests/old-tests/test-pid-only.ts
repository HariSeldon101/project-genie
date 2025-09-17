#!/usr/bin/env npx tsx
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { DocumentGenerator } from './lib/documents/generator'
import { DataSanitizer } from './lib/llm/sanitizer'

// Test project data for PRINCE2 PID
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

async function testPIDGeneration() {
  console.log('========================================')
  console.log('PID GENERATION TEST - FOCUSED')
  console.log('========================================')
  console.log('Target: Generate complete PRINCE2 PID')
  console.log('Model: GPT-5 nano')
  console.log('Provider: vercel-ai')
  console.log('========================================\n')
  
  const sanitizer = new DataSanitizer()
  const generator = new DocumentGenerator({ provider: 'vercel-ai' })
  
  try {
    // Step 1: Sanitize data
    console.log('📋 Step 1: Sanitizing project data...')
    const sanitized = sanitizer.sanitizeProjectData(testProjectData)
    console.log('✅ Data sanitized successfully')
    console.log('   Stakeholders converted to:', sanitized.stakeholders)
    console.log()
    
    // Step 2: Generate PID
    console.log('📋 Step 2: Generating PID document...')
    const startTime = Date.now()
    
    // Call the private method directly for testing
    const pidDoc = await (generator as any).generatePrince2PID(sanitized, 'test-pid-' + Date.now())
    
    const duration = Date.now() - startTime
    console.log(`✅ PID generated in ${duration}ms`)
    console.log()
    
    // Step 3: Analyze the response
    console.log('📋 Step 3: Analyzing PID content...')
    const content = pidDoc.content
    const contentStr = JSON.stringify(content, null, 2)
    
    console.log('Document metadata:')
    console.log('  - Type:', pidDoc.metadata.type)
    console.log('  - Methodology:', pidDoc.metadata.methodology)
    console.log('  - Provider:', pidDoc.metadata.llmProvider)
    console.log('  - Model:', pidDoc.metadata.model)
    console.log('  - Reasoning Effort:', pidDoc.metadata.reasoningEffort)
    console.log()
    
    console.log('Content analysis:')
    console.log('  - Total size:', contentStr.length, 'characters')
    console.log('  - Sections found:', Object.keys(content || {}))
    console.log()
    
    // Step 4: Verify required PID sections
    console.log('📋 Step 4: Verifying PID sections...')
    const requiredSections = [
      'projectDefinition',
      'businessCase',
      'projectOrganization',
      'qualityManagementApproach',
      'projectPlan',
      'projectControls',
      'riskManagementApproach',
      'configurationManagementApproach',
      'communicationManagementApproach',
      'projectTolerances'
    ]
    
    const missingSections = requiredSections.filter(section => !content[section])
    
    if (missingSections.length === 0) {
      console.log('✅ All required PID sections present!')
      requiredSections.forEach(section => {
        const sectionContent = content[section]
        const sectionLength = typeof sectionContent === 'string' 
          ? sectionContent.length 
          : JSON.stringify(sectionContent).length
        console.log(`   - ${section}: ${sectionLength} chars`)
      })
    } else {
      console.log('❌ Missing PID sections:', missingSections)
    }
    console.log()
    
    // Step 5: Save output for inspection
    const outputDir = './test-outputs'
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }
    
    const outputFile = path.join(outputDir, `pid-test-${Date.now()}.json`)
    fs.writeFileSync(outputFile, contentStr)
    console.log('📋 Step 5: Output saved for inspection')
    console.log('   File:', outputFile)
    console.log()
    
    // Step 6: Token usage estimation
    console.log('📋 Step 6: Token usage analysis')
    const inputTokens = Math.ceil((pidDoc.metadata.prompt?.system.length + pidDoc.metadata.prompt?.user.length) / 4)
    const outputTokens = Math.ceil(contentStr.length / 4)
    const totalTokens = inputTokens + outputTokens
    
    console.log('  Estimated tokens:')
    console.log('    - Input:', inputTokens)
    console.log('    - Output:', outputTokens)
    console.log('    - Total:', totalTokens)
    
    const cost = (inputTokens / 1_000_000 * 0.025) + (outputTokens / 1_000_000 * 0.200)
    console.log('  Estimated cost: $' + cost.toFixed(4))
    console.log()
    
    // Final verdict
    console.log('========================================')
    if (missingSections.length === 0 && contentStr.length > 1000) {
      console.log('🎉 SUCCESS: PID GENERATION WORKING!')
      console.log('The PID document is complete with all required sections.')
      console.log('Total content size:', contentStr.length, 'characters')
      return true
    } else {
      console.log('❌ FAILURE: PID GENERATION INCOMPLETE')
      if (missingSections.length > 0) {
        console.log('Missing sections:', missingSections.join(', '))
      }
      if (contentStr.length <= 1000) {
        console.log('Content too short:', contentStr.length, 'characters')
      }
      return false
    }
    
  } catch (error: any) {
    console.log('========================================')
    console.log('❌ PID GENERATION FAILED')
    console.log('Error:', error.message)
    
    // Check if it's a token limit error
    if (error.message.includes('empty') || error.message.includes('length')) {
      console.log('\n⚠️ This appears to be a token limit issue.')
      console.log('Current PID token limit: 5000')
      console.log('Recommendation: Increase to 7500 or 10000 tokens')
    }
    
    console.log('\nFull error stack:')
    console.log(error.stack)
    return false
  }
}

// Run the test
testPIDGeneration().then(success => {
  if (success) {
    console.log('\n✅ PID test passed - ready to move to next document type')
    process.exit(0)
  } else {
    console.log('\n❌ PID test failed - needs further investigation')
    process.exit(1)
  }
}).catch(error => {
  console.error('Unexpected error:', error)
  process.exit(1)
})