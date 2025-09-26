/**
 * Enterprise Notification System - Main Export
 */

// Core event bus
export { eventBus } from './event-bus'

// Types
export * from './types'

// Context and Provider
export { NotificationProvider, useNotifications } from './notification-context'

// Initialization
export {
  initializeNotificationSystem,
  isNotificationSystemInitialized
} from './initialize'

// Export utilities for streaming (replaces SSE adapter)
export { StreamHandler } from './utils/stream-handler'
// EventFactory moved to unified realtime-events system
export { EventFactory } from '@/lib/realtime-events'
export { NotificationIdGenerator } from './utils/id-generator'
export { DeduplicationService, getDeduplicationService } from './utils/deduplication-service'

// Adapters
// SSE adapter replaced with StreamHandler utility in utils/stream-handler.ts
export { LoggerAdapter, initializeLoggerAdapter } from './adapters/logger-adapter'

// Migration hooks for backward compatibility
export { createMigrationHooks } from './migration-hooks'