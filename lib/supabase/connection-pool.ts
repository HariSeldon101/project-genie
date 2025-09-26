/**
 * Database Connection Pool
 * Singleton pattern to prevent creating hundreds of database connections
 *
 * CRITICAL: This fixes the performance issue where every repository
 * operation was creating a new Supabase client
 *
 * Before: 100s of connections per minute
 * After: 1 persistent connection reused
 */

import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { permanentLogger } from '@/lib/utils/permanent-logger'

/**
 * Singleton instance - created once, reused forever
 * This dramatically reduces database connection overhead
 */
let cachedClient: SupabaseClient<Database> | null = null
let connectionCount = 0
let lastConnectionTime = 0

/**
 * Get pooled Supabase client
 * Creates one connection and reuses it for all operations
 *
 * @returns Promise<SupabaseClient<Database>> Typed Supabase client
 */
export async function getPooledClient(): Promise<SupabaseClient<Database>> {
  const startTime = performance.now()

  // Return existing client if available (99% of cases)
  if (cachedClient) {
    permanentLogger.breadcrumb('CONNECTION_POOL', 'Reusing existing connection', {
      connectionCount,
      timeSinceLastConnection: Date.now() - lastConnectionTime
    })
    return cachedClient
  }

  // Create new client (only happens once per server lifecycle)
  try {
    connectionCount++
    lastConnectionTime = Date.now()

    permanentLogger.info('CONNECTION_POOL', 'Creating new database connection', {
      connectionCount,
      timestamp: new Date().toISOString()
    })

    const cookieStore = await cookies()

    cachedClient = createSupabaseServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Server Component, ignore cookie setting errors
            }
          },
        },
      }
    )

    const duration = performance.now() - startTime

    permanentLogger.timing('connection_pool_create', {
      duration,
      connectionCount
    })

    return cachedClient
  } catch (error) {
    permanentLogger.captureError('CONNECTION_POOL', error as Error, {
      operation: 'getPooledClient',
      duration: performance.now() - startTime,
      connectionCount
    })

    // Reset cache on error
    cachedClient = null
    throw error
  }
}

/**
 * Clear the connection pool (for testing or forced reconnection)
 * Should rarely be needed in production
 */
export function clearConnectionPool(): void {
  if (cachedClient) {
    permanentLogger.info('CONNECTION_POOL', 'Clearing connection pool', {
      connectionCount,
      uptime: Date.now() - lastConnectionTime
    })
    cachedClient = null
  }
}

/**
 * Get connection pool statistics
 * Useful for monitoring and debugging
 */
export function getPoolStats() {
  return {
    hasActiveConnection: !!cachedClient,
    totalConnectionsCreated: connectionCount,
    lastConnectionTime,
    uptimeMs: cachedClient ? Date.now() - lastConnectionTime : 0
  }
}

// Export with backward compatibility names
export { getPooledClient as createClient }
export { getPooledClient as createServerClient }