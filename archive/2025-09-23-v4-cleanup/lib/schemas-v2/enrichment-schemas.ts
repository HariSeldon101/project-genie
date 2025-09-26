/**
 * Zod Schemas for Company Intelligence Enrichment
 * Provides type-safe validation for all enrichment data structures
 */

import { z } from 'zod'

// Basic company information schema
export const CompanyBasicsSchema = z.object({
  companyName: z.string().describe('Official company name'),
  description: z.string().describe('2-3 sentence company description'),
  mission: z.string().nullable().describe('Company mission statement'),
  vision: z.string().nullable().describe('Company vision statement'),
  values: z.array(z.string()).describe('Core company values'),
  foundedYear: z.number().nullable().describe('Year company was founded'),
  industry: z.array(z.string()).describe('Industry sectors'),
  targetMarket: z.array(z.string()).describe('Target market segments'),
  uniqueSellingPoints: z.array(z.string()).describe('Key differentiators')
})

// Competitor analysis schema
export const CompetitorSchema = z.object({
  name: z.string().describe('Competitor company name'),
  website: z.string().nullable().describe('Company website URL'),
  description: z.string().describe('Brief company description'),
  strengths: z.array(z.string()).describe('Key competitive strengths'),
  weaknesses: z.array(z.string()).describe('Competitive weaknesses'),
  marketShare: z.string().nullable().describe('Estimated market share percentage')
})

export const CompetitorsResponseSchema = z.object({
  competitors: z.array(CompetitorSchema)
})

// News and media schema
export const NewsItemSchema = z.object({
  title: z.string().describe('Article headline'),
  date: z.string().nullable().describe('Publication date'),
  summary: z.string().describe('Brief article summary'),
  source: z.string().describe('News source name'),
  url: z.string().nullable().describe('Article URL'),
  sentiment: z.enum(['positive', 'neutral', 'negative']).describe('Article sentiment'),
  relevanceScore: z.number().min(0).max(1).optional().describe('Relevance to company')
})

export const NewsResponseSchema = z.object({
  news: z.array(NewsItemSchema),
  totalArticles: z.number().optional(),
  dateRange: z.object({
    from: z.string(),
    to: z.string()
  }).optional()
})

// Industry analysis schema
export const IndustryAnalysisSchema = z.object({
  sector: z.string().describe('Primary industry sector'),
  marketSize: z.string().nullable().describe('Total addressable market size'),
  growthRate: z.string().nullable().describe('Annual growth rate'),
  trends: z.array(z.string()).describe('Current industry trends'),
  challenges: z.array(z.string()).describe('Industry challenges'),
  opportunities: z.array(z.string()).describe('Market opportunities'),
  regulatoryEnvironment: z.string().optional().describe('Key regulations'),
  keyPlayers: z.array(z.string()).optional().describe('Major industry players')
})

// Market position schema
export const MarketPositionSchema = z.object({
  competitiveAdvantages: z.array(z.string()).describe('Key competitive advantages'),
  marketShare: z.string().nullable().describe('Estimated market share'),
  positioning: z.string().describe('Strategic market positioning'),
  differentiators: z.array(z.string()).describe('Key differentiating factors'),
  targetSegments: z.array(z.string()).optional().describe('Primary market segments'),
  geographicReach: z.array(z.string()).optional().describe('Geographic markets served')
})

// Technology stack schema
export const TechStackItemSchema = z.object({
  name: z.string().describe('Technology name'),
  category: z.enum([
    'Frontend',
    'Backend',
    'Database',
    'Analytics',
    'Marketing',
    'E-commerce',
    'CMS',
    'Infrastructure',
    'Security',
    'Payment',
    'Communication',
    'Other'
  ]).describe('Technology category'),
  confidence: z.number().min(0).max(1).describe('Detection confidence score'),
  version: z.string().optional().describe('Version if detected')
})

export const TechStackResponseSchema = z.object({
  technologies: z.array(TechStackItemSchema),
  totalCount: z.number(),
  lastUpdated: z.string()
})

// Social media metrics schema
export const SocialMediaMetricsSchema = z.object({
  platform: z.enum(['linkedin', 'twitter', 'facebook', 'instagram', 'youtube', 'tiktok', 'other']),
  profileUrl: z.string().nullable(),
  followers: z.number().nullable(),
  engagement: z.object({
    postsPerMonth: z.number().nullable(),
    averageLikes: z.number().nullable(),
    averageComments: z.number().nullable(),
    averageShares: z.number().nullable()
  }).optional(),
  lastActivity: z.string().nullable().describe('Date of last post/activity'),
  verified: z.boolean().optional()
})

export const SocialMediaResponseSchema = z.object({
  profiles: z.array(SocialMediaMetricsSchema),
  totalReach: z.number().optional().describe('Combined follower count'),
  primaryPlatform: z.string().optional().describe('Most active platform')
})

// Company metrics schema
export const CompanyMetricsSchema = z.object({
  revenue: z.string().nullable().describe('Annual revenue'),
  funding: z.string().nullable().describe('Total funding raised'),
  employees: z.string().nullable().describe('Number of employees'),
  growth: z.string().nullable().describe('Year-over-year growth rate'),
  customers: z.string().nullable().describe('Number of customers'),
  valuation: z.string().nullable().describe('Company valuation'),
  profitability: z.enum(['profitable', 'break-even', 'unprofitable', 'unknown']).optional()
})

// SWOT Analysis schema
export const SWOTAnalysisSchema = z.object({
  strengths: z.array(z.string()).describe('Internal strengths'),
  weaknesses: z.array(z.string()).describe('Internal weaknesses'),
  opportunities: z.array(z.string()).describe('External opportunities'),
  threats: z.array(z.string()).describe('External threats')
})

// Strategic recommendations schema
export const RecommendationsSchema = z.object({
  recommendations: z.array(z.string()).describe('Strategic recommendations for engagement')
})

// Enriched company data schema (complete)
export const EnrichedCompanyDataSchema = z.object({
  domain: z.string(),
  basics: CompanyBasicsSchema.optional(),
  competitors: z.array(CompetitorSchema).optional(),
  industry: IndustryAnalysisSchema.optional(),
  marketPosition: MarketPositionSchema.optional(),
  techStack: z.array(TechStackItemSchema).optional(),
  socialMedia: z.array(SocialMediaMetricsSchema).optional(),
  news: z.array(NewsItemSchema).optional(),
  metrics: CompanyMetricsSchema.optional(),
  swot: SWOTAnalysisSchema.optional(),
  recommendations: z.array(z.string()).optional(),
  enrichmentMetadata: z.object({
    enrichedAt: z.string(),
    sources: z.array(z.string()),
    dataQuality: z.enum(['high', 'medium', 'low']),
    completeness: z.number().min(0).max(1)
  }).optional()
})

// API Response schemas for external services
export const NewsAPIResponseSchema = z.object({
  status: z.string(),
  totalResults: z.number().optional(),
  articles: z.array(z.object({
    title: z.string(),
    description: z.string().nullable(),
    url: z.string(),
    source: z.object({
      name: z.string()
    }),
    publishedAt: z.string(),
    content: z.string().nullable()
  }))
})

export const GrowjoAPIResponseSchema = z.object({
  companies: z.array(z.object({
    name: z.string(),
    domain: z.string().optional(),
    growth_score: z.number().optional(),
    employee_count: z.number().optional(),
    funding: z.string().optional(),
    industry: z.string().optional()
  }))
})

// Export all schemas for easy import
export const EnrichmentSchemas = {
  CompanyBasics: CompanyBasicsSchema,
  Competitor: CompetitorSchema,
  Competitors: CompetitorsResponseSchema,
  NewsItem: NewsItemSchema,
  News: NewsResponseSchema,
  Industry: IndustryAnalysisSchema,
  MarketPosition: MarketPositionSchema,
  TechStack: TechStackResponseSchema,
  SocialMedia: SocialMediaResponseSchema,
  CompanyMetrics: CompanyMetricsSchema,
  SWOT: SWOTAnalysisSchema,
  Recommendations: RecommendationsSchema,
  EnrichedData: EnrichedCompanyDataSchema
}

// Type exports for TypeScript usage
export type CompanyBasics = z.infer<typeof CompanyBasicsSchema>
export type Competitor = z.infer<typeof CompetitorSchema>
export type NewsItem = z.infer<typeof NewsItemSchema>
export type IndustryAnalysis = z.infer<typeof IndustryAnalysisSchema>
export type MarketPosition = z.infer<typeof MarketPositionSchema>
export type TechStackItem = z.infer<typeof TechStackItemSchema>
export type SocialMediaMetrics = z.infer<typeof SocialMediaMetricsSchema>
export type CompanyMetrics = z.infer<typeof CompanyMetricsSchema>
export type SWOTAnalysis = z.infer<typeof SWOTAnalysisSchema>
export type EnrichedCompanyData = z.infer<typeof EnrichedCompanyDataSchema>