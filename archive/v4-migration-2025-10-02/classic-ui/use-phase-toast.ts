/**
 * @deprecated ARCHIVED 2025-10-02
 * This hook is part of the legacy Classic UI (PhaseControls).
 * Replaced by V4 ScrapingDashboard architecture.
 * 
 * @see archive/v4-migration-2025-10-02/MIGRATION_NOTES.md
 * Original: components/company-intelligence/hooks/use-phase-toast.ts
 */
import { useRef, useCallback } from 'react'
import { persistentToast } from '@/lib/hooks/use-persistent-toast'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { getDeduplicationService } from '@/lib/notifications/utils/deduplication-service'

interface ToastOptions {
  deduplicationWindow?: number // milliseconds
  logContext?: Record<string, any>
}

/**
 * Centralized toast management with deduplication and consistent messaging
 * Follows DRY principles to prevent duplicate toasts
 */
export function usePhaseToast() {
  // Use centralized deduplication service (DRY principle)
  const deduplicationService = getDeduplicationService()
  const toastHistory = useRef<string[]>([])

  /**
   * Get stage-specific success message with phase label
   */
  const getSuccessMessage = (stage: string, data?: any): string => {
    permanentLogger.info('TOAST', 'Generating success message', { stage, hasData: !!data})
    
    const phaseLabel = `[${stage.toUpperCase().replace('-', '_')}]`
    
    switch (stage) {
      case 'site-analysis':
        const techCount = data?.technologies ? 
          Object.values(data.technologies).flat().length : 0
        const siteType = data?.siteType || 'website'
        return `${phaseLabel} Site analysis complete! Detected ${siteType} with ${techCount} technologies identified`
      
      case 'sitemap':
        const pageCount = data?.length || data?.pages?.length || 0
        return `${phaseLabel} Sitemap discovered! Found ${pageCount} pages`
      
      case 'scraping':
        const scrapedCount = data?.pages?.length || 0
        return `${phaseLabel} Web scraping complete! Scraped ${scrapedCount} pages successfully`
      
      case 'extraction':
        const extractedTypes = data ? Object.keys(data).length : 0
        return `${phaseLabel} Data extraction complete! Extracted ${extractedTypes} data types`
      
      case 'data-review':
        return `${phaseLabel} Data review complete! Selected data for enrichment`
      
      case 'enrichment':
        const enrichmentCount = data?.enrichmentMetrics?.enrichersUsed?.length || 0
        return `${phaseLabel} AI enrichment complete! Applied ${enrichmentCount} enrichers`
      
      case 'generation':
        return `${phaseLabel} Document generation complete! Your documents are ready`
      
      default:
        return `${phaseLabel} ${stage.charAt(0).toUpperCase() + stage.slice(1)} complete!`
    }
  }

  /**
   * Get stage-specific error message with phase label
   */
  const getErrorMessage = (stage: string, error: string): string => {
    permanentLogger.info('TOAST', 'Generating error message', { stage, error})
    
    const phaseLabel = `[${stage.toUpperCase().replace('-', '_')}]`
    
    // Common error patterns with user-friendly messages
    if (error.includes('session')) {
      return `${phaseLabel} Session expired. Please refresh and try again`
    }
    if (error.includes('timeout')) {
      return `${phaseLabel} Operation timed out. The site may be slow to respond`
    }
    if (error.includes('network')) {
      return `${phaseLabel} Network error. Please check your connection`
    }
    if (error.includes('No pages')) {
      return `${phaseLabel} Please select pages before proceeding`
    }
    
    // Stage-specific error formatting with phase label
    switch (stage) {
      case 'site-analysis':
        return `${phaseLabel} Site analysis failed: ${error}`
      case 'sitemap':
        return `${phaseLabel} Sitemap discovery failed: ${error}`
      case 'scraping':
        return `${phaseLabel} Web scraping failed: ${error}`
      case 'extraction':
        return `${phaseLabel} Data extraction failed: ${error}`
      case 'enrichment':
        return `${phaseLabel} AI enrichment failed: ${error}`
      case 'generation':
        return `${phaseLabel} Document generation failed: ${error}`
      default:
        return `${phaseLabel} ${stage} failed: ${error}`
    }
  }

  /**
   * Show toast with deduplication
   */
  const showPhaseToast = useCallback((
    stage: string,
    data?: any,
    isError: boolean = false,
    options: ToastOptions = {}
  ) => {
    const { logContext = {} } = options
    
    // Generate message first
    const message = isError 
      ? getErrorMessage(stage, data)
      : getSuccessMessage(stage, data)
    
    // Use centralized deduplication service (DRY/SOLID)
    const deduplicationKey = deduplicationService.createKey(
      message,
      isError ? 'error' : 'success'
    )
    
    // Check for duplicate
    if (deduplicationService.isDuplicate(deduplicationKey)) {
      permanentLogger.info('TOAST', 'Duplicate toast suppressed by centralized service', {
        stage,
        message,
        deduplicationKey
      })
      return
    }
    
    // Log the toast
    permanentLogger.info('TOAST', 'Showing toast notification', {
      stage,
      isError,
      message,
      deduplicationKey,
      ...logContext })
    
    // Add to history (keep last 10)
    toastHistory.current.unshift(`${new Date().toISOString()}: ${message}`)
    if (toastHistory.current.length > 10) {
      toastHistory.current.pop()
    }
    
    // Show the toast
    if (isError) {
      persistentToast.error(message)
    } else {
      persistentToast.success(message)
    }
  }, [])

  /**
   * Show info toast (no deduplication)
   */
  const showInfoToast = useCallback((message: string, logContext?: Record<string, any>) => {
    permanentLogger.info('TOAST', 'Showing info toast', { message, ...logContext})
    persistentToast.info(message)
    
    // Add to history
    toastHistory.current.unshift(`${new Date().toISOString()}: [INFO] ${message}`)
    if (toastHistory.current.length > 10) {
      toastHistory.current.pop()
    }
  }, [])

  /**
   * Show loading toast
   */
  const showLoadingToast = useCallback((message: string, logContext?: Record<string, any>) => {
    permanentLogger.info('TOAST', 'Showing loading toast', { message, ...logContext})
    return persistentToast.loading(message)
  }, [])

  /**
   * Clear all toasts
   */
  const clearAllToasts = useCallback(() => {
    permanentLogger.info('TOAST', 'Clearing all toasts')
    persistentToast.dismiss()
  }, [])

  /**
   * Reset deduplication cache
   */
  const resetDeduplication = useCallback(() => {
    permanentLogger.info('TOAST', 'Resetting centralized deduplication cache')
    deduplicationService.clear()
  }, [])

  /**
   * Get toast history for debugging
   */
  const getToastHistory = useCallback(() => {
    return [...toastHistory.current]
  }, [])

  return {
    showPhaseToast,
    showInfoToast,
    showLoadingToast,
    clearAllToasts,
    resetDeduplication,
    getToastHistory
  }
}