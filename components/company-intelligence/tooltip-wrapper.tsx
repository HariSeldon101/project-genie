/**
 * Reusable Tooltip Wrapper Component
 * Provides Radix UI tooltip functionality with text truncation
 */

'use client'

import React from 'react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { cn } from '@/lib/utils'

interface TooltipWrapperProps {
  content: string
  children: React.ReactNode
  position?: 'TopLeft' | 'TopCenter' | 'TopRight' | 'BottomLeft' | 'BottomCenter' | 'BottomRight' | 'LeftTop' | 'LeftCenter' | 'LeftBottom' | 'RightTop' | 'RightCenter' | 'RightBottom'
  className?: string
  truncate?: boolean
  maxWidth?: string
  showArrow?: boolean
  openDelay?: number
  closeDelay?: number
  cssClass?: string
  isSticky?: boolean
}

export function TooltipWrapper({
  content,
  children,
  position = 'TopCenter',
  className,
  truncate = true,
  maxWidth = '300px',
  showArrow = true,
  openDelay = 300,
  closeDelay = 300,
  cssClass = '',
  isSticky = false
}: TooltipWrapperProps) {
  // If no content, just render children
  if (!content) {
    return <>{children}</>
  }

  // Apply truncation classes if needed
  const wrapperClasses = cn(
    truncate && 'truncate',
    className
  )

  // Map Syncfusion positions to Radix sides
  const sideMap: Record<string, 'top' | 'right' | 'bottom' | 'left'> = {
    'TopLeft': 'top',
    'TopCenter': 'top',
    'TopRight': 'top',
    'BottomLeft': 'bottom',
    'BottomCenter': 'bottom',
    'BottomRight': 'bottom',
    'LeftTop': 'left',
    'LeftCenter': 'left',
    'LeftBottom': 'left',
    'RightTop': 'right',
    'RightCenter': 'right',
    'RightBottom': 'right'
  }

  const side = sideMap[position] || 'top'

  return (
    <Tooltip.Provider delayDuration={openDelay}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <div className={wrapperClasses}>
            {children}
          </div>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className={cn(
              'z-50 overflow-hidden rounded-md bg-gray-900 px-3 py-1.5 text-xs text-white shadow-md animate-in fade-in-0 zoom-in-95',
              'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
              'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2',
              'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
              cssClass
            )}
            style={{ maxWidth }}
            sideOffset={5}
            side={side}
          >
            {content}
            {showArrow && <Tooltip.Arrow className="fill-gray-900" />}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}

/**
 * Quick tooltip for simple text with automatic truncation
 */
export function QuickTooltip({
  text,
  tooltip,
  className,
  as: Component = 'span'
}: {
  text: string
  tooltip?: string
  className?: string
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
}) {
  const tooltipContent = tooltip || text
  
  return (
    <TooltipWrapper
      content={tooltipContent}
      className={className}
      truncate={true}
    >
      <Component className={cn('block truncate', className)}>
        {text}
      </Component>
    </TooltipWrapper>
  )
}

/**
 * Icon button with tooltip
 */
export function IconTooltip({
  icon,
  tooltip,
  onClick,
  className,
  buttonClassName
}: {
  icon: React.ReactNode
  tooltip: string
  onClick?: () => void
  className?: string
  buttonClassName?: string
}) {
  return (
    <TooltipWrapper
      content={tooltip}
      className={className}
      truncate={false}
    >
      <button
        onClick={onClick}
        className={cn(
          'p-2 hover:bg-muted rounded-md transition-colors',
          buttonClassName
        )}
        type="button"
      >
        {icon}
      </button>
    </TooltipWrapper>
  )
}