'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Link,
  Database,
  TrendingUp,
  Loader2
} from 'lucide-react'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import type { ScrapingStatus, ExecutionMetrics } from '@/types/company-intelligence/scraping'

interface ExecutionMonitorProps {
  sessionId: string
  status: ScrapingStatus
  progress: number
}

interface MetricCard {
  label: string
  value: string | number
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
}

export function ExecutionMonitor({ sessionId, status, progress }: ExecutionMonitorProps) {
  const [metrics, setMetrics] = useState<ExecutionMetrics | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchMetrics = async () => {
      const timer = permanentLogger.timing('fetch_execution_metrics')
      
      try {
        // Use API route instead of repository directly
        const response = await fetch(`/api/company-intelligence/metrics?sessionId=${sessionId}`)
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch metrics')
        }
        
        const data = await response.json()
        setMetrics(data)
        setError(null)
        setIsLoading(false)
        
        permanentLogger.breadcrumb('metrics_fetched', 'Execution metrics retrieved', {
          sessionId,
          pagesProcessed: data?.pagesSucceeded || 0
        })
      } catch (err) {
        permanentLogger.captureError('COMPONENT_MONITOR', err as Error, { 
          context: 'Failed to fetch metrics from API' 
        })
        setError(err instanceof Error ? err.message : 'Failed to fetch metrics')
        setIsLoading(false)
      } finally {
        timer.stop()
      }
    }

    // Initial fetch
    fetchMetrics()

    // Poll for updates while running
    if (status === 'running' || status === 'initializing') {
      const interval = setInterval(fetchMetrics, 2000)
      return () => clearInterval(interval)
    }
  }, [sessionId, status])

  useEffect(() => {
    // Add log entries based on status changes
    const timestamp = new Date().toLocaleTimeString()
    
    switch (status) {
      case 'initializing':
        setLogs(prev => [...prev, `[${timestamp}] Initializing scraping session...`])
        break
      case 'running':
        setLogs(prev => [...prev, `[${timestamp}] Scraping in progress...`])
        break
      case 'paused':
        setLogs(prev => [...prev, `[${timestamp}] Scraping paused`])
        break
      case 'completed':
        setLogs(prev => [...prev, `[${timestamp}] Scraping completed successfully`])
        break
      case 'failed':
        setLogs(prev => [...prev, `[${timestamp}] Scraping failed: ${error || 'Unknown error'}`])
        break
    }
  }, [status, error])

  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'paused':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const getStatusVariant = (): any => {
    switch (status) {
      case 'running': return 'default'
      case 'completed': return 'success'
      case 'failed': return 'destructive'
      case 'paused': return 'warning'
      default: return 'secondary'
    }
  }

  const formatDuration = (ms: number): string => {
    if (!ms) return '0s'
    
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  const calculateSuccessRate = (): number => {
    if (!metrics) return 0
    const total = (metrics.pagesSucceeded || 0) + (metrics.pagesFailed || 0)
    if (total === 0) return 0
    return Math.round((metrics.pagesSucceeded / total) * 100)
  }

  const metricCards: MetricCard[] = [
    {
      label: 'Pages Processed',
      value: metrics?.pagesSucceeded || 0,
      icon: <CheckCircle className="h-4 w-4" />,
      trend: 'up'
    },
    {
      label: 'Failed Pages',
      value: metrics?.pagesFailed || 0,
      icon: <XCircle className="h-4 w-4" />,
      trend: metrics?.pagesFailed === 0 ? 'neutral' : 'down'
    },
    {
      label: 'Data Points',
      value: metrics?.dataPointsExtracted || 0,
      icon: <Database className="h-4 w-4" />,
      trend: 'up'
    },
    {
      label: 'Links Found',
      value: metrics?.linksDiscovered || 0,
      icon: <Link className="h-4 w-4" />,
      trend: 'neutral'
    },
    {
      label: 'Duration',
      value: formatDuration(metrics?.durationMs || 0),
      icon: <Clock className="h-4 w-4" />,
      trend: 'neutral'
    },
    {
      label: 'Success Rate',
      value: `${calculateSuccessRate()}%`,
      icon: <TrendingUp className="h-4 w-4" />,
      trend: calculateSuccessRate() > 80 ? 'up' : 'down'
    }
  ]

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Execution Monitor</CardTitle>
            <Badge variant={getStatusVariant()}>
              {getStatusIcon()}
              <span className="ml-1">{status.toUpperCase()}</span>
            </Badge>
          </div>
          <CardDescription>
            Real-time monitoring of scraping execution
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Overall Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {metricCards.map((metric) => (
              <div key={metric.label} className="rounded-lg border p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">
                    {metric.label}
                  </span>
                  {metric.icon}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">
                    {metric.value}
                  </span>
                  {metric.trend && (
                    <span className={`text-xs ${
                      metric.trend === 'up' ? 'text-green-600' :
                      metric.trend === 'down' ? 'text-red-600' :
                      'text-gray-400'
                    }`}>
                      {metric.trend === 'up' ? '↑' :
                       metric.trend === 'down' ? '↓' : '—'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Execution Logs</CardTitle>
          <CardDescription>
            Real-time activity stream
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-lg p-3 max-h-48 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Waiting for activity...
              </p>
            ) : (
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="text-xs font-mono">
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
