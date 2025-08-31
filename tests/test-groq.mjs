import fetch from 'node-fetch'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.local') })

console.log('🧪 Testing Groq LLM Provider Integration\n')
console.log('=' + '='.repeat(50))

// Check if GROQ_API_KEY is set
const groqKey = process.env.GROQ_API_KEY
if (!groqKey || groqKey === 'your_groq_api_key_here') {
  console.error('❌ GROQ_API_KEY not found or not configured')
  console.log('\nPlease set your Groq API key in .env.local:')
  console.log('GROQ_API_KEY=your_actual_groq_api_key')
  console.log('\nGet your API key from: https://console.groq.com/keys')
  process.exit(1)
}

console.log('✅ Groq API key found')
console.log(`   Key prefix: ${groqKey.substring(0, 10)}...`)

// Test direct Groq API call
async function testGroqDirect() {
  console.log('\n📡 Testing direct Groq API call...')
  
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile', // Free model
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that generates project documentation.'
          },
          {
            role: 'user',
            content: 'Generate a simple JSON object with a project title and description. Return only valid JSON.'
          }
        ],
        temperature: 0.2,
        max_tokens: 200,
        response_format: { type: 'json_object' }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API Error ${response.status}: ${error}`)
    }

    const data = await response.json()
    console.log('✅ Direct API call successful!')
    console.log('   Model used:', data.model)
    console.log('   Response:', data.choices[0]?.message?.content?.substring(0, 100) + '...')
    
    // Try to parse the JSON response
    try {
      const jsonContent = JSON.parse(data.choices[0]?.message?.content || '{}')
      console.log('✅ JSON parsing successful!')
      console.log('   Parsed:', JSON.stringify(jsonContent, null, 2))
    } catch (e) {
      console.warn('⚠️  JSON parsing failed:', e.message)
    }
    
    return true
  } catch (error) {
    console.error('❌ Direct API call failed:', error.message)
    return false
  }
}

// Test through the gateway
async function testGroqGateway() {
  console.log('\n🚪 Testing Groq through LLM Gateway...')
  
  try {
    const testProject = {
      name: 'Test Project',
      description: 'Testing Groq integration',
      methodology: 'agile',
      vision: 'To test the Groq LLM provider',
      businessCase: 'Ensure Groq is working properly',
      companyWebsite: 'https://example.com',
      sector: 'Technology',
      stakeholders: [
        { name: 'John Doe', email: 'john@example.com', title: 'Product Owner' }
      ]
    }

    const response = await fetch('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId: 'test-project-groq',
        projectData: testProject,
        forceProvider: 'groq' // Force Groq provider for testing
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Gateway Error ${response.status}: ${error}`)
    }

    const data = await response.json()
    console.log('✅ Gateway test successful!')
    console.log('   Provider used:', data.provider)
    console.log('   Documents generated:', data.documents?.length || 0)
    
    if (data.documents && data.documents.length > 0) {
      console.log('   Document types:', data.documents.map(d => d.type).join(', '))
    }
    
    return true
  } catch (error) {
    console.error('❌ Gateway test failed:', error.message)
    console.log('\nMake sure the development server is running:')
    console.log('npm run dev')
    return false
  }
}

// Test available models
async function testAvailableModels() {
  console.log('\n🤖 Testing available Groq models...')
  
  const models = [
    'llama-3.3-70b-versatile',  // Free, general purpose
    'llama3-groq-70b-8192-tool-use-preview',  // Tool use
    'llama-3.2-90b-vision-preview',  // Vision capable
    'mixtral-8x7b-32768'  // Fast inference
  ]
  
  for (const model of models) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'user', content: 'Say "OK" if you work' }
          ],
          max_tokens: 10
        })
      })
      
      if (response.ok) {
        console.log(`   ✅ ${model} - Available`)
      } else {
        console.log(`   ❌ ${model} - Not available`)
      }
    } catch (e) {
      console.log(`   ❌ ${model} - Error`)
    }
  }
}

// Run all tests
async function runTests() {
  const directSuccess = await testGroqDirect()
  await testAvailableModels()
  
  if (directSuccess) {
    console.log('\n' + '='.repeat(50))
    console.log('✅ GROQ INTEGRATION READY!')
    console.log('=' + '='.repeat(50))
    console.log('\nYou can now:')
    console.log('1. Use Groq as the primary LLM provider')
    console.log('2. Generate documents with better performance')
    console.log('3. Fallback to other providers if needed')
    console.log('\nTo test in the app:')
    console.log('1. Make sure GROQ_API_KEY is set in .env.local')
    console.log('2. Restart the development server (npm run dev)')
    console.log('3. Create a new project and generate documents')
  } else {
    console.log('\n' + '='.repeat(50))
    console.log('⚠️  GROQ INTEGRATION NEEDS CONFIGURATION')
    console.log('=' + '='.repeat(50))
    console.log('\nPlease check:')
    console.log('1. Your GROQ_API_KEY is valid')
    console.log('2. You have an active Groq account')
    console.log('3. Your API key has the necessary permissions')
  }
}

runTests()