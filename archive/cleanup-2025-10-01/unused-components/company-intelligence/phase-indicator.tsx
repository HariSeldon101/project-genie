'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Zap,
  Search,
  Sparkles,
  CheckCircle,
  Circle,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Phase {
  id: 'rapid-scrape' | 'validation' | 'enhancement'
  name: string
  icon: React.ReactNode
  description: string
  status: 'pending' | 'in-progress' | 'complete' | 'skipped'
  details?: string
}

interface PhaseIndicatorProps {
  currentPhase: 'rapid-scrape' | 'validation' | 'enhancement' | 'complete' | null
  phases?: Phase[]
}

const defaultPhases: Phase[] = [
  {
    id: 'rapid-scrape',
    name: 'Rapid Scrape',
    icon: <Zap className="h-5 w-5" />,
    description: 'Fast content extraction using Cheerio',
    status: 'pending'
  },
  {
    id: 'validation',
    name: 'Validation',
    icon: <Search className="h-5 w-5" />,
    description: 'Analyzing content quality and completeness',
    status: 'pending'
  },
  {
    id: 'enhancement',
    name: 'Enhancement',
    icon: <Sparkles className="h-5 w-5" />,
    description: 'Selective enhancement with Playwright',
    status: 'pending'
  }
]

export function PhaseIndicator({ currentPhase, phases = defaultPhases }: PhaseIndicatorProps) {
  if (!currentPhase || currentPhase === 'complete') {
    return null
  }

  // Update phase statuses based on current phase
  const updatedPhases = phases.map(phase => {
    if (phase.id === currentPhase) {
      return { ...phase, status: 'in-progress' as const }
    } else if (
      (currentPhase === 'validation' && phase.id === 'rapid-scrape') ||
      (currentPhase === 'enhancement' && (phase.id === 'rapid-scrape' || phase.id === 'validation'))
    ) {
      return { ...phase, status: 'complete' as const }
    }
    return phase
  })

  const currentPhaseData = updatedPhases.find(p => p.id === currentPhase)

  return (
    <Card className="w-full mb-4 overflow-hidden">
      {/* Current Phase Banner */}
      <div className={cn(
        "p-4 bg-gradient-to-r",
        currentPhase === 'rapid-scrape' && "from-green-500 to-emerald-600",
        currentPhase === 'validation' && "from-blue-500 to-indigo-600",
        currentPhase === 'enhancement' && "from-purple-500 to-pink-600"
      )}>
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur">
              {currentPhaseData?.icon}
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {currentPhaseData?.name}
              </h3>
              <p className="text-sm text-white/90">
                {currentPhaseData?.description}
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-white/20 text-white border-0">
            Phase {updatedPhases.findIndex(p => p.id === currentPhase) + 1} of 3
          </Badge>
        </div>
      </div>

      {/* Phase Steps */}
      <div className="p-4 bg-gray-50 dark:bg-gray-900/50">
        <div className="flex items-center justify-between gap-2">
          {updatedPhases.map((phase, index) => (
            <React.Fragment key={phase.id}>
              <div className={cn(
                "flex-1 flex flex-col items-center gap-2 p-3 rounded-lg transition-all",
                phase.status === 'in-progress' && "bg-white dark:bg-gray-800 shadow-md scale-105",
                phase.status === 'complete' && "opacity-70"
              )}>
                <div className={cn(
                  "relative flex items-center justify-center",
                  phase.status === 'in-progress' && "animate-pulse"
                )}>
                  {phase.status === 'complete' ? (
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  ) : phase.status === 'in-progress' ? (
                    <div className="relative">
                      <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-3 w-3 bg-blue-600 rounded-full animate-ping" />
                      </div>
                    </div>
                  ) : (
                    <Circle className="h-8 w-8 text-gray-400" />
                  )}
                </div>
                <div className="text-center">
                  <div className={cn(
                    "font-medium text-sm",
                    phase.status === 'in-progress' && "text-blue-600 dark:text-blue-400",
                    phase.status === 'complete' && "text-green-600 dark:text-green-400",
                    phase.status === 'pending' && "text-gray-500"
                  )}>
                    {phase.name}
                  </div>
                  {phase.details && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {phase.details}
                    </div>
                  )}
                </div>
              </div>
              
              {index < updatedPhases.length - 1 && (
                <div className={cn(
                  "h-0.5 w-8 transition-all",
                  phase.status === 'complete' ? "bg-green-600" : "bg-gray-300 dark:bg-gray-700"
                )} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </Card>
  )
}