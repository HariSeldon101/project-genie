'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { AnimatedBackgroundSubtle } from '@/components/animated-background-subtle'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { TooltipWrapper } from '@/components/company-intelligence/tooltip-wrapper'

// Lazy load heavy components for better performance
// These components collectively load 2.8MB of JavaScript
const PhaseControls = dynamic(
  () => import('@/components/company-intelligence/phase-controls').then(mod => ({ default: mod.PhaseControls })),
  {
    loading: () => (
      <div className="animate-pulse">
        <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded-lg" />
      </div>
    ),
    ssr: false // Company intelligence needs client-side APIs
  }
)

// New v3 Scraping Dashboard
const ScrapingDashboard = dynamic(
  () => import('@/components/company-intelligence/scraping-dashboard').then(mod => ({ default: mod.ScrapingDashboard })),
  {
    loading: () => (
      <div className="animate-pulse">
        <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded-lg" />
      </div>
    ),
    ssr: false
  }
)

const ResultsViewer = dynamic(
  () => import('@/components/company-intelligence/results-viewer').then(mod => ({ default: mod.ResultsViewer })),
  {
    loading: () => <div className="h-64 bg-gray-50 dark:bg-gray-800 animate-pulse rounded" />
  }
)

const LLMMonitor = dynamic(
  () => import('@/components/company-intelligence/llm-monitor').then(mod => ({ default: mod.LLMMonitor })),
  {
    loading: () => <div className="h-32 bg-gray-50 dark:bg-gray-800 animate-pulse rounded" />
  }
)

const RateLimitIndicator = dynamic(
  () => import('@/components/company-intelligence/rate-limit-indicator').then(mod => ({ default: mod.RateLimitIndicator })),
  {
    loading: () => null // Small component, no loading state needed
  }
)

const DebugDataViewer = dynamic(
  () => import('@/components/company-intelligence/debug-data-viewer').then(mod => ({ default: mod.DebugDataViewer })),
  {
    loading: () => <div className="h-48 bg-gray-50 dark:bg-gray-800 animate-pulse rounded" />
  }
)
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  AlertCircle,
  CheckCircle2,
  Database,
  FileText,
  Globe,
  Info,
  Layers,
  Map,
  Search,
  Sparkles
} from 'lucide-react'

type Stage = 'site-analysis' | 'sitemap' | 'scraping' | 'extraction' | 'data-review' | 'enrichment' | 'generation'

const STAGES = [
  { id: 'site-analysis' as Stage, label: 'Site Analysis', icon: Globe },
  { id: 'sitemap' as Stage, label: 'Sitemap', icon: Map },
  { id: 'scraping' as Stage, label: 'Scraping', icon: Search },
  { id: 'extraction' as Stage, label: 'Extraction', icon: Database },
  { id: 'data-review' as Stage, label: 'Review', icon: CheckCircle2 },
  { id: 'enrichment' as Stage, label: 'AI Enrichment', icon: Sparkles },
  { id: 'generation' as Stage, label: 'Generation', icon: FileText }
]

export default function CompanyIntelligencePage() {
  console.log('[CI-PAGE] 1. Component function called')

  const [domain, setDomain] = useState('')
  const [domainError, setDomainError] = useState('')
  const [result, setResult] = useState<any>(null)
  const [currentPhase, setCurrentPhase] = useState<'idle' | 'site-analysis' | 'sitemap' | 'scraping' | 'enrichment' | 'generation'>('idle')
  const [currentStage, setCurrentStage] = useState<Stage>('site-analysis')
  const [completedStages, setCompletedStages] = useState<Set<Stage>>(new Set())
  const [sessionId, setSessionId] = useState<string | null>(null)

  console.log('[CI-PAGE] 2. State initialized')

  // Toggle for v3 UI - Default to v3 for testing
  const [useV3UI, setUseV3UI] = useState(true)
  
  const validateDomain = (input: string) => {
    // Remove whitespace
    const trimmed = input.trim()
    
    // Allow empty for clearing
    if (!trimmed) {
      setDomainError('')
      return true
    }
    
    // Extract domain from URL if needed
    let domain = trimmed
    
    // Remove protocol if present
    domain = domain.replace(/^https?:\/\//i, '')
    
    // Remove www. if present
    domain = domain.replace(/^www\./i, '')
    
    // Remove path if present
    domain = domain.split('/')[0]
    
    // Remove port if present
    domain = domain.split(':')[0]
    
    // Check for basic domain structure
    const domainParts = domain.split('.')
    
    if (domainParts.length < 2) {
      setDomainError('Please enter a valid domain (e.g., example.com)')
      return false
    }
    
    // Validate each part of the domain
    for (const part of domainParts) {
      // Each part must be non-empty and contain only valid characters
      if (!part || !/^[a-zA-Z0-9-]+$/.test(part)) {
        setDomainError('Domain contains invalid characters')
        return false
      }
      
      // Parts cannot start or end with hyphen
      if (part.startsWith('-') || part.endsWith('-')) {
        setDomainError('Domain parts cannot start or end with hyphens')
        return false
      }
    }
    
    // Validate TLD (must be at least 2 characters)
    const tld = domainParts[domainParts.length - 1]
    if (tld.length < 2) {
      setDomainError('Invalid top-level domain (TLD must be at least 2 characters)')
      return false
    }
    
    // Check for common TLD patterns (letters only, no numbers in TLD)
    if (!/^[a-zA-Z]+$/.test(tld)) {
      setDomainError('Invalid top-level domain (TLD must contain only letters)')
      return false
    }
    
    // Additional validation for known invalid patterns
    if (domain.includes('..') || domain.includes('--')) {
      setDomainError('Domain contains invalid character sequences')
      return false
    }
    
    setDomainError('')
    return true
  }
  
  const handleDomainChange = (value: string) => {
    setDomain(value)
    if (value) {
      validateDomain(value)
    } else {
      setDomainError('')
    }
  }
  
  const handleStartAnalysis = () => {
    if (validateDomain(domain) && domain) {
      setCurrentPhase('site-analysis')
    }
  }
  
  console.log('[CI-PAGE] 3. About to return JSX')
  console.log('[CI-PAGE] 4. Current state:', { domain, currentPhase, useV3UI })

  return (
    <div className="relative min-h-screen">
      {console.log('[CI-PAGE] 5. Rendering main div')}
      <AnimatedBackgroundSubtle />

      {/* LLM Monitor - Only visible when LLM operations are active */}
      {console.log('[CI-PAGE] 6. About to render LLMMonitor')}
      <LLMMonitor alwaysVisible={false} />
      {console.log('[CI-PAGE] 7. LLMMonitor rendered')}
      
      <div className="relative z-10 container mx-auto p-4 space-y-6 pt-20">
        {/* Rate Limit Indicator - Compact view in top-right */}
        <div className="fixed top-4 right-4 z-40">
          <RateLimitIndicator compact />
        </div>
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Company Intelligence</h1>
          <p className="text-muted-foreground">Research companies with intelligent web scraping and AI analysis</p>

          {/* UI Version Toggle */}
          <div className="flex items-center justify-center gap-3 mt-4">
            <TooltipWrapper content="Classic multi-phase workflow">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="ui-toggle" className="text-sm">Classic</Label>
              </div>
            </TooltipWrapper>

            <Switch
              id="ui-toggle"
              checked={useV3UI}
              onCheckedChange={setUseV3UI}
            />

            <TooltipWrapper content="New v3 UI with data selection">
              <div className="flex items-center gap-2">
                <Label htmlFor="ui-toggle" className="text-sm font-medium">v3 UI</Label>
                <Sparkles className="h-4 w-4 text-primary" />
                <Badge className="text-xs bg-green-500">NEW</Badge>
              </div>
            </TooltipWrapper>
          </div>
        </div>
        
        {/* Main Container - Responsive width */}
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Top Row: Domain and Progress - SIDE BY SIDE, BOTTOM ALIGNED */}
          <div className="flex gap-6 items-end">
            {/* Domain Selection - Left side (25% width for classic, full width for v3) */}
            <Card className={useV3UI ? "w-full" : "w-[25%] shrink-0"}>
              {!domain && (
                <div className="bg-green-500 text-white text-center py-2 px-3 rounded-t-lg">
                  <p className="text-sm font-semibold">👉 Start Here</p>
                </div>
              )}
              <CardHeader className={`${!domain ? 'pt-3' : ''} pb-2`}>
                <CardTitle className="text-base">Company Domain</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => handleDomainChange(e.target.value)}
                  placeholder="e.g., bigfluffy.ai"
                  className={`w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 text-sm ${
                    domainError ? 'border-red-500' : ''
                  }`}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleStartAnalysis()
                    }
                  }}
                  autoFocus
                />
                {domainError && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{domainError}</AlertDescription>
                  </Alert>
                )}
                {domain ? (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-2">
                    <p className="text-xs text-muted-foreground mb-1">Researching:</p>
                    <p className="text-sm font-semibold text-primary">{domain}</p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    Enter domain and press Enter
                  </p>
                )}
              </CardContent>
            </Card>
            
            {/* Research Progress - Right side (75% width) - Only show for classic UI */}
            {domain && !useV3UI && (
              <Card className="w-[75%]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Research Progress</CardTitle>
                  <CardDescription className="text-xs">
                    Stage {STAGES.findIndex(s => s.id === currentStage) + 1} of {STAGES.length}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Progress bar */}
                    <Progress value={(completedStages.size / STAGES.length) * 100} className="h-2" />
                    
                    {/* Stage indicators */}
                    <div className="flex items-center justify-between">
                      {STAGES.map((stage, index) => {
                        const Icon = stage.icon
                        const isCompleted = completedStages.has(stage.id)
                        const isCurrent = stage.id === currentStage
                        const isPending = index > STAGES.findIndex(s => s.id === currentStage)
                        
                        return (
                          <div
                            key={stage.id}
                            className={`flex flex-col items-center ${
                              isPending ? 'opacity-50' : ''
                            }`}
                          >
                            <div
                              className={`rounded-full p-2 ${
                                isCompleted
                                  ? 'bg-green-500 text-white'
                                  : isCurrent
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-gray-200 dark:bg-gray-700'
                              }`}
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : (
                                <Icon className="h-4 w-4" />
                              )}
                            </div>
                            <span className="text-xs mt-1">{stage.label}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          
          {/* FULL WIDTH Site Analysis and other stages below */}
          {domain && (
            <div className="w-full">
              {useV3UI ? (
                // New v3 Scraping Dashboard
                <Suspense fallback={
                  <div className="animate-pulse">
                    <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded-lg" />
                  </div>
                }>
                  <ScrapingDashboard
                    domain={domain}
                    sessionId={sessionId || undefined}
                    onEnrichmentReady={(selectedData) => {
                      console.log('Enrichment ready with selected data:', selectedData)
                      // Handle enrichment phase with selected data
                      setCurrentPhase('enrichment')
                      setResult(selectedData)
                    }}
                  />
                </Suspense>
              ) : (
                // Classic PhaseControls UI
                <Suspense fallback={
                  <div className="animate-pulse">
                    <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded-lg" />
                  </div>
                }>
                  <PhaseControls
                  domain={domain}
                  hideProgressCard={true}
                  onReset={() => {
                    // Clear domain and reset everything when aborting
                    setDomain('')
                    setDomainError('')
                    setCurrentStage('site-analysis')
                    setCompletedStages(new Set())
                    setResult(null)
                    setSessionId(null)
                  }}
                  onSessionCreated={(newSessionId) => {
                    console.log('Session created:', newSessionId)
                    setSessionId(newSessionId)
                  }}
                  onPhaseComplete={(phase, data) => {
                    console.log('Phase completed:', phase, data)
                    // Update our local stage tracking
                    setCompletedStages(prev => new Set([...prev, phase as Stage]))
                    const nextIndex = STAGES.findIndex(s => s.id === phase) + 1
                    if (nextIndex < STAGES.length) {
                      setCurrentStage(STAGES[nextIndex].id)
                    }
                    // Store result if generation phase completes
                    if (phase === 'generation' && data) {
                      setResult(data)
                    }
                  }}
                  />
                </Suspense>
              )}
            </div>
          )}
          
          {/* Results Display - Only shown after completion */}
          {result && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Research Results</CardTitle>
                <CardDescription>Company intelligence report generated successfully</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={
                  <div className="h-64 bg-gray-50 dark:bg-gray-800 animate-pulse rounded" />
                }>
                  <ResultsViewer
                  result={result}
                  format="html"
                  />
                </Suspense>
              </CardContent>
            </Card>
          )}

          {/* Debug Data Viewer - Only shown during scraping phase in classic UI */}
          {sessionId && currentStage === 'scraping' && !useV3UI && (
            <Suspense fallback={
              <div className="h-48 bg-gray-50 dark:bg-gray-800 animate-pulse rounded" />
            }>
              <DebugDataViewer sessionId={sessionId} />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  )
}