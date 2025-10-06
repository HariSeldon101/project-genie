'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { 
  Lightbulb,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Zap,
  Globe,
  FileSearch,
  Target
} from 'lucide-react'
import { TooltipWrapper } from '../tooltip-wrapper'

// Define type locally since additive scrapers were archived
interface ScrapingSuggestion {
  url: string
  reason: string
  priority: 'high' | 'medium' | 'low'
}

interface ScrapingSuggestionsProps {
  suggestions: ScrapingSuggestion[]
  onSelect: (suggestion: ScrapingSuggestion) => void
}

/**
 * Displays simple rule-based suggestions for next scraping actions
 * Provides options based on available scrapers and discovered pages
 */
export function ScrapingSuggestions({ 
  suggestions, 
  onSelect 
}: ScrapingSuggestionsProps) {
  permanentLogger.info('Rendering suggestions', {
    category: 'SCRAPING_SUGGESTIONS',
    suggestionCount: suggestions.length,
    types: suggestions.map(s => s.type)
  })

  const getIcon = (type: string, action?: string) => {
    if (action === 'use_scraper') {
      switch (type) {
        case 'quality':
          return <Globe className="h-4 w-4" />
        case 'coverage':
          return <FileSearch className="h-4 w-4" />
        default:
          return <Zap className="h-4 w-4" />
      }
    }
    
    switch (type) {
      case 'quality':
        return <AlertTriangle className="h-4 w-4" />
      case 'coverage':
        return <Target className="h-4 w-4" />
      case 'performance':
        return <TrendingUp className="h-4 w-4" />
      case 'completion':
        return <CheckCircle2 className="h-4 w-4" />
      default:
        return <Lightbulb className="h-4 w-4" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'quality':
        return 'border-orange-200 bg-orange-50/30'
      case 'coverage':
        return 'border-blue-200 bg-blue-50/30'
      case 'performance':
        return 'border-purple-200 bg-purple-50/30'
      case 'completion':
        return 'border-green-200 bg-green-50/30'
      default:
        return 'border-gray-200'
    }
  }

  const getActionButton = (suggestion: ScrapingSuggestion) => {
    switch (suggestion.action) {
      case 'use_scraper':
        return (
          <Button
            onClick={() => onSelect(suggestion)}
            size="sm"
            className="gap-2"
          >
            Run {suggestion.scraperId === 'dynamic' ? 'Playwright' : 'Scraper'}
            <ArrowRight className="h-3 w-3" />
          </Button>
        )
      case 'review_data':
        return (
          <Button
            onClick={() => onSelect(suggestion)}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            Review Data
            <ArrowRight className="h-3 w-3" />
          </Button>
        )
      case 'complete':
        return (
          <Button
            onClick={() => onSelect(suggestion)}
            variant="default"
            size="sm"
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            Complete Session
            <CheckCircle2 className="h-3 w-3" />
          </Button>
        )
      default:
        return (
          <Button
            onClick={() => onSelect(suggestion)}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            View Details
            <ArrowRight className="h-3 w-3" />
          </Button>
        )
    }
  }

  if (suggestions.length === 0) {
    return null
  }

  // Sort suggestions by priority
  const sortedSuggestions = [...suggestions].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3)
  })

  // Get the top recommendation
  const topRecommendation = sortedSuggestions[0]
  const otherSuggestions = sortedSuggestions.slice(1)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          AI Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Top Recommendation */}
        {topRecommendation && (
          <div className={`
            border-2 rounded-lg p-4 transition-all
            ${getTypeColor(topRecommendation.type)}
            border-purple-300 bg-gradient-to-r from-purple-50/50 to-transparent
          `}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  {getIcon(topRecommendation.type, topRecommendation.action)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Recommended Action</span>
                    <Badge 
                      variant="outline" 
                      className={getPriorityColor(topRecommendation.priority)}
                    >
                      {topRecommendation.priority} priority
                    </Badge>
                  </div>
                </div>
              </div>
              {getActionButton(topRecommendation)}
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              {topRecommendation.message}
            </p>
            {topRecommendation.details && (
              <div className="text-xs text-muted-foreground bg-white/50 rounded p-2">
                {topRecommendation.details}
              </div>
            )}
          </div>
        )}

        {/* Other Suggestions */}
        {otherSuggestions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Other Suggestions
            </h4>
            {otherSuggestions.map((suggestion, index) => (
              <div
                key={index}
                className={`
                  border rounded-lg p-3 transition-all
                  ${getTypeColor(suggestion.type)}
                `}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2 flex-1">
                    <div className="p-1.5 bg-white rounded">
                      {getIcon(suggestion.type, suggestion.action)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">{suggestion.message}</p>
                      {suggestion.details && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {suggestion.details}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getPriorityColor(suggestion.priority)}`}
                    >
                      {suggestion.priority}
                    </Badge>
                    <TooltipWrapper content="Take this action">
                      {getActionButton(suggestion)}
                    </TooltipWrapper>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Help Text */}
        <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-purple-600 mt-0.5" />
            <div className="text-sm text-purple-900 dark:text-purple-100">
              <p className="font-medium mb-1">How Suggestions Work:</p>
              <p>Our AI analyzes your scraped data quality, coverage gaps, and page complexity to recommend the best next action. Each scraper adds to your data - nothing is replaced!</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}