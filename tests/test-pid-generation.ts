#!/usr/bin/env npx tsx
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { DocumentGenerator } from './lib/documents/generator'
import { DataSanitizer } from './lib/llm/sanitizer'

// Test configurations for iterative testing
const TEST_CONFIGS = [
  { maxTokens: 1500, reasoningEffort: 'minimal' as const, description: '1500 tokens, minimal reasoning' },
  { maxTokens: 2000, reasoningEffort: 'minimal' as const, description: '2000 tokens, minimal reasoning' },
  { maxTokens: 2500, reasoningEffort: 'minimal' as const, description: '2500 tokens, minimal reasoning' },
  { maxTokens: 2500, reasoningEffort: 'low' as const, description: '2500 tokens, low reasoning' },
  { maxTokens: 3000, reasoningEffort: 'low' as const, description: '3000 tokens, low reasoning' },
  { maxTokens: 3500, reasoningEffort: 'low' as const, description: '3500 tokens, low reasoning' },
  { maxTokens: 4000, reasoningEffort: 'low' as const, description: '4000 tokens, low reasoning' },
  { maxTokens: 4000, reasoningEffort: 'medium' as const, description: '4000 tokens, medium reasoning' },
]

// Test project data
const testProjectData = {
  projectName: 'Digital Transformation Initiative',
  vision: 'To modernize our operations and enhance customer experience',
  businessCase: 'Improve efficiency, reduce costs, and increase customer satisfaction',
  description: 'A comprehensive digital transformation program to modernize legacy systems',
  companyWebsite: 'https://example.com',
  methodology: 'prince2' as const,
  sector: 'Technology',
  stakeholders: [
    { name: 'John Smith', email: 'john@example.com', role: 'Project Sponsor' },
    { name: 'Jane Doe', email: 'jane@example.com', role: 'Business Analyst' }
  ],
  agilometer: {
    flexibility: 70,
    teamExperience: 80,
    riskTolerance: 60,
    documentation: 50,
    governance: 40
  }
}

// GPT-5 nano pricing (per 1M tokens)
const PRICING = {
  input: 0.025,  // $0.025 per 1M input tokens
  output: 0.200  // $0.200 per 1M output tokens
}

interface TestResult {
  config: typeof TEST_CONFIGS[0]
  success: boolean
  error?: string
  tokenUsage?: {
    input: number
    output: number
    reasoning?: number // Estimated
    total: number
  }
  cost?: number
  duration?: number
  documentQuality?: {
    hasAllSections: boolean
    sectionCount: number
    wordCount: number
  }
}

async function testPIDGeneration(): Promise<TestResult[]> {
  console.log('🧪 Testing PID Generation with GPT-5 nano')
  console.log('=' .repeat(60))
  console.log('Using Vercel AI Provider with forced GPT-5 nano model')
  console.log('=' .repeat(60))
  
  const results: TestResult[] = []
  const sanitizer = new DataSanitizer()
  
  // Sanitize test data once
  const sanitized = sanitizer.sanitizeProjectData(testProjectData)
  console.log('\n✅ Data sanitized successfully\n')
  
  // Test each configuration
  for (const config of TEST_CONFIGS) {
    console.log(`\n📋 Testing: ${config.description}`)
    console.log('-'.repeat(40))
    
    // Dynamically update DOCUMENT_CONFIG for testing
    const originalConfig = await updateDocumentConfig('pid', config)
    
    try {
      const generator = new DocumentGenerator({ provider: 'vercel-ai' })
      const startTime = Date.now()
      
      // Call the private method directly for testing
      const pidDoc = await (generator as any).generatePrince2PID(sanitized, 'test-pid-001')
      
      const duration = Date.now() - startTime
      
      // Analyze the response
      const content = JSON.stringify(pidDoc.content)
      const wordCount = content.split(/\s+/).length
      const sections = Object.keys(pidDoc.content || {})
      
      // Extract token usage from metadata if available
      const debugInfo = (generator as any).getDebugInfo?.() || {}
      const tokenUsage = calculateTokenUsage(content, config)
      const cost = calculateCost(tokenUsage)
      
      const result: TestResult = {
        config,
        success: true,
        duration,
        tokenUsage,
        cost,
        documentQuality: {
          hasAllSections: sections.length >= 5, // PID should have at least 5 main sections
          sectionCount: sections.length,
          wordCount
        }
      }
      
      results.push(result)
      
      console.log('✅ SUCCESS!')
      console.log(`   Duration: ${duration}ms`)
      console.log(`   Token Usage:`)
      console.log(`     - Input: ${tokenUsage.input}`)
      console.log(`     - Output: ${tokenUsage.output}`)
      console.log(`     - Reasoning (est.): ${tokenUsage.reasoning}`)
      console.log(`     - Total: ${tokenUsage.total}`)
      console.log(`   Cost: $${cost.toFixed(4)}`)
      console.log(`   Quality:`)
      console.log(`     - Sections: ${sections.length}`)
      console.log(`     - Words: ${wordCount}`)
      console.log(`     - Complete: ${result.documentQuality?.hasAllSections ? 'Yes' : 'No'}`)
      
      // If successful, we found our optimal configuration
      console.log('\n🎉 Found working configuration!')
      break
      
    } catch (error: any) {
      const result: TestResult = {
        config,
        success: false,
        error: error.message
      }
      results.push(result)
      
      console.log('❌ FAILED')
      console.log(`   Error: ${error.message}`)
      
      // Check if it's a token limit error
      if (error.message.includes('length') || error.message.includes('token')) {
        console.log('   → Token limit exceeded, trying next configuration...')
      }
    } finally {
      // Restore original config
      await restoreDocumentConfig('pid', originalConfig)
    }
  }
  
  return results
}

function calculateTokenUsage(content: string, config: any) {
  // Rough estimation of tokens
  const outputTokens = Math.ceil(content.length / 4)
  const inputTokens = 500 // Estimated prompt size
  
  // GPT-5 reasoning multiplier (5-10x based on effort level)
  const reasoningMultipliers = {
    minimal: 3,
    low: 5,
    medium: 7,
    high: 10
  }
  const multiplier = reasoningMultipliers[config.reasoningEffort] || 5
  const reasoningTokens = outputTokens * multiplier
  
  return {
    input: inputTokens,
    output: outputTokens,
    reasoning: reasoningTokens,
    total: inputTokens + outputTokens + reasoningTokens
  }
}

function calculateCost(tokenUsage: any): number {
  const inputCost = (tokenUsage.input / 1_000_000) * PRICING.input
  const outputCost = ((tokenUsage.output + tokenUsage.reasoning) / 1_000_000) * PRICING.output
  return inputCost + outputCost
}

async function updateDocumentConfig(docType: string, config: any) {
  // Dynamically update the DOCUMENT_CONFIG in the generator file
  const fs = await import('fs')
  const generatorPath = './lib/documents/generator.ts'
  
  const content = await fs.promises.readFile(generatorPath, 'utf-8')
  
  // Extract current config for backup
  const configMatch = content.match(new RegExp(`${docType}: { maxTokens: (\\d+), reasoningEffort: '(\\w+)' as const }`))
  const original = configMatch ? {
    maxTokens: parseInt(configMatch[1]),
    reasoningEffort: configMatch[2]
  } : { maxTokens: 1500, reasoningEffort: 'low' }
  
  // Update with new config
  const newConfigLine = `${docType}: { maxTokens: ${config.maxTokens}, reasoningEffort: '${config.reasoningEffort}' as const }`
  const updatedContent = content.replace(
    new RegExp(`${docType}: { maxTokens: \\d+, reasoningEffort: '\\w+' as const }`),
    newConfigLine
  )
  
  await fs.promises.writeFile(generatorPath, updatedContent)
  console.log(`   Updated config: maxTokens=${config.maxTokens}, reasoning=${config.reasoningEffort}`)
  
  return original
}

async function restoreDocumentConfig(docType: string, originalConfig: any) {
  const fs = await import('fs')
  const generatorPath = './lib/documents/generator.ts'
  
  const content = await fs.promises.readFile(generatorPath, 'utf-8')
  const restoredLine = `${docType}: { maxTokens: ${originalConfig.maxTokens}, reasoningEffort: '${originalConfig.reasoningEffort}' as const }`
  const updatedContent = content.replace(
    new RegExp(`${docType}: { maxTokens: \\d+, reasoningEffort: '\\w+' as const }`),
    restoredLine
  )
  
  await fs.promises.writeFile(generatorPath, updatedContent)
}

async function generateSummaryReport(results: TestResult[]) {
  console.log('\n' + '='.repeat(60))
  console.log('📊 TESTING SUMMARY')
  console.log('='.repeat(60))
  
  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)
  
  console.log(`\nTests Run: ${results.length}`)
  console.log(`Successful: ${successful.length}`)
  console.log(`Failed: ${failed.length}`)
  
  if (successful.length > 0) {
    console.log('\n✅ OPTIMAL CONFIGURATION FOUND:')
    const optimal = successful[0]
    console.log(`   Max Tokens: ${optimal.config.maxTokens}`)
    console.log(`   Reasoning Effort: ${optimal.config.reasoningEffort}`)
    console.log(`   Estimated Cost: $${optimal.cost?.toFixed(4)}`)
    console.log(`   Generation Time: ${optimal.duration}ms`)
    
    console.log('\n📈 RECOMMENDATIONS:')
    console.log(`   1. Use ${optimal.config.maxTokens} tokens for PID generation`)
    console.log(`   2. Set reasoning effort to '${optimal.config.reasoningEffort}'`)
    console.log(`   3. Expected cost per PID: ~$${optimal.cost?.toFixed(4)}`)
    console.log(`   4. Apply similar approach to other document types`)
  } else {
    console.log('\n❌ No successful configuration found')
    console.log('   Consider increasing token limits further or adjusting prompts')
  }
  
  // Save results to file for analysis
  const fs = await import('fs')
  const reportPath = 'pid-test-results.json'
  await fs.promises.writeFile(
    reportPath,
    JSON.stringify(results, null, 2)
  )
  console.log(`\n📄 Detailed results saved to: ${reportPath}`)
}

// Main execution
async function main() {
  try {
    const results = await testPIDGeneration()
    await generateSummaryReport(results)
  } catch (error: any) {
    console.error('\n❌ Test suite failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run the test
main().catch(console.error)