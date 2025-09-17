#!/usr/bin/env npx tsx
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import OpenAI from 'openai'

async function testGPT5DirectCall() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('No OpenAI API key found')
    return
  }

  console.log('Testing GPT-5 nano with different token limits...')
  console.log('=' .repeat(60))

  const client = new OpenAI({ apiKey })

  const testConfigs = [
    { tokens: 1500, reasoning: 'minimal' },
    { tokens: 5000, reasoning: 'minimal' },
    { tokens: 10000, reasoning: 'minimal' },
    { tokens: 15000, reasoning: 'minimal' },
  ]

  for (const config of testConfigs) {
    console.log(`\nTest: ${config.tokens} tokens, ${config.reasoning} reasoning`)
    console.log('-'.repeat(40))

    try {
      const response = await client.chat.completions.create({
        model: 'gpt-5-nano',
        messages: [
          {
            role: 'system',
            content: 'You are a PRINCE2 Practitioner creating a Project Initiation Document (PID). Return valid JSON.'
          },
          {
            role: 'user',
            content: `Create a PID for "Digital Transformation Initiative". Return as JSON with these sections:
            {
              "projectDefinition": "...",
              "businessCase": "...",
              "projectOrganization": "...",
              "qualityManagementApproach": "...",
              "projectPlan": "...",
              "projectControls": "...",
              "riskManagementApproach": "...",
              "configurationManagementApproach": "...",
              "communicationManagementApproach": "...",
              "projectTolerances": "..."
            }`
          }
        ],
        temperature: 1,
        max_completion_tokens: config.tokens,
        reasoning_effort: config.reasoning as any,
      })

      const usage = response.usage!
      const content = response.choices[0]?.message?.content || ''
      
      console.log('✅ Success!')
      console.log('   Content length:', content.length, 'chars')
      console.log('   Token usage:')
      console.log('     - Prompt:', usage.prompt_tokens)
      console.log('     - Completion:', usage.completion_tokens)
      console.log('     - Reasoning:', (usage as any).completion_tokens_details?.reasoning_tokens || 0)
      console.log('     - Total:', usage.total_tokens)
      
      // Calculate cost
      const inputCost = (usage.prompt_tokens / 1_000_000) * 0.025
      const outputCost = (usage.completion_tokens / 1_000_000) * 0.200
      const totalCost = inputCost + outputCost
      
      console.log('   Cost: $' + totalCost.toFixed(4))
      
      // Check if content is valid JSON
      try {
        const parsed = JSON.parse(content)
        const sections = Object.keys(parsed)
        console.log('   JSON valid: Yes')
        console.log('   Sections:', sections.length)
      } catch {
        console.log('   JSON valid: No (raw text)')
      }

      // If successful at lower token count, we can stop
      if (content.length > 1000) {
        console.log('\n🎉 Optimal configuration found: ' + config.tokens + ' tokens')
        break
      }
      
    } catch (error: any) {
      console.log('❌ Failed:', error.message)
      if (error.response?.data?.error?.message?.includes('finish_reason')) {
        console.log('   → Token limit issue')
      }
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('Testing complete!')
}

testGPT5DirectCall().catch(console.error)