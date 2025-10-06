// Test document generation with metrics tracking
const testGeneration = async () => {
  console.log('Starting document generation test...');
  
  const projectData = {
    id: 'test-' + Date.now(),
    name: 'Metrics Test Project',
    description: 'Testing metrics tracking and logging',
    methodology: 'agile',
    teamSize: '5-10',
    duration: '6 months',
    budget: '$100,000',
    techStack: ['React', 'Node.js', 'PostgreSQL'],
    requirements: ['User authentication', 'Real-time updates', 'Analytics dashboard']
  };

  try {
    const response = await fetch('http://localhost:3002/api/generate-stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId: projectData.id,
        projectData,
        forceProvider: 'vercel-ai' // Force test mode
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('event:')) {
          const event = line.substring(6).trim();
          console.log(`\n[EVENT] ${event}`);
        } else if (line.startsWith('data:')) {
          try {
            const data = JSON.parse(line.substring(5));
            
            // Log key metrics
            if (event === 'document_complete') {
              console.log(`  ✓ ${data.title}`);
              console.log(`    Time: ${data.generationTimeMs}ms`);
              if (data.usage) {
                console.log(`    Tokens: ${JSON.stringify(data.usage)}`);
              }
            } else if (event === 'complete') {
              console.log('\n=== GENERATION COMPLETE ===');
              console.log('Success:', data.successCount, 'Failed:', data.failureCount);
              if (data.metrics) {
                console.log('\nFINAL METRICS:');
                console.log('  Provider:', data.metrics.provider);
                console.log('  Model:', data.metrics.model);
                console.log('  Total Input Tokens:', data.metrics.totalInputTokens);
                console.log('  Total Output Tokens:', data.metrics.totalOutputTokens);
                console.log('  Total Reasoning Tokens:', data.metrics.totalReasoningTokens);
                console.log('  Total Tokens:', data.metrics.totalTokens);
                console.log('  Estimated Cost: $' + (data.metrics.estimatedCostUsd || 0).toFixed(4));
                console.log('  Generation Time:', data.metrics.generationTimeMs, 'ms');
              }
            } else if (event === 'error') {
              console.error('ERROR:', data.error);
            }
          } catch (e) {
            // Not JSON, skip
          }
        }
      }
    }
  } catch (error) {
    console.error('Generation failed:', error);
  }
};

testGeneration();