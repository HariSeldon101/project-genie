/**
 * Comprehensive Test for All Bug Fixes
 * Tests:
 * 1. Document selection UI appears
 * 2. Two-stage generation (Technical Landscape & Comparable Projects first)
 * 3. Enhanced metadata display (temperature, maxTokens, etc.)
 * 4. PID generation success
 * 5. All selected documents generate
 */

async function runComprehensiveTests() {
  console.log('\n=====================================')
  console.log('    COMPREHENSIVE BUG FIX TESTS    ')
  console.log('=====================================\n')
  
  const testResults = {
    documentSelectionUI: false,
    twoStageGeneration: false,
    enhancedMetadata: false,
    pidGeneration: false,
    allDocumentsGenerate: false
  }
  
  const projectId = `test-project-${Date.now()}`
  const testProjectData = {
    name: 'Bug Fix Verification Project',
    description: 'Testing all bug fixes implemented today',
    vision: 'Ensure all fixes are working correctly',
    businessCase: 'Verify system stability and functionality',
    methodology: 'prince2', // Test PRINCE2 for PID generation
    companyWebsite: 'https://test.com',
    sector: 'Technology',
    stakeholders: [
      {
        name: 'Test Manager',
        email: 'test@example.com',
        title: 'Project Lead'
      }
    ]
  }
  
  console.log('📋 Test Configuration:')
  console.log('  - Methodology: PRINCE2 (to test PID generation)')
  console.log('  - Documents: PID, Business Case, Risk Register, Technical Landscape, Comparable Projects')
  console.log('  - Provider: OpenAI (primary)\n')
  
  try {
    // Test 1: API with document selection
    console.log('🧪 Test 1: Document Generation with Selection')
    console.log('=========================================')
    
    const response = await fetch('http://localhost:3003/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        projectId,
        projectData: testProjectData,
        selectedDocuments: ['pid', 'business_case', 'risk_register', 'technical_landscape', 'comparable_projects'],
        forceProvider: 'openai' // Use OpenAI for real generation
      })
    })
    
    if (!response.ok) {
      console.error('❌ Generation failed:', response.status)
      const errorText = await response.text()
      console.error('Error details:', errorText.substring(0, 500))
    } else {
      const result = await response.json()
      
      console.log('\n✅ Generation Response Received')
      console.log('  - Success:', result.success)
      console.log('  - Documents generated:', result.documents?.length || 0)
      console.log('  - Provider:', result.provider)
      console.log('  - Model:', result.model)
      
      // Analyze results
      if (result.documents && result.documents.length > 0) {
        console.log('\n📊 Document Analysis:')
        console.log('=====================')
        
        // Check generation order
        const firstDoc = result.documents[0]
        const secondDoc = result.documents[1]
        
        // Test 2: Two-stage generation
        if ((firstDoc.type === 'technical_landscape' || firstDoc.type === 'comparable_projects') &&
            (secondDoc?.type === 'technical_landscape' || secondDoc?.type === 'comparable_projects')) {
          testResults.twoStageGeneration = true
          console.log('✅ Two-stage generation: PASSED (research docs generated first)')
        } else {
          console.log('❌ Two-stage generation: FAILED')
          console.log('   First doc:', firstDoc.type)
          console.log('   Second doc:', secondDoc?.type)
        }
        
        // Test 3: Enhanced metadata
        let metadataComplete = true
        result.documents.forEach((doc: any, index: number) => {
          console.log(`\n${index + 1}. ${doc.title || doc.type}:`)
          console.log('   Type:', doc.type)
          
          if (doc.metadata) {
            console.log('   Metadata:')
            console.log('     - Temperature:', doc.metadata.temperature || '❌ Missing')
            console.log('     - Max Tokens:', doc.metadata.maxTokens || '❌ Missing')
            console.log('     - Reasoning Level:', doc.metadata.reasoningLevel || doc.metadata.reasoningEffort || '❌ Missing')
            console.log('     - Provider:', doc.metadata.provider || doc.metadata.llmProvider || '❌ Missing')
            console.log('     - Model:', doc.metadata.model || '❌ Missing')
            
            if (!doc.metadata.temperature || !doc.metadata.maxTokens) {
              metadataComplete = false
            }
          } else {
            console.log('   ❌ No metadata object')
            metadataComplete = false
          }
          
          // Test 4: PID generation
          if (doc.type === 'pid') {
            if (doc.content && typeof doc.content === 'object' && doc.content.projectDefinition) {
              testResults.pidGeneration = true
              console.log('   ✅ PID structure valid')
            } else {
              console.log('   ❌ PID structure invalid')
            }
          }
        })
        
        testResults.enhancedMetadata = metadataComplete
        
        // Test 5: All documents generated
        const expectedDocs = ['pid', 'business_case', 'risk_register', 'technical_landscape', 'comparable_projects']
        const generatedTypes = result.documents.map((d: any) => d.type)
        const allGenerated = expectedDocs.every(type => generatedTypes.includes(type))
        
        if (allGenerated) {
          testResults.allDocumentsGenerate = true
          console.log('\n✅ All requested documents generated')
        } else {
          console.log('\n❌ Some documents missing:')
          expectedDocs.forEach(type => {
            if (!generatedTypes.includes(type)) {
              console.log('   - Missing:', type)
            }
          })
        }
        
      }
    }
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error)
  }
  
  // Final Report
  console.log('\n=====================================')
  console.log('        FINAL TEST REPORT           ')
  console.log('=====================================\n')
  
  const testNames: Record<string, string> = {
    documentSelectionUI: 'Document Selection UI',
    twoStageGeneration: 'Two-Stage Generation',
    enhancedMetadata: 'Enhanced Metadata',
    pidGeneration: 'PID Generation',
    allDocumentsGenerate: 'All Documents Generate'
  }
  
  let passedCount = 0
  Object.entries(testResults).forEach(([key, passed]) => {
    const status = passed ? '✅ PASSED' : '❌ FAILED'
    console.log(`${status} - ${testNames[key]}`)
    if (passed) passedCount++
  })
  
  console.log('\n📊 Summary:')
  console.log(`  ${passedCount}/5 tests passed`)
  
  if (passedCount === 5) {
    console.log('\n🎉 ALL TESTS PASSED! All bug fixes are working correctly!')
  } else {
    console.log('\n⚠️  Some tests failed. Please review the issues above.')
  }
  
  console.log('\n=====================================\n')
}

// Run the tests
console.log('Starting comprehensive test suite...')
runComprehensiveTests().catch(console.error)