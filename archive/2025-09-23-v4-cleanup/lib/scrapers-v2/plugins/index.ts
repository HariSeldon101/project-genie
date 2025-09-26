/**
 * Central Plugin Registry
 *
 * This is the SINGLE SOURCE OF TRUTH for all scraper plugins.
 * All plugins MUST be exported from this file to be available in the system.
 *
 * To add a new scraper plugin:
 * 1. Create your plugin folder under /plugins (e.g., /plugins/myscraper)
 * 2. Implement the ScraperPlugin interface in /plugins/myscraper/index.ts
 * 3. Export it from this file: export { default as MyScraperPlugin } from './myscraper'
 * 4. The registry will automatically pick it up on next build
 *
 * Benefits of this approach:
 * - Next.js/Webpack compatible (no runtime filesystem access)
 * - Type-safe with full TypeScript support
 * - Tree-shaking enabled for unused plugins
 * - No build scripts or manifest generation needed
 * - Works in all environments (dev, production, serverless)
 *
 * @module plugins/index
 */

// Export all available scraper plugins
// These are loaded statically at build time for Next.js compatibility
export { default as StaticScraperPlugin } from './static'
export { default as DynamicScraperPlugin } from './dynamic'
export { default as FirecrawlScraperPlugin } from './firecrawl'

// When adding new plugins, follow the same pattern:
// export { default as NewScraperPlugin } from './newscraper'