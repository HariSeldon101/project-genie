'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Zap,
  Search,
  Sparkles,
  ChevronRight,
  Info
} from 'lucide-react'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { TooltipWrapper } from './tooltip-wrapper'

interface ScrapingPhase {
  name: string
  status: 'pending' | 'in-progress' | 'complete' | 'failed' | 'skipped'
  time?: string
  details?: string
  icon?: React.ReactNode
}

interface ScrapingProgressProps {
  totalPages: number
  completedPages: number
  currentPhase: 'rapid-scrape' | 'validation' | 'enhancement' | 'complete'
  phases: ScrapingPhase[]
  validationScore?: number
  enhancementCount?: number
  scraperType?: 'cheerio' | 'playwright' | 'hybrid' | 'static' | 'dynamic' | 'spa'
  estimatedTimeRemaining?: number
  detectedTechnology?: string
  strategyReason?: string
}

export function ScrapingProgress({
  totalPages,
  completedPages,
  currentPhase,
  phases = [],
  validationScore,
  enhancementCount = 0,
  scraperType = 'cheerio',
  estimatedTimeRemaining,
  detectedTechnology,
  strategyReason
}: ScrapingProgressProps) {
  const progress = totalPages > 0 ? (completedPages / totalPages) * 100 : 0

  React.useEffect(() => {
    permanentLogger.info('Progress update', { category: 'SCRAPING_PROGRESS_UI', ...{
      totalPages,
      completedPages,
      currentPhase,
      progress: `${progress.toFixed(1 })}%`,
      scraperType
    })
  }, [completedPages, currentPhase])

  const getPhaseIcon = (phase: ScrapingPhase) => {
    if (phase.icon) return phase.icon
    
    switch (phase.name.toLowerCase()) {
      case 'rapid scrape':
        return <Zap className="h-4 w-4" />
      case 'validation':
        return <Search className="h-4 w-4" />
      case 'enhancement':
        return <Sparkles className="h-4 w-4" />
      default:
        return <ChevronRight className="h-4 w-4" />
    }
  }

  const getPhaseColor = (status: ScrapingPhase['status']) => {
    switch (status) {
      case 'complete':
        return 'text-green-600 dark:text-green-400'
      case 'in-progress':
        return 'text-blue-600 dark:text-blue-400'
      case 'failed':
        return 'text-red-600 dark:text-red-400'
      case 'skipped':
        return 'text-gray-400 dark:text-gray-600'
      default:
        return 'text-gray-500 dark:text-gray-400'
    }
  }

  const getStatusIcon = (status: ScrapingPhase['status']) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'in-progress':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'skipped':
        return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
    }
  }

  const getScraperBadge = () => {
    // Map strategy types to scraper display
    const strategyMapping = {
      'static': 'cheerio',
      'dynamic': 'playwright',
      'spa': 'playwright',
      'hybrid': 'hybrid',
      'cheerio': 'cheerio',
      'playwright': 'playwright'
    }
    
    const mappedType = strategyMapping[scraperType as keyof typeof strategyMapping] || scraperType
    
    switch (mappedType) {
      case 'cheerio':
        return (
          <TooltipWrapper content={`Using Cheerio HTML parser for fast extraction (10x faster). ${detectedTechnology ? `Detected: ${detectedTechnology}` : 'Best for static HTML content without JavaScript rendering.'} ${strategyReason || ''}`}>
            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
              ⚡ Cheerio (10x Fast)
            </Badge>
          </TooltipWrapper>
        )
      case 'playwright':
        return (
          <TooltipWrapper content={`Using Playwright browser for full JavaScript rendering. ${detectedTechnology ? `Detected: ${detectedTechnology}` : 'Captures dynamic content with complete browser execution.'} ${strategyReason || ''}`}>
            <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
              🌐 Playwright (Full)
            </Badge>
          </TooltipWrapper>
        )
      case 'hybrid':
        return (
          <TooltipWrapper content={`Intelligently switching between Cheerio and Playwright based on page complexity. ${detectedTechnology ? `Detected: ${detectedTechnology}` : 'Optimizes speed while ensuring content capture.'}`}>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
              🚀 Smart Routing
            </Badge>
          </TooltipWrapper>
        )
      default:
        return (
          <TooltipWrapper content="Auto-detecting optimal scraping strategy...">
            <Badge variant="secondary" className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
              🔍 Auto-Detect
            </Badge>
          </TooltipWrapper>
        )
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Multi-Phase Intelligent Scraping
          </CardTitle>
          {getScraperBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Overall Progress: {completedPages} of {totalPages} pages
            </span>
            <span className="font-medium">{progress.toFixed(0)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          {estimatedTimeRemaining && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Est. {estimatedTimeRemaining}s remaining</span>
            </div>
          )}
        </div>

        {/* Phase Progress */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium">Scraping Phases</h4>
            <TooltipWrapper content="Our intelligent scraping system uses 3 phases: Rapid extraction for quick HTML parsing, Validation to check content quality, and Enhancement for JavaScript-heavy pages that need full browser rendering.">
              <Info className="h-3 w-3 text-muted-foreground" />
            </TooltipWrapper>
          </div>
          <div className="space-y-2">
            {phases.map((phase, index) => {
              // Get phase-specific tooltip content
              const getPhaseTooltip = (phaseName: string) => {
                switch (phaseName.toLowerCase()) {
                  case 'rapid scrape':
                    return 'Phase 1: Quick HTML extraction using Cheerio parser. Processes multiple pages in parallel (5 at a time) for maximum speed. Works best with static HTML content.'
                  case 'validation':
                    return 'Phase 2: AI-powered content quality check. Analyzes extracted text to determine completeness, identifies missing sections, and scores content quality from 0-100%.'
                  case 'enhancement':
                    return 'Phase 3: Re-scrapes low-quality pages using Playwright browser with full JavaScript execution. Captures dynamic content, waits for AJAX calls, and handles SPAs.'
                  default:
                    return phase.details || ''
                }
              }
              
              return (
                <div key={phase.name}>
                  <TooltipWrapper 
                    content={getPhaseTooltip(phase.name)}
                    isSticky={false}
                  >
                    <div 
                      className={`flex items-center justify-between p-2 rounded-lg transition-all ${
                        phase.status === 'in-progress' 
                          ? 'bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800' 
                          : 'bg-gray-50 dark:bg-gray-900/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(phase.status)}
                        <div className="flex items-center gap-2">
                          <span className={`flex items-center gap-1 ${getPhaseColor(phase.status)}`}>
                            {getPhaseIcon(phase)}
                            <span className="font-medium">{phase.name}</span>
                          </span>
                          {phase.details && (
                            <span className="text-xs text-muted-foreground">
                              ({phase.details})
                            </span>
                          )}
                        </div>
                      </div>
                      {phase.time && (
                        <span className="text-xs text-muted-foreground">
                          {phase.time}
                        </span>
                      )}
                    </div>
                  </TooltipWrapper>
                </div>
              )
            })}
          </div>
        </div>

        {/* Statistics */}
        {(validationScore !== undefined || enhancementCount > 0) && (
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            {validationScore !== undefined && (
              <TooltipWrapper content="AI-powered content quality score (0-100%). Measures text completeness, structure, and relevance. Pages below 70% are marked for enhancement.">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Validation Score</span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-800 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                        validationScore > 0.7 ? 'bg-green-500' : 
                        validationScore > 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${validationScore * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">
                    {(validationScore * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              </TooltipWrapper>
            )}
            
            {enhancementCount > 0 && (
              <TooltipWrapper content="Number of pages re-scraped with Playwright browser for better content capture. These pages had low validation scores and required JavaScript rendering.">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Pages Enhanced</span>
                  <div className="flex items-center gap-1">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium">{enhancementCount} pages</span>
                  </div>
                </div>
              </TooltipWrapper>
            )}
          </div>
        )}

        {/* Current Action */}
        {currentPhase !== 'complete' && (
          <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span className="text-sm text-blue-600 dark:text-blue-400">
              {currentPhase === 'rapid-scrape' && 'Performing rapid content extraction...'}
              {currentPhase === 'validation' && 'Validating scraped content quality...'}
              {currentPhase === 'enhancement' && 'Enhancing incomplete pages with full rendering...'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}