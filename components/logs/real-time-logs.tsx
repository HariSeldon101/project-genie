/**
 * Real-Time Logs Component
 * Connects to SSE endpoint for live log streaming
 * MANDATORY: Uses standardized event handling
 * Database-first approach - no mock data
 *
 * Features:
 * - Real-time log streaming via SSE
 * - Automatic reconnection on disconnect
 * - Filter persistence
 * - Performance monitoring
 * - Error boundary protection
 *
 * @module real-time-logs
 */

'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { LogEntry } from '@/components/logs/log-entry'
import type { LogEntry as LogEntryType } from '@/lib/utils/log-operations'
import type { RealtimeEvent as SSEEvent } from '@/lib/realtime-events'
import { Wifi, WifiOff, RefreshCw, Activity } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface RealTimeLogsProps {
  /** Initial filter for log level */
  levelFilter?: string[]
  /** Initial filter for category */
  categoryFilter?: string[]
  /** Maximum logs to display */
  maxLogs?: number
  /** Auto-scroll to new logs */
  autoScroll?: boolean
  /** Session ID for correlation */
  sessionId?: string
}

/**
 * Real-Time Logs Component
 *
 * Connects to /api/logs/stream endpoint for live updates
 * Automatically reconnects on connection loss
 *
 * Architecture:
 * - Uses EventSource API for SSE connection
 * - Parses standardized SSEEvent format
 * - Maintains local log buffer
 * - Handles connection lifecycle
 *
 * @param props Component configuration
 */
export function RealTimeLogs({
  levelFilter = [],
  categoryFilter = [],
  maxLogs = 100,
  autoScroll = true,
  sessionId
}: RealTimeLogsProps) {
  // ========== STATE MANAGEMENT ==========
  // Connection and logs state
  const [logs, setLogs] = useState<LogEntryType[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [correlationId, setCorrelationId] = useState<string | null>(null)

  // Performance tracking
  const [stats, setStats] = useState({
    eventsReceived: 0,
    bytesReceived: 0,
    connectionDuration: 0,
    averageLatency: 0
  })

  // Refs for connection management
  const eventSourceRef = useRef<EventSource | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const connectionStartRef = useRef<number>(0)
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Connect to SSE endpoint
   * Establishes EventSource connection with filters
   */
  const connect = useCallback(() => {
    // Prevent multiple connections
    if (eventSourceRef.current || isConnecting) {
      return
    }

    setIsConnecting(true)
    setError(null)
    connectionStartRef.current = performance.now()

    // ========== BUILD URL WITH FILTERS ==========
    // Construct query parameters for filtering
    const params = new URLSearchParams()
    if (levelFilter.length > 0) {
      params.append('level', levelFilter.join(','))
    }
    if (categoryFilter.length > 0) {
      params.append('category', categoryFilter.join(','))
    }
    if (sessionId) {
      params.append('sessionId', sessionId)
    }

    const url = `/api/logs/stream?${params.toString()}`

    // ========== BREADCRUMB TRACKING ==========
    // Log connection attempt for debugging
    permanentLogger.breadcrumb('USER_ACTION', 'real-time-logs-connect', {
      url,
      filters: { level: levelFilter, category: categoryFilter }
    })

    try {
      // ========== CREATE EVENT SOURCE ==========
      // Establish SSE connection
      const eventSource = new EventSource(url)
      eventSourceRef.current = eventSource

      /**
       * Handle connection open
       */
      eventSource.onopen = () => {
        setIsConnected(true)
        setIsConnecting(false)
        setError(null)

        const connectionDuration = performance.now() - connectionStartRef.current
        permanentLogger.timing('real-time-logs-connect', {
          duration: connectionDuration,
          success: true
        })

        permanentLogger.info('real-time-logs', 'Connected to log stream', {
          url,
          duration: connectionDuration
        })

        // Start ping interval to detect stale connections
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current)
        }
        pingIntervalRef.current = setInterval(() => {
          // Check if we've received data recently
          if (lastUpdate && Date.now() - lastUpdate.getTime() > 10000) {
            permanentLogger.warn('real-time-logs', 'No data for 10s, reconnecting')
            reconnect()
          }
        }, 10000)
      }

      /**
       * Handle incoming messages
       * Parses SSEEvent format and updates state
       */
      eventSource.onmessage = (event) => {
        try {
          // ========== PARSE SSE EVENT ==========
          // Parse standardized SSEEvent structure
          const sseEvent: SSEEvent = JSON.parse(event.data)

          // Extract correlation ID from first event
          if (!correlationId && sseEvent.correlationId) {
            setCorrelationId(sseEvent.correlationId)
          }

          // Update stats
          setStats(prev => ({
            ...prev,
            eventsReceived: prev.eventsReceived + 1,
            bytesReceived: prev.bytesReceived + event.data.length
          }))

          // ========== HANDLE EVENT TYPES ==========
          // Process different event types
          switch (sseEvent.type) {
            case 'data':
              // New logs received
              if (Array.isArray(sseEvent.data)) {
                const newLogs = sseEvent.data as LogEntryType[]

                setLogs(prev => {
                  // Append new logs and trim to maxLogs
                  const combined = [...prev, ...newLogs]
                  return combined.slice(-maxLogs)
                })

                setLastUpdate(new Date())

                // Auto-scroll to bottom if enabled
                if (autoScroll && scrollAreaRef.current) {
                  setTimeout(() => {
                    scrollAreaRef.current?.scrollTo({
                      top: scrollAreaRef.current.scrollHeight,
                      behavior: 'smooth'
                    })
                  }, 100)
                }

                // Log receipt
                permanentLogger.breadcrumb('DATABASE', 'logs-received', {
                  count: newLogs.length,
                  correlationId: sseEvent.correlationId
                })
              }
              break

            case 'status':
              // Status update
              permanentLogger.info('real-time-logs', 'Status update', {
                status: sseEvent.data,
                correlationId: sseEvent.correlationId
              })
              break

            case 'error':
              // Error from server
              const errorData = sseEvent.data as { message: string }
              setError(errorData.message)
              permanentLogger.captureError('real-time-logs-stream', new Error(errorData.message), {
                correlationId: sseEvent.correlationId
              })
              break

            case 'complete':
              // Stream completed
              permanentLogger.info('real-time-logs', 'Stream completed', {
                data: sseEvent.data,
                correlationId: sseEvent.correlationId
              })
              break

            case 'progress':
              // Progress update (future use)
              break

            case 'warning':
              // Warning message
              const warningData = sseEvent.data as { message: string }
              permanentLogger.warn('real-time-logs', warningData.message, {
                correlationId: sseEvent.correlationId
              })
              break

            default:
              // Unknown event type
              permanentLogger.warn('real-time-logs', 'Unknown event type', {
                type: sseEvent.type,
                correlationId: sseEvent.correlationId
              })
          }
        } catch (error) {
          // ========== ERROR HANDLING ==========
          // Handle parsing errors
          permanentLogger.captureError('real-time-logs-parse', error as Error, {
            eventData: event.data
          })
          setError('Failed to parse log data')
        }
      }

      /**
       * Handle connection errors
       */
      eventSource.onerror = (event) => {
        setIsConnected(false)
        setIsConnecting(false)

        // Log error
        permanentLogger.captureError('real-time-logs-connection', new Error('SSE connection error'), {
          readyState: eventSource.readyState,
          url
        })

        // Set error message based on ready state
        if (eventSource.readyState === EventSource.CLOSED) {
          setError('Connection closed by server')
        } else {
          setError('Connection error occurred')
        }

        // Close the connection
        eventSource.close()
        eventSourceRef.current = null

        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current)
          pingIntervalRef.current = null
        }

        // Auto-reconnect after delay
        scheduleReconnect()
      }
    } catch (error) {
      // ========== CONNECTION ERROR ==========
      // Handle connection creation errors
      setIsConnecting(false)
      setError('Failed to establish connection')

      permanentLogger.captureError('real-time-logs-init', error as Error, {
        url
      })

      scheduleReconnect()
    }
  }, [levelFilter, categoryFilter, sessionId, maxLogs, autoScroll, correlationId, lastUpdate])

  /**
   * Disconnect from SSE endpoint
   * Closes EventSource and cleans up
   */
  const disconnect = useCallback(() => {
    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    // Clear ping interval
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = null
    }

    // Close EventSource
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    setIsConnected(false)
    setIsConnecting(false)

    // Log disconnection
    permanentLogger.info('real-time-logs', 'Disconnected from log stream', {
      correlationId,
      stats
    })
  }, [correlationId, stats])

  /**
   * Reconnect to SSE endpoint
   * Disconnects and reconnects
   */
  const reconnect = useCallback(() => {
    disconnect()
    setTimeout(connect, 100)
  }, [disconnect, connect])

  /**
   * Schedule automatic reconnection
   * Uses exponential backoff
   */
  const scheduleReconnect = useCallback(() => {
    // Clear existing timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    // Schedule reconnect with backoff
    const delay = Math.min(5000, 1000 * Math.pow(2, stats.eventsReceived === 0 ? 0 : 1))

    permanentLogger.info('real-time-logs', `Scheduling reconnect in ${delay}ms`)

    reconnectTimeoutRef.current = setTimeout(() => {
      connect()
    }, delay)
  }, [connect, stats.eventsReceived])

  /**
   * Clear all logs from display
   */
  const clearLogs = useCallback(() => {
    setLogs([])
    permanentLogger.info('real-time-logs', 'Logs cleared by user')
  }, [])

  // ========== LIFECYCLE MANAGEMENT ==========
  // Auto-connect on mount and cleanup on unmount
  useEffect(() => {
    connect()

    return () => {
      disconnect()
    }
  }, []) // Only on mount/unmount - eslint-disable-line react-hooks/exhaustive-deps

  // ========== RENDER ==========
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Real-Time Logs
          </CardTitle>

          <div className="flex items-center gap-2">
            {/* Connection status indicator */}
            <Badge
              variant={isConnected ? 'default' : error ? 'destructive' : 'secondary'}
              className="flex items-center gap-1"
            >
              {isConnected ? (
                <>
                  <Wifi className="w-3 h-3" />
                  Connected
                </>
              ) : isConnecting ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3" />
                  Disconnected
                </>
              )}
            </Badge>

            {/* Last update time */}
            {lastUpdate && (
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(lastUpdate, { addSuffix: true })}
              </span>
            )}

            {/* Log count */}
            <Badge variant="outline">
              {logs.length} logs
            </Badge>

            {/* Control buttons */}
            <Button
              size="sm"
              variant="outline"
              onClick={clearLogs}
              disabled={logs.length === 0}
            >
              Clear
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={isConnected ? disconnect : connect}
              disabled={isConnecting}
            >
              {isConnected ? 'Disconnect' : 'Connect'}
            </Button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-2 p-2 bg-destructive/10 text-destructive text-sm rounded">
            {error}
          </div>
        )}
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[600px]" ref={scrollAreaRef}>
          <div className="space-y-1 pr-4">
            {logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {isConnected
                  ? 'Waiting for logs...'
                  : 'Not connected. Click Connect to start streaming.'}
              </div>
            ) : (
              logs.map((log, index) => (
                <LogEntry
                  key={`${log.timestamp}-${index}`}
                  log={log}
                  index={index}
                  showData={true}
                  compact={true}
                />
              ))
            )}
          </div>
        </ScrollArea>

        {/* Statistics footer */}
        <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Events: {stats.eventsReceived}</span>
            <span>Data: {(stats.bytesReceived / 1024).toFixed(2)} KB</span>
            {correlationId && (
              <span className="font-mono">ID: {correlationId.slice(0, 8)}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}