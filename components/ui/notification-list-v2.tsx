'use client'

/**
 * Enterprise Notification List Component (v2)
 * Uses the new event-driven notification system with React Context
 */

import React, { useState, useEffect, useRef } from 'react'
import { X, AlertCircle, CheckCircle, Info, AlertTriangle, ChevronDown, ChevronUp, ArrowUpDown, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useNotifications } from '@/lib/notifications/notification-context'
import { NotificationType } from '@/lib/notifications/types'

interface NotificationListV2Props {
  className?: string
  maxHeight?: string
  autoScroll?: boolean
  showTimestamp?: boolean
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  showQueueStats?: boolean
}

export function NotificationListV2({
  className,
  maxHeight = '400px',
  autoScroll = true,
  showTimestamp = true,
  position = 'top-right',
  showQueueStats = false
}: NotificationListV2Props) {
  const { state, removeNotification, clearNotifications } = useNotifications()
  const [isExpanded, setIsExpanded] = useState(true)
  const [isMinimized, setIsMinimized] = useState(false)
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const scrollRef = useRef<HTMLDivElement>(null)
  
  // Auto-scroll when new notifications arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current && sortOrder === 'newest') {
      scrollRef.current.scrollTop = 0
    }
  }, [state.notifications, autoScroll, sortOrder])
  
  // Get icon for notification type
  const getIcon = (type: NotificationType) => {
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
  
  // Get styles for notification type
  const getTypeStyles = (type: NotificationType) => {
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
  
  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date)
  }
  
  // Get priority badge color
  const getPriorityBadge = (priority: number) => {
    switch (priority) {
      case 4: // CRITICAL
        return <Badge variant="destructive" className="text-xs ml-2">Critical</Badge>
      case 3: // HIGH
        return <Badge variant="default" className="text-xs ml-2">High</Badge>
      case 1: // LOW
        return <Badge variant="secondary" className="text-xs ml-2">Low</Badge>
      default:
        return null
    }
  }
  
  // Position styles
  const positionStyles = {
    'top-right': 'fixed top-20 right-4',
    'top-left': 'fixed top-20 left-4',
    'bottom-right': 'fixed bottom-4 right-4',
    'bottom-left': 'fixed bottom-4 left-4'
  }
  
  // Sort notifications
  const sortedNotifications = [...state.notifications].sort((a, b) => {
    if (sortOrder === 'newest') {
      return b.timestamp - a.timestamp
    } else {
      return a.timestamp - b.timestamp
    }
  })
  
  // Minimized view - only show if there are notifications
  if (isMinimized) {
    return (
      <div className={cn(positionStyles[position], 'z-50')}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMinimized(false)}
          className="bg-white dark:bg-gray-900 shadow-lg"
        >
          <Badge variant="secondary" className="mr-2">
            {state.notifications.length}
          </Badge>
          Notifications
          {state.queueStats.processing && (
            <Activity className="ml-2 h-3 w-3 animate-pulse" />
          )}
          <ChevronUp className="ml-2 h-4 w-4" />
        </Button>
      </div>
    )
  }
  
  // If no notifications and not minimized, don't render anything
  if (state.notifications.length === 0) {
    return null
  }
  
  return (
    <Card className={cn(
      positionStyles[position],
      'z-50 w-96 shadow-xl',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">Notifications</h3>
          <Badge variant="secondary" className="text-xs">
            {state.notifications.length}
          </Badge>
          {state.queueStats.processing && (
            <Activity className="h-3 w-3 animate-pulse text-muted-foreground" />
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
            title={`Sort by ${sortOrder === 'newest' ? 'oldest' : 'newest'} first`}
          >
            <ArrowUpDown className="h-3 w-3" />
          </Button>
          {state.notifications.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={clearNotifications}
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
      
      {/* Queue Stats (optional) */}
      {showQueueStats && isExpanded && (
        <div className="px-3 py-2 border-b bg-muted/50 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Queue: {state.queueStats.size}</span>
            <span>Processed: {state.queueStats.eventsProcessed}</span>
            <span>Avg: {state.queueStats.averageProcessingTime.toFixed(1)}ms</span>
            {state.queueStats.errors > 0 && (
              <span className="text-red-500">Errors: {state.queueStats.errors}</span>
            )}
          </div>
        </div>
      )}
      
      {/* Notifications */}
      {isExpanded && (
        <>
          <ScrollArea 
            className="w-full" 
            style={{ maxHeight }}
            ref={scrollRef}
          >
            <div className="p-2 space-y-2">
              {sortedNotifications.map((notification, index) => (
                <div
                  key={`${notification.id}_${index}`}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-md border transition-all',
                    getTypeStyles(notification.data.notificationType)
                  )}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getIcon(notification.data.notificationType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start">
                      <p className="text-sm break-words flex-1">
                        {notification.data.message}
                      </p>
                      {(notification.metadata?.priority !== 2 && notification.metadata?.priority) && getPriorityBadge(notification.metadata.priority)}
                    </div>
                    {showTimestamp && (
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">
                          {formatTimestamp(notification.timestamp)}
                        </p>
                        <Badge variant="outline" className="text-xs h-4 px-1">
                          {(() => {
                            // Debug what we have in notification
                            const id = notification.correlationId?.slice(0, 8) ||
                                      notification.id?.slice(0, 8) ||
                                      notification.data?.category ||
                                      notification.type?.split('.').pop() ||
                                      notification.type?.split('_').pop() ||
                                      'event'
                            return id
                          })()}
                        </Badge>
                      </div>
                    )}
                    {notification.data.action && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 mt-1 text-xs"
                        onClick={notification.data.action.handler}
                      >
                        {notification.data.action.label}
                      </Button>
                    )}
                  </div>
                  {notification.data.persistent && (
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
          
          {/* Connection Status */}
          {!state.isConnected && (
            <div className="p-2 border-t bg-yellow-50 dark:bg-yellow-950/20">
              <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
                <AlertTriangle className="h-3 w-3" />
                <span>Connection lost. Reconnecting...</span>
              </div>
            </div>
          )}
          
          {/* Footer */}
          {state.notifications.length > 0 && (
            <div className="p-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={clearNotifications}
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