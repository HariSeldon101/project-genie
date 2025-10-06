/**
 * LogStats Component
 * Displays statistics and insights about logs
 * Following SOLID principle - Single Responsibility
 * @module log-stats
 */

'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { TooltipWrapper } from '@/components/company-intelligence/tooltip-wrapper'
import { formatLevelForDisplay, formatLevelForDatabase } from '@/lib/utils/log-level-utils'
import type { LogEntry } from '@/lib/utils/log-operations'
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Activity
} from 'lucide-react'

/**
 * Props for LogStats component
 */
export interface LogStatsProps {
  logs: LogEntry[]
  filteredLogs: LogEntry[]
  metadata?: {
    maxLogs: number
    currentCount: number
    warningThreshold: number
    criticalThreshold: number
  }
  totalStats?: {  // Total unfiltered statistics
    totalCount: number
    levelDistribution: Record<string, number>
    categories: string[]
  }
  showOnlyEssentials?: boolean // Add flag to show only essential panels
  verticalLayout?: boolean // Stack panels vertically for sidebar
}

/**
 * LogStats Component
 * Provides comprehensive statistics about logs
 * 
 * Features:
 * - Level distribution
 * - Category breakdown
 * - Error rate calculation
 * - Performance metrics
 * - Storage usage indicator
 * - Filter impact display
 * 
 * Uses memoization for performance optimization
 */
export function LogStats({ logs, filteredLogs, metadata, totalStats, showOnlyEssentials = false, verticalLayout = false }: LogStatsProps) {
  /**
   * Calculate statistics from logs
   * Memoized to prevent unnecessary recalculation
   */
  const stats = useMemo(() => {
    // Process filtered logs for categories, errors, and response times
    // Level counts come from totalStats to show database totals
    const categoryCounts: Record<string, number> = {}
    const errorTypes: Record<string, number> = {}
    let totalResponseTime = 0
    let responseTimeCount = 0

    // Process filtered logs for statistics (except levels)
    filteredLogs.forEach(log => {
      // Count categories from filtered logs
      if (log.category) {
        categoryCounts[log.category] = (categoryCounts[log.category] || 0) + 1
      }

      // Count error types from filtered logs
      if (log.error && typeof log.error === 'object' && 'name' in log.error) {
        const errorName = log.error.name as string
        errorTypes[errorName] = (errorTypes[errorName] || 0) + 1
      }

      // Calculate average response time from filtered logs
      if (log.timingMs) {
        totalResponseTime += log.timingMs
        responseTimeCount++
      }
    })
    
    // Get top categories
    const topCategories = Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
    
    // Get top error types
    const topErrors = Object.entries(errorTypes)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
    
    // Calculate error rate from total database statistics
    const totalLogs = totalStats?.totalCount || 0
    const totalErrors = (totalStats?.levelDistribution?.error || 0) +
                       (totalStats?.levelDistribution?.critical || 0)
    const errorRate = totalLogs > 0
      ? (totalErrors / totalLogs * 100).toFixed(1)
      : '0'
    
    const avgResponseTime = responseTimeCount > 0
      ? Math.round(totalResponseTime / responseTimeCount)
      : 0
    
    // Storage usage
    const storageUsage = metadata 
      ? Math.round((metadata.currentCount / metadata.maxLogs) * 100)
      : 0
    
    return {
      topCategories,
      topErrors,
      errorRate,
      avgResponseTime,
      storageUsage,
      totalLogs,
      filteredCount: filteredLogs.length,
      filterReduction: totalLogs > 0
        ? Math.round((1 - filteredLogs.length / totalLogs) * 100)
        : 0
    }
  }, [filteredLogs, metadata, totalStats])
  
  /**
   * Get icon for log level
   */
  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'debug': return <Info className="w-3 h-3" />
      case 'info': return <CheckCircle2 className="w-3 h-3" />
      case 'warn': return <AlertTriangle className="w-3 h-3" />
      case 'error': return <XCircle className="w-3 h-3" />
      case 'fatal': return <AlertCircle className="w-3 h-3" />
      default: return <Info className="w-3 h-3" />
    }
  }
  
  /**
   * Get color class for level
   */
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'debug': return 'text-gray-500'
      case 'info': return 'text-blue-500'
      case 'warn': return 'text-yellow-500'
      case 'error': return 'text-red-500'
      case 'fatal': return 'text-red-700'
      default: return 'text-gray-500'
    }
  }
  
  // Adjust grid based on layout mode
  const gridCols = verticalLayout 
    ? "grid-cols-1" // Stack vertically in sidebar
    : showOnlyEssentials 
      ? "grid-cols-1 md:grid-cols-2" 
      : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-muted-foreground" />
          Log Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Level Distribution Section */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Activity className="w-3 h-3 text-muted-foreground" />
            Level Distribution
          </h4>
          <div className="space-y-2">
            {Object.entries(totalStats?.levelDistribution || {
              debug: 0,
              info: 0,
              warn: 0,
              error: 0,
              critical: 0
            }).map(([level, count]) => (
              <div key={level} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={getLevelColor(level)}>
                    {getLevelIcon(level)}
                  </span>
                  <span className="text-sm">{formatLevelForDisplay(level)}</span>
                </div>
                <span className="text-sm font-medium">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      
        {/* Separator */}
        <div className="border-t pt-4" />

        {/* Storage & Filters Section */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <TrendingUp className="w-3 h-3 text-muted-foreground" />
            Storage & Filters
          </h4>
          <div className="space-y-3">
            {metadata && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Storage Used</span>
                  <span className={`text-sm font-medium ${
                    stats.storageUsage >= 90 ? 'text-red-600' :
                    stats.storageUsage >= 70 ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>{stats.storageUsage}%</span>
                </div>
                <TooltipWrapper content={`${metadata.currentCount.toLocaleString()} of ${metadata.maxLogs.toLocaleString()} logs stored`}>
                  <Progress
                    value={stats.storageUsage}
                    className={`h-2 ${
                      stats.storageUsage >= 90 ? 'bg-red-100' :
                      stats.storageUsage >= 70 ? 'bg-yellow-100' :
                      'bg-gray-100'
                    }`}
                  />
                </TooltipWrapper>
                {stats.storageUsage >= 70 && (
                  <div className={`text-xs ${
                    stats.storageUsage >= 90 ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    <AlertCircle className="w-3 h-3 inline mr-1" />
                    {stats.storageUsage >= 90 ? 'Critical: ' : 'Warning: '}
                    Storage {stats.storageUsage >= 90 ? 'fatal' : 'high'}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Logs</span>
              <span className="text-sm font-medium">
                {metadata?.currentCount ? metadata.currentCount.toLocaleString() : stats.totalLogs}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Filtered</span>
              <span className="text-sm font-medium">
                {stats.filteredCount} (-{stats.filterReduction}%)
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}