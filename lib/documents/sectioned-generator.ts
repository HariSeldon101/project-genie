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
    
    // Section 1: Project Definition and Business Case
    try {
      console.log('  📄 Section 1: Project Definition & Business Case...')
      const section1 = await this.generatePIDSection(data, {
        sections: ['projectDefinition', 'businessCase'],
        systemPrompt: `You are a PRINCE2 Project Manager creating a Project Initiation Document.
Focus ONLY on the Project Definition and Business Case sections.
Return a JSON object with these exact keys:
- projectDefinition: Contains background, objectives, desiredOutcomes, scope (with included/excluded arrays), constraints, assumptions, deliverables (array with name, description, qualityCriteria), interfaces
- businessCase: Contains reasons, options (array), expectedBenefits (array), expectedDisbenefits (array), timescale, costs (object with development, operational, total), investmentAppraisal, majorRisks (array)`,
        maxTokens: 4000
      })
      Object.assign(sections, section1)
    } catch (error) {
      console.error('  ⚠️ Section 1 failed, using defaults')
      console.error('  📍 PID Section 1 Error Details:', {
        errorMessage: (error as any)?.message || 'Unknown error',
        errorName: (error as any)?.name || 'Unknown',
        errorStack: (error as any)?.stack?.split('\n').slice(0, 3).join('\n'),
        errorFull: error
      })
      sections.projectDefinition = this.getDefaultProjectDefinition(data)
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
    
    // Section 3: Management Approaches
    try {
      console.log('  📄 Section 3: Management Approaches...')
      const section3 = await this.generatePIDSection(data, {
        sections: ['qualityManagementApproach', 'configurationManagementApproach', 'riskManagementApproach', 'communicationManagementApproach'],
        systemPrompt: `You are a PRINCE2 Project Manager creating the Management Approaches sections.
Return a JSON object with these keys:
- qualityManagementApproach: Object with qualityStandards (array), qualityCriteria (array), qualityMethod, qualityResponsibilities
- configurationManagementApproach: Object with purpose, procedure, issueAndChangeControl, toolsAndTechniques (array)
- riskManagementApproach: Object with procedure, riskTolerance, riskRegisterFormat, rolesAndResponsibilities
- communicationManagementApproach: Object with methods (array), frequency, stakeholderAnalysis`,
        maxTokens: 3000
      })
      Object.assign(sections, section3)
    } catch (error) {
      console.error('  ⚠️ Section 3 failed, using defaults')
      console.error('  📍 PID Section 3 Error Details:', {
        errorMessage: (error as any)?.message || 'Unknown error',
        errorName: (error as any)?.name || 'Unknown',
        errorStack: (error as any)?.stack?.split('\n').slice(0, 3).join('\n')
      })
      sections.qualityManagementApproach = this.getDefaultQualityApproach()
      sections.configurationManagementApproach = this.getDefaultConfigApproach()
      sections.riskManagementApproach = this.getDefaultRiskApproach()
      sections.communicationManagementApproach = this.getDefaultCommApproach()
    }
    
    // Section 4: Project Plan and Controls
    try {
      console.log('  📄 Section 4: Project Plan & Controls...')
      const section4 = await this.generatePIDSection(data, {
        sections: ['projectPlan', 'projectControls', 'tailoring'],
        systemPrompt: `You are a PRINCE2 Project Manager creating the Project Plan and Controls sections.
Return a JSON object with these keys:
- projectPlan: Object with stages (array), milestones (array), dependencies (array), schedule
- projectControls: Object with tolerances (object with time, cost, scope, quality, risk, benefits), reportingFrequency, escalationProcess
- tailoring: Object with approach, justification`,
        maxTokens: 2500
      })
      Object.assign(sections, section4)
    } catch (error) {
      console.error('  ⚠️ Section 4 failed, using defaults')
      console.error('  📍 PID Section 4 Error Details:', {
        errorMessage: (error as any)?.message || 'Unknown error',
        errorName: (error as any)?.name || 'Unknown',
        errorStack: (error as any)?.stack?.split('\n').slice(0, 3).join('\n')
      })
      sections.projectPlan = this.getDefaultProjectPlan(data)
      sections.projectControls = this.getDefaultProjectControls()
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
          development: z.string(),
          operational: z.string(),
          total: z.string()
        }),
        investmentAppraisal: z.any(),
        majorRisks: z.array(z.any())
      })
    }
    
    if (config.sections.includes('organizationStructure')) {
      schemaObject.organizationStructure = z.object({
        projectBoard: z.object({
          executive: z.string(),
          seniorUser: z.string(),
          seniorSupplier: z.string()
        }),
        projectManager: z.string(),
        teamManagers: z.array(z.string()),
        projectAssurance: z.object({
          business: z.string(),
          user: z.string(),
          specialist: z.string()
        }),
        projectSupport: z.string()
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
        rolesAndResponsibilities: z.string()
      })
    }
    
    if (config.sections.includes('communicationManagementApproach')) {
      schemaObject.communicationManagementApproach = z.object({
        procedure: z.string(),
        toolsAndTechniques: z.array(z.string()),
        reporting: z.string(),
        rolesAndResponsibilities: z.string()
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
    
    // Use generateJSONWithMetrics instead of generateTextWithMetrics
    const response = await this.gateway.generateJSONWithMetrics(prompt, schema)
    
    console.log('    📥 Response received:', {
      hasContent: !!response.content,
      contentType: typeof response.content,
      hasUsage: !!response.usage,
      provider: response.provider,
      model: response.model,
      keys: response.content ? Object.keys(response.content) : []
    })
    
    // Content is already parsed JSON when using generateJSONWithMetrics
    console.log('    ✅ JSON generation successful, keys:', Object.keys(response.content))
    
    return response.content
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
        development: z.string(),
        operational: z.string(),
        maintenance: z.string().optional(),
        total: z.string()
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
    
    // Use generateJSONWithMetrics instead of generateTextWithMetrics
    const response = await this.gateway.generateJSONWithMetrics(prompt, schema)
    
    console.log('    📥 Response received:', {
      hasContent: !!response.content,
      contentType: typeof response.content,
      hasUsage: !!response.usage,
      provider: response.provider,
      model: response.model,
      keys: response.content ? Object.keys(response.content) : []
    })
    
    // Content is already parsed JSON when using generateJSONWithMetrics
    console.log('    ✅ JSON generation successful, keys:', Object.keys(response.content))
    
    return response.content
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