/**
 * Inline Timing Display Component
 * Shows performance timings directly within log entries
 * Helps identify performance bottlenecks related to errors
 *
 * Features:
 * - Visual timeline representation
 * - Duration bars for quick scanning
 * - Expandable details
 * - Color-coded by duration
 *
 * @module timing-inline
 */

'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TooltipWrapper } from '@/components/company-intelligence/tooltip-wrapper'
import { ChevronDown, ChevronRight, Activity, AlertTriangle } from 'lucide-react'
import { formatJsonForInlineDisplay } from '@/lib/utils/log-ui-helpers'

/**
 * Timing entry structure
 * Represents a performance checkpoint
 */
interface TimingEntry {
  checkpoint: string
  timestamp: string | Date
  duration?: number // milliseconds
  metadata?: any
}

/**
 * Props for TimingInline component
 */
interface TimingInlineProps {
  /** Array of timing entries */
  timings?: TimingEntry[]
  /** Maximum number to show initially (default: 5) */
  maxInitialDisplay?: number
  /** Whether to show as compact view */
  compact?: boolean
  /** Custom className for styling */
  className?: string
}

/**
 * Get color class based on duration
 * Red for slow, yellow for medium, green for fast
 *
 * @param duration - Duration in milliseconds
 * @returns Tailwind color class
 */
function getDurationColor(duration: number): string {
  if (duration > 1000) return 'text-red-500 bg-red-500' // > 1 second
  if (duration > 500) return 'text-yellow-500 bg-yellow-500' // > 500ms
  if (duration > 100) return 'text-blue-500 bg-blue-500' // > 100ms
  return 'text-green-500 bg-green-500' // < 100ms
}

/**
 * Format duration for display
 * Converts milliseconds to human-readable format
 *
 * @param ms - Duration in milliseconds
 * @returns Formatted string
 */
function formatDuration(ms: number): string {
  if (ms < 1) return '< 1ms'
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}min`
}

/**
 * TimingInline Component
 *
 * Displays performance timings inline with log entries
 * Perfect for showing performance profile that led to an error
 *
 * The component visualizes:
 * - Operation sequence
 * - Duration of each operation
 * - Performance bottlenecks
 *
 * @param props - Component configuration
 */
export function TimingInline({
  timings,
  maxInitialDisplay = 5,
  compact = true,
  className = ''
}: TimingInlineProps) {
  // State for expansion
  const [isExpanded, setIsExpanded] = useState(false)

  // If no timings, don't render anything
  if (!timings || timings.length === 0) {
    return null
  }

  // Get the timings to display
  const displayTimings = isExpanded
    ? timings
    : timings.slice(-maxInitialDisplay) // Show last N

  // Calculate if there are more to show
  const hasMore = timings.length > maxInitialDisplay

  // Find max duration for scaling bars
  const maxDuration = Math.max(...timings.map(t => t.duration || 0))

  // Check if there are any slow operations
  const hasSlowOps = timings.some(t => (t.duration || 0) > 1000)

  return (
    <div className={`mt-3 p-3 bg-muted/30 rounded-lg ${className}`}>
      {/* Header with toggle */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            Performance Timeline ({timings.length} operations)
          </span>
          {hasSlowOps && (
            <TooltipWrapper content="Contains slow operations (>1s)">
              <Badge variant="destructive" className="text-xs h-5 px-1.5">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Slow
              </Badge>
            </TooltipWrapper>
          )}
          {hasMore && !isExpanded && (
            <Badge variant="outline" className="text-xs">
              +{timings.length - maxInitialDisplay} more
            </Badge>
          )}
        </div>

        {hasMore && (
          <TooltipWrapper content={isExpanded ? 'Show less' : 'Show all timings'}>
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

      {/* Timing list with visual bars */}
      <div className="space-y-1">
        {displayTimings.map((timing, index) => {
          const duration = timing.duration || 0
          const barWidth = maxDuration > 0
            ? (duration / maxDuration) * 100
            : 0

          return (
            <div
              key={`${timing.checkpoint}-${index}`}
              className="text-xs"
            >
              {/* Timing entry */}
              <div className="flex items-center gap-2">
                {/* Checkpoint name */}
                <span className="font-medium min-w-[140px] truncate">
                  {timing.checkpoint}
                </span>

                {/* Duration badge */}
                <Badge
                  variant="outline"
                  className={`text-xs h-5 px-1.5 ${getDurationColor(duration).split(' ')[0]}`}
                >
                  {formatDuration(duration)}
                </Badge>

                {/* Visual duration bar */}
                {!compact && duration > 0 && (
                  <div className="flex-1 max-w-[200px]">
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getDurationColor(duration).split(' ')[1]} opacity-50`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Metadata (if exists and not compact) */}
              {!compact && timing.metadata && (
                <div className="mt-1 ml-[148px] p-2 bg-background/50 rounded text-xs">
                  <pre className="whitespace-pre-wrap break-words">
                    {formatJsonForInlineDisplay(timing.metadata, 200)}
                  </pre>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Summary stats */}
      {displayTimings.length > 0 && (
        <div className="mt-3 pt-2 border-t flex items-center gap-4 text-xs text-muted-foreground">
          <span>
            Total: {formatDuration(
              displayTimings.reduce((sum, t) => sum + (t.duration || 0), 0)
            )}
          </span>
          <span>
            Avg: {formatDuration(
              displayTimings.reduce((sum, t) => sum + (t.duration || 0), 0) / displayTimings.length
            )}
          </span>
          <span>
            Max: {formatDuration(maxDuration)}
          </span>
        </div>
      )}

      {/* Show indicator if not expanded and there are more */}
      {!isExpanded && hasMore && (
        <div className="mt-2 text-center">
          <span className="text-xs text-muted-foreground">
            ... {timings.length - maxInitialDisplay} earlier operations hidden
          </span>
        </div>
      )}
    </div>
  )
}