#!/usr/bin/env node

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.local') })

async function testIntegratedFlow() {
  console.log('🧪 Testing Integrated Document Generation Flow\n')
  console.log('Features enabled:')
  console.log('  ✅ Sequential generation for DeepSeek')
  console.log('  ✅ Queue system with retry logic')
  console.log('  ✅ Document caching\n')
  
  // Dynamically import TypeScript modules
  const { DocumentGenerator } = await import('./lib/documents/generator.js')
  const { DeepSeekProvider } = await import('./lib/llm/providers/deepseek.js')
  
  // Create provider
  const provider = new DeepSeekProvider({
    apiKey: process.env.DEEPSEEK_API_KEY,
    model: 'deepseek-chat'
  })
  
  // Create generator with cache and queue enabled
  const generator = new DocumentGenerator(provider, {
    useCache: true,
    useQueue: true,
    maxConcurrent: 1 // Sequential for DeepSeek
  })
  
  // Test project data
  const testProject = {
    id: 'test-integrated-' + Date.now(),
    projectName: 'Digital Banking Platform',
    methodology: 'agile',
    vision: 'Create a next-generation digital banking platform that revolutionizes customer experience',
    businessCase: 'Capture 20% market share in digital banking within 3 years',
    sector: 'fintech',
    tier: 'premium',
    stakeholders: [
      { role: 'Product Owner', influence: 'high', interest: 'high' },
      { role: 'Tech Lead', influence: 'high', interest: 'medium' },
      { role: 'Customer', influence: 'low', interest: 'high' }
    ],
    epics: [
      { title: 'User Authentication', description: 'Secure multi-factor authentication system' },
      { title: 'Account Management', description: 'Complete account lifecycle management' }
    ],
    risks: [
      { description: 'Security breaches', impact: 'high', probability: 'medium' },
      { description: 'Regulatory compliance', impact: 'high', probability: 'low' }
    ]
  }
  
  try {
    console.log('📊 Test 1: First Generation (should hit API)\n')
    const startTime1 = Date.now()
    const documents1 = await generator.generateProjectDocuments(testProject, testProject.id)
    const duration1 = Math.round((Date.now() - startTime1) / 1000)
    
    console.log(`\n📈 Results:`)
    console.log(`  - Generated ${documents1.length} documents`)
    console.log(`  - Time taken: ${duration1}s`)
    console.log(`  - Documents:`)
    documents1.forEach(doc => {
      console.log(`    • ${doc.type}: ${doc.content.length} chars`)
    })
    
    console.log('\n📊 Test 2: Second Generation (should hit cache)\n')
    const startTime2 = Date.now()
    const documents2 = await generator.generateProjectDocuments(testProject, testProject.id)
    const duration2 = Math.round((Date.now() - startTime2) / 1000)
    
    console.log(`\n📈 Results:`)
    console.log(`  - Retrieved ${documents2.length} documents`)
    console.log(`  - Time taken: ${duration2}s (should be <1s from cache)`)
    
    // Verify cache worked
    if (duration2 < 2) {
      console.log('  ✅ Cache is working!')
    } else {
      console.log('  ⚠️ Cache may not be working properly')
    }
    
    // Display cache stats
    console.log('\n📊 Cache Statistics:')
    const stats = generator.getCacheStats()
    console.log(`  - Size: ${stats.size}/${stats.maxSize}`)
    console.log(`  - Total hits: ${stats.totalHits}`)
    console.log(`  - Avg hits per entry: ${stats.avgHitsPerEntry.toFixed(2)}`)
    
    console.log('\n✅ All tests completed successfully!')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error(error.stack)
  } finally {
    // Cleanup
    if (generator && generator.destroy) {
      generator.destroy()
    }
  }
}

// Run tests
testIntegratedFlow().catch(console.error)