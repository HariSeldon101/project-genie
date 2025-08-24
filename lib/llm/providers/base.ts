import { LLMProvider, LLMPrompt, LLMConfig } from '../types'

export abstract class BaseProvider implements LLMProvider {
  protected config: LLMConfig
  abstract name: string

  constructor(config: LLMConfig) {
    this.config = config
  }

  abstract generateText(prompt: LLMPrompt): Promise<string>
  abstract generateJSON<T>(prompt: LLMPrompt, schema: unknown): Promise<T>
  abstract countTokens(text: string): number

  protected buildMessages(prompt: LLMPrompt): Array<{ role: string; content: string }> {
    return [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user }
    ]
  }

  protected handleError(error: unknown): never {
    console.error(`[${this.name}] Error:`, error)
    
    const err = error as { response?: { status?: number }; message?: string }
    
    if (err.response?.status === 429 || err.status === 429 || err.code === 'insufficient_quota') {
      throw new Error('429 You exceeded your current quota, please check your plan and billing details.')
    }
    
    if (err.response?.status === 401) {
      throw new Error('Invalid API key. Please check your configuration.')
    }
    
    if (err.response?.status === 400) {
      throw new Error('Invalid request. Please check your input.')
    }
    
    throw new Error(`LLM provider error: ${err.message || 'Unknown error'}`)
  }
}