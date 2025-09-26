/**
 * News & Regulatory Enricher
 * Discovers and aggregates news, press releases, and regulatory filings
 * Following DRY principles with shared interfaces
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { 
  NewsItem,
  EnrichmentResult 
} from '../types/external-intelligence'

interface NewsSource {
  name: string
  searchPattern: string
  isRegulatory: boolean
  priority: number
}

export class NewsRegulatoryEnricher {
  private readonly searchTimeout = 10000
  private readonly maxArticles = 20
  private readonly maxAge = 365 // Days

  // News source configurations (DRY principle)
  private readonly newsSources: NewsSource[] = [
    // Regulatory sources (highest priority)
    { name: 'SEC', searchPattern: 'site:sec.gov "{company}"', isRegulatory: true, priority: 1 },
    { name: 'LSE RNS', searchPattern: 'site:londonstockexchange.com/news "{company}"', isRegulatory: true, priority: 1 },
    { name: 'ASX', searchPattern: 'site:asx.com.au "{company}" announcements', isRegulatory: true, priority: 1 },
    
    // Business news sources
    { name: 'Reuters', searchPattern: 'site:reuters.com "{company}"', isRegulatory: false, priority: 2 },
    { name: 'Bloomberg', searchPattern: 'site:bloomberg.com "{company}"', isRegulatory: false, priority: 2 },
    { name: 'Financial Times', searchPattern: 'site:ft.com "{company}"', isRegulatory: false, priority: 2 },
    { name: 'Wall Street Journal', searchPattern: 'site:wsj.com "{company}"', isRegulatory: false, priority: 2 },
    
    // Tech news sources
    { name: 'TechCrunch', searchPattern: 'site:techcrunch.com "{company}"', isRegulatory: false, priority: 3 },
    { name: 'The Verge', searchPattern: 'site:theverge.com "{company}"', isRegulatory: false, priority: 3 },
    { name: 'Wired', searchPattern: 'site:wired.com "{company}"', isRegulatory: false, priority: 3 },
    
    // General news
    { name: 'Press Releases', searchPattern: '"{company}" "press release" OR "announces"', isRegulatory: false, priority: 4 },
    { name: 'Industry News', searchPattern: '"{company}" news latest', isRegulatory: false, priority: 5 }
  ]

  /**
   * Main enrichment method for news and regulatory data
   */
  async enrich(
    companyName: string,
    domain: string,
    sessionId: string,
    isPublicCompany: boolean = false
  ): Promise<EnrichmentResult> {
    const startTime = Date.now()
    
    permanentLogger.info('NEWS_REGULATORY_ENRICHER', 'Starting news enrichment', { companyName,
      domain,
      sessionId,
      isPublicCompany })

    try {
      // Step 1: Collect news from various sources
      const allNews: NewsItem[] = []
      
      // Prioritize regulatory sources for public companies
      const sources = isPublicCompany 
        ? this.newsSources.sort((a, b) => a.priority - b.priority)
        : this.newsSources.filter(s => !s.isRegulatory).sort((a, b) => a.priority - b.priority)

      for (const source of sources) {
        if (allNews.length >= this.maxArticles) break
        
        const newsItems = await this.searchNewsSource(
          source,
          companyName,
          domain,
          sessionId
        )
        
        allNews.push(...newsItems)
        
        permanentLogger.info('NEWS_REGULATORY_ENRICHER', 'Source searched', { source: source.name,
          itemsFound: newsItems.length,
          totalSoFar: allNews.length })
      }

      // Step 2: Deduplicate and sort by relevance/date
      const uniqueNews = this.deduplicateNews(allNews)
      const sortedNews = this.sortNewsByRelevance(uniqueNews)
      
      // Step 3: Limit to max articles
      const finalNews = sortedNews.slice(0, this.maxArticles)

      // Step 4: Analyze sentiment for each article
      const analyzedNews = await this.analyzeNewsSentiment(finalNews)

      permanentLogger.info('NEWS_REGULATORY_ENRICHER', 'News enrichment completed', {
        companyName,
        totalArticles: analyzedNews.length,
        regulatoryCount: analyzedNews.filter(n => n.isRegulatory).length,
        averageSentiment: this.calculateAverageSentiment(analyzedNews),
        duration: Date.now() - startTime
      })

      return {
        success: true,
        source: 'news',
        data: analyzedNews,
        duration: Date.now() - startTime,
        timestamp: new Date()
      }

    } catch (error) {
      permanentLogger.captureError('NEWS_REGULATORY_ENRICHER', error as Error, {
        message: 'Enrichment failed',
        companyName,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })

      return {
        success: false,
        source: 'news',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
        timestamp: new Date()
      }
    }
  }

  /**
   * Search a specific news source
   */
  private async searchNewsSource(
    source: NewsSource,
    companyName: string,
    domain: string,
    sessionId: string
  ): Promise<NewsItem[]> {
    permanentLogger.info('NEWS_REGULATORY_ENRICHER', 'Searching news source', { source: source.name,
      companyName })

    const newsItems: NewsItem[] = []

    try {
      // Build search query
      const query = source.searchPattern
        .replace('{company}', companyName)
        .replace('{domain}', domain.replace(/\.(com|org|net|io|co|uk).*/, ''))

      // Add date filter for recent news
      const dateFilter = ` after:${this.getDateFilter()}`
      const fullQuery = query + dateFilter

      const response = await fetch('/api/web-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: fullQuery,
          maxResults: 10
        }),
        signal: AbortSignal.timeout(this.searchTimeout)
      })

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`)
      }

      const results = await response.json()
      
      // Parse search results into news items
      for (const result of (results.items || [])) {
        const newsItem = this.parseSearchResult(
          result,
          source,
          companyName,
          sessionId
        )
        
        if (newsItem && this.isRelevant(newsItem, companyName)) {
          newsItems.push(newsItem)
        }
      }

    } catch (error) {
      permanentLogger.captureError('NEWS_REGULATORY_ENRICHER', error as Error, {
        message: 'Source search failed',
        source: source.name,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    return newsItems
  }

  /**
   * Parse search result into NewsItem
   */
  private parseSearchResult(
    result: any,
    source: NewsSource,
    companyName: string,
    sessionId: string
  ): NewsItem | null {
    try {
      const url = result.link || result.url
      const title = result.title || ''
      const snippet = result.snippet || result.description || ''
      
      if (!url || !title) return null

      // Extract date from result
      const publishedDate = this.extractDate(result, snippet)
      
      // Skip if article is too old
      if (this.isTooOld(publishedDate)) {
        return null
      }

      // Determine categories
      const categories = this.extractCategories(title, snippet, source)
      
      // Extract entities mentioned
      const entities = this.extractEntities(title + ' ' + snippet, companyName)

      // Calculate initial relevance
      const relevanceScore = this.calculateRelevance(
        title,
        snippet,
        companyName,
        source.isRegulatory
      )

      const newsItem: NewsItem = {
        sessionId,
        sourceType: source.isRegulatory ? 'regulatory' : 'news',
        fetchedAt: new Date(),
        confidence: relevanceScore,
        title: this.cleanTitle(title),
        url,
        source: source.name,
        publishedDate,
        summary: this.cleanSummary(snippet),
        sentiment: 'neutral', // Will be analyzed later
        sentimentScore: 0,
        relevanceScore,
        categories,
        entities,
        isRegulatory: source.isRegulatory
      }

      // Add regulatory type if applicable
      if (source.isRegulatory) {
        newsItem.regulatoryType = this.extractRegulatoryType(title, url)
      }

      permanentLogger.info('NEWS_REGULATORY_ENRICHER', 'Parsed news item', {
        title: newsItem.title.substring(0, 50),
        source: source.name,
        relevance: relevanceScore
      })

      return newsItem

    } catch (error) {
      permanentLogger.captureError('NEWS_REGULATORY_ENRICHER', error as Error, {
        message: 'Failed to parse result',
        source: source.name,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
      return null
    }
  }

  /**
   * Extract date from search result
   */
  private extractDate(result: any, snippet: string): Date {
    // Try to get date from result metadata
    if (result.date) {
      return new Date(result.date)
    }

    // Try to extract from snippet
    const datePatterns = [
      /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i,
      /(\d{4})-(\d{2})-(\d{2})/,
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
      /(\d+)\s+(hours?|days?|weeks?|months?)\s+ago/i
    ]

    for (const pattern of datePatterns) {
      const match = pattern.exec(snippet)
      if (match) {
        // Handle relative dates
        if (match[0].includes('ago')) {
          return this.parseRelativeDate(match[0])
        }
        
        // Parse absolute date
        try {
          return new Date(match[0])
        } catch {
          continue
        }
      }
    }

    // Default to today if no date found
    return new Date()
  }

  /**
   * Parse relative date string
   */
  private parseRelativeDate(relativeDate: string): Date {
    const date = new Date()
    const match = relativeDate.match(/(\d+)\s+(hour|day|week|month)s?/i)
    
    if (match) {
      const amount = parseInt(match[1])
      const unit = match[2].toLowerCase()
      
      switch (unit) {
        case 'hour':
          date.setHours(date.getHours() - amount)
          break
        case 'day':
          date.setDate(date.getDate() - amount)
          break
        case 'week':
          date.setDate(date.getDate() - (amount * 7))
          break
        case 'month':
          date.setMonth(date.getMonth() - amount)
          break
      }
    }
    
    return date
  }

  /**
   * Check if article is too old
   */
  private isTooOld(date: Date): boolean {
    const ageInDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
    return ageInDays > this.maxAge
  }

  /**
   * Get date filter for search
   */
  private getDateFilter(): string {
    const date = new Date()
    date.setDate(date.getDate() - this.maxAge)
    return date.toISOString().split('T')[0]
  }

  /**
   * Extract categories from content
   */
  private extractCategories(title: string, snippet: string, source: NewsSource): string[] {
    const categories: string[] = []
    const content = (title + ' ' + snippet).toLowerCase()

    // Category keywords
    const categoryMap: Record<string, string[]> = {
      'Financial': ['earnings', 'revenue', 'profit', 'loss', 'financial', 'quarterly', 'annual report'],
      'Product': ['launch', 'product', 'release', 'announce', 'unveil', 'introduce'],
      'Leadership': ['ceo', 'cfo', 'cto', 'appoint', 'resign', 'hire', 'executive', 'board'],
      'Merger & Acquisition': ['acquire', 'acquisition', 'merger', 'buy', 'purchase', 'deal'],
      'Partnership': ['partner', 'collaboration', 'alliance', 'joint venture', 'agreement'],
      'Legal': ['lawsuit', 'legal', 'court', 'settlement', 'regulatory', 'compliance'],
      'Technology': ['technology', 'innovation', 'ai', 'blockchain', 'cloud', 'software'],
      'Expansion': ['expand', 'growth', 'new market', 'international', 'global'],
      'Investment': ['investment', 'funding', 'raise', 'valuation', 'ipo', 'venture'],
      'ESG': ['sustainability', 'environment', 'social', 'governance', 'esg', 'carbon']
    }

    for (const [category, keywords] of Object.entries(categoryMap)) {
      if (keywords.some(keyword => content.includes(keyword))) {
        categories.push(category)
      }
    }

    // Add source as category if regulatory
    if (source.isRegulatory) {
      categories.push('Regulatory')
    }

    // Default category if none found
    if (categories.length === 0) {
      categories.push('General')
    }

    return [...new Set(categories)] // Remove duplicates
  }

  /**
   * Extract entities mentioned in content
   */
  private extractEntities(content: string, primaryCompany: string): string[] {
    const entities: string[] = [primaryCompany]
    
    // Common company indicators
    const companyPatterns = [
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:Inc|Corp|Ltd|LLC|PLC|AG|SA|NV)\b/g,
      /\b(?:CEO|CFO|CTO|President|Director)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g
    ]

    for (const pattern of companyPatterns) {
      let match
      while ((match = pattern.exec(content)) !== null) {
        const entity = match[1].trim()
        if (entity && entity !== primaryCompany && !entities.includes(entity)) {
          entities.push(entity)
        }
      }
    }

    // Extract stock tickers
    const tickerPattern = /\b([A-Z]{2,5})\b(?:\s*:\s*[A-Z]+)?/g
    let tickerMatch
    while ((tickerMatch = tickerPattern.exec(content)) !== null) {
      const ticker = tickerMatch[1]
      if (ticker.length >= 2 && ticker.length <= 5 && !entities.includes(ticker)) {
        entities.push(ticker)
      }
    }

    return entities.slice(0, 10) // Limit to 10 entities
  }

  /**
   * Extract regulatory filing type
   */
  private extractRegulatoryType(title: string, url: string): string | undefined {
    const content = (title + ' ' + url).toUpperCase()
    
    // SEC filing types
    const secFilings = ['10-K', '10-Q', '8-K', 'DEF 14A', 'S-1', 'S-4', '20-F', '11-K']
    for (const filing of secFilings) {
      if (content.includes(filing)) {
        return `SEC ${filing}`
      }
    }

    // UK regulatory types
    if (content.includes('RNS')) return 'LSE RNS'
    if (content.includes('ANNUAL REPORT')) return 'Annual Report'
    if (content.includes('INTERIM')) return 'Interim Report'
    
    // Australian regulatory
    if (content.includes('ASX')) return 'ASX Announcement'
    
    // General regulatory
    if (content.includes('FILING')) return 'Regulatory Filing'
    if (content.includes('DISCLOSURE')) return 'Disclosure'
    
    return undefined
  }

  /**
   * Calculate relevance score
   */
  private calculateRelevance(
    title: string,
    snippet: string,
    companyName: string,
    isRegulatory: boolean
  ): number {
    let score = 0

    const content = (title + ' ' + snippet).toLowerCase()
    const company = companyName.toLowerCase()

    // Title mentions company (highest weight)
    if (title.toLowerCase().includes(company)) {
      score += 0.4
    }

    // Snippet mentions company
    const companyMentions = (content.match(new RegExp(company, 'gi')) || []).length
    score += Math.min(0.2, companyMentions * 0.05)

    // Regulatory content gets bonus
    if (isRegulatory) {
      score += 0.2
    }

    // Recent news gets bonus
    const agePattern = /(\d+)\s+(hours?|days?)\s+ago/i
    const ageMatch = agePattern.exec(snippet)
    if (ageMatch) {
      const amount = parseInt(ageMatch[1])
      const unit = ageMatch[2].toLowerCase()
      
      if (unit.includes('hour')) {
        score += 0.1
      } else if (unit.includes('day') && amount <= 7) {
        score += 0.05
      }
    }

    // Important keywords
    const importantKeywords = [
      'breaking', 'exclusive', 'announcement', 'official',
      'confirmed', 'major', 'significant', 'fatal'
    ]
    
    if (importantKeywords.some(keyword => content.includes(keyword))) {
      score += 0.1
    }

    return Math.min(1, score)
  }

  /**
   * Check if news item is relevant
   */
  private isRelevant(newsItem: NewsItem, companyName: string): boolean {
    // Must mention company in title or have high relevance
    const titleMentions = newsItem.title.toLowerCase().includes(companyName.toLowerCase())
    const highRelevance = newsItem.relevanceScore > 0.5
    
    return titleMentions || highRelevance || newsItem.isRegulatory
  }

  /**
   * Clean title text
   */
  private cleanTitle(title: string): string {
    return title
      .replace(/\s*[\|\-–—]\s*.*$/, '') // Remove site name suffixes
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Clean summary text
   */
  private cleanSummary(summary: string): string {
    return summary
      .replace(/\.\.\./g, '…')
      .replace(/\s+/g, ' ')
      .replace(/^[\s\-–—]+/, '')
      .trim()
  }

  /**
   * Deduplicate news items
   */
  private deduplicateNews(newsItems: NewsItem[]): NewsItem[] {
    const seen = new Map<string, NewsItem>()
    
    for (const item of newsItems) {
      // Use URL as primary key
      const key = item.url
      
      // Keep the item with higher relevance score
      if (!seen.has(key) || (seen.get(key)!.relevanceScore < item.relevanceScore)) {
        seen.set(key, item)
      }
    }
    
    permanentLogger.info('NEWS_REGULATORY_ENRICHER', 'Deduplicated news', { original: newsItems.length,
      unique: seen.size })
    
    return Array.from(seen.values())
  }

  /**
   * Sort news by relevance and date
   */
  private sortNewsByRelevance(newsItems: NewsItem[]): NewsItem[] {
    return newsItems.sort((a, b) => {
      // Regulatory items first
      if (a.isRegulatory !== b.isRegulatory) {
        return a.isRegulatory ? -1 : 1
      }
      
      // Then by relevance score
      if (Math.abs(a.relevanceScore - b.relevanceScore) > 0.1) {
        return b.relevanceScore - a.relevanceScore
      }
      
      // Finally by date (newest first)
      return b.publishedDate.getTime() - a.publishedDate.getTime()
    })
  }

  /**
   * Analyze sentiment for news items
   */
  private async analyzeNewsSentiment(newsItems: NewsItem[]): Promise<NewsItem[]> {
    permanentLogger.info('NEWS_REGULATORY_ENRICHER', 'Analyzing sentiment', { count: newsItems.length})

    for (const item of newsItems) {
      const sentiment = this.analyzeSentiment(item.title + ' ' + item.summary)
      item.sentiment = sentiment.sentiment
      item.sentimentScore = sentiment.score
    }

    return newsItems
  }

  /**
   * Simple sentiment analysis
   */
  private analyzeSentiment(text: string): { sentiment: 'positive' | 'negative' | 'neutral', score: number } {
    const content = text.toLowerCase()
    
    // Sentiment keywords
    const positiveWords = [
      'growth', 'profit', 'success', 'increase', 'improve', 'gain',
      'positive', 'strong', 'exceed', 'outperform', 'innovate',
      'expand', 'win', 'achieve', 'breakthrough', 'record'
    ]
    
    const negativeWords = [
      'loss', 'decline', 'decrease', 'fail', 'weak', 'concern',
      'negative', 'lawsuit', 'investigation', 'recall', 'delay',
      'miss', 'below', 'cut', 'reduce', 'warning'
    ]
    
    let positiveCount = 0
    let negativeCount = 0
    
    for (const word of positiveWords) {
      if (content.includes(word)) positiveCount++
    }
    
    for (const word of negativeWords) {
      if (content.includes(word)) negativeCount++
    }
    
    const totalWords = positiveCount + negativeCount
    
    if (totalWords === 0) {
      return { sentiment: 'neutral', score: 0 }
    }
    
    const score = (positiveCount - negativeCount) / totalWords
    
    if (score > 0.2) {
      return { sentiment: 'positive', score }
    } else if (score < -0.2) {
      return { sentiment: 'negative', score }
    } else {
      return { sentiment: 'neutral', score }
    }
  }

  /**
   * Calculate average sentiment
   */
  private calculateAverageSentiment(newsItems: NewsItem[]): number {
    if (newsItems.length === 0) return 0
    
    const sum = newsItems.reduce((acc, item) => acc + item.sentimentScore, 0)
    return sum / newsItems.length
  }

  /**
   * Validate news item
   */
  validateNewsItem(item: NewsItem): boolean {
    if (!item.title || !item.url || !item.source) {
      permanentLogger.info('NEWS_REGULATORY_ENRICHER', 'Validation failed', { hasTitle: !!item.title,
        hasUrl: !!item.url,
        hasSource: !!item.source })
      return false
    }
    
    // Check URL is valid
    try {
      new URL(item.url)
    } catch {
      permanentLogger.info('NEWS_REGULATORY_ENRICHER', 'Invalid URL', { url: item.url})
      return false
    }
    
    return true
  }
}

// Export singleton instance
export const newsRegulatoryEnricher = new NewsRegulatoryEnricher()