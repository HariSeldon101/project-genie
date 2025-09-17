// Legacy prompts (kept for backward compatibility)
export { prince2Prompts } from './prince2'
export { agilePrompts } from './agile'

// Enhanced prompts with context injection
export { enhancedPrince2Prompts } from './enhanced-prince2'
export { enhancedAgilePrompts } from './enhanced-agile'

// New document types
export { technicalLandscapePrompts } from './technical-landscape'
export { comparableProjectsPrompts } from './comparable-projects'

// Prompt builder that selects appropriate version
export interface PromptParams {
  projectName: string
  vision: string
  businessCase: string
  description: string
  companyWebsite: string
  sector: string
  stakeholders: string
  useEnhanced?: boolean // Flag to use enhanced prompts
}

export class PromptBuilder {
  /**
   * Builds appropriate prompt based on document type and methodology
   */
  static buildPrompt(
    documentType: string,
    methodology: 'prince2' | 'agile',
    params: PromptParams
  ): { system: string; user: string } {
    // Use enhanced prompts if flag is set (default to true)
    const useEnhanced = params.useEnhanced !== false
    
    if (useEnhanced) {
      return this.buildEnhancedPrompt(documentType, methodology, params)
    } else {
      return this.buildLegacyPrompt(documentType, methodology, params)
    }
  }
  
  /**
   * Builds enhanced prompt with context injection
   */
  private static buildEnhancedPrompt(
    documentType: string,
    methodology: string,
    params: PromptParams
  ): { system: string; user: string } {
    // Map document types to prompt builders
    const promptMap: Record<string, any> = {
      // PRINCE2 documents
      'prince2.pid': enhancedPrince2Prompts.pid,
      'prince2.businessCase': enhancedPrince2Prompts.businessCase,
      'prince2.riskRegister': enhancedPrince2Prompts.riskRegister,
      
      // Agile documents
      'agile.projectCharter': enhancedAgilePrompts.projectCharter,
      'agile.productBacklog': enhancedAgilePrompts.productBacklog,
      'agile.sprintPlan': enhancedAgilePrompts.sprintPlan,
      
      // New document types
      'technical.landscape': technicalLandscapePrompts.analysis,
      'comparable.projects': comparableProjectsPrompts.analysis
    }
    
    const key = `${methodology}.${documentType}`
    const promptBuilder = promptMap[key] || promptMap[`technical.${documentType}`] || promptMap[`comparable.${documentType}`]
    
    if (promptBuilder && promptBuilder.buildPrompt) {
      return promptBuilder.buildPrompt(params)
    }
    
    // Fallback to legacy if enhanced not found
    return this.buildLegacyPrompt(documentType, methodology, params)
  }
  
  /**
   * Builds legacy prompt (backward compatibility)
   */
  private static buildLegacyPrompt(
    documentType: string,
    methodology: string,
    params: PromptParams
  ): { system: string; user: string } {
    // Import legacy prompts
    const { prince2Prompts } = require('./prince2')
    const { agilePrompts } = require('./agile')
    
    const prompts = methodology === 'prince2' ? prince2Prompts : agilePrompts
    const prompt = prompts[documentType]
    
    if (!prompt) {
      throw new Error(`No prompt found for ${methodology}.${documentType}`)
    }
    
    // Replace template variables in legacy prompts
    let system = prompt.system
    let user = prompt.user
    
    // Replace all template variables
    const replacements = {
      '{{projectName}}': params.projectName,
      '{{vision}}': params.vision,
      '{{businessCase}}': params.businessCase,
      '{{description}}': params.description,
      '{{companyWebsite}}': params.companyWebsite,
      '{{sector}}': params.sector,
      '{{stakeholders}}': params.stakeholders
    }
    
    for (const [key, value] of Object.entries(replacements)) {
      system = system.replace(new RegExp(key, 'g'), value)
      user = user.replace(new RegExp(key, 'g'), value)
    }
    
    return { system, user }
  }
  
  /**
   * Gets available document types for a methodology
   */
  static getAvailableDocumentTypes(methodology: 'prince2' | 'agile' | 'both'): string[] {
    const prince2Types = [
      'pid',
      'businessCase',
      'riskRegister',
      'projectPlan'
    ]
    
    const agileTypes = [
      'projectCharter',
      'productBacklog',
      'sprintPlan'
    ]
    
    const commonTypes = [
      'technicalLandscape',
      'comparableProjects'
    ]
    
    if (methodology === 'prince2') {
      return [...prince2Types, ...commonTypes]
    } else if (methodology === 'agile') {
      return [...agileTypes, ...commonTypes]
    } else {
      return [...prince2Types, ...agileTypes, ...commonTypes]
    }
  }
  
  /**
   * Gets document type metadata
   */
  static getDocumentTypeInfo(documentType: string): {
    name: string
    description: string
    methodology: string[]
    estimatedTokens: number
  } {
    const metadata: Record<string, any> = {
      // PRINCE2 documents
      pid: {
        name: 'Project Initiation Document',
        description: 'Comprehensive project foundation document following PRINCE2',
        methodology: ['prince2'],
        estimatedTokens: 4000
      },
      businessCase: {
        name: 'Business Case',
        description: 'Detailed business justification with financial analysis',
        methodology: ['prince2'],
        estimatedTokens: 3000
      },
      riskRegister: {
        name: 'Risk Register',
        description: 'Comprehensive risk identification and management plan',
        methodology: ['prince2', 'agile'],
        estimatedTokens: 3500
      },
      
      // Agile documents
      projectCharter: {
        name: 'Agile Project Charter',
        description: 'Lightweight governance document for Agile projects',
        methodology: ['agile'],
        estimatedTokens: 3000
      },
      productBacklog: {
        name: 'Product Backlog',
        description: 'Prioritized list of user stories and features',
        methodology: ['agile'],
        estimatedTokens: 3500
      },
      sprintPlan: {
        name: 'Sprint Plan',
        description: 'Detailed sprint planning and execution framework',
        methodology: ['agile'],
        estimatedTokens: 2500
      },
      
      // New document types
      technicalLandscape: {
        name: 'Technical Landscape Analysis',
        description: 'Comprehensive technology assessment and recommendations',
        methodology: ['prince2', 'agile'],
        estimatedTokens: 5000
      },
      comparableProjects: {
        name: 'Comparable Projects Analysis',
        description: 'Benchmarking and lessons learned from similar projects',
        methodology: ['prince2', 'agile'],
        estimatedTokens: 4500
      }
    }
    
    return metadata[documentType] || {
      name: documentType,
      description: 'Custom document type',
      methodology: ['prince2', 'agile'],
      estimatedTokens: 3000
    }
  }
}