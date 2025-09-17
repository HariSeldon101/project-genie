/**
 * Multi-Select Component
 * Provides checkbox-based multi-select dropdown
 * Following DRY and SOLID principles
 * @module multi-select
 */

'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TooltipWrapper } from '@/components/company-intelligence/tooltip-wrapper'
import { permanentLogger } from '@/lib/utils/permanent-logger'

/**
 * Option interface for multi-select items
 */
export interface MultiSelectOption {
  value: string
  label: string
  tooltip?: string
}

/**
 * Props for MultiSelect component
 */
export interface MultiSelectProps {
  /** Available options to select from */
  options: MultiSelectOption[]
  /** Currently selected values */
  value: string[]
  /** Callback when selection changes */
  onChange: (values: string[]) => void
  /** Placeholder text when nothing selected */
  placeholder?: string
  /** Maximum height of dropdown */
  maxHeight?: number
  /** Component ID for accessibility */
  id?: string
  /** Additional CSS classes */
  className?: string
  /** Show select all option */
  showSelectAll?: boolean
  /** Category for logging */
  logCategory?: string
}

/**
 * MultiSelect Component
 * Provides checkbox-based multi-selection with:
 * - Select all/none functionality
 * - Badge count display
 * - Tooltips for each option
 * - Scroll area for long lists
 * - Proper keyboard navigation
 */
export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select items...',
  maxHeight = 300,
  id,
  className,
  showSelectAll = true,
  logCategory = 'multi-select'
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  /**
   * Handle individual option toggle
   */
  const handleToggle = (optionValue: string) => {
    const newValues = value.includes(optionValue)
      ? value.filter(v => v !== optionValue)
      : [...value, optionValue]

    onChange(newValues)

    // Log the change for debugging
    permanentLogger.breadcrumb(logCategory, 'option-toggle', {
      option: optionValue,
      selected: !value.includes(optionValue),
      totalSelected: newValues.length
    })
  }

  /**
   * Handle select all toggle
   */
  const handleSelectAll = () => {
    const allSelected = value.length === options.length
    const newValues = allSelected ? [] : options.map(opt => opt.value)

    onChange(newValues)

    // Log the bulk action
    permanentLogger.breadcrumb(logCategory, 'select-all-toggle', {
      action: allSelected ? 'deselect-all' : 'select-all',
      count: newValues.length
    })
  }

  /**
   * Clear all selections
   */
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange([])

    permanentLogger.breadcrumb(logCategory, 'clear-all', {
      previousCount: value.length
    })
  }

  /**
   * Get display text for trigger button
   */
  const getDisplayText = () => {
    if (value.length === 0) return placeholder
    if (value.length === 1) {
      const option = options.find(opt => opt.value === value[0])
      return option?.label || value[0]
    }
    return `${value.length} selected`
  }

  /**
   * Check if all options are selected
   */
  const allSelected = value.length === options.length && options.length > 0
  const someSelected = value.length > 0 && value.length < options.length

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={`Select multiple ${logCategory}`}
          className={cn(
            'justify-between',
            className,
            value.length > 0 && 'text-foreground'
          )}
        >
          <span className="truncate">{getDisplayText()}</span>
          <div className="flex items-center gap-1">
            {value.length > 0 && (
              <Badge
                variant="secondary"
                className="ml-2 h-5 px-1 text-xs"
              >
                {value.length}
              </Badge>
            )}
            {value.length > 0 && (
              <X
                className="h-4 w-4 opacity-50 hover:opacity-100"
                onClick={handleClear}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <div className="border-b p-2">
          {showSelectAll && (
            <TooltipWrapper content={allSelected ? 'Deselect all items' : 'Select all items'}>
              <div className="flex items-center space-x-2 px-2 py-1.5 hover:bg-accent rounded">
                <Checkbox
                  id="select-all"
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  ref={(el) => {
                    if (el && someSelected) {
                      // Set indeterminate state for partial selection
                      (el as any).indeterminate = true
                    }
                  }}
                />
                <label
                  htmlFor="select-all"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer select-none"
                >
                  Select All
                </label>
              </div>
            </TooltipWrapper>
          )}
        </div>
        <ScrollArea className="h-full" style={{ maxHeight }}>
          <div className="p-2 space-y-1">
            {options.map((option) => {
              const isSelected = value.includes(option.value)
              const itemContent = (
                <div
                  key={option.value}
                  className="flex items-center space-x-2 px-2 py-1.5 hover:bg-accent rounded cursor-pointer"
                  onClick={() => handleToggle(option.value)}
                >
                  <Checkbox
                    id={`option-${option.value}`}
                    checked={isSelected}
                    onCheckedChange={() => handleToggle(option.value)}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <label
                    htmlFor={`option-${option.value}`}
                    className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer select-none flex-1"
                  >
                    {option.label}
                  </label>
                  {isSelected && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              )

              return option.tooltip ? (
                <TooltipWrapper key={option.value} content={option.tooltip}>
                  {itemContent}
                </TooltipWrapper>
              ) : (
                itemContent
              )
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}