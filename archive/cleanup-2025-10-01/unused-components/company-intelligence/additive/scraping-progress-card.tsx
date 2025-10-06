/**
 * ScrapingProgressCard - Displays active scraping progress
 * 
 * SOLID Principles:
 * - Single Responsibility: Only displays progress
 * - Interface Segregation: Clean props interface
 * 
 * Pure presentational component
 */

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

export interface ScrapingProgress {
  currentPage: number
  totalPages: number
  pagesCompleted: number
  currentPhase: string
  message: string
  percentage: number
}

interface ScrapingProgressCardProps {
  progress: ScrapingProgress
  currentScraperName?: string
  streamingData?: any
  testId?: string
}

/**
 * Main progress card component
 * Shows real-time scraping progress with animated indicators
 */
export const ScrapingProgressCard: React.FC<ScrapingProgressCardProps> = ({ 
  progress,
  currentScraperName,
  streamingData,
  testId = "scraping-progress-card"
}) => {
  return (
    <Card className="border-blue-500" data-testid={testId}>
      <CardHeader>
        <CardTitle className="text-blue-600">
          Scraping in Progress...
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Scraper name and spinner */}
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
            <span data-testid="current-scraper-name">
              Running {currentScraperName || 'scraper'}
            </span>
          </div>
          
          {/* Streaming status */}
          {streamingData && (
            <div className="text-sm text-muted-foreground" data-testid="scraping-status">
              {streamingData.type === 'scraper_start' && 'Initializing scraper...'}
              {streamingData.type === 'page_complete' && 
                `Processing page ${streamingData.pageIndex}/${streamingData.totalPages}`}
              {streamingData.type === 'status' && streamingData.message}
              {streamingData.type === 'data' && `Received data...`}
            </div>
          )}
          
          {/* Progress message */}
          {progress.message && (
            <div className="text-sm text-muted-foreground">
              {progress.message}
              {progress.totalPages > 0 && (
                <span className="ml-2">
                  ({progress.currentPage}/{progress.totalPages})
                </span>
              )}
            </div>
          )}
          
          {/* Progress bar */}
          <Progress 
            value={progress.percentage || 50} 
            className="h-2" 
            data-testid="progress-bar"
          />
        </div>
      </CardContent>
    </Card>
  )
}