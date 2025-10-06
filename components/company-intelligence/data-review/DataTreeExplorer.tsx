'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { ChevronDown, ChevronRight, Check, Minus, FileText, Database, Globe, Brain } from 'lucide-react'
import { DataCategory, DataItem } from './types'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'

interface DataTreeExplorerProps {
  categories: DataCategory[]
  onSelectionChange: (categoryId: string, itemId?: string) => void
  onToggleCategory: (categoryId: string) => void
  searchQuery: string
  onSearchChange: (query: string) => void
}

const sourceIcons = {
  scraping: <Globe className="w-3 h-3" />,
  extraction: <FileText className="w-3 h-3" />,
  external: <Database className="w-3 h-3" />,
  analysis: <Brain className="w-3 h-3" />
}

const qualityColors = {
  high: 'text-green-500',
  medium: 'text-yellow-500',
  low: 'text-red-500'
}

export function DataTreeExplorer({
  categories,
  onSelectionChange,
  onToggleCategory,
  searchQuery,
  onSearchChange
}: DataTreeExplorerProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(categories.map(c => c.id))
  )

  const toggleExpanded = useCallback((categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }, [])

  const filteredCategories = useMemo(() => {
    if (!searchQuery) return categories

    const query = searchQuery.toLowerCase()
    return categories.map(category => ({
      ...category,
      items: category.items.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        JSON.stringify(item.value).toLowerCase().includes(query)
      )
    })).filter(category => category.items.length > 0)
  }, [categories, searchQuery])

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  const formatConfidence = (confidence: number) => {
    return `${Math.round(confidence * 100)}%`
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <Input
          placeholder="Search data items..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full"
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {filteredCategories.map(category => (
            <div key={category.id} className="border rounded-lg">
              <div
                className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                onClick={() => toggleExpanded(category.id)}
              >
                <button className="mr-2">
                  {expandedCategories.has(category.id) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>

                <Checkbox
                  checked={category.selected}
                  indeterminate={category.indeterminate}
                  onCheckedChange={() => onSelectionChange(category.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="mr-3"
                />

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{category.name}</span>
                    <Badge variant="secondary">
                      {category.selectedCount}/{category.totalCount}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {formatSize(category.totalSize)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{category.description}</p>
                </div>
              </div>

              {expandedCategories.has(category.id) && (
                <div className="border-t">
                  {category.items.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center p-3 pl-12 hover:bg-gray-50 dark:hover:bg-gray-800 border-b last:border-b-0"
                    >
                      <Checkbox
                        checked={item.selected}
                        onCheckedChange={() => onSelectionChange(category.id, item.id)}
                        className="mr-3"
                      />

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{item.name}</span>
                          {sourceIcons[item.source]}
                          <span
                            className={cn(
                              "text-xs font-medium",
                              qualityColors[item.quality]
                            )}
                          >
                            {formatConfidence(item.confidence)}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {item.quality}
                          </Badge>
                        </div>
                        {item.subcategory && (
                          <p className="text-xs text-gray-500 mt-1">{item.subcategory}</p>
                        )}
                      </div>

                      <div className="text-sm text-gray-500">
                        {formatSize(item.size)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}