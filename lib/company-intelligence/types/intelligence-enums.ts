// lib/company-intelligence/types/intelligence-enums.ts
/**
 * Single source of truth for all intelligence system enums
 * Values are lowercase for PostgreSQL/Supabase compatibility
 */

// Re-export IconName enum for CLAUDE.md compliance (all fixed lists must use enums)
export { IconName, CATEGORY_ICONS, isValidIconName, type IconNameValue } from './icon-enum'

// Intelligence Categories - comprehensive list from spec
export enum IntelligenceCategory {
  CORPORATE = 'corporate',
  PRODUCTS = 'products',
  PRICING = 'pricing',
  COMPETITORS = 'competitors',
  TEAM = 'team',
  CASE_STUDIES = 'case_studies',
  TECHNICAL = 'technical',
  COMPLIANCE = 'compliance',
  BLOG = 'blog',
  TESTIMONIALS = 'testimonials',
  PARTNERSHIPS = 'partnerships',
  RESOURCES = 'resources',
  EVENTS = 'events',
  FEATURES = 'features',
  INTEGRATIONS = 'integrations',
  SUPPORT = 'support',
  CAREERS = 'careers',
  INVESTORS = 'investors',
  PRESS = 'press',
  MARKET_POSITION = 'market_position',
  CONTENT = 'content',
  SOCIAL_PROOF = 'social_proof',
  COMMERCIAL = 'commercial',
  CUSTOMER_EXPERIENCE = 'customer_experience',
  FINANCIAL = 'financial'
}

// Intelligence Depth Levels
export enum IntelligenceDepth {
  QUICK = 'quick',           // 5-10 pages, basic info
  STANDARD = 'standard',     // 20-30 pages, moderate detail
  DEEP = 'deep',            // 50+ pages, comprehensive
  COMPETITIVE = 'competitive' // Full competitive analysis
}

// Scraper Types
export enum ScraperType {
  FIRECRAWL = 'firecrawl',   // Uses Firecrawl API
  PLAYWRIGHT = 'playwright'   // Uses Playwright for dynamic content
}

// Session Phases
export enum SessionPhase {
  DISCOVERY = 'discovery',
  INITIALIZATION = 'initialization',
  SCRAPING = 'scraping',
  PROCESSING = 'processing',
  COMPLETE = 'complete',
  ERROR = 'error'
}

// Extraction Status
export enum ExtractionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PARTIAL = 'partial'
}

// Type-safe value arrays for database constraints and Zod schemas
export const INTELLIGENCE_CATEGORIES = Object.values(IntelligenceCategory) as readonly string[];
export const INTELLIGENCE_DEPTHS = Object.values(IntelligenceDepth) as readonly string[];
export const SCRAPER_TYPES = Object.values(ScraperType) as readonly string[];
export const SESSION_PHASES = Object.values(SessionPhase) as readonly string[];
export const EXTRACTION_STATUSES = Object.values(ExtractionStatus) as readonly string[];

// Helper type utilities
export type IntelligenceCategoryValue = `${IntelligenceCategory}`;
export type IntelligenceDepthValue = `${IntelligenceDepth}`;
export type ScraperTypeValue = `${ScraperType}`;
export type SessionPhaseValue = `${SessionPhase}`;
export type ExtractionStatusValue = `${ExtractionStatus}`;

// Validation helpers
export const isValidCategory = (value: string): value is IntelligenceCategoryValue => {
  return INTELLIGENCE_CATEGORIES.includes(value);
};

export const isValidDepth = (value: string): value is IntelligenceDepthValue => {
  return INTELLIGENCE_DEPTHS.includes(value);
};

export const isValidScraperType = (value: string): value is ScraperTypeValue => {
  return SCRAPER_TYPES.includes(value);
};

export const isValidPhase = (value: string): value is SessionPhaseValue => {
  return SESSION_PHASES.includes(value);
};

export const isValidStatus = (value: string): value is ExtractionStatusValue => {
  return EXTRACTION_STATUSES.includes(value);
};

// Display name mappings for UI
export const CATEGORY_DISPLAY_NAMES: Record<IntelligenceCategory, string> = {
  [IntelligenceCategory.CORPORATE]: 'Corporate Overview',
  [IntelligenceCategory.PRODUCTS]: 'Products & Services',
  [IntelligenceCategory.PRICING]: 'Pricing Information',
  [IntelligenceCategory.COMPETITORS]: 'Competitors',
  [IntelligenceCategory.TEAM]: 'Team & Leadership',
  [IntelligenceCategory.CASE_STUDIES]: 'Case Studies',
  [IntelligenceCategory.TECHNICAL]: 'Technical Stack',
  [IntelligenceCategory.COMPLIANCE]: 'Compliance & Certifications',
  [IntelligenceCategory.BLOG]: 'Blog & Insights',
  [IntelligenceCategory.TESTIMONIALS]: 'Testimonials',
  [IntelligenceCategory.PARTNERSHIPS]: 'Partnerships',
  [IntelligenceCategory.RESOURCES]: 'Resources',
  [IntelligenceCategory.EVENTS]: 'Events',
  [IntelligenceCategory.FEATURES]: 'Features',
  [IntelligenceCategory.INTEGRATIONS]: 'Integrations',
  [IntelligenceCategory.SUPPORT]: 'Support Channels',
  [IntelligenceCategory.CAREERS]: 'Careers & Hiring',
  [IntelligenceCategory.INVESTORS]: 'Investors',
  [IntelligenceCategory.PRESS]: 'Press & News',
  [IntelligenceCategory.MARKET_POSITION]: 'Market Position',
  [IntelligenceCategory.CONTENT]: 'Content',
  [IntelligenceCategory.SOCIAL_PROOF]: 'Social Proof',
  [IntelligenceCategory.COMMERCIAL]: 'Commercial',
  [IntelligenceCategory.CUSTOMER_EXPERIENCE]: 'Customer Experience',
  [IntelligenceCategory.FINANCIAL]: 'Financial Information'
};

export const DEPTH_DISPLAY_NAMES: Record<IntelligenceDepth, string> = {
  [IntelligenceDepth.QUICK]: 'Quick Scan (5-10 pages)',
  [IntelligenceDepth.STANDARD]: 'Standard Analysis (20-30 pages)',
  [IntelligenceDepth.DEEP]: 'Deep Dive (50+ pages)',
  [IntelligenceDepth.COMPETITIVE]: 'Competitive Analysis (Full site)'
};

// Credit costs per depth level
export const DEPTH_CREDIT_COSTS: Record<IntelligenceDepth, number> = {
  [IntelligenceDepth.QUICK]: 10,
  [IntelligenceDepth.STANDARD]: 25,
  [IntelligenceDepth.DEEP]: 50,
  [IntelligenceDepth.COMPETITIVE]: 100
};

// Credit costs per scraper type
export const SCRAPER_CREDIT_COSTS: Record<ScraperType, number> = {
  [ScraperType.FIRECRAWL]: 1,    // 1 credit per page (Firecrawl charges per page)
  [ScraperType.PLAYWRIGHT]: 2     // 2 credits per page (heavier resource usage)
};

// Page limits per depth level
export const DEPTH_PAGE_LIMITS: Record<IntelligenceDepth, number> = {
  [IntelligenceDepth.QUICK]: 10,
  [IntelligenceDepth.STANDARD]: 30,
  [IntelligenceDepth.DEEP]: 50,
  [IntelligenceDepth.COMPETITIVE]: 200
};
