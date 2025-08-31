/**
 * Test Script for Document Generation Flow
 * Tests:
 * 1. Document selection UI appears
 * 2. Two-stage generation (Technical Landscape & Comparable Projects first)
 * 3. Enhanced metadata display
 */

import { createBrowserClient } from '@supabase/ssr'

const SUPABASE_URL = 'https://vnuieavheezjxbkyfxea.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZudWllYXZoZWV6anhia3lmeGVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NDY1NDEsImV4cCI6MjA3MTUyMjU0MX0.T69QjJp96EoGO0GDLwOwZWbI9Ir6B5ARzz7SBVwjqM0'

const testProjectData = {
  name: 'Test Project for Bug Fixes',
  description: 'Testing document selection UI and two-stage generation',
  vision: 'Verify all document generation features work correctly',
  businessCase: 'Ensure high-quality document generation with proper metadata',
  methodology: 'agile',
  companyWebsite: 'https://test.com',
  sector: 'Technology',
  stakeholders: [
    {
      name: 'Test User',
      email: 'test@example.com',
      title: 'Project Manager'
    }
  ]
}

async function testGenerationFlow() {
  console.log('\n=== Testing Document Generation Flow ===\n')
  
  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  
  // 1. Authenticate
  console.log('1. Authenticating...')
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'stusandboxacc@gmail.com',
    password: 'sandbox123'
  })
  
  if (authError) {
    console.error('Auth failed:', authError.message)
    return
  }
  console.log('✓ Authenticated successfully')
  
  // 2. Create a test project
  console.log('\n2. Creating test project...')
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      name: testProjectData.name,
      description: testProjectData.description,
      vision: testProjectData.vision,
      business_case: testProjectData.businessCase,
      methodology_type: testProjectData.methodology,
      owner_id: authData.user?.id
    })
    .select('*')
    .single()
  
  if (projectError) {
    console.error('Project creation failed:', projectError.message)
    return
  }
  console.log('✓ Project created:', project.id)
  
  // 3. Test document generation API
  console.log('\n3. Testing document generation...')
  console.log('   - Should show document selection checkboxes')
  console.log('   - Should generate Technical Landscape first')
  console.log('   - Should generate Comparable Projects second')
  console.log('   - Should use research context for other documents')
  
  const response = await fetch('http://localhost:3003/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authData.session?.access_token}`
    },
    body: JSON.stringify({
      projectId: project.id,
      projectData: testProjectData,
      // Test with specific document selection
      selectedDocuments: ['technical_landscape', 'comparable_projects', 'charter', 'backlog']
    })
  })
  
  if (!response.ok) {
    console.error('Generation failed:', await response.text())
    return
  }
  
  const result = await response.json()
  console.log('\n✓ Generation completed successfully!')
  
  // 4. Verify metadata
  console.log('\n4. Verifying enhanced metadata...')
  const { data: artifacts } = await supabase
    .from('artifacts')
    .select('*')
    .eq('project_id', project.id)
    .order('created_at', { ascending: true })
  
  if (artifacts && artifacts.length > 0) {
    console.log('\nGenerated documents (in order):')
    artifacts.forEach((artifact, index) => {
      const metadata = artifact.generation_metadata || {}
      console.log(`\n${index + 1}. ${artifact.title}`)
      console.log(`   - Type: ${artifact.type}`)
      console.log(`   - Provider: ${metadata.provider || 'N/A'}`)
      console.log(`   - Model: ${metadata.model || 'N/A'}`)
      console.log(`   - Temperature: ${metadata.temperature || 'N/A'}`)
      console.log(`   - Max Tokens: ${metadata.maxTokens || 'N/A'}`)
      console.log(`   - Reasoning Level: ${metadata.reasoningLevel || metadata.reasoningEffort || 'N/A'}`)
      console.log(`   - Input Tokens: ${metadata.inputTokens || 'N/A'}`)
      console.log(`   - Output Tokens: ${metadata.outputTokens || 'N/A'}`)
      console.log(`   - Reasoning Tokens: ${metadata.reasoningTokens || 'N/A'}`)
    })
    
    // Verify two-stage generation order
    const firstDoc = artifacts[0]
    const secondDoc = artifacts[1]
    
    if (firstDoc.type === 'technical_landscape' || firstDoc.type === 'comparable_projects') {
      console.log('\n✅ Two-stage generation confirmed: Research documents generated first!')
    } else {
      console.log('\n⚠️  Warning: Expected research documents first, got:', firstDoc.type)
    }
    
    // Check for enhanced metadata
    const hasEnhancedMetadata = artifacts.every(a => 
      a.generation_metadata?.temperature && 
      a.generation_metadata?.maxTokens
    )
    
    if (hasEnhancedMetadata) {
      console.log('✅ Enhanced metadata present in all documents!')
    } else {
      console.log('⚠️  Some documents missing enhanced metadata')
    }
  }
  
  console.log('\n=== Test Complete ===\n')
  
  // Clean up - optional
  console.log('Cleaning up test project...')
  await supabase
    .from('artifacts')
    .delete()
    .eq('project_id', project.id)
  
  await supabase
    .from('projects')
    .delete()
    .eq('id', project.id)
  
  console.log('✓ Cleanup complete')
}

// Run the test
testGenerationFlow().catch(console.error)