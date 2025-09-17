/**
 * Client-Safe Pack Store
 * Browser-only version of PackStore without server-side imports
 */

import { createBrowserClient } from '@supabase/ssr'
import { logger } from '../../utils/client-safe-logger'
import type { CompanyInformationPack, ResearchJob } from '../types'

export class ClientPackStore {
  private supabase: any

  constructor(supabaseClient?: any) {
    // If a client is provided, use it
    if (supabaseClient) {
      this.supabase = supabaseClient
    } else {
      // Otherwise create a browser client (for client-side usage)
      this.supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
    }

    logger.info('PACK_STORE', 'Initialized client pack store')
  }

  /**
   * Store a company intelligence pack
   */
  async store(pack: CompanyInformationPack): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('company_intelligence_packs')
        .upsert({
          id: pack.id,
          domain: pack.domain,
          company_name: pack.companyName,
          data: pack,
          summary: this.generateSummary(pack),
          generated_at: pack.generatedAt,
          last_updated: pack.lastUpdated,
          data_quality: pack.metadata.dataQuality,
          confidence: pack.metadata.confidence,
          sources: pack.metadata.sources,
          user_id: await this.getCurrentUserId(),
          cache_ttl: 604800 // 7 days
        }, {
          onConflict: 'domain'
        })

      if (error) {
        throw error
      }

      logger.info('PACK_STORE', 'Pack stored successfully', {
        id: pack.id,
        domain: pack.domain,
        companyName: pack.companyName
      })

    } catch (error) {
      permanentLogger.captureError('PACK_STORE', 'Failed to store pack', {
        error: error instanceof Error ? error.message : 'Unknown error',
        packId: pack.id
      })
      throw error
    }
  }

  /**
   * Retrieve a pack by domain
   */
  async getByDomain(domain: string): Promise<CompanyInformationPack | null> {
    try {
      const { data, error } = await this.supabase
        .from('company_intelligence_packs')
        .select('*')
        .eq('domain', domain)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No pack found
          return null
        }
        throw error
      }

      logger.info('PACK_STORE', 'Pack retrieved', {
        domain,
        companyName: data.company_name
      })

      return data.data as CompanyInformationPack

    } catch (error) {
      permanentLogger.captureError('PACK_STORE', 'Failed to retrieve pack', {
        error: error instanceof Error ? error.message : 'Unknown error',
        domain
      })
      return null
    }
  }

  /**
   * Retrieve a pack by ID
   */
  async getById(id: string): Promise<CompanyInformationPack | null> {
    try {
      const { data, error } = await this.supabase
        .from('company_intelligence_packs')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw error
      }

      return data.data as CompanyInformationPack

    } catch (error) {
      permanentLogger.captureError('PACK_STORE', 'Failed to retrieve pack by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id
      })
      return null
    }
  }

  /**
   * Save a research session
   */
  async saveSession(sessionData: {
    sessionName: string
    domain: string
    scrapedData?: any
    stageReviews?: any
    enrichmentData?: any
    config?: any
    scraperOptions?: any
    modelSettings?: any
    stage?: string
    status?: string
    pagesScraped?: number
  }): Promise<string> {
    try {
      const userId = await this.getCurrentUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await this.supabase
        .from('company_intelligence_sessions')
        .insert({
          user_id: userId,
          company_name: sessionData.sessionName,  // Map sessionName to company_name
          domain: sessionData.domain,
          merged_data: {
            scraped: sessionData.scrapedData || null,
            stageReviews: sessionData.stageReviews || null,
            enrichment: sessionData.enrichmentData || null,
            stats: {
              totalPages: sessionData.pagesScraped || 0,
              dataPoints: 0,
              totalLinks: 0,
              uniqueTechnologies: 0,
              phaseCounts: {}
            },
            pages: {},
            extractedData: {},
            site_analysis: null,
            error: null,
            corporate_entity_id: null,
            discovered_entities: []
          },
          discovered_urls: [],
          status: sessionData.status || 'active',
          phase: 1,  // Default to phase 1
          version: 0
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      logger.info('PACK_STORE', 'Research session saved', {
        id: data.id,
        companyName: data.company_name,
        domain: data.domain
      })

      return data.id
    } catch (error) {
      permanentLogger.captureError('PACK_STORE', 'Failed to save research session', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Load a research session
   */
  async loadSession(sessionId: string): Promise<any> {
    try {
      const userId = await this.getCurrentUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await this.supabase
        .from('company_intelligence_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw error
      }

      logger.info('PACK_STORE', 'Research session loaded', {
        id: data.id,
        companyName: data.company_name,
        phase: data.phase
      })

      return data
    } catch (error) {
      permanentLogger.captureError('PACK_STORE', 'Failed to load research session', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId
      })
      throw error
    }
  }

  /**
   * Update a research session
   */
  async updateSession(sessionId: string, updates: any): Promise<void> {
    try {
      const userId = await this.getCurrentUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      // Mark as completed if status changes to completed
      if (updates.status === 'completed' && !updates.completed_at) {
        updates.completed_at = new Date().toISOString()
      }

      const { error } = await this.supabase
        .from('company_intelligence_sessions')
        .update(updates)
        .eq('id', sessionId)
        .eq('user_id', userId)

      if (error) {
        throw error
      }

      logger.info('PACK_STORE', 'Research session updated', {
        id: sessionId,
        updates: Object.keys(updates)
      })
    } catch (error) {
      permanentLogger.captureError('PACK_STORE', 'Failed to update research session', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId
      })
      throw error
    }
  }

  /**
   * List user's research sessions
   */
  async listSessions(options: {
    domain?: string
    status?: string
    limit?: number
    offset?: number
  } = {}): Promise<any[]> {
    try {
      const userId = await this.getCurrentUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      const limit = options.limit || 50
      const offset = options.offset || 0

      let query = this.supabase
        .from('company_intelligence_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (options.domain) {
        query = query.ilike('domain', `%${options.domain}%`)
      }
      if (options.status) {
        query = query.eq('status', options.status)
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      logger.info('PACK_STORE', 'Research sessions listed', {
        count: data?.length || 0,
        filters: options
      })

      return data || []
    } catch (error) {
      permanentLogger.captureError('PACK_STORE', 'Failed to list research sessions', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return []
    }
  }

  /**
   * Delete a research session
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      const userId = await this.getCurrentUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      const { error } = await this.supabase
        .from('company_intelligence_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', userId)

      if (error) {
        throw error
      }

      logger.info('PACK_STORE', 'Research session deleted', {
        id: sessionId
      })
    } catch (error) {
      permanentLogger.captureError('PACK_STORE', 'Failed to delete research session', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId
      })
      throw error
    }
  }

  /**
   * Generate a summary of the pack for quick access
   */
  private generateSummary(pack: CompanyInformationPack): any {
    return {
      companyName: pack.companyName,
      description: pack.basics.description,
      industry: pack.business.industry,
      targetMarket: pack.business.targetMarket,
      employeeCount: pack.business.numberOfEmployees,
      competitorCount: pack.marketPosition.competitors.length,
      productCount: pack.productsServices.products.length,
      serviceCount: pack.productsServices.services.length,
      dataQuality: pack.metadata.dataQuality,
      lastUpdated: pack.lastUpdated
    }
  }

  /**
   * Get current user ID
   */
  private async getCurrentUserId(): Promise<string | null> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      return user?.id || null
    } catch {
      return null
    }
  }
}