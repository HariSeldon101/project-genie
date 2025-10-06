// lib/company-intelligence/types/intelligence-categories.ts
/**
 * Intelligence Category Definitions with Extraction Schemas
 * V4 COMPLIANT - Uses correct categories from intelligence-enums.ts
 * CLAUDE.md COMPLIANT - Uses IconName enum and Zod schemas
 * 
 * This is the COMPLETE updated version with all 25 categories
 * using proper enums and Zod schemas for runtime validation
 */

import { IntelligenceCategory, IconName } from './intelligence-enums'
import { EXTRACTION_SCHEMAS } from './extraction-schemas'
import { z } from 'zod'

export interface CategorySchema {
  category: IntelligenceCategory
  name: string
  description: string
  icon: IconName  // CLAUDE.md: Using enum instead of string
  credits: number
  priority: number
  extractionSchema: z.ZodSchema  // CLAUDE.md: Using Zod schema for runtime validation
  keywords: string[]
  urlPatterns?: string[]
}

export const INTELLIGENCE_CATEGORIES: Record<IntelligenceCategory, CategorySchema> = {
  [IntelligenceCategory.CORPORATE]: {
    category: IntelligenceCategory.CORPORATE,
    name: 'Corporate Overview',
    description: 'Company information, mission, vision, and history',
    icon: IconName.BUILDING,
    credits: 1,
    priority: 1,
    extractionSchema: EXTRACTION_SCHEMAS[IntelligenceCategory.CORPORATE],
    keywords: ['about', 'company', 'overview', 'who we are', 'mission', 'vision', 'values'],
    urlPatterns: ['/about', '/company', '/about-us', '/mission', '/vision']
  },

  [IntelligenceCategory.PRODUCTS]: {
    category: IntelligenceCategory.PRODUCTS,
    name: 'Products & Services',
    description: 'Product and service offerings',
    icon: IconName.PACKAGE,
    credits: 2,
    priority: 1,
    extractionSchema: EXTRACTION_SCHEMAS[IntelligenceCategory.PRODUCTS],
    keywords: ['products', 'services', 'solutions', 'offerings', 'what we do'],
    urlPatterns: ['/products', '/services', '/solutions']
  },

  [IntelligenceCategory.PRICING]: {
    category: IntelligenceCategory.PRICING,
    name: 'Pricing Information',
    description: 'Pricing models, plans, and tiers',
    icon: IconName.CREDIT_CARD,  // Credit icon, not dollar per CLAUDE.md
    credits: 2,
    priority: 1,
    extractionSchema: EXTRACTION_SCHEMAS[IntelligenceCategory.PRICING],
    keywords: ['pricing', 'plans', 'cost', 'price', 'subscription', 'packages'],
    urlPatterns: ['/pricing', '/plans', '/pricing-plans']
  },

  [IntelligenceCategory.COMPETITORS]: {
    category: IntelligenceCategory.COMPETITORS,
    name: 'Competitors',
    description: 'Direct and indirect competitors',
    icon: IconName.SWORDS,
    credits: 3,
    priority: 1,
    extractionSchema: EXTRACTION_SCHEMAS[IntelligenceCategory.COMPETITORS],
    keywords: ['vs', 'versus', 'compare', 'alternative', 'competitor', 'comparison'],
    urlPatterns: ['/compare', '/vs', '/alternatives', '/competitors']
  },

  [IntelligenceCategory.TEAM]: {
    category: IntelligenceCategory.TEAM,
    name: 'Team & Leadership',
    description: 'Executive team, board members, and key personnel',
    icon: IconName.USERS,
    credits: 2,
    priority: 2,
    extractionSchema: EXTRACTION_SCHEMAS[IntelligenceCategory.TEAM],
    keywords: ['team', 'leadership', 'executives', 'management', 'board', 'founders', 'people'],
    urlPatterns: ['/team', '/leadership', '/about/team', '/people']
  },

  [IntelligenceCategory.CASE_STUDIES]: {
    category: IntelligenceCategory.CASE_STUDIES,
    name: 'Case Studies',
    description: 'Customer success stories and use cases',
    icon: IconName.FILE_CHECK,
    credits: 2,
    priority: 2,
    extractionSchema: EXTRACTION_SCHEMAS[IntelligenceCategory.CASE_STUDIES],
    keywords: ['case study', 'success story', 'customer story', 'results', 'roi'],
    urlPatterns: ['/case-studies', '/customers/success', '/stories', '/success-stories']
  },

  [IntelligenceCategory.TECHNICAL]: {
    category: IntelligenceCategory.TECHNICAL,
    name: 'Technical Stack',
    description: 'Technologies, platforms, and technical architecture',
    icon: IconName.BRAIN,
    credits: 2,
    priority: 3,
    extractionSchema: EXTRACTION_SCHEMAS[IntelligenceCategory.TECHNICAL],
    keywords: ['technology', 'tech stack', 'built with', 'powered by', 'platform', 'api'],
    urlPatterns: ['/technology', '/tech', '/engineering', '/developers']
  },

  [IntelligenceCategory.COMPLIANCE]: {
    category: IntelligenceCategory.COMPLIANCE,
    name: 'Compliance & Certifications',
    description: 'Security, compliance standards, and certifications',
    icon: IconName.SHIELD,
    credits: 2,
    priority: 2,
    extractionSchema: EXTRACTION_SCHEMAS[IntelligenceCategory.COMPLIANCE],
    keywords: ['compliance', 'security', 'certification', 'gdpr', 'hipaa', 'soc2', 'iso'],
    urlPatterns: ['/security', '/compliance', '/trust', '/certifications']
  },

  [IntelligenceCategory.BLOG]: {
    category: IntelligenceCategory.BLOG,
    name: 'Blog & Insights',
    description: 'Company blog posts and thought leadership',
    icon: IconName.BOOK_OPEN,
    credits: 1,
    priority: 3,
    extractionSchema: EXTRACTION_SCHEMAS[IntelligenceCategory.BLOG],
    keywords: ['blog', 'article', 'post', 'insights', 'thought leadership'],
    urlPatterns: ['/blog', '/insights', '/articles', '/resources/blog']
  },

  [IntelligenceCategory.TESTIMONIALS]: {
    category: IntelligenceCategory.TESTIMONIALS,
    name: 'Testimonials',
    description: 'Customer testimonials and reviews',
    icon: IconName.STAR,
    credits: 1,
    priority: 2,
    extractionSchema: EXTRACTION_SCHEMAS[IntelligenceCategory.TESTIMONIALS],
    keywords: ['testimonial', 'review', 'feedback', 'quote', 'what customers say'],
    urlPatterns: ['/testimonials', '/reviews', '/feedback']
  },

  [IntelligenceCategory.PARTNERSHIPS]: {
    category: IntelligenceCategory.PARTNERSHIPS,
    name: 'Partnerships',
    description: 'Strategic partnerships and alliances',
    icon: IconName.SHARE_2,
    credits: 2,
    priority: 3,
    extractionSchema: EXTRACTION_SCHEMAS[IntelligenceCategory.PARTNERSHIPS],
    keywords: ['partners', 'partnerships', 'alliances', 'collaborations', 'ecosystem'],
    urlPatterns: ['/partners', '/partnerships', '/ecosystem']
  },

  [IntelligenceCategory.RESOURCES]: {
    category: IntelligenceCategory.RESOURCES,
    name: 'Resources',
    description: 'Documentation, guides, and educational content',
    icon: IconName.FOLDER_OPEN,
    credits: 1,
    priority: 3,
    extractionSchema: EXTRACTION_SCHEMAS[IntelligenceCategory.RESOURCES],
    keywords: ['resources', 'documentation', 'guides', 'whitepapers', 'ebooks', 'webinars'],
    urlPatterns: ['/resources', '/docs', '/documentation', '/guides']
  },

  [IntelligenceCategory.EVENTS]: {
    category: IntelligenceCategory.EVENTS,
    name: 'Events',
    description: 'Conferences, webinars, and company events',
    icon: IconName.CALENDAR,
    credits: 1,
    priority: 3,
    extractionSchema: EXTRACTION_SCHEMAS[IntelligenceCategory.EVENTS],
    keywords: ['events', 'conference', 'webinar', 'workshop', 'summit'],
    urlPatterns: ['/events', '/webinars', '/conferences']
  },

  [IntelligenceCategory.FEATURES]: {
    category: IntelligenceCategory.FEATURES,
    name: 'Features',
    description: 'Product and service features',
    icon: IconName.PACKAGE_2,
    credits: 2,
    priority: 2,
    extractionSchema: EXTRACTION_SCHEMAS[IntelligenceCategory.FEATURES],
    keywords: ['features', 'capabilities', 'functionality', 'benefits'],
    urlPatterns: ['/features', '/capabilities', '/benefits']
  },

  [IntelligenceCategory.INTEGRATIONS]: {
    category: IntelligenceCategory.INTEGRATIONS,
    name: 'Integrations',
    description: 'Third-party integrations and API connections',
    icon: IconName.PLUG,
    credits: 2,
    priority: 3,
    extractionSchema: EXTRACTION_SCHEMAS[IntelligenceCategory.INTEGRATIONS],
    keywords: ['integrations', 'integrate', 'connect', 'api', 'apps', 'zapier'],
    urlPatterns: ['/integrations', '/apps', '/marketplace', '/connect']
  },

  [IntelligenceCategory.SUPPORT]: {
    category: IntelligenceCategory.SUPPORT,
    name: 'Support Channels',
    description: 'Customer support and help resources',
    icon: IconName.HELP_CIRCLE,
    credits: 1,
    priority: 3,
    extractionSchema: EXTRACTION_SCHEMAS[IntelligenceCategory.SUPPORT],
    keywords: ['support', 'help', 'contact', 'customer service', 'help center'],
    urlPatterns: ['/support', '/help', '/contact', '/help-center']
  },

  [IntelligenceCategory.CAREERS]: {
    category: IntelligenceCategory.CAREERS,
    name: 'Careers & Hiring',
    description: 'Job openings and career opportunities',
    icon: IconName.BRIEFCASE,
    credits: 1,
    priority: 3,
    extractionSchema: EXTRACTION_SCHEMAS[IntelligenceCategory.CAREERS],
    keywords: ['careers', 'jobs', 'hiring', 'join us', 'work with us', 'openings'],
    urlPatterns: ['/careers', '/jobs', '/join-us', '/work-with-us']
  },

  [IntelligenceCategory.INVESTORS]: {
    category: IntelligenceCategory.INVESTORS,
    name: 'Investors',
    description: 'Investor relations and funding information',
    icon: IconName.TRENDING_UP,
    credits: 2,
    priority: 3,
    extractionSchema: EXTRACTION_SCHEMAS[IntelligenceCategory.INVESTORS],
    keywords: ['investors', 'funding', 'investment', 'series', 'backed by', 'venture'],
    urlPatterns: ['/investors', '/investor-relations', '/funding']
  },

  [IntelligenceCategory.PRESS]: {
    category: IntelligenceCategory.PRESS,
    name: 'Press & News',
    description: 'Press releases and news coverage',
    icon: IconName.NEWSPAPER,
    credits: 1,
    priority: 3,
    extractionSchema: EXTRACTION_SCHEMAS[IntelligenceCategory.PRESS],
    keywords: ['press', 'news', 'announcement', 'press release', 'media'],
    urlPatterns: ['/press', '/news', '/media', '/press-releases']
  },

  [IntelligenceCategory.MARKET_POSITION]: {
    category: IntelligenceCategory.MARKET_POSITION,
    name: 'Market Position',
    description: 'Market share, positioning, and industry analysis',
    icon: IconName.BAR_CHART,
    credits: 2,
    priority: 2,
    extractionSchema: EXTRACTION_SCHEMAS[IntelligenceCategory.MARKET_POSITION],
    keywords: ['market share', 'market position', 'industry', 'market leader'],
    urlPatterns: ['/market', '/industry']
  },

  [IntelligenceCategory.CONTENT]: {
    category: IntelligenceCategory.CONTENT,
    name: 'Content',
    description: 'General content and marketing materials',
    icon: IconName.PEN_TOOL,
    credits: 1,
    priority: 3,
    extractionSchema: EXTRACTION_SCHEMAS[IntelligenceCategory.CONTENT],
    keywords: ['content', 'materials', 'assets', 'downloads'],
    urlPatterns: ['/content', '/library', '/assets']
  },

  [IntelligenceCategory.SOCIAL_PROOF]: {
    category: IntelligenceCategory.SOCIAL_PROOF,
    name: 'Social Proof',
    description: 'Awards, certifications, and recognition',
    icon: IconName.AWARD,
    credits: 1,
    priority: 3,
    extractionSchema: EXTRACTION_SCHEMAS[IntelligenceCategory.SOCIAL_PROOF],
    keywords: ['awards', 'recognition', 'certified', 'trusted by', 'rated'],
    urlPatterns: ['/awards', '/recognition', '/trust']
  },

  [IntelligenceCategory.COMMERCIAL]: {
    category: IntelligenceCategory.COMMERCIAL,
    name: 'Commercial',
    description: 'Sales process, terms, and commercial information',
    icon: IconName.COINS,  // Using Coins for credits, not dollars per CLAUDE.md
    credits: 2,
    priority: 2,
    extractionSchema: EXTRACTION_SCHEMAS[IntelligenceCategory.COMMERCIAL],
    keywords: ['sales', 'commercial', 'terms', 'contract', 'sla'],
    urlPatterns: ['/terms', '/commercial', '/enterprise']
  },

  [IntelligenceCategory.CUSTOMER_EXPERIENCE]: {
    category: IntelligenceCategory.CUSTOMER_EXPERIENCE,
    name: 'Customer Experience',
    description: 'Customer journey, onboarding, and experience',
    icon: IconName.USER_CHECK,
    credits: 2,
    priority: 2,
    extractionSchema: EXTRACTION_SCHEMAS[IntelligenceCategory.CUSTOMER_EXPERIENCE],
    keywords: ['customer experience', 'onboarding', 'customer journey', 'success'],
    urlPatterns: ['/customers', '/success']
  },

  [IntelligenceCategory.FINANCIAL]: {
    category: IntelligenceCategory.FINANCIAL,
    name: 'Financial Information',
    description: 'Revenue, growth, and financial metrics',
    icon: IconName.TRENDING_UP,
    credits: 3,
    priority: 3,
    extractionSchema: EXTRACTION_SCHEMAS[IntelligenceCategory.FINANCIAL],
    keywords: ['revenue', 'financial', 'growth', 'arr', 'mrr', 'profit'],
    urlPatterns: ['/financials', '/investor-relations']
  }
}

// Re-export schema templates
export { SCHEMA_TEMPLATES, getTemplateById, buildSchemaFromTemplate } from './schema-templates'

// Helper functions
export function getCategoryByName(name: string): CategorySchema | undefined {
  return Object.values(INTELLIGENCE_CATEGORIES).find(
    cat => cat.name.toLowerCase() === name.toLowerCase()
  )
}

export function getCategoriesByPriority(priority: number): CategorySchema[] {
  return Object.values(INTELLIGENCE_CATEGORIES).filter(
    cat => cat.priority === priority
  )
}

export function getTotalCredits(categories: IntelligenceCategory[]): number {
  return categories.reduce((total, cat) => {
    return total + (INTELLIGENCE_CATEGORIES[cat]?.credits || 0)
  }, 0)
}

// Validate category exists
export function isValidCategory(category: string): boolean {
  return Object.values(IntelligenceCategory).includes(category as IntelligenceCategory)
}

// Get all valid categories
export function getAllCategories(): IntelligenceCategory[] {
  return Object.values(IntelligenceCategory)
}

// Get categories grouped by type
export function getCategoryGroups(): Record<string, IntelligenceCategory[]> {
  return {
    'Company Information': [
      IntelligenceCategory.CORPORATE,
      IntelligenceCategory.TEAM,
      IntelligenceCategory.CAREERS
    ],
    'Products & Services': [
      IntelligenceCategory.PRODUCTS,
      IntelligenceCategory.FEATURES,
      IntelligenceCategory.PRICING,
      IntelligenceCategory.INTEGRATIONS
    ],
    'Market & Competition': [
      IntelligenceCategory.COMPETITORS,
      IntelligenceCategory.MARKET_POSITION,
      IntelligenceCategory.PARTNERSHIPS
    ],
    'Customer & Success': [
      IntelligenceCategory.CASE_STUDIES,
      IntelligenceCategory.TESTIMONIALS,
      IntelligenceCategory.CUSTOMER_EXPERIENCE,
      IntelligenceCategory.SOCIAL_PROOF
    ],
    'Technical & Compliance': [
      IntelligenceCategory.TECHNICAL,
      IntelligenceCategory.COMPLIANCE
    ],
    'Content & Resources': [
      IntelligenceCategory.BLOG,
      IntelligenceCategory.RESOURCES,
      IntelligenceCategory.CONTENT,
      IntelligenceCategory.EVENTS
    ],
    'Business & Financial': [
      IntelligenceCategory.INVESTORS,
      IntelligenceCategory.FINANCIAL,
      IntelligenceCategory.COMMERCIAL
    ],
    'Communication': [
      IntelligenceCategory.PRESS,
      IntelligenceCategory.SUPPORT
    ]
  }
}

/**
 * Get icon component from IconName enum
 * CLAUDE.md compliant - returns the actual icon name for lucide-react
 */
export function getCategoryIcon(category: IntelligenceCategory): IconName {
  const categorySchema = INTELLIGENCE_CATEGORIES[category]
  return categorySchema?.icon || IconName.LAYERS
}

/**
 * Validate extraction data against category schema
 * Uses Zod for runtime validation
 */
export function validateCategoryData(category: IntelligenceCategory, data: any): boolean {
  const categorySchema = INTELLIGENCE_CATEGORIES[category]
  if (!categorySchema) return false
  
  const result = categorySchema.extractionSchema.safeParse(data)
  return result.success
}

/**
 * Get extraction errors for category data
 * Returns Zod validation errors
 */
export function getCategoryValidationErrors(category: IntelligenceCategory, data: any): string[] {
  const categorySchema = INTELLIGENCE_CATEGORIES[category]
  if (!categorySchema) return ['Category not found']

  const result = categorySchema.extractionSchema.safeParse(data)
  if (result.success) return []

  return result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
}

/**
 * IntelligenceCategories namespace export for backwards compatibility
 * Provides object-oriented interface for kanban and other components
 *
 * ADDED: 2025-10-01 - For intelligence-kanban integration
 */
export const IntelligenceCategories = {
  CATEGORIES: INTELLIGENCE_CATEGORIES,
  getCategoryMetadata: (category: IntelligenceCategory) => {
    return INTELLIGENCE_CATEGORIES[category]
  },
  getAllCategories,
  getCategoryByName,
  getCategoriesByPriority,
  getTotalCredits,
  isValidCategory,
  getCategoryGroups,
  getCategoryIcon,
  validateCategoryData,
  getCategoryValidationErrors
}
