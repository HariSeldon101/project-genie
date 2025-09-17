/**
 * Session Manager - Prevents duplicate sessions
 * Checks for existing sessions before creating new ones
 */

import { createBrowserClient } from '@supabase/ssr'
import { SupabaseClient } from '@supabase/supabase-js'

export class SessionManager {
  private supabase: SupabaseClient
  
  constructor() {
    this.supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  
  /**
   * Smart login that checks for existing session first
   */
  async smartLogin(email: string, password: string) {
    console.log('[SessionManager] Checking for existing session...')
    
    // First, check if there's already a valid session
    const { data: { session: existingSession }, error: sessionError } = await this.supabase.auth.getSession()
    
    if (existingSession && !sessionError) {
      console.log('[SessionManager] Found existing session, validating...')
      
      // Check if it's for the same user
      const { data: { user }, error: userError } = await this.supabase.auth.getUser()
      
      if (user && !userError && user.email === email) {
        console.log('[SessionManager] Existing session is valid for this user')
        
        // Try to refresh the session instead of creating a new one
        const { data: refreshData, error: refreshError } = await this.supabase.auth.refreshSession()
        
        if (refreshData?.session && !refreshError) {
          console.log('[SessionManager] Session refreshed successfully')
          return { 
            data: { 
              session: refreshData.session, 
              user: refreshData.user 
            }, 
            error: null 
          }
        }
      }
      
      // If session is for a different user, sign out first
      if (user && user.email !== email) {
        console.log('[SessionManager] Session is for different user, signing out...')
        await this.supabase.auth.signOut()
      }
    }
    
    // No valid session found, proceed with login
    console.log('[SessionManager] No valid session found, creating new session...')
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (!error) {
      console.log('[SessionManager] New session created successfully')
    } else {
      console.error('[SessionManager] Login failed:', error.message)
    }
    
    return { data, error }
  }
  
  /**
   * Cleanup old sessions (requires elevated permissions)
   */
  async cleanupOldSessions(userId: string, keepCount: number = 1) {
    // This would require service role key or custom RPC function
    console.warn('[SessionManager] Session cleanup requires elevated permissions')
    console.warn('[SessionManager] Use Supabase Dashboard or SQL Editor for cleanup')
    
    return {
      success: false,
      message: 'Session cleanup requires manual intervention via Supabase Dashboard'
    }
  }
  
  /**
   * Get session statistics for debugging
   */
  async getSessionStats() {
    const { data: { session }, error: sessionError } = await this.supabase.auth.getSession()
    const { data: { user }, error: userError } = await this.supabase.auth.getUser()
    
    return {
      hasSession: !!session,
      sessionId: session?.access_token?.substring(0, 10) + '...',
      userId: user?.id,
      userEmail: user?.email,
      sessionExpiry: session?.expires_at,
      errors: {
        session: sessionError?.message,
        user: userError?.message
      }
    }
  }
}

// Singleton instance
let sessionManagerInstance: SessionManager | null = null

export function getSessionManager() {
  if (!sessionManagerInstance) {
    sessionManagerInstance = new SessionManager()
  }
  return sessionManagerInstance
}