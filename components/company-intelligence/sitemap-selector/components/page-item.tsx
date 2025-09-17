/**
 * Individual page item component
 * Displays page info with semantic HTML
 * Mobile responsive with Tailwind
 *
 * Uses semantic HTML elements for accessibility
 * Implements proper ARIA attributes
 */

import React from 'react'
import { CheckCircle2, Circle, Globe, FileText, Home, Newspaper, ShoppingBag, Users, Mail } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { PageItemProps } from '../types'

/**
 * Get appropriate icon for page based on URL path
 * Following icon standards from CLAUDE.md
 */
const getPageIcon = (relativePath: string) => {
  const path = relativePath.toLowerCase()

  if (path === '/' || path === '/home') {
    return <Home className="w-4 h-4 text-muted-foreground" />
  } else if (path.includes('blog') || path.includes('news') || path.includes('article')) {
    return <Newspaper className="w-4 h-4 text-muted-foreground" />
  } else if (path.includes('product') || path.includes('service') || path.includes('shop')) {
    return <ShoppingBag className="w-4 h-4 text-muted-foreground" />
  } else if (path.includes('about') || path.includes('team')) {
    return <Users className="w-4 h-4 text-muted-foreground" />
  } else if (path.includes('contact')) {
    return <Mail className="w-4 h-4 text-muted-foreground" />
  } else {
    return <FileText className="w-4 h-4 text-muted-foreground" />
  }
}

/**
 * Individual page item component
 * Memoized to prevent unnecessary re-renders
 */
export const PageItem: React.FC<PageItemProps> = React.memo(({
  page,
  selected,
  onToggle
}) => {
  // Category colors with semantic meaning
  const categoryStyles = {
    critical: {
      badge: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      border: 'border-red-200 dark:border-red-800'
    },
    important: {
      badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-800'
    },
    useful: {
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800'
    },
    optional: {
      badge: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
      border: 'border-gray-200 dark:border-gray-800'
    }
  }

  const styles = categoryStyles[page.category]

  return (
    <article
      className={cn(
        // Base styles
        'flex items-center gap-3 rounded-lg border transition-all',
        // Padding - responsive for mobile
        'p-3 sm:p-4',
        // Hover state
        'hover:bg-muted/50 cursor-pointer',
        // Selected state
        selected && 'bg-primary/5 border-primary',
        // Category-specific border when not selected
        !selected && styles.border
      )}
      onClick={() => onToggle(page.id)}
      // Semantic HTML and ARIA attributes
      role="checkbox"
      aria-checked={selected}
      aria-label={`Select ${page.title} - ${page.category} page`}
      tabIndex={0}
      onKeyDown={(e) => {
        // Keyboard accessibility
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          onToggle(page.id)
        }
      }}
    >
      {/* Selection checkbox - visual indicator */}
      <div
        className="flex-shrink-0"
        aria-hidden="true" // Decorative, selection state in article aria-checked
      >
        {selected ? (
          <CheckCircle2 className="w-5 h-5 text-primary" />
        ) : (
          <Circle className="w-5 h-5 text-muted-foreground" />
        )}
      </div>

      {/* Page icon based on content type */}
      <div className="flex-shrink-0" aria-hidden="true">
        {getPageIcon(page.relativePath)}
      </div>

      {/* Page information - main content */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate text-sm sm:text-base">
          {page.title}
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground truncate">
          {page.relativePath}
        </p>
        {/* Source information if available */}
        {page.source && (
          <p className="text-xs text-muted-foreground mt-1">
            Source: {page.source}
          </p>
        )}
      </div>

      {/* Category badge - importance indicator */}
      <Badge
        className={cn(
          'flex-shrink-0',
          styles.badge
        )}
        aria-label={`Category: ${page.category}`}
      >
        {page.category}
      </Badge>
    </article>
  )
})

// Display name for React DevTools
PageItem.displayName = 'PageItem'