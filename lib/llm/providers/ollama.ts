import { LLMProvider, LLMConfig, LLMPrompt } from '../types'

export class OllamaProvider implements LLMProvider {
  private config: LLMConfig
  private baseUrl: string

  constructor(config: LLMConfig) {
    this.config = config
    this.baseUrl = config.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
  }

  async generateCompletion(prompt: LLMPrompt): Promise<string> {
    const model = this.config.model || 'llama2'
    
    try {
      // First, check if the model is available
      const modelsResponse = await fetch(`${this.baseUrl}/api/tags`)
      if (modelsResponse.ok) {
        const { models } = await modelsResponse.json()
        const modelExists = models?.some((m: any) => m.name === model)
        
        if (!modelExists) {
          console.warn(`Model ${model} not found in Ollama. Available models:`, models?.map((m: any) => m.name))
          throw new Error(`Model ${model} is not available in Ollama. Please pull it first with: ollama pull ${model}`)
        }
      }

      // Use the chat endpoint for better compatibility
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: prompt.system
            },
            {
              role: 'user',
              content: prompt.user
            }
          ],
          stream: false,
          options: {
            temperature: this.config.temperature || 0.7,
            num_predict: this.config.maxTokens || 4000
          }
        })
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Ollama API error: ${response.status} - ${error}`)
      }

      const data = await response.json()
      return data.message?.content || ''
      
    } catch (error) {
      console.error('Ollama generation error:', error)
      throw error
    }
  }

  async generateJSON(prompt: LLMPrompt, schema?: any): Promise<any> {
    // Add JSON instruction to the prompt
    const jsonPrompt: LLMPrompt = {
      system: `${prompt.system}\n\nIMPORTANT: You must respond with valid JSON only. No explanations or markdown formatting.`,
      user: `${prompt.user}\n\nRemember to respond with valid JSON only.`
    }

    const response = await this.generateCompletion(jsonPrompt)
    
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      return JSON.parse(response)
    } catch (error) {
      console.error('Failed to parse Ollama JSON response:', response)
      throw new Error('Invalid JSON response from Ollama')
    }
  }

  async streamCompletion(prompt: LLMPrompt, onChunk: (chunk: string) => void): Promise<void> {
    const model = this.config.model || 'llama2'
    
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: prompt.system
            },
            {
              role: 'user',
              content: prompt.user
            }
          ],
          stream: true,
          options: {
            temperature: this.config.temperature || 0.7,
            num_predict: this.config.maxTokens || 4000
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(line => line.trim())
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line)
            if (data.message?.content) {
              onChunk(data.message.content)
            }
          } catch (e) {
            // Skip invalid JSON lines
          }
        }
      }
    } catch (error) {
      console.error('Ollama streaming error:', error)
      throw error
    }
  }

  // Static method to check Ollama availability
  static async checkConnection(baseUrl?: string): Promise<boolean> {
    const url = baseUrl || 'http://localhost:11434'
    try {
      const response = await fetch(`${url}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000) // 3 second timeout
      })
      return response.ok
    } catch {
      return false
    }
  }

  // Static method to list available models
  static async listModels(baseUrl?: string): Promise<string[]> {
    const url = baseUrl || 'http://localhost:11434'
    try {
      const response = await fetch(`${url}/api/tags`)
      if (response.ok) {
        const { models } = await response.json()
        return models?.map((m: any) => m.name) || []
      }
      return []
    } catch {
      return []
    }
  }

  // Method to use OpenAI-compatible endpoint (if needed)
  async generateCompletionOpenAICompat(prompt: LLMPrompt): Promise<string> {
    const model = this.config.model || 'llama2'
    
    try {
      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: prompt.system
            },
            {
              role: 'user',
              content: prompt.user
            }
          ],
          temperature: this.config.temperature || 0.7,
          max_tokens: this.config.maxTokens || 4000
        })
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Ollama OpenAI API error: ${response.status} - ${error}`)
      }

      const data = await response.json()
      return data.choices?.[0]?.message?.content || ''
      
    } catch (error) {
      console.error('Ollama OpenAI compatibility error:', error)
      // Fallback to native API
      return this.generateCompletion(prompt)
    }
  }
}