/**
 * Enum definitions for Progressive Scraping Architecture
 *
 * ARCHITECTURE COMPLIANCE:
 * - Using TypeScript enums for fixed lists (Claude.md requirement)
 * - All values are string-based for database compatibility
 * - No mock data - these are real operational values
 */

/**
 * Scraper types available in the system
 * ENUM ensures type safety for scraper identification
 */
export enum ScraperType {
  STATIC = 'static',        // Cheerio - fast HTML parsing
  DYNAMIC = 'dynamic',      // Playwright - JS rendering
  SPA = 'spa',             // Single Page App scraper (Phase 2)
  API = 'api',             // Direct API extraction (Phase 2)
  FIRECRAWL = 'firecrawl'  // AI-powered extraction (Phase 2)
}

/**
 * Scraper execution status
 */
export enum ScraperStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  COMPLETE = 'complete',
  FAILED = 'failed',
  SKIPPED = 'skipped'
}

/**
 * Data quality levels for assessment
 */
export enum QualityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  EXCELLENT = 'excellent'
}

/**
 * Scraper speed classifications
 */
export enum ScraperSpeed {
  FAST = 'fast',       // < 1 second per page
  MEDIUM = 'medium',   // 1-5 seconds per page
  SLOW = 'slow'        // > 5 seconds per page
}

/**
 * Technology detection confidence
 */
export enum TechConfidence {
  CERTAIN = 'certain',      // 95-100% confidence
  PROBABLE = 'probable',    // 70-95% confidence
  POSSIBLE = 'possible',    // 40-70% confidence
  UNCERTAIN = 'uncertain'   // < 40% confidence
}

/**
 * Cost tiers for scraping operations
 */
export enum CostTier {
  FREE = 'free',           // $0
  CHEAP = 'cheap',         // < $0.01 per page
  MODERATE = 'moderate',   // $0.01-0.10 per page
  EXPENSIVE = 'expensive', // > $0.10 per page
}

/**
 * Data layer sources in merged data
 */
export enum DataLayer {
  SITE_ANALYSIS = 'site_analysis',
  STATIC_CONTENT = 'static_content',
  DYNAMIC_CONTENT = 'dynamic_content',
  AI_EXTRACTED = 'ai_extracted',
  LLM_ENRICHED = 'llm_enriched'
}

/**
 * Phase status for pipeline execution
 */
export enum PhaseStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ABORTED = 'aborted'
}

/**
 * Priority levels for recommendations
 */
export enum Priority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

/**
 * Data conflict resolution types
 */
export enum ResolutionType {
  MANUAL = 'manual',
  AUTOMATIC = 'automatic',
  PENDING = 'pending'
}

/**
 * Sentiment analysis values
 */
export enum Sentiment {
  POSITIVE = 'positive',
  NEUTRAL = 'neutral',
  NEGATIVE = 'negative'
}