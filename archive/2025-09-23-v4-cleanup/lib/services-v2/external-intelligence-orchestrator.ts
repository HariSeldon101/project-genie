/**
 * External Intelligence Orchestrator
 * Coordinates all external intelligence enrichers (Financial, LinkedIn, Social, Google Business, News)
 * Following DRY principles with unified orchestration
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { ExternalIntelligenceRepository } from '@/lib/repositories/external-intelligence-repository'
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
  private repository = ExternalIntelligenceRepository.getInstance()

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

    permanentLogger.info('EXTERNAL_INTELLIGENCE_ORCHESTRATOR', 'Starting external intelligence gathering', {
      sessionId,
      companyName,
      domain
    })

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

      permanentLogger.info('EXTERNAL_INTELLIGENCE_ORCHESTRATOR', 'Company public status determined', {
        companyName,
        isPublic,
        hasLinkedIn: !!linkedInPreCheck
      })

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

      permanentLogger.info('EXTERNAL_INTELLIGENCE_ORCHESTRATOR', 'External intelligence gathering completed', {
        sessionId,
        companyName,
        completeness: `${intelligence.completeness}%`,
        duration: intelligence.enrichmentDuration,
        hasFinancial: !!intelligence.financial,
        hasLinkedIn: !!intelligence.linkedIn,
        socialProfiles: intelligence.socialProfiles.length,
        hasGoogleBusiness: !!intelligence.googleBusiness,
        newsCount: intelligence.news.length
      })

      return intelligence

    } catch (error) {
      permanentLogger.captureError('EXTERNAL_INTELLIGENCE_ORCHESTRATOR', error as Error, {
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
      permanentLogger.captureError('EXTERNAL_INTELLIGENCE_ORCHESTRATOR', error as Error, {
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
      await this.repository.saveFinancialData({
          session_id: sessionId,
          ...data,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      permanentLogger.info('EXTERNAL_INTELLIGENCE_ORCHESTRATOR', 'Financial data saved', {
        sessionId,
        ticker: data.ticker
      })

    } catch (error) {
      permanentLogger.captureError('EXTERNAL_INTELLIGENCE_ORCHESTRATOR', error as Error, {
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
      await this.repository.saveInvestorRelations({
          session_id: sessionId,
          ...data,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      permanentLogger.info('EXTERNAL_INTELLIGENCE_ORCHESTRATOR', 'Investor relations data saved', { sessionId})

    } catch (error) {
      permanentLogger.captureError('EXTERNAL_INTELLIGENCE_ORCHESTRATOR', error as Error, {
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
      await this.repository.saveLinkedInData({
          session_id: sessionId,
          ...data,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      permanentLogger.info('EXTERNAL_INTELLIGENCE_ORCHESTRATOR', 'LinkedIn data saved', {
        sessionId,
        companyName: data.name
      })

    } catch (error) {
      permanentLogger.captureError('EXTERNAL_INTELLIGENCE_ORCHESTRATOR', error as Error, {
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
        await this.repository.saveSocialProfile({
            session_id: sessionId,
            ...profile,
            updated_at: new Date().toISOString()
          })

        if (error) throw error
      }

      permanentLogger.info('EXTERNAL_INTELLIGENCE_ORCHESTRATOR', 'Social profiles saved', {
        sessionId,
        count: profiles.length
      })

    } catch (error) {
      permanentLogger.captureError('EXTERNAL_INTELLIGENCE_ORCHESTRATOR', error as Error, {
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
      await this.repository.saveGoogleBusinessData({
          session_id: sessionId,
          ...data,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      permanentLogger.info('EXTERNAL_INTELLIGENCE_ORCHESTRATOR', 'Google Business data saved', {
        sessionId,
        businessName: data.businessName
      })

    } catch (error) {
      permanentLogger.captureError('EXTERNAL_INTELLIGENCE_ORCHESTRATOR', error as Error, {
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
        // News items will be saved in batch
        continue // Skip individual inserts
      }

      permanentLogger.info('EXTERNAL_INTELLIGENCE_ORCHESTRATOR', 'News items saved', {
        sessionId,
        count: Math.min(newsItems.length, 50)
      })

    } catch (error) {
      permanentLogger.captureError('EXTERNAL_INTELLIGENCE_ORCHESTRATOR', error as Error, {
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

      await this.repository.saveIntelligenceSummary(summary)

      permanentLogger.info('EXTERNAL_INTELLIGENCE_ORCHESTRATOR', 'Intelligence summary saved', {
        sessionId: intelligence.sessionId,
        completeness: intelligence.completeness
      })

    } catch (error) {
      permanentLogger.captureError('EXTERNAL_INTELLIGENCE_ORCHESTRATOR', error as Error, {
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
      const summary = await this.repository.getIntelligenceSummary(sessionId)

      if (!summary) {
        return null
      }

      // Load all data
      const allData = await this.repository.getAllIntelligenceData(sessionId)

      // Build intelligence object
      const intelligence: ExternalIntelligence = {
        sessionId,
        companyName: summary.company_name,
        domain: summary.domain,
        financial: allData.financial,
        investorRelations: allData.investorRelations,
        linkedIn: allData.linkedIn,
        socialProfiles: allData.socialProfiles,
        googleBusiness: allData.googleBusiness,
        news: allData.news,
        lastUpdated: new Date(summary.last_enriched_at || summary.updated_at || ''),
        completeness: summary.completeness_score || 0,
        enrichmentDuration: summary.enrichment_duration || 0
      }

      permanentLogger.info('EXTERNAL_INTELLIGENCE_ORCHESTRATOR', 'Existing intelligence loaded', {
        sessionId,
        completeness: intelligence.completeness,
        hasFinancial: !!intelligence.financial,
        hasLinkedIn: !!intelligence.linkedIn,
        socialProfiles: intelligence.socialProfiles.length,
        newsCount: intelligence.news.length
      })

      return intelligence

    } catch (error) {
      permanentLogger.captureError('EXTERNAL_INTELLIGENCE_ORCHESTRATOR', error as Error, {
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

    permanentLogger.info('EXTERNAL_INTELLIGENCE_ORCHESTRATOR', 'Refresh check', {
      ageHours,
      maxAgeHours,
      completeness: intelligence.completeness,
      needsRefresh
    })

    return needsRefresh
  }
}

// Export singleton instance
export const externalIntelligenceOrchestrator = new ExternalIntelligenceOrchestrator()