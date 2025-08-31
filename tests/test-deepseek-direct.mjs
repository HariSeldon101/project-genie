#!/usr/bin/env node

import OpenAI from 'openai'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.local') })

async function testDeepSeekDirect() {
  console.log('🧪 Testing DeepSeek JSON Mode Directly\n')
  
  const client = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: 'https://api.deepseek.com/v1',
  })
  
  const testPrompt = {
    system: `You are a helpful assistant that generates structured JSON data. 
Always respond with valid JSON matching the exact structure provided.
Use placeholder tokens like [STAKEHOLDER_1], [PRODUCT_OWNER] for names.`,
    user: `Please generate a JSON document with this structure:
{
  "executiveSummary": "text",
  "visionAndObjectives": {
    "vision": "text",
    "objectives": [{"id": "O1", "description": "text", "measurable": true}]
  },
  "successCriteria": [{"criterion": "text", "metric": "text", "target": "text"}],
  "scope": {
    "inScope": ["item"],
    "outOfScope": ["item"],
    "assumptions": ["item"],
    "constraints": ["item"]
  }
}`
  }
  
  try {
    console.log('📤 Sending request to DeepSeek...')
    const startTime = Date.now()
    
    const response = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: testPrompt.system },
        { role: 'user', content: testPrompt.user }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 2000,
      stream: false
    })
    
    const timeTaken = Math.round((Date.now() - startTime) / 1000)
    const content = response.choices[0]?.message?.content || ''
    
    console.log(`✅ Response received in ${timeTaken}s`)
    console.log(`📏 Response length: ${content.length} characters\n`)
    
    // Try to parse as JSON
    try {
      const parsed = JSON.parse(content)
      console.log('✅ Valid JSON received!')
      console.log('\n📋 Structure:')
      console.log(JSON.stringify(parsed, null, 2).substring(0, 500) + '...')
      
      // Check structure
      console.log('\n🔍 Validation:')
      console.log('  - Has executiveSummary:', !!parsed.executiveSummary)
      console.log('  - Has visionAndObjectives:', !!parsed.visionAndObjectives)
      console.log('  - Has objectives array:', Array.isArray(parsed.visionAndObjectives?.objectives))
      console.log('  - Has successCriteria:', Array.isArray(parsed.successCriteria))
      console.log('  - Has scope:', !!parsed.scope)
      
    } catch (e) {
      console.error('❌ Invalid JSON:', e.message)
      console.log('\n📄 Raw response:')
      console.log(content.substring(0, 500))
    }
    
  } catch (error) {
    console.error('❌ API Error:', error.message)
    if (error.response) {
      console.error('Response status:', error.response.status)
      console.error('Response data:', error.response.data)
    }
  }
}

// Run test
testDeepSeekDirect().catch(console.error)