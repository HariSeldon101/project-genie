import { prince2Methodology } from '../knowledge/prince2-methodology'
import { agileMethodology } from '../knowledge/agile-methodology'

export interface ContextSection {
  content: string
  tokens: number
  priority: number
  category: 'methodology' | 'examples' | 'templates' | 'user_input'
}

export interface ContextConfiguration {
  maxTokens: number
  methodology: 'prince2' | 'agile' | 'hybrid'
  documentType: string
  includeExamples: boolean
  industryContext?: string
}

export class ContextManager {
  private readonly DEFAULT_MAX_TOKENS = 6000
  private readonly TOKEN_ESTIMATE_RATIO = 0.75 // Rough estimate: 1 token ≈ 0.75 words

  /**
   * Assembles context for a prompt based on configuration
   */
  assembleContext(config: ContextConfiguration): string {
    const sections: ContextSection[] = []
    
    // Add methodology context
    sections.push(...this.getMethodologyContext(config.methodology, config.documentType))
    
    // Add examples if requested
    if (config.includeExamples) {
      sections.push(...this.getExampleContext(config.documentType, config.methodology))
    }
    
    // Add industry-specific context if provided
    if (config.industryContext) {
      sections.push(this.getIndustryContext(config.industryContext))
    }
    
    // Sort by priority and trim to token limit
    const sortedSections = sections.sort((a, b) => b.priority - a.priority)
    const finalContext = this.trimToTokenLimit(sortedSections, config.maxTokens || this.DEFAULT_MAX_TOKENS)
    
    return finalContext
  }

  /**
   * Gets relevant methodology context based on document type
   */
  private getMethodologyContext(methodology: string, documentType: string): ContextSection[] {
    const sections: ContextSection[] = []
    
    if (methodology === 'prince2' || methodology === 'hybrid') {
      const relevantContent = this.extractPrince2Context(documentType)
      sections.push({
        content: relevantContent,
        tokens: this.estimateTokens(relevantContent),
        priority: 10,
        category: 'methodology'
      })
    }
    
    if (methodology === 'agile' || methodology === 'hybrid') {
      const relevantContent = this.extractAgileContext(documentType)
      sections.push({
        content: relevantContent,
        tokens: this.estimateTokens(relevantContent),
        priority: 10,
        category: 'methodology'
      })
    }
    
    return sections
  }

  /**
   * Extracts relevant PRINCE2 context for the document type
   */
  private extractPrince2Context(documentType: string): string {
    const context: string[] = []
    
    // Always include principles
    context.push("PRINCE2 PRINCIPLES:")
    prince2Methodology.principles.forEach(principle => {
      context.push(`- ${principle.name}: ${principle.description}`)
    })
    
    // Add relevant practices based on document type
    if (documentType.toLowerCase().includes('risk')) {
      const riskPractice = prince2Methodology.practices.find(p => p.name === 'Risk')
      if (riskPractice) {
        context.push("\nRISK MANAGEMENT:")
        context.push(`Purpose: ${riskPractice.purpose}`)
        context.push(`Process: ${riskPractice.process.join(' → ')}`)
      }
    }
    
    if (documentType.toLowerCase().includes('business case')) {
      const bcPractice = prince2Methodology.practices.find(p => p.name === 'Business Case')
      if (bcPractice) {
        context.push("\nBUSINESS CASE:")
        context.push(`Purpose: ${bcPractice.purpose}`)
        bcPractice.questions.forEach(q => context.push(`- ${q}`))
      }
    }
    
    if (documentType.toLowerCase().includes('pid') || documentType.toLowerCase().includes('initiation')) {
      const pidProduct = prince2Methodology.managementProducts.baselines.find(p => 
        p.name.includes('Project Initiation Documentation')
      )
      if (pidProduct) {
        context.push("\nPROJECT INITIATION DOCUMENTATION:")
        context.push(`Purpose: ${pidProduct.purpose}`)
        context.push(`Key Sections: ${pidProduct.sections.join(', ')}`)
      }
    }
    
    // Add relevant terminology
    context.push("\nKEY TERMINOLOGY:")
    Object.entries(prince2Methodology.terminology).slice(0, 10).forEach(([term, def]) => {
      context.push(`- ${term}: ${def}`)
    })
    
    return context.join('\n')
  }

  /**
   * Extracts relevant Agile context for the document type
   */
  private extractAgileContext(documentType: string): string {
    const context: string[] = []
    
    // Always include values and key principles
    context.push("AGILE VALUES:")
    agileMethodology.values.forEach(value => {
      context.push(`- ${value.name} over ${value.over}`)
    })
    
    context.push("\nSCRUM FRAMEWORK:")
    context.push(`Values: ${agileMethodology.scrumFramework.values.join(', ')}`)
    
    // Add relevant content based on document type
    if (documentType.toLowerCase().includes('backlog')) {
      const productBacklog = agileMethodology.scrumFramework.artifacts.find(a => 
        a.name === 'Product Backlog'
      )
      if (productBacklog) {
        context.push("\nPRODUCT BACKLOG:")
        context.push(`Description: ${productBacklog.description}`)
        context.push(`Characteristics: ${productBacklog.characteristics.join(', ')}`)
      }
      
      context.push("\nUSER STORIES:")
      context.push(`Format: ${agileMethodology.userStories.format}`)
      context.push("INVEST Criteria:")
      Object.entries(agileMethodology.userStories.investCriteria).forEach(([letter, meaning]) => {
        context.push(`  ${letter}: ${meaning}`)
      })
    }
    
    if (documentType.toLowerCase().includes('sprint')) {
      const sprint = agileMethodology.scrumFramework.events.find(e => e.name === 'Sprint')
      const sprintPlanning = agileMethodology.scrumFramework.events.find(e => e.name === 'Sprint Planning')
      
      if (sprint) {
        context.push("\nSPRINT:")
        context.push(`Purpose: ${sprint.purpose}`)
        context.push(`Duration: ${sprint.duration}`)
      }
      
      if (sprintPlanning) {
        context.push("\nSPRINT PLANNING:")
        context.push(`Topics: ${sprintPlanning.topics.join(', ')}`)
        context.push(`Outputs: ${sprintPlanning.outputs.join(', ')}`)
      }
    }
    
    // Add prioritization methods
    context.push("\nPRIORITIZATION (MoSCoW):")
    Object.entries(agileMethodology.prioritization.moscow).forEach(([priority, description]) => {
      context.push(`- ${priority}: ${description}`)
    })
    
    // Add key terminology
    context.push("\nKEY TERMINOLOGY:")
    Object.entries(agileMethodology.terminology).slice(0, 10).forEach(([term, def]) => {
      context.push(`- ${term}: ${def}`)
    })
    
    return context.join('\n')
  }

  /**
   * Gets example context for few-shot learning
   */
  private getExampleContext(documentType: string, methodology: string): ContextSection[] {
    // This would retrieve relevant examples from a database
    // For now, returning placeholder
    const exampleContent = this.getExampleForDocumentType(documentType, methodology)
    
    return [{
      content: exampleContent,
      tokens: this.estimateTokens(exampleContent),
      priority: 8,
      category: 'examples'
    }]
  }

  /**
   * Gets industry-specific context
   */
  private getIndustryContext(industry: string): ContextSection {
    // This would retrieve industry-specific information
    // For now, returning placeholder
    const content = `Industry Context for ${industry}:
- Regulatory requirements specific to ${industry}
- Common project types and scales
- Typical stakeholder structures
- Industry-specific risks and challenges
- Standard compliance frameworks`
    
    return {
      content,
      tokens: this.estimateTokens(content),
      priority: 7,
      category: 'templates'
    }
  }

  /**
   * Gets example output for a document type
   */
  private getExampleForDocumentType(documentType: string, methodology: string): string {
    // This would return actual examples
    // For now, returning a structured example format
    return `EXAMPLE OUTPUT for ${documentType} (${methodology}):

Structure:
1. Executive Summary - Brief overview of the document purpose and key decisions
2. Context - Background information and business drivers
3. Detailed Sections - As specified in the ${methodology} methodology
4. Risks and Mitigations - Key risks identified and response strategies
5. Next Steps - Clear actions and owners

Quality Indicators:
- Uses ${methodology} terminology consistently
- Includes measurable success criteria
- Aligns with organizational standards
- Provides clear accountability
- Addresses all mandatory sections per ${methodology}

Common Mistakes to Avoid:
- Vague or unmeasurable objectives
- Missing stakeholder analysis
- Incomplete risk assessment
- Lack of clear roles and responsibilities
- No success criteria or KPIs`
  }

  /**
   * Estimates token count for a string
   */
  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4)
  }

  /**
   * Trims sections to fit within token limit
   */
  private trimToTokenLimit(sections: ContextSection[], maxTokens: number): string {
    let totalTokens = 0
    const includedSections: string[] = []
    
    for (const section of sections) {
      if (totalTokens + section.tokens <= maxTokens) {
        includedSections.push(section.content)
        totalTokens += section.tokens
      } else {
        // Try to include partial content if high priority
        if (section.priority >= 9) {
          const remainingTokens = maxTokens - totalTokens
          const partialContent = this.truncateToTokens(section.content, remainingTokens)
          if (partialContent) {
            includedSections.push(partialContent)
          }
        }
        break
      }
    }
    
    return includedSections.join('\n\n---\n\n')
  }

  /**
   * Truncates content to approximately the specified token count
   */
  private truncateToTokens(content: string, maxTokens: number): string {
    const estimatedChars = maxTokens * 4
    if (content.length <= estimatedChars) {
      return content
    }
    
    // Try to truncate at a sentence boundary
    const truncated = content.substring(0, estimatedChars)
    const lastPeriod = truncated.lastIndexOf('.')
    if (lastPeriod > estimatedChars * 0.8) {
      return truncated.substring(0, lastPeriod + 1)
    }
    
    return truncated + '...'
  }

  /**
   * Validates that context meets quality standards
   */
  validateContext(context: string, requirements: {
    minTokens?: number
    maxTokens?: number
    requiredSections?: string[]
  }): { valid: boolean; issues: string[] } {
    const issues: string[] = []
    const tokens = this.estimateTokens(context)
    
    if (requirements.minTokens && tokens < requirements.minTokens) {
      issues.push(`Context too short: ${tokens} tokens (minimum: ${requirements.minTokens})`)
    }
    
    if (requirements.maxTokens && tokens > requirements.maxTokens) {
      issues.push(`Context too long: ${tokens} tokens (maximum: ${requirements.maxTokens})`)
    }
    
    if (requirements.requiredSections) {
      for (const section of requirements.requiredSections) {
        if (!context.toLowerCase().includes(section.toLowerCase())) {
          issues.push(`Missing required section: ${section}`)
        }
      }
    }
    
    return {
      valid: issues.length === 0,
      issues
    }
  }
}