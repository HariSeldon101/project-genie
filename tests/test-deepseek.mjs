#!/usr/bin/env node

import fetch from 'node-fetch'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

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

async function runTest() {
  console.log('🧪 Starting DeepSeek Document Generation Test\n')
  console.log('📋 Test Project:', testProjectData.name)
  console.log('🔧 Methodology:', testProjectData.methodology.toUpperCase())
  console.log('👥 Stakeholders:', testProjectData.stakeholders.length, '(with placeholders)\n')

  try {
    // 1. Create test user or use existing
    console.log('🔐 Authenticating...')
    const testEmail = `test-${Date.now()}@projectgenie.app`
    
    // Create a new test user for this run
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPassword123!',
      options: {
        data: {
          full_name: 'Test User',
          tier: 'free'
        }
      }
    })
    
    if (signUpError) {
      throw new Error(`Auth failed: ${signUpError.message}`)
    }
    
    const user = signUpData.user
    console.log('✅ Created test user:', testEmail)

    // 2. Create test project in database
    console.log('\n📂 Creating test project...')
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: testProjectData.name,
        description: testProjectData.description,
        vision: testProjectData.vision,
        business_case: testProjectData.businessCase,
        methodology_type: testProjectData.methodology,
        owner_id: user?.id || '00000000-0000-0000-0000-000000000000',
        status: 'active'
      })
      .select()
      .single()

    if (projectError) throw projectError
    console.log('✅ Test project created:', project.id)

    // 3. Call document generation API with DeepSeek
    console.log('\n🚀 Generating documents with DeepSeek...')
    const startTime = Date.now()
    
    const response = await fetch('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      },
      body: JSON.stringify({
        projectId: project.id,
        projectData: testProjectData,
        forceProvider: 'deepseek' // Force DeepSeek usage
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Generation failed')
    }

    const result = await response.json()
    const timeTaken = Math.round((Date.now() - startTime) / 1000)
    
    console.log(`✅ Documents generated successfully in ${timeTaken}s`)
    console.log(`📄 Provider used: ${result.provider}`)
    console.log(`📚 Documents created: ${result.documents?.length || 0}`)
    
    if (result.documents) {
      console.log('\n📑 Document types generated:')
      result.documents.forEach((doc, i) => {
        console.log(`  ${i + 1}. ${doc.title} (${doc.type})`)
      })
    }

    // 4. Fetch and verify documents from database
    console.log('\n🔍 Verifying documents in database...')
    const { data: artifacts, error: artifactsError } = await supabase
      .from('artifacts')
      .select('*')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })

    if (artifactsError) throw artifactsError
    
    console.log(`✅ Found ${artifacts.length} documents in database`)
    
    // 5. Display sample content
    if (artifacts.length > 0) {
      console.log('\n📖 Sample document content (first 500 chars):')
      const sampleDoc = artifacts[0]
      const content = JSON.stringify(sampleDoc.content, null, 2)
      console.log(content.substring(0, 500) + '...')
      
      // Check for branding in the content
      console.log('\n🏷️ Branding check:')
      const hasProjectGenieBranding = content.includes('Project Genie')
      const hasGeneratedBy = content.includes('Generated')
      console.log(`  Project Genie branding: ${hasProjectGenieBranding ? '✅ Found' : '❌ Not found'}`)
      console.log(`  Generated by text: ${hasGeneratedBy ? '✅ Found' : '❌ Not found'}`)
    }

    // 6. Cleanup (optional - comment out to keep test data)
    console.log('\n🧹 Cleaning up test data...')
    await supabase.from('artifacts').delete().eq('project_id', project.id)
    await supabase.from('projects').delete().eq('id', project.id)
    console.log('✅ Test data cleaned up')

    console.log('\n✨ Test completed successfully!')
    console.log('Navigate to http://localhost:3000/test-deepseek to see the formatted view')
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error('Stack:', error.stack)
    process.exit(1)
  }
}

// Run the test
runTest().catch(console.error)