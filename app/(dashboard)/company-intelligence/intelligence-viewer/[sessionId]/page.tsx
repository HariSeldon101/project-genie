// app/(dashboard)/company-intelligence/intelligence-viewer/[sessionId]/page.tsx
/**
 * Intelligence Viewer Page - Updated with Unified SSE System
 * Uses correct StreamReader API from unified realtime-events
 * CLAUDE.md COMPLIANT
 */

'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { convertSupabaseError } from '@/lib/utils/supabase-error-helper'
import { CompanyIntelligenceRepositoryV4 } from '@/lib/repositories/intelligence-repository-v4'
import { createClient } from '@/lib/supabase/client'
import { IntelligenceKanban } from '@/components/company-intelligence/intelligence-kanban'
import { AnalyticsView } from '@/components/company-intelligence/intelligence-kanban/analytics-view'
import { EnrichmentQueue } from '@/components/company-intelligence/intelligence-kanban/enrichment-queue'
import { IntegratedKanban } from '@/components/company-intelligence/intelligence-kanban/integrated-kanban'
import { useDebounce, useThrottle } from '@/lib/utils/ui-performance-utils'
import { toast } from 'sonner'

// Import from unified SSE system
import { 
  StreamReader,
  EventFactory,
  IntelligenceEventType,
  isIntelligenceEvent,
  isCategoryEvent,
  isSessionEvent,
  isProgressEvent,
  isErrorEvent,
  type RealtimeEvent,
  type SessionCreatedData,
  type SessionCompleteData,
  type CategoryExtractedData,
  type ProgressInfo,
  type ErrorData
} from '@/lib/realtime-events'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { TooltipWrapper } from '@/components/company-intelligence/tooltip-wrapper'
import { 
  Activity,
  BarChart3,
  Download,
  FileText,
  Layers,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Grid,
  Search,
  Settings,
  TrendingUp,
  Users,
  Package,
  WifiOff,
  Wifi
} from 'lucide-react'
import type { 
  ScrapingSession,
  IntelligenceData,
  CategoryData
} from '@/lib/company-intelligence/types/intelligence-types'
import { 
  SessionPhase,
  ExtractionStatus,
  IntelligenceCategory,
  CATEGORY_DISPLAY_NAMES
} from '@/lib/company-intelligence/types/intelligence-enums'

export default function IntelligenceViewerPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string
  
  const [session, setSession] = useState<ScrapingSession | null>(null)
  const [intelligenceData, setIntelligenceData] = useState<IntelligenceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [streamConnected, setStreamConnected] = useState(false)
  const [streamReader, setStreamReader] = useState<StreamReader | null>(null)
  const [viewMode, setViewMode] = useState<'standard' | 'integrated'>('integrated')
  const [searchQuery, setSearchQuery] = useState('')
  const [enrichmentQueueOpen, setEnrichmentQueueOpen] = useState(false)
  const [realtimeProgress, setRealtimeProgress] = useState<ProgressInfo | null>(null)
  
  // Performance optimizations
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  
  // Memoized calculations
  const totalItems = useMemo(() => {
    if (!intelligenceData?.categories) return 0
    return Array.from(intelligenceData.categories.values())
      .reduce((sum, cat) => sum + cat.items.length, 0)
  }, [intelligenceData])
  
  const enrichmentProgress = useMemo(() => {
    if (!intelligenceData?.categories || totalItems === 0) return 0
    const enrichedCount = Array.from(intelligenceData.categories.values())
      .reduce((sum, cat) => sum + cat.items.filter(i => i.status === 'enriched').length, 0)
    return Math.round((enrichedCount / totalItems) * 100)
  }, [intelligenceData, totalItems])
  
  const pendingEnrichmentCount = useMemo(() => {
    if (!intelligenceData?.categories) return 0
    return Array.from(intelligenceData.categories.values())
      .reduce((sum, cat) => sum + cat.items.filter(i => i.status === 'pending_enrichment').length, 0)
  }, [intelligenceData])
  
  // Create repository instance with memoization
  const repository = useMemo(() => {
    const supabase = createClient()
    return new CompanyIntelligenceRepositoryV4(supabase)
  }, [])

  // Component lifecycle logging
  useEffect(() => {
    permanentLogger.breadcrumb('PAGE_VIEWER', 'Intelligence Viewer mounted', {
      sessionId
    })
    
    return () => {
      permanentLogger.breadcrumb('PAGE_VIEWER', 'Intelligence Viewer unmounted', {
        sessionId
      })
    }
  }, [sessionId])

  // Load session data
  const loadSession = useCallback(async () => {
    const timer = permanentLogger.timing('load_session', { sessionId })
    
    try {
      setLoading(true)
      setError(null)
      
      // Load session
      const sessionData = await repository.getSession(sessionId)
      if (!sessionData) {
        throw new Error('Session not found')
      }
      setSession(sessionData)
      
      // Load intelligence items
      const items = await repository.getIntelligenceItems(sessionId)
      
      // Transform to IntelligenceData format
      const categories = new Map<IntelligenceCategory, CategoryData>()
      
      items.forEach(item => {
        const category = item.category as IntelligenceCategory
        if (!categories.has(category)) {
          categories.set(category, {
            category,
            items: [],
            itemCount: 0,
            confidence: 0,
            extractedAt: new Date().toISOString()
          })
        }
        
        const categoryData = categories.get(category)!
        categoryData.items.push(item)
        categoryData.itemCount++
        categoryData.confidence = Math.max(categoryData.confidence, item.confidence_score)
      })
      
      const data: IntelligenceData = {
        sessionId,
        companyId: sessionData.company_id,
        companyDomain: sessionData.domain,
        categories,
        metadata: {
          scrapedAt: sessionData.created_at,
          lastUpdated: sessionData.updated_at,
          scraperType: sessionData.scraper_type,
          totalPages: sessionData.pages_scraped,
          depth: sessionData.depth,
          phase: sessionData.phase,
          creditsUsed: sessionData.total_credits_used || 0
        }
      }
      
      setIntelligenceData(data)
      
      permanentLogger.info('PAGE_VIEWER', 'Session loaded', {
        sessionId,
        domain: sessionData.domain,
        status: sessionData.status,
        itemCount: items.length,
        duration: timer.stop()
      })
      
    } catch (err) {
      const jsError = convertSupabaseError(err)
      const errorMessage = jsError.message || 'Failed to load session'
      setError(errorMessage)
      
      permanentLogger.captureError('PAGE_VIEWER', jsError, {
        operation: 'loadSession',
        sessionId
      })
    } finally {
      setLoading(false)
    }
  }, [sessionId, repository])

  // Initialize SSE stream for real-time updates using unified system
  useEffect(() => {
    if (!sessionId) return

    permanentLogger.info('PAGE_VIEWER', 'Initializing SSE stream', { sessionId })

    const reader = new StreamReader({
      url: `/api/company-intelligence/v4/stream/${sessionId}`,
      sessionId,
      
      onEvent: (event: RealtimeEvent) => {
        permanentLogger.breadcrumb('PAGE_VIEWER', 'SSE event received', {
          eventType: event.type,
          eventId: event.id
        })
        
        // Handle progress events
        if (isProgressEvent(event)) {
          setRealtimeProgress(event.data)
        }
        
        // Handle intelligence events
        if (isIntelligenceEvent(event)) {
          // Category extracted - reload to show new data
          if (isCategoryEvent(event)) {
            const categoryData = event.data as CategoryExtractedData
            permanentLogger.info('PAGE_VIEWER', 'Category extracted', {
              category: categoryData.category,
              itemCount: categoryData.itemsCount
            })
            toast.info(`Found ${categoryData.itemsCount} items in ${categoryData.category}`)
            loadSession() // Reload to get updated data
          }
          
          // Session completed
          if (event.type === IntelligenceEventType.SESSION_COMPLETED) {
            const completeData = event.data as SessionCompleteData
            permanentLogger.info('PAGE_VIEWER', 'Session completed via SSE', {
              totalItems: completeData.totalItems,
              duration: completeData.duration
            })
            toast.success('Scraping completed successfully!')
            loadSession() // Final reload
            setStreamConnected(false) // Session done, no more updates
          }
          
          // Session failed
          if (event.type === IntelligenceEventType.SESSION_FAILED) {
            permanentLogger.warn('PAGE_VIEWER', 'Session failed', {
              sessionId,
              error: event.data
            })
            toast.error('Session failed. Please check the logs.')
            setStreamConnected(false)
          }
        }
        
        // Handle error events
        if (isErrorEvent(event)) {
          const errorData = event.data as ErrorData
          permanentLogger.captureError('PAGE_VIEWER', new Error(errorData.message), {
            sessionId,
            retriable: errorData.retriable
          })
          
          if (!errorData.retriable) {
            toast.error(`Error: ${errorData.message}`)
          }
        }
      },
      
      onConnect: () => {
        setStreamConnected(true)
        permanentLogger.info('PAGE_VIEWER', 'SSE stream connected', { sessionId })
        toast.success('Connected to real-time updates', { duration: 2000 })
      },
      
      onDisconnect: () => {
        setStreamConnected(false)
        permanentLogger.info('PAGE_VIEWER', 'SSE stream disconnected', { sessionId })
      },
      
      onError: (error: Error) => {
        setStreamConnected(false)
        permanentLogger.captureError('PAGE_VIEWER', error, {
          context: 'SSE stream error',
          sessionId
        })
        
        // Only show error toast if session is active
        if (session?.status === 'active') {
          toast.error('Lost connection to real-time updates')
        }
      },
      
      // Reconnection settings
      reconnect: true,
      reconnectOptions: {
        maxAttempts: 5,
        initialDelay: 1000,
        maxDelay: 10000
      }
    })
    
    setStreamReader(reader)
    reader.connect()
    
    return () => {
      permanentLogger.info('PAGE_VIEWER', 'Cleaning up SSE stream', { sessionId })
      reader.disconnect()
      setStreamReader(null)
      setStreamConnected(false)
    }
  }, [sessionId, session?.status, loadSession])

  // Initial load
  useEffect(() => {
    loadSession()
  }, [loadSession])

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    permanentLogger.breadcrumb('PAGE_VIEWER', 'Manual refresh', { sessionId })
    setRefreshing(true)
    await loadSession()
    setRefreshing(false)
    toast.success('Data refreshed')
  }, [loadSession])

  // Handle export
  const handleExport = useCallback(async () => {
    const timer = permanentLogger.timing('export_intelligence', { sessionId })
    
    try {
      permanentLogger.info('PAGE_VIEWER', 'Exporting intelligence', {
        sessionId,
        domain: session?.domain
      })
      
      // Generate CSV export
      const response = await fetch(`/api/company-intelligence/v4/export/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'csv' })
      })
      
      if (!response.ok) throw new Error('Export failed')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${session?.domain}_intelligence_${new Date().toISOString()}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      permanentLogger.info('PAGE_VIEWER', 'Export completed', {
        sessionId,
        duration: timer.stop()
      })
      
      toast.success('Export completed successfully')
      
    } catch (err) {
      const jsError = convertSupabaseError(err)
      permanentLogger.captureError('PAGE_VIEWER', jsError, {
        operation: 'handleExport',
        sessionId
      })
      toast.error('Export failed. Please try again.')
    }
  }, [session, sessionId])

  // Handle data update from Kanban
  const handleDataUpdate = useCallback(async (data: IntelligenceData) => {
    setIntelligenceData(data)
    // Could persist changes here if needed
  }, [])

  // Handle enrichment request
  const handleEnrichmentRequest = useCallback(async (items: any[]) => {
    try {
      permanentLogger.info('PAGE_VIEWER', 'Enrichment requested', {
        sessionId,
        itemCount: items.length
      })
      
      toast.loading('Starting enrichment...', { id: 'enrichment' })
      
      // Call enrichment API
      const response = await fetch('/api/company-intelligence/v4/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          itemIds: items.map(i => i.id)
        })
      })
      
      if (!response.ok) throw new Error('Enrichment failed')
      
      toast.success('Enrichment started', { id: 'enrichment' })
      
      // Reload to show updated data
      await loadSession()
      
    } catch (err) {
      const jsError = convertSupabaseError(err)
      permanentLogger.captureError('PAGE_VIEWER', jsError, {
        operation: 'handleEnrichmentRequest',
        sessionId
      })
      toast.error('Enrichment failed', { id: 'enrichment' })
    }
  }, [sessionId, loadSession])

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600'
      case 'active': return 'text-blue-600'
      case 'failed': return 'text-red-600'
      case 'cancelled': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }

  const getPhaseProgress = (phase: SessionPhase): number => {
    const phases = [
      SessionPhase.DISCOVERY,
      SessionPhase.INITIALIZATION,
      SessionPhase.SCRAPING,
      SessionPhase.PROCESSING,
      SessionPhase.COMPLETE
    ]
    const currentIndex = phases.indexOf(phase)
    return ((currentIndex + 1) / phases.length) * 100
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading intelligence data...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button 
          onClick={() => router.push('/company-intelligence')}
          className="mt-4"
        >
          Back to Intelligence
        </Button>
      </div>
    )
  }

  // No session state
  if (!session || !intelligenceData) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Session not found</AlertDescription>
        </Alert>
        <Button 
          onClick={() => router.push('/company-intelligence')}
          className="mt-4"
        >
          Back to Intelligence
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{session.domain}</h1>
          <p className="text-muted-foreground mt-1">
            Intelligence Session • {new Date(session.created_at).toLocaleDateString()}
          </p>
        </div>
        
        <div className="flex gap-2 items-center">
          {/* Connection Status Indicator */}
          <TooltipWrapper content={streamConnected ? 'Real-time updates active' : 'Real-time updates disconnected'}>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              streamConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {streamConnected ? (
                <><Wifi className="h-3 w-3" /> Live</>
              ) : (
                <><WifiOff className="h-3 w-3" /> Offline</>
              )}
            </div>
          </TooltipWrapper>
          
          {/* View Mode Toggle */}
          <TooltipWrapper content="Toggle between standard and integrated view">
            <div className="flex items-center gap-2 bg-muted px-3 py-1 rounded-lg">
              <label className="text-sm font-medium">View Mode:</label>
              <Button
                onClick={() => setViewMode(viewMode === 'standard' ? 'integrated' : 'standard')}
                variant="ghost"
                size="sm"
                className="h-7"
              >
                {viewMode === 'integrated' ? (
                  <><Layers className="h-4 w-4 mr-2" /> Integrated</>
                ) : (
                  <><Grid className="h-4 w-4 mr-2" /> Standard</>
                )}
              </Button>
            </div>
          </TooltipWrapper>
          
          <TooltipWrapper content="Refresh data">
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </TooltipWrapper>
          
          <TooltipWrapper content="Export intelligence data">
            <Button
              onClick={handleExport}
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </TooltipWrapper>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className={`h-4 w-4 ${getStatusColor(session.status)}`} />
              <span className={`font-semibold ${getStatusColor(session.status)}`}>
                {session.status}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Phase</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Badge variant="outline">{session.phase}</Badge>
              <TooltipWrapper content={`Progress: ${
                realtimeProgress ? realtimeProgress.percentage : getPhaseProgress(session.phase).toFixed(0)
              }%`}>
                <Progress 
                  value={realtimeProgress ? realtimeProgress.percentage : getPhaseProgress(session.phase)} 
                  className="h-2" 
                />
              </TooltipWrapper>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Credits Used</CardTitle>
          </CardHeader>
          <CardContent>
            <TooltipWrapper content="Total credits consumed">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{session.total_credits_used || 0}</span>
              </div>
            </TooltipWrapper>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Items Found</CardTitle>
          </CardHeader>
          <CardContent>
            <TooltipWrapper content="Total intelligence items discovered">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{totalItems}</span>
              </div>
            </TooltipWrapper>
          </CardContent>
        </Card>
      </div>
      
      {/* Enrichment Progress Card */}
      {enrichmentProgress > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Enrichment Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Enriched</span>
                <span className="font-semibold">{enrichmentProgress}%</span>
              </div>
              <Progress value={enrichmentProgress} className="h-2" />
              {pendingEnrichmentCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {pendingEnrichmentCount} items pending enrichment
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Search and Filter Bar */}
      <div className="flex gap-4 items-center bg-muted/50 p-4 rounded-lg">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search intelligence items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <TooltipWrapper content="Open enrichment queue">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEnrichmentQueueOpen(!enrichmentQueueOpen)}
            className="relative"
          >
            <Activity className="h-4 w-4 mr-2" />
            Enrichment Queue
            {pendingEnrichmentCount > 0 && (
              <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center">
                {pendingEnrichmentCount}
              </Badge>
            )}
          </Button>
        </TooltipWrapper>
        <TooltipWrapper content="View settings">
          <Button
            variant="ghost"
            size="icon"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </TooltipWrapper>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="kanban" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="kanban">
            <Sparkles className="h-4 w-4 mr-2" />
            Kanban View
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="enrichment">
            <Activity className="h-4 w-4 mr-2" />
            Enrichment Queue
          </TabsTrigger>
          <TabsTrigger value="raw">
            <FileText className="h-4 w-4 mr-2" />
            Raw Data
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="space-y-4">
          {viewMode === 'integrated' ? (
            <IntegratedKanban
              sessionId={sessionId}
              domain={session.domain}
              userId={session.user_id}
              initialData={intelligenceData}
              enableRealtime={streamConnected}
              enableVirtualization={true}
              virtualizationThreshold={50}
              creditsAvailable={1000 - (session.total_credits_used || 0)}
              onUpdate={handleDataUpdate}
              onEnrichmentRequest={handleEnrichmentRequest}
            />
          ) : (
            <IntelligenceKanban
              sessionId={sessionId}
              domain={session.domain}
              userId={session.user_id}
              initialData={intelligenceData}
              onUpdate={handleDataUpdate}
              onEnrichmentRequest={handleEnrichmentRequest}
              viewMode="kanban"
              creditsAvailable={1000 - (session.total_credits_used || 0)}
              enableRealtime={streamConnected}
            />
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <AnalyticsView
            data={intelligenceData}
            sessionId={sessionId}
            searchQuery={debouncedSearchQuery}
            enableExport={true}
          />
        </TabsContent>

        <TabsContent value="enrichment" className="space-y-4">
          <EnrichmentQueue
            sessionId={sessionId}
            items={intelligenceData?.categories ? 
              Array.from(intelligenceData.categories.values())
                .flatMap(cat => cat.items)
                .filter(item => item.status === 'pending_enrichment')
              : []
            }
            onProcess={handleEnrichmentRequest}
            creditsAvailable={1000 - (session.total_credits_used || 0)}
          />
        </TabsContent>

        <TabsContent value="raw" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Raw Intelligence Data</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-96 text-xs">
                {JSON.stringify(
                  {
                    session: {
                      id: session.id,
                      domain: session.domain,
                      status: session.status,
                      phase: session.phase,
                      creditsUsed: session.total_credits_used
                    },
                    categories: Array.from(intelligenceData.categories.entries()).map(([cat, data]) => ({
                      category: CATEGORY_DISPLAY_NAMES[cat],
                      items: data.items.length,
                      confidence: data.confidence,
                      enrichedCount: data.items.filter(i => i.status === 'enriched').length,
                      pendingCount: data.items.filter(i => i.status === 'pending_enrichment').length
                    })),
                    realtime: {
                      connected: streamConnected,
                      progress: realtimeProgress
                    }
                  },
                  null,
                  2
                )}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
