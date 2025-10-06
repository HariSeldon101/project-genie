'use client'

import { useState, useEffect } from 'react'
import { Gauge, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface RateLimitData {
  model: string
  used: number
  limit: number
  resetAt: Date
  status: 'safe' | 'warning' | 'fatal' | 'exceeded'
}

interface RateLimitIndicatorProps {
  className?: string
  compact?: boolean
  showHistory?: boolean
}

export function RateLimitIndicator({ 
  className, 
  compact = false,
  showHistory = false 
}: RateLimitIndicatorProps) {
  const [rateLimits, setRateLimits] = useState<RateLimitData[]>([
    {
      model: 'gpt-5-nano',
      used: 0,
      limit: 500,
      resetAt: new Date(Date.now() + 60000),
      status: 'safe'
    },
    {
      model: 'gpt-4.1-nano',
      used: 0,
      limit: 500,
      resetAt: new Date(Date.now() + 60000),
      status: 'safe'
    }
  ])
  
  const [history, setHistory] = useState<number[]>([])
  const [timeToReset, setTimeToReset] = useState(60)

  useEffect(() => {
    // Listen for rate limit updates
    const handleRateLimitUpdate = (event: CustomEvent) => {
      const { model, used, limit, resetAt } = event.detail
      
      setRateLimits(prev => {
        const existing = prev.find(rl => rl.model === model)
        if (existing) {
          return prev.map(rl => 
            rl.model === model 
              ? {
                  ...rl,
                  used,
                  limit,
                  resetAt: new Date(resetAt),
                  status: getStatus(used, limit)
                }
              : rl
          )
        } else {
          return [...prev, {
            model,
            used,
            limit,
            resetAt: new Date(resetAt),
            status: getStatus(used, limit)
          }]
        }
      })
      
      // Update history for primary model
      if (model === 'gpt-5-nano' && showHistory) {
        setHistory(prev => [...prev.slice(-29), used])
      }
    }

    window.addEventListener('rate_limit_update', handleRateLimitUpdate as any)
    return () => window.removeEventListener('rate_limit_update', handleRateLimitUpdate as any)
  }, [showHistory])

  // Update countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      const nextReset = Math.min(...rateLimits.map(rl => rl.resetAt.getTime()))
      const secondsToReset = Math.max(0, Math.floor((nextReset - now) / 1000))
      setTimeToReset(secondsToReset)
    }, 1000)

    return () => clearInterval(interval)
  }, [rateLimits])

  const getStatus = (used: number, limit: number): RateLimitData['status'] => {
    const percentage = (used / limit) * 100
    if (percentage >= 100) return 'exceeded'
    if (percentage >= 90) return 'fatal'
    if (percentage >= 70) return 'warning'
    return 'safe'
  }

  const getStatusColor = (status: RateLimitData['status']) => {
    switch (status) {
      case 'safe': return 'text-green-600 bg-green-100 dark:bg-green-950'
      case 'warning': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-950'
      case 'fatal': return 'text-red-600 bg-red-100 dark:bg-red-950'
      case 'exceeded': return 'text-red-800 bg-red-200 dark:bg-red-900'
    }
  }

  const getProgressColor = (status: RateLimitData['status']) => {
    switch (status) {
      case 'safe': return 'bg-green-600'
      case 'warning': return 'bg-yellow-600'
      case 'fatal': return 'bg-red-600'
      case 'exceeded': return 'bg-red-800'
    }
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  }

  // Compact view for toolbar
  if (compact) {
    const primaryLimit = rateLimits.find(rl => rl.model === 'gpt-5-nano') || rateLimits[0]
    const percentage = (primaryLimit.used / primaryLimit.limit) * 100
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn('flex items-center gap-2 px-3 py-1 rounded-lg cursor-pointer', 
              getStatusColor(primaryLimit.status), className)}>
              <Gauge className="h-4 w-4" />
              <span className="font-mono text-sm font-bold">
                {primaryLimit.used}/{primaryLimit.limit}
              </span>
              <div className="w-16">
                <Progress 
                  value={percentage} 
                  className={cn('h-1.5', getProgressColor(primaryLimit.status))} 
                />
              </div>
              {primaryLimit.status === 'exceeded' && <XCircle className="h-4 w-4" />}
              {primaryLimit.status === 'fatal' && <AlertTriangle className="h-4 w-4" />}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="p-2 space-y-2">
              <p className="font-semibold">Rate Limit Status</p>
              <p>{primaryLimit.model}: {primaryLimit.used}/{primaryLimit.limit} RPM</p>
              <p>Resets in {formatTime(timeToReset)}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Full view
  return (
    <Card className={cn('w-full max-w-md', className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Rate Limit Status
          </span>
          <Badge variant="outline">
            Resets in {formatTime(timeToReset)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rateLimits.map(limit => {
          const percentage = (limit.used / limit.limit) * 100
          
          return (
            <div key={limit.model} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{limit.model}</span>
                <div className="flex items-center gap-2">
                  {limit.status === 'safe' && <CheckCircle className="h-4 w-4 text-green-600" />}
                  {limit.status === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                  {limit.status === 'fatal' && <AlertTriangle className="h-4 w-4 text-red-600" />}
                  {limit.status === 'exceeded' && <XCircle className="h-4 w-4 text-red-800" />}
                  <span className="text-sm font-mono">
                    {limit.used}/{limit.limit} RPM
                  </span>
                </div>
              </div>
              
              {/* Visual gauge */}
              <div className="relative">
                <Progress 
                  value={Math.min(percentage, 100)} 
                  className={cn('h-6', getProgressColor(limit.status))}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-white drop-shadow">
                    {percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
              
              {/* Threshold indicators */}
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0</span>
                <span className="text-yellow-600">70%</span>
                <span className="text-red-600">90%</span>
                <span>{limit.limit}</span>
              </div>
            </div>
          )
        })}
        
        {/* History chart */}
        {showHistory && history.length > 0 && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-2">Request History (Last 30)</p>
            <div className="flex items-end gap-0.5 h-12">
              {history.map((value, i) => {
                const height = (value / 500) * 100
                const status = getStatus(value, 500)
                
                return (
                  <div
                    key={i}
                    className={cn(
                      'flex-1 min-w-[2px] transition-all',
                      status === 'safe' && 'bg-green-500',
                      status === 'warning' && 'bg-yellow-500',
                      status === 'fatal' && 'bg-red-500',
                      status === 'exceeded' && 'bg-red-800'
                    )}
                    style={{ height: `${height}%` }}
                  />
                )
              })}
            </div>
          </div>
        )}
        
        {/* Status messages */}
        {rateLimits.some(rl => rl.status === 'exceeded') && (
          <div className="p-3 bg-red-100 dark:bg-red-950 rounded-lg">
            <p className="text-sm font-semibold text-red-800 dark:text-red-200">
              ⚠️ Rate limit exceeded!
            </p>
            <p className="text-xs text-red-600 dark:text-red-300 mt-1">
              Requests are being queued. Please wait for the limit to reset.
            </p>
          </div>
        )}
        
        {rateLimits.some(rl => rl.status === 'fatal') && 
         !rateLimits.some(rl => rl.status === 'exceeded') && (
          <div className="p-3 bg-yellow-100 dark:bg-yellow-950 rounded-lg">
            <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
              ⚡ Approaching rate limit
            </p>
            <p className="text-xs text-yellow-600 dark:text-yellow-300 mt-1">
              Consider reducing request frequency to avoid throttling.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}