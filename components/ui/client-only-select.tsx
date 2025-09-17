/**
 * Client-Only Select Component Wrapper
 * Prevents hydration errors by ensuring Select only renders on client
 * @module client-only-select
 */

'use client'

import * as React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

/**
 * ClientOnlySelect wrapper that safely renders Select on client only
 * Prevents SSR/hydration mismatches
 */
export function ClientOnlySelect({ children, ...props }: React.ComponentProps<typeof Select>) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Return a placeholder during SSR
    return (
      <div className="h-7 min-w-[120px] bg-muted/50 rounded-md animate-pulse" />
    )
  }

  return (
    <Select {...props}>
      {children}
    </Select>
  )
}

// Re-export the other Select components for convenience
export { SelectContent, SelectItem, SelectTrigger, SelectValue }