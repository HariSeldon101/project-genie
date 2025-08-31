#!/usr/bin/env npx tsx
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { LLMGateway } from './lib/llm/gateway'
import { DataSanitizer } from './lib/llm/sanitizer'
import { prince2Prompts } from './lib/llm/prompts/prince2'

// Test project data for Project Plan
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

async function testProjectPlan() {
  console.log('========================================')
  console.log('PROJECT PLAN GENERATION TEST')
  console.log('========================================')
  console.log('Target: Generate PRINCE2 Project Plan')
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
    console.log('📋 Step 2: Building Project Plan prompt...')
    const prompt = gateway.buildContextPrompt(
      prince2Prompts.projectPlan.system,
      prince2Prompts.projectPlan.user,
      sanitized
    )
    
    // Add token configuration - 3000 for detailed stages
    const optimizedPrompt = {
      ...prompt,
      maxTokens: 3000,
      reasoningEffort: 'minimal' as const
    }
    
    console.log('Prompt length:', prompt.system.length + prompt.user.length, 'chars\n')
    
    // Step 3: Generate as text (not strict JSON)
    console.log('📋 Step 3: Generating Project Plan as text...')
    const startTime = Date.now()
    
    const content = await gateway.generateText(optimizedPrompt)
    
    const duration = Date.now() - startTime
    console.log(`✅ Project Plan generated in ${duration}ms`)
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
      const hasStages = Array.isArray(parsedContent.stages) || 
                       (parsedContent.plan && Array.isArray(parsedContent.plan.stages))
      const hasMilestones = Array.isArray(parsedContent.milestones) || 
                           (parsedContent.plan && Array.isArray(parsedContent.plan.milestones))
      const stageCount = hasStages ? 
                        (parsedContent.stages?.length || parsedContent.plan?.stages?.length) : 0
      
      console.log('Structure analysis:')
      console.log('  - Has stages:', hasStages)
      console.log('  - Has milestones:', hasMilestones)
      console.log('  - Number of stages:', stageCount)
      
      if (hasStages && stageCount > 0) {
        // Analyze first stage structure
        const stages = parsedContent.stages || parsedContent.plan?.stages
        const firstStage = stages[0]
        console.log('\nFirst stage structure:')
        if (typeof firstStage === 'object') {
          console.log('  - Name/Title:', firstStage.name || firstStage.title || firstStage.stage)
          console.log('  - Duration:', firstStage.duration || firstStage.timeline)
          console.log('  - Has deliverables:', !!firstStage.deliverables)
          console.log('  - Has activities:', !!firstStage.activities || !!firstStage.tasks)
        } else {
          console.log('  - Simple stage:', firstStage)
        }
      }
      
      // Check for Gantt chart data or timeline
      const hasGantt = !!parsedContent.ganttChart || !!parsedContent.gantt
      const hasTimeline = !!parsedContent.timeline || !!parsedContent.schedule
      console.log('\nAdditional elements:')
      console.log('  - Has Gantt chart:', hasGantt)
      console.log('  - Has timeline:', hasTimeline)
      
    } else {
      // Check if text contains key elements
      const hasStages = content.toLowerCase().includes('stage')
      const hasMilestones = content.toLowerCase().includes('milestone')
      const hasDeliverables = content.toLowerCase().includes('deliverable')
      const hasActivities = content.toLowerCase().includes('activit')
      
      console.log('Content analysis (text mode):')
      console.log('  Has stages:', hasStages)
      console.log('  Has milestones:', hasMilestones)
      console.log('  Has deliverables:', hasDeliverables)
      console.log('  Has activities:', hasActivities)
    }
    
    // Step 6: Save output
    const outputDir = './test-outputs'
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }
    
    const timestamp = Date.now()
    const outputFile = path.join(outputDir, `project-plan-${timestamp}.${isJson ? 'json' : 'txt'}`)
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
    if (isJson && (parsedContent.stages || parsedContent.plan?.stages)) {
      const stageCount = parsedContent.stages?.length || parsedContent.plan?.stages?.length || 0
      if (stageCount >= 3) {
        console.log('🎉 SUCCESS: PROJECT PLAN GENERATED!')
        console.log(`Generated ${stageCount} stages with details`)
        console.log('Total size:', content.length, 'characters')
        return true
      }
    }
    
    if (content.length > 1000) {
      console.log('⚠️  PARTIAL SUCCESS: Content generated but not in expected format')
      console.log('Content size:', content.length, 'characters')
      console.log('May need prompt adjustment')
      return false
    } else {
      console.log('❌ FAILURE: Insufficient content generated')
      return false
    }
    
  } catch (error: any) {
    console.log('========================================')
    console.log('❌ PROJECT PLAN GENERATION FAILED')
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
testProjectPlan().then(success => {
  if (success) {
    console.log('\n✅ Project Plan test passed - document generated successfully')
    process.exit(0)
  } else {
    console.log('\n⚠️ Project Plan test needs attention - check output file')
    process.exit(1)
  }
}).catch(error => {
  console.error('Unexpected error:', error)
  process.exit(1)
})