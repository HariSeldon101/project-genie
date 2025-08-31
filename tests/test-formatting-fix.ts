/**
 * Test file to verify PID and Business Case generation and formatting
 * Tests the complete pipeline with GPT-5 models
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') })

import { StructuredDocumentGenerator } from './lib/documents/structured-generator'
import { formatPID } from './lib/documents/formatters/pid-formatter'
import { formatBusinessCase } from './lib/documents/formatters/business-case-formatter'
import { SanitizedProjectData } from './lib/llm/types'

// Test data
const testProjectData: SanitizedProjectData = {
  projectName: 'Digital Banking Transformation Initiative',
  companyName: 'Test Bank Corp',
  companyDescription: 'Leading financial institution',
  teamSize: 'Large (50+)',
  projectType: 'Digital Transformation',
  budget: '$5 million',
  timeline: '18 months',
  methodology: 'prince2',
  description: 'Complete digital transformation of banking services',
  objectives: [
    'Modernize digital banking platform',
    'Improve customer experience',
    'Reduce operational costs'
  ],
  deliverables: [
    'New mobile banking app',
    'Modernized online banking portal',
    'API platform for third-party integrations'
  ],
  successCriteria: [
    '50% increase in digital adoption',
    '30% reduction in support calls',
    '95% customer satisfaction score'
  ],
  documents: ['pid', 'business_case']
}

async function testPIDGeneration() {
  console.log('\n' + '='.repeat(80))
  console.log('TESTING PID GENERATION WITH GPT-4o-mini')
  console.log('='.repeat(80))
  
  try {
    // Initialize generator with GPT-4o-mini for structured documents
    const generator = new StructuredDocumentGenerator(undefined, 'gpt-4o-mini')
    
    console.log('\n1. Generating PID with GPT-4o-mini...')
    const startTime = Date.now()
    
    const result = await generator.generatePID(testProjectData, 'test-project-id')
    
    const duration = Date.now() - startTime
    console.log(`   ✅ PID generated in ${duration}ms`)
    
    // Check the structure
    console.log('\n2. Checking PID structure:')
    const content = result.content as any
    console.log('   - projectDefinition:', content.projectDefinition ? '✅' : '❌')
    console.log('   - businessCase:', content.businessCase ? '✅' : '❌')
    console.log('   - organizationStructure:', content.organizationStructure ? '✅' : '❌')
    console.log('   - projectAssurance type:', typeof content.organizationStructure?.projectAssurance)
    
    // Test formatting
    console.log('\n3. Testing PID formatting...')
    try {
      const formatted = formatPID(content, {
        projectName: testProjectData.projectName,
        companyName: testProjectData.companyName,
        version: '1.0',
        date: new Date().toLocaleDateString()
      })
      
      console.log('   ✅ PID formatted successfully')
      console.log(`   - Output length: ${formatted.length} characters`)
      
      // Check for [object Object] issues
      if (formatted.includes('[object Object]')) {
        console.log('   ⚠️ WARNING: Found [object Object] in formatted output!')
        const matches = formatted.match(/\[object Object\]/g)
        console.log(`   - Found ${matches?.length} occurrences`)
      } else {
        console.log('   ✅ No [object Object] found in output')
      }
      
    } catch (formatError) {
      console.error('   ❌ PID formatting failed:', formatError)
    }
    
  } catch (error) {
    console.error('❌ PID generation failed:', error)
  }
}

async function testBusinessCaseGeneration() {
  console.log('\n' + '='.repeat(80))
  console.log('TESTING BUSINESS CASE GENERATION WITH GPT-4o-mini')
  console.log('='.repeat(80))
  
  try {
    // Initialize generator with GPT-4o-mini for structured documents
    const generator = new StructuredDocumentGenerator(undefined, 'gpt-4o-mini')
    
    console.log('\n1. Generating Business Case with GPT-4o-mini...')
    const startTime = Date.now()
    
    const result = await generator.generateBusinessCase(testProjectData, 'test-project-id')
    
    const duration = Date.now() - startTime
    console.log(`   ✅ Business Case generated in ${duration}ms`)
    
    // Check the structure
    console.log('\n2. Checking Business Case structure:')
    const content = result.content as any
    console.log('   - executiveSummary:', content.executiveSummary ? '✅' : '❌')
    console.log('   - majorRisks:', Array.isArray(content.majorRisks) ? '✅' : '❌')
    
    if (Array.isArray(content.majorRisks) && content.majorRisks.length > 0) {
      console.log('   - majorRisks type:', typeof content.majorRisks[0])
      if (typeof content.majorRisks[0] === 'object') {
        console.log('   - majorRisks[0] fields:', Object.keys(content.majorRisks[0]))
      }
    }
    
    // Test formatting
    console.log('\n3. Testing Business Case formatting...')
    try {
      const formatted = formatBusinessCase(content, {
        projectName: testProjectData.projectName,
        companyName: testProjectData.companyName,
        version: '1.0',
        date: new Date().toLocaleDateString()
      })
      
      console.log('   ✅ Business Case formatted successfully')
      console.log(`   - Output length: ${formatted.length} characters`)
      
      // Check for [object Object] issues
      if (formatted.includes('[object Object]')) {
        console.log('   ⚠️ WARNING: Found [object Object] in formatted output!')
        const matches = formatted.match(/\[object Object\]/g)
        console.log(`   - Found ${matches?.length} occurrences`)
        
        // Find where it occurs
        const lines = formatted.split('\n')
        lines.forEach((line, i) => {
          if (line.includes('[object Object]')) {
            console.log(`     Line ${i + 1}: ${line.substring(0, 100)}...`)
          }
        })
      } else {
        console.log('   ✅ No [object Object] found in output')
      }
      
    } catch (formatError) {
      console.error('   ❌ Business Case formatting failed:', formatError)
    }
    
  } catch (error) {
    console.error('❌ Business Case generation failed:', error)
  }
}

async function main() {
  console.log('Starting document generation and formatting tests...')
  console.log('Using model: gpt-4o-mini (optimized for structured documents)')
  console.log('Testing both PID and Business Case documents')
  
  await testPIDGeneration()
  await testBusinessCaseGeneration()
  
  console.log('\n' + '='.repeat(80))
  console.log('TESTS COMPLETE')
  console.log('='.repeat(80))
}

// Run tests
main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})