// Types for Data Review & Selection System

export interface DataItem {
  id: string
  category: string
  subcategory?: string
  name: string
  value: any
  source: 'scraping' | 'extraction' | 'external' | 'analysis'
  confidence: number // 0-1
  quality: 'high' | 'medium' | 'low'
  size: number // bytes
  selected: boolean
  metadata?: {
    url?: string
    timestamp?: string
    method?: string
    [key: string]: any
  }
}

export interface DataCategory {
  id: string
  name: string
  description: string
  items: DataItem[]
  totalSize: number
  selectedCount: number
  totalCount: number
  expanded: boolean
  indeterminate: boolean // partially selected
  selected: boolean
}

export interface SelectionStats {
  totalItems: number
  selectedItems: number
  totalSize: number
  selectedSize: number
  estimatedTokens: number
  estimatedCost: number
  categories: {
    [key: string]: {
      selected: number
      total: number
    }
  }
}

export interface DataReviewState {
  categories: DataCategory[]
  searchQuery: string
  filterQuality: 'all' | 'high' | 'medium' | 'low'
  filterSource: 'all' | 'scraping' | 'extraction' | 'external' | 'analysis'
  sortBy: 'name' | 'size' | 'confidence' | 'quality'
  sortDirection: 'asc' | 'desc'
  selectedItemIds: Set<string>
  stats: SelectionStats
}

export interface CostEstimate {
  inputTokens: number
  outputTokens: number
  inputCost: number
  outputCost: number
  totalCost: number
  model: string
  savings: number // compared to selecting all
}

// Selection presets for quick selection
export interface SelectionPreset {
  id: string
  name: string
  description: string
  icon?: string
  filter: (item: DataItem) => boolean
}

export const SELECTION_PRESETS: SelectionPreset[] = [
  {
    id: 'essential',
    name: 'Essential Only',
    description: 'Core business information',
    filter: (item) => ['company_info', 'contact', 'products', 'services'].includes(item.category)
  },
  {
    id: 'high-quality',
    name: 'High Quality',
    description: 'Only high confidence data',
    filter: (item) => item.confidence >= 0.8
  },
  {
    id: 'verified',
    name: 'Verified Data',
    description: 'Externally verified information',
    filter: (item) => item.source === 'external' && item.confidence >= 0.7
  },
  {
    id: 'minimal',
    name: 'Minimal Set',
    description: 'Bare minimum for analysis',
    filter: (item) => item.category === 'company_info' || (item.quality === 'high' && item.size < 1000)
  }
]