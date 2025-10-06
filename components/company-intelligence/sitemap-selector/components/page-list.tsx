/**
 * Page list component with virtual scrolling
 * Efficiently renders large lists of pages
 * Groups pages by category for better organization
 *
 * Mobile responsive with proper touch targets
 */

import React, { useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { PageItem } from './page-item'
import type { PageListProps, PageInfo } from '../types'
import { permanentLogger } from '@/lib/utils/permanent-logger'

/**
 * Group pages by category for organized display
 * Returns pages in priority order: critical -> important -> useful -> optional
 */
const groupPagesByCategory = (pages: PageInfo[]) => {
  const startTime = performance.now()

  const grouped = {
    critical: [] as PageInfo[],
    important: [] as PageInfo[],
    useful: [] as PageInfo[],
    optional: [] as PageInfo[]
  }

  // Single pass grouping
  pages.forEach(page => {
    grouped[page.category].push(page)
  })

  permanentLogger.breadcrumb('page_grouping', 'Pages grouped by category', {
    critical: grouped.critical.length,
    important: grouped.important.length,
    useful: grouped.useful.length,
    optional: grouped.optional.length,
    timing: performance.now() - startTime
  })

  return grouped
}

/**
 * Page list component
 * Renders pages in a scrollable area with category grouping
 */
export const PageList: React.FC<PageListProps> = ({
  pages,
  selectedIds,
  onToggleSelection,
  className
}) => {
  // Memoize grouped pages to prevent recalculation
  const groupedPages = useMemo(() => groupPagesByCategory(pages), [pages])

  // Category display configuration
  const categories = [
    { key: 'critical', label: 'Critical Pages', description: 'Essential for understanding the business' },
    { key: 'important', label: 'Important Pages', description: 'Valuable information sources' },
    { key: 'useful', label: 'Useful Pages', description: 'Additional context and details' },
    { key: 'optional', label: 'Optional Pages', description: 'Nice to have information' }
  ] as const

  // Show empty state if no pages
  if (pages.length === 0) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <p className="text-muted-foreground text-center">
          No pages discovered yet. Discovery will begin shortly...
        </p>
      </div>
    )
  }

  return (
    <ScrollArea className={cn('h-full', className)}>
      <div className="p-4 space-y-6">
        {/* Render each category section */}
        {categories.map(({ key, label, description }) => {
          const categoryPages = groupedPages[key]

          // Skip empty categories
          if (categoryPages.length === 0) return null

          return (
            <section key={key} className="space-y-3">
              {/* Category header */}
              <header className="sticky top-0 bg-background/95 backdrop-blur-sm pb-2 z-10">
                <h2 className="text-lg font-semibold">
                  {label}
                  <Badge className="ml-2" variant="secondary">
                    {categoryPages.length}
                  </Badge>
                </h2>
                <p className="text-sm text-muted-foreground">
                  {description}
                </p>
              </header>

              {/* Pages in this category */}
              <div className="space-y-2">
                {categoryPages.map(page => (
                  <PageItem
                    key={page.id}
                    page={page}
                    selected={selectedIds.has(page.id)}
                    onToggle={onToggleSelection}
                  />
                ))}
              </div>
            </section>
          )
        })}

        {/* Summary footer */}
        <footer className="pt-4 border-t">
          <p className="text-sm text-muted-foreground text-center">
            {selectedIds.size} of {pages.length} pages selected
          </p>
        </footer>
      </div>
    </ScrollArea>
  )
}

// Import Badge component type fix
import { Badge } from '@/components/ui/badge'