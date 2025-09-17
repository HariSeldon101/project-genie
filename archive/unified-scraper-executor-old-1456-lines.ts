/**
 * UnifiedScraperExecutor - The Boss of All Website Readers!
 * 
 * Think of this like the manager at a library who tells different workers
 * what books (websites) to read and collects all their notes.
 * 
 * What this manager does:
 * - SessionManager: Remembers what we've already read (like a bookmark!)
 * - ExecutionLockManager: Makes sure two people don't read the same page at once
 * - DataAggregator: Combines all the notes from different readers
 * - ScraperRegistry: Knows which readers are best for different types of books
 * 
 * Cool features:
 * - Safe to try again if something goes wrong (like saving your game!)
 * - Automatically picks up where you left off
 * - Shows you progress as it works (like a loading bar)
 * - Tells you if anything goes wrong
 * - Tracks how fast it's working
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { CompanyIntelligenceRepository, SessionData } from '@/lib/repositories/company-intelligence-repository'
import { SessionManager } from './session-manager'
import { ExecutionLockManager } from './execution-lock-manager'
import { DataAggregator } from './data-aggregator'
import { ScraperRegistry } from '../scrapers/core/scraper-registry'
import { ScraperOrchestrator } from '../scrapers/core/scraper-orchestrator'
import { ProgressReporter } from '../scrapers/utils/progress-reporter'
import { PerformanceTracker } from '../scrapers/utils/performance-tracker'
import { URLMetadata } from '../scrapers/additive/types'
import { EventFactory, EventSource } from '@/lib/realtime-events'
import { safeTimestampToISO } from '@/lib/utils/safe-timestamp'

/**
 * Options passed to scrapers for configuration
 */
export interface ScraperOptions {
  urlMetadata?: Map<string, URLMetadata>
  sessionId?: string
  companyId?: string
  progressCallback?: ProgressCallback
  scraperId?: string
  [key: string]: any // Allow additional options
}

/**
 * Statistics about scraping operations
 */
export interface ScraperStats {
  totalPages: number
  dataPoints: number
  totalLinks: number
  phaseCounts?: Record<string, number>
  pagesSucceeded?: number
}

/**
 * Validation results from scraping
 */
export interface ValidationResult {
  isValid: boolean
  errors?: string[]
  warnings?: string[]
}

/**
 * A single scraped page result
 */
export interface ScrapedPage {
  url: string
  title?: string
  content?: string
  bytesDownloaded?: number
  timestamp?: string
  metadata?: Record<string, any>
}

/**
 * Result from a scraping operation
 */
export interface ScraperResult {
  pages: ScrapedPage[]
  links?: string[]
  dataPoints: number
  stats: ScraperStats
  validation: ValidationResult
  errors?: Error[]
}

/**
 * Aggregated data from multiple scraping operations
 */
export interface AggregatedData {
  pages: Record<string, ScrapedPage>
  stats: ScraperStats
  metadata?: Record<string, any>
}

/**
 * Extracted and formatted data for UI display
 */
export interface ExtractedData {
  summary?: Record<string, any>
  technologies?: string[]
  contacts?: Record<string, any>
  [key: string]: any
}

/**
 * Request to execute a scraping operation
 */
export interface ExecutionRequest {
  sessionId: string
  domain: string
  scraperId: string
  urls: string[]
  options?: ScraperOptions
  stream?: boolean
  progressCallback?: ProgressCallback
}

/**
 * Result of a scraping execution
 */
export interface ExecutionResult {
  success: boolean
  sessionId: string
  scraperId: string
  newData: {
    pages: number
    dataPoints: number
    discoveredLinks: number
    duration: number
  }
  totalData: {
    pagesScraped: number
    dataPoints: number
    discoveredLinks: number
  }
  suggestions: string[]
  stats: ScraperStats
  validation: ValidationResult
  extractedData: ExtractedData
}

/**
 * Callback for progress updates during streaming
 */
export interface ProgressCallback {
  (data: RealtimeEvent): Promise<void>
}

/**
 * Realtime event structure for streaming
 */
export interface RealtimeEvent {
  type: string
  phase?: string
  priority?: string
  correlationId?: string
  sequence?: number
  timestamp?: number
  payload?: any
}

/**
 * Session status information
 */
export interface SessionStatus {
  sessionId: string
  scraperRuns: number
  pagesScraped: number
  totalDataPoints: number
  availableScrapers: Array<{ id: string; name: string; speed: string }>
  usedScrapers: string[]
  suggestions: string[]
}

export class UnifiedScraperExecutor {
  private sessionManager: SessionManager
  private lockManager: ExecutionLockManager
  private aggregator: DataAggregator
  private registry: ScraperRegistry
  private orchestrator: ScraperOrchestrator
  private performanceTracker: PerformanceTracker
  private repository: CompanyIntelligenceRepository

  constructor() {
    this.sessionManager = new SessionManager()
    this.lockManager = new ExecutionLockManager()
    this.aggregator = new DataAggregator()
    this.performanceTracker = new PerformanceTracker()
    this.repository = CompanyIntelligenceRepository.getInstance()

    // Initialize plugin system (auto-discovery, no hardcoding!)
    this.registry = ScraperRegistry.getInstance()
    this.orchestrator = new ScraperOrchestrator()

    // Initialize registry on construction
    this.initializeRegistry()
  }

  /**
   * Initialize the plugin registry with auto-discovery
   * New scrapers are automatically detected - no manual registration!
   */
  private async initializeRegistry(): Promise<void> {
    try {
      await this.registry.initialize()
      await this.orchestrator.initialize()

      permanentLogger.info('UNIFIED_EXECUTOR', 'Registry initialized', {
        pluginCount: this.registry.getAllScrapers().length,
        plugins: this.registry.getAllScrapers().map(p => p.config.id)
      })
    } catch (error) {
      permanentLogger.captureError('UNIFIED_EXECUTOR', error as Error, {
        phase: 'registry_initialization'
      })
    }
  }

  /**
   * Execute a scraping operation for the specified session and URLs
   *
   * @param request - The execution request containing session ID, domain, scraper ID, and URLs
   * @returns Promise<ExecutionResult> - Results including scraped pages, data points, and suggestions
   * @throws Error if session cannot be created or if domain is missing
   *
   * Technical PM Note: This is the main entry point for all scraping operations.
   * It handles session management, locking, scraper execution, and data aggregation.
   */
  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const startTime = Date.now()
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Start a stopwatch to see how long everything takes
    const executionTimer = permanentLogger.timing('scraper_execution')
    
    // Keep notes about where this request came from (like detective work!)
    permanentLogger.breadcrumb('EXECUTION_START', 'Starting scraper execution', {
      timestamp: Date.now(),
      source: 'api_endpoint',
      destination: 'unified_executor',
      executionId,
      sessionId: request.sessionId,
      scraperId: request.scraperId,
      urlCount: request.urls?.length || 0,
      domain: request.domain,
      hasProgressCallback: !!request.progressCallback,
      isStreaming: !!request.stream
    })
    
    // Write down all the details about what we're being asked to do
    permanentLogger.info('REQUEST_RECEIVED', 'Scraper execution request received', {
      executionId,
      sessionId: request.sessionId,
      scraperId: request.scraperId,
      domain: request.domain,
      explicitUrls: request.urls?.slice(0, 3),
      requestType: request.stream ? 'streaming' : 'standard',
      memoryUsage: process.memoryUsage()
    })
    
    // First, check if we already have a saved game (session) for this company
    permanentLogger.breadcrumb('SESSION', 'Retrieving session', { sessionId: request.sessionId })
    let session = await this.repository.getSession(request.sessionId)
    permanentLogger.timing('session_retrieved', { hasSession: !!session })
    
    // If this is our first time looking at this company, we need to start a new session
    if (!session) {
      permanentLogger.breadcrumb('SESSION', 'No existing session found, creating new', { 
        sessionId: request.sessionId,
        domain: request.domain 
      })
      
      if (!request.domain) {
        permanentLogger.captureError('UNIFIED_EXECUTOR', new Error('Cannot create session without domain'), {
          sessionId: request.sessionId,
          scraperId: request.scraperId,
          hasUrls: !!request.urls,
          urlCount: request.urls?.length,
          executionId,
          timing: 'scraper_execution'
        })
        throw new Error('Domain is required to create a new session')
      }
      
      // Figure out the company name from their website (like "apple.com" becomes "Apple")
      const companyName = request.domain
        .split('.')[0]
        .replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
      
      session = await this.repository.createSession(companyName, request.domain)
      permanentLogger.timing('session_created', { companyName, domain: request.domain })
      
      if (!session) {
        permanentLogger.breadcrumb('SESSION', 'Failed to create session', { companyName, domain: request.domain })
        throw new Error('Failed to create session')
      }
      
      permanentLogger.breadcrumb('SESSION', 'Session created successfully', { 
        sessionId: session.id,
        companyName,
        domain: request.domain 
      })
    }
    
    // Use the saved website address if we weren't given one
    const domain = request.domain || session.domain
    
    if (!domain) {
      permanentLogger.captureError('UNIFIED_EXECUTOR', new Error('No domain available for execution'), {
        sessionId: request.sessionId,
        scraperId: request.scraperId,
        sessionDomain: session.domain,
        requestDomain: request.domain,
        executionId,
        timing: 'scraper_execution'
      })
      throw new Error('Domain is required for scraper execution')
    }
    
    // Get URLs and metadata from database using bulletproof method
    const { urls: urlsToScrape, metadata: urlMetadata } = await this.getUrlsAndMetadataFromDatabase(session, request.urls)
    permanentLogger.timing('urls_resolved', { urlCount: urlsToScrape.length, hasMetadata: urlMetadata.size > 0 })
    
    permanentLogger.info('UNIFIED_EXECUTOR', 'Starting unified execution', {
      executionId,
      sessionId: request.sessionId,
      domain: domain,
      scraperId: request.scraperId,
      urlCount: urlsToScrape.length,
      urlsSample: urlsToScrape.slice(0, 3)
    })

    // 1. Check for cached result first
    permanentLogger.breadcrumb('CACHE', 'Checking for cached result', { executionId })
    const cached = await this.aggregator.getCachedResult(request.sessionId, executionId)
    permanentLogger.timing('cache_checked', { isCached: !!cached })
    
    if (cached) {
      // CRITICAL DEBUG: Log what's in the cache
      permanentLogger.info(' UNIFIED_EXECUTOR: CACHED RESULT FOUND:', {
        executionId,
        cachedPages: cached.pages?.length || 0,
        cachedNewDataPages: cached.newData?.pages || 0,
        cachedNewDataDataPoints: cached.newData?.dataPoints || 0,
        hasData: !!cached.newData,
        cacheKeys: Object.keys(cached)
      })
      
      permanentLogger.breadcrumb('CACHE', 'Returning cached result', { executionId })
      permanentLogger.info('UNIFIED_EXECUTOR', 'Returning cached result', { executionId })
      return cached
    }

    // 3. Acquire execution lock
    permanentLogger.breadcrumb('LOCK', 'Attempting to acquire execution lock', {
      sessionId: request.sessionId,
      scraperId: request.scraperId
    })
    
    // CRITICAL DEBUG: Log before lock acquisition
    permanentLogger.info(' UNIFIED_EXECUTOR: Pre-lock state:', {
      sessionId: request.sessionId,
      scraperId: request.scraperId,
      urlsCount: urlsToScrape.length,
      urlsSample: urlsToScrape.slice(0, 3)
    })
    
    // For streaming requests, force a new lock to ensure execution
    const forceNew = !!(request.stream && request.progressCallback)
    // Generate a unique lock ID for this execution
    const lockId = `lock_${request.sessionId}_${request.scraperId}_${Date.now()}`
    const lockAcquired = await this.repository.acquireLock(
      request.sessionId,
      lockId
    )
    const lock = lockAcquired ? { id: lockId, lock_key: lockId } : null
    permanentLogger.timing('lock_acquisition_attempted', { lockAcquired: !!lock })

    // CRITICAL DEBUG: Log lock result
    permanentLogger.info(' UNIFIED_EXECUTOR: Lock acquisition result:', {
      lockAcquired: !!lock,
      lockId: lock?.id,
      lockKey: lock?.lock_key,
      sessionId: request.sessionId,
      scraperId: request.scraperId
    })

    if (!lock) {
      permanentLogger.info(' UNIFIED_EXECUTOR: LOCK NOT ACQUIRED - Returning existing session data')
      permanentLogger.breadcrumb('LOCK', 'Lock not acquired - execution already in progress', {
        sessionId: request.sessionId,
        scraperId: request.scraperId
      })
      
      permanentLogger.info('UNIFIED_EXECUTOR', 'Could not acquire lock - execution already in progress', {
        sessionId: request.sessionId,
        scraperId: request.scraperId
      })
      
      // Return current session data instead of throwing error
      const currentData = await this.getCurrentSessionData(request.sessionId)
      permanentLogger.info(' UNIFIED_EXECUTOR: Returning current session data:', {
        hasData: !!currentData,
        pages: currentData?.totalData?.pagesScraped || 0,
        dataPoints: currentData?.totalData?.dataPoints || 0
      })
      return currentData
    }
    
    permanentLogger.breadcrumb('LOCK', 'Execution lock acquired', { lockId: lock.id })

    try {
      // 4. Initialize progress reporter if streaming
      let progressReporter: ProgressReporter | undefined
      if (request.stream && request.progressCallback) {
        progressReporter = new ProgressReporter({
          sessionId: request.sessionId,
          correlationId: executionId,
          signal: undefined // Will be set by orchestrator
        })

        // Set up callback to forward events
        const forwardProgress = async (event: RealtimeEvent) => {
          if (request.progressCallback) {
            await request.progressCallback(event)
          }
        }
      }

      permanentLogger.breadcrumb('ORCHESTRATOR', 'Preparing to execute via orchestrator', {
        scraperId: request.scraperId,
        hasProgressReporter: !!progressReporter
      })

      // 5. Execute via orchestrator (delegating to plugin system)
      permanentLogger.breadcrumb('ORCHESTRATOR', 'Starting orchestrator execution', {
        scraperId: request.scraperId,
        urlCount: urlsToScrape.length
      })

      permanentLogger.info('UNIFIED_EXECUTOR', 'Executing via orchestrator', {
        executionId,
        scraperId: request.scraperId,
        urls: urlsToScrape,
        urlCount: urlsToScrape.length
      })

      const scraperStartTime = Date.now()

      // Prepare options with metadata
      const orchestratorOptions: ScraperOptions = {
        ...request.options,
        urlMetadata: urlMetadata.size > 0 ? urlMetadata : undefined,
        sessionId: request.sessionId,
        companyId: session.company_id || session.id,
        progressCallback: request.progressCallback
      }

      // Execute through orchestrator which handles plugin selection
      const orchestratorTimer = this.performanceTracker.startTimer('orchestrator_execution')

      let scraperResult: ScraperResult

      // If a specific scraper is requested, use executeForSession
      // Otherwise let orchestrator choose the best plugin
      if (request.scraperId === 'auto' || !request.scraperId) {
        // Let orchestrator choose best plugin
        scraperResult = await this.orchestrator.execute(urlsToScrape, orchestratorOptions)
      } else {
        // Use specific scraper via mapping
        const pluginId = this.mapScraperIdToPlugin(request.scraperId)
        orchestratorOptions.scraperId = pluginId
        scraperResult = await this.orchestrator.execute(urlsToScrape, orchestratorOptions)
      }

      orchestratorTimer.stop()
      
      // CRITICAL DEBUG: Log immediately after scraper returns
      permanentLogger.info(' UNIFIED_EXECUTOR: Scraper returned:', {
        hasResult: !!scraperResult,
        pagesCount: scraperResult?.pages?.length || 0,
        dataPoints: scraperResult?.dataPoints || 0,
        resultKeys: scraperResult ? Object.keys(scraperResult) : [],
        firstPage: scraperResult?.pages?.[0] ? {
          url: scraperResult.pages[0].url,
          hasTitle: !!scraperResult.pages[0].title,
          hasContent: !!scraperResult.pages[0].content,
          contentLength: scraperResult.pages[0].content?.length || 0
        } : null
      })
      
      // CRITICAL CHECK: Are we about to continue to aggregation?
      permanentLogger.info(' UNIFIED_EXECUTOR: CHECKPOINT - About to start aggregation section')
      permanentLogger.info(' UNIFIED_EXECUTOR: Current execution context:', {
        hasProgressCallback: !!request.progressCallback,
        isStreaming: !!request.stream,
        sessionId: request.sessionId,
        willContinue: true
      })
      
      // Declare aggregatedData outside try block so it's accessible for database update
      let aggregatedData: AggregatedData | null = null;
      
      // Add try-catch to catch any exceptions preventing aggregation
      try {
        permanentLogger.info(' UNIFIED_EXECUTOR: Entering aggregation try block')
        permanentLogger.info(' UNIFIED_EXECUTOR: About to calculate duration')
        
        const scraperDuration = Date.now() - scraperStartTime
        permanentLogger.info(' UNIFIED_EXECUTOR: Duration calculated:', scraperDuration)
        permanentLogger.info(' UNIFIED_EXECUTOR: About to call permanentLogger.breadcrumb')
        permanentLogger.info(' UNIFIED_EXECUTOR: Logger exists?', !!this.logger)
        permanentLogger.info(' UNIFIED_EXECUTOR: scraperResult exists?', !!scraperResult)
        permanentLogger.info(' UNIFIED_EXECUTOR: scraperResult.pages exists?', !!scraperResult?.pages)
        permanentLogger.info(' UNIFIED_EXECUTOR: scraperResult.pages is array?', Array.isArray(scraperResult?.pages))
        
        // FORENSIC: Enhanced execution logging
        permanentLogger.breadcrumb('SCRAPER_COMPLETE', 'Scraper execution completed', {
          timestamp: Date.now(),
          scraperId: request.scraperId,
          duration: scraperDuration,
          pagesScraped: scraperResult.pages?.length || 0,
          bytesDownloaded: scraperResult.pages?.reduce((sum, p) => sum + (p.bytesDownloaded || 0), 0) || 0,
          errorsCount: scraperResult.errors?.length || 0
        })
        
        permanentLogger.info(' UNIFIED_EXECUTOR: Breadcrumb call completed!')
        
        permanentLogger.info(' UNIFIED_EXECUTOR: About to call permanentLogger.timing')
      
      permanentLogger.timing('scraper_executed', { 
        duration: scraperDuration,
        pagesScraped: scraperResult.pages?.length || 0 
      })
      
      permanentLogger.info(' UNIFIED_EXECUTOR: permanentLogger.timing completed!')
      
      permanentLogger.breadcrumb('SCRAPER', 'Scraper execution complete', {
        duration: scraperDuration,
        pagesScraped: scraperResult.pages?.length || 0,
        dataPoints: scraperResult.dataPoints || 0
      })
      
      permanentLogger.info(' UNIFIED_EXECUTOR: Second breadcrumb completed!')

      // 6. Aggregate the data
      permanentLogger.info(' UNIFIED_EXECUTOR: Starting section 6 - Aggregate the data')
      // FORENSIC: Add timing checkpoint before aggregation
      permanentLogger.info(' UNIFIED_EXECUTOR: About to call permanentLogger.timing for aggregation_start')
      permanentLogger.timing('aggregation_start')
      permanentLogger.info(' UNIFIED_EXECUTOR: permanentLogger.timing aggregation_start completed')
      
      permanentLogger.info(' UNIFIED_EXECUTOR: About to call permanentLogger.breadcrumb for AGGREGATION')
      permanentLogger.info(' UNIFIED_EXECUTOR: session exists?', !!session)
      permanentLogger.info(' UNIFIED_EXECUTOR: session.merged_data exists?', !!session?.merged_data)
      permanentLogger.info(' UNIFIED_EXECUTOR: session.merged_data.pages type:', typeof session?.merged_data?.pages)
      
      // Fix: pages might be an object, not an array
      const existingPagesCount = session?.merged_data?.pages ? 
        (Array.isArray(session.merged_data.pages) ? 
          session.merged_data.pages.length : 
          Object.keys(session.merged_data.pages).length) : 0
      
      permanentLogger.breadcrumb('AGGREGATION', 'Starting data aggregation', {
        timestamp: Date.now(),
        source: 'scraper_output',
        destination: 'session_storage',
        hasExistingData: !!session.merged_data,
        existingPages: existingPagesCount,
        newDataPages: scraperResult.pages?.length || 0,
        sessionId: request.sessionId
      })
      
      permanentLogger.info(' UNIFIED_EXECUTOR: AGGREGATION breadcrumb completed!')
      
      // CRITICAL DEBUG LOGGING - Track data before aggregation
      permanentLogger.info(' UNIFIED_EXECUTOR: About to call permanentLogger.log for PRE_AGGREGATION_DATA')
      permanentLogger.info('PRE_AGGREGATION_DATA', 'Data structure before aggregation', {
        sessionId: request.sessionId,
        scraperId: request.scraperId,
        existingMergedData: {
          hasData: !!session.merged_data,
          keys: session.merged_data ? Object.keys(session.merged_data) : [],
          hasPagesKey: !!(session.merged_data as any)?.pages,
          pagesType: typeof (session.merged_data as any)?.pages,
          pagesCount: (() => {
            const pages = (session.merged_data as any)?.pages;
            if (!pages) return 0;
            if (Array.isArray(pages)) return pages.length;
            if (typeof pages === 'object') return Object.keys(pages).length;
            return 0;
          })()
        },
        scraperResult: {
          hasPagesArray: Array.isArray(scraperResult.pages),
          pagesCount: scraperResult.pages?.length || 0,
          firstPageUrl: scraperResult.pages?.[0]?.url,
          hasStats: !!scraperResult.stats,
          statsPages: scraperResult.stats?.pagesSucceeded
        }
      })
      
      permanentLogger.info(' UNIFIED_EXECUTOR: PRE_AGGREGATION_DATA log completed!')
      
      const aggregationStartTime = Date.now()
      permanentLogger.info(' UNIFIED_EXECUTOR: About to call aggregator.aggregateData')
      aggregatedData = this.aggregator.aggregateData(
        session.merged_data as AggregatedData,
        scraperResult,
        request.scraperId
      )
      permanentLogger.info(' UNIFIED_EXECUTOR: aggregator.aggregateData COMPLETED!')
      permanentLogger.info(' UNIFIED_EXECUTOR: aggregatedData keys:', aggregatedData ? Object.keys(aggregatedData) : 'null')
      permanentLogger.info(' UNIFIED_EXECUTOR: IMMEDIATELY AFTER AGGREGATION:')
      permanentLogger.info(' UNIFIED_EXECUTOR: aggregatedData.pages count:', aggregatedData?.pages ? Object.keys(aggregatedData.pages).length : 0)
      permanentLogger.info(' UNIFIED_EXECUTOR: aggregatedData.stats.totalPages:', aggregatedData?.stats?.totalPages)
      const aggregationDuration = Date.now() - aggregationStartTime
      
      // CRITICAL DEBUG LOGGING - Track data after aggregation
      permanentLogger.info('POST_AGGREGATION_DATA', 'Data structure after aggregation', {
        sessionId: request.sessionId,
        scraperId: request.scraperId,
        aggregatedData: {
          keys: Object.keys(aggregatedData || {}),
          hasPagesKey: !!aggregatedData?.pages,
          pagesType: typeof aggregatedData?.pages,
          pagesCount: aggregatedData?.pages ? 
            (Array.isArray(aggregatedData.pages) ? 
              aggregatedData.pages.length : 
              Object.keys(aggregatedData.pages || {}).length
            ) : 0,
          statsPages: aggregatedData?.stats?.totalPages,
          statsDataPoints: aggregatedData?.stats?.dataPoints
        }
      })
      
      // FORENSIC: Add timing checkpoint after aggregation
      permanentLogger.timing('aggregation_complete')
      
      permanentLogger.timing('data_aggregated', { 
        duration: aggregationDuration,
        totalDataPoints: aggregatedData.stats?.dataPoints || 0 
      })
      
      // FORENSIC: Enhanced aggregation logging
      permanentLogger.breadcrumb('AGGREGATION_COMPLETE', 'Data aggregation complete', {
        timestamp: Date.now(),
        duration: aggregationDuration,
        totalPages: aggregatedData.stats?.totalPages || 0,
        totalDataPoints: aggregatedData.stats?.dataPoints || 0,
        newDataAdded: scraperResult.pages?.length || 0,
        memoryUsage: process.memoryUsage()
      })

      } catch (aggregationError) {
        permanentLogger.info(' UNIFIED_EXECUTOR: EXCEPTION IN AGGREGATION SECTION!', {
          error: aggregationError,
          message: aggregationError instanceof Error ? aggregationError.message : 'Unknown error',
          stack: aggregationError instanceof Error ? aggregationError.stack : undefined
        })
        throw aggregationError // Re-throw to be caught by outer catch
      }
      
      // 7. Update session with new data (with optimistic locking)
      permanentLogger.info(' UNIFIED_EXECUTOR: SECTION 7 - Starting database update')
      permanentLogger.info(' UNIFIED_EXECUTOR: aggregatedData available?', !!aggregatedData)
      permanentLogger.info(' UNIFIED_EXECUTOR: aggregatedData has pages?', !!aggregatedData?.pages)
      
      // FORENSIC: Add timing checkpoint before session update
      permanentLogger.timing('session_update_start')
      
      permanentLogger.breadcrumb('SESSION_UPDATE', 'Starting session update with optimistic locking', {
        timestamp: Date.now(),
        sessionId: request.sessionId,
        dataToStore: aggregatedData.stats?.dataPoints || 0
      })
      
      const maxRetries = 3
      let retries = 0
      let updated = false

      while (retries < maxRetries && !updated) {
        permanentLogger.breadcrumb('SESSION_UPDATE_ATTEMPT', `Attempt ${retries + 1} of ${maxRetries}`, {
          timestamp: Date.now(),
          sessionId: request.sessionId,
          attemptNumber: retries + 1
        })
        
        const currentSession = await this.repository.getSession(request.sessionId)
        if (!currentSession) {
          permanentLogger.breadcrumb('SESSION_UPDATE', 'Session no longer exists', {
            sessionId: request.sessionId
          })
          break
        }

        // CRITICAL DEBUG LOGGING - Track what we're sending to database
        permanentLogger.info('PRE_DB_UPDATE', 'Data being sent to database', {
          sessionId: request.sessionId,
          updateSize: JSON.stringify({ merged_data: aggregatedData }).length,
          hasMergedData: !!aggregatedData,
          mergedDataKeys: Object.keys(aggregatedData || {}),
          hasPagesInUpdate: !!aggregatedData?.pages,
          pagesCount: aggregatedData?.pages ? 
            (Array.isArray(aggregatedData.pages) ? 
              aggregatedData.pages.length : 
              Object.keys(aggregatedData.pages || {}).length
            ) : 0,
          pagesType: typeof aggregatedData?.pages
        })
        
        permanentLogger.info(' UNIFIED_EXECUTOR: About to call sessionManager.updateSession')
        permanentLogger.info(' UNIFIED_EXECUTOR: Update payload:', {
          sessionId: request.sessionId,
          hasAggregatedData: !!aggregatedData,
          aggregatedDataKeys: aggregatedData ? Object.keys(aggregatedData) : [],
          version: currentSession.version
        })
        permanentLogger.info(' UNIFIED_EXECUTOR: RIGHT BEFORE UPDATE - aggregatedData pages count:', aggregatedData?.pages ? Object.keys(aggregatedData.pages).length : 0)
        
        // Use repository to update session with optimistic locking
        await this.repository.updateSession(
          request.sessionId,
          { merged_data: aggregatedData } as Partial<SessionData>
        )
        const updatedSession = await this.repository.getSession(request.sessionId)
        
        permanentLogger.info(' UNIFIED_EXECUTOR: sessionManager.updateSession returned:', !!updatedSession)
        
        // CRITICAL DEBUG LOGGING - Track database update result
        permanentLogger.info('POST_DB_UPDATE', 'Database update result', {
          sessionId: request.sessionId,
          updateSuccess: !!updatedSession,
          newVersion: updatedSession?.version
        })

        if (updatedSession) {
          updated = true
          session = updatedSession
          permanentLogger.breadcrumb('SESSION_UPDATE', 'Session updated successfully', {
            sessionId: request.sessionId,
            version: updatedSession.version,
            attempts: retries + 1
          })
        } else {
          retries++
          permanentLogger.breadcrumb('SESSION_UPDATE', 'Optimistic lock conflict, retrying', {
            sessionId: request.sessionId,
            retry: retries
          })
          await new Promise(resolve => setTimeout(resolve, 100 * retries))
        }
      }
      
      permanentLogger.timing('session_updated', { 
        updated,
        attempts: retries + 1 
      })

      if (!updated) {
        permanentLogger.breadcrumb('SESSION_UPDATE', 'Failed to update session after all retries', {
          sessionId: request.sessionId,
          maxRetries
        })
        
        permanentLogger.captureError('UNIFIED_EXECUTOR', new Error('Failed to update session after retries'), {
          sessionId: request.sessionId,
          retries,
          executionId,
          timing: 'scraper_execution'
        })
      }

      // 8. Track metrics
      permanentLogger.breadcrumb('METRICS', 'Tracking execution metrics', { executionId })
      await this.trackMetrics(executionId, request, startTime, scraperResult)
      permanentLogger.timing('metrics_tracked', { executionId })

      // 9. Format result for UI
      permanentLogger.breadcrumb('FORMATTING', 'Formatting data for UI', {
        dataPoints: aggregatedData.stats?.dataPoints || 0
      })
      
      const uiData = this.aggregator.formatForUI(aggregatedData)
      permanentLogger.timing('ui_formatted', { 
        extractedDataKeys: Object.keys(uiData.extractedData || {}).length 
      })
      
      const result: ExecutionResult = {
        success: true,
        sessionId: request.sessionId,
        scraperId: request.scraperId,
        newData: {
          pages: scraperResult.pages?.length || 0,
          dataPoints: aggregatedData.stats.dataPoints,
          discoveredLinks: scraperResult.links?.length || 0,
          duration: Date.now() - startTime
        },
        totalData: {
          pagesScraped: aggregatedData.stats.totalPages,
          dataPoints: aggregatedData.stats.dataPoints,
          discoveredLinks: aggregatedData.stats.totalLinks
        },
        suggestions: this.generateSuggestions(aggregatedData),
        stats: aggregatedData.stats,
        validation: scraperResult.validation || {},
        extractedData: uiData.extractedData
      }

      // 10. Cache the result
      permanentLogger.breadcrumb('CACHE', 'Caching execution result', {
        executionId,
        ttl: '5 minutes'
      })
      
      await this.aggregator.cacheResult(
        request.sessionId,
        executionId,
        result,
        5 * 60 * 1000 // 5 minutes
      )
      permanentLogger.timing('result_cached', { executionId })
      
      // Add final timing checkpoint
      const totalDuration = Date.now() - startTime
      permanentLogger.timing('execution_complete', { 
        totalDuration,
        pagesScraped: result.newData.pages,
        dataPoints: result.newData.dataPoints
      })
      
      permanentLogger.breadcrumb('UNIFIED_EXECUTOR', 'Execution complete', {
        executionId,
        duration: totalDuration,
        success: true,
        pagesScraped: result.newData.pages,
        dataPoints: result.newData.dataPoints
      })

      permanentLogger.info('UNIFIED_EXECUTOR', 'Execution complete', {
        executionId,
        duration: totalDuration,
        pagesScraped: result.newData.pages,
        dataPoints: result.newData.dataPoints,
        executionTimer: executionTimer.stop()
      })

      return result

    } catch (error) {
      // Capture error with full context
      permanentLogger.breadcrumb('ERROR', 'Execution failed', {
        executionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      permanentLogger.captureError('UNIFIED_EXECUTOR', error, {
        executionId,
        sessionId: request.sessionId,
        scraperId: request.scraperId,
        executionId,
        timing: 'scraper_execution'
      })
      
      throw error
    } finally {
      // Always release the lock
      if (lock) {
        permanentLogger.breadcrumb('LOCK', 'Releasing execution lock', { lockId: lock.id })
        await this.repository.releaseLock(request.sessionId, lock.id)
        permanentLogger.timing('lock_released', { lockId: lock.id })
      }
    }
  }

  /**
   * Execute a scraping operation with real-time streaming progress updates
   *
   * @param request - The execution request containing session and scraper details
   * @param progressCallback - Callback function to receive progress events
   * @returns Promise<void> - Completes when streaming is finished
   * @throws Error if scraping fails
   *
   * Technical PM Note: Use this for real-time UI updates during long-running scrapes.
   * Events are sent as the scraper processes each page.
   */
  async executeWithStreaming(
    request: ExecutionRequest,
    progressCallback: ProgressCallback
  ): Promise<void> {
    permanentLogger.info(' UNIFIED_EXECUTOR.executeWithStreaming CALLED', {
      sessionId: request.sessionId,
      scraperId: request.scraperId,
      hasProgressCallback: !!progressCallback
    })
    
    const correlationId = EventFactory.getCorrelationId(request.sessionId)
    let sequenceNumber = 0

    const sendProgress = async (data: any) => {
      permanentLogger.info(' UNIFIED_EXECUTOR.sendProgress CALLED', {
        dataType: data.type,
        sequence: sequenceNumber + 1
      })
      
      const priorityMap: Record<string, 'fatal' | 'high' | 'normal' | 'low'> = {
        'error': 'fatal',
        'complete': 'high',
        'progress': 'normal',
        'data': 'low',
        'notification': 'normal',
        'phase-start': 'normal',
        'phase-complete': 'high'
      }

      const event = {
        type: data.type || 'notification',
        phase: 'scraping_execution',
        priority: priorityMap[data.type] || 'normal',
        correlationId,
        sequence: ++sequenceNumber,
        timestamp: Date.now(),
        payload: {
          message: data.message || '',
          details: data
        }
      }

      await progressCallback(event)
    }

    try {
      // Send start event with SSE standardization
      const startEvent = EventFactory.status(
        'Scraper started',
        { 
          source: EventSource.SCRAPER,
          correlationId,
          sessionId: request.sessionId,
          scraperId: request.scraperId,
          urls: request.urls.length,
          timestamp: Date.now()
        }
      )
      await sendProgress(startEvent)

      // Execute the scraper with progress callback
      const requestWithCallback = {
        ...request,
        stream: true, // CRITICAL: Must include stream flag!
        progressCallback: progressCallback
      }
      const result = await this.execute(requestWithCallback)

      // Send completion event with SSE standardization
      const completeEvent = EventFactory.complete(
        {
          scraperId: request.scraperId,
          duration: result.newData.duration,
          newData: result.newData,
          totalData: result.totalData,
          suggestions: result.suggestions,
          stats: result.stats,
          validation: result.validation,
          extractedData: result.extractedData
        },
        { 
          source: EventSource.SCRAPER,
          correlationId,
          sessionId: request.sessionId
        }
      )
      await sendProgress(completeEvent)

      // Send done signal with standardized event
      const doneEvent = EventFactory.status(
        'Stream complete',
        { 
          source: EventSource.SCRAPER,
          correlationId,
          sessionId: request.sessionId,
          type: 'done'
        }
      )
      await sendProgress(doneEvent)

    } catch (error) {
      permanentLogger.captureError('UNIFIED_EXECUTOR', error, {
        context: 'Streaming execution failed',
        executionId
      })

      // Send error event with SSE standardization
      const errorEvent = EventFactory.error(
        error,
        { 
          source: EventSource.SCRAPER,
          correlationId,
          sessionId: request.sessionId
        }
      )
      await sendProgress(errorEvent)

      throw error
    }
  }

  /**
   * Get URLs and metadata from database with bulletproof error handling
   */
  private async getUrlsAndMetadataFromDatabase(session: SessionData, explicitUrls?: string[]): Promise<{ urls: string[], metadata: Map<string, URLMetadata> }> {
    // Start timing for performance metrics
    permanentLogger.timing('url_retrieval_start')
    
    // FORENSIC: Track URL source and data flow
    permanentLogger.breadcrumb('URL_SOURCE', 'Starting URL retrieval', {
      timestamp: Date.now(),
      source: explicitUrls ? 'explicit_urls' : 'discovered_urls',
      destination: 'scraper_input',
      sessionId: session.id,
      hasDiscoveredUrls: !!session.discovered_urls,
      hasExplicitUrls: !!(explicitUrls?.length > 0),
      discoveredUrlsCount: session.discovered_urls?.length || 0,
      explicitUrlsCount: explicitUrls?.length || 0
    })
    
    // Use explicit URLs if provided (for direct API calls)
    if (explicitUrls && explicitUrls.length > 0) {
      permanentLogger.breadcrumb('URL_RETRIEVAL', 'Using explicitly passed URLs', { 
        urlCount: explicitUrls.length 
      })
      permanentLogger.info('URL_RETRIEVAL', 'Using explicitly passed URLs', {
        sessionId: session.id,
        urlCount: explicitUrls.length,
        sample: explicitUrls.slice(0, 3)
      })
      // Return URLs without metadata for explicit URLs
      return { urls: explicitUrls, metadata: new Map() }
    }
    
    // Get URLs from database - EXPECT ONLY STRING ARRAY (Data Contract)
    let discoveredUrls = session.discovered_urls
    
    // CRITICAL: Log the actual format received for debugging
    permanentLogger.info('URL_RETRIEVAL', 'Raw discovered_urls from database', {
      sessionId: session.id,
      type: typeof discoveredUrls,
      isArray: Array.isArray(discoveredUrls),
      sample: Array.isArray(discoveredUrls) ? discoveredUrls.slice(0, 3) : 'not an array',
      length: Array.isArray(discoveredUrls) ? discoveredUrls.length : 0,
      // Log full content if not array to debug the issue
      rawContent: !Array.isArray(discoveredUrls) ? JSON.stringify(discoveredUrls).slice(0, 200) : undefined
    })
    
    // Validate it's an array (Data Contract Enforcement)
    if (!Array.isArray(discoveredUrls)) {
      permanentLogger.warn('URL_RETRIEVAL', 'Data contract violation: discovered_urls is not an array, attempting recovery', {
        sessionId: session.id,
        actualType: typeof discoveredUrls,
        actualValue: JSON.stringify(discoveredUrls).slice(0, 500)
      })
      
      // GRACEFUL RECOVERY: Try to extract URLs from incorrect format
      // This handles legacy data where SitemapPage objects were stored instead of strings
      if (discoveredUrls && typeof discoveredUrls === 'object') {
        try {
          // Try to extract URLs from object format (could be SitemapPage objects)
          const extracted = Object.values(discoveredUrls).map((item: any) => {
            if (typeof item === 'string') {
              return item
            } else if (item && typeof item === 'object' && item.url) {
              // Extract URL from SitemapPage object
              permanentLogger.info('URL_RETRIEVAL', 'Extracting URL from object format', {
                url: item.url,
                hasMetadata: !!(item.title || item.lastmod || item.priority)
              })
              return item.url
            }
            return null
          }).filter(Boolean)
          
          if (extracted.length > 0) {
            permanentLogger.info('URL_RETRIEVAL', 'Successfully recovered URLs from incorrect format', {
              originalFormat: 'object',
              extractedCount: extracted.length,
              sampleUrls: extracted.slice(0, 3)
            })
            discoveredUrls = extracted
          } else {
            throw new Error('Could not extract any valid URLs from discovered_urls')
          }
        } catch (recoveryError) {
          permanentLogger.captureError('URL_RETRIEVAL', new Error('Failed to recover from data contract violation'), {
            sessionId: session.id,
            error: recoveryError,
            executionId
          })
          throw new Error(`Data contract violation: discovered_urls must be an array, got ${typeof discoveredUrls}`)
        }
      } else {
        // Cannot recover, throw error
        permanentLogger.captureError('URL_RETRIEVAL', new Error('Data contract violation: discovered_urls must be an array'), {
          sessionId: session.id,
          actualType: typeof discoveredUrls,
          executionId
        })
        throw new Error(`Data contract violation: discovered_urls must be an array, got ${typeof discoveredUrls}`)
      }
    }
    
    // FORENSIC: Add timing checkpoint before validation
    permanentLogger.timing('url_validation_start')
    
    // Filter to ensure all are valid URL strings
    const validUrls = discoveredUrls.filter((url, index) => {
      // Must be a string
      if (typeof url !== 'string') {
        permanentLogger.warn('URL_VALIDATION', 'Skipping non-string URL', {
          index,
          type: typeof url,
          value: url,
          sessionId: session.id
        })
        return false
      }
      
      // Must have content
      if (url.length === 0) {
        permanentLogger.warn('URL_VALIDATION', 'Skipping empty URL', {
          index,
          sessionId: session.id
        })
        return false
      }
      
      // Must be a valid URL (basic check)
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        permanentLogger.warn('URL_VALIDATION', 'Skipping invalid URL', { 
          index,
          url,
          sessionId: session.id
        })
        return false
      }
      
      return true
    })
    
    // FORENSIC: Add timing checkpoint after validation
    permanentLogger.timing('url_validation_complete')
    
    permanentLogger.info('URL_RETRIEVAL', 'URLs validated and filtered', {
      sessionId: session.id,
      originalCount: discoveredUrls.length,
      validCount: validUrls.length,
      filteredOut: discoveredUrls.length - validUrls.length,
      validSample: validUrls.slice(0, 3),
      timingInfo: 'url_validation'
    })
    
    // Ensure we have URLs to work with
    if (validUrls.length === 0) {
      permanentLogger.captureError('URL_RETRIEVAL', new Error('No valid URLs found after filtering'), {
        sessionId: session.id,
        originalUrls: discoveredUrls.slice(0, 10),
        executionId
      })
      throw new Error('No valid URLs found in discovered_urls. Please complete sitemap discovery first.')
    }
    
    // Extract metadata from merged_data if available
    const urlMetadataMap = new Map<string, URLMetadata>()
    
    if (session.merged_data) {
      permanentLogger.breadcrumb('METADATA_EXTRACTION', 'Extracting metadata from merged_data', {
        hasMergedData: true,
        mergedDataType: typeof session.merged_data
      })
      
      // merged_data could contain sitemap metadata or scraped page metadata
      const mergedData = session.merged_data as any
      
      // Look for sitemap data which contains priority and lastmod
      if (mergedData.sitemap?.urls) {
        for (const sitemapUrl of mergedData.sitemap.urls) {
          if (typeof sitemapUrl === 'object' && sitemapUrl.url) {
            const metadata: URLMetadata = {
              url: sitemapUrl.url,
              priority: this.mapPriority(sitemapUrl.priority),
              lastmod: sitemapUrl.lastmod,
              pageType: this.determinePageType(sitemapUrl.url)
            }
            urlMetadataMap.set(sitemapUrl.url, metadata)
          }
        }
      }
      
      // Also check for scraped pages data
      if (mergedData.pages) {
        for (const [url, pageData] of Object.entries(mergedData.pages)) {
          if (!urlMetadataMap.has(url) && typeof pageData === 'object') {
            const metadata: URLMetadata = {
              url,
              pageType: this.determinePageType(url),
              lastScraped: (pageData as any).timestamp || (pageData as any).lastScraped
            }
            urlMetadataMap.set(url, metadata)
          }
        }
      }
      
      permanentLogger.info('METADATA_EXTRACTION', 'Metadata extracted from merged_data', {
        sessionId: session.id,
        metadataCount: urlMetadataMap.size,
        sampleMetadata: Array.from(urlMetadataMap.entries()).slice(0, 3).map(([url, meta]) => ({
          url,
          priority: meta.priority,
          pageType: meta.pageType
        }))
      })
    }
    
    return { urls: validUrls, metadata: urlMetadataMap }
  }

  /**
   * Get current session data without executing
   */
  private async getCurrentSessionData(sessionId: string): Promise<ExecutionResult> {
    const session = await this.repository.getSession(sessionId)
    
    if (!session || !session.merged_data) {
      return {
        success: false,
        sessionId,
        scraperId: '',
        newData: { pages: 0, dataPoints: 0, discoveredLinks: 0, duration: 0 },
        totalData: { pagesScraped: 0, dataPoints: 0, discoveredLinks: 0 },
        suggestions: ['Start scraping to collect data'],
        stats: {},
        validation: {},
        extractedData: {}
      }
    }

    const aggregatedData = session.merged_data as AggregatedData
    const uiData = this.aggregator.formatForUI(aggregatedData)

    return {
      success: true,
      sessionId,
      scraperId: '',
      newData: { pages: 0, dataPoints: 0, discoveredLinks: 0, duration: 0 },
      totalData: {
        pagesScraped: aggregatedData.stats?.totalPages || 0,
        dataPoints: aggregatedData.stats?.dataPoints || 0,
        discoveredLinks: aggregatedData.stats?.totalLinks || 0
      },
      suggestions: this.generateSuggestions(aggregatedData),
      stats: aggregatedData.stats || {},
      validation: {},
      extractedData: uiData.extractedData
    }
  }

  /**
   * Map numeric priority to high/medium/low
   */
  private mapPriority(priority?: number | string): 'high' | 'medium' | 'low' | undefined {
    if (!priority) return undefined
    
    const numPriority = typeof priority === 'string' ? parseFloat(priority) : priority
    
    if (numPriority >= 0.8) return 'high'
    if (numPriority >= 0.5) return 'medium'
    return 'low'
  }
  
  /**
   * Determine page type from URL
   */
  private determinePageType(url: string): string {
    const urlLower = url.toLowerCase()
    
    if (urlLower === '/' || urlLower.endsWith('/index.html') || urlLower.endsWith('/')) {
      return 'homepage'
    }
    if (urlLower.includes('/about')) return 'about'
    if (urlLower.includes('/service') || urlLower.includes('/product')) return 'services'
    if (urlLower.includes('/contact')) return 'contact'
    if (urlLower.includes('/blog') || urlLower.includes('/news')) return 'blog'
    if (urlLower.includes('/team') || urlLower.includes('/people')) return 'team'
    if (urlLower.includes('/career') || urlLower.includes('/job')) return 'careers'
    
    return 'general'
  }

  /**
   * Generate suggestions based on current data
   */
  private generateSuggestions(aggregatedData: AggregatedData): string[] {
    const suggestions: string[] = []
    
    if (!aggregatedData.stats || aggregatedData.stats.totalPages === 0) {
      suggestions.push('Start with the Static HTML scraper for quick results')
      return suggestions
    }

    // Check which scrapers haven't been used
    const usedScrapers = Object.keys(aggregatedData.stats.phaseCounts || {})
    
    if (!usedScrapers.includes('static')) {
      suggestions.push('Try the Static HTML scraper for fast extraction')
    }
    
    if (!usedScrapers.includes('dynamic')) {
      suggestions.push('Use the JavaScript Renderer for dynamic content')
    }

    // Check data quality
    if (aggregatedData.stats.dataPoints < aggregatedData.stats.totalPages * 5) {
      suggestions.push('Pages have limited data - try the JavaScript Renderer')
    }

    if (aggregatedData.stats.totalLinks < aggregatedData.stats.totalPages * 10) {
      suggestions.push('Few links discovered - consider deeper crawling')
    }

    return suggestions
  }

  /**
   * Track execution metrics
   *
   * Technical PM Note: This stores performance data for each scraping run
   * so we can track which scrapers are fastest and most effective
   */
  private async trackMetrics(
    executionId: string,
    request: ExecutionRequest,
    startTime: number,
    result: ScraperResult
  ): Promise<void> {
    try {
      // Use repository pattern instead of direct database access
      // This follows our Database-First Architecture (guideline #19)
      const metricsData = {
        execution_id: executionId,
        session_id: request.sessionId,
        scraper_id: request.scraperId,
        url_count: request.urls.length,
        pages_scraped: result.pages?.length || 0,
        data_points: result.dataPoints || 0,
        duration_ms: Date.now() - startTime,
        success: true,
        metadata: {
          options: request.options,
          validation: result.validation
        }
      }

      // TODO: Add metrics storage to CompanyIntelligenceRepository
      // For now, log the metrics for debugging
      permanentLogger.info('UNIFIED_EXECUTOR', 'Execution metrics', metricsData)

    } catch (error) {
      permanentLogger.captureError('UNIFIED_EXECUTOR', error as Error, {
        context: 'Failed to track metrics',
        executionId
      })
    }
  }

  /**
   * Map old scraper IDs to new plugin IDs for backward compatibility
   */
  private mapScraperIdToPlugin(scraperId: string): string {
    // Map old names to new plugin IDs
    const mapping: Record<string, string> = {
      'static': 'static-scraper',
      'dynamic': 'dynamic-scraper',
      'javascript-renderer': 'dynamic-scraper',
      'basic-fetcher': 'static-scraper'
    }

    return mapping[scraperId] || scraperId
  }

  /**
   * Get a list of all available scraper plugins
   *
   * @returns Array of scraper information including ID, name, and speed rating
   *
   * Technical PM Note: Returns all auto-discovered scrapers from the registry.
   * Speed ratings: 'fast' (< 1s/page), 'medium' (1-5s/page), 'slow' (> 5s/page)
   */
  getAvailableScrapers(): Array<{ id: string; name: string; speed: string }> {
    // Get from registry if initialized
    const scrapers = this.registry.getAllScrapers()

    if (scrapers.length > 0) {
      return scrapers.map(scraper => ({
        id: scraper.config.id,
        name: scraper.config.name,
        speed: scraper.config.speed || 'medium'
      }))
    }

    // Fallback for uninitialized state
    return [
      { id: 'static-scraper', name: 'Static HTML Scraper', speed: 'fast' },
      { id: 'dynamic-scraper', name: 'Dynamic JavaScript Scraper', speed: 'medium' }
    ]
  }

  /**
   * Get the current status of a scraping session
   *
   * @param sessionId - The ID of the session to check
   * @returns Promise<SessionStatus> - Status including pages scraped, data points, and suggestions
   *
   * Technical PM Note: Use this to display progress and statistics in the UI.
   * Returns suggestions for which scrapers to run next based on current data.
   */
  async getSessionStatus(sessionId: string): Promise<SessionStatus> {
    const session = await this.repository.getSession(sessionId)
    
    if (!session) {
      return {
        sessionId,
        scraperRuns: 0,
        pagesScraped: 0,
        totalDataPoints: 0,
        availableScrapers: this.getAvailableScrapers(),
        usedScrapers: [],
        suggestions: ['Start scraping to collect data']
      }
    }

    const aggregatedData = session.merged_data as AggregatedData
    
    return {
      sessionId,
      scraperRuns: Object.keys(aggregatedData?.stats?.phaseCounts || {}).length,
      pagesScraped: aggregatedData?.stats?.totalPages || 0,
      totalDataPoints: aggregatedData?.stats?.dataPoints || 0,
      availableScrapers: this.getAvailableScrapers(),
      usedScrapers: Object.keys(aggregatedData?.stats?.phaseCounts || {}),
      suggestions: this.generateSuggestions(aggregatedData)
    }
  }
}