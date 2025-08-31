/**
 * JSON Response Normalizer for GPT-5
 * 
 * GPT-5 sometimes returns JSON with different field naming conventions
 * This module normalizes responses to match our Zod schemas
 */

import { documentLogger } from '../utils/document-logger'

export class ResponseNormalizer {
  /**
   * Convert any field naming convention to camelCase
   */
  private toCamelCase(str: string): string {
    // Handle already camelCase
    if (/^[a-z][a-zA-Z0-9]*$/.test(str)) {
      return str
    }
    
    // Handle PascalCase
    if (/^[A-Z][a-zA-Z0-9]*$/.test(str) && !str.includes(' ') && !str.includes('_')) {
      return str.charAt(0).toLowerCase() + str.slice(1)
    }
    
    // Handle space-separated or underscore (Executive Summary -> executiveSummary)
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => 
        index === 0 ? word.toLowerCase() : word.toUpperCase()
      )
      .replace(/[\s_-]+/g, '')
  }

  /**
   * Recursively normalize object keys to camelCase
   */
  private normalizeKeys(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.normalizeKeys(item))
    }

    if (typeof obj !== 'object') {
      return obj
    }

    const normalized: Record<string, any> = {}
    
    for (const [key, value] of Object.entries(obj)) {
      const normalizedKey = this.toCamelCase(key)
      normalized[normalizedKey] = this.normalizeKeys(value)
    }

    return normalized
  }

  /**
   * Fix common GPT-5 JSON issues
   */
  private fixCommonIssues(jsonString: string): string {
    let fixed = jsonString

    // Remove any markdown code blocks
    fixed = fixed.replace(/```json\n?/gi, '').replace(/```\n?/g, '')

    // Remove any leading/trailing whitespace
    fixed = fixed.trim()

    // Fix unescaped quotes in strings (common GPT-5 issue)
    // This is a simplified fix - may need more sophistication
    fixed = fixed.replace(/([^\\])"([^"]*)"([^"]*)"/, '$1\\"$2\\"$3"')

    // Ensure the response starts and ends with curly braces or square brackets
    if (!fixed.startsWith('{') && !fixed.startsWith('[')) {
      // Try to find JSON object in the response
      const jsonMatch = fixed.match(/(\{[\s\S]*\}|\[[\s\S]*\])/m)
      if (jsonMatch) {
        fixed = jsonMatch[1]
      }
    }

    return fixed
  }

  /**
   * Attempt to parse and normalize JSON response
   */
  parseAndNormalize(response: string): any {
    documentLogger.debug('JSON_NORMALIZER', 'Attempting to parse response', {
      responseLength: response.length,
      preview: response.substring(0, 100)
    })

    // First, try to parse as-is
    try {
      const parsed = JSON.parse(response)
      const normalized = this.normalizeKeys(parsed)
      documentLogger.debug('JSON_NORMALIZER', 'Successfully parsed and normalized on first attempt')
      return normalized
    } catch (firstError) {
      documentLogger.warn('JSON_NORMALIZER', 'Initial parse failed, attempting fixes', {
        error: (firstError as Error).message
      })
    }

    // Second attempt: fix common issues
    try {
      const fixed = this.fixCommonIssues(response)
      const parsed = JSON.parse(fixed)
      const normalized = this.normalizeKeys(parsed)
      documentLogger.info('JSON_NORMALIZER', 'Successfully parsed after fixes')
      return normalized
    } catch (secondError) {
      documentLogger.warn('JSON_NORMALIZER', 'Parse failed after fixes', {
        error: (secondError as Error).message
      })
    }

    // Third attempt: try to extract and fix valid JSON from the response
    try {
      // Try to find the start of JSON
      const jsonStart = response.indexOf('{')
      if (jsonStart >= 0) {
        let candidate = response.substring(jsonStart)
        
        // Count brackets to balance them
        let openBrackets = 0
        let closeBrackets = 0
        let openSquare = 0
        let closeSquare = 0
        
        for (const char of candidate) {
          if (char === '{') openBrackets++
          if (char === '}') closeBrackets++
          if (char === '[') openSquare++
          if (char === ']') closeSquare++
        }
        
        // Balance brackets if needed
        if (openBrackets > closeBrackets) {
          candidate += '}'.repeat(openBrackets - closeBrackets)
        }
        if (openSquare > closeSquare) {
          candidate += ']'.repeat(openSquare - closeSquare)
        }
        
        try {
          const parsed = JSON.parse(candidate)
          const normalized = this.normalizeKeys(parsed)
          documentLogger.info('JSON_NORMALIZER', 'Successfully extracted and parsed JSON with bracket balancing')
          return normalized
        } catch {
          // Continue to error handling
        }
      }
    } catch (extractError) {
      documentLogger.error('JSON_NORMALIZER', 'Failed to extract valid JSON', extractError as Error)
    }

    // If all parsing attempts fail, throw with detailed error
    const error = new Error('Failed to parse JSON response after all attempts')
    documentLogger.error('JSON_NORMALIZER', 'All parsing attempts failed', error, {
      responsePreview: response.substring(0, 500)
    })
    throw error
  }

  /**
   * Map GPT-5 field names to expected schema field names
   * This handles specific known mappings that can't be handled by camelCase conversion
   */
  applyFieldMappings(obj: any, mappings: Record<string, string>): any {
    if (!obj || typeof obj !== 'object') {
      return obj
    }

    const mapped = { ...obj }

    for (const [from, to] of Object.entries(mappings)) {
      if (from in mapped && !(to in mapped)) {
        mapped[to] = mapped[from]
        delete mapped[from]
      }
    }

    return mapped
  }

  /**
   * Ensure required fields exist with defaults
   */
  ensureRequiredFields(obj: any, requiredFields: Record<string, any>): any {
    const withDefaults = { ...obj }

    for (const [field, defaultValue] of Object.entries(requiredFields)) {
      if (!(field in withDefaults)) {
        documentLogger.warn('JSON_NORMALIZER', `Missing required field: ${field}, using default`, {
          defaultValue
        })
        withDefaults[field] = defaultValue
      }
    }

    return withDefaults
  }

  /**
   * Validate and fix specific document types
   */
  normalizeAgileCharter(response: string): any {
    const normalized = this.parseAndNormalize(response)
    
    // Apply specific mappings for Agile Charter
    const mappings = {
      'Executive Summary': 'executiveSummary',
      'Vision and Objectives': 'visionAndObjectives',
      'Success Criteria': 'successCriteria',
      'Success Criteria & KPIs': 'successCriteria',
      'Scope Statement': 'scope',
      'Key Deliverables': 'deliverables',
      'Stakeholder Analysis': 'stakeholderAnalysis',
      'Team Structure': 'teamStructure',
      'Team Structure & Roles': 'teamStructure',
      'High-Level Timeline': 'timeline',
      'Initial Risk Assessment': 'risks',
      'Top Risks': 'risks',
      'Assumptions & Dependencies': 'dependencies',
      'Communication Plan': 'communicationPlan',
      'Definition of Done': 'definitionOfDone'
    }

    let result = this.applyFieldMappings(normalized, mappings)
    
    // Fix nested structure issues
    if (result.scope && typeof result.scope === 'object') {
      // Handle nested scope structure
      if (result.scope['In Scope']) {
        result.scope.inScope = result.scope['In Scope']
        delete result.scope['In Scope']
      }
      if (result.scope['Out of Scope']) {
        result.scope.outOfScope = result.scope['Out of Scope']
        delete result.scope['Out of Scope']
      }
      if (result.scope.Assumptions) {
        result.scope.assumptions = result.scope.Assumptions
        delete result.scope.Assumptions
      }
      if (result.scope.Constraints) {
        result.scope.constraints = result.scope.Constraints
        delete result.scope.Constraints
      }
    }
    
    // Handle other nested structures
    if (result.risks && typeof result.risks === 'object' && result.risks['Top Risks']) {
      result.risks = result.risks['Top Risks']
    }
    
    if (result.timeline && typeof result.timeline === 'object' && result.timeline.Phases) {
      result.timeline.phases = result.timeline.Phases
      delete result.timeline.Phases
    }
    
    // Ensure required top-level fields
    const withDefaults = this.ensureRequiredFields(result, {
      executiveSummary: 'Project summary not available',
      visionAndObjectives: { vision: 'Vision not specified', objectives: [] },
      scope: { inScope: [], outOfScope: [], assumptions: [], constraints: [] },
      deliverables: [],
      stakeholderAnalysis: [],
      teamStructure: { productOwner: '[PRODUCT_OWNER]', scrumMaster: '[SCRUM_MASTER]', developmentTeam: [] },
      timeline: { startDate: new Date().toISOString(), endDate: new Date().toISOString(), sprints: 4, sprintDuration: 2, keyMilestones: [] },
      risks: [],
      dependencies: [],
      communicationPlan: { ceremonies: [], reports: [] },
      definitionOfDone: [],
      successCriteria: []
    })

    return withDefaults
  }

  /**
   * Normalize Product Backlog response
   */
  normalizeProductBacklog(response: string): any {
    const normalized = this.parseAndNormalize(response)
    
    // Ensure it has the expected structure
    if (Array.isArray(normalized)) {
      // If response is just an array of stories, wrap it
      return {
        stories: normalized,
        epics: []
      }
    }

    return this.ensureRequiredFields(normalized, {
      stories: [],
      epics: []
    })
  }

  /**
   * Generic document normalization with type detection
   */
  normalizeDocument(response: string, documentType: string): any {
    documentLogger.info('JSON_NORMALIZER', `Normalizing ${documentType} document`)

    switch (documentType) {
      case 'charter':
        return this.normalizeAgileCharter(response)
      case 'backlog':
        return this.normalizeProductBacklog(response)
      case 'risk_register':
        return this.normalizeRiskRegister(response)
      case 'pid':
        return this.normalizePID(response)
      default:
        // Generic normalization
        return this.parseAndNormalize(response)
    }
  }

  /**
   * Normalize Risk Register
   */
  private normalizeRiskRegister(response: string): any {
    const normalized = this.parseAndNormalize(response)
    
    // Handle if it's just an array of risks
    if (Array.isArray(normalized)) {
      return { risks: normalized }
    }

    return this.ensureRequiredFields(normalized, {
      risks: []
    })
  }

  /**
   * Normalize PID
   */
  private normalizePID(response: string): any {
    const normalized = this.parseAndNormalize(response)
    
    const mappings = {
      'Project Definition': 'projectDefinition',
      'Business Case': 'businessCase',
      'Project Organization': 'projectOrganization',
      'Quality Management Strategy': 'qualityManagementStrategy',
      'Configuration Management Strategy': 'configurationManagementStrategy',
      'Risk Management Strategy': 'riskManagementStrategy',
      'Communication Management Strategy': 'communicationManagementStrategy',
      'Project Plan': 'projectPlan',
      'Project Controls': 'projectControls',
      'Tailoring': 'tailoring'
    }

    return this.applyFieldMappings(normalized, mappings)
  }
}

export const responseNormalizer = new ResponseNormalizer()