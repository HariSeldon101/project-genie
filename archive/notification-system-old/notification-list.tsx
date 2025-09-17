'use client'

import React, { useState, useEffect, useRef } from 'react'
import { X, AlertCircle, CheckCircle, Info, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
  timestamp: Date
  persistent?: boolean
}

interface NotificationListProps {
  className?: string
  maxHeight?: string
  autoScroll?: boolean
  showTimestamp?: boolean
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
}

// Global notification store
let notificationListeners: Set<(notifications: Notification[]) => void> = new Set()
let globalNotifications: Notification[] = []

// Function to add notification to global store with deduplication
export function addNotification(notification: Omit<Notification, 'id' | 'timestamp'>) {
  // Check for duplicate messages within the last 2 seconds
  const twoSecondsAgo = Date.now() - 2000
  const isDuplicate = globalNotifications.some(n => 
    n.message === notification.message && 
    n.type === notification.type &&
    n.timestamp.getTime() > twoSecondsAgo
  )
  
  // Skip if duplicate
  if (isDuplicate) {
    return `duplicate-${Date.now()}`
  }
  
  const newNotification: Notification = {
    ...notification,
    id: `${Date.now()}-${Math.random()}`,
    timestamp: new Date(),
    persistent: notification.persistent ?? true
  }
  
  globalNotifications = [newNotification, ...globalNotifications]
  notificationListeners.forEach(listener => listener(globalNotifications))
  
  return newNotification.id
}

// Function to remove notification
export function removeNotification(id: string) {
  globalNotifications = globalNotifications.filter(n => n.id !== id)
  notificationListeners.forEach(listener => listener(globalNotifications))
}

// Function to clear all notifications
export function clearAllNotifications() {
  globalNotifications = []
  notificationListeners.forEach(listener => listener(globalNotifications))
}

export function NotificationList({
  className,
  maxHeight = '400px',
  autoScroll = true,
  showTimestamp = true,
  position = 'top-right'
}: NotificationListProps) {
  const [notifications, setNotifications] = useState<Notification[]>(globalNotifications)
  const [isExpanded, setIsExpanded] = useState(true)
  const [isMinimized, setIsMinimized] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    // Subscribe to notification updates
    const listener = (newNotifications: Notification[]) => {
      setNotifications(newNotifications)
    }
    
    notificationListeners.add(listener)
    
    return () => {
      notificationListeners.delete(listener)
    }
  }, [])
  
  useEffect(() => {
    // Auto-scroll to top when new notifications arrive
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }, [notifications, autoScroll])
  
  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'info':
      default:
        return <Info className="h-4 w-4 text-blue-500" />
    }
  }
  
  const getTypeStyles = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
      case 'error':
        return 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800'
      case 'info':
      default:
        return 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
    }
  }
  
  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date)
  }
  
  // Position styles
  const positionStyles = {
    'top-right': 'fixed top-20 right-4',
    'top-left': 'fixed top-20 left-4',
    'bottom-right': 'fixed bottom-4 right-4',
    'bottom-left': 'fixed bottom-4 left-4'
  }
  
  // Always render the component - show minimized when no notifications
  // Removed early return to keep persistent notification panel visible
  
  if (isMinimized || notifications.length === 0) {
    return (
      <div className={cn(positionStyles[position], 'z-50')}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMinimized(false)}
          className="bg-white dark:bg-gray-900 shadow-lg"
        >
          <Badge variant="secondary" className="mr-2">
            {notifications.length}
          </Badge>
          Notifications
          <ChevronUp className="ml-2 h-4 w-4" />
        </Button>
      </div>
    )
  }
  
  return (
    <Card className={cn(
      positionStyles[position],
      'z-50 w-96 shadow-xl',
      className
    )}>
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">Notifications</h3>
          <Badge variant="secondary" className="text-xs">
            {notifications.length}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          {notifications.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={clearAllNotifications}
            >
              Clear All
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsMinimized(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {isExpanded && (
        <>
          <ScrollArea 
            className="w-full" 
            style={{ maxHeight }}
            ref={scrollRef}
          >
            <div className="p-2 space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-md border transition-all',
                    getTypeStyles(notification.type)
                  )}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm break-words">
                      {notification.message}
                    </p>
                    {showTimestamp && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTimestamp(notification.timestamp)}
                      </p>
                    )}
                  </div>
                  {notification.persistent && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={() => removeNotification(notification.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
          
          {notifications.length > 0 && (
            <div className="p-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={clearAllNotifications}
              >
                Clear All Notifications
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  )
}