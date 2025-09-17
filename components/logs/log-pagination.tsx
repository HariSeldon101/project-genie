/**
 * LogPagination Component
 * Provides navigation controls for paginated log data
 * Following SOLID principles - Single Responsibility
 * @module log-pagination
 */

'use client'

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { TooltipWrapper } from '@/components/company-intelligence/tooltip-wrapper'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { useState, useCallback } from 'react'

/**
 * Props for LogPagination component
 */
export interface LogPaginationProps {
  currentPage: number
  totalPages: number
  pageSize: number
  totalCount: number
  hasNext: boolean
  hasPrev: boolean
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  isLoading: boolean
}

/**
 * LogPagination Component
 * Handles all pagination navigation for logs
 * 
 * Features:
 * - Previous/Next navigation buttons
 * - Jump to first/last page
 * - Page size selector
 * - Direct page input
 * - Current page indicator
 * - Total count display
 * 
 * Follows DRY principle - reusable for any paginated data
 */
export function LogPagination({
  currentPage,
  totalPages,
  pageSize,
  totalCount,
  hasNext,
  hasPrev,
  onPageChange,
  onPageSizeChange,
  isLoading
}: LogPaginationProps) {
  // State for jump to page input
  const [jumpToPage, setJumpToPage] = useState('')
  
  /**
   * Handle page size change
   * Logs the change for debugging
   */
  const handlePageSizeChange = useCallback((value: string) => {
    const newSize = parseInt(value, 10)
    permanentLogger.breadcrumb('log-pagination', 'page-size-change', {
      oldSize: pageSize,
      newSize,
      timestamp: new Date().toISOString()
    })
    onPageSizeChange(newSize)
  }, [pageSize, onPageSizeChange])
  
  /**
   * Handle jump to page
   * Validates input and navigates to specified page
   */
  const handleJumpToPage = useCallback(() => {
    const pageNum = parseInt(jumpToPage, 10)
    if (pageNum && pageNum > 0 && pageNum <= totalPages) {
      permanentLogger.breadcrumb('log-pagination', 'jump-to-page', {
        targetPage: pageNum,
        currentPage,
        timestamp: new Date().toISOString()
      })
      onPageChange(pageNum)
      setJumpToPage('')
    }
  }, [jumpToPage, totalPages, currentPage, onPageChange])
  
  /**
   * Handle keyboard navigation for jump input
   * Enter key triggers navigation
   */
  const handleJumpKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleJumpToPage()
    }
  }, [handleJumpToPage])
  
  /**
   * Navigate to first page
   */
  const goToFirstPage = useCallback(() => {
    permanentLogger.breadcrumb('log-pagination', 'navigate-first', {
      fromPage: currentPage,
      timestamp: new Date().toISOString()
    })
    onPageChange(1)
  }, [currentPage, onPageChange])
  
  /**
   * Navigate to last page
   */
  const goToLastPage = useCallback(() => {
    permanentLogger.breadcrumb('log-pagination', 'navigate-last', {
      fromPage: currentPage,
      toPage: totalPages,
      timestamp: new Date().toISOString()
    })
    onPageChange(totalPages)
  }, [currentPage, totalPages, onPageChange])
  
  /**
   * Navigate to previous page
   */
  const goToPrevPage = useCallback(() => {
    if (currentPage > 1) {
      permanentLogger.breadcrumb('log-pagination', 'navigate-prev', {
        fromPage: currentPage,
        toPage: currentPage - 1,
        timestamp: new Date().toISOString()
      })
      onPageChange(currentPage - 1)
    }
  }, [currentPage, onPageChange])
  
  /**
   * Navigate to next page
   */
  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      permanentLogger.breadcrumb('log-pagination', 'navigate-next', {
        fromPage: currentPage,
        toPage: currentPage + 1,
        timestamp: new Date().toISOString()
      })
      onPageChange(currentPage + 1)
    }
  }, [currentPage, totalPages, onPageChange])
  
  // Calculate displayed range
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalCount)
  
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 p-3 border rounded-lg bg-muted/50">
      {/* Left side - Compact page info and size selector */}
      <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-start">
        {/* Compact page info - responsive text */}
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm text-muted-foreground">
            {/* Mobile: Just numbers */}
            <span className="sm:hidden">
              {startItem}-{endItem} / {totalCount}
            </span>
            {/* Desktop: Full text */}
            <span className="hidden sm:inline">
              {startItem.toLocaleString()}-{endItem.toLocaleString()} of {totalCount.toLocaleString()}
            </span>
          </span>
        </div>

        {/* Compact page size selector */}
        <div className="flex items-center gap-1 sm:gap-2">
          <span className="hidden sm:inline text-sm text-muted-foreground">Rows:</span>
          <Select
            value={String(pageSize)}
            onValueChange={handlePageSizeChange}
            disabled={isLoading}
          >
            <SelectTrigger className="w-[70px] sm:w-[85px] h-7 sm:h-8 text-xs sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="200">200</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Center & Right combined for mobile, separate for desktop */}
      <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
        {/* Compact navigation buttons */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          {/* First page - hidden on mobile */}
          <TooltipWrapper content="First page">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToFirstPage}
              disabled={isLoading || currentPage === 1}
              className="hidden sm:flex h-7 w-7 sm:h-8 sm:w-8 p-0"
            >
              <ChevronsLeft className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </TooltipWrapper>

          {/* Previous page */}
          <TooltipWrapper content="Previous">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPrevPage}
              disabled={isLoading || currentPage === 1 || !hasPrev}
              className="h-7 w-7 sm:h-8 sm:w-8 p-0"
            >
              <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </TooltipWrapper>

          {/* Compact page indicator */}
          <div className="flex items-center justify-center min-w-[60px] sm:min-w-[80px] h-7 sm:h-8 px-2 text-xs sm:text-sm font-medium">
            {currentPage}/{totalPages}
          </div>

          {/* Next page */}
          <TooltipWrapper content="Next">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToNextPage}
              disabled={isLoading || currentPage === totalPages || !hasNext}
              className="h-7 w-7 sm:h-8 sm:w-8 p-0"
            >
              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </TooltipWrapper>

          {/* Last page - hidden on mobile */}
          <TooltipWrapper content="Last page">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToLastPage}
              disabled={isLoading || currentPage === totalPages}
              className="hidden sm:flex h-7 w-7 sm:h-8 sm:w-8 p-0"
            >
              <ChevronsRight className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </TooltipWrapper>
        </div>
      </div>
    </div>
  )
}