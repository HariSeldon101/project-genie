/**
 * ScrapingStateService - Manages scraping session state and database synchronization
 * 
 * SOLID Principles Applied:
 * - Single Responsibility: Only manages state and database sync
 * - Open/Closed: Can be extended without modification
 * - Dependency Inversion: Depends on abstractions (interfaces)
 * 
 * DRY Principle: Centralizes all state management logic
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { CompanyIntelligenceRepository } from '@/lib/repositories/company-intelligence-repository'

export interface ScraperRun {
  id: string
  eventId?: string
  scraperId: string
  scraperName: string
  timestamp: number
  pagesScraped: number
  dataPoints: number
  discoveredLinks: number
  discoveredUrls?: string[]
  duration: number
  status: 'running' | 'complete' | 'failed'
  extractedData?: any
}

export interface ScrapingTotals {
  pagesScraped: number
  dataPoints: number
  discoveredLinks: number
  scraperRuns: number
}

export interface ScrapingSessionState {
  sessionId: string
  domain: string
  history: ScraperRun[]
  totals: ScrapingTotals
  suggestions: any[]
  usedScrapers: string[]
}

export class ScrapingStateService {
  private sessionId: string
  private repository = CompanyIntelligenceRepository.getInstance()

  constructor(sessionId: string) {
    this.sessionId = sessionId
    
    permanentLogger.info('SCRAPING_STATE_SERVICE', 'Service initialized', { sessionId})
  }
  
  /**
   * Fetch complete session state from database
   * Hydrates scraper history and calculates totals
   */
  async fetchSessionState(): Promise<ScrapingSessionState | null> {
    permanentLogger.breadcrumb('FETCH_SESSION_STATE', 'Fetching session from database', { 
      sessionId: this.sessionId 
    })
    
    try {
      // Fetch from API endpoint (which reads from database)
      const response = await fetch(`/api/company-intelligence/scraping/execute?sessionId=${this.sessionId}`)
      
      if (!response.ok) {
        permanentLogger.captureError('SCRAPING_STATE_SERVICE', new Error('Failed to fetch session'), {
          status: response.status,
          sessionId: this.sessionId
        })
        return null
      }
      
      const data = await response.json()
      
      // Hydrate scraper history from database
      const history: ScraperRun[] = []
      if (data.usedScrapers && data.usedScrapers.length > 0) {
        data.usedScrapers.forEach((scraperId: string, index: number) => {
          const pagesPerScraper = Math.floor((data.pagesScraped || 0) / data.usedScrapers.length)
          const dataPointsPerScraper = Math.floor((data.totalDataPoints || 0) / data.usedScrapers.length)
          
          history.push({
            id: `historical-${this.sessionId}-${scraperId}-${index}`,
            eventId: `historical-event-${scraperId}-${index}`,
            scraperId,
            scraperName: this.getScraperName(scraperId),
            timestamp: Date.now() - ((data.usedScrapers.length - index) * 60000),
            pagesScraped: pagesPerScraper,
            dataPoints: dataPointsPerScraper,
            discoveredLinks: 0,
            discoveredUrls: [],
            duration: 0,
            status: 'complete',
            extractedData: {}
          })
        })
      }
      
      permanentLogger.info('Session state fetched', { category: 'SCRAPING_STATE_SERVICE', sessionId: this.sessionId,
        historyCount: history.length,
        totals: {
          pagesScraped: data.pagesScraped || 0,
          dataPoints: data.totalDataPoints || 0,
          scraperRuns: data.usedScrapers?.length || 0
        } })
      
      return {
        sessionId: this.sessionId,
        domain: data.domain || '',
        history,
        totals: {
          pagesScraped: data.pagesScraped || 0,
          dataPoints: data.totalDataPoints || 0,
          discoveredLinks: 0,
          scraperRuns: data.usedScrapers?.length || 0
        },
        suggestions: data.suggestions || [],
        usedScrapers: data.usedScrapers || []
      }
    } catch (error) {
      permanentLogger.captureError('SCRAPING_STATE_SERVICE', error, {
        context: 'Failed to fetch session state',
        sessionId: this.sessionId
      })
      return null
    }
  }
  
  /**
   * Save a scraper run to the database
   * Updates session merged_data with new run information
   */
  async saveScraperRun(run: ScraperRun): Promise<void> {
    permanentLogger.breadcrumb('SAVE_SCRAPER_RUN', 'Saving run to database', {
      runId: run.id,
      scraperId: run.scraperId,
      status: run.status
    })
    
    try {
      // Get current session data
      const session = await this.repository.getSession(this.sessionId)

      if (!session) {
        throw new Error('Session not found')
      }
      
      // Update merged_data with new run
      const mergedData = session.merged_data || { stats: {}, pages: {}, extractedData: {} }
      
      // Update stats
      mergedData.stats = {
        ...mergedData.stats,
        totalPages: (mergedData.stats.totalPages || 0) + run.pagesScraped,
        dataPoints: (mergedData.stats.dataPoints || 0) + run.dataPoints,
        totalLinks: (mergedData.stats.totalLinks || 0) + run.discoveredLinks,
        phaseCounts: {
          ...mergedData.stats.phaseCounts,
          [run.scraperId]: (mergedData.stats.phaseCounts?.[run.scraperId] || 0) + 1
        }
      }
      
      // Save back to database
      const updated = await this.repository.updateSession(
        this.sessionId,
        {
          merged_data: mergedData,
          updated_at: new Date().toISOString()
        },
        session.version
      )

      if (!updated) {
        throw new Error('Failed to update session')
      }
      
      permanentLogger.info('Scraper run saved', { category: 'SCRAPING_STATE_SERVICE', runId: run.id,
        sessionId: this.sessionId,
        newTotals: mergedData.stats })
    } catch (error) {
      permanentLogger.captureError('SCRAPING_STATE_SERVICE', error, {
        context: 'Failed to save scraper run',
        sessionId: this.sessionId,
        runId: run.id
      })
      throw error
    }
  }
  
  /**
   * Calculate aggregated totals from scraper history
   */
  calculateTotals(history: ScraperRun[]): ScrapingTotals {
    const totals = history.reduce((acc, run) => ({
      pagesScraped: acc.pagesScraped + run.pagesScraped,
      dataPoints: acc.dataPoints + run.dataPoints,
      discoveredLinks: acc.discoveredLinks + run.discoveredLinks,
      scraperRuns: acc.scraperRuns + 1
    }), {
      pagesScraped: 0,
      dataPoints: 0,
      discoveredLinks: 0,
      scraperRuns: 0
    })
    
    permanentLogger.breadcrumb('CALCULATE_TOTALS', 'Totals calculated', totals)
    
    return totals
  }
  
  /**
   * Get scraper name by ID (temporary until ScraperRegistryService)
   */
  private getScraperName(scraperId: string): string {
    const scraperNames: Record<string, string> = {
      'static': 'Static HTML (Cheerio)',
      'dynamic': 'JavaScript Renderer (Playwright)',
      'spa': 'SPA Scraper',
      'api': 'API Extractor'
    }
    return scraperNames[scraperId] || 'Unknown'
  }
}