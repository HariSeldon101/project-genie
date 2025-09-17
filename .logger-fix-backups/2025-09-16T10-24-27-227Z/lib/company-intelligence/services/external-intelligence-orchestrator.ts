/**
 * External Intelligence Orchestrator
 * Coordinates all external intelligence enrichers (Financial, LinkedIn, Social, Google Business, News)
 * Following DRY principles with unified orchestration
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { createClient } from '@/lib/supabase/client'
import {
  ExternalIntelligence,
  calculateCompleteness,
  isLikelyPublicCompany,
  EnrichmentResult
} from '../types/external-intelligence'

// Import all enrichers
import { FinancialEnricher } from '../enrichers/financial-enricher'
import { linkedInCompanyEnricher } from '../enrichers/linkedin-company-enricher'
import { socialMediaEnricher } from '../enrichers/social-media-enricher'
import { googleBusinessEnricher } from '../enrichers/google-business-enricher'
import { newsRegulatoryEnricher } from '../enrichers/news-regulatory-enricher'

export class ExternalIntelligenceOrchestrator {
  private supabase = createClient()

  /**
   * Main orchestration method - runs all enrichers in parallel where possible
   */
  async enrichWithExternalIntelligence(
    sessionId: string,
    companyName: string,
    domain: string,
    existingData?: any
  ): Promise<ExternalIntelligence> {
    const startTime = Date.now()

    permanentLogger.info('Starting external intelligence gathering', { category: 'EXTERNAL_INTELLIGENCE_ORCHESTRATOR', sessionId,
      companyName,
      domain })

    // Initialize the intelligence structure
    const intelligence: ExternalIntelligence = {
      sessionId,
      companyName,
      domain,
      socialProfiles: [],
      news: [],
      lastUpdated: new Date(),
      completeness: 0,
      enrichmentDuration: 0
    }

    try {
      // Step 1: Check if company is likely public (affects financial enrichment)
      const linkedInPreCheck = await this.preCheckLinkedIn(companyName, domain, sessionId)
      const isPublic = isLikelyPublicCompany(companyName, linkedInPreCheck || undefined)

      permanentLogger.info('Company public status determined', { category: 'EXTERNAL_INTELLIGENCE_ORCHESTRATOR', companyName,
        isPublic,
        hasLinkedIn: !!linkedInPreCheck })

      // Step 2: Run enrichers in parallel groups for efficiency
      // Create financial enricher instance with sessionId
      const financialEnricher = new FinancialEnricher(sessionId)
      
      // Group 1: Financial and LinkedIn (often related)
      const [financialResult, linkedInResult] = await Promise.allSettled([
        isPublic ? financialEnricher.enrich(companyName, domain) : Promise.resolve(null),
        linkedInPreCheck ? Promise.resolve(linkedInPreCheck) : 
          linkedInCompanyEnricher.enrich(companyName, domain, sessionId)
      ])

      // Group 2: Social, Google Business, and News (independent)
      const [socialResult, googleResult, newsResult] = await Promise.allSettled([
        socialMediaEnricher.enrich(companyName, domain, sessionId),
        googleBusinessEnricher.enrich(companyName, domain, sessionId),
        newsRegulatoryEnricher.enrich(companyName, domain, sessionId, isPublic)
      ])

      // Process results
      // Financial data
      if (financialResult.status === 'fulfilled' && financialResult.value?.success) {
        intelligence.financial = financialResult.value.data
        await this.saveFinancialData(financialResult.value.data, sessionId)

        // If we have financial data, also check for investor relations
        if (intelligence.financial?.ticker) {
          const irData = await financialEnricher.fetchInvestorRelations(
            companyName,
            domain,
            intelligence.financial.ticker
          )
          if (irData) {
            intelligence.investorRelations = irData
            await this.saveInvestorRelations(irData, sessionId)
          }
        }
      }

      // LinkedIn data
      if (linkedInResult.status === 'fulfilled' && linkedInResult.value?.success) {
        intelligence.linkedIn = linkedInResult.value.data
        await this.saveLinkedInData(linkedInResult.value.data, sessionId)
      }

      // Social media profiles
      if (socialResult.status === 'fulfilled' && socialResult.value?.success) {
        intelligence.socialProfiles = socialResult.value.data || []
        await this.saveSocialProfiles(socialResult.value.data, sessionId)
      }

      // Google Business data
      if (googleResult.status === 'fulfilled' && googleResult.value?.success) {
        intelligence.googleBusiness = googleResult.value.data
        await this.saveGoogleBusinessData(googleResult.value.data, sessionId)
      }

      // News and regulatory items
      if (newsResult.status === 'fulfilled' && newsResult.value?.success) {
        intelligence.news = newsResult.value.data || []
        await this.saveNewsItems(newsResult.value.data, sessionId)
      }

      // Step 3: Calculate completeness score
      intelligence.completeness = calculateCompleteness(intelligence)
      intelligence.enrichmentDuration = Date.now() - startTime

      // Step 4: Save summary
      await this.saveSummary(intelligence)

      permanentLogger.info('External intelligence gathering completed', { category: 'EXTERNAL_INTELLIGENCE_ORCHESTRATOR', sessionId,
        companyName,
        completeness: `${intelligence.completeness}%`,
        duration: intelligence.enrichmentDuration,
        hasFinancial: !!intelligence.financial,
        hasLinkedIn: !!intelligence.linkedIn,
        socialProfiles: intelligence.socialProfiles.length,
        hasGoogleBusiness: !!intelligence.googleBusiness,
        newsCount: intelligence.news.length })

      return intelligence

    } catch (error) {
      permanentLogger.captureError('EXTERNAL_INTELLIGENCE_ORCHESTRATOR', error, {
        message: 'Intelligence gathering failed',
        sessionId,
        companyName,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })

      // Return partial data even on error
      intelligence.enrichmentDuration = Date.now() - startTime
      return intelligence
    }
  }

  /**
   * Pre-check for LinkedIn to determine if company is public
   */
  private async preCheckLinkedIn(
    companyName: string,
    domain: string,
    sessionId: string
  ): Promise<EnrichmentResult | null> {
    try {
      permanentLogger.info('EXTERNAL_INTELLIGENCE_ORCHESTRATOR', 'Pre-checking LinkedIn', { companyName})

      const result = await linkedInCompanyEnricher.enrich(companyName, domain, sessionId)
      return result

    } catch (error) {
      permanentLogger.captureError('EXTERNAL_INTELLIGENCE_ORCHESTRATOR', error, {
        message: 'LinkedIn pre-check failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
      return null
    }
  }

  /**
   * Save financial data to database
   */
  private async saveFinancialData(data: any, sessionId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('company_financial_data')
        .upsert({
          session_id: sessionId,
          ...data,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      permanentLogger.info('Financial data saved', { category: 'EXTERNAL_INTELLIGENCE_ORCHESTRATOR', sessionId,
        ticker: data.ticker })

    } catch (error) {
      permanentLogger.captureError('EXTERNAL_INTELLIGENCE_ORCHESTRATOR', error, {
        message: 'Failed to save financial data',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Save investor relations data
   */
  private async saveInvestorRelations(data: any, sessionId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('company_investor_relations')
        .upsert({
          session_id: sessionId,
          ...data,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      permanentLogger.info('EXTERNAL_INTELLIGENCE_ORCHESTRATOR', 'Investor relations data saved', { sessionId})

    } catch (error) {
      permanentLogger.captureError('EXTERNAL_INTELLIGENCE_ORCHESTRATOR', error, {
        message: 'Failed to save IR data',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Save LinkedIn data to database
   */
  private async saveLinkedInData(data: any, sessionId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('company_linkedin_data')
        .upsert({
          session_id: sessionId,
          ...data,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      permanentLogger.info('LinkedIn data saved', { category: 'EXTERNAL_INTELLIGENCE_ORCHESTRATOR', sessionId,
        companyName: data.name })

    } catch (error) {
      permanentLogger.captureError('EXTERNAL_INTELLIGENCE_ORCHESTRATOR', error, {
        message: 'Failed to save LinkedIn data',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Save social media profiles to database
   */
  private async saveSocialProfiles(profiles: any[], sessionId: string): Promise<void> {
    try {
      for (const profile of profiles) {
        const { error } = await this.supabase
          .from('company_social_profiles')
          .upsert({
            session_id: sessionId,
            ...profile,
            updated_at: new Date().toISOString()
          })

        if (error) throw error
      }

      permanentLogger.info('Social profiles saved', { category: 'EXTERNAL_INTELLIGENCE_ORCHESTRATOR', sessionId,
        count: profiles.length })

    } catch (error) {
      permanentLogger.captureError('EXTERNAL_INTELLIGENCE_ORCHESTRATOR', error, {
        message: 'Failed to save social profiles',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Save Google Business data to database
   */
  private async saveGoogleBusinessData(data: any, sessionId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('company_google_business')
        .upsert({
          session_id: sessionId,
          ...data,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      permanentLogger.info('Google Business data saved', { category: 'EXTERNAL_INTELLIGENCE_ORCHESTRATOR', sessionId,
        businessName: data.businessName })

    } catch (error) {
      permanentLogger.captureError('EXTERNAL_INTELLIGENCE_ORCHESTRATOR', error, {
        message: 'Failed to save Google Business data',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Save news items to database
   */
  private async saveNewsItems(newsItems: any[], sessionId: string): Promise<void> {
    try {
      for (const item of newsItems.slice(0, 50)) { // Limit to 50 items
        const { error } = await this.supabase
          .from('company_news')
          .insert({
            session_id: sessionId,
            ...item,
            created_at: new Date().toISOString()
          })

        if (error) throw error
      }

      permanentLogger.info('News items saved', {
        category: 'EXTERNAL_INTELLIGENCE_ORCHESTRATOR',
        sessionId,
        count: Math.min(newsItems.length, 50)
      })

    } catch (error) {
      permanentLogger.captureError('EXTERNAL_INTELLIGENCE_ORCHESTRATOR', error, {
        message: 'Failed to save news items',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Save intelligence summary
   */
  private async saveSummary(intelligence: ExternalIntelligence): Promise<void> {
    try {
      const summary = {
        session_id: intelligence.sessionId,
        company_name: intelligence.companyName,
        domain: intelligence.domain,
        has_financial_data: !!intelligence.financial,
        has_investor_relations: !!intelligence.investorRelations,
        has_linkedin_data: !!intelligence.linkedIn,
        social_profiles_count: intelligence.socialProfiles.length,
        has_google_business: !!intelligence.googleBusiness,
        news_count: intelligence.news.length,
        completeness: intelligence.completeness,
        enrichment_duration: intelligence.enrichmentDuration,
        last_updated: new Date().toISOString()
      }

      const { error } = await this.supabase
        .from('external_intelligence_summary')
        .upsert(summary)

      if (error) throw error

      permanentLogger.info('Intelligence summary saved', { category: 'EXTERNAL_INTELLIGENCE_ORCHESTRATOR', sessionId: intelligence.sessionId,
        completeness: intelligence.completeness })

    } catch (error) {
      permanentLogger.captureError('EXTERNAL_INTELLIGENCE_ORCHESTRATOR', error, {
        message: 'Failed to save summary',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Load existing intelligence from database
   */
  async loadExistingIntelligence(sessionId: string): Promise<ExternalIntelligence | null> {
    try {
      permanentLogger.info('EXTERNAL_INTELLIGENCE_ORCHESTRATOR', 'Loading existing intelligence', { sessionId})

      // Load summary first
      const { data: summary, error: summaryError } = await this.supabase
        .from('external_intelligence_summary')
        .select('*')
        .eq('session_id', sessionId)
        .single()

      if (summaryError || !summary) {
        return null
      }

      // Load all data in parallel
      const [
        financialResult,
        irResult,
        linkedInResult,
        socialResult,
        googleResult,
        newsResult
      ] = await Promise.allSettled([
        this.supabase
          .from('company_financial_data')
          .select('*')
          .eq('session_id', sessionId)
          .single(),
        this.supabase
          .from('company_investor_relations')
          .select('*')
          .eq('session_id', sessionId)
          .single(),
        this.supabase
          .from('company_linkedin_data')
          .select('*')
          .eq('session_id', sessionId)
          .single(),
        this.supabase
          .from('company_social_profiles')
          .select('*')
          .eq('session_id', sessionId),
        this.supabase
          .from('company_google_business')
          .select('*')
          .eq('session_id', sessionId)
          .single(),
        this.supabase
          .from('company_news')
          .select('*')
          .eq('session_id', sessionId)
          .order('published_date', { ascending: false })
          .limit(50)
      ])

      // Build intelligence object
      const intelligence: ExternalIntelligence = {
        sessionId,
        companyName: summary.company_name,
        domain: summary.domain,
        socialProfiles: [],
        news: [],
        lastUpdated: new Date(summary.last_updated),
        completeness: summary.completeness,
        enrichmentDuration: summary.enrichment_duration
      }

      // Add available data
      if (financialResult.status === 'fulfilled' && financialResult.value.data) {
        intelligence.financial = financialResult.value.data
      }

      if (irResult.status === 'fulfilled' && irResult.value.data) {
        intelligence.investorRelations = irResult.value.data
      }

      if (linkedInResult.status === 'fulfilled' && linkedInResult.value.data) {
        intelligence.linkedIn = linkedInResult.value.data
      }

      if (socialResult.status === 'fulfilled' && socialResult.value.data) {
        intelligence.socialProfiles = socialResult.value.data
      }

      if (googleResult.status === 'fulfilled' && googleResult.value.data) {
        intelligence.googleBusiness = googleResult.value.data
      }

      if (newsResult.status === 'fulfilled' && newsResult.value.data) {
        intelligence.news = newsResult.value.data
      }

      permanentLogger.info('Existing intelligence loaded', { category: 'EXTERNAL_INTELLIGENCE_ORCHESTRATOR', sessionId,
        completeness: intelligence.completeness,
        hasFinancial: !!intelligence.financial,
        hasLinkedIn: !!intelligence.linkedIn,
        socialProfiles: intelligence.socialProfiles.length,
        newsCount: intelligence.news.length })

      return intelligence

    } catch (error) {
      permanentLogger.captureError('EXTERNAL_INTELLIGENCE_ORCHESTRATOR', error, {
        message: 'Failed to load intelligence',
        sessionId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
      return null
    }
  }

  /**
   * Check if intelligence needs refresh
   */
  needsRefresh(intelligence: ExternalIntelligence, maxAgeHours: number = 24): boolean {
    const ageHours = (Date.now() - intelligence.lastUpdated.getTime()) / (1000 * 60 * 60)
    
    const needsRefresh = ageHours > maxAgeHours || intelligence.completeness < 50

    permanentLogger.info('Refresh check', { category: 'EXTERNAL_INTELLIGENCE_ORCHESTRATOR', ageHours,
      maxAgeHours,
      completeness: intelligence.completeness,
      needsRefresh })

    return needsRefresh
  }
}

// Export singleton instance
export const externalIntelligenceOrchestrator = new ExternalIntelligenceOrchestrator()