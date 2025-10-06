/**
 * Enrichment Queue Component
 * CLAUDE.md Compliant - Manages items queued for LLM enrichment
 * Provides batch processing and priority management for enrichment operations
 */

'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TooltipWrapper } from '@/components/company-intelligence/tooltip-wrapper'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Sparkles,
  Send,
  Trash2,
  AlertCircle,
  Clock,
  CheckCircle2,
  X,
  ChevronUp,
  ChevronDown,
  Loader2,
  Filter,
  SortAsc,
  SortDesc
} from 'lucide-react'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { convertSupabaseError } from '@/lib/utils/supabase-error-helper'
import { 
  IntelligenceCategory,
  ExtractionStatus,
  CATEGORY_DISPLAY_NAMES
} from '@/lib/company-intelligence/types/intelligence-enums'
import type { IntelligenceItem } from '@/lib/company-intelligence/types/intelligence-types'

/**
 * Props for the EnrichmentQueue component
 * @interface EnrichmentQueueProps
 */
interface EnrichmentQueueProps {
  /** Items in the enrichment queue */
  queue: IntelligenceItem[]
  /** Callback to remove an item from queue */
  onRemoveItem: (id: string) => void
  /** Callback to clear entire queue */
  onClearQueue: () => void
  /** Callback to process the queue */
  onProcessQueue: () => Promise<void>
  /** Enable priority reordering */
  enablePriority?: boolean
  /** Maximum items to process at once */
  maxBatchSize?: number
}

/**
 * Queue item with priority and selection state
 * @interface QueueItem
 */
interface QueueItem extends IntelligenceItem {
  priority: number
  selected: boolean
}

/**
 * Sort options for queue
 * @enum {string}
 */
enum SortOption {
  PRIORITY = 'priority',
  CONFIDENCE = 'confidence',
  CATEGORY = 'category',
  ADDED = 'added'
}

/**
 * Enrichment Queue Component
 * Manages and processes items queued for LLM enrichment
 * 
 * @component
 * @example
 * ```tsx
 * <EnrichmentQueue
 *   queue={items}
 *   onRemoveItem={handleRemove}
 *   onClearQueue={handleClear}
 *   onProcessQueue={handleProcess}
 *   enablePriority={true}
 * />
 * ```
 */
export function EnrichmentQueue({
  queue,
  onRemoveItem,
  onClearQueue,
  onProcessQueue,
  enablePriority = true,
  maxBatchSize = 50
}: EnrichmentQueueProps) {
  // State management
  const [queueItems, setQueueItems] = useState<QueueItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [sortBy, setSortBy] = useState<SortOption>(SortOption.PRIORITY)
  const [sortAscending, setSortAscending] = useState(false)
  const [filterCategory, setFilterCategory] = useState<IntelligenceCategory | 'all'>('all')
  const [selectAll, setSelectAll] = useState(false)
  
  // Component mount/unmount logging
  useEffect(() => {
    permanentLogger.breadcrumb('enrichment_queue_mount', 'Enrichment queue mounted', {
      initialQueueSize: queue.length
    })

    return () => {
      permanentLogger.breadcrumb('enrichment_queue_unmount', 'Enrichment queue unmounted', {
        finalQueueSize: queueItems.length
      })
    }
  }, [])

  // Initialize queue items with priority
  useEffect(() => {
    const items: QueueItem[] = queue.map((item, index) => ({
      ...item,
      priority: index,
      selected: false
    }))
    setQueueItems(items)
    
    permanentLogger.breadcrumb('queue_updated', 'Enrichment queue updated', {
      queueSize: items.length
    })
  }, [queue])

  /**
   * Sort queue items based on selected option
   */
  const sortedItems = useMemo(() => {
    let sorted = [...queueItems]
    
    // Apply filter
    if (filterCategory !== 'all') {
      sorted = sorted.filter(item => item.category === filterCategory)
    }
    
    // Apply sort
    sorted.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case SortOption.PRIORITY:
          comparison = a.priority - b.priority
          break
        case SortOption.CONFIDENCE:
          comparison = (b.confidence || 0) - (a.confidence || 0)
          break
        case SortOption.CATEGORY:
          comparison = a.category.localeCompare(b.category)
          break
        case SortOption.ADDED:
          comparison = 0 // Keep original order
          break
      }
      
      return sortAscending ? comparison : -comparison
    })
    
    return sorted
  }, [queueItems, sortBy, sortAscending, filterCategory])

  /**
   * Get unique categories in queue
   */
  const categories = useMemo(() => {
    const cats = new Set(queueItems.map(item => item.category))
    return Array.from(cats)
  }, [queueItems])

  /**
   * Calculate queue statistics
   */
  const stats = useMemo(() => {
    const selected = queueItems.filter(item => item.selected)
    const avgConfidence = queueItems.length > 0
      ? queueItems.reduce((sum, item) => sum + (item.confidence || 0), 0) / queueItems.length
      : 0
    
    const categoryBreakdown = categories.reduce((acc, cat) => {
      acc[cat] = queueItems.filter(item => item.category === cat).length
      return acc
    }, {} as Record<string, number>)
    
    return {
      total: queueItems.length,
      selected: selected.length,
      avgConfidence: Math.round(avgConfidence * 100),
      categoryBreakdown,
      estimatedCredits: selected.length * 2 // Assume 2 credits per enrichment
    }
  }, [queueItems, categories])

  /**
   * Handle item selection toggle
   */
  const handleToggleSelection = useCallback((id: string) => {
    setQueueItems(prev => prev.map(item => 
      item.id === id ? { ...item, selected: !item.selected } : item
    ))
    
    permanentLogger.breadcrumb('item_selection_toggled', 'Queue item selection changed', {
      itemId: id
    })
  }, [])

  /**
   * Handle select all toggle
   */
  const handleToggleSelectAll = useCallback(() => {
    const newSelectAll = !selectAll
    setSelectAll(newSelectAll)
    setQueueItems(prev => prev.map(item => ({
      ...item,
      selected: newSelectAll
    })))
    
    permanentLogger.breadcrumb('select_all_toggled', 'All items selection changed', {
      selected: newSelectAll,
      count: queueItems.length
    })
  }, [selectAll, queueItems.length])

  /**
   * Handle priority change
   */
  const handlePriorityChange = useCallback((id: string, direction: 'up' | 'down') => {
    setQueueItems(prev => {
      const index = prev.findIndex(item => item.id === id)
      if (index === -1) return prev
      
      const newIndex = direction === 'up' 
        ? Math.max(0, index - 1)
        : Math.min(prev.length - 1, index + 1)
      
      if (index === newIndex) return prev
      
      const newItems = [...prev]
      const [removed] = newItems.splice(index, 1)
      newItems.splice(newIndex, 0, removed)
      
      // Update priorities
      return newItems.map((item, idx) => ({
        ...item,
        priority: idx
      }))
    })
    
    permanentLogger.breadcrumb('priority_changed', 'Item priority adjusted', {
      itemId: id,
      direction
    })
  }, [])

  /**
   * Handle removing item from queue
   */
  const handleRemoveItem = useCallback((id: string) => {
    onRemoveItem(id)
    
    permanentLogger.info('ENRICHMENT_QUEUE', 'Item removed from queue', {
      itemId: id,
      remainingCount: queueItems.length - 1
    })
  }, [onRemoveItem, queueItems.length])

  /**
   * Handle processing selected items
   */
  const handleProcessSelected = useCallback(async () => {
    const selectedItems = queueItems.filter(item => item.selected)
    
    if (selectedItems.length === 0) {
      permanentLogger.warn('ENRICHMENT_QUEUE', 'No items selected for processing', {})
      return
    }
    
    if (selectedItems.length > maxBatchSize) {
      permanentLogger.warn('ENRICHMENT_QUEUE', 'Batch size exceeds maximum', {
        selected: selectedItems.length,
        max: maxBatchSize
      })
      return
    }
    
    const timer = permanentLogger.timing('enrichment_processing', {
      itemCount: selectedItems.length
    })
    
    setIsProcessing(true)
    setProcessingProgress(0)
    
    try {
      // Simulate progress (in real implementation, this would be updated by SSE)
      const progressInterval = setInterval(() => {
        setProcessingProgress(prev => {
          const next = prev + 10
          return next > 90 ? 90 : next
        })
      }, 500)
      
      await onProcessQueue()
      
      clearInterval(progressInterval)
      setProcessingProgress(100)
      
      // Clear processed items
      setTimeout(() => {
        const processedIds = new Set(selectedItems.map(item => item.id))
        setQueueItems(prev => prev.filter(item => !processedIds.has(item.id)))
        setProcessingProgress(0)
      }, 1000)
      
      timer.stop()
      
      permanentLogger.info('ENRICHMENT_QUEUE', 'Enrichment processing completed', {
        processedCount: selectedItems.length
      })
      
    } catch (error) {
      timer.stop()
      const jsError = convertSupabaseError(error)
      permanentLogger.captureError('ENRICHMENT_QUEUE', jsError, {
        context: 'Enrichment processing failed',
        itemCount: selectedItems.length
      })
    } finally {
      setIsProcessing(false)
    }
  }, [queueItems, maxBatchSize, onProcessQueue])

  /**
   * Handle clearing entire queue
   */
  const handleClearQueue = useCallback(() => {
    permanentLogger.info('ENRICHMENT_QUEUE', 'Queue cleared', {
      clearedCount: queueItems.length
    })
    onClearQueue()
  }, [queueItems.length, onClearQueue])

  /**
   * Handle sort change
   */
  const handleSortChange = useCallback((option: SortOption) => {
    if (option === sortBy) {
      setSortAscending(!sortAscending)
    } else {
      setSortBy(option)
      setSortAscending(false)
    }
    
    permanentLogger.breadcrumb('sort_changed', 'Queue sort order changed', {
      sortBy: option,
      ascending: sortAscending
    })
  }, [sortBy, sortAscending])

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Enrichment Queue
              </CardTitle>
              <CardDescription>
                Select and prioritize items for LLM enrichment
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {stats.total} items
              </Badge>
              {stats.selected > 0 && (
                <Badge variant="default">
                  {stats.selected} selected
                </Badge>
              )}
              {stats.estimatedCredits > 0 && (
                <TooltipWrapper content="Estimated credit usage">
                  <Badge variant="outline">
                    {stats.estimatedCredits} credits
                  </Badge>
                </TooltipWrapper>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectAll}
                onCheckedChange={handleToggleSelectAll}
              />
              <span className="text-sm">Select All</span>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Sort Options */}
              <div className="flex items-center gap-1">
                {Object.values(SortOption).map(option => (
                  <TooltipWrapper key={option} content={`Sort by ${option}`}>
                    <Button
                      variant={sortBy === option ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSortChange(option)}
                    >
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                      {sortBy === option && (
                        sortAscending ? <SortAsc className="h-3 w-3 ml-1" /> : <SortDesc className="h-3 w-3 ml-1" />
                      )}
                    </Button>
                  </TooltipWrapper>
                ))}
              </div>
              
              {/* Actions */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearQueue}
                disabled={queueItems.length === 0 || isProcessing}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
              
              <Button
                variant="default"
                size="sm"
                onClick={handleProcessSelected}
                disabled={stats.selected === 0 || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Process ({stats.selected})
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {/* Processing Progress */}
          {isProcessing && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Processing enrichment...</span>
                <span>{processingProgress}%</span>
              </div>
              <Progress value={processingProgress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Queue Items */}
      <Card>
        <CardContent className="pt-6">
          {sortedItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No items in enrichment queue</p>
              <p className="text-sm mt-2">
                Drag items here from the Kanban board or add them manually
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {sortedItems.map((item, index) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      item.selected ? 'bg-muted' : 'hover:bg-muted/50'
                    }`}
                  >
                    {/* Selection Checkbox */}
                    <Checkbox
                      checked={item.selected}
                      onCheckedChange={() => handleToggleSelection(item.id)}
                    />
                    
                    {/* Priority Controls */}
                    {enablePriority && (
                      <div className="flex flex-col">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handlePriorityChange(item.id, 'up')}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handlePriorityChange(item.id, 'down')}
                          disabled={index === sortedItems.length - 1}
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    
                    {/* Item Content */}
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{item.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {item.description || 'No description'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {CATEGORY_DISPLAY_NAMES[item.category]}
                        </Badge>
                        {item.confidence !== undefined && (
                          <Badge variant="secondary" className="text-xs">
                            {Math.round(item.confidence * 100)}% confidence
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Remove Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={isProcessing}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Stats Summary */}
      {stats.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Queue Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Selected</p>
                <p className="text-2xl font-bold">{stats.selected}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Confidence</p>
                <p className="text-2xl font-bold">{stats.avgConfidence}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Est. Credits</p>
                <p className="text-2xl font-bold">{stats.estimatedCredits}</p>
              </div>
            </div>
            
            {/* Category Breakdown */}
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium mb-2">Category Breakdown</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.categoryBreakdown).map(([cat, count]) => (
                  <Badge key={cat} variant="outline">
                    {CATEGORY_DISPLAY_NAMES[cat as IntelligenceCategory]}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Processing Warning */}
      {stats.selected > maxBatchSize && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Selected items ({stats.selected}) exceed maximum batch size ({maxBatchSize}). 
            Please select fewer items or process in multiple batches.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}