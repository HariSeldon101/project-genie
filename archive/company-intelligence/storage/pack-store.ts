/**
 * Pack Store
 * Handles storage and retrieval of company intelligence packs in Supabase
 */

import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { permanentLogger } from '../../utils/permanent-logger'
import type { CompanyInformationPack, ResearchJob } from '../types'

export class PackStore {
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

    permanentLogger.info('PACK_STORE', 'Initialized pack store')
  }

  /**
   * Create a server-side instance of PackStore
   * This should be used in API routes and server components
   */
  static async createServerInstance(): Promise<PackStore> {
    // Dynamic import to avoid importing next/headers in client components
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            } catch (error) {
      // Log error but re-throw to avoid silent failures
      permanentLogger.captureError('ERROR', error as Error, {
        context: 'Unhandled error - needs proper handling'
      })
      throw error
    }
          },
        },
      }
    )
    
    return new PackStore(supabase)
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

      permanentLogger.info('PACK_STORE', 'Pack stored successfully', {
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

      permanentLogger.info('PACK_STORE', 'Pack retrieved', {
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
   * Link a pack to a project
   */
  async linkToProject(packId: string, projectId: string): Promise<void> {
    try {
      // Update the pack with project ID
      const { error: packError } = await this.supabase
        .from('company_intelligence_packs')
        .update({ project_id: projectId })
        .eq('id', packId)

      if (packError) {
        throw packError
      }

      // Also update the project with company info
      const pack = await this.getById(packId)
      if (pack) {
        const { error: projectError } = await this.supabase
          .from('projects')
          .update({ 
            company_info: {
              packId,
              domain: pack.domain,
              companyName: pack.companyName,
              industry: pack.business.industry,
              description: pack.basics.description
            }
          })
          .eq('id', projectId)

        if (projectError) {
          throw projectError
        }
      }

      permanentLogger.info('PACK_STORE', 'Pack linked to project', {
        packId,
        projectId
      })

    } catch (error) {
      permanentLogger.captureError('PACK_STORE', 'Failed to link pack to project', {
        error: error instanceof Error ? error.message : 'Unknown error',
        packId,
        projectId
      })
      throw error
    }
  }

  /**
   * Create a research job
   */
  async createJob(job: Partial<ResearchJob>): Promise<ResearchJob> {
    try {
      permanentLogger.debug('PACK_STORE', 'Creating research job', {
        id: job.id,
        domain: job.domain,
        status: job.status || 'pending'
      })
      
      const { data, error } = await this.supabase
        .from('research_jobs')
        .insert({
          id: job.id,
          domain: job.domain,
          status: job.status || 'pending',
          request: job.request,
          started_at: job.startedAt
        })
        .select()
        .single()

      if (error) {
        permanentLogger.captureError('PACK_STORE', new Error('Supabase error'), error)
        throw error
      }

      permanentLogger.info('PACK_STORE', 'Research job created', {
        id: data.id,
        domain: data.domain,
        status: data.status
      })

      return data as ResearchJob

    } catch (error) {
      permanentLogger.captureError('PACK_STORE', 'Failed to create research job', {
        error: error instanceof Error ? error.message : 'Unknown error',
        jobId: job.id
      })
      throw error
    }
  }

  /**
   * Update a research job
   */
  async updateJob(id: string, updates: Partial<ResearchJob>): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('research_jobs')
        .update({
          status: updates.status,
          result: updates.result,
          error: updates.error,
          completed_at: updates.completedAt,
          duration_ms: updates.durationMs,
          pages_scraped: updates.pagesScraped,
          cost_usd: updates.costUsd
        })
        .eq('id', id)

      if (error) {
        throw error
      }

      permanentLogger.info('PACK_STORE', 'Research job updated', {
        id,
        status: updates.status
      })

    } catch (error) {
      permanentLogger.captureError('PACK_STORE', 'Failed to update research job', {
        error: error instanceof Error ? error.message : 'Unknown error',
        jobId: id
      })
      throw error
    }
  }

  /**
   * Get research job status
   */
  async getJobStatus(id: string): Promise<ResearchJob | null> {
    try {
      const { data, error } = await this.supabase
        .from('research_jobs')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw error
      }

      return data as ResearchJob

    } catch (error) {
      permanentLogger.captureError('PACK_STORE', 'Failed to get job status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        jobId: id
      })
      return null
    }
  }

  /**
   * List recent research jobs
   */
  async listRecentJobs(limit: number = 10): Promise<ResearchJob[]> {
    try {
      const { data, error } = await this.supabase
        .from('research_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        throw error
      }

      return data as ResearchJob[]

    } catch (error) {
      permanentLogger.captureError('PACK_STORE', 'Failed to list recent jobs', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return []
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
          company_name: sessionData.sessionName,
          domain: sessionData.domain,
          merged_data: {
            scraped: sessionData.scrapedData || null,
            stageReviews: sessionData.stageReviews || null,
            enrichment: sessionData.enrichmentData || null,
            stats: {
              totalPages: sessionData.pagesScraped || 0,
              dataPoints: 0,
              totalLinks: 0
            },
            pages: {},
            extractedData: {}
          },
          discovered_urls: [],
          status: sessionData.status || 'active',
          version: 0
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      permanentLogger.info('PACK_STORE', 'Research session saved', {
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

      permanentLogger.info('PACK_STORE', 'Research session loaded', {
        id: data.id,
        companyName: data.company_name,
        status: data.status
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

      permanentLogger.info('PACK_STORE', 'Research session updated', {
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

      permanentLogger.info('PACK_STORE', 'Research sessions listed', {
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

      permanentLogger.info('PACK_STORE', 'Research session deleted', {
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
   * Add a log to a research session
   */
  async addSessionLog(sessionId: string, log: {
    level: 'debug' | 'info' | 'warn' | 'error'
    category?: string
    message: string
    metadata?: any
  }): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('research_session_logs')
        .insert({
          session_id: sessionId,
          level: log.level,
          category: log.category || null,
          message: log.message,
          metadata: log.metadata || null
        })

      if (error) {
        // Don't throw on logging errors, just log them
        permanentLogger.warn('PACK_STORE', 'Failed to add session log', error)
      }
    } catch (error) {
      permanentLogger.warn('PACK_STORE', 'Error adding session log', error)
    }
  }

  /**
   * Get logs for a research session
   */
  async getSessionLogs(sessionId: string, options: {
    level?: string
    category?: string
    limit?: number
  } = {}): Promise<any[]> {
    try {
      let query = this.supabase
        .from('research_session_logs')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: false })

      if (options.level) {
        query = query.eq('level', options.level)
      }
      if (options.category) {
        query = query.eq('category', options.category)
      }
      if (options.limit) {
        query = query.limit(options.limit)
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      return data || []
    } catch (error) {
      permanentLogger.captureError('PACK_STORE', 'Failed to get session logs', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId
      })
      return []
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