/**
 * Scraper Context - Shared State Management
 *
 * Provides shared dependencies and state to all scraper plugins.
 * Ensures consistency across all scrapers (DRY principle).
 *
 * Key Features:
 * - Centralized logging with permanentLogger
 * - Unified event streaming with EventFactory
 * - Shared extraction and validation pipelines
 * - Performance tracking with breadcrumbs
 *
 * @module core/scraper-context
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { EventFactory, StreamWriter } from '@/lib/realtime-events'
import { safeTimestampToISO } from '@/lib/utils/safe-timestamp'
import type {
  ScraperContext,
  ScraperOptions,
  ProgressReporter,
  PerformanceTracker,
  ExtractorPipeline,
  ValidatorPipeline,
  TimerHandle,
  Extractor,
  Validator,
  ExtractedData
} from './types'

/**
 * Progress reporter implementation using unified EventFactory
 * All progress events go through the same streaming system
 */
class ProgressReporterImpl implements ProgressReporter {
  private writer: StreamWriter
  private sessionId: string
  private correlationId: string

  constructor(sessionId: string, correlationId: string, signal?: AbortSignal) {
    this.sessionId = sessionId
    this.correlationId = correlationId
    this.writer = new StreamWriter(sessionId, correlationId, signal)

    permanentLogger.breadcrumb('progress_reporter_init', 'Progress reporter initialized', {
      sessionId,
      correlationId
    })
  }

  /**
   * Report progress update via SSE
   */
  async report(data: {
    current: number
    total: number
    message: string
    scraperId?: string
    url?: string
    phase?: string
  }): Promise<void> {
    try {
      const event = EventFactory.progress(
        data.current,
        data.total,
        data.message,
        {
          scraperId: data.scraperId,
          url: data.url,
          phase: data.phase,
          timestamp: safeTimestampToISO(Date.now())
        }
      )

      await this.writer.sendEvent(event)

      permanentLogger.breadcrumb('progress_sent', 'Progress event sent', {
        current: data.current,
        total: data.total,
        scraperId: data.scraperId
      })
    } catch (error) {
      // Log error but don't throw - progress is non-critical
      permanentLogger.captureError('PROGRESS_REPORTER', error as Error, {
        sessionId: this.sessionId,
        data
      })
    }
  }

  /**
   * Report completion
   */
  async complete(summary: any): Promise<void> {
    try {
      const event = EventFactory.complete(summary, {
        sessionId: this.sessionId,
        correlationId: this.correlationId,
        timestamp: safeTimestampToISO(Date.now())
      })

      await this.writer.sendEvent(event)

      permanentLogger.info('PROGRESS_REPORTER', 'Completion event sent', {
        sessionId: this.sessionId
      })
    } catch (error) {
      permanentLogger.captureError('PROGRESS_REPORTER', error as Error, {
        sessionId: this.sessionId,
        summary
      })
    }
  }

  /**
   * Report error (no silent failures!)
   */
  async error(error: Error, context: any): Promise<void> {
    try {
      const event = EventFactory.error(error, {
        ...context,
        sessionId: this.sessionId,
        correlationId: this.correlationId,
        timestamp: safeTimestampToISO(Date.now())
      })

      await this.writer.sendEvent(event)

      permanentLogger.captureError('PROGRESS_REPORTER', error, {
        sessionId: this.sessionId,
        context
      })
    } catch (sendError) {
      // If we can't send the error event, at least log it
      permanentLogger.captureError('PROGRESS_REPORTER', sendError as Error, {
        originalError: error,
        context
      })
    }
  }

  /**
   * Close the stream
   */
  close(): void {
    this.writer.close()
    permanentLogger.breadcrumb('progress_reporter_close', 'Progress reporter closed', {
      sessionId: this.sessionId
    })
  }
}

/**
 * Performance tracker implementation with timing and metrics
 */
class PerformanceTrackerImpl implements PerformanceTracker {
  private metrics: Map<string, any> = new Map()
  private timers: Map<string, number> = new Map()

  /**
   * Start timing an operation
   */
  startTimer(label: string, metadata?: any): TimerHandle {
    const startTime = performance.now()
    const timerId = `${label}_${Date.now()}`

    this.timers.set(timerId, startTime)

    permanentLogger.breadcrumb('timer_start', `Timer started: ${label}`, {
      timerId,
      metadata
    })

    return {
      stop: () => {
        const endTime = performance.now()
        const duration = endTime - startTime

        this.timers.delete(timerId)
        this.recordMetric(`${label}_duration`, duration, 'ms')

        permanentLogger.breadcrumb('timer_stop', `Timer stopped: ${label}`, {
          timerId,
          duration
        })

        return duration
      },

      cancel: () => {
        this.timers.delete(timerId)
        permanentLogger.breadcrumb('timer_cancel', `Timer cancelled: ${label}`, {
          timerId
        })
      },

      checkpoint: (name: string, checkpointMetadata?: any) => {
        const checkpointTime = performance.now()
        const elapsed = checkpointTime - startTime

        permanentLogger.breadcrumb('timer_checkpoint', `Checkpoint: ${name}`, {
          timerId,
          elapsed,
          metadata: checkpointMetadata
        })
      }
    }
  }

  /**
   * Record a metric
   */
  recordMetric(name: string, value: number, unit?: string): void {
    const metric = {
      value,
      unit: unit || 'count',
      timestamp: safeTimestampToISO(Date.now())
    }

    this.metrics.set(name, metric)

    permanentLogger.breadcrumb('metric_recorded', `Metric: ${name}`, metric)
  }

  /**
   * Get all metrics
   */
  getMetrics(): Record<string, any> {
    const result: Record<string, any> = {}

    this.metrics.forEach((value, key) => {
      result[key] = value
    })

    return result
  }
}

/**
 * Extractor pipeline implementation
 * Chains multiple extractors for comprehensive data extraction
 */
class ExtractorPipelineImpl implements ExtractorPipeline {
  private extractors: Extractor[] = []

  /**
   * Register an extractor
   */
  register(extractor: Extractor): void {
    this.extractors.push(extractor)

    // Sort by priority (higher runs first)
    this.extractors.sort((a, b) => b.priority - a.priority)

    permanentLogger.breadcrumb('extractor_register', `Extractor registered: ${extractor.name}`, {
      priority: extractor.priority,
      totalExtractors: this.extractors.length
    })
  }

  /**
   * Extract data using all registered extractors
   */
  async extract(content: any, url: string): Promise<ExtractedData> {
    const timer = permanentLogger.timing('extraction_pipeline', { url })
    const results: Partial<ExtractedData> = {}

    for (const extractor of this.extractors) {
      try {
        const extractorTimer = permanentLogger.timing(`extractor_${extractor.name}`)
        const data = await extractor.extract(content, url)

        // Merge results
        Object.assign(results, data)

        extractorTimer.stop()
      } catch (error) {
        permanentLogger.captureError('EXTRACTOR_PIPELINE', error as Error, {
          extractor: extractor.name,
          url
        })
        // Continue with other extractors
      }
    }

    timer.stop()

    // Ensure all required fields are present
    return {
      title: results.title || '',
      description: results.description || '',
      content: results.content || '',
      textContent: results.textContent || '',
      links: results.links || [],
      structuredData: results.structuredData || {},
      contactInfo: results.contactInfo || { emails: [], phones: [], addresses: [] },
      socialLinks: results.socialLinks || {},
      forms: results.forms || [],
      images: results.images || [],
      technologies: results.technologies || [],
      apiEndpoints: results.apiEndpoints || [],
      metadata: results.metadata || {}
    }
  }

  /**
   * Get registered extractors
   */
  getExtractors(): Extractor[] {
    return [...this.extractors]
  }
}

/**
 * Validator pipeline implementation
 * Validates extracted data for quality and completeness
 */
class ValidatorPipelineImpl implements ValidatorPipeline {
  private validators: Validator[] = []

  /**
   * Register a validator
   */
  register(validator: Validator): void {
    this.validators.push(validator)

    permanentLogger.breadcrumb('validator_register', `Validator registered: ${validator.name}`, {
      totalValidators: this.validators.length
    })
  }

  /**
   * Validate data using all registered validators
   */
  async validate(data: any): Promise<any> {
    let validatedData = data

    for (const validator of this.validators) {
      try {
        validatedData = await validator.validate(validatedData)
      } catch (error) {
        permanentLogger.captureError('VALIDATOR_PIPELINE', error as Error, {
          validator: validator.name
        })
        // Continue with other validators
      }
    }

    return validatedData
  }
}

/**
 * Create a scraper context with all dependencies
 * This is the shared state passed to all plugins
 */
export function createScraperContext(
  sessionId: string,
  companyId: string,
  options: ScraperOptions = {}
): ScraperContext {
  const correlationId = EventFactory.getCorrelationId(sessionId)

  permanentLogger.info('SCRAPER_CONTEXT', 'Creating scraper context', {
    sessionId,
    companyId,
    correlationId,
    options
  })

  return {
    sessionId,
    companyId,
    correlationId,
    logger: permanentLogger,
    progressReporter: new ProgressReporterImpl(sessionId, correlationId, options.signal),
    performanceTracker: new PerformanceTrackerImpl(),
    extractors: new ExtractorPipelineImpl(),
    validators: new ValidatorPipelineImpl(),
    options
  }
}

/**
 * Cleanup scraper context resources
 * Important for preventing memory leaks
 */
export function cleanupScraperContext(context: ScraperContext): void {
  try {
    // Close progress reporter stream
    context.progressReporter.close()

    // Log final metrics
    const metrics = context.performanceTracker.getMetrics()

    permanentLogger.info('SCRAPER_CONTEXT', 'Context cleanup complete', {
      sessionId: context.sessionId,
      metrics
    })
  } catch (error) {
    permanentLogger.captureError('SCRAPER_CONTEXT', error as Error, {
      phase: 'cleanup',
      sessionId: context.sessionId
    })
  }
}