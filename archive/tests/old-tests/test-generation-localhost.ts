// Test document generation directly
import { DocumentGenerator } from './lib/documents/generator'

async function testDocumentGeneration() {
  console.log('🧪 Testing document generation on localhost...\n')
  
  // Test data
  const projectData = {
    name: 'Test Project',
    description: 'A test project for document generation',
    businessCase: 'Test business case',
    vision: 'Test vision statement',
    methodology: 'prince2',
    prince2Stakeholders: {
      seniorUser: { name: 'John Doe', email: 'john@example.com', role: 'Senior User' },
      seniorSupplier: { name: 'Jane Smith', email: 'jane@example.com', role: 'Senior Supplier' },
      executive: { name: 'Bob Wilson', email: 'bob@example.com', role: 'Executive' }
    }
  }
  
  const projectId = 'test-project-' + Date.now()
  
  try {
    // Initialize generator with mock config
    const generator = new DocumentGenerator({
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY || 'test-key',
      model: 'gpt-4-turbo-preview'
    })
    
    // Test PRINCE2 PID generation
    console.log('📝 Testing PRINCE2 PID generation...')
    const pidResult = await generator.generateDocument('pid', projectData, projectId)
    console.log('✅ PID generated successfully')
    console.log('  - Type:', pidResult.metadata.type)
    console.log('  - Methodology:', pidResult.metadata.methodology)
    console.log('  - Version:', pidResult.metadata.version)
    console.log('  - Content keys:', Object.keys(pidResult.content))
    
    // Test Business Case generation
    console.log('\n📝 Testing Business Case generation...')
    const bcResult = await generator.generateDocument('business_case', projectData, projectId)
    console.log('✅ Business Case generated successfully')
    console.log('  - Type:', bcResult.metadata.type)
    console.log('  - Methodology:', bcResult.metadata.methodology)
    console.log('  - Version:', bcResult.metadata.version)
    console.log('  - Content keys:', Object.keys(bcResult.content))
    
    // Test Agile Charter generation
    const agileData = { ...projectData, methodology: 'agile' }
    console.log('\n📝 Testing Agile Charter generation...')
    const charterResult = await generator.generateDocument('charter', agileData, projectId)
    console.log('✅ Charter generated successfully')
    console.log('  - Type:', charterResult.metadata.type)
    console.log('  - Methodology:', charterResult.metadata.methodology)
    console.log('  - Version:', charterResult.metadata.version)
    console.log('  - Content keys:', Object.keys(charterResult.content))
    
    console.log('\n✅ All document generation tests passed!')
    
  } catch (error) {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  }
}

// Run tests
testDocumentGeneration()
  .then(() => {
    console.log('\n✅ Test completed successfully')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Test error:', error)
    process.exit(1)
  })