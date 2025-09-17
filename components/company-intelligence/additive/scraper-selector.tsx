'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { 
  Zap, 
  Globe, 
  Code, 
  Database,
  CheckCircle2,
  Clock,
  Cpu,
  TrendingUp,
  AlertCircle
} from 'lucide-react'
import { TooltipWrapper } from '../tooltip-wrapper'

interface Scraper {
  id: string
  name: string
  icon: React.ReactNode
  speed: 'fast' | 'medium' | 'slow'
  used: boolean
  disabled?: boolean
}

interface ScraperSelectorProps {
  scrapers: Scraper[]
  onSelect: (scraperId: string) => void
  isScrapingActive: boolean
  isDebouncing?: boolean
}

/**
 * Component for selecting and running individual scrapers
 * Part of the additive scraping architecture
 */
export function ScraperSelector({ 
  scrapers, 
  onSelect, 
  isScrapingActive,
  isDebouncing = false 
}: ScraperSelectorProps) {
  permanentLogger.info('Rendering scraper selector', {
    category: 'SCRAPER_SELECTOR',
    scraperCount: scrapers.length,
    isScrapingActive,
    usedScrapers: scrapers.filter(s => s.used).map(s => s.id)
  })

  const getSpeedBadge = (speed: string) => {
    switch (speed) {
      case 'fast':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <Zap className="h-3 w-3 mr-1" />
            Fast
          </Badge>
        )
      case 'medium':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Medium
          </Badge>
        )
      case 'slow':
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
            <Cpu className="h-3 w-3 mr-1" />
            Slow
          </Badge>
        )
      default:
        return null
    }
  }

  const getScraperDescription = (id: string) => {
    switch (id) {
      case 'static':
        return 'Lightning-fast HTML extraction using Cheerio. Best for static websites with server-rendered content. Processes 5 pages in parallel.'
      case 'dynamic':
        return 'Full browser rendering with Playwright. Captures JavaScript-generated content, waits for AJAX calls, and handles SPAs. Slower but more complete.'
      case 'spa':
        return 'Specialized scraper for Single Page Applications. Handles React, Vue, Angular apps with client-side routing and dynamic state management.'
      case 'api':
        return 'Extracts data directly from API endpoints. Bypasses HTML parsing for structured JSON/XML data. Most efficient when APIs are available.'
      default:
        return 'Custom scraper implementation'
    }
  }

  const getScraperCapabilities = (id: string) => {
    switch (id) {
      case 'static':
        return ['HTML parsing', 'Link extraction', 'Meta tags', 'Structured data', '10x speed']
      case 'dynamic':
        return ['JavaScript execution', 'AJAX waiting', 'Screenshots', 'Form interaction', 'Cookie handling']
      case 'spa':
        return ['Route detection', 'State management', 'Virtual DOM parsing', 'Component extraction']
      case 'api':
        return ['JSON parsing', 'GraphQL support', 'Pagination handling', 'Rate limiting']
      default:
        return []
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Available Scrapers</span>
          <TooltipWrapper content="Each scraper uses different techniques to extract data. Run multiple scrapers to get comprehensive coverage.">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </TooltipWrapper>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {scrapers.map((scraper) => {
            const capabilities = getScraperCapabilities(scraper.id)
            const description = getScraperDescription(scraper.id)
            
            return (
              <div
                key={scraper.id}
                className={`
                  relative border rounded-lg p-4 transition-all
                  ${scraper.disabled ? 'opacity-50 bg-gray-50' : 'hover:shadow-md'}
                  ${scraper.used ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}
                `}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`
                      p-2 rounded-lg 
                      ${scraper.used ? 'bg-green-100' : 'bg-gray-100'}
                    `}>
                      {scraper.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{scraper.name}</h4>
                        {scraper.used && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Used
                          </Badge>
                        )}
                        {getSpeedBadge(scraper.speed)}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {description}
                      </p>
                    </div>
                  </div>
                  
                  <TooltipWrapper 
                    content={
                      scraper.disabled 
                        ? 'This scraper is coming soon' 
                        : isScrapingActive || isDebouncing
                        ? 'Please wait for the current operation to complete'
                        : scraper.used 
                        ? 'Run this scraper again with different settings or pages'
                        : 'Run this scraper to extract data using its specific techniques'
                    }
                  >
                    <Button
                      onClick={() => onSelect(scraper.id)}
                      disabled={scraper.disabled || isScrapingActive || isDebouncing}
                      variant={scraper.used ? 'outline' : 'default'}
                      size="sm"
                      className="min-w-[100px]"
                    >
                      {isScrapingActive || isDebouncing ? 'Processing...' : scraper.used ? 'Run Again' : 'Run Scraper'}
                    </Button>
                  </TooltipWrapper>
                </div>

                {/* Capabilities */}
                {capabilities.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
                    {capabilities.map((capability, idx) => (
                      <Badge 
                        key={idx} 
                        variant="secondary" 
                        className="text-xs"
                      >
                        {capability}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Disabled overlay */}
                {scraper.disabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-lg">
                    <Badge variant="secondary" className="bg-gray-100">
                      Coming Soon
                    </Badge>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Tips */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
          <div className="flex items-start gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-900 dark:text-blue-100">
              <p className="font-medium mb-1">Pro Tip:</p>
              <p>Start with the Static HTML scraper for speed. If data is missing, run the JavaScript Renderer to capture dynamic content. Each scraper adds to your data - nothing is lost!</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}