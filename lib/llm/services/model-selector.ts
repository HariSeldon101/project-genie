/**
 * Model Selection Service
 * 
 * Implements strict model selection rules with GPT-5 preference
 * and cost optimization strategies.
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'

// Allowed models - ONLY these 5 models can be used
export enum AllowedModel {
  GPT5 = 'gpt-5',
  GPT5_MINI = 'gpt-5-mini',
  GPT5_NANO = 'gpt-5-nano',
  GPT4_1_MINI = 'gpt-4.1-mini',
  GPT4_1_NANO = 'gpt-4.1-nano'
}

// Model pricing per 1M tokens
export const MODEL_PRICING = {
  [AllowedModel.GPT5]: { input: 0.50, output: 4.00 },
  [AllowedModel.GPT5_MINI]: { input: 0.25, output: 2.00 },
  [AllowedModel.GPT5_NANO]: { input: 0.025, output: 0.20 },
  [AllowedModel.GPT4_1_MINI]: { input: 0.15, output: 0.60 },
  [AllowedModel.GPT4_1_NANO]: { input: 0.075, output: 0.30 }
} as const

// Document type to model mapping
export enum DocumentType {
  // Structured documents (use GPT-4.1 for schema adherence)
  PID = 'pid',
  BUSINESS_CASE = 'business_case',
  UNIFIED_BUSINESS_CASE = 'unified_business_case',
  
  // Narrative documents (use GPT-5 for creativity)
  RISK_REGISTER = 'risk_register',
  PROJECT_PLAN = 'project_plan',
  COMMUNICATION_PLAN = 'communication_plan',
  QUALITY_MANAGEMENT = 'quality_management',
  TECHNICAL_LANDSCAPE = 'technical_landscape',
  COMPARABLE_PROJECTS = 'comparable_projects',
  
  // Intelligence documents (use GPT-5 for analysis)
  COMPANY_INTELLIGENCE = 'company_intelligence',
  COMPETITIVE_ANALYSIS = 'competitive_analysis',
  MARKET_RESEARCH = 'market_research'
}

export interface ModelSelectionCriteria {
  documentType?: DocumentType
  requiresStructuredOutput?: boolean
  requiresWebSearch?: boolean
  requiresDeepAnalysis?: boolean
  maxBudgetPerRequest?: number // in dollars
  environment?: 'development' | 'testing' | 'production'
  userPreference?: AllowedModel
}

export interface ModelSelection {
  model: AllowedModel
  reasoning: string
  estimatedCost: {
    min: number
    max: number
    average: number
  }
  alternativeModels: Array<{
    model: AllowedModel
    reasoning: string
    costSavings: number
  }>
}

export class ModelSelector {
  private static instance: ModelSelector
  
  private constructor() {}
  
  static getInstance(): ModelSelector {
    if (!this.instance) {
      this.instance = new ModelSelector()
    }
    return this.instance
  }
  
  /**
   * Select the optimal model based on criteria
   * ALWAYS prefers GPT-5 family when possible
   */
  selectModel(criteria: ModelSelectionCriteria = {}): ModelSelection {
    permanentLogger.info('MODEL_SELECTION', 'Selecting model', criteria)
    
    // Force nano models in development environment for cost savings
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      const model = this.selectNanoModel(criteria)
      return this.createSelection(
        model,
        'Development environment (forced nano for cost savings)',
        criteria
      )
    }
    
    // Check if user has a valid preference
    if (criteria.userPreference && this.isAllowedModel(criteria.userPreference)) {
      return this.createSelection(
        criteria.userPreference,
        'User preference (valid model)',
        criteria
      )
    }
    
    // Environment-based selection
    if (criteria.environment === 'development' || criteria.environment === 'testing') {
      // Use nano models for dev/test to minimize costs
      const model = this.selectNanoModel(criteria)
      return this.createSelection(
        model,
        `${criteria.environment} environment (cost optimization)`,
        criteria
      )
    }
    
    // Document type based selection
    if (criteria.documentType) {
      const model = this.selectByDocumentType(criteria.documentType, criteria)
      return this.createSelection(
        model,
        `Document type: ${criteria.documentType}`,
        criteria
      )
    }
    
    // Feature-based selection
    if (criteria.requiresWebSearch || criteria.requiresDeepAnalysis) {
      // GPT-5 family excels at web search and deep analysis
      const model = criteria.maxBudgetPerRequest && criteria.maxBudgetPerRequest < 0.01
        ? AllowedModel.GPT5_NANO
        : AllowedModel.GPT5_MINI
      
      return this.createSelection(
        model,
        `${criteria.requiresWebSearch ? 'Web search' : 'Deep analysis'} capability required`,
        criteria
      )
    }
    
    if (criteria.requiresStructuredOutput) {
      // GPT-4.1 family better for structured output with schema adherence
      const model = criteria.maxBudgetPerRequest && criteria.maxBudgetPerRequest < 0.005
        ? AllowedModel.GPT4_1_NANO
        : AllowedModel.GPT4_1_MINI
      
      return this.createSelection(
        model,
        'Structured output with schema validation',
        criteria
      )
    }
    
    // Default: Always prefer GPT-5 family
    const defaultModel = AllowedModel.GPT5_NANO
    return this.createSelection(
      defaultModel,
      'Default selection (GPT-5 preference)',
      criteria
    )
  }
  
  /**
   * Select model based on document type
   */
  private selectByDocumentType(
    documentType: DocumentType,
    criteria: ModelSelectionCriteria
  ): AllowedModel {
    // Structured documents requiring schema adherence
    const structuredDocs = [
      DocumentType.PID,
      DocumentType.BUSINESS_CASE,
      DocumentType.UNIFIED_BUSINESS_CASE
    ]
    
    if (structuredDocs.includes(documentType)) {
      // Use GPT-4.1 for structured output
      return criteria.environment === 'production'
        ? AllowedModel.GPT4_1_MINI
        : AllowedModel.GPT4_1_NANO
    }
    
    // Narrative and analytical documents
    const narrativeDocs = [
      DocumentType.RISK_REGISTER,
      DocumentType.PROJECT_PLAN,
      DocumentType.COMMUNICATION_PLAN,
      DocumentType.QUALITY_MANAGEMENT,
      DocumentType.TECHNICAL_LANDSCAPE,
      DocumentType.COMPARABLE_PROJECTS
    ]
    
    if (narrativeDocs.includes(documentType)) {
      // Use GPT-5 for creativity and analysis
      return criteria.environment === 'production'
        ? AllowedModel.GPT5_MINI
        : AllowedModel.GPT5_NANO
    }
    
    // Intelligence documents requiring web search
    const intelligenceDocs = [
      DocumentType.COMPANY_INTELLIGENCE,
      DocumentType.COMPETITIVE_ANALYSIS,
      DocumentType.MARKET_RESEARCH
    ]
    
    if (intelligenceDocs.includes(documentType)) {
      // Use GPT-5 for web search capability
      return criteria.environment === 'production'
        ? AllowedModel.GPT5_MINI
        : AllowedModel.GPT5_NANO
    }
    
    // Default to GPT-5 nano
    return AllowedModel.GPT5_NANO
  }
  
  /**
   * Select nano model for testing/development
   */
  private selectNanoModel(criteria: ModelSelectionCriteria): AllowedModel {
    if (criteria.requiresStructuredOutput) {
      return AllowedModel.GPT4_1_NANO
    }
    
    // Always prefer GPT-5 family when possible
    return AllowedModel.GPT5_NANO
  }
  
  /**
   * Create a complete model selection with alternatives
   */
  private createSelection(
    model: AllowedModel,
    reasoning: string,
    criteria: ModelSelectionCriteria
  ): ModelSelection {
    const cost = this.estimateCost(model, criteria)
    const alternatives = this.getAlternativeModels(model, criteria)
    
    return {
      model,
      reasoning,
      estimatedCost: cost,
      alternativeModels: alternatives
    }
  }
  
  /**
   * Estimate cost for a model selection
   */
  private estimateCost(
    model: AllowedModel,
    criteria: ModelSelectionCriteria
  ): { min: number; max: number; average: number } {
    const pricing = MODEL_PRICING[model]
    
    // Estimate token usage based on document type
    let estimatedInputTokens = 2000 // default
    let estimatedOutputTokens = 1500 // default
    
    if (criteria.documentType) {
      const tokenEstimates = {
        [DocumentType.PID]: { input: 3000, output: 4000 },
        [DocumentType.BUSINESS_CASE]: { input: 2500, output: 3500 },
        [DocumentType.RISK_REGISTER]: { input: 2000, output: 3000 },
        [DocumentType.PROJECT_PLAN]: { input: 2500, output: 3500 },
        [DocumentType.COMPANY_INTELLIGENCE]: { input: 4000, output: 5000 },
        [DocumentType.COMPETITIVE_ANALYSIS]: { input: 3500, output: 4500 }
      }
      
      const estimate = tokenEstimates[criteria.documentType]
      if (estimate) {
        estimatedInputTokens = estimate.input
        estimatedOutputTokens = estimate.output
      }
    }
    
    // Add extra tokens for web search
    if (criteria.requiresWebSearch) {
      estimatedInputTokens += 2000
      estimatedOutputTokens += 1000
    }
    
    // Calculate costs
    const baseCost = (
      (estimatedInputTokens / 1_000_000) * pricing.input +
      (estimatedOutputTokens / 1_000_000) * pricing.output
    )
    
    return {
      min: baseCost * 0.7, // 30% less than estimate
      max: baseCost * 1.5, // 50% more than estimate
      average: baseCost
    }
  }
  
  /**
   * Get alternative model suggestions
   */
  private getAlternativeModels(
    selectedModel: AllowedModel,
    criteria: ModelSelectionCriteria
  ): Array<{ model: AllowedModel; reasoning: string; costSavings: number }> {
    const alternatives: Array<{ model: AllowedModel; reasoning: string; costSavings: number }> = []
    const selectedCost = this.estimateCost(selectedModel, criteria).average
    
    // Suggest cheaper alternatives
    const cheaperModels = {
      [AllowedModel.GPT5]: [AllowedModel.GPT5_MINI, AllowedModel.GPT5_NANO],
      [AllowedModel.GPT5_MINI]: [AllowedModel.GPT5_NANO],
      [AllowedModel.GPT4_1_MINI]: [AllowedModel.GPT4_1_NANO],
      [AllowedModel.GPT5_NANO]: [],
      [AllowedModel.GPT4_1_NANO]: []
    }
    
    for (const altModel of cheaperModels[selectedModel]) {
      const altCost = this.estimateCost(altModel, criteria).average
      const savings = ((selectedCost - altCost) / selectedCost) * 100
      
      alternatives.push({
        model: altModel,
        reasoning: `Lower cost alternative (${savings.toFixed(0)}% savings)`,
        costSavings: savings
      })
    }
    
    // Suggest model family switch if applicable
    if (selectedModel.startsWith('gpt-5') && criteria.requiresStructuredOutput) {
      const gpt4Model = AllowedModel.GPT4_1_MINI
      const altCost = this.estimateCost(gpt4Model, criteria).average
      const savings = ((selectedCost - altCost) / selectedCost) * 100
      
      alternatives.push({
        model: gpt4Model,
        reasoning: 'Better for structured output with schema validation',
        costSavings: savings
      })
    }
    
    if (selectedModel.startsWith('gpt-4') && !criteria.requiresStructuredOutput) {
      const gpt5Model = AllowedModel.GPT5_NANO
      const altCost = this.estimateCost(gpt5Model, criteria).average
      const savings = ((selectedCost - altCost) / selectedCost) * 100
      
      alternatives.push({
        model: gpt5Model,
        reasoning: 'GPT-5 family preferred for general tasks',
        costSavings: savings
      })
    }
    
    return alternatives
  }
  
  /**
   * Validate if a model is allowed
   */
  isAllowedModel(model: string): model is AllowedModel {
    return Object.values(AllowedModel).includes(model as AllowedModel)
  }
  
  /**
   * Get model capabilities
   */
  getModelCapabilities(model: AllowedModel): {
    supportsWebSearch: boolean
    supportsStructuredOutput: boolean
    supportsTools: boolean
    maxTokens: number
    responseApi: 'chat' | 'responses'
  } {
    const gpt5Models = [AllowedModel.GPT5, AllowedModel.GPT5_MINI, AllowedModel.GPT5_NANO]
    const isGPT5 = gpt5Models.includes(model)
    
    return {
      supportsWebSearch: true, // All models support web search
      supportsStructuredOutput: !isGPT5, // GPT-4.1 better for structured
      supportsTools: true,
      maxTokens: isGPT5 ? 8000 : 4000,
      responseApi: isGPT5 ? 'responses' : 'chat'
    }
  }
  
  /**
   * Calculate total cost for a request
   */
  calculateActualCost(
    model: AllowedModel,
    usage: { inputTokens: number; outputTokens: number }
  ): number {
    const pricing = MODEL_PRICING[model]
    
    const inputCost = (usage.inputTokens / 1_000_000) * pricing.input
    const outputCost = (usage.outputTokens / 1_000_000) * pricing.output
    
    return Number((inputCost + outputCost).toFixed(6))
  }
  
  /**
   * Log model selection for monitoring
   */
  logSelection(
    selection: ModelSelection,
    actualUsage?: { inputTokens: number; outputTokens: number }
  ): void {
    const logData: any = {
      model: selection.model,
      reasoning: selection.reasoning,
      estimatedCost: selection.estimatedCost.average
    }
    
    if (actualUsage) {
      const actualCost = this.calculateActualCost(selection.model, actualUsage)
      logData.actualCost = actualCost
      logData.costVariance = ((actualCost - selection.estimatedCost.average) / selection.estimatedCost.average * 100).toFixed(1) + '%'
      logData.actualUsage = actualUsage
    }
    
    permanentLogger.info('MODEL_SELECTION', 'Model selected and used', logData)
  }
}

// Export singleton instance
export const modelSelector = ModelSelector.getInstance()

// Export utility function for quick model selection
export function selectOptimalModel(criteria: ModelSelectionCriteria = {}): AllowedModel {
  const selection = modelSelector.selectModel(criteria)
  return selection.model
}

// Export cost calculation utility
export function estimateRequestCost(
  model: AllowedModel,
  estimatedTokens: { input: number; output: number }
): number {
  return modelSelector.calculateActualCost(model, {
    inputTokens: estimatedTokens.input,
    outputTokens: estimatedTokens.output
  })
}