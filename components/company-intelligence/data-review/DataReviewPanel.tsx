'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { DataTreeExplorer } from './DataTreeExplorer'
import { DataPreviewPane } from './DataPreviewPane'
import { CostCalculator } from './CostCalculator'
import { SelectionToolbar } from './SelectionToolbar'
import {
  DataCategory,
  DataItem,
  DataReviewState,
  SelectionStats,
  SelectionPreset
} from './types'
import { Button } from '@/components/ui/button'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { ArrowRight } from 'lucide-react'

interface DataReviewPanelProps {
  extractedData: any // Raw extracted data from previous phase
  onProceed: (selectedData: any) => void
  onCancel: () => void
}

export function DataReviewPanel({ extractedData, onProceed, onCancel }: DataReviewPanelProps) {
  // Transform extracted data into categories and items
  const [state, setState] = useState<DataReviewState>(() => {
    const categories = transformDataToCategories(extractedData)
    const stats = calculateStats(categories)
    
    return {
      categories,
      searchQuery: '',
      filterQuality: 'all',
      filterSource: 'all',
      sortBy: 'confidence',
      sortDirection: 'desc',
      selectedItemIds: new Set(categories.flatMap(c => 
        c.items.filter(i => i.quality === 'high').map(i => i.id)
      )),
      stats
    }
  })

  const [currentItem, setCurrentItem] = useState<DataItem | undefined>()

  // Handle selection changes
  const handleSelectionChange = useCallback((categoryId: string, itemId?: string) => {
    setState(prev => {
      const newState = { ...prev }
      const category = newState.categories.find(c => c.id === categoryId)
      
      if (!category) return prev

      if (itemId) {
        // Toggle individual item
        const item = category.items.find(i => i.id === itemId)
        if (item) {
          item.selected = !item.selected
          if (item.selected) {
            newState.selectedItemIds.add(itemId)
          } else {
            newState.selectedItemIds.delete(itemId)
          }
        }
      } else {
        // Toggle entire category
        const newSelected = !category.selected
        category.selected = newSelected
        category.items.forEach(item => {
          item.selected = newSelected
          if (newSelected) {
            newState.selectedItemIds.add(item.id)
          } else {
            newState.selectedItemIds.delete(item.id)
          }
        })
      }

      // Update category selection state
      category.selectedCount = category.items.filter(i => i.selected).length
      category.indeterminate = category.selectedCount > 0 && category.selectedCount < category.totalCount
      category.selected = category.selectedCount === category.totalCount

      // Recalculate stats
      newState.stats = calculateStats(newState.categories)

      permanentLogger.info('Data selection changed', {
        categoryId,
        itemId,
        selectedCount: newState.stats.selectedItems,
        totalCount: newState.stats.totalItems
      })

      return newState
    })
  }, [])

  // Handle preset selection
  const handleApplyPreset = useCallback((preset: SelectionPreset) => {
    setState(prev => {
      const newState = { ...prev }
      newState.selectedItemIds.clear()

      newState.categories.forEach(category => {
        category.items.forEach(item => {
          const shouldSelect = preset.filter(item)
          item.selected = shouldSelect
          if (shouldSelect) {
            newState.selectedItemIds.add(item.id)
          }
        })
        category.selectedCount = category.items.filter(i => i.selected).length
        category.indeterminate = category.selectedCount > 0 && category.selectedCount < category.totalCount
        category.selected = category.selectedCount === category.totalCount
      })

      newState.stats = calculateStats(newState.categories)

      permanentLogger.info('Applied selection preset', {
        preset: preset.name,
        selectedCount: newState.stats.selectedItems
      })

      return newState
    })
  }, [])

  // Handle select/deselect all
  const handleSelectAll = useCallback(() => {
    setState(prev => {
      const newState = { ...prev }
      newState.selectedItemIds.clear()

      newState.categories.forEach(category => {
        category.items.forEach(item => {
          item.selected = true
          newState.selectedItemIds.add(item.id)
        })
        category.selected = true
        category.selectedCount = category.totalCount
        category.indeterminate = false
      })

      newState.stats = calculateStats(newState.categories)
      return newState
    })
  }, [])

  const handleDeselectAll = useCallback(() => {
    setState(prev => {
      const newState = { ...prev }
      newState.selectedItemIds.clear()

      newState.categories.forEach(category => {
        category.items.forEach(item => {
          item.selected = false
        })
        category.selected = false
        category.selectedCount = 0
        category.indeterminate = false
      })

      newState.stats = calculateStats(newState.categories)
      return newState
    })
  }, [])

  // Handle proceed
  const handleProceed = useCallback(() => {
    const selectedData = {}
    
    state.categories.forEach(category => {
      const selectedItems = category.items.filter(i => i.selected)
      if (selectedItems.length > 0) {
        selectedData[category.id] = selectedItems.map(i => ({
          name: i.name,
          value: i.value,
          metadata: i.metadata
        }))
      }
    })

    permanentLogger.info('Proceeding with selected data', {
      selectedItems: state.stats.selectedItems,
      estimatedCost: (state.stats.estimatedTokens / 1_000_000) * 0.025
    })

    onProceed(selectedData)
  }, [state, onProceed])

  // Get selected items for preview
  const selectedItems = useMemo(() => {
    return state.categories.flatMap(c => c.items.filter(i => i.selected))
  }, [state.categories])

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <SelectionToolbar
        selectedCount={state.stats.selectedItems}
        totalCount={state.stats.totalItems}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onApplyPreset={handleApplyPreset}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Tree Explorer */}
        <div className="w-1/3 border-r">
          <DataTreeExplorer
            categories={state.categories}
            onSelectionChange={handleSelectionChange}
            onToggleCategory={(id) => {/* Handle expand/collapse */}}
            searchQuery={state.searchQuery}
            onSearchChange={(query) => setState(prev => ({ ...prev, searchQuery: query }))}
          />
        </div>

        {/* Middle: Preview */}
        <div className="flex-1 p-4 overflow-auto">
          <DataPreviewPane
            selectedItems={selectedItems}
            currentItem={currentItem}
          />
        </div>

        {/* Right: Cost Calculator */}
        <div className="w-80 p-4 border-l">
          <div className="space-y-4">
            <CostCalculator stats={state.stats} />
            
            {/* Action Buttons */}
            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={handleProceed}
                disabled={state.stats.selectedItems === 0}
              >
                Proceed to Enrichment
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={onCancel}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper function to transform extracted data into categories
function transformDataToCategories(data: any): DataCategory[] {
  const categories: DataCategory[] = []
  let itemIdCounter = 0

  // Transform each data section into a category
  Object.entries(data || {}).forEach(([key, value]) => {
    const items: DataItem[] = []
    
    if (Array.isArray(value)) {
      value.forEach(item => {
        items.push({
          id: `item-${++itemIdCounter}`,
          category: key,
          name: item.name || item.title || `${key} Item`,
          value: item,
          source: 'extraction',
          confidence: item.confidence || 0.8,
          quality: item.confidence > 0.8 ? 'high' : item.confidence > 0.5 ? 'medium' : 'low',
          size: JSON.stringify(item).length,
          selected: item.confidence > 0.8, // Auto-select high confidence items
          metadata: {
            url: item.url,
            timestamp: new Date().toISOString()
          }
        })
      })
    } else if (typeof value === 'object' && value !== null) {
      Object.entries(value).forEach(([subKey, subValue]) => {
        items.push({
          id: `item-${++itemIdCounter}`,
          category: key,
          subcategory: subKey,
          name: subKey,
          value: subValue,
          source: 'extraction',
          confidence: 0.75,
          quality: 'medium',
          size: JSON.stringify(subValue).length,
          selected: true,
          metadata: {
            timestamp: new Date().toISOString()
          }
        })
      })
    }

    if (items.length > 0) {
      const selectedCount = items.filter(i => i.selected).length
      categories.push({
        id: key,
        name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: `Extracted ${key} data`,
        items,
        totalSize: items.reduce((sum, i) => sum + i.size, 0),
        selectedCount,
        totalCount: items.length,
        expanded: true,
        indeterminate: selectedCount > 0 && selectedCount < items.length,
        selected: selectedCount === items.length
      })
    }
  })

  return categories
}

// Helper function to calculate selection stats
function calculateStats(categories: DataCategory[]): SelectionStats {
  let totalItems = 0
  let selectedItems = 0
  let totalSize = 0
  let selectedSize = 0
  const categoryStats: Record<string, { selected: number, total: number }> = {}

  categories.forEach(category => {
    totalItems += category.totalCount
    selectedItems += category.selectedCount
    totalSize += category.totalSize
    
    category.items.forEach(item => {
      if (item.selected) {
        selectedSize += item.size
      }
    })

    categoryStats[category.id] = {
      selected: category.selectedCount,
      total: category.totalCount
    }
  })

  const estimatedTokens = Math.ceil(selectedSize / 4)

  return {
    totalItems,
    selectedItems,
    totalSize,
    selectedSize,
    estimatedTokens,
    estimatedCost: (estimatedTokens / 1_000_000) * 0.025,
    categories: categoryStats
  }
}