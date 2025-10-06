/**
 * Interface definitions for Progressive Scraping Architecture
 *
 * ARCHITECTURE COMPLIANCE:
 * - All data structures are strongly typed
 * - No mock data or fallback values
 * - Supports additive data merging
 * - Follows repository pattern requirements
 */

import {
  ScraperType,
  ScraperStatus,
  QualityLevel,
  ScraperSpeed,
  TechConfidence,
  CostTier,
  DataLayer,
  PhaseStatus,
  Priority,
  ResolutionType,
  Sentiment
} from './scraping-enums'

/**
 * Quality metrics for scraped data
 */
export interface QualityMetrics {
  fieldCoverage: number        // 0-100 percentage
  contentDepth: number         // 0-100 percentage
  dataFreshness: number        // Hours since last update
  sourceQuality: number        // 0-100 percentage
  overallScore: number         // 0-100 weighted average
  level: QualityLevel         // Enum classification
  missingFields: string[]     // List of missing critical fields
  recommendations: QualityRecommendation[]
}

/**
 * Quality improvement recommendation
 */
export interface QualityRecommendation {
  scraper: ScraperType
  reason: string
  expectedImprovement: number  // Points increase in quality
  estimatedCost: number        // USD
  priority: Priority
}

/**
 * Scraper execution result
 */
export interface ScraperResult {
  scraperId: ScraperType
  status: ScraperStatus
  pagesScraped: number
  dataPoints: number
  discoveredUrls: string[]
  extractedData: ExtractedData
  duration: number              // milliseconds
  cost: number                  // USD
  errors: ScraperError[]
  metadata: ScraperMetadata
}

/**
 * Extracted data structure (additive layers)
 */
export interface ExtractedData {
  companyInfo?: CompanyInfo
  contactData?: ContactData
  technologies?: TechnologyStack
  socialMedia?: SocialMediaProfiles
  content?: ContentData
  customFields?: Record<string, any>
}

/**
 * Company basic information
 */
export interface CompanyInfo {
  name: string
  description?: string
  foundedYear?: number
  employeeCount?: string
  revenue?: string
  industry?: string
  headquarters?: Address
  website?: string
  logoUrl?: string
  tagline?: string
}

/**
 * Contact information
 */
export interface ContactData {
  emails: string[]
  phones: string[]
  addresses: Address[]
  contactForm?: boolean
  supportEmail?: string
  salesEmail?: string
  contactPage?: string
}

/**
 * Technology stack detection
 */
export interface TechnologyStack {
  frontend: Technology[]
  backend: Technology[]
  analytics: Technology[]
  hosting: Technology[]
  cms?: string
  ecommerce?: string
  frameworks: Technology[]
  languages: Technology[]
  databases: Technology[]
  cdns: Technology[]
}

/**
 * Individual technology detection
 */
export interface Technology {
  name: string
  version?: string
  confidence: TechConfidence
  detectedBy: ScraperType[]
  category?: string
  description?: string
}

/**
 * Address structure
 */
export interface Address {
  street?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
  formatted?: string
  coordinates?: {
    lat: number
    lng: number
  }
}

/**
 * Social media profiles
 */
export interface SocialMediaProfiles {
  linkedin?: string
  twitter?: string
  facebook?: string
  instagram?: string
  youtube?: string
  github?: string
  tiktok?: string
  medium?: string
  discord?: string
  slack?: string
}

/**
 * Content data from pages
 */
export interface ContentData {
  titles: string[]
  descriptions: string[]
  headings: Record<string, string[]>  // h1, h2, etc.
  paragraphs: string[]
  images: ImageData[]
  videos: VideoData[]
  documents: DocumentData[]
}

/**
 * Image data structure
 */
export interface ImageData {
  url: string
  alt?: string
  caption?: string
  width?: number
  height?: number
  format?: string
  size?: number  // bytes
}

/**
 * Video data structure
 */
export interface VideoData {
  url: string
  title?: string
  duration?: number  // seconds
  thumbnail?: string
  platform?: string  // youtube, vimeo, etc.
}

/**
 * Document data structure
 */
export interface DocumentData {
  url: string
  title?: string
  type?: string  // pdf, doc, etc.
  size?: number  // bytes
}

/**
 * Scraper metadata
 */
export interface ScraperMetadata {
  technology?: string           // Detected site technology
  strategyReason?: string       // Why this scraper was chosen
  performanceMetrics?: {
    requestsPerSecond: number
    bytesProcessed: number
    cacheHitRate: number
    memoryUsage: number
    cpuUsage: number
  }
  retryCount?: number
  userAgent?: string
}

/**
 * Scraper run history record
 */
export interface ScraperRun {
  id: string                   // Unique run identifier
  sessionId: string
  scraperId: ScraperType
  timestamp: Date
  result: ScraperResult
  qualityContribution: number  // Quality points added
  costAccumulated: number      // Running total cost
}

/**
 * Site analysis data
 */
export interface SiteAnalysisData {
  domain: string
  sitemapUrls: string[]
  robotsRules: any
  technologies: Technology[]
  performance: {
    loadTime: number
    size: number
    requests: number
  }
  ssl: boolean
  httpVersion: string
  serverHeaders: Record<string, string>
}

/**
 * Enrichment data from LLM
 */
export interface EnrichmentData {
  insights: string[]
  summary: string
  keyPoints: string[]
  sentiment?: Sentiment
  recommendations?: string[]
  industryAnalysis?: string
  competitivePosition?: string
}

/**
 * Merged data structure (all layers combined)
 */
export interface MergedData {
  [DataLayer.SITE_ANALYSIS]: SiteAnalysisData
  [DataLayer.STATIC_CONTENT]: ExtractedData
  [DataLayer.DYNAMIC_CONTENT]: ExtractedData
  [DataLayer.AI_EXTRACTED]?: ExtractedData    // Phase 2
  [DataLayer.LLM_ENRICHED]: EnrichmentData
  metadata: MergedDataMetadata
}

/**
 * Metadata for merged data
 */
export interface MergedDataMetadata {
  lastUpdated: Date
  totalCost: number
  qualityScore: number
  dataSources: DataSourceInfo[]
  conflicts: DataConflict[]
  version: number
}

/**
 * Data source information
 */
export interface DataSourceInfo {
  layer: DataLayer
  scraper: ScraperType
  timestamp: Date
  fieldCount: number
  contribution: number  // Percentage of total data
  success: boolean
}

/**
 * Data conflict between layers
 */
export interface DataConflict {
  field: string
  values: Array<{
    layer: DataLayer
    value: any
    confidence: number
  }>
  resolution?: ResolutionType
  resolvedValue?: any
  resolvedAt?: Date
}

/**
 * Cost breakdown for session
 */
export interface CostBreakdown {
  total: number
  byScraper: Record<ScraperType, number>
  byPhase: Record<string, number>
  projectedTotal: number
  budgetRemaining: number
  tier: CostTier
}

/**
 * Smart routing decision
 */
export interface RoutingDecision {
  recommendedScraper: ScraperType
  reason: string
  alternativeScrapers: ScraperType[]
  estimatedQualityGain: number
  estimatedCost: number
  confidence: TechConfidence
}

/**
 * Scraper error structure
 */
export interface ScraperError {
  code: string
  message: string
  url?: string
  timestamp: Date
  recoverable: boolean
  stackTrace?: string
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  pagesPerMinute: number
  dataPointsPerPage: number
  errorRate: number
  averageDuration: number
  successRate: number
  totalRuns: number
}

/**
 * Session configuration
 */
export interface SessionConfig {
  maxBudget: number
  targetQuality: number
  preferredScrapers: ScraperType[]
  excludeScrapers: ScraperType[]
  timeout: number
  maxRetries: number
  parallelLimit: number
}

/**
 * Progress event data
 */
export interface ProgressEvent {
  sessionId: string
  currentScraper: ScraperType
  scrapersCompleted: ScraperType[]
  currentQuality: number
  targetQuality: number
  costSoFar: number
  maxBudget: number
  percentage: number
  message: string
}

/**
 * Scraper capability definition
 */
export interface ScraperCapability {
  type: ScraperType
  speed: ScraperSpeed
  cost: CostTier
  capabilities: string[]
  limitations: string[]
  bestFor: string[]
  requiresAuth: boolean
  supportsProxy: boolean
  maxConcurrency: number
}