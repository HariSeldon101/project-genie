/**
 * Inline Breadcrumb Display Component
 * Shows breadcrumbs directly within log entries
 * Especially useful for error logs to show user journey
 *
 * Features:
 * - Compact inline display
 * - Expandable details
 * - Shows last N breadcrumbs before error
 * - Responsive design
 *
 * @module breadcrumb-inline
 */

'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TooltipWrapper } from '@/components/company-intelligence/tooltip-wrapper'
import { ChevronDown, ChevronRight, Navigation, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { formatJsonForInlineDisplay } from '@/lib/utils/log-ui-helpers'

/**
 * Breadcrumb entry structure
 * Represents a single user action in the journey
 */
interface BreadcrumbEntry {
  timestamp: string | Date
  type: string
  action: string
  data?: any
}

/**
 * Props for BreadcrumbInline component
 */
interface BreadcrumbInlineProps {
  /** Array of breadcrumb entries */
  breadcrumbs?: BreadcrumbEntry[]
  /** Maximum number to show initially (default: 5) */
  maxInitialDisplay?: number
  /** Whether to show full details or compact view */
  compact?: boolean
  /** Custom className for styling */
  className?: string
}

/**
 * BreadcrumbInline Component
 *
 * Displays breadcrumbs inline with log entries
 * Perfect for showing user journey that led to an error
 *
 * The component is designed to be:
 * - Non-intrusive when collapsed
 * - Informative when expanded
 * - Responsive on all screen sizes
 *
 * @param props - Component configuration
 */
export function BreadcrumbInline({
  breadcrumbs,
  maxInitialDisplay = 5,
  compact = true,
  className = ''
}: BreadcrumbInlineProps) {
  // State for expansion
  const [isExpanded, setIsExpanded] = useState(false)

  // If no breadcrumbs, don't render anything
  if (!breadcrumbs || breadcrumbs.length === 0) {
    return null
  }

  // Get the breadcrumbs to display
  const displayBreadcrumbs = isExpanded
    ? breadcrumbs
    : breadcrumbs.slice(-maxInitialDisplay) // Show last N

  // Calculate if there are more to show
  const hasMore = breadcrumbs.length > maxInitialDisplay

  return (
    <div className={`mt-3 p-3 bg-muted/30 rounded-lg ${className}`}>
      {/* Header with toggle */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            User Journey ({breadcrumbs.length} actions)
          </span>
          {hasMore && !isExpanded && (
            <Badge variant="outline" className="text-xs">
              +{breadcrumbs.length - maxInitialDisplay} more
            </Badge>
          )}
        </div>

        {hasMore && (
          <TooltipWrapper content={isExpanded ? 'Show less' : 'Show all breadcrumbs'}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-6 px-2"
            >
              {isExpanded ? (
                <>
                  <ChevronDown className="w-3 h-3 mr-1" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronRight className="w-3 h-3 mr-1" />
                  Show All
                </>
              )}
            </Button>
          </TooltipWrapper>
        )}
      </div>

      {/* Breadcrumb list */}
      <div className="space-y-1">
        {displayBreadcrumbs.map((crumb, index) => {
          const timestamp = typeof crumb.timestamp === 'string'
            ? new Date(crumb.timestamp)
            : crumb.timestamp

          return (
            <div
              key={`${timestamp}-${index}`}
              className="flex items-start gap-2 text-xs"
            >
              {/* Step number */}
              <span className="text-muted-foreground min-w-[20px]">
                {breadcrumbs.length - displayBreadcrumbs.length + index + 1}.
              </span>

              {/* Breadcrumb content */}
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Type badge */}
                  <Badge
                    variant="outline"
                    className="text-xs h-5 px-1.5"
                  >
                    {crumb.type}
                  </Badge>

                  {/* Action */}
                  <span className="font-medium">{crumb.action}</span>

                  {/* Timestamp */}
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(timestamp, { addSuffix: true })}
                  </span>
                </div>

                {/* Data preview (if exists and not compact) */}
                {!compact && crumb.data && (
                  <div className="mt-1 p-2 bg-background/50 rounded text-xs">
                    <pre className="whitespace-pre-wrap break-words">
                      {formatJsonForInlineDisplay(crumb.data, 200)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Show indicator if not expanded and there are more */}
      {!isExpanded && hasMore && (
        <div className="mt-2 text-center">
          <span className="text-xs text-muted-foreground">
            ... {breadcrumbs.length - maxInitialDisplay} earlier actions hidden
          </span>
        </div>
      )}
    </div>
  )
}