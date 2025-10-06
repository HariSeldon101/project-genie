'use client'

/**
 * Online Status Component - Real-time user presence indicator
 *
 * Technical PM Note: Shows if a user is currently online using Supabase Realtime
 * Green dot = online (active in last 30 minutes)
 * Gray dot = offline
 *
 * ✅ CLAUDE.md Compliance:
 * - Uses Supabase Realtime for live updates
 * - No mock data - real presence only
 * - Proper cleanup on unmount
 */

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TooltipWrapper } from '@/components/company-intelligence/tooltip-wrapper'
import { formatDistanceToNow } from 'date-fns'
import { permanentLogger } from '@/lib/utils/permanent-logger'

interface OnlineStatusProps {
  userId: string
  lastSignInAt?: string | null
  size?: 'sm' | 'md' | 'lg'
  showTooltip?: boolean
}

export function OnlineStatus({
  userId,
  lastSignInAt,
  size = 'md',
  showTooltip = true
}: OnlineStatusProps) {
  const [isOnline, setIsOnline] = useState(false)
  const [lastSeen, setLastSeen] = useState(lastSignInAt)

  useEffect(() => {
    // Check if user was recently active (within 30 minutes)
    const checkRecentActivity = () => {
      if (!lastSeen) return false

      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
      return new Date(lastSeen) > thirtyMinutesAgo
    }

    setIsOnline(checkRecentActivity())

    // Set up real-time subscription for presence
    const supabase = createClient()

    const channel = supabase.channel('online-users')
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()

        // Check if this user is in the presence state
        const userPresent = Object.values(state).some((presences: any) =>
          presences.some((p: any) => p.user_id === userId)
        )

        setIsOnline(userPresent || checkRecentActivity())

        if (userPresent) {
          setLastSeen(new Date().toISOString())
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track our own presence
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            await channel.track({
              user_id: user.id,
              online_at: new Date().toISOString()
            })
          }
        }
      })

    // Update online status every 5 minutes for recent activity
    const interval = setInterval(() => {
      setIsOnline(checkRecentActivity())
    }, 5 * 60 * 1000)

    // Cleanup
    return () => {
      clearInterval(interval)
      channel.unsubscribe()
    }
  }, [userId, lastSeen, lastSignInAt])

  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4'
  }

  const statusIndicator = (
    <div className="relative inline-flex">
      <div
        className={`
          ${sizeClasses[size]}
          rounded-full
          ${isOnline ? 'bg-green-500' : 'bg-gray-400'}
        `}
      />
      {isOnline && (
        <div
          className={`
            absolute
            ${sizeClasses[size]}
            rounded-full
            bg-green-500
            animate-ping
          `}
        />
      )}
    </div>
  )

  if (!showTooltip) {
    return statusIndicator
  }

  const tooltipContent = isOnline
    ? 'Currently online'
    : lastSeen
      ? `Last seen ${formatDistanceToNow(new Date(lastSeen), { addSuffix: true })}`
      : 'Never signed in'

  return (
    <TooltipWrapper content={tooltipContent}>
      {statusIndicator}
    </TooltipWrapper>
  )
}

/**
 * Bulk Online Status - Shows count of online users
 */
interface BulkOnlineStatusProps {
  userIds: string[]
  className?: string
}

export function BulkOnlineStatus({ userIds, className = '' }: BulkOnlineStatusProps) {
  const [onlineCount, setOnlineCount] = useState(0)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase.channel('online-users-bulk')
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()

        // Count how many of our users are online
        const onlineUsers = new Set<string>()
        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => {
            if (userIds.includes(p.user_id)) {
              onlineUsers.add(p.user_id)
            }
          })
        })

        setOnlineCount(onlineUsers.size)
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [userIds])

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1">
        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-sm text-muted-foreground">
          {onlineCount} online
        </span>
      </div>
    </div>
  )
}