/**
 * Core Scraper Interface and Types
 * Defines the contract for all scraper implementations
 */

import type { WebsiteAnalysis } from '../detection/website-detector'

export interface ScrapeOptions {
  // Basic options
  timeout?: number
  userAgent?: string
  headers?: Record<string, string>
  
  // Viewport settings
  viewport?: {
    width: number
    height: number
  }
  
  // Browser options
  headless?: boolean
  browserType?: 'chromium' | 'firefox' | 'webkit'
  device?: string // Mobile device emulation
  
  // Content handling
  waitForSelector?: string
  waitTimeout?: number
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2'
  scrollToBottom?: boolean
  triggerLazyLoad?: boolean
  
  // Network
  blockResources?: string[] // Resource types to block
  interceptRequests?: boolean
  proxy?: {
    server: string
    username?: string
    password?: string
  }
  
  // Authentication
  auth?: {
    cookies?: Array<{
      name: string
      value: string
      domain: string
      path?: string
    }>
    credentials?: {
      username: string
      password: string
    }
  }
  
  // Performance
  maxRetries?: number
  retryDelay?: number
  
  // Custom selectors for specific data
  selectors?: Record<string, string>
  
  // Debug options
  debug?: boolean
  screenshot?: boolean
  saveHtml?: boolean
}

export interface ScrapedData {
  // Core data
  url: string
  framework?: string
  data: any
  
  // Metadata
  metadata: {
    scraper: string
    browserType?: string
    duration: number
    timestamp: string
    dataPoints?: number
    errors?: string[]
  }
  
  // Debug info
  debug?: {
    html?: string
    screenshot?: string
    logs?: string[]
  }
}

export interface IScraper {
  name: string
  canHandle(url: string, analysis: WebsiteAnalysis): boolean
  scrape(url: string, options: ScrapeOptions): Promise<ScrapedData>
  cleanup?(): Promise<void>
}

export interface ScraperMetrics {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageDuration: number
  lastError?: string
  lastSuccess?: Date
}

export class ScraperError extends Error {
  constructor(
    message: string,
    public code: string,
    public context: {
      url: string
      scraper: string
      options?: ScrapeOptions
      originalError?: any
    }
  ) {
    super(message)
    this.name = 'ScraperError'
  }
}

export interface RetryStrategy {
  maxRetries: number
  backoff?: 'exponential' | 'linear' | 'constant'
  baseDelay?: number
  adjustTimeout?: boolean
  switchScraper?: boolean
}

export interface ErrorContext {
  url: string
  scraper: string
  attempt: number
  options: ScrapeOptions
  forceScraper?: string
  retryCallback: () => Promise<any>
}

// Data extraction result
export interface ExtractedData {
  // Basic info
  title?: string
  description?: string
  keywords?: string[]
  
  // Company info
  companyName?: string
  logo?: string
  tagline?: string
  
  // Contact
  email?: string
  phone?: string
  address?: string
  socialLinks?: Record<string, string>
  
  // Content
  mainContent?: string
  navigation?: Array<{ text: string; href: string }>
  
  // Structured data
  jsonLd?: any[]
  openGraph?: Record<string, any>
  twitterCard?: Record<string, any>
  microdata?: any[]
  
  // Technical
  framework?: string
  analytics?: string[]
  
  // Custom extracted data
  custom?: Record<string, any>
}