/**
 * Content Validator for Multi-Phase Scraping
 * Validates scraped content to determine if enhancement is needed
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'

export interface ValidationResult {
  isValid: boolean
  score: number // 0-1 confidence score
  issues: ValidationIssue[]
  needsEnhancement: boolean
  enhancementReason?: string
  metrics: {
    contentLength: number
    imageCount: number
    linkCount: number
    hasMainContent: boolean
    hasNavigation: boolean
    hasContactInfo: boolean
    hasProducts: boolean
    jsPlaceholders: number
  }
}

export interface ValidationIssue {
  type: 'EMPTY_CONTENT' | 'JS_PLACEHOLDERS' | 'MISSING_IMAGES' | 'INCOMPLETE_FORMS' | 
        'NO_PRICES' | 'NO_CONTACT' | 'LOW_CONTENT' | 'BROKEN_LINKS' | 'EMPTY_DIVS'
  severity: 'fatal' | 'warning' | 'info'
  description: string
  selector?: string
}

export class ContentValidator {
  private minContentLength = 500
  private jsFrameworkSelectors = [
    'div#root:empty',
    'div#__next:empty',
    'div#app:empty',
    'app-root:empty',
    'div[data-reactroot]:empty',
    'div.ng-scope:empty'
  ]
  
  private placeholderPatterns = [
    /\{\{.*?\}\}/g,  // Vue/Angular templates
    /\[.*?\]/g,      // React placeholders
    /__.*?__/g,      // Common placeholder pattern
    /loading\.\.\./gi,
    /placeholder/gi,
    /skeleton/gi
  ]

  /**
   * Validate scraped content and determine if enhancement is needed
   */
  public validate(scrapedData: any): ValidationResult {
    const startTime = Date.now()
    const issues: ValidationIssue[] = []
    
    permanentLogger.info('CONTENT_VALIDATOR', '🔍 Starting content validation', {
      url: scrapedData.url,
      hasContent: !!scrapedData.content,
      contentLength: scrapedData.content?.length || 0 })

    // Extract metrics
    const metrics = this.extractMetrics(scrapedData)
    
    // Check for empty or low content
    if (!scrapedData.content || metrics.contentLength < this.minContentLength) {
      issues.push({
        type: 'LOW_CONTENT',
        severity: 'fatal',
        description: `Content too short: ${metrics.contentLength} chars (min: ${this.minContentLength})`
      })
    }

    // Check for JavaScript placeholders
    const jsPlaceholders = this.detectJsPlaceholders(scrapedData.content || '')
    if (jsPlaceholders > 0) {
      issues.push({
        type: 'JS_PLACEHOLDERS',
        severity: 'fatal',
        description: `Found ${jsPlaceholders} JavaScript placeholders - content not fully rendered`
      })
      metrics.jsPlaceholders = jsPlaceholders
    }

    // Check for missing images (data-src without src)
    if (scrapedData.images) {
      // Handle both array and object with 'all' property
      const imageArray = Array.isArray(scrapedData.images) 
        ? scrapedData.images 
        : (scrapedData.images.all || [])
      
      const lazyImages = imageArray.filter((img: any) => 
        typeof img === 'string' && (
          img.includes('data-src') || img.includes('lazy') || img.includes('placeholder')
        )
      )
      if (lazyImages.length > 0) {
        issues.push({
          type: 'MISSING_IMAGES',
          severity: 'warning',
          description: `${lazyImages.length} images not loaded (lazy loading detected)`
        })
      }
    }

    // Check for product data completeness
    if (scrapedData.products && scrapedData.products.length > 0) {
      const productsWithoutPrices = scrapedData.products.filter((p: any) => !p.price)
      if (productsWithoutPrices.length > 0) {
        issues.push({
          type: 'NO_PRICES',
          severity: 'fatal',
          description: `${productsWithoutPrices.length} products missing prices`
        })
      }
    }

    // Check for contact information
    if (!metrics.hasContactInfo && scrapedData.url?.includes('contact')) {
      issues.push({
        type: 'NO_CONTACT',
        severity: 'warning',
        description: 'Contact page missing contact information'
      })
    }

    // Check for empty framework root divs
    const emptyRootDivs = this.detectEmptyFrameworkDivs(scrapedData.content || '')
    if (emptyRootDivs.length > 0) {
      issues.push({
        type: 'EMPTY_DIVS',
        severity: 'fatal',
        description: `Empty framework root divs detected: ${emptyRootDivs.join(', ')}`,
        selector: emptyRootDivs[0]
      })
    }

    // Calculate validation score
    const score = this.calculateScore(metrics, issues)
    
    // Determine if enhancement is needed
    const needsEnhancement = this.shouldEnhance(score, issues)
    const enhancementReason = needsEnhancement 
      ? this.getEnhancementReason(issues) 
      : undefined

    const result: ValidationResult = {
      isValid: score > 0.7,
      score,
      issues,
      needsEnhancement,
      enhancementReason,
      metrics
    }

    permanentLogger.info('CONTENT_VALIDATOR', '✅ Validation complete', {
      url: scrapedData.url,
      score: score.toFixed(2),
      isValid: result.isValid,
      needsEnhancement,
      enhancementReason,
      issueCount: issues.length,
      criticalIssues: issues.filter(i => i.severity === 'fatal').length,
      duration: Date.now() - startTime
    })

    return result
  }

  /**
   * Extract metrics from scraped data
   */
  private extractMetrics(data: any): ValidationResult['metrics'] {
    const content = data.content || ''
    
    return {
      contentLength: content.length,
      imageCount: Array.isArray(data.images) 
        ? data.images.length 
        : (data.images?.all?.length || 0),
      linkCount: data.links?.length || 0,
      hasMainContent: content.length > this.minContentLength,
      hasNavigation: !!data.navigationItems?.length,
      hasContactInfo: !!(data.contactInfo?.emails?.length || 
                         data.contactInfo?.phones?.length ||
                         data.contactInfo?.addresses?.length),
      hasProducts: !!data.products?.length,
      jsPlaceholders: 0
    }
  }

  /**
   * Detect JavaScript placeholders in content
   */
  private detectJsPlaceholders(content: string): number {
    let count = 0
    
    for (const pattern of this.placeholderPatterns) {
      const matches = content.match(pattern)
      if (matches) {
        count += matches.length
      }
    }
    
    return count
  }

  /**
   * Detect empty framework root divs
   */
  private detectEmptyFrameworkDivs(content: string): string[] {
    const emptyDivs: string[] = []
    
    for (const selector of this.jsFrameworkSelectors) {
      if (content.includes(selector.replace(':empty', ''))) {
        // Check if the div is actually empty or just has whitespace
        const divPattern = new RegExp(`<div[^>]*${selector.replace(':empty', '').replace('#', 'id="').replace('div', '')}[^>]*>\\s*</div>`)
        if (divPattern.test(content)) {
          emptyDivs.push(selector)
        }
      }
    }
    
    return emptyDivs
  }

  /**
   * Calculate validation score based on metrics and issues
   */
  private calculateScore(metrics: ValidationResult['metrics'], issues: ValidationIssue[]): number {
    let score = 1.0
    
    // Deduct for critical issues
    const criticalIssues = issues.filter(i => i.severity === 'fatal')
    score -= criticalIssues.length * 0.3
    
    // Deduct for warnings
    const warnings = issues.filter(i => i.severity === 'warning')
    score -= warnings.length * 0.1
    
    // Bonus for good metrics
    if (metrics.hasMainContent) score += 0.1
    if (metrics.hasNavigation) score += 0.05
    if (metrics.hasContactInfo) score += 0.05
    if (metrics.imageCount > 0) score += 0.05
    
    // Ensure score is between 0 and 1
    return Math.max(0, Math.min(1, score))
  }

  /**
   * Determine if content needs enhancement with Playwright
   */
  private shouldEnhance(score: number, issues: ValidationIssue[]): boolean {
    // Always enhance if score is below threshold
    if (score < 0.5) return true
    
    // Check for critical issues that require enhancement
    const criticalTypes: ValidationIssue['type'][] = [
      'EMPTY_CONTENT',
      'JS_PLACEHOLDERS',
      'NO_PRICES',
      'EMPTY_DIVS'
    ]
    
    return issues.some(issue => 
      issue.severity === 'fatal' && 
      criticalTypes.includes(issue.type)
    )
  }

  /**
   * Get human-readable enhancement reason
   */
  private getEnhancementReason(issues: ValidationIssue[]): string {
    const critical = issues.find(i => i.severity === 'fatal')
    
    if (critical) {
      switch (critical.type) {
        case 'EMPTY_CONTENT':
        case 'LOW_CONTENT':
          return 'Content too short or empty - needs JavaScript rendering'
        case 'JS_PLACEHOLDERS':
          return 'JavaScript placeholders detected - content not fully rendered'
        case 'EMPTY_DIVS':
          return 'Empty framework root divs - requires client-side rendering'
        case 'NO_PRICES':
          return 'Product prices missing - likely loaded dynamically'
        default:
          return critical.description
      }
    }
    
    return 'Low validation score - enhancement recommended'
  }

  /**
   * Validate a batch of pages and return enhancement candidates
   */
  public validateBatch(scrapedPages: any[]): {
    validPages: any[]
    needsEnhancement: Array<{ page: any; reason: string }>
    stats: {
      totalPages: number
      validCount: number
      enhancementCount: number
      averageScore: number
    }
  } {
    permanentLogger.info('CONTENT_VALIDATOR', '📊 Validating batch', { pageCount: scrapedPages.length})

    const validPages: any[] = []
    const needsEnhancement: Array<{ page: any; reason: string }> = []
    let totalScore = 0

    for (const page of scrapedPages) {
      const validation = this.validate(page)
      totalScore += validation.score

      if (validation.needsEnhancement) {
        needsEnhancement.push({
          page,
          reason: validation.enhancementReason || 'Unknown'
        })
      } else {
        validPages.push(page)
      }
    }

    const stats = {
      totalPages: scrapedPages.length,
      validCount: validPages.length,
      enhancementCount: needsEnhancement.length,
      averageScore: totalScore / scrapedPages.length
    }

    permanentLogger.info('CONTENT_VALIDATOR', '✅ Batch validation complete', {
      ...stats,
      enhancementPercentage: `${Math.round((stats.enhancementCount / stats.totalPages) * 100)}%`
    })

    return { validPages, needsEnhancement, stats }
  }
}