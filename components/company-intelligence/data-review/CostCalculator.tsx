'use client'

import React, { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { DollarSign, TrendingDown, AlertCircle, Zap } from 'lucide-react'
import { SelectionStats } from './types'

interface CostCalculatorProps {
  stats: SelectionStats
  model?: string
}

// Pricing per 1M tokens (GPT-5-nano rates)
const PRICING = {
  'gpt-5-nano': {
    input: 0.025,  // $0.025 per 1M tokens
    output: 0.20,   // $0.20 per 1M tokens
  },
  'gpt-5-mini': {
    input: 0.25,
    output: 2.00,
  },
  'gpt-5': {
    input: 0.50,
    output: 4.00,
  }
}

export function CostCalculator({ stats, model = 'gpt-5-nano' }: CostCalculatorProps) {
  const calculations = useMemo(() => {
    const pricing = PRICING[model as keyof typeof PRICING] || PRICING['gpt-5-nano']
    
    // Estimate tokens (roughly 1 token per 4 characters)
    const estimatedInputTokens = Math.ceil(stats.selectedSize / 4)
    // Output is typically 2-3x the input for enrichment
    const estimatedOutputTokens = Math.ceil(estimatedInputTokens * 2.5)
    
    // Calculate costs (convert from per million to actual)
    const inputCost = (estimatedInputTokens / 1_000_000) * pricing.input
    const outputCost = (estimatedOutputTokens / 1_000_000) * pricing.output
    const totalCost = inputCost + outputCost
    
    // Calculate savings vs selecting all
    const allInputTokens = Math.ceil(stats.totalSize / 4)
    const allOutputTokens = Math.ceil(allInputTokens * 2.5)
    const allInputCost = (allInputTokens / 1_000_000) * pricing.input
    const allOutputCost = (allOutputTokens / 1_000_000) * pricing.output
    const allTotalCost = allInputCost + allOutputCost
    
    const savings = allTotalCost - totalCost
    const savingsPercent = stats.totalItems > 0 
      ? ((1 - stats.selectedItems / stats.totalItems) * 100)
      : 0

    return {
      estimatedInputTokens,
      estimatedOutputTokens,
      inputCost,
      outputCost,
      totalCost,
      savings,
      savingsPercent,
      allTotalCost
    }
  }, [stats, model])

  const formatCost = (cost: number) => {
    if (cost < 0.01) return '<$0.01'
    return `$${cost.toFixed(2)}`
  }

  const formatTokens = (tokens: number) => {
    if (tokens < 1000) return tokens.toString()
    if (tokens < 1_000_000) return `${(tokens / 1000).toFixed(1)}K`
    return `${(tokens / 1_000_000).toFixed(2)}M`
  }

  const selectionPercent = stats.totalItems > 0 
    ? (stats.selectedItems / stats.totalItems) * 100
    : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Cost Estimate
        </CardTitle>
        <CardDescription>
          AI enrichment costs based on selection
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Selection Progress */}
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">Data Selected</span>
            <span className="text-sm text-gray-500">
              {stats.selectedItems} / {stats.totalItems} items
            </span>
          </div>
          <Progress value={selectionPercent} className="h-2" />
          <p className="text-xs text-gray-500 mt-1">
            {selectionPercent.toFixed(1)}% of available data
          </p>
        </div>

        {/* Token Estimates */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-gray-500">Input Tokens</p>
            <p className="text-lg font-semibold">
              {formatTokens(calculations.estimatedInputTokens)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500">Output Tokens</p>
            <p className="text-lg font-semibold">
              {formatTokens(calculations.estimatedOutputTokens)}
            </p>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex justify-between">
            <span className="text-sm">Input Cost</span>
            <span className="text-sm font-medium">{formatCost(calculations.inputCost)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">Output Cost</span>
            <span className="text-sm font-medium">{formatCost(calculations.outputCost)}</span>
          </div>
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between">
              <span className="text-sm font-semibold">Total Cost</span>
              <span className="text-lg font-bold text-primary">
                {formatCost(calculations.totalCost)}
              </span>
            </div>
          </div>
        </div>

        {/* Savings Alert */}
        {calculations.savings > 0.01 && (
          <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
            <TrendingDown className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              <strong>Saving {formatCost(calculations.savings)}</strong> ({calculations.savingsPercent.toFixed(0)}%) 
              compared to processing all data ({formatCost(calculations.allTotalCost)})
            </AlertDescription>
          </Alert>
        )}

        {/* Model Selection */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium">Model</span>
          </div>
          <Badge variant="secondary">{model}</Badge>
        </div>

        {/* Warning for large selections */}
        {calculations.totalCost > 1 && (
          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              Large dataset selected. Consider using selection presets to reduce costs.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}