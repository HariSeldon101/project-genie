'use client'

// DO NOT import createBrowserClient at module level - causes SSR issues
import type { Database } from '@/lib/database.types'
import { permanentLogger } from '@/lib/utils/permanent-logger'

// Singleton instance - created once, reused everywhere
let browserClient: any = null
let instanceCount = 0

/**
 * Get singleton Supabase browser client
 * This prevents creating multiple clients which wastes memory and connections
 * FIXED: Only imports createBrowserClient in browser environment
 *
 * @returns Supabase client instance for browser use (or null during SSR)
 */
export function getBrowserClient() {
  // Return null during SSR - prevents WebSocket issues
  if (typeof window === 'undefined') {
    return null
  }

  if (!browserClient) {
    instanceCount++

    permanentLogger.breadcrumb('auth_client', 'Creating browser client singleton', {
      instanceNumber: instanceCount,
      timestamp: new Date().toISOString()
    })

    // Dynamic import ONLY in browser - this prevents SSR issues
    const { createBrowserClient } = require('@supabase/ssr')

    browserClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  return browserClient
}

/**
 * Get client creation stats (for debugging)
 */
export function getClientStats() {
  return {
    hasClient: !!browserClient,
    instancesCreated: instanceCount
  }
}