import { DocumentGenerator } from './lib/documents/generator'
import { LLMGateway } from './lib/llm/gateway'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

async function quickTestSchema() {
  console.log('🧪 Quick Schema Validation Test')
  
  const gateway = new LLMGateway()
  const generator = new DocumentGenerator(gateway)
  
  const testData = {
    projectName: 'Schema Test Project',
    vision: 'Test schema validation',
    businessCase: 'Testing flexible schema handling',
    description: 'A quick test to validate schema fixes',
    sector: 'Technology',
    methodology: 'PRINCE2',
    userId: 'test-user',
    projectId: 'test-project',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  
  try {
    console.log('📋 Testing PID generation...')
    const pid = await generator.generatePrince2PID(testData)
    
    // Check critical fields
    const hasContent = pid && pid.content && pid.content.length > 100
    const hasTitle = pid?.metadata?.title === 'Project Initiation Document (PID)'
    
    if (hasContent && hasTitle) {
      console.log('✅ PID generated successfully!')
      console.log('   Content length:', pid.content.length)
      console.log('   Has sections:', pid.content.includes('## '))
      return true
    } else {
      console.log('❌ PID generation incomplete')
      console.log('   Has content:', hasContent)
      console.log('   Has title:', hasTitle)
      return false
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    if (error.issues) {
      console.error('   Schema issues:', JSON.stringify(error.issues, null, 2))
    }
    return false
  }
}

// Run test
quickTestSchema().then(success => {
  console.log(success ? '✅ Test passed' : '❌ Test failed')
  process.exit(success ? 0 : 1)
}).catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})