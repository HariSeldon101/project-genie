/**
 * Unified Progress Reporter
 *
 * Uses the unified EventFactory from /lib/realtime-events to send
 * progress updates via Server-Sent Events (SSE).
 *
 * Features:
 * - Automatic reconnection handling
 * - Deduplication of events within 2-second window
 * - Memory-safe streaming
 * - Correlation ID tracking for event chains
 *
 * @module utils/progress-reporter
 */

import { EventFactory, StreamWriter } from '@/lib/realtime-events'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { safeTimestampToISO } from '@/lib/utils/safe-timestamp'

export interface ProgressData {
  current: number
  total: number
  message: string
  scraperId?: string
  url?: string
  phase?: string
  metadata?: Record<string, any>
}

export interface ProgressReporterOptions {
  sessionId: string
  correlationId: string
  signal?: AbortSignal
  dedupeWindow?: number // milliseconds for deduplication
}

/**
 * Handles progress reporting for scraping operations
 * Sends SSE events using the unified event system
 */
export class ProgressReporter {
  private writer: StreamWriter
  private sessionId: string
  private correlationId: string
  private lastEventHash: string = ''
  private lastEventTime: number = 0
  private dedupeWindow: number
  private eventCount: number = 0

  constructor(options: ProgressReporterOptions) {
    this.sessionId = options.sessionId
    this.correlationId = options.correlationId
    this.dedupeWindow = options.dedupeWindow || 2000 // 2 second dedupe window by default

    // Initialize StreamWriter with proper signal handling for abort support
    this.writer = new StreamWriter(
      this.sessionId,
      this.correlationId,
      options.signal
    )

    // Log initialization at interface boundary
    permanentLogger.breadcrumb('progress_reporter_init', 'ProgressReporter initialized', {
      sessionId: this.sessionId,
      correlationId: this.correlationId,
      timestamp: safeTimestampToISO(Date.now())
    })
  }

  /**
   * Report progress update to the client
   * Deduplicates events within the configured time window to prevent spam
   */
  async report(data: ProgressData): Promise<void> {
    // Start timing for this operation
    const timer = permanentLogger.timing('progress_report')

    try {
      // Create hash for deduplication check
      const eventHash = this.createEventHash(data)
      const now = Date.now()

      // Check for duplicate event within dedupe window
      if (eventHash === this.lastEventHash &&
          (now - this.lastEventTime) < this.dedupeWindow) {
        permanentLogger.debug('PROGRESS_REPORTER', 'Duplicate event skipped', {
          eventHash,
          timeSinceLastEvent: now - this.lastEventTime
        })
        return
      }

      // Create progress event using unified EventFactory (CRITICAL - no custom events!)
      const event = EventFactory.progress(
        data.current,
        data.total,
        data.message,
        {
          scraperId: data.scraperId,
          url: data.url,
          phase: data.phase,
          sessionId: this.sessionId,
          correlationId: this.correlationId,
          eventNumber: ++this.eventCount,
          ...data.metadata
        }
      )

      // Send via StreamWriter for proper SSE handling
      await this.writer.sendEvent(event)

      // Update deduplication tracking
      this.lastEventHash = eventHash
      this.lastEventTime = now

      // Breadcrumb at interface boundary
      permanentLogger.breadcrumb('progress_sent', 'Progress event sent', {
        current: data.current,
        total: data.total,
        scraperId: data.scraperId,
        eventNumber: this.eventCount
      })

    } catch (error) {
      // Proper error handling - no silent failures!
      permanentLogger.captureError('PROGRESS_REPORTER', error as Error, {
        data,
        sessionId: this.sessionId,
        correlationId: this.correlationId
      })
      // Don't throw - progress reporting shouldn't break scraping
      // But log the error so it's visible
    } finally {
      timer.stop()
    }
  }

  /**
   * Report completion with summary data
   * Sends a data event to indicate the operation is complete
   */
  async complete(summary: Record<string, any>): Promise<void> {
    try {
      // Use unified EventFactory for completion event
      const event = EventFactory.data(
        { type: 'completion', summary },
        {
          sessionId: this.sessionId,
          correlationId: this.correlationId,
          timestamp: safeTimestampToISO(Date.now())
        }
      )

      await this.writer.sendEvent(event)

      permanentLogger.info('PROGRESS_REPORTER', 'Completion event sent', {
        sessionId: this.sessionId,
        totalEvents: this.eventCount
      })
    } catch (error) {
      // Never silent failures - always log errors
      permanentLogger.captureError('PROGRESS_REPORTER', error as Error, {
        summary,
        sessionId: this.sessionId
      })
    }
  }

  /**
   * Report error to the client
   * Uses unified EventFactory error event
   */
  async error(error: Error, context: Record<string, any>): Promise<void> {
    try {
      // Use unified EventFactory for error event
      const event = EventFactory.error(error, {
        ...context,
        sessionId: this.sessionId,
        correlationId: this.correlationId
      })

      await this.writer.sendEvent(event)

    } catch (sendError) {
      // Log error sending error - no silent failures
      permanentLogger.captureError('PROGRESS_REPORTER', sendError as Error, {
        originalError: error.message,
        context
      })
    }
  }

  /**
   * Close the stream writer and clean up resources
   */
  close(): void {
    this.writer.close()
    permanentLogger.info('PROGRESS_REPORTER', 'Reporter closed', {
      sessionId: this.sessionId,
      totalEvents: this.eventCount
    })
  }

  /**
   * Create hash for event deduplication
   * Combines key fields to detect duplicate events
   */
  private createEventHash(data: ProgressData): string {
    return `${data.current}_${data.total}_${data.message}_${data.scraperId || ''}`
  }
}