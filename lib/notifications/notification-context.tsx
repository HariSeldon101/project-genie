'use client'

/**
 * React Context for Enterprise Notification System
 * Provides global notification state management with useReducer
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { eventBus, emitNotification } from './event-bus'
// Use unified EventFactory from realtime-events
import { EventFactory } from '@/lib/realtime-events'
import {
  NotificationState,
  NotificationAction,
  NotificationEvent,
  PhaseEvent,
  Event,
  EventPriority,
  EventSource,
  NotificationType
} from './types'

/**
 * Initial state for notifications
 */
const initialState: NotificationState = {
  notifications: [],
  phases: new Map(),
  queueStats: {
    size: 0,
    processing: false,
    eventsProcessed: 0,
    averageProcessingTime: 0,
    errors: 0
  },
  isConnected: true
}

/**
 * Reducer for notification state management
 */
function notificationReducer(
  state: NotificationState,
  action: NotificationAction
): NotificationState {
  switch (action.type) {
    case 'ADD_NOTIFICATION': {
      // Silently skip malformed events (already logged upstream)
      if (!action.payload?.data) {
        return state // Don't update state with malformed data
      }

      // Check for duplicates within 2 seconds
      const twoSecondsAgo = Date.now() - 2000
      const isDuplicate = state.notifications.some(n =>
        n.data?.message === action.payload.data.message &&
        n.timestamp > twoSecondsAgo
      )

      if (isDuplicate) {
        permanentLogger.info('NOTIFICATION_CONTEXT', 'Duplicate notification blocked', {
          message: action.payload.data.message
        })
        return state
      }

      // Add new notification to beginning (newest first)
      return {
        ...state,
        notifications: [action.payload, ...state.notifications].slice(0, 100) // Keep max 100
      }
    }

    case 'REMOVE_NOTIFICATION': {
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      }
    }

    case 'CLEAR_NOTIFICATIONS': {
      return {
        ...state,
        notifications: []
      }
    }

    case 'UPDATE_PHASE': {
      const newPhases = new Map(state.phases)

      // Silently skip malformed events (already logged upstream)
      if (!action.payload?.data?.phase) {
        return state // Don't update state with malformed data
      }

      newPhases.set(action.payload.data.phase, action.payload)
      return {
        ...state,
        phases: newPhases
      }
    }

    case 'UPDATE_QUEUE_STATS': {
      return {
        ...state,
        queueStats: {
          ...state.queueStats,
          ...action.payload
        }
      }
    }

    case 'SET_CONNECTION_STATUS': {
      return {
        ...state,
        isConnected: action.payload
      }
    }

    case 'BATCH_ADD_NOTIFICATIONS': {
      // Add multiple notifications at once (for initial load)
      const newNotifications = [...action.payload, ...state.notifications]
      return {
        ...state,
        notifications: newNotifications.slice(0, 100)
      }
    }

    default:
      return state
  }
}

/**
 * Context type definition
 */
interface NotificationContextType {
  state: NotificationState
  
  // Core notification methods
  addNotification: (message: string, type?: NotificationType, options?: {
    persistent?: boolean
    priority?: EventPriority
    correlationId?: string
  }) => void
  
  removeNotification: (id: string) => void
  clearNotifications: () => void
  
  // Phase management
  startPhase: (phase: string, message?: string) => void
  completePhase: (phase: string, message?: string) => void
  failPhase: (phase: string, message?: string) => void
  
  // Connection status
  setConnectionStatus: (connected: boolean) => void
  
  // Statistics
  getQueueStats: () => NotificationState['queueStats']
}

/**
 * Create the context
 */
const NotificationContext = createContext<NotificationContextType | null>(null)

/**
 * Notification Provider Component
 */
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(notificationReducer, initialState)

  /**
   * Subscribe to event bus on mount
   */
  useEffect(() => {
    permanentLogger.info('NOTIFICATION_CONTEXT', 'Subscribing to event bus')

    // Subscribe to notification events (including all notification subtypes)
    const notificationSub = eventBus.subscribe((event: Event) => {
      // Check if it's any notification type
      if (event.type.startsWith('notification')) {
        // Ensure event has proper data structure
        if (!event.data) {
          permanentLogger.warn('NOTIFICATION_CONTEXT', 'Skipping malformed notification event', {
            eventType: event.type,
            eventId: event.id
          })
          return
        }
        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: event as NotificationEvent
        })
      }
    }, {
      types: [
        'notification',
        'notification.success',
        'notification.warning',
        'notification.error',
        'notification.info'
      ]
    })

    // Subscribe to phase events (including all phase subtypes)
    const phaseSub = eventBus.subscribe((event: Event) => {
      // Check if it's any phase type
      if (event.type.startsWith('phase')) {
        // Ensure event has proper data structure
        if (!event.data) {
          permanentLogger.warn('NOTIFICATION_CONTEXT', 'Skipping malformed phase event', {
            eventType: event.type,
            eventId: event.id
          })
          return
        }

        const phaseEvent = event as PhaseEvent
        dispatch({
          type: 'UPDATE_PHASE',
          payload: phaseEvent
        })

        // Only create a notification if there's an explicit message
        // This prevents duplicate notifications for phase transitions
        if (phaseEvent.data?.message) {
          const phaseLabel = phaseEvent.data.phase.toUpperCase().replace('-', '_')
          let message = phaseEvent.data.message

          if (phaseEvent.data.previousPhase) {
            const prevLabel = phaseEvent.data.previousPhase.toUpperCase().replace('-', '_')
            message = `[${prevLabel} → ${phaseLabel}] ${message}`
          } else {
            message = `[${phaseLabel}] ${message}`
          }

          dispatch({
            type: 'ADD_NOTIFICATION',
            payload: {
              id: `phase_notif_${event.id}`,
              type: 'notification',
              source: event.source,
              timestamp: event.timestamp,
              correlationId: event.correlationId,
              data: {
                message,
                notificationType: phaseEvent.data.status === 'failed' ? 'error' :
                                 phaseEvent.data.status === 'completed' ? 'success' : 'info',
                persistent: true
              },
              metadata: {
                priority: event.metadata?.priority || EventPriority.NORMAL
              }
            }
          })
        }
      }
    }, {
      types: [
        'phase.start',
        'phase.complete',
        'phase.error'
      ]
    })

    // Update queue stats periodically
    const statsInterval = setInterval(() => {
      const stats = eventBus.getStats()
      dispatch({ 
        type: 'UPDATE_QUEUE_STATS', 
        payload: stats 
      })
    }, 1000)

    // Cleanup on unmount
    return () => {
      permanentLogger.info('NOTIFICATION_CONTEXT', 'Unsubscribing from event bus')
      eventBus.unsubscribe(notificationSub)
      eventBus.unsubscribe(phaseSub)
      clearInterval(statsInterval)
    }
  }, [])

  /**
   * Add a notification
   */
  const addNotification = useCallback((
    message: string,
    type: NotificationType = 'info',
    options?: {
      persistent?: boolean
      priority?: EventPriority
      correlationId?: string
    }
  ) => {
    emitNotification(message, type, {
      ...options,
      source: EventSource.CLIENT
    })
  }, [])

  /**
   * Remove a notification
   */
  const removeNotification = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id })
  }, [])

  /**
   * Clear all notifications
   */
  const clearNotifications = useCallback(() => {
    dispatch({ type: 'CLEAR_NOTIFICATIONS' })
    permanentLogger.info('NOTIFICATION_CONTEXT', 'All notifications cleared')
  }, [])

  /**
   * Start a phase
   */
  const startPhase = useCallback((phase: string, message?: string) => {
    // Use EventFactory to create properly structured phase event
    eventBus.emit(EventFactory.phase(phase, 'started', {
      message,
      source: EventSource.CLIENT,
      metadata: {
        priority: EventPriority.HIGH
      }
    }))
  }, [])

  /**
   * Complete a phase
   */
  const completePhase = useCallback((phase: string, message?: string) => {
    // Use EventFactory to create properly structured phase event
    eventBus.emit(EventFactory.phase(phase, 'completed', {
      message,
      source: EventSource.CLIENT,
      metadata: {
        priority: EventPriority.HIGH
      }
    }))
  }, [])

  /**
   * Fail a phase
   */
  const failPhase = useCallback((phase: string, message?: string) => {
    // Use EventFactory to create properly structured phase event
    eventBus.emit(EventFactory.phase(phase, 'failed', {
      message,
      source: EventSource.CLIENT,
      metadata: {
        priority: EventPriority.CRITICAL
      }
    }))
  }, [])

  /**
   * Set connection status
   */
  const setConnectionStatus = useCallback((connected: boolean) => {
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: connected })
    
    if (!connected) {
      addNotification('Connection lost. Attempting to reconnect...', 'warning', {
        priority: EventPriority.HIGH
      })
    } else {
      addNotification('Connection restored', 'success', {
        priority: EventPriority.NORMAL
      })
    }
  }, [addNotification])

  /**
   * Get queue statistics
   */
  const getQueueStats = useCallback(() => {
    return state.queueStats
  }, [state.queueStats])

  /**
   * Memoized context value
   */
  const contextValue = useMemo<NotificationContextType>(() => ({
    state,
    addNotification,
    removeNotification,
    clearNotifications,
    startPhase,
    completePhase,
    failPhase,
    setConnectionStatus,
    getQueueStats
  }), [
    state,
    addNotification,
    removeNotification,
    clearNotifications,
    startPhase,
    completePhase,
    failPhase,
    setConnectionStatus,
    getQueueStats
  ])

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  )
}

/**
 * Custom hook to use notification context
 */
export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider')
  }
  return context
}

/**
 * Custom hook for phase-specific notifications
 */
export function usePhaseNotifications(phaseName: string) {
  const { startPhase, completePhase, failPhase, state } = useNotifications()
  
  const currentPhase = state.phases.get(phaseName)
  
  return {
    start: useCallback((message?: string) => startPhase(phaseName, message), [phaseName, startPhase]),
    complete: useCallback((message?: string) => completePhase(phaseName, message), [phaseName, completePhase]),
    fail: useCallback((message?: string) => failPhase(phaseName, message), [phaseName, failPhase]),
    status: currentPhase?.data.status,
    progress: currentPhase?.data.progress
  }
}

/**
 * Custom hook for connection status
 */
export function useConnectionStatus() {
  const { state, setConnectionStatus } = useNotifications()
  return {
    isConnected: state.isConnected,
    setConnectionStatus
  }
}