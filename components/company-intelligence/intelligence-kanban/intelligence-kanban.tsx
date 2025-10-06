/**
 * Intelligence Kanban Component
 * CLAUDE.md Compliant - Full drag-and-drop implementation with @dnd-kit
 * Provides intelligent categorization and organization of scraped data
 */

'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  UniqueIdentifier,
  Active,
  Over,
  CollisionDetection,
  pointerWithin,
  rectIntersection,
  getFirstCollision
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove
} from '@dnd-kit/sortable'
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers'
import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { TooltipWrapper } from '@/components/company-intelligence/tooltip-wrapper'
import { 
  ChevronRight, 
  Sparkles, 
  BarChart3,
  Settings,
  Filter,
  Search,
  Archive,
  Send,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Layers,
  GripVertical,
  Eye,
  Trash2,
  Edit
} from 'lucide-react'

import { permanentLogger } from '@/lib/utils/permanent-logger'
import { convertSupabaseError } from '@/lib/utils/supabase-error-helper'
import { CompanyIntelligenceRepositoryV4 } from '@/lib/repositories/intelligence-repository-v4'
import { EventFactory } from '@/lib/realtime-events'
import { useDebounce, useMemoizedSearch } from '@/lib/utils/ui-performance-utils'

import { 
  IntelligenceCategory,
  ExtractionStatus,
  CATEGORY_DISPLAY_NAMES
} from '@/lib/company-intelligence/types/intelligence-enums'
import type { 
  IntelligenceData, 
  IntelligenceItem,
  CategoryData 
} from '@/lib/company-intelligence/types/intelligence-types'

import { AnalyticsView } from './analytics-view'
import { EnrichmentQueue } from './enrichment-queue'

/**
 * Props for the IntelligenceKanban component
 * @interface IntelligenceKanbanProps
 */
interface IntelligenceKanbanProps {
  /** Session ID for tracking */
  sessionId: string
  /** Company domain being analyzed */
  companyDomain: string
  /** Intelligence data to display */
  intelligenceData: IntelligenceData
  /** Repository instance for data operations */
  repository?: CompanyIntelligenceRepositoryV4
  /** Callback when data is updated */
  onDataUpdate?: (data: IntelligenceData) => void
  /** Callback for enrichment requests */
  onEnrichmentRequest?: (items: IntelligenceItem[]) => Promise<void>
  /** Enable real-time updates */
  enableRealTime?: boolean
}

/**
 * Draggable card component for individual intelligence items
 */
function DraggableCard({ 
  item, 
  isDragging 
}: { 
  item: IntelligenceItem
  isDragging?: boolean 
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition
  } = useSortable({ 
    id: item.id,
    data: { type: 'item', item }
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="mb-2"
    >
      <Card className={`cursor-move hover:shadow-md transition-shadow ${
        item.status === ExtractionStatus.NEEDS_REVIEW ? 'border-yellow-500' : ''
      }`}>
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <div 
              {...attributes} 
              {...listeners}
              className="mt-1 cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-sm line-clamp-2">{item.title}</h4>
              {item.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {item.description}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                {item.confidence !== undefined && (
                  <TooltipWrapper content={`Confidence: ${Math.round(item.confidence * 100)}%`}>
                    <Badge 
                      variant={item.confidence > 0.7 ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {Math.round(item.confidence * 100)}%
                    </Badge>
                  </TooltipWrapper>
                )}
                {item.status === ExtractionStatus.ENRICHED && (
                  <Badge variant="outline" className="text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Enriched
                  </Badge>
                )}
                {item.source && (
                  <TooltipWrapper content={`Source: ${item.source}`}>
                    <Badge variant="ghost" className="text-xs">
                      {new URL(item.source).pathname.slice(0, 20)}...
                    </Badge>
                  </TooltipWrapper>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Droppable column component for categories
 */
function DroppableColumn({ 
  category, 
  items,
  isActive 
}: { 
  category: IntelligenceCategory
  items: IntelligenceItem[]
  isActive?: boolean 
}) {
  const {
    setNodeRef,
    isOver
  } = useSortable({
    id: category,
    data: { type: 'category', category }
  })

  return (
    <div 
      ref={setNodeRef}
      className={`min-h-[400px] p-4 rounded-lg bg-muted/50 transition-colors ${
        isOver ? 'bg-muted' : ''
      } ${isActive ? 'ring-2 ring-primary' : ''}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-sm">
          {CATEGORY_DISPLAY_NAMES[category]}
        </h3>
        <Badge variant="secondary" className="text-xs">
          {items.length}
        </Badge>
      </div>
      <ScrollArea className="h-[350px]">
        <SortableContext
          items={items.map(item => item.id)}
          strategy={verticalListSortingStrategy}
        >
          {items.map(item => (
            <DraggableCard key={item.id} item={item} />
          ))}
        </SortableContext>
      </ScrollArea>
    </div>
  )
}

/**
 * Main Intelligence Kanban Component
 * Provides drag-and-drop organization of intelligence data
 * 
 * @component
 * @example
 * ```tsx
 * <IntelligenceKanban
 *   sessionId={sessionId}
 *   companyDomain="example.com"
 *   intelligenceData={data}
 *   onDataUpdate={handleUpdate}
 * />
 * ```
 */
export function IntelligenceKanban({
  sessionId,
  companyDomain,
  intelligenceData,
  repository,
  onDataUpdate,
  onEnrichmentRequest,
  enableRealTime = false
}: IntelligenceKanbanProps) {
  // State management
  const [data, setData] = useState<IntelligenceData>(intelligenceData)
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)
  const [activeItem, setActiveItem] = useState<IntelligenceItem | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTab, setSelectedTab] = useState<'kanban' | 'analytics' | 'enrichment'>('kanban')
  const [selectedCategory, setSelectedCategory] = useState<IntelligenceCategory | 'all'>('all')
  const [enrichmentQueue, setEnrichmentQueue] = useState<IntelligenceItem[]>([])
  
  // Performance optimization - debounced search
  const debouncedSearch = useDebounce(setSearchQuery, 300)
  
  // Component mount/unmount logging
  useEffect(() => {
    permanentLogger.breadcrumb('kanban_mount', 'Kanban component mounted', {
      sessionId,
      domain: companyDomain,
      categoriesCount: Object.keys(data.categories).length
    })

    return () => {
      permanentLogger.breadcrumb('kanban_unmount', 'Kanban component unmounted', {
        sessionId
      })
    }
  }, [sessionId, companyDomain])

  // Update data when props change
  useEffect(() => {
    setData(intelligenceData)
  }, [intelligenceData])

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  /**
   * Get items for a specific category
   */
  const getCategoryItems = useCallback((category: IntelligenceCategory): IntelligenceItem[] => {
    return data.categories[category]?.items || []
  }, [data])

  /**
   * Filter items based on search query
   */
  const filteredData = useMemo(() => {
    if (!searchQuery) return data

    const filtered: IntelligenceData = {
      ...data,
      categories: {}
    }

    Object.entries(data.categories).forEach(([category, categoryData]) => {
      const filteredItems = categoryData.items.filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.content?.toLowerCase().includes(searchQuery.toLowerCase())
      )

      if (filteredItems.length > 0) {
        filtered.categories[category as IntelligenceCategory] = {
          ...categoryData,
          items: filteredItems
        }
      }
    })

    permanentLogger.breadcrumb('kanban_search', 'Search performed', {
      query: searchQuery,
      resultsCount: Object.values(filtered.categories).reduce((sum, cat) => sum + cat.items.length, 0)
    })

    return filtered
  }, [data, searchQuery])

  /**
   * Handle drag start
   */
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    const activeData = active.data.current
    
    if (activeData?.type === 'item') {
      setActiveId(active.id)
      setActiveItem(activeData.item)
      
      permanentLogger.breadcrumb('drag_start', 'Item drag started', {
        itemId: active.id,
        itemTitle: activeData.item.title
      })
    }
  }, [])

  /**
   * Handle drag over (for live preview)
   */
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event
    
    if (!over) return
    
    const activeData = active.data.current
    const overData = over.data.current
    
    if (activeData?.type === 'item' && overData?.type === 'category') {
      // Visual feedback when hovering over category
    }
  }, [])

  /**
   * Handle drag end
   */
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    
    if (!over) {
      setActiveId(null)
      setActiveItem(null)
      return
    }
    
    const activeData = active.data.current
    const overData = over.data.current
    
    if (activeData?.type === 'item') {
      const item = activeData.item as IntelligenceItem
      const sourceCategory = item.category
      let targetCategory: IntelligenceCategory | null = null
      
      // Determine target category
      if (overData?.type === 'category') {
        targetCategory = overData.category
      } else if (overData?.type === 'item') {
        targetCategory = overData.item.category
      }
      
      if (targetCategory && sourceCategory !== targetCategory) {
        // Move item to new category
        const timer = permanentLogger.timing('item_move', {
          from: sourceCategory,
          to: targetCategory
        })
        
        try {
          // Update local state
          const newData = { ...data }
          
          // Remove from source
          const sourceItems = newData.categories[sourceCategory].items
          const itemIndex = sourceItems.findIndex(i => i.id === item.id)
          if (itemIndex > -1) {
            sourceItems.splice(itemIndex, 1)
          }
          
          // Add to target
          const updatedItem = { ...item, category: targetCategory }
          newData.categories[targetCategory].items.push(updatedItem)
          
          setData(newData)
          
          // Persist to database if repository available
          if (repository) {
            await repository.updateIntelligenceItem({
              id: item.id,
              category: targetCategory
            })
          }
          
          // Notify parent
          if (onDataUpdate) {
            onDataUpdate(newData)
          }
          
          timer.stop()
          
          permanentLogger.info('KANBAN', 'Item moved successfully', {
            itemId: item.id,
            from: sourceCategory,
            to: targetCategory
          })
          
        } catch (error) {
          timer.stop()
          const jsError = convertSupabaseError(error)
          permanentLogger.captureError('KANBAN', jsError, {
            context: 'Failed to move item',
            itemId: item.id
          })
        }
      } else if (targetCategory === sourceCategory && overData?.type === 'item') {
        // Reorder within same category
        const targetItem = overData.item as IntelligenceItem
        const newData = { ...data }
        const items = newData.categories[sourceCategory].items
        
        const oldIndex = items.findIndex(i => i.id === item.id)
        const newIndex = items.findIndex(i => i.id === targetItem.id)
        
        if (oldIndex !== newIndex) {
          newData.categories[sourceCategory].items = arrayMove(items, oldIndex, newIndex)
          setData(newData)
          
          if (onDataUpdate) {
            onDataUpdate(newData)
          }
          
          permanentLogger.breadcrumb('item_reorder', 'Item reordered', {
            itemId: item.id,
            from: oldIndex,
            to: newIndex
          })
        }
      }
    }
    
    setActiveId(null)
    setActiveItem(null)
  }, [data, repository, onDataUpdate])

  /**
   * Handle drag cancel
   */
  const handleDragCancel = useCallback(() => {
    setActiveId(null)
    setActiveItem(null)
    
    permanentLogger.breadcrumb('drag_cancel', 'Drag operation cancelled', {})
  }, [])

  /**
   * Add items to enrichment queue
   */
  const handleAddToEnrichmentQueue = useCallback((items: IntelligenceItem[]) => {
    setEnrichmentQueue(prev => {
      const newQueue = [...prev]
      items.forEach(item => {
        if (!newQueue.find(i => i.id === item.id)) {
          newQueue.push(item)
        }
      })
      
      permanentLogger.info('KANBAN', 'Items added to enrichment queue', {
        addedCount: items.length,
        totalQueueSize: newQueue.length
      })
      
      return newQueue
    })
  }, [])

  /**
   * Process enrichment queue
   */
  const handleProcessEnrichmentQueue = useCallback(async () => {
    if (!onEnrichmentRequest || enrichmentQueue.length === 0) return
    
    const timer = permanentLogger.timing('enrichment_process', {
      queueSize: enrichmentQueue.length
    })
    
    try {
      await onEnrichmentRequest(enrichmentQueue)
      setEnrichmentQueue([])
      timer.stop()
      
      permanentLogger.info('KANBAN', 'Enrichment queue processed', {
        processedCount: enrichmentQueue.length
      })
    } catch (error) {
      timer.stop()
      const jsError = convertSupabaseError(error)
      permanentLogger.captureError('KANBAN', jsError, {
        context: 'Enrichment processing failed',
        queueSize: enrichmentQueue.length
      })
    }
  }, [enrichmentQueue, onEnrichmentRequest])

  /**
   * Custom collision detection for better UX
   */
  const collisionDetectionAlgorithm: CollisionDetection = useCallback((args) => {
    // First try pointer within
    const pointerCollisions = pointerWithin(args)
    if (pointerCollisions.length > 0) {
      return pointerCollisions
    }
    
    // Fallback to closest corners
    return closestCorners(args)
  }, [])

  // Calculate statistics
  const stats = useMemo(() => {
    const categories = Object.values(filteredData.categories)
    const totalItems = categories.reduce((sum, cat) => sum + cat.items.length, 0)
    const enrichedItems = categories.reduce((sum, cat) => 
      sum + cat.items.filter(item => item.status === ExtractionStatus.ENRICHED).length, 0
    )
    const pendingItems = categories.reduce((sum, cat) => 
      sum + cat.items.filter(item => item.status === ExtractionStatus.PENDING).length, 0
    )
    
    return {
      totalItems,
      enrichedItems,
      pendingItems,
      categoriesCount: categories.length
    }
  }, [filteredData])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="h-6 w-6" />
            Intelligence Organization
          </h2>
          <p className="text-muted-foreground">
            Drag and drop to organize intelligence for {companyDomain}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {stats.totalItems} items
          </Badge>
          <Badge variant="default">
            {stats.enrichedItems} enriched
          </Badge>
          {stats.pendingItems > 0 && (
            <Badge variant="outline">
              {stats.pendingItems} pending
            </Badge>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search intelligence items..."
            className="pl-9"
            onChange={(e) => debouncedSearch(e.target.value)}
          />
        </div>
        {enrichmentQueue.length > 0 && (
          <TooltipWrapper content={`Process ${enrichmentQueue.length} items for enrichment`}>
            <Button 
              onClick={handleProcessEnrichmentQueue}
              variant="default"
              size="sm"
            >
              <Send className="h-4 w-4 mr-2" />
              Enrich ({enrichmentQueue.length})
            </Button>
          </TooltipWrapper>
        )}
      </div>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)}>
        <TabsList>
          <TabsTrigger value="kanban">
            <Layers className="h-4 w-4 mr-2" />
            Organize
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="enrichment">
            <Sparkles className="h-4 w-4 mr-2" />
            Enrichment Queue
          </TabsTrigger>
        </TabsList>

        {/* Kanban View */}
        <TabsContent value="kanban" className="mt-6">
          <DndContext
            sensors={sensors}
            collisionDetection={collisionDetectionAlgorithm}
            modifiers={[restrictToWindowEdges]}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Object.entries(filteredData.categories).map(([category, categoryData]) => (
                <DroppableColumn
                  key={category}
                  category={category as IntelligenceCategory}
                  items={categoryData.items}
                  isActive={activeItem?.category === category}
                />
              ))}
            </div>
            
            <DragOverlay modifiers={[restrictToWindowEdges]}>
              {activeItem ? (
                <DraggableCard item={activeItem} isDragging />
              ) : null}
            </DragOverlay>
          </DndContext>
        </TabsContent>

        {/* Analytics View */}
        <TabsContent value="analytics" className="mt-6">
          <AnalyticsView
            data={filteredData}
            sessionId={sessionId}
            repository={repository}
            enableRealTime={enableRealTime}
          />
        </TabsContent>

        {/* Enrichment Queue View */}
        <TabsContent value="enrichment" className="mt-6">
          <EnrichmentQueue
            queue={enrichmentQueue}
            onRemoveItem={(id) => {
              setEnrichmentQueue(prev => prev.filter(item => item.id !== id))
            }}
            onClearQueue={() => setEnrichmentQueue([])}
            onProcessQueue={handleProcessEnrichmentQueue}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}