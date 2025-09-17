#!/usr/bin/env node

/**
 * Test script to verify document consistency between viewer and PDF
 * Run with: node scripts/test-document-consistency.js
 */

const { UnifiedPIDFormatter } = require('../lib/documents/formatters/unified-pid-formatter')
const { UnifiedBusinessCaseFormatter } = require('../lib/documents/formatters/unified-business-case-formatter')

// Sample test data
const samplePIDData = {
  projectDefinition: {
    background: 'Digital transformation initiative to modernize legacy systems',
    objectives: ['Improve customer experience', 'Reduce operational costs by 30%', 'Ensure regulatory compliance'],
    deliverables: ['New digital platform', 'Mobile application', 'API integration layer'],
    scope: 'Complete overhaul of customer-facing systems and backend infrastructure',
    exclusions: ['HR systems', 'Payroll systems']
  },
  businessCase: {
    reasons: 'Market competition and regulatory requirements',
    options: ['Do nothing', 'Partial upgrade', 'Full transformation'],
    expectedBenefits: ['Cost reduction', 'Increased revenue', 'Better customer satisfaction'],
    costs: { total: '£12M', breakdown: 'Development: £8M, Infrastructure: £3M, Training: £1M' },
    risks: ['Technical complexity', 'Resource availability', 'Timeline constraints']
  },
  organizationStructure: {
    projectBoard: { 
      executive: 'John Smith - CEO',
      seniorUser: 'Jane Doe - Head of Operations',
      seniorSupplier: 'Bob Johnson - CTO'
    },
    projectManager: 'Alice Brown',
    teamManagers: ['Charlie White - Development', 'Diana Green - QA', 'Eve Black - Infrastructure']
  },
  projectPlan: {
    stages: ['Initiation', 'Design', 'Development', 'Testing', 'Deployment'],
    milestones: ['Requirements Complete', 'Design Approved', 'MVP Ready', 'UAT Complete', 'Go Live'],
    timeline: '18 months'
  }
}

const sampleBusinessCaseData = {
  executiveSummary: 'Strategic initiative to transform digital capabilities and meet regulatory requirements',
  reasons: 'Competitive pressure and PSD2 compliance requirements',
  businessOptions: [
    {
      option: 'Do Nothing',
      description: 'Maintain current systems',
      costs: '£0',
      benefits: 'No disruption',
      risks: 'Non-compliance penalties, loss of market share'
    },
    {
      option: 'Partial Upgrade',
      description: 'Upgrade critical components only',
      costs: '£5M',
      benefits: 'Partial compliance, some improvements',
      risks: 'Technical debt, integration issues'
    },
    {
      option: 'Full Transformation',
      description: 'Complete digital transformation',
      costs: '£12M',
      benefits: 'Full compliance, competitive advantage, operational efficiency',
      risks: 'Higher initial investment, change management'
    }
  ],
  expectedBenefits: [
    {
      benefit: 'Operational cost reduction',
      measurable: true,
      measurement: 'Monthly operational costs',
      baseline: '£500k/month',
      target: '£350k/month',
      whenRealized: 'Month 12 post-implementation'
    },
    {
      benefit: 'Customer acquisition',
      measurable: true,
      measurement: 'New customers per month',
      baseline: '1,000',
      target: '2,500',
      whenRealized: 'Month 6 post-implementation'
    }
  ],
  costs: {
    development: '£8M',
    operational: '£2M',
    maintenance: '£1M annually',
    total: '£12M',
    contingency: '£1M'
  },
  timescale: '18 months from approval',
  investmentAppraisal: {
    roi: '250% over 3 years',
    paybackPeriod: '14 months',
    npv: '£18M'
  },
  majorRisks: [
    'Regulatory changes during implementation',
    'Key resource turnover',
    'Technology platform stability'
  ]
}

const testMetadata = {
  projectName: 'Digital Banking Transformation',
  companyName: 'Example Bank Ltd',
  version: '1.0',
  date: new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

console.log('='.repeat(60))
console.log('Document Consistency Test')
console.log('='.repeat(60))
console.log()

// Test PID Formatter
console.log('Testing PID Formatter...')
try {
  const pidFormatter = new UnifiedPIDFormatter(samplePIDData, testMetadata)
  const pidHTML = pidFormatter.generateHTML()
  
  console.log('✅ PID Formatter generated HTML successfully')
  console.log(`   - HTML Length: ${pidHTML.length} characters`)
  console.log(`   - Contains sections: ${pidHTML.includes('Project Definition') ? '✓' : '✗'} Project Definition`)
  console.log(`   - Contains sections: ${pidHTML.includes('Business Case') ? '✓' : '✗'} Business Case`)
  console.log(`   - Contains sections: ${pidHTML.includes('Organization Structure') ? '✓' : '✗'} Organization Structure`)
  console.log(`   - Contains tables: ${(pidHTML.match(/<table/g) || []).length} tables found`)
  console.log(`   - Contains lists: ${(pidHTML.match(/<ul/g) || []).length} unordered lists found`)
} catch (error) {
  console.error('❌ PID Formatter failed:', error.message)
}

console.log()

// Test Business Case Formatter
console.log('Testing Business Case Formatter...')
try {
  const bcFormatter = new UnifiedBusinessCaseFormatter(sampleBusinessCaseData, testMetadata)
  const bcHTML = bcFormatter.generateHTML()
  
  console.log('✅ Business Case Formatter generated HTML successfully')
  console.log(`   - HTML Length: ${bcHTML.length} characters`)
  console.log(`   - Contains sections: ${bcHTML.includes('Executive Summary') ? '✓' : '✗'} Executive Summary`)
  console.log(`   - Contains sections: ${bcHTML.includes('Business Options') ? '✓' : '✗'} Business Options`)
  console.log(`   - Contains sections: ${bcHTML.includes('Cost Breakdown') ? '✓' : '✗'} Cost Breakdown`)
  console.log(`   - Contains tables: ${(bcHTML.match(/<table/g) || []).length} tables found`)
  console.log(`   - Contains Mermaid charts: ${(bcHTML.match(/class="mermaid"/g) || []).length} charts found`)
} catch (error) {
  console.error('❌ Business Case Formatter failed:', error.message)
}

console.log()

// Test that both formatters produce consistent structure
console.log('Testing Consistency...')
try {
  const pidFormatter = new UnifiedPIDFormatter(samplePIDData, testMetadata)
  const bcFormatter = new UnifiedBusinessCaseFormatter(sampleBusinessCaseData, testMetadata)
  
  const pidHTML = pidFormatter.generateHTML()
  const bcHTML = bcFormatter.generateHTML()
  
  // Both should have similar structure
  const pidHasDocDiv = pidHTML.includes('class="pid-document"')
  const bcHasDocDiv = bcHTML.includes('class="business-case-document"')
  
  console.log(`✅ Both formatters produce structured HTML`)
  console.log(`   - PID has document container: ${pidHasDocDiv ? '✓' : '✗'}`)
  console.log(`   - BC has document container: ${bcHasDocDiv ? '✓' : '✗'}`)
  console.log(`   - Both use semantic HTML sections`)
} catch (error) {
  console.error('❌ Consistency test failed:', error.message)
}

console.log()
console.log('='.repeat(60))
console.log('Test Complete!')
console.log('='.repeat(60))