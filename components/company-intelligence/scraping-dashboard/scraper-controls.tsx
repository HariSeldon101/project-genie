'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { TooltipWrapper } from '@/components/company-intelligence/tooltip-wrapper'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Play,
  Settings,
  Zap,
  Shield,
  DollarSign,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Cpu,
  Globe,
  FileSearch,
  Camera,
  FileText,
  MousePointer,
  Brain,
  Code,
  Info,
  HelpCircle,
  XCircle,
  Layers,
  ChevronDown
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { animationVariants } from './types'
import { useSessionData } from '@/lib/hooks/use-session-data'
import { Database, Server } from 'lucide-react'
import type { ScraperConfig } from '@/components/company-intelligence/scraper-config/scraper-config-panel'

interface ScraperControlsProps {
  sessionId: string
  siteAnalysis: any  // Using passed prop instead of fetching
  onConfigChange: (config: ScraperConfig) => void
  onExecute: () => void
  isExecuting: boolean
  progress: number
}

export function ScraperControls({
  sessionId,
  siteAnalysis,
  onConfigChange,
  onExecute,
  isExecuting,
  progress
}: ScraperControlsProps) {
  // NO DEFENSIVE CODE - Let errors surface in DEV mode
  // Using siteAnalysis passed from parent instead of fetching from DB

  // COMMENTED OUT - We already have siteAnalysis from parent
  // const { siteAnalysis, loading: loadingAnalysis, error: analysisError } = useSessionData(sessionId)
  const loadingAnalysis = false  // Not loading, we have the data
  const analysisError = null     // No error, we have the data

  const [scraperType, setScraperType] = useState<'firecrawl' | 'playwright' | 'cheerio'>('cheerio')
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Track user selection and credits
  const [userHasSelected, setUserHasSelected] = useState(false)
  const [firecrawlCredits, setFirecrawlCredits] = useState<{
    used: number
    remaining: number
  } | null>(null)

  // Firecrawl API status tracking
  const [firecrawlStatus, setFirecrawlStatus] = useState<
    'checking' | 'connected' | 'not_configured' | 'invalid_key' | 'error'
  >('checking')

  // Feature toggles
  const [features, setFeatures] = useState({
    // Firecrawl features
    mapDiscovery: true,
    schemaExtraction: true,
    screenshots: false,
    pdfGeneration: false,
    llmExtraction: false,  // OFF by default (50 credits per page!)
    actions: false,

    // Playwright features
    stealthMode: false,
    fingerprinting: false,
    humanBehavior: false,
    sessionPersistence: false,
    proxyRotation: false,
    captchaSolving: false
  })

  // Resource limits
  const [limits, setLimits] = useState({
    maxPages: 50,
    maxDepth: 2,
    timeout: 30000
  })

  // Only check Firecrawl API status when that tab is selected
  useEffect(() => {
    // Only check when Firecrawl tab is active
    if (scraperType !== 'firecrawl') {
      return
    }

    // Skip if already checked successfully
    if (firecrawlStatus === 'connected') {
      return
    }

    console.log('[ScraperControls] Checking Firecrawl status for active tab')

    let mounted = true
    const controller = new AbortController()

    const checkFirecrawlStatus = async () => {
      try {
        const response = await fetch('/api/company-intelligence/test-firecrawl', {
          signal: controller.signal,
          cache: 'no-store'
        })

        if (!mounted) return

        const data = await response.json()
        setFirecrawlStatus(data.status || 'error')
      } catch (error) {
        if (!mounted) return
        console.error('[ScraperControls] Firecrawl check failed:', error)
        setFirecrawlStatus('error')
      }
    }

    checkFirecrawlStatus()

    return () => {
      mounted = false
      controller.abort()
    }
  }, [scraperType, firecrawlStatus])

  // Fetch Firecrawl credits when that tab is selected
  useEffect(() => {
    if (scraperType === 'firecrawl' && !firecrawlCredits) {
      fetch('/api/company-intelligence/test-firecrawl')
        .then(res => res.json())
        .then(data => {
          if (data.credits !== undefined) {
            setFirecrawlCredits({
              remaining: data.credits,
              used: 500 - Math.max(0, data.credits)  // Assuming free tier of 500
            })
          }
        })
        .catch(err => console.error('Failed to fetch credits:', err))
    }
  }, [scraperType, firecrawlCredits])

  // Auto-select scraper based on site analysis
  useEffect(() => {
    if (siteAnalysis && !userHasSelected) {
      const { technologies } = siteAnalysis

      // Check frontend technologies array for JS frameworks
      const hasJsFramework = technologies?.frontend?.some(t =>
        ['react', 'vue', 'angular', 'next', 'nuxt', 'gatsby'].includes(t.toLowerCase())
      )

      setScraperType(hasJsFramework ? 'playwright' : 'cheerio')
    }
  }, [siteAnalysis, userHasSelected])

  // Handle scraper type change with user tracking
  const handleScraperChange = (value: string) => {
    setScraperType(value as any)
    setUserHasSelected(true)
  }

  // Simplified - removed preset configs and cost estimation

  const handleExecute = () => {
    const scraperConfig: ScraperConfig = {
      scraperType,
      preset: scraperType === 'playwright' && features.stealthMode ? 'stealth' : 'quick',
      activeFeatures: Object.entries(features)
        .filter(([_, enabled]) => enabled)
        .map(([feature]) => feature),
      limits: {
        maxPages: limits.maxPages,
        maxDepth: limits.maxDepth,
        timeout: limits.timeout
        // No budget
      }
      // No estimatedCost
    } as any

    onConfigChange(scraperConfig)
    onExecute()
  }

  // Don't render anything until site analysis is complete
  // This is the normal initial state - user hasn't run analysis yet
  if (!siteAnalysis) {
    return null  // Return null is React best practice for "nothing to render yet"
  }

  // Show minimal UI while checking Firecrawl status (prevent blocking)
  // This is only shown very briefly during initial load
  if (scraperType === 'firecrawl' && firecrawlStatus === 'checking') {
    console.log('[ScraperControls] Rendering loading state for Firecrawl check')
    // Still render the full UI but with a subtle loading indicator
    // This prevents jarring UI changes and allows immediate interaction
  }

  return (
    <Card className={cn(
      "overflow-hidden",
      "bg-gradient-to-br from-green-50/80 to-green-50/40",
      "dark:from-green-950/20 dark:to-green-950/10",
      "border-green-200 dark:border-green-800",
      "shadow-lg shadow-green-100/50 dark:shadow-green-900/20"
    )}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Scraper Configuration</CardTitle>
              <CardDescription className="mt-1">
                Configure and execute v3 scrapers for {siteAnalysis.domain}
              </CardDescription>
            </div>
          </div>

          {/* Execute button */}
          <div className="flex items-center gap-3">
            <TooltipWrapper content={isExecuting ? "Scraping in progress..." : "Start scraping with current configuration"}>
              <Button
                onClick={handleExecute}
                disabled={isExecuting}
                className="gap-2"
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Scraping... {progress}%
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Start Scraping
                  </>
                )}
              </Button>
            </TooltipWrapper>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress bar */}
        <AnimatePresence>
          {isExecuting && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                Processing {siteAnalysis.domain}...
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Framework Detection Display - Direct from Database */}
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Database className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Technologies Detected (from DB Session #{sessionId?.slice(0, 8)})</span>
            </div>

            {/* Frontend Technologies */}
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Code className="h-3 w-3 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <span className="text-xs text-muted-foreground">Frontend: </span>
                  {siteAnalysis?.technologies?.frontend?.length > 0 ? (
                    <span className="inline-flex flex-wrap gap-1">
                      {siteAnalysis.technologies.frontend.map(tech => (
                        <Badge key={tech} variant="secondary" className="text-xs">
                          {tech}
                        </Badge>
                      ))}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Static HTML (no JS framework)</span>
                  )}
                </div>
              </div>

              {/* Backend Technologies if any */}
              {siteAnalysis?.technologies?.backend?.length > 0 && (
                <div className="flex items-start gap-2">
                  <Server className="h-3 w-3 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <span className="text-xs text-muted-foreground">Backend: </span>
                    <span className="inline-flex flex-wrap gap-1">
                      {siteAnalysis.technologies.backend.map(tech => (
                        <Badge key={tech} variant="outline" className="text-xs">
                          {tech}
                        </Badge>
                      ))}
                    </span>
                  </div>
                </div>
              )}

              {/* CMS Technologies if any */}
              {siteAnalysis?.technologies?.cms?.length > 0 && (
                <div className="flex items-start gap-2">
                  <Layers className="h-3 w-3 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <span className="text-xs text-muted-foreground">CMS: </span>
                    <span className="inline-flex flex-wrap gap-1">
                      {siteAnalysis.technologies.cms.map(tech => (
                        <Badge key={tech} variant="outline" className="text-xs">
                          {tech}
                        </Badge>
                      ))}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Scraper Recommendation */}
            <div className="mt-3 p-2 bg-background/60 rounded text-xs">
              <span className="text-muted-foreground">Auto-selected: </span>
              {siteAnalysis?.technologies?.frontend?.some(t =>
                ['react', 'vue', 'angular', 'next', 'nuxt', 'gatsby'].includes(t.toLowerCase())
              ) ? (
                <span className="text-blue-500 font-medium">
                  Playwright (Dynamic) - JavaScript framework detected ({
                    siteAnalysis.technologies.frontend.find(t =>
                      ['react', 'vue', 'angular', 'next', 'nuxt', 'gatsby'].includes(t.toLowerCase())
                    )
                  })
                </span>
              ) : (
                <span className="text-green-500 font-medium">
                  Cheerio (Static) - No JavaScript framework detected
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Scraper type tabs - Simplified 3-choice selection */}
        <Tabs value={scraperType} onValueChange={handleScraperChange}>
          <TabsList className="grid w-full grid-cols-3 gap-1 p-1 bg-muted/50 h-auto">
            <TabsTrigger
              value="cheerio"
              className={cn(
                "relative flex flex-col items-center justify-center gap-1",
                "min-h-[5rem] py-3 px-2",
                "data-[state=active]:bg-green-500 data-[state=active]:text-white",
                "data-[state=active]:shadow-lg data-[state=active]:shadow-green-500/25",
                "transition-all duration-200"
              )}
            >
              <Code className="h-5 w-5 shrink-0" />
              <div className="text-center">
                <div className="font-medium text-sm whitespace-nowrap">Static</div>
                <div className="text-[10px] opacity-80 mt-0.5">(Cheerio)</div>
              </div>
              {siteAnalysis && !siteAnalysis.technologies?.frontend?.some(t =>
                ['react', 'vue', 'angular', 'next', 'nuxt', 'gatsby'].includes(t.toLowerCase())
              ) && scraperType === 'cheerio' && (
                <Badge variant="secondary" className="absolute -top-1 -right-1 text-[9px] px-1">Recommended</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="playwright"
              className={cn(
                "relative flex flex-col items-center justify-center gap-1",
                "min-h-[5rem] py-3 px-2",
                "data-[state=active]:bg-blue-500 data-[state=active]:text-white",
                "data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/25",
                "transition-all duration-200"
              )}
            >
              <Globe className="h-5 w-5 shrink-0" />
              <div className="text-center">
                <div className="font-medium text-sm whitespace-nowrap">Dynamic</div>
                <div className="text-[10px] opacity-80 mt-0.5">(Playwright)</div>
              </div>
              {siteAnalysis?.technologies?.frontend?.some(t =>
                ['react', 'vue', 'angular', 'next', 'nuxt', 'gatsby'].includes(t.toLowerCase())
              ) && scraperType === 'playwright' && (
                <Badge variant="secondary" className="absolute -top-1 -right-1 text-[9px] px-1">Recommended</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="firecrawl"
              className={cn(
                "relative flex flex-col items-center justify-center gap-1",
                "min-h-[5rem] py-3 px-2",
                "data-[state=active]:bg-purple-500 data-[state=active]:text-white",
                "data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/25",
                "transition-all duration-200"
              )}
            >
              <Brain className="h-5 w-5 shrink-0" />
              <div className="text-center">
                <div className="font-medium text-sm whitespace-nowrap">AI Scraper</div>
                <div className="text-[10px] opacity-80 mt-0.5">(Firecrawl)</div>
              </div>
            </TabsTrigger>
          </TabsList>

          {/* Firecrawl features */}
          <TabsContent value="firecrawl" className="space-y-4 mt-4">
            {/* Credit Display Card */}
            <Card className="bg-purple-50/50 dark:bg-purple-950/20 border-purple-200">
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-4">
                  <TooltipWrapper content="Credits refresh monthly on the free tier">
                    <div>
                      <p className="text-sm text-muted-foreground">Credits Available</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {firecrawlCredits?.remaining ?? 'Loading...'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">of 500 free tier</p>
                    </div>
                  </TooltipWrapper>
                  <TooltipWrapper content="Credits used since the start of this billing period">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Used This Month</p>
                      <p className="text-xl font-semibold">{firecrawlCredits?.used ?? 0}</p>
                    </div>
                  </TooltipWrapper>
                </div>
              </CardContent>
            </Card>

            {/* Credit Cost Alert */}
            <Alert className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/20">
              <Brain className="h-4 w-4 text-purple-600" />
              <AlertDescription>
                <div className="space-y-1">
                  <strong>AI-Powered Scraping with Firecrawl</strong>
                  <div className="text-xs space-y-0.5">
                    <span className="block">• Standard Scrape: 1 credit/page</span>
                    <span className="block">• Map Discovery: 1 credit/URL found</span>
                    <span className="block text-amber-600 font-semibold">• LLM Extraction: 50 credits/page ⚠️</span>
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            {/* API Status Indicator */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">Firecrawl API Status</span>
              <Badge
                variant={firecrawlStatus === 'connected' ? 'default' : 'secondary'}
                className="gap-1"
              >
                {firecrawlStatus === 'connected' && (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    Connected
                  </>
                )}
                {firecrawlStatus === 'not_configured' && (
                  <>
                    <AlertCircle className="h-3 w-3" />
                    Add API Key in .env.local
                  </>
                )}
                {firecrawlStatus === 'invalid_key' && (
                  <>
                    <XCircle className="h-3 w-3" />
                    Invalid API Key
                  </>
                )}
                {firecrawlStatus === 'error' && (
                  <>
                    <XCircle className="h-3 w-3" />
                    Connection Error
                  </>
                )}
                {firecrawlStatus === 'checking' && (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Checking...
                  </>
                )}
              </Badge>
            </div>

            {/* Features wrapped in Collapsible */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-full justify-between p-2 rounded-lg hover:bg-muted/50">
                <span className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Advanced Options (Optional)
                </span>
                <ChevronDown className="h-4 w-4" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-4">

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <TooltipWrapper content={
                  <div className="max-w-xs space-y-2 p-1">
                    <p className="font-semibold text-sm">Map Discovery</p>
                    <p className="text-xs">
                      Automatically discovers and crawls all URLs on the website
                      using Firecrawl's Map API endpoint.
                    </p>
                    <div className="pt-1 border-t space-y-1">
                      <p className="text-xs text-muted-foreground">
                        💳 Credits: 1 per URL found
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ⏱️ Time: 30-60 seconds
                      </p>
                      <p className="text-xs text-muted-foreground">
                        📊 Typical site: 50-200 URLs
                      </p>
                    </div>
                  </div>
                }>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="map-discovery" className="text-sm">Map Discovery</Label>
                    <Switch
                      id="map-discovery"
                      checked={features.mapDiscovery}
                      onCheckedChange={(v) => setFeatures({ ...features, mapDiscovery: v })}
                    />
                  </div>
                </TooltipWrapper>

                <TooltipWrapper content="Extract structured data using predefined schemas">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="schema" className="text-sm">Schema Extraction</Label>
                    <Switch
                      id="schema"
                      checked={features.schemaExtraction}
                      onCheckedChange={(v) => setFeatures({ ...features, schemaExtraction: v })}
                    />
                  </div>
                </TooltipWrapper>

                <TooltipWrapper content="Capture screenshots of pages">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="screenshots" className="text-sm">
                      <Camera className="h-3 w-3 inline mr-1" />
                      Screenshots
                    </Label>
                    <Switch
                      id="screenshots"
                      checked={features.screenshots}
                      onCheckedChange={(v) => setFeatures({ ...features, screenshots: v })}
                    />
                  </div>
                </TooltipWrapper>
              </div>

              <div className="space-y-3">
                <TooltipWrapper content="Generate PDF versions of pages">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="pdf" className="text-sm">
                      <FileText className="h-3 w-3 inline mr-1" />
                      PDF Generation
                    </Label>
                    <Switch
                      id="pdf"
                      checked={features.pdfGeneration}
                      onCheckedChange={(v) => setFeatures({ ...features, pdfGeneration: v })}
                    />
                  </div>
                </TooltipWrapper>

                <TooltipWrapper content={
                  <div className="max-w-xs space-y-2 p-1">
                    <p className="font-semibold text-sm">LLM Extraction</p>
                    <p className="text-xs">
                      Uses AI to understand content context and extract
                      specific information based on your schema.
                    </p>
                    <div className="pt-1 border-t space-y-1">
                      <p className="text-xs text-muted-foreground">
                        ⚠️ Cost: 50 credits per page (50x multiplier!)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        🎯 Accuracy: 95%+ with good schemas
                      </p>
                      <p className="text-xs text-muted-foreground">
                        📝 {limits.maxPages} pages = {limits.maxPages * 50} credits
                      </p>
                    </div>
                  </div>
                }>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="llm" className="text-sm">LLM Extraction</Label>
                    <Switch
                      id="llm"
                      checked={features.llmExtraction}
                      onCheckedChange={(v) => setFeatures({ ...features, llmExtraction: v })}
                    />
                    {features.llmExtraction && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          <strong>HIGH CREDIT USAGE</strong><br/>
                          {limits.maxPages} pages × 50 = {limits.maxPages * 50} credits
                          {limits.maxPages * 50 > (firecrawlCredits?.remaining || 500) && (
                            <span className="block text-red-600 font-semibold mt-1">
                              ⚠️ Exceeds available credits!
                            </span>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </TooltipWrapper>

                <TooltipWrapper content="Simulate user interactions (clicks, scrolls)">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="actions" className="text-sm">
                      <MousePointer className="h-3 w-3 inline mr-1" />
                      Actions
                    </Label>
                    <Switch
                      id="actions"
                      checked={features.actions}
                      onCheckedChange={(v) => setFeatures({ ...features, actions: v })}
                    />
                  </div>
                </TooltipWrapper>
              </div>
            </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Collapsible Documentation Section */}
            <Collapsible className="mt-4">
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Info className="h-4 w-4" />
                Learn more about Firecrawl AI Scraper
                <ChevronDown className="h-4 w-4 ml-auto" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <div className="space-y-4 p-4 bg-purple-50/50 dark:bg-purple-950/20 rounded-lg border border-purple-200/50 dark:border-purple-800/50">
                  <div>
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Brain className="h-4 w-4 text-purple-500" />
                      About Firecrawl AI Scraper
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Firecrawl is an advanced AI-powered web scraping service that converts websites
                      into clean, LLM-ready markdown or structured data. It handles JavaScript rendering,
                      dynamic content, and provides intelligent extraction capabilities.
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium text-xs mb-2">Key Features</h5>
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        <li className="flex items-start gap-1">
                          <span className="text-green-500 mt-0.5">✓</span>
                          <span>Automatic URL discovery via Map API</span>
                        </li>
                        <li className="flex items-start gap-1">
                          <span className="text-green-500 mt-0.5">✓</span>
                          <span>LLM-powered content extraction</span>
                        </li>
                        <li className="flex items-start gap-1">
                          <span className="text-green-500 mt-0.5">✓</span>
                          <span>JavaScript rendering support</span>
                        </li>
                        <li className="flex items-start gap-1">
                          <span className="text-green-500 mt-0.5">✓</span>
                          <span>Structured data with schemas</span>
                        </li>
                        <li className="flex items-start gap-1">
                          <span className="text-green-500 mt-0.5">✓</span>
                          <span>Screenshot and PDF generation</span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h5 className="font-medium text-xs mb-2">Best For</h5>
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        <li className="flex items-start gap-1">
                          <span className="text-blue-500 mt-0.5">•</span>
                          <span>React, Vue, Angular SPAs</span>
                        </li>
                        <li className="flex items-start gap-1">
                          <span className="text-blue-500 mt-0.5">•</span>
                          <span>Complex data extraction needs</span>
                        </li>
                        <li className="flex items-start gap-1">
                          <span className="text-blue-500 mt-0.5">•</span>
                          <span>Content requiring AI understanding</span>
                        </li>
                        <li className="flex items-start gap-1">
                          <span className="text-blue-500 mt-0.5">•</span>
                          <span>Multi-page workflow automation</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <Alert className="bg-purple-100/50 dark:bg-purple-900/20 border-purple-200">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      <strong>Pricing:</strong> Free tier includes 500 credits/month.
                      Each page scrape costs 1-5 credits depending on features enabled.
                      <a href="https://firecrawl.dev/pricing"
                         target="_blank"
                         rel="noopener noreferrer"
                         className="ml-1 text-purple-600 hover:underline">
                        View pricing details →
                      </a>
                    </AlertDescription>
                  </Alert>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </TabsContent>

          {/* Playwright features */}
          <TabsContent value="playwright" className="space-y-4 mt-4">
            {/* Status Alert */}
            <Alert className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
              <Globe className="h-4 w-4 text-blue-600" />
              <AlertDescription>
                <strong>Full Browser Automation</strong><br/>
                <span className="text-xs">JavaScript execution • Handles React/Vue/Angular • Anti-detection available</span>
              </AlertDescription>
            </Alert>

            {/* All features wrapped in Collapsible */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-full justify-between p-2 rounded-lg hover:bg-muted/50">
                <span className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Advanced Options (Optional)
                </span>
                <ChevronDown className="h-4 w-4" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <TooltipWrapper content="Enhanced anti-detection measures">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="stealth" className="text-sm">
                          <Shield className="h-3 w-3 inline mr-1" />
                          Stealth Mode
                        </Label>
                        <Switch
                          id="stealth"
                          checked={features.stealthMode}
                          onCheckedChange={(v) => setFeatures({ ...features, stealthMode: v })}
                        />
                      </div>
                    </TooltipWrapper>

                <TooltipWrapper content="Randomize browser fingerprints">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="fingerprint" className="text-sm">Fingerprinting</Label>
                    <Switch
                      id="fingerprint"
                      checked={features.fingerprinting}
                      onCheckedChange={(v) => setFeatures({ ...features, fingerprinting: v })}
                    />
                  </div>
                </TooltipWrapper>

                <TooltipWrapper content="Simulate human-like mouse movements">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="human" className="text-sm">Human Behavior</Label>
                    <Switch
                      id="human"
                      checked={features.humanBehavior}
                      onCheckedChange={(v) => setFeatures({ ...features, humanBehavior: v })}
                    />
                  </div>
                </TooltipWrapper>
              </div>

              <div className="space-y-3">
                <TooltipWrapper content="Maintain session across requests">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="session" className="text-sm">Session Persist</Label>
                    <Switch
                      id="session"
                      checked={features.sessionPersistence}
                      onCheckedChange={(v) => setFeatures({ ...features, sessionPersistence: v })}
                    />
                  </div>
                </TooltipWrapper>

                <TooltipWrapper content="Rotate proxy servers">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="proxy" className="text-sm">Proxy Rotation</Label>
                    <Switch
                      id="proxy"
                      checked={features.proxyRotation}
                      onCheckedChange={(v) => setFeatures({ ...features, proxyRotation: v })}
                    />
                  </div>
                </TooltipWrapper>

                <TooltipWrapper content="Automatic CAPTCHA solving">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="captcha" className="text-sm">CAPTCHA Solver</Label>
                    <Switch
                      id="captcha"
                      checked={features.captchaSolving}
                      onCheckedChange={(v) => setFeatures({ ...features, captchaSolving: v })}
                    />
                  </div>
                </TooltipWrapper>
                  </div>
                </div>

                {/* Resource limits within collapsible */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <TooltipWrapper content={
                    <div className="max-w-xs space-y-2 p-1">
                      <p className="font-semibold text-sm">Maximum Pages</p>
                      <p className="text-xs">
                        Total number of pages to scrape with the browser.
                        Playwright will handle JavaScript and dynamic content.
                      </p>
                      <div className="pt-1 border-t space-y-1">
                        <p className="text-xs text-muted-foreground">
                          ⚡ Speed: ~0.5-1 page per second
                        </p>
                        <p className="text-xs text-muted-foreground">
                          🎯 Best for: 10-100 pages
                        </p>
                      </div>
                    </div>
                  }>
                    <div className="space-y-2">
                      <Label className="text-sm">Max Pages: {limits.maxPages}</Label>
                      <Slider
                        value={[limits.maxPages]}
                        onValueChange={([v]) => setLimits({ ...limits, maxPages: v })}
                        min={1}
                        max={500}
                        step={10}
                      />
                    </div>
                  </TooltipWrapper>

                  <TooltipWrapper content={
                    <div className="max-w-xs space-y-2 p-1">
                      <p className="font-semibold text-sm">Page Timeout</p>
                      <p className="text-xs">
                        Maximum time to wait for each page to load.
                        Increase for slow sites or complex JavaScript.
                      </p>
                      <div className="pt-1 border-t space-y-1">
                        <p className="text-xs text-muted-foreground">
                          🕒 Default: 30 seconds
                        </p>
                        <p className="text-xs text-muted-foreground">
                          🎐 Heavy sites may need 60s+
                        </p>
                      </div>
                    </div>
                  }>
                    <div className="space-y-2">
                      <Label className="text-sm">Timeout: {limits.timeout / 1000}s</Label>
                      <Slider
                        value={[limits.timeout / 1000]}
                        onValueChange={([v]) => setLimits({ ...limits, timeout: v * 1000 })}
                        min={10}
                        max={120}
                        step={10}
                      />
                    </div>
                  </TooltipWrapper>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Collapsible Documentation Section for Playwright */}
            <Collapsible className="mt-4">
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Info className="h-4 w-4" />
                Learn more about Playwright Dynamic Scraper
                <ChevronDown className="h-4 w-4 ml-auto" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <div className="space-y-4 p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                  <div>
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Globe className="h-4 w-4 text-blue-500" />
                      About Playwright Dynamic Scraper
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Playwright is a powerful browser automation framework that provides full control
                      over Chrome, Firefox, and Safari. It excels at handling complex, dynamic websites
                      with advanced anti-bot protection and CAPTCHA challenges.
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium text-xs mb-2">Key Features</h5>
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        <li className="flex items-start gap-1">
                          <span className="text-green-500 mt-0.5">✓</span>
                          <span>Full browser automation</span>
                        </li>
                        <li className="flex items-start gap-1">
                          <span className="text-green-500 mt-0.5">✓</span>
                          <span>Stealth mode & fingerprinting</span>
                        </li>
                        <li className="flex items-start gap-1">
                          <span className="text-green-500 mt-0.5">✓</span>
                          <span>Session persistence</span>
                        </li>
                        <li className="flex items-start gap-1">
                          <span className="text-green-500 mt-0.5">✓</span>
                          <span>Proxy rotation support</span>
                        </li>
                        <li className="flex items-start gap-1">
                          <span className="text-green-500 mt-0.5">✓</span>
                          <span>Human-like behavior simulation</span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h5 className="font-medium text-xs mb-2">Best For</h5>
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        <li className="flex items-start gap-1">
                          <span className="text-blue-500 mt-0.5">•</span>
                          <span>Sites with anti-bot protection</span>
                        </li>
                        <li className="flex items-start gap-1">
                          <span className="text-blue-500 mt-0.5">•</span>
                          <span>Login-required content</span>
                        </li>
                        <li className="flex items-start gap-1">
                          <span className="text-blue-500 mt-0.5">•</span>
                          <span>Complex user interactions</span>
                        </li>
                        <li className="flex items-start gap-1">
                          <span className="text-blue-500 mt-0.5">•</span>
                          <span>CAPTCHA-protected sites</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <Alert className="bg-blue-100/50 dark:bg-blue-900/20 border-blue-200">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      <strong>Performance:</strong> Slower than Cheerio but handles JavaScript perfectly.
                      Uses real browser instances for maximum compatibility.
                    </AlertDescription>
                  </Alert>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </TabsContent>

          {/* Cheerio features */}
          <TabsContent value="cheerio" className="space-y-4 mt-4">
            {/* Status Alert */}
            <Alert className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <strong>Fast & Free HTML Scraping</strong><br/>
                <span className="text-xs">10x faster than browser scrapers • No JavaScript execution • Zero credits</span>
              </AlertDescription>
            </Alert>

            {/* Simple Configuration */}
            <Card className="border-green-200/50">
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <TooltipWrapper content={
                    <div className="max-w-xs space-y-2 p-1">
                      <p className="font-semibold text-sm">Maximum Pages</p>
                      <p className="text-xs">
                        Total number of pages to scrape. Cheerio will follow links
                        up to the specified depth to discover pages.
                      </p>
                      <div className="pt-1 border-t space-y-1">
                        <p className="text-xs text-muted-foreground">
                          💡 Tip: Start with fewer pages to test
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ⚡ Speed: ~2 pages per second
                        </p>
                      </div>
                    </div>
                  }>
                    <div className="space-y-2">
                      <Label className="text-sm flex items-center gap-2">
                        <FileSearch className="h-3 w-3" />
                        Max Pages: {limits.maxPages}
                      </Label>
                      <Slider
                        value={[limits.maxPages]}
                        onValueChange={([v]) => setLimits({ ...limits, maxPages: v })}
                        min={1}
                        max={500}
                        step={10}
                      />
                    </div>
                  </TooltipWrapper>

                  <TooltipWrapper content={
                    <div className="max-w-xs space-y-2 p-1">
                      <p className="font-semibold text-sm">Crawl Depth</p>
                      <p className="text-xs">
                        How many levels deep to follow links from the starting page.
                        Depth 1 = only linked pages, Depth 2 = links from those pages, etc.
                      </p>
                      <div className="pt-1 border-t space-y-1">
                        <p className="text-xs text-muted-foreground">
                          📊 Depth 2 typically finds 80% of content
                        </p>
                      </div>
                    </div>
                  }>
                    <div className="space-y-2">
                      <Label className="text-sm flex items-center gap-2">
                        <Layers className="h-3 w-3" />
                        Max Depth: {limits.maxDepth}
                      </Label>
                      <Slider
                        value={[limits.maxDepth]}
                        onValueChange={([v]) => setLimits({ ...limits, maxDepth: v })}
                        min={1}
                        max={5}
                        step={1}
                      />
                    </div>
                  </TooltipWrapper>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}