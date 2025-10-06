/**
 * Debug Panel Component
 * Collapsible debug panel for viewing logs and system information
 */

import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { 
  Terminal,
  Bug,
  Download,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Filter,
  AlertCircle,
  Info,
  AlertTriangle,
  CheckCircle,
  X
} from 'lucide-react'
import { format } from 'date-fns'

export interface LogEntry {
  timestamp: Date
  level: 'debug' | 'info' | 'warn' | 'error' | 'success'
  message: string
  details?: any
  source?: string
}

export interface ErrorLog {
  timestamp: Date
  type: string
  message: string
  stack?: string
  request?: any
  response?: any
  phase?: string
}

interface DebugPanelProps {
  logs: LogEntry[]
  errorLogs: ErrorLog[]
  autoScroll?: boolean
  onAutoScrollChange?: (enabled: boolean) => void
  onClearLogs?: () => void
  onClearErrors?: () => void
  onExportLogs?: (format: 'json' | 'csv' | 'txt') => void
  maxHeight?: string
  defaultOpen?: boolean
  className?: string
}

export function DebugPanel({
  logs,
  errorLogs,
  autoScroll = true,
  onAutoScrollChange,
  onClearLogs,
  onClearErrors,
  onExportLogs,
  maxHeight = '400px',
  defaultOpen = false,
  className
}: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [logFilter, setLogFilter] = useState<'all' | 'debug' | 'info' | 'warn' | 'error' | 'success'>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const logsEndRef = useRef<HTMLDivElement>(null)
  const errorLogsEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  useEffect(() => {
    if (autoScroll && errorLogsEndRef.current) {
      errorLogsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [errorLogs, autoScroll])

  // Get unique sources from logs
  const sources = Array.from(new Set(logs.map(log => log.source || 'GENERAL')))

  // Filter logs based on current filters
  const filteredLogs = logs.filter(log => {
    if (logFilter !== 'all' && log.level !== logFilter) return false
    if (sourceFilter !== 'all' && log.source !== sourceFilter) return false
    if (searchTerm && !log.message.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  // Get log level icon and color
  const getLogIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'debug': return <Bug className="w-3 h-3" />
      case 'info': return <Info className="w-3 h-3" />
      case 'warn': return <AlertTriangle className="w-3 h-3" />
      case 'error': return <AlertCircle className="w-3 h-3" />
      case 'success': return <CheckCircle className="w-3 h-3" />
    }
  }

  const getLogColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'debug': return 'text-gray-500'
      case 'info': return 'text-blue-600'
      case 'warn': return 'text-yellow-600'
      case 'error': return 'text-red-600'
      case 'success': return 'text-green-600'
    }
  }

  // Format log entry for display
  const formatLogEntry = (log: LogEntry) => {
    const timestamp = format(log.timestamp, 'HH:mm:ss.SSS')
    const source = log.source ? `[${log.source}]` : ''
    return `${timestamp} ${source} ${log.message}`
  }

  // Copy logs to clipboard
  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  // Export logs
  const handleExport = (format: 'json' | 'csv' | 'txt') => {
    if (onExportLogs) {
      onExportLogs(format)
    } else {
      // Default export implementation
      let content = ''
      
      switch (format) {
        case 'json':
          content = JSON.stringify({ logs: filteredLogs, errors: errorLogs }, null, 2)
          break
        case 'csv':
          content = 'Timestamp,Level,Source,Message\n'
          content += filteredLogs.map(log => 
            `"${format(log.timestamp, 'yyyy-MM-dd HH:mm:ss.SSS')}","${log.level}","${log.source || ''}","${log.message}"`
          ).join('\n')
          break
        case 'txt':
          content = filteredLogs.map(formatLogEntry).join('\n')
          break
      }

      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `debug-logs-${Date.now()}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  return (
    <Collapsible 
      open={isOpen} 
      onOpenChange={setIsOpen}
      className={`fixed bottom-0 left-0 right-0 z-40 bg-background border-t shadow-lg ${className}`}
    >
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="absolute -top-8 right-4 bg-background border border-b-0 rounded-t-md px-3 py-1"
        >
          <Terminal className="w-4 h-4 mr-2" />
          Debug Console
          {isOpen ? <ChevronDown className="w-4 h-4 ml-2" /> : <ChevronUp className="w-4 h-4 ml-2" />}
          {logs.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {logs.length}
            </Badge>
          )}
          {errorLogs.length > 0 && (
            <Badge variant="destructive" className="ml-1">
              {errorLogs.length}
            </Badge>
          )}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="p-4" style={{ maxHeight }}>
          <Tabs defaultValue="logs" className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="logs">
                  Logs
                  {filteredLogs.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {filteredLogs.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="errors">
                  Errors
                  {errorLogs.length > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {errorLogs.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="network">Network</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                {/* Auto-scroll toggle */}
                <div className="flex items-center gap-2">
                  <Switch
                    id="auto-scroll"
                    checked={autoScroll}
                    onCheckedChange={onAutoScrollChange}
                  />
                  <Label htmlFor="auto-scroll" className="text-xs">Auto-scroll</Label>
                </div>

                {/* Export button */}
                <Select onValueChange={(value) => handleExport(value as 'json' | 'csv' | 'txt')}>
                  <SelectTrigger className="w-[100px] h-7">
                    <Download className="w-3 h-3 mr-1" />
                    <SelectValue placeholder="Export" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="txt">Text</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <TabsContent value="logs" className="mt-0">
              {/* Log Filters */}
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-muted-foreground" />
                
                <Select value={logFilter} onValueChange={(value: any) => setLogFilter(value)}>
                  <SelectTrigger className="w-[120px] h-7">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="debug">Debug</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warn">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-[140px] h-7">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    {sources.map(source => (
                      <SelectItem key={source} value={source}>
                        {source}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <input
                  type="text"
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 px-2 py-1 text-xs border rounded"
                />

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onClearLogs}
                  className="h-7 px-2"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>

              {/* Log Display */}
              <ScrollArea className="h-[280px] w-full rounded-md border p-2 font-mono text-xs">
                {filteredLogs.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No logs to display
                  </div>
                ) : (
                  <>
                    {filteredLogs.map((log, index) => (
                      <div
                        key={index}
                        className={`flex items-start gap-2 py-1 hover:bg-muted/50 ${getLogColor(log.level)}`}
                      >
                        {getLogIcon(log.level)}
                        <span className="text-muted-foreground">
                          {format(log.timestamp, 'HH:mm:ss.SSS')}
                        </span>
                        {log.source && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {log.source}
                          </Badge>
                        )}
                        <span className="flex-1">{log.message}</span>
                        {log.details && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-5 w-5 p-0"
                            onClick={() => copyToClipboard(JSON.stringify(log.details, null, 2))}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <div ref={logsEndRef} />
                  </>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="errors" className="mt-0">
              <div className="flex items-center justify-between mb-3">
                <Badge variant="destructive">
                  {errorLogs.length} error{errorLogs.length !== 1 ? 's' : ''}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onClearErrors}
                  className="h-7 px-2"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Clear
                </Button>
              </div>

              <ScrollArea className="h-[280px] w-full rounded-md border p-2">
                {errorLogs.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No errors logged
                  </div>
                ) : (
                  <>
                    {errorLogs.map((error, index) => (
                      <div key={index} className="mb-4 p-3 border rounded-md bg-red-50 dark:bg-red-900/10">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-600 mt-1" />
                            <div className="space-y-1">
                              <div className="font-semibold text-sm">
                                {error.type}: {error.message}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {format(error.timestamp, 'yyyy-MM-dd HH:mm:ss.SSS')}
                                {error.phase && ` • Phase: ${error.phase}`}
                              </div>
                              {error.stack && (
                                <details className="mt-2">
                                  <summary className="text-xs cursor-pointer">Stack trace</summary>
                                  <pre className="text-[10px] mt-1 p-2 bg-muted rounded overflow-x-auto">
                                    {error.stack}
                                  </pre>
                                </details>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-5 w-5 p-0"
                            onClick={() => copyToClipboard(JSON.stringify(error, null, 2))}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div ref={errorLogsEndRef} />
                  </>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="network" className="mt-0">
              <div className="text-center text-muted-foreground py-8">
                Network monitoring coming soon...
              </div>
            </TabsContent>

            <TabsContent value="performance" className="mt-0">
              <div className="text-center text-muted-foreground py-8">
                Performance metrics coming soon...
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}