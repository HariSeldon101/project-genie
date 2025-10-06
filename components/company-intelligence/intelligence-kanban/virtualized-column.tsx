// components/company-intelligence/intelligence-kanban/virtualized-column.tsx
'use client'

import React, { useRef, useCallback, useMemo } from 'react'
import { FixedSizeList as List } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { TooltipWrapper } from '@/components/company-intelligence/tooltip-wrapper'
import { KanbanCard } from './kanban-card'
import { useVirtualList, useLazyLoad } from '@/lib/utils/ui-performance-utils'
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Plus,
  MoreVertical,
  Layers,
  Zap
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { permanentLogger } from '@/lib/utils/permanent-logger'

interface VirtualizedColumnProps {
  column: {
    id: string
    title: string
    items: any[]
    confidence: number
    icon: React.ReactNode
    color: string
    bgColor: string
    expanded: boolean
    visible: boolean
  }
  viewMode: 'compact' | 'detailed'
  onAddToQueue?: () => void
  virtualizeThreshold?: number
}

/**
 * VirtualizedKanbanColumn Component
 * 
 * High-performance column component with:
 * - Virtual scrolling for large item lists
 * - Lazy loading of items
 * - Optimized rendering
 * - Memory-efficient handling of 1000+ items
 * 
 * @param column - Column data with items
 * @param viewMode - Display mode (compact/detailed)
 * @param onAddToQueue - Callback for batch queue operations
 * @param virtualizeThreshold - Number of items before virtualization kicks in (default: 50)
 */
export function VirtualizedKanbanColumn({
  column,
  viewMode,
  onAddToQueue,
  virtualizeThreshold = 50
}: VirtualizedColumnProps) {
  const [isExpanded, setIsExpanded] = React.useState(column.expanded)
  const [isHovered, setIsHovered] = React.useState(false)
  const listRef = useRef<List>(null)
  
  // Determine if virtualization is needed
  const shouldVirtualize = column.items.length > virtualizeThreshold

  // Calculate item height based on view mode
  const getItemHeight = useCallback(() => {
    return viewMode === 'compact' ? 60 : 120
  }, [viewMode])

  // Statistics calculation with memoization
  const stats = useMemo(() => ({
    total: column.items.length,
    enriched: column.items.filter((item: any) => item.enriched).length,
    pending: column.items.filter((item: any) => item.status === 'pending').length,
    review: column.items.filter((item: any) => item.needsReview).length
  }), [column.items])

  // Get category styling
  const getCategoryStyles = useCallback(() => {
    const colorMap: { [key: string]: { border: string; bg: string; icon: string } } = {
      blue: { 
        border: 'border-t-blue-500', 
        bg: 'bg-gradient-to-r from-blue-50 to-blue-100/50',
        icon: 'bg-blue-500'
      },
      purple: { 
        border: 'border-t-purple-500', 
        bg: 'bg-gradient-to-r from-purple-50 to-purple-100/50',
        icon: 'bg-purple-500'
      },
      green: { 
        border: 'border-t-green-500', 
        bg: 'bg-gradient-to-r from-green-50 to-green-100/50',
        icon: 'bg-green-500'
      },
      red: { 
        border: 'border-t-red-500', 
        bg: 'bg-gradient-to-r from-red-50 to-red-100/50',
        icon: 'bg-red-500'
      },
      orange: { 
        border: 'border-t-orange-500', 
        bg: 'bg-gradient-to-r from-orange-50 to-orange-100/50',
        icon: 'bg-orange-500'
      },
      // ... add all other colors as needed
    }
    
    return colorMap[column.color] || colorMap.blue
  }, [column.color])

  const styles = getCategoryStyles()

  // Row renderer for virtualized list
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = column.items[index]
    
    return (
      <div style={style}>
        <LazyLoadedCard
          item={item}
          viewMode={viewMode}
          categoryColor={column.color}
          index={index}
        />
      </div>
    )
  }, [column.items, column.color, viewMode])

  // Log performance metrics
  React.useEffect(() => {
    if (shouldVirtualize) {
      permanentLogger.addBreadcrumb({
        message: 'Column virtualization activated',
        data: {
          columnId: column.id,
          itemCount: column.items.length,
          threshold: virtualizeThreshold
        }
      })
    }
  }, [shouldVirtualize, column.id, column.items.length, virtualizeThreshold])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="w-80 flex flex-col h-full"
    >
      <Card className={`flex flex-col h-full border-t-4 ${styles.border}`}>
        <CardHeader className={`pb-3 ${styles.bg}`}>
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <motion.div 
                    className={`p-1.5 rounded ${styles.icon} text-white`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {column.icon}
                  </motion.div>
                  <div className="text-left">
                    <CardTitle className="text-sm font-semibold flex items-center gap-1">
                      {column.title}
                      {isExpanded ? 
                        <ChevronDown className="h-3 w-3 text-muted-foreground" /> : 
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      }
                      {shouldVirtualize && (
                        <TooltipWrapper content="Virtualized for performance">
                          <Zap className="h-3 w-3 text-yellow-500" />
                        </TooltipWrapper>
                      )}
                    </CardTitle>
                    {viewMode === 'detailed' && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {stats.total} items • {(column.confidence * 100).toFixed(0)}% confidence
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {stats.total}
                  </Badge>
                  
                  <TooltipWrapper content={`${(column.confidence * 100).toFixed(0)}% confidence`}>
                    <div className="flex items-center gap-1">
                      {column.confidence > 0.8 ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : column.confidence > 0.5 ? (
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </TooltipWrapper>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation()
                      // Handle options
                    }}
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
              {/* Statistics */}
              {viewMode === 'detailed' && (stats.enriched > 0 || stats.review > 0 || stats.pending > 0) && (
                <div className="flex items-center gap-2 mt-3 px-1">
                  {stats.enriched > 0 && (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>{stats.enriched} enriched</span>
                    </div>
                  )}
                  {stats.review > 0 && (
                    <div className="flex items-center gap-1 text-xs text-amber-600">
                      <AlertCircle className="h-3 w-3" />
                      <span>{stats.review} review</span>
                    </div>
                  )}
                  {stats.pending > 0 && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span>{stats.pending} pending</span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Quick Actions */}
              <AnimatePresence>
                {column.items.length > 0 && isHovered && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-3"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={onAddToQueue}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add all {stats.total} items to queue
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Items Container with Virtualization */}
              <CardContent className="flex-1 overflow-hidden p-1 mt-3">
                {shouldVirtualize ? (
                  // Virtualized List for large datasets
                  <div className="h-[400px]">
                    <AutoSizer>
                      {({ height, width }) => (
                        <List
                          ref={listRef}
                          height={height}
                          itemCount={column.items.length}
                          itemSize={getItemHeight()}
                          width={width}
                          overscanCount={5}
                          className="scrollbar-thin scrollbar-thumb-gray-300"
                        >
                          {Row}
                        </List>
                      )}
                    </AutoSizer>
                  </div>
                ) : (
                  // Regular scrollable list for small datasets
                  <div className="h-[400px] overflow-y-auto pr-2 space-y-2">
                    <SortableContext
                      items={column.items.map((item: any) => item.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {column.items.map((item: any, index: number) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min(index * 0.02, 0.3) }}
                        >
                          <KanbanCard
                            item={item}
                            viewMode={viewMode}
                            categoryColor={column.color}
                          />
                        </motion.div>
                      ))}
                    </SortableContext>
                    
                    {column.items.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                        <Layers className="h-8 w-8 text-muted-foreground/30 mb-2" />
                        <p className="text-xs text-center">No items in this category</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </CardHeader>
      </Card>
    </motion.div>
  )
}

/**
 * LazyLoadedCard Component
 * 
 * Individual card component with lazy loading
 * Only renders when visible in viewport
 * 
 * @param item - Card data
 * @param viewMode - Display mode
 * @param categoryColor - Category color scheme
 * @param index - Item index in list
 */
function LazyLoadedCard({
  item,
  viewMode,
  categoryColor,
  index
}: {
  item: any
  viewMode: 'compact' | 'detailed'
  categoryColor: string
  index: number
}) {
  const [ref, isVisible] = useLazyLoad({
    threshold: 0.1,
    rootMargin: '50px'
  })

  // Log lazy loading metrics periodically
  React.useEffect(() => {
    if (isVisible && index % 100 === 0) {
      permanentLogger.addBreadcrumb({
        message: 'Lazy load milestone',
        data: { index, itemId: item.id }
      })
    }
  }, [isVisible, index, item.id])

  return (
    <div ref={ref} className="px-1">
      {isVisible ? (
        <KanbanCard
          item={item}
          viewMode={viewMode}
          categoryColor={categoryColor}
        />
      ) : (
        // Placeholder while loading
        <div className="h-16 bg-gray-100 animate-pulse rounded-md" />
      )}
    </div>
  )
}

export default VirtualizedKanbanColumn