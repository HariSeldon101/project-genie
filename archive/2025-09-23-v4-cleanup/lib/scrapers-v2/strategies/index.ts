/**
 * Scraper Strategies Module Exports
 * 
 * Central export point for all scraping strategies
 * 
 * @module strategies
 */

// Base strategy and types
export { BaseStrategy, DEFAULT_STRATEGY_CONFIG } from './base-strategy'
export type { StrategyConfig, ScrapingResult } from './base-strategy'

// Specific strategies
export { StaticStrategy } from './static-strategy'
export { DynamicStrategy } from './dynamic-strategy'
export { SPAStrategy } from './spa-strategy'

// Strategy manager
export { StrategyManager } from './strategy-manager'
export type { ManagerConfig, BulkScrapingResult } from './strategy-manager'

/**
 * Quick strategy factory
 * 
 * @param type - Strategy type
 * @param config - Strategy configuration
 * @returns Strategy instance
 */
export function createStrategy(
  type: 'static' | 'dynamic' | 'spa' | 'auto',
  config?: StrategyConfig
) {
  switch (type) {
    case 'static':
      return new StaticStrategy(config)
    case 'dynamic':
      return new DynamicStrategy(config)
    case 'spa':
      return new SPAStrategy(config)
    case 'auto':
    default:
      return new StrategyManager(config)
  }
}