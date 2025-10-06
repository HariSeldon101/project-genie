// hooks/use-sse.ts
/**
 * Unified SSE Hook
 * Integrates with the unified realtime-events system
 * Uses StreamReader for robust connection handling
 * 
 * @version 2.0.0
 * CLAUDE.md COMPLIANT
 */

import { useEffect, useState, useRef, useCallback } from 'react'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { 
  StreamReader,
  type StreamReaderOptions,
  type RealtimeEvent,
  EventType,
  IntelligenceEventType,
  isProgressEvent,
  isErrorEvent,
  isNotificationEvent,
  isIntelligenceEvent,
  isSessionEvent,
  isCategoryEvent,
  type ProgressInfo,
  type ErrorData,
  type NotificationData,
  type SessionCreatedData,
  type SessionCompleteData,
  type CategoryExtractedData
} from '@/lib/realtime-events'

/**
 * Connection states for the SSE stream
 */
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error'

/**
 * Options for the useSSE hook
 */
export interface UseSSEOptions {
  // Connection options
  url: string
  sessionId?: string
  correlationId?: string
  
  // Reconnection options
  reconnect?: boolean
  maxReconnectAttempts?: number
  reconnectDelay?: number
  
  // Event filtering
  eventTypes?: (EventType | IntelligenceEventType)[]
  
  // Callbacks
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Error) => void
  
  // Auto-connect on mount
  autoConnect?: boolean
  
  // Buffer size for storing events
  maxEvents?: number
}

/**
 * Hook state interface
 */
export interface UseSSEState {
  // All events received
  events: RealtimeEvent[]
  
  // Connection state
  connectionState: ConnectionState
  
  // Last error if any
  error: Error | null
  
  // Progress information if available
  progress: ProgressInfo | null
  
  // Session information for intelligence operations
  sessionInfo: SessionCreatedData | null
  
  // Completion data if session finished
  completionInfo: SessionCompleteData | null
  
  // Categories extracted (for intelligence)
  categories: Map<string, CategoryExtractedData>
}

/**
 * React hook for Server-Sent Events
 * Integrates with the unified realtime-events system
 */
export function useSSE(options: UseSSEOptions) {
  const {
    url,
    sessionId,
    correlationId,
    reconnect = true,
    maxReconnectAttempts = 10,
    reconnectDelay = 1000,
    eventTypes,
    onConnect,
    onDisconnect,
    onError,
    autoConnect = true,
    maxEvents = 100
  } = options

  // State management
  const [state, setState] = useState<UseSSEState>({
    events: [],
    connectionState: 'disconnected',
    error: null,
    progress: null,
    sessionInfo: null,
    completionInfo: null,
    categories: new Map()
  })

  // Refs for managing the stream reader
  const readerRef = useRef<StreamReader | null>(null)
  const mountedRef = useRef(true)

  /**
   * Handle incoming events from StreamReader
   */
  const handleEvent = useCallback((event: RealtimeEvent) => {
    // Filter by event type if specified
    if (eventTypes && eventTypes.length > 0) {
      if (!eventTypes.includes(event.type as any)) {
        return
      }
    }

    permanentLogger.breadcrumb('USE_SSE', 'Event received', {
      eventId: event.id,
      eventType: event.type,
      sessionId: event.metadata?.sessionId || sessionId
    })

    setState(prev => {
      const newState = { ...prev }
      
      // Add event to list (with max limit)
      newState.events = [...prev.events, event].slice(-maxEvents)
      
      // Update progress if it's a progress event
      if (isProgressEvent(event)) {
        newState.progress = event.data
      }
      
      // Handle intelligence events
      if (isIntelligenceEvent(event)) {
        // Session created
        if (event.type === IntelligenceEventType.SESSION_CREATED) {
          newState.sessionInfo = event.data as SessionCreatedData
        }
        
        // Session completed
        if (event.type === IntelligenceEventType.SESSION_COMPLETED) {
          newState.completionInfo = event.data as SessionCompleteData
          newState.connectionState = 'disconnected'
        }
        
        // Category extracted
        if (isCategoryEvent(event)) {
          const catData = event.data as CategoryExtractedData
          newState.categories = new Map(prev.categories)
          newState.categories.set(catData.category, catData)
        }
      }
      
      // Handle error events
      if (isErrorEvent(event)) {
        const errorData = event.data as ErrorData
        newState.error = new Error(errorData.message)
        if (!errorData.retriable) {
          newState.connectionState = 'error'
        }
      }
      
      return newState
    })
  }, [eventTypes, maxEvents, sessionId])

  /**
   * Handle connection established
   */
  const handleConnect = useCallback(() => {
    permanentLogger.info('USE_SSE', 'SSE connection established', {
      url,
      sessionId
    })
    
    setState(prev => ({
      ...prev,
      connectionState: 'connected',
      error: null
    }))
    
    onConnect?.()
  }, [url, sessionId, onConnect])

  /**
   * Handle connection closed
   */
  const handleDisconnect = useCallback(() => {
    permanentLogger.info('USE_SSE', 'SSE connection closed', {
      url,
      sessionId
    })
    
    setState(prev => ({
      ...prev,
      connectionState: 'disconnected'
    }))
    
    onDisconnect?.()
  }, [url, sessionId, onDisconnect])

  /**
   * Handle connection error
   */
  const handleError = useCallback((error: Error) => {
    permanentLogger.captureError('USE_SSE', error, {
      url,
      sessionId
    })
    
    setState(prev => ({
      ...prev,
      connectionState: 'error',
      error
    }))
    
    onError?.(error)
  }, [url, sessionId, onError])

  /**
   * Connect to SSE stream
   */
  const connect = useCallback(async () => {
    if (readerRef.current?.isConnected()) {
      permanentLogger.warn('USE_SSE', 'Already connected', { sessionId })
      return
    }

    setState(prev => ({
      ...prev,
      connectionState: 'connecting',
      error: null
    }))

    try {
      // Create StreamReader with options
      const readerOptions: StreamReaderOptions = {
        url,
        sessionId,
        correlationId,
        onEvent: handleEvent,
        onConnect: handleConnect,
        onDisconnect: handleDisconnect,
        onError: handleError,
        reconnect,
        reconnectOptions: {
          maxAttempts: maxReconnectAttempts,
          initialDelay: reconnectDelay
        }
      }

      const reader = new StreamReader(readerOptions)
      readerRef.current = reader
      
      // Connect to stream
      await reader.connect()
      
    } catch (error) {
      const jsError = error instanceof Error ? error : new Error(String(error))
      handleError(jsError)
    }
  }, [
    url,
    sessionId,
    correlationId,
    handleEvent,
    handleConnect,
    handleDisconnect,
    handleError,
    reconnect,
    maxReconnectAttempts,
    reconnectDelay
  ])

  /**
   * Disconnect from SSE stream
   */
  const disconnect = useCallback(() => {
    permanentLogger.info('USE_SSE', 'Manually disconnecting', { sessionId })
    
    if (readerRef.current) {
      readerRef.current.disconnect()
      readerRef.current = null
    }
    
    setState(prev => ({
      ...prev,
      connectionState: 'disconnected'
    }))
  }, [sessionId])

  /**
   * Clear all stored events
   */
  const clearEvents = useCallback(() => {
    permanentLogger.debug('USE_SSE', 'Clearing events', {
      count: state.events.length,
      sessionId
    })
    
    setState(prev => ({
      ...prev,
      events: [],
      progress: null,
      categories: new Map()
    }))
  }, [state.events.length, sessionId])

  /**
   * Get events by type
   */
  const getEventsByType = useCallback((type: EventType | IntelligenceEventType): RealtimeEvent[] => {
    return state.events.filter(event => event.type === type)
  }, [state.events])

  /**
   * Get the latest event of a specific type
   */
  const getLatestEventByType = useCallback((type: EventType | IntelligenceEventType): RealtimeEvent | null => {
    const events = getEventsByType(type)
    return events.length > 0 ? events[events.length - 1] : null
  }, [getEventsByType])

  /**
   * Effect for auto-connect and cleanup
   */
  useEffect(() => {
    mountedRef.current = true

    if (autoConnect && !readerRef.current) {
      connect()
    }

    return () => {
      mountedRef.current = false
      
      if (readerRef.current) {
        permanentLogger.info('USE_SSE', 'Cleaning up SSE connection', {
          sessionId
        })
        readerRef.current.disconnect()
        readerRef.current = null
      }
    }
  }, []) // Only run on mount/unmount

  /**
   * Effect for handling URL or session changes
   */
  useEffect(() => {
    if (!autoConnect) return

    // Reconnect if URL or session changes
    if (readerRef.current) {
      disconnect()
      setTimeout(() => {
        if (mountedRef.current) {
          connect()
        }
      }, 100)
    }
  }, [url, sessionId]) // Re-run when these change

  return {
    // State
    ...state,
    
    // Computed properties
    isConnected: state.connectionState === 'connected',
    isConnecting: state.connectionState === 'connecting',
    hasError: state.error !== null,
    
    // Actions
    connect,
    disconnect,
    clearEvents,
    
    // Utilities
    getEventsByType,
    getLatestEventByType,
    
    // Progress helpers
    progressPercentage: state.progress?.percentage || 0,
    progressMessage: state.progress?.message || '',
    
    // Intelligence helpers
    isSessionActive: state.sessionInfo !== null && state.completionInfo === null,
    extractedCategories: Array.from(state.categories.values()),
    totalItemsExtracted: Array.from(state.categories.values())
      .reduce((sum, cat) => sum + cat.itemsCount, 0)
  }
}

/**
 * Convenience hook for intelligence operations
 */
export function useIntelligenceSSE(
  sessionId: string,
  options?: Partial<UseSSEOptions>
) {
  return useSSE({
    url: `/api/intelligence/stream/${sessionId}`,
    sessionId,
    reconnect: true,
    maxReconnectAttempts: 5,
    eventTypes: [
      // Include all intelligence events
      IntelligenceEventType.SESSION_CREATED,
      IntelligenceEventType.SESSION_COMPLETED,
      IntelligenceEventType.SESSION_FAILED,
      IntelligenceEventType.PHASE_DISCOVERY,
      IntelligenceEventType.PHASE_SCRAPING,
      IntelligenceEventType.PHASE_PROCESSING,
      IntelligenceEventType.CATEGORY_EXTRACTED,
      IntelligenceEventType.PAGE_SCRAPED,
      IntelligenceEventType.CREDITS_INSUFFICIENT,
      // Include progress events
      EventType.PROGRESS,
      EventType.ERROR
    ],
    ...options
  })
}

// Export types for external use
export type {
  RealtimeEvent,
  ProgressInfo,
  ErrorData,
  NotificationData,
  SessionCreatedData,
  SessionCompleteData,
  CategoryExtractedData
}
