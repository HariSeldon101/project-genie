/**
 * Progress Manager for Company Intelligence
 * Manages real-time progress events for SSE streaming
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'

export interface ProgressEvent {
  type: 'discovery_start' | 'discovery_sitemap' | 'discovery_crawl' | 'discovery_complete' |
        'scraping_start' | 'scraping_page' | 'scraping_complete' | 'scraping_progress' | 'error' | 'log'
  timestamp: number
  data: any
}

export interface ProgressSession {
  sessionId: string
  events: ProgressEvent[]
  startTime: number
  lastEventTime: number
  isActive: boolean
}

// Global store for active progress sessions
export const progressSessions = new Map<string, ProgressSession>()

// Create or get a progress session
export function createProgressSession(sessionId: string): ProgressSession {
  const existing = progressSessions.get(sessionId)
  if (existing) {
    return existing
  }
  
  const session: ProgressSession = {
    sessionId,
    events: [],
    startTime: Date.now(),
    lastEventTime: Date.now(),
    isActive: true
  }
  
  progressSessions.set(sessionId, session)
  
  // Auto-cleanup after 5 minutes
  setTimeout(() => {
    progressSessions.delete(sessionId)
    permanentLogger.info('PROGRESS', `Cleaned up session ${sessionId}`)
  }, 5 * 60 * 1000)
  
  return session
}

// Add event to session
export function addProgressEvent(sessionId: string, type: ProgressEvent['type'], data: any) {
  if (!sessionId) {
    permanentLogger.warn('PROGRESS', 'No sessionId provided for progress event')
    return
  }
  
  let session = progressSessions.get(sessionId)
  if (!session) {
    permanentLogger.info('PROGRESS', `Creating new session for ${sessionId}`)
    session = createProgressSession(sessionId)
  }
  
  const event: ProgressEvent = {
    type,
    timestamp: Date.now(),
    data
  }
  
  session.events.push(event)
  session.lastEventTime = Date.now()
  
  permanentLogger.info('PROGRESS', `Added event to session ${sessionId}`, { 
    type, 
    data,
    totalEvents: session.events.length 
  })
}

// End a session
export function endProgressSession(sessionId: string) {
  const session = progressSessions.get(sessionId)
  if (session) {
    session.isActive = false
    permanentLogger.info('PROGRESS', `Ended session ${sessionId}`)
  }
}

// Get session events
export function getSessionEvents(sessionId: string): ProgressEvent[] {
  const session = progressSessions.get(sessionId)
  return session?.events || []
}

// Check if session is active
export function isSessionActive(sessionId: string): boolean {
  const session = progressSessions.get(sessionId)
  return session?.isActive || false
}