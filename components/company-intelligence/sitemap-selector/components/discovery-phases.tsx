/**
 * Discovery phases indicator component
 * Shows visual progress through discovery phases
 * Matches the main phase indicator visual style with simple circular indicators
 */

import React from 'react'
import { CheckCircle2, Circle, Loader2, FileSearch, Globe, Newspaper, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DiscoveryPhasesProps } from '../types'

/**
 * Phase configuration with display information
 */
const phases = [
  {
    id: 'sitemap',
    label: 'Sitemap',
    description: 'Checking sitemap.xml',
    icon: FileSearch
  },
  {
    id: 'homepage',
    label: 'Homepage',
    description: 'Scanning navigation',
    icon: Globe
  },
  {
    id: 'blog',
    label: 'Blog',
    description: 'Finding articles',
    icon: Newspaper
  },
  {
    id: 'validation',
    label: 'Validation',
    description: 'Verifying URLs',
    icon: CheckCircle
  }
] as const

/**
 * Get phase status based on current phase
 */
const getPhaseStatus = (
  phaseId: string,
  currentPhase: DiscoveryPhasesProps['currentPhase']
): 'pending' | 'active' | 'complete' => {
  if (currentPhase === 'idle') return 'pending'
  if (currentPhase === 'complete') return 'complete'

  const phaseOrder = ['sitemap', 'homepage', 'blog', 'validation']
  const currentIndex = phaseOrder.indexOf(currentPhase)
  const phaseIndex = phaseOrder.indexOf(phaseId)

  if (phaseIndex < currentIndex) return 'complete'
  if (phaseIndex === currentIndex) return 'active'
  return 'pending'
}

/**
 * Discovery phases visual indicator
 * Simplified to match main phase-indicator component style
 */
export const DiscoveryPhases: React.FC<DiscoveryPhasesProps> = ({
  currentPhase,
  className
}) => {
  // Don't show when idle or complete
  if (!currentPhase || currentPhase === 'idle' || currentPhase === 'complete') {
    return null
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Simple horizontal indicator matching main phase style */}
      <div className="flex items-center justify-between gap-2 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
        {phases.map((phase, index) => {
          const status = getPhaseStatus(phase.id, currentPhase)
          const Icon = phase.icon
          const isLast = index === phases.length - 1

          return (
            <React.Fragment key={phase.id}>
              {/* Phase indicator */}
              <div className={cn(
                "flex flex-col items-center gap-2",
                status === 'active' && "scale-110"
              )}>
                {/* Icon circle */}
                <div className={cn(
                  "relative flex items-center justify-center",
                  status === 'active' && "animate-pulse"
                )}>
                  {status === 'complete' ? (
                    <div className="p-2 rounded-full bg-green-100 text-green-600 dark:bg-green-900/30">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                  ) : status === 'active' ? (
                    <div className="relative">
                      <div className="p-2 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-2 w-2 bg-blue-600 rounded-full animate-ping" />
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 rounded-full bg-gray-100 text-gray-400 dark:bg-gray-800">
                      <Icon className="h-5 w-5" />
                    </div>
                  )}
                </div>

                {/* Label */}
                <div className="text-center">
                  <div className={cn(
                    "text-xs font-medium",
                    status === 'active' && "text-blue-600 dark:text-blue-400",
                    status === 'complete' && "text-green-600 dark:text-green-400",
                    status === 'pending' && "text-gray-500"
                  )}>
                    {phase.label}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {phase.description}
                  </div>
                </div>
              </div>

              {/* Connector line between phases */}
              {!isLast && (
                <div className={cn(
                  "flex-1 h-0.5 max-w-[40px] transition-all",
                  status === 'complete' ? "bg-green-600" : "bg-gray-300 dark:bg-gray-700"
                )} />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}