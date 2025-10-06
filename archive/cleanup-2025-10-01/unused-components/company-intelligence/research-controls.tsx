/**
 * Research Controls Component
 * Main control panel for starting and configuring research
 */

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { TooltipWrapper, QuickTooltip } from './tooltip-wrapper'
import { 
  Search,
  Globe,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Play,
  Pause,
  StopCircle,
  Info
} from 'lucide-react'

interface ResearchControlsProps {
  domain: string
  onDomainChange: (domain: string) => void
  onStartResearch: () => void
  onStopResearch?: () => void
  onPauseResearch?: () => void
  isLoading: boolean
  isPaused?: boolean
  status?: {
    status: string
    currentPhase?: string
    progress?: number
    pagesScraped?: number
    totalPages?: number
    errors?: any[]
  }
  recentDomains?: string[]
  className?: string
}

export function ResearchControls({
  domain,
  onDomainChange,
  onStartResearch,
  onStopResearch,
  onPauseResearch,
  isLoading,
  isPaused = false,
  status,
  recentDomains = [],
  className
}: ResearchControlsProps) {
  const [inputError, setInputError] = useState('')

  // Validate domain input
  const validateDomain = (value: string): boolean => {
    if (!value) {
      setInputError('Please enter a domain')
      return false
    }

    // Basic domain validation
    const domainPattern = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/
    
    // Clean the domain (remove protocol, path, etc.)
    let cleanDomain = value.toLowerCase().trim()
    cleanDomain = cleanDomain.replace(/^(https?:\/\/)?(www\.)?/, '')
    cleanDomain = cleanDomain.split('/')[0]
    cleanDomain = cleanDomain.split('?')[0]
    
    if (!domainPattern.test(cleanDomain)) {
      setInputError('Please enter a valid domain (e.g., example.com)')
      return false
    }

    setInputError('')
    return true
  }

  const handleDomainChange = (value: string) => {
    // Clean and validate
    let cleanDomain = value.toLowerCase().trim()
    cleanDomain = cleanDomain.replace(/^(https?:\/\/)?(www\.)?/, '')
    cleanDomain = cleanDomain.split('/')[0]
    cleanDomain = cleanDomain.split('?')[0]
    
    onDomainChange(cleanDomain)
    
    // Clear error when user starts typing
    if (inputError) {
      setInputError('')
    }
  }

  const handleStartResearch = () => {
    if (validateDomain(domain)) {
      onStartResearch()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading && domain) {
      handleStartResearch()
    }
  }

  // Get status color and icon
  const getStatusIndicator = () => {
    if (!status) return null

    switch (status.status) {
      case 'idle':
        return null
      case 'discovering':
      case 'researching':
        return (
          <div className="flex items-center gap-2 text-blue-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">
              {status.currentPhase || 'Processing...'}
            </span>
          </div>
        )
      case 'completed':
        return (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">Research Complete</span>
          </div>
        )
      case 'error':
        return (
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Error Occurred</span>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Company Intelligence Research</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Enter a company domain to analyze their digital presence
            </CardDescription>
          </div>
          {getStatusIndicator()}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Domain Input */}
          <div className="space-y-2">
            <Label htmlFor="domain">Company Domain</Label>
            <div className="flex gap-2">
              <TooltipWrapper 
                content="Enter the company's website domain (e.g., google.com, apple.com). The system will automatically clean URLs and validate the domain format."
                className="relative flex-1"
              >
                <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="domain"
                  type="text"
                  placeholder="example.com"
                  value={domain}
                  onChange={(e) => handleDomainChange(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  className={`pl-10 ${inputError ? 'border-red-500' : ''}`}
                  list="recent-domains"
                />
                {recentDomains.length > 0 && (
                  <datalist id="recent-domains">
                    {recentDomains.map(d => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                )}
              </TooltipWrapper>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {!isLoading ? (
                  <TooltipWrapper content={`Begin comprehensive analysis of ${domain || 'the company'}. This will scrape the website, extract company information, and generate intelligence data.`}>
                    <Button
                      onClick={handleStartResearch}
                      disabled={!domain || !!inputError}
                      size="default"
                    >
                      <Search className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Start Research</span>
                      <span className="sm:hidden">Start</span>
                    </Button>
                  </TooltipWrapper>
                ) : (
                  <>
                    {isPaused ? (
                      <TooltipWrapper content="Resume the paused research process">
                        <Button
                          onClick={onStartResearch}
                          variant="default"
                          size="default"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          <span>Resume</span>
                        </Button>
                      </TooltipWrapper>
                    ) : (
                      <TooltipWrapper content="Pause the research process - you can resume it later">
                        <Button
                          onClick={onPauseResearch}
                          variant="secondary"
                          size="default"
                          disabled={!onPauseResearch}
                        >
                          <Pause className="w-4 h-4 mr-2" />
                          <span>Pause</span>
                        </Button>
                      </TooltipWrapper>
                    )}
                    <TooltipWrapper content="Stop the research process completely - this cannot be undone">
                      <Button
                        onClick={onStopResearch}
                        variant="destructive"
                        size="default"
                        disabled={!onStopResearch}
                      >
                        <StopCircle className="w-4 h-4 mr-2" />
                        <span>Stop</span>
                      </Button>
                    </TooltipWrapper>
                  </>
                )}
              </div>
            </div>
            
            {inputError && (
              <p className="text-sm text-red-500">{inputError}</p>
            )}
          </div>

          {/* Progress Indicators */}
          {status && (status.pagesScraped > 0 || status.totalPages > 0) && (
            <div className="flex items-center gap-4 text-sm">
              {status.pagesScraped !== undefined && (
                <TooltipWrapper content="Number of pages successfully scraped from the website">
                  <Badge variant="secondary">
                    <span className="text-xs sm:text-sm">{status.pagesScraped} pages</span>
                  </Badge>
                </TooltipWrapper>
              )}
              {status.totalPages !== undefined && status.totalPages > 0 && (
                <TooltipWrapper content="Total number of pages discovered on the website">
                  <Badge variant="outline">
                    <span className="text-xs sm:text-sm">{status.totalPages} total</span>
                  </Badge>
                </TooltipWrapper>
              )}
              {status.progress !== undefined && status.progress > 0 && (
                <TooltipWrapper content="Overall progress of the research process">
                  <Badge variant="default">
                    <span className="text-xs sm:text-sm">{Math.round(status.progress)}%</span>
                  </Badge>
                </TooltipWrapper>
              )}
            </div>
          )}

          {/* Error Display */}
          {status?.errors && status.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {status.errors[status.errors.length - 1]}
              </AlertDescription>
            </Alert>
          )}

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs sm:text-sm">
              The research process will analyze the website structure, extract company information,
              and generate comprehensive intelligence data. This typically takes 30-60 seconds.
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  )
}