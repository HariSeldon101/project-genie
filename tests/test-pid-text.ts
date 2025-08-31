#!/usr/bin/env npx tsx
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { LLMGateway } from './lib/llm/gateway'
import { DataSanitizer } from './lib/llm/sanitizer'
import { prince2Prompts } from './lib/llm/prompts/prince2'

// Test project data for PRINCE2 PID
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

async function testPIDWithText() {
  console.log('========================================')
  console.log('PID GENERATION TEST - TEXT MODE')
  console.log('========================================')
  console.log('Target: Generate PRINCE2 PID as text/JSON')
  console.log('Model: GPT-5 nano')
  console.log('Token Limit: 5000')
  console.log('========================================\n')
  
  const sanitizer = new DataSanitizer()
  const gateway = new LLMGateway({ provider: 'vercel-ai' })
  
  try {
    // Step 1: Sanitize data
    console.log('📋 Step 1: Sanitizing project data...')
    const sanitized = sanitizer.sanitizeProjectData(testProjectData)
    console.log('✅ Data sanitized successfully\n')
    
    // Step 2: Build prompt
    console.log('📋 Step 2: Building PID prompt...')
    const prompt = gateway.buildContextPrompt(
      prince2Prompts.pid.system,
      prince2Prompts.pid.user,
      sanitized
    )
    
    // Add token configuration
    const optimizedPrompt = {
      ...prompt,
      maxTokens: 5000,
      reasoningEffort: 'minimal' as const
    }
    
    console.log('Prompt length:', prompt.system.length + prompt.user.length, 'chars\n')
    
    // Step 3: Generate as text (not strict JSON)
    console.log('📋 Step 3: Generating PID as text...')
    const startTime = Date.now()
    
    const content = await gateway.generateText(optimizedPrompt)
    
    const duration = Date.now() - startTime
    console.log(`✅ PID generated in ${duration}ms`)
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
      const sections = Object.keys(parsedContent)
      console.log('Top-level sections found:', sections.length)
      sections.forEach(section => {
        const sectionType = typeof parsedContent[section]
        const sectionSize = sectionType === 'string' 
          ? parsedContent[section].length 
          : JSON.stringify(parsedContent[section]).length
        console.log(`  - ${section}: ${sectionType} (${sectionSize} chars)`)
      })
      
      // Check for expected sections
      const expectedSections = [
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
      
      const missingSections = expectedSections.filter(s => !parsedContent[s])
      if (missingSections.length > 0) {
        console.log('\n⚠️  Missing sections:', missingSections.join(', '))
      } else {
        console.log('\n✅ All expected sections present!')
      }
    } else {
      // Check if text contains key sections
      const hasProjectDef = content.includes('roject') && content.includes('efinition')
      const hasBusinessCase = content.includes('usiness') && content.includes('ase')
      const hasOrganization = content.includes('rganization')
      const hasQuality = content.includes('uality')
      const hasRisk = content.includes('isk')
      
      console.log('Content analysis (text mode):')
      console.log('  Has Project Definition:', hasProjectDef)
      console.log('  Has Business Case:', hasBusinessCase)
      console.log('  Has Organization:', hasOrganization)
      console.log('  Has Quality:', hasQuality)
      console.log('  Has Risk:', hasRisk)
    }
    
    // Step 6: Save output
    const outputDir = './test-outputs'
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }
    
    const timestamp = Date.now()
    const outputFile = path.join(outputDir, `pid-text-${timestamp}.${isJson ? 'json' : 'txt'}`)
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
    if (isJson && parsedContent.projectDefinition && parsedContent.businessCase) {
      console.log('🎉 SUCCESS: PID GENERATED WITH CONTENT!')
      console.log('The document contains structured content.')
      console.log('Total size:', content.length, 'characters')
      return true
    } else if (content.length > 2000) {
      console.log('⚠️  PARTIAL SUCCESS: Content generated but not in expected format')
      console.log('Content size:', content.length, 'characters')
      console.log('May need prompt adjustment for proper JSON structure')
      return false
    } else {
      console.log('❌ FAILURE: Insufficient content generated')
      return false
    }
    
  } catch (error: any) {
    console.log('========================================')
    console.log('❌ PID GENERATION FAILED')
    console.log('Error:', error.message)
    
    if (error.message.includes('empty') || error.message.includes('length')) {
      console.log('\n⚠️ Token limit issue detected')
      console.log('Current limit: 5000 tokens')
      console.log('Consider increasing to 7500 or 10000')
    }
    
    return false
  }
}

// Run the test
testPIDWithText().then(success => {
  if (success) {
    console.log('\n✅ PID test passed - document generated successfully')
    process.exit(0)
  } else {
    console.log('\n⚠️ PID test needs attention - check output file')
    process.exit(1)
  }
}).catch(error => {
  console.error('Unexpected error:', error)
  process.exit(1)
})