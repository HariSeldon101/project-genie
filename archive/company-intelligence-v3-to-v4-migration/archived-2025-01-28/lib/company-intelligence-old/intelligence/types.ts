/**
 * Page Intelligence & Classification System Types
 * TypeScript interfaces for the discovery phase enhancement
 */

export type PageType = 
  | 'homepage'
  | 'about'
  | 'team'
  | 'contact'
  | 'blog'
  | 'blog_post'
  | 'product'
  | 'product_listing'
  | 'service'
  | 'pricing'
  | 'faq'
  | 'support'
  | 'careers'
  | 'news'
  | 'press'
  | 'legal'
  | 'privacy'
  | 'terms'
  | 'case_study'
  | 'testimonial'
  | 'portfolio'
  | 'documentation'
  | 'download'
  | 'login'
  | 'signup'
  | 'unknown'

export interface URLPatternMatch {
  pattern: string
  pageType: PageType
  confidence: number
  matchType: 'path' | 'filename' | 'parameter' | 'subdomain'
}

export interface ContentSignal {
  signal: string
  pageType: PageType
  confidence: number
  signalType: 'html_element' | 'css_class' | 'text_content' | 'structure'
  evidence: string[]
}

export interface MetaTagData {
  // Basic SEO
  title?: string
  description?: string
  keywords?: string[]
  author?: string
  canonical?: string
  robots?: string
  
  // Open Graph (Facebook, LinkedIn)
  ogTitle?: string
  ogDescription?: string
  ogImage?: string
  ogType?: string
  ogUrl?: string
  ogSiteName?: string
  
  // Twitter Card
  twitterCard?: string
  twitterTitle?: string
  twitterDescription?: string
  twitterImage?: string
  twitterSite?: string
  twitterCreator?: string
  
  // Additional metadata
  viewport?: string
  generator?: string
  language?: string
  charset?: string
  themeColor?: string
  favicon?: string
}

export interface StructuredData {
  // JSON-LD data
  jsonLd?: Array<{
    '@type': string
    '@context'?: string
    [key: string]: any
  }>
  
  // Microdata
  microdata?: Array<{
    type: string
    properties: Record<string, any>
  }>
  
  // Schema.org types detected
  schemaTypes?: string[]
  
  // Organization data
  organization?: {
    name?: string
    type?: string
    url?: string
    logo?: string
    description?: string
    contactPoints?: Array<{
      type: string
      telephone?: string
      email?: string
    }>
  }
  
  // Product data
  products?: Array<{
    name: string
    description?: string
    price?: string
    currency?: string
    availability?: string
    image?: string
    brand?: string
  }>
  
  // Person data (for team pages)
  people?: Array<{
    name: string
    jobTitle?: string
    image?: string
    url?: string
    email?: string
  }>
  
  // Article/Blog data
  articles?: Array<{
    headline: string
    author?: string
    datePublished?: string
    dateModified?: string
    image?: string
    articleSection?: string
  }>
}

export interface PageClassificationResult {
  url: string
  pageType: PageType
  confidence: number
  
  // Classification evidence
  urlPatterns: URLPatternMatch[]
  contentSignals: ContentSignal[]
  
  // Extracted data
  metaData: MetaTagData
  structuredData: StructuredData
  
  // Analysis metadata
  analysisTimestamp: Date
  processingTimeMs: number
  errors?: string[]
  warnings?: string[]
}

export interface PageIntelligenceConfig {
  // URL pattern matching
  enableUrlPatterns: boolean
  urlPatternWeight: number
  
  // Content analysis
  enableContentAnalysis: boolean
  contentAnalysisWeight: number
  
  // Structured data extraction
  enableStructuredData: boolean
  
  // Meta tag extraction
  enableMetaExtraction: boolean
  
  // Confidence thresholds
  minimumConfidence: number
  highConfidenceThreshold: number
  
  // Performance limits
  maxProcessingTime: number
  enableDetailedLogging: boolean
}

export interface IntelligenceSession {
  sessionId: string
  domain: string
  startedAt: Date
  config: PageIntelligenceConfig
  
  // Results
  pagesAnalyzed: number
  successfulClassifications: number
  failedClassifications: number
  
  // Performance metrics
  totalProcessingTime: number
  averageProcessingTime: number
  
  // Summary by page type
  pageTypeCounts: Record<PageType, number>
  
  // Quality metrics
  averageConfidence: number
  highConfidencePages: number
  lowConfidencePages: number
}

export interface PageIntelligenceError extends Error {
  code: 'FETCH_FAILED' | 'PARSE_FAILED' | 'TIMEOUT' | 'INVALID_URL' | 'UNKNOWN'
  url?: string
  details?: any
}

// Database schema interfaces
export interface PageIntelligenceRecord {
  id: string
  session_id: string
  url: string
  page_type: PageType
  confidence_score: number
  classification_data: {
    url_patterns: URLPatternMatch[]
    content_signals: ContentSignal[]
  }
  structured_data: StructuredData
  meta_data: MetaTagData
  created_at: Date
}

// Aggregated intelligence insights
export interface IntelligenceSummary {
  domain: string
  totalPages: number
  
  // Page type distribution
  pageTypeDistribution: Record<PageType, {
    count: number
    percentage: number
    averageConfidence: number
  }>
  
  // Key insights
  hasEcommerce: boolean
  hasBlog: boolean
  hasTeamPage: boolean
  hasProductPages: boolean
  
  // Quality indicators
  overallConfidence: number
  structuredDataCoverage: number
  metaDataCompleteness: number
  
  // Technology indicators
  detectedTechnologies: string[]
  seoOptimization: 'high' | 'medium' | 'low'
  
  // Content insights
  contentStrategy: {
    blogFrequency?: 'high' | 'medium' | 'low'
    productFocus: boolean
    serviceOriented: boolean
    b2bFocus: boolean
    b2cFocus: boolean
  }
}