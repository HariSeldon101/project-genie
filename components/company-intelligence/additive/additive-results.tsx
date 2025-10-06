'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { 
  FileText,
  Link,
  Clock,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Globe,
  Zap,
  Code,
  Database,
  ExternalLink,
  Eye
} from 'lucide-react'
import { TooltipWrapper } from '../tooltip-wrapper'

interface ScraperRun {
  scraperId: string
  scraperName: string
  timestamp: number
  pagesScraped: number
  dataPoints: number
  discoveredLinks: number
  discoveredUrls?: string[]
  extractedData?: {
    titles?: string[]
    descriptions?: string[]
    technologies?: string[]
    contacts?: { emails?: string[], phones?: string[] }
  }
  duration: number
  status: 'running' | 'complete' | 'failed'
  statusMessage?: string // User-friendly status message for better UX
}

interface AdditiveResultsProps {
  history: ScraperRun[]
  onViewDetails?: (run: ScraperRun) => void
}

/**
 * Displays the history of all scraper runs in the additive scraping session
 * Shows what data each scraper collected and discovered links
 */
export function AdditiveResults({ 
  history, 
  onViewDetails 
}: AdditiveResultsProps) {
  const [expandedRuns, setExpandedRuns] = useState<Set<number>>(new Set())
  const [showLinksFor, setShowLinksFor] = useState<Set<number>>(new Set())
  const [showDataFor, setShowDataFor] = useState<Set<number>>(new Set())

  permanentLogger.info('ADDITIVE_RESULTS', 'Rendering results', {
    historyCount: history.length,
    totalPages: history.reduce((sum, run) => sum + run.pagesScraped, 0),
    totalDataPoints: history.reduce((sum, run) => sum + run.dataPoints, 0)
  })

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedRuns)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedRuns(newExpanded)
  }

  const toggleShowLinks = (index: number) => {
    const newShowLinks = new Set(showLinksFor)
    if (newShowLinks.has(index)) {
      newShowLinks.delete(index)
    } else {
      newShowLinks.add(index)
    }
    setShowLinksFor(newShowLinks)
  }

  const toggleShowData = (index: number) => {
    const newShowData = new Set(showDataFor)
    if (newShowData.has(index)) {
      newShowData.delete(index)
    } else {
      newShowData.add(index)
    }
    setShowDataFor(newShowData)
  }

  const getScraperIcon = (scraperId: string) => {
    switch (scraperId) {
      case 'static':
        return <Zap className="h-4 w-4" />
      case 'dynamic':
        return <Globe className="h-4 w-4" />
      case 'spa':
        return <Code className="h-4 w-4" />
      case 'api':
        return <Database className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'running':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
  }

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    
    return date.toLocaleTimeString()
  }

  // Calculate cumulative stats
  const cumulativeStats = history.reduce((acc, run, index) => {
    const previous = index > 0 ? acc[index - 1] : { pages: 0, dataPoints: 0, links: 0 }
    return [...acc, {
      pages: previous.pages + run.pagesScraped,
      dataPoints: previous.dataPoints + run.dataPoints,
      links: previous.links + run.discoveredLinks
    }]
  }, [] as Array<{ pages: number, dataPoints: number, links: number }>)

  if (history.length === 0) {
    return null
  }

  return (
    <Card data-testid="scraping-history">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Scraping History</span>
          <Badge variant="outline" data-testid="history-run-count">
            {history.length} Run{history.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3" data-testid="history-items">
          {history.map((run, index) => {
            const isExpanded = expandedRuns.has(index)
            const cumulative = cumulativeStats[index]
            
            return (
              <div
                key={`${run.scraperId}-${index}`}
                data-testid={`history-item-${index}`}
                className={`
                  border rounded-lg transition-all
                  ${run.status === 'complete' ? 'border-green-200 bg-green-50/30' : ''}
                  ${run.status === 'running' ? 'border-blue-200 bg-blue-50/30' : ''}
                  ${run.status === 'failed' ? 'border-red-200 bg-red-50/30' : ''}
                `}
              >
                {/* Run Header */}
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <TooltipWrapper content={`${run.scraperName} - ${run.scraperId === 'static' ? 'Fast HTML parsing without JavaScript' : run.scraperId === 'dynamic' ? 'Full JavaScript rendering for complex sites' : 'Specialized scraper'}`}>
                        <div className="p-2 bg-white rounded-lg border cursor-help">
                          {getScraperIcon(run.scraperId)}
                        </div>
                      </TooltipWrapper>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{run.scraperName}</h4>
                          <TooltipWrapper content={`Scraping ${run.status === 'complete' ? 'completed successfully' : run.status === 'running' ? 'in progress' : run.statusMessage ? `failed: ${run.statusMessage}` : 'failed'}`}>
                            <Badge
                              variant="outline"
                              className={getStatusColor(run.status)}
                            >
                              {run.statusMessage || run.status}
                            </Badge>
                          </TooltipWrapper>
                          <TooltipWrapper content={`Scraping started ${formatTimestamp(run.timestamp)}`}>
                            <span className="text-xs text-muted-foreground cursor-help">
                              {formatTimestamp(run.timestamp)}
                            </span>
                          </TooltipWrapper>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <TooltipWrapper content="Number of pages processed by this scraper">
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {run.pagesScraped} pages
                            </span>
                          </TooltipWrapper>
                          <TooltipWrapper content="Data points extracted (text, images, metadata, etc.)">
                            <span className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {run.dataPoints} data points
                            </span>
                          </TooltipWrapper>
                          <TooltipWrapper content="New links discovered for potential future scraping">
                            <span className="flex items-center gap-1">
                              <Link className="h-3 w-3" />
                              {run.discoveredLinks} links found
                            </span>
                          </TooltipWrapper>
                          <TooltipWrapper content="Time taken to complete this scraping run">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(run.duration)}
                            </span>
                          </TooltipWrapper>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {onViewDetails && (
                        <TooltipWrapper content="View detailed results from this scraper run">
                          <Button
                            onClick={() => onViewDetails(run)}
                            variant="ghost"
                            size="sm"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </TooltipWrapper>
                      )}
                      <TooltipWrapper content={isExpanded ? "Hide detailed statistics" : "Show detailed statistics and performance metrics"}>
                        <Button
                          onClick={() => toggleExpanded(index)}
                          variant="ghost"
                          size="sm"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipWrapper>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t">
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      {/* Cumulative Stats */}
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium text-muted-foreground">
                          Cumulative Total
                        </h5>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>Total Pages:</span>
                            <span className="font-medium">{cumulative.pages}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Total Data Points:</span>
                            <span className="font-medium">{cumulative.dataPoints}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Total Links:</span>
                            <span className="font-medium">{cumulative.links}</span>
                          </div>
                        </div>
                      </div>

                      {/* This Run Stats */}
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium text-muted-foreground">
                          This Run Added
                        </h5>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>New Pages:</span>
                            <span className="font-medium text-green-600">
                              +{run.pagesScraped}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>New Data:</span>
                            <span className="font-medium text-green-600">
                              +{run.dataPoints}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>New Links:</span>
                            <span className="font-medium text-green-600">
                              +{run.discoveredLinks}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Performance */}
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium text-muted-foreground">
                          Performance
                        </h5>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>Speed:</span>
                            <span className="font-medium">
                              {run.duration > 0 && run.pagesScraped > 0
                                ? `${(run.duration / run.pagesScraped / 1000).toFixed(1)}s/page`
                                : 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Efficiency:</span>
                            <span className="font-medium">
                              {run.pagesScraped > 0
                                ? `${(run.dataPoints / run.pagesScraped).toFixed(0)} pts/page`
                                : 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Discovery:</span>
                            <span className="font-medium">
                              {run.pagesScraped > 0
                                ? `${(run.discoveredLinks / run.pagesScraped).toFixed(1)} links/page`
                                : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Discovered Links Preview */}
                    {run.discoveredLinks > 0 && (
                      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ExternalLink className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                              Discovered {run.discoveredLinks} new links
                            </span>
                          </div>
                          <TooltipWrapper content={showLinksFor.has(index) ? "Hide discovered links" : "Show discovered links"}>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-blue-600"
                              onClick={() => toggleShowLinks(index)}
                            >
                              {showLinksFor.has(index) ? 'Hide Links' : 'View Links'}
                            </Button>
                          </TooltipWrapper>
                        </div>
                        
                        {/* Links List */}
                        {showLinksFor.has(index) && (
                          <div className="mt-3 pt-3 border-t border-blue-200">
                            {run.discoveredUrls && run.discoveredUrls.length > 0 ? (
                              <div className="space-y-1 max-h-40 overflow-y-auto">
                                {run.discoveredUrls.slice(0, 10).map((url, urlIndex) => (
                                  <div key={urlIndex} className="flex items-center gap-2 text-xs">
                                    <ExternalLink className="h-3 w-3 text-blue-500" />
                                    <a 
                                      href={url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline truncate"
                                    >
                                      {url}
                                    </a>
                                  </div>
                                ))}
                                {run.discoveredUrls.length > 10 && (
                                  <div className="text-xs text-muted-foreground pt-2">
                                    ...and {run.discoveredUrls.length - 10} more links
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground">
                                {run.discoveredLinks > 0 
                                  ? `${run.discoveredLinks} links discovered - Run another scraper to explore them`
                                  : 'No new links discovered in this run'}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Data Points Preview */}
                    {run.dataPoints > 0 && (
                      <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-green-900 dark:text-green-100">
                              Extracted {run.dataPoints} data points
                            </span>
                          </div>
                          <TooltipWrapper content={showDataFor.has(index) ? "Hide extracted data" : "View extracted data samples"}>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-green-600"
                              onClick={() => toggleShowData(index)}
                            >
                              {showDataFor.has(index) ? 'Hide Data' : 'View Data'}
                            </Button>
                          </TooltipWrapper>
                        </div>
                        
                        {/* Data Points List */}
                        {showDataFor.has(index) && (
                          <div className="mt-3 pt-3 border-t border-green-200">
                            {run.extractedData ? (
                              <div className="space-y-3 text-sm">
                                {run.extractedData.titles && run.extractedData.titles.length > 0 && (
                                  <div>
                                    <div className="font-medium text-green-800 mb-1">Page Titles:</div>
                                    <div className="space-y-1">
                                      {run.extractedData.titles.slice(0, 3).map((title, i) => (
                                        <div key={i} className="text-xs text-gray-600">• {title}</div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {run.extractedData.technologies && run.extractedData.technologies.length > 0 && (
                                  <div>
                                    <div className="font-medium text-green-800 mb-1">Technologies Detected:</div>
                                    <div className="flex flex-wrap gap-1">
                                      {run.extractedData.technologies.map((tech, i) => (
                                        <Badge key={i} variant="secondary" className="text-xs">
                                          {tech}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {run.extractedData.contacts && (run.extractedData.contacts.emails?.length || run.extractedData.contacts.phones?.length) ? (
                                  <div>
                                    <div className="font-medium text-green-800 mb-1">Contact Information:</div>
                                    <div className="space-y-1 text-xs text-gray-600">
                                      {run.extractedData.contacts.emails?.map((email, i) => (
                                        <div key={`email-${i}`}>📧 {email}</div>
                                      ))}
                                      {run.extractedData.contacts.phones?.map((phone, i) => (
                                        <div key={`phone-${i}`}>📞 {phone}</div>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground">
                                Data extraction details will be available after processing
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Summary Stats */}
        {history.length > 1 && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">
                  {history.reduce((sum, run) => sum + run.pagesScraped, 0)}
                </div>
                <div className="text-xs text-muted-foreground">Total Pages</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {history.reduce((sum, run) => sum + run.dataPoints, 0)}
                </div>
                <div className="text-xs text-muted-foreground">Data Points</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {history.reduce((sum, run) => sum + run.discoveredLinks, 0)}
                </div>
                <div className="text-xs text-muted-foreground">Links Found</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {formatDuration(history.reduce((sum, run) => sum + run.duration, 0))}
                </div>
                <div className="text-xs text-muted-foreground">Total Time</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}