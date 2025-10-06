'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { AlertCircle, CheckCircle2, Clock, Globe, Loader2, Sparkles, Zap, Shield, Brain } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface ScraperStatusProps {
  data?: {
    status: 'idle' | 'detecting' | 'scraping' | 'processing' | 'completed' | 'error'
    frameworkDetection?: {
      frameworks: Array<{ framework: string; confidence: number }>
      recommendedScraper: string
      isStatic: boolean
      requiresJS: boolean
    }
    currentScraper?: string
    progress?: number
    logs?: Array<{
      timestamp: string
      level: 'info' | 'warn' | 'error' | 'success'
      context: string
      message: string
      data?: any
    }>
    error?: string
  }
  // Also accept flat props for backward compatibility
  status?: 'idle' | 'detecting' | 'scraping' | 'processing' | 'completed' | 'error'
  frameworkDetection?: {
    frameworks: Array<{ framework: string; confidence: number }>
    recommendedScraper: string
    isStatic: boolean
    requiresJS: boolean
  }
  currentScraper?: string
  progress?: number
  logs?: Array<{
    timestamp: string
    level: 'info' | 'warn' | 'error' | 'success'
    context: string
    message: string
    data?: any
  }>
  error?: string
}

export function ScraperStatus(props: ScraperStatusProps) {
  // Support both data prop and flat props
  const {
    status = props.data?.status || 'idle',
    frameworkDetection = props.data?.frameworkDetection,
    currentScraper = props.data?.currentScraper,
    progress = props.data?.progress || 0,
    logs = props.data?.logs || [],
    error = props.data?.error
  } = props.data ? {} : props;
  const getStatusIcon = () => {
    switch (status) {
      case 'detecting':
        return <Brain className="h-4 w-4 animate-pulse text-blue-500" />
      case 'scraping':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />
      case 'processing':
        return <Sparkles className="h-4 w-4 animate-pulse text-purple-500" />
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'detecting':
        return 'Analyzing website framework...'
      case 'scraping':
        const scraperName = typeof currentScraper === 'object' && currentScraper !== null 
          ? (currentScraper as any).scraper || JSON.stringify(currentScraper)
          : currentScraper || 'auto-detected scraper'
        const displayName = scraperName === 'auto' ? 'auto-detected scraper' : 
                           scraperName === 'static' ? 'static HTML scraper' :
                           scraperName === 'dynamic' ? 'dynamic JavaScript scraper' : scraperName
        return `Scraping with ${displayName}...`
      case 'processing':
        return 'Processing extracted data...'
      case 'completed':
        return 'Scraping completed successfully'
      case 'error':
        return 'Scraping failed'
      default:
        return 'Ready to scrape'
    }
  }

  const getScraperBadge = (scraper: string) => {
    const scraperConfig = {
      cheerio: { icon: <Zap className="h-3 w-3" />, variant: 'success' as const, label: '⚡ Cheerio (10x Fast)' },
      static: { icon: <Zap className="h-3 w-3" />, variant: 'success' as const, label: '⚡ Cheerio (10x Fast)' },
      puppeteer: { icon: <Globe className="h-3 w-3" />, variant: 'default' as const, label: '🌐 Playwright (Full)' },
      playwright: { icon: <Shield className="h-3 w-3" />, variant: 'default' as const, label: '🌐 Playwright (Full)' },
      dynamic: { icon: <Globe className="h-3 w-3" />, variant: 'default' as const, label: '🌐 Playwright (Full)' },
      spa: { icon: <Shield className="h-3 w-3" />, variant: 'outline' as const, label: '🌐 SPA Mode' }
    }
    
    const config = scraperConfig[scraper as keyof typeof scraperConfig] || 
                  { icon: <Globe className="h-3 w-3" />, variant: 'outline' as const, label: scraper }
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        <span>{config.label}</span>
      </Badge>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            {getStatusIcon()}
            Web Scraper Status
          </span>
          {currentScraper && getScraperBadge(
            typeof currentScraper === 'object' && currentScraper !== null 
              ? (currentScraper as any).scraper || 'auto'
              : currentScraper
          )}
        </CardTitle>
        <CardDescription>{getStatusText()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        {status === 'scraping' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Framework Detection Results */}
        {frameworkDetection && frameworkDetection.frameworks.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Website Analysis
            </h4>
            
            {/* Detected Frameworks */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Detected Frameworks:</p>
              <div className="flex flex-wrap gap-2">
                {frameworkDetection.frameworks.map((fw, idx) => (
                  <Badge 
                    key={idx} 
                    variant={fw.confidence > 0.8 ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {fw.framework} ({Math.round(fw.confidence * 100)}%)
                  </Badge>
                ))}
              </div>
            </div>

            {/* Website Type */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Type:</span>
                <Badge variant="outline">
                  {frameworkDetection.isStatic ? 'Static' : 'Dynamic'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">JavaScript:</span>
                <Badge variant="outline">
                  {frameworkDetection.requiresJS ? 'Required' : 'Optional'}
                </Badge>
              </div>
            </div>

            {/* Recommended Scraper */}
            <Alert className="border-primary/20 bg-primary/5">
              <Sparkles className="h-4 w-4" />
              <AlertTitle className="text-sm">Optimal Scraper Selected</AlertTitle>
              <AlertDescription className="text-xs">
                Using <strong>{frameworkDetection.recommendedScraper}</strong> scraper based on website analysis
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Scraping Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Live Logs */}
        {logs.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Activity Log</h4>
            <div className="max-h-48 overflow-y-auto space-y-1 text-xs font-mono bg-muted/50 rounded-lg p-3">
              {logs.slice(-10).map((log, idx) => (
                <div 
                  key={idx} 
                  className={`flex items-start gap-2 ${
                    log.level === 'error' ? 'text-red-600' :
                    log.level === 'warn' ? 'text-yellow-600' :
                    log.level === 'success' ? 'text-green-600' :
                    'text-muted-foreground'
                  }`}
                >
                  <span className="text-muted-foreground opacity-50">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="font-semibold">[{log.context}]</span>
                  <span className="flex-1">{log.message}</span>
                  {log.data && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      {typeof log.data === 'object' ? JSON.stringify(log.data).substring(0, 30) + '...' : log.data}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Success Summary */}
        {status === 'completed' && (
          <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-900 dark:text-green-100">
              Scraping Successful
            </AlertTitle>
            <AlertDescription className="text-green-800 dark:text-green-200">
              Website data has been successfully extracted and is ready for processing.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}