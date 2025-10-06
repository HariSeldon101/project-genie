/**
 * Unified Event System
 * Main export file for the realtime-events module
 *
 * This is the new unified event system that replaces:
 * - SSEEventFactory from company-intelligence/utils
 * - EventFactory from notifications/utils
 * - SSEStreamManager from company-intelligence/utils
 * - StreamHandler from notifications/utils
 *
 * @module realtime-events
 */

// Core types
export * from './core/event-types'

// Intelligence-specific event helpers (ADDED: 2025-10-01 for intelligence-viewer)
export {
  isIntelligenceEvent,
  isCategoryEvent,
  isSessionEvent,
  isPageEvent,
  isPhaseChangeEvent,
  isCreditEvent,
  IntelligenceEventType,
  getIntelligenceEventMessage,
  shouldShowIntelligenceToast
} from './core/intelligence-event-types'

// Intelligence-specific event data types
export type {
  SessionCreatedData,
  SessionCompleteData,
  CategoryExtractedData,
  ProgressInfo,
  ErrorData
} from './core/intelligence-event-types'

// Factory for creating events
export { EventFactory } from './factories/event-factory'

// Server-side components
export { StreamWriter } from './server/stream-writer'

// Client-side components
export { StreamReader } from './client/stream-reader'
export type { StreamReaderOptions } from './client/stream-reader'

// Adapters have been removed - migration to new structure complete

/**
 * Migration Guide:
 *
 * Old SSE code:
 * ```typescript
 * // Previously used SSEEventFactory - now migrated to EventFactory
 * import { EventFactory } from '@/lib/realtime-events'
 * const event = EventFactory.progress(50, 100, 'Processing...')
 * ```
 *
 * New unified code:
 * ```typescript
 * import { EventFactory } from '@/lib/realtime-events'
 * const event = EventFactory.progress(50, 100, 'Processing...')
 * ```
 *
 * Old notification code:
 * ```typescript
 * import { EventFactory } from '@/lib/notifications/utils/event-factory'
 * const event = EventFactory.notification('Success!', 'success')
 * ```
 *
 * New unified code:
 * ```typescript
 * import { EventFactory } from '@/lib/realtime-events'
 * const event = EventFactory.notification('Success!', 'success')
 * ```
 */