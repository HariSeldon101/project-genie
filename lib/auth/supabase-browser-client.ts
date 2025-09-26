'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'
import { permanentLogger } from '@/lib/utils/permanent-logger'

// Singleton instance - created once, reused everywhere
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null
let instanceCount = 0

/**
 * Get singleton Supabase browser client
 * This prevents creating multiple clients which wastes memory and connections
 *
 * @returns Supabase client instance for browser use
 */
export function getBrowserClient() {
  if (!browserClient) {
    instanceCount++

    permanentLogger.breadcrumb('auth_client', 'Creating browser client singleton', {
      instanceNumber: instanceCount,
      timestamp: new Date().toISOString()
    })

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