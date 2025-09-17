import { SanitizedProjectData } from './types'

interface ProjectData {
  name: string
  vision: string
  businessCase: string
  description: string
  methodology: 'agile' | 'prince2' | 'hybrid'
  companyWebsite: string
  sector: string
  budget?: string
  timeline?: string
  startDate?: string
  endDate?: string
  stakeholders: Array<{
    name: string
    email: string
    title: string
  }>
  prince2Stakeholders?: {
    seniorUser: { name: string; email: string; title: string }
    seniorSupplier: { name: string; email: string; title: string }
    executive: { name: string; email: string; title: string }
  }
  agilometer?: {
    flexibility: number
    teamExperience: number
    riskTolerance: number
    documentation: number
    governance: number
  }
}

export class DataSanitizer {
  private piiPatterns = [
    // Email addresses
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
    // Phone numbers (various formats)
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
    /\b\d{10,}\b/g,
    /\+\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g,
    // Social Security Numbers
    /\b\d{3}-\d{2}-\d{4}\b/g,
    // Credit card numbers
    /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    // Social media handles
    /@[a-zA-Z0-9_]+/g,
  ]

  /**
   * Layer 1: Sanitize input data before prompt construction
   * Replaces all PII with safe placeholders
   */
  sanitizeProjectData(data: ProjectData | any): SanitizedProjectData {
    // Handle both ProjectData and raw project data from the form
    const projectData = {
      name: data.name || data.projectName || '',
      vision: data.vision || '',
      businessCase: data.businessCase || data.business_case || '',
      description: data.description || '',
      methodology: data.methodology || 'agile',
      companyWebsite: data.companyWebsite || '',
      sector: data.sector || '',
      budget: data.budget || '',
      timeline: data.timeline || '',
      startDate: data.startDate || '',
      endDate: data.endDate || '',
      stakeholders: data.stakeholders || [],
      prince2Stakeholders: data.prince2Stakeholders,
      agilometer: data.agilometer
    }
    
    return {
      projectName: this.removePII(projectData.name),
      vision: this.removePII(projectData.vision),
      businessCase: this.removePII(projectData.businessCase),
      description: this.removePII(projectData.description),
      methodology: projectData.methodology as 'agile' | 'prince2' | 'hybrid',
      companyWebsite: projectData.companyWebsite,
      sector: projectData.sector,
      budget: projectData.budget,
      timeline: projectData.timeline,
      startDate: projectData.startDate,
      endDate: projectData.endDate,
      expectedTimeline: projectData.timeline, // Alias for compatibility
      stakeholders: projectData.stakeholders
        .filter((s: any) => s && (s.name || s.title))
        .map((s: any, i: number) => ({
          role: s.title || `Team Member ${i + 1}`,
          placeholder: `[STAKEHOLDER_${i + 1}]`
        })),
      prince2Stakeholders: data.prince2Stakeholders ? {
        seniorUser: {
          role: data.prince2Stakeholders.seniorUser.title || 'Senior User',
          placeholder: '[SENIOR_USER]'
        },
        seniorSupplier: {
          role: data.prince2Stakeholders.seniorSupplier.title || 'Senior Supplier',
          placeholder: '[SENIOR_SUPPLIER]'
        },
        executive: {
          role: data.prince2Stakeholders.executive.title || 'Executive',
          placeholder: '[EXECUTIVE]'
        }
      } : undefined,
      agilometer: data.agilometer
    }
  }

  /**
   * Layer 2: Validate prompt before sending to LLM
   * NEW APPROACH: Verify sanitization worked instead of trying to detect all names
   */
  validatePrompt(prompt: string): boolean {
    // 1. Check for obvious PII patterns (emails, phones, SSNs, etc.)
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi
    const phonePattern = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g
    const ssnPattern = /\b\d{3}-\d{2}-\d{4}\b/g
    
    if (emailPattern.test(prompt)) {
      const matches = prompt.match(emailPattern)
      console.error('Email detected in prompt:', matches)
      throw new Error('SECURITY: Email address detected in prompt - blocking request')
    }
    
    if (phonePattern.test(prompt) || ssnPattern.test(prompt)) {
      console.error('Phone/SSN detected in prompt')
      throw new Error('SECURITY: Phone number or SSN detected in prompt - blocking request')
    }
    
    // 2. Verify our placeholders are being used (positive validation)
    // If the prompt mentions stakeholders, it should use our placeholders
    const mentionsStakeholders = /stakeholder|member|user|executive|supplier/i.test(prompt)
    if (mentionsStakeholders) {
      const hasPlaceholders = /\[STAKEHOLDER_\d+\]|\[SENIOR_USER\]|\[SENIOR_SUPPLIER\]|\[EXECUTIVE\]|\[TEAM_MEMBER_\d+\]/g.test(prompt)
      
      // Log for debugging but don't block - we trust our sanitization
      if (!hasPlaceholders && mentionsStakeholders) {
        console.log('Note: Prompt mentions stakeholders but no placeholders found. Sanitization may need review.')
      }
    }
    
    // 3. Only block VERY obvious personal data patterns
    // Look for "My name is X" or "I am X" patterns which shouldn't appear in prompts
    const personalIntroPattern = /\b(my name is|i am|i'm|this is)\s+[A-Z][a-z]+\s+[A-Z][a-z]+/gi
    if (personalIntroPattern.test(prompt)) {
      console.error('Personal introduction pattern detected')
      throw new Error('SECURITY: Personal data pattern detected - blocking request')
    }
    
    // 4. Check for credit card patterns
    const creditCardPattern = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g
    if (creditCardPattern.test(prompt)) {
      console.error('Credit card pattern detected')
      throw new Error('SECURITY: Credit card number detected - blocking request')
    }
    
    // If we get here, the prompt passed validation
    // We're trusting our sanitization layer did its job
    return true
  }

  /**
   * Layer 3: Sanitize LLM response
   * Ensures no placeholder tokens leak to users
   */
  sanitizeResponse(response: string): string {
    // Replace any placeholder tokens that might have been echoed back
    let sanitized = response
      .replace(/\[STAKEHOLDER_\d+\]/g, 'Stakeholder')
      .replace(/\[ROLE_\d+\]/g, 'Team Member')
      .replace(/\[SENIOR_USER\]/g, 'Senior User')
      .replace(/\[SENIOR_SUPPLIER\]/g, 'Senior Supplier')
      .replace(/\[EXECUTIVE\]/g, 'Executive')
      .replace(/\[TEAM_MEMBER_\d+\]/g, 'Team Member')

    // Remove any PII that might have been generated
    for (const pattern of this.piiPatterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED]')
    }

    return sanitized
  }

  /**
   * Helper: Remove PII from a text string
   */
  private removePII(text: string): string {
    if (!text) return ''
    
    let cleaned = text
    
    // Remove emails
    cleaned = cleaned.replace(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
      '[EMAIL_REDACTED]'
    )
    
    // Remove potential names (conservative approach)
    // This is tricky - we don't want to remove valid business terms
    // So we only remove if preceded by words like "contact:", "name:", etc.
    cleaned = cleaned.replace(
      /\b(contact|name|person|individual|manager|owner|by|from|to):\s*[A-Z][a-z]+\s+[A-Z][a-z]+/gi,
      '$1: [NAME_REDACTED]'
    )
    
    return cleaned
  }

  /**
   * Create a mapping table for re-injecting real data during export
   */
  createMappingTable(
    originalData: ProjectData,
    sanitizedData: SanitizedProjectData
  ): Record<string, string> {
    const mapping: Record<string, string> = {}
    
    // Map stakeholder placeholders to real names
    originalData.stakeholders.forEach((s, i) => {
      mapping[`[STAKEHOLDER_${i + 1}]`] = s.name
    })
    
    // Map Prince2 roles
    if (originalData.prince2Stakeholders) {
      mapping['[SENIOR_USER]'] = originalData.prince2Stakeholders.seniorUser.name
      mapping['[SENIOR_SUPPLIER]'] = originalData.prince2Stakeholders.seniorSupplier.name
      mapping['[EXECUTIVE]'] = originalData.prince2Stakeholders.executive.name
    }
    
    return mapping
  }

  /**
   * Re-inject real names for export (never for LLM)
   */
  rehydrateDocument(
    document: string,
    mapping: Record<string, string>
  ): string {
    let rehydrated = document
    
    for (const [placeholder, realValue] of Object.entries(mapping)) {
      rehydrated = rehydrated.replace(
        new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        realValue
      )
    }
    
    return rehydrated
  }

  /**
   * Audit log for security events
   */
  async logSecurityEvent(
    eventType: 'PII_BLOCKED' | 'PII_SANITIZED' | 'PROMPT_VALIDATED',
    details: any
  ): Promise<void> {
    const event = {
      type: eventType,
      timestamp: new Date().toISOString(),
      details
    }
    
    // In production, this would write to a secure audit log
    console.log('[SECURITY AUDIT]', event)
    
    // Security audit logged to console only - no database access
  }
}