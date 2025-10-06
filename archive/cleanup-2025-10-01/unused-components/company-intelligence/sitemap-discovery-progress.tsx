'use client'

import React from 'react'
import { CheckCircle, Circle, Loader2 } from 'lucide-react'

interface SitemapDiscoveryProgressProps {
  currentStage: string
  discoveredPages: number
  isRetrying?: boolean
  stageCounts?: Record<string, number>
}

const DISCOVERY_STAGES = [
  { id: 'checking-sitemap', label: 'Checking sitemap.xml', icon: '🗺️' },
  { id: 'homepage-crawl', label: 'Crawling Homepage', icon: '🏠' },
  { id: 'pattern-discovery', label: 'Common Pages', icon: '🔍' },
  { id: 'blog-crawl', label: 'Blog Discovery', icon: '📰' },
  { id: 'validation', label: 'Validating Pages', icon: '✅' }
]

export function SitemapDiscoveryProgress({ 
  currentStage, 
  discoveredPages,
  isRetrying = false,
  stageCounts = {} 
}: SitemapDiscoveryProgressProps) {
  // Determine which stage index we're at
  const currentStageIndex = DISCOVERY_STAGES.findIndex(s => s.id === currentStage)
  
  return (
    <div className="w-full space-y-3">
      {/* Stage indicators */}
      <div className="relative">
        {/* Progress line */}
        <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-800 rounded">
          <div 
            className="h-full bg-blue-500 rounded transition-all duration-500"
            style={{ 
              width: `${Math.max(0, (currentStageIndex / (DISCOVERY_STAGES.length - 1)) * 100)}%` 
            }}
          />
        </div>
        
        {/* Stage circles */}
        <div className="relative flex justify-between">
          {DISCOVERY_STAGES.map((stage, index) => {
            const isComplete = index < currentStageIndex
            const isCurrent = index === currentStageIndex
            const isPending = index > currentStageIndex
            
            return (
              <div 
                key={stage.id}
                className="flex flex-col items-center"
              >
                {/* Circle indicator */}
                <div 
                  className={`
                    relative z-10 w-10 h-10 rounded-full flex items-center justify-center
                    transition-all duration-300
                    ${isComplete ? 'bg-green-500 text-white' : ''}
                    ${isCurrent ? 'bg-blue-500 text-white ring-4 ring-blue-200 dark:ring-blue-800' : ''}
                    ${isPending ? 'bg-gray-200 dark:bg-gray-800 text-gray-500' : ''}
                  `}
                >
                  {isComplete && <CheckCircle className="w-5 h-5" />}
                  {isCurrent && (
                    isRetrying ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <span className="text-lg">{stage.icon}</span>
                    )
                  )}
                  {isPending && <Circle className="w-5 h-5" />}
                </div>
                
                {/* Stage label */}
                <div className="mt-2 text-center">
                  <p 
                    className={`
                      text-xs font-medium
                      ${isCurrent ? 'text-blue-600 dark:text-blue-400' : ''}
                      ${isPending ? 'text-gray-400 dark:text-gray-600' : ''}
                      ${isComplete && !isCurrent ? 'text-gray-900 dark:text-gray-100' : ''}
                    `}
                  >
                    {stage.label}
                  </p>
                  {/* Show page count for completed stages and current stage */}
                  {(isComplete || isCurrent) && (stageCounts[stage.id] || (isCurrent ? discoveredPages : 0)) > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {stageCounts[stage.id] || (isCurrent ? discoveredPages : 0)} pages
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      
      {/* Current action description */}
      {currentStage && (
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {currentStage === 'checking-sitemap' && 'Looking for sitemap.xml and robots.txt...'}
            {currentStage === 'homepage-crawl' && 'Extracting all links from homepage navigation and footer...'}
            {currentStage === 'pattern-discovery' && 'Identifying common pages like About, Services, Contact...'}
            {currentStage === 'blog-crawl' && 'Checking for blog or news section...'}
            {currentStage === 'validation' && 'Validating and deduplicating discovered pages...'}
          </p>
        </div>
      )}
    </div>
  )
}