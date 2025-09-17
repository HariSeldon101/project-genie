'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  Zap,
  Clock,
  Hash
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CostMetrics {
  totalCost: number
  llmCalls: number
  tokensUsed: number
  averageCostPerCall: number
  costByPhase: {
    scraping: number
    extraction: number
    enrichment: number
    generation: number
  }
  costByModel: {
    [model: string]: number
  }
  budgetLimit?: number
  warningThreshold?: number
}

interface CostAccumulatorProps {
  sessionId?: string
  className?: string
  budgetLimit?: number
  warningThreshold?: number
  onBudgetExceeded?: () => void
}

export function CostAccumulator({ 
  sessionId, 
  className,
  budgetLimit = 5.00,
  warningThreshold = 0.80
}: CostAccumulatorProps) {
  const [metrics, setMetrics] = useState<CostMetrics>({
    totalCost: 0,
    llmCalls: 0,
    tokensUsed: 0,
    averageCostPerCall: 0,
    costByPhase: {
      scraping: 0,
      extraction: 0,
      enrichment: 0,
      generation: 0
    },
    costByModel: {},
    budgetLimit,
    warningThreshold: budgetLimit * warningThreshold
  })
  
  const [isUpdating, setIsUpdating] = useState(false)
  
  // Subscribe to cost updates via SSE or polling
  useEffect(() => {
    if (!sessionId) return
    
    // Poll for cost updates every 2 seconds when active
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/company-intelligence/sessions/${sessionId}/metrics`)
        if (response.ok) {
          const data = await response.json()
          if (data.metrics) {
            setMetrics(prev => ({
              ...prev,
              totalCost: data.metrics.totalCost || prev.totalCost,
              llmCalls: data.metrics.llmCalls || prev.llmCalls,
              tokensUsed: data.metrics.tokensUsed || prev.tokensUsed,
              averageCostPerCall: data.metrics.llmCalls > 0 
                ? (data.metrics.totalCost / data.metrics.llmCalls) 
                : 0,
              costByPhase: data.metrics.costByPhase || prev.costByPhase,
              costByModel: data.metrics.costByModel || prev.costByModel
            }))
            setIsUpdating(true)
            setTimeout(() => setIsUpdating(false), 500)
          }
        }
      } catch (error) {
        console.error('Failed to fetch cost metrics:', error)
      }
    }, 2000)
    
    return () => clearInterval(interval)
  }, [sessionId])
  
  const budgetPercentage = budgetLimit > 0 
    ? Math.min((metrics.totalCost / budgetLimit) * 100, 100)
    : 0
    
  const isOverBudget = metrics.totalCost > budgetLimit
  const isNearBudget = metrics.totalCost > (metrics.warningThreshold || 0)
  
  const formatCost = (cost: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(cost)
  }
  
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }
  
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Cost Accumulator
            {isUpdating && (
              <Badge variant="secondary" className="animate-pulse">
                Live
              </Badge>
            )}
          </CardTitle>
          <div className="text-2xl font-bold">
            <span className={cn(
              isOverBudget ? "text-red-600" :
              isNearBudget ? "text-yellow-600" :
              "text-green-600"
            )}>
              {formatCost(metrics.totalCost)}
            </span>
          </div>
        </div>
        <CardDescription>
          Real-time cost tracking for LLM operations
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Budget Progress Bar */}
        {budgetLimit > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Budget Usage</span>
              <span className="font-medium">
                {budgetPercentage.toFixed(1)}% of {formatCost(budgetLimit)}
              </span>
            </div>
            <Progress 
              value={budgetPercentage} 
              className={cn(
                "h-2 transition-all",
                isOverBudget && "animate-pulse"
              )}
            />
            {isNearBudget && !isOverBudget && (
              <Alert className="py-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Approaching budget limit ({formatCost(budgetLimit - metrics.totalCost)} remaining)
                </AlertDescription>
              </Alert>
            )}
            {isOverBudget && (
              <Alert variant="destructive" className="py-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Budget exceeded by {formatCost(metrics.totalCost - budgetLimit)}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
        
        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Hash className="h-3 w-3" />
              LLM Calls
            </div>
            <div className="text-xl font-semibold">
              {metrics.llmCalls}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Zap className="h-3 w-3" />
              Tokens Used
            </div>
            <div className="text-xl font-semibold">
              {formatNumber(metrics.tokensUsed)}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              Avg Cost/Call
            </div>
            <div className="text-xl font-semibold">
              {formatCost(metrics.averageCostPerCall)}
            </div>
          </div>
        </div>
        
        {/* Cost by Phase */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Cost by Phase</div>
          <div className="space-y-1">
            {Object.entries(metrics.costByPhase).map(([phase, cost]) => (
              <div key={phase} className="flex items-center justify-between text-sm">
                <span className="capitalize text-muted-foreground">{phase}</span>
                <span className={cn(
                  "font-medium",
                  cost > 0 && "text-foreground"
                )}>
                  {formatCost(cost)}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Cost by Model */}
        {Object.keys(metrics.costByModel).length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Cost by Model</div>
            <div className="space-y-1">
              {Object.entries(metrics.costByModel).map(([model, cost]) => (
                <div key={model} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-mono text-xs">{model}</span>
                  <span className="font-medium">{formatCost(cost)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Warning for high costs */}
        {metrics.totalCost > 1.00 && (
          <Alert>
            <DollarSign className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Total cost exceeds $1.00. Consider reviewing your LLM usage patterns.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}