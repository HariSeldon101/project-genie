const OpenAI = require('openai');

async function testOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('OPENAI_API_KEY not found in environment');
    return;
  }
  
  const client = new OpenAI({
    apiKey: apiKey
  });
  
  try {
    console.log('Testing OpenAI with GPT-5 mini and reasoning_effort...');
    
    const response = await client.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        { role: 'system', content: 'You are a helpful assistant. Always provide detailed, helpful responses.' },
        { role: 'user', content: 'Write a simple business case for a project management software in 100 words.' }
      ],
      temperature: 1,
      max_completion_tokens: 1000,
      reasoning_effort: 'low'
    });
    
    console.log('Success! Response:', response.choices[0].message.content);
    console.log('Model used:', response.model);
    console.log('Tokens:', {
      prompt: response.usage?.prompt_tokens,
      completion: response.usage?.completion_tokens,
      reasoning: response.usage?.reasoning_tokens || 'N/A'
    });
    
  } catch (error) {
    console.error('Error calling OpenAI:', error.message);
    console.error('Error type:', error.constructor.name);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    // Test without reasoning_effort
    console.log('\nTrying without reasoning_effort parameter...');
    try {
      const response2 = await client.chat.completions.create({
        model: 'gpt-5-nano',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Say hello in 5 words.' }
        ],
        temperature: 1,
        max_completion_tokens: 100
      });
      
      console.log('Success without reasoning_effort!');
      console.log('Response:', response2.choices[0].message.content);
    } catch (error2) {
      console.error('Still failed:', error2.message);
    }
  }
}

testOpenAI();