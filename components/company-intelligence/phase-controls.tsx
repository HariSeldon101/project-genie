'use client'

import React, { useState, useEffect, useCallback } from 'react'
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

// Phase components
import { SiteAnalyzer } from './site-analyzer'
import { SitemapSelector } from './sitemap-selector'
import { ScrapingControl } from './additive/scraping-control'
import { DataReviewPanel } from './data-review/DataReviewPanel'
import { PersistentActionBar } from './persistent-action-bar'
import { StageActionBar } from './stage-action-bar'
// import { ProgressCard } from './progress-card' // TODO: Create this component
// import { GenerationManager } from './generation-manager' // TODO: Create this component
import { CorporateStructureDetector } from './corporate-structure-detector'
import { TooltipWrapper } from './tooltip-wrapper'

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
    sessionId,
    sessionData,
    initializeSession,
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
   * Initialize session on mount
   */
  useEffect(() => {
    if (domain && !sessionId) {
      permanentLogger.info('PHASE_CONTROLS', 'Initializing session for domain', { domain })
      initializeSession(domain)
        .then((newSessionId) => {
          if (newSessionId && onSessionCreated) {
            onSessionCreated(newSessionId)
          }
        })
        .catch(error => {
          permanentLogger.captureError('PHASE_CONTROLS', new Error('Failed to initialize session'), { error })
          showPhaseToast('initialization', error.message, true)
        })
    }
  }, [domain, sessionId, initializeSession, showPhaseToast, onSessionCreated])


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
      try {
        const sessionResponse = await fetch(`/api/company-intelligence/sessions/${sessionId}`)
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json()
          currentMergedData = sessionData.session?.merged_data || {}
        }
      } catch (error) {
        permanentLogger.captureError('STAGE_COMPLETE', new Error('Failed to fetch current session'), { error })
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
      try {
        const sessionResponse = await fetch(`/api/company-intelligence/sessions/${sessionId}`)
        let currentMergedData = {}
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json()
          currentMergedData = sessionData.session?.merged_data || {}
        }
        
        // Merge new data into the correct nested path
        updatePayload = {
          merged_data: {
            ...currentMergedData,
            [nestedPath]: data,
            stats: {
              ...currentMergedData.stats,
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
      } catch (error) {
        permanentLogger.captureError('STAGE_COMPLETE', new Error('Failed to get current session data'), { error })
        // Fallback: create new structure
        updatePayload = {
          merged_data: {
            [nestedPath]: data,
            stats: {
              lastUpdated: Date.now(),
              [`${stage}Completed`]: true
            }
          }
        }
      }
    }
    
    // Step 4: Send update to database with retry logic (bulletproof)
    if (sessionId) {
      let retries = 3
      while (retries > 0) {
        try {
          const response = await fetch(`/api/company-intelligence/sessions/${sessionId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
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
        if (stageData.extraction) {
          proceedToNextStage()
        } else {
          await phaseHandlers.startExtraction()
        }
        break

      case 'enrichment':
        if (stageData.enrichment) {
          proceedToNextStage()
        } else {
          await phaseHandlers.startEnrichment()
        }
        break

      case 'generation':
        if (stageData.generation) {
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
        if (stageData.scraping?.pages?.length > 0) return 'Accept Results & Continue'
        if (stageData.scraping) return 'Scraping failed - no pages retrieved'
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
        return !stageData.scraping || stageData.scraping?.pages?.length === 0 // Disabled until scraping completes with pages
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
    if (sessionId) {
      try {
        permanentLogger.info('PHASE_CONTROLS', 'Clearing database phase data', { sessionId })

        // Call API to clear all phase data from database
        const response = await fetch(`/api/company-intelligence/sessions/${sessionId}/phase-data`, {
          method: 'DELETE'
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
            
            {completedStages.has('site-analysis') && stageData['site-analysis'] && !showCorporateDetector && (
              <StageActionBar
                stage="site-analysis"
                onApprove={() => {
                  proceedToNextStage()
                }}
              />
            )}
            
            {showCorporateDetector && (
              <CorporateStructureDetector
                domain={domain}
                siteAnalysis={stageData['site-analysis']}
                onDetectionComplete={(structure) => {
                  setCorporateStructure(structure)
                  setShowCorporateDetector(false)
                  proceedToNextStage()
                }}
              />
            )}
          </>
        )}

        {currentStage === 'sitemap' && sessionId && (
          <SitemapSelector
            companyId={domain} // Using domain as companyId for now
            sessionId={sessionId}
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
        )}

        {currentStage === 'scraping' && (
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
        )}

        {currentStage === 'data-review' && (
          <DataReviewPanel
            extractedData={stageData.extraction}
            onProceed={(selectedData) => {
              setStageDataForStage('data-review', { selectedData })
              proceedToNextStage()
            }}
          />
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
          currentStage === 'sitemap' && stageData.sitemap 
            ? `for ${stageData.sitemap.length} pages` 
            : undefined
        }
      />
    </div>
  )
}