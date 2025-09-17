import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendSignupNotification, sendLoginNotification } from '@/lib/email/notifications'

// This route handles auth callbacks and sends notifications
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { event, user } = body
    
    // Only proceed if we have a user and event
    if (!user || !event) {
      return NextResponse.json({ success: true })
    }
    
    const userData = {
      email: user.email,
      name: user.user_metadata?.full_name || user.user_metadata?.name,
      userId: user.id,
      timestamp: new Date().toISOString(),
      eventType: event as 'signup' | 'login',
      metadata: {
        provider: user.app_metadata?.provider,
        created_at: user.created_at,
        last_sign_in: user.last_sign_in_at
      }
    }
    
    // Check if this is a new user (signup) or existing user (login)
    // We can determine this by comparing created_at with current time
    const createdAt = new Date(user.created_at)
    const now = new Date()
    const timeDiff = now.getTime() - createdAt.getTime()
    const minutesDiff = timeDiff / (1000 * 60)
    
    // If user was created less than 5 minutes ago, treat as signup
    if (event === 'SIGNED_IN' && minutesDiff < 5) {
      await sendSignupNotification({...userData, eventType: 'signup'})
    } else if (event === 'SIGNED_IN') {
      await sendLoginNotification({...userData, eventType: 'login'})
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Auth Callback] Error processing auth event:', error)
    // Don't return error to client - we don't want to break auth flow
    return NextResponse.json({ success: true })
  }
}

// Also handle GET requests for OAuth callbacks
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    try {
      const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (!error && session) {
        // Send notification for successful OAuth login
        const userData = {
          email: session.user.email!,
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name,
          userId: session.user.id,
          timestamp: new Date().toISOString(),
          eventType: 'login' as const,
          metadata: {
            provider: session.user.app_metadata?.provider || 'oauth',
            access_token_expires: session.expires_at
          }
        }
        
        // Check if new user
        const createdAt = new Date(session.user.created_at!)
        const now = new Date()
        const timeDiff = now.getTime() - createdAt.getTime()
        const minutesDiff = timeDiff / (1000 * 60)
        
        if (minutesDiff < 5) {
          await sendSignupNotification({...userData, eventType: 'signup'})
        } else {
          await sendLoginNotification(userData)
        }
      }
    } catch (error) {
      console.error('[OAuth Callback] Error:', error)
    }
  }
  
  // Redirect to dashboard after OAuth
  return NextResponse.redirect(new URL('/projects', request.url))
}