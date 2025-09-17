#!/usr/bin/env npx tsx

/**
 * Test script for structured document generation with proper Zod schemas
 * Tests PID and Business Case generation using OpenAI's Structured Outputs
 */

// Load environment variables
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { DocumentGenerator } from './lib/documents/generator'
import { documentLogger } from './lib/utils/document-logger'
import * as fs from 'fs'
import * as path from 'path'

// Test project data
const testProjectData = {
  projectName: 'E-Commerce Platform Modernization',
  description: 'Modernize legacy e-commerce platform to cloud-native microservices architecture',
  sector: 'Retail',
  companyName: 'TechStore Inc',
  companyWebsite: 'https://techstore.com',
  vision: 'Become the leading digital commerce platform with scalable, secure, and performant architecture',
  objectives: [
    'Migrate from monolithic to microservices',
    'Implement modern CI/CD pipeline',
    'Achieve 99.99% uptime',
    'Reduce page load time by 50%'
  ],
  businessCase: 'Current monolithic architecture limits scalability and increases operational costs. Modernization will reduce costs by 40% and enable 3x traffic handling capacity.',
  stakeholders: [
    'CTO - Executive Sponsor',
    'Engineering Team - Implementation',
    'Product Team - Requirements',
    'Customer Support - User Feedback'
  ],
  budget: '$1,500,000',
  estimatedDuration: '12 months',
  methodology: 'prince2',
  teamMembers: [
    'Project Manager',
    'Solution Architect',
    '5 Backend Engineers',
    '3 Frontend Engineers',
    '2 DevOps Engineers',
    '2 QA Engineers'
  ],
  keyDeliverables: [
    'Microservices Architecture',
    'Kubernetes Infrastructure',
    'CI/CD Pipeline',
    'API Gateway',
    'Service Mesh',
    'Observability Platform'
  ],
  mainRisks: [
    'Data migration complexity',
    'Service integration challenges',
    'Performance degradation during transition',
    'Team skill gaps in cloud technologies'
  ],
  successCriteria: [
    'All services migrated to microservices',
    'Zero data loss during migration',
    'Performance improvements achieved',
    'Team trained on new technologies'
  ]
}

async function testStructuredGeneration() {
  console.log('🚀 Testing Structured Document Generation')
  console.log('=' .repeat(80))
  
  try {
    // Initialize generator with OpenAI provider
    const generator = new DocumentGenerator({
      provider: 'openai',
      useCache: false // Disable cache for testing
    })
    
    const projectId = `test-${Date.now()}`
    
    // Test 1: Generate PID
    console.log('\n📋 Test 1: Generating PID with Structured Outputs...')
    console.log('-'.repeat(60))
    
    const pidStartTime = Date.now()
    const pidDoc = await generator.generateDocument('pid', testProjectData, projectId)
    const pidDuration = Date.now() - pidStartTime
    
    console.log(`✅ PID Generation Complete in ${pidDuration}ms`)
    console.log(`   Content Length: ${JSON.stringify(pidDoc.content).length} chars`)
    
    // Validate PID structure
    validatePIDStructure(pidDoc.content)
    
    // Save PID to file for inspection
    const outputDir = './test-outputs'
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }
    
    fs.writeFileSync(
      path.join(outputDir, 'test-pid-structured.json'),
      JSON.stringify(pidDoc, null, 2)
    )
    console.log(`   Saved to: ${outputDir}/test-pid-structured.json`)
    
    // Test 2: Generate Business Case
    console.log('\n📋 Test 2: Generating Business Case with Structured Outputs...')
    console.log('-'.repeat(60))
    
    const bcStartTime = Date.now()
    const bcDoc = await generator.generateDocument('business_case', testProjectData, projectId)
    const bcDuration = Date.now() - bcStartTime
    
    console.log(`✅ Business Case Generation Complete in ${bcDuration}ms`)
    console.log(`   Content Length: ${JSON.stringify(bcDoc.content).length} chars`)
    
    // Validate Business Case structure
    validateBusinessCaseStructure(bcDoc.content)
    
    // Save Business Case to file for inspection
    fs.writeFileSync(
      path.join(outputDir, 'test-business-case-structured.json'),
      JSON.stringify(bcDoc, null, 2)
    )
    console.log(`   Saved to: ${outputDir}/test-business-case-structured.json`)
    
    // Get generation statistics
    console.log('\n📊 Generation Statistics:')
    console.log('-'.repeat(60))
    const stats = documentLogger.getStatistics()
    console.log('   Total Attempts:', stats.totalAttempts)
    console.log('   Successful:', stats.successfulGenerations)
    console.log('   Failed:', stats.failedGenerations)
    console.log('   Empty Content Detections:', stats.emptyContentDetections)
    console.log('   Fallbacks Used:', stats.fallbacksUsed)
    console.log('   Average Duration:', Math.round(stats.averageDuration), 'ms')
    console.log('   Error Rate:', stats.errorRate.toFixed(2), '%')
    
    // Get recent logs for debugging
    console.log('\n📝 Recent Error Logs:')
    console.log('-'.repeat(60))
    const errorLogs = documentLogger.getRecentLogs(5, 'error')
    if (errorLogs.length === 0) {
      console.log('   No errors detected! 🎉')
    } else {
      errorLogs.forEach(log => {
        console.log(`   [${log.timestamp}] ${log.message}`)
        if (log.error) {
          console.log(`      Error: ${log.error.message}`)
        }
      })
    }
    
    console.log('\n' + '='.repeat(80))
    console.log('✅ All tests completed successfully!')
    console.log('='.repeat(80))
    
    // Clean up
    generator.destroy()
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message)
    console.error('Stack trace:', error.stack)
    
    // Export logs for debugging
    const logs = documentLogger.exportLogs()
    fs.writeFileSync('./test-outputs/test-logs.json', logs)
    console.error('Logs exported to: ./test-outputs/test-logs.json')
    
    process.exit(1)
  }
}

function validatePIDStructure(content: any) {
  console.log('\n🔍 Validating PID Structure...')
  
  const requiredSections = [
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
  ]
  
  const missingSections = requiredSections.filter(section => !content[section])
  
  if (missingSections.length > 0) {
    console.warn(`   ⚠️ Missing sections: ${missingSections.join(', ')}`)
  } else {
    console.log('   ✅ All required sections present')
  }
  
  // Check for z.any() usage indicators (should not have generic 'any' fields)
  const hasAnyFields = JSON.stringify(content).includes('"any"')
  if (hasAnyFields) {
    console.warn('   ⚠️ Possible z.any() usage detected')
  } else {
    console.log('   ✅ No z.any() usage detected')
  }
  
  // Check data quality
  let quality = 100
  
  // Check if sections have actual content
  if (content.projectDefinition?.objectives?.length < 2) {
    quality -= 10
    console.warn('   ⚠️ Insufficient objectives')
  }
  
  if (content.businessCase?.expectedBenefits?.length < 2) {
    quality -= 10
    console.warn('   ⚠️ Insufficient benefits')
  }
  
  if (content.projectPlan?.stages?.length < 2) {
    quality -= 10
    console.warn('   ⚠️ Insufficient project stages')
  }
  
  console.log(`   📊 Content Quality Score: ${quality}%`)
}

function validateBusinessCaseStructure(content: any) {
  console.log('\n🔍 Validating Business Case Structure...')
  
  const requiredSections = [
    'executiveSummary',
    'reasons',
    'businessOptions',
    'expectedBenefits',
    'expectedDisBenefits',
    'timescale',
    'costs',
    'investmentAppraisal',
    'majorRisks',
    'recommendation',
    'fundingSource',
    'benefitsRealization',
    'stakeholderAnalysis',
    'successCriteria',
    'constraintsAndDependencies'
  ]
  
  const missingSections = requiredSections.filter(section => !content[section])
  
  if (missingSections.length > 0) {
    console.warn(`   ⚠️ Missing sections: ${missingSections.join(', ')}`)
  } else {
    console.log('   ✅ All required sections present')
  }
  
  // Check data quality
  let quality = 100
  
  // Check minimum requirements
  if (!content.businessOptions || content.businessOptions.length < 3) {
    quality -= 15
    console.warn('   ⚠️ Insufficient business options (need at least 3)')
  }
  
  if (!content.expectedBenefits || content.expectedBenefits.length < 3) {
    quality -= 15
    console.warn('   ⚠️ Insufficient expected benefits (need at least 3)')
  }
  
  if (!content.majorRisks || content.majorRisks.length < 3) {
    quality -= 15
    console.warn('   ⚠️ Insufficient major risks (need at least 3)')
  }
  
  if (!content.successCriteria || content.successCriteria.length < 3) {
    quality -= 10
    console.warn('   ⚠️ Insufficient success criteria (need at least 3)')
  }
  
  // Check for proper typing (no generic strings where objects expected)
  if (content.costs && typeof content.costs.development === 'string') {
    console.log('   ✅ Costs properly formatted as strings')
  } else {
    quality -= 10
    console.warn('   ⚠️ Costs not properly formatted')
  }
  
  console.log(`   📊 Content Quality Score: ${quality}%`)
}

// Run the test
testStructuredGeneration().catch(console.error)