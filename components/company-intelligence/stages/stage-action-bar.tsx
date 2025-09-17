/**
 * Stage Action Bar Component
 * 
 * A reusable component for stage approval/rejection actions.
 * This component provides a consistent UI pattern for stage transitions
 * with approve/reject buttons and loading states.
 * 
 * Features:
 * - Approve and reject buttons with icons
 * - Loading state management
 * - Tooltip integration
 * - Customizable button labels
 * - Disabled state handling
 * 
 * @component
 */

'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { 
  CheckCircle2, 
  XCircle, 
  Loader2,
  ChevronRight,
  ChevronLeft
} from 'lucide-react'
import { TooltipWrapper } from '@/components/company-intelligence/tooltip-wrapper'
import { cn } from '@/lib/utils'

interface StageActionBarProps {
  /** Callback when approve is clicked */
  onApprove: () => void
  /** Callback when reject is clicked */
  onReject: () => void
  /** Whether an action is in progress */
  isLoading?: boolean
  /** Custom label for approve button */
  approveLabel?: string
  /** Custom label for reject button */
  rejectLabel?: string
  /** Tooltip text for approve button */
  approveTooltip?: string
  /** Tooltip text for reject button */
  rejectTooltip?: string
  /** Whether the approve button is disabled */
  approveDisabled?: boolean
  /** Whether the reject button is disabled */
  rejectDisabled?: boolean
  /** Which action is currently loading */
  loadingAction?: 'approve' | 'reject' | null
  /** Whether to show navigation icons */
  showNavigationIcons?: boolean
  /** Custom className for styling */
  className?: string
}

/**
 * Default tooltip messages
 */
const DEFAULT_TOOLTIPS = {
  approve: 'Approve this stage and continue to the next step',
  reject: 'Reject this stage and make changes'
}

export function StageActionBar({
  onApprove,
  onReject,
  isLoading = false,
  approveLabel = 'Approve & Continue',
  rejectLabel = 'Reject',
  approveTooltip,
  rejectTooltip,
  approveDisabled = false,
  rejectDisabled = false,
  loadingAction = null,
  showNavigationIcons = true,
  className
}: StageActionBarProps) {
  const isApproving = isLoading && loadingAction === 'approve'
  const isRejecting = isLoading && loadingAction === 'reject'

  return (
    <div className={cn("flex gap-3 p-4 bg-gray-50 rounded-lg", className)}>
      {/* Reject button */}
      <TooltipWrapper content={rejectTooltip || DEFAULT_TOOLTIPS.reject}>
        <Button 
          onClick={onReject}
          variant="outline"
          className="flex-1"
          disabled={rejectDisabled || isLoading}
        >
          {isRejecting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              {showNavigationIcons && <ChevronLeft className="w-4 h-4 mr-1" />}
              <XCircle className="w-4 h-4 mr-2" />
              {rejectLabel}
            </>
          )}
        </Button>
      </TooltipWrapper>
      
      {/* Approve button */}
      <TooltipWrapper content={approveTooltip || DEFAULT_TOOLTIPS.approve}>
        <Button 
          onClick={onApprove}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
          disabled={approveDisabled || isLoading}
        >
          {isApproving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {approveLabel}
              {showNavigationIcons && <ChevronRight className="w-4 h-4 ml-1" />}
            </>
          )}
        </Button>
      </TooltipWrapper>
    </div>
  )
}

/**
 * Simplified version for single action
 */
interface SingleActionProps {
  /** Callback when button is clicked */
  onClick: () => void
  /** Button label */
  label: string
  /** Whether the action is loading */
  isLoading?: boolean
  /** Button variant */
  variant?: 'default' | 'outline' | 'destructive' | 'secondary' | 'ghost' | 'link'
  /** Icon to display */
  icon?: React.ReactNode
  /** Tooltip text */
  tooltip?: string
  /** Whether the button is disabled */
  disabled?: boolean
  /** Custom className for styling */
  className?: string
}

export function SingleActionButton({
  onClick,
  label,
  isLoading = false,
  variant = 'default',
  icon,
  tooltip,
  disabled = false,
  className
}: SingleActionProps) {
  const button = (
    <Button 
      onClick={onClick}
      variant={variant}
      disabled={disabled || isLoading}
      className={cn(
        variant === 'default' && 'bg-blue-600 hover:bg-blue-700',
        className
      )}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          {icon && <span className="mr-2">{icon}</span>}
          {label}
        </>
      )}
    </Button>
  )

  if (tooltip) {
    return (
      <TooltipWrapper content={tooltip}>
        {button}
      </TooltipWrapper>
    )
  }

  return button
}