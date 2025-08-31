/**
 * Real-time log viewer for document generation
 */

'use client'

import React, { useEffect, useRef } from 'react'
import { LogEntry } from '@/lib/hooks/use-generation-stream'
import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle, Info, Loader2 } from 'lucide-react'

interface GenerationLogViewerProps {
  logs: LogEntry[]
  className?: string
  showTimestamps?: boolean
}

export function GenerationLogViewer({ 
  logs, 
  className,
  showTimestamps = true
}: GenerationLogViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new logs appear
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs])

  const getIcon = (type: LogEntry['type'], level?: LogEntry['level']) => {
    switch (type) {
      case 'start':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
      case 'complete':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'log':
        if (level === 'error') return <AlertCircle className="w-4 h-4 text-red-500" />
        if (level === 'warn') return <AlertCircle className="w-4 h-4 text-yellow-500" />
        return <Info className="w-4 h-4 text-gray-500" />
      default:
        return <Info className="w-4 h-4 text-gray-500" />
    }
  }

  const getLogColor = (type: LogEntry['type'], level?: LogEntry['level']) => {
    switch (type) {
      case 'error':
        return 'text-red-600 dark:text-red-400'
      case 'complete':
        return 'text-green-600 dark:text-green-400'
      case 'start':
        return 'text-blue-600 dark:text-blue-400'
      case 'log':
        if (level === 'error') return 'text-red-600 dark:text-red-400'
        if (level === 'warn') return 'text-yellow-600 dark:text-yellow-400'
        return 'text-gray-700 dark:text-gray-300'
      default:
        return 'text-gray-700 dark:text-gray-300'
    }
  }

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    })
  }

  if (logs.length === 0) {
    return (
      <div className={cn(
        "rounded-lg border bg-muted/50 p-8 text-center",
        className
      )}>
        <p className="text-muted-foreground">
          Generation logs will appear here...
        </p>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      className={cn(
        "rounded-lg border bg-black/95 p-4 font-mono text-xs overflow-auto max-h-[400px]",
        className
      )}
    >
      <div className="space-y-1">
        {logs.map((log, index) => (
          <div 
            key={index} 
            className="flex items-start gap-2 group hover:bg-white/5 px-2 py-1 rounded"
          >
            <div className="flex-shrink-0 mt-0.5">
              {getIcon(log.type, log.level)}
            </div>
            {showTimestamps && (
              <span className="text-gray-500 flex-shrink-0 select-none">
                {formatTimestamp(log.timestamp)}
              </span>
            )}
            <span className={cn("flex-1 break-all", getLogColor(log.type, log.level))}>
              {log.message}
            </span>
            {log.progress !== undefined && (
              <span className="text-blue-500 flex-shrink-0">
                {log.progress}%
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function GenerationLogViewerCompact({ logs }: { logs: LogEntry[] }) {
  const latestLog = logs[logs.length - 1]
  
  if (!latestLog) {
    return null
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      {getIcon(latestLog.type, latestLog.level)}
      <span className="text-muted-foreground">
        {latestLog.message}
      </span>
    </div>
  )
}

function getIcon(type: LogEntry['type'], level?: LogEntry['level']) {
  switch (type) {
    case 'start':
      return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
    case 'complete':
      return <CheckCircle className="w-4 h-4 text-green-500" />
    case 'error':
      return <AlertCircle className="w-4 h-4 text-red-500" />
    case 'log':
      if (level === 'error') return <AlertCircle className="w-4 h-4 text-red-500" />
      if (level === 'warn') return <AlertCircle className="w-4 h-4 text-yellow-500" />
      return <Info className="w-4 h-4 text-gray-500" />
    default:
      return <Info className="w-4 h-4 text-gray-500" />
  }
}