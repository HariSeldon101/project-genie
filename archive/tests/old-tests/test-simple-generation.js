async function testSimpleGeneration() {
  console.log('Testing simple generation with GPT-5-mini...');
  
  const testData = {
    projectId: 'test-simple-' + Date.now(),
    projectData: {
      name: 'Simple Test',
      description: 'Testing GPT-5-mini simple generation',
      methodology: 'prince2',
      duration: 3,
      teamSize: 2,
      budget: 50000,
      objectives: ['Test generation'],
      deliverables: ['Test output'],
      milestones: ['Complete'],
      risks: ['None'],
      constraints: ['Time'],
      assumptions: ['Works'],
      dependencies: ['API'],
      stakeholders: [
        { name: 'Test Manager', role: 'Lead' }
      ]
    },
    forceProvider: 'openai' // Skip auth for testing
  };

  try {
    console.log('Sending request to API...');
    
    const response = await fetch('http://localhost:3001/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    
    console.log('\n=== RESULT ===');
    console.log('Success:', result.success);
    
    if (result.success) {
      console.log('Documents:', result.documents?.length);
      
      if (result.documents) {
        result.documents.forEach((doc, i) => {
          console.log(`\nDocument ${i + 1}: ${doc.type}`);
          console.log('Has content:', Object.keys(doc).includes('insights') && doc.insights !== null);
          console.log('Content keys:', Object.keys(doc));
          
          // Check the actual content
          if (doc.type === 'business_case') {
            console.log('Business case content preview:', 
              JSON.stringify(doc).substring(0, 200));
          }
        });
      }
    } else {
      console.log('Error:', result.error);
      console.log('Details:', result.details);
    }
    
  } catch (error) {
    console.error('Request failed:', error.message);
  }
}

// Wait for server to start
setTimeout(() => {
  testSimpleGeneration().catch(console.error);
}, 5000);