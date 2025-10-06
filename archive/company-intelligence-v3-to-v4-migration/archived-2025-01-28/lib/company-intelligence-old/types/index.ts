/**
 * Barrel export for Progressive Scraping Architecture types
 *
 * This provides a clean import path for all type definitions:
 * import { ScraperType, QualityMetrics, ... } from '@/lib/company-intelligence/types'
 */

// Export all enums
export * from './scraping-enums'

// Export all interfaces
export * from './scraping-interfaces'

// Re-export commonly used types for convenience
export type {
  // Core result types
  ScraperResult,
  QualityMetrics,
  ExtractedData,
  MergedData,

  // Configuration types
  SessionConfig,
  RoutingDecision,
  CostBreakdown,

  // Data structures
  CompanyInfo,
  ContactData,
  TechnologyStack,
  SocialMediaProfiles,

  // Event types
  ProgressEvent,
  ScraperError,

  // Assessment types
  QualityRecommendation,
  PerformanceMetrics
} from './scraping-interfaces'

export {
  // Primary enums
  ScraperType,
  ScraperStatus,
  QualityLevel,
  DataLayer,
  Priority,
  CostTier
} from './scraping-enums'