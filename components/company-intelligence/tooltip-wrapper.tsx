/**
 * Reusable Tooltip Wrapper Component
 * Provides Syncfusion tooltip functionality with text truncation
 */

'use client'

import React from 'react'
import { TooltipComponent } from '@syncfusion/ej2-react-popups'
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

  return (
    <TooltipComponent
      content={content}
      position={position}
      showTipPointer={showArrow}
      openDelay={openDelay}
      closeDelay={closeDelay}
      isSticky={isSticky}
      cssClass={cssClass ? `e-tooltip-wrap ${cssClass}` : 'e-tooltip-wrap'}
      width={maxWidth}
      opensOn="Hover Focus"
    >
      <div className={wrapperClasses}>
        {children}
      </div>
    </TooltipComponent>
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