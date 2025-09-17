export interface ValidationResult {
  valid: boolean
  score: number
  issues: ValidationIssue[]
  suggestions: string[]
}

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info'
  category: string
  message: string
  location?: string
}

export interface QualityMetrics {
  completeness: number
  methodologyCompliance: number
  clarity: number
  specificity: number
  actionability: number
  consistency: number
}

export class QualityValidator {
  /**
   * Validates document quality across multiple dimensions
   */
  validateDocument(
    content: any,
    documentType: string,
    methodology: 'prince2' | 'agile' | 'hybrid'
  ): ValidationResult {
    const issues: ValidationIssue[] = []
    const suggestions: string[] = []
    
    // Parse content if it's a string
    const doc = typeof content === 'string' ? this.tryParseJSON(content) : content
    
    // Perform validation checks
    const metrics = this.calculateMetrics(doc, documentType, methodology)
    const structureValid = this.validateStructure(doc, documentType, issues)
    const methodologyValid = this.validateMethodologyCompliance(doc, methodology, issues)
    const contentValid = this.validateContent(doc, documentType, issues)
    
    // Generate suggestions based on issues
    this.generateSuggestions(issues, metrics, suggestions)
    
    // Calculate overall score
    const score = this.calculateOverallScore(metrics)
    
    return {
      valid: structureValid && methodologyValid && contentValid && score >= 70,
      score,
      issues,
      suggestions
    }
  }

  /**
   * Calculate quality metrics
   */
  private calculateMetrics(
    doc: any,
    documentType: string,
    methodology: string
  ): QualityMetrics {
    return {
      completeness: this.assessCompleteness(doc, documentType),
      methodologyCompliance: this.assessMethodologyCompliance(doc, methodology),
      clarity: this.assessClarity(doc),
      specificity: this.assessSpecificity(doc),
      actionability: this.assessActionability(doc),
      consistency: this.assessConsistency(doc)
    }
  }

  /**
   * Validate document structure
   */
  private validateStructure(
    doc: any,
    documentType: string,
    issues: ValidationIssue[]
  ): boolean {
    let valid = true
    
    // Check for required sections based on document type
    const requiredSections = this.getRequiredSections(documentType)
    
    for (const section of requiredSections) {
      if (!this.hasSection(doc, section)) {
        issues.push({
          severity: 'error',
          category: 'structure',
          message: `Missing required section: ${section}`,
          location: section
        })
        valid = false
      }
    }
    
    // Check for empty sections
    this.checkForEmptySections(doc, issues)
    
    return valid
  }

  /**
   * Validate methodology compliance
   */
  private validateMethodologyCompliance(
    doc: any,
    methodology: string,
    issues: ValidationIssue[]
  ): boolean {
    let valid = true
    
    if (methodology === 'prince2' || methodology === 'hybrid') {
      valid = this.validatePrince2Compliance(doc, issues) && valid
    }
    
    if (methodology === 'agile' || methodology === 'hybrid') {
      valid = this.validateAgileCompliance(doc, issues) && valid
    }
    
    return valid
  }

  /**
   * Validate PRINCE2 compliance
   */
  private validatePrince2Compliance(doc: any, issues: ValidationIssue[]): boolean {
    let valid = true
    
    // Check for PRINCE2 terminology
    const prince2Terms = ['tolerance', 'stage', 'exception', 'product', 'baseline']
    const contentStr = JSON.stringify(doc).toLowerCase()
    
    let termsFound = 0
    for (const term of prince2Terms) {
      if (contentStr.includes(term)) {
        termsFound++
      }
    }
    
    if (termsFound < 2) {
      issues.push({
        severity: 'warning',
        category: 'methodology',
        message: 'Document lacks PRINCE2 terminology and concepts'
      })
    }
    
    // Check for roles
    if (!contentStr.includes('executive') && !contentStr.includes('senior user')) {
      issues.push({
        severity: 'warning',
        category: 'methodology',
        message: 'PRINCE2 roles not properly defined'
      })
    }
    
    // Check for business justification
    if (!this.hasBusinessJustification(doc)) {
      issues.push({
        severity: 'error',
        category: 'methodology',
        message: 'Missing continued business justification (PRINCE2 principle)'
      })
      valid = false
    }
    
    return valid
  }

  /**
   * Validate Agile compliance
   */
  private validateAgileCompliance(doc: any, issues: ValidationIssue[]): boolean {
    let valid = true
    
    const contentStr = JSON.stringify(doc).toLowerCase()
    
    // Check for Agile terminology
    const agileTerms = ['sprint', 'iteration', 'user story', 'backlog', 'scrum', 'velocity']
    let termsFound = 0
    
    for (const term of agileTerms) {
      if (contentStr.includes(term)) {
        termsFound++
      }
    }
    
    if (termsFound < 2) {
      issues.push({
        severity: 'warning',
        category: 'methodology',
        message: 'Document lacks Agile terminology and concepts'
      })
    }
    
    // Check for iterative approach
    if (!contentStr.includes('iterative') && !contentStr.includes('increment')) {
      issues.push({
        severity: 'warning',
        category: 'methodology',
        message: 'Missing iterative/incremental delivery approach'
      })
    }
    
    // Check for value focus
    if (!contentStr.includes('value') && !contentStr.includes('outcome')) {
      issues.push({
        severity: 'warning',
        category: 'methodology',
        message: 'Insufficient focus on value delivery'
      })
    }
    
    return valid
  }

  /**
   * Validate content quality
   */
  private validateContent(doc: any, documentType: string, issues: ValidationIssue[]): boolean {
    let valid = true
    
    // Check for vague language
    const vagueTerms = ['maybe', 'possibly', 'might', 'could be', 'somewhat', 'various']
    const contentStr = JSON.stringify(doc).toLowerCase()
    
    for (const term of vagueTerms) {
      if (contentStr.includes(term)) {
        issues.push({
          severity: 'info',
          category: 'clarity',
          message: `Avoid vague language: "${term}" found in document`
        })
      }
    }
    
    // Check for measurable objectives
    if (!this.hasMeasurableObjectives(doc)) {
      issues.push({
        severity: 'error',
        category: 'content',
        message: 'Objectives lack measurable success criteria'
      })
      valid = false
    }
    
    // Check for risk identification
    if (!this.hasRiskAnalysis(doc)) {
      issues.push({
        severity: 'warning',
        category: 'content',
        message: 'Insufficient risk analysis'
      })
    }
    
    return valid
  }

  /**
   * Assess completeness score
   */
  private assessCompleteness(doc: any, documentType: string): number {
    const requiredSections = this.getRequiredSections(documentType)
    let foundSections = 0
    
    for (const section of requiredSections) {
      if (this.hasSection(doc, section)) {
        foundSections++
      }
    }
    
    return (foundSections / requiredSections.length) * 100
  }

  /**
   * Assess methodology compliance score
   */
  private assessMethodologyCompliance(doc: any, methodology: string): number {
    const contentStr = JSON.stringify(doc).toLowerCase()
    let score = 50 // Base score
    
    if (methodology === 'prince2' || methodology === 'hybrid') {
      const prince2Indicators = [
        'tolerance', 'stage', 'exception', 'product', 'baseline',
        'executive', 'senior user', 'senior supplier', 'business case'
      ]
      
      for (const indicator of prince2Indicators) {
        if (contentStr.includes(indicator)) {
          score += 6.25 // 50 points distributed across 8 indicators
        }
      }
    }
    
    if (methodology === 'agile' || methodology === 'hybrid') {
      const agileIndicators = [
        'sprint', 'iteration', 'user story', 'backlog',
        'velocity', 'retrospective', 'daily', 'demo'
      ]
      
      for (const indicator of agileIndicators) {
        if (contentStr.includes(indicator)) {
          score += 6.25
        }
      }
    }
    
    return Math.min(100, score)
  }

  /**
   * Assess clarity score
   */
  private assessClarity(doc: any): number {
    const contentStr = JSON.stringify(doc)
    let score = 100
    
    // Deduct for vague language
    const vagueTerms = ['maybe', 'possibly', 'might', 'could be', 'somewhat']
    for (const term of vagueTerms) {
      if (contentStr.toLowerCase().includes(term)) {
        score -= 5
      }
    }
    
    // Deduct for overly complex sentences (simplified check)
    const sentences = contentStr.split(/[.!?]/)
    const avgWordsPerSentence = contentStr.split(' ').length / sentences.length
    if (avgWordsPerSentence > 30) {
      score -= 10
    }
    
    return Math.max(0, score)
  }

  /**
   * Assess specificity score
   */
  private assessSpecificity(doc: any): number {
    const contentStr = JSON.stringify(doc)
    let score = 0
    
    // Check for specific metrics
    if (/\d+\s*(days|weeks|months|hours)/.test(contentStr)) score += 20
    if (/\$\d+/.test(contentStr) || /\d+\s*%/.test(contentStr)) score += 20
    if (/\d+\s*(users|people|resources)/.test(contentStr)) score += 20
    
    // Check for named roles/responsibilities
    if (/\[[\w_]+\]/.test(contentStr)) score += 20
    
    // Check for specific dates or milestones
    if (/Q\d\s+\d{4}|Phase\s+\d|Sprint\s+\d/.test(contentStr)) score += 20
    
    return score
  }

  /**
   * Assess actionability score
   */
  private assessActionability(doc: any): number {
    const contentStr = JSON.stringify(doc).toLowerCase()
    let score = 0
    
    // Check for action verbs
    const actionVerbs = [
      'implement', 'create', 'develop', 'deploy', 'test',
      'review', 'approve', 'validate', 'execute', 'deliver'
    ]
    
    for (const verb of actionVerbs) {
      if (contentStr.includes(verb)) {
        score += 10
      }
    }
    
    return Math.min(100, score)
  }

  /**
   * Assess consistency score
   */
  private assessConsistency(doc: any): number {
    // Simplified consistency check
    // In production, would check for consistent terminology, formatting, etc.
    return 80 // Default reasonable score
  }

  /**
   * Calculate overall quality score
   */
  private calculateOverallScore(metrics: QualityMetrics): number {
    const weights = {
      completeness: 0.25,
      methodologyCompliance: 0.20,
      clarity: 0.15,
      specificity: 0.15,
      actionability: 0.15,
      consistency: 0.10
    }
    
    let weightedScore = 0
    for (const [metric, value] of Object.entries(metrics)) {
      weightedScore += value * weights[metric as keyof QualityMetrics]
    }
    
    return Math.round(weightedScore)
  }

  /**
   * Generate improvement suggestions
   */
  private generateSuggestions(
    issues: ValidationIssue[],
    metrics: QualityMetrics,
    suggestions: string[]
  ): void {
    // Completeness suggestions
    if (metrics.completeness < 80) {
      suggestions.push('Add missing sections to improve document completeness')
    }
    
    // Methodology suggestions
    if (metrics.methodologyCompliance < 70) {
      suggestions.push('Incorporate more methodology-specific terminology and concepts')
    }
    
    // Clarity suggestions
    if (metrics.clarity < 70) {
      suggestions.push('Replace vague language with specific, measurable statements')
    }
    
    // Specificity suggestions
    if (metrics.specificity < 60) {
      suggestions.push('Add specific metrics, timelines, and success criteria')
    }
    
    // Actionability suggestions
    if (metrics.actionability < 60) {
      suggestions.push('Include more actionable items with clear ownership')
    }
    
    // Issue-based suggestions
    const errorCount = issues.filter(i => i.severity === 'error').length
    if (errorCount > 0) {
      suggestions.push(`Address ${errorCount} critical issues before finalizing`)
    }
  }

  /**
   * Helper methods
   */
  private tryParseJSON(content: string): any {
    try {
      return JSON.parse(content)
    } catch {
      return content
    }
  }

  private getRequiredSections(documentType: string): string[] {
    const sectionMap: Record<string, string[]> = {
      'pid': ['project definition', 'business case', 'organization', 'quality', 'risk', 'plan'],
      'business case': ['executive summary', 'options', 'benefits', 'costs', 'risks'],
      'risk register': ['risks', 'mitigation', 'ownership', 'status'],
      'charter': ['vision', 'objectives', 'scope', 'stakeholders', 'success criteria'],
      'backlog': ['user stories', 'acceptance criteria', 'priority'],
      'sprint': ['goal', 'backlog', 'capacity', 'deliverables'],
      'technical landscape': ['current state', 'trends', 'stack', 'integration'],
      'comparable projects': ['projects', 'success factors', 'lessons', 'recommendations']
    }
    
    return sectionMap[documentType.toLowerCase()] || []
  }

  private hasSection(doc: any, section: string): boolean {
    const docStr = JSON.stringify(doc).toLowerCase()
    return docStr.includes(section.toLowerCase())
  }

  private checkForEmptySections(doc: any, issues: ValidationIssue[]): void {
    if (typeof doc === 'object') {
      for (const [key, value] of Object.entries(doc)) {
        if (value === null || value === '' || 
            (Array.isArray(value) && value.length === 0) ||
            (typeof value === 'object' && Object.keys(value).length === 0)) {
          issues.push({
            severity: 'warning',
            category: 'structure',
            message: `Empty section found: ${key}`,
            location: key
          })
        }
      }
    }
  }

  private hasBusinessJustification(doc: any): boolean {
    const docStr = JSON.stringify(doc).toLowerCase()
    return docStr.includes('business case') || 
           docStr.includes('business justification') ||
           docStr.includes('roi') ||
           docStr.includes('benefits')
  }

  private hasMeasurableObjectives(doc: any): boolean {
    const docStr = JSON.stringify(doc)
    // Check for numbers, percentages, or time-based metrics
    return /\d+\s*%/.test(docStr) || 
           /\d+\s*(days|weeks|months)/.test(docStr) ||
           /kpi|metric|measure|target/.test(docStr.toLowerCase())
  }

  private hasRiskAnalysis(doc: any): boolean {
    const docStr = JSON.stringify(doc).toLowerCase()
    return docStr.includes('risk') && 
           (docStr.includes('mitigation') || docStr.includes('response'))
  }
}