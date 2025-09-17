#!/usr/bin/env npx tsx
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { LLMGateway } from './lib/llm/gateway'
import { DataSanitizer } from './lib/llm/sanitizer'
import { prince2Prompts } from './lib/llm/prompts/prince2'

// Test project data for Risk Register
const testProjectData = {
  projectName: 'Digital Banking Transformation Initiative',
  vision: 'To modernize our banking operations and enhance customer experience through digital transformation',
  businessCase: 'Improve operational efficiency by 40%, reduce costs by 25%, and increase customer satisfaction scores to 90%',
  description: 'A comprehensive digital transformation program to modernize legacy banking systems and introduce innovative digital services',
  companyWebsite: 'https://example-bank.com',
  methodology: 'prince2' as const,
  sector: 'Banking & Financial Services',
  stakeholders: [
    { name: 'John Smith', email: 'john@example.com', role: 'Project Executive' },
    { name: 'Jane Doe', email: 'jane@example.com', role: 'Senior User' },
    { name: 'Bob Wilson', email: 'bob@example.com', role: 'Senior Supplier' }
  ]
}

async function testRiskRegister() {
  console.log('========================================')
  console.log('RISK REGISTER GENERATION TEST')
  console.log('========================================')
  console.log('Target: Generate PRINCE2 Risk Register')
  console.log('Model: GPT-5 nano')
  console.log('Token Limit: 3000')
  console.log('========================================\n')
  
  const sanitizer = new DataSanitizer()
  const gateway = new LLMGateway({ provider: 'vercel-ai' })
  
  try {
    // Step 1: Sanitize data
    console.log('📋 Step 1: Sanitizing project data...')
    const sanitized = sanitizer.sanitizeProjectData(testProjectData)
    console.log('✅ Data sanitized successfully\n')
    
    // Step 2: Build prompt
    console.log('📋 Step 2: Building Risk Register prompt...')
    const prompt = gateway.buildContextPrompt(
      prince2Prompts.riskRegister.system,
      prince2Prompts.riskRegister.user,
      sanitized
    )
    
    // Add token configuration - increased for risk register (15 risks)
    const optimizedPrompt = {
      ...prompt,
      maxTokens: 3000,
      reasoningEffort: 'minimal' as const
    }
    
    console.log('Prompt length:', prompt.system.length + prompt.user.length, 'chars\n')
    
    // Step 3: Generate as text (not strict JSON)
    console.log('📋 Step 3: Generating Risk Register as text...')
    const startTime = Date.now()
    
    const content = await gateway.generateText(optimizedPrompt)
    
    const duration = Date.now() - startTime
    console.log(`✅ Risk Register generated in ${duration}ms`)
    console.log('Response length:', content.length, 'chars\n')
    
    // Step 4: Try to parse as JSON
    console.log('📋 Step 4: Parsing response...')
    let parsedContent: any
    let isJson = false
    
    try {
      // Clean up the response if it has markdown
      let cleanContent = content.trim()
      if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      }
      
      parsedContent = JSON.parse(cleanContent)
      isJson = true
      console.log('✅ Successfully parsed as JSON')
    } catch (e) {
      console.log('⚠️  Response is not valid JSON, treating as text')
      parsedContent = content
    }
    
    // Step 5: Analyze content structure
    console.log('\n📋 Step 5: Analyzing content structure...')
    
    if (isJson && typeof parsedContent === 'object') {
      // Check for expected structure
      const hasProjectName = !!parsedContent.projectName
      const hasRisks = Array.isArray(parsedContent.risks)
      const riskCount = hasRisks ? parsedContent.risks.length : 0
      
      console.log('Structure analysis:')
      console.log('  - Has project name:', hasProjectName)
      console.log('  - Has risks array:', hasRisks)
      console.log('  - Number of risks:', riskCount)
      
      if (hasRisks && riskCount > 0) {
        // Analyze first risk structure
        const firstRisk = parsedContent.risks[0]
        console.log('\nFirst risk structure:')
        console.log('  - ID:', firstRisk.id)
        console.log('  - Category:', firstRisk.category)
        console.log('  - Description:', firstRisk.description?.substring(0, 50) + '...')
        console.log('  - Probability:', firstRisk.probability)
        console.log('  - Impact:', firstRisk.impact)
        console.log('  - Has mitigation:', !!firstRisk.mitigation)
        
        // Count risk categories
        const categories = parsedContent.risks.reduce((acc: any, risk: any) => {
          acc[risk.category] = (acc[risk.category] || 0) + 1
          return acc
        }, {})
        
        console.log('\nRisk categories:')
        Object.entries(categories).forEach(([cat, count]) => {
          console.log(`  - ${cat}: ${count}`)
        })
      }
    } else {
      // Check if text contains key elements
      const hasRiskMentions = content.toLowerCase().includes('risk')
      const hasMitigation = content.toLowerCase().includes('mitigation')
      const hasImpact = content.toLowerCase().includes('impact')
      
      console.log('Content analysis (text mode):')
      console.log('  Has risk mentions:', hasRiskMentions)
      console.log('  Has mitigation:', hasMitigation)  
      console.log('  Has impact:', hasImpact)
    }
    
    // Step 6: Save output
    const outputDir = './test-outputs'
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }
    
    const timestamp = Date.now()
    const outputFile = path.join(outputDir, `risk-register-${timestamp}.${isJson ? 'json' : 'txt'}`)
    fs.writeFileSync(outputFile, isJson ? JSON.stringify(parsedContent, null, 2) : content)
    console.log(`\n📋 Step 6: Output saved to ${outputFile}`)
    
    // Step 7: Token usage estimate
    console.log('\n📋 Step 7: Token usage estimate')
    const inputTokens = Math.ceil((prompt.system.length + prompt.user.length) / 4)
    const outputTokens = Math.ceil(content.length / 4)
    const cost = (inputTokens / 1_000_000 * 0.025) + (outputTokens / 1_000_000 * 0.200)
    
    console.log(`  Input: ~${inputTokens} tokens`)
    console.log(`  Output: ~${outputTokens} tokens`)
    console.log(`  Total: ~${inputTokens + outputTokens} tokens`)
    console.log(`  Cost: ~$${cost.toFixed(4)}`)
    
    // Final verdict
    console.log('\n========================================')
    if (isJson && parsedContent.risks && parsedContent.risks.length >= 10) {
      console.log('🎉 SUCCESS: RISK REGISTER GENERATED!')
      console.log(`Generated ${parsedContent.risks.length} risks with full details`)
      console.log('Total size:', content.length, 'characters')
      return true
    } else if (content.length > 1000) {
      console.log('⚠️  PARTIAL SUCCESS: Content generated but not in expected format')
      console.log('Content size:', content.length, 'characters')
      console.log('May need prompt adjustment or token increase')
      return false
    } else {
      console.log('❌ FAILURE: Insufficient content generated')
      return false
    }
    
  } catch (error: any) {
    console.log('========================================')
    console.log('❌ RISK REGISTER GENERATION FAILED')
    console.log('Error:', error.message)
    
    if (error.message.includes('empty') || error.message.includes('length')) {
      console.log('\n⚠️ Token limit issue detected')
      console.log('Current limit: 3000 tokens')
      console.log('Consider increasing to 4000 or 5000')
    }
    
    return false
  }
}

// Run the test
testRiskRegister().then(success => {
  if (success) {
    console.log('\n✅ Risk Register test passed - document generated successfully')
    process.exit(0)
  } else {
    console.log('\n⚠️ Risk Register test needs attention - check output file')
    process.exit(1)
  }
}).catch(error => {
  console.error('Unexpected error:', error)
  process.exit(1)
})