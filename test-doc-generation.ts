/**
 * Direct test script for document generation
 * Run with: npx tsx test-doc-generation.ts
 */

// Load environment variables first
import { config } from 'dotenv'
config({ path: '.env.local' })

import { DocumentGenerator } from './lib/documents/generator'
import type { SanitizedProjectData } from './lib/llm/sanitizer'

// Test project data
const testProjectData: SanitizedProjectData = {
  name: 'CloudSync Platform Development',
  description: 'A cloud-based synchronization platform for enterprise data',
  methodology: 'agile',
  startDate: '2025-10-01',
  endDate: '2026-04-01',
  budget: 500000,
  timeline: '6 months',
  industry: 'technology',
  teamSize: 8,
  stakeholders: [
    { name: 'John Doe', role: 'Product Owner', email: 'john@example.com' },
    { name: 'Jane Smith', role: 'Scrum Master', email: 'jane@example.com' }
  ],
  objectives: [
    'Deliver scalable cloud platform',
    'Ensure 99.9% uptime',
    'Complete within budget'
  ],
  deliverables: [
    'Platform MVP',
    'API Documentation',
    'User Training'
  ]
}

async function testDocumentGeneration() {
  console.log('🧪 Starting Document Generation Test...\n')

  try {
    const generator = new DocumentGenerator()
    const testProjectId = 'test-project-' + Date.now()

    // Test 1: Sprint Plan
    console.log('📋 Test 1: Generating Sprint Plan...')
    try {
      const docs = await generator.generateProjectDocuments(
        testProjectData,
        testProjectId,
        ['Sprint Plan']
      )
      console.log('✅ Sprint Plan generated successfully!')
      console.log('   Content keys:', Object.keys(docs[0].content))
      console.log('   Content preview:', JSON.stringify(docs[0].content).substring(0, 200) + '...\n')
    } catch (error) {
      console.error('❌ Sprint Plan failed:', error instanceof Error ? error.message : error)
      console.error('   Stack:', error instanceof Error ? error.stack : '')
      console.log('')
    }

    // Test 2: Project Charter
    console.log('📋 Test 2: Generating Project Charter...')
    try {
      const docs = await generator.generateProjectDocuments(
        testProjectData,
        testProjectId,
        ['Project Charter']
      )
      console.log('✅ Project Charter generated successfully!')
      console.log('   Content keys:', Object.keys(docs[0].content))
      console.log('   Content preview:', JSON.stringify(docs[0].content).substring(0, 200) + '...\n')
    } catch (error) {
      console.error('❌ Project Charter failed:', error instanceof Error ? error.message : error)
      console.error('   Stack:', error instanceof Error ? error.stack : '')
      console.log('')
    }

    // Test 3: Product Backlog
    console.log('📋 Test 3: Generating Product Backlog...')
    try {
      const docs = await generator.generateProjectDocuments(
        testProjectData,
        testProjectId,
        ['Product Backlog']
      )
      console.log('✅ Product Backlog generated successfully!')
      console.log('   Content keys:', Object.keys(docs[0].content))
      console.log('   Content preview:', JSON.stringify(docs[0].content).substring(0, 200) + '...\n')
    } catch (error) {
      console.error('❌ Product Backlog failed:', error instanceof Error ? error.message : error)
      console.error('   Stack:', error instanceof Error ? error.stack : '')
      console.log('')
    }

    console.log('🎉 Test complete!')

  } catch (error) {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  }
}

// Run the test
testDocumentGeneration().catch(console.error)
