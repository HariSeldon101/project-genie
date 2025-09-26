'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TooltipWrapper } from '@/components/company-intelligence/tooltip-wrapper'
import {
  ChevronDown,
  Eye,
  Star,
  CheckSquare,
  Square,
  Maximize2,
  Copy,
  ExternalLink
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { animationVariants } from './types'
import type { ScrapedDataCategory, DataItem } from './types'

interface DataCategoryCardProps {
  category: ScrapedDataCategory
  items: DataItem[]
  selectedCount: number
  Icon: React.ComponentType<any>
  onToggle: () => void
  onItemToggle: (itemId: string, selected: boolean) => void
  onCategorySelect: (selectAll: boolean) => void
  selectedItemIds: Set<string>
}

export function DataCategoryCard({
  category,
  items,
  selectedCount,
  Icon,
  onToggle,
  onItemToggle,
  onCategorySelect,
  selectedItemIds
}: DataCategoryCardProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  const allSelected = items.length > 0 && items.every(item => selectedItemIds.has(item.id))
  const someSelected = selectedCount > 0

  // Handle item expansion
  const toggleItemExpansion = (itemId: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedItems(newExpanded)
  }

  // Copy content to clipboard
  const copyToClipboard = async (content: string) => {
    await navigator.clipboard.writeText(content)
  }

  // Get source badge color
  const getSourceColor = (source: DataItem['source']) => {
    switch (source) {
      case 'firecrawl':
        return 'bg-blue-500'
      case 'playwright':
        return 'bg-purple-500'
      case 'cheerio':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
  }

  // Get quality color
  const getQualityColor = (quality: number) => {
    if (quality >= 80) return 'text-green-500'
    if (quality >= 60) return 'text-blue-500'
    if (quality >= 40) return 'text-yellow-500'
    return 'text-red-500'
  }

  return (
    <motion.div
      className={cn(
        "border rounded-lg overflow-hidden transition-all",
        someSelected && "border-primary/50 bg-primary/5"
      )}
      initial={false}
      animate={{
        backgroundColor: someSelected ? 'rgba(var(--primary-rgb), 0.02)' : 'transparent'
      }}
      transition={{ duration: 0.2 }}
    >
      {/* Header - Always visible */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* Category icon */}
          <div className="p-2 rounded-lg bg-accent">
            <Icon className="h-5 w-5 text-primary" />
          </div>

          {/* Category info */}
          <div className="text-left">
            <span className="font-medium">{category.title}</span>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                {items.length} items
              </Badge>
              {selectedCount > 0 && (
                <Badge variant="default" className="text-xs bg-green-500">
                  {selectedCount} selected
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          {/* Category select/deselect buttons */}
          {items.length > 0 && (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <TooltipWrapper content="Select all in category">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onCategorySelect(true)}
                  disabled={allSelected}
                >
                  <CheckSquare className="h-4 w-4" />
                </Button>
              </TooltipWrapper>

              <TooltipWrapper content="Deselect all in category">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onCategorySelect(false)}
                  disabled={selectedCount === 0}
                >
                  <Square className="h-4 w-4" />
                </Button>
              </TooltipWrapper>
            </div>
          )}

          {/* Expand/collapse chevron */}
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              category.expanded && "rotate-180"
            )}
          />
        </div>
      </button>

      {/* Content - Collapsible */}
      <AnimatePresence initial={false}>
        {category.expanded && (
          <motion.div
            key="content"
            initial="collapsed"
            animate="open"
            exit="collapsed"
            variants={animationVariants.categoryAnimation}
          >
            <div className="border-t">
              <ScrollArea className="h-[400px]">
                <div className="p-4 space-y-3">
                  {items.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        "group relative p-3 rounded-lg border transition-all",
                        selectedItemIds.has(item.id)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-accent/50",
                        hoveredItem === item.id && "shadow-md"
                      )}
                      onMouseEnter={() => setHoveredItem(item.id)}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      {/* Main content row */}
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <TooltipWrapper content="Select for LLM enrichment">
                          <Checkbox
                            checked={selectedItemIds.has(item.id)}
                            onCheckedChange={(checked) => onItemToggle(item.id, !!checked)}
                            className="mt-0.5"
                          />
                        </TooltipWrapper>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {/* Header with type and badges */}
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{item.type}</span>

                            {/* Source badge */}
                            <Badge
                              variant="outline"
                              className={cn("text-xs", getSourceColor(item.source), "text-white")}
                            >
                              {item.source}
                            </Badge>

                            {/* Quality indicator */}
                            <TooltipWrapper content={`Quality score: ${item.quality}%`}>
                              <div className="flex items-center gap-1">
                                <Star className={cn("h-3 w-3", getQualityColor(item.quality))} />
                                <span className="text-xs">{item.quality}%</span>
                              </div>
                            </TooltipWrapper>

                            {/* Token count */}
                            <TooltipWrapper content="Estimated token count">
                              <Badge variant="outline" className="text-xs">
                                ~{item.tokens} tokens
                              </Badge>
                            </TooltipWrapper>

                            {/* Metadata indicators */}
                            {item.validated && (
                              <TooltipWrapper content="Content has been validated">
                                <Badge variant="outline" className="text-xs bg-green-500/10">
                                  ✓ Validated
                                </Badge>
                              </TooltipWrapper>
                            )}
                          </div>

                          {/* Preview text */}
                          <div className={cn(
                            "text-sm text-muted-foreground",
                            !expandedItems.has(item.id) && "line-clamp-2"
                          )}>
                            {item.preview}
                          </div>

                          {/* Expanded content */}
                          <AnimatePresence>
                            {expandedItems.has(item.id) && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="mt-3"
                              >
                                <div className="p-3 bg-muted/50 rounded-lg">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium">Full Content</span>
                                    <TooltipWrapper content="Copy to clipboard">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => copyToClipboard(JSON.stringify(item.content, null, 2))}
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </TooltipWrapper>
                                  </div>
                                  <pre className="text-xs whitespace-pre-wrap break-all overflow-hidden">
                                    {JSON.stringify(item.content, null, 2).slice(0, 500)}
                                    {JSON.stringify(item.content).length > 500 && '...'}
                                  </pre>

                                  {/* Metadata */}
                                  {item.metadata && (
                                    <div className="mt-3 pt-3 border-t space-y-1">
                                      <span className="text-xs font-medium">Metadata</span>
                                      {item.metadata.url && (
                                        <div className="text-xs text-muted-foreground">
                                          URL: <a href={item.metadata.url} className="underline hover:text-primary" target="_blank" rel="noopener noreferrer">
                                            {item.metadata.url}
                                            <ExternalLink className="inline h-3 w-3 ml-1" />
                                          </a>
                                        </div>
                                      )}
                                      {item.metadata.selector && (
                                        <div className="text-xs text-muted-foreground">
                                          Selector: <code className="bg-muted px-1 rounded">{item.metadata.selector}</code>
                                        </div>
                                      )}
                                      {item.metadata.confidence !== undefined && (
                                        <div className="text-xs text-muted-foreground">
                                          Confidence: {Math.round(item.metadata.confidence * 100)}%
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <TooltipWrapper content={expandedItems.has(item.id) ? "Collapse" : "Expand details"}>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleItemExpansion(item.id)}
                            >
                              {expandedItems.has(item.id) ? (
                                <ChevronDown className="h-4 w-4 rotate-180" />
                              ) : (
                                <Maximize2 className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipWrapper>

                          <TooltipWrapper content="View full details">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                // This could open a modal with full details
                                console.log('View details:', item)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipWrapper>
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {/* Empty state for category */}
                  {items.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">No items in this category</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}