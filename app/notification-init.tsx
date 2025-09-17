'use client'

import { useEffect } from 'react'
import { initializeNotificationSystem } from '@/lib/notifications/initialize'
import { permanentLogger } from '@/lib/utils/permanent-logger'

export function NotificationInit() {
  useEffect(() => {
    initializeNotificationSystem().catch(error => {
      permanentLogger.captureError('NOTIFICATION_INIT', new Error('Failed to initialize notification system'), { error })
    })
  }, [])

  return null
}