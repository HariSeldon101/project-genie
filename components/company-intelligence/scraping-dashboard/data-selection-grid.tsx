'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TooltipWrapper } from '@/components/company-intelligence/tooltip-wrapper'
import {
  Search,
  Filter,
  CheckSquare,
  Square,
  Database,
  ChevronRight,
  Eye,
  Star,
  Sparkles,
  Building,
  Phone,
  Code,
  Share2,
  Package,
  FileText,
  Image,
  Globe
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { DataCategoryCard } from './data-category-card'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import type { ScrapedDataCategory, SelectedData, DataItem } from './types'

interface DataSelectionGridProps {
  scrapedData: ScrapedDataCategory[]
  onSelectionChange: (selection: SelectedData) => void
  selectedItems: SelectedData
}

// Icon mapping for categories
const categoryIcons: Record<string, React.ComponentType<any>> = {
  Building,
  Phone,
  Code,
  Share2,
  Package,
  FileText,
  Globe,
  Image
}

export function DataSelectionGrid({
  scrapedData,
  onSelectionChange,
  selectedItems
}: DataSelectionGridProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterQuality, setFilterQuality] = useState(0)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  // Calculate statistics
  const stats = useMemo(() => {
    const totalItems = scrapedData.reduce((acc, cat) => acc + cat.items.length, 0)
    const selectedCount = selectedItems.items.length

    // Calculate average quality with fallback for missing quality values
    const allItems = scrapedData.flatMap(cat => cat.items)
    const totalQuality = allItems.reduce((acc, item) => acc + (item.quality || 0), 0)
    const averageQuality = totalItems > 0 ? totalQuality / totalItems : 0

    return {
      totalItems,
      selectedCount,
      averageQuality: Math.round(averageQuality),
      totalCategories: scrapedData.length
    }
  }, [scrapedData, selectedItems])

  // Filter items based on search and quality
  const filteredData = useMemo(() => {
    return scrapedData.map(category => ({
      ...category,
      items: category.items.filter(item => {
        const matchesSearch = !searchQuery ||
          item.preview.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.type.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesQuality = item.quality >= filterQuality
        return matchesSearch && matchesQuality
      })
    }))
  }, [scrapedData, searchQuery, filterQuality])

  // Handle select all
  const handleSelectAll = useCallback(() => {
    const allItems = filteredData.flatMap(cat => cat.items)
    const totalTokens = allItems.reduce((acc, item) => acc + item.tokens, 0)
    const estimatedCost = calculateCost(totalTokens)

    permanentLogger.info('DATA_SELECTION', 'Selected all items', {
      count: allItems.length,
      tokens: totalTokens,
      cost: estimatedCost
    })

    onSelectionChange({
      items: allItems.map(item => ({ ...item, selected: true })),
      totalTokens,
      estimatedCost
    })
  }, [filteredData, onSelectionChange])

  // Handle clear all
  const handleClearAll = useCallback(() => {
    permanentLogger.info('DATA_SELECTION', 'Cleared all selections')

    onSelectionChange({
      items: [],
      totalTokens: 0,
      estimatedCost: 0
    })
  }, [onSelectionChange])

  // Handle individual item selection
  const handleItemToggle = useCallback((itemId: string, selected: boolean) => {
    const item = filteredData
      .flatMap(cat => cat.items)
      .find(i => i.id === itemId)

    if (!item) return

    const newItems = selected
      ? [...selectedItems.items, { ...item, selected: true }]
      : selectedItems.items.filter(i => i.id !== itemId)

    const totalTokens = newItems.reduce((acc, i) => acc + i.tokens, 0)
    const estimatedCost = calculateCost(totalTokens)

    permanentLogger.debug('DATA_SELECTION', 'Item selection toggled', {
      itemId,
      selected,
      newTotal: newItems.length
    })

    onSelectionChange({
      items: newItems,
      totalTokens,
      estimatedCost
    })
  }, [filteredData, selectedItems, onSelectionChange])

  // Handle category toggle
  const handleCategoryToggle = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  // Handle category selection
  const handleCategorySelect = useCallback((categoryId: string, selectAll: boolean) => {
    const category = filteredData.find(cat => cat.id === categoryId)
    if (!category) return

    let newItems: DataItem[]
    if (selectAll) {
      // Add all items from this category
      const categoryItems = category.items.map(item => ({ ...item, selected: true }))
      const existingOtherItems = selectedItems.items.filter(i => i.categoryId !== categoryId)
      newItems = [...existingOtherItems, ...categoryItems]
    } else {
      // Remove all items from this category
      newItems = selectedItems.items.filter(i => i.categoryId !== categoryId)
    }

    const totalTokens = newItems.reduce((acc, i) => acc + i.tokens, 0)
    const estimatedCost = calculateCost(totalTokens)

    permanentLogger.info('DATA_SELECTION', 'Category selection changed', {
      categoryId,
      selectAll,
      itemCount: category.items.length,
      newTotal: newItems.length
    })

    onSelectionChange({
      items: newItems,
      totalTokens,
      estimatedCost
    })
  }, [filteredData, selectedItems, onSelectionChange])

  // Calculate enrichment cost
  const calculateCost = (tokens: number): number => {
    // GPT-5 pricing estimate
    const costPerMillion = 15.00 // $15 per 1M tokens
    return (tokens / 1000000) * costPerMillion
  }

  // Get quality badge color
  const getQualityColor = (quality: number) => {
    if (quality >= 80) return 'text-green-500'
    if (quality >= 60) return 'text-blue-500'
    if (quality >= 40) return 'text-yellow-500'
    return 'text-red-500'
  }

  return (
    <Card className={cn(
      "overflow-hidden",
      "bg-gradient-to-br from-purple-50/80 to-purple-50/40",
      "dark:from-purple-950/20 dark:to-purple-950/10",
      "border-purple-200 dark:border-purple-800",
      "shadow-lg shadow-purple-100/50 dark:shadow-purple-900/20"
    )}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Scraped Data Selection</CardTitle>
              <CardDescription className="mt-1">
                Review and select data for LLM enrichment • {stats.totalItems} {stats.totalItems === 1 ? 'item' : 'items'} available
              </CardDescription>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Statistics badges */}
            <TooltipWrapper content="Selected items for enrichment">
              <Badge variant="default" className="gap-1">
                <CheckSquare className="h-3 w-3" />
                <span className="font-bold">{stats.selectedCount}</span>
              </Badge>
            </TooltipWrapper>

            <TooltipWrapper content="Average data quality score">
              <Badge variant="secondary" className="gap-1">
                <Star className={cn("h-3 w-3", getQualityColor(stats.averageQuality))} />
                <span className="font-bold">{stats.averageQuality}%</span>
              </Badge>
            </TooltipWrapper>

            {/* Bulk actions */}
            <TooltipWrapper content="Select all filtered items">
              <Button
                size="sm"
                variant="outline"
                onClick={handleSelectAll}
              >
                Select All
              </Button>
            </TooltipWrapper>

            <TooltipWrapper content="Clear all selections">
              <Button
                size="sm"
                variant="outline"
                onClick={handleClearAll}
                disabled={stats.selectedCount === 0}
              >
                Clear
              </Button>
            </TooltipWrapper>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search and filter controls */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search scraped data..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <TooltipWrapper content={`Filter by minimum quality: ${filterQuality}%`}>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                min={0}
                max={100}
                value={filterQuality}
                onChange={(e) => setFilterQuality(Number(e.target.value))}
                className="w-20"
                placeholder="0"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </TooltipWrapper>
        </div>

        {/* Category cards */}
        <ScrollArea className="h-[500px] pr-4">
          <AnimatePresence mode="wait">
            <motion.div
              className="space-y-4"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={{
                animate: {
                  transition: {
                    staggerChildren: 0.05
                  }
                }
              }}
            >
              {filteredData.map((category) => {
                const Icon = categoryIcons[category.icon] || Database
                const selectedInCategory = selectedItems.items.filter(
                  i => i.categoryId === category.id
                ).length

                return (
                  <motion.div
                    key={category.id}
                    variants={{
                      initial: { opacity: 0, y: 20 },
                      animate: { opacity: 1, y: 0 },
                      exit: { opacity: 0, y: -20 }
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <DataCategoryCard
                      category={{
                        ...category,
                        expanded: expandedCategories.has(category.id)
                      }}
                      items={category.items}
                      selectedCount={selectedInCategory}
                      Icon={Icon}
                      onToggle={() => handleCategoryToggle(category.id)}
                      onItemToggle={handleItemToggle}
                      onCategorySelect={(selectAll) => handleCategorySelect(category.id, selectAll)}
                      selectedItemIds={new Set(selectedItems.items.map(i => i.id))}
                    />
                  </motion.div>
                )
              })}

              {/* Empty state */}
              {filteredData.every(cat => cat.items.length === 0) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12"
                >
                  <Database className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">
                    {searchQuery || filterQuality > 0
                      ? 'No items match your filters'
                      : 'No data available yet. Run a scraper to collect data.'}
                  </p>
                  {(searchQuery || filterQuality > 0) && (
                    <Button
                      variant="link"
                      onClick={() => {
                        setSearchQuery('')
                        setFilterQuality(0)
                      }}
                      className="mt-2"
                    >
                      Clear filters
                    </Button>
                  )}
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </ScrollArea>

        {/* Summary footer */}
        {stats.selectedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="pt-4 border-t"
          >
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground">
                  {stats.selectedCount} of {stats.totalItems} items selected
                </span>
                <Badge variant="outline" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  ~{selectedItems.totalTokens.toLocaleString()} tokens
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Estimated cost:</span>
                <span className="font-semibold">${selectedItems.estimatedCost.toFixed(3)}</span>
              </div>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  )
}