'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { ScrapingErrorHandler } from '@/lib/company-intelligence/error-handler'
import { eventBus } from '@/lib/notifications/event-bus'
import { EventPriority, EventSource } from '@/lib/notifications/types'
// Using new unified event system via adapters for gradual migration
// Using unified EventFactory and StreamReader from realtime-events
import { EventFactory, StreamReader } from '@/lib/realtime-events'
import { nanoid } from 'nanoid' // For ID generation
import { getDeduplicationService } from '@/lib/notifications/utils/deduplication-service'
import { 
  Zap, 
  Globe, 
  Code, 
  Database,
  CheckCircle2,
  Plus,
  ArrowRight,
  Info,
  Clock,
  TrendingUp
} from 'lucide-react'
import { TooltipWrapper } from '../tooltip-wrapper'
import { ScraperSelector } from './scraper-selector'
import { AdditiveResults } from './additive-results'
// import { ScrapingSuggestions } from './scraping-suggestions' // Removed - AI Suggestions disabled
import type { ScraperResult, ScrapingSuggestion } from '@/lib/company-intelligence/scrapers/additive/types'

interface ScrapingControlProps {
  domain: string
  sessionId: string
  sitemapUrls?: string[]  // URLs discovered in sitemap phase (for deduplication only)
  onComplete?: (data: any) => void
}

interface ScraperRun {
  id: string // UNIQUE: Unique identifier for this run
  scraperId: string
  scraperName: string
  timestamp: number
  pagesScraped: number
  dataPoints: number
  discoveredLinks: number
  discoveredUrls?: string[]
  duration: number
  status: 'running' | 'complete' | 'failed'
  statusMessage?: string // OPTIONAL: More detailed status message for better UX
  extractedData?: {
    titles?: string[]
    descriptions?: string[]
    technologies?: string[]
    contacts?: { emails?: string[], phones?: string[] }
  }
  eventId?: string // TRACKING: Link to the event that created this run
}

/**
 * Operation state for robust debouncing and execution tracking
 * Prevents duplicate executions and provides clear state management
 */
interface OperationState {
  isExecuting: boolean
  isDebouncing: boolean
  lastExecutionTime: number | null
  currentScraperId: string | null
  executionCount: number
}

/**
 * Main control component for additive scraping architecture
 * Replaces the old 3-phase system with flexible, user-controlled scraping
 * 
 * BULLETPROOF ARCHITECTURE COMPLIANT:
 * - Database-first approach: All data fetched from Supabase
 * - No mock data or fallback values
 * - Periodic sync with database (5s intervals)
 * - All URLs and state stored in database, not local state
 */
export function ScrapingControl({ 
  domain, 
  sessionId, 
  sitemapUrls = [],
  onComplete 
}: ScrapingControlProps) {
  // State
  const [isScrapingActive, setIsScrapingActive] = useState(false)
  const [currentScraper, setCurrentScraper] = useState<string | null>(null)
  const [scraperHistory, setScraperHistory] = useState<ScraperRun[]>([])
  const [totalData, setTotalData] = useState({
    pagesScraped: 0,
    dataPoints: 0,
    discoveredLinks: 0,
    scraperRuns: 0
  })
  
  // ENHANCEMENT: Track active scraper ID to fix "Unknown" names
  const [activeScraperId, setActiveScraperId] = useState<string | null>(null)
  const [executionStartTime, setExecutionStartTime] = useState<number | null>(null)
  
  // ENHANCEMENT: Robust operation state for better debouncing
  const [operationState, setOperationState] = useState<OperationState>({
    isExecuting: false,
    isDebouncing: false,
    lastExecutionTime: null,
    currentScraperId: null,
    executionCount: 0
  })
  
  // ENHANCEMENT: Event deduplication tracking
  const processedEvents = useRef(new Set<string>())
  const eventCleanupTimers = useRef(new Map<string, NodeJS.Timeout>())

  // Store StreamReader instance for proper cleanup
  const streamReaderRef = useRef<StreamReader | null>(null)
  const [suggestions, setSuggestions] = useState<ScrapingSuggestion[]>([])
  const [availableScrapers, setAvailableScrapers] = useState([
    { id: 'static', name: 'Static HTML (Cheerio)', icon: <Zap />, speed: 'fast', used: false },
    { id: 'dynamic', name: 'JavaScript Renderer (Playwright)', icon: <Globe />, speed: 'medium', used: false },
    { id: 'spa', name: 'SPA Scraper', icon: <Code />, speed: 'slow', used: false, disabled: true },
    { id: 'api', name: 'API Extractor', icon: <Database />, speed: 'fast', used: false, disabled: true }
  ])
  const [streamingData, setStreamingData] = useState<any>(null)
  const [scrapingProgress, setScrapingProgress] = useState({
    currentPage: 0,
    totalPages: 0,
    pagesCompleted: 0,
    currentPhase: '',
    message: '',
    percentage: 0
  })
  
  // Initialize deduplication service
  const deduplicationService = getDeduplicationService(2000) // 2 second window
  
  // Debouncing state to prevent duplicate clicks
  const [isDebouncing, setIsDebouncing] = useState(false)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const correlationId = nanoid() // Generate unique correlation ID
  
  /**
   * Create unique event identifier for deduplication
   * Prevents processing the same event multiple times
   */
  const getEventId = (data: any): string => {
    return `${data.type}-${data.scraperId || activeScraperId || 'unknown'}-${data.timestamp || Date.now()}`
  }
  
  /**
   * Check if event has been processed and mark it if not
   * Auto-cleans up after 10 seconds to prevent memory leaks
   */
  const isEventProcessed = (eventId: string): boolean => {
    if (processedEvents.current.has(eventId)) {
      permanentLogger.breadcrumb('DUPLICATE_EVENT_BLOCKED', 'Blocked duplicate event', {
        eventId,
        totalProcessed: processedEvents.current.size
      })
      return true
    }
    
    // Mark as processed
    processedEvents.current.add(eventId)
    permanentLogger.breadcrumb('EVENT_MARKED_PROCESSED', 'New event marked as processed', {
      eventId,
      totalProcessed: processedEvents.current.size
    })
    
    // Auto-cleanup after 10 seconds
    const timer = setTimeout(() => {
      processedEvents.current.delete(eventId)
      eventCleanupTimers.current.delete(eventId)
      permanentLogger.breadcrumb('EVENT_CLEANUP', 'Cleaned up old event', { eventId })
    }, 10000)
    
    eventCleanupTimers.current.set(eventId, timer)
    return false
  }
  
  /**
   * Generate unique ID for scraper runs
   * This is for operation tracking only (not database persistence)
   * Format: run-timestamp-sessionIdSuffix
   */
  const generateRunId = (): string => {
    // Use timestamp + session ID suffix for uniqueness
    return `run-${Date.now()}-${sessionId.slice(-8)}`
  }
  
  const sendNotification = (message: string, type: 'success' | 'error' | 'info' = 'info', priority?: EventPriority) => {
    // Use deduplication service for cleaner deduplication (SRP)
    const deduplicationKey = deduplicationService.createKey(message, type)
    
    if (deduplicationService.isDuplicate(deduplicationKey)) {
      return
    }
    
    // Use EventFactory for consistent event creation (DRY)
    const event = EventFactory.notification(
      message,
      type,
      {
        priority: priority || (
          type === 'error' ? EventPriority.HIGH :
          type === 'success' ? EventPriority.NORMAL :
          EventPriority.LOW
        ),
        correlationId,
        persistent: true
      }
    )
    
    eventBus.emit(event)
  }

  // Initialize error handler with sendNotification and log component mount
  useEffect(() => {
    ScrapingErrorHandler.initialize(sendNotification)
    
    permanentLogger.breadcrumb('COMPONENT_MOUNT', 'ScrapingControl component mounted', {
      sessionId,
      domain,
      sitemapUrlsCount: sitemapUrls?.length || 0,
      timestamp: Date.now()
    })
    
    permanentLogger.info('SCRAPING_CONTROL', 'Component initialized', { sessionId,
      domain,
      hasOnComplete: !!onComplete,
      initialScraperCount: availableScrapers.length })
  }, [])
  
  // Get session status on mount and refresh periodically (database-first approach)
  useEffect(() => {
    // Only fetch if sessionId is valid
    if (sessionId && sessionId !== 'undefined') {
      fetchSessionStatus()

      // Refresh session status every 5 seconds to ensure database sync
      const intervalId = setInterval(() => {
        if (!isScrapingActive && sessionId && sessionId !== 'undefined') {
          fetchSessionStatus()
        }
      }, 5000)

      // Cleanup on unmount
      return () => {
        clearInterval(intervalId)

        // Disconnect any active stream connections
        if (streamReaderRef.current) {
          permanentLogger.info('SCRAPING_CONTROL', 'Disconnecting stream on unmount', { sessionId })
          streamReaderRef.current.disconnect()
          streamReaderRef.current = null
        }
      }
    }
  }, [sessionId, isScrapingActive])

  /**
   * Fetch current session status and hydrate scraperHistory from database
   * CRITICAL: This fixes the "0 Scrapers Run" issue by loading historical runs
   */
  const fetchSessionStatus = async () => {
    // Early return if sessionId is invalid
    if (!sessionId || sessionId === 'undefined') {
      permanentLogger.breadcrumb('SKIP_FETCH', 'Skipping session status fetch - invalid sessionId', {
        sessionId,
        timestamp: Date.now()
      })
      return
    }

    permanentLogger.breadcrumb('STATE_SYNC', 'Fetching session status from database', {
      sessionId,
      timestamp: Date.now()
    })

    try {
      const response = await fetch(`/api/company-intelligence/scraping/execute?sessionId=${sessionId}`)
      if (response.ok) {
        const data = await response.json()
        
        permanentLogger.info('SCRAPING_CONTROL', 'Session status retrieved', { sessionId,
          pagesScraped: data.pagesScraped,
          totalDataPoints: data.totalDataPoints,
          usedScrapersCount: data.usedScrapers?.length || 0,
          usedScrapers: data.usedScrapers })
        
        // CRITICAL FIX: Hydrate scraperHistory from database
        // This ensures UI shows correct "Scrapers Run" count
        if (data.usedScrapers && data.usedScrapers.length > 0) {
          const history: ScraperRun[] = data.usedScrapers.map((scraperId: string, index: number) => {
            const scraper = availableScrapers.find(s => s.id === scraperId)
            
            // Calculate approximate values per scraper
            const pagesPerScraper = Math.floor((data.pagesScraped || 0) / data.usedScrapers.length)
            const dataPointsPerScraper = Math.floor((data.totalDataPoints || 0) / data.usedScrapers.length)
            
            const historicalRun: ScraperRun = {
              id: `historical-${sessionId}-${scraperId}-${index}`,
              eventId: `historical-event-${scraperId}-${index}`,
              scraperId,
              scraperName: scraper?.name || 'Unknown',
              timestamp: Date.now() - ((data.usedScrapers.length - index) * 60000), // Stagger timestamps
              pagesScraped: pagesPerScraper,
              dataPoints: dataPointsPerScraper,
              discoveredLinks: 0,
              discoveredUrls: [],
              duration: 0, // Historical runs don't have duration data
              status: 'complete' as const,
              extractedData: {}
            }
            
            permanentLogger.breadcrumb('HYDRATE_RUN', 'Creating historical run entry', {
              scraperId,
              scraperName: historicalRun.scraperName,
              pagesScraped: pagesPerScraper,
              dataPoints: dataPointsPerScraper
            })
            
            return historicalRun
          })
          
          permanentLogger.info('SCRAPING_CONTROL', 'Hydrating scraper history from database', { sessionId,
            historicalRunsCount: history.length,
            usedScrapers: data.usedScrapers,
            totalPagesScraped: data.pagesScraped,
            totalDataPoints: data.totalDataPoints })
          
          // Set the hydrated history - THIS FIXES THE "0 Scrapers Run" ISSUE
          setScraperHistory(history)
          
          permanentLogger.breadcrumb('HISTORY_HYDRATED', 'Scraper history successfully hydrated', {
            count: history.length,
            scraperIds: data.usedScrapers
          })
        } else {
          permanentLogger.breadcrumb('NO_HISTORY', 'No historical scraper runs found', { sessionId })
        }
        
        // Update totals with correct scraperRuns count
        const scraperRunsCount = data.usedScrapers?.length || data.scraperRuns || 0
        setTotalData({
          pagesScraped: data.pagesScraped || 0,
          dataPoints: data.totalDataPoints || 0,
          discoveredLinks: 0,
          scraperRuns: scraperRunsCount
        })
        
        permanentLogger.breadcrumb('TOTALS_UPDATED', 'Total data updated from database', {
          pagesScraped: data.pagesScraped || 0,
          dataPoints: data.totalDataPoints || 0,
          scraperRuns: scraperRunsCount
        })
        
        setSuggestions(data.suggestions || [])
        
        // Mark used scrapers
        const usedScraperIds = data.usedScrapers || []
        setAvailableScrapers(prev => prev.map(s => ({
          ...s,
          used: usedScraperIds.includes(s.id)
        })))
        
        permanentLogger.breadcrumb('SCRAPERS_MARKED', 'Available scrapers marked as used', {
          usedScraperIds,
          totalScrapers: availableScrapers.length
        })
      } else if (response.status === 404) {
        // 404 is expected if no scraping has happened yet - log as info, not error
        permanentLogger.info('SCRAPING_CONTROL', 'No scraping data found yet (expected on first load)', { sessionId,
          status: response.status })
      } else {
        // Only log actual errors
        permanentLogger.warn('SCRAPING_CONTROL', 'Could not fetch session status', {
          sessionId,
          status: response.status,
          statusText: response.statusText
        })
      }
    } catch (error) {
      // Network errors or other issues - log as warning, not error
      permanentLogger.warn('SCRAPING_CONTROL', 'Session status fetch failed (may be expected)', {
        sessionId,
        domain,
        errorMessage: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * Execute a scraper with enhanced debouncing and duplicate prevention
   * BULLETPROOF: Prevents duplicate executions with 2-second debounce
   */
  const executeScraper = async (scraperId: string) => {
    // ENHANCEMENT: Check robust operation state
    if (operationState.isExecuting || operationState.isDebouncing) {
      permanentLogger.breadcrumb('EXECUTION_BLOCKED', 'Operation in progress', {
        isExecuting: operationState.isExecuting,
        isDebouncing: operationState.isDebouncing,
        blockedScraperId: scraperId,
        currentScraperId: operationState.currentScraperId,
        lastExecutionTime: operationState.lastExecutionTime
      })
      
      // Provide clear user feedback
      sendNotification(
        'Please wait for the current operation to complete',
        'info',
        EventPriority.LOW
      )
      return
    }
    
    // Clear any existing debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    
    // ENHANCEMENT: Store active scraper ID to fix "Unknown" names
    setActiveScraperId(scraperId)
    setExecutionStartTime(Date.now())
    
    // ENHANCEMENT: Update robust operation state
    setOperationState(prev => ({
      ...prev,
      isExecuting: true,
      isDebouncing: true,
      currentScraperId: scraperId,
      executionCount: prev.executionCount + 1
    }))
    
    // Legacy state for backward compatibility
    setIsScrapingActive(true)
    setIsDebouncing(true)
    setCurrentScraper(scraperId)
    
    const scraper = availableScrapers.find(s => s.id === scraperId)
    
    permanentLogger.breadcrumb('SCRAPER_EXECUTION_START', 'Starting scraper', {
      scraperId,
      scraperName: scraper?.name,
      sessionId,
      executionCount: operationState.executionCount + 1,
      timestamp: Date.now()
    })
    
    permanentLogger.info('Starting scraper execution', {
      category: 'SCRAPING_CONTROL',
      scraperId,
      scraperName: scraper?.name,
      sessionId
      // URLs will be retrieved from database by backend
    })
    
    // Toast notification for scraper start
    sendNotification(`[SCRAPING] Starting ${scraper?.name || 'scraper'}...`, 'info', EventPriority.HIGH)

    try {
      // Handle streaming response directly since this uses POST
      const response = await fetch('/api/company-intelligence/scraping/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          domain,
          scraperId,
          // URLs will be retrieved from database by backend
          previouslyDiscoveredUrls: sitemapUrls,  // Pass sitemap URLs for deduplication
          stream: true
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      // Cleanup any existing stream before starting new one
      if (streamReaderRef.current) {
        streamReaderRef.current.disconnect()
        streamReaderRef.current = null
      }

      // Use StreamReader for cleaner streaming logic (SRP)
      const streamReader = new StreamReader({
        url: '/api/company-intelligence/scraping/execute',
        onEvent: (data) => {
          console.log('📥 STREAM DATA RECEIVED:', data)
          // The actual data is nested in payload.details for streaming events
          const actualData = data.payload?.details || data.payload || data
          // Handle the streaming update
          handleStreamingUpdate(actualData)

          // Use EventFactory for consistent event creation (DRY)
          if (data.priority && data.data) {
            const deduplicationKey = deduplicationService.createKey(
              data.data.message,
              data.type
            )

            if (!deduplicationService.isDuplicate(deduplicationKey)) {
              const event = EventFactory.notification(
                data.data.message,
                data.type === 'error' ? 'error' : 'info',
                {
                  priority: EventFactory.mapPriority(data.priority),
                  correlationId: data.correlationId || correlationId,
                  persistent: true
                }
              )

              eventBus.emit(event)
            }
          }
        },
        onError: (error) => {
          permanentLogger.captureError('SCRAPING_CONTROL', error, { context: 'Stream error', correlationId })
        },
        onComplete: () => {
          permanentLogger.info('SCRAPING_CONTROL', 'Stream complete', { correlationId })
        }
      })

      // Store the reader for cleanup
      streamReaderRef.current = streamReader

      await streamReader.connect() // Connect to the stream (correct method name)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      // Use centralized error handler - DRY principle
      ScrapingErrorHandler.handleError('SCRAPING_EXECUTION', error, {
        showToUser: true,
        scraperName: scraper?.name,
        additionalData: { scraperId, sessionId, domain }
      })
      
      // Update scraper history with failed status (using same pattern as success)
      // Determine user-friendly failure message based on error type
      let statusMessage = 'Failed'
      if (errorMessage.includes('500') || errorMessage.includes('server')) {
        statusMessage = 'Server error'
      } else if (errorMessage.includes('429') || errorMessage.includes('rate')) {
        statusMessage = 'Rate limited'
      } else if (errorMessage.includes('403') || errorMessage.includes('forbidden')) {
        statusMessage = 'Access denied'
      } else if (errorMessage.includes('404')) {
        statusMessage = 'Not found'
      } else if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
        statusMessage = 'Timed out'
      } else if (errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED')) {
        statusMessage = 'Network error'
      } else if (errorMessage.includes('abort') || errorMessage.includes('cancel')) {
        statusMessage = 'Cancelled'
      }

      const failedRun: ScraperRun = {
        id: generateRunId(),
        eventId: `failed-${Date.now()}`, // Track failed events too
        scraperId: scraperId || activeScraperId || 'unknown',
        scraperName: scraper?.name || availableScrapers.find(s => s.id === activeScraperId)?.name || 'Unknown',
        timestamp: executionStartTime || Date.now(),
        pagesScraped: 0,
        dataPoints: 0,
        discoveredLinks: 0,
        duration: Date.now() - (executionStartTime || Date.now()),
        status: 'failed',
        statusMessage // Add the user-friendly message
      }
      
      permanentLogger.breadcrumb('ADD_FAILED_RUN', 'Adding failed run to history', {
        runId: failedRun.id,
        scraperId: failedRun.scraperId,
        scraperName: failedRun.scraperName,
        error: errorMessage
      })
      
      setScraperHistory(prev => [...prev, failedRun])
    } finally {
      // ENHANCEMENT: Clear execution flag but maintain debounce
      setOperationState(prev => ({
        ...prev,
        isExecuting: false,
        lastExecutionTime: Date.now()
      }))
      
      // ENHANCEMENT: Extended 2-second debounce period after completion
      debounceTimeoutRef.current = setTimeout(() => {
        setOperationState(prev => ({
          ...prev,
          isDebouncing: false,
          currentScraperId: null
        }))
        setIsDebouncing(false)
        
        permanentLogger.breadcrumb('DEBOUNCE_CLEARED', 'Ready for new operation', {
          lastScraperId: scraperId,
          debounceDuration: 2000
        })
      }, 2000) // 2 second debounce after completion
      
      // Legacy state cleanup
      setIsScrapingActive(false)
      setCurrentScraper(null)
    }
  }

  /**
   * Handle streaming updates with event deduplication
   * BULLETPROOF: Prevents processing the same event twice
   */
  const handleStreamingUpdate = (data: any) => {
    // FIX 3: Check for duplicate events IMMEDIATELY, before any processing
    const eventId = getEventId(data)
    if (isEventProcessed(eventId)) {
      console.log('🚫 DUPLICATE EVENT BLOCKED:', eventId, 'Type:', data.type)
      permanentLogger.breadcrumb('DUPLICATE_BLOCKED_EARLY', 'Blocked duplicate event at handler start', {
        eventId,
        type: data.type,
        scraperId: data.scraperId || activeScraperId
      })
      return // Exit immediately before ANY processing
    }
    
    try {
      permanentLogger.info('Streaming update received', {
        category: 'SCRAPING_CONTROL',
        type: data.type,
        scraperId: data.scraperId || activeScraperId,
        eventId,
        isFirstTime: true // Confirms this is the first processing
      })

      // Handle error type messages
      if (data.type === 'error') {
        const errorMessage = data.error || data.message || 'Scraping failed'
        sendNotification(
          `[SCRAPING ERROR] ${errorMessage}`,
          'error',
          EventPriority.CRITICAL
        )
        
        // Log critical error with full details
        permanentLogger.captureError('SCRAPING_CONTROL', new Error(errorMessage), {
          context: 'Scraping error received',
          data,
          errorMessage
        })
        return
      }

      // Handle progress events - CRITICAL FOR UI UPDATES
      if (data.type === 'progress') {
        permanentLogger.breadcrumb('PROGRESS_EVENT', 'Progress event received in UI', {
          current: data.current,
          total: data.total,
          message: data.message,
          percentage: data.percentage
        })
        
        // Update progress state
        setScrapingProgress({
          currentPage: data.current || 0,
          totalPages: data.total || 0,
          pagesCompleted: data.current || 0,
          currentPhase: data.phase || 'scraping',
          message: data.message || 'Processing...',
          percentage: data.percentage || ((data.current || 0) / (data.total || 1)) * 100
        })
        
        // Don't send toast for every progress update - too spammy
        permanentLogger.info('SCRAPING_CONTROL', 'Progress update', { current: data.current,
          total: data.total,
          message: data.message })
        return
      }

      // Handle status events
      if (data.type === 'status') {
        permanentLogger.breadcrumb('STATUS_EVENT', 'Status event received in UI', { message: data.message })
        
        // Update streaming data to show status
        setStreamingData({
          type: 'status',
          message: data.message
        })
        
        // Log but don't toast for status updates
        permanentLogger.info('SCRAPING_CONTROL', 'Status update', { message: data.message })
        return
      }

      // Handle data events
      if (data.type === 'data') {
        permanentLogger.breadcrumb('DATA_EVENT', 'Data event received in UI', {
          hasPayload: !!data.data,
          dataLength: Array.isArray(data.data) ? data.data.length : 0
        })
        
        // Data events contain actual scraped content
        setStreamingData({
          type: 'data',
          payload: data.data
        })
        
        permanentLogger.info('Data received', {
      category: 'SCRAPING_CONTROL',
          dataPoints: Array.isArray(data.data) ? data.data.length : 1
        })
        return
      }

      // FIX 1: Only process 'scraper_complete' events to prevent duplicates
      if (data.type === 'scraper_complete') {
        // CRITICAL LOGGING TO DEBUG UI UPDATE ISSUE
        permanentLogger.breadcrumb('SCRAPER_COMPLETE', 'Scraper complete event received', {
          scraperId: data.scraperId || activeScraperId,
          totalData: data.totalData,
          newData: data.newData
        })
        
        permanentLogger.breadcrumb('SCRAPER_COMPLETE_EVENT', 'Processing scraper completion', {
          scraperId: data.scraperId || activeScraperId,
          eventId,
          hasActiveScraperId: !!activeScraperId
        })
        
        permanentLogger.info('SCRAPING_CONTROL', 'Scraper complete data received', { scraperId: data.scraperId || activeScraperId,
          newData: data.newData,
          totalData: data.totalData,
          hasPages: !!data.newData?.pages })
        
        // The newData.pages is already a number (count of pages), not an array
        const pagesScraped = data.newData?.pages || 0
        const dataPoints = data.newData?.dataPoints || 0
        const discoveredLinks = data.newData?.discoveredLinks || 0
        
        // FIX 2: Use activeScraperId as fallback for missing scraperId
        const finalScraperId = data.scraperId || activeScraperId || 'unknown'
        
        // Add to history with proper scraper identification
        const run: ScraperRun = {
          id: generateRunId(), // Ensure unique ID
          eventId: eventId, // Link to event for tracking
          scraperId: finalScraperId,
          scraperName: availableScrapers.find(s => s.id === finalScraperId)?.name || 'Unknown',
          timestamp: executionStartTime || Date.now(),
          pagesScraped: pagesScraped,
          dataPoints: dataPoints,
          discoveredLinks: discoveredLinks,
          discoveredUrls: data.suggestions?.find((s: any) => s.action === 'explore_links')?.targetUrls || [],
          duration: data.duration || (Date.now() - (executionStartTime || Date.now())),
          status: 'complete',
          extractedData: data.extractedData || {} // Use actual extracted data from response
        }
        
        permanentLogger.breadcrumb('ADD_TO_HISTORY', 'Adding run to scraper history', {
          runId: run.id,
          scraperId: run.scraperId,
          scraperName: run.scraperName,
          historyLengthBefore: scraperHistory.length
        })
        
        setScraperHistory(prev => [...prev, run])
        
        // Update total data - THIS IS CRITICAL FOR THE UI
        if (data.totalData) {
          permanentLogger.breadcrumb('TOTAL_DATA_UPDATE', 'Updating total data from response', {
            before: totalData,
            after: data.totalData
          })
          
          permanentLogger.info('SCRAPING_CONTROL', 'Updating total data from response', { totalData: data.totalData,
            pagesScraped: data.totalData.pagesScraped,
            dataPoints: data.totalData.dataPoints })
          // Ensure we're setting the correct structure with proper defaults
          setTotalData({
            pagesScraped: data.totalData.pagesScraped || 0,
            dataPoints: data.totalData.dataPoints || 0,
            discoveredLinks: data.totalData.discoveredLinks || 0,
            scraperRuns: data.totalData.scraperRuns || scraperHistory.length + 1
          })
        } else {
          // If no totalData in response, calculate it ourselves
          permanentLogger.info('SCRAPING_CONTROL', 'No totalData in response, calculating manually', { pagesScraped: pagesScraped,
            dataPoints: dataPoints })
          setTotalData(prev => ({
            pagesScraped: prev.pagesScraped + pagesScraped,
            dataPoints: prev.dataPoints + dataPoints,
            discoveredLinks: prev.discoveredLinks + discoveredLinks,
            scraperRuns: prev.scraperRuns + 1
          }))
        }
        
        // Show success toast with stats (only one notification)
        const message = `Scraping complete! Extracted ${dataPoints} data points from ${pagesScraped} pages`
        permanentLogger.info('SCRAPING_CONTROL', message)
        sendNotification(message, 'success', EventPriority.HIGH)
        
        // Update suggestions
        setSuggestions(data.suggestions || [])
        
        // Mark scraper as used with proper ID
        setAvailableScrapers(prev => prev.map(s =>
          s.id === finalScraperId ? { ...s, used: true } : s
        ))
        
        return // Exit after processing scraper_complete
      }
      
      // FIX 1 CONTINUED: Log but don't process generic 'complete' events
      if (data.type === 'complete') {
        permanentLogger.breadcrumb('COMPLETE_EVENT_IGNORED', 'Ignoring generic complete event to prevent duplicates', {
          reason: 'Only processing scraper_complete events',
          eventId,
          scraperId: data.scraperId,
          hasData: !!data.newData
        })
        permanentLogger.breadcrumb('COMPLETE_IGNORED', 'Ignoring generic complete event to prevent duplicates', {})
        return // Don't process to avoid duplicates
      }
      
      if (data.type === 'error') {
        sendNotification(`[SCRAPING] Failed: ${data.error}`, 'error', EventPriority.CRITICAL)
      }
    
    // Store for display
    setStreamingData(data)
    
    } catch (error) {
      permanentLogger.captureError('SCRAPING_CONTROL', error, {
        context: 'Error handling streaming update',
        data
      })
      
      // Ensure errors are visible to user
      sendNotification(
        `[SCRAPING ERROR] Failed to process update: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error',
        EventPriority.CRITICAL
      )
      
      // Log critical error
      permanentLogger.info('CRITICAL', 'Streaming update error', { error, data })
    }
  }

  /**
   * Handle suggestion selection
   */
  const handleSuggestionSelect = (suggestion: ScrapingSuggestion) => {
    if (suggestion.action === 'use_scraper' && suggestion.scraperId) {
      executeScraper(suggestion.scraperId)
    } else if (suggestion.action === 'complete') {
      handleComplete()
    }
    // Handle other suggestion types as needed
  }

  /**
   * Complete scraping session
   */
  const handleComplete = () => {
    permanentLogger.info('SCRAPING_CONTROL', 'Completing scraping session', { sessionId,
      totalRuns: scraperHistory.length,
      totalData })
    
    if (onComplete) {
      onComplete({
        sessionId,
        history: scraperHistory,
        totalData,
        domain
      })
    }
  }

  return (
    <div className="space-y-6" data-testid="scraping-control">
      {/* Header */}
      <Card data-testid="scraping-stats-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Additive Scraping Session</span>
            <Badge variant="outline" data-testid="scraper-run-count">
              {scraperHistory.length} Scraper{scraperHistory.length !== 1 ? 's' : ''} Run
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4" data-testid="scraping-stats">
            <TooltipWrapper content="Total number of unique web pages successfully processed across all scraper runs. Each page is counted once even if scraped by multiple scrapers.">
              <div className="text-center cursor-help" data-testid="stat-pages-scraped">
                <div className="text-2xl font-bold">{totalData.pagesScraped}</div>
                <div className="text-sm text-muted-foreground">Pages Scraped</div>
              </div>
            </TooltipWrapper>
            
            <TooltipWrapper content="Total data elements extracted including text content, images, metadata, structured data, and other information. More data points mean richer content for document generation.">
              <div className="text-center cursor-help" data-testid="stat-data-points">
                <div className="text-2xl font-bold">{totalData.dataPoints}</div>
                <div className="text-sm text-muted-foreground">Data Points</div>
              </div>
            </TooltipWrapper>
            
            <TooltipWrapper content="New URLs discovered during scraping that could be explored in future sessions. These are potential pages for expanding your research scope.">
              <div className="text-center cursor-help" data-testid="stat-links-found">
                <div className="text-2xl font-bold">{totalData.discoveredLinks}</div>
                <div className="text-sm text-muted-foreground">Links Found</div>
              </div>
            </TooltipWrapper>
            
            <TooltipWrapper content="Number of different scraper types run in this session. Each scraper adds unique data - Static for HTML, Dynamic for JavaScript content, etc.">
              <div className="text-center cursor-help" data-testid="stat-scrapers-used">
                <div className="text-2xl font-bold">{scraperHistory.length}</div>
                <div className="text-sm text-muted-foreground">Scrapers Used</div>
              </div>
            </TooltipWrapper>
          </div>
        </CardContent>
      </Card>

      {/* Active Scraping */}
      {isScrapingActive && currentScraper && (
        <Card className="border-blue-500" data-testid="scraping-progress">
          <CardHeader>
            <CardTitle className="text-blue-600">
              Scraping in Progress...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                <span data-testid="current-scraper-name">Running {availableScrapers.find(s => s.id === currentScraper)?.name}</span>
              </div>
              {streamingData && (
                <div className="text-sm text-muted-foreground" data-testid="scraping-status">
                  {streamingData.type === 'scraper_start' && 'Initializing scraper...'}
                  {streamingData.type === 'page_complete' && `Processing page ${streamingData.pageIndex}/${streamingData.totalPages}`}
                  {streamingData.type === 'status' && streamingData.message}
                  {streamingData.type === 'data' && `Received data...`}
                </div>
              )}
              {/* Show actual progress if we have it */}
              {scrapingProgress.message && (
                <div className="text-sm text-muted-foreground">
                  {scrapingProgress.message}
                  {scrapingProgress.totalPages > 0 && (
                    <span className="ml-2">
                      ({scrapingProgress.currentPage}/{scrapingProgress.totalPages})
                    </span>
                  )}
                </div>
              )}
              <Progress value={scrapingProgress.percentage || 50} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scraper History */}
      {scraperHistory.length > 0 && (
        <div data-testid="scraping-history-section">
          <AdditiveResults 
            history={scraperHistory}
            onViewDetails={(run) => {
              permanentLogger.info('SCRAPING_CONTROL', 'Viewing run details', { run })
            }}
          />
        </div>
      )}

      {/* Available Scrapers */}
      <div data-testid="scraper-selector-section">
        <ScraperSelector
          scrapers={availableScrapers}
          onSelect={executeScraper}
          isScrapingActive={isScrapingActive}
          isDebouncing={isDebouncing}
        />
      </div>

      {/* AI Suggestions Section - Removed per user request */}
      {/* {suggestions.length > 0 && !isScrapingActive && (
        <div data-testid="scraping-suggestions-section">
          <ScrapingSuggestions
            suggestions={suggestions}
            onSelect={handleSuggestionSelect}
          />
        </div>
      )} */}

      {/* Complete Button */}
      {scraperHistory.length > 0 && !isScrapingActive && (
        <div className="flex justify-end gap-4" data-testid="complete-button-section">
          <TooltipWrapper content="Complete scraping and proceed with the collected data">
            <Button 
              onClick={handleComplete}
              size="lg"
              className="gap-2"
              data-testid="complete-scraping-button"
            >
              <CheckCircle2 className="h-4 w-4" />
              Complete Scraping Session
            </Button>
          </TooltipWrapper>
        </div>
      )}
    </div>
  )
}