import { useState } from 'react'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { persistentToast } from '@/lib/hooks/use-persistent-toast'

interface PhaseHandlerOptions {
  sessionId: string | null
  stageData: Record<string, any>
  setIsProcessing: (processing: boolean) => void
  onStageComplete: (stage: string, data: any) => void
}

export function usePhaseHandlers({
  sessionId,
  stageData,
  setIsProcessing,
  onStageComplete
}: PhaseHandlerOptions) {
  
  /**
   * Generic phase execution handler following DRY principles
   * Handles both streaming and regular JSON responses
   */
  const executePhase = async (
    phaseName: string,
    endpoint: string,
    payload: any,
    options: {
      streaming?: boolean
      onProgress?: (data: any) => void
      confirmCost?: string
      validateInput?: () => boolean | string
    } = {}
  ) => {
    // Entry logging
    permanentLogger.info('PHASE_HANDLER', `Starting ${phaseName} phase`, {
      sessionId,
      endpoint,
      payloadKeys: Object.keys(payload),
      streaming: options.streaming
    })

    // Input validation
    if (options.validateInput) {
      const validation = options.validateInput()
      if (validation !== true) {
        const errorMsg = typeof validation === 'string' ? validation : `Invalid input for ${phaseName}`
        permanentLogger.captureError('PHASE_HANDLER', new Error('Validation failed for ${phaseName}'), { errorMsg })
        persistentToast.error(errorMsg)
        return
      }
    }

    // Cost confirmation
    if (options.confirmCost) {
      const confirmed = confirm(`This will use AI and cost approximately ${options.confirmCost}. Continue?`)
      if (!confirmed) {
        permanentLogger.info('PHASE_HANDLER', `User cancelled ${phaseName} due to cost`)
        return
      }
    }

    setIsProcessing(true)
    permanentLogger.info('PHASE_HANDLER', `Processing started for ${phaseName}`)

    try {
      // Make API request
      permanentLogger.info('API', `Sending ${phaseName} request`, { endpoint, payload })
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',  // Include auth cookies
        body: JSON.stringify(payload)
      })

      permanentLogger.info('API', `Response received for ${phaseName}`, {
        status: response.status,
        contentType: response.headers.get('content-type')
      })

      // Handle streaming response
      if (options.streaming && response.headers.get('content-type')?.includes('text/event-stream')) {
        return await handleStreamingResponse(
          response,
          phaseName,
          options.onProgress,
          onStageComplete
        )
      }

      // Handle regular JSON response
      const result = await response.json()
      
      permanentLogger.info('API', `${phaseName} result parsed`, {
        success: result.success,
        hasData: !!result.data || !!result.result,
        error: result.error
      })

      if (result.success) {
        const data = result.result || result.data
        permanentLogger.info('PHASE_HANDLER', `${phaseName} completed successfully`, {
          dataKeys: data ? Object.keys(data) : []
        })
        
        onStageComplete(phaseName.toLowerCase().replace(' ', '-'), data)
        persistentToast.success(`${phaseName} completed successfully!`)
        return data
      } else {
        throw new Error(result.error || result.details || 'Unknown error')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      permanentLogger.captureError('PHASE_HANDLER', new Error('${phaseName} failed'), {
        error: errorMessage,
        phase: phaseName,
        sessionId
      })
      
      persistentToast.error(`${phaseName} failed: ${errorMessage}`)
      throw error
    } finally {
      setIsProcessing(false)
      permanentLogger.info('PHASE_HANDLER', `Processing ended for ${phaseName}`)
    }
  }

  /**
   * Handle streaming responses (for scraping phase)
   */
  const handleStreamingResponse = async (
    response: Response,
    phaseName: string,
    onProgress?: (data: any) => void,
    onComplete?: (stage: string, data: any) => void
  ) => {
    permanentLogger.info('STREAMING', `Starting stream processing for ${phaseName}`)
    
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let finalResult = null

    if (!reader) {
      throw new Error('No response body available for streaming')
    }

    while (true) {
      const { done, value } = await reader.read()
      
      if (done) {
        permanentLogger.info('STREAMING', `Stream completed for ${phaseName}`)
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6)
          if (jsonStr === '[DONE]') continue

          try {
            const data = JSON.parse(jsonStr)
            permanentLogger.info('STREAMING', `Progress update for ${phaseName}`, {
              type: data.type,
              phase: data.phase,
              progress: data.completedPages ? `${data.completedPages}/${data.totalPages}` : undefined
            })

            if (data.type === 'progress' && onProgress) {
              // Pass full progress data to the callback
              onProgress(data)
              
              // Add toast notifications for phase transitions
              if (data.phase && data.phases) {
                const currentPhaseInfo = data.phases.find((p: any) => p.status === 'in-progress')
                if (currentPhaseInfo) {
                  // Check if this is a new phase transition
                  const phaseNames = {
                    'rapid-scrape': '⚡ Rapid Scraping',
                    'validation': '🔍 Content Validation', 
                    'enhancement': '✨ Enhancement'
                  }
                  const phaseName = phaseNames[data.phase as keyof typeof phaseNames] || data.phase
                  
                  // Show toast for phase transitions
                  if (data.completedPages === 0 && data.phase === 'rapid-scrape') {
                    persistentToast.info(`Starting ${phaseName}: Processing ${data.totalPages} pages...`)
                  } else if (data.phase === 'validation' && data.completedPages === data.totalPages) {
                    persistentToast.info(`${phaseName}: Analyzing content quality...`)
                  } else if (data.phase === 'enhancement') {
                    const enhancementMatch = currentPhaseInfo.details?.match(/(\d+)\/(\d+)/)
                    if (enhancementMatch && enhancementMatch[1] === '0') {
                      persistentToast.info(`${phaseName}: Improving ${enhancementMatch[2]} pages with full rendering...`)
                    }
                  }
                }
              }
            } else if (data.type === 'complete') {
              finalResult = data.result
              permanentLogger.info('STREAMING', `Final result received for ${phaseName}`, {
                hasResult: !!finalResult,
                resultKeys: finalResult ? Object.keys(finalResult) : [],
                hasPagesKey: !!finalResult?.pages,
                pagesLength: finalResult?.pages?.length || 0,
                firstPageUrl: finalResult?.pages?.[0]?.url || 'none',
                rawDataType: data.type,
                rawResultType: typeof data.result
              })
              
              // Don't show toast here for scraping - it will be shown when user approves
              // This prevents duplicate toasts
            } else if (data.type === 'error') {
              permanentLogger.captureError('STREAMING', new Error('Error during ${phaseName}'), { error: data.error })
              persistentToast.error(`Error during ${phaseName}: ${data.error}`)
            }
          } catch (e) {
            permanentLogger.warn('STREAMING', 'Failed to parse streaming data', { error: e, line: jsonStr })
          }
        }
      }
    }

    // Validate scraping results before calling onComplete
    if (phaseName === 'Scraping' && finalResult) {
      permanentLogger.info('STREAMING', 'Validating scraping results', {
        hasFinalResult: !!finalResult,
        finalResultKeys: Object.keys(finalResult || { }),
        hasPagesProperty: 'pages' in (finalResult || {}),
        pagesType: Array.isArray(finalResult?.pages) ? 'array' : typeof finalResult?.pages,
        pagesLength: finalResult?.pages?.length || 0
      })
      
      // Check if scraping actually returned pages
      if (!finalResult.pages || finalResult.pages.length === 0) {
        permanentLogger.captureError('STREAMING', new Error('Scraping completed but no pages were retrieved'), {
          finalResult: JSON.stringify(finalResult).substring(0, 500),
          hasPages: !!finalResult.pages,
          pageCount: finalResult.pages?.length || 0,
          allKeys: Object.keys(finalResult || {})
        })
        // Don't show toast here - let the approval handler show the appropriate message
        // Still don't call onComplete for failed scraping
        return finalResult
      }
    }

    if (finalResult && onComplete) {
      permanentLogger.info('STREAMING', `Calling onComplete for ${phaseName}`)
      onComplete(phaseName.toLowerCase().replace(' ', '-'), finalResult)
    }

    return finalResult
  }

  /**
   * Specific phase handlers that use the generic executePhase
   */
  const startScraping = async (pages: string[], onProgress?: (data: any) => void) => {
    if (!sessionId) {
      permanentLogger.captureError('PHASE_HANDLER', new Error('No session found for scraping'))
      persistentToast.error('No session found. Please complete site analysis first.')
      return
    }

    if (!pages || pages.length === 0) {
      permanentLogger.captureError('PHASE_HANDLER', new Error('No pages provided for scraping'))
      persistentToast.error('No pages selected for scraping')
      return
    }

    permanentLogger.info('Initiating scraping', {
      category: 'PHASE_HANDLER',
      sessionId,
      pageCount: pages.length,
      pages: pages.slice(0, 5) // Log first 5 pages
    })

    // Get domain from stageData or extract from the first page URL as fallback
    let domain = stageData['site-analysis']?.domain
    
    if (!domain && pages && pages.length > 0) {
      // Extract domain from the first URL if not in stageData
      try {
        const firstUrl = pages[0]
        const url = new URL(firstUrl.startsWith('http') ? firstUrl : `https://${firstUrl}`)
        domain = url.hostname
        permanentLogger.info('PHASE_HANDLER', 'Domain extracted from URL', {
          extractedDomain: domain,
          fromUrl: firstUrl
        })
      } catch (e) {
        permanentLogger.captureError('PHASE_HANDLER', new Error('Failed to extract domain from URL'), {
          error: e instanceof Error ? e.message : 'Unknown error',
          pages: pages.slice(0, 3)
        })
      }
    }
    
    if (!domain) {
      permanentLogger.captureError('PHASE_HANDLER', new Error('No domain available for scraping'), {
        hasStageData: !!stageData['site-analysis'],
        stageDataKeys: stageData['site-analysis'] ? Object.keys(stageData['site-analysis']) : [],
        pageCount: pages.length
      })
      persistentToast.error('Domain information is missing. Please complete site analysis first.')
      return
    }

    // V4 Scraping - simpler format, just needs domain
    // Scraper will discover URLs automatically
    return executePhase(
      'Scraping',
      '/api/company-intelligence/v4/scrape',
      {
        domain,
        scraperType: 'playwright', // Default to free option
        config: {
          maxPages: 50,
          timeout: 60000
        }
      },
      {
        streaming: true,
        onProgress,
        validateInput: () => !!domain || 'Domain is required for scraping'
      }
    )
  }

  const startExtraction = async () => {
    permanentLogger.info('PHASE_HANDLER', 'Extraction phase not implemented in V4', {
      sessionId,
      hasScrapingData: !!stageData.scraping,
      scrapingDataCount: stageData.scraping?.pages?.length || 0
    })

    // V4 doesn't have separate extraction - it's part of scraping
    // This is a placeholder for now
    persistentToast.warning('Extraction is integrated into V4 scraping')
    return Promise.resolve()
  }

  const startEnrichment = async () => {
    const dataToEnrich = stageData['data-review']?.selectedData || stageData.extraction

    permanentLogger.info('PHASE_HANDLER', 'Enrichment not implemented in V4', {
      sessionId,
      hasData: !!dataToEnrich,
      dataKeys: dataToEnrich ? Object.keys(dataToEnrich) : []
    })

    // V4 doesn't have enrichment yet - disabled enrichers are in lib/company-intelligence/enrichers/
    persistentToast.warning('Enrichment features coming soon in V4')
    return Promise.resolve()
  }

  const startGeneration = async () => {
    permanentLogger.info('PHASE_HANDLER', 'Generation not implemented in V4', {
      sessionId,
      hasEnrichmentData: !!stageData.enrichment
    })

    // V4 focuses on scraping - generation will be re-added later
    persistentToast.warning('Document generation coming soon in V4')
    return Promise.resolve()
  }

  return {
    executePhase,
    startScraping,
    startExtraction,
    startEnrichment,
    startGeneration
  }
}