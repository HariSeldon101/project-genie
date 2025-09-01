/**
 * Automated Document Test Runner
 * Tests document generation with web search and validates output quality
 */

import { DocumentGenerator } from './generator'
import { ComparableProjectsValidator } from './validators/comparable-projects-validator'
import { getDocumentToolConfig, setWebSearchEnabled } from './tool-config'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs/promises'
import path from 'path'

export interface TestCase {
  documentType: string
  projectData: any
  expectedValidation: boolean
  retryOnFailure: boolean
}

export interface TestResult {
  documentType: string
  passed: boolean
  score: number
  validationResult?: any
  retryCount: number
  errors: string[]
  duration: number
  modelUsed: string
  toolsUsed: boolean
  content?: string
}

export interface TestReport {
  timestamp: Date
  totalTests: number
  passed: number
  failed: number
  results: TestResult[]
  overallScore: number
  recommendations: string[]
  costEstimate: number
}

export class DocumentTestRunner {
  private generator: DocumentGenerator
  private testResults: TestResult[] = []
  
  constructor() {
    this.generator = new DocumentGenerator({ useCache: false })
  }

  /**
   * Run a single test case
   */
  async runTest(testCase: TestCase): Promise<TestResult> {
    const startTime = Date.now()
    const result: TestResult = {
      documentType: testCase.documentType,
      passed: false,
      score: 0,
      retryCount: 0,
      errors: [],
      duration: 0,
      modelUsed: '',
      toolsUsed: false
    }
    
    const maxRetries = testCase.retryOnFailure ? 3 : 1
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`\n🧪 Testing ${testCase.documentType} (Attempt ${attempt}/${maxRetries})...`)
        
        // Get tool configuration
        const toolConfig = getDocumentToolConfig(testCase.documentType)
        result.modelUsed = toolConfig.model
        result.toolsUsed = toolConfig.tools.some(t => t.type === 'web_search')
        
        // Generate document
        const doc = await this.generator.generateDocument(
          testCase.documentType,
          testCase.projectData,
          'test-project-' + Date.now()
        )
        
        // Extract content
        let content = ''
        if (typeof doc.content === 'string') {
          content = doc.content
        } else if (doc.content?.analysis) {
          content = doc.content.analysis
        } else if (doc.content?.plan) {
          content = JSON.stringify(doc.content.plan)
        } else {
          content = JSON.stringify(doc.content)
        }
        
        result.content = content
        
        // Validate if this is a comparable projects document
        if (testCase.documentType === 'comparable_projects') {
          const validation = ComparableProjectsValidator.validate(
            content,
            testCase.projectData.sector
          )
          
          result.validationResult = validation
          result.score = validation.score
          result.passed = validation.isValid
          
          console.log(`  📊 Validation Score: ${validation.score}%`)
          console.log(`  ${validation.isValid ? '✅' : '❌'} ${validation.summary}`)
          
          // Log failed checks
          const failedChecks = validation.checks.filter(c => !c.passed)
          if (failedChecks.length > 0) {
            console.log(`  ⚠️ Failed checks:`)
            failedChecks.forEach(check => {
              console.log(`    - ${check.name}: ${check.details}`)
              result.errors.push(`${check.name}: ${check.details}`)
            })
          }
          
          // If validation failed and we have retries left, continue
          if (!validation.isValid && attempt < maxRetries) {
            console.log(`  🔄 Retrying with enhanced prompts...`)
            result.retryCount++
            
            // Optionally enable more aggressive web search
            if (attempt === 2) {
              console.log(`  🔍 Enabling comprehensive web search...`)
              setWebSearchEnabled(testCase.documentType, true)
            }
            continue
          }
        } else {
          // For other document types, just check if content exists
          result.passed = content.length > 100
          result.score = result.passed ? 100 : 0
        }
        
        // If we got here and passed, break out of retry loop
        if (result.passed) {
          console.log(`  ✅ Test passed!`)
          break
        }
        
      } catch (error: any) {
        console.error(`  ❌ Error: ${error.message}`)
        result.errors.push(error.message)
        result.retryCount++
        
        if (attempt === maxRetries) {
          result.passed = false
          result.score = 0
        }
      }
    }
    
    result.duration = Date.now() - startTime
    console.log(`  ⏱️ Duration: ${(result.duration / 1000).toFixed(2)}s`)
    
    return result
  }

  /**
   * Run all tests
   */
  async runAllTests(testCases: TestCase[]): Promise<TestReport> {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`🚀 DOCUMENT GENERATION TEST SUITE`)
    console.log(`${'='.repeat(80)}`)
    console.log(`Running ${testCases.length} tests...`)
    
    this.testResults = []
    
    for (const testCase of testCases) {
      const result = await this.runTest(testCase)
      this.testResults.push(result)
      
      // Add a delay between tests to avoid rate limits
      if (testCases.indexOf(testCase) < testCases.length - 1) {
        console.log(`  ⏳ Waiting 2s before next test...`)
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    
    // Generate report
    const report = this.generateReport()
    
    // Save report to file
    await this.saveReport(report)
    
    // Print summary
    this.printSummary(report)
    
    return report
  }

  /**
   * Generate test report
   */
  private generateReport(): TestReport {
    const passed = this.testResults.filter(r => r.passed).length
    const failed = this.testResults.length - passed
    
    const overallScore = this.testResults.length > 0
      ? Math.round(this.testResults.reduce((sum, r) => sum + r.score, 0) / this.testResults.length)
      : 0
    
    const recommendations = this.generateRecommendations()
    const costEstimate = this.estimateCost()
    
    return {
      timestamp: new Date(),
      totalTests: this.testResults.length,
      passed,
      failed,
      results: this.testResults,
      overallScore,
      recommendations,
      costEstimate
    }
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = []
    
    // Check for web search issues
    const webSearchTests = this.testResults.filter(r => r.toolsUsed)
    const webSearchFailures = webSearchTests.filter(r => !r.passed)
    
    if (webSearchFailures.length > 0) {
      recommendations.push('Web search is not returning real company data - check API configuration')
      recommendations.push('Consider increasing web search depth or max results')
    }
    
    // Check for validation issues
    this.testResults.forEach(result => {
      if (result.validationResult && !result.passed) {
        const failedChecks = result.validationResult.checks.filter((c: any) => !c.passed)
        
        if (failedChecks.some((c: any) => c.name === 'real_companies')) {
          recommendations.push(`${result.documentType}: Add explicit instructions to search for specific companies`)
        }
        if (failedChecks.some((c: any) => c.name === 'urls')) {
          recommendations.push(`${result.documentType}: Ensure web search includes source URLs in results`)
        }
        if (failedChecks.some((c: any) => c.name === 'specific_dates')) {
          recommendations.push(`${result.documentType}: Request specific date ranges in search queries`)
        }
      }
    })
    
    // Check for retry patterns
    const highRetryDocs = this.testResults.filter(r => r.retryCount >= 2)
    if (highRetryDocs.length > 0) {
      recommendations.push('Some documents require multiple retries - consider prompt optimization')
    }
    
    return [...new Set(recommendations)] // Deduplicate
  }

  /**
   * Estimate cost based on test results
   */
  private estimateCost(): number {
    let totalCost = 0
    
    this.testResults.forEach(result => {
      // Rough estimation based on model and retries
      const baseCost = result.modelUsed.includes('gpt-4o') ? 0.01 : 0.005
      const toolCost = result.toolsUsed ? 0.0025 : 0 // Web search tool cost
      const retryCost = result.retryCount * baseCost
      
      totalCost += baseCost + toolCost + retryCost
    })
    
    return Math.round(totalCost * 1000) / 1000 // Round to 3 decimal places
  }

  /**
   * Save report to file
   */
  private async saveReport(report: TestReport): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `test-report-${timestamp}.json`
    const filepath = path.join(process.cwd(), 'test-reports', filename)
    
    try {
      // Create directory if it doesn't exist
      await fs.mkdir(path.dirname(filepath), { recursive: true })
      
      // Save report
      await fs.writeFile(filepath, JSON.stringify(report, null, 2))
      console.log(`\n📄 Report saved to: ${filepath}`)
      
      // Also save a markdown version
      const markdownReport = this.generateMarkdownReport(report)
      const mdFilepath = filepath.replace('.json', '.md')
      await fs.writeFile(mdFilepath, markdownReport)
      console.log(`📄 Markdown report saved to: ${mdFilepath}`)
      
    } catch (error) {
      console.error('Failed to save report:', error)
    }
  }

  /**
   * Generate markdown report
   */
  private generateMarkdownReport(report: TestReport): string {
    let md = `# Document Generation Test Report\n\n`
    md += `**Date**: ${report.timestamp.toISOString()}\n`
    md += `**Overall Score**: ${report.overallScore}%\n`
    md += `**Tests**: ${report.passed}/${report.totalTests} passed\n`
    md += `**Estimated Cost**: $${report.costEstimate}\n\n`
    
    md += `## Test Results\n\n`
    md += `| Document Type | Passed | Score | Model | Web Search | Retries | Duration |\n`
    md += `|--------------|--------|-------|-------|------------|---------|----------|\n`
    
    report.results.forEach(result => {
      const icon = result.passed ? '✅' : '❌'
      const webSearch = result.toolsUsed ? 'Yes' : 'No'
      const duration = `${(result.duration / 1000).toFixed(1)}s`
      
      md += `| ${result.documentType} | ${icon} | ${result.score}% | ${result.modelUsed} | ${webSearch} | ${result.retryCount} | ${duration} |\n`
    })
    
    md += `\n## Validation Details\n\n`
    
    report.results.forEach(result => {
      if (result.validationResult) {
        md += `### ${result.documentType}\n\n`
        md += `**Score**: ${result.score}%\n\n`
        md += `**Checks**:\n`
        
        result.validationResult.checks.forEach((check: any) => {
          const icon = check.passed ? '✅' : '❌'
          md += `- ${icon} **${check.name}**: ${check.details}\n`
        })
        
        md += `\n`
      }
    })
    
    if (report.recommendations.length > 0) {
      md += `## Recommendations\n\n`
      report.recommendations.forEach(rec => {
        md += `- ${rec}\n`
      })
    }
    
    return md
  }

  /**
   * Print summary to console
   */
  private printSummary(report: TestReport): void {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`📊 TEST SUMMARY`)
    console.log(`${'='.repeat(80)}`)
    console.log(`Overall Score: ${report.overallScore}%`)
    console.log(`Tests Passed: ${report.passed}/${report.totalTests}`)
    console.log(`Estimated Cost: $${report.costEstimate}`)
    
    if (report.failed > 0) {
      console.log(`\n❌ Failed Tests:`)
      report.results.filter(r => !r.passed).forEach(result => {
        console.log(`  - ${result.documentType} (Score: ${result.score}%)`)
      })
    }
    
    if (report.recommendations.length > 0) {
      console.log(`\n💡 Recommendations:`)
      report.recommendations.forEach(rec => {
        console.log(`  - ${rec}`)
      })
    }
    
    console.log(`\n${'='.repeat(80)}`)
  }
}

/**
 * Default test suite
 */
export async function runDefaultTests(): Promise<TestReport> {
  const runner = new DocumentTestRunner()
  
  // Default test project data
  const testProjectData = {
    projectName: 'Digital Banking Transformation',
    description: 'Modernize core banking systems and enhance digital customer experience',
    sector: 'Banking',
    vision: 'Become the leading digital bank in North America',
    businessCase: 'Reduce operational costs by 30% and increase customer satisfaction',
    budget: '$50M',
    timeline: '18 months',
    startDate: '2025-01-01',
    endDate: '2026-06-30',
    methodology: 'agile',
    stakeholders: [
      { name: 'John Smith', role: 'Project Sponsor' },
      { name: 'Jane Doe', role: 'Technical Lead' }
    ]
  }
  
  // Define test cases
  const testCases: TestCase[] = [
    {
      documentType: 'comparable_projects',
      projectData: testProjectData,
      expectedValidation: true,
      retryOnFailure: true
    },
    {
      documentType: 'technical_landscape',
      projectData: testProjectData,
      expectedValidation: true,
      retryOnFailure: true
    }
  ]
  
  // Run tests
  return await runner.runAllTests(testCases)
}

// Allow running from command line
if (require.main === module) {
  runDefaultTests()
    .then(report => {
      console.log('\n✅ Test suite completed!')
      process.exit(report.failed > 0 ? 1 : 0)
    })
    .catch(error => {
      console.error('❌ Test suite failed:', error)
      process.exit(1)
    })
}