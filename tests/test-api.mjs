#!/usr/bin/env node

import fetch from 'node-fetch'

const testProjectData = {
  name: 'AI-Powered Healthcare Platform',
  description: 'A revolutionary healthcare management system using artificial intelligence to improve patient outcomes and streamline medical operations.',
  vision: 'To transform healthcare delivery through intelligent automation and data-driven insights, making quality healthcare accessible to all.',
  businessCase: 'The healthcare industry faces critical challenges including rising costs, physician burnout, and inefficient processes. Our AI platform addresses these by automating routine tasks, providing predictive analytics, and improving diagnostic accuracy.',
  methodology: 'agile',
  sector: 'Healthcare Technology',
  companyWebsite: 'https://healthtech-example.com',
  stakeholders: [
    { name: '[CHIEF_MEDICAL_OFFICER]', title: 'Chief Medical Officer', email: 'cmo@example.com' },
    { name: '[HEAD_OF_IT]', title: 'Head of IT', email: 'it@example.com' },
    { name: '[PATIENT_ADVOCATE]', title: 'Patient Advocate', email: 'advocate@example.com' },
    { name: '[REGULATORY_OFFICER]', title: 'Regulatory Compliance Officer', email: 'compliance@example.com' }
  ]
}

async function testAPI() {
  console.log('🧪 Testing DeepSeek Document Generation API\n')
  
  try {
    console.log('🚀 Calling document generation API...')
    const startTime = Date.now()
    
    const response = await fetch('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Use a valid UUID for the test project
        projectId: '550e8400-e29b-41d4-a716-446655440001',
        projectData: testProjectData,
        forceProvider: 'deepseek' // Test with real DeepSeek API
      })
    })

    const timeTaken = Math.round((Date.now() - startTime) / 1000)
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Generation failed')
    }

    const result = await response.json()
    
    console.log(`✅ Documents generated in ${timeTaken}s`)
    console.log(`📄 Provider used: ${result.provider}`)
    console.log(`📚 Documents created: ${result.documents?.length || 0}`)
    
    if (result.documents) {
      console.log('\n📑 Document types generated:')
      result.documents.forEach((doc, i) => {
        console.log(`  ${i + 1}. ${doc.title} (${doc.type})`)
        if (doc.insights) {
          console.log(`     💡 Insights available: ${Object.keys(doc.insights).join(', ')}`)
        }
      })
    }
    
    console.log('\n✨ Test completed successfully!')
    console.log('📝 Documents have been generated using DeepSeek')
    console.log('🎨 Navigate to http://localhost:3000/test-deepseek to see formatted views with branding')
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error('Details:', error.stack)
    process.exit(1)
  }
}

// Run the test
testAPI().catch(console.error)