/**
 * Discovery header component
 * Shows current discovery phase and progress
 * Displays errors when they occur
 */

import React from 'react'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import type { DiscoveryHeaderProps } from '../types'

/**
 * Get human-readable phase name
 */
const getPhaseDisplayName = (phase: DiscoveryHeaderProps['phase']) => {
  const phaseNames = {
    idle: 'Ready to Start',
    sitemap: 'Checking Sitemap',
    homepage: 'Scanning Homepage',
    blog: 'Discovering Blog',
    validation: 'Validating URLs',
    complete: 'Discovery Complete'
  }
  return phaseNames[phase] || phase
}

/**
 * Get phase description for user context
 */
const getPhaseDescription = (phase: DiscoveryHeaderProps['phase']) => {
  const descriptions = {
    idle: 'Waiting to begin discovery process',
    sitemap: 'Looking for sitemap.xml and robots.txt files',
    homepage: 'Extracting navigation links from the homepage',
    blog: 'Finding blog posts and article pages',
    validation: 'Verifying that discovered URLs are accessible',
    complete: 'All discovery phases completed successfully'
  }
  return descriptions[phase] || ''
}

/**
 * Discovery header component
 * Provides visual feedback on discovery progress
 */
export const DiscoveryHeader: React.FC<DiscoveryHeaderProps> = ({
  phase,
  progress,
  total,
  error,
  className
}) => {
  // Calculate progress percentage
  const progressPercentage = total > 0 ? (progress / total) * 100 : 0
  const isComplete = phase === 'complete'
  const isActive = phase !== 'idle' && !isComplete && !error

  return (
    <header className={cn('space-y-4', className)}>
      {/* Phase title and status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Status icon */}
          {error ? (
            <AlertCircle className="w-5 h-5 text-destructive" />
          ) : isComplete ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : isActive ? (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          ) : null}

          {/* Phase name */}
          <div>
            <h2 className="text-lg font-semibold">
              {getPhaseDisplayName(phase)}
            </h2>
            <p className="text-sm text-muted-foreground">
              {getPhaseDescription(phase)}
            </p>
          </div>
        </div>

        {/* Progress count */}
        {total > 0 && !error && (
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">{progress}</span>
            {' / '}
            <span className="font-medium">{total}</span>
            {' pages'}
          </div>
        )}
      </div>

      {/* Progress bar */}
      {isActive && (
        <Progress
          value={progressPercentage}
          className="h-2"
          aria-label={`Discovery progress: ${Math.round(progressPercentage)}%`}
        />
      )}

      {/* Error display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Discovery Error:</strong> {error.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Success message */}
      {isComplete && !error && (
        <Alert className="border-green-200 dark:border-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            Discovery completed successfully! Found {total} pages.
            Please review and select the pages you want to include.
          </AlertDescription>
        </Alert>
      )}
    </header>
  )
}