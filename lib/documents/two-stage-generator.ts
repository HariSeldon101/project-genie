/**
 * Two-Stage Document Generation System
 * 
 * Stage 1: Research & Analysis
 * - Generate Technical Landscape Analysis
 * - Generate Comparable Projects Analysis
 * 
 * Stage 2: Document Generation with Context
 * - Use research as additional context for all other documents
 */

import { SanitizedProjectData, GeneratedDocument } from '../llm/types'
import { logger } from '../utils/permanent-logger'

export interface ResearchContext {
  technicalLandscape?: any
  comparableProjects?: any
  industryInsights?: string[]
  bestPractices?: string[]
  riskPatterns?: string[]
  successFactors?: string[]
}

export class TwoStageGenerator {
  /**
   * Extracts key insights from research documents to use as context
   */
  static extractResearchContext(
    technicalLandscape?: GeneratedDocument,
    comparableProjects?: GeneratedDocument
  ): ResearchContext {
    const context: ResearchContext = {}
    
    // Extract from Technical Landscape
    if (technicalLandscape?.content) {
      context.technicalLandscape = technicalLandscape.content
      
      // Extract specific insights
      if (typeof technicalLandscape.content === 'object') {
        const content = technicalLandscape.content as any
        
        // Technology stack recommendations
        if (content.recommendations?.technologies) {
          context.bestPractices = context.bestPractices || []
          context.bestPractices.push(
            `Recommended tech stack: ${JSON.stringify(content.recommendations.technologies)}`
          )
        }
        
        // Security considerations
        if (content.security?.considerations) {
          context.riskPatterns = context.riskPatterns || []
          content.security.considerations.forEach((consideration: string) => {
            context.riskPatterns!.push(`Security: ${consideration}`)
          })
        }
        
        // Scalability insights
        if (content.scalability?.recommendations) {
          context.successFactors = context.successFactors || []
          context.successFactors.push(
            `Scalability: ${content.scalability.recommendations}`
          )
        }
      }
    }
    
    // Extract from Comparable Projects
    if (comparableProjects?.content) {
      context.comparableProjects = comparableProjects.content
      
      if (typeof comparableProjects.content === 'object') {
        const content = comparableProjects.content as any
        
        // Industry insights
        if (content.industryAnalysis) {
          context.industryInsights = context.industryInsights || []
          context.industryInsights.push(content.industryAnalysis)
        }
        
        // Success patterns from similar projects
        if (content.projects && Array.isArray(content.projects)) {
          content.projects.forEach((project: any) => {
            if (project.successFactors) {
              context.successFactors = context.successFactors || []
              context.successFactors.push(...project.successFactors)
            }
            
            if (project.lessonsLearned) {
              context.bestPractices = context.bestPractices || []
              context.bestPractices.push(...project.lessonsLearned)
            }
            
            if (project.risks) {
              context.riskPatterns = context.riskPatterns || []
              context.riskPatterns.push(...project.risks)
            }
          })
        }
      }
    }
    
    // Remove duplicates
    if (context.bestPractices) {
      context.bestPractices = [...new Set(context.bestPractices)]
    }
    if (context.riskPatterns) {
      context.riskPatterns = [...new Set(context.riskPatterns)]
    }
    if (context.successFactors) {
      context.successFactors = [...new Set(context.successFactors)]
    }
    if (context.industryInsights) {
      context.industryInsights = [...new Set(context.industryInsights)]
    }
    
    logger.info('RESEARCH', `Extracted research context with ${Object.keys(context).length} categories`)
    
    return context
  }
  
  /**
   * Enhances a prompt with research context
   */
  static enhancePromptWithContext(
    originalPrompt: string,
    context: ResearchContext,
    documentType: string
  ): string {
    let enhancedPrompt = originalPrompt
    
    // Add context sections based on document type
    const contextSections: string[] = []
    
    // Add technical context for technical documents
    if (['pid', 'project_plan', 'backlog'].includes(documentType) && context.technicalLandscape) {
      contextSections.push(`
<technical_context>
Based on the technical landscape analysis for this project:
${JSON.stringify(context.technicalLandscape, null, 2).substring(0, 2000)}
</technical_context>`)
    }
    
    // Add comparable projects for all documents
    if (context.comparableProjects) {
      contextSections.push(`
<comparable_projects_context>
Based on analysis of similar projects:
${JSON.stringify(context.comparableProjects, null, 2).substring(0, 2000)}
</comparable_projects_context>`)
    }
    
    // Add industry insights
    if (context.industryInsights && context.industryInsights.length > 0) {
      contextSections.push(`
<industry_insights>
Key industry insights to consider:
${context.industryInsights.slice(0, 5).join('\n- ')}
</industry_insights>`)
    }
    
    // Add risk patterns for risk-related documents
    if (['risk_register', 'pid', 'business_case'].includes(documentType) && context.riskPatterns && context.riskPatterns.length > 0) {
      contextSections.push(`
<known_risk_patterns>
Common risks identified in similar projects:
${context.riskPatterns.slice(0, 10).join('\n- ')}
</known_risk_patterns>`)
    }
    
    // Add success factors
    if (context.successFactors && context.successFactors.length > 0) {
      contextSections.push(`
<success_factors>
Critical success factors from similar projects:
${context.successFactors.slice(0, 5).join('\n- ')}
</success_factors>`)
    }
    
    // Add best practices
    if (context.bestPractices && context.bestPractices.length > 0) {
      contextSections.push(`
<best_practices>
Industry best practices to incorporate:
${context.bestPractices.slice(0, 5).join('\n- ')}
</best_practices>`)
    }
    
    // Insert context at the beginning of the prompt
    if (contextSections.length > 0) {
      enhancedPrompt = `
You have access to the following research and analysis context. Use this information to create a more informed and comprehensive document:

${contextSections.join('\n\n')}

Now, based on this context and the project requirements below, generate the ${documentType}:

${originalPrompt}`
      
      logger.info('PROMPT_ENHANCEMENT', `Enhanced ${documentType} prompt with ${contextSections.length} context sections`)
    }
    
    return enhancedPrompt
  }
  
  /**
   * Formats research context for logging
   */
  static formatContextForLogging(context: ResearchContext): string {
    const summary = {
      hasTechnicalLandscape: !!context.technicalLandscape,
      hasComparableProjects: !!context.comparableProjects,
      industryInsightsCount: context.industryInsights?.length || 0,
      bestPracticesCount: context.bestPractices?.length || 0,
      riskPatternsCount: context.riskPatterns?.length || 0,
      successFactorsCount: context.successFactors?.length || 0
    }
    
    return JSON.stringify(summary, null, 2)
  }
  
  /**
   * Determines if research should be generated based on project type
   */
  static shouldGenerateResearch(projectData: SanitizedProjectData): boolean {
    // ALWAYS generate research for better document quality
    // This ensures all documents benefit from industry insights and best practices
    
    const projectType = projectData.projectType?.toLowerCase() || 'standard'
    const industry = projectData.industry?.toLowerCase() || 'general'
    const budget = projectData.budget || 0
    
    // Log the decision for debugging
    logger.info('RESEARCH_DECISION', `Research generation ENABLED for all projects. Project: ${projectType}, Industry: ${industry}, Budget: $${budget}`)
    
    // Always return true to enable two-stage generation for all projects
    // This maximizes document quality by providing context from research
    return true
  }
}