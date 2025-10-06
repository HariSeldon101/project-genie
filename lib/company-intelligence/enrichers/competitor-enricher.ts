/**
 * Advanced Competitor Enricher
 * 
 * Discovers and analyzes competitors with geographic classification,
 * competitive intensity scoring, and market share estimation.
 * Integrates with web search tools for real-time competitor data.
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { LLMGateway } from '@/lib/llm/gateway'
import { toolConfigs } from '@/lib/documents/tool-config'
import type { EnhancedCompetitor, Competitor, NewsItem } from '../types'
import { DataSource, trackDataSource, calculateConfidence } from '../types/data-quality'
import { z } from 'zod'

/**
 * Schema for competitor discovery with web search
 */
const CompetitorDiscoverySchema = z.object({
  competitors: z.array(z.object({
    name: z.string(),
    website: z.string().optional(),
    description: z.string().optional(),
    headquarters: z.string().optional(),
    operatingRegions: z.array(z.string()).optional(),
    revenue: z.string().optional(),
    employeeCount: z.string().optional(),
    isLocal: z.boolean().optional(),
    isGlobal: z.boolean().optional()
  }))
})

/**
 * Schema for competitive analysis
 */
const CompetitiveAnalysisSchema = z.object({
  threatLevel: z.enum(['low', 'medium', 'high', 'fatal']),
  competitiveIntensity: z.number().min(1).max(10),
  productOverlap: z.number().min(0).max(100),
  targetMarketOverlap: z.number().min(0).max(100),
  differentiators: z.array(z.string()),
  competitiveAdvantages: z.array(z.string()),
  competitiveWeaknesses: z.array(z.string())
})

export class CompetitorEnricher {
  private llmGateway: LLMGateway
  private cache: Map<string, { data: any, timestamp: number }>

  constructor() {
    this.llmGateway = new LLMGateway()
    this.cache = new Map()
    
    permanentLogger.info('COMPETITOR_ENRICHER', 'Initialized advanced competitor enricher')
  }

  /**
   * Discover competitors using web search and LLM analysis
   */
  async discoverCompetitors(companyData: any): Promise<EnhancedCompetitor[]> {
    const startTime = Date.now()
    const companyName = companyData.basics?.companyName || companyData.domain
    
    permanentLogger.info('COMPETITOR_ENRICHER', 'Starting competitor discovery', {
      company: companyName,
      domain: companyData.domain
    })

    try {
      // Check cache first (24 hour TTL)
      const cacheKey = `competitors_${companyData.domain}`
      const cached = this.cache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < 86400000) {
        permanentLogger.info('COMPETITOR_ENRICHER', 'Returning cached competitor data', {
          company: companyName,
          competitorCount: cached.data.length
        })
        return cached.data
      }

      // Use web search to discover competitors
      const competitors = await this.discoverWithWebSearch(companyData)
      
      // Enhance each competitor with detailed analysis
      const enhancedCompetitors = await Promise.all(
        competitors.map(comp => this.enhanceCompetitor(comp, companyData))
      )

      // Sort by competitive intensity
      enhancedCompetitors.sort((a, b) => 
        b.competitiveAnalysis.competitiveIntensity - a.competitiveAnalysis.competitiveIntensity
      )

      // Cache the results
      this.cache.set(cacheKey, {
        data: enhancedCompetitors,
        timestamp: Date.now()
      })

      const duration = Date.now() - startTime
      permanentLogger.info('COMPETITOR_ENRICHER', 'Competitor discovery completed', {
        company: companyName,
        competitorCount: enhancedCompetitors.length,
        duration,
        localCompetitors: enhancedCompetitors.filter(c => c.scope === 'local').length,
        globalCompetitors: enhancedCompetitors.filter(c => c.scope === 'global').length
      })

      return enhancedCompetitors

    } catch (error) {
      permanentLogger.captureError('COMPETITOR_ENRICHER', error as Error, {
        message: 'Failed to discover competitors',
        company: companyName
      })
      
      // BULLETPROOF ARCHITECTURE: No fallback data - throw error
      throw new Error(`Competitor discovery failed for ${companyName}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Discover competitors using web search tools
   */
  private async discoverWithWebSearch(companyData: any): Promise<Partial<EnhancedCompetitor>[]> {
    const companyName = companyData.basics?.companyName || companyData.domain
    const industry = companyData.basics?.industry?.join(', ') || 'technology'
    
    // Create web search prompt
    const prompt = {
      system: `You are a competitive intelligence analyst. Use web search to find real competitors for the given company.
               Focus on finding actual companies that compete in the same market.
               Include both direct competitors and alternative solutions.`,
      user: `Find competitors for ${companyName} (${companyData.domain}).
        
        Industry: ${industry}
        Products/Services: ${JSON.stringify(companyData.productsServices || {})}
        
        Search for and provide information about:
        1. Direct competitors offering similar products/services
        2. Companies frequently compared to ${companyName}
        3. Alternative solutions in the same market
        4. Both established players and emerging startups
        
        For each competitor found, provide:
        - Company name and website URL
        - Brief description of their offering
        - Geographic scope (local/regional/national/global)
        - Estimated company size (if available)
        - Why they are a competitor
        
        Provide 10-15 real competitors with factual information.`,
      model: 'gpt-5-mini'  // Use GPT-5 for web search
    }

    try {
      // Use GPT-5 with web search capability
      const webSearchConfig = {
        reasoningEffort: 'medium'
      }

      // Generate with web search to get real competitor data
      const response = await this.llmGateway.generateWithWebSearch(
        prompt,
        webSearchConfig
      )

      // Parse the response to extract competitor data
      const competitorData = await this.parseCompetitorResponse(response.content || response)
      
      permanentLogger.info('COMPETITOR_ENRICHER', 'Web search discovered competitors', {
        company: companyName,
        competitorCount: competitorData.length,
        sourcesFound: response.sources?.length || 0,
        source: DataSource.VERIFIED
      })

      return competitorData

    } catch (error) {
      permanentLogger.captureError('COMPETITOR_ENRICHER', error as Error, {
        message: 'Web search failed',
        company: companyName
      })
      
      // BULLETPROOF ARCHITECTURE: No fallback data - throw error
      throw new Error(`Web search for competitors failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Parse competitor response from web search
   */
  private async parseCompetitorResponse(response: string): Promise<Partial<EnhancedCompetitor>[]> {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/m)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (parsed.competitors && Array.isArray(parsed.competitors)) {
          return parsed.competitors.map((comp: any) => ({
            name: comp.name,
            website: comp.website,
            description: comp.description,
            geography: {
              headquarters: comp.headquarters || 'Unknown',
              operatingRegions: comp.operatingRegions || [],
              primaryMarkets: comp.primaryMarkets || []
            },
            metrics: {
              revenue: comp.revenue ? 
                { value: comp.revenue, source: DataSource.VERIFIED } : undefined,
              employeeCount: comp.employeeCount ? 
                { value: comp.employeeCount, source: DataSource.VERIFIED } : undefined
            }
          }))
        }
      }
    } catch (error) {
      permanentLogger.captureError('COMPETITOR_ENRICHER', error as Error, {
        message: 'Failed to parse competitor response'
      })
    }

    // If parsing fails, extract what we can from text
    return this.extractCompetitorsFromText(response)
  }

  /**
   * Extract competitor names from text response
   */
  private extractCompetitorsFromText(text: string): Partial<EnhancedCompetitor>[] {
    const competitors: Partial<EnhancedCompetitor>[] = []
    
    // Look for patterns like "1. CompanyName" or "- CompanyName"
    const patterns = [
      /\d+\.\s+([A-Z][A-Za-z\s&]+?)(?:\s+-|\s*\(|\s*:|$)/gm,
      /[-•]\s+([A-Z][A-Za-z\s&]+?)(?:\s+-|\s*\(|\s*:|$)/gm
    ]
    
    for (const pattern of patterns) {
      const matches = text.matchAll(pattern)
      for (const match of matches) {
        if (match[1] && match[1].length > 2) {
          competitors.push({
            name: match[1].trim(),
            description: 'Competitor identified through web search'
          })
        }
      }
    }
    
    return competitors.slice(0, 15) // Limit to 15 competitors
  }

  /**
   * Estimate competitors using LLM without web search
   */
  private async estimateCompetitors(companyData: any): Promise<Partial<EnhancedCompetitor>[]> {
    const prompt = {
      system: `You are a competitive intelligence analyst. Based on the company information provided,
               estimate likely competitors. Be realistic and use well-known companies when possible.`,
      user: `Estimate competitors for:
        Company: ${companyData.basics?.companyName || companyData.domain}
        Industry: ${companyData.basics?.industry?.join(', ') || 'Unknown'}
        Products: ${JSON.stringify(companyData.productsServices || {})}
        
        Provide 5-10 realistic competitors with their likely characteristics.`
    }

    try {
      const result = await this.llmGateway.generateJSON(
        prompt,
        CompetitorDiscoverySchema
      )

      return result.competitors.map((comp: any) => ({
        ...comp,
        dataQuality: {
          source: DataSource.ESTIMATED,
          confidence: 60
        }
      }))

    } catch (error) {
      permanentLogger.captureError('COMPETITOR_ENRICHER', error as Error, {
        message: 'Failed to estimate competitors'
      })
      return []
    }
  }

  /**
   * Enhance a competitor with detailed analysis
   */
  private async enhanceCompetitor(
    competitor: Partial<EnhancedCompetitor>,
    companyData: any
  ): Promise<EnhancedCompetitor> {
    permanentLogger.info('COMPETITOR_ENRICHER', 'Enhancing competitor', {
      competitor: competitor.name,
      company: companyData.basics?.companyName
    })

    // Classify geographic scope
    const scope = await this.classifyGeographicScope(competitor)
    
    // Calculate competitive intensity
    const competitiveAnalysis = await this.analyzeCompetitiveIntensity(
      companyData,
      competitor
    )
    
    // Estimate market share if not provided
    const marketShare = competitor.marketShare || 
      await this.estimateMarketShare(competitor, companyData)

    // Track data quality
    const fieldSources: Record<string, DataSource> = {
      name: DataSource.VERIFIED,
      scope: DataSource.ESTIMATED,
      marketShare: competitor.marketShare ? DataSource.VERIFIED : DataSource.ESTIMATED,
      revenue: competitor.metrics?.revenue?.source || DataSource.ESTIMATED,
      employees: competitor.metrics?.employeeCount?.source || DataSource.ESTIMATED
    }

    const overallQuality = this.calculateOverallDataQuality(fieldSources)

    const enhanced: EnhancedCompetitor = {
      name: competitor.name || 'Unknown Competitor',
      website: competitor.website,
      description: competitor.description,
      strengths: competitor.strengths || [],
      weaknesses: competitor.weaknesses || [],
      marketShare: marketShare,
      scope,
      geography: competitor.geography || {
        headquarters: 'Unknown',
        operatingRegions: [],
        primaryMarkets: [],
        dataSource: DataSource.ESTIMATED
      },
      metrics: competitor.metrics || {},
      competitiveAnalysis,
      visualAssets: competitor.visualAssets,
      dataQuality: {
        overall: overallQuality.source,
        confidence: overallQuality.confidence,
        lastUpdated: new Date(),
        fieldSources,
        needsRefresh: overallQuality.source === DataSource.FALLBACK
      }
    }

    return enhanced
  }

  /**
   * Classify competitor's geographic scope
   */
  async classifyGeographicScope(
    competitor: Partial<EnhancedCompetitor>
  ): Promise<'local' | 'regional' | 'national' | 'global'> {
    // If we have operating regions, use them to determine scope
    if (competitor.geography?.operatingRegions) {
      const regions = competitor.geography.operatingRegions
      if (regions.length > 10) return 'global'
      if (regions.length > 5) return 'national'
      if (regions.length > 2) return 'regional'
      return 'local'
    }

    // Estimate based on company size
    if (competitor.metrics?.employeeCount) {
      const employees = parseInt(competitor.metrics.employeeCount.value.replace(/\D/g, ''))
      if (employees > 10000) return 'global'
      if (employees > 1000) return 'national'
      if (employees > 100) return 'regional'
      return 'local'
    }

    // Default based on name recognition (simplified)
    const globalCompanies = ['Microsoft', 'Google', 'Amazon', 'Apple', 'Meta', 'IBM', 'Oracle']
    if (globalCompanies.some(name => 
      competitor.name?.toLowerCase().includes(name.toLowerCase())
    )) {
      return 'global'
    }

    permanentLogger.captureError('COMPETITOR_ENRICHER', new Error('Geographic classification failed - insufficient data'), {
      competitor: competitor.name
    })

    // BULLETPROOF ARCHITECTURE: No fallback data - throw error
    throw new Error(`Cannot classify geographic scope for ${competitor.name}: insufficient data`)
  }

  /**
   * Analyze competitive intensity between company and competitor
   */
  async analyzeCompetitiveIntensity(
    companyData: any,
    competitor: Partial<EnhancedCompetitor>
  ): Promise<EnhancedCompetitor['competitiveAnalysis']> {
    const prompt = {
      system: `You are a competitive analyst. Analyze the competitive relationship between two companies.
               Provide specific, quantified assessments.`,
      user: `Analyze competitive intensity between:
        
        Company: ${companyData.basics?.companyName || companyData.domain}
        Products: ${JSON.stringify(companyData.productsServices || {})}
        
        Competitor: ${competitor.name}
        Description: ${competitor.description || 'Unknown'}
        
        Assess:
        1. Threat level (low/medium/high/critical)
        2. Competitive intensity (1-10 scale)
        3. Product overlap percentage (0-100)
        4. Target market overlap percentage (0-100)
        5. Key differentiators
        6. Competitive advantages
        7. Competitive weaknesses`
    }

    try {
      const result = await this.llmGateway.generateJSON(
        prompt,
        CompetitiveAnalysisSchema
      )

      return result

    } catch (error) {
      permanentLogger.captureError('COMPETITOR_ENRICHER', error as Error, {
        message: 'Competitive analysis failed',
        competitor: competitor.name
      })

      // BULLETPROOF ARCHITECTURE: No fallback data - throw error
      throw new Error(`Competitive analysis failed for ${competitor.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Estimate market share for competitor
   */
  async estimateMarketShare(
    competitor: Partial<EnhancedCompetitor>,
    companyData: any
  ): Promise<string> {
    // Simple estimation based on company size
    if (competitor.metrics?.revenue) {
      const revenue = parseInt(competitor.metrics.revenue.value.replace(/\D/g, ''))
      if (revenue > 1000000000) return '15-25%'
      if (revenue > 100000000) return '5-15%'
      if (revenue > 10000000) return '1-5%'
      return '<1%'
    }

    // Default estimate
    return 'Unknown'
  }

  /**
   * Calculate overall data quality - NO FALLBACK DATA ALLOWED
   */
  private calculateOverallDataQuality(
    fieldSources: Record<string, DataSource>
  ): { source: DataSource; confidence: number } {
    const sources = Object.values(fieldSources)
    const verifiedCount = sources.filter(s => s === DataSource.VERIFIED).length
    const estimatedCount = sources.filter(s => s === DataSource.ESTIMATED).length
    
    // BULLETPROOF ARCHITECTURE: Check for any fallback sources
    const hasFallback = sources.some(s => s === DataSource.FALLBACK)
    if (hasFallback) {
      throw new Error('Data quality validation failed: fallback sources not allowed')
    }
    
    const total = sources.length
    const verifiedPercentage = (verifiedCount / total) * 100
    
    let overallSource: DataSource
    let confidence: number
    
    if (verifiedPercentage > 70) {
      overallSource = DataSource.VERIFIED
      confidence = 85 + (verifiedPercentage - 70) * 0.5
    } else {
      overallSource = DataSource.ESTIMATED
      confidence = 50 + (verifiedPercentage * 0.3)
    }
    
    return { source: overallSource, confidence: Math.round(confidence) }
  }

  // REMOVED: All fallback methods - NO MOCK DATA ALLOWED in bulletproof architecture

  /**
   * Generate competitive landscape visualization data
   */
  async generateCompetitiveMap(
    competitors: EnhancedCompetitor[]
  ): Promise<any> {
    // Prepare data for force-directed graph or other visualizations
    const nodes = competitors.map(comp => ({
      id: comp.name,
      group: comp.scope,
      size: comp.competitiveAnalysis.competitiveIntensity * 10,
      threatLevel: comp.competitiveAnalysis.threatLevel
    }))

    const links = competitors.map(comp => ({
      source: 'YourCompany',
      target: comp.name,
      value: comp.competitiveAnalysis.productOverlap
    }))

    return {
      nodes: [
        { id: 'YourCompany', group: 'self', size: 100, threatLevel: 'self' },
        ...nodes
      ],
      links
    }
  }
}

// Export singleton instance
export const competitorEnricher = new CompetitorEnricher()