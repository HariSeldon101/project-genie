/**
 * Interface contracts for the sitemap discovery system
 * These define the data shapes used throughout the component hierarchy
 *
 * CRITICAL: No mock data or fallbacks - all types are strictly enforced
 * Database-first architecture - IDs from database, not URLs from UI
 */

import { z } from 'zod'

/**
 * Zod schema for runtime validation of page information
 * Ensures data integrity - NO graceful degradation
 */
export const PageInfoSchema = z.object({
  id: z.string(), // Will be UUID from database
  url: z.string().url(),
  title: z.string(),
  relativePath: z.string(),
  category: z.enum(['critical', 'important', 'useful', 'optional']),
  source: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  discovered_at: z.string().optional()
})

// Inferred TypeScript type from Zod schema
export type PageInfo = z.infer<typeof PageInfoSchema>

/**
 * Discovery state tracking
 * Represents current phase and progress of discovery process
 */
export interface DiscoveryState {
  phase: 'idle' | 'sitemap' | 'homepage' | 'blog' | 'validation' | 'complete'
  progress: number
  total: number
  error: Error | null
  startTime: number // For timing measurements
}

/**
 * Selection state management
 * Tracks which pages are selected and how they were selected
 */
export interface SelectionState {
  selectedIds: Set<string>
  autoSelected: boolean
  selectionMode: 'manual' | 'auto' | 'bulk'
}

/**
 * Main component props - Interface Segregation Principle
 * Only includes what the component needs, nothing more
 */
export interface SitemapSelectorProps {
  domain: string  // Domain to discover pages for
  onComplete: (pageIds: string[]) => Promise<void> // Page IDs or URLs
  onError: (error: Error) => void
  className?: string // For container styling
}

/**
 * Discovery header component props
 */
export interface DiscoveryHeaderProps {
  phase: DiscoveryState['phase']
  progress: number
  total: number
  error: Error | null
  className?: string
}

/**
 * Page list component props
 */
export interface PageListProps {
  pages: PageInfo[]
  selectedIds: Set<string>
  onToggleSelection: (id: string) => void
  className?: string
}

/**
 * Page item component props
 */
export interface PageItemProps {
  page: PageInfo
  selected: boolean
  onToggle: (id: string) => void
}

/**
 * Selection controls component props
 */
export interface SelectionControlsProps {
  selectedCount: number
  totalCount: number
  onSelectAll: () => void
  onClearSelection: () => void
  onComplete: () => void
  disabled: boolean
  className?: string
}

/**
 * Discovery phases component props
 */
export interface DiscoveryPhasesProps {
  currentPhase: DiscoveryState['phase']
  className?: string
}

/**
 * Event types from the discovery stream
 * Matches the unified EventFactory types
 */
export interface DiscoveryEvent {
  type: 'phase-start' | 'phase-complete' | 'pages-update' | 'discovery-complete' | 'error'
  data?: any
  metadata?: Record<string, any>
  timestamp: number
  correlationId?: string
}