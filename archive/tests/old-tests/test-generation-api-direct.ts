/**
 * Direct API Test for Document Generation
 * Tests without authentication to verify:
 * 1. Two-stage generation works (Technical Landscape & Comparable Projects first)
 * 2. Enhanced metadata is included
 * 3. Document selection is respected
 */

const testProjectData = {
  name: 'Test Project for Bug Fixes',
  description: 'Testing document selection and two-stage generation',
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

async function testGenerationAPI() {
  console.log('\n=== Testing Document Generation API (Direct) ===\n')
  
  const projectId = `test-project-${Date.now()}`
  
  console.log('Testing with selected documents:')
  console.log('- technical_landscape (should generate FIRST)')
  console.log('- comparable_projects (should generate SECOND)')
  console.log('- charter (should use research context)')
  console.log('- backlog (should use research context)\n')
  
  try {
    const response = await fetch('http://localhost:3003/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        projectId,
        projectData: testProjectData,
        // Test with specific document selection
        selectedDocuments: ['technical_landscape', 'comparable_projects', 'charter', 'backlog'],
        // Force groq provider to bypass auth and get real results
        forceProvider: 'groq'
      })
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Generation failed:', response.status, errorText)
      return
    }
    
    const result = await response.json()
    
    console.log('\n✅ Generation completed successfully!\n')
    console.log('Response summary:')
    console.log('- Success:', result.success)
    console.log('- Documents generated:', result.documents?.length || 0)
    console.log('- Provider:', result.provider)
    console.log('- Model:', result.model)
    
    if (result.documents && result.documents.length > 0) {
      console.log('\n📄 Documents generated (in order):')
      console.log('==================================')
      
      result.documents.forEach((doc: any, index: number) => {
        console.log(`\n${index + 1}. ${doc.title || doc.type}`)
        console.log('   Type:', doc.type)
        
        if (doc.metadata) {
          console.log('   Enhanced Metadata:')
          console.log('   - Provider:', doc.metadata.provider || 'N/A')
          console.log('   - Model:', doc.metadata.model || 'N/A')
          console.log('   - Temperature:', doc.metadata.temperature || 'N/A')
          console.log('   - Max Tokens:', doc.metadata.maxTokens || 'N/A')
          console.log('   - Reasoning Level:', doc.metadata.reasoningLevel || doc.metadata.reasoningEffort || 'N/A')
          console.log('   - Input Tokens:', doc.metadata.usage?.inputTokens || 'N/A')
          console.log('   - Output Tokens:', doc.metadata.usage?.outputTokens || 'N/A')
          console.log('   - Reasoning Tokens:', doc.metadata.usage?.reasoningTokens || 'N/A')
        }
        
        // Check if this is a research document
        if (doc.type === 'technical_landscape' || doc.type === 'comparable_projects') {
          console.log('   ✓ This is a RESEARCH document')
        }
      })
      
      // Verify generation order
      console.log('\n🔍 Verification:')
      console.log('================')
      
      const firstDoc = result.documents[0]
      const secondDoc = result.documents[1]
      
      // Check if research documents were generated first
      const researchFirst = 
        (firstDoc.type === 'technical_landscape' || firstDoc.type === 'comparable_projects') &&
        (secondDoc.type === 'technical_landscape' || secondDoc.type === 'comparable_projects')
      
      if (researchFirst) {
        console.log('✅ Two-stage generation CONFIRMED: Research documents generated first!')
      } else {
        console.log('❌ Two-stage generation FAILED: Expected research documents first')
        console.log('   First doc:', firstDoc.type)
        console.log('   Second doc:', secondDoc?.type || 'N/A')
      }
      
      // Check for enhanced metadata
      const hasEnhancedMetadata = result.documents.every((doc: any) => 
        doc.metadata?.temperature !== undefined && 
        doc.metadata?.maxTokens !== undefined
      )
      
      if (hasEnhancedMetadata) {
        console.log('✅ Enhanced metadata CONFIRMED: All documents have temperature & maxTokens!')
      } else {
        console.log('❌ Enhanced metadata MISSING in some documents')
      }
      
      // Check if correct number of documents were generated
      if (result.documents.length === 4) {
        console.log('✅ Document selection CONFIRMED: Generated exactly 4 selected documents!')
      } else {
        console.log(`⚠️  Expected 4 documents, got ${result.documents.length}`)
      }
      
    } else {
      console.log('\n❌ No documents in response')
    }
    
    // Check aggregated metrics
    if (result.metrics) {
      console.log('\n📊 Aggregated Metrics:')
      console.log('======================')
      console.log('- Total Input Tokens:', result.metrics.totalInputTokens || 0)
      console.log('- Total Output Tokens:', result.metrics.totalOutputTokens || 0)
      console.log('- Total Reasoning Tokens:', result.metrics.totalReasoningTokens || 0)
      console.log('- Total Cost (USD):', result.metrics.estimatedCostUsd || 0)
      console.log('- Generation Time:', result.metrics.generationTimeMs || 0, 'ms')
    }
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error)
  }
  
  console.log('\n=== Test Complete ===\n')
}

// Run the test
testGenerationAPI().catch(console.error)