/**
 * Selection controls component
 * Provides bulk selection actions and completion button
 * Mobile responsive with touch-friendly buttons
 */

import React from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, RotateCw, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SelectionControlsProps } from '../types'

/**
 * Selection control buttons
 * Provides actions for managing page selection
 */
export const SelectionControls: React.FC<SelectionControlsProps> = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onComplete,
  disabled,
  className
}) => {
  // Calculate selection percentage for visual feedback
  const selectionPercentage = totalCount > 0
    ? Math.round((selectedCount / totalCount) * 100)
    : 0

  return (
    <nav
      className={cn(
        'flex flex-col sm:flex-row gap-3 items-center justify-between',
        className
      )}
      aria-label="Selection controls"
    >
      {/* Selection info and bulk actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-center w-full sm:w-auto">
        {/* Selection count display */}
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {selectedCount}
          </span>
          {' of '}
          <span className="font-medium text-foreground">
            {totalCount}
          </span>
          {' pages selected'}
          {selectionPercentage > 0 && (
            <span className="ml-2">
              ({selectionPercentage}%)
            </span>
          )}
        </div>

        {/* Bulk action buttons - responsive layout */}
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={onSelectAll}
            disabled={disabled || selectedCount === totalCount}
            className="flex-1 sm:flex-none"
            aria-label="Select all pages"
          >
            <CheckCircle2 className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Select</span> All
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onClearSelection}
            disabled={disabled || selectedCount === 0}
            className="flex-1 sm:flex-none"
            aria-label="Clear selection"
          >
            <XCircle className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Clear</span>
          </Button>
        </div>
      </div>

      {/* Complete button - primary action */}
      <Button
        onClick={onComplete}
        disabled={disabled || selectedCount === 0}
        className="w-full sm:w-auto"
        size="default"
        aria-label={`Proceed with ${selectedCount} selected pages`}
      >
        {disabled ? (
          <>
            <RotateCw className="w-4 h-4 mr-2 animate-spin" />
            Discovery in Progress...
          </>
        ) : (
          <>
            Continue with {selectedCount} pages
            <ChevronRight className="w-4 h-4 ml-2" />
          </>
        )}
      </Button>
    </nav>
  )
}