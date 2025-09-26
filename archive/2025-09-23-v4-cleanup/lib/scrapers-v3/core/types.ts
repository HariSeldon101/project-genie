/**
 * Core Types for v3 Scrapers
 *
 * PHILOSOPHY:
 * - Minimal type definitions
 * - No complex validation (services handle it)
 * - Focus on data flow, not implementation
 *
 * These types are intentionally simple - complexity is handled by native services
 */

import type { FirecrawlConfig } from '../config/firecrawl.config'
import type { PlaywrightConfig } from '../config/playwright.config'

/**
 * Scraper types available
 */
export enum ScraperType {
  FIRECRAWL = 'firecrawl',
  PLAYWRIGHT = 'playwright',
  CHEERIO = 'cheerio'
}

/**
 * Scraper status
 */
export enum ScraperStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  COMPLETE = 'complete',
  FAILED = 'failed'
}

/**
 * Base scraper result
 */
export interface ScraperResult {
  success: boolean
  scraper: ScraperType
  data?: any
  error?: string
  cost: number
  duration: number
  metadata?: Record<string, any>
}

/**
 * URL discovery result
 */
export interface DiscoveryResult {
  domain: string
  urls: string[]
  sitemapFound: boolean
  robotsTxtFound: boolean
  duration: number
}

/**
 * Scraper configuration union
 */
export type ScraperConfig = FirecrawlConfig | PlaywrightConfig | null

/**
 * Progress event for streaming
 */
export interface ProgressEvent {
  type: 'discovery' | 'scraping' | 'extraction' | 'complete' | 'error'
  scraper: ScraperType
  progress?: number
  message?: string
  data?: any
}

/**
 * Quality metrics (simplified)
 */
export interface QualityMetrics {
  score: number        // 0-100
  completeness: number // 0-100
  accuracy: number     // 0-100
  dataPoints: number   // Count of extracted fields
}

/**
 * Cost breakdown
 */
export interface CostBreakdown {
  scraper: ScraperType
  pages: number
  costPerPage: number
  totalCost: number
  features: string[]
}

/**
 * Scraper capabilities
 */
export interface ScraperCapabilities {
  urlDiscovery: boolean
  schemaExtraction: boolean
  javascriptRendering: boolean
  screenshots: boolean
  pdfGeneration: boolean
  antiDetection: boolean
  proxySupport: boolean
  sessionPersistence: boolean
}

/**
 * Get scraper capabilities
 */
export function getScraperCapabilities(type: ScraperType): ScraperCapabilities {
  switch (type) {
    case ScraperType.FIRECRAWL:
      return {
        urlDiscovery: true,
        schemaExtraction: true,
        javascriptRendering: true,
        screenshots: true,
        pdfGeneration: true,
        antiDetection: true,
        proxySupport: true,
        sessionPersistence: false
      }

    case ScraperType.PLAYWRIGHT:
      return {
        urlDiscovery: false,
        schemaExtraction: false,
        javascriptRendering: true,
        screenshots: true,
        pdfGeneration: true,
        antiDetection: true,
        proxySupport: true,
        sessionPersistence: true
      }

    case ScraperType.CHEERIO:
      return {
        urlDiscovery: false,
        schemaExtraction: false,
        javascriptRendering: false,
        screenshots: false,
        pdfGeneration: false,
        antiDetection: false,
        proxySupport: false,
        sessionPersistence: false
      }
  }
}

/**
 * Estimate cost for scraping
 */
export function estimateCost(
  scraper: ScraperType,
  pages: number,
  features: string[] = []
): number {
  let costPerPage = 0

  switch (scraper) {
    case ScraperType.FIRECRAWL:
      costPerPage = 0.05 // Base
      if (features.includes('extract')) costPerPage += 0.10
      if (features.includes('screenshots')) costPerPage += 0.02
      if (features.includes('pdf')) costPerPage += 0.03
      if (features.includes('proxy')) costPerPage += 0.10
      if (features.includes('llm')) costPerPage += 0.40
      break

    case ScraperType.PLAYWRIGHT:
      costPerPage = 0.01 // Base
      if (features.includes('proxy')) costPerPage += 0.05
      if (features.includes('screenshots')) costPerPage += 0.001
      if (features.includes('pdf')) costPerPage += 0.001
      break

    case ScraperType.CHEERIO:
      costPerPage = 0.001 // Minimal cost
      break
  }

  return costPerPage * pages
}

/**
 * Get recommended scraper for use case
 */
export function getRecommendedScraper(requirements: {
  needsJavaScript?: boolean
  needsExtraction?: boolean
  needsDiscovery?: boolean
  needsAntiDetection?: boolean
  budget?: number
}): ScraperType {
  // If discovery needed, Firecrawl is best
  if (requirements.needsDiscovery) {
    return ScraperType.FIRECRAWL
  }

  // If extraction needed, Firecrawl is best
  if (requirements.needsExtraction) {
    return ScraperType.FIRECRAWL
  }

  // If anti-detection critical, Playwright is best
  if (requirements.needsAntiDetection && requirements.needsJavaScript) {
    return ScraperType.PLAYWRIGHT
  }

  // If JavaScript needed but not extraction
  if (requirements.needsJavaScript) {
    return ScraperType.PLAYWRIGHT
  }

  // For simple HTML, use Cheerio
  return ScraperType.CHEERIO
}