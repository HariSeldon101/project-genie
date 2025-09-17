'use client'

import { toast as sonnerToast } from 'sonner'
import { eventBus } from '@/lib/notifications/event-bus'
import { EventFactory } from '@/lib/realtime-events'
import { EventSource, EventPriority } from '@/lib/notifications/types'
import { NotificationEvent } from '@/lib/notifications/types'

interface ToastOptions {
  persistent?: boolean
  duration?: number
  phase?: string
  priority?: NotificationEvent['priority']
}

export function usePersistentToast() {
  const toast = {
    success: (message: string, options?: ToastOptions) => {
      // Use EventFactory for consistent event structure
      eventBus.emit(EventFactory.notification(message, 'success', {
        source: EventSource.CLIENT,
        metadata: {
          priority: options?.priority || EventPriority.NORMAL,
          phase: options?.phase,
          persistent: options?.persistent,
          duration: options?.duration
        }
      }))
    },
    
    error: (message: string, options?: ToastOptions) => {
      // Use EventFactory for consistent event structure
      eventBus.emit(EventFactory.notification(message, 'error', {
        source: EventSource.CLIENT,
        metadata: {
          priority: options?.priority || EventPriority.HIGH,
          phase: options?.phase,
          persistent: options?.persistent,
          duration: options?.duration
        }
      }))
    },
    
    warning: (message: string, options?: ToastOptions) => {
      // Use EventFactory for consistent event structure
      eventBus.emit(EventFactory.notification(message, 'warning', {
        source: EventSource.CLIENT,
        metadata: {
          priority: options?.priority || EventPriority.NORMAL,
          phase: options?.phase,
          persistent: options?.persistent,
          duration: options?.duration
        }
      }))
    },
    
    info: (message: string, options?: ToastOptions) => {
      // Use EventFactory for consistent event structure
      eventBus.emit(EventFactory.notification(message, 'info', {
        source: EventSource.CLIENT,
        metadata: {
          priority: options?.priority || EventPriority.NORMAL,
          phase: options?.phase,
          persistent: options?.persistent,
          duration: options?.duration
        }
      }))
    },
    
    loading: (message: string) => {
      // Loading toasts are not persistent by default
      return sonnerToast.loading(message)
    },
    
    dismiss: (toastId?: string | number) => {
      sonnerToast.dismiss(toastId)
    }
  }
  
  return toast
}

// Export a singleton instance for direct use
export const persistentToast = {
  success: (message: string, options?: ToastOptions) => {
    // Use EventFactory for consistent event structure
    eventBus.emit(EventFactory.notification(message, 'success', {
      source: EventSource.CLIENT,
      metadata: {
        priority: options?.priority || EventPriority.NORMAL,
        phase: options?.phase,
        persistent: options?.persistent,
        duration: options?.duration
      }
    }))
  },
  
  error: (message: string, options?: ToastOptions) => {
    // Use EventFactory for consistent event structure
    eventBus.emit(EventFactory.notification(message, 'error', {
      source: EventSource.CLIENT,
      metadata: {
        priority: options?.priority || EventPriority.HIGH,
        phase: options?.phase,
        persistent: options?.persistent,
        duration: options?.duration
      }
    }))
  },
  
  warning: (message: string, options?: ToastOptions) => {
    // Use EventFactory for consistent event structure
    eventBus.emit(EventFactory.notification(message, 'warning', {
      source: EventSource.CLIENT,
      metadata: {
        priority: options?.priority || EventPriority.NORMAL,
        phase: options?.phase,
        persistent: options?.persistent,
        duration: options?.duration
      }
    }))
  },
  
  info: (message: string, options?: ToastOptions) => {
    // Use EventFactory for consistent event structure
    eventBus.emit(EventFactory.notification(message, 'info', {
      source: EventSource.CLIENT,
      metadata: {
        priority: options?.priority || EventPriority.NORMAL,
        phase: options?.phase,
        persistent: options?.persistent,
        duration: options?.duration
      }
    }))
  },
  
  loading: (message: string) => {
    return sonnerToast.loading(message)
  },
  
  dismiss: (toastId?: string | number) => {
    sonnerToast.dismiss(toastId)
  }
}