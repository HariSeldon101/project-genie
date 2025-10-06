// lib/company-intelligence/schemas/validation-schemas.ts
import { z } from 'zod';
import {
  INTELLIGENCE_CATEGORIES,
  INTELLIGENCE_DEPTHS,
  SCRAPER_TYPES,
  SESSION_PHASES,
  EXTRACTION_STATUSES,
  IntelligenceCategory,
  IntelligenceDepth,
  ScraperType,
  SessionPhase,
  ExtractionStatus,
  DEPTH_CREDIT_COSTS,
  DEPTH_PAGE_LIMITS
} from '../types/intelligence-enums';

// Create Zod enums from the constant arrays
export const IntelligenceCategorySchema = z.enum(
  INTELLIGENCE_CATEGORIES as [string, ...string[]]
);

export const IntelligenceDepthSchema = z.enum(
  INTELLIGENCE_DEPTHS as [string, ...string[]]
);

export const ScraperTypeSchema = z.enum(
  SCRAPER_TYPES as [string, ...string[]]
);

export const SessionPhaseSchema = z.enum(
  SESSION_PHASES as [string, ...string[]]
);

export const ExtractionStatusSchema = z.enum(
  EXTRACTION_STATUSES as [string, ...string[]]
);

// Request validation schema for starting a scraping session
export const ScrapingRequestSchema = z.object({
  domain: z.string().url().or(z.string().regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)),
  categories: z.array(IntelligenceCategorySchema).min(1).max(25),
  depth: IntelligenceDepthSchema.default(IntelligenceDepth.STANDARD),
  scraperType: ScraperTypeSchema.default(ScraperType.FIRECRAWL),
  maxPages: z.number().min(1).max(200).optional(),
  excludePatterns: z.array(z.string()).optional(),
  includePatterns: z.array(z.string()).optional(),
  customSchema: z.record(z.any()).optional(),
  webhookUrl: z.string().url().optional(),
  metadata: z.record(z.any()).optional()
}).refine(
  (data) => {
    // Validate max pages against depth limits
    if (data.maxPages) {
      const depthLimit = DEPTH_PAGE_LIMITS[data.depth as IntelligenceDepth];
      return data.maxPages <= depthLimit;
    }
    return true;
  },
  {
    message: "maxPages exceeds the limit for the selected depth level"
  }
);

// Session creation schema (for database insert)
export const SessionCreateSchema = z.object({
  company_id: z.string().uuid(),
  domain: z.string(),
  depth: IntelligenceDepthSchema,
  scraper_type: ScraperTypeSchema,
  intelligence_categories: z.array(IntelligenceCategorySchema),
  phase: SessionPhaseSchema.default(SessionPhase.DISCOVERY),
  extraction_schema: z.record(z.any()).optional(),
  max_pages: z.number().optional(),
  exclude_patterns: z.array(z.string()).optional(),
  include_patterns: z.array(z.string()).optional(),
  webhook_url: z.string().url().optional(),
  metadata: z.record(z.any()).optional(),
  total_credits_estimated: z.number(),
  created_by: z.string().uuid()
});

// Intelligence item schema (for database insert)
export const IntelligenceItemSchema = z.object({
  session_id: z.string().uuid(),
  url: z.string().url(),
  category: IntelligenceCategorySchema,
  title: z.string(),
  description: z.string().optional(),
  content: z.string().optional(),
  extracted_data: z.record(z.any()),
  confidence_score: z.number().min(0).max(1),
  extraction_status: ExtractionStatusSchema.default(ExtractionStatus.PENDING),
  extraction_errors: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
  processing_time_ms: z.number().optional(),
  created_at: z.string().datetime().optional()
});

// Batch intelligence creation schema
export const BatchIntelligenceSchema = z.object({
  session_id: z.string().uuid(),
  items: z.array(IntelligenceItemSchema).min(1).max(100)
});

// Session update schema
export const SessionUpdateSchema = z.object({
  phase: SessionPhaseSchema.optional(),
  status: z.enum(['active', 'completed', 'failed', 'cancelled']).optional(),
  pages_scraped: z.number().optional(),
  items_found: z.number().optional(),
  total_credits_used: z.number().optional(),
  extraction_completed_at: z.string().datetime().optional(),
  error_message: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

// Response schemas for API responses
export const SessionResponseSchema = z.object({
  id: z.string().uuid(),
  company_id: z.string().uuid(),
  domain: z.string(),
  depth: IntelligenceDepthSchema,
  scraper_type: ScraperTypeSchema,
  intelligence_categories: z.array(IntelligenceCategorySchema),
  phase: SessionPhaseSchema,
  status: z.enum(['active', 'completed', 'failed', 'cancelled']),
  pages_scraped: z.number(),
  items_found: z.number(),
  total_credits_estimated: z.number(),
  total_credits_used: z.number().nullable(),
  extraction_schema: z.record(z.any()).nullable(),
  extraction_completed_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  created_by: z.string().uuid()
});

export const IntelligenceResponseSchema = z.object({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  category: IntelligenceCategorySchema,
  url: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  content: z.string().nullable(),
  extracted_data: z.record(z.any()),
  confidence_score: z.number(),
  extraction_status: ExtractionStatusSchema,
  extraction_errors: z.array(z.string()).nullable(),
  metadata: z.record(z.any()).nullable(),
  processing_time_ms: z.number().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

// SSE event schema for streaming responses
export const SSEEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('session.started'),
    data: z.object({
      sessionId: z.string().uuid(),
      estimatedCredits: z.number(),
      depth: IntelligenceDepthSchema,
      categories: z.array(IntelligenceCategorySchema)
    })
  }),
  z.object({
    type: z.literal('phase.changed'),
    data: z.object({
      sessionId: z.string().uuid(),
      phase: SessionPhaseSchema,
      message: z.string().optional()
    })
  }),
  z.object({
    type: z.literal('page.scraped'),
    data: z.object({
      url: z.string(),
      pageNumber: z.number(),
      totalPages: z.number().optional()
    })
  }),
  z.object({
    type: z.literal('intelligence.extracted'),
    data: z.object({
      category: IntelligenceCategorySchema,
      itemsCount: z.number(),
      url: z.string()
    })
  }),
  z.object({
    type: z.literal('session.completed'),
    data: z.object({
      sessionId: z.string().uuid(),
      totalPages: z.number(),
      totalItems: z.number(),
      creditsUsed: z.number(),
      duration: z.number()
    })
  }),
  z.object({
    type: z.literal('error'),
    data: z.object({
      message: z.string(),
      code: z.string().optional(),
      details: z.any().optional()
    })
  })
]);

// Type exports for TypeScript
export type ScrapingRequest = z.infer<typeof ScrapingRequestSchema>;
export type SessionCreate = z.infer<typeof SessionCreateSchema>;
export type IntelligenceItem = z.infer<typeof IntelligenceItemSchema>;
export type SessionUpdate = z.infer<typeof SessionUpdateSchema>;
export type SessionResponse = z.infer<typeof SessionResponseSchema>;
export type IntelligenceResponse = z.infer<typeof IntelligenceResponseSchema>;
export type SSEEvent = z.infer<typeof SSEEventSchema>;

// Validation helpers
export const validateScrapingRequest = (data: unknown): ScrapingRequest => {
  return ScrapingRequestSchema.parse(data);
};

export const validateSessionUpdate = (data: unknown): SessionUpdate => {
  return SessionUpdateSchema.parse(data);
};

export const validateIntelligenceItem = (data: unknown): IntelligenceItem => {
  return IntelligenceItemSchema.parse(data);
};

// Credit calculation helper
export const calculateEstimatedCredits = (
  depth: IntelligenceDepth,
  categories: IntelligenceCategory[]
): number => {
  const baseCredits = DEPTH_CREDIT_COSTS[depth];
  const categoryMultiplier = Math.min(categories.length * 0.1 + 1, 2); // Max 2x for many categories
  return Math.ceil(baseCredits * categoryMultiplier);
};
