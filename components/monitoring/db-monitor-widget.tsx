'use client'

import { useState, useEffect } from 'react'
import { TooltipWrapper } from '@/components/company-intelligence/tooltip-wrapper'

/**
 * Ultra-simple database monitoring widget
 * Shows ALL metrics from Supabase with proper tooltips
 * KISS principle: fetch data, show data, done
 */
export function DbMonitorWidget() {
  const [metrics, setMetrics] = useState<any>(null)

  useEffect(() => {
    // Fetch metrics
    const fetchMetrics = () => {
      fetch('/api/monitoring/db-status')
        .then(r => r.json())
        .then(setMetrics)
        .catch(() => {}) // Ignore errors silently
    }

    fetchMetrics()
    const interval = setInterval(fetchMetrics, 30000) // Every 30 seconds
    return () => clearInterval(interval)
  }, [])

  if (!metrics) return null // Don't show if no data

  // Visual indicators based on ACTUAL values from Supabase
  const connectionWarn = metrics.connections?.total > 40
  const connectionCritical = metrics.connections?.total > 50
  const cacheWarn = metrics.cache_hit_ratio < 95
  const cacheCritical = metrics.cache_hit_ratio < 80
  const slowWarn = metrics.slow_queries > 0

  // DISPLAY ALL AVAILABLE METRICS WITH PROPER TOOLTIPS
  return (
    <div className="text-xs text-muted-foreground font-mono flex items-center gap-1">
      {/* Connection metrics - ALL of them */}
      <TooltipWrapper
        content="Active connections currently executing queries. High values (>20) indicate heavy database load."
        position="BottomCenter"
      >
        <span className="hover:text-foreground cursor-pointer transition-colors">
          Active: {metrics.connections?.active}
        </span>
      </TooltipWrapper>

      <span>|</span>

      <TooltipWrapper
        content="Idle connections ready for immediate use. Low values (<3) may cause connection wait times."
        position="BottomCenter"
      >
        <span className="hover:text-foreground cursor-pointer transition-colors">
          Idle: {metrics.connections?.idle}
        </span>
      </TooltipWrapper>

      <span>|</span>

      <TooltipWrapper
        content={`Total connections (${metrics.connections?.total}) out of maximum (${metrics.connections?.max}). ${connectionCritical ? 'CRITICAL: Near connection limit!' : connectionWarn ? 'Warning: High connection usage' : 'Healthy connection pool'}`}
        position="BottomCenter"
      >
        <span className={`hover:text-foreground cursor-pointer transition-colors ${connectionCritical ? 'text-red-500 font-bold' : connectionWarn ? 'text-yellow-500' : ''}`}>
          Total: {metrics.connections?.total}/{metrics.connections?.max}
        </span>
      </TooltipWrapper>

      <span>|</span>

      <TooltipWrapper
        content={`Connection pool usage: ${metrics.connections?.usage_percent}%. ${metrics.connections?.usage_percent > 80 ? 'HIGH: Consider connection pooling optimization' : metrics.connections?.usage_percent > 60 ? 'Moderate load' : 'Normal usage'}`}
        position="BottomCenter"
      >
        <span className={`hover:text-foreground cursor-pointer transition-colors ${metrics.connections?.usage_percent > 80 ? 'text-red-500' : metrics.connections?.usage_percent > 60 ? 'text-yellow-500' : ''}`}>
          Usage: {metrics.connections?.usage_percent}%
        </span>
      </TooltipWrapper>

      <span>|</span>

      {/* Performance metrics */}
      <TooltipWrapper
        content={`Cache hit ratio: ${metrics.cache_hit_ratio}% of queries served from memory. ${cacheCritical ? 'POOR: Queries hitting disk frequently!' : cacheWarn ? 'Could be better - check slow queries' : 'EXCELLENT: Fast query performance'}`}
        position="BottomCenter"
      >
        <span className={`hover:text-foreground cursor-pointer transition-colors ${cacheCritical ? 'text-red-500' : cacheWarn ? 'text-yellow-500' : 'text-green-500'}`}>
          Cache: {metrics.cache_hit_ratio}%
        </span>
      </TooltipWrapper>

      <span>|</span>

      <TooltipWrapper
        content={`Database size: ${metrics.database_size_mb}MB. Monitor for unexpected growth that might indicate data retention issues.`}
        position="BottomCenter"
      >
        <span className="hover:text-foreground cursor-pointer transition-colors">
          DB: {metrics.database_size_mb}MB
        </span>
      </TooltipWrapper>

      <span>|</span>

      <TooltipWrapper
        content={`Slow queries (>1 second): ${metrics.slow_queries}. ${slowWarn ? 'PERFORMANCE ISSUE: Queries need optimization! Check indexes and query structure.' : 'No slow queries detected - good performance.'}`}
        position="BottomCenter"
      >
        <span className={`hover:text-foreground cursor-pointer transition-colors ${slowWarn ? 'text-red-500 font-bold animate-pulse' : ''}`}>
          Slow: {metrics.slow_queries}
        </span>
      </TooltipWrapper>

      <span>|</span>

      {/* Instance info */}
      <TooltipWrapper
        content={`Supabase datacenter: ${metrics.instance?.region}. Your database is hosted in this AWS region.`}
        position="BottomCenter"
      >
        <span className="hover:text-foreground cursor-pointer transition-colors">
          {metrics.instance?.region}
        </span>
      </TooltipWrapper>
    </div>
  )
}