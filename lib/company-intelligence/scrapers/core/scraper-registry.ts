/**
 * Scraper Registry - Plugin Management System
 *
 * Singleton registry that manages all scraper plugins using static imports.
 * New scrapers are registered by exporting from plugins/index.ts
 *
 * Key Features:
 * - Static plugin registration (Next.js/Webpack compatible)
 * - Priority-based scraper selection for URLs
 * - Comprehensive logging and error handling
 * - No mock data or fallbacks - errors bubble up
 *
 * @module core/scraper-registry
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import * as AllPlugins from '../plugins' // Static import all plugins
import type {
  ScraperPlugin,
  ScraperConfig,
  RegistryOptions
} from './types'
import { ScraperConfigSchema } from './types'

/**
 * Plugin registry for auto-discovery and management
 * Implements singleton pattern for global access
 */
export class ScraperRegistry {
  private static instance: ScraperRegistry
  private plugins = new Map<string, ScraperPlugin>()
  private initialized = false
  private initializationError?: Error
  private options: RegistryOptions

  /**
   * Private constructor for singleton pattern
   */
  private constructor(options: RegistryOptions = {}) {
    // No filesystem options needed for static imports
    this.options = options
  }

  /**
   * Get singleton instance
   * @param options - Optional registry configuration
   */
  static getInstance(options?: RegistryOptions): ScraperRegistry {
    if (!this.instance) {
      this.instance = new ScraperRegistry(options)
    }
    return this.instance
  }

  /**
   * Initialize registry with static plugins
   * Uses compile-time imports for Next.js compatibility
   */
  async initialize(): Promise<void> {
    // Guard against multiple initialization
    if (this.initialized) {
      permanentLogger.breadcrumb('registry_skip', 'Registry already initialized', {
        pluginCount: this.plugins.size
      })
      return
    }

    const startTime = performance.now()
    permanentLogger.info('SCRAPER_REGISTRY', 'Initializing plugin registry', {
      mode: 'static-imports'
    })

    try {
      // Load all plugins from static imports
      await this.loadStaticPlugins()

      this.initialized = true
      const duration = performance.now() - startTime

      permanentLogger.info('SCRAPER_REGISTRY', 'Registry initialized successfully', {
        pluginCount: this.plugins.size,
        plugins: Array.from(this.plugins.keys()),
        duration,
        discoveredPlugins: this.getPluginSummary()
      })
    } catch (error) {
      this.initializationError = error as Error

      // Log error but don't throw - let errors bubble up properly
      permanentLogger.captureError('SCRAPER_REGISTRY', error as Error, {
        phase: 'initialization'
      })

      throw error // Re-throw for proper error handling
    }
  }

  /**
   * Load all plugins from static imports
   * This replaces the filesystem discovery mechanism
   */
  private async loadStaticPlugins(): Promise<void> {
    permanentLogger.breadcrumb('plugin_discovery', 'Loading static plugins', {
      source: 'compiled-imports'
    })

    const pluginEntries = Object.entries(AllPlugins)

    permanentLogger.breadcrumb('plugins_found', 'Found plugin exports', {
      count: pluginEntries.length,
      names: pluginEntries.map(([name]) => name)
    })

    // Load each plugin from static exports
    for (const [exportName, PluginClass] of pluginEntries) {
      await this.loadPlugin(exportName, PluginClass as any)
    }
  }

  /**
   * Load a single plugin from static import
   * Validates plugin before registration
   */
  private async loadPlugin(name: string, PluginClass: any): Promise<void> {
    permanentLogger.breadcrumb('plugin_load', `Loading plugin: ${name}`, {
      name
    })

    try {
      // Validate plugin class
      if (!this.isValidPluginClass(PluginClass)) {
        throw new Error(`Invalid plugin class structure in ${name}`)
      }

      // Instantiate plugin
      const plugin = new PluginClass() as ScraperPlugin

      // Validate plugin instance
      if (!this.isValidPlugin(plugin)) {
        throw new Error(`Plugin ${name} does not implement ScraperPlugin interface`)
      }

      // Register the plugin
      this.register(plugin)

      permanentLogger.info('SCRAPER_REGISTRY', `Plugin loaded: ${name}`, {
        id: plugin.config.id,
        strategy: plugin.config.strategy,
        priority: plugin.config.priority
      })
    } catch (error) {
      permanentLogger.captureError('SCRAPER_REGISTRY', error as Error, {
        phase: 'plugin_load',
        plugin: name
      })
      // Don't throw - continue loading other plugins
    }
  }

  /**
   * Validate if a class is a valid plugin class
   */
  private isValidPluginClass(PluginClass: any): boolean {
    // Check if it's a class/constructor function
    if (typeof PluginClass !== 'function') {
      return false
    }

    // Create a test instance to check methods
    try {
      const testInstance = new PluginClass()
      return (
        typeof testInstance.execute === 'function' &&
        typeof testInstance.initialize === 'function' &&
        typeof testInstance.cleanup === 'function' &&
        typeof testInstance.canHandle === 'function' &&
        typeof testInstance.estimateTime === 'function' &&
        typeof testInstance.getStatus === 'function' &&
        testInstance.config && typeof testInstance.config === 'object'
      )
    } catch {
      return false
    }
  }

  /**
   * Validate if an instance is a valid plugin
   */
  private isValidPlugin(plugin: any): plugin is ScraperPlugin {
    return (
      plugin &&
      typeof plugin === 'object' &&
      'config' in plugin &&
      typeof plugin.config === 'object' &&
      typeof plugin.initialize === 'function' &&
      typeof plugin.execute === 'function' &&
      typeof plugin.cleanup === 'function' &&
      typeof plugin.canHandle === 'function' &&
      typeof plugin.estimateTime === 'function' &&
      typeof plugin.getStatus === 'function'
    )
  }

  /**
   * Register a scraper plugin
   * Validates configuration before registration
   */
  register(plugin: ScraperPlugin): void {
    try {
      // Validate configuration with Zod
      const validConfig = ScraperConfigSchema.parse(plugin.config)

      permanentLogger.breadcrumb('plugin_register', `Registering plugin: ${validConfig.name}`, {
        id: validConfig.id,
        strategy: validConfig.strategy,
        priority: validConfig.priority
      })

      // Check for duplicate IDs
      if (this.plugins.has(validConfig.id)) {
        permanentLogger.warn('SCRAPER_REGISTRY', `Plugin ID already registered: ${validConfig.id}`, {
          existing: this.plugins.get(validConfig.id)?.config.name,
          new: validConfig.name
        })
      }

      this.plugins.set(validConfig.id, plugin)

      permanentLogger.info('SCRAPER_REGISTRY', `Plugin registered: ${validConfig.name}`, {
        id: validConfig.id,
        totalPlugins: this.plugins.size
      })
    } catch (error) {
      permanentLogger.captureError('SCRAPER_REGISTRY', error as Error, {
        phase: 'plugin_register',
        pluginId: plugin.config?.id
      })
      throw error
    }
  }

  /**
   * Get the best scraper for a URL
   * Selects based on canHandle() and priority
   */
  getBestScraper(url: string): ScraperPlugin | null {
    permanentLogger.breadcrumb('scraper_select', 'Selecting scraper for URL', {
      url,
      availablePlugins: this.plugins.size
    })

    // Find all scrapers that can handle this URL
    const capableScrapers = Array.from(this.plugins.values())
      .filter(plugin => {
        try {
          return plugin.canHandle(url)
        } catch (error) {
          permanentLogger.captureError('SCRAPER_REGISTRY', error as Error, {
            phase: 'can_handle_check',
            pluginId: plugin.config.id,
            url
          })
          return false
        }
      })
      .sort((a, b) => b.config.priority - a.config.priority)

    const selected = capableScrapers[0] || null

    if (selected) {
      permanentLogger.info('SCRAPER_REGISTRY', 'Scraper selected', {
        url,
        selectedId: selected.config.id,
        selectedName: selected.config.name,
        priority: selected.config.priority,
        capableCount: capableScrapers.length
      })
    } else {
      permanentLogger.warn('SCRAPER_REGISTRY', 'No suitable scraper found', {
        url,
        availablePlugins: this.plugins.size
      })
    }

    return selected
  }

  /**
   * Get scraper by ID
   */
  getScraperById(id: string): ScraperPlugin | undefined {
    return this.plugins.get(id)
  }

  /**
   * Get all registered scrapers
   */
  getAllScrapers(): ScraperPlugin[] {
    return Array.from(this.plugins.values())
  }

  /**
   * Get plugin summary for logging
   */
  private getPluginSummary(): Record<string, any> {
    const summary: Record<string, any> = {}

    this.plugins.forEach((plugin, id) => {
      summary[id] = {
        name: plugin.config.name,
        strategy: plugin.config.strategy,
        priority: plugin.config.priority,
        speed: plugin.config.speed,
        requiresBrowser: plugin.config.requiresBrowser
      }
    })

    return summary
  }

  /**
   * Check if registry is initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Get initialization error if any
   */
  getInitializationError(): Error | undefined {
    return this.initializationError
  }

  /**
   * Clear all registered plugins
   * Useful for testing
   */
  clear(): void {
    permanentLogger.breadcrumb('registry_clear', 'Clearing all plugins', {
      previousCount: this.plugins.size
    })

    this.plugins.clear()
    this.initialized = false
    this.initializationError = undefined
  }

  /**
   * Reset singleton instance
   * Useful for testing
   */
  static reset(): void {
    if (this.instance) {
      this.instance.clear()
    }
    this.instance = null as any
  }
}