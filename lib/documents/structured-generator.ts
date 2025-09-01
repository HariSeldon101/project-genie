/**
 * Structured Document Generator using OpenAI's Structured Outputs feature
 * Uses zodResponseFormat for guaranteed schema adherence
 */

import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { z } from 'zod'
import { PIDSchema, PID_SCHEMA_NAME, type PIDDocument } from './schemas/pid-schema'
import { BusinessCaseSchema, BUSINESS_CASE_SCHEMA_NAME, type BusinessCaseDocument } from './schemas/business-case-schema'
import { SanitizedProjectData, GeneratedDocument, DocumentMetadata } from '../llm/types'
import { documentLogger } from '../utils/document-logger'

export class StructuredDocumentGenerator {
  private client: OpenAI
  private model: string
  private isGPT5: boolean
  
  constructor(apiKey?: string, model: string = 'gpt-4o-2024-08-06') {
    // Try to get API key from various sources
    const key = apiKey || 
                process.env.OPENAI_API_KEY || 
                process.env.NEXT_PUBLIC_OPENAI_API_KEY
    
    if (!key) {
      throw new Error('OpenAI API key not found. Please set OPENAI_API_KEY environment variable.')
    }
    
    this.client = new OpenAI({ apiKey: key })
    this.model = model
    this.isGPT5 = model.startsWith('gpt-5')
    
    documentLogger.info('INIT', 'StructuredDocumentGenerator initialized', { 
      model,
      isGPT5: this.isGPT5,
      apiMethod: this.isGPT5 ? 'responses.create' : 'chat.completions.parse'
    })
  }

  /**
   * Generate PID using Structured Outputs with proper zodResponseFormat
   */
  async generatePID(
    data: SanitizedProjectData,
    projectId: string,
    researchContext?: any
  ): Promise<GeneratedDocument> {
    const startTime = Date.now()
    documentLogger.logGenerationAttempt(projectId, 'PID', 'OpenAI', this.model)
    
    try {
      // Build comprehensive prompt
      const systemPrompt = this.buildPIDSystemPrompt(researchContext)
      const userPrompt = this.buildPIDUserPrompt(data)
      
      documentLogger.logLLMRequest('OpenAI', this.model, systemPrompt.length + userPrompt.length, 0.5)
      
      // Log the prompts for debugging
      documentLogger.debug('PROMPT', 'PID System Prompt', { 
        length: systemPrompt.length,
        preview: systemPrompt.substring(0, 500) 
      })
      documentLogger.debug('PROMPT', 'PID User Prompt', { 
        length: userPrompt.length,
        preview: userPrompt.substring(0, 500) 
      })
      
      let parsed: any
      let response: any
      
      if (this.isGPT5) {
        // GPT-5 models must use responses.create API
        documentLogger.info('API', 'Using responses.create for GPT-5 model', { model: this.model })
        
        const fullPrompt = `${systemPrompt}\n\n${userPrompt}\n\nIMPORTANT: Return ONLY valid JSON matching the exact schema. No markdown, no explanation, just the JSON object.`
        
        const gpt5Response = await (this.client as any).responses.create({
          model: this.model,
          input: fullPrompt,
          text: { verbosity: 'high' },
          reasoning: { effort: 'minimal' },
          max_output_tokens: 4000
        })
        
        if (!gpt5Response.output_text) {
          throw new Error('GPT-5 returned empty response')
        }
        
        // Parse the JSON from the text response
        try {
          // Remove any markdown code blocks if present
          let jsonText = gpt5Response.output_text
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim()
          
          // Try to extract JSON if it's embedded in text
          const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            jsonText = jsonMatch[0]
          }
          
          // Attempt to fix common JSON issues
          // Fix unterminated strings by ensuring all quotes are closed
          let openQuotes = 0
          let inString = false
          let escaped = false
          let lastValidPos = jsonText.length
          
          for (let i = 0; i < jsonText.length; i++) {
            const char = jsonText[i]
            if (escaped) {
              escaped = false
              continue
            }
            if (char === '\\') {
              escaped = true
              continue
            }
            if (char === '"') {
              if (inString) {
                openQuotes--
                inString = false
              } else {
                openQuotes++
                inString = true
              }
            }
          }
          
          // If we have unclosed quotes, try to close them
          if (openQuotes > 0) {
            documentLogger.warn('JSON_FIX', `Found ${openQuotes} unclosed quotes, attempting to fix`)
            // Find the last valid JSON position
            try {
              // Try parsing progressively smaller chunks
              for (let i = jsonText.length - 1; i > jsonText.length - 1000 && i > 0; i--) {
                try {
                  JSON.parse(jsonText.substring(0, i) + '"}')
                  jsonText = jsonText.substring(0, i) + '"}'
                  documentLogger.info('JSON_FIX', `Truncated JSON at position ${i} to fix parsing`)
                  break
                } catch {
                  // Continue trying
                }
              }
            } catch {
              // If all else fails, try to close the JSON structure
              jsonText = jsonText + '"]}'.repeat(Math.min(openQuotes, 3))
            }
          }
          
          parsed = JSON.parse(jsonText)
          documentLogger.debug('PARSED', 'Successfully parsed GPT-5 JSON response', { 
            keys: Object.keys(parsed || {}),
            originalLength: gpt5Response.output_text.length,
            parsedLength: jsonText.length
          })
        } catch (parseError) {
          documentLogger.error('PARSE_ERROR', 'Failed to parse GPT-5 response as JSON', {
            error: parseError,
            responsePreview: gpt5Response.output_text.substring(0, 500),
            responseEnd: gpt5Response.output_text.substring(gpt5Response.output_text.length - 500)
          })
          throw new Error(`Failed to parse GPT-5 response as JSON: ${parseError}`)
        }
        
        // Mock the response structure for compatibility
        response = {
          usage: gpt5Response.usage || {
            prompt_tokens: 1000,
            completion_tokens: 2000,
            total_tokens: 3000
          }
        }
        
      } else {
        // GPT-4 models can use chat.completions.parse with zodResponseFormat
        documentLogger.info('API', 'Using chat.completions.parse for GPT-4 model', { model: this.model })
        
        response = await this.client.chat.completions.parse({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: zodResponseFormat(PIDSchema, PID_SCHEMA_NAME),
          temperature: 0.5,
          max_tokens: 4000
        })
        
        // Check for refusal
        if (response.choices[0]?.message?.refusal) {
          throw new Error(`Model refused to generate PID: ${response.choices[0].message.refusal}`)
        }
        
        // Get parsed response
        parsed = response.choices[0]?.message?.parsed
        if (!parsed) {
          throw new Error('No parsed content in response')
        }
      }
      
      const duration = Date.now() - startTime
      
      // Log token usage if available
      if (response.usage) {
        documentLogger.logLLMResponse(
          'OpenAI', 
          this.model,
          JSON.stringify(parsed).length,
          duration,
          {
            input: response.usage.prompt_tokens,
            output: response.usage.completion_tokens,
            total: response.usage.total_tokens
          }
        )
      }
      
      documentLogger.logGenerationSuccess(projectId, 'PID', duration, JSON.stringify(parsed).length)
      
      // Return as GeneratedDocument with metadata
      const metadata: DocumentMetadata = {
        projectId,
        type: 'pid',
        methodology: 'prince2',
        version: 1,
        generatedAt: new Date(),
        provider: 'openai',
        model: this.model,
        usage: response.usage ? {
          inputTokens: response.usage.prompt_tokens,
          outputTokens: response.usage.completion_tokens,
          reasoningTokens: 0,
          totalTokens: response.usage.total_tokens,
          costUsd: this.calculateCost(response.usage)
        } : undefined
      }
      
      return {
        content: parsed as PIDDocument,
        metadata,
        formatted: ''
      }
      
    } catch (error: any) {
      const duration = Date.now() - startTime
      documentLogger.logGenerationFailure(projectId, 'PID', error, 1, 1)
      documentLogger.error('PID_GENERATION', 'Failed to generate PID', error, {
        projectId,
        duration,
        model: this.model
      })
      
      // Return a minimal valid PID structure as fallback
      documentLogger.logFallbackUsed('PID', error.message)
      const fallbackContent = this.getDefaultPID(data)
      
      const metadata: DocumentMetadata = {
        projectId,
        type: 'pid',
        methodology: 'prince2',
        version: 1,
        generatedAt: new Date(),
        provider: 'openai',
        model: this.model,
        error: true
      }
      
      return {
        content: fallbackContent,
        metadata,
        formatted: ''
      }
    }
  }
  
  /**
   * Calculate cost for OpenAI usage
   */
  private calculateCost(usage: any): number {
    if (this.isGPT5) {
      // GPT-5 pricing varies by model
      let inputPrice = 0.25  // GPT-5-mini default
      let outputPrice = 2.00  // GPT-5-mini default
      
      if (this.model === 'gpt-5-nano') {
        inputPrice = 0.05
        outputPrice = 0.40
      } else if (this.model === 'gpt-5') {
        inputPrice = 1.00
        outputPrice = 3.00
      }
      
      const inputCost = (usage.prompt_tokens / 1000000) * inputPrice
      const outputCost = (usage.completion_tokens / 1000000) * outputPrice
      return inputCost + outputCost
    } else {
      // GPT-4o pricing: $2.50 per 1M input tokens, $10 per 1M output tokens
      const inputCost = (usage.prompt_tokens / 1000000) * 2.50
      const outputCost = (usage.completion_tokens / 1000000) * 10.00
      return inputCost + outputCost
    }
  }

  /**
   * Generate Business Case using Structured Outputs with proper zodResponseFormat
   */
  async generateBusinessCase(
    data: SanitizedProjectData,
    projectId: string,
    researchContext?: any
  ): Promise<GeneratedDocument> {
    const startTime = Date.now()
    documentLogger.logGenerationAttempt(projectId, 'Business Case', 'OpenAI', this.model)
    
    try {
      // Build comprehensive prompt
      const systemPrompt = this.buildBusinessCaseSystemPrompt(researchContext)
      const userPrompt = this.buildBusinessCaseUserPrompt(data)
      
      documentLogger.logLLMRequest('OpenAI', this.model, systemPrompt.length + userPrompt.length, 0.5)
      
      // Log the prompts for debugging
      documentLogger.debug('PROMPT', 'Business Case System Prompt', { 
        length: systemPrompt.length,
        preview: systemPrompt.substring(0, 500) 
      })
      documentLogger.debug('PROMPT', 'Business Case User Prompt', { 
        length: userPrompt.length,
        preview: userPrompt.substring(0, 500) 
      })
      
      let parsed: any
      let response: any
      
      if (this.isGPT5) {
        // GPT-5 models must use responses.create API
        documentLogger.info('API', 'Using responses.create for GPT-5 model', { model: this.model })
        
        const fullPrompt = `${systemPrompt}\n\n${userPrompt}\n\nIMPORTANT: Return ONLY valid JSON matching the exact schema. No markdown, no explanation, just the JSON object.`
        
        const gpt5Response = await (this.client as any).responses.create({
          model: this.model,
          input: fullPrompt,
          text: { verbosity: 'high' },
          reasoning: { effort: 'minimal' },
          max_output_tokens: 4000
        })
        
        if (!gpt5Response.output_text) {
          throw new Error('GPT-5 returned empty response')
        }
        
        // Parse the JSON from the text response
        try {
          // Remove any markdown code blocks if present
          let jsonText = gpt5Response.output_text
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim()
          
          // Try to extract JSON if it's embedded in text
          const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            jsonText = jsonMatch[0]
          }
          
          // Attempt to fix common JSON issues
          // Fix unterminated strings by ensuring all quotes are closed
          let openQuotes = 0
          let inString = false
          let escaped = false
          let lastValidPos = jsonText.length
          
          for (let i = 0; i < jsonText.length; i++) {
            const char = jsonText[i]
            if (escaped) {
              escaped = false
              continue
            }
            if (char === '\\') {
              escaped = true
              continue
            }
            if (char === '"') {
              if (inString) {
                openQuotes--
                inString = false
              } else {
                openQuotes++
                inString = true
              }
            }
          }
          
          // If we have unclosed quotes, try to close them
          if (openQuotes > 0) {
            documentLogger.warn('JSON_FIX', `Found ${openQuotes} unclosed quotes, attempting to fix`)
            // Find the last valid JSON position
            try {
              // Try parsing progressively smaller chunks
              for (let i = jsonText.length - 1; i > jsonText.length - 1000 && i > 0; i--) {
                try {
                  JSON.parse(jsonText.substring(0, i) + '"}')
                  jsonText = jsonText.substring(0, i) + '"}'
                  documentLogger.info('JSON_FIX', `Truncated JSON at position ${i} to fix parsing`)
                  break
                } catch {
                  // Continue trying
                }
              }
            } catch {
              // If all else fails, try to close the JSON structure
              jsonText = jsonText + '"]}'.repeat(Math.min(openQuotes, 3))
            }
          }
          
          parsed = JSON.parse(jsonText)
          documentLogger.debug('PARSED', 'Successfully parsed GPT-5 JSON response', { 
            keys: Object.keys(parsed || {}),
            originalLength: gpt5Response.output_text.length,
            parsedLength: jsonText.length
          })
        } catch (parseError) {
          documentLogger.error('PARSE_ERROR', 'Failed to parse GPT-5 response as JSON', {
            error: parseError,
            responsePreview: gpt5Response.output_text.substring(0, 500),
            responseEnd: gpt5Response.output_text.substring(gpt5Response.output_text.length - 500)
          })
          throw new Error(`Failed to parse GPT-5 response as JSON: ${parseError}`)
        }
        
        // Mock the response structure for compatibility
        response = {
          usage: gpt5Response.usage || {
            prompt_tokens: 1000,
            completion_tokens: 2000,
            total_tokens: 3000
          }
        }
        
      } else {
        // GPT-4 models can use chat.completions.parse with zodResponseFormat
        documentLogger.info('API', 'Using chat.completions.parse for GPT-4 model', { model: this.model })
        
        response = await this.client.chat.completions.parse({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: zodResponseFormat(BusinessCaseSchema, BUSINESS_CASE_SCHEMA_NAME),
          temperature: 0.5,
          max_tokens: 4000
        })
        
        // Check for refusal
        if (response.choices[0]?.message?.refusal) {
          throw new Error(`Model refused to generate Business Case: ${response.choices[0].message.refusal}`)
        }
        
        // Get parsed response
        parsed = response.choices[0]?.message?.parsed
        if (!parsed) {
          throw new Error('No parsed content in response')
        }
      }
      
      const duration = Date.now() - startTime
      
      // Log token usage if available
      if (response.usage) {
        documentLogger.logLLMResponse(
          'OpenAI', 
          this.model,
          JSON.stringify(parsed).length,
          duration,
          {
            input: response.usage.prompt_tokens,
            output: response.usage.completion_tokens,
            total: response.usage.total_tokens
          }
        )
      }
      
      documentLogger.logGenerationSuccess(projectId, 'Business Case', duration, JSON.stringify(parsed).length)
      
      // Return as GeneratedDocument with metadata
      const metadata: DocumentMetadata = {
        projectId,
        type: 'business_case',
        methodology: 'prince2',
        version: 1,
        generatedAt: new Date(),
        provider: 'openai',
        model: this.model,
        usage: response.usage ? {
          inputTokens: response.usage.prompt_tokens,
          outputTokens: response.usage.completion_tokens,
          reasoningTokens: 0,
          totalTokens: response.usage.total_tokens,
          costUsd: this.calculateCost(response.usage)
        } : undefined
      }
      
      return {
        content: parsed as BusinessCaseDocument,
        metadata,
        formatted: ''
      }
      
    } catch (error: any) {
      const duration = Date.now() - startTime
      documentLogger.logGenerationFailure(projectId, 'Business Case', error, 1, 1)
      documentLogger.error('BUSINESS_CASE_GENERATION', 'Failed to generate Business Case', error, {
        projectId,
        duration,
        model: this.model
      })
      
      // Return a minimal valid Business Case structure as fallback
      documentLogger.logFallbackUsed('Business Case', error.message)
      const fallbackContent = this.getDefaultBusinessCase(data)
      
      const metadata: DocumentMetadata = {
        projectId,
        type: 'business_case',
        methodology: 'prince2',
        version: 1,
        generatedAt: new Date(),
        provider: 'openai',
        model: this.model,
        error: true
      }
      
      return {
        content: fallbackContent,
        metadata,
        formatted: ''
      }
    }
  }

  /**
   * Build system prompt for PID generation
   */
  private buildPIDSystemPrompt(researchContext?: any): string {
    let prompt = `You are an experienced PRINCE2 Project Manager creating a comprehensive Project Initiation Document (PID).

Your task is to generate a complete, professional PID that follows PRINCE2 best practices.

IMPORTANT INSTRUCTIONS:
1. Generate comprehensive, detailed content for EVERY field
2. Use proper PRINCE2 terminology and structure
3. Ensure all arrays have meaningful items (minimum 3-5 items each)
4. Make content specific and actionable, not generic
5. Include realistic dates, costs, and metrics
6. All cost fields should be formatted as strings with dollar signs (e.g., "$100,000")

CRITICAL DATE INSTRUCTIONS:
- NEVER use specific years like "2024", "2023", or any hardcoded year
- ALL dates MUST be derived from the provided project start and end dates
- Use relative date descriptions (e.g., "Month 3 of project", "End of Year 1")
- For milestones, calculate dates based on project duration
- Avoid mentioning specific calendar years in any context`

    if (researchContext?.industryInsights?.length > 0) {
      prompt += `\n\nINDUSTRY INSIGHTS TO CONSIDER:\n${researchContext.industryInsights.join('\n- ')}`
    }

    if (researchContext?.bestPractices?.length > 0) {
      prompt += `\n\nBEST PRACTICES TO APPLY:\n${researchContext.bestPractices.join('\n- ')}`
    }

    return prompt
  }

  /**
   * Build user prompt for PID generation
   */
  private buildPIDUserPrompt(data: SanitizedProjectData): string {
    return `Generate a complete PRINCE2 Project Initiation Document for the following project:

PROJECT DETAILS:
- Name: ${data.projectName}
- Vision: ${data.vision}
- Description: ${data.description}
- Sector: ${data.sector}
- Business Case: ${data.businessCase}
- Budget: ${data.budget || 'Not specified'}
- Timeline: ${data.timeline || '6-12 months'}
- Start Date: ${data.startDate || 'TBD'}
- End Date: ${data.endDate || 'TBD'}

DATE CONTEXT: The project runs from ${data.startDate} to ${data.endDate}. Base ALL dates on this timeline.

REQUIREMENTS:
1. Project Definition: Include comprehensive background, SMART objectives (5+), outcomes, scope (included/excluded), constraints, assumptions, deliverables with quality criteria, and interfaces
2. Business Case: Provide reasons, options, benefits, disbenefits, timeline, costs (development/operational/total as formatted strings), investment appraisal, and major risks
3. Organization Structure: Define all roles in the project board, project manager, team managers, assurance roles, and support structure
4. Quality Management: Include standards, criteria, methods, and responsibilities
5. Configuration Management: Define purpose, procedures, change control, and tools
6. Risk Management: Comprehensive approach with procedures, tolerances (all 6 types), register format, roles, categories, tools, reporting, and timing
7. Communication Management: Detail procedures, tools, reporting, roles, methods, frequency, and stakeholder analysis (minimum 5 stakeholders)
8. Project Plan: Include stages with dates and objectives, milestones with criteria, dependencies with impacts, and schedule summary
9. Project Controls: Define management stages, all tolerances, and reporting arrangements
10. Tailoring: Justify any PRINCE2 tailoring with specific aspects and justifications

Generate comprehensive, professional content for all sections.`
  }

  /**
   * Build system prompt for Business Case generation
   */
  private buildBusinessCaseSystemPrompt(researchContext?: any): string {
    let prompt = `You are a senior PRINCE2 Business Analyst creating a comprehensive Business Case document.

Your task is to generate a complete, professional Business Case that justifies the project investment.

IMPORTANT INSTRUCTIONS:
1. Generate detailed, comprehensive content for EVERY field
2. Use proper financial and business terminology
3. Ensure all arrays have substantial items (minimum 3-5 items each)
4. Include specific metrics, measurements, and targets
5. All cost fields must be formatted as strings with dollar signs (e.g., "$250,000")
6. Provide realistic ROI, payback periods, and NPV values
7. Include at least 3 business options with detailed analysis
8. Define measurable benefits with baselines and targets

CRITICAL DATE INSTRUCTIONS:
- NEVER use specific years like "2024", "2023", or any hardcoded year
- ALL dates and timelines MUST be based on the provided project start and end dates
- When mentioning regulatory deadlines, calculate them relative to the project timeline
- Use quarters relative to the project start date (e.g., "Q3 of Year 1" not "Q3 2024")
- For any compliance or regulatory requirements, state them as "within X months of project start" rather than specific calendar dates`

    if (researchContext?.industryInsights?.length > 0) {
      prompt += `\n\nINDUSTRY INSIGHTS:\n${researchContext.industryInsights.join('\n- ')}`
    }

    if (researchContext?.successFactors?.length > 0) {
      prompt += `\n\nSUCCESS FACTORS FROM SIMILAR PROJECTS:\n${researchContext.successFactors.join('\n- ')}`
    }

    return prompt
  }

  /**
   * Build user prompt for Business Case generation
   */
  private buildBusinessCaseUserPrompt(data: SanitizedProjectData): string {
    return `Generate a comprehensive PRINCE2 Business Case for the following project:

PROJECT DETAILS:
- Name: ${data.projectName}
- Vision: ${data.vision}
- Description: ${data.description}
- Sector: ${data.sector}
- Initial Business Case: ${data.businessCase}
- Budget: ${data.budget || 'Not specified'}
- Timeline: ${data.timeline || '6-12 months'}
- Start Date: ${data.startDate || 'TBD'}
- End Date: ${data.endDate || 'TBD'}

IMPORTANT: Base ALL dates, deadlines, and timelines on the Start Date (${data.startDate}) and End Date (${data.endDate}) provided above. Do NOT use any hardcoded years like 2024 or 2025.

REQUIREMENTS:
1. Executive Summary: Comprehensive overview of the business case
2. Reasons: Detailed business reasons for the project
3. Business Options: Minimum 3 options including "do nothing", with costs, benefits, and risks for each
4. Expected Benefits: At least 5 measurable benefits with baselines and targets
5. Expected Dis-benefits: Identify negative impacts with mitigation strategies
6. Timescale: Detailed project timeline
7. Costs: Breakdown of development, operational, maintenance, and total costs (all as formatted strings)
8. Investment Appraisal: ROI, payback period, and NPV
9. Major Risks: At least 3 risks with probability, impact, and mitigation
10. Recommendation: Clear recommended action
11. Funding Source: Identify funding source
12. Benefits Realization: Approach, timeline, responsibilities, and measurement
13. Stakeholder Analysis: At least 5 stakeholders with interest, influence, attitude, and strategy
14. Success Criteria: At least 5 specific success criteria
15. Constraints and Dependencies: Lists of constraints, dependencies, and assumptions

Generate professional, detailed content with specific metrics and realistic financials.`
  }

  /**
   * Helper function to calculate stage end date
   */
  private calculateStageEndDate(startDate: string | undefined, monthsToAdd: number): string {
    if (!startDate) return 'TBD';
    
    try {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + monthsToAdd);
      return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
    } catch {
      return 'TBD';
    }
  }

  /**
   * Get default PID structure as fallback
   */
  private getDefaultPID(data: SanitizedProjectData): PIDDocument {
    return {
      projectDefinition: {
        background: `Background for ${data.projectName}`,
        objectives: ['Objective 1', 'Objective 2', 'Objective 3'],
        desiredOutcomes: ['Outcome 1', 'Outcome 2', 'Outcome 3'],
        scope: {
          included: ['Included item 1', 'Included item 2', 'Included item 3'],
          excluded: ['Excluded item 1', 'Excluded item 2']
        },
        constraints: ['Time constraint', 'Budget constraint', 'Resource constraint'],
        assumptions: ['Assumption 1', 'Assumption 2', 'Assumption 3'],
        deliverables: [
          {
            name: 'Deliverable 1',
            description: 'Description of deliverable 1',
            qualityCriteria: ['Quality criterion 1', 'Quality criterion 2']
          }
        ],
        interfaces: ['External interface 1', 'External interface 2']
      },
      businessCase: {
        reasons: data.businessCase || 'Business reasons',
        options: ['Option 1', 'Option 2', 'Option 3'],
        expectedBenefits: ['Benefit 1', 'Benefit 2', 'Benefit 3'],
        expectedDisbenefits: ['Disbenefit 1'],
        timescale: data.expectedTimeline || '6 months',
        costs: {
          development: '$100,000',
          operational: '$50,000',
          total: '$150,000'
        },
        investmentAppraisal: 'Positive ROI expected',
        majorRisks: ['Risk 1', 'Risk 2']
      },
      organizationStructure: {
        projectBoard: {
          executive: 'Project Executive',
          seniorUser: 'Senior User',
          seniorSupplier: 'Senior Supplier'
        },
        projectManager: 'Project Manager',
        teamManagers: ['Team Manager 1', 'Team Manager 2'],
        projectAssurance: {
          business: 'Business Assurance',
          user: 'User Assurance',
          specialist: 'Technical Assurance'
        },
        projectSupport: 'Project Support Office'
      },
      qualityManagementApproach: {
        qualityStandards: ['ISO 9001', 'Industry standards'],
        qualityCriteria: ['Meets requirements', 'On time', 'Within budget'],
        qualityMethod: 'Regular quality reviews',
        qualityResponsibilities: 'Project Manager responsible for quality'
      },
      configurationManagementApproach: {
        purpose: 'Control project products',
        procedure: 'Version control and change management',
        issueAndChangeControl: 'Change control board',
        toolsAndTechniques: ['Git', 'JIRA']
      },
      riskManagementApproach: {
        procedure: 'Regular risk assessments',
        riskTolerance: {
          time: '+/- 1 week',
          cost: '+/- 10%',
          quality: 'Must meet minimum standards',
          scope: 'Core features required',
          benefits: 'Minimum 80% of benefits',
          risk: 'Medium risk tolerance'
        },
        riskRegisterFormat: 'Standard risk register',
        rolesAndResponsibilities: [
          {
            role: 'Project Manager',
            responsibilities: ['Risk identification', 'Risk management']
          }
        ],
        riskCategories: ['Technical', 'Business', 'External'],
        toolsAndTechniques: ['Risk workshops', 'Risk register'],
        reporting: 'Weekly risk reports',
        timingOfRiskManagementActivities: 'Weekly risk reviews'
      },
      communicationManagementApproach: {
        procedure: 'Regular communication plan',
        toolsAndTechniques: ['Email', 'Meetings', 'Reports'],
        reporting: 'Weekly status reports',
        rolesAndResponsibilities: 'Project Manager leads communication',
        methods: ['Email', 'Meetings', 'Dashboard'],
        frequency: 'Weekly updates',
        stakeholderAnalysis: [
          {
            stakeholder: 'Executive Board',
            interest: 'high',
            influence: 'high',
            communicationMethod: 'Executive reports',
            frequency: 'Monthly'
          }
        ]
      },
      projectPlan: {
        stages: [
          {
            name: 'Initiation',
            startDate: data.startDate || 'TBD',
            endDate: this.calculateStageEndDate(data.startDate, 1) || 'TBD',
            objectives: ['Setup project', 'Define requirements'],
            deliverables: ['PID', 'Requirements document']
          }
        ],
        milestones: [
          {
            name: 'Project kickoff',
            date: data.startDate || 'TBD',
            criteria: 'Team assembled'
          }
        ],
        dependencies: [
          {
            type: 'Internal',
            description: 'Resource availability',
            impact: 'Delay in project start'
          }
        ],
        schedule: 'Six-month project timeline'
      },
      projectControls: {
        stages: ['Initiation', 'Development', 'Closure'],
        tolerances: {
          time: '+/- 1 week',
          cost: '+/- 10%',
          quality: 'Must meet standards',
          scope: 'Core features',
          benefits: '80% minimum',
          risk: 'Medium'
        },
        reportingArrangements: 'Weekly reports to Project Board'
      },
      tailoring: {
        approach: 'Tailoring approach for project size and complexity',
        justification: 'Tailoring for project size and team structure'
      }
    }
  }

  /**
   * Get default Business Case structure as fallback
   */
  private getDefaultBusinessCase(data: SanitizedProjectData): BusinessCaseDocument {
    return {
      executiveSummary: `Executive summary for ${data.projectName}`,
      reasons: data.businessCase || 'Business reasons for the project',
      businessOptions: [
        {
          option: 'Do Nothing',
          description: 'Continue with current state',
          costs: '$0',
          benefits: 'No change',
          risks: 'Falling behind competition'
        },
        {
          option: 'Minimal Implementation',
          description: 'Basic project implementation',
          costs: '$100,000',
          benefits: 'Some improvement',
          risks: 'May not meet all needs'
        },
        {
          option: 'Full Implementation',
          description: 'Complete project as planned',
          costs: '$250,000',
          benefits: 'Full benefits realization',
          risks: 'Higher investment required'
        }
      ],
      expectedBenefits: [
        {
          benefit: 'Increased efficiency',
          measurable: true,
          measurement: 'Time saved',
          baseline: '100 hours/month',
          target: '50 hours/month'
        },
        {
          benefit: 'Cost reduction',
          measurable: true,
          measurement: 'Monthly costs',
          baseline: '$10,000',
          target: '$7,000'
        },
        {
          benefit: 'Improved quality',
          measurable: true,
          measurement: 'Error rate',
          baseline: '5%',
          target: '1%'
        }
      ],
      expectedDisBenefits: [
        {
          disbenefit: 'Initial disruption',
          impact: 'Temporary productivity decrease',
          mitigation: 'Phased implementation'
        }
      ],
      timescale: data.expectedTimeline || '6-12 months',
      costs: {
        development: '$150,000',
        operational: '$50,000',
        maintenance: '$30,000',
        total: '$230,000'
      },
      investmentAppraisal: {
        roi: '150%',
        paybackPeriod: '18 months',
        npv: '$500,000'
      },
      majorRisks: [
        {
          risk: 'Technical complexity',
          probability: 'medium',
          impact: 'high',
          mitigation: 'Expert consultation'
        },
        {
          risk: 'Budget overrun',
          probability: 'low',
          impact: 'medium',
          mitigation: 'Contingency planning'
        },
        {
          risk: 'Timeline delay',
          probability: 'medium',
          impact: 'medium',
          mitigation: 'Buffer in schedule'
        }
      ],
      recommendation: 'Proceed with full implementation option',
      fundingSource: 'Internal budget allocation',
      benefitsRealization: {
        approach: 'Phased benefits tracking',
        timeline: 'Benefits realized over 24 months',
        responsibilities: 'Benefits owner assigned',
        measurementMethod: 'Monthly KPI tracking'
      },
      stakeholderAnalysis: [
        {
          stakeholder: 'Executive Board',
          interest: 'Strategic alignment',
          influence: 'high',
          attitude: 'champion',
          strategy: 'Regular executive briefings'
        },
        {
          stakeholder: 'End Users',
          interest: 'Usability',
          influence: 'medium',
          attitude: 'neutral',
          strategy: 'User involvement in design'
        },
        {
          stakeholder: 'IT Department',
          interest: 'Technical implementation',
          influence: 'high',
          attitude: 'supporter',
          strategy: 'Technical collaboration'
        }
      ],
      successCriteria: [
        'Project delivered on time',
        'Within budget tolerance',
        'All requirements met',
        'User satisfaction > 80%',
        'ROI achieved within 2 years'
      ],
      constraintsAndDependencies: {
        constraints: ['Budget limit', 'Timeline constraint', 'Resource availability'],
        dependencies: ['IT infrastructure', 'Vendor availability', 'Regulatory approval'],
        assumptions: ['Stable requirements', 'Continued funding', 'Stakeholder support']
      }
    }
  }
}

// Export for use in main generator
export default StructuredDocumentGenerator