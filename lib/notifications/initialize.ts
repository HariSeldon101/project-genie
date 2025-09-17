/**
 * Initialize the enterprise notification system
 * This should be called once at app startup
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { eventBus } from './event-bus'
import { initializeLoggerAdapter } from './adapters/logger-adapter'

let initialized = false

/**
 * Initialize all notification system components
 */
export async function initializeNotificationSystem() {
  if (initialized) {
    permanentLogger.info('NOTIFICATION_INIT', 'System already initialized')
    return
  }

  try {
    permanentLogger.info('NOTIFICATION_INIT', 'Initializing enterprise notification system')
    
    // Configure event bus
    eventBus.getStats() // Ensure singleton is created
    
    // Initialize logger adapter for error notifications
    await initializeLoggerAdapter(['ERROR', 'CRITICAL', 'WARNING'])
    
    // Log initialization success
    permanentLogger.info('NOTIFICATION_INIT', 'Enterprise notification system initialized successfully')
    
    initialized = true
  } catch (error) {
    permanentLogger.captureError('NOTIFICATION_INIT', new Error('Failed to initialize notification system'), { error })
    throw error
  }
}

/**
 * Check if the system is initialized
 */
export function isNotificationSystemInitialized(): boolean {
  return initialized
}

// SSE adapter functions removed - replaced with StreamHandler utility
// For streaming functionality, use StreamHandler from utils/stream-handler.ts