/**
 * Main sitemap selector container component
 * Orchestrates all sub-components and hooks
 * Database-first architecture - no domains from UI
 *
 * CRITICAL: No mock data, no fallbacks
 * All errors are thrown and logged
 * Uses unified event system
 */

import React, { useCallback, useRef, useEffect } from 'react'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { safeTimestampToISO } from '@/lib/utils/safe-timestamp'
import { useDiscoveryStream } from './hooks/use-discovery-stream'
import { usePageSelection } from './hooks/use-page-selection'
import { DiscoveryHeader } from './components/discovery-header'
import { SelectionControls } from './components/selection-controls'
import { PageList } from './components/page-list'
import { DiscoveryPhases } from './components/discovery-phases'
import type { SitemapSelectorProps } from './types'

/**
 * Main sitemap selector component
 * Follows Single Responsibility Principle - only orchestrates
 */
export const SitemapSelector: React.FC<SitemapSelectorProps> = ({
  companyId,
  sessionId,
  onComplete,
  onError,
  className
}) => {
  // Track component lifecycle timing
  const startTime = useRef(performance.now())
  const hasError = useRef(false)

  // Log component mount
  useEffect(() => {
    permanentLogger.info('SITEMAP_SELECTOR', 'Component mounted', {
      companyId,
      sessionId,
      timestamp: safeTimestampToISO(Date.now())
    })

    // Cleanup on unmount
    return () => {
      const duration = performance.now() - startTime.current
      permanentLogger.info('SITEMAP_SELECTOR', 'Component unmounting', {
        duration,
        hadError: hasError.current
      })
    }
  }, [companyId, sessionId])

  // Initialize discovery stream - database-first, no domain
  const { pages, state } = useDiscoveryStream(companyId, sessionId)

  // Initialize selection management
  const {
    selectedIds,
    selectionMode,
    toggleSelection,
    selectAll,
    clearSelection,
    selectByCategory,
    invertSelection
  } = usePageSelection(pages)

  /**
   * Handle completion - sends database IDs only
   * NO URLs passed from UI - database-first architecture
   */
  const handleComplete = useCallback(async () => {
    const duration = performance.now() - startTime.current

    try {
      // Validate selection - NO fallback data
      if (selectedIds.size === 0) {
        throw new Error('No pages selected for processing')
      }

      // Breadcrumb at completion boundary
      permanentLogger.info('SITEMAP_SELECTOR', 'Completing page selection', {
        selectedCount: selectedIds.size,
        totalPages: pages.length,
        selectionMode,
        duration,
        timestamp: safeTimestampToISO(Date.now())
      })

      // Send complete page objects to parent (not just IDs)
      // This ensures URLs and metadata are preserved
      const selectedPages = pages.filter(page => selectedIds.has(page.id))
      await onComplete(selectedPages)

      // Log successful completion
      permanentLogger.info('SITEMAP_SELECTOR', 'Selection completed successfully', {
        pageCount: selectedPages.length,
        duration
      })

    } catch (error) {
      // NO silent failures - log and re-throw
      hasError.current = true
      permanentLogger.captureError('SITEMAP_SELECTOR', error as Error, {
        selectedCount: selectedIds.size,
        duration,
        phase: 'completion'
      })
      onError(error as Error)
    }
  }, [selectedIds, pages.length, selectionMode, onComplete, onError])

  /**
   * Handle errors from discovery stream
   * Errors bubble up - no graceful degradation
   */
  useEffect(() => {
    if (state.error) {
      hasError.current = true
      permanentLogger.captureError('SITEMAP_SELECTOR', state.error, {
        phase: state.phase,
        companyId,
        sessionId
      })
      onError(state.error)
    }
  }, [state.error, state.phase, companyId, sessionId, onError])

  // Main render - semantic HTML structure
  return (
    <main
      className={className}
      aria-label="Page discovery and selection"
    >
      <div className="flex flex-col h-full space-y-4 p-4">
        {/* Discovery status header */}
        <DiscoveryHeader
          phase={state.phase}
          progress={state.progress}
          total={state.total}
          error={state.error}
        />

        {/* Phase progress indicators */}
        <DiscoveryPhases
          currentPhase={state.phase}
        />

        {/* Selection control buttons */}
        <SelectionControls
          selectedCount={selectedIds.size}
          totalCount={pages.length}
          onSelectAll={selectAll}
          onClearSelection={clearSelection}
          onComplete={handleComplete}
          disabled={state.phase !== 'complete'}
        />

        {/* Additional selection actions - mobile responsive */}
        {pages.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => selectByCategory('critical')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Select all critical pages"
            >
              Select Critical
            </button>
            <button
              onClick={() => selectByCategory('important')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Select all important pages"
            >
              Select Important
            </button>
            <button
              onClick={invertSelection}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Invert selection"
            >
              Invert Selection
            </button>
          </div>
        )}

        {/* Scrollable page list - main content area */}
        <PageList
          pages={pages}
          selectedIds={selectedIds}
          onToggleSelection={toggleSelection}
          className="flex-1 min-h-0"
        />
      </div>
    </main>
  )
}

// Export all types for external use
export * from './types'