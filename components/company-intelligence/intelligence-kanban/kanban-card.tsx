// components/company-intelligence/intelligence-kanban/kanban-card.tsx
'use client'

import React, { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TooltipWrapper } from '@/components/company-intelligence/tooltip-wrapper'
import { motion } from 'framer-motion'
import {
  GripVertical,
  ExternalLink,
  Eye,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  Link,
  Calendar
} from 'lucide-react'

interface KanbanCardProps {
  item: {
    id: string
    type?: string
    content?: any
    source?: string
    confidence?: number
    extractedAt?: string
    enriched?: boolean
    status?: string
    needsReview?: boolean
    url?: string
  }
  viewMode: 'compact' | 'detailed'
  categoryColor: string
  onAddToQueue?: () => void
  isDragging?: boolean
}

/**
 * KanbanCard Component
 * 
 * Features:
 * - Draggable with visual feedback
 * - Compact and detailed view modes
 * - Confidence indicators
 * - Source information display
 * - Status badges
 * - Hover effects and animations
 */
export function KanbanCard({
  item,
  viewMode,
  categoryColor,
  onAddToQueue,
  isDragging = false
}: KanbanCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isCardDragging
  } = useSortable({
    id: item.id,
    data: {
      type: 'Item',
      item
    }
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isCardDragging ? 0.5 : 1
  }

  // Get border color class
  const getBorderColorClass = () => {
    const colorMap: { [key: string]: string } = {
      blue: 'border-l-blue-500',
      purple: 'border-l-purple-500',
      green: 'border-l-green-500',
      red: 'border-l-red-500',
      orange: 'border-l-orange-500',
      teal: 'border-l-teal-500',
      indigo: 'border-l-indigo-500',
      yellow: 'border-l-yellow-500',
      pink: 'border-l-pink-500',
      cyan: 'border-l-cyan-500',
      lime: 'border-l-lime-500',
      amber: 'border-l-amber-500',
      violet: 'border-l-violet-500',
      fuchsia: 'border-l-fuchsia-500',
      rose: 'border-l-rose-500',
      sky: 'border-l-sky-500',
      emerald: 'border-l-emerald-500',
      slate: 'border-l-slate-500',
      zinc: 'border-l-zinc-500',
      stone: 'border-l-stone-500',
      neutral: 'border-l-neutral-500',
      gray: 'border-l-gray-500'
    }
    
    return colorMap[categoryColor] || 'border-l-gray-500'
  }

  // Get status icon
  const getStatusIcon = () => {
    if (item.enriched) {
      return <CheckCircle2 className="h-3 w-3 text-green-500" />
    }
    if (item.needsReview) {
      return <AlertCircle className="h-3 w-3 text-amber-500" />
    }
    if (item.status === 'pending') {
      return <Clock className="h-3 w-3 text-gray-500" />
    }
    return null
  }

  // Get confidence color
  const getConfidenceColor = () => {
    const confidence = item.confidence || 0.7
    if (confidence > 0.8) return 'text-green-600 bg-green-50 border-green-200'
    if (confidence > 0.5) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

  // Format content preview
  const getContentPreview = () => {
    if (!item.content) return 'No content available'
    
    if (typeof item.content === 'string') {
      return item.content.substring(0, 150)
    }
    
    if (typeof item.content === 'object') {
      // Try to extract meaningful text from object
      if (item.content.text) return item.content.text.substring(0, 150)
      if (item.content.description) return item.content.description.substring(0, 150)
      if (item.content.value) return item.content.value.toString().substring(0, 150)
      
      // Fallback to JSON string
      const jsonStr = JSON.stringify(item.content)
      return jsonStr.substring(0, 150)
    }
    
    return item.content.toString().substring(0, 150)
  }

  // Format source name
  const getSourceName = () => {
    if (!item.source) return 'Unknown source'
    
    // Extract filename or last part of URL
    const parts = item.source.split('/')
    const lastPart = parts[parts.length - 1]
    
    // Remove file extension if present
    const name = lastPart.split('.')[0]
    
    // Truncate if too long
    return name.length > 20 ? name.substring(0, 20) + '...' : name
  }

  // Format date
  const formatDate = () => {
    if (!item.extractedAt) return 'Unknown date'
    
    const date = new Date(item.extractedAt)
    const now = new Date()
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffHours < 48) return 'Yesterday'
    if (diffHours < 168) return `${Math.floor(diffHours / 24)}d ago`
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`cursor-move ${isCardDragging ? 'z-50' : ''}`}
    >
      <Card className={`
        p-3 hover:shadow-md transition-all border-l-4 
        ${getBorderColorClass()}
        ${isCardDragging ? 'shadow-2xl ring-2 ring-primary ring-opacity-50' : ''}
        ${isDragging ? 'opacity-50' : ''}
      `}>
        <div className="flex items-start gap-2">
          {/* Drag Handle */}
          <div 
            {...listeners}
            className="cursor-grab active:cursor-grabbing mt-1 flex-shrink-0"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {viewMode === 'compact' ? (
              // Compact View
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {getStatusIcon()}
                  <p className="text-sm font-medium truncate">
                    {item.type || 'Intelligence Item'}
                  </p>
                </div>
                <Badge variant="outline" className={`text-xs ${getConfidenceColor()}`}>
                  {((item.confidence || 0.7) * 100).toFixed(0)}%
                </Badge>
              </div>
            ) : (
              // Detailed View
              <>
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getStatusIcon()}
                    <h4 className="text-sm font-semibold truncate">
                      {item.type || 'Intelligence Item'}
                    </h4>
                  </div>
                  <Badge variant="outline" className={`text-xs ${getConfidenceColor()}`}>
                    {((item.confidence || 0.7) * 100).toFixed(0)}%
                  </Badge>
                </div>

                {/* Content Preview */}
                <p className="text-xs text-muted-foreground line-clamp-3 mb-2">
                  {getContentPreview()}
                  {getContentPreview().length === 150 && '...'}
                </p>

                {/* Metadata */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* Source */}
                    <TooltipWrapper content={item.source || 'Source'}>
                      <Badge variant="secondary" className="text-xs flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {getSourceName()}
                      </Badge>
                    </TooltipWrapper>
                    
                    {/* Date */}
                    <TooltipWrapper content={item.extractedAt || 'Extraction date'}>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate()}
                      </span>
                    </TooltipWrapper>
                  </div>

                  {/* Actions */}
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-1"
                    >
                      {item.url && (
                        <TooltipWrapper content="View source">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation()
                              window.open(item.url, '_blank')
                            }}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </TooltipWrapper>
                      )}
                      
                      {onAddToQueue && !item.enriched && (
                        <TooltipWrapper content="Add to enrichment queue">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation()
                              onAddToQueue()
                            }}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </TooltipWrapper>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* Status Badges */}
                {(item.enriched || item.needsReview || item.status) && (
                  <div className="flex items-center gap-1 mt-2">
                    {item.enriched && (
                      <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                        Enriched
                      </Badge>
                    )}
                    {item.needsReview && (
                      <Badge variant="outline" className="text-xs text-amber-600 border-amber-600">
                        Needs Review
                      </Badge>
                    )}
                    {item.status === 'pending' && (
                      <Badge variant="outline" className="text-xs text-gray-600 border-gray-600">
                        Pending
                      </Badge>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

export default KanbanCard
