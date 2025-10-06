'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, Brain, DollarSign, Zap, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface LLMOperation {
  id: string
  timestamp: Date
  phase: string
  operation: string
  model: string
  status: 'pending' | 'active' | 'completed' | 'failed'
  estimatedCost?: number
  actualCost?: number
  tokens?: {
    input: number
    output: number
    reasoning?: number
  }
  error?: string
}

interface LLMMonitorProps {
  className?: string
  alwaysVisible?: boolean
}

export function LLMMonitor({ className, alwaysVisible = false }: LLMMonitorProps) {
  const [operations, setOperations] = useState<LLMOperation[]>([])
  const [activeOperation, setActiveOperation] = useState<LLMOperation | null>(null)
  const [totalCost, setTotalCost] = useState(0)
  const [isLLMActive, setIsLLMActive] = useState(false)
  const [rateLimit, setRateLimit] = useState({ used: 0, total: 500, resetAt: new Date() })

  // Listen for LLM operation events
  useEffect(() => {
    const handleLLMEvent = (event: CustomEvent) => {
      const { type, data } = event.detail
      
      switch (type) {
        case 'operation_start':
          const newOp: LLMOperation = {
            id: crypto.randomUUID(),
            timestamp: new Date(),
            phase: data.phase,
            operation: data.operation,
            model: data.model || 'gpt-5-nano',
            status: 'active',
            estimatedCost: data.estimatedCost
          }
          setOperations(prev => [...prev, newOp])
          setActiveOperation(newOp)
          setIsLLMActive(true)
          break
          
        case 'operation_complete':
          setOperations(prev => 
            prev.map(op => 
              op.id === data.id 
                ? { ...op, status: 'completed', actualCost: data.cost, tokens: data.tokens }
                : op
            )
          )
          setActiveOperation(null)
          setIsLLMActive(false)
          setTotalCost(prev => prev + (data.cost || 0))
          break
          
        case 'operation_failed':
          setOperations(prev => 
            prev.map(op => 
              op.id === data.id 
                ? { ...op, status: 'failed', error: data.error }
                : op
            )
          )
          setActiveOperation(null)
          setIsLLMActive(false)
          break
          
        case 'rate_limit_update':
          setRateLimit(data)
          break
      }
    }

    window.addEventListener('llm_event', handleLLMEvent as any)
    return () => window.removeEventListener('llm_event', handleLLMEvent as any)
  }, [])

  // Don't render if no operations and not always visible
  if (!alwaysVisible && operations.length === 0) {
    return null
  }

  const activeCount = operations.filter(op => op.status === 'active').length
  const failedCount = operations.filter(op => op.status === 'failed').length
  const rateLimitPercentage = (rateLimit.used / rateLimit.total) * 100

  return (
    <div className={cn('fixed top-0 left-0 right-0 z-50', className)}>
      {/* RED BANNER - Shows when LLM is active */}
      {isLLMActive && (
        <div className="bg-red-600 text-white p-3 shadow-lg animate-pulse">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="h-6 w-6 animate-bounce" />
              <div>
                <p className="font-bold text-lg flex items-center gap-2">
                  🔴 LLM OPERATION IN PROGRESS
                  <Badge variant="secondary" className="bg-white text-red-600">
                    {activeOperation?.model}
                  </Badge>
                </p>
                <p className="text-sm opacity-90">
                  {activeOperation?.phase} - {activeOperation?.operation}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm opacity-75">Estimated Cost</p>
                <p className="font-mono font-bold">
                  ${activeOperation?.estimatedCost?.toFixed(4) || '0.0000'}
                </p>
              </div>
              <div className="w-24">
                <Progress value={rateLimitPercentage} className="h-2 bg-red-800" />
                <p className="text-xs mt-1">{rateLimit.used}/{rateLimit.total} RPM</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Persistent monitoring panel */}
      {(alwaysVisible || operations.length > 0) && (
        <Card className="m-4 bg-background/95 backdrop-blur border-2 border-border">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Brain className="h-5 w-5" />
                LLM Activity Monitor
              </h3>
              <div className="flex items-center gap-4">
                <Badge variant={activeCount > 0 ? 'destructive' : 'secondary'}>
                  {activeCount} Active
                </Badge>
                {failedCount > 0 && (
                  <Badge variant="destructive">
                    {failedCount} Failed
                  </Badge>
                )}
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span className="font-mono font-bold">
                    ${totalCost.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>

            {/* Rate Limit Warning */}
            {rateLimitPercentage > 80 && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Rate Limit Warning</AlertTitle>
                <AlertDescription>
                  You've used {rateLimit.used} of {rateLimit.total} requests per minute.
                  {rateLimitPercentage > 95 && ' Requests may be throttled!'}
                </AlertDescription>
              </Alert>
            )}

            {/* Recent Operations */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {operations.slice(-5).reverse().map(op => (
                <div 
                  key={op.id}
                  className={cn(
                    'flex items-center justify-between p-2 rounded-lg border',
                    op.status === 'active' && 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800',
                    op.status === 'completed' && 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800',
                    op.status === 'failed' && 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {op.status === 'active' && <Zap className="h-4 w-4 text-red-600 animate-pulse" />}
                    {op.status === 'completed' && <Brain className="h-4 w-4 text-green-600" />}
                    {op.status === 'failed' && <XCircle className="h-4 w-4 text-red-600" />}
                    <div>
                      <p className="text-sm font-medium">{op.phase}</p>
                      <p className="text-xs text-muted-foreground">{op.operation}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {new Date(op.timestamp).toLocaleTimeString()}
                    </p>
                    {op.actualCost && (
                      <p className="text-xs font-mono">${op.actualCost.toFixed(4)}</p>
                    )}
                    {op.tokens && (
                      <p className="text-xs text-muted-foreground">
                        {op.tokens.input}→{op.tokens.output} tokens
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}