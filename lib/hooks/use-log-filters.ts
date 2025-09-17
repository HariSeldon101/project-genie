/**
 * Custom Hook for Log Filtering and State Management
 * Centralizes all log filtering logic following DRY principle
 * Provides reactive filtering with memoization for performance
 * @module use-log-filters
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  type LogEntry,
  type BreadcrumbEntry,
  type TimingEntry,
  type TimeFilter,
  type SortBy,
  filterByTime,
  filterByLevel,
  filterByCategory,
  searchLogs,
  sortLogs,
  getUniqueCategories
} from '@/lib/utils/log-operations'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { formatLevelForDatabase } from '@/lib/utils/log-level-utils'

/**
 * Filter state interface
 * Represents all possible filter configurations
 * Updated to support multi-select with arrays
 */
export interface LogFilterState {
  level: string[]  // Array of selected levels for multi-select
  category: string[]  // Array of selected categories for multi-select
  timeFilter: TimeFilter
  searchQuery: string
  sortBy: SortBy
  showData: boolean
  autoRefresh: boolean
}

/**
 * Hook return type
 * Provides filtered data and filter controls
 */
export interface UseLogFiltersReturn {
  // Filtered data
  filteredLogs: LogEntry[]
  breadcrumbs: BreadcrumbEntry[]
  timings: TimingEntry[]
  
  // Filter state
  filters: LogFilterState
  
  // Filter setters - now accept arrays for multi-select
  setLevel: (levels: string[]) => void
  setCategory: (categories: string[]) => void
  setTimeFilter: (filter: TimeFilter) => void
  setSearchQuery: (query: string) => void
  setSortBy: (sort: SortBy) => void
  setShowData: (show: boolean) => void
  setAutoRefresh: (refresh: boolean) => void
  resetFilters: () => void
  
  // Derived data
  categories: string[]
  logCounts: Record<string, number>
  
  // Quick filter helpers
  showErrorsOnly: () => void
  showRecentOnly: () => void
  clearAllFilters: () => void
}

/**
 * Default filter state
 * Used for initialization and reset
 * Empty arrays mean no filters (show all)
 */
const DEFAULT_FILTERS: LogFilterState = {
  level: [],  // Empty array means show all levels
  category: [],  // Empty array means show all categories
  timeFilter: 'all',
  searchQuery: '',
  sortBy: 'time-desc',
  showData: true,
  autoRefresh: false
}

/**
 * Custom hook for managing log filters
 * Provides centralized filtering logic with performance optimization
 * 
 * @param logs - Raw log entries
 * @param breadcrumbs - Breadcrumb entries
 * @param timings - Timing entries
 * @returns Filtered data and filter controls
 */
export function useLogFilters(
  logs: LogEntry[],
  breadcrumbs: BreadcrumbEntry[],
  timings: TimingEntry[]
): UseLogFiltersReturn {
  // Initialize filter state
  const [filters, setFilters] = useState<LogFilterState>(DEFAULT_FILTERS)
  
  // Track filter changes for debugging
  useEffect(() => {
    permanentLogger.breadcrumb('log-filters', 'state-change', filters)
  }, [filters])
  
  /**
   * Memoized filtered logs
   * HYBRID APPROACH: Server already filtered by level/category/time
   * Client only applies search and sorting for optimal UX
   */
  const filteredLogs = useMemo(() => {
    const startTime = performance.now()

    let result = [...logs]

    // IMPORTANT: Server already filtered by level, category, and time
    // Only apply client-side filters for UX features

    // Client-side search for instant feedback
    if (filters.searchQuery) {
      result = searchLogs(result, filters.searchQuery)
    }

    // Client-side sorting for quick reordering
    result = sortLogs(result, filters.sortBy)

    // Log performance metrics
    const duration = performance.now() - startTime
    permanentLogger.timing('log-filter-duration', duration, {
      inputCount: logs.length,
      outputCount: result.length,
      clientFilters: {
        searchQuery: filters.searchQuery,
        sortBy: filters.sortBy
      }
    })

    return result
  }, [logs, filters.searchQuery, filters.sortBy])
  
  /**
   * Memoized unique categories
   * Recalculated only when logs change
   */
  const categories = useMemo(() => getUniqueCategories(logs), [logs])
  
  /**
   * Memoized log counts by level
   * Used for statistics display
   */
  const logCounts = useMemo(() => {
    const counts: Record<string, number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      critical: 0
    }

    logs.forEach(log => {
      // CRITICAL: Use utility function for case conversion, never inline
      const level = formatLevelForDatabase(log.level)
      if (level in counts) {
        counts[level]++
      }
    })

    return counts
  }, [logs])
  
  /**
   * Filter setter functions
   * Each updates only the relevant part of state
   */
  const setLevel = useCallback((level: string[]) => {
    setFilters(prev => ({ ...prev, level }))
  }, [])

  const setCategory = useCallback((category: string[]) => {
    setFilters(prev => ({ ...prev, category }))
  }, [])
  
  const setTimeFilter = useCallback((timeFilter: TimeFilter) => {
    setFilters(prev => ({ ...prev, timeFilter }))
  }, [])

  const setSearchQuery = useCallback((searchQuery: string) => {
    setFilters(prev => ({ ...prev, searchQuery }))
  }, [])
  
  const setSortBy = useCallback((sortBy: SortBy) => {
    setFilters(prev => ({ ...prev, sortBy }))
  }, [])
  
  const setShowData = useCallback((showData: boolean) => {
    setFilters(prev => ({ ...prev, showData }))
  }, [])
  
  const setAutoRefresh = useCallback((autoRefresh: boolean) => {
    setFilters(prev => ({ ...prev, autoRefresh }))
  }, [])
  
  /**
   * Reset all filters to defaults
   */
  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
    permanentLogger.info('GENERAL', 'Log filters reset to defaults')
  }, [])
  
  /**
   * Quick filter: Show only errors
   * Sets level filter to show errors and critical
   */
  const showErrorsOnly = useCallback(() => {
    setFilters(prev => ({ ...prev, level: ['error', 'fatal'] }))
    permanentLogger.info('GENERAL', 'Quick filter applied: errors and critical only')
  }, [])
  
  /**
   * Quick filter: Show recent logs
   * Sets time filter to last 5 minutes
   */
  const showRecentOnly = useCallback(() => {
    setFilters(prev => ({ ...prev, timeFilter: 'last-5m' }))
    permanentLogger.info('GENERAL', 'Quick filter applied: recent only')
  }, [])
  
  /**
   * Clear all filters
   * Resets to show all logs
   */
  const clearAllFilters = useCallback(() => {
    setFilters({
      ...DEFAULT_FILTERS,
      showData: filters.showData,
      autoRefresh: filters.autoRefresh
    })
    permanentLogger.info('GENERAL', 'All filters cleared')
  }, [filters.showData, filters.autoRefresh])
  
  return {
    // Filtered data
    filteredLogs,
    breadcrumbs,
    timings,
    
    // Filter state
    filters,
    
    // Filter setters
    setLevel,
    setCategory,
    setTimeFilter,
    setSearchQuery,
    setSortBy,
    setShowData,
    setAutoRefresh,
    resetFilters,

    // Derived data
    categories,
    logCounts,
    
    // Quick filter helpers
    showErrorsOnly,
    showRecentOnly,
    clearAllFilters
  }
}