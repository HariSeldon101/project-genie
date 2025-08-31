/**
 * Sectioned document generator for large PRINCE2 documents
 * Generates documents in smaller sections and combines them to prevent truncation
 */

import { LLMGateway } from '../llm/gateway'
import { SanitizedProjectData } from '../llm/types'
import { prince2Prompts } from '../llm/prompts/prince2'
import { z } from 'zod'

export interface PIDSection {
  projectDefinition?: any
  businessCase?: any
  organizationStructure?: any
  qualityManagementApproach?: any
  configurationManagementApproach?: any
  riskManagementApproach?: any
  communicationManagementApproach?: any
  projectPlan?: any
  projectControls?: any
  tailoring?: any
}

export class SectionedDocumentGenerator {
  private gateway: LLMGateway
  
  constructor(gateway: LLMGateway) {
    this.gateway = gateway
  }

  /**
   * Generate PID in sections to ensure complete document
   */
  async generatePIDSectioned(
    data: SanitizedProjectData,
    projectId: string,
    researchContext?: any
  ): Promise<any> {
    console.log('📋 Generating PRINCE2 PID in sections...')
    
    const sections: PIDSection = {}
    
    // Section 1A: Project Definition
    try {
      console.log('  📄 Section 1A: Project Definition...')
      const section1a = await this.generatePIDSection(data, {
        sections: ['projectDefinition'],
        systemPrompt: `You are a PRINCE2 Project Manager creating the Project Definition section.
Return ONLY valid JSON with the projectDefinition key containing:
- background: Brief string (max 150 words)
- objectives: Array of 3-5 objectives (each max 20 words)
- desiredOutcomes: Array of 3-5 outcomes (each max 20 words)
- scope: Object with included (3-5 items) and excluded (2-3 items) arrays
- constraints: Array of 3-5 constraints (each max 15 words)
- assumptions: Array of 3-5 assumptions (each max 15 words)
- deliverables: Array of 3-5 objects with name, description, qualityCriteria
- interfaces: Array of 2-3 external interfaces

BE CONCISE. Keep responses short and focused.`,
        maxTokens: 1000
      })
      Object.assign(sections, section1a)
    } catch (error) {
      console.error('  ⚠️ Section 1A failed, using defaults')
      console.error('  📍 PID Section 1A Error Details:', {
        errorMessage: (error as any)?.message || 'Unknown error',
        errorName: (error as any)?.name || 'Unknown',
        errorStack: (error as any)?.stack?.split('\n').slice(0, 3).join('\n')
      })
      sections.projectDefinition = this.getDefaultProjectDefinition(data)
    }
    
    // Section 1B: Business Case
    try {
      console.log('  📄 Section 1B: Business Case...')
      const section1b = await this.generatePIDSection(data, {
        sections: ['businessCase'],
        systemPrompt: `You are a PRINCE2 Project Manager creating the Business Case section.
Return ONLY valid JSON with the businessCase key containing:
- reasons: Brief string (max 100 words)
- options: Array of 2-3 business options (each max 50 words)
- expectedBenefits: Array of 3-5 benefits (each max 30 words)
- expectedDisbenefits: Array of 1-2 disbenefits (each max 20 words)
- timescale: Brief string (max 30 words)
- costs: Object with development, operational, total (use numbers)
- investmentAppraisal: Brief string (max 50 words)
- majorRisks: Array of 2-3 risks (each max 20 words)

BE CONCISE. Use short, focused responses.`,
        maxTokens: 1000
      })
      Object.assign(sections, section1b)
    } catch (error) {
      console.error('  ⚠️ Section 1B failed, using defaults')
      console.error('  📍 PID Section 1B Error Details:', {
        errorMessage: (error as any)?.message || 'Unknown error',
        errorName: (error as any)?.name || 'Unknown',
        errorStack: (error as any)?.stack?.split('\n').slice(0, 3).join('\n')
      })
      sections.businessCase = this.getDefaultBusinessCase(data)
    }
    
    // Section 2: Organization Structure
    try {
      console.log('  📄 Section 2: Organization Structure...')
      const section2 = await this.generatePIDSection(data, {
        sections: ['organizationStructure'],
        systemPrompt: `You are a PRINCE2 Project Manager creating the Organization Structure section.
Return a JSON object with the organizationStructure key containing:
- projectBoard: Object with executive, seniorUser, seniorSupplier
- projectManager: String with name
- teamManagers: Array of names
- projectAssurance: Object with business, user, specialist roles
- projectSupport: String describing support structure`,
        maxTokens: 2000
      })
      Object.assign(sections, section2)
    } catch (error) {
      console.error('  ⚠️ Section 2 failed, using defaults')
      console.error('  📍 PID Section 2 Error Details:', {
        errorMessage: (error as any)?.message || 'Unknown error',
        errorName: (error as any)?.name || 'Unknown',
        errorStack: (error as any)?.stack?.split('\n').slice(0, 3).join('\n')
      })
      sections.organizationStructure = this.getDefaultOrganizationStructure()
    }
    
    // Section 3A: Quality Management Approach
    try {
      console.log('  📄 Section 3A: Quality Management Approach...')
      const section3a = await this.generatePIDSection(data, {
        sections: ['qualityManagementApproach'],
        systemPrompt: `You are a PRINCE2 Project Manager creating the Quality Management Approach.
Return a JSON object with qualityManagementApproach containing:
- qualityStandards: Array of standards
- qualityCriteria: Array of criteria
- qualityMethod: String describing method
- qualityResponsibilities: String describing responsibilities`,
        maxTokens: 800
      })
      Object.assign(sections, section3a)
    } catch (error) {
      console.error('  ⚠️ Section 3A failed, using defaults')
      sections.qualityManagementApproach = this.getDefaultQualityApproach()
    }
    
    // Section 3B: Configuration Management Approach
    try {
      console.log('  📄 Section 3B: Configuration Management Approach...')
      const section3b = await this.generatePIDSection(data, {
        sections: ['configurationManagementApproach'],
        systemPrompt: `You are a PRINCE2 Project Manager creating the Configuration Management Approach.
Return a JSON object with configurationManagementApproach containing:
- purpose: String
- procedure: String
- issueAndChangeControl: String
- toolsAndTechniques: Array of tools`,
        maxTokens: 800
      })
      Object.assign(sections, section3b)
    } catch (error) {
      console.error('  ⚠️ Section 3B failed, using defaults')
      sections.configurationManagementApproach = this.getDefaultConfigApproach()
    }
    
    // Section 3C: Risk Management Approach
    try {
      console.log('  📄 Section 3C: Risk Management Approach...')
      const section3c = await this.generatePIDSection(data, {
        sections: ['riskManagementApproach'],
        systemPrompt: `You are a PRINCE2 Project Manager creating the Risk Management Approach.
Return a JSON object with riskManagementApproach containing:
- procedure: String
- riskTolerance: Object with time, cost, quality, scope, benefits, risk properties
- riskRegisterFormat: String
- rolesAndResponsibilities: Array of objects with role and responsibilities
- riskCategories: Array of categories
- toolsAndTechniques: Array of tools
- reporting: String
- timingOfRiskManagementActivities: String`,
        maxTokens: 800
      })
      Object.assign(sections, section3c)
    } catch (error) {
      console.error('  ⚠️ Section 3C failed, using defaults')
      sections.riskManagementApproach = this.getDefaultRiskApproach()
    }
    
    // Section 3D: Communication Management Approach
    try {
      console.log('  📄 Section 3D: Communication Management Approach...')
      const section3d = await this.generatePIDSection(data, {
        sections: ['communicationManagementApproach'],
        systemPrompt: `You are a PRINCE2 Project Manager creating the Communication Management Approach.
Return a JSON object with communicationManagementApproach containing:
- methods: Array of communication methods
- frequency: String describing frequency
- stakeholderAnalysis: Array of objects with stakeholder, interest, influence, communicationMethod, frequency
- procedure: String
- toolsAndTechniques: Array of tools
- reporting: String
- rolesAndResponsibilities: String`,
        maxTokens: 800
      })
      Object.assign(sections, section3d)
    } catch (error) {
      console.error('  ⚠️ Section 3D failed, using defaults')
      sections.communicationManagementApproach = this.getDefaultCommApproach()
    }
    
    // Section 4A: Project Plan
    try {
      console.log('  📄 Section 4A: Project Plan...')
      const section4a = await this.generatePIDSection(data, {
        sections: ['projectPlan'],
        systemPrompt: `You are a PRINCE2 Project Manager creating the Project Plan.
Return a JSON object with projectPlan containing:
- stages: Array of objects with name, startDate, endDate, objectives, deliverables
- milestones: Array of objects with name, date, criteria
- dependencies: Array of objects with type, description, impact
- schedule: String describing overall schedule`,
        maxTokens: 1000
      })
      Object.assign(sections, section4a)
    } catch (error) {
      console.error('  ⚠️ Section 4A failed, using defaults')
      sections.projectPlan = this.getDefaultProjectPlan(data)
    }
    
    // Section 4B: Project Controls
    try {
      console.log('  📄 Section 4B: Project Controls...')
      const section4b = await this.generatePIDSection(data, {
        sections: ['projectControls'],
        systemPrompt: `You are a PRINCE2 Project Manager creating the Project Controls.
Return a JSON object with projectControls containing:
- tolerances: Object with time, cost, scope, quality properties
- reportingArrangements: String
- stages: Array of stage names`,
        maxTokens: 800
      })
      Object.assign(sections, section4b)
    } catch (error) {
      console.error('  ⚠️ Section 4B failed, using defaults')
      sections.projectControls = this.getDefaultProjectControls()
    }
    
    // Section 4C: Tailoring
    try {
      console.log('  📄 Section 4C: Tailoring...')
      const section4c = await this.generatePIDSection(data, {
        sections: ['tailoring'],
        systemPrompt: `You are a PRINCE2 Project Manager creating the Tailoring section.
Return a JSON object with tailoring containing:
- justification: String describing why tailoring is needed
- appliedTailoring: Array of objects with aspect, tailoring, justification`,
        maxTokens: 800
      })
      Object.assign(sections, section4c)
    } catch (error) {
      console.error('  ⚠️ Section 4C failed, using defaults')
      sections.tailoring = this.getDefaultTailoring()
    }
    
    console.log('  ✅ PID generation complete')
    return sections
  }

  /**
   * Generate Business Case in sections
   */
  async generateBusinessCaseSectioned(
    data: SanitizedProjectData,
    projectId: string,
    researchContext?: any
  ): Promise<any> {
    console.log('📋 Generating Business Case in sections...')
    
    const sections: any = {}
    
    // Section 1: Executive Summary and Reasons
    try {
      console.log('  📄 Section 1: Executive Summary & Reasons...')
      const section1 = await this.generateBusinessCaseSection(data, {
        sections: ['executiveSummary', 'reasons'],
        systemPrompt: `You are a PRINCE2 Business Analyst creating a Business Case.
Focus ONLY on the Executive Summary and Reasons sections.
Return a JSON object with:
- executiveSummary: A comprehensive executive summary paragraph
- reasons: Detailed business reasons for the project`,
        maxTokens: 2000
      })
      Object.assign(sections, section1)
    } catch (error) {
      console.error('  ⚠️ Business Case Section 1 failed, using defaults')
      console.error('  📍 Business Case Section 1 Error Details:', {
        errorMessage: (error as any)?.message || 'Unknown error',
        errorName: (error as any)?.name || 'Unknown',
        errorStack: (error as any)?.stack?.split('\n').slice(0, 3).join('\n')
      })
      sections.executiveSummary = `Executive summary for ${data.projectName}`
      sections.reasons = 'Business reasons for the project'
    }
    
    // Section 2: Business Options
    try {
      console.log('  📄 Section 2: Business Options...')
      const section2 = await this.generateBusinessCaseSection(data, {
        sections: ['businessOptions'],
        systemPrompt: `You are a PRINCE2 Business Analyst creating Business Options.
Return a JSON object with:
- businessOptions: Array of at least 3 options, each with: option (name), description, costs, benefits, risks`,
        maxTokens: 2500
      })
      Object.assign(sections, section2)
    } catch (error) {
      console.error('  ⚠️ Business Case Section 2 failed, using defaults')
      console.error('  📍 Business Case Section 2 Error Details:', {
        errorMessage: (error as any)?.message || 'Unknown error',
        errorName: (error as any)?.name || 'Unknown',
        errorStack: (error as any)?.stack?.split('\n').slice(0, 3).join('\n')
      })
      sections.businessOptions = this.getDefaultBusinessOptions(data)
    }
    
    // Section 3: Benefits and Disbenefits
    try {
      console.log('  📄 Section 3: Benefits & Disbenefits...')
      const section3 = await this.generateBusinessCaseSection(data, {
        sections: ['expectedBenefits', 'expectedDisBenefits'],
        systemPrompt: `You are a PRINCE2 Business Analyst defining benefits.
Return a JSON object with:
- expectedBenefits: Array of benefits, each with: benefit, measurable (boolean), measurement, baseline, target
- expectedDisBenefits: Array of disbenefits with similar structure`,
        maxTokens: 2000
      })
      Object.assign(sections, section3)
    } catch (error) {
      console.error('  ⚠️ Business Case Section 3 failed, using defaults')
      console.error('  📍 Business Case Section 3 Error Details:', {
        errorMessage: (error as any)?.message || 'Unknown error',
        errorName: (error as any)?.name || 'Unknown',
        errorStack: (error as any)?.stack?.split('\n').slice(0, 3).join('\n')
      })
      sections.expectedBenefits = this.getDefaultBenefits(data)
      sections.expectedDisBenefits = []
    }
    
    // Section 4: Financials and Risks
    try {
      console.log('  📄 Section 4: Financials & Risks...')
      const section4 = await this.generateBusinessCaseSection(data, {
        sections: ['timescale', 'costs', 'investmentAppraisal', 'majorRisks'],
        systemPrompt: `You are a PRINCE2 Business Analyst completing the financial sections.
Return a JSON object with:
- timescale: Project timeline description
- costs: Object with development, operational, maintenance, total (all as strings with dollar amounts)
- investmentAppraisal: Object with roi, paybackPeriod, npv
- majorRisks: Array of risk descriptions`,
        maxTokens: 2000
      })
      Object.assign(sections, section4)
    } catch (error) {
      console.error('  ⚠️ Business Case Section 4 failed, using defaults')
      console.error('  📍 Business Case Section 4 Error Details:', {
        errorMessage: (error as any)?.message || 'Unknown error',
        errorName: (error as any)?.name || 'Unknown',
        errorStack: (error as any)?.stack?.split('\n').slice(0, 3).join('\n')
      })
      sections.timescale = '3-6 months timeline'
      sections.costs = this.getDefaultCosts(data)
      sections.investmentAppraisal = this.getDefaultInvestmentAppraisal()
      sections.majorRisks = ['Implementation risk', 'Budget risk', 'Timeline risk']
    }
    
    console.log('  ✅ Business Case generation complete')
    return sections
  }

  /**
   * Generate a single PID section
   */
  private async generatePIDSection(data: SanitizedProjectData, config: {
    sections: string[]
    systemPrompt: string
    maxTokens: number
  }): Promise<any> {
    console.log(`    🔍 Attempting to generate PID sections: ${config.sections.join(', ')}`)
    
    // Create a dynamic schema based on sections being requested
    const schemaObject: any = {}
    
    // Add schema fields based on sections
    if (config.sections.includes('projectDefinition')) {
      schemaObject.projectDefinition = z.object({
        background: z.string(),
        objectives: z.array(z.string()),
        desiredOutcomes: z.array(z.string()),
        scope: z.object({
          included: z.array(z.string()),
          excluded: z.array(z.string())
        }),
        constraints: z.array(z.string()),
        assumptions: z.array(z.string()),
        deliverables: z.array(z.object({
          name: z.string(),
          description: z.string(),
          qualityCriteria: z.array(z.string())
        })),
        interfaces: z.array(z.string())
      })
    }
    
    if (config.sections.includes('businessCase')) {
      schemaObject.businessCase = z.object({
        reasons: z.string(),
        options: z.array(z.any()),
        expectedBenefits: z.array(z.any()),
        expectedDisbenefits: z.array(z.any()),
        timescale: z.string(),
        costs: z.object({
          development: z.union([z.string(), z.number()]).transform(val => 
            typeof val === 'number' ? `$${val.toLocaleString()}` : val
          ),
          operational: z.union([z.string(), z.number()]).transform(val => 
            typeof val === 'number' ? `$${val.toLocaleString()}` : val
          ),
          total: z.union([z.string(), z.number()]).transform(val => 
            typeof val === 'number' ? `$${val.toLocaleString()}` : val
          )
        }),
        investmentAppraisal: z.any(),
        majorRisks: z.array(z.any())
      })
    }
    
    if (config.sections.includes('organizationStructure')) {
      schemaObject.organizationStructure = z.object({
        projectBoard: z.object({
          executive: z.union([z.string(), z.object({ name: z.string(), role: z.string().optional() })]).transform(val => 
            typeof val === 'object' ? (val as any).name || JSON.stringify(val) : val
          ),
          seniorUser: z.union([z.string(), z.object({ name: z.string(), role: z.string().optional() })]).transform(val => 
            typeof val === 'object' ? (val as any).name || JSON.stringify(val) : val
          ),
          seniorSupplier: z.union([z.string(), z.object({ name: z.string(), role: z.string().optional() })]).transform(val => 
            typeof val === 'object' ? (val as any).name || JSON.stringify(val) : val
          )
        }),
        projectManager: z.union([z.string(), z.object({ name: z.string(), role: z.string().optional() })]).transform(val => 
          typeof val === 'object' ? (val as any).name || JSON.stringify(val) : val
        ),
        teamManagers: z.array(z.union([z.string(), z.object({ name: z.string(), role: z.string().optional() })]).transform(val => 
          typeof val === 'object' ? (val as any).name || JSON.stringify(val) : val
        )),
        projectAssurance: z.object({
          business: z.union([z.string(), z.object({ name: z.string(), role: z.string().optional() })]).transform(val => 
            typeof val === 'object' ? (val as any).name || JSON.stringify(val) : val
          ),
          user: z.union([z.string(), z.object({ name: z.string(), role: z.string().optional() })]).transform(val => 
            typeof val === 'object' ? (val as any).name || JSON.stringify(val) : val
          ),
          specialist: z.union([z.string(), z.object({ name: z.string(), role: z.string().optional() })]).transform(val => 
            typeof val === 'object' ? (val as any).name || JSON.stringify(val) : val
          )
        }),
        projectSupport: z.union([z.string(), z.object({ name: z.string(), role: z.string().optional() })]).transform(val => 
          typeof val === 'object' ? (val as any).name || JSON.stringify(val) : val
        )
      })
    }
    
    if (config.sections.includes('qualityManagementApproach')) {
      schemaObject.qualityManagementApproach = z.object({
        qualityStandards: z.array(z.string()),
        qualityCriteria: z.array(z.string()),
        qualityMethod: z.string(),
        qualityResponsibilities: z.string()
      })
    }
    
    if (config.sections.includes('configurationManagementApproach')) {
      schemaObject.configurationManagementApproach = z.object({
        purpose: z.string(),
        procedure: z.string(),
        issueAndChangeControl: z.string(),
        toolsAndTechniques: z.array(z.string())
      })
    }
    
    if (config.sections.includes('riskManagementApproach')) {
      schemaObject.riskManagementApproach = z.object({
        procedure: z.string(),
        toolsAndTechniques: z.array(z.string()),
        reporting: z.string(),
        timingOfRiskManagementActivities: z.string(),
        rolesAndResponsibilities: z.array(z.object({
          role: z.string(),
          responsibilities: z.array(z.string())
        })),
        riskTolerance: z.object({
          time: z.string(),
          cost: z.string(),
          quality: z.string(),
          scope: z.string(),
          benefits: z.string(),
          risk: z.string()
        }),
        riskCategories: z.array(z.string()),
        riskRegisterFormat: z.string()
      })
    }
    
    if (config.sections.includes('communicationManagementApproach')) {
      schemaObject.communicationManagementApproach = z.object({
        procedure: z.string(),
        toolsAndTechniques: z.array(z.string()),
        reporting: z.string(),
        rolesAndResponsibilities: z.string(),
        methods: z.array(z.string()),
        frequency: z.string(),
        stakeholderAnalysis: z.array(z.object({
          stakeholder: z.string(),
          interest: z.string(),
          influence: z.string(),
          communicationMethod: z.string(),
          frequency: z.string()
        }))
      })
    }
    
    if (config.sections.includes('projectPlan')) {
      schemaObject.projectPlan = z.object({
        stages: z.array(z.object({
          name: z.string(),
          startDate: z.string(),
          endDate: z.string(),
          objectives: z.array(z.string()),
          deliverables: z.array(z.string())
        })),
        milestones: z.array(z.object({
          name: z.string(),
          date: z.string(),
          criteria: z.string()
        })),
        dependencies: z.array(z.object({
          type: z.string(),
          description: z.string(),
          impact: z.string()
        })),
        schedule: z.string()
      })
    }
    
    if (config.sections.includes('projectControls')) {
      schemaObject.projectControls = z.object({
        stages: z.array(z.string()),
        tolerances: z.object({
          time: z.string(),
          cost: z.string(),
          scope: z.string(),
          quality: z.string()
        }),
        reportingArrangements: z.string()
      })
    }
    
    if (config.sections.includes('tailoring')) {
      schemaObject.tailoring = z.object({
        justification: z.string(),
        appliedTailoring: z.array(z.object({
          aspect: z.string(),
          tailoring: z.string(),
          justification: z.string()
        }))
      })
    }
    
    const schema = z.object(schemaObject)
    
    const prompt = {
      system: config.systemPrompt,
      user: `Create the ${config.sections.join(', ')} section(s) for this PRINCE2 project:
      
Project Name: ${data.projectName}
Vision: ${data.vision}
Business Case: ${data.businessCase}
Description: ${data.description}
Sector: ${data.sector}
Methodology: ${data.methodology}

Generate ONLY valid JSON with the requested sections. Be comprehensive and detailed.`,
      maxTokens: config.maxTokens,
      temperature: 0.5,
      reasoningEffort: 'low' as const
    }
    
    console.log('    📤 Prompt constructed:', {
      systemLength: prompt.system.length,
      userLength: prompt.user.length,
      maxTokens: prompt.maxTokens,
      schemaKeys: Object.keys(schemaObject)
    })
    
    // Change to generateTextWithMetrics to avoid truncation issues
    // Add instruction for JSON output to the prompt
    const jsonPrompt = {
      ...prompt,
      user: prompt.user + `\n\nIMPORTANT: Return ONLY valid JSON matching the schema. No markdown formatting, no explanations, just the JSON object.

CRITICAL DATA TYPE REQUIREMENTS:
- Arrays must be JSON arrays like ["item1", "item2"], NOT strings
- Cost fields can be numbers or strings with dollar amounts
- qualityCriteria must be an array of strings
- All list fields must be arrays, not single strings`
    }
    
    const response = await this.gateway.generateTextWithMetrics(jsonPrompt)
    
    console.log('    📥 Response received:', {
      hasContent: !!response.content,
      contentLength: response.content?.length,
      hasUsage: !!response.usage,
      provider: response.provider,
      model: response.model
    })
    
    // Parse the text response as JSON
    let parsedContent: any
    try {
      // Clean up any markdown formatting if present
      let cleanContent = response.content.trim()
      if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      }
      
      parsedContent = JSON.parse(cleanContent)
      
      // Validate against schema
      const validated = schema.parse(parsedContent)
      console.log('    ✅ JSON parsed and validated successfully, keys:', Object.keys(validated))
      return validated
      
    } catch (error) {
      console.error('    ❌ JSON parsing/validation failed:', error)
      console.log('    📝 Raw response preview:', response.content?.substring(0, 500))
      
      // Return defaults for the requested sections
      const defaultContent: any = {}
      for (const section of config.sections) {
        if (section === 'projectDefinition') {
          defaultContent[section] = this.getDefaultProjectDefinition(data)
        } else if (section === 'businessCase') {
          defaultContent[section] = this.getDefaultBusinessCase(data)
        } else if (section === 'organizationStructure') {
          defaultContent[section] = this.getDefaultOrganizationStructure()
        } else if (section === 'qualityManagementApproach') {
          defaultContent[section] = this.getDefaultQualityApproach()
        } else if (section === 'configurationManagementApproach') {
          defaultContent[section] = this.getDefaultConfigApproach()
        } else if (section === 'riskManagementApproach') {
          defaultContent[section] = this.getDefaultRiskApproach()
        } else if (section === 'communicationManagementApproach') {
          defaultContent[section] = this.getDefaultCommApproach()
        } else if (section === 'projectPlan') {
          defaultContent[section] = this.getDefaultProjectPlan(data)
        } else if (section === 'projectControls') {
          defaultContent[section] = this.getDefaultProjectControls()
        } else if (section === 'tailoring') {
          defaultContent[section] = this.getDefaultTailoring()
        }
      }
      return defaultContent
    }
  }

  /**
   * Generate a single Business Case section
   */
  private async generateBusinessCaseSection(data: SanitizedProjectData, config: {
    sections: string[]
    systemPrompt: string
    maxTokens: number
  }): Promise<any> {
    console.log(`    🔍 Attempting to generate Business Case sections: ${config.sections.join(', ')}`)
    
    // Create dynamic schema based on sections
    const schemaObject: any = {}
    
    if (config.sections.includes('executiveSummary')) {
      schemaObject.executiveSummary = z.string()
    }
    
    if (config.sections.includes('reasons')) {
      schemaObject.reasons = z.string()
    }
    
    if (config.sections.includes('businessOptions')) {
      schemaObject.businessOptions = z.array(z.object({
        option: z.string(),
        description: z.string(),
        costs: z.string(),
        benefits: z.string(),
        risks: z.string()
      }))
    }
    
    if (config.sections.includes('expectedBenefits')) {
      schemaObject.expectedBenefits = z.array(z.object({
        benefit: z.string(),
        measurable: z.boolean(),
        measurement: z.string().optional(),
        baseline: z.string().optional(),
        target: z.string().optional()
      }))
    }
    
    if (config.sections.includes('expectedDisBenefits')) {
      schemaObject.expectedDisBenefits = z.array(z.object({
        disbenefit: z.string(),
        impact: z.string().optional()
      }))
    }
    
    if (config.sections.includes('timescale')) {
      schemaObject.timescale = z.string()
    }
    
    if (config.sections.includes('costs')) {
      schemaObject.costs = z.object({
        development: z.union([z.string(), z.number()]).transform(val => 
          typeof val === 'number' ? `$${val.toLocaleString()}` : val
        ),
        operational: z.union([z.string(), z.number()]).transform(val => 
          typeof val === 'number' ? `$${val.toLocaleString()}` : val
        ),
        maintenance: z.union([z.string(), z.number()]).optional().transform(val => 
          val === undefined ? undefined : (typeof val === 'number' ? `$${val.toLocaleString()}` : val)
        ),
        total: z.union([z.string(), z.number()]).transform(val => 
          typeof val === 'number' ? `$${val.toLocaleString()}` : val
        )
      })
    }
    
    if (config.sections.includes('investmentAppraisal')) {
      schemaObject.investmentAppraisal = z.object({
        roi: z.string(),
        paybackPeriod: z.string(),
        npv: z.string()
      })
    }
    
    if (config.sections.includes('majorRisks')) {
      schemaObject.majorRisks = z.array(z.string())
    }
    
    const schema = z.object(schemaObject)
    
    const prompt = {
      system: config.systemPrompt,
      user: `Create the ${config.sections.join(', ')} section(s) for this PRINCE2 Business Case:
      
Project Name: ${data.projectName}
Vision: ${data.vision}
Business Case: ${data.businessCase}
Description: ${data.description}
Sector: ${data.sector}
Methodology: ${data.methodology}

Generate ONLY valid JSON with the requested sections. Be comprehensive and detailed.`,
      maxTokens: config.maxTokens,
      temperature: 0.5,
      reasoningEffort: 'low' as const
    }
    
    console.log('    📤 Prompt constructed:', {
      systemLength: prompt.system.length,
      userLength: prompt.user.length,
      maxTokens: prompt.maxTokens,
      schemaKeys: Object.keys(schemaObject)
    })
    
    // Change to generateTextWithMetrics to avoid truncation issues
    // Add instruction for JSON output to the prompt
    const jsonPrompt = {
      ...prompt,
      user: prompt.user + `\n\nIMPORTANT: Return ONLY valid JSON matching the schema. No markdown formatting, no explanations, just the JSON object.

CRITICAL DATA TYPE REQUIREMENTS:
- Arrays must be JSON arrays like ["item1", "item2"], NOT strings
- Cost fields can be numbers or strings with dollar amounts
- qualityCriteria must be an array of strings
- All list fields must be arrays, not single strings`
    }
    
    const response = await this.gateway.generateTextWithMetrics(jsonPrompt)
    
    console.log('    📥 Response received:', {
      hasContent: !!response.content,
      contentLength: response.content?.length,
      hasUsage: !!response.usage,
      provider: response.provider,
      model: response.model
    })
    
    // Parse the text response as JSON
    let parsedContent: any
    try {
      // Clean up any markdown formatting if present
      let cleanContent = response.content.trim()
      if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      }
      
      parsedContent = JSON.parse(cleanContent)
      
      // Validate against schema
      const validated = schema.parse(parsedContent)
      console.log('    ✅ JSON parsed and validated successfully, keys:', Object.keys(validated))
      return validated
      
    } catch (error) {
      console.error('    ❌ JSON parsing/validation failed:', error)
      console.log('    📝 Raw response preview:', response.content?.substring(0, 500))
      
      // Return defaults for the requested sections
      const defaultContent: any = {}
      for (const section of config.sections) {
        if (section === 'projectDefinition') {
          defaultContent[section] = this.getDefaultProjectDefinition(data)
        } else if (section === 'businessCase') {
          defaultContent[section] = this.getDefaultBusinessCase(data)
        } else if (section === 'organizationStructure') {
          defaultContent[section] = this.getDefaultOrganizationStructure()
        } else if (section === 'qualityManagementApproach') {
          defaultContent[section] = this.getDefaultQualityApproach()
        } else if (section === 'configurationManagementApproach') {
          defaultContent[section] = this.getDefaultConfigApproach()
        } else if (section === 'riskManagementApproach') {
          defaultContent[section] = this.getDefaultRiskApproach()
        } else if (section === 'communicationManagementApproach') {
          defaultContent[section] = this.getDefaultCommApproach()
        } else if (section === 'projectPlan') {
          defaultContent[section] = this.getDefaultProjectPlan(data)
        } else if (section === 'projectControls') {
          defaultContent[section] = this.getDefaultProjectControls()
        } else if (section === 'tailoring') {
          defaultContent[section] = this.getDefaultTailoring()
        }
      }
      return defaultContent
    }
  }

  // Default fallback methods
  private getDefaultProjectDefinition(data: SanitizedProjectData) {
    return {
      background: `${data.projectName}: ${data.businessCase}`,
      objectives: ['Deliver project successfully', 'Meet stakeholder requirements', 'Complete within timeline'],
      desiredOutcomes: ['Successful implementation', 'Business value delivered', 'Stakeholder satisfaction'],
      scope: {
        included: ['Core functionality', 'Key requirements', 'Essential features'],
        excluded: ['Future enhancements', 'Out of scope items']
      },
      constraints: ['Time: 3-6 months', 'Budget: To be determined', 'Resources: Cross-functional team'],
      assumptions: ['Resources available as planned', 'Stakeholder support', 'Technology stack suitable'],
      deliverables: [{
        name: 'Primary Deliverable',
        description: 'Main project output',
        qualityCriteria: ['Meets requirements', 'Passes testing', 'Stakeholder approval']
      }],
      interfaces: ['External systems', 'Stakeholder touchpoints']
    }
  }
  
  private getDefaultBusinessCase(data: SanitizedProjectData) {
    return {
      reasons: `Business justification for ${data.projectName}`,
      options: ['Do nothing', 'Minimal solution', 'Recommended approach'],
      expectedBenefits: ['Improved efficiency', 'Cost savings', 'Better user experience'],
      expectedDisbenefits: ['Initial disruption', 'Training required'],
      timescale: '3-6 months',
      costs: {
        development: 'TBD',
        operational: '$0',
        total: 'TBD'
      },
      investmentAppraisal: 'Positive ROI expected',
      majorRisks: ['Implementation challenges', 'Resource availability']
    }
  }
  
  private getDefaultOrganizationStructure() {
    return {
      projectBoard: {
        executive: 'Executive Sponsor',
        seniorUser: 'Senior User Representative',
        seniorSupplier: 'Senior Supplier Representative'
      },
      projectManager: 'Project Manager',
      teamManagers: ['Development Lead', 'QA Lead'],
      projectAssurance: {
        business: 'Business Assurance',
        user: 'User Assurance',
        specialist: 'Technical Assurance'
      },
      projectSupport: 'PMO Support'
    }
  }
  
  private getDefaultQualityApproach() {
    return {
      qualityStandards: ['ISO 9001', 'Industry standards'],
      qualityCriteria: ['Meets requirements', 'Passes testing'],
      qualityMethod: 'Regular quality reviews and testing',
      qualityResponsibilities: 'Quality team responsible for assurance'
    }
  }
  
  private getDefaultConfigApproach() {
    return {
      purpose: 'Configuration management ensures consistency',
      procedure: 'Version control and change management',
      issueAndChangeControl: 'Formal change control process',
      toolsAndTechniques: ['Git', 'JIRA', 'Documentation']
    }
  }
  
  private getDefaultRiskApproach() {
    return {
      procedure: 'Regular risk assessments',
      riskTolerance: 'Medium risk tolerance',
      riskRegisterFormat: 'Standard risk register template',
      rolesAndResponsibilities: 'Risk owner assignments'
    }
  }
  
  private getDefaultCommApproach() {
    return {
      methods: ['Email', 'Meetings', 'Reports'],
      frequency: 'Weekly updates',
      stakeholderAnalysis: 'Stakeholder mapping completed'
    }
  }
  
  private getDefaultProjectPlan(data: SanitizedProjectData) {
    return {
      stages: ['Initiation', 'Development', 'Testing', 'Deployment'],
      milestones: ['Project kickoff', 'Phase completion', 'Go-live'],
      dependencies: ['Resource availability', 'Third-party deliveries'],
      schedule: '3-6 months timeline'
    }
  }
  
  private getDefaultProjectControls() {
    return {
      tolerances: {
        time: '± 10%',
        cost: '± 15%',
        scope: 'No changes without approval',
        quality: 'Must meet standards',
        risk: 'Medium tolerance',
        benefits: 'Must achieve 80%'
      },
      reportingFrequency: 'Weekly',
      escalationProcess: 'Escalate to Project Board'
    }
  }
  
  private getDefaultTailoring() {
    return {
      approach: 'Tailored to project size',
      justification: 'Appropriate for project complexity'
    }
  }
  
  private getDefaultBusinessOptions(data: SanitizedProjectData) {
    return [
      {
        option: 'Do Nothing',
        description: 'Continue with current state',
        costs: '$0',
        benefits: 'No disruption',
        risks: 'Miss opportunities'
      },
      {
        option: 'Minimal Solution',
        description: 'Basic implementation',
        costs: 'Half of budget',
        benefits: 'Some improvement',
        risks: 'May not meet all needs'
      },
      {
        option: 'Recommended Solution',
        description: 'Full implementation',
        costs: 'TBD',
        benefits: 'All objectives achieved',
        risks: 'Implementation complexity'
      }
    ]
  }
  
  private getDefaultBenefits(data: SanitizedProjectData) {
    return [
      {
        benefit: 'Improved Efficiency',
        measurable: true,
        measurement: 'Time saved',
        baseline: 'Current state',
        target: '30% improvement'
      },
      {
        benefit: 'Cost Reduction',
        measurable: true,
        measurement: 'Dollar savings',
        baseline: 'Current costs',
        target: '20% reduction'
      }
    ]
  }
  
  private getDefaultCosts(data: SanitizedProjectData) {
    return {
      development: 'TBD',
      operational: '$10,000',
      maintenance: '$5,000',
      total: 'TBD'
    }
  }
  
  private getDefaultInvestmentAppraisal() {
    return {
      roi: '150% over 3 years',
      paybackPeriod: '18 months',
      npv: 'Positive NPV'
    }
  }
}