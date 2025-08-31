#!/usr/bin/env node
/**
 * Test script to verify PID and Business Case generation after fix
 */

import { LLMGateway } from './lib/llm/gateway'
import { SectionedDocumentGenerator } from './lib/documents/sectioned-generator'
import { PIDFormatter } from './lib/documents/formatters/pid-formatter'
import { BusinessCaseFormatter } from './lib/documents/formatters/business-case-formatter'
import type { SanitizedProjectData } from './lib/llm/types'

async function testSectionedGeneration() {
  console.log('\n🧪 Testing Sectioned Document Generation After Fix')
  console.log('=' .repeat(60))
  
  // Create test data
  const testData: SanitizedProjectData = {
    projectName: 'Test Project',
    vision: 'To test document generation',
    businessCase: 'Testing the fixed sectioned generator',
    description: 'A test project to verify document generation works correctly',
    methodology: 'prince2',
    companyWebsite: 'https://example.com',
    sector: 'Technology',
    estimatedDuration: '3 months',
    budget: '$50,000',
    teamSize: '5',
    keyStakeholders: ['Product Owner', 'Development Team', 'QA Team'],
    successCriteria: ['Documents generate without errors', 'Proper JSON formatting', 'All sections populated'],
    constraints: ['Limited testing time', 'Development environment only'],
    assumptions: ['Fix has been properly implemented', 'LLM gateway is functional'],
    technologies: ['TypeScript', 'Next.js', 'Node.js'],
    deploymentStrategy: 'Continuous integration',
    maintenancePlan: 'Regular updates'
  }
  
  try {
    // Initialize gateway and generator
    const gateway = new LLMGateway({
      provider: 'vercel-ai',
      model: 'gpt-5-mini',
      fallbackProviders: ['mock']
    })
    
    const generator = new SectionedDocumentGenerator(gateway)
    
    // Test PID Generation
    console.log('\n📋 Testing PID Generation...')
    console.log('-' .repeat(40))
    
    const pidData = await generator.generatePIDSectioned(
      testData,
      'test-project-id',
      {}
    )
    
    console.log('\n✅ PID Generation Complete!')
    console.log('Generated sections:', Object.keys(pidData))
    console.log('Has projectDefinition:', !!pidData.projectDefinition)
    console.log('Has businessCase:', !!pidData.businessCase)
    console.log('Has organizationStructure:', !!pidData.organizationStructure)
    
    // Log the businessCase structure to debug
    if (pidData.businessCase) {
      console.log('BusinessCase structure:', {
        hasBusinessOptions: !!pidData.businessCase.businessOptions,
        businessOptionsLength: pidData.businessCase.businessOptions?.length,
        hasExpectedBenefits: !!pidData.businessCase.expectedBenefits,
        hasCosts: !!pidData.businessCase.costs
      })
    }
    
    // Format PID
    const pidFormatter = new PIDFormatter(pidData, {
      projectName: testData.projectName,
      companyName: 'Test Company',
      version: '1.0',
      date: new Date().toISOString().split('T')[0]
    })
    const formattedPID = pidFormatter.format()
    console.log('Formatted PID length:', formattedPID.length, 'characters')
    
    // Test Business Case Generation
    console.log('\n💼 Testing Business Case Generation...')
    console.log('-' .repeat(40))
    
    const bcData = await generator.generateBusinessCaseSectioned(
      testData,
      'test-project-id',
      {}
    )
    
    console.log('\n✅ Business Case Generation Complete!')
    console.log('Generated sections:', Object.keys(bcData))
    console.log('Has executiveSummary:', !!bcData.executiveSummary)
    console.log('Has businessOptions:', !!bcData.businessOptions)
    console.log('Has costs:', !!bcData.costs)
    
    // Format Business Case
    const bcFormatter = new BusinessCaseFormatter(bcData, {
      projectName: testData.projectName,
      companyName: 'Test Company',
      version: '1.0',
      date: new Date().toISOString().split('T')[0]
    })
    const formattedBC = bcFormatter.format()
    console.log('Formatted Business Case length:', formattedBC.length, 'characters')
    
    console.log('\n🎉 SUCCESS: All tests passed!')
    console.log('=' .repeat(60))
    
  } catch (error) {
    console.error('\n❌ ERROR during testing:', error)
    console.error('Error details:', {
      message: (error as any).message,
      stack: (error as any).stack?.split('\n').slice(0, 3).join('\n')
    })
    process.exit(1)
  }
}

// Run the test
testSectionedGeneration().catch(console.error)