import { LLMProvider, LLMConfig, LLMPrompt, SanitizedProjectData } from './types'
import { OpenAIProvider } from './providers/openai'
import { DeepSeekProvider } from './providers/deepseek'
import { GroqProvider } from './providers/groq'
import { VercelAIProvider } from './providers/vercel-ai'
import { OllamaProvider } from './providers/ollama'
import { MockProvider } from './providers/mock'
import { DataSanitizer } from './sanitizer'

export class LLMGateway {
  private provider: LLMProvider
  private sanitizer: DataSanitizer
  private config: LLMConfig

  constructor(config?: Partial<LLMConfig>) {
    // Check if we should use mock mode
    const useMock = process.env.USE_MOCK_LLM === 'true' || process.env.NODE_ENV === 'test'
    
    // Check for available providers - ALWAYS use GPT-5 mini for better performance
    let primaryProvider: LLMConfig['provider'] = 'mock'
    
    if (!useMock) {
      // ALWAYS prefer Vercel AI Gateway for GPT-5 mini (better performance)
      if (process.env.OPENAI_API_KEY) {
        primaryProvider = 'vercel-ai'
        console.log('🚀 Using GPT-5 mini via Vercel AI Gateway (optimized performance)')
      } else if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_api_key') {
        primaryProvider = 'groq'
        console.log('⚡ Groq API enabled as fallback')
      } else {
        console.warn('⚠️ No API keys found, using mock provider')
      }
    }
    
    // Default configuration - FORCE GPT-5 mini for better performance
    this.config = {
      provider: (config?.provider || process.env.LLM_PROVIDER || primaryProvider) as LLMConfig['provider'],
      apiKey: config?.apiKey,
      model: config?.model || process.env.LLM_MODEL || 'gpt-5-mini', // Default to GPT-5 mini
      maxTokens: config?.maxTokens || parseInt(process.env.LLM_MAX_TOKENS || '4000'),
      temperature: config?.temperature || parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
      baseUrl: config?.baseUrl || process.env.OLLAMA_BASE_URL,
      // Simplified fallback chain: vercel-ai -> openai -> mock (no DeepSeek)
      fallbackProviders: config?.fallbackProviders || ['vercel-ai', 'openai', 'mock']
    }

    // Initialize provider based on configuration
    this.provider = this.createProvider()
    this.sanitizer = new DataSanitizer()
    
    console.info(`🤖 Using ${this.config.provider} LLM provider`)
    if (this.config.fallbackProviders?.length) {
      console.info(`   Fallback chain: ${this.config.fallbackProviders.join(' → ')}`)
    }
  }

  private createProvider(providerName?: string): LLMProvider {
    const provider = providerName || this.config.provider
    
    switch (provider) {
      case 'openai':
        const openaiKey = this.config.apiKey || process.env.OPENAI_API_KEY
        if (!openaiKey || openaiKey === 'your_openai_api_key') {
          console.warn('⚠️ No valid OpenAI API key found')
          return new MockProvider(this.config)
        }
        return new OpenAIProvider({ ...this.config, apiKey: openaiKey })
        
      case 'deepseek':
        const deepseekKey = this.config.apiKey || process.env.DEEPSEEK_API_KEY
        if (!deepseekKey || deepseekKey === 'your_deepseek_api_key') {
          console.warn('⚠️ No valid DeepSeek API key found')
          return new MockProvider(this.config)
        }
        return new DeepSeekProvider({ ...this.config, apiKey: deepseekKey })
        
      case 'groq':
        const groqKey = this.config.apiKey || process.env.GROQ_API_KEY
        if (!groqKey || groqKey === 'your_groq_api_key') {
          console.warn('⚠️ No valid Groq API key found')
          return new MockProvider(this.config)
        }
        return new GroqProvider({ ...this.config, apiKey: groqKey })
        
      case 'vercel-ai':
        // For local development, only use OpenAI API key
        // For Vercel deployment, prefer AI Gateway key
        const vercelKey = process.env.VERCEL 
          ? (this.config.apiKey || process.env.AI_GATEWAY_API_KEY || process.env.OPENAI_API_KEY)
          : (this.config.apiKey || process.env.OPENAI_API_KEY)
        
        if (!vercelKey) {
          console.warn('⚠️ No valid API key found for Vercel AI Gateway')
          return new MockProvider(this.config)
        }
        return new VercelAIProvider({ ...this.config, apiKey: vercelKey })
        
      case 'ollama':
        // Ollama doesn't need an API key
        return new OllamaProvider({
          ...this.config,
          baseUrl: this.config.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
        })
        
      case 'mock':
        return new MockProvider(this.config)
        
      // Future providers
      // case 'anthropic':
      //   const anthropicKey = this.config.apiKey || process.env.ANTHROPIC_API_KEY
      //   return new AnthropicProvider({ ...this.config, apiKey: anthropicKey })
      // case 'ollama':
      //   return new OllamaProvider(this.config)
        
      default:
        console.warn(`⚠️ Unsupported provider: ${provider}, falling back to mock`)
        return new MockProvider(this.config)
    }
  }

  /**
   * Generate text with PII protection
   */
  async generateText(prompt: LLMPrompt): Promise<string> {
    // Validate prompt for PII before sending
    this.sanitizer.validatePrompt(prompt.system)
    this.sanitizer.validatePrompt(prompt.user)
    
    console.log('[LLMGateway] Generating text:', {
      provider: this.config.provider,
      model: this.config.model || 'default',
      promptLength: prompt.system.length + prompt.user.length,
      temperature: prompt.temperature || this.config.temperature
    })
    
    // Log for audit (without actual content in production)
    await this.sanitizer.logSecurityEvent('PROMPT_VALIDATED', {
      provider: this.config.provider,
      model: this.config.model,
      timestamp: new Date().toISOString()
    })
    
    // Generate response
    const response = await this.provider.generateText(prompt)
    
    // Validate response is not empty
    if (!response || response.trim() === '') {
      console.error('[LLMGateway] Empty response received from provider')
      throw new Error('LLM returned empty response. Please try again.')
    }
    
    // Log successful generation
    console.log('[LLMGateway] Generated text successfully, length:', response.length)
    
    // Sanitize response before returning
    return this.sanitizer.sanitizeResponse(response)
  }

  /**
   * Generate text with metrics
   */
  async generateTextWithMetrics(prompt: LLMPrompt): Promise<any> {
    // Validate prompt for PII before sending
    this.sanitizer.validatePrompt(prompt.system)
    this.sanitizer.validatePrompt(prompt.user)
    
    console.log('[LLMGateway] Generating text with metrics:', {
      provider: this.config.provider,
      model: this.config.model || 'default',
      promptLength: prompt.system.length + prompt.user.length,
      temperature: prompt.temperature || this.config.temperature
    })
    
    // Log for audit
    await this.sanitizer.logSecurityEvent('PROMPT_VALIDATED', {
      provider: this.config.provider,
      model: this.config.model,
      timestamp: new Date().toISOString()
    })
    
    // Check if provider supports generateTextWithMetrics
    if (typeof (this.provider as any).generateTextWithMetrics === 'function') {
      const response = await (this.provider as any).generateTextWithMetrics(prompt)
      const sanitizedContent = typeof response.content === 'string' 
        ? this.sanitizer.sanitizeResponse(response.content)
        : response.content
      
      return {
        content: sanitizedContent,
        usage: response.usage,
        provider: response.provider || this.config.provider,
        model: response.model || this.config.model,
        generationTimeMs: response.generationTimeMs
      }
    }
    
    // Fallback to regular generateText
    const startTime = Date.now()
    const content = await this.generateText(prompt)
    
    return {
      content,
      usage: null, // No metrics available from regular generation
      provider: this.config.provider,
      model: this.config.model,
      generationTimeMs: Date.now() - startTime
    }
  }

  /**
   * Generate JSON with metrics and schema validation
   */
  async generateJSONWithMetrics<T>(
    prompt: LLMPrompt,
    schema: any
  ): Promise<LLMResponse<T>> {
    // Validate prompt for PII
    try {
      this.sanitizer.validatePrompt(prompt.system)
      this.sanitizer.validatePrompt(prompt.user)
    } catch (error) {
      console.error('Prompt validation failed. Debug info:')
      console.error('System prompt length:', prompt.system.length)
      console.error('User prompt length:', prompt.user.length)
      throw error
    }
    
    console.log('[LLMGateway] Generating JSON with metrics:', {
      provider: this.config.provider,
      model: this.config.model || 'default',
      promptLength: prompt.system.length + prompt.user.length,
      temperature: prompt.temperature || this.config.temperature,
      reasoningEffort: prompt.reasoningEffort,
      maxTokens: prompt.maxTokens,
      schemaType: schema._def?.typeName || 'unknown'
    })
    
    const startTime = Date.now()
    
    // Check if provider supports metrics
    if ('generateJSONWithMetrics' in this.provider && this.provider.generateJSONWithMetrics) {
      const response = await this.provider.generateJSONWithMetrics<T>(prompt, schema)
      
      // Sanitize the content
      const sanitizedContent = JSON.parse(
        this.sanitizer.sanitizeResponse(JSON.stringify(response.content))
      )
      
      return {
        ...response,
        content: sanitizedContent
      }
    }
    
    // Fallback: use regular method and wrap response
    const content = await this.generateJSON<T>(prompt, schema)
    const generationTime = Date.now() - startTime
    
    return {
      content,
      provider: this.config.provider,
      model: this.config.model,
      usage: {
        totalTokens: this.estimateTokens(prompt.system + prompt.user + JSON.stringify(content))
      }
    }
  }

  /**
   * Generate JSON with schema validation and PII protection
   */
  async generateJSON<T>(
    prompt: LLMPrompt,
    schema: any
  ): Promise<T> {
    // Validate prompt for PII
    try {
      this.sanitizer.validatePrompt(prompt.system)
      this.sanitizer.validatePrompt(prompt.user)
    } catch (error) {
      // Log the prompt that failed validation for debugging
      console.error('Prompt validation failed. Debug info:')
      console.error('System prompt length:', prompt.system.length)
      console.error('User prompt length:', prompt.user.length)
      
      // Log first 200 chars of each prompt (sanitized for logging)
      console.error('System prompt preview:', prompt.system.substring(0, 200).replace(/\n/g, ' '))
      console.error('User prompt preview:', prompt.user.substring(0, 200).replace(/\n/g, ' '))
      
      throw error
    }
    
    console.log('[LLMGateway] Generating JSON:', {
      provider: this.config.provider,
      model: this.config.model || 'default',
      promptLength: prompt.system.length + prompt.user.length,
      temperature: prompt.temperature || this.config.temperature,
      schemaType: schema._def?.typeName || 'unknown'
    })
    
    await this.sanitizer.logSecurityEvent('PROMPT_VALIDATED', {
      provider: this.config.provider,
      model: this.config.model,
      type: 'json',
      timestamp: new Date().toISOString()
    })
    
    // Generate response with automatic failover chain
    let response: T
    let lastError: Error | null = null
    const triedProviders: string[] = []
    
    // Try primary provider first
    try {
      response = await this.provider.generateJSON<T>(prompt, schema)
      console.log(`✅ Generated JSON with ${this.config.provider}/${this.config.model || 'default'}`)
    } catch (error: any) {
      lastError = error
      triedProviders.push(this.config.provider)
      
      // Check if we should try fallback providers
      const shouldFallback = error?.message?.includes('429') || 
                           error?.message?.includes('quota') ||
                           error?.message?.includes('rate limit') ||
                           error?.message?.includes('API key')
      
      if (shouldFallback && this.config.fallbackProviders) {
        console.warn(`⚠️ ${this.config.provider} failed: ${error.message}`)
        console.info('🔄 Trying fallback providers...')
        
        // Try each fallback provider in order
        for (const fallbackProvider of this.config.fallbackProviders) {
          if (triedProviders.includes(fallbackProvider)) continue
          
          try {
            console.info(`   Trying ${fallbackProvider}...`)
            const provider = this.createProvider(fallbackProvider)
            response = await provider.generateJSON<T>(prompt, schema)
            console.log(`   ✅ Success with ${fallbackProvider}!`)
            
            // Add metadata about which provider was used
            if (typeof response === 'object' && response !== null) {
              (response as any)._provider = fallbackProvider
              if (fallbackProvider === 'mock') {
                (response as any)._isMockData = true
              }
            }
            break
          } catch (fallbackError: any) {
            console.warn(`   ❌ ${fallbackProvider} failed: ${fallbackError.message}`)
            triedProviders.push(fallbackProvider)
            lastError = fallbackError
            continue
          }
        }
      }
      
      // If all providers failed, throw the last error
      if (!response!) {
        console.error(`❌ All providers failed. Tried: ${triedProviders.join(', ')}`)
        throw lastError
      }
    }
    
    // Sanitize JSON response
    const sanitizedJson = JSON.parse(
      this.sanitizer.sanitizeResponse(JSON.stringify(response))
    )
    
    return sanitizedJson as T
  }

  /**
   * Build a context-aware prompt from sanitized project data
   */
  buildContextPrompt(
    templateSystem: string,
    templateUser: string,
    data: SanitizedProjectData
  ): LLMPrompt {
    // Replace template variables with sanitized data
    const system = templateSystem
      .replace('{{methodology}}', data.methodology)
      .replace('{{sector}}', data.sector)
    
    const stakeholderList = data.stakeholders
      .map(s => `- ${s.placeholder}: ${s.role}`)
      .join('\n')
    
    const user = templateUser
      .replace('{{projectName}}', data.projectName)
      .replace('{{vision}}', data.vision)
      .replace('{{businessCase}}', data.businessCase)
      .replace('{{description}}', data.description)
      .replace('{{companyWebsite}}', data.companyWebsite)
      .replace('{{stakeholders}}', stakeholderList)
    
    return { system, user }
  }

  /**
   * Estimate tokens for cost calculation
   */
  estimateTokens(text: string): number {
    return this.provider.countTokens(text)
  }

  /**
   * Calculate estimated cost (in cents)
   */
  estimateCost(inputTokens: number, outputTokens: number): number {
    // Pricing per 1K tokens in cents (multiply by 100 for cents)
    const pricing = {
      // GPT-5 models (from Vercel AI Gateway pricing)
      'gpt-5': { input: 10.0, output: 30.0 }, // $0.10/$0.30 per 1K tokens
      'gpt-5-mini': { input: 2.5, output: 10.0 }, // $0.025/$0.10 per 1K tokens
      'gpt-5-nano': { input: 0.25, output: 2.0 }, // $0.0025/$0.02 per 1K tokens
      // GPT-4 models
      'gpt-4-turbo-preview': { input: 1.0, output: 3.0 }, // $0.01/$0.03 per 1K
      'gpt-4': { input: 3.0, output: 6.0 }, // $0.03/$0.06 per 1K
      'gpt-3.5-turbo': { input: 0.05, output: 0.15 } // $0.0005/$0.0015 per 1K
    }
    
    const model = this.config.model || 'gpt-4-turbo-preview'
    const modelPricing = pricing[model as keyof typeof pricing] || pricing['gpt-5-mini']
    
    const inputCost = (inputTokens / 1000) * modelPricing.input
    const outputCost = (outputTokens / 1000) * modelPricing.output
    
    return Math.round((inputCost + outputCost) * 100) // Return in cents
  }
  
  /**
   * Calculate cost in USD
   */
  calculateCostUsd(inputTokens: number, outputTokens: number): number {
    const cents = this.estimateCost(inputTokens, outputTokens)
    return cents / 100 // Convert cents to dollars
  }

  /**
   * Health check for the LLM provider
   */
  async healthCheck(): Promise<boolean> {
    try {
      const testPrompt: LLMPrompt = {
        system: 'You are a helpful assistant.',
        user: 'Reply with "OK" if you are working.',
        maxTokens: 10
      }
      
      const response = await this.provider.generateText(testPrompt)
      return response.toLowerCase().includes('ok')
    } catch (error) {
      console.error('LLM health check failed:', error)
      return false
    }
  }
}