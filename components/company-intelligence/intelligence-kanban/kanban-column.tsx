// components/company-intelligence/intelligence-kanban/kanban-column.tsx
'use client'

import React, { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { TooltipWrapper } from '@/components/company-intelligence/tooltip-wrapper'
import { KanbanCard } from './kanban-card'
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Plus,
  MoreVertical,
  Sparkles,
  Clock,
  TrendingUp
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface KanbanColumnProps {
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
  onToggleExpand?: (columnId: string) => void
  isDragging?: boolean
}

/**
 * KanbanColumn Component
 * 
 * Features:
 * - Drag and drop support for items
 * - Collapsible header
 * - Visual confidence indicators
 * - Category-specific coloring
 * - Batch operations (add all to queue)
 * - Item count badges
 * - Smooth animations
 */
export function KanbanColumn({
  column,
  viewMode,
  onAddToQueue,
  onToggleExpand,
  isDragging = false
}: KanbanColumnProps) {
  const [isExpanded, setIsExpanded] = useState(column.expanded)
  const [isHovered, setIsHovered] = useState(false)

  // Calculate statistics
  const stats = {
    total: column.items.length,
    enriched: column.items.filter((item: any) => item.enriched).length,
    pending: column.items.filter((item: any) => item.status === 'pending').length,
    review: column.items.filter((item: any) => item.needsReview).length
  }

  // Get category color classes
  const getCategoryColorClasses = () => {
    const baseClasses = 'transition-all duration-200'
    const colorMap: { [key: string]: string } = {
      blue: 'border-blue-500 bg-gradient-to-r from-blue-50 to-blue-100/50',
      purple: 'border-purple-500 bg-gradient-to-r from-purple-50 to-purple-100/50',
      green: 'border-green-500 bg-gradient-to-r from-green-50 to-green-100/50',
      red: 'border-red-500 bg-gradient-to-r from-red-50 to-red-100/50',
      orange: 'border-orange-500 bg-gradient-to-r from-orange-50 to-orange-100/50',
      teal: 'border-teal-500 bg-gradient-to-r from-teal-50 to-teal-100/50',
      indigo: 'border-indigo-500 bg-gradient-to-r from-indigo-50 to-indigo-100/50',
      yellow: 'border-yellow-500 bg-gradient-to-r from-yellow-50 to-yellow-100/50',
      pink: 'border-pink-500 bg-gradient-to-r from-pink-50 to-pink-100/50',
      cyan: 'border-cyan-500 bg-gradient-to-r from-cyan-50 to-cyan-100/50',
      lime: 'border-lime-500 bg-gradient-to-r from-lime-50 to-lime-100/50',
      amber: 'border-amber-500 bg-gradient-to-r from-amber-50 to-amber-100/50',
      violet: 'border-violet-500 bg-gradient-to-r from-violet-50 to-violet-100/50',
      fuchsia: 'border-fuchsia-500 bg-gradient-to-r from-fuchsia-50 to-fuchsia-100/50',
      rose: 'border-rose-500 bg-gradient-to-r from-rose-50 to-rose-100/50',
      sky: 'border-sky-500 bg-gradient-to-r from-sky-50 to-sky-100/50',
      emerald: 'border-emerald-500 bg-gradient-to-r from-emerald-50 to-emerald-100/50',
      slate: 'border-slate-500 bg-gradient-to-r from-slate-50 to-slate-100/50',
      zinc: 'border-zinc-500 bg-gradient-to-r from-zinc-50 to-zinc-100/50',
      stone: 'border-stone-500 bg-gradient-to-r from-stone-50 to-stone-100/50',
      neutral: 'border-neutral-500 bg-gradient-to-r from-neutral-50 to-neutral-100/50',
      gray: 'border-gray-500 bg-gradient-to-r from-gray-50 to-gray-100/50'
    }
    
    return `${baseClasses} ${colorMap[column.color] || colorMap.gray}`
  }

  // Get icon background color
  const getIconBgColor = () => {
    const colorMap: { [key: string]: string } = {
      blue: 'bg-blue-500',
      purple: 'bg-purple-500',
      green: 'bg-green-500',
      red: 'bg-red-500',
      orange: 'bg-orange-500',
      teal: 'bg-teal-500',
      indigo: 'bg-indigo-500',
      yellow: 'bg-yellow-500',
      pink: 'bg-pink-500',
      cyan: 'bg-cyan-500',
      lime: 'bg-lime-500',
      amber: 'bg-amber-500',
      violet: 'bg-violet-500',
      fuchsia: 'bg-fuchsia-500',
      rose: 'bg-rose-500',
      sky: 'bg-sky-500',
      emerald: 'bg-emerald-500',
      slate: 'bg-slate-500',
      zinc: 'bg-zinc-500',
      stone: 'bg-stone-500',
      neutral: 'bg-neutral-500',
      gray: 'bg-gray-500'
    }
    
    return colorMap[column.color] || 'bg-gray-500'
  }

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isColumnDragging
  } = useSortable({
    id: column.id,
    data: {
      type: 'Column',
      column
    }
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isColumnDragging ? 0.5 : 1
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`w-80 flex flex-col h-full ${isDragging ? 'ring-2 ring-primary ring-opacity-50' : ''}`}
    >
      <Card className={`flex flex-col h-full border-t-4 ${getCategoryColorClasses()}`}>
        <CardHeader className="pb-3">
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <motion.div 
                    className={`p-1.5 rounded ${getIconBgColor()} text-white`}
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
                    </CardTitle>
                    {viewMode === 'detailed' && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {stats.total} items • {(column.confidence * 100).toFixed(0)}% confidence
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Item Count Badge */}
                  <Badge variant="outline" className="text-xs">
                    {stats.total}
                  </Badge>
                  
                  {/* Confidence Indicator */}
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
                  
                  {/* More Options */}
                  <TooltipWrapper content="More options">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation()
                        // Handle more options
                      }}
                    >
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </TooltipWrapper>
                </div>
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
              {/* Category Statistics */}
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
                      Add all to enrichment queue
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Items Container */}
              <CardContent className="flex-1 overflow-hidden p-1 mt-3">
                <ScrollArea className="h-[400px] pr-2">
                  <SortableContext
                    items={column.items.map((item: any) => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      <AnimatePresence mode="popLayout">
                        {column.items.map((item: any, index: number) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ delay: index * 0.02 }}
                          >
                            <KanbanCard
                              item={item}
                              viewMode={viewMode}
                              categoryColor={column.color}
                            />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      
                      {column.items.length === 0 && (
                        <motion.div 
                          className="flex flex-col items-center justify-center h-32 text-muted-foreground"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          <Sparkles className="h-8 w-8 text-muted-foreground/30 mb-2" />
                          <p className="text-xs text-center">No items in this category</p>
                          <p className="text-xs text-center mt-1">Drag items here to organize</p>
                        </motion.div>
                      )}
                    </div>
                  </SortableContext>
                </ScrollArea>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </CardHeader>
      </Card>
    </motion.div>
  )
}

export default KanbanColumn
