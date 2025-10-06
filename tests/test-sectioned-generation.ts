#!/usr/bin/env npx tsx
/**
 * Test script for sectioned document generation
 * Tests PID and Business Case generation with the new sectioned approach
 */

import { DocumentGenerator } from './lib/documents/generator';
import { SanitizedProjectData } from './lib/llm/types';

async function testSectionedGeneration() {
  console.log('🧪 Testing sectioned document generation...\n');

  // Create test data
  const testData: SanitizedProjectData = {
    projectName: 'Test Project for Sectioned Generation',
    businessCase: 'Testing new sectioned generation approach to ensure complete JSON generation for large PRINCE2 documents',
    methodology: 'prince2',
    sector: 'Technology',
    estimatedDuration: '6 months',
    budget: '$500,000',
    teamSize: '10 people',
    technologies: ['TypeScript', 'Next.js', 'PostgreSQL'],
    risks: ['Technical complexity', 'Resource availability'],
    aiReadiness: 'HIGH',
    constraints: ['Timeline', 'Budget', 'Quality'],
    qualityMetrics: ['Performance', 'Security', 'Usability'],
    userTypes: ['Admin', 'End User', 'Manager']
  };

  const projectId = 'test-' + Date.now();
  
  try {
    // Initialize generator
    const generator = new DocumentGenerator({ 
      provider: 'openai' // Using OpenAI for testing
    });

    console.log('📄 Testing PID Generation...');
    console.log('================================');
    
    // Generate PID
    const pidStart = Date.now();
    const pidResult = await generator.generateDocument(
      'pid',
      testData,
      projectId
    );
    const pidTime = Date.now() - pidStart;
    
    console.log(`✅ PID generated in ${pidTime}ms`);
    console.log('📊 PID Structure Check:');
    
    // Check PID structure
    const pidContent = pidResult.content;
    const pidSections = [
      'projectDefinition',
      'businessCase',
      'organizationStructure',
      'qualityManagementApproach',
      'configurationManagementApproach',
      'riskManagementApproach',
      'communicationManagementApproach',
      'projectPlan',
      'projectControls',
      'tailoring'
    ];
    
    let pidComplete = true;
    for (const section of pidSections) {
      const exists = section in pidContent;
      const status = exists ? '✅' : '❌';
      console.log(`  ${status} ${section}: ${exists ? 'Present' : 'MISSING'}`);
      if (!exists) pidComplete = false;
    }
    
    console.log(`\n📈 PID Content Size: ${JSON.stringify(pidContent).length} bytes`);
    console.log(`🎯 PID Completeness: ${pidComplete ? 'COMPLETE' : 'INCOMPLETE'}`);
    
    console.log('\n📄 Testing Business Case Generation...');
    console.log('=====================================');
    
    // Generate Business Case
    const bcStart = Date.now();
    const bcResult = await generator.generateDocument(
      'business_case',
      testData,
      projectId
    );
    const bcTime = Date.now() - bcStart;
    
    console.log(`✅ Business Case generated in ${bcTime}ms`);
    console.log('📊 Business Case Structure Check:');
    
    // Check Business Case structure
    const bcContent = bcResult.content;
    const bcSections = [
      'executiveSummary',
      'reasons',
      'businessOptions',
      'expectedBenefits',
      'expectedDisBenefits',
      'timescale',
      'costs',
      'investmentAppraisal',
      'majorRisks'
    ];
    
    let bcComplete = true;
    for (const section of bcSections) {
      const exists = section in bcContent;
      const status = exists ? '✅' : '❌';
      console.log(`  ${status} ${section}: ${exists ? 'Present' : 'MISSING'}`);
      if (!exists) bcComplete = false;
    }
    
    console.log(`\n📈 Business Case Content Size: ${JSON.stringify(bcContent).length} bytes`);
    console.log(`🎯 Business Case Completeness: ${bcComplete ? 'COMPLETE' : 'INCOMPLETE'}`);
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📋 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`PID Generation: ${pidComplete ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Business Case Generation: ${bcComplete ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Total Time: ${pidTime + bcTime}ms`);
    
    // Save results for inspection
    const fs = await import('fs/promises');
    const resultsDir = './test-outputs/sectioned';
    await fs.mkdir(resultsDir, { recursive: true });
    
    await fs.writeFile(
      `${resultsDir}/pid-${Date.now()}.json`,
      JSON.stringify(pidContent, null, 2)
    );
    
    await fs.writeFile(
      `${resultsDir}/business-case-${Date.now()}.json`,
      JSON.stringify(bcContent, null, 2)
    );
    
    console.log(`\n💾 Test results saved to ${resultsDir}/`);
    
    // Exit with appropriate code
    const allPassed = pidComplete && bcComplete;
    process.exit(allPassed ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  }
}

// Run the test
testSectionedGeneration().catch(console.error);