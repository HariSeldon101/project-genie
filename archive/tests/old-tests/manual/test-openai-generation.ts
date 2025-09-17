#!/usr/bin/env tsx
/**
 * Manual test script for OpenAI GPT-5 generation
 * Run with: npx tsx tests/manual/test-openai-generation.ts
 */

import { config } from 'dotenv'
import { OpenAIProvider } from '../../lib/llm/providers/openai'
import { AgileCharterSchema } from '../../lib/documents/schemas/agile-charter'
import { persistentLogger } from '../../lib/utils/persistent-logger'
import { documentLogger } from '../../lib/utils/document-logger'

// Load environment variables
config({ path: '.env.local' })

async function testOpenAIGeneration() {
  console.log('🚀 Starting OpenAI GPT-5 generation test...\n')
  
  // Create provider with GPT-5 mini
  const provider = new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-5-mini',
    maxTokens: 2000
  })
  
  // Test prompt for Agile Charter
  const testPrompt = {
    system: `You are an Agile Project Manager creating a Project Charter.

CRITICAL JSON REQUIREMENTS:
1. Return ONLY valid JSON, no markdown or explanatory text
2. Use camelCase for ALL field names (executiveSummary NOT "Executive Summary")
3. Follow the EXACT field structure shown in the example`,
    
    user: `Create an Agile Project Charter for:
- Project Name: Test Project
- Vision: Build a test application
- Business Case: Testing the generation system
- Description: A simple test project
- Sector: Technology

Return a JSON object with these fields (all in camelCase):
- executiveSummary: string
- visionAndObjectives: object with vision and objectives
- successCriteria: array of criteria
- scope: object with inScope and outOfScope arrays
- deliverables: array of deliverables
- stakeholderAnalysis: array of stakeholders
- teamStructure: object with roles
- timeline: object with dates and milestones
- risks: array of risks
- dependencies: array of dependencies
- communicationPlan: object
- definitionOfDone: array of criteria`
  }
  
  try {
    console.log('📝 Generating document with GPT-5...')
    const startTime = Date.now()
    
    const result = await provider.generateJSONWithMetrics(
      testPrompt,
      AgileCharterSchema.pick({
        executiveSummary: true,
        visionAndObjectives: true,
        successCriteria: true,
        scope: true,
        deliverables: true,
        stakeholderAnalysis: true,
        teamStructure: true,
        timeline: true,
        risks: true,
        dependencies: true,
        communicationPlan: true,
        definitionOfDone: true
      })
    )
    
    const duration = Date.now() - startTime
    
    console.log('✅ Generation successful!\n')
    console.log('📊 Metrics:')
    console.log(`- Provider: ${result.provider}`)
    console.log(`- Model: ${result.model}`)
    console.log(`- Duration: ${duration}ms`)
    console.log(`- Input tokens: ${result.usage?.inputTokens}`)
    console.log(`- Output tokens: ${result.usage?.outputTokens}`)
    console.log(`- Reasoning tokens: ${result.usage?.reasoningTokens || 0}`)
    console.log(`- Total tokens: ${result.usage?.totalTokens}`)
    
    console.log('\n📄 Generated content preview:')
    console.log(`- Executive Summary: ${result.content.executiveSummary.substring(0, 100)}...`)
    console.log(`- Vision: ${result.content.visionAndObjectives.vision}`)
    console.log(`- Deliverables count: ${result.content.deliverables.length}`)
    console.log(`- Risks count: ${result.content.risks.length}`)
    
    // Check logs
    const recentLogs = persistentLogger.getRecentLogs('api-responses', 10)
    console.log(`\n📁 Persistent logs written: ${recentLogs.length} entries`)
    
    // Check for any errors in logs
    const errorLogs = persistentLogger.getRecentLogs('json-errors', 5)
    if (errorLogs.length > 0) {
      console.log(`\n⚠️ JSON errors in logs: ${errorLogs.length}`)
    }
    
    console.log('\n✨ Test completed successfully!')
    
  } catch (error) {
    console.error('\n❌ Test failed:', error)
    
    // Check error logs
    const errorLogs = persistentLogger.getRecentLogs('api-errors', 5)
    console.log(`\n📁 Error logs: ${errorLogs.length} entries`)
    if (errorLogs.length > 0) {
      const lastError = JSON.parse(errorLogs[errorLogs.length - 1])
      console.log('Last error:', lastError.data?.error?.message)
    }
    
    process.exit(1)
  }
}

// Run the test
testOpenAIGeneration().catch(console.error)