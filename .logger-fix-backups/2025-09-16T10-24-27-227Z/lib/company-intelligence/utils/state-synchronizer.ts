/**
 * StateSynchronizer - Synchronizes UI state with database
 * 
 * SOLID Principles:
 * - Single Responsibility: Only handles state sync
 * - Dependency Inversion: Depends on Supabase abstraction
 * 
 * DRY: Centralizes state persistence logic
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { createClient } from '@/lib/supabase/client'
import { ScrapingSessionState, ScraperRun } from '../services/scraping-state-service'

export interface SyncOptions {
  autoSync?: boolean // Auto-sync on changes
  syncIntervalMs?: number // Sync interval in milliseconds
  debounceMs?: number // Debounce period for changes
}

export class StateSynchronizer {
  private sessionId: string
  private supabase: ReturnType<typeof createClient>
  private syncInterval: NodeJS.Timer | null = null
  private debounceTimer: NodeJS.Timeout | null = null
  private pendingSync: boolean = false
  private lastSyncTime: number = 0
  private options: SyncOptions
  
  constructor(sessionId: string, options: SyncOptions = {}) {
    this.sessionId = sessionId
    this.supabase = createClient()
    this.options = {
      autoSync: options.autoSync ?? true,
      syncIntervalMs: options.syncIntervalMs ?? 30000, // Default 30 seconds
      debounceMs: options.debounceMs ?? 2000 // Default 2 seconds
    }
    
    // Start auto-sync if enabled
    if (this.options.autoSync && this.options.syncIntervalMs) {
      this.syncInterval = setInterval(
        () => this.syncIfNeeded(),
        this.options.syncIntervalMs
      )
    }
    
    permanentLogger.info('Synchronizer initialized', { category: 'STATE_SYNCHRONIZER', sessionId,
      autoSync: this.options.autoSync,
      syncIntervalMs: this.options.syncIntervalMs })
  }
  
  /**
   * Sync state to database
   * Debounced to prevent excessive updates
   */
  async syncToDatabase(state: Partial<ScrapingSessionState>): Promise<void> {
    // Mark sync as pending
    this.pendingSync = true
    
    // Clear existing debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }
    
    // Debounce the sync operation
    this.debounceTimer = setTimeout(async () => {
      await this.performSync(state)
    }, this.options.debounceMs)
  }
  
  /**
   * Perform actual sync operation
   */
  private async performSync(state: Partial<ScrapingSessionState>): Promise<void> {
    try {
      permanentLogger.breadcrumb('SYNC_START', 'Starting state sync', {
        sessionId: this.sessionId,
        hasHistory: !!state.history,
        hasTotals: !!state.totals
      })
      
      const startTime = Date.now()
      
      // Build update object
      const updateData: any = {
        updated_at: new Date().toISOString()
      }
      
      // Update merged_data if we have state data
      if (state.totals || state.history) {
        // Get current merged_data
        const { data: session, error: fetchError } = await this.supabase
          .from('company_intelligence_sessions')
          .select('merged_data')
          .eq('id', this.sessionId)
          .single()
        
        if (fetchError) {
          throw fetchError
        }
        
        const mergedData = session?.merged_data || {
          stats: {},
          pages: {},
          extractedData: {}
        }
        
        // Update stats from totals
        if (state.totals) {
          mergedData.stats = {
            ...mergedData.stats,
            totalPages: state.totals.pagesScraped,
            dataPoints: state.totals.dataPoints,
            totalLinks: state.totals.discoveredLinks,
            scraperRuns: state.totals.scraperRuns,
            lastSync: new Date().toISOString()
          }
        }
        
        // Store history metadata (not full history to avoid bloat)
        if (state.history) {
          mergedData.stats.phaseCounts = {}
          state.history.forEach(run => {
            if (run.status === 'complete') {
              mergedData.stats.phaseCounts[run.scraperId] = 
                (mergedData.stats.phaseCounts[run.scraperId] || 0) + 1
            }
          })
        }
        
        updateData.merged_data = mergedData
      }
      
      // Update session
      const { error: updateError } = await this.supabase
        .from('company_intelligence_sessions')
        .update(updateData)
        .eq('id', this.sessionId)
      
      if (updateError) {
        throw updateError
      }
      
      const syncDuration = Date.now() - startTime
      this.lastSyncTime = Date.now()
      this.pendingSync = false
      
      permanentLogger.info('State synced successfully', { category: 'STATE_SYNCHRONIZER', sessionId: this.sessionId,
        syncDuration,
        totals: state.totals })
    } catch (error) {
      permanentLogger.captureError('STATE_SYNCHRONIZER', error, {
        context: 'Failed to sync state',
        sessionId: this.sessionId
      })
      throw error
    }
  }
  
  /**
   * Sync from database to get latest state
   */
  async syncFromDatabase(): Promise<ScrapingSessionState | null> {
    try {
      permanentLogger.breadcrumb('SYNC_FROM_DB', 'Fetching state from database', {
        sessionId: this.sessionId
      })
      
      const { data: session, error } = await this.supabase
        .from('company_intelligence_sessions')
        .select('*')
        .eq('id', this.sessionId)
        .single()
      
      if (error) {
        throw error
      }
      
      if (!session) {
        return null
      }
      
      // Parse session data into state format
      const mergedData = session.merged_data || {}
      const stats = mergedData.stats || {}
      
      const state: ScrapingSessionState = {
        sessionId: this.sessionId,
        domain: session.domain,
        history: [], // Would need to fetch from scraper_runs table
        totals: {
          pagesScraped: stats.totalPages || 0,
          dataPoints: stats.dataPoints || 0,
          discoveredLinks: stats.totalLinks || 0,
          scraperRuns: stats.scraperRuns || 0
        },
        suggestions: [],
        usedScrapers: Object.keys(stats.phaseCounts || {})
      }
      
      permanentLogger.info('State fetched from database', { category: 'STATE_SYNCHRONIZER', sessionId: this.sessionId,
        totals: state.totals })
      
      return state
    } catch (error) {
      permanentLogger.captureError('STATE_SYNCHRONIZER', error, {
        context: 'Failed to fetch state from database',
        sessionId: this.sessionId
      })
      return null
    }
  }
  
  /**
   * Sync if there are pending changes
   */
  private async syncIfNeeded(): Promise<void> {
    if (this.pendingSync) {
      permanentLogger.breadcrumb('AUTO_SYNC', 'Performing scheduled sync', {
        sessionId: this.sessionId,
        timeSinceLastSync: Date.now() - this.lastSyncTime
      })
      
      // Trigger sync with empty state (will use cached pending state)
      await this.performSync({})
    }
  }
  
  /**
   * Save scraper run to database
   * Uses the new scraper_runs table if available
   */
  async saveScraperRun(run: ScraperRun): Promise<void> {
    try {
      permanentLogger.breadcrumb('SAVE_RUN', 'Saving scraper run', {
        runId: run.id,
        scraperId: run.scraperId,
        status: run.status
      })
      
      // Try to insert into scraper_runs table (if migration applied)
      const { error } = await this.supabase
        .from('scraper_runs')
        .insert({
          session_id: this.sessionId,
          scraper_id: run.scraperId,
          scraper_name: run.scraperName,
          started_at: new Date(run.timestamp).toISOString(),
          completed_at: run.status === 'complete' ? new Date().toISOString() : null,
          pages_scraped: run.pagesScraped,
          data_points: run.dataPoints,
          discovered_links: run.discoveredLinks,
          status: run.status,
          extracted_data: run.extractedData || {},
          event_id: run.eventId
        })
      
      if (error) {
        // Fallback to updating session merged_data if table doesn't exist
        permanentLogger.breadcrumb('FALLBACK_SAVE', 'Using fallback save to merged_data', {
          error: error.message
        })
        
        // Update session totals instead
        await this.syncToDatabase({
          totals: {
            pagesScraped: run.pagesScraped,
            dataPoints: run.dataPoints,
            discoveredLinks: run.discoveredLinks,
            scraperRuns: 1
          }
        })
      } else {
        permanentLogger.info('Scraper run saved', { category: 'STATE_SYNCHRONIZER', runId: run.id,
          sessionId: this.sessionId })
      }
    } catch (error) {
      permanentLogger.captureError('STATE_SYNCHRONIZER', error, {
        context: 'Failed to save scraper run',
        runId: run.id,
        sessionId: this.sessionId
      })
    }
  }
  
  /**
   * Get sync statistics
   */
  getStats(): {
    lastSyncTime: number
    pendingSync: boolean
    sessionId: string
  } {
    return {
      lastSyncTime: this.lastSyncTime,
      pendingSync: this.pendingSync,
      sessionId: this.sessionId
    }
  }
  
  /**
   * Destroy synchronizer and clean up resources
   */
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    
    // Perform final sync if needed
    if (this.pendingSync) {
      this.performSync({}).catch(error => {
        permanentLogger.captureError('STATE_SYNCHRONIZER', error, {
          context: 'Failed final sync on destroy'
        })
      })
    }
    
    permanentLogger.info('STATE_SYNCHRONIZER', 'Synchronizer destroyed', { sessionId: this.sessionId})
  }
}