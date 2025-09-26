/**
 * useSessionManager Hook
 * React hook for managing company intelligence research sessions
 */

import { useState, useCallback, useEffect } from 'react'
// ClientPackStore removed - table doesn't exist, using CompanyIntelligenceRepository instead
import { logger } from '../../utils/client-safe-logger'
import { eventBus } from '@/lib/notifications/event-bus'
import { EventPriority, EventSource } from '@/lib/notifications/types'
import { EventFactory } from '@/lib/realtime-events'

export interface ResearchSession {
  id: string
  user_id: string
  session_name: string
  domain: string
  scraped_data: any
  stage_reviews: any
  enrichment_data: any
  config: any
  scraper_options: any
  model_settings: any
  stage: string
  status: string
  pages_scraped: number
  duration_ms?: number
  created_at: string
  updated_at: string
  completed_at?: string
}

export interface SessionManagerState {
  currentSession: ResearchSession | null
  sessions: ResearchSession[]
  loading: boolean
  error: string | null
}

export interface UseSessionManagerReturn {
  state: SessionManagerState
  actions: {
    saveSession: (data: any) => Promise<string | null>
    loadSession: (sessionId: string) => Promise<boolean>
    updateSession: (updates: any) => Promise<boolean>
    deleteSession: (sessionId: string) => Promise<boolean>
    listSessions: (filters?: any) => Promise<void>
    createNewSession: (name: string, domain: string) => Promise<string | null>
    setCurrentSession: (session: ResearchSession | null) => void
    addLog: (log: any) => Promise<void>
  }
}

export function useSessionManager(): UseSessionManagerReturn {
  const [state, setState] = useState<SessionManagerState>({
    currentSession: null,
    sessions: [],
    loading: false,
    error: null
  })

  const [packStore] = useState(() => new ClientPackStore())

  // Load sessions on mount
  useEffect(() => {
    listSessions()
  }, [])

  /**
   * Save current research state as a session
   */
  const saveSession = useCallback(async (data: any): Promise<string | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const sessionId = await packStore.saveSession({
        sessionName: data.sessionName || `Research - ${new Date().toLocaleString()}`,
        domain: data.domain,
        scrapedData: data.scrapedData,
        stageReviews: data.stageReviews,
        enrichmentData: data.enrichmentData,
        config: data.config,
        scraperOptions: data.scraperOptions,
        modelSettings: data.modelSettings,
        stage: data.stage,
        status: data.status,
        pagesScraped: data.pagesScraped
      })

      eventBus.emit(EventFactory.notification(
        `[SESSION] Research session "${data.sessionName}" has been saved successfully.`,
        'success',
        {
          source: EventSource.CLIENT,
          metadata: {
            priority: EventPriority.NORMAL,
            persistent: true
          }
        }))

      logger.info('SESSION_MANAGER', 'Session saved', {
        sessionId,
        sessionName: data.sessionName
      })

      // Reload sessions list
      await listSessions()

      setState(prev => ({ ...prev, loading: false }))
      return sessionId
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save session'
      setState(prev => ({ ...prev, loading: false, error: message }))
      
      eventBus.emit(EventFactory.notification(
        `[SESSION] Save failed: ${message}`,
        'error',
        {
          source: EventSource.CLIENT,
          metadata: {
            priority: EventPriority.HIGH,
            persistent: true
          }
        }))

      permanentLogger.captureError('SESSION_MANAGER', new Error('Failed to save session'), { error: message })
      return null
    }
  }, [packStore, toast])

  /**
   * Load a saved session
   */
  const loadSession = useCallback(async (sessionId: string): Promise<boolean> => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const session = await packStore.loadSession(sessionId)
      
      if (!session) {
        throw new Error('Session not found')
      }

      setState(prev => ({ 
        ...prev, 
        currentSession: session,
        loading: false 
      }))

      eventBus.emit(EventFactory.notification(
        `[SESSION] Research session "${session.session_name}" has been loaded.`,
        'success',
        {
          source: EventSource.CLIENT,
          metadata: {
            priority: EventPriority.NORMAL,
            persistent: true
          }
        }))

      logger.info('SESSION_MANAGER', 'Session loaded', {
        sessionId,
        sessionName: session.session_name
      })

      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load session'
      setState(prev => ({ ...prev, loading: false, error: message }))
      
      eventBus.emit(EventFactory.notification(
        `[SESSION] Load failed: ${message}`,
        'error',
        {
          source: EventSource.CLIENT,
          metadata: {
            priority: EventPriority.HIGH,
            persistent: true
          }
        }))

      permanentLogger.captureError('SESSION_MANAGER', new Error('Failed to load session'), { error: message })
      return false
    }
  }, [packStore, toast])

  /**
   * Update current session
   */
  const updateSession = useCallback(async (updates: any): Promise<boolean> => {
    if (!state.currentSession) {
      eventBus.emit(EventFactory.notification(
        `[SESSION] No active session to update.`,
        'error',
        {
          source: EventSource.CLIENT,
          metadata: {
            priority: EventPriority.HIGH,
            persistent: true
          }
        }))
      return false
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      await packStore.updateSession(state.currentSession.id, updates)

      // Update local state
      setState(prev => ({
        ...prev,
        currentSession: prev.currentSession ? {
          ...prev.currentSession,
          ...updates,
          updated_at: new Date().toISOString()
        } : null,
        loading: false
      }))

      eventBus.emit(EventFactory.notification(
        `[SESSION] Research session has been updated.`,
        'success',
        {
          source: EventSource.CLIENT,
          metadata: {
            priority: EventPriority.NORMAL,
            persistent: true
          }
        }))

      logger.info('SESSION_MANAGER', 'Session updated', {
        sessionId: state.currentSession.id,
        updates: Object.keys(updates)
      })

      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update session'
      setState(prev => ({ ...prev, loading: false, error: message }))
      
      eventBus.emit(EventFactory.notification(
        `[SESSION] Update failed: ${message}`,
        'error',
        {
          source: EventSource.CLIENT,
          metadata: {
            priority: EventPriority.HIGH,
            persistent: true
          }
        }))

      permanentLogger.captureError('SESSION_MANAGER', new Error('Failed to update session'), { error: message })
      return false
    }
  }, [state.currentSession, packStore, toast])

  /**
   * Delete a session
   */
  const deleteSession = useCallback(async (sessionId: string): Promise<boolean> => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      await packStore.deleteSession(sessionId)

      // Clear current session if it was deleted
      setState(prev => ({
        ...prev,
        currentSession: prev.currentSession?.id === sessionId ? null : prev.currentSession,
        sessions: prev.sessions.filter(s => s.id !== sessionId),
        loading: false
      }))

      eventBus.emit(EventFactory.notification(
        `[SESSION] Research session has been deleted.`,
        'success',
        {
          source: EventSource.CLIENT,
          metadata: {
            priority: EventPriority.NORMAL,
            persistent: true
          }
        }))

      logger.info('SESSION_MANAGER', 'Session deleted', { sessionId })

      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete session'
      setState(prev => ({ ...prev, loading: false, error: message }))
      
      eventBus.emit(EventFactory.notification(
        `[SESSION] Delete failed: ${message}`,
        'error',
        {
          source: EventSource.CLIENT,
          metadata: {
            priority: EventPriority.HIGH,
            persistent: true
          }
        }))

      permanentLogger.captureError('SESSION_MANAGER', new Error('Failed to delete session'), { error: message })
      return false
    }
  }, [packStore, toast])

  /**
   * List all sessions
   */
  const listSessions = useCallback(async (filters?: {
    domain?: string
    status?: string
    limit?: number
  }): Promise<void> => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const sessions = await packStore.listSessions(filters)
      
      setState(prev => ({
        ...prev,
        sessions,
        loading: false
      }))

      logger.info('SESSION_MANAGER', 'Sessions listed', {
        count: sessions.length,
        filters
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list sessions'
      setState(prev => ({ ...prev, loading: false, error: message }))
      
      permanentLogger.captureError('SESSION_MANAGER', new Error('Failed to list sessions'), { error: message })
    }
  }, [packStore])

  /**
   * Create a new session
   */
  const createNewSession = useCallback(async (
    name: string, 
    domain: string
  ): Promise<string | null> => {
    return saveSession({
      sessionName: name,
      domain,
      stage: 'discovery',
      status: 'active',
      scrapedData: null,
      stageReviews: {},
      enrichmentData: null,
      config: {},
      scraperOptions: {},
      modelSettings: {},
      pagesScraped: 0
    })
  }, [saveSession])

  /**
   * Set current session (for UI state)
   */
  const setCurrentSession = useCallback((session: ResearchSession | null) => {
    setState(prev => ({ ...prev, currentSession: session }))
  }, [])

  /**
   * Add a log entry to current session
   */
  const addLog = useCallback(async (log: {
    level: 'debug' | 'info' | 'warn' | 'error'
    category?: string
    message: string
    metadata?: any
  }): Promise<void> => {
    if (!state.currentSession) return

    try {
      await packStore.addSessionLog(state.currentSession.id, log)
      logger.info('SESSION_MANAGER', 'Log added', {
        sessionId: state.currentSession.id,
        level: log.level,
        category: log.category
      })
    } catch (error) {
      permanentLogger.captureError('SESSION_MANAGER', 'Failed to add log', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }, [state.currentSession, packStore])

  return {
    state,
    actions: {
      saveSession,
      loadSession,
      updateSession,
      deleteSession,
      listSessions,
      createNewSession,
      setCurrentSession,
      addLog
    }
  }
}