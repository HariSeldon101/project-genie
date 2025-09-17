/**
 * Unified Event Type System
 * Single source of truth for all events in the application
 *
 * CRITICAL: This replaces both SSEEventFactory types and Notification EventFactory types
 * Following DRY/SOLID principles - one event system to rule them all
 *
 * @module realtime-events/core
 */

import type { BaseDataItem } from '@/lib/company-intelligence/types/base-data'

/**
 * Base event interface - ALL events must follow this structure
 * This ensures consistency across server/client boundary
 */
export interface RealtimeEvent<T = unknown> {
  // Unique identifier for this event (nanoid)
  id: string

  // Event type from the enum below
  type: EventType

  // Unix timestamp when event was created
  timestamp: number

  // Correlation ID for linking related events in a session
  correlationId: string

  // Sequence number for ordering and detecting gaps
  sequenceNumber?: number

  // Where the event originated from
  source: EventSource

  // The actual event payload (type-safe via generics)
  data: T

  // Optional metadata for debugging and routing
  metadata?: EventMetadata
}

/**
 * All possible event types in the system
 * Using a hierarchical naming convention (category.action)
 */
export enum EventType {
  // Progress events - for tracking operations
  PROGRESS = 'progress',
  PROGRESS_UPDATE = 'progress.update',
  PROGRESS_COMPLETE = 'progress.complete',

  // Data events - for transmitting scraped/processed data
  DATA = 'data',
  DATA_CHUNK = 'data.chunk',
  DATA_COMPLETE = 'data.complete',

  // Status events - for system state changes
  STATUS = 'status',
  STATUS_CHANGE = 'status.change',

  // Error events - for error handling
  ERROR = 'error',
  ERROR_RETRY = 'error.retry',
  ERROR_FATAL = 'error.fatal',

  // Notification events - for user notifications
  NOTIFICATION = 'notification',
  NOTIFICATION_SUCCESS = 'notification.success',
  NOTIFICATION_WARNING = 'notification.warning',
  NOTIFICATION_ERROR = 'notification.error',
  NOTIFICATION_INFO = 'notification.info',

  // Phase events - for multi-phase operations
  PHASE_START = 'phase.start',
  PHASE_COMPLETE = 'phase.complete',
  PHASE_ERROR = 'phase.error',

  // Connection events - for SSE connection lifecycle
  CONNECTION_OPEN = 'connection.open',
  CONNECTION_CLOSE = 'connection.close',
  CONNECTION_ERROR = 'connection.error',
  CONNECTION_RECONNECT = 'connection.reconnect',

  // Stream control events
  STREAM_START = 'stream.start',
  STREAM_END = 'stream.end',
  STREAM_HEARTBEAT = 'stream.heartbeat',

  // Scraping specific events
  SCRAPING_START = 'scraping.start',
  SCRAPING_PROGRESS = 'scraping.progress',
  SCRAPING_COMPLETE = 'scraping.complete',
  SCRAPING_ERROR = 'scraping.error',

  // Warning events
  WARNING = 'warning',

  // Complete event for backwards compatibility
  COMPLETE = 'complete'
}

/**
 * Event sources - where events can originate from
 */
export enum EventSource {
  SERVER = 'server',
  CLIENT = 'client',
  SCRAPER = 'scraper',
  EXTRACTOR = 'extractor',
  ENRICHER = 'enricher',
  ANALYZER = 'analyzer',
  DATABASE = 'database',
  API = 'api',
  SYSTEM = 'system',
  USER = 'user'
}

/**
 * Event priority levels for notification events
 */
export enum EventPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'fatal'
}

/**
 * Metadata that can be attached to any event
 */
export interface EventMetadata {
  // User ID if event is user-specific
  userId?: string

  // Session ID for grouping events
  sessionId?: string

  // Request ID for tracing
  requestId?: string

  // User agent for client events
  userAgent?: string

  // IP address for security/debugging
  ip?: string

  // Priority for notification events
  priority?: EventPriority

  // Phase information for multi-phase operations
  phase?: string

  // Progress information
  progress?: ProgressInfo

  // Deduplication key to prevent duplicate events
  deduplicationKey?: string

  // Whether this event was migrated from old system
  migrated?: boolean

  // Original format if migrated
  originalFormat?: string

  // Any additional metadata
  [key: string]: any
}

/**
 * Progress information for progress events
 */
export interface ProgressInfo {
  // Current progress value
  current: number

  // Total expected value
  total: number

  // Percentage (0-100)
  percentage: number

  // Human-readable message
  message?: string

  // Current phase if multi-phase
  phase?: string

  // Estimated time remaining in milliseconds
  estimatedTimeRemaining?: number
}

/**
 * Error data structure
 */
export interface ErrorData {
  // Error code for programmatic handling
  code: string

  // Human-readable error message
  message: string

  // Stack trace for debugging
  stack?: string

  // Whether this error can be retried
  retriable?: boolean

  // How long to wait before retry (ms)
  retryAfter?: number

  // Additional error context
  context?: Record<string, any>
}

/**
 * Notification data structure
 */
export interface NotificationData {
  // Optional title for the notification
  title?: string

  // Main notification message
  message: string

  // Notification type
  type: 'info' | 'success' | 'warning' | 'error'

  // How long to show notification (ms)
  duration?: number

  // Whether notification persists until dismissed
  persistent?: boolean

  // Priority for display ordering
  priority?: EventPriority
}

/**
 * Phase data for multi-phase operations
 */
export interface PhaseData {
  // Phase identifier
  phase: string

  // Current status of the phase
  status: 'started' | 'in_progress' | 'completed' | 'failed'

  // Progress within this phase (0-100)
  progress?: number

  // Human-readable message
  message?: string

  // Any additional phase data
  data?: any
}

/**
 * Scraping-specific event data
 */
export interface ScrapingData {
  // Scraper ID that generated this event
  scraperId: string

  // Domain being scraped
  domain: string

  // URLs being processed
  urls?: string[]

  // Number of pages scraped
  pagesScraped?: number

  // Number of data points collected
  dataPoints?: number

  // Scraped data items (following BaseDataItem structure)
  items?: BaseDataItem[]

  // Progress information
  progress?: ProgressInfo

  // Error if scraping failed
  error?: ErrorData
}

/**
 * Type guards for runtime type checking
 * These ensure type safety when events cross the client/server boundary
 */

export const isProgressEvent = (event: RealtimeEvent): event is RealtimeEvent<ProgressInfo> =>
  event.type === EventType.PROGRESS ||
  event.type === EventType.PROGRESS_UPDATE ||
  event.type === EventType.SCRAPING_PROGRESS

export const isErrorEvent = (event: RealtimeEvent): event is RealtimeEvent<ErrorData> =>
  event.type === EventType.ERROR ||
  event.type.startsWith('error.') ||
  event.type === EventType.SCRAPING_ERROR

export const isNotificationEvent = (event: RealtimeEvent): event is RealtimeEvent<NotificationData> =>
  event.type === EventType.NOTIFICATION ||
  event.type.startsWith('notification.')

export const isPhaseEvent = (event: RealtimeEvent): event is RealtimeEvent<PhaseData> =>
  event.type.startsWith('phase.')

export const isScrapingEvent = (event: RealtimeEvent): event is RealtimeEvent<ScrapingData> =>
  event.type.startsWith('scraping.')

export const isConnectionEvent = (event: RealtimeEvent): event is RealtimeEvent<any> =>
  event.type.startsWith('connection.')

export const isStreamEvent = (event: RealtimeEvent): event is RealtimeEvent<any> =>
  event.type.startsWith('stream.')

/**
 * Helper to check if an event should trigger a toast notification
 */
export const shouldShowToast = (event: RealtimeEvent): boolean => {
  return isNotificationEvent(event) ||
         isErrorEvent(event) ||
         event.type === EventType.WARNING ||
         event.type === EventType.PHASE_COMPLETE ||
         event.type === EventType.SCRAPING_COMPLETE
}

/**
 * Helper to get event priority for display ordering
 */
export const getEventPriority = (event: RealtimeEvent): EventPriority => {
  if (event.metadata?.priority) {
    return event.metadata.priority
  }

  if (isErrorEvent(event)) {
    return EventPriority.HIGH
  }

  if (event.type === EventType.WARNING) {
    return EventPriority.HIGH
  }

  if (event.type === EventType.PHASE_COMPLETE ||
      event.type === EventType.SCRAPING_COMPLETE) {
    return EventPriority.NORMAL
  }

  return EventPriority.LOW
}

/**
 * Default export for convenience
 */
export default {
  EventType,
  EventSource,
  EventPriority,
  isProgressEvent,
  isErrorEvent,
  isNotificationEvent,
  isPhaseEvent,
  isScrapingEvent,
  isConnectionEvent,
  isStreamEvent,
  shouldShowToast,
  getEventPriority
}