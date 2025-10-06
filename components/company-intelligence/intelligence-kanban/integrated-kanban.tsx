/**
 * Integrated Intelligence Kanban Component
 * COMPLIANT WITH CLAUDE.md - Uses unified SSE system through realtime handler
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { 
  CompanyIntelligenceRepositoryV4 
} from '@/lib/repositories/intelligence-repository-v4'
import { 
  useRealtimeEvents, 
  IntelligenceEventHelpers,
  type RealtimeConfig 
} from './realtime-handler'
import type { RealtimeEvent } from '@/lib/realtime-events/types'
import { KanbanColumn } from './kanban-column'
import { EnrichmentQueue } from './enrichment-queue'
import { AnalyticsView } from './analytics-view'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { PerformanceMonitor } from '@/lib/utils/ui-performance-utils'
import type {
  CompanyIntelligenceItem,
  IntelligenceCategory,
  CategoryGroup,
  IntelligenceData,
  KanbanMetrics
} from '@/lib/company-intelligence/types'
import { IntelligenceCategories } from '@/lib/company-intelligence/types/intelligence-categories'
import { useToast } from '@/components/ui/use-toast'

/**
 * Props for the integrated kanban component
 */
interface IntegratedKanbanProps {
  userId: string
  domain: string
  sessionId: string
  enableRealtime?: boolean
  enableAnalytics?: boolean
  enableEnrichment?: boolean
  className?: string
  onItemUpdate?: (item: CompanyIntelligenceItem) => void
  onCategoryChange?: (item: CompanyIntelligenceItem, newCategory: IntelligenceCategory) => void
}

/**
 * Main integrated kanban component
 */
export function IntegratedKanban({
  userId,
  domain,
  sessionId,
  enableRealtime = true,
  enableAnalytics = true,
  enableEnrichment = true,
  className = '',
  onItemUpdate,
  onCategoryChange
}: IntegratedKanbanProps) {
  // State management
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [intelligenceData, setIntelligenceData] = useState<IntelligenceData>({})
  const [selectedView, setSelectedView] = useState<'kanban' | 'analytics'>('kanban')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<Set<IntelligenceCategory>>(new Set())
  const [metrics, setMetrics] = useState<KanbanMetrics>({
    totalItems: 0,
    itemsByCategory: {},
    averageConfidence: 0,
    enrichmentProgress: 0,
    lastUpdateTime: new Date()
  })
  const [lastSync, setLastSync] = useState<Date | null>(null)

  const { toast } = useToast()
  const repository = CompanyIntelligenceRepositoryV4.getInstance()
  const performanceMonitor = useMemo(() => new PerformanceMonitor(), [])

  /**
   * Realtime configuration using unified system
   */
  const realtimeConfig: RealtimeConfig = useMemo(() => ({
    endpoint: `/api/intelligence/sse/${sessionId}`,
    sessionId,
    domain,
    onEvent: handleRealtimeEvent,
    onError: (error) => {
      toast({
        title: 'Connection Error',
        description: 'Lost connection to realtime updates',
        variant: 'destructive'
      })
      permanentLogger.captureError('INTEGRATED_KANBAN', error, {
        sessionId,
        domain
      })
    },
    reconnectInterval: 5000,
    maxReconnectAttempts: 5
  }), [sessionId, domain])

  /**
   * Use realtime events with unified system
   */
  const {
    status: realtimeStatus,
    events: realtimeEvents,
    sendEvent,
    isConnected,
    clearEvents
  } = useRealtimeEvents(enableRealtime ? realtimeConfig : { 
    ...realtimeConfig, 
    endpoint: '' // Disable if not enabled
  })

  /**
   * Load initial data from repository
   */
  const loadInitialData = useCallback(async () => {
    const startTime = performanceMonitor.startMeasure('load_initial_data')
    
    try {
      setLoading(true)
      setError(null)

      // Get or create session
      const session = await repository.getOrCreateUserSession(userId, domain)
      
      if (!session) {
        throw new Error('Failed to create session')
      }

      // Load intelligence items
      const items = await repository.getIntelligenceItems(session.id)
      
      // Group items by category
      const groupedData: IntelligenceData = {}
      
      items.forEach(item => {
        const category = item.category || 'UNCATEGORIZED'
        
        if (!groupedData[category]) {
          const categoryMetadata = IntelligenceCategories.getCategoryMetadata(category)
          groupedData[category] = {
            metadata: categoryMetadata,
            items: [],
            confidence: 0
          }
        }
        
        groupedData[category].items.push(item)
      })

      // Calculate confidence scores for each category
      Object.keys(groupedData).forEach(category => {
        const items = groupedData[category].items
        const avgConfidence = items.reduce((sum, item) => 
          sum + (item.confidence_score || 0), 0
        ) / (items.length || 1)
        groupedData[category].confidence = avgConfidence
      })

      setIntelligenceData(groupedData)
      
      // Update metrics
      const totalItems = items.length
      const itemsByCategory: Record<string, number> = {}
      Object.keys(groupedData).forEach(cat => {
        itemsByCategory[cat] = groupedData[cat].items.length
      })
      
      const avgConfidence = items.reduce((sum, item) => 
        sum + (item.confidence_score || 0), 0
      ) / (totalItems || 1)

      setMetrics({
        totalItems,
        itemsByCategory,
        averageConfidence: avgConfidence,
        enrichmentProgress: 0, // Calculate based on enrichment status
        lastUpdateTime: new Date()
      })

      permanentLogger.log('INTEGRATED_KANBAN', {
        action: 'data_loaded',
        itemCount: totalItems,
        categories: Object.keys(groupedData).length,
        sessionId
      })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data'
      setError(errorMessage)
      
      permanentLogger.captureError('INTEGRATED_KANBAN', err as Error, {
        sessionId,
        domain
      })
    } finally {
      setLoading(false)
      performanceMonitor.endMeasure(startTime)
    }
  }, [sessionId, domain, userId, repository, performanceMonitor])

  /**
   * Handle real-time events from unified system
   */
  const handleRealtimeEvent = useCallback((event: RealtimeEvent) => {
    permanentLogger.addBreadcrumb({
      message: 'Processing realtime event',
      data: {
        type: event.type,
        sessionId: event.sessionId
      }
    })

    // Process events based on type
    switch (event.type) {
      case 'intelligence:item_created':
        handleItemCreated(event.data)
        break
      
      case 'intelligence:batch_created':
        handleBatchCreated(event.data)
        break
      
      case 'intelligence:item_updated':
        handleItemUpdated(event.data)
        break
      
      case 'intelligence:item_deleted':
        handleItemDeleted(event.data)
        break
      
      case 'intelligence:category_updated':
        handleCategoryUpdated(event.data)
        break
      
      case 'intelligence:enrichment_completed':
        handleEnrichmentCompleted(event.data)
        break
      
      case 'intelligence:scraping_complete':
        // Reload all data when scraping completes
        loadInitialData()
        break
      
      default:
        // Unknown event type - log for debugging
        permanentLogger.addBreadcrumb({
          message: 'Unknown event type',
          data: { type: event.type }
        })
        break
    }
    
    // Update last sync time
    setLastSync(new Date())
  }, [loadInitialData])

  /**
   * Handle item created event
   */
  const handleItemCreated = useCallback((data: any) => {
    setIntelligenceData(prev => {
      const newData = { ...prev }
      const category = data.item?.category || 'UNCATEGORIZED'
      
      if (!newData[category]) {
        const categoryMetadata = IntelligenceCategories.getCategoryMetadata(category)
        newData[category] = {
          metadata: categoryMetadata,
          items: [],
          confidence: 0
        }
      }
      
      newData[category].items = [...newData[category].items, data.item]
      return newData
    })
    
    // Update metrics
    setMetrics(prev => ({
      ...prev,
      totalItems: prev.totalItems + 1,
      lastUpdateTime: new Date()
    }))

    // Show toast notification
    toast({
      title: 'New Item Added',
      description: `Added to ${data.item?.category || 'UNCATEGORIZED'}`
    })
  }, [toast])

  /**
   * Handle batch created event
   */
  const handleBatchCreated = useCallback((data: any) => {
    setIntelligenceData(prev => {
      const newData = { ...prev }
      
      data.items?.forEach((item: CompanyIntelligenceItem) => {
        const category = item.category || 'UNCATEGORIZED'
        
        if (!newData[category]) {
          const categoryMetadata = IntelligenceCategories.getCategoryMetadata(category)
          newData[category] = {
            metadata: categoryMetadata,
            items: [],
            confidence: 0
          }
        }
        
        newData[category].items.push(item)
      })
      
      return newData
    })
    
    // Update metrics
    setMetrics(prev => ({
      ...prev,
      totalItems: prev.totalItems + (data.items?.length || 0),
      lastUpdateTime: new Date()
    }))

    toast({
      title: 'Batch Import Complete',
      description: `Added ${data.items?.length || 0} items`
    })
  }, [toast])

  /**
   * Handle item updated event
   */
  const handleItemUpdated = useCallback((data: any) => {
    setIntelligenceData(prev => {
      const newData = { ...prev }
      
      // Find and update the item
      Object.keys(newData).forEach(category => {
        const index = newData[category].items.findIndex(
          item => item.id === data.item?.id
        )
        
        if (index !== -1) {
          // If category changed, move the item
          if (data.item.category !== category) {
            newData[category].items.splice(index, 1)
            
            const newCategory = data.item.category || 'UNCATEGORIZED'
            if (!newData[newCategory]) {
              const categoryMetadata = IntelligenceCategories.getCategoryMetadata(newCategory)
              newData[newCategory] = {
                metadata: categoryMetadata,
                items: [],
                confidence: 0
              }
            }
            newData[newCategory].items.push(data.item)
          } else {
            // Update in place
            newData[category].items[index] = data.item
          }
        }
      })
      
      return newData
    })
    
    setMetrics(prev => ({
      ...prev,
      lastUpdateTime: new Date()
    }))
  }, [])

  /**
   * Handle item deleted event
   */
  const handleItemDeleted = useCallback((data: any) => {
    setIntelligenceData(prev => {
      const newData = { ...prev }
      
      // Remove the item from all categories
      Object.keys(newData).forEach(category => {
        newData[category].items = newData[category].items.filter(
          item => item.id !== data.itemId
        )
      })
      
      return newData
    })
    
    setMetrics(prev => ({
      ...prev,
      totalItems: Math.max(0, prev.totalItems - 1),
      lastUpdateTime: new Date()
    }))
  }, [])

  /**
   * Handle category updated event
   */
  const handleCategoryUpdated = useCallback((data: any) => {
    setIntelligenceData(prev => {
      const newData = { ...prev }
      const category = data.category
      
      if (category && newData[category]) {
        newData[category].items = data.items || []
        
        // Recalculate confidence
        const avgConfidence = newData[category].items.reduce((sum, item) => 
          sum + (item.confidence_score || 0), 0
        ) / (newData[category].items.length || 1)
        newData[category].confidence = avgConfidence
      }
      
      return newData
    })
    
    setMetrics(prev => ({
      ...prev,
      lastUpdateTime: new Date()
    }))
  }, [])

  /**
   * Handle enrichment completed event
   */
  const handleEnrichmentCompleted = useCallback((data: any) => {
    setIntelligenceData(prev => {
      const newData = { ...prev }
      
      // Find and update the enriched item
      Object.keys(newData).forEach(category => {
        const item = newData[category].items.find(
          item => item.id === data.itemId
        )
        
        if (item) {
          // Update item with enrichment data
          Object.assign(item, data.enrichmentData)
        }
      })
      
      return newData
    })

    toast({
      title: 'Enrichment Complete',
      description: 'Item has been enriched with additional data'
    })
  }, [toast])

  /**
   * Handle drag and drop to change category
   */
  const handleItemDrop = useCallback(async (
    item: CompanyIntelligenceItem,
    newCategory: IntelligenceCategory
  ) => {
    const startTime = performanceMonitor.startMeasure('item_drop')
    
    try {
      // Update item category
      const updatedItem = {
        ...item,
        category: newCategory,
        updated_at: new Date().toISOString()
      }
      
      // Update in repository
      await repository.updateIntelligenceItem(item.id, {
        category: newCategory
      })
      
      // Send realtime event through unified system
      if (isConnected) {
        await sendEvent(IntelligenceEventHelpers.itemUpdated(updatedItem, sessionId))
      }
      
      // Update local state immediately for responsiveness
      handleItemUpdated({ item: updatedItem })
      
      // Call callback if provided
      onCategoryChange?.(updatedItem, newCategory)
      
      permanentLogger.log('INTEGRATED_KANBAN', {
        action: 'item_category_changed',
        itemId: item.id,
        oldCategory: item.category,
        newCategory
      })

      toast({
        title: 'Item Moved',
        description: `Moved to ${newCategory}`
      })
      
    } catch (err) {
      permanentLogger.captureError('INTEGRATED_KANBAN', err as Error, {
        action: 'item_drop_failed',
        itemId: item.id
      })
      
      toast({
        title: 'Failed to Move Item',
        description: 'Please try again',
        variant: 'destructive'
      })
    } finally {
      performanceMonitor.endMeasure(startTime)
    }
  }, [
    repository,
    sessionId,
    isConnected,
    sendEvent,
    handleItemUpdated,
    onCategoryChange,
    performanceMonitor,
    toast
  ])

  /**
   * Filter items based on search query and selected categories
   */
  const filteredData = useMemo(() => {
    let filtered = { ...intelligenceData }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      Object.keys(filtered).forEach(category => {
        filtered[category] = {
          ...filtered[category],
          items: filtered[category].items.filter(item =>
            item.title?.toLowerCase().includes(query) ||
            item.content?.toLowerCase().includes(query) ||
            item.extracted_text?.toLowerCase().includes(query)
          )
        }
      })
    }
    
    // Apply category filter
    if (selectedCategories.size > 0) {
      const newFiltered: IntelligenceData = {}
      selectedCategories.forEach(cat => {
        if (filtered[cat]) {
          newFiltered[cat] = filtered[cat]
        }
      })
      filtered = newFiltered
    }
    
    return filtered
  }, [intelligenceData, searchQuery, selectedCategories])

  /**
   * Initialize on mount
   */
  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  /**
   * Render loading state
   */
  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <span className="ml-2">Loading intelligence data...</span>
      </div>
    )
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <div className={`bg-destructive/10 border border-destructive rounded-lg p-4 ${className}`}>
        <h3 className="text-destructive font-semibold">Error Loading Data</h3>
        <p className="text-sm mt-1">{error}</p>
        <button
          onClick={loadInitialData}
          className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          Retry
        </button>
      </div>
    )
  }

  /**
   * Main render
   */
  return (
    <DndProvider backend={HTML5Backend}>
      <div className={`intelligence-kanban ${className}`}>
        {/* Header */}
        <div className="kanban-header mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-2xl font-bold">Intelligence Board</h2>
              
              {/* Connection status */}
              {enableRealtime && (
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className="text-sm text-muted-foreground">
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              )}
              
              {/* Last sync time */}
              {lastSync && (
                <span className="text-sm text-muted-foreground">
                  Last updated: {lastSync.toLocaleTimeString()}
                </span>
              )}
            </div>
            
            {/* View toggle */}
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedView('kanban')}
                className={`px-4 py-2 rounded ${
                  selectedView === 'kanban'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                Kanban
              </button>
              
              {enableAnalytics && (
                <button
                  onClick={() => setSelectedView('analytics')}
                  className={`px-4 py-2 rounded ${
                    selectedView === 'analytics'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  Analytics
                </button>
              )}
            </div>
          </div>
          
          {/* Search and filters */}
          <div className="mt-4 flex items-center space-x-4">
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border rounded-lg"
            />
            
            {/* Category filter */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Filter:</span>
              <select
                multiple
                value={Array.from(selectedCategories)}
                onChange={(e) => {
                  const selected = new Set(
                    Array.from(e.target.selectedOptions, option => option.value as IntelligenceCategory)
                  )
                  setSelectedCategories(selected)
                }}
                className="px-2 py-1 border rounded"
              >
                {Object.keys(IntelligenceCategories.CATEGORIES).map(cat => (
                  <option key={cat} value={cat}>
                    {IntelligenceCategories.getCategoryMetadata(cat as IntelligenceCategory).label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Main content */}
        {selectedView === 'kanban' ? (
          <div className="kanban-board">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Object.entries(filteredData).map(([category, data]) => (
                <KanbanColumn
                  key={category}
                  category={category as IntelligenceCategory}
                  items={data.items}
                  metadata={data.metadata}
                  onItemDrop={(item) => handleItemDrop(item, category as IntelligenceCategory)}
                  onItemUpdate={onItemUpdate}
                />
              ))}
            </div>
            
            {/* Enrichment queue */}
            {enableEnrichment && (
              <div className="mt-8">
                <EnrichmentQueue
                  items={Object.values(filteredData).flatMap(d => d.items)}
                  sessionId={sessionId}
                />
              </div>
            )}
          </div>
        ) : (
          enableAnalytics && (
            <AnalyticsView
              data={intelligenceData}
              metrics={metrics}
              sessionId={sessionId}
              domain={domain}
            />
          )
        )}
      </div>
    </DndProvider>
  )
}
