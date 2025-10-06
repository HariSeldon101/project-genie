/**
 * Company Intelligence Types and Interfaces
 * Comprehensive type definitions for the company research system
 */

import { DataSource } from './types/data-quality'

export enum ResearchPhase {
  SCRAPING = 'scraping',
  EXTRACTION = 'extraction', 
  ENRICHMENT = 'enrichment',
  GENERATION = 'generation'
}

export type PhaseExecutionMode = 'single' | 'sequential' | 'all'

export interface PhaseControl {
  mode: PhaseExecutionMode
  phases?: ResearchPhase[]
  stopAfter?: ResearchPhase
  skipPhases?: ResearchPhase[]
  requireApproval: boolean
  autoApproveQualityThreshold?: number
}

export interface ResearchSession {
  id: string
  domain: string
  status: 'active' | 'paused' | 'awaiting_review' | 'completed' | 'failed' | 'aborted'
  currentPhase: ResearchPhase | null
  completedPhases: ResearchPhase[]
  phaseResults: {
    [ResearchPhase.SCRAPING]?: any
    [ResearchPhase.EXTRACTION]?: any
    [ResearchPhase.ENRICHMENT]?: any
    [ResearchPhase.GENERATION]?: any
  }
  config: CompanyResearchRequest
  metrics: {
    startedAt: Date
    updatedAt: Date
    completedAt?: Date
    phaseDurations: Record<ResearchPhase, number>
    totalCost: number
    llmCalls: number
    errors: any[]
  }
  userId: string
  expiresAt: Date
}

export interface PhaseResult {
  phase: ResearchPhase
  status: 'success' | 'failed' | 'partial'
  data: any
  metrics: {
    duration: number
    itemsProcessed?: number
    llmCalls?: number
    cost?: number
  }
  errors?: any[]
  warnings?: string[]
  qualityScore?: number
}

export interface CompanyResearchRequest {
  domain: string
  depth: 'basic' | 'standard' | 'comprehensive'
  phaseControl?: PhaseControl  // NEW: Control phase execution
  sessionId?: string            // NEW: Resume from existing session
  options?: {
    includeNews?: boolean
    includeCompetitors?: boolean
    includeSocialMedia?: boolean
    includeFinancials?: boolean
    includeTechStack?: boolean
    maxPages?: number
    timeout?: number
  }
}

export interface Address {
  street?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
  formatted?: string
}

export interface ProductImage {
  url: string
  alt?: string
  type: 'hero' | 'screenshot' | 'gallery' | 'thumbnail'
}

export interface Product {
  name: string
  description?: string
  features?: string[]
  pricing?: PricingInfo
  imageUrl?: string
  images?: ProductImage[]
  link?: string
  category?: string
}

export interface Service {
  name: string
  description?: string
  features?: string[]
  pricing?: PricingInfo
  images?: ProductImage[]
  link?: string
  category?: string
}

export interface PricingInfo {
  amount: string
  period?: 'monthly' | 'yearly' | 'annual' | 'one-time'
  currency?: string
  tiers?: PricingTier[]
}

export interface PricingTier {
  name: string
  price: string
  features: string[]
}

export interface TeamMember {
  name: string
  role?: string
  email?: string
  linkedIn?: string
  bio?: string
  imageUrl?: string
}

export interface Competitor {
  name: string
  website?: string
  description?: string
  strengths?: string[]
  weaknesses?: string[]
  marketShare?: string
}

/**
 * Enhanced competitor with geographic scope and detailed metrics
 */
export interface EnhancedCompetitor extends Competitor {
  // Geographic classification
  scope: 'local' | 'regional' | 'national' | 'global'
  geography: {
    headquarters: string
    operatingRegions: string[]
    primaryMarkets: string[]
    dataSource?: DataSource
  }
  
  // Business metrics with source tracking
  metrics: {
    revenue?: { value: string; source: DataSource }
    employeeCount?: { value: string; source: DataSource }
    marketShare?: { value: string; source: DataSource }
    growthRate?: { value: string; source: DataSource }
    fundingTotal?: { value: string; source: DataSource }
    valuation?: { value: string; source: DataSource }
  }
  
  // Competitive analysis
  competitiveAnalysis: {
    threatLevel: 'low' | 'medium' | 'high' | 'fatal'
    competitiveIntensity: number // 1-10
    productOverlap: number // percentage 0-100
    targetMarketOverlap: number // percentage 0-100
    differentiators: string[]
    competitiveAdvantages: string[]
    competitiveWeaknesses: string[]
  }
  
  // Visual assets
  visualAssets?: {
    logo?: string
    productImages?: string[]
    screenshots?: string[]
  }
  
  // Data quality tracking
  dataQuality: {
    overall: DataSource
    confidence: number // 0-100
    lastUpdated: Date
    fieldSources: Record<string, DataSource>
    needsRefresh: boolean
  }
  
  // Recent activity
  recentActivity?: {
    news?: NewsItem[]
    productLaunches?: string[]
    partnerships?: string[]
    fundingRounds?: string[]
  }
}

export interface Technology {
  name: string
  category: string
  confidence: number
  version?: string
}

export interface ContactEmail {
  type: 'general' | 'support' | 'sales' | 'info' | 'other'
  email: string
  department?: string
}

export interface NewsItem {
  title: string
  source?: string
  date?: string
  summary?: string
  url?: string
  sentiment?: 'positive' | 'neutral' | 'negative'
}

export interface PressRelease {
  title: string
  date?: string
  summary?: string
  url?: string
}

export interface ReviewSummary {
  rating?: number
  totalReviews?: number
  summary?: string
  source?: string
}

export interface WebsiteAnalysis {
  url: string
  pagesAnalyzed: number
  lastCrawled: Date
  technologies?: Technology[]
  performance?: {
    loadTime?: number
    mobileOptimized?: boolean
    httpsEnabled?: boolean
  }
}

export interface SocialMediaPresence {
  linkedin?: {
    url?: string
    followers?: number
    posts?: number
  }
  twitter?: {
    url?: string
    followers?: number
    tweets?: number
  }
  facebook?: {
    url?: string
    likes?: number
  }
  instagram?: {
    url?: string
    followers?: number
  }
}

export interface BlogPost {
  title: string
  url: string
  date?: string
  author?: string
  summary?: string
  image?: string
  tags?: string[]
  category?: string
}

export interface ContentAnalysis {
  blogPosts?: BlogPost[]
  blogPostCount?: number
  caseStudies?: number
  whitepapers?: number
  videos?: number
  publishingFrequency?: 'daily' | 'weekly' | 'monthly' | 'occasional'
  contentThemes?: string[]
  contentTone?: 'professional' | 'casual' | 'technical' | 'marketing'
  targetAudience?: string[]
  seoFocus?: string[]
  lastUpdated?: Date
}

export interface SEOData {
  title?: string
  description?: string
  keywords?: string[]
  ogImage?: string
}

export interface CompanyInformationPack {
  id: string
  domain: string
  generatedAt: string
  lastUpdated: string
  companyName: string
  
  // Core Information
  basics: {
    legalName?: string
    foundedYear?: number
    headquarters?: Address
    description: string
    mission?: string
    vision?: string
    values?: string[]
    logoUrl?: string
    logoSvg?: string
    favicon?: string
    brandColors?: {
      primary?: string
      secondary?: string
      accent?: string[]
      raw?: string[]  // Original extracted colors
    }
    typography?: {
      headingFont?: string
      bodyFont?: string
    }
    brandGuidelines?: string
    tagline?: string
  }
  
  // Business Information
  business: {
    industry: string[]
    sector?: string
    businessModel?: string
    targetMarket?: string[]
    uniqueSellingPoints?: string[]
    numberOfEmployees?: string | number
    annualRevenue?: string
    fundingStatus?: string
    investors?: string[]
  }
  
  // Products & Services
  productsServices: {
    products: Product[]
    services: Service[]
    pricing?: PricingInfo[]
    keyFeatures?: string[]
    useCases?: string[]
  }
  
  // Market Position
  marketPosition: {
    marketSize?: string
    marketShare?: string
    growthRate?: string
    competitors: Competitor[]
    competitiveAdvantages?: string[]
    challenges?: string[]
    opportunities?: string[]
  }
  
  // Digital Presence
  digitalPresence: {
    website: WebsiteAnalysis
    socialMedia?: SocialMediaPresence
    contentStrategy?: ContentAnalysis
    seoMetrics?: SEOData
    techStack?: Technology[]
    visualAssets?: {
      screenshots?: string[]
      productImages?: string[]
      teamPhotos?: string[]
      officeImages?: string[]
      infographics?: string[]
      videos?: string[]
    }
  }
  
  // People & Culture
  people: {
    leadership?: TeamMember[]
    teamSize?: number
    culture?: string[]
    hiring?: boolean
    openPositions?: number
    employeeReviews?: ReviewSummary
  }
  
  // Contact & Locations
  contact: {
    emails?: ContactEmail[]
    phones?: string[]
    addresses?: Address[]
    supportChannels?: string[]
  }
  
  // Recent Activity
  recentActivity: {
    news?: NewsItem[]
    pressReleases?: PressRelease[]
    blogPosts?: BlogPost[]
    productLaunches?: string[]
    partnerships?: string[]
    contentHighlights?: string[]
  }
  
  // Analysis & Insights
  insights: {
    strengths: string[]
    weaknesses: string[]
    opportunities: string[]
    threats: string[]
    recommendations?: string[]
  }
  
  // Metadata
  metadata: {
    confidence: Record<string, number>
    sources: string[]
    dataQuality: 'high' | 'medium' | 'low'
    missingData: string[]
    scrapingDetails?: {
      pagesScraped: number
      duration: number
      errors?: string[]
    }
  }
}

export interface ScrapedPage {
  type: string
  url: string
  data: {
    raw: {
      html: string
      text: string
    }
    metadata?: Record<string, any>
    structuredData?: Record<string, any>
    tables?: any[]
  }
  error?: string
  scrapedAt: Date
}

export interface WebsiteData {
  domain: string
  pages: ScrapedPage[]
  timestamp: Date
}

export interface PageToScrape {
  type: string
  path: string
  alternativePaths?: string[]
  requiresJS: boolean
  selectors?: Record<string, string>
}

export interface ResearchJob {
  id: string
  domain: string
  status: 'pending' | 'researching' | 'processing' | 'completed' | 'failed'
  request: CompanyResearchRequest
  result?: CompanyInformationPack
  error?: string
  startedAt: Date
  completedAt?: Date
  durationMs?: number
  pagesScraped?: number
  costUsd?: number
}