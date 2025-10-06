/**
 * Progress Indicator Component
 * 
 * Displays the current progress through the research stages with visual indicators
 * for each stage's status (complete, in-progress, upcoming).
 * 
 * Features:
 * - Visual progress bar showing overall completion
 * - Individual stage indicators with icons
 * - Dynamic styling based on stage status
 * - Cost accumulator display
 * 
 * @component
 */

'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle2, 
  Circle, 
  Loader2,
  Globe,
  Navigation,
  MousePointer,
  FileText,
  Sparkles,
  FileSearch
} from 'lucide-react'
import { TooltipWrapper } from '@/components/company-intelligence/tooltip-wrapper'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

/**
 * Stage configuration with display properties
 */
const STAGE_CONFIG = {
  'site-analysis': { 
    label: 'Site Analysis', 
    icon: Globe,
    description: 'Analyzing website structure and content'
  },
  'sitemap-discovery': { 
    label: 'Sitemap', 
    icon: Navigation,
    description: 'Discovering and mapping site pages'
  },
  'scraping': { 
    label: 'Scraping', 
    icon: MousePointer,
    description: 'Extracting content from selected pages'
  },
  'extraction': { 
    label: 'Extraction', 
    icon: FileText,
    description: 'Processing and structuring scraped data'
  },
  'enrichment': { 
    label: 'Enrichment', 
    icon: Sparkles,
    description: 'Enhancing data with additional intelligence'
  },
  'generation': { 
    label: 'Generation', 
    icon: FileSearch,
    description: 'Generating final research report'
  }
} as const

type StageKey = keyof typeof STAGE_CONFIG

interface ProgressIndicatorProps {
  /** Current active stage */
  currentStage: StageKey
  /** Whether to hide the progress card */
  hideProgressCard?: boolean
  /** Total estimated cost accumulated */
  totalCost?: number
  /** Whether generation is in progress */
  isGenerating?: boolean
  /** Custom className for styling */
  className?: string
}

/**
 * Calculate the overall progress percentage based on current stage
 */
function calculateProgress(currentStage: StageKey): number {
  const stages = Object.keys(STAGE_CONFIG) as StageKey[]
  const currentIndex = stages.indexOf(currentStage)
  return ((currentIndex + 1) / stages.length) * 100
}

/**
 * Determine the status of a stage relative to the current stage
 */
function getStageStatus(stage: StageKey, currentStage: StageKey): 'complete' | 'current' | 'upcoming' {
  const stages = Object.keys(STAGE_CONFIG) as StageKey[]
  const stageIndex = stages.indexOf(stage)
  const currentIndex = stages.indexOf(currentStage)
  
  if (stageIndex < currentIndex) return 'complete'
  if (stageIndex === currentIndex) return 'current'
  return 'upcoming'
}

export function ProgressIndicator({
  currentStage,
  hideProgressCard = false,
  totalCost = 0,
  isGenerating = false,
  className
}: ProgressIndicatorProps) {
  // Don't render if explicitly hidden
  if (hideProgressCard) return null

  const progressValue = calculateProgress(currentStage)
  const stages = Object.keys(STAGE_CONFIG) as StageKey[]

  return (
    <Card className={cn("border-gray-200 shadow-sm", className)}>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header with title and cost */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Research Progress</h3>
            {totalCost > 0 && (
              <TooltipWrapper content={`Estimated API costs for this research session`}>
                <Badge variant="secondary" className="ml-2">
                  Cost: ${totalCost.toFixed(4)}
                </Badge>
              </TooltipWrapper>
            )}
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <Progress value={progressValue} className="h-2" />
            <p className="text-sm text-muted-foreground">
              {Math.round(progressValue)}% Complete
            </p>
          </div>

          {/* Stage indicators */}
          <div className="grid grid-cols-6 gap-2">
            {stages.map((stage) => {
              const config = STAGE_CONFIG[stage]
              const status = getStageStatus(stage, currentStage)
              const Icon = config.icon
              
              return (
                <TooltipWrapper 
                  key={stage} 
                  content={`${config.label}: ${config.description}`}
                >
                  <div className="flex flex-col items-center space-y-1">
                    {/* Stage icon with dynamic styling */}
                    <div className={cn(
                      "p-2 rounded-full transition-colors",
                      status === 'complete' && "bg-green-100 text-green-600",
                      status === 'current' && "bg-blue-100 text-blue-600",
                      status === 'upcoming' && "bg-gray-100 text-gray-400"
                    )}>
                      {status === 'complete' ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : status === 'current' && isGenerating && stage === 'generation' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : status === 'current' ? (
                        <Icon className="w-4 h-4 animate-pulse" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </div>
                    
                    {/* Stage label */}
                    <span className={cn(
                      "text-xs text-center",
                      status === 'complete' && "text-green-600 font-medium",
                      status === 'current' && "text-blue-600 font-medium",
                      status === 'upcoming' && "text-gray-400"
                    )}>
                      {config.label}
                    </span>
                  </div>
                </TooltipWrapper>
              )
            })}
          </div>

          {/* Current stage description */}
          {currentStage && (
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Current Stage:</span>{' '}
                {STAGE_CONFIG[currentStage].description}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}