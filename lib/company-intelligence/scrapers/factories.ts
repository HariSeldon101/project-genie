/**
 * Factory functions for V4 scrapers
 * Created: 2025-01-28
 * Purpose: Bridge between class-based scrapers and factory pattern usage
 *
 * The V4 API routes expect factory functions but our enhanced scrapers
 * export classes. This adapter provides the factory interface.
 *
 * @version 1.0.0
 * @migration Company Intelligence V3 → V4 Migration
 */

import { FirecrawlStreamingScraperEnhanced, type FirecrawlAdvancedConfig } from './firecrawl-enhanced'
import { PlaywrightStreamingScraperEnhanced, type PlaywrightAdvancedConfig } from './playwright-enhanced'

/**
 * Creates a Firecrawl scraper instance
 * @param config - Scraper configuration
 * @param sessionId - CI session identifier
 * @param correlationId - Request correlation ID for tracing
 * @param supabase - Supabase client instance
 * @returns FirecrawlStreamingScraperEnhanced instance
 */
export function createFirecrawlScraper(
  config: any, // Use any for flexibility - the scraper will validate
  sessionId: string,
  correlationId: string,
  supabase: any
) {
  return new FirecrawlStreamingScraperEnhanced(config as FirecrawlAdvancedConfig, sessionId, correlationId, supabase)
}

/**
 * Creates a Playwright scraper instance
 * @param config - Scraper configuration
 * @param sessionId - CI session identifier
 * @param correlationId - Request correlation ID for tracing
 * @param supabase - Supabase client instance
 * @returns PlaywrightStreamingScraperEnhanced instance
 */
export function createPlaywrightScraper(
  config: any, // Use any for flexibility - the scraper will validate
  sessionId: string,
  correlationId: string,
  supabase: any
) {
  return new PlaywrightStreamingScraperEnhanced(config as PlaywrightAdvancedConfig, sessionId, correlationId, supabase)
}

// Re-export with alternative names for compatibility
export { createFirecrawlScraper as createFirecrawlStreamingScraper }
export { createPlaywrightScraper as createPlaywrightStreamingScraper }