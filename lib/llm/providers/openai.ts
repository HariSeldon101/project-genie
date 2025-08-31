import OpenAI from 'openai'
import { BaseProvider } from './base'
import { LLMPrompt, LLMConfig, LLMResponse } from '../types'
import { z } from 'zod'
import { responseNormalizer } from '../response-normalizer'
import { documentLogger } from '../../utils/document-logger'
import { persistentLogger } from '../../utils/persistent-logger'

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
      dangerouslyAllowBrowser: false, // Only server-side
      timeout: 120000, // 120 second timeout per request (GPT-5 can be slower)
      maxRetries: 2 // Retry up to 2 times on network errors
    })
  }

  async generateText(prompt: LLMPrompt): Promise<string> {
    try {
      const model = this.config.model || 'gpt-5-mini'
      const isGPT5 = model.startsWith('gpt-5')
      
      // GPT-5 models MUST use the Responses API to avoid empty response bug
      if (isGPT5) {
        // Combine system and user messages for Responses API
        const messages = this.buildMessages(prompt)
        let input = ''
        for (const msg of messages) {
          if (msg.role === 'system') {
            input += `Instructions: ${msg.content}\n\n`
          } else if (msg.role === 'user') {
            input += msg.content
          }
        }
        
        const response = await this.client.responses.create({
          model,
          input,
          text: { 
            verbosity: 'high' // Use high verbosity for detailed responses
          },
          reasoning: { 
            effort: prompt.reasoningEffort || 'minimal' // Minimal effort for speed
          },
          max_output_tokens: prompt.maxTokens ?? this.config.maxTokens ?? 8000
        })
        
        return response.output_text || ''
      } else {
        // Use Chat Completions API for non-GPT-5 models
        const completionParams = {
          model,
          messages: this.buildMessages(prompt),
          temperature: prompt.temperature ?? this.config.temperature ?? 0.7,
          max_tokens: prompt.maxTokens ?? this.config.maxTokens ?? 8000
        }
        
        const response = await this.client.chat.completions.create(completionParams)
        return response.choices[0]?.message?.content || ''
      }
    } catch (error) {
      this.handleError(error)
    }
  }

  async generateJSONWithMetrics<T>(prompt: LLMPrompt, schema: z.ZodSchema<T>): Promise<LLMResponse<T>> {
    try {
      const model = this.config.model || 'gpt-5-mini'
      const isGPT5 = model.startsWith('gpt-5')
      
      // Add JSON instruction to the prompt
      const jsonPrompt: LLMPrompt = {
        ...prompt,
        user: `${prompt.user}\n\nIMPORTANT: Return your response as valid JSON only, with no additional text or markdown formatting.`
      }

      const requestStartTime = Date.now()
      let content: string
      let usage: any

      if (isGPT5) {
        // GPT-5: Use Responses API to avoid empty response bug
        const messages = this.buildMessages(jsonPrompt)
        let input = ''
        for (const msg of messages) {
          if (msg.role === 'system') {
            input += `Instructions: ${msg.content}\n\n`
          } else if (msg.role === 'user') {
            input += msg.content
          }
        }
        
        // Log the request
        persistentLogger.logApiRequest('openai', model, jsonPrompt, { model, input })
        
        const response = await this.client.responses.create({
          model,
          input,
          text: { 
            verbosity: 'high' // High verbosity for complete JSON
          },
          reasoning: { 
            effort: prompt.reasoningEffort || 'minimal' // Minimal for speed
          },
          max_output_tokens: prompt.maxTokens ?? this.config.maxTokens ?? 8000
        })
        
        const requestDuration = Date.now() - requestStartTime
        persistentLogger.logApiResponse('openai', model, response, requestDuration)
        
        content = response.output_text || '{}'
        usage = response.usage ? {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          totalTokens: response.usage.total_tokens
        } : undefined
        
      } else {
        // GPT-4 and others: Use Chat Completions API
        const completionParams = {
          model,
          messages: this.buildMessages(jsonPrompt),
          temperature: prompt.temperature ?? this.config.temperature ?? 0.7,
          max_tokens: prompt.maxTokens ?? this.config.maxTokens ?? 8000,
          response_format: { type: 'json_object' as const }
        }
        
        // Log the request
        persistentLogger.logApiRequest('openai', model, jsonPrompt, completionParams)
        
        const response = await this.client.chat.completions.create(completionParams)
        
        const requestDuration = Date.now() - requestStartTime
        persistentLogger.logApiResponse('openai', model, response, requestDuration)
        
        content = response.choices[0]?.message?.content || '{}'
        usage = response.usage ? {
          inputTokens: response.usage.prompt_tokens,
          outputTokens: response.usage.completion_tokens,
          reasoningTokens: (response.usage as any).reasoning_tokens,
          totalTokens: response.usage.total_tokens
        } : undefined
      }
      
      // Log raw response for debugging
      documentLogger.debug('OPENAI', 'Raw response', {
        model,
        contentLength: content.length,
        contentPreview: content.substring(0, 200)
      })
      
      try {
        // First attempt: direct parse
        const parsed = JSON.parse(content)
        const validated = schema.parse(parsed)
        
        documentLogger.info('OPENAI', 'Successfully parsed JSON on first attempt')
        
        // Return with metrics
        return {
          content: validated,
          usage,
          model,
          provider: 'openai'
        }
      } catch (parseError) {
        // Second attempt: use normalizer
        documentLogger.warn('OPENAI', 'Direct parse failed, using normalizer', {
          error: (parseError as Error).message
        })
        
        try {
          const normalized = responseNormalizer.parseAndNormalize(content)
          const validated = schema.parse(normalized)
          
          documentLogger.info('OPENAI', 'Successfully normalized and validated JSON')
          
          return {
            content: validated,
            usage,
            model,
            provider: 'openai'
          }
        } catch (normalizeError) {
          // Log the full response for debugging
          documentLogger.error('OPENAI', 'Normalization failed', normalizeError as Error, {
            responsePreview: content.substring(0, 500)
          })
          
          persistentLogger.logJsonError(content, normalizeError as Error, {
            model,
            provider: 'openai',
            promptLength: JSON.stringify(jsonPrompt).length
          })
          
          console.error('Full response that failed to parse:', content)
          
          throw new Error(`Invalid JSON response from ${model}: ${(normalizeError as Error).message}`)
        }
      }
    } catch (error) {
      this.handleError(error)
    }
  }

  async generateJSON<T>(prompt: LLMPrompt, schema: z.ZodSchema<T>): Promise<T> {
    const result = await this.generateJSONWithMetrics(prompt, schema)
    return result.content
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