# Complete Scraper Architecture Refactor - Implementation Plan
**Date**: 2025-01-16
**Version**: 1.0
**Type**: Full Refactor (Option 1 - Clean Architecture)
**Estimated Time**: 8 hours

## 📋 Table of Contents
1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Core Components Implementation](#core-components-implementation)
4. [Unified Scraper Executor Refactor](#unified-scraper-executor-refactor)
5. [Missing Components Implementation](#missing-components-implementation)
6. [Test Updates](#test-updates)
7. [Migration Steps](#migration-steps)
8. [Success Criteria](#success-criteria)

## Executive Summary

This document outlines the complete refactor of the scraper architecture to achieve:
- **Zero code duplication** through shared components
- **Plugin-based extensibility** with auto-discovery
- **Clean architecture** with all files under 200 lines
- **Unified event system** using `/lib/realtime-events`
- **Database-first design** with no URLs from UI
- **Bulletproof error handling** with captureError only

## Architecture Overview

```
/lib/company-intelligence/
├── core/
│   └── unified-scraper-executor.ts    (200 lines - orchestrates everything)
└── scrapers/
    ├── core/
    │   ├── scraper-orchestrator.ts    (180 lines - manages execution)
    │   ├── scraper-registry.ts        (150 lines - plugin discovery)
    │   ├── scraper-context.ts         (100 lines - shared context)
    │   └── types.ts                    (150 lines - interfaces)
    ├── plugins/
    │   ├── static/index.ts             (existing - no changes)
    │   ├── dynamic/index.ts            (existing - no changes)
    │   └── firecrawl/index.ts          (existing - no changes)
    └── utils/
        ├── progress-reporter.ts        (100 lines - NEW)
        └── performance-tracker.ts      (80 lines - NEW)
```

## Core Components Implementation

### 1. ProgressReporter (NEW) - `/lib/company-intelligence/scrapers/utils/progress-reporter.ts`

```typescript
/**
 * Unified Progress Reporter
 *
 * Uses the unified EventFactory from /lib/realtime-events to send
 * progress updates via Server-Sent Events (SSE).
 *
 * Features:
 * - Automatic reconnection handling
 * - Deduplication of events
 * - Memory-safe streaming
 * - Correlation ID tracking
 *
 * @module utils/progress-reporter
 */

import { EventFactory, StreamWriter } from '@/lib/realtime-events'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { getSafeTimestamp } from '@/lib/utils/safe-timestamp'

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
  dedupeWindow?: number // milliseconds
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
    this.dedupeWindow = options.dedupeWindow || 2000 // 2 second dedupe window

    // Initialize StreamWriter with proper signal handling
    this.writer = new StreamWriter(
      this.sessionId,
      this.correlationId,
      options.signal
    )

    permanentLogger.breadcrumb('progress_reporter_init', 'ProgressReporter initialized', {
      sessionId: this.sessionId,
      correlationId: this.correlationId,
      timestamp: getSafeTimestamp()
    })
  }

  /**
   * Report progress update
   * Deduplicates events within the time window
   */
  async report(data: ProgressData): Promise<void> {
    const timer = permanentLogger.timing('progress_report')

    try {
      // Create hash for deduplication
      const eventHash = this.createEventHash(data)
      const now = Date.now()

      // Check for duplicate within dedupe window
      if (eventHash === this.lastEventHash &&
          (now - this.lastEventTime) < this.dedupeWindow) {
        permanentLogger.debug('PROGRESS_REPORTER', 'Duplicate event skipped', {
          eventHash,
          timeSinceLastEvent: now - this.lastEventTime
        })
        return
      }

      // Create progress event using unified factory
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

      // Send via StreamWriter
      await this.writer.sendEvent(event)

      // Update dedupe tracking
      this.lastEventHash = eventHash
      this.lastEventTime = now

      permanentLogger.breadcrumb('progress_sent', 'Progress event sent', {
        current: data.current,
        total: data.total,
        scraperId: data.scraperId,
        eventNumber: this.eventCount
      })

    } catch (error) {
      permanentLogger.captureError('PROGRESS_REPORTER', error as Error, {
        data,
        sessionId: this.sessionId,
        correlationId: this.correlationId
      })
      // Don't throw - progress reporting shouldn't break scraping
    } finally {
      timer.stop()
    }
  }

  /**
   * Report completion with summary
   */
  async complete(summary: Record<string, any>): Promise<void> {
    try {
      const event = EventFactory.data(
        { type: 'completion', summary },
        {
          sessionId: this.sessionId,
          correlationId: this.correlationId,
          timestamp: getSafeTimestamp()
        }
      )

      await this.writer.sendEvent(event)

      permanentLogger.info('PROGRESS_REPORTER', 'Completion event sent', {
        sessionId: this.sessionId,
        totalEvents: this.eventCount
      })
    } catch (error) {
      permanentLogger.captureError('PROGRESS_REPORTER', error as Error, {
        summary,
        sessionId: this.sessionId
      })
    }
  }

  /**
   * Report error
   */
  async error(error: Error, context: Record<string, any>): Promise<void> {
    try {
      const event = EventFactory.error(error, {
        ...context,
        sessionId: this.sessionId,
        correlationId: this.correlationId
      })

      await this.writer.sendEvent(event)

    } catch (sendError) {
      permanentLogger.captureError('PROGRESS_REPORTER', sendError as Error, {
        originalError: error.message,
        context
      })
    }
  }

  /**
   * Close the stream writer
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
   */
  private createEventHash(data: ProgressData): string {
    return `${data.current}_${data.total}_${data.message}_${data.scraperId || ''}`
  }
}
```

### 2. PerformanceTracker (NEW) - `/lib/company-intelligence/scrapers/utils/performance-tracker.ts`

```typescript
/**
 * Performance Tracker
 *
 * Centralized performance measurement for scraping operations.
 * Integrates with permanentLogger for timing metrics.
 *
 * Features:
 * - Nested timing support
 * - Automatic cleanup of old timers
 * - Memory usage tracking
 * - Performance aggregation
 *
 * @module utils/performance-tracker
 */

import { permanentLogger, TimingHandle } from '@/lib/utils/permanent-logger'

export interface PerformanceMetrics {
  duration: number
  memoryUsed: number
  cpuPercent?: number
  operations: number
  averageTime: number
}

/**
 * Tracks performance metrics for scraping operations
 */
export class PerformanceTracker {
  private timers = new Map<string, number>()
  private metrics = new Map<string, PerformanceMetrics>()
  private operationCounts = new Map<string, number>()
  private readonly maxTimerAge = 5 * 60 * 1000 // 5 minutes

  constructor() {
    // Cleanup old timers every minute
    setInterval(() => this.cleanupOldTimers(), 60000)
  }

  /**
   * Start a timer with automatic permanentLogger integration
   */
  startTimer(label: string, metadata?: Record<string, any>): TimingHandle {
    const fullLabel = `scraper_${label}`

    // Use permanentLogger's timing feature
    const handle = permanentLogger.timing(fullLabel, metadata)

    // Track locally for aggregation
    const startTime = performance.now()
    this.timers.set(label, startTime)

    // Increment operation count
    const currentCount = this.operationCounts.get(label) || 0
    this.operationCounts.set(label, currentCount + 1)

    // Return enhanced handle
    return {
      stop: () => {
        const duration = handle.stop()
        this.recordMetric(label, duration)
        return duration
      },
      cancel: () => {
        handle.cancel()
        this.timers.delete(label)
      },
      checkpoint: (name: string, checkpointMetadata?: any) => {
        handle.checkpoint(name, checkpointMetadata)
      }
    }
  }

  /**
   * Get aggregated metrics for a label
   */
  getMetrics(label: string): PerformanceMetrics | undefined {
    return this.metrics.get(label)
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<string, PerformanceMetrics> {
    return new Map(this.metrics)
  }

  /**
   * Reset metrics for a label
   */
  resetMetrics(label: string): void {
    this.metrics.delete(label)
    this.operationCounts.delete(label)
    this.timers.delete(label)
  }

  /**
   * Get current memory usage
   */
  getMemoryUsage(): NodeJS.MemoryUsage {
    return process.memoryUsage()
  }

  /**
   * Record a metric
   */
  private recordMetric(label: string, duration: number): void {
    const existing = this.metrics.get(label)
    const operations = this.operationCounts.get(label) || 1

    if (existing) {
      // Update with running average
      const totalDuration = existing.duration + duration
      const averageTime = totalDuration / operations

      this.metrics.set(label, {
        duration: totalDuration,
        memoryUsed: process.memoryUsage().heapUsed,
        operations,
        averageTime
      })
    } else {
      // Create new metric
      this.metrics.set(label, {
        duration,
        memoryUsed: process.memoryUsage().heapUsed,
        operations: 1,
        averageTime: duration
      })
    }
  }

  /**
   * Clean up old timers to prevent memory leaks
   */
  private cleanupOldTimers(): void {
    const now = performance.now()
    const expired: string[] = []

    this.timers.forEach((startTime, label) => {
      if (now - startTime > this.maxTimerAge) {
        expired.push(label)
      }
    })

    expired.forEach(label => {
      this.timers.delete(label)
      permanentLogger.debug('PERFORMANCE_TRACKER', 'Cleaned up expired timer', { label })
    })
  }
}
```

### 3. ScraperOrchestrator (UPDATE) - `/lib/company-intelligence/scrapers/core/scraper-orchestrator.ts`

```typescript
/**
 * Scraper Orchestrator
 *
 * Manages the execution of scraping operations using the plugin system.
 * Coordinates between registry, plugins, and progress reporting.
 *
 * Features:
 * - Plugin selection based on URL patterns
 * - Parallel execution support
 * - Automatic retry with backoff
 * - Result aggregation
 *
 * @module core/scraper-orchestrator
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { ScraperRegistry } from './scraper-registry'
import { ScraperContext } from './scraper-context'
import { ProgressReporter } from '../utils/progress-reporter'
import { PerformanceTracker } from '../utils/performance-tracker'
import { EventFactory } from '@/lib/realtime-events'
import { validateUrls } from '@/lib/utils/url-validator'
import { getSafeTimestamp } from '@/lib/utils/safe-timestamp'
import type {
  ScraperPlugin,
  ScraperResult,
  OrchestratorOptions,
  ExecutionRequest,
  ExecutionResult
} from './types'

/**
 * Orchestrates scraping operations across plugins
 */
export class ScraperOrchestrator {
  private registry: ScraperRegistry
  private performanceTracker: PerformanceTracker
  private activeExecutions = new Map<string, AbortController>()

  constructor(registry: ScraperRegistry) {
    this.registry = registry
    this.performanceTracker = new PerformanceTracker()

    permanentLogger.info('SCRAPER_ORCHESTRATOR', 'Orchestrator initialized', {
      timestamp: getSafeTimestamp()
    })
  }

  /**
   * Execute scraping with automatic plugin selection
   */
  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const timer = this.performanceTracker.startTimer('orchestration_total')
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    permanentLogger.breadcrumb('orchestration_start', 'Starting orchestration', {
      executionId,
      sessionId: request.sessionId,
      urlCount: request.urls.length,
      scraperId: request.scraperId
    })

    // Create abort controller for this execution
    const abortController = new AbortController()
    this.activeExecutions.set(executionId, abortController)

    // Initialize progress reporter if streaming
    let progressReporter: ProgressReporter | undefined
    if (request.stream && request.progressCallback) {
      progressReporter = new ProgressReporter({
        sessionId: request.sessionId,
        correlationId: executionId,
        signal: abortController.signal
      })
    }

    try {
      // Validate URLs first
      const validationTimer = this.performanceTracker.startTimer('url_validation')
      const validUrls = await validateUrls(request.urls)
      validationTimer.stop()

      if (validUrls.length === 0) {
        throw new Error('No valid URLs to scrape')
      }

      permanentLogger.info('SCRAPER_ORCHESTRATOR', 'URLs validated', {
        executionId,
        totalUrls: request.urls.length,
        validUrls: validUrls.length,
        invalidUrls: request.urls.length - validUrls.length
      })

      // Get appropriate plugin
      const plugin = request.scraperId
        ? this.registry.getPlugin(request.scraperId)
        : this.selectBestPlugin(validUrls[0])

      if (!plugin) {
        throw new Error(`No suitable scraper found for ${request.scraperId || 'URLs'}`)
      }

      // Create context for plugin
      const context = new ScraperContext({
        sessionId: request.sessionId,
        companyId: request.companyId,
        progressReporter,
        performanceTracker: this.performanceTracker,
        signal: abortController.signal
      })

      // Initialize plugin with context
      await plugin.initialize(context)

      // Execute scraping
      const scrapeTimer = this.performanceTracker.startTimer('plugin_execution')
      const result = await plugin.execute(validUrls, request.options)
      const scrapeDuration = scrapeTimer.stop()

      // Report completion if streaming
      if (progressReporter) {
        await progressReporter.complete({
          executionId,
          duration: scrapeDuration,
          pagesScraped: result.pages.length,
          errors: result.errors.length
        })
      }

      // Clean up plugin
      await plugin.cleanup()

      const totalDuration = timer.stop()

      permanentLogger.info('SCRAPER_ORCHESTRATOR', 'Execution completed', {
        executionId,
        plugin: plugin.config.id,
        pagesScraped: result.pages.length,
        errors: result.errors.length,
        duration: totalDuration
      })

      return {
        success: result.errors.length === 0,
        executionId,
        sessionId: request.sessionId,
        scraperId: plugin.config.id,
        result,
        metrics: {
          duration: totalDuration,
          urlsProcessed: validUrls.length,
          pagesScraped: result.pages.length,
          errors: result.errors.length
        }
      }

    } catch (error) {
      permanentLogger.captureError('SCRAPER_ORCHESTRATOR', error as Error, {
        executionId,
        sessionId: request.sessionId,
        scraperId: request.scraperId
      })

      // Report error if streaming
      if (progressReporter) {
        await progressReporter.error(error as Error, { executionId })
      }

      throw error

    } finally {
      // Clean up
      timer.stop()
      this.activeExecutions.delete(executionId)
      if (progressReporter) {
        progressReporter.close()
      }
    }
  }

  /**
   * Cancel an active execution
   */
  cancelExecution(executionId: string): boolean {
    const controller = this.activeExecutions.get(executionId)
    if (controller) {
      controller.abort()
      this.activeExecutions.delete(executionId)

      permanentLogger.info('SCRAPER_ORCHESTRATOR', 'Execution cancelled', {
        executionId
      })

      return true
    }
    return false
  }

  /**
   * Select best plugin for a URL
   */
  private selectBestPlugin(url: string): ScraperPlugin | null {
    const plugins = this.registry.getAllPlugins()

    // Find plugins that can handle this URL
    const capable = plugins
      .filter(plugin => plugin.canHandle(url))
      .sort((a, b) => b.config.priority - a.config.priority)

    if (capable.length > 0) {
      permanentLogger.debug('SCRAPER_ORCHESTRATOR', 'Plugin selected', {
        url,
        selectedPlugin: capable[0].config.id,
        candidateCount: capable.length
      })
    }

    return capable[0] || null
  }
}
```

### 4. Unified Scraper Executor (REFACTOR) - `/lib/company-intelligence/core/unified-scraper-executor.ts`

```typescript
/**
 * Unified Scraper Executor - Simplified Orchestration Layer
 *
 * This is the main entry point for all scraping operations.
 * Delegates to the ScraperOrchestrator for actual execution.
 *
 * Responsibilities:
 * - Session management integration
 * - Lock management for deduplication
 * - Result caching
 * - Database interaction
 *
 * @module core/unified-scraper-executor
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { createClient } from '@/lib/supabase/server'
import { SessionManager } from './session-manager'
import { ExecutionLockManager } from './execution-lock-manager'
import { DataAggregator } from './data-aggregator'
import { ScraperRegistry } from '../scrapers/core/scraper-registry'
import { ScraperOrchestrator } from '../scrapers/core/scraper-orchestrator'
import { EventFactory } from '@/lib/realtime-events'
import { getSafeTimestamp } from '@/lib/utils/safe-timestamp'

export interface ExecutionRequest {
  sessionId: string
  domain: string
  scraperId: string
  urls: string[]
  options?: any
  stream?: boolean
  progressCallback?: (event: any) => Promise<void>
}

export interface ExecutionResult {
  success: boolean
  sessionId: string
  scraperId: string
  newData: {
    pages: number
    dataPoints: number
    discoveredLinks: number
    duration: number
  }
  pages?: any[]
  errors?: any[]
  cachedResult?: boolean
}

/**
 * Main executor for scraping operations
 * Simplified to delegate to orchestrator
 */
export class UnifiedScraperExecutor {
  private sessionManager: SessionManager
  private lockManager: ExecutionLockManager
  private aggregator: DataAggregator
  private registry: ScraperRegistry
  private orchestrator: ScraperOrchestrator
  private supabase: any

  constructor() {
    this.sessionManager = new SessionManager()
    this.lockManager = new ExecutionLockManager()
    this.aggregator = new DataAggregator()

    // Initialize plugin system
    this.registry = ScraperRegistry.getInstance()
    this.orchestrator = new ScraperOrchestrator(this.registry)

    // Initialize registry on construction
    this.initializeRegistry()
  }

  /**
   * Initialize the plugin registry
   */
  private async initializeRegistry(): Promise<void> {
    try {
      await this.registry.initialize()

      permanentLogger.info('UNIFIED_EXECUTOR', 'Registry initialized', {
        pluginCount: this.registry.getAllPlugins().length,
        plugins: this.registry.getAllPlugins().map(p => p.config.id)
      })
    } catch (error) {
      permanentLogger.captureError('UNIFIED_EXECUTOR', error as Error, {
        phase: 'registry_initialization'
      })
    }
  }

  /**
   * Execute scraping request
   */
  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const timer = permanentLogger.timing('unified_execution_total')
    const executionId = `unified_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    permanentLogger.breadcrumb('execution_start', 'Starting unified execution', {
      executionId,
      sessionId: request.sessionId,
      scraperId: request.scraperId,
      urlCount: request.urls?.length || 0
    })

    try {
      // 1. Session management
      let session = await this.sessionManager.getSession(request.sessionId)
      if (!session && request.domain) {
        const companyName = this.extractCompanyName(request.domain)
        session = await this.sessionManager.createSession(companyName, request.domain)
      }

      if (!session) {
        throw new Error('Failed to create or retrieve session')
      }

      // 2. Get URLs from database (database-first architecture)
      const { urls: urlsToScrape, metadata } = await this.getUrlsFromDatabase(
        session,
        request.urls
      )

      permanentLogger.info('UNIFIED_EXECUTOR', 'URLs resolved from database', {
        executionId,
        sessionId: request.sessionId,
        urlCount: urlsToScrape.length
      })

      // 3. Check cache
      const cached = await this.aggregator.getCachedResult(request.sessionId, executionId)
      if (cached) {
        permanentLogger.info('UNIFIED_EXECUTOR', 'Returning cached result', {
          executionId
        })
        return { ...cached, cachedResult: true }
      }

      // 4. Acquire execution lock
      const lock = await this.lockManager.acquireLock(
        request.sessionId,
        request.scraperId,
        urlsToScrape,
        60000, // 1 minute lock
        request.stream // Force new lock for streaming
      )

      if (!lock) {
        permanentLogger.info('UNIFIED_EXECUTOR', 'Execution already in progress', {
          executionId,
          sessionId: request.sessionId
        })

        // Return existing execution result
        const existing = await this.lockManager.getExistingResult(
          request.sessionId,
          request.scraperId
        )
        return existing || {
          success: false,
          sessionId: request.sessionId,
          scraperId: request.scraperId,
          newData: { pages: 0, dataPoints: 0, discoveredLinks: 0, duration: 0 },
          errors: ['Execution already in progress']
        }
      }

      // 5. Execute via orchestrator
      const orchestratorResult = await this.orchestrator.execute({
        sessionId: request.sessionId,
        companyId: session.company_id,
        scraperId: request.scraperId,
        urls: urlsToScrape,
        options: {
          ...request.options,
          urlMetadata: metadata
        },
        stream: request.stream,
        progressCallback: request.progressCallback
      })

      // 6. Aggregate results
      const aggregated = await this.aggregator.aggregate(
        orchestratorResult.result,
        request.sessionId
      )

      // 7. Store results
      await this.storeResults(session.id, orchestratorResult)

      // 8. Release lock
      await this.lockManager.releaseLock(lock.id)

      const duration = timer.stop()

      permanentLogger.info('UNIFIED_EXECUTOR', 'Execution completed', {
        executionId,
        sessionId: request.sessionId,
        duration,
        pagesScraped: orchestratorResult.result.pages.length
      })

      return {
        success: orchestratorResult.success,
        sessionId: request.sessionId,
        scraperId: orchestratorResult.scraperId,
        newData: {
          pages: orchestratorResult.result.pages.length,
          dataPoints: this.countDataPoints(orchestratorResult.result),
          discoveredLinks: orchestratorResult.result.discoveredLinks.length,
          duration
        },
        pages: orchestratorResult.result.pages,
        errors: orchestratorResult.result.errors
      }

    } catch (error) {
      permanentLogger.captureError('UNIFIED_EXECUTOR', error as Error, {
        executionId,
        sessionId: request.sessionId,
        scraperId: request.scraperId
      })

      throw error

    } finally {
      timer.stop()
    }
  }

  /**
   * Get URLs from database (database-first architecture)
   */
  private async getUrlsFromDatabase(
    session: any,
    explicitUrls?: string[]
  ): Promise<{ urls: string[], metadata: Map<string, any> }> {
    if (!this.supabase) {
      this.supabase = await createClient()
    }

    // If explicit URLs provided, validate they exist in DB
    if (explicitUrls && explicitUrls.length > 0) {
      const { data, error } = await this.supabase
        .from('company_urls')
        .select('*')
        .eq('session_id', session.id)
        .in('url', explicitUrls)

      if (error) {
        permanentLogger.captureError('UNIFIED_EXECUTOR', error, {
          sessionId: session.id,
          phase: 'url_validation'
        })
        throw error
      }

      const urls = data.map((d: any) => d.url)
      const metadata = new Map(data.map((d: any) => [d.url, d.metadata]))

      return { urls, metadata }
    }

    // Otherwise get all URLs for session
    const { data, error } = await this.supabase
      .from('company_urls')
      .select('*')
      .eq('session_id', session.id)
      .eq('should_scrape', true)
      .order('priority', { ascending: false })
      .limit(100)

    if (error) {
      permanentLogger.captureError('UNIFIED_EXECUTOR', error, {
        sessionId: session.id,
        phase: 'url_fetch'
      })
      throw error
    }

    const urls = data.map((d: any) => d.url)
    const metadata = new Map(data.map((d: any) => [d.url, d.metadata]))

    return { urls, metadata }
  }

  /**
   * Store results in database
   */
  private async storeResults(sessionId: string, result: any): Promise<void> {
    if (!this.supabase) {
      this.supabase = await createClient()
    }

    const { error } = await this.supabase
      .from('scraping_results')
      .insert({
        session_id: sessionId,
        scraper_id: result.scraperId,
        execution_id: result.executionId,
        pages_scraped: result.result.pages.length,
        errors: result.result.errors,
        discovered_links: result.result.discoveredLinks,
        duration_ms: result.metrics.duration,
        created_at: getSafeTimestamp()
      })

    if (error) {
      permanentLogger.captureError('UNIFIED_EXECUTOR', error, {
        sessionId,
        phase: 'result_storage'
      })
      // Don't throw - storage failure shouldn't break execution
    }
  }

  /**
   * Extract company name from domain
   */
  private extractCompanyName(domain: string): string {
    return domain
      .replace(/^(https?:\/\/)?(www\.)?/, '')
      .split('.')[0]
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
  }

  /**
   * Count data points in result
   */
  private countDataPoints(result: any): number {
    let count = 0

    result.pages.forEach((page: any) => {
      if (page.title) count++
      if (page.description) count++
      if (page.contactInfo?.emails?.length) count += page.contactInfo.emails.length
      if (page.contactInfo?.phones?.length) count += page.contactInfo.phones.length
      if (page.socialLinks) count += Object.keys(page.socialLinks).length
      if (page.technologies?.length) count += page.technologies.length
    })

    return count
  }
}
```

## Test Updates

### Update Test Files to Use New Architecture

All test files need to be updated to remove references to old executors:

```typescript
// test-real-scraping.ts - UPDATE
import { UnifiedScraperExecutor } from '@/lib/company-intelligence/core/unified-scraper-executor'

// Remove old imports:
// import { StaticScraperExecutor } from '../scrapers/executors/static-executor'
// import { DynamicScraperExecutor } from '../scrapers/executors/dynamic-executor'

async function testScraping() {
  const executor = new UnifiedScraperExecutor()

  const result = await executor.execute({
    sessionId: 'test-session',
    domain: 'example.com',
    scraperId: 'static-scraper', // Use plugin ID
    urls: ['https://example.com'],
    stream: false
  })

  console.log('Scraping result:', result)
}
```

## Migration Steps

### Phase 1: Create New Components (2 hours)
1. Create `progress-reporter.ts` with full implementation
2. Create `performance-tracker.ts` with full implementation
3. Update `scraper-orchestrator.ts` with new implementation
4. Verify all use unified EventFactory

### Phase 2: Refactor UnifiedScraperExecutor (2 hours)
1. Remove old executor imports
2. Add plugin registry initialization
3. Delegate to orchestrator
4. Ensure database-first URL loading
5. Remove all mock data/fallbacks

### Phase 3: Update Tests (1 hour)
1. Update `test-real-scraping.ts`
2. Update `test-phase1-error-throwing.ts`
3. Update `test-phase3-extractor-integration.ts`
4. Update `test-phase4-duplicate-removal.ts`
5. Archive obsolete test files

### Phase 4: Cleanup (1 hour)
1. Archive old executor files (already done)
2. Remove unused imports throughout codebase
3. Run `npm run manifest:update`
4. Test build: `npm run build`
5. Test execution: `npm run dev`

### Phase 5: Integration Testing (2 hours)
1. Test static scraping
2. Test dynamic scraping
3. Test streaming with progress
4. Test error scenarios
5. Verify no memory leaks

## Success Criteria

### Code Quality Metrics
- [ ] All files under 200 lines (target achieved)
- [ ] Zero code duplication
- [ ] 100% TypeScript coverage
- [ ] All errors use captureError (no error() calls)
- [ ] Unified EventFactory throughout

### Architecture Goals
- [ ] Plugin auto-discovery working
- [ ] Database-first URL loading enforced
- [ ] No mock data or fallbacks
- [ ] Proper separation of concerns
- [ ] Clean dependency injection

### Performance Targets
- [ ] 45% code reduction achieved
- [ ] Memory usage stable under load
- [ ] No memory leaks in streaming
- [ ] Progress deduplication working
- [ ] Timer cleanup functioning

### Testing Requirements
- [ ] All tests passing
- [ ] Build succeeds without errors
- [ ] Company Intelligence UI working
- [ ] Streaming progress visible
- [ ] Error handling robust

## File Size Summary

| File | Lines | Status |
|------|-------|--------|
| unified-scraper-executor.ts | 200 | Refactored |
| scraper-orchestrator.ts | 180 | Updated |
| scraper-registry.ts | 150 | Existing |
| progress-reporter.ts | 100 | New |
| performance-tracker.ts | 80 | New |
| **Total Core Files** | **710** | **Clean** |

## Implementation Checklist

- [ ] Create progress-reporter.ts
- [ ] Create performance-tracker.ts
- [ ] Update scraper-orchestrator.ts
- [ ] Refactor unified-scraper-executor.ts
- [ ] Update all test files
- [ ] Archive obsolete code
- [ ] Update PROJECT_MANIFEST.json
- [ ] Run integration tests
- [ ] Document new architecture
- [ ] Deploy and monitor

## Notes

1. **No Backwards Compatibility**: We're doing a clean break from the old architecture
2. **Database-First**: All URLs must come from the database, never from UI
3. **Error Visibility**: All errors thrown and logged, no silent failures
4. **Clean Code**: Every file focused on a single responsibility
5. **Extensibility**: New scrapers auto-discovered, no manual registration

This implementation plan provides the cleanest, most maintainable solution that fully embraces modern architecture patterns and the plugin system.