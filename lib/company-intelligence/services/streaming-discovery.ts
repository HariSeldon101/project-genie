/**
 * StreamingDiscoveryService
 *
 * Service responsible for streaming discovery updates in real-time.
 * Uses the unified event system from /lib/realtime-events for consistent
 * event handling across the application.
 *
 * @module company-intelligence/services
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { EventFactory } from '@/lib/realtime-events'
import type { RealtimeEvent } from '@/lib/realtime-events/core/event-types'

/**
 * Discovery phase information
 */
export interface DiscoveryPhase {
  id: string
  name: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  progress?: number
  total?: number
  error?: string
}

/**
 * Options for streaming discovery
 */
export interface StreamingOptions {
  correlationId?: string
  sessionId?: string
  signal?: AbortSignal
}

/**
 * Service for streaming discovery events
 * Provides real-time updates during the discovery process
 */
export class StreamingDiscoveryService {
  private correlationId: string
  private sessionId?: string
  private signal?: AbortSignal
  private phases: Map<string, DiscoveryPhase>
  private encoder: TextEncoder

  constructor(options: StreamingOptions = {}) {
    this.correlationId = options.correlationId || this.generateCorrelationId()
    this.sessionId = options.sessionId
    this.signal = options.signal
    this.phases = new Map()
    this.encoder = new TextEncoder()

    this.initializePhases()
  }

  /**
   * Initialize discovery phases
   */
  private initializePhases() {
    const phases: DiscoveryPhase[] = [
      {
        id: 'sitemap',
        name: 'Sitemap Discovery',
        description: 'Looking for sitemap.xml and robots.txt',
        status: 'pending'
      },
      {
        id: 'homepage',
        name: 'Homepage Crawl',
        description: 'Extracting links from homepage navigation and footer',
        status: 'pending'
      },
      {
        id: 'patterns',
        name: 'Pattern Discovery',
        description: 'Checking common URL patterns for hidden pages',
        status: 'pending'
      },
      {
        id: 'blog',
        name: 'Blog Discovery',
        description: 'Discovering blog articles and resource pages',
        status: 'pending'
      },
      {
        id: 'validation',
        name: 'URL Validation',
        description: 'Validating and deduplicating discovered pages',
        status: 'pending'
      }
    ]

    for (const phase of phases) {
      this.phases.set(phase.id, phase)
    }
  }

  /**
   * Create a streaming response
   */
  createStream(
    discoveryFunction: (writer: StreamWriter) => Promise<void>
  ): ReadableStream {
    const writer = new StreamWriter(this)

    return new ReadableStream({
      async start(controller) {
        try {
          // Set the controller on the writer
          writer.setController(controller)

          // Send initial connection event
          writer.sendToController(controller, EventFactory.connection({
            correlationId: writer.service.correlationId,
            sessionId: writer.service.sessionId
          }))

          // Execute discovery with streaming updates
          await discoveryFunction(writer)

          // The discovery orchestrator already sends discovery-complete with pages
          // No additional complete event needed here

        } catch (error) {
          // Send error event
          writer.sendToController(controller, EventFactory.error(error as Error, {
            correlationId: writer.service.correlationId
          }))
        } finally {
          controller.close()
        }
      }
    })
  }

  /**
   * Send phase start event
   */
  sendPhaseStart(phaseId: string, controller: ReadableStreamDefaultController) {
    const phase = this.phases.get(phaseId)
    if (!phase) {
      permanentLogger.warn('STREAMING_DISCOVERY', 'Phase not found', { phaseId })
      return
    }

    phase.status = 'in_progress'

    // Send a simple phase-start event that frontend expects
    const event = {
      type: 'phase-start',
      phase: phaseId,
      phaseName: phase.name,
      description: phase.description,
      correlationId: this.correlationId,
      timestamp: Date.now()
    }

    this.sendRawEvent(controller, event)

    permanentLogger.info('STREAMING_DISCOVERY', 'Phase started', {
      phaseId,
      phaseName: phase.name,
      correlationId: this.correlationId
    })
  }

  /**
   * Send phase progress event
   */
  sendPhaseProgress(
    phaseId: string,
    progress: number,
    total: number,
    controller: ReadableStreamDefaultController,
    details?: any
  ) {
    const phase = this.phases.get(phaseId)
    if (!phase) return

    phase.progress = progress
    phase.total = total

    const event = EventFactory.progress(progress, total, phase.description, {
      phase: phaseId,
      phaseName: phase.name,
      correlationId: this.correlationId,
      ...details
    })

    this.sendEvent(controller, event)
  }

  /**
   * Send phase completion event
   */
  sendPhaseComplete(
    phaseId: string,
    controller: ReadableStreamDefaultController,
    results?: any
  ) {
    const phase = this.phases.get(phaseId)
    if (!phase) {
      permanentLogger.warn('STREAMING_DISCOVERY', 'Phase not found', { phaseId })
      return
    }

    phase.status = 'completed'

    // Send a simple phase-complete event that frontend expects
    const event = {
      type: 'phase-complete',
      phase: phaseId,
      phaseName: phase.name,
      ...results,
      correlationId: this.correlationId,
      timestamp: Date.now()
    }

    this.sendRawEvent(controller, event)

    permanentLogger.info('STREAMING_DISCOVERY', 'Phase completed', {
      phaseId,
      phaseName: phase.name,
      hasResults: !!results,
      correlationId: this.correlationId
    })
  }

  /**
   * Send phase error event
   */
  sendPhaseError(
    phaseId: string,
    error: Error,
    controller: ReadableStreamDefaultController
  ) {
    const phase = this.phases.get(phaseId)
    if (!phase) return

    phase.status = 'failed'
    phase.error = error.message

    const event = EventFactory.error(error, {
      phase: phaseId,
      phaseName: phase.name,
      correlationId: this.correlationId
    })

    this.sendEvent(controller, event)

    permanentLogger.captureError('STREAMING_DISCOVERY', error, {
      phaseId,
      phaseName: phase.name,
      correlationId: this.correlationId
    })
  }

  /**
   * Send data update event
   */
  sendDataUpdate(
    controller: ReadableStreamDefaultController,
    data: any,
    metadata?: any
  ) {
    // Send data directly without wrapping - frontend expects the raw structure
    const event = {
      ...data,
      correlationId: this.correlationId,
      timestamp: Date.now(),
      ...metadata
    }

    this.sendRawEvent(controller, event)

    permanentLogger.info('STREAMING_DISCOVERY', 'Data update sent', {
      type: data.type,
      hasPages: !!data.pages,
      pagesIsArray: Array.isArray(data.pages),
      pageCount: data.pages?.length || 0,
      eventKeys: Object.keys(event),
      samplePageUrl: data.pages?.[0]?.url || null
    })
  }

  /**
   * Send discovery complete event
   * This is crucial for the UI to know when to stop loading
   */
  sendDiscoveryComplete(
    controller: ReadableStreamDefaultController,
    summary: any
  ) {
    // Send discovery-complete event directly
    const event = {
      type: 'discovery-complete',
      ...summary,
      correlationId: this.correlationId,
      timestamp: Date.now()
    }

    this.sendRawEvent(controller, event)

    permanentLogger.info('STREAMING_DISCOVERY', 'Discovery complete event sent', {
      correlationId: this.correlationId,
      totalPages: summary.totalPages || 0
    })
  }

  /**
   * Send notification event
   */
  sendNotification(
    controller: ReadableStreamDefaultController,
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info'
  ) {
    const event = EventFactory.notification(message, type, {
      correlationId: this.correlationId
    })

    this.sendEvent(controller, event)
  }

  /**
   * Send a generic event (for EventFactory events)
   */
  private sendEvent(controller: ReadableStreamDefaultController, event: RealtimeEvent) {
    try {
      // Check if aborted
      if (this.signal?.aborted) {
        controller.close()
        return
      }

      // Format as SSE
      const message = `data: ${JSON.stringify(event)}\n\n`
      controller.enqueue(this.encoder.encode(message))

    } catch (error) {
      permanentLogger.captureError('STREAMING_DISCOVERY', error as Error, {
        correlationId: this.correlationId,
        eventType: event.type
      })
    }
  }

  /**
   * Send a raw event without EventFactory wrapping
   */
  private sendRawEvent(controller: ReadableStreamDefaultController, event: any) {
    try {
      // Check if aborted
      if (this.signal?.aborted) {
        permanentLogger.info('STREAMING_DISCOVERY', 'Stream aborted, closing', {
          correlationId: this.correlationId
        })
        controller.close()
        return
      }

      // Format as SSE
      const message = `data: ${JSON.stringify(event)}\n\n`
      controller.enqueue(this.encoder.encode(message))

      permanentLogger.debug('STREAMING_DISCOVERY', 'Raw event sent', {
        eventType: event.type,
        correlationId: this.correlationId
      })

    } catch (error) {
      permanentLogger.captureError('STREAMING_DISCOVERY', error as Error, {
        correlationId: this.correlationId,
        eventType: event.type,
        phase: 'sendRawEvent'
      })
    }
  }

  /**
   * Generate a unique correlation ID
   */
  private generateCorrelationId(): string {
    return `discovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get current phase status
   */
  getPhaseStatus(): DiscoveryPhase[] {
    return Array.from(this.phases.values())
  }

  /**
   * Check if all phases are complete
   */
  isComplete(): boolean {
    return Array.from(this.phases.values()).every(
      phase => phase.status === 'completed' || phase.status === 'failed'
    )
  }
}

/**
 * Helper class for writing to stream
 * Provides a clean interface for sending events during discovery
 */
export class StreamWriter {
  private controller: ReadableStreamDefaultController | null = null

  constructor(public service: StreamingDiscoveryService) {}

  /**
   * Set the controller for this writer
   */
  setController(controller: ReadableStreamDefaultController) {
    this.controller = controller
  }

  /**
   * Send event to controller
   */
  sendToController(controller: ReadableStreamDefaultController, event: RealtimeEvent) {
    try {
      const message = `data: ${JSON.stringify(event)}\n\n`
      // Access the encoder directly from the service's private property
      const encoder = new TextEncoder()
      controller.enqueue(encoder.encode(message))
    } catch (error) {
      permanentLogger.captureError('STREAM_WRITER', error as Error, {
        eventType: event.type
      })
    }
  }

  /**
   * Send phase start
   */
  phaseStart(phaseId: string) {
    if (!this.controller) {
      permanentLogger.warn('STREAM_WRITER', 'No controller set for stream writer', {
        phaseId,
        stackTrace: new Error().stack
      })
      return
    }
    permanentLogger.info('STREAM_WRITER', 'Sending phase start event', {
      phaseId,
      hasController: !!this.controller
    })
    this.service.sendPhaseStart(phaseId, this.controller)
  }

  /**
   * Send phase progress
   */
  phaseProgress(
    phaseId: string,
    progress: number,
    total: number,
    details?: any
  ) {
    if (!this.controller) {
      permanentLogger.warn('STREAM_WRITER', 'No controller set for stream writer')
      return
    }
    this.service.sendPhaseProgress(phaseId, progress, total, this.controller, details)
  }

  /**
   * Send phase complete
   */
  phaseComplete(
    phaseId: string,
    results?: any
  ) {
    if (!this.controller) {
      permanentLogger.warn('STREAM_WRITER', 'No controller set for stream writer', {
        phaseId,
        hasResults: !!results
      })
      return
    }
    permanentLogger.info('STREAM_WRITER', 'Sending phase complete event', {
      phaseId,
      hasResults: !!results,
      resultKeys: results ? Object.keys(results) : []
    })
    this.service.sendPhaseComplete(phaseId, this.controller, results)
  }

  /**
   * Send phase error
   */
  phaseError(
    phaseId: string,
    error: Error
  ) {
    if (!this.controller) {
      permanentLogger.warn('STREAM_WRITER', 'No controller set for stream writer - cannot send error', {
        phaseId,
        error: error.message
      })
      return
    }
    permanentLogger.captureError('STREAM_WRITER', error, {
      phaseId,
      phase: 'error'
    })
    this.service.sendPhaseError(phaseId, error, this.controller)
  }

  /**
   * Send data update
   */
  dataUpdate(data: any, metadata?: any) {
    if (!this.controller) {
      permanentLogger.warn('STREAM_WRITER', 'No controller set for stream writer - cannot send data', {
        dataType: data?.type,
        hasMetadata: !!metadata
      })
      return
    }
    permanentLogger.info('STREAM_WRITER', 'Sending data update', {
      dataType: data?.type,
      hasPages: !!data?.pages,
      pagesIsArray: Array.isArray(data?.pages),
      pageCount: data?.pages?.length || 0,
      totalCount: data?.totalCount || 0,
      firstPageUrl: data?.pages?.[0]?.url || null
    })
    this.service.sendDataUpdate(this.controller, data, metadata)
  }

  /**
   * Send notification
   */
  notification(
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info'
  ) {
    if (!this.controller) {
      permanentLogger.warn('STREAM_WRITER', 'No controller set for stream writer - cannot send notification', {
        message,
        type
      })
      return
    }
    permanentLogger.info('STREAM_WRITER', 'Sending notification', {
      type,
      message: message.substring(0, 100) // Log first 100 chars only
    })
    this.service.sendNotification(this.controller, message, type)
  }
}

/**
 * Create a streaming discovery handler
 * This is a convenience function for creating streaming responses
 */
export function createStreamingDiscovery(
  options: StreamingOptions = {}
): {
  service: StreamingDiscoveryService
  createStream: (discoveryFn: (writer: StreamWriter) => Promise<void>) => ReadableStream
} {
  const service = new StreamingDiscoveryService(options)

  return {
    service,
    createStream: (discoveryFn) => service.createStream(discoveryFn)
  }
}