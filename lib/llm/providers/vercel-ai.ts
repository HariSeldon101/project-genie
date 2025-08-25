import { BaseProvider } from './base'
import { LLMPrompt, LLMConfig } from '../types'
import { z } from 'zod'
import OpenAI from 'openai'

/**
 * Vercel AI Gateway Provider
 * Uses OpenAI SDK with Vercel AI Gateway endpoint for GPT-5 models
 * Works both locally and on Vercel deployments
 */
export class VercelAIProvider extends BaseProvider {
  name = 'vercel-ai'
  private client: OpenAI

  constructor(config: LLMConfig) {
    super(config)
    
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
      console.log('[VercelAI] Generating text with model:', this.config.model || 'gpt-5-nano')
      
      const model = this.config.model || 'gpt-5-nano'
      const isGPT5 = model.startsWith('gpt-5')
      
      const response = await this.client.chat.completions.create({
        model,
        messages: this.buildMessages(prompt),
        // GPT-5 models only support temperature=1
        temperature: isGPT5 ? 1 : (prompt.temperature ?? this.config.temperature ?? 0.7),
        max_completion_tokens: prompt.maxTokens ?? this.config.maxTokens ?? 4000,
      })

      return response.choices[0]?.message?.content || ''
    } catch (error: any) {
      console.error('[VercelAI] Error:', error)
      this.handleError(error)
    }
  }

  async generateJSON<T>(prompt: LLMPrompt, schema: z.ZodSchema<T>): Promise<T> {
    try {
      console.log('[VercelAI] Generating JSON with model:', this.config.model || 'gpt-5-nano')
      
      // Add JSON instruction to the prompt
      const jsonPrompt: LLMPrompt = {
        ...prompt,
        user: `${prompt.user}\n\nIMPORTANT: Return your response as valid JSON only, with no additional text or markdown formatting.`
      }

      const model = this.config.model || 'gpt-5-nano'
      const isGPT5 = model.startsWith('gpt-5')
      
      const response = await this.client.chat.completions.create({
        model,
        messages: this.buildMessages(jsonPrompt),
        // GPT-5 models only support temperature=1
        temperature: isGPT5 ? 1 : (prompt.temperature ?? this.config.temperature ?? 0.7),
        max_completion_tokens: prompt.maxTokens ?? this.config.maxTokens ?? 4000,
        response_format: { type: 'json_object' }
      })

      const content = response.choices[0]?.message?.content || '{}'
      
      try {
        const parsed = JSON.parse(content)
        // Validate against schema
        return schema.parse(parsed)
      } catch (parseError) {
        console.error('[VercelAI] Failed to parse JSON response:', content)
        throw new Error('Invalid JSON response from LLM')
      }
    } catch (error: any) {
      console.error('[VercelAI] JSON generation error:', error)
      this.handleError(error)
    }
  }

  countTokens(text: string): number {
    // Rough approximation for GPT models
    return Math.ceil(text.length / 4)
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