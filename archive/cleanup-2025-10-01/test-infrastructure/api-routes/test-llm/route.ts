import { NextRequest, NextResponse } from 'next/server'
import { LLMGateway } from '@/lib/llm/gateway'

export async function POST(request: NextRequest) {
  try {
    const config = await request.json()
    
    // Create a gateway with the provided config
    const gateway = new LLMGateway(config)
    
    // Test prompt
    const testPrompt = {
      system: 'You are a helpful assistant. Respond with a single sentence.',
      user: 'What is 2+2?'
    }
    
    // Try to generate a response
    const response = await gateway.generateCompletion(testPrompt)
    
    return NextResponse.json({
      success: true,
      response: response.substring(0, 100), // Limit response length
      provider: config.provider,
      model: config.model
    })
  } catch (error: any) {
    console.error('LLM test error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to test LLM connection'
      },
      { status: 500 }
    )
  }
}