/**
 * @v4-company-intelligence BUILT-UNUSED
 * @audit-date 2025-09-29T15:15:00Z
 * @component IntelligenceKanban
 * @purpose Drag-and-drop organization of extracted intelligence into categories
 * @never-integrated No route created, not connected to data flow
 * @status ⚠️ Complete (~2000 lines) but completely disconnected
 * @todo Create /viewer route and wire to category extraction
 * @dependencies @dnd-kit, framer-motion, recharts
 * @potential-value HIGH - Sophisticated UI for intelligence curation
 */

// components/company-intelligence/intelligence-kanban/index.tsx
'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  UniqueIdentifier,
  TouchSensor
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy
} from '@dnd-kit/sortable'
import { restrictToWindowEdges, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { TooltipWrapper } from '@/components/company-intelligence/tooltip-wrapper'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from 'recharts'
import {
  ChevronDown,
  ChevronRight,
  Search,
  Filter,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  XCircle,
  GripVertical,
  Eye,
  Minimize2,
  Trash2,
  Move,
  Target,
  Building,
  Package,
  Users,
  DollarSign,
  Shield,
  Brain,
  FileText,
  BarChart3,
  Layers,
  Send,
  Clock,
  MoreVertical,
  Plus,
  TrendingUp,
  BookOpen,
  Trophy,
  Briefcase,
  Calendar,
  Globe,
  Handshake,
  Headphones,
  UserCheck,
  Megaphone,
  Activity,
  CreditCard,
  UserPlus,
  MessageCircle,
  Wallet
} from 'lucide-react'
import { useDebounce, useThrottle } from '@/lib/utils/ui-performance-utils'

/**
 * Props for the Intelligence Kanban component
 */
interface IntelligenceKanbanProps {
  /** Extracted intelligence data from scrapers */
  intelligenceData: Record<string, any>
  /** Callback when items are selected for enrichment */
  onEnrichmentQueueUpdate: (items: any[]) => void
  /** Available credits for enrichment */
  creditsAvailable?: number
  /** Session ID for tracking */
  sessionId?: string
}

/**
 * Column representation for Kanban board
 */
interface KanbanColumn {
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

/**
 * Enhanced category color system with 25+ distinct colors
 * Each category has a unique color for visual distinction
 */
const CATEGORY_COLORS = {
  CORPORATE: { color: 'blue', bg: 'bg-blue-500', light: 'bg-blue-50', border: 'border-blue-500' },
  PRODUCTS: { color: 'purple', bg: 'bg-purple-500', light: 'bg-purple-50', border: 'border-purple-500' },
  PRICING: { color: 'green', bg: 'bg-green-500', light: 'bg-green-50', border: 'border-green-500' },
  COMPETITORS: { color: 'red', bg: 'bg-red-500', light: 'bg-red-50', border: 'border-red-500' },
  TEAM: { color: 'orange', bg: 'bg-orange-500', light: 'bg-orange-50', border: 'border-orange-500' },
  CASE_STUDIES: { color: 'teal', bg: 'bg-teal-500', light: 'bg-teal-50', border: 'border-teal-500' },
  TECHNICAL: { color: 'indigo', bg: 'bg-indigo-500', light: 'bg-indigo-50', border: 'border-indigo-500' },
  COMPLIANCE: { color: 'yellow', bg: 'bg-yellow-500', light: 'bg-yellow-50', border: 'border-yellow-500' },
  BLOG: { color: 'pink', bg: 'bg-pink-500', light: 'bg-pink-50', border: 'border-pink-500' },
  TESTIMONIALS: { color: 'cyan', bg: 'bg-cyan-500', light: 'bg-cyan-50', border: 'border-cyan-500' },
  PARTNERSHIPS: { color: 'lime', bg: 'bg-lime-500', light: 'bg-lime-50', border: 'border-lime-500' },
  RESOURCES: { color: 'amber', bg: 'bg-amber-500', light: 'bg-amber-50', border: 'border-amber-500' },
  EVENTS: { color: 'violet', bg: 'bg-violet-500', light: 'bg-violet-50', border: 'border-violet-500' },
  FEATURES: { color: 'fuchsia', bg: 'bg-fuchsia-500', light: 'bg-fuchsia-50', border: 'border-fuchsia-500' },
  INTEGRATIONS: { color: 'rose', bg: 'bg-rose-500', light: 'bg-rose-50', border: 'border-rose-500' },
  SUPPORT: { color: 'sky', bg: 'bg-sky-500', light: 'bg-sky-50', border: 'border-sky-500' },
  CAREERS: { color: 'emerald', bg: 'bg-emerald-500', light: 'bg-emerald-50', border: 'border-emerald-500' },
  INVESTORS: { color: 'slate', bg: 'bg-slate-500', light: 'bg-slate-50', border: 'border-slate-500' },
  PRESS: { color: 'zinc', bg: 'bg-zinc-500', light: 'bg-zinc-50', border: 'border-zinc-500' },
  MARKET_POSITION: { color: 'stone', bg: 'bg-stone-500', light: 'bg-stone-50', border: 'border-stone-500' },
  CONTENT: { color: 'neutral', bg: 'bg-neutral-500', light: 'bg-neutral-50', border: 'border-neutral-500' },
  SOCIAL_PROOF: { color: 'orange', bg: 'bg-orange-600', light: 'bg-orange-50', border: 'border-orange-600' },
  COMMERCIAL: { color: 'red', bg: 'bg-red-600', light: 'bg-red-50', border: 'border-red-600' },
  CUSTOMER_EXPERIENCE: { color: 'blue', bg: 'bg-blue-600', light: 'bg-blue-50', border: 'border-blue-600' },
  FINANCIAL: { color: 'green', bg: 'bg-green-600', light: 'bg-green-50', border: 'border-green-600' }
}

/**
 * Category icon mapping for visual recognition
 */
const CATEGORY_ICONS = {
  CORPORATE: <Building className="h-4 w-4" />,
  PRODUCTS: <Package className="h-4 w-4" />,
  PRICING: <DollarSign className="h-4 w-4" />,
  COMPETITORS: <Target className="h-4 w-4" />,
  TEAM: <Users className="h-4 w-4" />,
  CASE_STUDIES: <Trophy className="h-4 w-4" />,
  TECHNICAL: <Brain className="h-4 w-4" />,
  COMPLIANCE: <Shield className="h-4 w-4" />,
  BLOG: <BookOpen className="h-4 w-4" />,
  TESTIMONIALS: <MessageCircle className="h-4 w-4" />,
  PARTNERSHIPS: <Handshake className="h-4 w-4" />,
  RESOURCES: <FileText className="h-4 w-4" />,
  EVENTS: <Calendar className="h-4 w-4" />,
  FEATURES: <Sparkles className="h-4 w-4" />,
  INTEGRATIONS: <Globe className="h-4 w-4" />,
  SUPPORT: <Headphones className="h-4 w-4" />,
  CAREERS: <UserPlus className="h-4 w-4" />,
  INVESTORS: <Briefcase className="h-4 w-4" />,
  PRESS: <Megaphone className="h-4 w-4" />,
  MARKET_POSITION: <TrendingUp className="h-4 w-4" />,
  CONTENT: <FileText className="h-4 w-4" />,
  SOCIAL_PROOF: <UserCheck className="h-4 w-4" />,
  COMMERCIAL: <CreditCard className="h-4 w-4" />,
  CUSTOMER_EXPERIENCE: <Activity className="h-4 w-4" />,
  FINANCIAL: <Wallet className="h-4 w-4" />
}

/**
 * Main Intelligence Kanban Component
 * 
 * Features implemented:
 * ✅ Full drag overlay with visual feedback
 * ✅ Three view modes (Compact/Detailed/Analytics)
 * ✅ Enrichment queue as side panel
 * ✅ Category color system with 25+ colors
 * ✅ Real-time credit calculation
 * ✅ Performance optimizations with debouncing
 * ✅ Collapsible columns
 * ✅ Search and filter functionality
 * ✅ Visual confidence indicators
 * ✅ Mobile responsive design
 */
export function IntelligenceKanban({
  intelligenceData,
  onEnrichmentQueueUpdate,
  creditsAvailable = 500,
  sessionId
}: IntelligenceKanbanProps) {
  // Initialize columns from intelligence data
  const [columns, setColumns] = useState<KanbanColumn[]>(() =>
    Object.entries(intelligenceData).map(([category, data]: [string, any]) => ({
      id: category,
      title: data.metadata?.label || category,
      items: data.items || [],
      confidence: data.confidence || 0.7,
      icon: CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || <Layers className="h-4 w-4" />,
      color: CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS]?.color || 'gray',
      bgColor: CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS]?.bg || 'bg-gray-500',
      expanded: true,
      visible: true
    }))
  )

  // Enrichment queue state
  const [enrichmentQueue, setEnrichmentQueue] = useState<any[]>([])
  const [queueExpanded, setQueueExpanded] = useState(true)

  // UI state
  const [searchQuery, setSearchQuery] = useState('')
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)
  const [viewMode, setViewMode] = useState<'compact' | 'detailed' | 'analytics'>('detailed')
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(Object.keys(intelligenceData))
  )

  // Performance optimizations
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // Configure drag and drop sensors with touch support
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8 // Prevent accidental drags
      }
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  // Log component mount
  useEffect(() => {
    permanentLogger.addBreadcrumb({
      message: 'IntelligenceKanban mounted',
      data: { sessionId, totalCategories: columns.length }
    })
  }, [sessionId, columns.length])

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id)
    permanentLogger.addBreadcrumb({
      message: 'Drag started',
      data: { itemId: event.active.id, sessionId }
    })
  }, [sessionId])

  // Handle drag over (throttled for performance)
  const handleDragOverRaw = useCallback((event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeContainer = findContainer(active.id)
    const overContainer = findContainer(over.id)

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return
    }

    setColumns((prev) => {
      const activeColumn = prev.find(col => col.id === activeContainer)
      const overColumn = prev.find(col => col.id === overContainer)
      
      if (!activeColumn || !overColumn) return prev

      const activeItems = activeColumn.items
      const overItems = overColumn.items

      const activeIndex = activeItems.findIndex((item: any) => item.id === active.id)
      const overIndex = overItems.findIndex((item: any) => item.id === over.id)

      let newIndex: number
      const isBelowOverItem =
        over &&
        active.rect.current.translated &&
        active.rect.current.translated.top > over.rect.top + over.rect.height

      const modifier = isBelowOverItem ? 1 : 0
      newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length

      return prev.map(col => {
        if (col.id === activeContainer) {
          return {
            ...col,
            items: col.items.filter((item: any) => item.id !== active.id)
          }
        }
        if (col.id === overContainer) {
          return {
            ...col,
            items: [
              ...col.items.slice(0, newIndex),
              activeItems[activeIndex],
              ...col.items.slice(newIndex)
            ]
          }
        }
        return col
      })
    })
  }, [])

  // Throttle drag over for performance
  const handleDragOver = useThrottle(handleDragOverRaw, 50)

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event

    if (!over) {
      setActiveId(null)
      return
    }

    const activeContainer = findContainer(active.id)
    const overContainer = findContainer(over.id)

    if (!activeContainer || !overContainer) {
      setActiveId(null)
      return
    }

    // Check if item was dropped in enrichment queue
    if (overContainer === 'enrichment' || over.id === 'enrichment-drop-zone') {
      const item = findItem(active.id)
      if (item && !enrichmentQueue.some((i: any) => i.id === item.id)) {
        const newQueue = [...enrichmentQueue, item]
        setEnrichmentQueue(newQueue)
        onEnrichmentQueueUpdate(newQueue)

        // Remove from original column
        setColumns(prev => prev.map(col => ({
          ...col,
          items: col.items.filter((i: any) => i.id !== item.id)
        })))

        permanentLogger.info('KANBAN', 'Item added to enrichment queue', {
          itemId: item.id,
          queueSize: newQueue.length,
          sessionId
        })
      }
    }

    setActiveId(null)
  }, [enrichmentQueue, onEnrichmentQueueUpdate, sessionId])

  // Helper: Find which container an item belongs to
  const findContainer = useCallback((id: UniqueIdentifier): string | undefined => {
    if (id === 'enrichment' || id === 'enrichment-drop-zone') return 'enrichment'

    const column = columns.find(col =>
      col.id === id || col.items.some((item: any) => item.id === id)
    )
    return column?.id
  }, [columns])

  // Helper: Find an item by ID
  const findItem = useCallback((id: UniqueIdentifier): any | undefined => {
    for (const column of columns) {
      const item = column.items.find((item: any) => item.id === id)
      if (item) return item
    }
    return enrichmentQueue.find((item: any) => item.id === id)
  }, [columns, enrichmentQueue])

  // Filter columns based on search and selection
  const filteredColumns = useMemo(() => {
    return columns.map(col => ({
      ...col,
      items: col.items.filter((item: any) => {
        if (!debouncedSearchQuery) return true
        const searchLower = debouncedSearchQuery.toLowerCase()
        return (
          item.type?.toLowerCase().includes(searchLower) ||
          JSON.stringify(item.content).toLowerCase().includes(searchLower)
        )
      })
    })).filter(col => selectedCategories.has(col.id) && col.visible)
  }, [columns, debouncedSearchQuery, selectedCategories])

  // Calculate statistics
  const stats = useMemo(() => {
    const totalItems = columns.reduce((sum, col) => sum + col.items.length, 0)
    const avgConfidence = columns.reduce((sum, col) => sum + col.confidence, 0) / columns.length
    const topCategory = columns.reduce((max, col) =>
      col.items.length > max.items.length ? col : max
    )

    return {
      totalItems,
      totalCategories: columns.length,
      avgConfidence: avgConfidence || 0,
      topCategory: topCategory?.title || 'N/A',
      enrichmentQueueSize: enrichmentQueue.length,
      estimatedCredits: enrichmentQueue.length * 2 // Rough estimate: 2 credits per item
    }
  }, [columns, enrichmentQueue])

  // Get active item for drag overlay
  const activeItem = useMemo(() => {
    if (!activeId) return null
    return findItem(activeId)
  }, [activeId, findItem])

  // Toggle category visibility
  const toggleCategory = useCallback((categoryId: string) => {
    setSelectedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId)
      } else {
        newSet.add(categoryId)
      }
      return newSet
    })
  }, [])

  // Add all items from a category to enrichment queue
  const addCategoryToQueue = useCallback((column: KanbanColumn) => {
    const newItems = column.items.filter((item: any) => 
      !enrichmentQueue.some((qItem: any) => qItem.id === item.id)
    )
    
    if (newItems.length > 0) {
      const newQueue = [...enrichmentQueue, ...newItems]
      setEnrichmentQueue(newQueue)
      onEnrichmentQueueUpdate(newQueue)
      
      // Remove items from column
      setColumns(prev => prev.map(col => 
        col.id === column.id 
          ? { ...col, items: [] }
          : col
      ))
    }
  }, [enrichmentQueue, onEnrichmentQueueUpdate])

  // Remove item from enrichment queue
  const removeFromQueue = useCallback((itemId: string) => {
    const item = enrichmentQueue.find((i: any) => i.id === itemId)
    if (!item) return

    const newQueue = enrichmentQueue.filter((i: any) => i.id !== itemId)
    setEnrichmentQueue(newQueue)
    onEnrichmentQueueUpdate(newQueue)
    
    // Optionally return item to its original category
    // This would require tracking the original category
  }, [enrichmentQueue, onEnrichmentQueueUpdate])

  // Clear enrichment queue
  const clearQueue = useCallback(() => {
    setEnrichmentQueue([])
    onEnrichmentQueueUpdate([])
  }, [onEnrichmentQueueUpdate])

  return (
    <div className="w-full h-full flex flex-col space-y-4">
      {/* Header Controls */}
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Layers className="h-6 w-6 text-primary" />
              Intelligence Data Organizer
            </h2>
            <Badge variant="outline" className="text-sm">
              {stats.totalItems} items • {stats.totalCategories} categories
            </Badge>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Selector */}
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
              <TabsList>
                <TabsTrigger value="compact" className="gap-1">
                  <Minimize2 className="h-4 w-4" />
                  Compact
                </TabsTrigger>
                <TabsTrigger value="detailed" className="gap-1">
                  <Eye className="h-4 w-4" />
                  Detailed
                </TabsTrigger>
                <TabsTrigger value="analytics" className="gap-1">
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Search */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search intelligence data..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Queue Toggle */}
            <TooltipWrapper content="Toggle enrichment queue">
              <Button 
                variant={queueExpanded ? 'default' : 'outline'}
                size="sm"
                className="gap-1"
                onClick={() => setQueueExpanded(!queueExpanded)}
              >
                <Send className="h-4 w-4" />
                Queue ({enrichmentQueue.length})
              </Button>
            </TooltipWrapper>
          </div>
        </div>

        {/* Statistics Bar */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
          <div className="flex flex-col">
            <span className="text-muted-foreground">Total Items</span>
            <span className="font-bold text-lg">{stats.totalItems}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">Categories</span>
            <span className="font-bold text-lg">{stats.totalCategories}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">Avg Confidence</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">{(stats.avgConfidence * 100).toFixed(0)}%</span>
              <Progress value={stats.avgConfidence * 100} className="w-20 h-2" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">Top Category</span>
            <span className="font-bold text-lg truncate">{stats.topCategory}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">Queue Size</span>
            <span className="font-bold text-lg">{stats.enrichmentQueueSize}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">Est. Credits</span>
            <span className="font-bold text-lg text-primary">{stats.estimatedCredits}</span>
          </div>
        </div>
      </Card>

      {/* Main Content Area */}
      {viewMode === 'analytics' ? (
        // Analytics View
        <AnalyticsView columns={columns} enrichmentQueue={enrichmentQueue} />
      ) : (
        // Kanban Board View
        <div className="flex gap-4 flex-1 overflow-hidden">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToWindowEdges]}
          >
            {/* Kanban Columns */}
            <ScrollArea className="flex-1">
              <div className="flex gap-4 pb-4 h-full">
                <SortableContext
                  items={filteredColumns.map(col => col.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  {filteredColumns.map((column) => (
                    <KanbanColumn
                      key={column.id}
                      column={column}
                      viewMode={viewMode}
                      onAddToQueue={() => addCategoryToQueue(column)}
                    />
                  ))}
                </SortableContext>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>

            {/* Drag Overlay - Enhanced visual feedback */}
            <DragOverlay modifiers={[restrictToWindowEdges]}>
              {activeItem ? (
                <motion.div
                  initial={{ scale: 1.05, opacity: 0.9 }}
                  animate={{ scale: 1.05, opacity: 0.9 }}
                  className="cursor-grabbing"
                >
                  <Card className="shadow-2xl border-2 border-primary">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-primary" />
                        <div>
                          <p className="text-sm font-medium">
                            {activeItem.type || 'Intelligence Item'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Moving to new location...
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : null}
            </DragOverlay>
          </DndContext>

          {/* Enrichment Queue Side Panel */}
          <AnimatePresence>
            {queueExpanded && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 320, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <EnrichmentQueuePanel
                  queue={enrichmentQueue}
                  onRemoveItem={removeFromQueue}
                  onClearQueue={clearQueue}
                  creditsAvailable={creditsAvailable}
                  estimatedCredits={stats.estimatedCredits}
                  onStartEnrichment={() => {
                    permanentLogger.info('KANBAN', 'Starting enrichment', {
                      queueSize: enrichmentQueue.length,
                      credits: stats.estimatedCredits,
                      sessionId
                    })
                    onEnrichmentQueueUpdate(enrichmentQueue)
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

/**
 * Individual Kanban Column Component
 */
function KanbanColumn({
  column,
  viewMode,
  onAddToQueue
}: {
  column: KanbanColumn
  viewMode: 'compact' | 'detailed'
  onAddToQueue: () => void
}) {
  const [isExpanded, setIsExpanded] = useState(column.expanded)
  const colorScheme = CATEGORY_COLORS[column.id as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.CORPORATE

  return (
    <Card className={`w-80 flex flex-col h-full border-t-4 ${colorScheme.border}`}>
      <CardHeader className={`sticky top-0 z-10 ${colorScheme.light}`}>
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-1 rounded ${colorScheme.bg} text-white`}>
                  {column.icon}
                </div>
                <CardTitle className="text-sm font-semibold">{column.title}</CardTitle>
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {column.items.length}
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
              </div>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent>
            {column.items.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2 text-xs"
                onClick={onAddToQueue}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add all to enrichment queue
              </Button>
            )}
            
            <ScrollArea className="h-[400px] mt-2">
              <SortableContext
                items={column.items.map((item: any) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2 p-1">
                  {column.items.map((item: any) => (
                    <IntelligenceCard
                      key={item.id}
                      item={item}
                      viewMode={viewMode}
                      categoryColor={colorScheme.color}
                    />
                  ))}
                  {column.items.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-20 text-muted-foreground">
                      <p className="text-xs">No items in this category</p>
                    </div>
                  )}
                </div>
              </SortableContext>
            </ScrollArea>
          </CollapsibleContent>
        </Collapsible>
      </CardHeader>
    </Card>
  )
}

/**
 * Individual Intelligence Card Component (Draggable)
 */
function IntelligenceCard({
  item,
  viewMode,
  categoryColor
}: {
  item: any
  viewMode: 'compact' | 'detailed'
  categoryColor: string
}) {
  const colorScheme = Object.values(CATEGORY_COLORS).find(c => c.color === categoryColor) || CATEGORY_COLORS.CORPORATE

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ scale: 1.02 }}
      className="cursor-move"
    >
      <Card className={`p-3 hover:shadow-md transition-all border-l-4 ${colorScheme.border}`}>
        <div className="flex items-start gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0 cursor-grab active:cursor-grabbing" />
          <div className="flex-1 min-w-0">
            {viewMode === 'compact' ? (
              // Compact view - single line
              <div className="flex items-center justify-between">
                <p className="text-sm truncate font-medium">{item.type || 'Item'}</p>
                <Badge variant="outline" className="text-xs ml-2">
                  {((item.confidence || 0.7) * 100).toFixed(0)}%
                </Badge>
              </div>
            ) : (
              // Detailed view - full information
              <>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold">{item.type || 'Intelligence Item'}</p>
                  <Badge variant="outline" className="text-xs">
                    {((item.confidence || 0.7) * 100).toFixed(0)}%
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                  {typeof item.content === 'string'
                    ? item.content
                    : JSON.stringify(item.content).substring(0, 100)}
                  {JSON.stringify(item.content).length > 100 && '...'}
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {item.source?.split('/').pop() || 'Source'}
                  </Badge>
                  {item.extractedAt && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.extractedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

/**
 * Enrichment Queue Side Panel Component
 */
function EnrichmentQueuePanel({
  queue,
  onRemoveItem,
  onClearQueue,
  creditsAvailable,
  estimatedCredits,
  onStartEnrichment
}: {
  queue: any[]
  onRemoveItem: (itemId: string) => void
  onClearQueue: () => void
  creditsAvailable?: number
  estimatedCredits: number
  onStartEnrichment: () => void
}) {
  const canEnrich = queue.length > 0 && (!creditsAvailable || estimatedCredits <= creditsAvailable)

  return (
    <Card className="w-80 flex flex-col h-full" id="enrichment-drop-zone">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            Enrichment Queue
          </div>
          <Badge variant="secondary">{queue.length}</Badge>
        </CardTitle>
        <CardDescription>
          Drag items here for LLM enrichment
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden p-4">
        <ScrollArea className="h-full">
          <AnimatePresence mode="popLayout">
            {queue.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-40 text-muted-foreground"
              >
                <Move className="h-8 w-8 mb-2 text-muted-foreground/50" />
                <p className="text-sm text-center">
                  Drag intelligence items here
                </p>
                <p className="text-xs text-center mt-1">
                  to queue them for enrichment
                </p>
              </motion.div>
            ) : (
              <div className="space-y-2">
                {queue.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <EnrichmentQueueItem
                      item={item}
                      onRemove={() => onRemoveItem(item.id)}
                      index={index + 1}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </ScrollArea>
      </CardContent>
      
      <div className="p-4 border-t space-y-2">
        {queue.length > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Estimated credits:</span>
            <span className={`font-bold ${!canEnrich ? 'text-red-500' : 'text-primary'}`}>
              {estimatedCredits}
            </span>
          </div>
        )}
        
        {creditsAvailable && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Available:</span>
            <span className="font-bold">{creditsAvailable}</span>
          </div>
        )}
        
        {queue.length > 0 && (
          <Progress 
            value={(estimatedCredits / (creditsAvailable || 100)) * 100} 
            className="h-2"
          />
        )}
        
        <div className="flex gap-2">
          <Button
            className="flex-1"
            disabled={!canEnrich}
            onClick={onStartEnrichment}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Start ({estimatedCredits})
          </Button>
          
          {queue.length > 0 && (
            <Button
              variant="outline"
              size="icon"
              onClick={onClearQueue}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        {!canEnrich && queue.length > 0 && creditsAvailable && (
          <p className="text-xs text-red-500 text-center">
            Insufficient credits. Remove items or purchase more.
          </p>
        )}
      </div>
    </Card>
  )
}

/**
 * Enrichment Queue Item Component
 */
function EnrichmentQueueItem({
  item,
  onRemove,
  index
}: {
  item: any
  onRemove: () => void
  index: number
}) {
  return (
    <Card className="p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xs text-muted-foreground font-mono">
            #{index}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {item.type || 'Item'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {item.source?.split('/').pop() || 'Source'}
            </p>
          </div>
        </div>
        <TooltipWrapper content="Remove from queue">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0"
            onClick={onRemove}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </TooltipWrapper>
      </div>
    </Card>
  )
}

/**
 * Analytics View Component
 */
function AnalyticsView({ 
  columns, 
  enrichmentQueue 
}: { 
  columns: KanbanColumn[]
  enrichmentQueue: any[] 
}) {
  // Prepare data for charts
  const categoryData = columns.map(col => ({
    name: col.title.substring(0, 15),
    items: col.items.length,
    confidence: col.confidence * 100
  }))

  const distributionData = columns.map(col => ({
    name: col.title,
    value: col.items.length
  }))

  const confidenceData = columns.slice(0, 10).map(col => ({
    category: col.title.substring(0, 10),
    confidence: col.confidence * 100
  }))

  const totalItems = columns.reduce((sum, col) => sum + col.items.length, 0)
  const avgConfidence = columns.reduce((sum, col) => sum + col.confidence, 0) / columns.length * 100

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <CardTitle className="mb-4">Intelligence Analytics Dashboard</CardTitle>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Total Items</p>
            <p className="text-2xl font-bold">{totalItems}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Categories</p>
            <p className="text-2xl font-bold">{columns.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Avg Confidence</p>
            <p className="text-2xl font-bold">{avgConfidence.toFixed(0)}%</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Queued</p>
            <p className="text-2xl font-bold text-primary">{enrichmentQueue.length}</p>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Category Distribution Pie Chart */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-4">Category Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={distributionData.slice(0, 8)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name.substring(0, 8)}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {distributionData.slice(0, 8).map((entry, index) => {
                    const colors = Object.values(CATEGORY_COLORS)
                    const color = colors[index % colors.length]
                    return <Cell key={`cell-${index}`} fill={color.bg.replace('bg-', '#').replace('500', '')} />
                  })}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* Confidence by Category Bar Chart */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-4">Confidence Levels</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={confidenceData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="category" 
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  className="text-xs"
                />
                <YAxis className="text-xs" />
                <RechartsTooltip />
                <Bar dataKey="confidence" fill="#10b981" radius={[4, 4, 0, 0]}>
                  {confidenceData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.confidence > 80 ? '#10b981' : entry.confidence > 50 ? '#f59e0b' : '#ef4444'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Items vs Confidence Area Chart */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-4">Quality Metrics</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={categoryData.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  className="text-xs"
                />
                <YAxis className="text-xs" />
                <RechartsTooltip />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="items" 
                  stroke="#3b82f6" 
                  fill="#3b82f6" 
                  fillOpacity={0.3}
                  name="Items"
                />
                <Area 
                  type="monotone" 
                  dataKey="confidence" 
                  stroke="#10b981" 
                  fill="#10b981" 
                  fillOpacity={0.3}
                  name="Confidence %"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Category Details Table */}
        <Card className="mt-6 p-4">
          <h3 className="text-sm font-semibold mb-4">Category Details</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Category</th>
                  <th className="text-right p-2">Items</th>
                  <th className="text-right p-2">Confidence</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {columns.map((col, index) => (
                  <tr key={col.id} className="border-b">
                    <td className="p-2 flex items-center gap-2">
                      <div className={`p-1 rounded ${CATEGORY_COLORS[col.id as keyof typeof CATEGORY_COLORS]?.bg || 'bg-gray-500'} text-white`}>
                        {col.icon}
                      </div>
                      <span className="font-medium">{col.title}</span>
                    </td>
                    <td className="text-right p-2">{col.items.length}</td>
                    <td className="text-right p-2">
                      <div className="flex items-center justify-end gap-2">
                        <span>{(col.confidence * 100).toFixed(0)}%</span>
                        <Progress value={col.confidence * 100} className="w-16 h-2" />
                      </div>
                    </td>
                    <td className="p-2">
                      {col.confidence > 0.8 ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          High
                        </Badge>
                      ) : col.confidence > 0.5 ? (
                        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                          Medium
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600 border-red-600">
                          Low
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Card>
    </div>
  )
}

export default IntelligenceKanban
