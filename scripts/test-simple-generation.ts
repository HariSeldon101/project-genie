#!/usr/bin/env ts-node

/**
 * Simple test to verify document generation works
 */

import { config } from 'dotenv'
config()

import { LLMGateway } from '../lib/llm/gateway'
import { getDocumentToolConfig } from '../lib/documents/tool-config'

async function testSimpleGeneration() {
  console.log('\n🧪 Simple Document Generation Test')
  console.log('=' .repeat(50))
  
  try {
    // Initialize gateway
    const gateway = new LLMGateway({ provider: 'vercel-ai' })
    
    // Test 1: Simple text generation without tools
    console.log('\n📝 Test 1: Simple text generation (no tools)')
    const simplePrompt = {
      system: 'You are a helpful assistant.',
      user: 'List 3 real banks in the USA with their headquarters city.'
    }
    
    const simpleResult = await gateway.generateText(simplePrompt)
    console.log('Result:', simpleResult.substring(0, 500))
    console.log('Length:', simpleResult.length)
    
    // Test 2: Generate with tools (web search instructions)
    console.log('\n🔍 Test 2: Generation with web search instructions')
    const toolConfig = getDocumentToolConfig('comparable_projects')
    
    const webSearchPrompt = {
      system: 'You are a project management expert.',
      user: `List 3 real digital transformation projects from major banks. For each, include:
- Bank name (e.g., JPMorgan Chase, Bank of America)
- Project name and timeline
- Budget (with actual numbers)
- Key outcomes

Use REAL examples from your knowledge, such as:
- JPMorgan Chase's cloud migration ($12B tech budget)
- Bank of America's Erica virtual assistant
- Wells Fargo's technology overhaul

DO NOT use generic placeholders.`,
      model: toolConfig.model
    }
    
    const toolsResult = await gateway.generateTextWithTools(webSearchPrompt, toolConfig.tools)
    console.log('Result:', toolsResult.content?.substring(0, 1000) || 'No content')
    console.log('Length:', toolsResult.content?.length || 0)
    console.log('Tools used:', toolsResult.toolsUsed)
    
    // Test 3: Full comparable projects prompt (simplified)
    console.log('\n📊 Test 3: Comparable projects (simplified)')
    const comparablePrompt = {
      system: `You are a Senior Project Management Consultant with expertise in banking industry benchmarking.
Your role: Provide REAL comparable projects from actual companies.
CRITICAL: You MUST reference actual companies by name (e.g., JPMorgan Chase, Bank of America, Citigroup, Wells Fargo, HSBC, Barclays, etc.)`,
      user: `Provide 2 comparable digital banking transformation projects.

For EACH project include:
- Organization: [Real bank name]
- Project Name: [Actual project or descriptive name]
- Timeline: [Specific dates like "January 2021 - June 2023"]
- Budget: [Real amount like "$285M USD"]
- Outcome: [Specific metrics]

Use REAL examples like:
- JPMorgan Chase's digital banking platform
- Bank of America's virtual assistant Erica
- Wells Fargo's core system modernization

NO generic placeholders allowed.`,
      model: 'gpt-4o-mini',
      maxTokens: 2000
    }
    
    const comparableResult = await gateway.generateTextWithTools(comparablePrompt, toolConfig.tools)
    console.log('Result:', comparableResult.content?.substring(0, 1500) || 'No content')
    console.log('Length:', comparableResult.content?.length || 0)
    
    // Check for real companies
    const realCompanies = ['JPMorgan', 'Bank of America', 'Wells Fargo', 'Citigroup', 'Chase']
    const foundCompanies = realCompanies.filter(company => 
      comparableResult.content?.includes(company)
    )
    console.log('Real companies found:', foundCompanies)
    
    console.log('\n✅ Tests completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

// Run the test
testSimpleGeneration()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })