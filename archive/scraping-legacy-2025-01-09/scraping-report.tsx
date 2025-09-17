'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  CheckCircle2, 
  XCircle, 
  Clock,
  FileText,
  Download,
  AlertCircle,
  Globe,
  Zap,
  Search,
  Sparkles,
  BarChart3,
  ExternalLink,
  Info,
  Rocket,
  Plus,
  ChevronDown,
  ChevronUp,
  Link,
  RefreshCw,
  PlayCircle
} from 'lucide-react'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { TooltipWrapper } from './tooltip-wrapper'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { normalizeUrl } from '@/lib/utils/html-decoder'

interface PageResult {
  url: string
  success: boolean
  title?: string
  contentLength?: number
  content?: string // Added for content preview
  discoveredLinks?: string[] // Added for discovered links  
  error?: string
  scraperUsed?: 'cheerio' | 'playwright'
  timeMs?: number
  enhanced?: boolean
}

interface PhaseMetrics {
  name: string
  duration: number
  pagesProcessed: number
  successRate?: number
}

interface ScrapingReportProps {
  sessionId: string
  domain: string
  totalPages: number
  successfulPages: number
  failedPages: number
  pages?: PageResult[]
  phaseMetrics?: PhaseMetrics[]
  totalDuration?: number
  validationScore?: number
  enhancementCount?: number
  scraperType?: 'cheerio' | 'playwright' | 'hybrid' | 'static' | 'dynamic' | 'spa'
  detectedTechnology?: string
  strategyReason?: string
  onDownload?: () => void
  onRetryFailed?: () => void
  onEnhanceWithPlaywright?: () => void
  onEnhanceWithScraper?: (scraperName: string) => void
  onScrapeDiscoveredLinks?: (links: string[]) => void
  onRequestDynamicScraping?: () => void
  isEnhancing?: boolean
  availableEnhancements?: Array<{
    id: string
    name: string
    label: string
    benefit: string
    icon?: React.ReactNode
  }>
}

export function ScrapingReport({
  sessionId,
  domain,
  totalPages,
  successfulPages,
  failedPages,
  pages = [],
  phaseMetrics = [],
  totalDuration = 0,
  validationScore,
  enhancementCount = 0,
  scraperType,
  detectedTechnology,
  strategyReason,
  onDownload,
  onRetryFailed,
  onEnhanceWithPlaywright,
  onEnhanceWithScraper,
  onScrapeDiscoveredLinks,
  onRequestDynamicScraping,
  isEnhancing = false,
  availableEnhancements = []
}: ScrapingReportProps) {
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set())
  const [showDiscoveredLinks, setShowDiscoveredLinks] = useState(false)
  const [selectedDiscoveredLinks, setSelectedDiscoveredLinks] = useState<Set<string>>(new Set())
  const [showEnhancementOptions, setShowEnhancementOptions] = useState(false)
  
  const successRate = totalPages > 0 ? (successfulPages / totalPages) * 100 : 0
  
  const successfulPagesList = pages.filter(p => p.success)
  const failedPagesList = pages.filter(p => !p.success)
  
  // Collect all discovered links from scraping, excluding duplicates
  // Using the shared normalizeUrl utility to follow DRY principles
  const existingPageUrls = new Set(pages.map(p => p.url))
  const normalizedExistingUrls = new Set(pages.map(p => normalizeUrl(p.url)))
  const allDiscoveredLinks = new Set<string>()
  
  pages.forEach(page => {
    if (page.discoveredLinks) {
      page.discoveredLinks.forEach(link => {
        // Normalize the discovered link
        const normalizedLink = normalizeUrl(link)
        
        // Only add if it's not already in our scraped pages (check both raw and normalized)
        if (!existingPageUrls.has(link) && !normalizedExistingUrls.has(normalizedLink)) {
          allDiscoveredLinks.add(link)
        }
      })
    }
  })
  
  // Final deduplication pass to ensure no normalized duplicates in discovered links
  const seenNormalized = new Set<string>()
  const discoveredLinksArray = Array.from(allDiscoveredLinks).filter(link => {
    const normalized = normalizeUrl(link)
    if (seenNormalized.has(normalized)) {
      return false
    }
    seenNormalized.add(normalized)
    return true
  })
  
  const togglePageExpanded = (url: string) => {
    const newExpanded = new Set(expandedPages)
    if (newExpanded.has(url)) {
      newExpanded.delete(url)
    } else {
      newExpanded.add(url)
    }
    setExpandedPages(newExpanded)
  }
  
  React.useEffect(() => {
    permanentLogger.info('Report displayed', { category: 'SCRAPING_REPORT', ...{
      sessionId,
      domain,
      totalPages,
      successfulPages,
      failedPages,
      successRate: `${successRate.toFixed(1 })}%`
    })
  }, [])

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
  }

  const getSuccessRateBadgeColor = (rate: number) => {
    if (rate >= 90) return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
    if (rate >= 70) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
    return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
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
          <TooltipWrapper content={`Used Cheerio HTML parser for fast extraction (10x faster). ${detectedTechnology ? `Detected: ${detectedTechnology}` : 'Best for static HTML content without JavaScript rendering.'} ${strategyReason || ''}`}>
            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
              ⚡ Cheerio (10x Fast)
            </Badge>
          </TooltipWrapper>
        )
      case 'playwright':
        return (
          <TooltipWrapper content={`Used Playwright browser for full JavaScript rendering. ${detectedTechnology ? `Detected: ${detectedTechnology}` : 'Captures dynamic content with complete browser execution.'} ${strategyReason || ''}`}>
            <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
              🌐 Playwright (Full)
            </Badge>
          </TooltipWrapper>
        )
      case 'hybrid':
        return (
          <TooltipWrapper content={`Intelligently switched between Cheerio and Playwright based on page complexity. ${detectedTechnology ? `Detected: ${detectedTechnology}` : 'Optimizes speed while ensuring content capture.'}`}>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
              🚀 Smart Routing
            </Badge>
          </TooltipWrapper>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Scraping Report for {domain}
            </CardTitle>
            <div className="flex items-center gap-2">
              {getScraperBadge()}
              <Badge className={getSuccessRateBadgeColor(successRate)}>
                {successRate.toFixed(0)}% Success Rate
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Total Pages</p>
              <p className="text-2xl font-bold">{totalPages}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Successful</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {successfulPages}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Failed</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {failedPages}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Total Time</p>
              <p className="text-2xl font-bold">{formatDuration(totalDuration)}</p>
            </div>
          </div>

          {/* Phase Metrics */}
          {phaseMetrics.length > 0 && (
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium">Phase Performance</h4>
                <TooltipWrapper content="Breakdown of time and resources spent in each scraping phase. Shows how efficiently the multi-phase system processed your pages.">
                  <Info className="h-3 w-3 text-muted-foreground" />
                </TooltipWrapper>
              </div>
              <div className="space-y-2">
                {phaseMetrics.map((phase) => {
                  const getPhaseTooltip = () => {
                    switch (phase.name) {
                      case 'Rapid Scrape':
                        return `Fast HTML extraction phase processed ${phase.pagesProcessed} pages in ${formatDuration(phase.duration)} using parallel Cheerio parsers`
                      case 'Validation':
                        return `AI-powered content quality analysis checked ${phase.pagesProcessed} pages for completeness and structure`
                      case 'Enhancement':
                        return `Full browser rendering phase re-scraped ${phase.pagesProcessed} low-quality pages using Playwright for better content capture`
                      default:
                        return `${phase.name} phase processed ${phase.pagesProcessed} pages`
                    }
                  }
                  
                  return (
                    <TooltipWrapper key={phase.name} content={getPhaseTooltip()}>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-900/20">
                        <div className="flex items-center gap-2">
                          {phase.name === 'Rapid Scrape' && <Zap className="h-4 w-4 text-yellow-600" />}
                          {phase.name === 'Validation' && <Search className="h-4 w-4 text-blue-600" />}
                          {phase.name === 'Enhancement' && <Sparkles className="h-4 w-4 text-purple-600" />}
                          <span className="text-sm font-medium">{phase.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({phase.pagesProcessed} pages)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {phase.successRate !== undefined && (
                            <Badge variant="outline" className="text-xs">
                              {phase.successRate.toFixed(0)}%
                            </Badge>
                          )}
                          <span className="text-sm text-muted-foreground">
                            {formatDuration(phase.duration)}
                          </span>
                        </div>
                      </div>
                    </TooltipWrapper>
                  )
                })}
              </div>
            </div>
          )}

          {/* Additional Metrics */}
          <div className="flex items-center gap-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
            {validationScore !== undefined && (
              <TooltipWrapper content="Overall content quality score across all scraped pages. Score below 70% indicates potential issues with JavaScript rendering or dynamic content loading.">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">
                    Content Quality: <strong>{(validationScore * 100).toFixed(0)}%</strong>
                  </span>
                </div>
              </TooltipWrapper>
            )}
            {enhancementCount > 0 && (
              <TooltipWrapper content="Pages that were automatically re-scraped with full browser rendering after failing initial quality checks. These pages now have complete content.">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <span className="text-sm">
                    Enhanced Pages: <strong>{enhancementCount}</strong>
                  </span>
                </div>
              </TooltipWrapper>
            )}
          </div>

          {/* Enhancement Section - Only show for fast/static scrapes */}
          {(scraperType === 'cheerio' || scraperType === 'static') && !isEnhancing && onEnhanceWithPlaywright && (
            <Card className="mt-6 border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Rocket className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  Enhance Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="border-blue-200 dark:border-blue-800">
                  <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <AlertDescription className="text-sm">
                    Initial fast scraping complete using Cheerio. You can enhance the results with JavaScript-rendered content:
                  </AlertDescription>
                </Alert>
                
                <div className="grid gap-2">
                  <TooltipWrapper content="Run a full browser-based scrape to capture dynamic content, JavaScript-rendered elements, and interactive components that Cheerio might have missed">
                    <Button 
                      onClick={onEnhanceWithPlaywright}
                      className="justify-start"
                      variant="outline"
                    >
                      <Globe className="mr-2 h-4 w-4" />
                      Run Full JavaScript Scraping
                      <Badge className="ml-auto" variant="secondary">
                        +Rich Content
                      </Badge>
                    </Button>
                  </TooltipWrapper>
                  
                  {/* Future scrapers will auto-appear here */}
                  {availableEnhancements.map(enhancement => (
                    <TooltipWrapper 
                      key={enhancement.id}
                      content={`Enhance results using ${enhancement.name}. ${enhancement.benefit}`}
                    >
                      <Button 
                        onClick={() => onEnhanceWithScraper?.(enhancement.id)}
                        className="justify-start"
                        variant="outline"
                      >
                        {enhancement.icon || <Plus className="mr-2 h-4 w-4" />}
                        <span className="mr-2">{enhancement.label}</span>
                        <Badge className="ml-auto" variant="secondary">
                          {enhancement.benefit}
                        </Badge>
                      </Button>
                    </TooltipWrapper>
                  ))}
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Enhancement will merge new data with existing results, improving content quality and completeness.
                </p>
              </CardContent>
            </Card>
          )}
          
          {/* Show enhancing status */}
          {isEnhancing && (
            <Card className="mt-6 border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="animate-spin">
                    <Globe className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="font-medium text-amber-900 dark:text-amber-100">
                      Enhancing with dynamic scraping...
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Running full browser automation to capture JavaScript-rendered content
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Enhancement Options Section */}
          {(failedPages > 0 || successfulPages < totalPages || scraperType === 'static' || scraperType === 'cheerio') && (
            <Card className="mt-6 border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span>Enhancement Options</span>
                  </div>
                  <TooltipWrapper content="Options to improve scraping quality or recover failed pages">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowEnhancementOptions(!showEnhancementOptions)}
                    >
                      {showEnhancementOptions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </TooltipWrapper>
                </CardTitle>
              </CardHeader>
              {showEnhancementOptions && (
                <CardContent className="space-y-3">
                  {(scraperType === 'static' || scraperType === 'cheerio') && onRequestDynamicScraping && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-900 border">
                      <div className="flex items-center gap-3">
                        <PlayCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <div>
                          <p className="font-medium">Request Dynamic Scraping</p>
                          <p className="text-sm text-muted-foreground">
                            Use full browser automation for JavaScript-heavy pages
                          </p>
                        </div>
                      </div>
                      <TooltipWrapper content="Run Playwright browser scraping for better content extraction">
                        <Button onClick={onRequestDynamicScraping} size="sm" variant="default">
                          <Globe className="h-4 w-4 mr-1" />
                          Enhance All
                        </Button>
                      </TooltipWrapper>
                    </div>
                  )}
                  
                  {failedPages > 0 && onRetryFailed && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-900 border">
                      <div className="flex items-center gap-3">
                        <RefreshCw className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        <div>
                          <p className="font-medium">Retry Failed Pages</p>
                          <p className="text-sm text-muted-foreground">
                            {failedPages} pages failed - try alternative scraping methods
                          </p>
                        </div>
                      </div>
                      <TooltipWrapper content="Attempt to re-scrape failed pages with different strategies">
                        <Button onClick={onRetryFailed} size="sm" variant="outline">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          Retry {failedPages}
                        </Button>
                      </TooltipWrapper>
                    </div>
                  )}

                  {availableEnhancements.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Specialized Scrapers:</p>
                      {availableEnhancements.map(enhancement => (
                        <div key={enhancement.id} className="flex items-center justify-between p-2 rounded bg-white dark:bg-gray-900 border">
                          <div className="flex items-center gap-2">
                            {enhancement.icon}
                            <div>
                              <p className="text-sm font-medium">{enhancement.label}</p>
                              <p className="text-xs text-muted-foreground">{enhancement.benefit}</p>
                            </div>
                          </div>
                          <Button 
                            onClick={() => onEnhanceWithScraper?.(enhancement.name)} 
                            size="sm" 
                            variant="ghost"
                          >
                            Use
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 mt-6">
            {onDownload && (
              <TooltipWrapper content="Download a detailed JSON report of all scraped pages including content, metadata, and quality scores">
                <Button onClick={onDownload} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  Download Report
                </Button>
              </TooltipWrapper>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Discovered Links Section with Selection */}
      {discoveredLinksArray.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span>Discovered Links ({discoveredLinksArray.length})</span>
                {selectedDiscoveredLinks.size > 0 && (
                  <Badge variant="secondary">
                    {selectedDiscoveredLinks.size} selected
                  </Badge>
                )}
              </div>
              <TooltipWrapper content="These are additional links found during scraping that weren't in the initial sitemap">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDiscoveredLinks(!showDiscoveredLinks)}
                >
                  {showDiscoveredLinks ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </TooltipWrapper>
            </CardTitle>
          </CardHeader>
          {showDiscoveredLinks && (
            <CardContent>
              {/* Selection Controls */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDiscoveredLinks(new Set(discoveredLinksArray))}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDiscoveredLinks(new Set())}
                  >
                    Clear Selection
                  </Button>
                </div>
                {onScrapeDiscoveredLinks && selectedDiscoveredLinks.size > 0 && (
                  <TooltipWrapper content="Add selected links to the scraping queue and scrape them">
                    <Button
                      onClick={() => onScrapeDiscoveredLinks(Array.from(selectedDiscoveredLinks))}
                      size="sm"
                      variant="default"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Scrape {selectedDiscoveredLinks.size} Selected
                    </Button>
                  </TooltipWrapper>
                )}
              </div>
              
              <ScrollArea className="h-[200px]">
                <div className="space-y-1">
                  {discoveredLinksArray.map((link, index) => {
                    const isSelected = selectedDiscoveredLinks.has(link)
                    return (
                      <div 
                        key={index} 
                        className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-900/20"
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            const newSelection = new Set(selectedDiscoveredLinks)
                            if (checked) {
                              newSelection.add(link)
                            } else {
                              newSelection.delete(link)
                            }
                            setSelectedDiscoveredLinks(newSelection)
                          }}
                        />
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm truncate flex-1">{link}</span>
                        <TooltipWrapper content="Visit this discovered link">
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-auto text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </TooltipWrapper>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          )}
        </Card>
      )}

      {/* Successful Pages */}
      {successfulPagesList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              Successfully Scraped Pages ({successfulPagesList.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {successfulPagesList.map((page, index) => (
                  <Collapsible key={index} open={expandedPages.has(page.url)}>
                    <div className="border rounded-lg">
                      <CollapsibleTrigger
                        onClick={() => togglePageExpanded(page.url)}
                        className="w-full"
                      >
                        <div className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-900/20">
                          <div className="flex items-center gap-2 flex-1">
                            <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                            <div className="min-w-0 flex-1 text-left">
                              <div className="flex items-center gap-2">
                                <Globe className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                <span className="text-sm truncate">{page.url}</span>
                                {page.enhanced && (
                                  <Badge variant="outline" className="text-xs">Enhanced</Badge>
                                )}
                              </div>
                              {page.title && (
                                <p className="text-xs text-muted-foreground truncate">{page.title}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {page.contentLength && (
                                <span>{(page.contentLength / 1024).toFixed(1)}KB</span>
                              )}
                              {page.timeMs && (
                                <span>{formatDuration(page.timeMs)}</span>
                              )}
                            </div>
                            <TooltipWrapper content={expandedPages.has(page.url) ? "Hide content preview" : "Show content preview"}>
                              {expandedPages.has(page.url) ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </TooltipWrapper>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="p-3 border-t bg-gray-50 dark:bg-gray-900/20">
                          {page.content ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <FileText className="h-4 w-4" />
                                Content Preview
                              </div>
                              <div className="bg-white dark:bg-gray-900 p-3 rounded border text-xs font-mono overflow-x-auto">
                                <pre className="whitespace-pre-wrap">{page.content.substring(0, 500)}...</pre>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No content preview available</p>
                          )}
                          {page.discoveredLinks && page.discoveredLinks.length > 0 && (
                            <div className="mt-3 space-y-2">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <Link className="h-4 w-4" />
                                Links found on this page ({page.discoveredLinks.length})
                              </div>
                              <div className="bg-white dark:bg-gray-900 p-2 rounded border">
                                <div className="space-y-1 max-h-[100px] overflow-y-auto">
                                  {page.discoveredLinks.slice(0, 10).map((link, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                      <span className="text-xs truncate">{link}</span>
                                    </div>
                                  ))}
                                  {page.discoveredLinks.length > 10 && (
                                    <p className="text-xs text-muted-foreground">...and {page.discoveredLinks.length - 10} more</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Failed Pages */}
      {failedPagesList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <XCircle className="h-5 w-5" />
              Failed Pages ({failedPagesList.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {failedPagesList.map((page, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-2 rounded-lg bg-red-50 dark:bg-red-950/20"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Globe className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm truncate">{page.url}</span>
                        </div>
                        {page.error && (
                          <p className="text-xs text-red-600 dark:text-red-400">{page.error}</p>
                        )}
                      </div>
                    </div>
                    <a 
                      href={page.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}