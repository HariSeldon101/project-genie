/**
 * Unified LLM Provider
 * Simplifies LLM integration with automatic API selection and consistent interface
 */

import OpenAI from 'openai'
import { z } from 'zod'
import { logger } from '../utils/permanent-logger'

export interface UnifiedLLMConfig {
  apiKey?: string
  model?: string
  maxTokens?: number
  temperature?: number
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high'
}

export interface UnifiedPrompt {
  system: string
  user: string
  maxTokens?: number
  temperature?: number
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high'
}

export interface UnifiedResponse<T = string> {
  content: T
  usage?: {
    inputTokens: number
    outputTokens: number
    reasoningTokens?: number
    totalTokens: number
  }
  model: string
  provider: string
  generationTimeMs: number
}

export class UnifiedLLMProvider {
  private client: OpenAI
  private config: UnifiedLLMConfig
  private startTime: number = 0

  constructor(config?: UnifiedLLMConfig) {
    // Determine API key and endpoint
    const apiKey = config?.apiKey || process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OpenAI API key is required')
    }

    // Always use OpenAI endpoint for simplicity (works with GPT-4 and GPT-5)
    const baseURL = 'https://api.openai.com/v1'

    this.client = new OpenAI({
      apiKey,
      baseURL,
      timeout: 120000, // 2 minute timeout
      maxRetries: 2
    })

    // Default to GPT-5 mini for cost optimization
    this.config = {
      model: config?.model || 'gpt-5-mini',
      maxTokens: config?.maxTokens || 4000,
      temperature: config?.temperature || 0.7,
      reasoningEffort: config?.reasoningEffort || 'minimal',
      ...config
    }

    logger.info('LLM_INIT', `UnifiedLLM initialized with model: ${this.config.model}`, {
      model: this.config.model,
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature,
      reasoningEffort: this.config.reasoningEffort
    })
  }

  /**
   * Check if model is GPT-5
   */
  private isGPT5(model: string): boolean {
    return model.startsWith('gpt-5')
  }

  /**
   * Generate text with automatic API selection
   */
  async generateText(prompt: UnifiedPrompt): Promise<UnifiedResponse<string>> {
    this.startTime = Date.now()
    const model = this.config.model || 'gpt-5-mini'
    
    try {
      let content: string
      let usage: any

      if (this.isGPT5(model)) {
        // GPT-5: Use Responses API
        logger.info('API_SELECT', `Using Responses API for GPT-5 model: ${model}`)
        console.log(`[UnifiedLLM] Using Responses API for ${model}`)
        
        const response = await (this.client as any).responses.create({
          model,
          input: `Instructions: ${prompt.system}\n\n${prompt.user}`,
          text: { verbosity: 'high' },
          reasoning: { effort: prompt.reasoningEffort || this.config.reasoningEffort || 'minimal' },
          max_output_tokens: prompt.maxTokens || this.config.maxTokens
        })

        content = response.output_text || ''
        usage = this.normalizeUsage(response.usage)
      } else {
        // GPT-4 and others: Use Chat Completions API
        logger.info('API_SELECT', `Using Chat Completions API for model: ${model}`)
        console.log(`[UnifiedLLM] Using Chat Completions API for ${model}`)
        
        const response = await this.client.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: prompt.system },
            { role: 'user', content: prompt.user }
          ],
          temperature: prompt.temperature || this.config.temperature,
          max_tokens: prompt.maxTokens || this.config.maxTokens
        })

        content = response.choices[0]?.message?.content || ''
        usage = this.normalizeUsage(response.usage)
      }

      const generationTime = Date.now() - this.startTime
      logger.apiCall('unified', model, true, generationTime, usage?.totalTokens)
      
      return {
        content,
        usage,
        model,
        provider: 'unified',
        generationTimeMs: generationTime
      }
    } catch (error) {
      const generationTime = Date.now() - this.startTime
      logger.apiCall('unified', model, false, generationTime, undefined, error.message)
      logger.error('LLM_ERROR', `UnifiedLLM generation failed for ${model}`, error, error.stack)
      console.error(`[UnifiedLLM] Generation failed:`, error)
      throw error
    }
  }

  /**
   * Generate JSON with automatic API selection
   */
  async generateJSON<T>(
    prompt: UnifiedPrompt,
    schema: z.ZodSchema<T>
  ): Promise<UnifiedResponse<T>> {
    // Add JSON instruction to prompt
    const jsonPrompt: UnifiedPrompt = {
      ...prompt,
      user: `${prompt.user}\n\nIMPORTANT: Return ONLY valid JSON with no markdown formatting or backticks.`
    }

    // Generate text
    const response = await this.generateText(jsonPrompt)
    
    // Clean and parse JSON
    let cleanContent = response.content.trim()
    if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    try {
      const parsed = JSON.parse(cleanContent)
      const validated = schema.parse(parsed)
      
      return {
        ...response,
        content: validated
      }
    } catch (error) {
      logger.error('JSON_PARSE', 'Failed to parse/validate JSON from LLM', {
        content: cleanContent.substring(0, 500),
        error: error.message
      })
      console.error('[UnifiedLLM] JSON parse/validation failed:', error)
      throw new Error('Invalid JSON response from LLM')
    }
  }

  /**
   * Generate JSON with metrics (alias for compatibility with LLMGateway)
   */
  async generateJSONWithMetrics<T>(
    prompt: UnifiedPrompt,
    schema: z.ZodSchema<T>
  ): Promise<UnifiedResponse<T>> {
    // This is the same as generateJSON but ensures metrics are returned
    return this.generateJSON(prompt, schema)
  }

  /**
   * Normalize usage data across different API responses
   */
  private normalizeUsage(usage: any) {
    if (!usage) return undefined

    return {
      inputTokens: usage.input_tokens || usage.prompt_tokens || 0,
      outputTokens: usage.output_tokens || usage.completion_tokens || 0,
      reasoningTokens: usage.reasoning_tokens || 0,
      totalTokens: usage.total_tokens || 0
    }
  }

  /**
   * Get provider info
   */
  getProviderInfo() {
    return {
      provider: 'unified',
      model: this.config.model,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      reasoningEffort: this.config.reasoningEffort
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.generateText({
        system: 'You are a helpful assistant.',
        user: 'Reply with "OK" if you are working.',
        maxTokens: 10
      })
      return response.content.toLowerCase().includes('ok')
    } catch (error) {
      logger.warn('HEALTH_CHECK', 'UnifiedLLM health check failed', error)
      console.error('[UnifiedLLM] Health check failed:', error)
      return false
    }
  }
}