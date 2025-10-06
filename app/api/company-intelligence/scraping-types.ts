// types/company-intelligence/scraping.ts

/**
 * Execution metrics for monitoring scraping sessions
 */
export interface ExecutionMetrics {
  pagesSucceeded: number
  pagesFailed: number
  dataPointsExtracted: number
  linksDiscovered: number
  durationMs: number
  averagePageTime: number
  lastUpdated: string
  status?: string
  phase?: string
}

/**
 * Scraping session status types
 */
export type ScrapingStatus = 
  | 'initializing' 
  | 'running' 
  | 'paused' 
  | 'completed' 
  | 'failed' 
  | 'cancelled'

/**
 * Scraping session from database
 * Matches the company_intelligence_sessions table
 */
export interface ScrapingSession {
  id: string
  user_id: string
  domain: string
  status: string
  phase: string
  merged_data?: any
  extraction_stats?: ExecutionMetrics
  metadata?: any
  scraper_type?: string
  max_pages?: number
  depth?: string
  categories?: string[]
  total_credits_estimated?: number
  total_credits_used?: number
  created_at?: string
  updated_at?: string
  completed_at?: string | null
}

/**
 * Page scraping status
 */
export interface ScrapedPage {
  id: string
  session_id: string
  url: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  content?: string
  error?: string
  created_at: string
  updated_at: string
}

/**
 * Extracted data point
 */
export interface ScrapedData {
  id: string
  session_id: string
  page_id: string
  field_name: string
  field_value: any
  confidence?: number
  created_at: string
}

/**
 * Scraping queue item
 */
export interface ScrapingQueueItem {
  id: string
  session_id: string
  url: string
  priority: number
  depth: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  retry_count: number
  created_at: string
  processed_at?: string
}