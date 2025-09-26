/**
 * Performance Tracker
 *
 * Centralized performance measurement for scraping operations.
 * Integrates with permanentLogger for timing metrics.
 *
 * Features:
 * - Nested timing support with checkpoints
 * - Automatic cleanup of old timers to prevent memory leaks
 * - Memory usage tracking
 * - Performance aggregation for analytics
 *
 * @module utils/performance-tracker
 */

import { permanentLogger, type TimingHandle } from '@/lib/utils/permanent-logger'

export interface PerformanceMetrics {
  duration: number
  memoryUsed: number
  cpuPercent?: number
  operations: number
  averageTime: number
}

/**
 * Tracks performance metrics for scraping operations
 * Provides timing, memory tracking, and performance aggregation
 */
export class PerformanceTracker {
  private timers = new Map<string, number>()
  private metrics = new Map<string, PerformanceMetrics>()
  private operationCounts = new Map<string, number>()
  private readonly maxTimerAge = 5 * 60 * 1000 // 5 minutes max timer age
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Cleanup old timers every minute to prevent memory leaks
    this.cleanupInterval = setInterval(() => this.cleanupOldTimers(), 60000)

    // Breadcrumb at initialization
    permanentLogger.breadcrumb('performance_tracker_init', 'PerformanceTracker initialized', {
      maxTimerAge: this.maxTimerAge
    })
  }

  /**
   * Start a timer with automatic permanentLogger integration
   * Returns a handle with stop(), cancel(), and checkpoint() methods
   */
  startTimer(label: string, metadata?: Record<string, any>): TimingHandle {
    // Prefix with scraper for consistency
    const fullLabel = `scraper_${label}`

    // Use permanentLogger's built-in timing feature (DRY principle)
    const handle = permanentLogger.timing(fullLabel, metadata)

    // Track locally for aggregation purposes
    const startTime = performance.now()
    this.timers.set(label, startTime)

    // Increment operation count for averaging
    const currentCount = this.operationCounts.get(label) || 0
    this.operationCounts.set(label, currentCount + 1)

    // Return enhanced handle with proper cleanup
    return {
      stop: () => {
        const duration = handle.stop()
        this.recordMetric(label, duration)
        this.timers.delete(label) // Clean up after stopping
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
   * Get aggregated metrics for a specific label
   * Returns undefined if no metrics exist for the label
   */
  getMetrics(label: string): PerformanceMetrics | undefined {
    return this.metrics.get(label)
  }

  /**
   * Get all metrics for reporting/analysis
   * Returns a copy to prevent external modification
   */
  getAllMetrics(): Map<string, PerformanceMetrics> {
    return new Map(this.metrics)
  }

  /**
   * Reset metrics for a specific label
   * Useful for starting fresh measurements
   */
  resetMetrics(label: string): void {
    this.metrics.delete(label)
    this.operationCounts.delete(label)
    this.timers.delete(label)

    permanentLogger.debug('PERFORMANCE_TRACKER', 'Metrics reset', { label })
  }

  /**
   * Reset all metrics
   * Useful for testing or starting a new session
   */
  resetAllMetrics(): void {
    this.metrics.clear()
    this.operationCounts.clear()
    this.timers.clear()

    permanentLogger.info('PERFORMANCE_TRACKER', 'All metrics reset')
  }

  /**
   * Get current memory usage
   * Returns Node.js memory usage statistics
   */
  getMemoryUsage(): NodeJS.MemoryUsage {
    return process.memoryUsage()
  }

  /**
   * Clean up resources when done
   * Important to call this to stop the cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.resetAllMetrics()

    permanentLogger.info('PERFORMANCE_TRACKER', 'PerformanceTracker destroyed')
  }

  /**
   * Record a metric internally
   * Updates running averages and totals
   */
  private recordMetric(label: string, duration: number): void {
    const existing = this.metrics.get(label)
    const operations = this.operationCounts.get(label) || 1

    if (existing) {
      // Update with running average (avoid skewing from outliers)
      const totalDuration = existing.duration + duration
      const averageTime = totalDuration / operations

      this.metrics.set(label, {
        duration: totalDuration,
        memoryUsed: process.memoryUsage().heapUsed,
        operations,
        averageTime
      })
    } else {
      // Create new metric entry
      this.metrics.set(label, {
        duration,
        memoryUsed: process.memoryUsage().heapUsed,
        operations: 1,
        averageTime: duration
      })
    }

    // Log significant operations (over 5 seconds)
    if (duration > 5000) {
      permanentLogger.info('PERFORMANCE_TRACKER', 'Slow operation detected', {
        label,
        duration,
        operations
      })
    }
  }

  /**
   * Clean up old timers to prevent memory leaks
   * Runs automatically every minute
   */
  private cleanupOldTimers(): void {
    const now = performance.now()
    const expired: string[] = []

    // Find expired timers
    this.timers.forEach((startTime, label) => {
      if (now - startTime > this.maxTimerAge) {
        expired.push(label)
      }
    })

    // Clean up expired timers
    if (expired.length > 0) {
      expired.forEach(label => {
        this.timers.delete(label)
        permanentLogger.debug('PERFORMANCE_TRACKER', 'Cleaned up expired timer', { label })
      })

      permanentLogger.info('PERFORMANCE_TRACKER', 'Timer cleanup completed', {
        cleanedCount: expired.length,
        remainingTimers: this.timers.size
      })
    }
  }
}