#!/usr/bin/env ts-node

/**
 * Automated Document Generation Testing Script
 * Tests the new web search tools implementation
 * Validates that generated content meets requirements
 */

import { DocumentGenerator } from '../lib/documents/generator'
import { ComparableProjectsValidator } from '../lib/documents/validators/comparable-projects-validator'
import { getDocumentToolConfig, DOCUMENT_TOOL_CONFIG } from '../lib/documents/tool-config'
import * as fs from 'fs/promises'
import * as path from 'path'
import { config } from 'dotenv'

// Load environment variables
config()

// Test configuration
const TEST_CONFIG = {
  outputDir: 'test-results',
  saveContent: true,
  verbose: true,
  maxRetries: 3
}

// Test project data
const TEST_PROJECT_DATA = {
  projectName: 'Global Digital Banking Platform',
  description: 'Transform legacy banking systems into a modern cloud-native digital banking platform with AI-powered customer service and real-time transaction processing',
  sector: 'Banking',
  companyWebsite: 'https://example-bank.com',
  vision: 'Become the leading digital-first bank in North America by delivering exceptional customer experiences through innovative technology',
  businessCase: 'Reduce operational costs by 40% while increasing customer satisfaction scores to 95% through digital transformation',
  budget: '$75,000,000',
  timeline: '24 months',
  startDate: '2025-01-01',
  endDate: '2026-12-31',
  estimatedDuration: '24 months',
  methodology: 'agile',
  scope: 'Complete transformation of retail banking, commercial banking, and wealth management platforms',
  objectives: [
    'Modernize core banking infrastructure',
    'Implement AI-powered customer service',
    'Enable real-time payments and transactions',
    'Achieve 99.99% system uptime'
  ],
  stakeholders: [
    { name: 'Michael Chen', role: 'CEO', influence: 'high' },
    { name: 'Sarah Johnson', role: 'CTO', influence: 'high' },
    { name: 'David Williams', role: 'CFO', influence: 'high' },
    { name: 'Emily Rodriguez', role: 'Head of Digital Banking', influence: 'medium' },
    { name: 'James Thompson', role: 'Chief Risk Officer', influence: 'medium' }
  ],
  risks: [
    'Legacy system integration complexity',
    'Regulatory compliance requirements',
    'Data migration risks'
  ]
}

interface TestResult {
  documentType: string
  success: boolean
  validationScore?: number
  validationDetails?: any
  errors: string[]
  warnings: string[]
  duration: number
  modelUsed: string
  toolsUsed: boolean
  webSearchUsed?: boolean
  contentLength: number
  retryCount: number
  timestamp: Date
}

class DocumentGenerationTester {
  private generator: DocumentGenerator
  private results: TestResult[] = []
  private outputDir: string

  constructor() {
    this.generator = new DocumentGenerator({ 
      useCache: false,
      provider: 'vercel-ai' // Ensure we're using the right provider
    })
    this.outputDir = path.join(process.cwd(), TEST_CONFIG.outputDir, new Date().toISOString().replace(/[:.]/g, '-'))
  }

  /**
   * Initialize test environment
   */
  async initialize(): Promise<void> {
    // Create output directory
    await fs.mkdir(this.outputDir, { recursive: true })
    console.log(`📁 Test output directory: ${this.outputDir}`)
    
    // Verify environment
    this.verifyEnvironment()
  }

  /**
   * Verify environment configuration
   */
  private verifyEnvironment(): void {
    console.log('\n🔍 Verifying environment configuration...')
    
    const checks = [
      { name: 'OPENAI_API_KEY', value: process.env.OPENAI_API_KEY, required: true },
      { name: 'Node Version', value: process.version, required: true }
    ]
    
    let hasErrors = false
    checks.forEach(check => {
      if (check.required && !check.value) {
        console.error(`  ❌ ${check.name}: Not configured`)
        hasErrors = true
      } else if (check.value) {
        const displayValue = check.name.includes('KEY') 
          ? check.value.substring(0, 10) + '...' 
          : check.value
        console.log(`  ✅ ${check.name}: ${displayValue}`)
      }
    })
    
    if (hasErrors) {
      throw new Error('Environment configuration incomplete')
    }
  }

  /**
   * Test a single document type
   */
  async testDocument(documentType: string, retryOnFailure: boolean = true): Promise<TestResult> {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`📄 Testing: ${documentType.toUpperCase()}`)
    console.log(`${'='.repeat(80)}`)
    
    const result: TestResult = {
      documentType,
      success: false,
      errors: [],
      warnings: [],
      duration: 0,
      modelUsed: '',
      toolsUsed: false,
      contentLength: 0,
      retryCount: 0,
      timestamp: new Date()
    }
    
    const startTime = Date.now()
    const maxRetries = retryOnFailure ? TEST_CONFIG.maxRetries : 1
    
    // Get tool configuration
    const toolConfig = getDocumentToolConfig(documentType)
    result.modelUsed = toolConfig.model
    result.toolsUsed = toolConfig.tools.length > 0
    
    console.log(`  📋 Configuration:`)
    console.log(`     Model: ${toolConfig.model}`)
    console.log(`     Web Search: ${toolConfig.tools.some(t => t.type === 'web_search' && t.enabled !== false) ? 'Enabled' : 'Disabled'}`)
    console.log(`     Validation Required: ${toolConfig.validationRequired}`)
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`\n  🔄 Attempt ${attempt}/${maxRetries}...`)
        
        // Generate document
        const doc = await this.generator.generateDocument(
          documentType,
          TEST_PROJECT_DATA,
          `test-${documentType}-${Date.now()}`
        )
        
        // Extract content
        let content = ''
        if (typeof doc.content === 'string') {
          content = doc.content
        } else if (doc.content?.analysis) {
          content = doc.content.analysis
        } else if (doc.content?.plan) {
          content = typeof doc.content.plan === 'string' 
            ? doc.content.plan 
            : JSON.stringify(doc.content.plan, null, 2)
        } else {
          content = JSON.stringify(doc.content, null, 2)
        }
        
        result.contentLength = content.length
        console.log(`  ✅ Generated ${content.length} characters`)
        
        // Check if web search was used
        result.webSearchUsed = doc.metadata?.toolsUsed || doc.aiInsights?.webSearchUsed
        if (result.webSearchUsed) {
          console.log(`  🔍 Web search was used`)
        }
        
        // Save content if configured
        if (TEST_CONFIG.saveContent) {
          const filename = `${documentType}-attempt-${attempt}.md`
          const filepath = path.join(this.outputDir, filename)
          await fs.writeFile(filepath, content)
          console.log(`  💾 Saved to: ${filename}`)
        }
        
        // Validate content if it's a comparable projects document
        if (documentType === 'comparable_projects') {
          console.log(`\n  🧪 Validating content...`)
          const validation = ComparableProjectsValidator.validate(content, TEST_PROJECT_DATA.sector)
          
          result.validationScore = validation.score
          result.validationDetails = validation
          
          console.log(`  📊 Validation Score: ${validation.score}%`)
          
          // Log validation details
          validation.checks.forEach(check => {
            const icon = check.passed ? '✅' : '❌'
            console.log(`     ${icon} ${check.name}: ${check.details}`)
            
            if (!check.passed) {
              result.warnings.push(`${check.name}: ${check.details}`)
            }
          })
          
          // Check if validation passed
          if (validation.isValid) {
            result.success = true
            console.log(`  ✅ Validation PASSED`)
            
            // Save validation report
            const reportPath = path.join(this.outputDir, `${documentType}-validation-report.md`)
            const report = ComparableProjectsValidator.generateReport(validation)
            await fs.writeFile(reportPath, report)
            console.log(`  📄 Validation report saved`)
            
            break // Success, exit retry loop
          } else {
            console.log(`  ⚠️ Validation FAILED`)
            
            if (attempt < maxRetries) {
              console.log(`  🔄 Retrying with enhanced prompts...`)
              result.retryCount++
              continue
            }
          }
        } else if (documentType === 'technical_landscape') {
          // Basic validation for technical landscape
          const hasRealTech = /AWS|Azure|Google Cloud|Kubernetes|Docker/i.test(content)
          const hasVersions = /\d+\.\d+/g.test(content)
          const hasURLs = /https?:\/\/[^\s]+/g.test(content)
          
          console.log(`\n  🧪 Basic validation:`)
          console.log(`     ${hasRealTech ? '✅' : '❌'} Real technologies mentioned`)
          console.log(`     ${hasVersions ? '✅' : '❌'} Version numbers included`)
          console.log(`     ${hasURLs ? '✅' : '❌'} URLs included`)
          
          result.success = hasRealTech && content.length > 1000
          
          if (result.success) {
            console.log(`  ✅ Document generated successfully`)
            break
          } else if (attempt < maxRetries) {
            console.log(`  🔄 Retrying...`)
            result.retryCount++
            continue
          }
        } else {
          // For other documents, just check content exists
          result.success = content.length > 500
          if (result.success) {
            console.log(`  ✅ Document generated successfully`)
          }
          break
        }
        
      } catch (error: any) {
        console.error(`  ❌ Error: ${error.message}`)
        result.errors.push(error.message)
        result.retryCount++
        
        if (attempt === maxRetries) {
          result.success = false
        }
      }
    }
    
    result.duration = Date.now() - startTime
    console.log(`\n  ⏱️ Total duration: ${(result.duration / 1000).toFixed(2)}s`)
    
    return result
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<void> {
    console.log('\n🚀 AUTOMATED DOCUMENT GENERATION TEST SUITE')
    console.log(`Testing with web search tools implementation`)
    console.log(`Timestamp: ${new Date().toISOString()}`)
    
    await this.initialize()
    
    // Documents to test (in order of priority)
    const documentsToTest = [
      'comparable_projects',  // Primary focus - requires web search
      'technical_landscape',  // Also uses web search
      'risk_register',        // Optional web search
      'project_plan',         // No web search
      'charter'              // No web search
    ]
    
    for (const docType of documentsToTest) {
      const result = await this.testDocument(docType)
      this.results.push(result)
      
      // Add delay between tests to avoid rate limits
      if (documentsToTest.indexOf(docType) < documentsToTest.length - 1) {
        console.log(`\n⏳ Waiting 3 seconds before next test...`)
        await new Promise(resolve => setTimeout(resolve, 3000))
      }
    }
    
    // Generate final report
    await this.generateReport()
  }

  /**
   * Generate test report
   */
  async generateReport(): Promise<void> {
    console.log(`\n${'='.repeat(80)}`)
    console.log('📊 TEST RESULTS SUMMARY')
    console.log(`${'='.repeat(80)}`)
    
    const passed = this.results.filter(r => r.success).length
    const failed = this.results.filter(r => !r.success).length
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0)
    
    console.log(`\n📈 Overall Statistics:`)
    console.log(`  Total Tests: ${this.results.length}`)
    console.log(`  Passed: ${passed} (${Math.round(passed / this.results.length * 100)}%)`)
    console.log(`  Failed: ${failed}`)
    console.log(`  Total Duration: ${(totalDuration / 1000).toFixed(2)}s`)
    
    console.log(`\n📋 Individual Results:`)
    console.log(`${'─'.repeat(80)}`)
    console.log(`Document Type         | Status | Score | Model       | Web Search | Retries`)
    console.log(`${'─'.repeat(80)}`)
    
    this.results.forEach(result => {
      const status = result.success ? '✅ PASS' : '❌ FAIL'
      const score = result.validationScore ? `${result.validationScore}%` : 'N/A'
      const webSearch = result.webSearchUsed ? 'Yes' : 'No'
      
      console.log(
        `${result.documentType.padEnd(20)} | ${status} | ${score.padEnd(5)} | ${result.modelUsed.padEnd(11)} | ${webSearch.padEnd(10)} | ${result.retryCount}`
      )
    })
    
    // Detailed findings for web search documents
    console.log(`\n🔍 Web Search Document Analysis:`)
    
    const webSearchDocs = this.results.filter(r => 
      ['comparable_projects', 'technical_landscape'].includes(r.documentType)
    )
    
    webSearchDocs.forEach(result => {
      console.log(`\n  ${result.documentType.toUpperCase()}:`)
      console.log(`    Model Used: ${result.modelUsed}`)
      console.log(`    Web Search Used: ${result.webSearchUsed ? '✅' : '❌'}`)
      
      if (result.validationScore !== undefined) {
        console.log(`    Validation Score: ${result.validationScore}%`)
        
        if (result.validationDetails) {
          const failedChecks = result.validationDetails.checks.filter((c: any) => !c.passed)
          if (failedChecks.length > 0) {
            console.log(`    Failed Checks:`)
            failedChecks.forEach((check: any) => {
              console.log(`      - ${check.name}: ${check.details}`)
            })
          }
        }
      }
      
      if (result.warnings.length > 0) {
        console.log(`    Warnings:`)
        result.warnings.forEach(w => console.log(`      - ${w}`))
      }
    })
    
    // Save JSON report
    const reportPath = path.join(this.outputDir, 'test-report.json')
    await fs.writeFile(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.length,
        passed,
        failed,
        duration: totalDuration
      },
      results: this.results,
      environment: {
        nodeVersion: process.version,
        platform: process.platform
      }
    }, null, 2))
    
    console.log(`\n📄 Full report saved to: ${reportPath}`)
    
    // Generate markdown report
    await this.generateMarkdownReport()
    
    // Final status
    console.log(`\n${'='.repeat(80)}`)
    if (failed === 0) {
      console.log('✅ ALL TESTS PASSED!')
    } else {
      console.log(`⚠️ ${failed} TEST(S) FAILED`)
      console.log('\nRecommendations:')
      console.log('1. Check that OpenAI API key has access to GPT-4o models')
      console.log('2. Verify web search tool is properly configured in OpenAI account')
      console.log('3. Review failed validation checks and adjust prompts accordingly')
      console.log('4. Consider increasing retry attempts or search depth')
    }
    console.log(`${'='.repeat(80)}`)
  }

  /**
   * Generate markdown report
   */
  async generateMarkdownReport(): Promise<void> {
    let md = `# Document Generation Test Report\n\n`
    md += `**Date**: ${new Date().toISOString()}\n`
    md += `**Test Suite**: Web Search Tools Implementation\n\n`
    
    md += `## Summary\n\n`
    const passed = this.results.filter(r => r.success).length
    md += `- **Total Tests**: ${this.results.length}\n`
    md += `- **Passed**: ${passed}\n`
    md += `- **Failed**: ${this.results.length - passed}\n`
    md += `- **Success Rate**: ${Math.round(passed / this.results.length * 100)}%\n\n`
    
    md += `## Test Results\n\n`
    md += `| Document Type | Status | Validation Score | Model | Web Search | Retries | Duration |\n`
    md += `|--------------|--------|------------------|-------|------------|---------|----------|\n`
    
    this.results.forEach(result => {
      const status = result.success ? '✅ PASS' : '❌ FAIL'
      const score = result.validationScore ? `${result.validationScore}%` : 'N/A'
      const webSearch = result.webSearchUsed ? 'Yes' : 'No'
      const duration = `${(result.duration / 1000).toFixed(1)}s`
      
      md += `| ${result.documentType} | ${status} | ${score} | ${result.modelUsed} | ${webSearch} | ${result.retryCount} | ${duration} |\n`
    })
    
    md += `\n## Detailed Validation Results\n\n`
    
    this.results.forEach(result => {
      if (result.validationDetails) {
        md += `### ${result.documentType}\n\n`
        md += `**Validation Score**: ${result.validationScore}%\n\n`
        md += `**Checks**:\n\n`
        
        result.validationDetails.checks.forEach((check: any) => {
          const icon = check.passed ? '✅' : '❌'
          md += `- ${icon} **${check.name}**: ${check.details}\n`
        })
        
        md += `\n`
      }
    })
    
    md += `## Configuration\n\n`
    md += `### Tool Configuration\n\n`
    md += `| Document Type | Model | Web Search | Validation Required |\n`
    md += `|--------------|-------|------------|--------------------|\n`
    
    Object.entries(DOCUMENT_TOOL_CONFIG).forEach(([docType, config]) => {
      const webSearch = config.tools.some(t => t.type === 'web_search' && t.enabled !== false)
      md += `| ${docType} | ${config.model} | ${webSearch ? 'Yes' : 'No'} | ${config.validationRequired ? 'Yes' : 'No'} |\n`
    })
    
    md += `\n## Test Project Data\n\n`
    md += `- **Project**: ${TEST_PROJECT_DATA.projectName}\n`
    md += `- **Sector**: ${TEST_PROJECT_DATA.sector}\n`
    md += `- **Budget**: ${TEST_PROJECT_DATA.budget}\n`
    md += `- **Timeline**: ${TEST_PROJECT_DATA.timeline}\n`
    md += `- **Methodology**: ${TEST_PROJECT_DATA.methodology}\n`
    
    const mdPath = path.join(this.outputDir, 'test-report.md')
    await fs.writeFile(mdPath, md)
    console.log(`📄 Markdown report saved to: test-report.md`)
  }
}

// Main execution
async function main() {
  try {
    const tester = new DocumentGenerationTester()
    await tester.runAllTests()
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Test suite failed with error:', error)
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  main()
}