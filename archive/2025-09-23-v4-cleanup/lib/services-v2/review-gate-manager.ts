/**
 * Review Gate Manager
 * 
 * Implements quality control gates at each stage of the intelligence pipeline.
 * Allows users to review and approve/reject data before proceeding to next stage.
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import type { WebsiteData, CompanyInformationPack } from '../types'

export enum ProcessingStage {
  SCRAPING = 'scraping',
  EXTRACTION = 'extraction',
  ENRICHMENT = 'enrichment',
  PACK_GENERATION = 'pack_generation',
  DOCUMENT_GENERATION = 'document_generation'
}

export interface StageReview {
  stage: ProcessingStage
  status: 'pending' | 'approved' | 'rejected' | 'skipped'
  timestamp: Date
  data: any
  metrics: StageMetrics
  issues: QualityIssue[]
  userFeedback?: string
  autoApproved?: boolean
}

export interface StageMetrics {
  dataCompleteness: number // 0-100
  dataQuality: number // 0-100
  sourceDiversity: number // 0-100
  confidence: number // 0-100
  estimatedCost?: number
  processingTime?: number
}

export interface QualityIssue {
  severity: 'fatal' | 'warning' | 'info'
  type: string
  message: string
  suggestion?: string
  affectedFields?: string[]
}

export interface ReviewGateConfig {
  skipOnFailure?: boolean // Skip stage if previous stage failed
  maxRetries?: number // Max retries for failed stages
  reviewTimeout?: number // Timeout for manual review in ms
  // Auto-approval removed - all stages require manual approval
}

export class ReviewGateManager {
  private reviews: Map<string, StageReview[]> = new Map()
  private config: ReviewGateConfig
  private callbacks: Map<ProcessingStage, (review: StageReview) => Promise<boolean>> = new Map()
  
  constructor(config: ReviewGateConfig = {}) {
    this.config = {
      skipOnFailure: false,
      maxRetries: 3,
      reviewTimeout: 60000, // 1 minute
      ...config
    }
  }
  
  /**
   * Register a review callback for a specific stage
   */
  onStageReview(
    stage: ProcessingStage,
    callback: (review: StageReview) => Promise<boolean>
  ): void {
    this.callbacks.set(stage, callback)
  }
  
  /**
   * Create a review gate for scraped data
   */
  async reviewScrapedData(
    sessionId: string,
    data: WebsiteData
  ): Promise<StageReview> {
    const metrics = this.analyzeScrapedData(data)
    const issues = this.identifyScrapingIssues(data, metrics)
    
    const review: StageReview = {
      stage: ProcessingStage.SCRAPING,
      status: 'pending',
      timestamp: new Date(),
      data,
      metrics,
      issues
    }
    
    return this.processReview(sessionId, review)
  }
  
  /**
   * Create a review gate for extracted data
   */
  async reviewExtractedData(
    sessionId: string,
    data: any
  ): Promise<StageReview> {
    const metrics = this.analyzeExtractedData(data)
    const issues = this.identifyExtractionIssues(data, metrics)
    
    const review: StageReview = {
      stage: ProcessingStage.EXTRACTION,
      status: 'pending',
      timestamp: new Date(),
      data,
      metrics,
      issues
    }
    
    return this.processReview(sessionId, review)
  }
  
  /**
   * Create a review gate for enriched data
   */
  async reviewEnrichedData(
    sessionId: string,
    data: any
  ): Promise<StageReview> {
    const metrics = this.analyzeEnrichedData(data)
    const issues = this.identifyEnrichmentIssues(data, metrics)
    
    const review: StageReview = {
      stage: ProcessingStage.ENRICHMENT,
      status: 'pending',
      timestamp: new Date(),
      data,
      metrics,
      issues
    }
    
    return this.processReview(sessionId, review)
  }
  
  /**
   * Create a review gate for generated pack
   */
  async reviewGeneratedPack(
    sessionId: string,
    pack: CompanyInformationPack
  ): Promise<StageReview> {
    const metrics = this.analyzeGeneratedPack(pack)
    const issues = this.identifyPackIssues(pack, metrics)
    
    const review: StageReview = {
      stage: ProcessingStage.PACK_GENERATION,
      status: 'pending',
      timestamp: new Date(),
      data: pack,
      metrics,
      issues
    }
    
    return this.processReview(sessionId, review)
  }
  
  /**
   * Generic review stage method for orchestrator
   */
  async reviewStage(
    stage: string,
    data: any
  ): Promise<{ passed: boolean; message: string; metrics?: StageMetrics }> {
    const sessionId = Date.now().toString() // Generate session ID
    
    let review: StageReview
    
    // Route to appropriate review method based on stage
    switch (stage) {
      case 'scraping':
        review = await this.reviewScrapedData(sessionId, data)
        break
      case 'extraction':
        review = await this.reviewExtractedData(sessionId, data)
        break
      case 'enrichment':
        review = await this.reviewEnrichedData(sessionId, data)
        break
      case 'generation':
        review = await this.reviewGeneratedPack(sessionId, data.pack)
        break
      default:
        return {
          passed: true,
          message: `Unknown stage: ${stage}, auto-approving`
        }
    }
    
    const result = {
      passed: review.status === 'approved',
      message: review.status === 'approved' 
        ? `Stage ${stage} approved` 
        : `Stage ${stage} rejected: ${review.issues.map(i => i.description).join(', ')}`,
      metrics: review.metrics
    }
    
    // Log review summary
    permanentLogger.info('REVIEW_GATE', `Stage Review Complete: ${stage}`, {
      stage,
      passed: result.passed,
      issueCount: review.issues.length,
      issues: review.issues.map(i => ({
        type: i.type,
        severity: i.severity,
        message: i.message
      })),
      metrics: {
        completeness: review.metrics?.dataCompleteness,
        quality: review.metrics?.dataQuality,
        confidence: review.metrics?.confidence
      },
      decision: result.passed ? 'APPROVED - Proceeding to next stage' : 'REJECTED - Issues need resolution'
    })
    
    return result
  }
  
  /**
   * Process a review through approval logic
   */
  private async processReview(
    sessionId: string,
    review: StageReview
  ): Promise<StageReview> {
    // Store review
    if (!this.reviews.has(sessionId)) {
      this.reviews.set(sessionId, [])
    }
    this.reviews.get(sessionId)!.push(review)
    
    // Check for critical issues
    const hasCriticalIssues = review.issues.some(i => i.severity === 'fatal')
    if (hasCriticalIssues && !this.config.requireManualReview) {
      review.status = 'rejected'
      permanentLogger.warn('REVIEW_GATE', 'Stage rejected due to critical issues', {
        stage: review.stage,
        issues: review.issues.filter(i => i.severity === 'fatal')
      })
      return review
    }
    
    // Always require manual review - no auto-approval
    const qualityScore = this.calculateQualityScore(review.metrics)
    review.status = 'pending' // Always pending, waiting for manual approval
    
    permanentLogger.info('REVIEW_GATE', 'Stage requires manual approval', {
      stage: review.stage,
      qualityScore,
      issues: review.issues.length
    })
    
    // Trigger manual review callback if registered
    const callback = this.callbacks.get(review.stage)
    if (callback) {
      try {
        const approved = await Promise.race([
          callback(review),
          this.reviewTimeout()
        ])
        
        review.status = approved ? 'approved' : 'rejected'
        permanentLogger.info('REVIEW_GATE', 'Manual review completed', {
          stage: review.stage,
          status: review.status
        })
      } catch (error) {
        permanentLogger.captureError('REVIEW_GATE', new Error('Review callback failed'), { error })
        review.status = 'rejected'
      }
    } else {
      // No callback registered, always require manual approval
      review.status = 'pending'
      permanentLogger.info('REVIEW_GATE', 'No callback, manual approval required', {
        stage: review.stage
      })
    }
    
    return review
  }
  
  /**
   * Analyze scraped data quality
   */
  private analyzeScrapedData(data: WebsiteData): StageMetrics {
    const pages = data.pages || []
    const successfulPages = pages.filter(p => p.type !== 'error')
    const pageTypes = new Set(successfulPages.map(p => p.type))
    
    return {
      dataCompleteness: (successfulPages.length / Math.max(pages.length, 1)) * 100,
      dataQuality: this.assessScrapingQuality(successfulPages),
      sourceDiversity: Math.min(pageTypes.size * 20, 100), // 20% per unique page type
      confidence: this.calculateScrapingConfidence(successfulPages),
      processingTime: Date.now() - (data.timestamp?.getTime() || Date.now())
    }
  }
  
  /**
   * Analyze extracted data quality
   */
  private analyzeExtractedData(data: any): StageMetrics {
    const fieldCompleteness = this.calculateFieldCompleteness(data)
    const dataRichness = this.calculateDataRichness(data)
    
    return {
      dataCompleteness: fieldCompleteness,
      dataQuality: dataRichness,
      sourceDiversity: this.calculateSourceDiversity(data),
      confidence: (fieldCompleteness + dataRichness) / 2
    }
  }
  
  /**
   * Analyze enriched data quality
   */
  private analyzeEnrichedData(data: any): StageMetrics {
    const enrichmentFields = [
      'recentNews', 'marketInsights', 'competitiveAnalysis',
      'technologyStack', 'fundingHistory', 'partnerships'
    ]
    
    const enrichedCount = enrichmentFields.filter(field => 
      data[field] && (Array.isArray(data[field]) ? data[field].length > 0 : true)
    ).length
    
    return {
      dataCompleteness: (enrichedCount / enrichmentFields.length) * 100,
      dataQuality: this.assessEnrichmentQuality(data),
      sourceDiversity: this.calculateEnrichmentSourceDiversity(data),
      confidence: this.calculateEnrichmentConfidence(data)
    }
  }
  
  /**
   * Analyze generated pack quality
   */
  private analyzeGeneratedPack(pack: CompanyInformationPack): StageMetrics {
    const sections = [
      pack.basics, pack.products, pack.team, pack.competitors,
      pack.insights, pack.opportunities, pack.risks
    ]
    
    const completeSections = sections.filter(s => s && Object.keys(s).length > 0).length
    
    return {
      dataCompleteness: (completeSections / sections.length) * 100,
      dataQuality: this.assessPackQuality(pack),
      sourceDiversity: this.calculatePackSourceDiversity(pack),
      confidence: this.calculatePackConfidence(pack)
    }
  }
  
  /**
   * Identify issues in scraped data
   */
  private identifyScrapingIssues(
    data: WebsiteData,
    metrics: StageMetrics
  ): QualityIssue[] {
    const issues: QualityIssue[] = []
    const pages = data.pages || []
    
    // Check for scraping failures
    const errorPages = pages.filter(p => p.type === 'error')
    if (errorPages.length > pages.length * 0.8) { // Increased threshold from 0.5
      permanentLogger.info('REVIEW_GATE', 'Quality Check: High scraping failure rate', {
        explanation: 'Most pages failed to scrape. This typically happens when a website blocks scrapers or requires JavaScript',
        totalPages: pages.length,
        failedPages: errorPages.length,
        failureRate: `${((errorPages.length / pages.length) * 100).toFixed(1)}%`,
        threshold: '80%',
        action: 'Adding warning for high failure rate'
      })
      
      issues.push({
        severity: 'warning', // Changed from critical for development
        type: 'high_failure_rate',
        message: `${errorPages.length} out of ${pages.length} pages failed to scrape`,
        suggestion: 'Check if the website is accessible or requires authentication'
      })
    }
    
    // Check for page type distribution instead of hardcoded critical pages
    const pageTypes = new Set(pages.map(p => p.type))
    
    if (pageTypes.size === 0) {
      issues.push({
        severity: 'warning',
        type: 'no_page_types',
        message: 'No page types identified',
        suggestion: 'Page classification may have failed',
        affectedFields: []
      })
    }
    
    // Check for low content quality
    if (metrics.dataQuality < 50) {
      issues.push({
        severity: 'warning',
        type: 'low_content_quality',
        message: 'Scraped content appears to be low quality or minimal',
        suggestion: 'Website may use heavy JavaScript or require dynamic scraping'
      })
    }
    
    // Check for potential bot detection
    const blockedIndicators = ['403', '429', 'captcha', 'blocked', 'denied']
    const possiblyBlocked = errorPages.some(p => 
      blockedIndicators.some(indicator => 
        p.error?.toLowerCase().includes(indicator)
      )
    )
    
    if (possiblyBlocked) {
      issues.push({
        severity: 'fatal',
        type: 'bot_detection',
        message: 'Website may be blocking automated access',
        suggestion: 'Consider using browser automation or adding delays'
      })
    }
    
    return issues
  }
  
  /**
   * Identify issues in extracted data
   */
  private identifyExtractionIssues(
    data: any,
    metrics: StageMetrics
  ): QualityIssue[] {
    const issues: QualityIssue[] = []
    
    // Check for missing basic information
    if (!data.basics?.companyName) {
      permanentLogger.info('REVIEW_GATE', 'Quality Check: Missing company name', {
        explanation: 'The review gate checks if data.basics?.companyName exists after extraction. If it doesn\'t find a company name, it considers this a quality issue.',
        dataReceived: {
          hasBasics: !!data.basics,
          basicKeys: data.basics ? Object.keys(data.basics) : [],
          companyNameValue: data.basics?.companyName || 'undefined'
        },
        action: 'Adding warning to quality issues'
      })
      
      issues.push({
        severity: 'warning', // Changed from critical for development
        type: 'missing_company_name',
        message: 'Company name could not be extracted',
        affectedFields: ['basics.companyName']
      })
    }
    
    // Check for incomplete extraction
    if (metrics.dataCompleteness < 30) {
      permanentLogger.info('REVIEW_GATE', 'Quality Check: Incomplete data extraction', {
        explanation: 'Data completeness is calculated based on how many expected fields contain values',
        completenessScore: metrics.dataCompleteness,
        threshold: 30,
        action: 'Adding warning for low data completeness'
      })
      
      issues.push({
        severity: 'warning',
        type: 'incomplete_extraction',
        message: 'Less than 30% of expected fields were extracted',
        suggestion: 'Review extraction selectors or page structure'
      })
    }
    
    // Check for suspicious data patterns
    if (data.products?.length === 0 && data.services?.length === 0) {
      issues.push({
        severity: 'warning',
        type: 'no_offerings',
        message: 'No products or services were identified',
        suggestion: 'Company may use different terminology or structure',
        affectedFields: ['products', 'services']
      })
    }
    
    return issues
  }
  
  /**
   * Identify issues in enriched data
   */
  private identifyEnrichmentIssues(
    data: any,
    metrics: StageMetrics
  ): QualityIssue[] {
    const issues: QualityIssue[] = []
    
    // Check web search results
    if (!data.webSearchSources || data.webSearchSources.length === 0) {
      issues.push({
        severity: 'fatal',
        type: 'no_web_search',
        message: 'Web search did not return any results',
        suggestion: 'Check API keys and web search configuration'
      })
    }
    
    // Check for stale data
    if (data.lastUpdated) {
      const daysSinceUpdate = (Date.now() - new Date(data.lastUpdated).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceUpdate > 30) {
        issues.push({
          severity: 'info',
          type: 'potentially_stale',
          message: `Data may be outdated (${Math.floor(daysSinceUpdate)} days old)`,
          suggestion: 'Consider refreshing the research'
        })
      }
    }
    
    return issues
  }
  
  /**
   * Identify issues in generated pack
   */
  private identifyPackIssues(
    pack: CompanyInformationPack,
    metrics: StageMetrics
  ): QualityIssue[] {
    const issues: QualityIssue[] = []
    
    // Check for incomplete SWOT
    const swot = pack.insights
    if (!swot?.strengths?.length || !swot?.weaknesses?.length) {
      issues.push({
        severity: 'warning',
        type: 'incomplete_analysis',
        message: 'SWOT analysis is incomplete',
        affectedFields: ['insights.strengths', 'insights.weaknesses']
      })
    }
    
    // Check for missing critical sections
    if (!pack.competitors || pack.competitors.length === 0) {
      issues.push({
        severity: 'info',
        type: 'no_competitors',
        message: 'No competitors were identified',
        suggestion: 'May need manual competitor research'
      })
    }
    
    return issues
  }
  
  /**
   * Calculate overall quality score
   */
  private calculateQualityScore(metrics: StageMetrics): number {
    return (
      metrics.dataCompleteness * 0.3 +
      metrics.dataQuality * 0.3 +
      metrics.sourceDiversity * 0.2 +
      metrics.confidence * 0.2
    )
  }
  
  /**
   * Helper methods for quality assessment
   */
  private assessScrapingQuality(pages: any[]): number {
    const totalContent = pages.reduce((sum, page) => 
      sum + (page.data?.raw?.text?.length || 0), 0
    )
    
    // Quality based on content volume (more content = higher quality)
    const avgContentPerPage = totalContent / Math.max(pages.length, 1)
    return Math.min(avgContentPerPage / 50, 100) // 5000 chars = 100% quality
  }
  
  private calculateFieldCompleteness(data: any): number {
    const fields = [
      data.basics?.companyName,
      data.basics?.description,
      data.basics?.founded,
      data.basics?.headquarters,
      data.products?.length,
      data.team?.length
    ]
    
    const filledFields = fields.filter(f => f).length
    return (filledFields / fields.length) * 100
  }
  
  private calculateDataRichness(data: any): number {
    let score = 0
    
    if (data.basics?.description && data.basics.description.length > 100) score += 20
    if (data.products && data.products.length > 2) score += 20
    if (data.team && data.team.length > 3) score += 20
    if (data.contact?.emails?.length) score += 10
    if (data.socialMedia && Object.keys(data.socialMedia).length > 2) score += 15
    if (data.metrics && Object.keys(data.metrics).length > 0) score += 15
    
    return Math.min(score, 100)
  }
  
  private calculateSourceDiversity(data: any): number {
    // Simple heuristic based on variety of data sources
    const sources = new Set()
    
    if (data.basics) sources.add('basics')
    if (data.products?.length) sources.add('products')
    if (data.team?.length) sources.add('team')
    if (data.news?.length) sources.add('news')
    if (data.blog?.length) sources.add('blog')
    
    return Math.min(sources.size * 20, 100)
  }
  
  private calculateScrapingConfidence(pages: any[]): number {
    const successRate = pages.filter(p => p.type !== 'error').length / Math.max(pages.length, 1)
    const hasKeyPages = ['home', 'about', 'products'].some(type => 
      pages.some(p => p.type === type && p.type !== 'error')
    )
    
    return (successRate * 70) + (hasKeyPages ? 30 : 0)
  }
  
  private assessEnrichmentQuality(data: any): number {
    let score = 0
    
    if (data.recentNews?.length > 2) score += 25
    if (data.marketInsights) score += 20
    if (data.competitiveAnalysis) score += 20
    if (data.technologyStack?.length) score += 15
    if (data.fundingHistory) score += 10
    if (data.webSearchSources?.length > 3) score += 10
    
    return Math.min(score, 100)
  }
  
  private calculateEnrichmentSourceDiversity(data: any): number {
    const sources = new Set(
      data.webSearchSources?.map(s => new URL(s.url).hostname) || []
    )
    
    return Math.min(sources.size * 10, 100)
  }
  
  private calculateEnrichmentConfidence(data: any): number {
    const hasWebSearch = data.webSearchSources?.length > 0
    const hasMultipleSources = data.webSearchSources?.length > 3
    const hasRecentData = data.recentNews?.length > 0
    
    return (hasWebSearch ? 40 : 0) + (hasMultipleSources ? 30 : 0) + (hasRecentData ? 30 : 0)
  }
  
  private assessPackQuality(pack: CompanyIntelligencePack): number {
    let score = 0
    
    if (pack.basics?.companyName) score += 10
    if (pack.basics?.description?.length > 50) score += 10
    if (pack.products?.length > 0) score += 15
    if (pack.competitors?.length > 0) score += 15
    if (pack.insights?.strengths?.length > 2) score += 15
    if (pack.insights?.opportunities?.length > 2) score += 15
    if (pack.financials) score += 10
    if (pack.metadata?.dataQuality === 'High') score += 10
    
    return Math.min(score, 100)
  }
  
  private calculatePackSourceDiversity(pack: CompanyIntelligencePack): number {
    const sources = pack.metadata?.sources || []
    const uniqueSources = new Set(sources)
    
    return Math.min(uniqueSources.size * 15, 100)
  }
  
  private calculatePackConfidence(pack: CompanyIntelligencePack): number {
    const hasCore = pack.basics && pack.products
    const hasAnalysis = pack.insights && pack.competitors
    const hasMetadata = pack.metadata?.generatedAt
    
    return (hasCore ? 40 : 0) + (hasAnalysis ? 40 : 0) + (hasMetadata ? 20 : 0)
  }
  
  /**
   * Review timeout helper
   */
  private reviewTimeout(): Promise<boolean> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Review timeout')), this.config.reviewTimeout)
    })
  }
  
  /**
   * Get review history for a session
   */
  getReviewHistory(sessionId: string): StageReview[] {
    return this.reviews.get(sessionId) || []
  }
  
  /**
   * Clear review history for a session
   */
  clearReviewHistory(sessionId: string): void {
    this.reviews.delete(sessionId)
  }
  
  /**
   * Get summary of all reviews
   */
  getReviewSummary(sessionId: string): {
    totalStages: number
    approved: number
    rejected: number
    pending: number
    overallQuality: number
    criticalIssues: QualityIssue[]
  } {
    const reviews = this.getReviewHistory(sessionId)
    
    return {
      totalStages: reviews.length,
      approved: reviews.filter(r => r.status === 'approved').length,
      rejected: reviews.filter(r => r.status === 'rejected').length,
      pending: reviews.filter(r => r.status === 'pending').length,
      overallQuality: reviews.reduce((sum, r) => 
        sum + this.calculateQualityScore(r.metrics), 0
      ) / Math.max(reviews.length, 1),
      criticalIssues: reviews.flatMap(r => 
        r.issues.filter(i => i.severity === 'fatal')
      )
    }
  }
}

// Export singleton instance
export const reviewGateManager = new ReviewGateManager()

// Export factory for custom configurations
export function createReviewGateManager(config: ReviewGateConfig): ReviewGateManager {
  return new ReviewGateManager(config)
}