/**
 * LogFilters Component
 * Provides filter controls for logs display
 * Following SOLID principle - Single Responsibility
 * @module log-filters
 */

'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MultiSelect, type MultiSelectOption } from '@/components/ui/multi-select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TooltipWrapper } from '@/components/company-intelligence/tooltip-wrapper'
import { formatLevelForDisplay } from '@/lib/utils/log-level-utils'
import { X, Search, Filter } from 'lucide-react'
import { permanentLogger } from '@/lib/utils/permanent-logger'

/**
 * Props for LogFilters component
 */
export interface LogFiltersProps {
  // Filter values - now arrays for multi-select
  levelFilter: string[]  // Array of selected levels
  categoryFilter: string[]  // Array of selected categories
  timeFilter: string
  searchQuery: string

  // Available options
  categories: string[]

  // Change handlers - now accept arrays
  onLevelChange: (levels: string[]) => void
  onCategoryChange: (categories: string[]) => void
  onTimeChange: (time: string) => void
  onSearchChange: (query: string) => void
  onClearFilters: () => void

  // UI state
  activeFilterCount: number
}

/**
 * LogFilters Component
 * Provides comprehensive filtering controls for logs
 * 
 * Features:
 * - Level filtering
 * - Category filtering
 * - Time range filtering
 * - Search functionality
 * - Error type filtering
 * - Clear all filters
 * 
 * Follows DRY principle by centralizing all filter UI
 */
export function LogFilters({
  levelFilter,
  categoryFilter,
  timeFilter,
  searchQuery,
  categories,
  onLevelChange,
  onCategoryChange,
  onTimeChange,
  onSearchChange,
  onClearFilters,
  activeFilterCount
}: LogFiltersProps) {
  /**
   * Handle search input change
   * Tracks user search actions for analytics
   */
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    onSearchChange(query)
    permanentLogger.breadcrumb('log-filters', 'search-change', { query })
  }
  
  /**
   * Handle level filter change - now accepts multiple levels
   * CRITICAL: Never use inline case conversion - always use utility functions
   */
  const handleLevelChange = (values: string[]) => {
    onLevelChange(values)
    permanentLogger.breadcrumb('log-filters', 'level-change', {
      levels: values,
      count: values.length
    })
  }

  /**
   * Handle category filter change - now accepts multiple categories
   */
  const handleCategoryChange = (values: string[]) => {
    onCategoryChange(values)
    permanentLogger.breadcrumb('log-filters', 'category-change', {
      categories: values,
      count: values.length
    })
  }
  
  /**
   * Handle time filter change
   */
  const handleTimeChange = (value: string) => {
    onTimeChange(value)
    permanentLogger.breadcrumb('log-filters', 'time-change', { timeFilter: value })
  }
  
  /**
   * Handle clear all filters
   */
  const handleClearFilters = () => {
    onClearFilters()
    permanentLogger.info('UI', 'All log filters cleared')
  }
  
  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      {/* Filter Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-medium">Filters</h3>
        </div>
        
        {/* ALWAYS show Clear All button - no conditions! */}
        <TooltipWrapper content="Clear all filters and show all logs">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="text-xs"
          >
            <X className="w-3 h-3 mr-1" />
            Clear All Filters
          </Button>
        </TooltipWrapper>
      </div>

      {/* Active Filters Display */}
      {(levelFilter.length > 0 || categoryFilter.length > 0 || timeFilter !== 'all' || searchQuery) && (
        <div className="flex flex-wrap gap-2 p-2 bg-muted/30 rounded-lg">
          {levelFilter.length > 0 && (
            <TooltipWrapper content="Click X to remove level filter">
              <Badge variant="secondary" className="flex items-center gap-1">
                <span className="text-xs">Level:</span>
                <span className="text-xs font-medium">
                  {levelFilter.map(l => formatLevelForDisplay(l)).join(', ')}
                </span>
                <X
                  className="w-3 h-3 ml-1 cursor-pointer hover:text-destructive"
                  onClick={() => onLevelChange([])}
                />
              </Badge>
            </TooltipWrapper>
          )}
          {categoryFilter.length > 0 && (
            <TooltipWrapper content="Click X to remove category filter">
              <Badge variant="secondary" className="flex items-center gap-1">
                <span className="text-xs">Category:</span>
                <span className="text-xs font-medium">
                  {categoryFilter.join(', ')}
                </span>
                <X
                  className="w-3 h-3 ml-1 cursor-pointer hover:text-destructive"
                  onClick={() => onCategoryChange([])}
                />
              </Badge>
            </TooltipWrapper>
          )}
          {timeFilter !== 'all' && (
            <TooltipWrapper content="Click X to remove time filter">
              <Badge variant="secondary" className="flex items-center gap-1">
                <span className="text-xs">Time:</span>
                <span className="text-xs font-medium">{timeFilter}</span>
                <X
                  className="w-3 h-3 ml-1 cursor-pointer hover:text-destructive"
                  onClick={() => onTimeChange('all')}
                />
              </Badge>
            </TooltipWrapper>
          )}
          {searchQuery && (
            <TooltipWrapper content="Click X to clear search">
              <Badge variant="secondary" className="flex items-center gap-1">
                <span className="text-xs">Search:</span>
                <span className="text-xs font-medium">"{searchQuery}"</span>
                <X
                  className="w-3 h-3 ml-1 cursor-pointer hover:text-destructive"
                  onClick={() => onSearchChange('')}
                />
              </Badge>
            </TooltipWrapper>
          )}
        </div>
      )}
      
      {/* Search Input */}
      <div className="space-y-2">
        <Label htmlFor="search" className="text-sm">Search</Label>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="search"
            type="text"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-8"
          />
        </div>
      </div>
      
      {/* Filter Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Level Filter - Multi-select */}
        <div className="space-y-2">
          <Label htmlFor="level" className="text-sm">Level</Label>
          <MultiSelect
            id="level"
            options={[
              {
                value: 'debug',
                label: formatLevelForDisplay('debug'),
                tooltip: 'Debug level logs for detailed diagnostics'
              },
              {
                value: 'info',
                label: formatLevelForDisplay('info'),
                tooltip: 'Informational messages about normal operations'
              },
              {
                value: 'warn',
                label: formatLevelForDisplay('warn'),
                tooltip: 'Warning messages about potential issues'
              },
              {
                value: 'error',
                label: formatLevelForDisplay('error'),
                tooltip: 'Error messages indicating failures'
              },
              {
                value: 'fatal',
                label: formatLevelForDisplay('fatal'),
                tooltip: 'Critical errors requiring immediate attention'
              }
            ]}
            value={levelFilter}
            onChange={handleLevelChange}
            placeholder="Select levels..."
            showSelectAll={true}
            logCategory="log-level-filter"
          />
        </div>
        
        {/* Category Filter - Multi-select */}
        <div className="space-y-2">
          <Label htmlFor="category" className="text-sm">Category</Label>
          <MultiSelect
            id="category"
            options={categories.map(cat => ({
              value: cat,
              label: cat,
              tooltip: `Filter logs from ${cat} category`
            }))}
            value={categoryFilter}
            onChange={handleCategoryChange}
            placeholder="Select categories..."
            showSelectAll={true}
            logCategory="log-category-filter"
            maxHeight={250}
          />
        </div>
        
        {/* Time Filter */}
        <div className="space-y-2">
          <Label htmlFor="time" className="text-sm">Time Range</Label>
          <TooltipWrapper content="Filter logs by time period">
            <Select value={timeFilter} onValueChange={handleTimeChange}>
              <SelectTrigger id="time">
                <SelectValue placeholder="All time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="5m">Last 5 Minutes</SelectItem>
                <SelectItem value="15m">Last 15 Minutes</SelectItem>
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
              </SelectContent>
            </Select>
          </TooltipWrapper>
        </div>
      </div>
    </div>
  )
}