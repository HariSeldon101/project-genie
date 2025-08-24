import { BaseProvider } from './base'
import { LLMPrompt, LLMConfig } from '../types'
import { z } from 'zod'
import OpenAI from 'openai'

/**
 * DeepSeek LLM Provider
 * Uses OpenAI-compatible API with DeepSeek's endpoint
 */
export class DeepSeekProvider extends BaseProvider {
  name = 'deepseek'
  private client: OpenAI

  constructor(config: LLMConfig) {
    super(config)
    
    // DeepSeek uses OpenAI-compatible API
    this.client = new OpenAI({
      apiKey: config.apiKey || process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com/v1',
      dangerouslyAllowBrowser: false,
      timeout: 60000, // 60 second timeout for complex documents
      maxRetries: 1   // Retry failed requests once
    })
  }

  async generateText(prompt: LLMPrompt): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.config.model || 'deepseek-chat',
        messages: this.buildMessages(prompt),
        temperature: prompt.temperature ?? this.config.temperature ?? 0.7,
        max_tokens: prompt.maxTokens ?? this.config.maxTokens ?? 4000,
      })

      return response.choices[0]?.message?.content || ''
    } catch (error) {
      console.error('[DeepSeek] Error:', error)
      this.handleError(error)
    }
  }

  async generateJSON<T>(prompt: LLMPrompt, schema: z.ZodSchema<T>): Promise<T> {
    try {
      console.log('[DeepSeek] Starting JSON mode generation')
      
      // Determine document type for specialized handling
      const isRiskRegister = schema._def?.shape?.risks !== undefined
      const isBacklog = schema._def?.shape?.stories !== undefined
      const isCharter = schema._def?.shape?.executiveSummary !== undefined
      
      // Use simplified schema for DeepSeek
      const simplifiedStructure = this.getSimplifiedSchema(schema)
      
      // DeepSeek JSON mode optimized prompt (MUST include "json" keyword)
      const jsonPrompt: LLMPrompt = {
        system: `You are a helpful assistant that generates structured JSON data. 
Always respond with valid JSON matching the exact structure provided.
Use placeholder tokens like [STAKEHOLDER_1], [PRODUCT_OWNER], [TECH_LEAD] for names.
Generate professional project management content appropriate for the context.`,
        user: `Please generate a JSON document for: ${prompt.user}

The JSON must match this exact structure:
${JSON.stringify(simplifiedStructure, null, 2)}

Generate complete, professional JSON content now.`,
        temperature: 0.1, // Ultra-low for consistency
        maxTokens: 6000 // Increased to prevent truncation
      }

      console.log('[DeepSeek] Using JSON mode with response_format...')
      const response = await this.client.chat.completions.create({
        model: this.config.model || 'deepseek-chat',
        messages: this.buildMessages(jsonPrompt),
        response_format: { type: 'json_object' }, // CRITICAL: Enable JSON mode
        temperature: jsonPrompt.temperature,
        max_tokens: jsonPrompt.maxTokens,
        stream: false // Ensure non-streaming for JSON mode
      })

      const content = response.choices[0]?.message?.content || ''
      console.log('[DeepSeek] Received response, length:', content.length)
      
      // Handle empty content (known DeepSeek issue)
      if (!content || content.trim() === '') {
        console.warn('[DeepSeek] Empty response received, using fallback')
        const fallbackStructure = this.createFallbackStructure(schema)
        return fallbackStructure as T
      }
      
      try {
        // With JSON mode, content should already be valid JSON
        const parsed = JSON.parse(content)
        console.log('[DeepSeek] Successfully parsed JSON from JSON mode')
        
        // Try to validate against schema
        try {
          const validated = schema.parse(parsed)
          console.log('[DeepSeek] Schema validation successful')
          return validated
        } catch (validationError: any) {
          // If validation fails, try to fix common issues
          console.warn('[DeepSeek] Initial validation failed, attempting fixes...')
          const fixed = this.fixDeepSeekResponse(parsed, schema)
          const validated = schema.parse(fixed)
          console.log('[DeepSeek] Fixed and validated successfully')
          return validated
        }
      } catch (parseError: any) {
        // Log detailed validation errors for debugging
        if (parseError.errors) {
          console.warn('[DeepSeek] Schema validation failed:', JSON.stringify(parseError.errors, null, 2))
        } else {
          console.warn('[DeepSeek] JSON parse failed:', parseError.message)
        }
        
        // Check if content is empty or truncated
        if (!content || content.trim().length < 10) {
          console.warn('[DeepSeek] Response is empty or too short, using fallback')
          const fallbackStructure = this.createFallbackStructure(schema)
          return fallbackStructure as T
        }
        
        console.warn('[DeepSeek] Raw content preview:', content.substring(0, 200) + '...')
        
        // Try extracting JSON if response contains extra text
        let jsonStr = this.extractJSON(content)
        if (jsonStr && jsonStr !== content) {
          try {
            const parsed = JSON.parse(jsonStr)
            console.log('[DeepSeek] Successfully extracted and parsed JSON')
            return schema.parse(parsed)
          } catch (extractError: any) {
            console.warn('[DeepSeek] Extract attempt failed:', extractError.message)
          }
        }
        
        // Try to fix common JSON issues
        try {
          // Attempt to fix incomplete JSON by adding closing brackets
          const fixedJson = this.attemptJsonRepair(content)
          if (fixedJson) {
            const parsed = JSON.parse(fixedJson)
            console.log('[DeepSeek] Successfully repaired and parsed JSON')
            return schema.parse(parsed)
          }
        } catch (repairError: any) {
          console.warn('[DeepSeek] JSON repair failed:', repairError.message)
        }
        
        // Fallback: Use a minimal valid structure
        const fallbackStructure = this.createFallbackStructure(schema)
        console.warn('[DeepSeek] Using fallback structure for document type')
        return fallbackStructure as T // Return directly without validation for fallback
      }
    } catch (error: any) {
      console.error('[DeepSeek] API Error:', error.message)
      this.handleError(error)
    }
  }

  countTokens(text: string): number {
    // Rough approximation for DeepSeek (similar to GPT tokenization)
    // More accurate would be to use tiktoken library
    return Math.ceil(text.length / 4)
  }

  protected buildMessages(prompt: LLMPrompt): Array<{ role: string; content: string }> {
    const messages = [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user }
    ]
    
    // Add a reminder about using placeholders for DeepSeek
    if (prompt.system.includes('[STAKEHOLDER')) {
      messages[0].content += '\n\nREMINDER: Always use placeholder tokens like [STAKEHOLDER_1], [SENIOR_USER], etc. for people names. Never generate real names.'
    }
    
    return messages
  }
  
  private extractJSON(content: string): string {
    let jsonStr = content.trim()
    
    console.log('[DeepSeek] Raw response length:', jsonStr.length)
    
    // Aggressive cleaning for DeepSeek responses
    // Remove any narrative text before JSON
    const patterns = [
      /^[^{\[]*/,  // Remove everything before first { or [
      /Here is.*?:/gi,  // Remove "Here is the JSON:" type phrases
      /```json?\s*/gi,  // Remove markdown code blocks
      /```\s*$/gi,  // Remove closing backticks
    ]
    
    patterns.forEach(pattern => {
      jsonStr = jsonStr.replace(pattern, '')
    })
    
    // Find JSON boundaries
    const firstBrace = jsonStr.indexOf('{')
    const firstBracket = jsonStr.indexOf('[')
    const start = Math.min(
      firstBrace >= 0 ? firstBrace : Infinity,
      firstBracket >= 0 ? firstBracket : Infinity
    )
    
    if (start !== Infinity) {
      jsonStr = jsonStr.substring(start)
    }
    
    // Find matching closing character
    const isArray = jsonStr.startsWith('[')
    const closeChar = isArray ? ']' : '}'
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
    
    // Fix common DeepSeek JSON issues
    jsonStr = jsonStr
      .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
      .replace(/(["'])\s*:\s*undefined/g, '$1: null') // Replace undefined with null
      .replace(/NaN/g, '0') // Replace NaN with 0
      .replace(/\\n/g, '\n') // Fix escaped newlines
      .replace(/\t/g, ' ') // Replace tabs with spaces
    
    console.log('[DeepSeek] Cleaned JSON length:', jsonStr.length)
    return jsonStr
  }
  
  private fixDeepSeekResponse(response: any, schema: any): any {
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
    
    if (shape?.dependencies && response.dependencies) {
      response.dependencies = response.dependencies.map((d: any) => ({
        ...d,
        type: this.normalizeEnum(d.type, ['internal', 'external'])
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
    if (normalized === 'verylow') return 'very_low'
    if (normalized === 'veryhigh') return 'very_high'
    if (normalized === 'musthave') return 'must_have'
    if (normalized === 'shouldhave') return 'should_have'
    if (normalized === 'couldhave') return 'could_have'
    if (normalized === 'wonthave') return 'wont_have'
    
    return validValues[0] // Default to first valid value
  }
  
  private getSimplifiedSchema(schema: any): any {
    // Create simplified schema based on document type
    const shape = schema._def?.shape
    
    // Agile Charter schema
    if (shape?.executiveSummary && shape?.visionAndObjectives) {
      return {
        executiveSummary: "Executive summary text describing the project",
        visionAndObjectives: {
          vision: "Vision statement for the project",
          objectives: [{ id: "O1", description: "First objective", measurable: true, targetDate: "2025-Q2" }]
        },
        successCriteria: [{ criterion: "Success criterion", metric: "Measurement metric", target: "Target value", baseline: "Current baseline" }],
        scope: {
          inScope: ["Features included in scope"],
          outOfScope: ["Features not included"],
          assumptions: ["Project assumptions"],
          constraints: ["Project constraints"]
        },
        deliverables: [{ name: "Deliverable name", description: "Deliverable description", acceptanceCriteria: ["Acceptance criterion"], targetSprint: "Sprint 1" }],
        stakeholderAnalysis: [{ role: "[STAKEHOLDER_1]", interest: "high", influence: "high", communicationNeeds: "Weekly updates" }],
        teamStructure: {
          productOwner: "[PRODUCT_OWNER]",
          scrumMaster: "[SCRUM_MASTER]",
          developmentTeam: [{ role: "Developer", responsibilities: ["Development tasks"] }]
        },
        timeline: {
          startDate: "2025-01-01",
          endDate: "2025-06-30",
          sprints: 12,
          sprintDuration: 2,
          keyMilestones: [{ name: "Milestone name", date: "2025-03-01", deliverables: ["Deliverable"] }]
        },
        risks: [{ id: "R001", description: "Risk description", probability: "very_low | low | medium | high | very_high", impact: "very_low | low | medium | high | very_high", mitigation: "Mitigation strategy" }],
        dependencies: [{ type: "internal | external", description: "Dependency description", owner: "[OWNER]", dueDate: "2025-02-01" }],
        communicationPlan: {
          ceremonies: [{ name: "Meeting name", frequency: "Daily", duration: "15 minutes", participants: ["Team members"] }],
          reports: [{ name: "Report name", frequency: "Weekly", audience: ["Stakeholders"], format: "PDF" }]
        },
        definitionOfDone: ["Criterion 1", "Criterion 2", "Criterion 3"]
      }
    }
    
    if (shape?.risks && !shape?.executiveSummary) {
      // Risk Register - simplified
      return {
        risks: [
          {
            id: "R001",
            category: "technical",
            description: "brief risk description",
            probability: "low|medium|high",
            impact: "low|medium|high",
            mitigation: "mitigation strategy"
          }
        ]
      }
    }
    
    if (shape?.stories) {
      // Product Backlog - simplified
      return {
        stories: [
          {
            id: "US001",
            epic: "Epic 1",
            userStory: "As a user, I want...",
            acceptanceCriteria: ["Criteria 1"],
            storyPoints: 5,
            priority: "must_have"
          }
        ],
        epics: [
          {
            id: "E1",
            name: "Epic name",
            description: "Epic description",
            businessValue: "Value statement"
          }
        ]
      }
    }
    
    // Default simple structure
    return {
      title: "document title",
      summary: "brief summary",
      sections: [
        {
          name: "section name",
          content: "section content"
        }
      ],
      recommendations: ["recommendation 1"]
    }
  }
  
  private getExampleFromSchema(schema: any): any {
    return this.getSimplifiedSchema(schema)
  }
  
  private attemptJsonRepair(content: string): string | null {
    try {
      let json = content.trim()
      
      // Remove any text before the first { or [
      const firstBrace = json.indexOf('{')
      const firstBracket = json.indexOf('[')
      const start = Math.min(
        firstBrace >= 0 ? firstBrace : Infinity,
        firstBracket >= 0 ? firstBracket : Infinity
      )
      
      if (start === Infinity) return null
      json = json.substring(start)
      
      // Count opening and closing brackets
      let braceCount = 0
      let bracketCount = 0
      let inString = false
      let escapeNext = false
      
      for (let i = 0; i < json.length; i++) {
        const char = json[i]
        
        if (escapeNext) {
          escapeNext = false
          continue
        }
        
        if (char === '\\') {
          escapeNext = true
          continue
        }
        
        if (char === '"' && !escapeNext) {
          inString = !inString
          continue
        }
        
        if (!inString) {
          if (char === '{') braceCount++
          else if (char === '}') braceCount--
          else if (char === '[') bracketCount++
          else if (char === ']') bracketCount--
        }
      }
      
      // Add missing closing brackets
      while (braceCount > 0) {
        json += '}'
        braceCount--
      }
      
      while (bracketCount > 0) {
        json += ']'
        bracketCount--
      }
      
      // Validate it's parseable
      JSON.parse(json)
      return json
      
    } catch (e) {
      return null
    }
  }
  
  private createFallbackStructure(schema: any): any {
    // Create a minimal valid structure as fallback
    const shape = schema._def?.shape
    
    // Check if this is an Agile Charter
    if (shape?.executiveSummary && shape?.visionAndObjectives) {
      return {
        executiveSummary: "This project aims to deliver innovative solutions using Agile methodology to meet business objectives and stakeholder needs.",
        visionAndObjectives: {
          vision: "To deliver high-quality solutions through iterative development and continuous improvement",
          objectives: [
            { id: "O1", description: "Deliver MVP within timeline", measurable: true, targetDate: "2025-Q2" },
            { id: "O2", description: "Achieve user satisfaction score", measurable: true, targetDate: "2025-Q3" }
          ]
        },
        successCriteria: [
          { criterion: "Project delivered on time", metric: "Schedule adherence", target: "95%", baseline: "Current" },
          { criterion: "Quality standards met", metric: "Defect rate", target: "<5%", baseline: "Industry average" }
        ],
        scope: {
          inScope: ["Core functionality", "User interface", "Integration points"],
          outOfScope: ["Legacy system migration", "Third-party customizations"],
          assumptions: ["Resources available", "Stakeholder engagement"],
          constraints: ["Budget limitations", "Timeline restrictions"]
        },
        deliverables: [
          { 
            name: "MVP Release", 
            description: "Minimum viable product with core features", 
            acceptanceCriteria: ["All core features functional", "User testing complete"],
            targetSprint: "Sprint 6"
          }
        ],
        stakeholderAnalysis: [
          { role: "[PRODUCT_OWNER]", interest: "high", influence: "high", communicationNeeds: "Daily updates" },
          { role: "[STAKEHOLDER_1]", interest: "high", influence: "medium", communicationNeeds: "Weekly reports" }
        ],
        teamStructure: {
          productOwner: "[PRODUCT_OWNER]",
          scrumMaster: "[SCRUM_MASTER]",
          developmentTeam: [
            { role: "Senior Developer", responsibilities: ["Architecture", "Code review"] },
            { role: "Developer", responsibilities: ["Implementation", "Testing"] }
          ]
        },
        timeline: {
          startDate: "2025-01-01",
          endDate: "2025-06-30",
          sprints: 12,
          sprintDuration: 2,
          keyMilestones: [
            { name: "MVP Launch", date: "2025-03-15", deliverables: ["MVP Release"] },
            { name: "Final Release", date: "2025-06-30", deliverables: ["Complete Product"] }
          ]
        },
        risks: [
          { id: "R1", description: "Technical complexity", probability: "medium", impact: "high", mitigation: "Phased approach" },
          { id: "R2", description: "Resource availability", probability: "low", impact: "medium", mitigation: "Cross-training" }
        ],
        dependencies: [
          { type: "internal", description: "API development", owner: "[TECH_LEAD]", dueDate: "2025-02-01" },
          { type: "external", description: "Third-party integration", owner: "[VENDOR]", dueDate: "2025-03-01" }
        ],
        communicationPlan: {
          ceremonies: [
            { name: "Daily Standup", frequency: "Daily", duration: "15 minutes", participants: ["Development Team"] },
            { name: "Sprint Review", frequency: "Bi-weekly", duration: "1 hour", participants: ["All Stakeholders"] }
          ],
          reports: [
            { name: "Sprint Report", frequency: "Bi-weekly", audience: ["Stakeholders"], format: "PDF" },
            { name: "Progress Dashboard", frequency: "Real-time", audience: ["All"], format: "Online" }
          ]
        },
        definitionOfDone: [
          "Code reviewed and approved",
          "Unit tests written and passing",
          "Integration tests complete",
          "Documentation updated",
          "Deployed to staging environment"
        ]
      }
    }
    
    // Check if this is specifically a risk register (standalone)
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
            responseActions: ['Implement phased approach', 'Conduct thorough testing'],
            owner: '[STAKEHOLDER_1]',
            status: 'active'
          },
          {
            id: 'R002',
            category: 'operational',
            description: 'Resource availability constraints',
            probability: 'low',
            impact: 'medium',
            score: 3,
            proximity: 'within_project',
            response: 'accept',
            responseActions: ['Cross-training team members', 'Resource planning'],
            owner: '[STAKEHOLDER_2]',
            status: 'active'
          }
        ]
      }
    }
    
    // Check if this is a product backlog
    if (shape?.stories) {
      return {
        stories: [
          {
            id: 'US-001',
            epic: 'E1',
            userStory: 'As a user, I want to access the system so that I can use the features',
            acceptanceCriteria: ['Login functionality works', 'User can access dashboard'],
            storyPoints: 5,
            priority: 'must_have',
            dependencies: [],
            notes: 'Core functionality'
          },
          {
            id: 'US-002',
            epic: 'E1',
            userStory: 'As a user, I want to manage my profile so that I can update my information',
            acceptanceCriteria: ['Profile page accessible', 'Information can be updated'],
            storyPoints: 3,
            priority: 'should_have'
          }
        ],
        epics: [
          {
            id: 'E1',
            name: 'Core Platform',
            description: 'Essential platform features',
            businessValue: 'Enables basic system functionality'
          }
        ]
      }
    }
    
    // Default structure for other document types
    const baseStructure: any = {
      projectBackground: "Project implementation following industry best practices and methodologies",
      projectDefinition: {
        objectives: [
          "Deliver project on time and within budget",
          "Meet all specified requirements",
          "Achieve quality standards"
        ],
        scope: "All defined project deliverables as per project charter",
        deliverables: [
          "Project documentation",
          "Implementation deliverables",
          "Training materials"
        ],
        exclusions: ["Out of scope items to be addressed in future phases"]
      },
      businessCase: {
        reasons: "Strategic alignment with organizational goals and objectives",
        benefits: [
          "Improved operational efficiency",
          "Cost reduction opportunities",
          "Enhanced capabilities"
        ],
        risks: [
          "Timeline delays",
          "Resource constraints",
          "Technical challenges"
        ],
        costBenefit: "Positive ROI expected within 12 months"
      }
    }
    
    return baseStructure
  }
}