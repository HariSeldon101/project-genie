/**
 * Enterprise Notification System - Type Definitions
 * Provides comprehensive type safety for the event-driven notification architecture
 */

/**
 * Event priority levels for queue ordering
 * Higher priority events are processed first
 */
export enum EventPriority {
  CRITICAL = 4,  // System errors, critical failures
  HIGH = 3,      // User actions, important updates
  NORMAL = 2,    // Standard notifications
  LOW = 1        // Background updates, debug info
}

/**
 * Event source identifiers for tracking origin
 */
export enum EventSource {
  SSE = 'sse',
  CLIENT = 'client', 
  SYSTEM = 'system',
  API = 'api',
  WEBSOCKET = 'websocket'
}

/**
 * Notification types for UI rendering
 */
export type NotificationType = 'info' | 'success' | 'warning' | 'error'

/**
 * Base event interface - all events must implement this
 * Updated to match new EventFactory structure
 */
export interface BaseEvent<T = any> {
  id: string
  type: string
  source: EventSource
  timestamp: number
  correlationId?: string  // For grouping related events
  sequenceNumber?: number  // For ordering events
  data: T  // Changed from payload to data
  metadata?: {
    priority?: EventPriority  // Moved from root to metadata
    phase?: string
    [key: string]: any
  }
}

/**
 * Notification data structure
 */
export interface NotificationData {
  message: string
  notificationType: NotificationType
  persistent?: boolean
  duration?: number  // ms before auto-dismiss (if not persistent)
  action?: {
    label: string
    handler: () => void
  }
}

/**
 * Notification event for UI display
 */
export interface NotificationEvent extends BaseEvent<NotificationData> {
  type: 'notification'
  data: NotificationData  // Changed from payload to data
}

/**
 * Phase data structure
 */
export interface PhaseData {
  phase: string
  previousPhase?: string
  status: 'started' | 'completed' | 'failed'
  progress?: number  // 0-100
  message?: string
}

/**
 * Phase transition event
 */
export interface PhaseEvent extends BaseEvent<PhaseData> {
  type: 'phase'
  data: PhaseData  // Changed from payload to data
}

/**
 * Data update structure
 */
export interface DataUpdateInfo {
  entity: string  // e.g., 'sitemap', 'scraping-results'
  action: 'created' | 'updated' | 'deleted'
  content: any  // Renamed from data to avoid confusion
  count?: number
}

/**
 * Data update event
 */
export interface DataEvent extends BaseEvent<DataUpdateInfo> {
  type: 'data'
  data: DataUpdateInfo  // Changed from payload to data
}

/**
 * System event data
 */
export interface SystemData {
  action: string
  details?: any
}

/**
 * System event for internal state changes
 */
export interface SystemEvent extends BaseEvent<SystemData> {
  type: 'system'
  data: SystemData  // Changed from payload to data
}

/**
 * Union type of all possible events
 */
export type Event = NotificationEvent | PhaseEvent | DataEvent | SystemEvent

/**
 * Event handler function type
 */
export type EventHandler = (event: Event) => void | Promise<void>

/**
 * Event subscription interface
 */
export interface EventSubscription {
  id: string
  filter?: (event: Event) => boolean
  handler: EventHandler
  priority?: EventPriority  // Handler priority for execution order
}

/**
 * Queue statistics for monitoring
 */
export interface QueueStats {
  size: number
  processing: boolean
  eventsProcessed: number
  averageProcessingTime: number
  lastProcessedAt?: number
  errors: number
}

/**
 * Notification state for React Context
 */
export interface NotificationState {
  notifications: NotificationEvent[]
  phases: Map<string, PhaseEvent>
  queueStats: QueueStats
  isConnected: boolean  // For SSE/WebSocket status
}

/**
 * Notification actions for useReducer
 */
export type NotificationAction =
  | { type: 'ADD_NOTIFICATION'; payload: NotificationEvent }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }  // by id
  | { type: 'CLEAR_NOTIFICATIONS' }
  | { type: 'UPDATE_PHASE'; payload: PhaseEvent }
  | { type: 'UPDATE_QUEUE_STATS'; payload: Partial<QueueStats> }
  | { type: 'SET_CONNECTION_STATUS'; payload: boolean }
  | { type: 'BATCH_ADD_NOTIFICATIONS'; payload: NotificationEvent[] }

/**
 * Configuration for the event bus
 */
export interface EventBusConfig {
  maxQueueSize?: number
  processingInterval?: number  // ms
  deduplicationWindow?: number  // ms
  enableLogging?: boolean
  enableMetrics?: boolean
}

/**
 * Adapter interface for external event sources
 */
export interface EventAdapter {
  name: string
  source: EventSource
  connect(): Promise<void>
  disconnect(): Promise<void>
  subscribe(handler: EventHandler): void
  unsubscribe(): void
}

/**
 * Event filter for selective subscription
 */
export interface EventFilter {
  types?: string[]
  sources?: EventSource[]
  priorities?: EventPriority[]
  correlationId?: string
}

/**
 * Event emitter options
 */
export interface EmitOptions {
  correlationId?: string
  deduplicationKey?: string
  skipQueue?: boolean  // For immediate processing
}