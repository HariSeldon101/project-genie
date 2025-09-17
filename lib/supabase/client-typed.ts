/**
 * Type-Safe Supabase Client
 *
 * This client ensures all database operations are type-checked at compile time.
 * Column names, types, and relationships are enforced by TypeScript.
 *
 * NEVER use untyped createClient() directly!
 * This is enforced through the repository layer.
 */

import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

/**
 * Create a type-safe Supabase client for client-side use
 * The repository layer will use this to ensure type safety
 */
export const createTypedClient = () => {
  const isServer = typeof window === 'undefined'

  if (isServer) {
    // Server-side: Use regular client with service role for bypassing RLS when needed
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    return createClient<Database>(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  } else {
    // Client-side: Use SSR client for cookie-based auth
    return createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
}

/**
 * Export type for use in other files
 */
export type TypedSupabaseClient = ReturnType<typeof createTypedClient>

/**
 * Helper type to extract table types
 */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

/**
 * Example usage (enforced through repository layer):
 *
 * // In repository:
 * const supabase = createTypedClient()
 *
 * // TypeScript knows exact column names and types!
 * const { data, error } = await supabase
 *   .from('execution_locks')
 *   .insert({
 *     lock_key: '...',     // ✅ TypeScript enforces correct columns
 *     scraper_id: '...',   // ✅ Required field enforced
 *     session_id: '...',   // ✅ Type checked
 *     expires_at: '...'    // ✅ Required field enforced
 *     // lock_id: '...'    // ❌ TypeScript ERROR - column doesn't exist!
 *   })
 *
 * // Repository layer ensures all database access uses this typed client
 */