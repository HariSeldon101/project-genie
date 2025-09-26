/**
 * Branded types and type utilities for compile-time safety
 *
 * @module scrapers-v2/core/types
 * @description Provides branded types to prevent primitive obsession
 * and ensure type safety at compile time. These types enforce correct
 * usage of IDs and values throughout the scraping system.
 *
 * DESIGN PATTERNS:
 * - Branded Types: Prevent accidental mixing of string types
 * - Type Guards: Runtime validation with compile-time benefits
 * - Const Assertions: Immutable configuration values
 *
 * COMPLIANCE:
 * - No mock data or fallbacks
 * - Strict validation in constructors
 * - Full TypeScript strict mode compatibility
 */

import { ScraperType } from '@/lib/company-intelligence/types/scraping-enums'

/**
 * Branded type for Session IDs
 * Prevents accidental use of regular strings as session IDs
 */
export type SessionId = string & { __brand: 'SessionId' }

/**
 * Branded type for Company IDs
 * Ensures company IDs are validated UUIDs
 */
export type CompanyId = string & { __brand: 'CompanyId' }

/**
 * Branded type for Scraper IDs
 * Unique identifier for scraper instances
 */
export type ScraperId = string & { __brand: 'ScraperId' }

/**
 * Branded type for URLs
 * Ensures URLs are properly validated
 */
export type Url = string & { __brand: 'Url' }

/**
 * Create a validated SessionId
 * @param id - UUID string to validate
 * @returns Branded SessionId
 * @throws Error if not a valid UUID
 */
export const SessionId = (id: string): SessionId => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    throw new Error(`Invalid session ID format: ${id}`)
  }
  return id as SessionId
}

/**
 * Create a validated CompanyId
 * @param id - UUID string to validate
 * @returns Branded CompanyId
 * @throws Error if not a valid UUID
 */
export const CompanyId = (id: string): CompanyId => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    throw new Error(`Invalid company ID format: ${id}`)
  }
  return id as CompanyId
}

/**
 * Create a validated ScraperId
 * @param id - UUID string to validate
 * @returns Branded ScraperId
 * @throws Error if not a valid UUID
 */
export const ScraperId = (id: string): ScraperId => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    throw new Error(`Invalid scraper ID format: ${id}`)
  }
  return id as ScraperId
}

/**
 * Create a validated URL
 * @param url - URL string to validate
 * @returns Branded Url
 * @throws Error if not a valid URL
 */
export const Url = (url: string): Url => {
  try {
    const parsed = new URL(url)
    // Only allow HTTP and HTTPS protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error(`Invalid protocol: ${parsed.protocol}`)
    }
    return url as Url
  } catch (error) {
    throw new Error(`Invalid URL format: ${url}`)
  }
}

/**
 * Exhaustiveness checking for switch statements
 * Ensures all enum cases are handled
 * @param x - Value that should never be reached
 * @throws Error with the unexpected value
 */
export function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${x}`)
}

/**
 * Immutable configuration for scraper metrics
 * Uses const assertions for deep immutability
 */
export const SCRAPER_METRICS = {
  [ScraperType.STATIC]: {
    cost: 0.001,
    quality: { min: 15, max: 20 } as const,
    speed: 500 // ms per page
  },
  [ScraperType.DYNAMIC]: {
    cost: 0.01,
    quality: { min: 20, max: 30 } as const,
    speed: 2000 // ms per page
  },
  [ScraperType.SPA]: {
    cost: 0.015,
    quality: { min: 25, max: 35 } as const,
    speed: 3000 // ms per page
  },
  [ScraperType.API]: {
    cost: 0.005,
    quality: { min: 30, max: 40 } as const,
    speed: 1000 // ms per page
  },
  [ScraperType.FIRECRAWL]: {
    cost: 0.05,
    quality: { min: 30, max: 50 } as const,
    speed: 5000 // ms per page
  }
} as const

/**
 * Type for scraper metrics (derived from const object)
 */
export type ScraperMetrics = typeof SCRAPER_METRICS[ScraperType]

/**
 * Type guard to check if a value is a valid SessionId
 * @param value - Value to check
 * @returns True if value is a SessionId
 */
export const isSessionId = (value: unknown): value is SessionId => {
  if (typeof value !== 'string') return false
  try {
    SessionId(value)
    return true
  } catch {
    return false
  }
}

/**
 * Type guard to check if a value is a valid CompanyId
 * @param value - Value to check
 * @returns True if value is a CompanyId
 */
export const isCompanyId = (value: unknown): value is CompanyId => {
  if (typeof value !== 'string') return false
  try {
    CompanyId(value)
    return true
  } catch {
    return false
  }
}

/**
 * Type guard to check if a value is a valid Url
 * @param value - Value to check
 * @returns True if value is a Url
 */
export const isUrl = (value: unknown): value is Url => {
  if (typeof value !== 'string') return false
  try {
    Url(value)
    return true
  } catch {
    return false
  }
}

/**
 * Convert an array of strings to an array of URLs
 * Filters out invalid URLs
 * @param urls - Array of URL strings
 * @returns Array of validated URLs
 */
export const validateUrls = (urls: string[]): Url[] => {
  const validUrls: Url[] = []

  for (const url of urls) {
    try {
      validUrls.push(Url(url))
    } catch {
      // Skip invalid URLs - no mock data
      continue
    }
  }

  return validUrls
}

/**
 * Result type for operations that can fail
 * Uses discriminated unions for type safety
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E }

/**
 * Create a success result
 * @param data - Data to wrap in success
 * @returns Success result
 */
export const success = <T>(data: T): Result<T> => ({
  success: true,
  data
})

/**
 * Create a failure result
 * @param error - Error to wrap in failure
 * @returns Failure result
 */
export const failure = <E = Error>(error: E): Result<never, E> => ({
  success: false,
  error
})