/**
 * Realtime Event Handler for Intelligence Kanban
 * This is a thin wrapper around the unified SSE system
 * COMPLIANT WITH CLAUDE.md - Uses unified event system from @/lib/realtime-events
 */

import { useEffect, useCallback, useState, useRef } from 'react'
import { EventFactory, StreamReader, StreamWriter } from '@/lib/realtime-events'
import type { RealtimeEvent } from '@/lib/realtime-events/types'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import type { 
  CompanyIntelligenceItem,
  IntelligenceCategory 
} from '@/lib/company-intelligence/types'

/**
 * Configuration for realtime events
 */
export interface RealtimeConfig {
  endpoint: string
  sessionId: string
  domain: string
  onEvent?: (event: RealtimeEvent) => void
  onError?: (error: Error) => void
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

/**
 * Connection status for realtime events
 */
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

/**
 * Hook to manage realtime events using the unified system
 * This wraps StreamReader and StreamWriter from the unified system
 */
export function useRealtimeEvents(config: RealtimeConfig) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [error, setError] = useState<Error | null>(null)
  const [events, setEvents] = useState<RealtimeEvent[]>([])
  
  const streamReaderRef = useRef<StreamReader | null>(null)
  const streamWriterRef = useRef<StreamWriter | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()

  /**
   * Initialize connection using unified system's StreamReader
   */
  const connect = useCallback(() => {
    try {
      // Clean up existing connection
      if (streamReaderRef.current) {
        streamReaderRef.current.close()
      }

      setStatus('connecting')
      setError(null)

      // Create new StreamReader instance from unified system
      const streamReader = new StreamReader(config.endpoint)
      streamReaderRef.current = streamReader

      // Set up event listeners using unified system's event handling
      streamReader.on('event', (event: RealtimeEvent) => {
        permanentLogger.addBreadcrumb({
          message: 'Received realtime event',
          data: {
            type: event.type,
            sessionId: config.sessionId
          }
        })

        // Store event
        setEvents(prev => [...prev, event])
        
        // Call configured handler
        config.onEvent?.(event)
      })

      streamReader.on('connected', () => {
        setStatus('connected')
        reconnectAttemptsRef.current = 0
        
        permanentLogger.log('REALTIME_HANDLER', {
          action: 'connected',
          sessionId: config.sessionId,
          domain: config.domain
        })
      })

      streamReader.on('error', (error: Error) => {
        setStatus('error')
        setError(error)
        
        permanentLogger.captureError('REALTIME_HANDLER', error, {
          sessionId: config.sessionId,
          domain: config.domain
        })
        
        config.onError?.(error)
        
        // Attempt reconnection
        attemptReconnect()
      })

      streamReader.on('disconnected', () => {
        setStatus('disconnected')
        attemptReconnect()
      })

      // Start connection
      streamReader.connect()

    } catch (err) {
      const error = err as Error
      setStatus('error')
      setError(error)
      
      permanentLogger.captureError('REALTIME_HANDLER', error, {
        action: 'connect_failed',
        sessionId: config.sessionId
      })
      
      config.onError?.(error)
    }
  }, [config])

  /**
   * Attempt to reconnect with exponential backoff
   */
  const attemptReconnect = useCallback(() => {
    const maxAttempts = config.maxReconnectAttempts ?? 5
    const baseInterval = config.reconnectInterval ?? 5000
    
    if (reconnectAttemptsRef.current >= maxAttempts) {
      permanentLogger.log('REALTIME_HANDLER', {
        action: 'max_reconnect_attempts',
        attempts: reconnectAttemptsRef.current
      })
      return
    }
    
    // Clear existing timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    
    // Calculate delay with exponential backoff
    const delay = Math.min(
      baseInterval * Math.pow(2, reconnectAttemptsRef.current),
      30000 // Max 30 seconds
    )
    
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current++
      connect()
    }, delay)
  }, [config, connect])

  /**
   * Send event using unified system's StreamWriter
   */
  const sendEvent = useCallback(async (event: Partial<RealtimeEvent>) => {
    try {
      if (!streamWriterRef.current) {
        streamWriterRef.current = new StreamWriter(config.endpoint)
      }

      // Use EventFactory from unified system to create proper event
      const fullEvent = EventFactory.create({
        ...event,
        sessionId: config.sessionId,
        timestamp: new Date().toISOString()
      })

      await streamWriterRef.current.send(fullEvent)
      
      permanentLogger.addBreadcrumb({
        message: 'Sent realtime event',
        data: {
          type: event.type,
          sessionId: config.sessionId
        }
      })
    } catch (err) {
      const error = err as Error
      permanentLogger.captureError('REALTIME_HANDLER', error, {
        action: 'send_event_failed',
        eventType: event.type
      })
      throw error
    }
  }, [config])

  /**
   * Disconnect and cleanup
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    
    if (streamReaderRef.current) {
      streamReaderRef.current.close()
      streamReaderRef.current = null
    }
    
    if (streamWriterRef.current) {
      streamWriterRef.current.close()
      streamWriterRef.current = null
    }
    
    setStatus('disconnected')
    
    permanentLogger.log('REALTIME_HANDLER', {
      action: 'disconnected',
      sessionId: config.sessionId
    })
  }, [config])

  /**
   * Clear stored events
   */
  const clearEvents = useCallback(() => {
    setEvents([])
  }, [])

  /**
   * Set up connection on mount
   */
  useEffect(() => {
    connect()
    
    return () => {
      disconnect()
    }
  }, []) // Only run on mount/unmount

  return {
    status,
    error,
    events,
    connect,
    disconnect,
    sendEvent,
    clearEvents,
    isConnected: status === 'connected',
    isConnecting: status === 'connecting',
    hasError: status === 'error'
  }
}

/**
 * Helper function to create intelligence-specific events
 * These use the unified event system's types and factory
 */
export const IntelligenceEventHelpers = {
  /**
   * Create item created event
   */
  itemCreated: (item: CompanyIntelligenceItem, sessionId: string): RealtimeEvent => {
    return EventFactory.create({
      type: 'intelligence:item_created',
      sessionId,
      data: { item },
      timestamp: new Date().toISOString()
    })
  },

  /**
   * Create item updated event
   */
  itemUpdated: (item: CompanyIntelligenceItem, sessionId: string): RealtimeEvent => {
    return EventFactory.create({
      type: 'intelligence:item_updated',
      sessionId,
      data: { item },
      timestamp: new Date().toISOString()
    })
  },

  /**
   * Create item deleted event
   */
  itemDeleted: (itemId: string, sessionId: string): RealtimeEvent => {
    return EventFactory.create({
      type: 'intelligence:item_deleted',
      sessionId,
      data: { itemId },
      timestamp: new Date().toISOString()
    })
  },

  /**
   * Create category updated event
   */
  categoryUpdated: (
    category: IntelligenceCategory, 
    items: CompanyIntelligenceItem[],
    sessionId: string
  ): RealtimeEvent => {
    return EventFactory.create({
      type: 'intelligence:category_updated',
      sessionId,
      data: { category, items },
      timestamp: new Date().toISOString()
    })
  },

  /**
   * Create batch created event
   */
  batchCreated: (items: CompanyIntelligenceItem[], sessionId: string): RealtimeEvent => {
    return EventFactory.create({
      type: 'intelligence:batch_created',
      sessionId,
      data: { items },
      timestamp: new Date().toISOString()
    })
  },

  /**
   * Create enrichment completed event
   */
  enrichmentCompleted: (
    itemId: string, 
    enrichmentData: any,
    sessionId: string
  ): RealtimeEvent => {
    return EventFactory.create({
      type: 'intelligence:enrichment_completed',
      sessionId,
      data: { itemId, enrichmentData },
      timestamp: new Date().toISOString()
    })
  },

  /**
   * Create scraping complete event
   */
  scrapingComplete: (domain: string, sessionId: string): RealtimeEvent => {
    return EventFactory.create({
      type: 'intelligence:scraping_complete',
      sessionId,
      data: { domain },
      timestamp: new Date().toISOString()
    })
  }
}
