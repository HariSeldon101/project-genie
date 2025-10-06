// lib/company-intelligence/types/extraction-schemas.ts
/**
 * Zod Extraction Schemas for Intelligence Categories
 * CLAUDE.md Compliant - Runtime validation with Zod schemas
 * Replaces plain object schemas with proper Zod validation
 */

import { z } from 'zod'
import { IntelligenceCategory } from './intelligence-enums'

/**
 * Common schemas used across multiple categories
 */
const PersonSchema = z.object({
  name: z.string(),
  title: z.string().optional(),
  bio: z.string().optional(),
  linkedin: z.string().url().optional(),
  twitter: z.string().optional(),
  photo: z.string().url().optional(),
  email: z.string().email().optional()
})

const CompanySchema = z.object({
  name: z.string(),
  website: z.string().url().optional(),
  description: z.string().optional(),
  industry: z.string().optional(),
  size: z.string().optional()
})

const AddressSchema = z.object({
  street: z.string().optional(),
  city: z.string(),
  state: z.string().optional(),
  country: z.string(),
  postalCode: z.string().optional()
})

const DateRangeSchema = z.object({
  start: z.string(),
  end: z.string().optional()
})

const MetricSchema = z.object({
  name: z.string(),
  value: z.union([z.string(), z.number()]),
  unit: z.string().optional(),
  change: z.string().optional(),
  period: z.string().optional()
})

/**
 * Category-specific extraction schemas
 * Each schema defines the expected structure for extracted data
 */

// CORPORATE - Company information, mission, vision, history
export const CorporateSchema = z.object({
  companyName: z.string(),
  tagline: z.string().optional(),
  description: z.string().optional(),
  mission: z.string().optional(),
  vision: z.string().optional(),
  values: z.array(z.string()).optional(),
  industry: z.string().optional(),
  founded: z.string().optional(),
  headquarters: AddressSchema.optional(),
  locations: z.array(AddressSchema).optional(),
  employees: z.string().optional(),
  website: z.string().url().optional(),
  logo: z.string().url().optional(),
  socialMedia: z.object({
    linkedin: z.string().url().optional(),
    twitter: z.string().url().optional(),
    facebook: z.string().url().optional(),
    instagram: z.string().url().optional(),
    youtube: z.string().url().optional()
  }).optional()
})

// PRODUCTS - Product and service offerings
export const ProductsSchema = z.object({
  products: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    category: z.string().optional(),
    features: z.array(z.string()).optional(),
    benefits: z.array(z.string()).optional(),
    useCases: z.array(z.string()).optional(),
    targetMarket: z.string().optional(),
    availability: z.enum(['available', 'coming_soon', 'beta', 'deprecated']).optional(),
    image: z.string().url().optional(),
    url: z.string().url().optional()
  })).optional(),
  services: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    category: z.string().optional(),
    deliverables: z.array(z.string()).optional(),
    process: z.string().optional(),
    duration: z.string().optional()
  })).optional()
})

// PRICING - Pricing models, plans, and tiers
export const PricingSchema = z.object({
  model: z.enum(['subscription', 'one-time', 'usage-based', 'freemium', 'custom', 'hybrid']).optional(),
  currency: z.string().default('USD'),
  tiers: z.array(z.object({
    name: z.string(),
    price: z.string(), // String to handle "Contact us", "Custom", etc.
    priceNumeric: z.number().optional(), // Numeric value if available
    billing: z.enum(['monthly', 'annual', 'one-time', 'custom']).optional(),
    features: z.array(z.string()).optional(),
    limitations: z.array(z.string()).optional(),
    highlighted: z.boolean().optional(),
    popular: z.boolean().optional(),
    discount: z.string().optional()
  })).optional(),
  freeTrialDays: z.number().optional(),
  freeTrialFeatures: z.array(z.string()).optional(),
  moneyBackGuaranteeDays: z.number().optional(),
  discounts: z.array(z.object({
    type: z.enum(['percentage', 'fixed', 'volume', 'promotional']),
    amount: z.string(),
    conditions: z.string().optional(),
    code: z.string().optional()
  })).optional(),
  customPricing: z.boolean().optional(),
  minimumCommitment: z.string().optional()
})

// COMPETITORS - Competitive intelligence
export const CompetitorsSchema = z.object({
  competitors: z.array(z.object({
    name: z.string(),
    website: z.string().url().optional(),
    description: z.string().optional(),
    strengths: z.array(z.string()).optional(),
    weaknesses: z.array(z.string()).optional(),
    marketShare: z.string().optional(),
    positioning: z.string().optional(),
    keyDifferentiators: z.array(z.string()).optional()
  })).optional(),
  competitiveAdvantages: z.array(z.string()).optional(),
  uniqueValueProps: z.array(z.string()).optional(),
  marketPosition: z.string().optional(),
  comparisonMatrix: z.record(z.string(), z.any()).optional()
})

// TEAM - Leadership and team information
export const TeamSchema = z.object({
  executives: z.array(PersonSchema.extend({
    department: z.string().optional(),
    reportsTo: z.string().optional(),
    previousCompanies: z.array(z.string()).optional(),
    education: z.array(z.string()).optional(),
    achievements: z.array(z.string()).optional()
  })).optional(),
  boardMembers: z.array(PersonSchema.extend({
    role: z.enum(['chairman', 'director', 'independent_director', 'advisor']).optional(),
    committees: z.array(z.string()).optional(),
    otherBoards: z.array(z.string()).optional()
  })).optional(),
  keyEmployees: z.array(PersonSchema).optional(),
  advisors: z.array(PersonSchema.extend({
    expertise: z.array(z.string()).optional()
  })).optional(),
  teamSize: z.string().optional(),
  departments: z.array(z.object({
    name: z.string(),
    size: z.number().optional(),
    lead: z.string().optional()
  })).optional(),
  culture: z.array(z.string()).optional(),
  diversity: z.object({
    statement: z.string().optional(),
    metrics: z.array(MetricSchema).optional()
  }).optional()
})

// CASE_STUDIES - Customer success stories
export const CaseStudiesSchema = z.object({
  caseStudies: z.array(z.object({
    title: z.string(),
    client: CompanySchema,
    industry: z.string().optional(),
    challenge: z.string(),
    solution: z.string(),
    implementation: z.object({
      duration: z.string().optional(),
      team: z.array(z.string()).optional(),
      technologies: z.array(z.string()).optional(),
      process: z.array(z.string()).optional()
    }).optional(),
    results: z.array(MetricSchema).optional(),
    testimonial: z.object({
      quote: z.string(),
      author: PersonSchema.optional(),
      date: z.string().optional()
    }).optional(),
    url: z.string().url().optional(),
    publishedDate: z.string().optional()
  })).optional(),
  metrics: z.object({
    totalCaseStudies: z.number().optional(),
    industries: z.array(z.string()).optional(),
    averageROI: z.string().optional(),
    commonChallenges: z.array(z.string()).optional()
  }).optional()
})

// TECHNICAL - Technology stack and architecture
export const TechnicalSchema = z.object({
  frontend: z.array(z.string()).optional(),
  backend: z.array(z.string()).optional(),
  databases: z.array(z.string()).optional(),
  infrastructure: z.array(z.string()).optional(),
  devops: z.array(z.string()).optional(),
  analytics: z.array(z.string()).optional(),
  monitoring: z.array(z.string()).optional(),
  security: z.array(z.string()).optional(),
  apis: z.array(z.object({
    name: z.string(),
    type: z.enum(['REST', 'GraphQL', 'SOAP', 'WebSocket', 'gRPC']).optional(),
    version: z.string().optional(),
    documentation: z.string().url().optional(),
    authentication: z.string().optional(),
    rateLimit: z.string().optional()
  })).optional(),
  sdks: z.array(z.object({
    language: z.string(),
    version: z.string().optional(),
    repository: z.string().url().optional(),
    documentation: z.string().url().optional()
  })).optional(),
  architecture: z.object({
    type: z.string().optional(),
    microservices: z.boolean().optional(),
    serverless: z.boolean().optional(),
    description: z.string().optional()
  }).optional()
})

// COMPLIANCE - Security and compliance
export const ComplianceSchema = z.object({
  certifications: z.array(z.object({
    name: z.string(),
    issuer: z.string().optional(),
    validFrom: z.string().optional(),
    validUntil: z.string().optional(),
    scope: z.string().optional(),
    certificate: z.string().url().optional()
  })).optional(),
  standards: z.array(z.string()).optional(),
  regulations: z.array(z.string()).optional(),
  gdprCompliant: z.boolean().optional(),
  hipaaCompliant: z.boolean().optional(),
  soc2Type: z.enum(['Type I', 'Type II', 'None']).optional(),
  iso27001: z.boolean().optional(),
  pciDss: z.boolean().optional(),
  securityMeasures: z.array(z.string()).optional(),
  dataProtection: z.object({
    encryption: z.string().optional(),
    retention: z.string().optional(),
    deletion: z.string().optional(),
    backups: z.string().optional(),
    locations: z.array(z.string()).optional()
  }).optional(),
  privacyPolicy: z.string().url().optional(),
  termsOfService: z.string().url().optional(),
  sla: z.object({
    uptime: z.string().optional(),
    responseTime: z.string().optional(),
    supportHours: z.string().optional(),
    credits: z.string().optional()
  }).optional()
})

// Additional category schemas...
// (Including all 25 categories would make this file very long)
// These are the core categories as examples

/**
 * Master schema map for all categories
 * Maps IntelligenceCategory enum values to their Zod schemas
 */
export const EXTRACTION_SCHEMAS: Record<string, z.ZodSchema> = {
  [IntelligenceCategory.CORPORATE]: CorporateSchema,
  [IntelligenceCategory.PRODUCTS]: ProductsSchema,
  [IntelligenceCategory.PRICING]: PricingSchema,
  [IntelligenceCategory.COMPETITORS]: CompetitorsSchema,
  [IntelligenceCategory.TEAM]: TeamSchema,
  [IntelligenceCategory.CASE_STUDIES]: CaseStudiesSchema,
  [IntelligenceCategory.TECHNICAL]: TechnicalSchema,
  [IntelligenceCategory.COMPLIANCE]: ComplianceSchema,
  
  // Simplified schemas for remaining categories
  [IntelligenceCategory.BLOG]: z.object({
    articles: z.array(z.object({
      title: z.string(),
      date: z.string().optional(),
      author: z.string().optional(),
      summary: z.string().optional(),
      url: z.string().url().optional(),
      category: z.string().optional(),
      tags: z.array(z.string()).optional()
    })).optional()
  }),
  
  [IntelligenceCategory.TESTIMONIALS]: z.object({
    testimonials: z.array(z.object({
      quote: z.string(),
      author: PersonSchema.optional(),
      company: z.string().optional(),
      rating: z.number().min(1).max(5).optional(),
      date: z.string().optional(),
      verified: z.boolean().optional()
    })).optional(),
    averageRating: z.number().optional(),
    totalReviews: z.number().optional()
  }),
  
  [IntelligenceCategory.PARTNERSHIPS]: z.object({
    partners: z.array(z.object({
      name: z.string(),
      type: z.enum(['technology', 'channel', 'strategic', 'integration', 'reseller']).optional(),
      description: z.string().optional(),
      logo: z.string().url().optional(),
      website: z.string().url().optional(),
      since: z.string().optional()
    })).optional()
  }),
  
  [IntelligenceCategory.RESOURCES]: z.object({
    resources: z.array(z.object({
      title: z.string(),
      type: z.enum(['whitepaper', 'ebook', 'guide', 'template', 'webinar', 'video']).optional(),
      description: z.string().optional(),
      url: z.string().url().optional(),
      gated: z.boolean().optional()
    })).optional()
  }),
  
  [IntelligenceCategory.EVENTS]: z.object({
    events: z.array(z.object({
      name: z.string(),
      date: z.string().optional(),
      location: z.string().optional(),
      type: z.enum(['conference', 'webinar', 'workshop', 'meetup', 'trade_show']).optional(),
      description: z.string().optional(),
      registrationUrl: z.string().url().optional()
    })).optional()
  }),
  
  [IntelligenceCategory.FEATURES]: z.object({
    features: z.array(z.object({
      name: z.string(),
      description: z.string().optional(),
      category: z.string().optional(),
      benefits: z.array(z.string()).optional()
    })).optional()
  }),
  
  [IntelligenceCategory.INTEGRATIONS]: z.object({
    integrations: z.array(z.object({
      name: z.string(),
      category: z.string().optional(),
      description: z.string().optional(),
      logo: z.string().url().optional(),
      documentationUrl: z.string().url().optional(),
      verified: z.boolean().optional()
    })).optional(),
    totalIntegrations: z.number().optional(),
    categories: z.array(z.string()).optional()
  }),
  
  [IntelligenceCategory.SUPPORT]: z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    chat: z.boolean().optional(),
    hours: z.string().optional(),
    responseTime: z.string().optional(),
    languages: z.array(z.string()).optional(),
    channels: z.array(z.string()).optional()
  }),
  
  [IntelligenceCategory.CAREERS]: z.object({
    openings: z.array(z.object({
      title: z.string(),
      department: z.string().optional(),
      location: z.string().optional(),
      type: z.enum(['full-time', 'part-time', 'contract', 'internship']).optional(),
      remote: z.boolean().optional(),
      url: z.string().url().optional()
    })).optional(),
    benefits: z.array(z.string()).optional(),
    culture: z.string().optional()
  }),
  
  [IntelligenceCategory.INVESTORS]: z.object({
    totalFunding: z.string().optional(),
    rounds: z.array(z.object({
      type: z.string(),
      amount: z.string(),
      date: z.string().optional(),
      leadInvestor: z.string().optional(),
      investors: z.array(z.string()).optional()
    })).optional(),
    valuation: z.string().optional()
  }),
  
  [IntelligenceCategory.PRESS]: z.object({
    releases: z.array(z.object({
      title: z.string(),
      date: z.string().optional(),
      summary: z.string().optional(),
      url: z.string().url().optional()
    })).optional(),
    mentions: z.array(z.object({
      publication: z.string(),
      title: z.string(),
      date: z.string().optional(),
      url: z.string().url().optional()
    })).optional()
  }),
  
  [IntelligenceCategory.MARKET_POSITION]: z.object({
    marketShare: z.string().optional(),
    marketSize: z.string().optional(),
    growthRate: z.string().optional(),
    positioning: z.string().optional(),
    targetSegments: z.array(z.string()).optional(),
    geographies: z.array(z.string()).optional()
  }),
  
  [IntelligenceCategory.CONTENT]: z.object({
    types: z.array(z.string()).optional(),
    pieces: z.array(z.object({
      title: z.string(),
      type: z.string().optional(),
      url: z.string().url().optional()
    })).optional()
  }),
  
  [IntelligenceCategory.SOCIAL_PROOF]: z.object({
    awards: z.array(z.string()).optional(),
    certifications: z.array(z.string()).optional(),
    ratings: z.record(z.string(), z.string()).optional(),
    customerLogos: z.array(z.string()).optional(),
    metrics: z.record(z.string(), z.string()).optional()
  }),
  
  [IntelligenceCategory.COMMERCIAL]: z.object({
    salesProcess: z.string().optional(),
    contractTerms: z.array(z.string()).optional(),
    paymentTerms: z.string().optional(),
    minimumCommitment: z.string().optional(),
    refundPolicy: z.string().optional()
  }),
  
  [IntelligenceCategory.CUSTOMER_EXPERIENCE]: z.object({
    onboarding: z.string().optional(),
    journey: z.array(z.string()).optional(),
    successMetrics: z.array(z.string()).optional(),
    retention: z.string().optional(),
    nps: z.number().optional()
  }),
  
  [IntelligenceCategory.FINANCIAL]: z.object({
    revenue: z.string().optional(),
    growth: z.string().optional(),
    profitability: z.string().optional(),
    arr: z.string().optional(),
    mrr: z.string().optional(),
    burnRate: z.string().optional(),
    runway: z.string().optional()
  })
}

/**
 * Get extraction schema for a category
 * @param {IntelligenceCategory} category - Category to get schema for
 * @returns {z.ZodSchema | undefined} Zod schema or undefined
 */
export function getExtractionSchema(category: IntelligenceCategory): z.ZodSchema | undefined {
  return EXTRACTION_SCHEMAS[category]
}

/**
 * Combine multiple schemas into one
 * Used when extracting multiple categories at once
 * @param {IntelligenceCategory[]} categories - Categories to combine
 * @returns {z.ZodSchema} Combined schema
 */
export function combineSchemas(categories: IntelligenceCategory[]): z.ZodSchema {
  const shape: Record<string, any> = {}
  
  categories.forEach(category => {
    const schema = EXTRACTION_SCHEMAS[category]
    if (schema) {
      shape[category] = schema
    }
  })
  
  return z.object(shape)
}

/**
 * Validate extracted data against schema
 * @param {IntelligenceCategory} category - Category to validate
 * @param {any} data - Data to validate
 * @returns {z.SafeParseReturnType} Validation result
 */
export function validateExtraction(category: IntelligenceCategory, data: any) {
  const schema = EXTRACTION_SCHEMAS[category]
  if (!schema) {
    return { success: false, error: new Error('Schema not found for category') }
  }
  
  return schema.safeParse(data)
}
