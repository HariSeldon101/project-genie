'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TooltipWrapper } from '@/components/company-intelligence/tooltip-wrapper'
import {
  Sparkles,
  Eye,
  DollarSign,
  FileText,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Download,
  Zap,
  Brain,
  Database
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import type { SelectedData, DataItem } from './types'

interface EnrichmentPreviewProps {
  selectedData: SelectedData
  onProceed: () => void
  onPreview?: () => void
}

export function EnrichmentPreview({
  selectedData,
  onProceed,
  onPreview
}: EnrichmentPreviewProps) {
  const [showPreview, setShowPreview] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Group selected items by category
  const groupedData = selectedData.items.reduce((acc, item) => {
    if (!acc[item.categoryId]) {
      acc[item.categoryId] = []
    }
    acc[item.categoryId].push(item)
    return acc
  }, {} as Record<string, DataItem[]>)

  // Calculate statistics
  const stats = {
    totalItems: selectedData.items.length,
    totalCategories: Object.keys(groupedData).length,
    totalTokens: selectedData.totalTokens,
    estimatedCost: selectedData.estimatedCost,
    averageQuality: selectedData.items.reduce((acc, item) => acc + item.quality, 0) / Math.max(selectedData.items.length, 1),
    processingTime: Math.ceil(selectedData.totalTokens / 1000) // Rough estimate: 1 second per 1000 tokens
  }

  // Get cost tier color
  const getCostColor = (cost: number) => {
    if (cost < 0.1) return 'text-green-500'
    if (cost < 0.5) return 'text-yellow-500'
    return 'text-red-500'
  }

  // Handle proceed action
  const handleProceed = async () => {
    setIsProcessing(true)

    const timer = permanentLogger.timing('enrichment_preparation')

    try {
      permanentLogger.breadcrumb('enrichment_start', 'Starting enrichment preparation', {
        items: stats.totalItems,
        tokens: stats.totalTokens,
        cost: stats.estimatedCost
      })

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1000))

      permanentLogger.info('ENRICHMENT_PREVIEW', 'Proceeding to enrichment', {
        selectedItems: stats.totalItems,
        categories: stats.totalCategories,
        tokens: stats.totalTokens,
        cost: stats.estimatedCost,
        duration: timer.stop()
      })

      onProceed()
    } catch (error) {
      permanentLogger.captureError('ENRICHMENT_PREVIEW', error as Error, {
        items: stats.totalItems
      })
      timer.stop()
    } finally {
      setIsProcessing(false)
    }
  }

  // Export selected data
  const exportSelection = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      statistics: stats,
      categories: Object.entries(groupedData).map(([categoryId, items]) => ({
        categoryId,
        itemCount: items.length,
        items: items.map(item => ({
          id: item.id,
          type: item.type,
          source: item.source,
          quality: item.quality,
          preview: item.preview
        }))
      }))
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `enrichment-selection-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (selectedData.items.length === 0) {
    return null
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="sticky bottom-0 z-10"
      >
        <Card className={cn(
          "border-t-2 shadow-lg",
          "bg-gradient-to-br from-yellow-50/80 to-yellow-50/40",
          "dark:from-yellow-950/20 dark:to-yellow-950/10",
          "border-yellow-200 dark:border-yellow-800",
          "shadow-yellow-100/50 dark:shadow-yellow-900/20"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              {/* Left side - Statistics */}
              <div className="flex items-center gap-6">
                {/* Item count */}
                <div>
                  <p className="text-sm font-medium">Selected for Enrichment</p>
                  <div className="flex items-center gap-3 mt-1">
                    <Badge variant="default" className="gap-1">
                      <Database className="h-3 w-3" />
                      {stats.totalItems} items
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      {stats.totalCategories} categories
                    </Badge>
                  </div>
                </div>

                {/* Token count */}
                <div className="border-l pl-6">
                  <TooltipWrapper content="Estimated tokens for LLM processing">
                    <p className="text-xs text-muted-foreground">Tokens</p>
                    <p className="text-lg font-semibold">
                      ~{stats.totalTokens.toLocaleString()}
                    </p>
                  </TooltipWrapper>
                </div>

                {/* Cost estimate */}
                <div className="border-l pl-6">
                  <TooltipWrapper content="Estimated enrichment cost">
                    <p className="text-xs text-muted-foreground">Est. Cost</p>
                    <p className={cn("text-lg font-semibold", getCostColor(stats.estimatedCost))}>
                      ${stats.estimatedCost.toFixed(3)}
                    </p>
                  </TooltipWrapper>
                </div>

                {/* Processing time */}
                <div className="border-l pl-6">
                  <TooltipWrapper content="Estimated processing time">
                    <p className="text-xs text-muted-foreground">Time</p>
                    <p className="text-lg font-semibold">
                      ~{stats.processingTime}s
                    </p>
                  </TooltipWrapper>
                </div>

                {/* Quality indicator */}
                <div className="border-l pl-6">
                  <TooltipWrapper content="Average quality of selected data">
                    <p className="text-xs text-muted-foreground">Avg Quality</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Progress
                        value={stats.averageQuality}
                        className="w-20 h-2"
                      />
                      <span className="text-sm font-semibold">
                        {Math.round(stats.averageQuality)}%
                      </span>
                    </div>
                  </TooltipWrapper>
                </div>
              </div>

              {/* Right side - Actions */}
              <div className="flex items-center gap-2">
                {/* Export button */}
                <TooltipWrapper content="Export selection as JSON">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportSelection}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipWrapper>

                {/* Preview button */}
                <TooltipWrapper content="Preview selected data">
                  <Button
                    variant="outline"
                    onClick={() => setShowPreview(true)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                </TooltipWrapper>

                {/* Proceed button */}
                <TooltipWrapper content="Start LLM enrichment process">
                  <Button
                    onClick={handleProceed}
                    disabled={isProcessing || stats.totalItems === 0}
                    className="min-w-[140px]"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Enrich Data
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </TooltipWrapper>
              </div>
            </div>

            {/* Warning for high cost */}
            <AnimatePresence>
              {stats.estimatedCost > 1.0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 pt-3 border-t"
                >
                  <div className="flex items-center gap-2 text-sm text-yellow-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>
                      High cost detected. Consider reducing the selection or using filters to focus on high-quality data.
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Processing indicator */}
            <AnimatePresence>
              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3"
                >
                  <Progress className="h-1" value={33} />
                  <p className="text-xs text-muted-foreground mt-1">
                    Preparing data for enrichment...
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* Preview dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Data Preview</DialogTitle>
            <DialogDescription>
              Review the {stats.totalItems} items selected for LLM enrichment
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              {Object.entries(groupedData).map(([categoryId, items]) => (
                <div key={categoryId} className="space-y-2">
                  <h3 className="font-semibold text-sm sticky top-0 bg-background py-2">
                    {categoryId} ({items.length} items)
                  </h3>
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 border rounded-lg space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{item.type}</span>
                          <Badge variant="outline" className="text-xs">
                            {item.source}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {item.quality}% quality
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          ~{item.tokens} tokens
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {item.preview}
                      </p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-3 text-sm">
              <Badge variant="outline" className="gap-1">
                <Brain className="h-3 w-3" />
                ~{stats.totalTokens.toLocaleString()} tokens
              </Badge>
              <Badge variant="outline" className="gap-1">
                <DollarSign className="h-3 w-3" />
                ${stats.estimatedCost.toFixed(3)}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Zap className="h-3 w-3" />
                ~{stats.processingTime}s processing
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Close
              </Button>
              <Button onClick={() => {
                setShowPreview(false)
                handleProceed()
              }}>
                <Sparkles className="h-4 w-4 mr-2" />
                Proceed to Enrichment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}