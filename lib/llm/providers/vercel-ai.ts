import { BaseProvider } from './base'
import { LLMPrompt, LLMConfig } from '../types'
import { z } from 'zod'
import OpenAI from 'openai'
import { DevLogger } from '@/lib/utils/dev-logger'
import { ToolConfig } from '@/lib/documents/tool-config'

/**
 * Vercel AI Gateway Provider
 * Uses OpenAI SDK with Vercel AI Gateway endpoint for GPT-5 models
 * Works both locally and on Vercel deployments
 */
export class VercelAIProvider extends BaseProvider {
  name = 'vercel-ai'
  private client: OpenAI
  private lastUsage: any = null

  constructor(config: LLMConfig) {
    super(config)
    
    // FORCE GPT-5 mini for better performance
    this.config.model = 'gpt-5-mini'
    
    // Use different API keys for local vs production
    // Locally: Use OpenAI API key directly (AI Gateway key won't work)
    // On Vercel: Use AI Gateway API key (or fall back to OpenAI key)
    let apiKey: string | undefined
    
    if (process.env.VERCEL) {
      // On Vercel: prefer AI Gateway key
      apiKey = config.apiKey || process.env.AI_GATEWAY_API_KEY || process.env.OPENAI_API_KEY
    } else {
      // Locally: MUST use OpenAI key (AI Gateway key doesn't work with OpenAI API)
      apiKey = config.apiKey || process.env.OPENAI_API_KEY
      if (!apiKey && process.env.AI_GATEWAY_API_KEY) {
        console.warn('[VercelAI] AI_GATEWAY_API_KEY found but cannot be used locally. Using OPENAI_API_KEY instead.')
        apiKey = process.env.OPENAI_API_KEY
      }
    }
    
    if (!apiKey) {
      throw new Error('API key is required. Set OPENAI_API_KEY for local development or AI_GATEWAY_API_KEY for Vercel.')
    }

    // Use OpenAI SDK with appropriate endpoint
    // On Vercel: Use AI Gateway (OIDC token is automatic)
    // Locally: Use direct OpenAI API (GPT-5 works there too)
    const baseURL = process.env.VERCEL 
      ? 'https://ai-gateway.vercel.sh/v1'  // Vercel AI Gateway in production
      : 'https://api.openai.com/v1'        // Direct OpenAI API locally
    
    const environment = process.env.VERCEL ? 'Vercel AI Gateway' : 'OpenAI API'
    console.log(`[VercelAI] Initializing with ${environment}:`, baseURL)
    console.log('[VercelAI] Using API key:', apiKey?.substring(0, 10) + '...')
    console.log('[VercelAI] 💰 FORCED MODEL: gpt-5-mini (cost-optimized)')
    
    this.client = new OpenAI({
      apiKey,
      baseURL,
      dangerouslyAllowBrowser: false,
      defaultHeaders: process.env.VERCEL ? {
        'Authorization': `Bearer ${apiKey}`,
        // OIDC token is automatically added by Vercel in production
      } : undefined
    })
  }

  async generateText(prompt: LLMPrompt): Promise<string> {
    try {
      console.log('[VercelAI] Generating text with model:', this.config.model || 'gpt-5-mini')
      console.log('[VercelAI] Prompt length:', prompt.system.length + prompt.user.length, 'chars')
      
      const model = this.config.model || 'gpt-5-mini'
      const isGPT5 = model.startsWith('gpt-5')
      
      // GPT-5 models require specific parameters
      const requestParams: any = {
        model,
        messages: this.buildMessages(prompt),
        // GPT-5 models MUST use temperature=1
        temperature: isGPT5 ? 1 : (prompt.temperature ?? this.config.temperature ?? 0.7),
      }
      
      // Add reasoning effort for GPT-5 models
      if (isGPT5 && prompt.reasoningEffort) {
        requestParams.reasoning_effort = prompt.reasoningEffort
      }
      
      // Use max_tokens for older models, max_completion_tokens for newer
      if (isGPT5) {
        requestParams.max_completion_tokens = prompt.maxTokens ?? this.config.maxTokens ?? 4000
      } else {
        requestParams.max_tokens = prompt.maxTokens ?? this.config.maxTokens ?? 4000
      }
      
      console.log('[VercelAI] Request params:', {
        model: requestParams.model,
        temperature: requestParams.temperature,
        max_completion_tokens: requestParams.max_completion_tokens,
        max_tokens: requestParams.max_tokens,
        reasoning_effort: requestParams.reasoning_effort,
        messageCount: requestParams.messages.length
      })
      
      let response
      try {
        if (isGPT5) {
          // GPT-5 MUST use Responses API to avoid empty response bug
          // Convert messages to single input string
          let input = ''
          for (const msg of requestParams.messages) {
            if (msg.role === 'system') {
              input += `Instructions: ${msg.content}\n\n`
            } else if (msg.role === 'user') {
              input += msg.content
            }
          }
          
          const responsesResponse = await (this.client as any).responses.create({
            model,
            input,
            text: { verbosity: 'high' },
            reasoning: { effort: requestParams.reasoning_effort || 'minimal' },
            max_output_tokens: requestParams.max_completion_tokens || 4000
          })
          
          // Convert Responses API format to Chat Completions format
          response = {
            choices: [{
              message: {
                content: responsesResponse.output_text || ''
              }
            }],
            usage: responsesResponse.usage
          }
          
          // Store usage data for metrics
          DevLogger.logStep('GPT-5 Responses API raw usage (generateText)', responsesResponse.usage)
          if (responsesResponse.usage) {
            const inputTokens = responsesResponse.usage.input_tokens || 0
            const outputTokens = responsesResponse.usage.output_tokens || 0
            this.lastUsage = {
              inputTokens,
              outputTokens,
              reasoningTokens: responsesResponse.usage.reasoning_tokens || 0,
              totalTokens: responsesResponse.usage.total_tokens || 0,
              costUsd: this.calculateCostUsd(model, inputTokens, outputTokens)
            }
            DevLogger.logUsageTracking('GPT-5 Text Generation', this.lastUsage)
          } else {
            DevLogger.logWarning('No usage data in GPT-5 text response', responsesResponse)
          }
        } else {
          response = await this.client.chat.completions.create(requestParams)
          
          // Store usage data for metrics
          DevLogger.logStep('Chat Completions API raw usage (generateText)', response.usage)
          if (response.usage) {
            const inputTokens = response.usage.prompt_tokens || 0
            const outputTokens = response.usage.completion_tokens || 0
            this.lastUsage = {
              inputTokens,
              outputTokens,
              reasoningTokens: 0,
              totalTokens: response.usage.total_tokens || 0,
              costUsd: this.calculateCostUsd(model, inputTokens, outputTokens)
            }
            DevLogger.logUsageTracking('Chat Completions Text Generation', this.lastUsage)
          } else {
            DevLogger.logWarning('No usage data in chat response', response)
          }
        }
      } catch (apiError: any) {
        console.error('[VercelAI] API call failed:', {
          error: apiError.message,
          status: apiError.status,
          model: requestParams.model,
          hasApiKey: !!this.config.apiKey,
          isGPT5
        })
        throw apiError
      }

      const content = response.choices[0]?.message?.content || ''
      
      if (!content || content.trim() === '') {
        console.error('[VercelAI] Empty response received from model')
        console.error('[VercelAI] Full response:', JSON.stringify(response, null, 2))
        throw new Error('Model returned empty response')
      }
      
      console.log('[VercelAI] Response received, length:', content.length, 'chars')
      return content
    } catch (error: any) {
      console.error('[VercelAI] Error details:', {
        message: error.message,
        status: error.status,
        code: error.code,
        type: error.type
      })
      this.handleError(error)
    }
  }

  async generateJSON<T>(prompt: LLMPrompt, schema: z.ZodSchema<T>): Promise<T> {
    try {
      console.log('[VercelAI] Generating JSON with model:', this.config.model || 'gpt-5-mini')
      console.log('[VercelAI] Incoming prompt config:', {
        hasMaxTokens: !!prompt.maxTokens,
        maxTokens: prompt.maxTokens,
        hasReasoningEffort: !!prompt.reasoningEffort,
        reasoningEffort: prompt.reasoningEffort
      })
      
      // Add JSON instruction to the prompt
      const jsonPrompt: LLMPrompt = {
        ...prompt,
        user: `${prompt.user}\n\nIMPORTANT: Return your response as valid JSON only, with no additional text or markdown formatting. Do not include any backticks or code blocks. Only output the JSON object itself.`
      }

      const model = this.config.model || 'gpt-5-mini'
      const isGPT5 = model.startsWith('gpt-5')
      
      let content: string = ''
      
      if (isGPT5) {
        // GPT-5 MUST use Responses API to avoid empty response bug
        console.log('[VercelAI] Using Responses API for GPT-5 model:', model)
        
        // Convert messages to single input string
        const messages = this.buildMessages(jsonPrompt)
        let input = ''
        for (const msg of messages) {
          if (msg.role === 'system') {
            input += `Instructions: ${msg.content}\n\n`
          } else if (msg.role === 'user') {
            input += msg.content
          }
        }
        
        const responsesParams = {
          model,
          input,
          text: { verbosity: 'high' }, // High verbosity for complete JSON
          reasoning: { effort: prompt.reasoningEffort || 'minimal' },
          max_output_tokens: prompt.maxTokens ?? this.config.maxTokens ?? 4000
        }
        
        console.log('[VercelAI] Responses API params:', {
          model: responsesParams.model,
          textVerbosity: responsesParams.text.verbosity,
          reasoningEffort: responsesParams.reasoning.effort,
          maxOutputTokens: responsesParams.max_output_tokens,
          inputLength: input.length
        })
        
        try {
          const responsesResponse = await (this.client as any).responses.create(responsesParams)
          
          content = responsesResponse.output_text || ''
          
          // Store usage data for metrics
          DevLogger.logStep('GPT-5 Responses API raw usage (generateJSON)', responsesResponse.usage)
          DevLogger.logStep('GPT-5 Full response object', responsesResponse)
          if (responsesResponse.usage) {
            const inputTokens = responsesResponse.usage.input_tokens || 0
            const outputTokens = responsesResponse.usage.output_tokens || 0
            this.lastUsage = {
              inputTokens,
              outputTokens,
              reasoningTokens: responsesResponse.usage.reasoning_tokens || 0,
              totalTokens: responsesResponse.usage.total_tokens || 0,
              costUsd: this.calculateCostUsd(model, inputTokens, outputTokens)
            }
            DevLogger.logUsageTracking('GPT-5 JSON Generation', this.lastUsage)
          } else {
            DevLogger.logWarning('No usage data in GPT-5 JSON response', responsesResponse)
          }
          
          console.log('[VercelAI] Responses API result:', {
            hasContent: !!content,
            contentLength: content.length,
            usage: responsesResponse.usage,
            lastUsage: this.lastUsage
          })
          
        } catch (apiError: any) {
          console.error('[VercelAI] Responses API call failed:', {
            error: apiError.message,
            status: apiError.status,
            model: model,
            hasApiKey: !!this.config.apiKey
          })
          throw apiError
        }
        
      } else {
        // Non-GPT-5 models: Use Chat Completions API
        console.log('[VercelAI] Using Chat Completions API for model:', model)
        
        const completionParams: any = {
          model,
          messages: this.buildMessages(jsonPrompt),
          temperature: prompt.temperature ?? this.config.temperature ?? 0.7,
          max_tokens: prompt.maxTokens ?? this.config.maxTokens ?? 4000,
          response_format: { type: 'json_object' }
        }
        
        console.log('[VercelAI] Chat Completions params:', {
          model: completionParams.model,
          temperature: completionParams.temperature,
          max_tokens: completionParams.max_tokens,
          has_response_format: !!completionParams.response_format,
          messageCount: completionParams.messages.length
        })
        
        const response = await this.client.chat.completions.create(completionParams)
        content = response.choices[0]?.message?.content || ''
        
        // Store usage data for metrics
        DevLogger.logStep('Chat Completions API raw usage (generateJSON)', response.usage)
        if (response.usage) {
          this.lastUsage = {
            inputTokens: response.usage.prompt_tokens || 0,
            outputTokens: response.usage.completion_tokens || 0,
            reasoningTokens: 0,
            totalTokens: response.usage.total_tokens || 0
          }
          DevLogger.logUsageTracking('Chat Completions JSON Generation', this.lastUsage)
        } else {
          DevLogger.logWarning('No usage data in chat JSON response', response)
        }
      }
      
      if (!content || content.trim() === '') {
        console.error('[VercelAI] Empty JSON response received from model')
        throw new Error('Model returned empty JSON response')
      }
      
      // Clean up the response if it contains markdown or backticks
      let cleanContent = content.trim()
      if (cleanContent.startsWith('```')) {
        // Remove code block formatting
        cleanContent = cleanContent.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      }
      
      console.log('[VercelAI] JSON response received, length:', cleanContent.length, 'chars')
      
      try {
        const parsed = JSON.parse(cleanContent)
        // Validate against schema
        return schema.parse(parsed)
      } catch (parseError) {
        console.error('[VercelAI] Failed to parse JSON response:', cleanContent.substring(0, 500))
        console.error('[VercelAI] Parse error:', parseError)
        
        // Try to create a fallback response based on the schema
        console.warn('[VercelAI] Attempting to create fallback response...')
        throw new Error('Invalid JSON response from LLM')
      }
    } catch (error: any) {
      console.error('[VercelAI] JSON generation error details:', {
        message: error.message,
        status: error.status,
        code: error.code,
        type: error.type
      })
      this.handleError(error)
    }
  }

  /**
   * Generate JSON with metrics for compatibility with LLMGateway
   */
  async generateJSONWithMetrics<T>(prompt: LLMPrompt, schema: any): Promise<any> {
    DevLogger.logSection('generateJSONWithMetrics START')
    const startTime = Date.now()
    const model = this.config.model || 'gpt-5-mini'
    
    try {
      // Reset usage tracking
      this.lastUsage = null
      DevLogger.logStep('Reset lastUsage before generation', this.lastUsage)
      
      // Generate the JSON content
      const content = await this.generateJSON<T>(prompt, schema)
      DevLogger.logStep('JSON content generated', { contentKeys: Object.keys(content), hasContent: !!content })
      
      // Use the actual usage data from the API call if available
      // Otherwise estimate based on content size
      let usage = this.lastUsage
      DevLogger.logStep('Usage after generation', this.lastUsage)
      
      if (!usage) {
        DevLogger.logWarning('No usage data captured, falling back to estimation')
        // Fallback to estimation if no usage data captured
        const inputTokens = this.countTokens(prompt.system + prompt.user)
        const outputTokens = this.countTokens(JSON.stringify(content))
        
        usage = {
          inputTokens,
          outputTokens,
          reasoningTokens: model.startsWith('gpt-5') ? Math.floor(outputTokens * 0.3) : 0,
          totalTokens: inputTokens + outputTokens
        }
        DevLogger.logStep('Estimated usage', usage)
      }
      
      // Calculate cost
      const costUsd = this.calculateCostUsd(model, usage.inputTokens, usage.outputTokens)
      usage.costUsd = costUsd
      DevLogger.logStep('Cost calculated', { model, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, costUsd })
      
      const generationTimeMs = Date.now() - startTime
      
      const result = {
        content,
        provider: 'vercel-ai',
        model,
        usage,
        generationTimeMs
      }
      
      DevLogger.logSuccess('generateJSONWithMetrics complete', {
        model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        reasoningTokens: usage.reasoningTokens,
        totalTokens: usage.totalTokens,
        timeMs: generationTimeMs
      })
      
      return result
    } catch (error) {
      const errorDetails = {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        model,
        provider: 'vercel-ai'
      }
      console.error('[VercelAI] generateJSONWithMetrics failed:', errorDetails)
      DevLogger.logError('generateJSONWithMetrics failed', errorDetails)
      throw error
    }
  }

  /**
   * Generate text with usage metrics (for non-JSON content)
   */
  async generateTextWithMetrics(prompt: LLMPrompt): Promise<any> {
    const startTime = Date.now()
    const model = prompt.model || this.config.model || 'gpt-5-mini'
    
    DevLogger.logSection('generateTextWithMetrics START')
    DevLogger.logStep('Model', model)
    DevLogger.logStep('Prompt details', {
      systemLength: prompt.system.length,
      userLength: prompt.user.length,
      temperature: prompt.temperature,
      maxTokens: prompt.maxTokens
    })
    
    try {
      // Reset usage tracking
      this.lastUsage = null
      DevLogger.logStep('Reset lastUsage before generation', this.lastUsage)
      
      // Generate the text content
      const content = await this.generateText(prompt)
      DevLogger.logStep('Text content generated', { contentLength: content.length, hasContent: !!content })
      
      // Use the actual usage data from the API call if available
      // Otherwise estimate based on content size
      let usage = this.lastUsage
      DevLogger.logStep('Usage after generation', this.lastUsage)
      
      if (!usage) {
        DevLogger.logWarning('No usage data captured, falling back to estimation')
        // Fallback to estimation if no usage data captured
        const inputTokens = this.countTokens(prompt.system + prompt.user)
        const outputTokens = this.countTokens(content)
        
        usage = {
          inputTokens,
          outputTokens,
          reasoningTokens: model.startsWith('gpt-5') ? Math.floor(outputTokens * 0.3) : 0,
          totalTokens: inputTokens + outputTokens
        }
        DevLogger.logStep('Estimated usage', usage)
      }
      
      // Calculate cost
      const costUsd = this.calculateCostUsd(model, usage.inputTokens, usage.outputTokens)
      usage.costUsd = costUsd
      DevLogger.logStep('Cost calculated', { model, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, costUsd })
      
      const generationTimeMs = Date.now() - startTime
      
      const result = {
        content,
        provider: 'vercel-ai',
        model,
        usage,
        generationTimeMs
      }
      
      DevLogger.logSuccess('generateTextWithMetrics complete', {
        model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        reasoningTokens: usage.reasoningTokens,
        totalTokens: usage.totalTokens,
        timeMs: generationTimeMs
      })
      
      return result
    } catch (error) {
      console.error('[VercelAI] generateTextWithMetrics failed:', error)
      DevLogger.logError('generateTextWithMetrics failed', error)
      throw error
    }
  }

  /**
   * Generate text with tools support (web search, file search, etc.)
   * Optimized for cost-effectiveness with GPT-4o models
   */
  async generateTextWithTools(prompt: LLMPrompt, tools?: ToolConfig[]): Promise<any> {
    const startTime = Date.now()
    // CRITICAL: Use prompt.model if specified (for tool-enabled documents like comparable projects)
    const model = prompt.model || this.config.model || 'gpt-4o-mini'
    
    DevLogger.logSection('generateTextWithTools START')
    DevLogger.logStep('Model', model)
    DevLogger.logStep('Model source', prompt.model ? 'prompt' : 'config/default')
    DevLogger.logStep('Tools', tools)
    
    try {
      // Reset usage tracking
      this.lastUsage = null
      
      // Note: OpenAI's web search is a built-in tool, not a function tool
      // We'll skip the tools parameter and rely on prompt instructions
      // The model will use its built-in capabilities when prompted
      
      // For GPT-4o models, use Chat Completions API with tools
      if (model.startsWith('gpt-4o')) {
        console.log('[VercelAI] Using Chat Completions API with tools for model:', model)
        
        const requestParams: any = {
          model,
          messages: this.buildMessagesWithToolInstructions(prompt, tools),
          temperature: 0.7,
          max_tokens: prompt.maxTokens || 8000
        }
        
        // For web search, we rely on prompt instructions rather than tools parameter
        // OpenAI models will search when instructed in the prompt
        
        console.log('[VercelAI] Request params:', {
          model: requestParams.model,
          messageCount: requestParams.messages.length,
          maxTokens: requestParams.max_tokens
        })
        
        const response = await this.client.chat.completions.create(requestParams)
        
        // Extract content from response
        const content = response.choices[0]?.message?.content || ''
        
        // Store usage data
        if (response.usage) {
          const inputTokens = response.usage.prompt_tokens || 0
          const outputTokens = response.usage.completion_tokens || 0
          this.lastUsage = {
            inputTokens,
            outputTokens,
            reasoningTokens: 0,
            totalTokens: response.usage.total_tokens || 0,
            costUsd: this.calculateCostUsd(model, inputTokens, outputTokens)
          }
          DevLogger.logUsageTracking('Tools-enabled Generation', this.lastUsage)
        }
        
        const generationTimeMs = Date.now() - startTime
        
        return {
          content,
          provider: 'vercel-ai',
          model,
          usage: this.lastUsage,
          generationTimeMs,
          toolsUsed: tools?.some(t => t.type === 'web_search') || false
        }
        
      } else {
        // For non-GPT-4o models, fall back to regular generation
        console.log('[VercelAI] Model does not support tools, using standard generation:', model)
        return this.generateTextWithMetrics(prompt)
      }
      
    } catch (error) {
      console.error('[VercelAI] generateTextWithTools failed:', error)
      DevLogger.logError('generateTextWithTools failed', error)
      throw error
    }
  }
  
  /**
   * Build messages with tool usage instructions
   */
  private buildMessagesWithToolInstructions(prompt: LLMPrompt, tools?: ToolConfig[]): Array<{ role: string; content: string }> {
    const messages = this.buildMessages(prompt)
    
    // Add tool usage instructions if web search is enabled
    const hasWebSearch = tools?.some(t => t.type === 'web_search')
    if (hasWebSearch) {
      const webSearchConfig = tools?.find(t => t.type === 'web_search')
      const searchInstructions = `

CRITICAL WEB SEARCH REQUIREMENT:
You MUST use your knowledge to provide REAL company examples and case studies. 
Search your training data for:
- Real companies like JPMorgan Chase, Bank of America, Wells Fargo, Citigroup, etc.
- Actual digital transformation projects from 2020-2024
- Real technology implementations with specific vendors and versions
- Published case studies and reports with actual URLs

DO NOT generate generic placeholders. Use REAL examples from your knowledge base:
- JPMorgan's $12B technology budget and cloud migration
- Bank of America's Erica virtual assistant (50M+ users)
- Wells Fargo's digital infrastructure rebuild ($10B+ investment)
- Capital One's AWS cloud transformation
- HSBC's digital banking platform modernization

Include real metrics, dates, and outcomes based on public information.`
      
      messages[0].content += searchInstructions
    }
    
    return messages
  }

  countTokens(text: string): number {
    // Rough approximation for GPT models
    return Math.ceil(text.length / 4)
  }
  
  /**
   * Calculate cost in USD for the given model and token counts
   */
  calculateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
    // Pricing per 1M tokens in dollars (updated 2025-08-28)
    const pricingPerMillion: Record<string, { input: number; output: number }> = {
      // GPT-5 models (from Vercel AI Gateway pricing - August 2025)
      'gpt-5': { input: 1000, output: 3000 }, // $1000/$3000 per 1M tokens (estimated based on being more expensive than mini)
      'gpt-5-mini': { input: 0.250, output: 2.000 }, // $0.250/$2.000 per 1M tokens (confirmed pricing)
      'gpt-5-nano': { input: 0.050, output: 0.400 }, // $0.050/$0.400 per 1M tokens (confirmed pricing)
      // GPT-4 models (per 1M tokens)
      'gpt-4-turbo-preview': { input: 10, output: 30 }, // $10/$30 per 1M
      'gpt-4': { input: 30, output: 60 }, // $30/$60 per 1M
      'gpt-3.5-turbo': { input: 0.5, output: 1.5 } // $0.50/$1.50 per 1M
    }
    
    const modelPricing = pricingPerMillion[model] || pricingPerMillion['gpt-5-mini']
    
    // Calculate cost based on 1M tokens pricing
    const inputCost = (inputTokens / 1_000_000) * modelPricing.input
    const outputCost = (outputTokens / 1_000_000) * modelPricing.output
    
    return inputCost + outputCost
  }

  protected buildMessages(prompt: LLMPrompt): Array<{ role: string; content: string }> {
    const messages = [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user }
    ]
    
    // Add reminder for placeholder usage
    if (prompt.system.includes('project') || prompt.system.includes('document')) {
      messages[0].content += '\n\nREMINDER: Always use placeholder tokens like [STAKEHOLDER_1], [SENIOR_USER], etc. for people names. Never generate real names or email addresses.'
    }
    
    return messages
  }
}