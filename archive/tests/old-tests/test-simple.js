async function testSimpleGeneration() {
  console.log('Testing simple document generation...')
  console.log('----------------------------------------')
  
  const testData = {
    projectId: 'test-' + Date.now(),
    projectData: {
      name: 'Simple Test Project',
      description: 'Testing document generation',
      methodology: 'agile',
      duration: 3,
      teamSize: 3,
      budget: 50000,
      objectives: ['Test generation', 'Verify metrics', 'Check analytics'],
      deliverables: ['Test documents', 'Performance metrics'],
      milestones: ['Start', 'Middle', 'End'],
      risks: ['Test risk 1', 'Test risk 2'],
      constraints: ['Time constraint', 'Budget constraint'],
      assumptions: ['API available', 'No rate limits'],
      dependencies: ['OpenAI API'],
      stakeholders: [
        { name: 'Project Manager', role: 'Lead' },
        { name: 'Developer', role: 'Implementation' }
      ]
    },
    forceProvider: 'openai' // Skip auth for testing
  }

  const startTime = Date.now()
  
  try {
    console.log('Starting generation at:', new Date().toISOString())
    console.log('Sending request to API...\n')
    
    const response = await fetch('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    })

    const endTime = Date.now()
    const totalTime = endTime - startTime
    
    const result = await response.json()
    
    console.log('\n=== RESULTS ===')
    console.log('Status:', response.ok ? '✅ SUCCESS' : '❌ FAILED')
    console.log('Total Time:', (totalTime / 1000).toFixed(1) + ' seconds')
    
    if (result.success) {
      console.log('\n=== METRICS ===')
      if (result.metrics) {
        console.log('Provider:', result.metrics.provider)
        console.log('Model:', result.metrics.model)
        console.log('Documents Generated:', result.metrics.documentsGenerated)
        console.log('Total Input Tokens:', result.metrics.totalInputTokens)
        console.log('Total Output Tokens:', result.metrics.totalOutputTokens)
        console.log('Total Reasoning Tokens:', result.metrics.totalReasoningTokens)
        console.log('Total Tokens:', result.metrics.totalTokens)
        console.log('Estimated Cost:', '$' + (result.metrics.estimatedCostUsd || 0).toFixed(4))
        console.log('Generation Time:', (result.metrics.generationTimeMs / 1000).toFixed(1) + ' seconds')
      }
      
      console.log('\n=== DOCUMENTS ===')
      if (result.documents) {
        result.documents.forEach(doc => {
          console.log(`\n${doc.type}:`)
          console.log('  Title:', doc.title)
          console.log('  Has content:', doc.content ? '✅' : '❌')
          if (doc.usage) {
            console.log('  Token usage:', {
              input: doc.usage.inputTokens,
              output: doc.usage.outputTokens,
              reasoning: doc.usage.reasoningTokens,
              total: doc.usage.totalTokens
            })
          }
          console.log('  Generation time:', doc.generationTimeMs ? (doc.generationTimeMs / 1000).toFixed(1) + 's' : 'N/A')
        })
      }
    } else {
      console.log('\n❌ ERROR:', result.error)
      console.log('Details:', result.details)
    }
    
  } catch (error) {
    const endTime = Date.now()
    const totalTime = endTime - startTime
    
    console.log('\n❌ Request failed after', (totalTime/1000).toFixed(1), 'seconds')
    console.log('Error:', error.message)
  }
  
  console.log('\n========================================')
}

// Run the test
testSimpleGeneration().catch(console.error)