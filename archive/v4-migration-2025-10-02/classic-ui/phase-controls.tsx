/**
 * @deprecated ARCHIVED 2025-10-02
 *
 * This component is part of the legacy Classic UI (PhaseControls).
 * Replaced by V4 ScrapingDashboard architecture.
 *
 * Reasons for deprecation:
 * - God component anti-pattern (919 lines, exceeds 500-line limit)
 * - Mixed responsibilities (violates Single Responsibility Principle)
 * - Stale closure bugs in domain synchronization
 * - No API versioning (mixed v3/legacy endpoints)
 * - Poor performance compared to V4 modular approach
 *
 * Migration Path:
 * - All functionality moved to /api/company-intelligence/v4/* routes
 * - New UI: components/company-intelligence/scraping-dashboard/
 * - Uses modern SSE streaming instead of polling
 * - Proper separation of concerns (Analysis → Scraping → Selection → Enrichment)
 *
 * @see v4-scraper-migration-plan-28th-sept-stu.md
 * @see archive/v4-migration-2025-10-02/MIGRATION_NOTES.md
 * @see components/company-intelligence/scraping-dashboard/index.tsx (replacement)
 *
 * Original file location: components/company-intelligence/phase-controls.tsx
 * Archived: 2025-10-02
 * Last active commit: feat/add-visualization-libraries
 */

// Original file content preserved below for reference
// DO NOT USE IN PRODUCTION - This is archived code only

'use client'

import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'

// Custom hooks
import { useStageNavigation, Stage, UI_TO_DB_STAGE_MAP, STAGE_TO_FIELD_MAP, STAGE_TO_NESTED_PATH } from './hooks/use-stage-navigation'
import { usePhaseState } from './hooks/use-phase-state'
import { usePhaseHandlers } from './hooks/use-phase-handlers'
import { usePhaseToast } from './hooks/use-phase-toast'
import { usePersistentToast } from '@/lib/hooks/use-persistent-toast'

// Always loaded components (small, frequently used)
import { PersistentActionBar } from './persistent-action-bar'
import { StageActionBar } from './stage-action-bar'
import { TooltipWrapper } from './tooltip-wrapper'

// Lazy load heavy phase components - only load when stage is active
// This reduces initial bundle by ~2MB
const SiteAnalyzer = lazy(() =>
  import('./site-analyzer').then(mod => ({ default: mod.SiteAnalyzer }))
)

const SitemapSelector = lazy(() =>
  import('./sitemap-selector').then(mod => ({ default: mod.SitemapSelector }))
)

// ScrapingControl is the heaviest component (1015 lines)
const ScrapingControl = lazy(() =>
  import('./additive/scraping-control').then(mod => ({ default: mod.ScrapingControl }))
)

const DataReviewPanel = lazy(() =>
  import('./data-review/DataReviewPanel').then(mod => ({ default: mod.DataReviewPanel }))
)

const CorporateStructureDetector = lazy(() =>
  import('./corporate-structure-detector').then(mod => ({ default: mod.CorporateStructureDetector }))
)

// TODO: Create these components
// const ProgressCard = lazy(() => import('./progress-card').then(mod => ({ default: mod.ProgressCard })))
// const GenerationManager = lazy(() => import('./generation-manager').then(mod => ({ default: mod.GenerationManager })))

interface PhaseControlsProps {
  domain: string
  onPhaseComplete?: (phase: string, data: any) => void
  hideProgressCard?: boolean
  onReset?: () => void
  onSessionCreated?: (sessionId: string) => void
}

/**
 * Refactored Phase Controls Component
 * Reduced from 1398 lines to ~400 lines using DRY principles
 */
export function PhaseControls({
  domain,
  onPhaseComplete,
  hideProgressCard = false,
  onReset,
  onSessionCreated
}: PhaseControlsProps) {
  permanentLogger.info('PHASE_CONTROLS', 'Component initialized', { domain, hideProgressCard })

  // Navigation state
  const {
    currentStage,
    currentStageInfo,
    completedStages,
    isTransitioning,
    markStageCompleted,
    proceedToNextStage,
    goToPreviousStage,
    resetNavigation,
    STAGES
  } = useStageNavigation()

  // Phase data state
  const {
    domain: phaseStateDomain,
    sessionId,
    initializeDomain,
    fetchSession,
    stageData,
    setStageDataForStage,
    getStageData,
    clearAllStageData,
    isProcessing,
    setIsProcessing
  } = usePhaseState()

  // Toast management
  const { showPhaseToast, showInfoToast } = usePhaseToast()
  const persistentToast = usePersistentToast()

  // Phase handlers
  const phaseHandlers = usePhaseHandlers({
    sessionId,
    stageData,
    setIsProcessing,
    onStageComplete: (stage: string, data: any) => {
      permanentLogger.info('PHASE_CONTROLS', 'Stage complete callback triggered', {
        stage,
        hasData: !!data,
        dataKeys: data ? Object.keys(data) : []
      })
      
      // For scraping, just store data without marking complete - wait for user approval
      if (stage === 'scraping') {
        permanentLogger.info('PHASE_CONTROLS', 'Scraping data received, storing without auto-complete', {
          pagesCount: data?.pages?.length || 0
        })
        setStageDataForStage('scraping', data)
        setIsProcessing(false)
        // Don't call handleStageComplete yet - user must approve
      } else {
        // For other stages, use standard completion flow
        handleStageComplete(stage as Stage, data)
      }
    }
  })

  // Additional state
  const [showCorporateDetector, setShowCorporateDetector] = useState(false)
  const [corporateStructure, setCorporateStructure] = useState<any>(null)
  const [isSitemapDiscovering, setIsSitemapDiscovering] = useState(false)
  const [isEnhancingScraping, setIsEnhancingScraping] = useState(false)

  // Sitemap selection tracking for proper database-first flow
  const [sitemapReady, setSitemapReady] = useState(false)
  const [sitemapCount, setSitemapCount] = useState(0)
  const [pendingSitemapData, setPendingSitemapData] = useState<any[] | null>(null)
  const [scrapingProgress, setScrapingProgress] = useState({
    totalPages: 0,
    completedPages: 0,
    currentPhase: 'rapid-scrape' as any,
    phases: [] as any[],
    validationScore: undefined as number | undefined,
    enhancementCount: 0,
    scraperType: 'cheerio' as any,
    estimatedTimeRemaining: undefined as number | undefined,
    detectedTechnology: undefined as string | undefined,
    strategyReason: undefined as string | undefined
  })

  // REMOVED: Debug logging that was used for troubleshooting

  /**
   * Helper function to safely fetch session data
   * Centralizes null checks and error handling (DRY principle)
   */
  const fetchSessionData = useCallback(async () => {
    // Guard against invalid sessionId
    if (!sessionId || sessionId === 'null' || sessionId === 'undefined') {
      permanentLogger.debug('PHASE_CONTROLS', 'Skipping session fetch - no valid sessionId', { sessionId })
      return null
    }

    try {
      const response = await fetch(`/api/company-intelligence/sessions/${sessionId}`, {
        credentials: 'include'  // Include auth cookies
      })
      if (!response.ok) {
        permanentLogger.warn('PHASE_CONTROLS', 'Failed to fetch session', {
          status: response.status,
          sessionId
        })
        return null
      }

      const data = await response.json()
      return data.session || data
    } catch (error) {
      permanentLogger.captureError('PHASE_CONTROLS', new Error('Session fetch failed'), {
        error,
        sessionId
      })
      return null
    }
  }, [sessionId])

  /**
   * Helper to check if sessionId is valid
   */
  const isValidSessionId = useCallback((id: string | null | undefined): boolean => {
    return !!(id && id !== 'null' && id !== 'undefined')
  }, [])

  /**
   * Initialize domain on mount
   * INCLUDES CLEANUP AND DEBOUNCING to prevent race conditions
   */
  useEffect(() => {
    // Setup cleanup tracking
    const abortController = new AbortController()
    let mounted = true
    let timeoutId: NodeJS.Timeout | null = null

    if (domain && domain !== phaseStateDomain) {
      permanentLogger.info('PHASE_CONTROLS', 'Initializing domain (with debounce)', { domain })

      // Wrap async operations with debounce
      const initializeAsync = async () => {
        try {
          // Check if component is still mounted
          if (!mounted) {
            permanentLogger.info('PHASE_CONTROLS', 'Component unmounted, skipping initialization')
            return
          }

          initializeDomain(domain)

          // Fetch session from server after domain is set
          const result = await fetchSession(domain)

          // Only process result if still mounted
          if (!mounted) {
            permanentLogger.info('PHASE_CONTROLS', 'Component unmounted, skipping state update')
            return
          }

        } catch (error) {
          // Only handle error if still mounted and not aborted
          if (!abortController.signal.aborted && mounted) {
            permanentLogger.captureError('PHASE_CONTROLS', new Error('Failed to initialize domain or fetch session'), { error })
            showPhaseToast('initialization', error instanceof Error ? error.message : 'Failed to initialize', true)
          }
        }
      }

      // DEBOUNCE: Wait 100ms before executing to batch rapid changes
      timeoutId = setTimeout(initializeAsync, 100)
    }

    // CLEANUP: Cancel operations on unmount or dependency change
    return () => {
      mounted = false
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      abortController.abort()
    }
  }, [domain, phaseStateDomain, initializeDomain, fetchSession, showPhaseToast])

  /**
   * Notify parent when sessionId is set
   */
  useEffect(() => {
    if (sessionId && onSessionCreated) {
      permanentLogger.info('PHASE_CONTROLS', 'Session created by server', { sessionId })
      onSessionCreated(sessionId)
    }
  }, [sessionId, onSessionCreated])


  /**
   * Handle stage completion with bulletproof database integration
   */
  async function handleStageComplete(stage: Stage, data: any, autoProgress: boolean = false) {
    // Step 1: Log with breadcrumbs for debugging (12-year-old readable)
    permanentLogger.breadcrumb('STAGE_COMPLETE', 'Starting stage completion', {
      stage,
      hasData: !!data,
      timestamp: Date.now()
    })
    
    permanentLogger.info('PHASE_CONTROLS', 'Stage completed', {
      stage,
      hasData: !!data,
      dataKeys: data ? Object.keys(data) : [],
      autoProgress
    })

    // Store stage data
    setStageDataForStage(stage, data)
    
    // Mark stage as completed
    markStageCompleted(stage)
    
    // Step 2: Determine where to store the data
    const fieldName = STAGE_TO_FIELD_MAP[stage]
    const nestedPath = STAGE_TO_NESTED_PATH[stage]
    
    // Step 3: Prepare the update payload
    let updatePayload: any = {}
    
    if (stage === 'sitemap') {
      // Special case: Sitemap saves to merged_data.site_analysis ONLY (single source of truth)
      const rawData = Array.isArray(data) ? data : (data.urls || data)

      // Count URLs for logging
      const urlCount = rawData.filter((item: any) => {
        if (typeof item === 'string') return true
        if (item && typeof item === 'object' && item.url) return true
        return false
      }).length

      permanentLogger.info('STAGE_COMPLETE', 'Processing sitemap data', {
        pageCount: rawData.length,
        urlCount,
        sampleUrls: rawData.slice(0, 3).map((item: any) =>
          typeof item === 'string' ? item : item?.url
        ).filter(Boolean)
      })

      // Get current merged_data to preserve existing data
      let currentMergedData = {}
      const sessionData = await fetchSessionData()
      if (sessionData) {
        currentMergedData = sessionData.merged_data || {}
      }

      updatePayload = {
        phase: 2,  // Progress to phase 2 after sitemap
        merged_data: {
          ...currentMergedData,
          site_analysis: {  // Save full page data to merged_data (single source of truth)
            ...currentMergedData.site_analysis,
            sitemap_pages: rawData,  // Store full SitemapPage objects here
            urlCount,
            timestamp: Date.now(),
            source: 'sitemap_discovery'
          }
        }
      }

      permanentLogger.info('STAGE_COMPLETE', 'Saving sitemap data to merged_data (single source of truth)', {
        urlCount,
        sessionId
      })
    } else {
      // All other data goes into merged_data with nested path
      // First, get current session to preserve existing data
      let currentMergedData = {}
      const sessionData = await fetchSessionData()
      if (sessionData) {
        currentMergedData = sessionData.merged_data || {}
      }

      // Merge new data into the correct nested path
      updatePayload = {
        merged_data: {
          ...currentMergedData,
          [nestedPath]: data,
          stats: {
            ...(currentMergedData.stats || {}),
            lastUpdated: Date.now(),
            [`${stage}Completed`]: true
          }
        }
      }

      permanentLogger.info('STAGE_COMPLETE', 'Updating merged_data', {
        stage,
        nestedPath,
        dataKeys: Object.keys(data || {})
      })
    }

    // Step 4: Send update to database with retry logic (bulletproof)
    if (isValidSessionId(sessionId) && updatePayload) {
      let retries = 3
      while (retries > 0) {
        try {
          const response = await fetch(`/api/company-intelligence/sessions/${sessionId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',  // Include auth cookies
            body: JSON.stringify(updatePayload)
          })
          
          if (response.ok) {
            permanentLogger.info('STAGE_COMPLETE', 'Successfully updated database', {
              stage,
              sessionId,
              timing: permanentLogger.getTimings()
            })
            break
          } else {
            const errorText = await response.text()
            throw new Error(`Update failed: ${response.status} - ${errorText}`)
          }
        } catch (error) {
          retries--
          // Use permanentLogger.captureError for proper error tracking
          permanentLogger.captureError(
            'STAGE_COMPLETE',
            error instanceof Error ? error : new Error(String(error)),
            {
              retriesLeft: retries,
              stage,
              sessionId
            }
          )

          if (retries === 0) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            showPhaseToast(stage, `Failed to save ${stage} data: ${errorMessage}`, true)
            throw error
          }
          
          // Exponential backoff: 1s, 2s, 3s
          await new Promise(r => setTimeout(r, 1000 * (4 - retries)))
        }
      }
    }

    // Show success toast
    showPhaseToast(stage, data)
    
    // Call parent callback
    if (onPhaseComplete) {
      onPhaseComplete(stage, data)
    }
    
    // Auto-progress to next stage if specified
    if (autoProgress && stage !== 'scraping') {
      proceedToNextStage()
    }
  }

  /**
   * Handle streaming response from scraping API
   */
  const handleScrapingStream = async (response: Response) => {
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    
    if (!reader) {
      throw new Error('No response body')
    }
    
    let buffer = ''
    
    try {
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break
        
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              // Update progress based on event type
              if (data.type === 'progress' || data.type === 'phase-update') {
                // SSEEventFactory stores progress info in data.data for progress events
                const progressData = data.data || data
                const metadata = data.metadata || {}
                
                setScrapingProgress(prev => ({
                  ...prev,
                  totalPages: progressData.total || progressData.totalPages || metadata.totalPages || prev.totalPages,
                  completedPages: progressData.current || progressData.completedPages || metadata.completedPages || prev.completedPages,
                  currentPhase: progressData.phase || metadata.phase || prev.currentPhase,
                  phases: progressData.phases || metadata.phases || prev.phases,
                  validationScore: progressData.validationScore ?? metadata.validationScore ?? prev.validationScore,
                  enhancementCount: progressData.enhancementCount ?? metadata.enhancementCount ?? prev.enhancementCount,
                  scraperType: metadata.scraperType || progressData.scraperType || prev.scraperType,
                  detectedTechnology: metadata.technology || progressData.technology || prev.detectedTechnology,
                  strategyReason: metadata.strategyReason || progressData.strategyReason || prev.strategyReason
                }))
              } else if (data.type === 'complete') {
                // Update stage data with complete results
                // SSEEventFactory stores result in data.data for complete events
                const result = data.data || data.result || data
                if (result && (result.pages || result.result)) {
                  setStageDataForStage('scraping', result.result || result)
                  setIsProcessing(false)
                  setIsEnhancingScraping(false)
                  persistentToast.success('Scraping completed successfully')
                }
              } else if (data.type === 'error') {
                // SSEEventFactory stores error message in data.data.message
                const errorMessage = data.data?.message || data.message || 'Scraping failed'
                throw new Error(errorMessage)
              }
            } catch (e) {
              permanentLogger.warn('PHASE_CONTROLS', 'Failed to parse SSE data', { line, error: e })
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  /**
   * Handle approve action based on current stage
   */
  const handleApprove = useCallback(async () => {
    permanentLogger.info('PHASE_CONTROLS', 'Approve clicked', { currentStage })

    switch (currentStage) {
      case 'site-analysis':
        if (stageData['site-analysis']) {
          handleStageComplete('site-analysis', stageData['site-analysis'])
          proceedToNextStage()
        } else {
          showPhaseToast('site-analysis', 'Please complete site analysis first', true)
        }
        break

      case 'sitemap':
        // Use the pending sitemap data that was collected when user selected pages
        if (pendingSitemapData && pendingSitemapData.length > 0) {
          permanentLogger.info('PHASE_CONTROLS', 'Sitemap approved, saving to database', {
            pageCount: pendingSitemapData.length,
            sessionId
          })

          // Save to database first (this will write to Supabase)
          await handleStageComplete('sitemap', pendingSitemapData)

          // Clear the pending data
          setPendingSitemapData(null)

          // Proceed to scraping stage
          proceedToNextStage()

          // ScrapingControl will read from database when it mounts
        } else {
          showPhaseToast('sitemap', 'Please select pages before approving', true)
        }
        break

      case 'scraping':
        // Scraping is handled by ScrapingControl component
        // It has its own completion flow
        showInfoToast('Use the scraping control panel to manage scraping')
        break

      case 'extraction':
        if (stageData['extraction']) {
          proceedToNextStage()
        } else {
          await phaseHandlers.startExtraction()
        }
        break

      case 'enrichment':
        if (stageData['enrichment']) {
          proceedToNextStage()
        } else {
          await phaseHandlers.startEnrichment()
        }
        break

      case 'generation':
        if (stageData['generation']) {
          showInfoToast('Documents already generated')
        } else {
          await phaseHandlers.startGeneration()
        }
        break
    }
  }, [
    currentStage, 
    stageData, 
    handleStageComplete, 
    proceedToNextStage,
    phaseHandlers,
    showPhaseToast,
    showInfoToast
  ])

  /**
   * Get approve button text based on current stage
   */
  const getApproveButtonText = (): string => {

    switch (currentStage) {
      case 'site-analysis':
        return 'Approve & Continue'

      case 'sitemap':
        return isSitemapDiscovering ? 'Discovering...' :
               sitemapReady && sitemapCount > 0 ?
               `Approve Sitemap Discovery (${sitemapCount} pages)` :
               'Waiting for selection...'
      
      case 'scraping':
        if (isProcessing) return 'Scraping in progress...'
        if (isEnhancingScraping) return 'Enhancing content...'
        if (stageData['scraping']?.pages?.length > 0) return 'Accept Results & Continue'
        if (stageData['scraping']) return 'Scraping failed - no pages retrieved'
        return 'Waiting for scraping to complete'
      
      case 'extraction':
        return isProcessing ? 'Extracting...' : 'Start Extraction'
      
      case 'enrichment':
        return isProcessing ? 'Enriching...' : 'Start AI Enrichment'
      
      case 'generation':
        return isProcessing ? 'Generating...' : 'Generate Documents'
      
      default:
        return 'Approve & Continue'
    }
  }

  /**
   * Check if approve button should be disabled
   */
  const isApproveDisabled = (): boolean => {
    if (isProcessing) return true
    
    switch (currentStage) {
      case 'site-analysis':
        return !stageData['site-analysis']
      case 'sitemap':
        return !sitemapReady || sitemapCount === 0
      case 'scraping':
        return !stageData['scraping'] || stageData['scraping']?.pages?.length === 0 // Disabled until scraping completes with pages
      case 'extraction':
        return false // Can always start extraction if we have scraping data
      case 'enrichment':
        return false // Can always start enrichment if we have extraction data
      case 'generation':
        return false // Can always start generation if we have enrichment data
      default:
        return false
    }
  }

  /**
   * Handle reset
   */
  const handleReset = async () => {
    permanentLogger.info('PHASE_CONTROLS', 'Resetting all phase data and cleaning up')

    // Clear client-side state
    clearAllStageData()
    resetNavigation()
    setCorporateStructure(null)
    setShowCorporateDetector(false)

    // Clear database phase data and cache if session exists
    if (isValidSessionId(sessionId)) {
      try {
        permanentLogger.info('PHASE_CONTROLS', 'Clearing database phase data', { sessionId })

        // Call API to clear all phase data from database
        const response = await fetch(`/api/company-intelligence/sessions/${sessionId}/phase-data`, {
          method: 'DELETE',
          credentials: 'include'  // Include auth cookies
        })

        if (!response.ok) {
          permanentLogger.warn('PHASE_CONTROLS', 'Failed to clear database phase data', {
            status: response.status
          })
        } else {
          const result = await response.json()
          permanentLogger.info('PHASE_CONTROLS', 'Database phase data cleared', {
            stagesDeleted: result.stagesDeleted
          })
        }
      } catch (error) {
        permanentLogger.captureError('PHASE_CONTROLS', new Error('Error clearing database phase data'), {
          error,
          sessionId
        })
      }
    }

    showInfoToast('Reset to initial state - all data cleared')

    if (onReset) {
      onReset()
    }
  }

  permanentLogger.info('PHASE_CONTROLS', 'Render cycle', {
    currentStage,
    completedStages: Array.from(completedStages),
    isProcessing,
    hasSessionId: !!sessionId
  })

  return (
    <div className="space-y-6">
      {/* Progress Card - TODO: Create this component */}
      {/* {!hideProgressCard && (
        <ProgressCard
          currentStage={currentStage}
          completedStages={completedStages}
          stages={STAGES}
        />
      )} */}

      {/* Navigation Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {currentStage !== 'site-analysis' && (
              <TooltipWrapper content="Go back to previous stage">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToPreviousStage}
                  disabled={isProcessing}
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              </TooltipWrapper>
            )}
            <h2 className="text-lg font-semibold">
              {currentStageInfo.icon} {currentStageInfo.label}
            </h2>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Step {STAGES.findIndex(s => s.id === currentStage) + 1} of {STAGES.length}
          </div>
        </div>
      </Card>

      {/* Stage Content */}
      <div className="space-y-4">
        {currentStage === 'site-analysis' && (
          <>
            <Suspense fallback={
              <div className="animate-pulse">
                <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
              </div>
            }>
              <SiteAnalyzer
                domain={domain}
                onAnalysisComplete={(data) => {
                  setStageDataForStage('site-analysis', data)
                  if (data.siteType?.includes('corporate')) {
                    setShowCorporateDetector(true)
                  }
                }}
                sessionId={sessionId}
              />
            </Suspense>
            
            {completedStages.has('site-analysis') && stageData['site-analysis'] && !showCorporateDetector && (
              <StageActionBar
                stage="site-analysis"
                onApprove={() => {
                  proceedToNextStage()
                }}
              />
            )}
            
            {showCorporateDetector && (
              <Suspense fallback={
                <div className="animate-pulse">
                  <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                  </div>
                </div>
              }>
                <CorporateStructureDetector
                  domain={domain}
                  siteAnalysis={stageData['site-analysis']}
                  onDetectionComplete={(structure) => {
                    setCorporateStructure(structure)
                    setShowCorporateDetector(false)
                    proceedToNextStage()
                  }}
                />
              </Suspense>
            )}
          </>
        )}

        {currentStage === 'sitemap' && domain && (
          <Suspense fallback={
            <div className="animate-pulse">
              <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4" />
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
                  ))}
                </div>
              </div>
            </div>
          }>
            <SitemapSelector
              domain={domain}
              onComplete={async (selectedPages) => {
                // Store complete page objects for when user approves
                setPendingSitemapData(selectedPages)

                // Update state for button text
                setSitemapReady(selectedPages.length > 0)
                setSitemapCount(selectedPages.length)

                permanentLogger.info('PHASE_CONTROLS', 'Sitemap pages selected, waiting for approval', {
                  pageCount: selectedPages.length,
                  sessionId
                })

                setIsSitemapDiscovering(false)
              }}
              onError={(error) => {
                permanentLogger.captureError('PHASE_CONTROLS', error, {
                  message: 'Sitemap discovery error',
                  sessionId
                })

                // Show error to user
                showPhaseToast('Discovery Error', 'error')

                setIsSitemapDiscovering(false)
              }}
            />
          </Suspense>
        )}

        {currentStage === 'scraping' && (
          <Suspense fallback={
            <div className="animate-pulse">
              <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                <div className="text-center">
                  <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto mb-2" />
                  <div className="text-sm text-gray-500">Loading scraping control...</div>
                </div>
              </div>
            </div>
          }>
            <ScrapingControl
              domain={domain || ''}
              sessionId={sessionId || ''}
              // No selectedPages - scraper gets URLs from database
              onComplete={(data) => {
                permanentLogger.info('PHASE_CONTROLS', 'Scraping session completed', data)

                // Store the scraping data and mark stage complete
                setStageDataForStage('scraping', data)
                handleStageComplete('scraping', data)

                // Auto-proceed to next stage
                proceedToNextStage()
              }}
            />
          </Suspense>
        )}

        {currentStage === 'data-review' && (
          <Suspense fallback={
            <div className="animate-pulse">
              <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4" />
                <div className="grid grid-cols-3 gap-4">
                  <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              </div>
            </div>
          }>
            <DataReviewPanel
              extractedData={stageData['extraction']}
              onProceed={(selectedData) => {
                setStageDataForStage('data-review', { selectedData })
                proceedToNextStage()
              }}
            />
          </Suspense>
        )}

        {/* Generation Manager - TODO: Create this component */}
        {/* {currentStage === 'generation' && stageData.generation && (
          <GenerationManager
            generatedDocuments={stageData.generation}
            projectDetails={{
              domain: sessionData?.domain || domain,
              sessionId: sessionId || ''
            }}
          />
        )} */}
      </div>

      {/* Persistent Action Bar */}
      <PersistentActionBar
        currentStage={currentStage}
        stageLabel={currentStageInfo.label}
        onApprove={handleApprove}
        onReject={() => {
          permanentLogger.info('PHASE_CONTROLS', 'Reject action triggered')
          handleReset()
        }}
        onGoBack={currentStage === 'site-analysis' ? handleReset : goToPreviousStage}
        isProcessing={isProcessing}
        approveDisabled={isApproveDisabled()}
        approveText={getApproveButtonText()}
        additionalInfo={
          currentStage === 'sitemap' && stageData['sitemap']
            ? `for ${stageData['sitemap'].length} pages` 
            : undefined
        }
      />
    </div>
  )
}