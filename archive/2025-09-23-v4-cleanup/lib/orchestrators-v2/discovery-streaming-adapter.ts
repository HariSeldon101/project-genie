/**
 * DiscoveryStreamingAdapter - Handles SSE streaming for discovery
 *
 * CRITICAL CLAUDE.md Compliance:
 * - Uses unified EventFactory from @/lib/realtime-events
 * - NO mock data or fallback events
 * - Proper error handling with permanentLogger
 * - File size: ~250 lines (well under 500 limit)
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { EventFactory, StreamWriter } from '@/lib/realtime-events'
import { DiscoveryPhaseExecutor } from './discovery-phase-executor'
import type { DiscoveryResult, DiscoveryProgress } from '../types/discovery'

/**
 * Adapts discovery execution for SSE streaming
 * Separates streaming concerns from business logic (SOLID)
 */
export class DiscoveryStreamingAdapter {
  private streamWriter: StreamWriter | null = null
  private correlationId: string

  constructor() {
    this.correlationId = crypto.randomUUID()
  }

  /**
   * Wraps discovery execution with SSE streaming
   * @param executor - The phase executor to wrap
   * @param sessionId - Session ID for tracking
   * @param domain - Domain to discover
   * @param signal - Abort signal for cancellation
   * @returns ReadableStream for SSE
   */
  async wrapWithStreaming(
    executor: DiscoveryPhaseExecutor,
    sessionId: string,
    domain: string,
    signal: AbortSignal,
    onComplete?: (result: DiscoveryResult) => Promise<void>
  ): Promise<ReadableStream> {
    const startTime = Date.now()

    permanentLogger.info('STREAMING_ADAPTER', 'Starting streaming discovery', {
      sessionId,
      domain,
      correlationId: this.correlationId
    })

    try {
      // KISS SOLUTION: Create stream FIRST, then execute discovery
      // This ensures the client can connect before events are sent
      this.streamWriter = new StreamWriter(sessionId, this.correlationId, signal)
      const stream = this.streamWriter.createStream()

      // Send initial event immediately
      await this.sendStartEvent(domain)

      // Execute discovery asynchronously with real-time progress updates
      // Don't await - let it run in background while we return the stream
      executor.executeAllPhases(
        domain,
        async (progress: DiscoveryProgress) => {
          // Send events AS THEY HAPPEN, not collected and replayed
          console.log('📤 [STREAMING_ADAPTER] Sending real-time progress:', progress.phase, progress.status)
          await this.handleProgress(progress)
        }
      ).then(async (result) => {
        // Discovery completed successfully
        console.log('✅ [STREAMING_ADAPTER] Discovery completed, sending final event')

        // Send the complete event with the final result
        await this.sendCompleteEvent(result)

        // Handle persistence if callback provided
        if (onComplete) {
          console.log('💾 [STREAMING_ADAPTER] Calling persistence callback...')
          try {
            await onComplete(result)
            console.log('💾 [STREAMING_ADAPTER] Persistence completed')
          } catch (error) {
            permanentLogger.captureError('STREAMING_ADAPTER', error as Error, {
              phase: 'onComplete_callback',
              sessionId
            })
          }
        }

        // Close the stream after a small delay to ensure all events are flushed
        setTimeout(() => {
          console.log('🔒 [STREAMING_ADAPTER] Closing stream')
          this.streamWriter?.close()
        }, 100)

        permanentLogger.info('STREAMING_ADAPTER', 'Discovery completed successfully', {
          sessionId,
          duration: Date.now() - startTime,
          urlCount: result.urls?.length || 0
        })

      }).catch(async (error) => {
        // Discovery failed
        console.error('❌ [STREAMING_ADAPTER] Discovery failed:', error)

        permanentLogger.captureError('STREAMING_ADAPTER', error as Error, {
          phase: 'discovery_execution',
          sessionId,
          domain
        })

        // Send error event to client
        await this.sendErrorEvent(error as Error)

        // Close the stream
        this.streamWriter?.close()
      })

      // Return the stream immediately so client can start receiving events
      permanentLogger.info('STREAMING_ADAPTER', 'Stream created and returned to client', {
        sessionId,
        domain
      })

      return stream

    } catch (error) {
      // This should only catch errors in stream creation itself
      permanentLogger.captureError('STREAMING_ADAPTER', error as Error, {
        phase: 'stream_creation',
        sessionId,
        domain
      })

      // If we have a stream writer, send error and close
      if (this.streamWriter) {
        await this.sendErrorEvent(error as Error)
        this.streamWriter.close()
      }

      throw error // NEVER swallow errors
    }
  }

  // Removed getResultPromise - no longer needed with real-time streaming

  /**
   * Handle progress updates and send SSE events
   * @param progress - Progress update from executor
   */
  private async handleProgress(progress: DiscoveryProgress): Promise<void> {
    if (!this.streamWriter) return

    try {
      // Map progress to appropriate event type
      let event

      switch (progress.status) {
        case 'in_progress':
          event = EventFactory.progress(
            progress.completed || 0,
            progress.total || 100,
            progress.message || 'Processing...'
          )
          break

        case 'completed':
          event = EventFactory.data(
            progress.data || {},
            {
              phase: progress.phase,
              duration: progress.duration
            }
          )
          break

        case 'error':
          event = EventFactory.error(
            progress.error || new Error(progress.message || 'Unknown error'),
            { phase: progress.phase }
          )
          break

        default:
          // Generic update event
          event = EventFactory.notification(
            progress.message || 'Discovery update',
            'info'
          )
      }

      await this.streamWriter.sendEvent(event)

      permanentLogger.breadcrumb('progress_sent', `Progress: ${progress.phase}`, {
        status: progress.status,
        correlationId: this.correlationId
      })

    } catch (error) {
      // Log but don't fail the whole stream for progress updates
      permanentLogger.captureError('STREAMING_ADAPTER', error as Error, {
        phase: 'progress_handling',
        progressPhase: progress.phase
      })
    }
  }

  /**
   * Send discovery start event
   * @param domain - Domain being discovered
   */
  private async sendStartEvent(domain: string): Promise<void> {
    if (!this.streamWriter) return

    const event = EventFactory.notification(
      `Starting discovery for ${domain}`,
      'info'
    )

    await this.streamWriter.sendEvent(event)

    permanentLogger.breadcrumb('stream_start', 'Discovery started', {
      domain,
      correlationId: this.correlationId
    })
  }

  /**
   * Send discovery complete event
   * @param result - Discovery result
   */
  private async sendCompleteEvent(result: DiscoveryResult): Promise<void> {
    if (!this.streamWriter) {
      console.log('🚨 [STREAMING_ADAPTER] ERROR: No streamWriter available for complete event!')  // DEBUG
      return
    }

    console.log('📤 [STREAMING_ADAPTER] Creating discovery_complete event with:', {
      urlCount: result.urls?.length || 0,
      hasUrls: !!result.urls,
      hasMergedData: !!result.merged_data
    })  // DEBUG

    const event = EventFactory.data(
      {
        success: result.success,
        urlCount: result.urls?.length || 0,
        domain: result.domain,
        merged_data: result.merged_data,
        urls: result.urls || []  // Include the URLs directly for easier access
      },
      {
        type: 'discovery_complete',
        correlationId: this.correlationId
      }
    )

    console.log('📤 [STREAMING_ADAPTER] Sending discovery_complete event...')  // DEBUG
    await this.streamWriter.sendEvent(event)
    console.log('✅ [STREAMING_ADAPTER] Discovery_complete event sent successfully!')  // DEBUG

    permanentLogger.info('STREAMING_ADAPTER', 'Discovery complete event sent', {
      domain: result.domain,
      urlCount: result.urls?.length || 0,
      correlationId: this.correlationId
    })
  }

  /**
   * Send error event
   * @param error - Error that occurred
   */
  private async sendErrorEvent(error: Error): Promise<void> {
    if (!this.streamWriter) return

    const event = EventFactory.error(error, {
      correlationId: this.correlationId,
      phase: 'discovery'
    })

    await this.streamWriter.sendEvent(event)

    permanentLogger.breadcrumb('stream_error', 'Error event sent', {
      error: error.message,
      correlationId: this.correlationId
    })
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.streamWriter) {
      this.streamWriter.close()
      this.streamWriter = null
    }

    permanentLogger.breadcrumb('stream_disposed', 'Streaming adapter disposed', {
      correlationId: this.correlationId
    })
  }
}