/**
 * Hook for managing page selection state
 * Handles auto-selection of critical/important pages
 *
 * CRITICAL: NO mock data - real selections only
 * Tracks selection mode for analytics
 */

import { useState, useCallback, useEffect } from 'react'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { safeTimestampToISO } from '@/lib/utils/safe-timestamp'
import type { PageInfo, SelectionState } from '../types'

/**
 * Custom hook for page selection management
 * @param pages - Array of discovered pages
 * @returns Selection state and control functions
 */
export function usePageSelection(pages: PageInfo[]) {
  // Selection state with mode tracking
  const [state, setState] = useState<SelectionState>({
    selectedIds: new Set(),
    autoSelected: false,
    selectionMode: 'manual'
  })

  // Auto-select ALL pages when they arrive (comprehensive analysis by default)
  useEffect(() => {
    // Skip if no pages or already auto-selected
    if (pages.length === 0 || state.autoSelected) return

    const startTime = performance.now()
    // Select ALL page IDs by default for comprehensive analysis
    const autoSelect = new Set<string>(pages.map(p => p.id))

    // Count by category for logging
    let criticalCount = 0
    let importantCount = 0
    let usefulCount = 0
    let optionalCount = 0

    pages.forEach(page => {
      if (page.category === 'critical') criticalCount++
      else if (page.category === 'important') importantCount++
      else if (page.category === 'useful') usefulCount++
      else if (page.category === 'optional') optionalCount++
    })

    const timing = performance.now() - startTime

    permanentLogger.info('PAGE_SELECTION', 'Auto-selecting all pages', {
      criticalCount,
      importantCount,
      usefulCount,
      optionalCount,
      totalSelected: autoSelect.size,
      totalPages: pages.length,
      timing,
      timestamp: safeTimestampToISO(Date.now())
    })

    setState({
      selectedIds: autoSelect,
      autoSelected: true,
      selectionMode: 'auto'
    })
  }, [pages, state.autoSelected])

  /**
   * Toggle selection for a single page
   * Switches to manual mode when user interacts
   */
  const toggleSelection = useCallback((pageId: string) => {
    const startTime = performance.now()

    setState(prev => {
      const newIds = new Set(prev.selectedIds)
      const wasSelected = newIds.has(pageId)

      if (wasSelected) {
        newIds.delete(pageId)
      } else {
        newIds.add(pageId)
      }

      // Breadcrumb for selection change
      permanentLogger.breadcrumb('page_toggle', 'Page selection toggled', {
        pageId,
        selected: !wasSelected,
        totalSelected: newIds.size,
        timing: performance.now() - startTime
      })

      return {
        selectedIds: newIds,
        autoSelected: false, // User interaction overrides auto-selection
        selectionMode: 'manual'
      }
    })
  }, [])

  /**
   * Select all pages
   * Useful for bulk operations
   */
  const selectAll = useCallback(() => {
    const startTime = performance.now()
    const allIds = new Set(pages.map(p => p.id))

    permanentLogger.info('PAGE_SELECTION', 'Select all triggered', {
      count: allIds.size,
      timing: performance.now() - startTime
    })

    setState({
      selectedIds: allIds,
      autoSelected: false,
      selectionMode: 'bulk'
    })
  }, [pages])

  /**
   * Clear all selections
   * Resets to empty state
   */
  const clearSelection = useCallback(() => {
    permanentLogger.info('PAGE_SELECTION', 'Clearing all selections', {
      previousCount: state.selectedIds.size,
      timestamp: safeTimestampToISO(Date.now())
    })

    setState({
      selectedIds: new Set(),
      autoSelected: false,
      selectionMode: 'manual'
    })
  }, [state.selectedIds.size])

  /**
   * Select by category
   * Allows filtering by page importance
   */
  const selectByCategory = useCallback((category: PageInfo['category']) => {
    const startTime = performance.now()
    const categoryIds = new Set<string>()

    pages.forEach(page => {
      if (page.category === category) {
        categoryIds.add(page.id)
      }
    })

    permanentLogger.info('PAGE_SELECTION', 'Select by category', {
      category,
      count: categoryIds.size,
      timing: performance.now() - startTime
    })

    setState({
      selectedIds: categoryIds,
      autoSelected: false,
      selectionMode: 'bulk'
    })
  }, [pages])

  /**
   * Invert current selection
   * Selects unselected and deselects selected
   */
  const invertSelection = useCallback(() => {
    const startTime = performance.now()

    setState(prev => {
      const newIds = new Set<string>()

      pages.forEach(page => {
        if (!prev.selectedIds.has(page.id)) {
          newIds.add(page.id)
        }
      })

      permanentLogger.info('PAGE_SELECTION', 'Selection inverted', {
        previousCount: prev.selectedIds.size,
        newCount: newIds.size,
        timing: performance.now() - startTime
      })

      return {
        selectedIds: newIds,
        autoSelected: false,
        selectionMode: 'bulk'
      }
    })
  }, [pages])

  return {
    // State
    selectedIds: state.selectedIds,
    selectionMode: state.selectionMode,
    autoSelected: state.autoSelected,

    // Actions
    toggleSelection,
    selectAll,
    clearSelection,
    selectByCategory,
    invertSelection
  }
}