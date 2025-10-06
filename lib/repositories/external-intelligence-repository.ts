/**
 * ExternalIntelligenceRepository - Database operations for external intelligence data
 *
 * Manages all external intelligence data including financial, LinkedIn, social media,
 * Google Business, news, and intelligence summaries
 * Technical PM: Follows repository pattern for database isolation
 */

import { BaseRepository } from './base-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'

export interface FinancialData {
  id?: string
  session_id: string
  company_name: string
  ticker?: string
  exchange?: string
  market_cap?: number
  revenue?: number
  employees?: number
  founded?: string
  industry?: string
  sector?: string
  description?: string
  website?: string
  headquarters?: string
  ceo?: string
  fiscal_year_end?: string
  latest_quarter?: string
  pe_ratio?: number
  peg_ratio?: number
  book_value?: number
  dividend_yield?: number
  profit_margin?: number
  operating_margin?: number
  return_on_assets?: number
  return_on_equity?: number
  revenue_growth?: number
  gross_profit?: number
  ebitda?: number
  net_income?: number
  diluted_eps?: number
  total_cash?: number
  total_debt?: number
  current_ratio?: number
  created_at?: string
  updated_at?: string
}

export interface InvestorRelationsData {
  id?: string
  session_id: string
  company_name: string
  ticker?: string
  ir_website?: string
  ir_contact_email?: string
  ir_contact_phone?: string
  latest_earnings_date?: string
  latest_earnings_transcript?: string
  analyst_coverage?: any[]
  institutional_holders?: any[]
  mutual_fund_holders?: any[]
  upcoming_events?: any[]
  recent_presentations?: any[]
  sec_filings?: any[]
  created_at?: string
  updated_at?: string
}

export interface LinkedInData {
  id?: string
  session_id: string
  company_name: string
  linkedin_url?: string
  employees?: number
  followers?: number
  about?: string
  industry?: string
  company_size?: string
  headquarters?: string
  founded?: number
  specialties?: string[]
  verified?: boolean
  created_at?: string
  updated_at?: string
}

export interface SocialProfile {
  id?: string
  session_id: string
  company_name: string
  platform: string
  url: string
  username?: string
  followers?: number
  verified?: boolean
  bio?: string
  posts_count?: number
  engagement_rate?: number
  last_post_date?: string
  created_at?: string
  updated_at?: string
}

export interface GoogleBusinessData {
  id?: string
  session_id: string
  company_name: string
  place_id?: string
  rating?: number
  reviews_count?: number
  price_level?: string
  business_status?: string
  types?: string[]
  formatted_address?: string
  phone?: string
  website?: string
  opening_hours?: any
  photos?: string[]
  reviews?: any[]
  created_at?: string
  updated_at?: string
}

export interface NewsItem {
  id?: string
  session_id: string
  company_name: string
  title: string
  url: string
  source: string
  published_date: string
  snippet?: string
  sentiment?: string
  relevance_score?: number
  is_regulatory?: boolean
  topics?: string[]
  created_at?: string
}

export interface IntelligenceSummary {
  id?: string
  session_id: string
  company_name: string
  domain: string
  is_public?: boolean
  completeness_score?: number
  enrichment_duration?: number
  financial_data_id?: string
  linkedin_data_id?: string
  google_business_id?: string
  social_profiles_count?: number
  news_items_count?: number
  last_enriched_at?: string
  created_at?: string
  updated_at?: string
}

export class ExternalIntelligenceRepository extends BaseRepository {
  private static instance: ExternalIntelligenceRepository

  private constructor() {
    super()
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ExternalIntelligenceRepository {
    if (!ExternalIntelligenceRepository.instance) {
      ExternalIntelligenceRepository.instance = new ExternalIntelligenceRepository()
    }
    return ExternalIntelligenceRepository.instance
  }

  /**
   * Save financial data
   */
  async saveFinancialData(data: FinancialData): Promise<FinancialData> {
    try {
      permanentLogger.breadcrumb('EXTERNAL_INTEL_REPO', 'Saving financial data', {
        session_id: data.session_id,
        ticker: data.ticker
      })

      const supabase = await this.getClient()

      const { data: result, error } = await supabase
        .from('company_financial_data')
        .upsert(data)
        .select()
        .single()

      if (error) throw error

      permanentLogger.info('EXTERNAL_INTEL_REPO', 'Financial data saved', {
        id: result.id
      })

      return result
    } catch (error) {
      permanentLogger.captureError('EXTERNAL_INTEL_REPO', error as Error, {
        operation: 'saveFinancialData'
      })
      throw error
    }
  }

  /**
   * Save investor relations data
   */
  async saveInvestorRelations(data: InvestorRelationsData): Promise<InvestorRelationsData> {
    try {
      permanentLogger.breadcrumb('EXTERNAL_INTEL_REPO', 'Saving investor relations', {
        session_id: data.session_id,
        ticker: data.ticker
      })

      const supabase = await this.getClient()

      const { data: result, error } = await supabase
        .from('company_investor_relations')
        .upsert(data)
        .select()
        .single()

      if (error) throw error

      permanentLogger.info('EXTERNAL_INTEL_REPO', 'Investor relations saved', {
        id: result.id
      })

      return result
    } catch (error) {
      permanentLogger.captureError('EXTERNAL_INTEL_REPO', error as Error, {
        operation: 'saveInvestorRelations'
      })
      throw error
    }
  }

  /**
   * Save LinkedIn data
   */
  async saveLinkedInData(data: LinkedInData): Promise<LinkedInData> {
    try {
      permanentLogger.breadcrumb('EXTERNAL_INTEL_REPO', 'Saving LinkedIn data', {
        session_id: data.session_id,
        linkedin_url: data.linkedin_url
      })

      const supabase = await this.getClient()

      const { data: result, error } = await supabase
        .from('company_linkedin_data')
        .upsert(data)
        .select()
        .single()

      if (error) throw error

      permanentLogger.info('EXTERNAL_INTEL_REPO', 'LinkedIn data saved', {
        id: result.id
      })

      return result
    } catch (error) {
      permanentLogger.captureError('EXTERNAL_INTEL_REPO', error as Error, {
        operation: 'saveLinkedInData'
      })
      throw error
    }
  }

  /**
   * Save social profile
   */
  async saveSocialProfile(profile: SocialProfile): Promise<SocialProfile> {
    try {
      permanentLogger.breadcrumb('EXTERNAL_INTEL_REPO', 'Saving social profile', {
        session_id: profile.session_id,
        platform: profile.platform
      })

      const supabase = await this.getClient()

      const { data: result, error } = await supabase
        .from('company_social_profiles')
        .upsert(profile)
        .select()
        .single()

      if (error) throw error

      permanentLogger.info('EXTERNAL_INTEL_REPO', 'Social profile saved', {
        id: result.id,
        platform: result.platform
      })

      return result
    } catch (error) {
      permanentLogger.captureError('EXTERNAL_INTEL_REPO', error as Error, {
        operation: 'saveSocialProfile'
      })
      throw error
    }
  }

  /**
   * Save Google Business data
   */
  async saveGoogleBusinessData(data: GoogleBusinessData): Promise<GoogleBusinessData> {
    try {
      permanentLogger.breadcrumb('EXTERNAL_INTEL_REPO', 'Saving Google Business data', {
        session_id: data.session_id,
        place_id: data.place_id
      })

      const supabase = await this.getClient()

      const { data: result, error } = await supabase
        .from('company_google_business')
        .upsert(data)
        .select()
        .single()

      if (error) throw error

      permanentLogger.info('EXTERNAL_INTEL_REPO', 'Google Business data saved', {
        id: result.id
      })

      return result
    } catch (error) {
      permanentLogger.captureError('EXTERNAL_INTEL_REPO', error as Error, {
        operation: 'saveGoogleBusinessData'
      })
      throw error
    }
  }

  /**
   * Save news items
   */
  async saveNewsItems(items: NewsItem[]): Promise<NewsItem[]> {
    try {
      if (!items.length) return []

      permanentLogger.breadcrumb('EXTERNAL_INTEL_REPO', 'Saving news items', {
        count: items.length,
        session_id: items[0]?.session_id
      })

      const supabase = await this.getClient()

      const { data: results, error } = await supabase
        .from('company_news')
        .insert(items)
        .select()

      if (error) throw error

      permanentLogger.info('EXTERNAL_INTEL_REPO', 'News items saved', {
        count: results.length
      })

      return results
    } catch (error) {
      permanentLogger.captureError('EXTERNAL_INTEL_REPO', error as Error, {
        operation: 'saveNewsItems'
      })
      throw error
    }
  }

  /**
   * Save intelligence summary
   */
  async saveIntelligenceSummary(summary: IntelligenceSummary): Promise<IntelligenceSummary> {
    try {
      permanentLogger.breadcrumb('EXTERNAL_INTEL_REPO', 'Saving intelligence summary', {
        session_id: summary.session_id,
        completeness_score: summary.completeness_score
      })

      const supabase = await this.getClient()

      const { data: result, error } = await supabase
        .from('external_intelligence_summary')
        .upsert(summary)
        .select()
        .single()

      if (error) throw error

      permanentLogger.info('EXTERNAL_INTEL_REPO', 'Intelligence summary saved', {
        id: result.id
      })

      return result
    } catch (error) {
      permanentLogger.captureError('EXTERNAL_INTEL_REPO', error as Error, {
        operation: 'saveIntelligenceSummary'
      })
      throw error
    }
  }

  /**
   * Get intelligence summary by session ID
   */
  async getIntelligenceSummary(sessionId: string): Promise<IntelligenceSummary | null> {
    try {
      permanentLogger.breadcrumb('EXTERNAL_INTEL_REPO', 'Getting intelligence summary', {
        sessionId
      })

      const supabase = await this.getClient()

      const { data, error } = await supabase
        .from('external_intelligence_summary')
        .select('*')
        .eq('session_id', sessionId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw error
      }

      return data
    } catch (error) {
      permanentLogger.captureError('EXTERNAL_INTEL_REPO', error as Error, {
        operation: 'getIntelligenceSummary'
      })
      throw error
    }
  }

  /**
   * Get all intelligence data by session ID
   */
  async getAllIntelligenceData(sessionId: string): Promise<{
    financial?: FinancialData
    investorRelations?: InvestorRelationsData
    linkedIn?: LinkedInData
    socialProfiles: SocialProfile[]
    googleBusiness?: GoogleBusinessData
    news: NewsItem[]
  }> {
    try {
      permanentLogger.breadcrumb('EXTERNAL_INTEL_REPO', 'Getting all intelligence data', {
        sessionId
      })

      const supabase = await this.getClient()

      // Fetch all data in parallel
      const [
        financialResult,
        irResult,
        linkedInResult,
        socialResult,
        googleResult,
        newsResult
      ] = await Promise.all([
        supabase.from('company_financial_data').select('*').eq('session_id', sessionId).single(),
        supabase.from('company_investor_relations').select('*').eq('session_id', sessionId).single(),
        supabase.from('company_linkedin_data').select('*').eq('session_id', sessionId).single(),
        supabase.from('company_social_profiles').select('*').eq('session_id', sessionId),
        supabase.from('company_google_business').select('*').eq('session_id', sessionId).single(),
        supabase.from('company_news').select('*').eq('session_id', sessionId).order('published_date', { ascending: false })
      ])

      return {
        financial: financialResult.data || undefined,
        investorRelations: irResult.data || undefined,
        linkedIn: linkedInResult.data || undefined,
        socialProfiles: socialResult.data || [],
        googleBusiness: googleResult.data || undefined,
        news: newsResult.data || []
      }
    } catch (error) {
      permanentLogger.captureError('EXTERNAL_INTEL_REPO', error as Error, {
        operation: 'getAllIntelligenceData'
      })
      throw error
    }
  }
}