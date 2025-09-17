/**
 * Enrichment Engine
 * Enhances company data with external sources and LLM analysis
 * Coordinates multiple data sources to build comprehensive company profile
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { LLMGateway } from '@/lib/llm/gateway'
import { LLMLogger } from '@/lib/utils/llm-logger'
import { RateLimiter } from './rate-limiter'
import type { 
  CompanyResearchRequest, 
  CompanyInformationPack,
  Competitor,
  NewsItem 
} from '../types'
import { 
  EnrichmentSchemas,
  type CompanyBasics,
  type IndustryAnalysis,
  type MarketPosition
} from '../schemas/enrichment-schemas'
import { newsEnricher } from '../enrichers/news-enricher'
import { socialEnricher } from '../enrichers/social-enricher'
import { industryEnricher } from '../enrichers/industry-enricher'
import { competitorEnricher } from '../enrichers/competitor-enricher'
import { externalIntelligenceOrchestrator } from '../services/external-intelligence-orchestrator'

export class EnrichmentEngine {
  private llmGateway: LLMGateway
  private rateLimiter: RateLimiter

  constructor() {
    this.llmGateway = new LLMGateway()
    this.rateLimiter = RateLimiter.getInstance()
    
    permanentLogger.info('ENRICHMENT_ENGINE', 'Initialized enrichment engine with rate limiting')
  }

  /**
   * Enrich company data with external sources and analysis
   * CRITICAL: This was using Promise.all() causing 6-8 CONCURRENT LLM calls
   * NOW: Sequential processing with rate limiting
   */
  async enrich(
    companyData: any,
    request: CompanyResearchRequest
  ): Promise<any> {
    // 🔴 PROMINENT LLM WARNING
    LLMLogger.logLLMOperationStarting({
      phase: 'enrichment',
      operation: 'Company data enrichment',
      estimatedCost: 0.50,
      willUseLLM: true
    })
    
    permanentLogger.info('ENRICHMENT_ENGINE', '🔴 WARNING: Starting enrichment WITH LLM CALLS', {
      domain: request.domain,
      options: request.options
    })

    const enriched = { ...companyData }

    try {
      // CRITICAL FIX: Sequential enrichment to avoid rate limiting
      permanentLogger.info('ENRICHMENT_ENGINE', 'Using SEQUENTIAL processing to avoid rate limits')
      
      // Always extract company basics
      await this.enrichCompanyBasics(enriched)
      
      // NEW: Add External Intelligence Enrichment (Financial, LinkedIn, Social, Google Business, News)
      if (request.options?.includeExternalIntelligence !== false) {
        permanentLogger.info('ENRICHMENT_ENGINE', 'Starting External Intelligence enrichment')
        
        const sessionId = enriched.sessionId || request.sessionId
        const companyName = enriched.basics?.companyName || 
                          enriched.extracted?.basics?.companyName || 
                          request.domain.replace(/\.(com|org|net|io|co|ai)$/, '').replace(/^www\./, '')
        
        // Check for existing intelligence first
        const existingIntelligence = await externalIntelligenceOrchestrator.loadExistingIntelligence(sessionId)
        
        if (existingIntelligence && !externalIntelligenceOrchestrator.needsRefresh(existingIntelligence)) {
          permanentLogger.info('ENRICHMENT_ENGINE', 'Using cached external intelligence', {
            completeness: existingIntelligence.completeness,
            age: (Date.now() - existingIntelligence.lastUpdated.getTime()) / (1000 * 60 * 60)
          })
          enriched.externalIntelligence = existingIntelligence
        } else {
          permanentLogger.info('ENRICHMENT_ENGINE', 'Fetching fresh external intelligence')
          const externalIntelligence = await externalIntelligenceOrchestrator.enrichWithExternalIntelligence(
            sessionId,
            companyName,
            request.domain,
            enriched
          )
          enriched.externalIntelligence = externalIntelligence
          
          permanentLogger.info('ENRICHMENT_ENGINE', 'External Intelligence enrichment completed', {
            completeness: `${externalIntelligence.completeness}%`,
            hasFinancial: !!externalIntelligence.financial,
            hasLinkedIn: !!externalIntelligence.linkedIn,
            socialProfiles: externalIntelligence.socialProfiles.length,
            newsCount: externalIntelligence.news.length
          })
        }
      }
      
      // Optional enrichments based on request - SEQUENTIAL
      if (request.options?.includeCompetitors !== false) {
        permanentLogger.info('ENRICHMENT_ENGINE', 'Enriching with competitors (LLM call)')
        await this.enrichWithCompetitors(enriched)
      }

      if (request.options?.includeNews !== false) {
        permanentLogger.info('ENRICHMENT_ENGINE', 'Enriching with news (LLM call)')
        await this.enrichWithNews(enriched)
      }

      if (request.options?.includeTechStack !== false) {
        permanentLogger.info('ENRICHMENT_ENGINE', 'Detecting tech stack')
        await this.detectTechStack(enriched)
      }

      // Always enrich with social and industry data - SEQUENTIAL
      permanentLogger.info('ENRICHMENT_ENGINE', 'Enriching with social data')
      await this.enrichWithSocialData(enriched)
      
      permanentLogger.info('ENRICHMENT_ENGINE', 'Enriching with industry data (LLM call)')
      await this.enrichWithIndustryData(enriched)

      // Analyze industry and market position - SEQUENTIAL
      permanentLogger.info('ENRICHMENT_ENGINE', 'Analyzing industry (LLM call)')
      enriched.industry = await this.analyzeIndustry(enriched)
      
      permanentLogger.info('ENRICHMENT_ENGINE', 'Analyzing market position (LLM call)')
      enriched.marketPosition = await this.analyzeMarketPosition(enriched)

      permanentLogger.info('ENRICHMENT_ENGINE', 'Enrichment completed successfully', {
        domain: request.domain
      })

      return enriched

    } catch (error) {
      permanentLogger.captureError('ENRICHMENT_ENGINE', error as Error, {
        message: 'Enrichment failed'
      })
      
      // Return partial data even if enrichment fails
      return enriched
    }
  }

  /**
   * Sequential enrichment with rate limiting wrapper
   * For use by PhaseOrchestrator
   */
  async enrichSequentially(
    companyData: any,
    request: CompanyResearchRequest,
    rateLimitWrapper: (taskName: string, fn: () => Promise<any>) => Promise<any>
  ): Promise<any> {
    const enriched = { ...companyData }
    
    // Execute each enrichment task with rate limiting
    await rateLimitWrapper('enrichCompanyBasics', () => this.enrichCompanyBasics(enriched))
    
    if (request.options?.includeCompetitors !== false) {
      await rateLimitWrapper('enrichWithCompetitors', () => this.enrichWithCompetitors(enriched))
    }
    
    if (request.options?.includeNews !== false) {
      await rateLimitWrapper('enrichWithNews', () => this.enrichWithNews(enriched))
    }
    
    if (request.options?.includeTechStack !== false) {
      await rateLimitWrapper('detectTechStack', () => this.detectTechStack(enriched))
    }
    
    await rateLimitWrapper('enrichWithSocialData', () => this.enrichWithSocialData(enriched))
    await rateLimitWrapper('enrichWithIndustryData', () => this.enrichWithIndustryData(enriched))
    
    enriched.industry = await rateLimitWrapper('analyzeIndustry', () => this.analyzeIndustry(enriched))
    enriched.marketPosition = await rateLimitWrapper('analyzeMarketPosition', () => this.analyzeMarketPosition(enriched))
    
    return enriched
  }

  /**
   * Extract and enhance company basic information using LLM with web search
   */
  private async enrichCompanyBasics(data: any): Promise<void> {
    // NO FALLBACK DATA - Only use actual scraped/searched content
    permanentLogger.info('ENRICHMENT_ENGINE', 'Starting company basics enrichment (no fallback data)', {
      domain: data.domain,
      hasScrapedData: !!data.extracted?.basics?.companyName
    })
    
    /* REMOVED ALL HARDCODED FALLBACK DATA
    const knownDomains: Record<string, any> = {
      'vercel.com': {
        companyName: 'Vercel',
        description: 'Frontend cloud platform for deploying and scaling modern web applications with edge network capabilities.',
        mission: 'Enable developers to build and deploy web applications with speed and ease',
        vision: 'Make the web faster and more accessible for everyone',
        coreValues: ['Developer Experience', 'Performance', 'Innovation'],
        foundedYear: 2015,
        industry: ['Cloud Infrastructure', 'Developer Tools'],
        targetMarket: ['Developers', 'Enterprises', 'Startups'],
        uniqueSellingPoints: ['Edge network', 'Next.js integration', 'Instant deployments']
      },
      'stripe.com': {
        companyName: 'Stripe',
        description: 'Financial infrastructure platform for the internet, enabling businesses to accept payments and manage their operations online.',
        mission: 'Increase the GDP of the internet',
        vision: 'Build economic infrastructure for the internet',
        coreValues: ['Move Fast', 'User Obsession', 'Optimism'],
        foundedYear: 2010,
        industry: ['Fintech', 'Payment Processing'],
        targetMarket: ['Online Businesses', 'Enterprises', 'Platforms'],
        uniqueSellingPoints: ['Developer-first API', 'Global payment support', 'Comprehensive financial tools']
      },
      'github.com': {
        companyName: 'GitHub',
        description: 'Developer platform for version control and collaboration that helps developers build software together.',
        mission: 'Help developers build amazing things together',
        vision: 'Be the home for all developers',
        coreValues: ['Collaboration', 'Innovation', 'Open Source'],
        foundedYear: 2008,
        industry: ['Developer Tools', 'Version Control'],
        targetMarket: ['Developers', 'Enterprises', 'Open Source Projects'],
        uniqueSellingPoints: ['Largest code repository host', 'GitHub Actions', 'Copilot AI']
      }
    }

    // SKIP FALLBACK DATA CHECK - always use actual data
    */

    try {
      // Add timeout for LLM enrichment with web search
      const enrichPromise = new Promise<any>(async (resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Enrichment timeout'))
        }, 15000) // 15 second timeout for web search

        try {
          // Extract company name from scraped data
          const companyName = data.extracted?.basics?.companyName || 
                            data.pages?.[0]?.data?.structuredData?.organization?.name ||
                            data.domain.replace(/\.(com|org|net|io|co|ai)$/, '').replace(/^www\./, '')

          const prompt = {
            system: `You are a company research analyst with access to web search. Extract and structure company information from the provided website content and enhance it with current web data.`,
            user: `Analyze this company website content and search for additional information:
            Domain: ${data.domain}
            Estimated Company Name: ${companyName}
            
            Website content:
            ${JSON.stringify(data.pages?.slice(0, 2), null, 2)}
            
            Extract and enhance with web search:
            - Company name (verify with web search)
            - Description (2-3 sentences, enhanced with current info)
            - Mission statement
            - Vision statement
            - Core values
            - Founded year (verify with web search)
            - Industry/sector (with current market position)
            - Target market
            - Unique selling points (with competitive advantages)
            - Recent developments and news
            
            Use web search to verify facts and add current information.
            Return as JSON with these exact fields.`
          }

          // Define web search queries
          const tools = [{
            type: 'web_search' as const,
            config: {
              queries: [
                `${companyName} company overview mission vision values 2024 2025`,
                `${companyName} founded year history timeline`,
                `${companyName} industry sector market position`,
                `${companyName} target customers market segments`,
                `${companyName} competitive advantages unique selling points`
              ]
            }
          }]

          // Use generateTextWithTools for web-enhanced data
          // CRITICAL: Wrap with rate limiter to prevent 429 errors
          const result = await this.rateLimiter.executeWithRateLimit(
            'gpt-5-nano',
            async () => this.llmGateway.generateTextWithTools(prompt, tools)
          )
          
          // Parse the result
          let enrichedBasics
          try {
            enrichedBasics = typeof result === 'string' ? JSON.parse(result) : result
          } catch (parseError) {
            // Fallback to basic generation without web search
            permanentLogger.warn('ENRICHMENT_ENGINE', 'Failed to parse web-enhanced result, falling back to basic generation')
            // CRITICAL: Wrap with rate limiter to prevent 429 errors
            enrichedBasics = await this.rateLimiter.executeWithRateLimit(
              'gpt-5-nano',
              async () => this.llmGateway.generateJSON<CompanyBasics>(
                prompt, 
                EnrichmentSchemas.CompanyBasics
              )
            )
          }

          // Add source attribution if web search was used
          if (enrichedBasics) {
            enrichedBasics.dataSources = {
              websiteContent: true,
              webSearch: true,
              lastUpdated: new Date().toISOString()
            }
          }

          clearTimeout(timeout)
          resolve(enrichedBasics)
        } catch (error) {
          clearTimeout(timeout)
          reject(error)
        }
      })

      data.basics = await enrichPromise

      permanentLogger.info('ENRICHMENT_ENGINE', 'Company basics enriched with web search', {
        companyName: data.basics.companyName,
        hasWebData: data.basics.dataSources?.webSearch === true
      })

    } catch (error) {
      permanentLogger.captureError('ENRICHMENT_ENGINE', error as Error, {
        message: 'Failed to enrich company basics'
      })
    }
  }

  /**
   * Identify and analyze competitors using advanced enricher
   */
  private async enrichWithCompetitors(data: any): Promise<void> {
    const startTime = Date.now()
    
    permanentLogger.info('ENRICHMENT_ENGINE', 'Starting advanced competitor enrichment', {
      domain: data.domain,
      company: data.basics?.companyName
    })

    try {
      // Use the advanced competitor enricher with web search
      const enhancedCompetitors = await competitorEnricher.discoverCompetitors(data)
      
      // Store enhanced competitors with full details
      data.competitors = enhancedCompetitors
      
      // Extract key insights for quick access
      data.competitorInsights = {
        totalCompetitors: enhancedCompetitors.length,
        localCompetitors: enhancedCompetitors.filter(c => c.scope === 'local').length,
        regionalCompetitors: enhancedCompetitors.filter(c => c.scope === 'regional').length,
        nationalCompetitors: enhancedCompetitors.filter(c => c.scope === 'national').length,
        globalCompetitors: enhancedCompetitors.filter(c => c.scope === 'global').length,
        highThreatCompetitors: enhancedCompetitors.filter(c => 
          c.competitiveAnalysis.threatLevel === 'high' || 
          c.competitiveAnalysis.threatLevel === 'fatal'
        ).map(c => c.name),
        averageCompetitiveIntensity: enhancedCompetitors.reduce((sum, c) => 
          sum + c.competitiveAnalysis.competitiveIntensity, 0
        ) / enhancedCompetitors.length || 0,
        dataQuality: {
          verifiedData: enhancedCompetitors.filter(c => 
            c.dataQuality.overall === 'verified'
          ).length,
          estimatedData: enhancedCompetitors.filter(c => 
            c.dataQuality.overall === 'estimated'
          ).length,
          fallbackData: enhancedCompetitors.filter(c => 
            c.dataQuality.overall === 'fallback'
          ).length
        }
      }
      
      // Generate competitive landscape visualization data
      data.competitiveLandscape = await competitorEnricher.generateCompetitiveMap(
        enhancedCompetitors
      )
      
      const duration = Date.now() - startTime
      permanentLogger.info('ENRICHMENT_ENGINE', 'Advanced competitor enrichment completed', {
        domain: data.domain,
        competitorCount: enhancedCompetitors.length,
        duration,
        dataQuality: data.competitorInsights.dataQuality
      })

    } catch (error) {
      permanentLogger.captureError('ENRICHMENT_ENGINE', error as Error, {
        message: 'Failed to enrich competitors',
        domain: data.domain
      })
      
      // Use fallback data if enrichment fails
      data.competitors = this.getFallbackCompetitors(data.domain)
      data.competitorInsights = {
        totalCompetitors: data.competitors.length,
        dataQuality: { fallbackData: data.competitors.length }
      }
    }
  }

  /**
   * Enrich with recent news and developments
   */
  private async enrichWithNews(data: any): Promise<void> {
    try {
      const companyName = data.basics?.companyName || data.extracted?.basics?.companyName || data.domain
      
      // Fetch news from multiple sources SEQUENTIALLY to avoid rate limits
      // CRITICAL: Changed from Promise.all() to sequential execution to prevent 429 errors
      permanentLogger.info('ENRICHMENT_ENGINE', 'Fetching news sequentially to respect rate limits')
      
      const generalNews = await newsEnricher.fetchNews({
        companyName,
        domain: data.domain,
        maxArticles: 10,
        daysBack: 90
      })
      
      // Add delay between API calls
      await new Promise(resolve => setTimeout(resolve, 200))
      
      const pressReleases = await newsEnricher.fetchPressReleases(companyName, data.domain)
      
      // Add delay between API calls
      await new Promise(resolve => setTimeout(resolve, 200))
      
      const fundingNews = await newsEnricher.fetchFundingNews(companyName)

      // Combine and deduplicate
      const allNews = [...generalNews, ...pressReleases, ...fundingNews]
      const uniqueNews = allNews.filter((article, index, self) =>
        index === self.findIndex(a => a.title === article.title)
      )

      // Sort by date (most recent first)
      uniqueNews.sort((a, b) => {
        if (!a.date || !b.date) return 0
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      })

      data.recentNews = uniqueNews.slice(0, 15)
      
      // Extract trending topics
      const trendingTopics = await newsEnricher.getTrendingTopics(companyName)
      data.trendingTopics = trendingTopics

      permanentLogger.info('ENRICHMENT_ENGINE', 'News enrichment completed', {
        articlesFound: data.recentNews.length,
        trendingTopics: trendingTopics.length
      })

    } catch (error) {
      permanentLogger.captureError('ENRICHMENT_ENGINE', error as Error, {
        message: 'Failed to enrich with news'
      })
      data.recentNews = []
    }
  }

  /**
   * Detect technology stack from website
   */
  private async detectTechStack(data: any): Promise<void> {
    try {
      const techSignatures = {
        // Frontend frameworks
        react: ['_app', '__next', 'react', 'jsx', 'useState'],
        vue: ['vue', 'v-if', 'v-for', 'v-model'],
        angular: ['ng-', 'angular', '*ngFor', '*ngIf'],
        
        // Analytics
        googleAnalytics: ['gtag', 'ga(', 'google-analytics', '_gaq'],
        mixpanel: ['mixpanel', 'mixpanel.track'],
        segment: ['analytics.track', 'segment'],
        
        // E-commerce
        shopify: ['shopify', 'myshopify.com', 'cdn.shopify'],
        woocommerce: ['woocommerce', 'wc-'],
        
        // CMS
        wordpress: ['wp-content', 'wp-includes', 'wordpress'],
        contentful: ['contentful', 'ctfassets'],
        
        // Marketing
        hubspot: ['hubspot', 'hs-scripts', 'hsforms'],
        marketo: ['marketo', 'mktoForms'],
        mailchimp: ['mailchimp', 'mc-'],
        
        // Infrastructure
        cloudflare: ['cloudflare', 'cf-'],
        aws: ['amazonaws.com', 'aws'],
        vercel: ['vercel', '_vercel']
      }

      const detectedTech: any[] = []
      const html = data.pages?.[0]?.data?.raw?.html || ''
      const htmlLower = html.toLowerCase()

      for (const [tech, signatures] of Object.entries(techSignatures)) {
        if (signatures.some(sig => htmlLower.includes(sig))) {
          detectedTech.push({
            name: tech,
            category: this.categorizeTech(tech),
            confidence: 0.8
          })
        }
      }

      // Check for meta generator tag
      const generatorMatch = html.match(/<meta name="generator" content="([^"]+)"/i)
      if (generatorMatch) {
        detectedTech.push({
          name: generatorMatch[1].split(' ')[0],
          category: 'CMS',
          confidence: 1.0
        })
      }

      data.techStack = detectedTech

      permanentLogger.info('ENRICHMENT_ENGINE', 'Tech stack detected', {
        technologies: detectedTech.map(t => t.name)
      })

    } catch (error) {
      permanentLogger.captureError('ENRICHMENT_ENGINE', error as Error, {
        message: 'Failed to detect tech stack'
      })
      data.techStack = []
    }
  }

  /**
   * Get fallback competitor data
   */
  private getFallbackCompetitors(domain: string): any[] {
    // NO FALLBACK DATA - Return empty competitors array
    permanentLogger.info('ENRICHMENT_ENGINE', 'NO FALLBACK DATA - Returning empty competitors', { domain })
    return []
  }

  /**
   * Get fallback industry data
   */
  private getFallbackIndustryData(domain: string): any {
    // NO FALLBACK DATA - Return empty industry data
    permanentLogger.info('ENRICHMENT_ENGINE', 'NO FALLBACK DATA - Returning empty industry data', { domain })
    return {
      sector: '',
      marketSize: '',
      growthRate: '',
      trends: [],
      challenges: [],
      opportunities: []
    }
  }

  /**
   * Get fallback market position data
   */
  private getFallbackMarketPositionData(domain: string): any {
    // NO FALLBACK DATA - Return empty market position data
    permanentLogger.info('ENRICHMENT_ENGINE', 'NO FALLBACK DATA - Returning empty market position data', { domain })
    return {
      competitiveAdvantages: [],
      marketShare: '',
      positioning: '',
      differentiators: []
    }
  }

  /**
   * Analyze industry and market with web search enhancement
   */
  private async analyzeIndustry(data: any): Promise<any> {
    try {
      const companyName = data.basics?.companyName || data.domain
      const industry = data.basics?.industry?.join(', ') || 'Unknown'
      
      const prompt = {
        system: `You are a market research analyst with access to web search. Analyze the industry and market using current data.`,
        user: `Analyze the industry and market for this company using web search:
        Company: ${companyName}
        Industry: ${industry}
        Products: ${JSON.stringify(data.productsServices || {})}
        Competitors: ${JSON.stringify(data.competitors || [])}
        
        Search for and analyze:
        - Current market size and valuation
        - Growth rates and projections
        - Industry trends for 2024-2025
        - Key challenges facing the industry
        - Emerging opportunities
        - Market dynamics and disruptions
        
        Return JSON with these exact fields:
        {
          "sector": "Industry sector name",
          "marketSize": "Market size estimate with year (e.g., $50B in 2024)",
          "growthRate": "Annual growth rate with timeframe (e.g., 15% CAGR 2024-2028)",
          "trends": ["current trend 1", "current trend 2", "emerging trend 3"],
          "challenges": ["challenge 1", "challenge 2", "challenge 3"],
          "opportunities": ["opportunity 1", "opportunity 2", "opportunity 3"],
          "dataSources": { "webSearch": true, "lastUpdated": "ISO date" }
        }`
      }

      // Define targeted web search queries
      const tools = [{
        type: 'web_search' as const,
        config: {
          queries: [
            `${industry} market size 2024 2025 valuation statistics`,
            `${industry} growth rate CAGR projections 2024-2028`,
            `${industry} trends 2024 2025 emerging technologies`,
            `${industry} challenges obstacles barriers 2024`,
            `${industry} opportunities growth areas 2024 2025`,
            `${companyName} industry analysis market position`
          ]
        }
      }]

      try {
        // Use web search for current industry data
        // CRITICAL: Wrap with rate limiter to prevent 429 errors
        const result = await this.rateLimiter.executeWithRateLimit(
          'gpt-5-nano',
          async () => this.llmGateway.generateTextWithTools(prompt, tools)
        )
        
        let industryAnalysis
        try {
          industryAnalysis = typeof result === 'string' ? JSON.parse(result) : result
          
          // Add timestamp and source attribution
          if (!industryAnalysis.dataSources) {
            industryAnalysis.dataSources = {
              webSearch: true,
              lastUpdated: new Date().toISOString()
            }
          }
          
          return industryAnalysis
        } catch (parseError) {
          // Fallback to structured generation
          permanentLogger.warn('ENRICHMENT_ENGINE', 'Failed to parse web-enhanced industry data, using structured generation')
          // CRITICAL: Wrap with rate limiter to prevent 429 errors
          const fallbackResult = await this.rateLimiter.executeWithRateLimit(
            'gpt-5-nano',
            async () => this.llmGateway.generateJSON<IndustryAnalysis>(
              prompt,
              EnrichmentSchemas.Industry
            )
          )
          return fallbackResult
        }
      } catch (error) {
        permanentLogger.warn('ENRICHMENT_ENGINE', 'Web search failed, using fallback industry data')
        return this.getFallbackIndustryData(data.domain)
      }

    } catch (error) {
      permanentLogger.captureError('ENRICHMENT_ENGINE', error as Error, {
        message: 'Failed to analyze industry'
      })
      return this.getFallbackIndustryData(data.domain)
    }
  }

  /**
   * Analyze market position with web search enhancement
   */
  private async analyzeMarketPosition(data: any): Promise<any> {
    try {
      const companyName = data.basics?.companyName || data.domain
      const industry = data.basics?.industry?.join(', ') || 'Unknown'
      
      const prompt = {
        system: `You are a strategic analyst with access to web search. Analyze market position using current competitive intelligence.`,
        user: `Analyze the market position for this company using web search:
        Company: ${companyName}
        Industry: ${industry}
        Current Industry Data: ${JSON.stringify(data.industry || {})}
        Competitors: ${JSON.stringify(data.competitors || [])}
        Products: ${JSON.stringify(data.productsServices || {})}
        
        Search for and analyze:
        - Current market share and rankings
        - Competitive advantages vs competitors
        - Strategic market positioning
        - Key differentiators and unique value
        - Recent competitive wins/losses
        - Analyst opinions and ratings
        
        Return JSON with these exact fields (use camelCase):
        {
          "competitiveAdvantages": ["specific advantage 1", "specific advantage 2", "specific advantage 3"],
          "marketShare": "Current market share with source/year (e.g., 25% as of Q3 2024)",
          "positioning": "Detailed market positioning description",
          "differentiators": ["key differentiator 1", "key differentiator 2", "key differentiator 3"],
          "competitiveStrength": "strong/moderate/emerging",
          "marketRank": "#X in category",
          "dataSources": { "webSearch": true, "lastUpdated": "ISO date" }
        }`
      }

      // Define targeted competitive intelligence queries
      const tools = [{
        type: 'web_search' as const,
        config: {
          queries: [
            `${companyName} market share percentage 2024`,
            `${companyName} competitive advantages vs ${data.competitors?.[0]?.name || 'competitors'}`,
            `${companyName} market position ranking ${industry}`,
            `${companyName} unique selling points differentiators`,
            `${companyName} analyst ratings Gartner Forrester IDC 2024`,
            `${companyName} competitive wins customer wins 2024`
          ]
        }
      }]

      try {
        // Use web search for current competitive data
        // CRITICAL: Wrap with rate limiter to prevent 429 errors
        const result = await this.rateLimiter.executeWithRateLimit(
          'gpt-5-nano',
          async () => this.llmGateway.generateTextWithTools(prompt, tools)
        )
        
        let marketPosition
        try {
          marketPosition = typeof result === 'string' ? JSON.parse(result) : result
          
          // Add timestamp and source attribution
          if (!marketPosition.dataSources) {
            marketPosition.dataSources = {
              webSearch: true,
              lastUpdated: new Date().toISOString()
            }
          }
          
          return marketPosition
        } catch (parseError) {
          // Fallback to structured generation
          permanentLogger.warn('ENRICHMENT_ENGINE', 'Failed to parse web-enhanced market position, using structured generation')
          // CRITICAL: Wrap with rate limiter to prevent 429 errors
          const fallbackResult = await this.rateLimiter.executeWithRateLimit(
            'gpt-5-nano',
            async () => this.llmGateway.generateJSON<MarketPosition>(
              prompt,
              EnrichmentSchemas.MarketPosition
            )
          )
          return fallbackResult
        }
      } catch (error) {
        permanentLogger.warn('ENRICHMENT_ENGINE', 'Web search failed, using fallback market position data')
        return this.getFallbackMarketPositionData(data.domain)
      }

    } catch (error) {
      permanentLogger.captureError('ENRICHMENT_ENGINE', error as Error, {
        message: 'Failed to analyze market position'
      })
      return this.getFallbackMarketPositionData(data.domain)
    }
  }

  /**
   * Categorize technology
   */
  private categorizeTech(tech: string): string {
    const categories: Record<string, string[]> = {
      'Analytics': ['googleAnalytics', 'mixpanel', 'segment'],
      'Frontend': ['react', 'vue', 'angular'],
      'E-commerce': ['shopify', 'woocommerce'],
      'CMS': ['wordpress', 'contentful'],
      'Marketing': ['hubspot', 'marketo', 'mailchimp'],
      'Infrastructure': ['cloudflare', 'aws', 'vercel']
    }

    for (const [category, techs] of Object.entries(categories)) {
      if (techs.includes(tech)) return category
    }

    return 'Other'
  }

  /**
   * Enrich with social media data
   */
  private async enrichWithSocialData(data: any): Promise<void> {
    try {
      const companyName = data.basics?.companyName || data.extracted?.basics?.companyName || data.domain
      
      // Extract social URLs from scraped data if available
      const socialUrls = data.extracted?.basics?.socialMedia || 
                        data.pages?.[0]?.data?.structuredData?.contact?.socialProfiles || {}
      
      // Fetch social media metrics
      const socialProfiles = await socialEnricher.extractSocialData({
        companyName,
        domain: data.domain,
        socialUrls
      })

      data.socialMedia = socialProfiles

      // Analyze social sentiment and reach
      if (socialProfiles.length > 0) {
        const socialAnalysis = await socialEnricher.analyzeSocialSentiment(socialProfiles)
        data.socialAnalysis = socialAnalysis
        
        // Generate recommendations
        const socialRecommendations = socialEnricher.generateRecommendations(socialProfiles)
        data.socialRecommendations = socialRecommendations
      }

      permanentLogger.info('ENRICHMENT_ENGINE', 'Social media enrichment completed', {
        profilesFound: socialProfiles.length
      })

    } catch (error) {
      permanentLogger.captureError('ENRICHMENT_ENGINE', error as Error, {
        message: 'Failed to enrich with social data'
      })
      data.socialMedia = []
    }
  }

  /**
   * Enrich with industry and growth data
   */
  private async enrichWithIndustryData(data: any): Promise<void> {
    try {
      const companyName = data.basics?.companyName || data.extracted?.basics?.companyName || data.domain
      const industry = data.basics?.industry || data.extracted?.business?.industry
      
      // Fetch industry data
      const industryData = await industryEnricher.fetchIndustryData({
        companyName,
        domain: data.domain,
        industry: Array.isArray(industry) ? industry : [industry].filter(Boolean)
      })

      // Add to data object
      data.metrics = { ...data.metrics, ...industryData.metrics }
      data.growthData = industryData.growth
      data.industryBenchmarks = industryData.benchmarks

      // Get competitor analysis
      const competitorAnalysis = await industryEnricher.getCompetitorAnalysis(
        companyName,
        Array.isArray(industry) ? industry : [industry].filter(Boolean)
      )
      data.competitorAnalysis = competitorAnalysis

      permanentLogger.info('ENRICHMENT_ENGINE', 'Industry enrichment completed', {
        hasMetrics: !!industryData.metrics.revenue,
        hasGrowthData: !!industryData.growth.growthScore,
        hasBenchmarks: !!industryData.benchmarks.averageRevenue
      })

    } catch (error) {
      permanentLogger.captureError('ENRICHMENT_ENGINE', error as Error, {
        message: 'Failed to enrich with industry data'
      })
    }
  }
}