import OpenAI from 'openai'
import { BaseProvider } from './base'
import { LLMPrompt, LLMConfig } from '../types'
import { z } from 'zod'

/**
 * Groq LLM Provider
 * Uses OpenAI-compatible API with Groq's endpoint
 * Fast inference with their LPU (Language Processing Unit) architecture
 */
export class GroqProvider extends BaseProvider {
  name = 'groq'
  private client: OpenAI

  constructor(config: LLMConfig) {
    super(config)
    
    const apiKey = config.apiKey || process.env.GROQ_API_KEY
    
    if (!apiKey) {
      throw new Error('Groq API key is required. Set GROQ_API_KEY environment variable.')
    }

    // Groq uses OpenAI-compatible API
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://api.groq.com/openai/v1',
      dangerouslyAllowBrowser: false,
      timeout: 30000, // 30 second timeout
      maxRetries: 2   // Retry failed requests twice
    })
  }

  async generateText(prompt: LLMPrompt): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.config.model || 'llama3-groq-70b-8192-tool-use-preview', // Default to Llama 3 model
        messages: this.buildMessages(prompt),
        temperature: prompt.temperature ?? this.config.temperature ?? 0.7,
        max_tokens: prompt.maxTokens ?? this.config.maxTokens ?? 4000,
      })

      return response.choices[0]?.message?.content || ''
    } catch (error: any) {
      console.error('[Groq] Error:', error.message)
      
      // Check for specific Groq error codes
      if (error?.status === 503 || error?.code === 'model_not_available') {
        console.warn('[Groq] Model temporarily unavailable, retrying with fallback model...')
        // Try with the free GPT-OSS model as fallback
        try {
          const fallbackResponse = await this.client.chat.completions.create({
            model: 'llama-3.3-70b-versatile', // Free model fallback
            messages: this.buildMessages(prompt),
            temperature: prompt.temperature ?? 0.7,
            max_tokens: prompt.maxTokens ?? 4000,
          })
          return fallbackResponse.choices[0]?.message?.content || ''
        } catch (fallbackError) {
          console.error('[Groq] Fallback also failed:', fallbackError)
          this.handleError(fallbackError)
        }
      }
      
      this.handleError(error)
    }
  }

  async generateJSON<T>(prompt: LLMPrompt, schema: z.ZodSchema<T>): Promise<T> {
    try {
      console.log('[Groq] Starting JSON generation')
      
      // Create a simplified example from the schema
      const exampleStructure = this.getExampleFromSchema(schema)
      
      // Groq-optimized prompt for JSON generation
      const jsonPrompt: LLMPrompt = {
        system: `You are a helpful assistant that generates structured JSON data for project management.
Always respond with valid JSON matching the exact structure provided.
Use placeholder tokens like [STAKEHOLDER_1], [PRODUCT_OWNER], [TECH_LEAD] for names.
Never use real names or email addresses.`,
        user: `${prompt.user}

IMPORTANT: Generate a JSON response that EXACTLY matches this structure:
${JSON.stringify(exampleStructure, null, 2)}

Respond with ONLY the JSON, no additional text or markdown.`,
        temperature: 0.2, // Lower temperature for more consistent JSON
        maxTokens: prompt.maxTokens || 6000
      }

      console.log('[Groq] Using model:', this.config.model || 'llama3-groq-70b-8192-tool-use-preview')
      
      // Groq supports JSON mode for compatible models
      const response = await this.client.chat.completions.create({
        model: this.config.model || 'llama3-groq-70b-8192-tool-use-preview',
        messages: this.buildMessages(jsonPrompt),
        temperature: jsonPrompt.temperature,
        max_tokens: jsonPrompt.maxTokens,
        response_format: { type: 'json_object' }, // Enable JSON mode if supported
        stream: false
      })

      const content = response.choices[0]?.message?.content || ''
      console.log('[Groq] Received response, length:', content.length)
      
      if (!content || content.trim() === '') {
        console.warn('[Groq] Empty response received, using fallback')
        return this.createFallbackStructure(schema) as T
      }
      
      try {
        // Parse the JSON response
        const parsed = JSON.parse(content)
        console.log('[Groq] Successfully parsed JSON')
        
        // Try to validate against schema
        try {
          const validated = schema.parse(parsed)
          console.log('[Groq] Schema validation successful')
          return validated
        } catch (validationError: any) {
          console.warn('[Groq] Schema validation failed, attempting fixes...')
          // Try to fix common issues
          const fixed = this.fixGroqResponse(parsed, schema)
          const validated = schema.parse(fixed)
          console.log('[Groq] Fixed and validated successfully')
          return validated
        }
      } catch (parseError: any) {
        console.warn('[Groq] JSON parse failed:', parseError.message)
        console.warn('[Groq] Raw content preview:', content.substring(0, 200) + '...')
        
        // Try extracting JSON from the response
        const extractedJson = this.extractJSON(content)
        if (extractedJson) {
          try {
            const parsed = JSON.parse(extractedJson)
            console.log('[Groq] Successfully extracted and parsed JSON')
            return schema.parse(parsed)
          } catch (extractError) {
            console.warn('[Groq] Extract attempt failed:', extractError)
          }
        }
        
        // Fallback to a valid structure
        console.warn('[Groq] Using fallback structure')
        return this.createFallbackStructure(schema) as T
      }
    } catch (error: any) {
      console.error('[Groq] API Error:', error.message)
      
      // If Groq fails with model issues, try fallback
      if (error?.status === 503 || error?.code === 'model_not_available') {
        console.warn('[Groq] Model unavailable, using fallback structure')
        return this.createFallbackStructure(schema) as T
      }
      
      this.handleError(error)
    }
  }

  countTokens(text: string): number {
    // Rough approximation for Groq/Llama models
    // Llama tokenization is similar to GPT
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
  
  private extractJSON(content: string): string | null {
    let jsonStr = content.trim()
    
    // Remove markdown code blocks if present
    jsonStr = jsonStr.replace(/```json?\s*/gi, '').replace(/```\s*$/gi, '')
    
    // Find JSON boundaries
    const firstBrace = jsonStr.indexOf('{')
    const firstBracket = jsonStr.indexOf('[')
    const start = Math.min(
      firstBrace >= 0 ? firstBrace : Infinity,
      firstBracket >= 0 ? firstBracket : Infinity
    )
    
    if (start === Infinity) return null
    
    jsonStr = jsonStr.substring(start)
    
    // Find matching closing character
    const isArray = jsonStr.startsWith('[')
    let depth = 0
    let lastValidIndex = -1
    
    for (let i = 0; i < jsonStr.length; i++) {
      if (jsonStr[i] === '{' || jsonStr[i] === '[') depth++
      else if (jsonStr[i] === '}' || jsonStr[i] === ']') {
        depth--
        if (depth === 0) {
          lastValidIndex = i
          break
        }
      }
    }
    
    if (lastValidIndex > -1) {
      jsonStr = jsonStr.substring(0, lastValidIndex + 1)
    }
    
    // Fix common JSON issues
    jsonStr = jsonStr
      .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
      .replace(/(["'])\s*:\s*undefined/g, '$1: null') // Replace undefined with null
      
    return jsonStr
  }
  
  private fixGroqResponse(response: any, schema: any): any {
    const shape = schema._def?.shape
    
    // Fix enum values that don't match
    if (shape?.stakeholderAnalysis && response.stakeholderAnalysis) {
      response.stakeholderAnalysis = response.stakeholderAnalysis.map((s: any) => ({
        ...s,
        interest: this.normalizeEnum(s.interest, ['high', 'medium', 'low']),
        influence: this.normalizeEnum(s.influence, ['high', 'medium', 'low'])
      }))
    }
    
    if (shape?.risks && response.risks) {
      response.risks = response.risks.map((r: any) => ({
        ...r,
        probability: this.normalizeEnum(r.probability, ['very_low', 'low', 'medium', 'high', 'very_high']),
        impact: this.normalizeEnum(r.impact, ['very_low', 'low', 'medium', 'high', 'very_high'])
      }))
    }
    
    if (shape?.stories && response.stories) {
      response.stories = response.stories.map((s: any) => ({
        ...s,
        priority: this.normalizeEnum(s.priority, ['must_have', 'should_have', 'could_have', 'wont_have'])
      }))
    }
    
    return response
  }
  
  private normalizeEnum(value: string, validValues: string[]): string {
    if (!value) return validValues[0]
    
    const normalized = value.toLowerCase().replace(/[\s-_]/g, '')
    for (const valid of validValues) {
      if (valid.toLowerCase().replace(/[\s-_]/g, '') === normalized) {
        return valid
      }
    }
    
    // Map common variations
    const mappings: Record<string, string> = {
      'verylow': 'very_low',
      'veryhigh': 'very_high',
      'musthave': 'must_have',
      'shouldhave': 'should_have',
      'couldhave': 'could_have',
      'wonthave': 'wont_have'
    }
    
    return mappings[normalized] || validValues[0]
  }
  
  private getExampleFromSchema(schema: any): any {
    const shape = schema._def?.shape
    
    // Return simplified examples based on document type
    if (shape?.executiveSummary) {
      return {
        executiveSummary: "Brief project summary",
        visionAndObjectives: {
          vision: "Project vision statement",
          objectives: [{ id: "O1", description: "Objective", measurable: true }]
        },
        successCriteria: [{ criterion: "Success metric", metric: "Measurement", target: "Target" }],
        scope: {
          inScope: ["Features included"],
          outOfScope: ["Features excluded"],
          assumptions: ["Project assumptions"],
          constraints: ["Project constraints"]
        }
      }
    }
    
    if (shape?.risks) {
      return {
        risks: [{
          id: "R001",
          category: "technical",
          description: "Risk description",
          probability: "medium",
          impact: "high",
          mitigation: "Mitigation strategy"
        }]
      }
    }
    
    if (shape?.stories) {
      return {
        stories: [{
          id: "US001",
          epic: "E1",
          userStory: "As a user, I want...",
          acceptanceCriteria: ["Criteria"],
          storyPoints: 5,
          priority: "must_have"
        }],
        epics: [{
          id: "E1",
          name: "Epic name",
          description: "Epic description"
        }]
      }
    }
    
    // Default structure
    return {
      title: "Document title",
      content: "Document content",
      sections: []
    }
  }
  
  private createFallbackStructure(schema: any): any {
    // Use the same fallback logic as DeepSeek for consistency
    const shape = schema._def?.shape
    
    // Agile Charter
    if (shape?.executiveSummary && shape?.visionAndObjectives) {
      return {
        executiveSummary: "This project aims to deliver innovative solutions using Agile methodology.",
        visionAndObjectives: {
          vision: "To deliver high-quality solutions through iterative development",
          objectives: [
            { id: "O1", description: "Deliver MVP within timeline", measurable: true, targetDate: "2025-Q2" }
          ]
        },
        successCriteria: [
          { criterion: "On-time delivery", metric: "Schedule adherence", target: "95%", baseline: "Current" }
        ],
        scope: {
          inScope: ["Core functionality", "User interface"],
          outOfScope: ["Legacy migration"],
          assumptions: ["Resources available"],
          constraints: ["Budget limitations"]
        },
        deliverables: [
          { 
            name: "MVP Release", 
            description: "Minimum viable product", 
            acceptanceCriteria: ["All features functional"],
            targetSprint: "Sprint 6"
          }
        ],
        stakeholderAnalysis: [
          { role: "[PRODUCT_OWNER]", interest: "high", influence: "high", communicationNeeds: "Daily" }
        ],
        teamStructure: {
          productOwner: "[PRODUCT_OWNER]",
          scrumMaster: "[SCRUM_MASTER]",
          developmentTeam: [
            { role: "Developer", responsibilities: ["Development"] }
          ]
        },
        timeline: {
          startDate: "2025-01-01",
          endDate: "2025-06-30",
          sprints: 12,
          sprintDuration: 2,
          keyMilestones: [
            { name: "MVP Launch", date: "2025-03-15", deliverables: ["MVP"] }
          ]
        },
        risks: [
          { id: "R1", description: "Technical complexity", probability: "medium", impact: "high", mitigation: "Phased approach" }
        ],
        dependencies: [
          { type: "internal", description: "API development", owner: "[TECH_LEAD]", dueDate: "2025-02-01" }
        ],
        communicationPlan: {
          ceremonies: [
            { name: "Daily Standup", frequency: "Daily", duration: "15 minutes", participants: ["Team"] }
          ],
          reports: [
            { name: "Sprint Report", frequency: "Bi-weekly", audience: ["Stakeholders"], format: "PDF" }
          ]
        },
        definitionOfDone: ["Code reviewed", "Tests passing", "Documentation updated"]
      }
    }
    
    // Risk Register
    if (shape?.risks && !shape?.executiveSummary) {
      return {
        risks: [
          {
            id: 'R001',
            category: 'technical',
            description: 'Technical implementation challenges',
            probability: 'medium',
            impact: 'high',
            score: 6,
            proximity: 'within_stage',
            response: 'reduce',
            responseActions: ['Phased approach'],
            owner: '[STAKEHOLDER_1]',
            status: 'active'
          }
        ]
      }
    }
    
    // Product Backlog
    if (shape?.stories) {
      return {
        stories: [
          {
            id: 'US-001',
            epic: 'E1',
            userStory: 'As a user, I want to access the system',
            acceptanceCriteria: ['Login works'],
            storyPoints: 5,
            priority: 'must_have'
          }
        ],
        epics: [
          {
            id: 'E1',
            name: 'Core Platform',
            description: 'Essential features',
            businessValue: 'Core functionality'
          }
        ]
      }
    }
    
    // Default
    return {
      projectBackground: "Project implementation",
      projectDefinition: {
        objectives: ["Deliver on time"],
        scope: "Project deliverables",
        deliverables: ["Documentation"]
      }
    }
  }
}