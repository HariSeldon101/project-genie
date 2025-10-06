// lib/company-intelligence/types/schema-templates.ts
/**
 * Schema Templates for Quick Intelligence Extraction
 * CLAUDE.md Compliant - Using enums for all categories
 * From specification: full-CI-Data-Gathering-Architecture-Sept-24-Stu.md
 */

import { z } from 'zod'
import { IntelligenceCategory, IntelligenceDepth, IconName } from './intelligence-enums'
import { getTotalCredits } from './intelligence-categories'

/**
 * Template metadata for quick schema selection
 * @interface SchemaTemplate
 */
export interface SchemaTemplate {
  id: string
  name: string
  description: string
  icon: IconName
  categories: IntelligenceCategory[]
  depth: IntelligenceDepth
  estimatedCredits: number
  estimatedPages: number
  recommended: boolean
}

/**
 * Pre-defined schema templates for common use cases
 * As specified in full-CI-Data-Gathering-Architecture-Sept-24-Stu.md
 * @const SCHEMA_TEMPLATES
 */
export const SCHEMA_TEMPLATES: Record<string, SchemaTemplate> = {
  saas_basic: {
    id: 'saas_basic',
    name: 'SaaS Basic',
    description: 'Essential information for SaaS companies - products, pricing, and features',
    icon: IconName.PACKAGE,
    categories: [
      IntelligenceCategory.PRODUCTS,
      IntelligenceCategory.PRICING,
      IntelligenceCategory.FEATURES
    ],
    depth: IntelligenceDepth.QUICK,
    estimatedCredits: 30,
    estimatedPages: 15,
    recommended: true
  },

  saas_complete: {
    id: 'saas_complete',
    name: 'SaaS Complete',
    description: 'Comprehensive SaaS analysis including competitive positioning and case studies',
    icon: IconName.LAYERS,
    categories: [
      IntelligenceCategory.CORPORATE,
      IntelligenceCategory.PRODUCTS,
      IntelligenceCategory.PRICING,
      IntelligenceCategory.FEATURES,
      IntelligenceCategory.INTEGRATIONS,
      IntelligenceCategory.CASE_STUDIES,
      IntelligenceCategory.COMPETITORS
    ],
    depth: IntelligenceDepth.STANDARD,
    estimatedCredits: 75,
    estimatedPages: 40,
    recommended: true
  },

  competitive_analysis: {
    id: 'competitive_analysis',
    name: 'Competitive Analysis',
    description: 'Focus on competitive intelligence, positioning, and market analysis',
    icon: IconName.SWORDS,
    categories: [
      IntelligenceCategory.COMPETITORS,
      IntelligenceCategory.PRICING,
      IntelligenceCategory.FEATURES,
      IntelligenceCategory.MARKET_POSITION,
      IntelligenceCategory.CASE_STUDIES
    ],
    depth: IntelligenceDepth.COMPETITIVE,
    estimatedCredits: 50,
    estimatedPages: 30,
    recommended: false
  },

  enterprise_deep: {
    id: 'enterprise_deep',
    name: 'Enterprise Deep Dive',
    description: 'Detailed enterprise analysis including team, compliance, and partnerships',
    icon: IconName.BUILDING,
    categories: [
      IntelligenceCategory.CORPORATE,
      IntelligenceCategory.TEAM,
      IntelligenceCategory.COMPLIANCE,
      IntelligenceCategory.PARTNERSHIPS,
      IntelligenceCategory.INVESTORS,
      IntelligenceCategory.FINANCIAL
    ],
    depth: IntelligenceDepth.DEEP,
    estimatedCredits: 100,
    estimatedPages: 60,
    recommended: false
  },

  technical_assessment: {
    id: 'technical_assessment',
    name: 'Technical Assessment',
    description: 'Technical stack, integrations, compliance, and support infrastructure',
    icon: IconName.BRAIN,
    categories: [
      IntelligenceCategory.TECHNICAL,
      IntelligenceCategory.INTEGRATIONS,
      IntelligenceCategory.COMPLIANCE,
      IntelligenceCategory.SUPPORT
    ],
    depth: IntelligenceDepth.STANDARD,
    estimatedCredits: 40,
    estimatedPages: 25,
    recommended: false
  }
}

/**
 * Get template by ID
 * @param {string} templateId - Template identifier
 * @returns {SchemaTemplate | undefined} Template or undefined if not found
 */
export function getTemplateById(templateId: string): SchemaTemplate | undefined {
  return SCHEMA_TEMPLATES[templateId]
}

/**
 * Get all recommended templates
 * @returns {SchemaTemplate[]} Array of recommended templates
 */
export function getRecommendedTemplates(): SchemaTemplate[] {
  return Object.values(SCHEMA_TEMPLATES).filter(template => template.recommended)
}

/**
 * Get templates by depth level
 * @param {IntelligenceDepth} depth - Depth level to filter by
 * @returns {SchemaTemplate[]} Templates matching the depth
 */
export function getTemplatesByDepth(depth: IntelligenceDepth): SchemaTemplate[] {
  return Object.values(SCHEMA_TEMPLATES).filter(template => template.depth === depth)
}

/**
 * Calculate actual credits for a template based on current pricing
 * @param {string} templateId - Template identifier
 * @returns {number} Actual credit cost
 */
export function calculateTemplateCredits(templateId: string): number {
  const template = SCHEMA_TEMPLATES[templateId]
  if (!template) return 0
  
  // Use the actual getTotalCredits function for accurate calculation
  return getTotalCredits(template.categories)
}

/**
 * Build extraction schema from template
 * Combines all category schemas into a unified Zod schema
 * @param {string} templateId - Template identifier
 * @returns {z.ZodSchema | null} Combined Zod schema or null if invalid
 */
export function buildSchemaFromTemplate(templateId: string): z.ZodSchema | null {
  const template = SCHEMA_TEMPLATES[templateId]
  if (!template) return null

  // Import the category schemas dynamically to avoid circular dependency
  // In production, this would combine the Zod schemas from each category
  // For now, returning a basic schema structure
  const schemaShape: Record<string, any> = {}
  
  template.categories.forEach(category => {
    // Each category adds its extraction fields to the combined schema
    // This will be populated when we convert to Zod schemas
    schemaShape[category] = z.object({
      items: z.array(z.any()),
      confidence: z.number().min(0).max(1),
      sources: z.array(z.string().url())
    })
  })

  return z.object(schemaShape)
}

/**
 * Validate template selection against available credits
 * @param {string} templateId - Template identifier
 * @param {number} availableCredits - User's available credits
 * @returns {boolean} True if user has sufficient credits
 */
export function validateTemplateCredits(templateId: string, availableCredits: number): boolean {
  const template = SCHEMA_TEMPLATES[templateId]
  if (!template) return false
  
  const requiredCredits = calculateTemplateCredits(templateId)
  return availableCredits >= requiredCredits
}

/**
 * Get template suggestions based on domain analysis
 * @param {string} domain - Domain being analyzed
 * @param {string[]} technologies - Detected technologies
 * @returns {string[]} Suggested template IDs
 */
export function suggestTemplates(domain: string, technologies: string[] = []): string[] {
  const suggestions: string[] = []
  
  // SaaS indicators
  const saasIndicators = ['stripe', 'auth0', 'segment', 'intercom', 'zendesk']
  const hasSaasIndicators = technologies.some(tech => 
    saasIndicators.includes(tech.toLowerCase())
  )
  
  if (hasSaasIndicators) {
    suggestions.push('saas_complete')
  } else {
    suggestions.push('saas_basic')
  }
  
  // Enterprise indicators
  const enterpriseIndicators = ['salesforce', 'oracle', 'sap', 'microsoft']
  const hasEnterpriseIndicators = technologies.some(tech =>
    enterpriseIndicators.some(indicator => tech.toLowerCase().includes(indicator))
  )
  
  if (hasEnterpriseIndicators) {
    suggestions.push('enterprise_deep')
  }
  
  // Technical indicators
  const techIndicators = ['github', 'gitlab', 'docker', 'kubernetes', 'aws', 'azure', 'gcp']
  const hasTechIndicators = technologies.some(tech =>
    techIndicators.includes(tech.toLowerCase())
  )
  
  if (hasTechIndicators) {
    suggestions.push('technical_assessment')
  }
  
  // Always suggest competitive analysis as an option
  if (!suggestions.includes('competitive_analysis')) {
    suggestions.push('competitive_analysis')
  }
  
  return suggestions.slice(0, 3) // Return top 3 suggestions
}

/**
 * Template validation result
 * @interface TemplateValidation
 */
export interface TemplateValidation {
  valid: boolean
  errors: string[]
  warnings: string[]
  estimatedDuration: number // in seconds
}

/**
 * Validate template configuration before execution
 * @param {string} templateId - Template identifier
 * @param {object} context - Validation context
 * @returns {TemplateValidation} Validation result
 */
export function validateTemplate(
  templateId: string, 
  context: {
    availableCredits: number
    maxPages?: number
    timeout?: number
  }
): TemplateValidation {
  const result: TemplateValidation = {
    valid: true,
    errors: [],
    warnings: [],
    estimatedDuration: 0
  }
  
  const template = SCHEMA_TEMPLATES[templateId]
  if (!template) {
    result.valid = false
    result.errors.push('Template not found')
    return result
  }
  
  // Check credits
  const requiredCredits = calculateTemplateCredits(templateId)
  if (requiredCredits > context.availableCredits) {
    result.valid = false
    result.errors.push(`Insufficient credits. Required: ${requiredCredits}, Available: ${context.availableCredits}`)
  }
  
  // Check page limits
  if (context.maxPages && template.estimatedPages > context.maxPages) {
    result.warnings.push(`Template suggests ${template.estimatedPages} pages, but limit is ${context.maxPages}`)
  }
  
  // Estimate duration (rough calculation: 2 seconds per page)
  result.estimatedDuration = template.estimatedPages * 2
  
  // Timeout warning
  if (context.timeout && result.estimatedDuration * 1000 > context.timeout) {
    result.warnings.push('Extraction may timeout with current settings')
  }
  
  return result
}

// Export all template IDs for type safety
export const TEMPLATE_IDS = Object.keys(SCHEMA_TEMPLATES) as readonly string[]

// Type for template ID
export type TemplateId = keyof typeof SCHEMA_TEMPLATES
