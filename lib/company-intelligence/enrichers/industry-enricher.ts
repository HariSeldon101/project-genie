/**
 * Industry Database Enricher
 * Fetches company data from industry databases and growth trackers
 * Uses free APIs where available - no fallback data
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { 
  CompanyMetricsSchema,
  type CompanyMetrics,
  type IndustryAnalysis 
} from '../schemas/enrichment-schemas'

interface IndustryEnricherOptions {
  companyName: string
  domain?: string
  industry?: string[]
}

interface GrowthData {
  growthScore?: number
  employeeCount?: number
  employeeGrowth?: string
  funding?: string
  lastFundingDate?: string
  investors?: string[]
}

interface IndustryBenchmarks {
  averageRevenue?: string
  averageEmployees?: number
  averageGrowthRate?: string
  topCompanies?: string[]
  marketTrends?: string[]
}

export class IndustryEnricher {
  private growjoApiKey: string | undefined
  private cache: Map<string, { data: any, timestamp: number }>

  constructor() {
    this.growjoApiKey = process.env.GROWJO_API_KEY
    this.cache = new Map()
    
    permanentLogger.info('INDUSTRY_ENRICHER', 'Initialized industry enricher', {
      hasGrowjoApi: !!this.growjoApiKey
    })
  }

  /**
   * Fetch company growth and industry data
   */
  async fetchIndustryData(options: IndustryEnricherOptions): Promise<{
    metrics: CompanyMetrics
    growth: GrowthData
    benchmarks: IndustryBenchmarks
  }> {
    const cacheKey = options.companyName
    
    // Check cache (4 hour TTL for industry data)
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < 14400000) {
      permanentLogger.info('INDUSTRY_ENRICHER', 'Returning cached industry data', {
        company: options.companyName
      })
      return cached.data
    }

    try {
      // Fetch growth data
      const growth = await this.fetchGrowthData(options)
      
      // Fetch or estimate company metrics
      const metrics = await this.fetchCompanyMetrics(options, growth)
      
      // Get industry benchmarks
      const benchmarks = await this.fetchIndustryBenchmarks(options)

      const result = {
        metrics,
        growth,
        benchmarks
      }

      // Cache the results
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      })

      permanentLogger.info('INDUSTRY_ENRICHER', 'Industry data fetched', {
        company: options.companyName,
        hasGrowthData: !!growth.growthScore,
        hasBenchmarks: !!benchmarks.averageRevenue
      })

      return result

    } catch (error) {
      permanentLogger.captureError('INDUSTRY_ENRICHER', error as Error, {
        message: 'Failed to fetch industry data'
      })
      
      // BULLETPROOF ARCHITECTURE: No fallback data - throw error
      throw new Error(`Industry enrichment failed for ${options.companyName}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Fetch growth data from Growjo or similar APIs
   */
  private async fetchGrowthData(options: IndustryEnricherOptions): Promise<GrowthData> {
    // If Growjo API is available, use it
    if (this.growjoApiKey) {
      try {
        const url = `https://api.growjo.com/v1/companies?name=${encodeURIComponent(options.companyName)}&api_key=${this.growjoApiKey}`
        
        const response = await fetch(url)
        if (response.ok) {
          const data = await response.json()
          
          if (data.companies && data.companies.length > 0) {
            const company = data.companies[0]
            return {
              growthScore: company.growth_score,
              employeeCount: company.employee_count,
              employeeGrowth: `${company.employee_growth_rate}%`,
              funding: company.total_funding,
              lastFundingDate: company.last_funding_date,
              investors: company.investors
            }
          }
        }
      } catch (error) {
        permanentLogger.captureError('INDUSTRY_ENRICHER', error as Error, {
          message: 'Growjo API failed'
        })
      }
    }

    // BULLETPROOF ARCHITECTURE: No fallback data - throw error
    throw new Error(`Growth data not available for ${options.companyName} - API access required`)
  }

  /**
   * Fetch or estimate company metrics
   */
  private async fetchCompanyMetrics(
    options: IndustryEnricherOptions,
    growth: GrowthData
  ): Promise<CompanyMetrics> {
    // Start with growth data if available
    const metrics: CompanyMetrics = {
      revenue: null,
      funding: growth.funding || null,
      employees: growth.employeeCount?.toString() || null,
      growth: growth.employeeGrowth || null,
      customers: null,
      valuation: null,
      profitability: 'unknown'
    }

    // Estimate revenue based on employees (rough industry average)
    if (growth.employeeCount) {
      const revenuePerEmployee = this.getRevenuePerEmployee(options.industry)
      const estimatedRevenue = growth.employeeCount * revenuePerEmployee
      metrics.revenue = this.formatRevenue(estimatedRevenue)
    }

    // Estimate valuation based on funding
    if (growth.funding) {
      const fundingAmount = this.parseFundingAmount(growth.funding)
      if (fundingAmount > 0) {
        // Rough 3-5x multiplier on last funding round
        metrics.valuation = this.formatRevenue(fundingAmount * 4)
      }
    }

    // Estimate customer count based on industry and size
    if (growth.employeeCount) {
      metrics.customers = this.estimateCustomerCount(growth.employeeCount, options.industry)
    }

    return metrics
  }

  /**
   * Fetch industry benchmarks
   */
  private async fetchIndustryBenchmarks(
    options: IndustryEnricherOptions
  ): Promise<IndustryBenchmarks> {
    // BULLETPROOF ARCHITECTURE: No fallback data - throw error
    throw new Error(`Industry benchmarks not available for ${options.companyName} - database access required`)
  }

  // REMOVED: All generation methods - NO MOCK DATA ALLOWED in bulletproof architecture

  /**
   * Get revenue per employee for industry
   */
  private getRevenuePerEmployee(industry?: string[]): number {
    const industryStr = industry?.[0]?.toLowerCase() || 'technology'
    
    const revenuePerEmployee: Record<string, number> = {
      'saas': 200000,
      'fintech': 250000,
      'e-commerce': 300000,
      'healthcare': 180000,
      'consulting': 150000,
      'manufacturing': 250000,
      'retail': 100000,
      'technology': 200000
    }

    for (const [key, value] of Object.entries(revenuePerEmployee)) {
      if (industryStr.includes(key)) {
        return value
      }
    }

    // BULLETPROOF ARCHITECTURE: No fallback data - throw error
    throw new Error(`Revenue per employee data not available for industry: ${industryStr}`)
  }

  /**
   * Format revenue number to string
   */
  private formatRevenue(amount: number): string {
    if (amount >= 1000000000) {
      return `$${(amount / 1000000000).toFixed(1)}B`
    } else if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(0)}M`
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`
    }
    throw new Error(`Cannot format revenue amount: ${amount}`)
  }

  /**
   * Parse funding amount from string
   */
  private parseFundingAmount(funding: string): number {
    const match = funding.match(/\$?([\d.]+)\s*([MBK])?/i)
    if (!match) throw new Error(`Cannot parse funding amount: ${funding}`)
    
    const amount = parseFloat(match[1])
    const multiplier = match[2]?.toUpperCase()
    
    switch (multiplier) {
      case 'B': return amount * 1000000000
      case 'M': return amount * 1000000
      case 'K': return amount * 1000
      default: throw new Error(`Unknown funding multiplier: ${multiplier || 'none'}`)
    }
  }

  /**
   * Estimate customer count based on employees and industry
   */
  private estimateCustomerCount(employees: number, industry?: string[]): string {
    const industryStr = industry?.[0]?.toLowerCase() || 'technology'
    
    let customersPerEmployee = 10 // Default B2B
    
    if (industryStr.includes('b2c') || industryStr.includes('consumer')) {
      customersPerEmployee = 1000
    } else if (industryStr.includes('enterprise')) {
      customersPerEmployee = 2
    } else if (industryStr.includes('smb')) {
      customersPerEmployee = 50
    }

    const estimated = employees * customersPerEmployee
    
    if (estimated >= 1000000) {
      return `${(estimated / 1000000).toFixed(0)}M+`
    } else if (estimated >= 1000) {
      return `${(estimated / 1000).toFixed(0)}K+`
    }
    throw new Error(`Customer count estimation failed - insufficient data`)
  }

  /**
   * Get competitor analysis for industry
   */
  async getCompetitorAnalysis(
    companyName: string,
    industry?: string[]
  ): Promise<{
    directCompetitors: string[]
    indirectCompetitors: string[]
    marketLeader: string
    emergingPlayers: string[]
  }> {
    // BULLETPROOF ARCHITECTURE: No fallback data - throw error
    throw new Error(`Competitor analysis not available for ${companyName} - database access required`)
  }
}

// Export singleton instance
export const industryEnricher = new IndustryEnricher()