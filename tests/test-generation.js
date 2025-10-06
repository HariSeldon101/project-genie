async function testGeneration() {
  console.log('Testing document generation with optimizations...');
  console.log('----------------------------------------');
  
  const testData = {
    projectId: 'test-' + Date.now(),
    projectData: {
      name: 'Performance Test Project',
      description: 'Testing optimized document generation speed',
      methodology: 'prince2',
      duration: 6,
      teamSize: 5,
      budget: 100000,
      objectives: [
        'Test generation speed',
        'Verify all documents generate',
        'Measure performance improvement'
      ],
      deliverables: [
        'All 6 PRINCE2 documents',
        'Performance metrics',
        'Cost analysis'
      ],
      milestones: [
        'Initial setup',
        'Implementation',
        'Testing complete'
      ],
      risks: [
        'Timeout issues',
        'Token limits',
        'API rate limits'
      ],
      constraints: [
        'Must complete in under 40 seconds',
        'All documents must have content',
        'Cost increase under 20%'
      ],
      assumptions: [
        'GPT-5 nano is available',
        'Parallel processing works',
        'No rate limiting'
      ],
      dependencies: [
        'OpenAI API',
        'Sufficient tokens',
        'Network stability'
      ],
      stakeholders: [
        { name: 'Project Manager', role: 'Lead' },
        { name: 'Technical Lead', role: 'Architecture' },
        { name: 'Business Analyst', role: 'Requirements' }
      ]
    },
    forceProvider: 'openai' // Skip auth for testing
  };

  const startTime = Date.now();
  
  try {
    console.log('Starting generation at:', new Date().toISOString());
    console.log('Sending request to API...\n');
    
    const response = await fetch('http://localhost:3001/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    const result = await response.json();
    
    console.log('\n=== RESULTS ===');
    console.log('Status:', response.ok ? '✅ SUCCESS' : '❌ FAILED');
    console.log('Total Time:', (totalTime / 1000).toFixed(1) + ' seconds');
    console.log('Target (< 40s):', totalTime < 40000 ? '✅ MET' : '❌ MISSED');
    
    if (result.success) {
      console.log('\n=== DOCUMENTS GENERATED ===');
      console.log('Count:', result.documents?.length || 0, '/ 6');
      console.log('Provider:', result.provider);
      console.log('Model:', result.model);
      
      if (result.documents) {
        console.log('\nDocument Details:');
        result.documents.forEach(doc => {
          console.log(`- ${doc.type}: ${doc.title}`);
          console.log(`  Version: ${doc.version}`);
          const hasContent = doc.content && Object.keys(doc.content).length > 0 && 
                           Object.values(doc.content).some(v => v && String(v).length > 0);
          console.log(`  Has content: ${hasContent ? '✅' : '❌'}`);
          if (hasContent) {
            const contentPreview = JSON.stringify(doc.content).substring(0, 100);
            console.log(`  Content preview: ${contentPreview}...`);
          }
        });
      }
      
      console.log('\n=== PERFORMANCE ANALYSIS ===');
      const improvementVsOriginal = ((98 - (totalTime/1000)) / 98 * 100).toFixed(1);
      console.log('Original time: 98 seconds');
      console.log('Current time:', (totalTime/1000).toFixed(1), 'seconds');
      console.log('Improvement:', improvementVsOriginal + '%');
      console.log('Speed increase:', (98 / (totalTime/1000)).toFixed(1) + 'x faster');
      
      console.log('\n=== COST ESTIMATE ===');
      console.log('Original cost: ~$0.0012 per generation');
      const estimatedCost = 0.0012 * 1.17; // 17% increase from optimizations
      console.log('Current cost: ~$' + estimatedCost.toFixed(4) + ' per generation');
      console.log('Cost increase: ~17%');
      
      if (result.debugInfo) {
        console.log('\n=== DEBUG INFO ===');
        console.log(JSON.stringify(result.debugInfo, null, 2));
      }
    } else {
      console.log('\n❌ ERROR:', result.error);
      console.log('Details:', result.details);
    }
    
  } catch (error) {
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    console.log('\n❌ Request failed after', (totalTime/1000).toFixed(1), 'seconds');
    console.log('Error:', error.message);
    
    if (totalTime > 119000) {
      console.log('\n⚠️  Hit Vercel maxDuration limit (120s)');
      console.log('Need to further optimize or increase timeout');
    }
  }
  
  console.log('\n========================================');
}

// Run the test
testGeneration().catch(console.error);