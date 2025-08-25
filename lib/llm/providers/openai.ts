import OpenAI from 'openai'
import { BaseProvider } from './base'
import { LLMPrompt, LLMConfig } from '../types'
import { z } from 'zod'

export class OpenAIProvider extends BaseProvider {
  name = 'OpenAI'
  private client: OpenAI

  constructor(config: LLMConfig) {
    super(config)
    
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required')
    }

    this.client = new OpenAI({
      apiKey: config.apiKey,
      dangerouslyAllowBrowser: false // Only server-side
    })
  }

  async generateText(prompt: LLMPrompt): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.config.model || 'gpt-5-nano',  // Use GPT-5 nano for cost efficiency
        messages: this.buildMessages(prompt),
        temperature: prompt.temperature ?? this.config.temperature ?? 0.7,
        max_tokens: prompt.maxTokens ?? this.config.maxTokens ?? 4000,
      })

      return response.choices[0]?.message?.content || ''
    } catch (error) {
      this.handleError(error)
    }
  }

  async generateJSON<T>(prompt: LLMPrompt, schema: z.ZodSchema<T>): Promise<T> {
    try {
      // Add JSON instruction to the prompt
      const jsonPrompt: LLMPrompt = {
        ...prompt,
        user: `${prompt.user}\n\nIMPORTANT: Return your response as valid JSON only, with no additional text or markdown formatting.`
      }

      const response = await this.client.chat.completions.create({
        model: this.config.model || 'gpt-5-nano',  // Use GPT-5 nano for cost efficiency
        messages: this.buildMessages(jsonPrompt),
        temperature: prompt.temperature ?? this.config.temperature ?? 0.7,
        max_tokens: prompt.maxTokens ?? this.config.maxTokens ?? 4000,
        response_format: { type: 'json_object' }
      })

      const content = response.choices[0]?.message?.content || '{}'
      
      try {
        const parsed = JSON.parse(content)
        // Validate against schema
        return schema.parse(parsed)
      } catch (parseError) {
        console.error('Failed to parse JSON response:', content)
        throw new Error('Invalid JSON response from LLM')
      }
    } catch (error) {
      this.handleError(error)
    }
  }

  countTokens(text: string): number {
    // Rough approximation - in production, use tiktoken library
    // Average is ~4 characters per token for English text
    return Math.ceil(text.length / 4)
  }

  async streamText(
    prompt: LLMPrompt,
    onChunk: (chunk: string) => void
  ): Promise<string> {
    try {
      const stream = await this.client.chat.completions.create({
        model: this.config.model || 'gpt-4-turbo-preview',
        messages: this.buildMessages(prompt),
        temperature: prompt.temperature ?? this.config.temperature ?? 0.7,
        max_tokens: prompt.maxTokens ?? this.config.maxTokens ?? 4000,
        stream: true,
      })

      let fullResponse = ''
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || ''
        fullResponse += content
        onChunk(content)
      }

      return fullResponse
    } catch (error) {
      this.handleError(error)
    }
  }
}