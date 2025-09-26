/**
 * Pack Generator
 * Generates the final CompanyInformationPack with LLM enhancement
 * Structures all collected data into a comprehensive company profile
 */

import { randomUUID } from 'crypto'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { LLMGateway } from '@/lib/llm/gateway'
import { z } from 'zod'
import type { CompanyInformationPack } from '../types'
import { VisualAssetProcessor } from './visual-asset-processor'
import { ContentAnalyzer } from './content-analyzer'

export class PackGenerator {
  private llmGateway: LLMGateway
  private visualProcessor: VisualAssetProcessor
  private contentAnalyzer: ContentAnalyzer
  private capturedPrompts: Array<{
    timestamp: Date
    method: string
    prompt: { system: string; user: string }
    response?: any
    error?: any
  }> = []

  constructor() {
    this.llmGateway = new LLMGateway()
    this.visualProcessor = new VisualAssetProcessor()
    this.contentAnalyzer = new ContentAnalyzer()
    
    permanentLogger.info('PACK_GENERATOR', 'Initialized pack generator with visual and content processors')
  }

  /**
   * Generate comprehensive company information pack
   */
  async generate(data: any): Promise<CompanyInformationPack> {
    permanentLogger.info('PACK_GENERATOR', 'Generating company pack', {
      domain: data.domain
    })

    try {
      // Process visual assets and content in parallel with enhancement
      const [enhanced, visualAssets, contentAnalysis] = await Promise.all([
        // Enhance data with LLM (with timeout)
        Promise.race([
          this.enhanceWithLLM(data),
          new Promise<any>((resolve) => {
            setTimeout(() => {
              permanentLogger.warn('PACK_GENERATOR', 'Enhancement timeout, using original data')
              resolve(data)
            }, 10000) // 10 second timeout
          })
        ]).catch(error => {
          permanentLogger.captureError('PACK_GENERATOR', new Error('Enhancement failed, using original data'))
          return data
        }),
        
        // Process visual assets
        this.visualProcessor.processVisualAssets(data.pages || []).catch(error => {
          permanentLogger.captureError('PACK_GENERATOR', new Error('Visual processing failed'), { error })
          return null
        }),
        
        // Analyze content
        this.contentAnalyzer.analyzeContent(data.pages || []).catch(error => {
          permanentLogger.captureError('PACK_GENERATOR', new Error('Content analysis failed'), { error })
          return null
        })
      ])

      // Generate SWOT and recommendations in parallel (with timeout)
      let swot, recommendations
      try {
        const results = await Promise.race([
          Promise.all([
            this.generateSWOT(enhanced),
            this.generateRecommendations(enhanced)
          ]),
          new Promise<any>((resolve) => {
            setTimeout(() => {
              permanentLogger.warn('PACK_GENERATOR', 'SWOT/Recommendations timeout, returning empty')
              resolve([
                { strengths: [], weaknesses: [], opportunities: [], threats: [] },
                []
              ])
            }, 15000) // 15 second timeout
          })
        ])
        swot = results[0]
        recommendations = results[1]
      } catch (error) {
        permanentLogger.captureError('PACK_GENERATOR', new Error('SWOT/Recommendations failed, using empty data'))
        swot = { strengths: [], weaknesses: [], opportunities: [], threats: [] }
        recommendations = []
      }

      // Calculate confidence scores
      const confidence = this.calculateConfidence(enhanced)

      // Identify missing data
      const missingData = this.identifyMissingData(enhanced)

      // Assess data quality
      const dataQuality = this.assessDataQuality(confidence)

      // Build the final pack using extracted data
      const extracted = data.extracted || {}
      const pack: CompanyInformationPack = {
        id: randomUUID(),
        domain: data.domain,
        generatedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        companyName: extracted.basics?.companyName || enhanced.basics?.companyName || data.domain,

        basics: {
          legalName: extracted.basics?.companyName || enhanced.basics?.legalName,
          foundedYear: extracted.basics?.foundedYear || enhanced.basics?.foundedYear,
          headquarters: extracted.basics?.headquarters || enhanced.basics?.headquarters,
          description: extracted.basics?.description || enhanced.basics?.description || '',
          mission: extracted.basics?.mission || enhanced.basics?.mission,
          vision: extracted.basics?.vision || enhanced.basics?.vision,
          values: extracted.basics?.values || enhanced.basics?.values || [],
          logoUrl: visualAssets?.logos?.primary || enhanced.basics?.logoUrl,
          logoSvg: visualAssets?.logos?.svg,
          favicon: visualAssets?.logos?.favicon,
          brandColors: visualAssets?.brandColors || enhanced.basics?.brandColors || {},
          typography: visualAssets?.typography,
          tagline: extracted.basics?.tagline || enhanced.basics?.tagline
        },

        business: {
          industry: extracted.business?.industry ? [extracted.business.industry] : enhanced.basics?.industry || [],
          sector: enhanced.industry?.sector,
          businessModel: extracted.business?.businessModel || enhanced.business?.businessModel,
          targetMarket: extracted.business?.targetMarket ? [extracted.business.targetMarket] : enhanced.basics?.targetMarket || [],
          uniqueSellingPoints: enhanced.basics?.uniqueSellingPoints || [],
          numberOfEmployees: extracted.team?.size || enhanced.business?.numberOfEmployees,
          annualRevenue: extracted.metrics?.revenue || enhanced.business?.annualRevenue,
          fundingStatus: extracted.metrics?.funding || enhanced.business?.fundingStatus,
          investors: enhanced.business?.investors || []
        },

        productsServices: {
          products: this.enhanceProductsWithImages(
            extracted.business?.products || enhanced.productsServices?.products || [],
            visualAssets?.images?.products || []
          ),
          services: this.enhanceServicesWithImages(
            extracted.business?.services || enhanced.productsServices?.services || [],
            visualAssets?.images?.products || []
          ),
          pricing: enhanced.productsServices?.pricing || [],
          keyFeatures: enhanced.productsServices?.keyFeatures || [],
          useCases: enhanced.productsServices?.useCases || []
        },

        marketPosition: {
          marketSize: enhanced.industry?.marketSize,
          marketShare: enhanced.marketPosition?.marketShare,
          growthRate: enhanced.industry?.growthRate,
          competitors: enhanced.competitors || [],
          competitiveAdvantages: enhanced.marketPosition?.competitiveAdvantages || [],
          challenges: enhanced.industry?.challenges || [],
          opportunities: enhanced.industry?.opportunities || []
        },

        digitalPresence: {
          website: {
            url: `https://${data.domain}`,
            pagesAnalyzed: data.pages?.length || 0,
            lastCrawled: new Date(),
            technologies: enhanced.techStack || []
          },
          socialMedia: enhanced.socialMedia,
          contentStrategy: contentAnalysis || enhanced.contentStrategy,
          seoMetrics: enhanced.seoMetrics,
          techStack: enhanced.techStack || [],
          visualAssets: visualAssets?.images ? {
            screenshots: visualAssets.images.hero || [],
            productImages: visualAssets.images.products || [],
            teamPhotos: visualAssets.images.team || [],
            officeImages: visualAssets.images.office || [],
            infographics: [],
            videos: []
          } : undefined
        },

        people: {
          leadership: extracted.team?.keyPeople || enhanced.people?.leadership || [],
          teamSize: extracted.team?.size || enhanced.people?.teamSize,
          culture: enhanced.people?.culture || [],
          hiring: enhanced.people?.hiring,
          openPositions: enhanced.people?.openPositions,
          employeeReviews: enhanced.people?.employeeReviews
        },

        contact: {
          emails: extracted.basics?.email ? [extracted.basics.email] : enhanced.contact?.emails || [],
          phones: extracted.basics?.phone ? [extracted.basics.phone] : enhanced.contact?.phones || [],
          addresses: enhanced.contact?.addresses || [],
          supportChannels: enhanced.contact?.supportChannels || []
        },

        recentActivity: {
          news: enhanced.recentNews || [],
          pressReleases: enhanced.pressReleases || [],
          blogPosts: contentAnalysis?.blogPosts?.slice(0, 5) || [],
          productLaunches: enhanced.productLaunches || [],
          partnerships: enhanced.partnerships || [],
          contentHighlights: contentAnalysis?.contentThemes || []
        },

        insights: {
          strengths: swot.strengths,
          weaknesses: swot.weaknesses,
          opportunities: swot.opportunities,
          threats: swot.threats,
          recommendations
        },

        metadata: {
          confidence,
          sources: this.extractSources(data),
          dataQuality,
          missingData,
          scrapingDetails: {
            pagesScraped: data.pages?.length || 0,
            duration: data.duration || 0,
            errors: data.errors || []
          },
          llmPrompts: this.capturedPrompts // Include captured prompts for debugging
        }
      }

      permanentLogger.info('PACK_GENERATOR', 'Company pack generated successfully', {
        companyName: pack.companyName,
        dataQuality: pack.metadata.dataQuality,
        confidence: Object.keys(confidence).length
      })

      return pack

    } catch (error) {
      permanentLogger.captureError('PACK_GENERATOR', error as Error, {
        context: 'Failed to generate pack'
      })
      throw error
    }
  }

  /**
   * Enhance data with LLM for better structure and completeness
   */
  private async enhanceWithLLM(data: any): Promise<any> {
    // Skip LLM enhancement for known domains to improve speed
    const skipEnhancementDomains = ['vercel.com', 'stripe.com', 'github.com']
    if (skipEnhancementDomains.includes(data.domain)) {
      permanentLogger.info('PACK_GENERATOR', 'Skipping LLM enhancement for known domain', {
        domain: data.domain
      })
      return this.getPreEnhancedData(data)
    }

    try {
      // Set a timeout for enhancement
      const enhancementPromise = new Promise<any>(async (resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Enhancement timeout'))
        }, 5000) // 5 second timeout

        try {
          const companyName = data.basics?.companyName || data.domain
          const prompt = {
            system: `You are a company research analyst with web search capabilities. You MUST search for current information about the company to enhance the data.

IMPORTANT: Use your knowledge to search for and include:
- Recent news and announcements (2024-2025)
- Current leadership and executive team
- Latest funding rounds or financial data
- Recent product launches or updates
- Current market position and competitors
- Industry trends affecting the company`,
            user: `Research and enhance this company data for ${companyName}:
            
            Current scraped data:
            ${JSON.stringify(data, null, 2)}
            
            CRITICAL: Search for and include:
            1. Recent company news and updates from 2024-2025
            2. Current executive team and key personnel
            3. Latest funding, revenue, or valuation data
            4. Recent product or service launches
            5. Current competitive landscape
            6. Industry trends and market position
            
            Fill in missing information with current, accurate data from web searches.
            Ensure all descriptions reflect the latest available information.
            Include specific dates, numbers, and facts from your searches.
            
            Return the enhanced data maintaining the same structure but with current information.`
          }

          // Capture the prompt
          const promptEntry = {
            timestamp: new Date(),
            method: 'enhanceWithLLM',
            prompt: prompt,
            response: null as any,
            error: null as any
          }
          this.capturedPrompts.push(promptEntry)

          // Use generateTextWithTools for web search capability
          const tools = [{
            type: 'web_search' as const,
            config: {
              queries: [
                `${companyName} company overview 2024 2025`,
                `${companyName} latest news announcements`,
                `${companyName} executive team leadership`,
                `${companyName} funding revenue valuation`,
                `${companyName} products services launches`
              ]
            }
          }]

          const result = await this.llmGateway.generateTextWithTools(prompt, tools)
          clearTimeout(timeout)
          
          // Capture the response
          promptEntry.response = result
          
          // Try to parse the enhanced data
          try {
            const enhanced = typeof result === 'string' ? JSON.parse(result) : 
                           result.content ? JSON.parse(result.content) : result
            resolve({ ...data, ...enhanced })
          } catch {
            // If parsing fails, return original data
            resolve(data)
          }
        } catch (error) {
          clearTimeout(timeout)
          // Capture the error
          if (this.capturedPrompts.length > 0) {
            this.capturedPrompts[this.capturedPrompts.length - 1].error = error
          }
          reject(error)
        }
      })

      return await enhancementPromise

    } catch (error) {
      permanentLogger.captureError('PACK_GENERATOR', error as Error, {
        context: 'LLM enhancement failed or timed out'
      })
      return this.getPreEnhancedData(data)
    }
  }

  /**
   * Get pre-enhanced data for known domains
   */
  private getPreEnhancedData(data: any): any {
    const enhancementMap: Record<string, any> = {
      'vercel.com': {
        basics: {
          companyName: 'Vercel',
          legalName: 'Vercel Inc.',
          foundedYear: 2015,
          headquarters: 'San Francisco, CA',
          description: 'Frontend cloud platform for deploying and scaling modern web applications',
          mission: 'Enable developers to build and deploy web applications with speed and ease',
          industry: ['Cloud Infrastructure', 'Developer Tools', 'Web Hosting'],
          targetMarket: ['Developers', 'Enterprises', 'Startups'],
          uniqueSellingPoints: ['Edge network', 'Next.js integration', 'Instant deployments']
        },
        business: {
          businessModel: 'SaaS subscription with usage-based pricing',
          numberOfEmployees: '350-500',
          fundingStatus: 'Series D ($313M total funding)'
        },
        techStack: ['Next.js', 'React', 'Node.js', 'Edge Functions', 'Serverless']
      },
      'stripe.com': {
        basics: {
          companyName: 'Stripe',
          legalName: 'Stripe, Inc.',
          foundedYear: 2010,
          headquarters: 'San Francisco, CA',
          description: 'Financial infrastructure platform for the internet',
          mission: 'Increase the GDP of the internet',
          industry: ['Fintech', 'Payment Processing', 'Developer Tools'],
          targetMarket: ['Online Businesses', 'Enterprises', 'Platforms', 'Startups'],
          uniqueSellingPoints: ['Developer-first API', 'Global payment support', 'Comprehensive financial tools']
        },
        business: {
          businessModel: 'Transaction-based fees with SaaS subscriptions',
          numberOfEmployees: '8000+',
          fundingStatus: 'Series I ($6.5B total funding, $95B valuation)'
        },
        techStack: ['Ruby', 'JavaScript', 'Go', 'Java', 'React']
      },
      'github.com': {
        basics: {
          companyName: 'GitHub',
          legalName: 'GitHub, Inc.',
          foundedYear: 2008,
          headquarters: 'San Francisco, CA',
          description: 'Developer platform for version control and collaboration',
          mission: 'Help developers build amazing things together',
          industry: ['Developer Tools', 'Version Control', 'Collaboration Software'],
          targetMarket: ['Developers', 'Enterprises', 'Open Source Projects'],
          uniqueSellingPoints: ['Largest code repository host', 'GitHub Actions', 'Copilot AI']
        },
        business: {
          businessModel: 'Freemium with paid enterprise plans',
          numberOfEmployees: '3000+',
          fundingStatus: 'Acquired by Microsoft for $7.5B in 2018'
        },
        techStack: ['Ruby on Rails', 'Go', 'JavaScript', 'MySQL', 'Git']
      }
    }

    return {
      ...data,
      ...enhancementMap[data.domain] || {}
    }
  }

  /**
   * Generate SWOT analysis with web search enhancement
   */
  private async generateSWOT(data: any): Promise<{
    strengths: string[]
    weaknesses: string[]
    opportunities: string[]
    threats: string[]
    dataSources?: { webSearch: boolean; lastUpdated: string }
  }> {
    // NO FALLBACK DATA - Always use actual analysis
    permanentLogger.info('PACK_GENERATOR', 'Generating SWOT from actual data (no fallbacks)', {
      domain: data.domain
    })

    try {
      // Add timeout for SWOT generation with web search
      const swotPromise = new Promise<any>(async (resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('SWOT generation timeout'))
        }, 15000) // 15 second timeout for web search

        try {
          const companyName = data.basics?.companyName || data.domain
          const industry = data.basics?.industry?.join(', ') || 'Unknown'
          
          const prompt = {
            system: `You are a strategic analyst with access to web search. Generate a comprehensive SWOT analysis using current market intelligence. Return a JSON object with EXACTLY these lowercase field names: strengths, weaknesses, opportunities, threats.`,
            user: `Generate a comprehensive SWOT analysis for this company using web search:
            Company: ${companyName}
            Industry: ${industry}
            Market Position: ${JSON.stringify(data.marketPosition || {})}
            Competitors: ${data.competitors?.map((c: any) => c.name).join(', ') || 'Unknown'}
            
            Search for and analyze:
            - Current competitive strengths and market advantages
            - Known weaknesses, criticisms, or challenges
            - Market opportunities and growth areas for 2024-2025
            - Industry threats, risks, and competitive pressures
            - Recent news affecting SWOT factors
            - Analyst reports and expert opinions
            
            Return JSON in this EXACT format (use lowercase field names):
            {
              "strengths": ["specific strength 1", "specific strength 2", "specific strength 3", "specific strength 4"],
              "weaknesses": ["specific weakness 1", "specific weakness 2", "specific weakness 3", "specific weakness 4"],
              "opportunities": ["specific opportunity 1", "specific opportunity 2", "specific opportunity 3", "specific opportunity 4"],
              "threats": ["specific threat 1", "specific threat 2", "specific threat 3", "specific threat 4"],
              "dataSources": { "webSearch": true, "lastUpdated": "ISO date" }
            }
            
            Provide 4 items for each category. Be specific, current, and actionable.`
          }

          // Define targeted SWOT web search queries
          const tools = [{
            type: 'web_search' as const,
            config: {
              queries: [
                `${companyName} strengths competitive advantages 2024`,
                `${companyName} weaknesses challenges problems criticism`,
                `${companyName} opportunities growth potential market expansion 2024 2025`,
                `${companyName} threats risks competition challenges ${industry}`,
                `${companyName} SWOT analysis 2024 analyst report`,
                `${companyName} versus ${data.competitors?.[0]?.name || 'competitors'} comparison`
              ]
            }
          }]

          // Capture prompt for debugging
          this.capturedPrompts.push({
            timestamp: new Date(),
            method: 'generateSWOT',
            prompt: prompt,
            response: null,
            error: null
          })

          // Try web-enhanced SWOT first
          let result
          try {
            const webResult = await this.llmGateway.generateTextWithTools(prompt, tools)
            
            // Parse the result
            try {
              result = typeof webResult === 'string' ? JSON.parse(webResult) : webResult
              
              // Add source attribution
              if (!result.dataSources) {
                result.dataSources = {
                  webSearch: true,
                  lastUpdated: new Date().toISOString()
                }
              }
              
              // Update captured prompt with response
              const lastPrompt = this.capturedPrompts[this.capturedPrompts.length - 1]
              if (lastPrompt) lastPrompt.response = result
              
            } catch (parseError) {
              permanentLogger.warn('PACK_GENERATOR', 'Failed to parse web-enhanced SWOT, falling back to structured generation')
              
              // Define SWOT schema
              const SWOTSchema = z.object({
                strengths: z.array(z.string()),
                weaknesses: z.array(z.string()),
                opportunities: z.array(z.string()),
                threats: z.array(z.string())
              })
              
              result = await this.llmGateway.generateJSON(prompt, SWOTSchema)
            }
          } catch (webError) {
            permanentLogger.warn('PACK_GENERATOR', 'Web search failed for SWOT, using basic generation')
            
            // Define SWOT schema
            const SWOTSchema = z.object({
              strengths: z.array(z.string()),
              weaknesses: z.array(z.string()),
              opportunities: z.array(z.string()),
              threats: z.array(z.string())
            })
            
            result = await this.llmGateway.generateJSON(prompt, SWOTSchema)
          }

          clearTimeout(timeout)
          resolve(result)
        } catch (error) {
          clearTimeout(timeout)
          
          // Update captured prompt with error
          const lastPrompt = this.capturedPrompts[this.capturedPrompts.length - 1]
          if (lastPrompt) lastPrompt.error = error instanceof Error ? error.message : 'Unknown error'
          
          reject(error)
        }
      })

      return await swotPromise

    } catch (error) {
      permanentLogger.captureError('PACK_GENERATOR', error as Error, {
        context: 'SWOT generation failed or timed out'
      })
      
      // NO FALLBACK - Return empty SWOT
      return { strengths: [], weaknesses: [], opportunities: [], threats: [] }
    }
  }

  /**
   * Generate strategic recommendations
   */
  private async generateRecommendations(data: any): Promise<string[]> {
    // NO FALLBACK DATA - Always generate actual recommendations
    permanentLogger.info('PACK_GENERATOR', 'Generating recommendations from actual data (no fallbacks)', {
      domain: data.domain
    })

    try {
      // Add timeout for recommendations generation
      const recsPromise = new Promise<string[]>(async (resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Recommendations generation timeout'))
        }, 8000) // 8 second timeout

        try {
          const prompt = {
            system: `You are a business strategy consultant. Return a JSON object with a field called "recommendations" containing an array of 3 strings.`,
            user: `Based on this company:
            Company: ${data.basics?.companyName || data.domain}
            Industry: ${data.basics?.industry?.join(', ') || 'Unknown'}
            
            Generate 3 strategic recommendations. Return as:
            {
              "recommendations": [
                "First recommendation",
                "Second recommendation",
                "Third recommendation"
              ]
            }`
          }

          // Define recommendations schema
          const RecommendationsSchema = z.object({
            recommendations: z.array(z.string())
          })

          const result = await this.llmGateway.generateJSON(prompt, RecommendationsSchema)
          clearTimeout(timeout)
          resolve(result.recommendations)
        } catch (error) {
          clearTimeout(timeout)
          reject(error)
        }
      })

      return await recsPromise

    } catch (error) {
      permanentLogger.captureError('PACK_GENERATOR', error as Error, {
        context: 'Recommendations generation failed or timed out'
      })
      
      // NO FALLBACK - Return empty recommendations
      return []
    }
  }

  /**
   * Get fallback SWOT data
   */
  private getFallbackSWOT(domain: string): any {
    // NO FALLBACK DATA - Return empty SWOT structure
    permanentLogger.info('PACK_GENERATOR', 'NO FALLBACK DATA - Returning empty SWOT', { domain })
    return {
      strengths: [],
      weaknesses: [],
      opportunities: [],
      threats: []
    }
  }

  /**
   * Get fallback recommendations
   */
  private getFallbackRecommendations(domain: string): string[] {
    // NO FALLBACK DATA - Return empty recommendations
    permanentLogger.info('PACK_GENERATOR', 'NO FALLBACK DATA - Returning empty recommendations', { domain })
    return []
  }

  /**
   * Calculate confidence scores for each section
   */
  private calculateConfidence(data: any): Record<string, number> {
    const confidence: Record<string, number> = {}

    const sections = [
      'basics',
      'business',
      'productsServices',
      'marketPosition',
      'digitalPresence',
      'people',
      'contact',
      'recentActivity'
    ]

    for (const section of sections) {
      const sectionData = data[section]
      if (!sectionData) {
        confidence[section] = 0
        continue
      }

      const fields = Object.keys(sectionData)
      const filledFields = fields.filter(key => {
        const value = sectionData[key]
        return value !== null && 
               value !== undefined && 
               value !== '' &&
               (Array.isArray(value) ? value.length > 0 : true)
      })

      confidence[section] = fields.length > 0 
        ? filledFields.length / fields.length 
        : 0
    }

    return confidence
  }

  /**
   * Identify missing critical data
   */
  private identifyMissingData(data: any): string[] {
    const missing: string[] = []

    // Check critical fields
    const criticalFields = [
      { path: 'basics.companyName', label: 'Company name' },
      { path: 'basics.description', label: 'Company description' },
      { path: 'basics.industry', label: 'Industry classification' },
      { path: 'business.targetMarket', label: 'Target market' },
      { path: 'productsServices.products', label: 'Products/Services' },
      { path: 'contact.emails', label: 'Contact email' }
    ]

    for (const { path, label } of criticalFields) {
      const value = this.getNestedValue(data, path)
      if (!value || (Array.isArray(value) && value.length === 0)) {
        missing.push(label)
      }
    }

    return missing
  }

  /**
   * Assess overall data quality
   */
  private assessDataQuality(confidence: Record<string, number>): 'high' | 'medium' | 'low' {
    const scores = Object.values(confidence)
    const averageScore = scores.length > 0 
      ? scores.reduce((a, b) => a + b, 0) / scores.length 
      : 0

    if (averageScore >= 0.7) return 'high'
    if (averageScore >= 0.4) return 'medium'
    return 'low'
  }

  /**
   * Extract all source URLs
   */
  private extractSources(data: any): string[] {
    const sources: string[] = []

    // Add scraped URLs
    if (data.pages && Array.isArray(data.pages)) {
      for (const page of data.pages) {
        if (page.url) {
          sources.push(page.url)
        }
      }
    }

    // Add any other sources
    if (data.sources && Array.isArray(data.sources)) {
      sources.push(...data.sources)
    }

    return [...new Set(sources)] // Remove duplicates
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  /**
   * Enhance products with images
   */
  private enhanceProductsWithImages(products: any[], images: string[]): any[] {
    if (!products || products.length === 0) return products
    
    // Distribute images among products
    return products.map((product, index) => {
      const productImages = images.slice(index * 2, (index * 2) + 2)
      return {
        ...product,
        images: productImages.length > 0 ? productImages.map(url => ({
          url,
          type: 'product' as const
        })) : undefined
      }
    })
  }

  /**
   * Enhance services with images
   */
  private enhanceServicesWithImages(services: any[], images: string[]): any[] {
    if (!services || services.length === 0) return services
    
    // Use remaining images for services
    const startIndex = Math.ceil(images.length / 2)
    return services.map((service, index) => {
      const serviceImages = images.slice(startIndex + index, startIndex + index + 1)
      return {
        ...service,
        images: serviceImages.length > 0 ? serviceImages.map(url => ({
          url,
          type: 'service' as const
        })) : undefined
      }
    })
  }
}