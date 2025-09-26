/**
 * Scraper Lifecycle Management
 *
 * Utilities for managing scraper plugin lifecycle including:
 * - Resource pooling
 * - Timeout management
 * - Retry logic
 * - Health checks
 *
 * @module base/scraper-lifecycle
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import type { ScraperPlugin, PluginStatus } from '../core/types'

/**
 * Lifecycle state for a scraper instance
 */
export interface ScraperLifecycleState {
  plugin: ScraperPlugin
  instanceId: string
  createdAt: number
  lastUsedAt: number
  useCount: number
  errors: number
  status: PluginStatus
}

/**
 * Options for lifecycle management
 */
export interface LifecycleOptions {
  maxIdleTime?: number      // Max idle time before cleanup (ms)
  maxUseCount?: number      // Max uses before refresh
  maxErrors?: number        // Max errors before marking unhealthy
  healthCheckInterval?: number // Interval for health checks (ms)
}

/**
 * Manages lifecycle of scraper plugins
 * Handles resource management and health monitoring
 */
export class ScraperLifecycleManager {
  private instances = new Map<string, ScraperLifecycleState>()
  private healthCheckTimer?: NodeJS.Timeout
  private readonly options: Required<LifecycleOptions>

  constructor(options: LifecycleOptions = {}) {
    this.options = {
      maxIdleTime: options.maxIdleTime ?? 300000, // 5 minutes
      maxUseCount: options.maxUseCount ?? 100,
      maxErrors: options.maxErrors ?? 5,
      healthCheckInterval: options.healthCheckInterval ?? 60000 // 1 minute
    }

    // Start health monitoring
    this.startHealthMonitoring()
  }

  /**
   * Register a scraper plugin for lifecycle management
   */
  register(plugin: ScraperPlugin): string {
    const instanceId = `${plugin.config.id}_${Date.now()}`

    const state: ScraperLifecycleState = {
      plugin,
      instanceId,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      useCount: 0,
      errors: 0,
      status: plugin.getStatus()
    }

    this.instances.set(instanceId, state)

    permanentLogger.info('LIFECYCLE_MANAGER', 'Plugin registered', {
      instanceId,
      pluginId: plugin.config.id,
      pluginName: plugin.config.name
    })

    return instanceId
  }

  /**
   * Get a healthy instance of a plugin
   */
  async getInstance(instanceId: string): Promise<ScraperPlugin | null> {
    const state = this.instances.get(instanceId)

    if (!state) {
      permanentLogger.warn('LIFECYCLE_MANAGER', 'Instance not found', {
        instanceId
      })
      return null
    }

    // Check if instance needs refresh
    if (this.needsRefresh(state)) {
      permanentLogger.breadcrumb('instance_refresh', 'Instance needs refresh', {
        instanceId,
        reason: this.getRefreshReason(state)
      })
      await this.refreshInstance(state)
    }

    // Update usage
    state.lastUsedAt = Date.now()
    state.useCount++

    return state.plugin
  }

  /**
   * Report an error for an instance
   */
  reportError(instanceId: string, error: Error): void {
    const state = this.instances.get(instanceId)

    if (state) {
      state.errors++

      permanentLogger.warn('LIFECYCLE_MANAGER', 'Error reported for instance', {
        instanceId,
        errorCount: state.errors,
        maxErrors: this.options.maxErrors,
        error: error.message
      })

      // Mark as unhealthy if too many errors
      if (state.errors >= this.options.maxErrors) {
        this.markUnhealthy(state)
      }
    }
  }

  /**
   * Report success for an instance
   */
  reportSuccess(instanceId: string): void {
    const state = this.instances.get(instanceId)

    if (state) {
      // Reset error count on success
      if (state.errors > 0) {
        permanentLogger.breadcrumb('errors_cleared', 'Errors cleared after success', {
          instanceId,
          previousErrors: state.errors
        })
        state.errors = 0
      }
    }
  }

  /**
   * Clean up an instance
   */
  async cleanup(instanceId: string): Promise<void> {
    const state = this.instances.get(instanceId)

    if (state) {
      try {
        await state.plugin.cleanup()
        this.instances.delete(instanceId)

        permanentLogger.info('LIFECYCLE_MANAGER', 'Instance cleaned up', {
          instanceId,
          pluginId: state.plugin.config.id,
          lifetime: Date.now() - state.createdAt,
          totalUses: state.useCount
        })
      } catch (error) {
        permanentLogger.captureError('LIFECYCLE_MANAGER', error as Error, {
          instanceId,
          phase: 'cleanup'
        })
      }
    }
  }

  /**
   * Clean up all instances
   */
  async cleanupAll(): Promise<void> {
    permanentLogger.info('LIFECYCLE_MANAGER', 'Cleaning up all instances', {
      instanceCount: this.instances.size
    })

    // Stop health monitoring
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = undefined
    }

    // Clean up all instances
    const cleanupPromises = Array.from(this.instances.keys()).map(id =>
      this.cleanup(id)
    )

    await Promise.all(cleanupPromises)
  }

  /**
   * Get statistics about managed instances
   */
  getStats(): {
    totalInstances: number
    healthyInstances: number
    unhealthyInstances: number
    idleInstances: number
  } {
    const now = Date.now()
    let healthy = 0
    let unhealthy = 0
    let idle = 0

    for (const state of this.instances.values()) {
      const status = state.plugin.getStatus()

      if (!status.ready || state.errors >= this.options.maxErrors) {
        unhealthy++
      } else {
        healthy++
      }

      if (now - state.lastUsedAt > this.options.maxIdleTime) {
        idle++
      }
    }

    return {
      totalInstances: this.instances.size,
      healthyInstances: healthy,
      unhealthyInstances: unhealthy,
      idleInstances: idle
    }
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck()
    }, this.options.healthCheckInterval)
  }

  /**
   * Perform health check on all instances
   */
  private async performHealthCheck(): Promise<void> {
    const now = Date.now()
    const toCleanup: string[] = []

    for (const [id, state] of this.instances.entries()) {
      // Check for idle instances
      if (now - state.lastUsedAt > this.options.maxIdleTime) {
        permanentLogger.breadcrumb('idle_instance', 'Instance idle too long', {
          instanceId: id,
          idleTime: now - state.lastUsedAt
        })
        toCleanup.push(id)
        continue
      }

      // Update status
      state.status = state.plugin.getStatus()
    }

    // Clean up idle instances
    for (const id of toCleanup) {
      await this.cleanup(id)
    }

    if (toCleanup.length > 0) {
      permanentLogger.info('LIFECYCLE_MANAGER', 'Health check completed', {
        cleanedUp: toCleanup.length,
        remaining: this.instances.size
      })
    }
  }

  /**
   * Check if instance needs refresh
   */
  private needsRefresh(state: ScraperLifecycleState): boolean {
    return state.useCount >= this.options.maxUseCount ||
           state.errors >= this.options.maxErrors ||
           !state.plugin.getStatus().ready
  }

  /**
   * Get reason for refresh
   */
  private getRefreshReason(state: ScraperLifecycleState): string {
    if (state.useCount >= this.options.maxUseCount) {
      return 'max_use_count'
    }
    if (state.errors >= this.options.maxErrors) {
      return 'max_errors'
    }
    if (!state.plugin.getStatus().ready) {
      return 'not_ready'
    }
    return 'unknown'
  }

  /**
   * Refresh an instance
   */
  private async refreshInstance(state: ScraperLifecycleState): Promise<void> {
    try {
      // Clean up old instance
      await state.plugin.cleanup()

      // Reset counters
      state.useCount = 0
      state.errors = 0
      state.createdAt = Date.now()
      state.lastUsedAt = Date.now()

      permanentLogger.info('LIFECYCLE_MANAGER', 'Instance refreshed', {
        instanceId: state.instanceId,
        pluginId: state.plugin.config.id
      })
    } catch (error) {
      permanentLogger.captureError('LIFECYCLE_MANAGER', error as Error, {
        instanceId: state.instanceId,
        phase: 'refresh'
      })
    }
  }

  /**
   * Mark instance as unhealthy
   */
  private markUnhealthy(state: ScraperLifecycleState): void {
    permanentLogger.warn('LIFECYCLE_MANAGER', 'Instance marked unhealthy', {
      instanceId: state.instanceId,
      pluginId: state.plugin.config.id,
      errors: state.errors
    })

    // Update status to reflect unhealthy state
    state.status = {
      ready: false,
      busy: false,
      initialized: false,
      healthy: false
    }
  }
}

/**
 * Global lifecycle manager instance
 */
export const globalLifecycleManager = new ScraperLifecycleManager()

/**
 * Decorator for automatic lifecycle management
 * Can be applied to scraper plugin methods
 */
export function withLifecycle(instanceId: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const manager = globalLifecycleManager

      try {
        // Get healthy instance
        const instance = await manager.getInstance(instanceId)

        if (!instance) {
          throw new Error(`Instance ${instanceId} not available`)
        }

        // Execute method
        const result = await originalMethod.apply(this, args)

        // Report success
        manager.reportSuccess(instanceId)

        return result
      } catch (error) {
        // Report error
        manager.reportError(instanceId, error as Error)
        throw error
      }
    }

    return descriptor
  }
}