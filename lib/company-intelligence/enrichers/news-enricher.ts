/**
 * News Enricher
 * Fetches and analyzes news articles about companies
 * Uses multiple sources - no fallback data
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { 
  NewsItemSchema, 
  NewsResponseSchema,
  type NewsItem 
} from '../schemas/enrichment-schemas'

interface NewsEnricherOptions {
  companyName: string
  domain?: string
  maxArticles?: number
  daysBack?: number
}

export class NewsEnricher {
  private newsDataApiKey: string | undefined
  private newsApiKey: string | undefined
  private cache: Map<string, { data: NewsItem[], timestamp: number }>

  constructor() {
    this.newsDataApiKey = process.env.NEWSDATA_API_KEY
    this.newsApiKey = process.env.NEWS_API_KEY
    this.cache = new Map()
    
    permanentLogger.info('NEWS_ENRICHER', 'Initialized news enricher', {
      hasNewsDataApi: !!this.newsDataApiKey,
      hasNewsApi: !!this.newsApiKey
    })
  }

  /**
   * Main method to fetch news about a company
   */
  async fetchNews(options: NewsEnricherOptions): Promise<NewsItem[]> {
    const cacheKey = `${options.companyName}-${options.daysBack || 30}`
    
    // Check cache (1 hour TTL)
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < 3600000) {
      permanentLogger.info('NEWS_ENRICHER', 'Returning cached news', {
        company: options.companyName,
        articles: cached.data.length
      })
      return cached.data
    }

    let articles: NewsItem[] = []

    try {
      // Try NewsData.io first (better free tier)
      if (this.newsDataApiKey) {
        articles = await this.fetchFromNewsData(options)
      }
      
      // Fallback to News API if needed
      if (articles.length === 0 && this.newsApiKey) {
        articles = await this.fetchFromNewsAPI(options)
      }
      
      // Final fallback: throw error - no mock data allowed
      if (articles.length === 0) {
        throw new Error(`No news articles found for ${options.companyName} - API keys required`)
      }

      // Analyze sentiment for all articles
      articles = await this.analyzeSentiment(articles)

      // Cache the results
      this.cache.set(cacheKey, {
        data: articles,
        timestamp: Date.now()
      })

      permanentLogger.info('NEWS_ENRICHER', 'News fetched successfully', {
        company: options.companyName,
        articles: articles.length,
        source: articles.length > 0 ? 'api' : 'none'
      })

      return articles

    } catch (error) {
      permanentLogger.captureError('NEWS_ENRICHER', error as Error, {
        message: 'Failed to fetch news'
      })
      
      // BULLETPROOF ARCHITECTURE: No fallback data - throw error
      throw new Error(`News enrichment failed for ${options.companyName}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Fetch news from NewsData.io
   */
  private async fetchFromNewsData(options: NewsEnricherOptions): Promise<NewsItem[]> {
    if (!this.newsDataApiKey) return []

    try {
      const query = encodeURIComponent(options.companyName)
      const url = `https://newsdata.io/api/1/news?apikey=${this.newsDataApiKey}&q=${query}&language=en`

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`NewsData API error: ${response.status}`)
      }

      const data = await response.json()
      
      return data.results?.slice(0, options.maxArticles || 10).map((article: any) => ({
        title: article.title,
        date: article.pubDate,
        summary: article.description || article.content?.substring(0, 200),
        source: article.source_id,
        url: article.link,
        sentiment: 'neutral' // Will be analyzed later
      })) || []

    } catch (error) {
      permanentLogger.captureError('NEWS_ENRICHER', error as Error, {
        message: 'NewsData.io fetch failed'
      })
      return []
    }
  }

  /**
   * Fetch news from News API
   */
  private async fetchFromNewsAPI(options: NewsEnricherOptions): Promise<NewsItem[]> {
    if (!this.newsApiKey) return []

    try {
      const query = encodeURIComponent(options.companyName)
      const fromDate = new Date()
      fromDate.setDate(fromDate.getDate() - (options.daysBack || 30))
      
      const url = `https://newsapi.org/v2/everything?q=${query}&from=${fromDate.toISOString()}&sortBy=relevancy&apiKey=${this.newsApiKey}`

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`News API error: ${response.status}`)
      }

      const data = await response.json()
      
      return data.articles?.slice(0, options.maxArticles || 10).map((article: any) => ({
        title: article.title,
        date: article.publishedAt,
        summary: article.description,
        source: article.source.name,
        url: article.url,
        sentiment: 'neutral' // Will be analyzed later
      })) || []

    } catch (error) {
      permanentLogger.captureError('NEWS_ENRICHER', error as Error, {
        message: 'News API fetch failed'
      })
      return []
    }
  }

  // REMOVED: generateMockNews method - NO MOCK DATA ALLOWED in bulletproof architecture

  /**
   * Analyze sentiment of news articles
   */
  private async analyzeSentiment(articles: NewsItem[]): Promise<NewsItem[]> {
    // Simple keyword-based sentiment analysis
    // In production, this could use an NLP API or LLM
    
    const positiveKeywords = ['growth', 'success', 'profit', 'innovation', 'expansion', 'partnership', 'achievement', 'breakthrough', 'leading', 'record']
    const negativeKeywords = ['loss', 'decline', 'lawsuit', 'layoff', 'scandal', 'crisis', 'failure', 'problem', 'concern', 'challenge']

    return articles.map(article => {
      const text = `${article.title} ${article.summary}`.toLowerCase()
      
      const positiveCount = positiveKeywords.filter(keyword => text.includes(keyword)).length
      const negativeCount = negativeKeywords.filter(keyword => text.includes(keyword)).length
      
      let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral'
      
      if (positiveCount > negativeCount + 1) {
        sentiment = 'positive'
      } else if (negativeCount > positiveCount + 1) {
        sentiment = 'negative'
      }
      
      return {
        ...article,
        sentiment
      }
    })
  }

  /**
   * Search for press releases specifically
   */
  async fetchPressReleases(companyName: string, domain?: string): Promise<NewsItem[]> {
    const searchTerms = `"${companyName}" "press release" OR "announcement" OR "announces"`
    
    return this.fetchNews({
      companyName: searchTerms,
      domain,
      maxArticles: 5,
      daysBack: 90
    })
  }

  /**
   * Search for funding news
   */
  async fetchFundingNews(companyName: string): Promise<NewsItem[]> {
    const searchTerms = `"${companyName}" "funding" OR "investment" OR "series" OR "raised"`
    
    return this.fetchNews({
      companyName: searchTerms,
      maxArticles: 5,
      daysBack: 365
    })
  }

  /**
   * Search for product launches
   */
  async fetchProductNews(companyName: string): Promise<NewsItem[]> {
    const searchTerms = `"${companyName}" "launches" OR "introduces" OR "unveils" OR "releases" product`
    
    return this.fetchNews({
      companyName: searchTerms,
      maxArticles: 5,
      daysBack: 180
    })
  }

  /**
   * Get trending topics about the company
   */
  async getTrendingTopics(companyName: string): Promise<string[]> {
    const news = await this.fetchNews({
      companyName,
      maxArticles: 20,
      daysBack: 30
    })

    // Extract common themes from titles and summaries
    const text = news.map(n => `${n.title} ${n.summary}`).join(' ').toLowerCase()
    
    // Simple topic extraction (in production, use NLP)
    const topics = new Set<string>()
    
    const topicPatterns = [
      /ai|artificial intelligence|machine learning/g,
      /sustainability|green|climate/g,
      /growth|expansion|scaling/g,
      /partnership|collaboration|acquisition/g,
      /innovation|technology|digital/g,
      /customer|user|experience/g,
      /market|industry|competition/g,
      /product|service|launch/g
    ]

    topicPatterns.forEach(pattern => {
      if (pattern.test(text)) {
        const match = pattern.source.split('|')[0].replace(/\\/g, '')
        topics.add(match.charAt(0).toUpperCase() + match.slice(1))
      }
    })

    return Array.from(topics)
  }
}

// Export singleton instance
export const newsEnricher = new NewsEnricher()