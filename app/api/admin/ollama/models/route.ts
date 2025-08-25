import { NextRequest, NextResponse } from 'next/server'
import { OllamaProvider } from '@/lib/llm/providers/ollama'

export async function POST(request: NextRequest) {
  try {
    const { baseUrl } = await request.json()
    const url = baseUrl || 'http://localhost:11434'
    
    // Check if Ollama is running
    const isConnected = await OllamaProvider.checkConnection(url)
    
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Cannot connect to Ollama server', models: [] },
        { status: 503 }
      )
    }
    
    // Get list of models
    const models = await OllamaProvider.listModels(url)
    
    return NextResponse.json({
      success: true,
      models: models.map(name => ({
        name,
        value: name,
        label: name
      })),
      connected: true
    })
  } catch (error) {
    console.error('Error fetching Ollama models:', error)
    return NextResponse.json(
      { error: 'Failed to fetch models', models: [] },
      { status: 500 }
    )
  }
}